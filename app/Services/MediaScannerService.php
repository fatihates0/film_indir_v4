<?php

namespace App\Services;

use App\Models\MediaFile;
use App\Models\StorageBox;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class MediaScannerService
{
    /**
     * Recognized video file extensions.
     */
    public const VIDEO_EXTENSIONS = [
        'mkv',
        'mp4',
        'avi',
        'mov',
        'wmv',
        'webm',
        'flv',
        'm4v',
        'ts',
        'm2ts',
        'iso',
    ];

    /**
     * Timeout for HTTP requests in seconds.
     */
    protected int $timeout = 25;

    public function __construct(
        protected StorageGatewayService $storageGatewayService
    ) {}

    /**
     * Scan an individual Storage Box for all video files and persist them to the database.
     *
     * @return array{
     *     box_id: int,
     *     box_name: string,
     *     total_videos: int,
     *     created: int,
     *     updated: int,
     *     total_size_bytes: int,
     *     duration_seconds: float
     * }
     */
    public function scanStorageBox(StorageBox $box): array
    {
        $startTime = microtime(true);
        $created = 0;
        $updated = 0;
        $totalBytes = 0;

        $videoFiles = [];
        $this->collectGatewayVideos($box, $videoFiles);

        // Pre-parse batch metadata using guessit-js in chunks of 500 to fill memory cache instantly
        foreach (array_chunk($videoFiles, 500) as $chunk) {
            GuessItService::parseBatch($chunk);
        }

        foreach ($videoFiles as $item) {
            $metadata = MediaFile::parseMetadata($item['filename'], $item['path']);

            $media = MediaFile::updateOrCreate(
                [
                    'storage_box_id' => $box->id,
                    'path' => $item['path'],
                ],
                [
                    'name' => $item['filename'],
                    'directory' => $item['directory'],
                    'extension' => $item['extension'],
                    'size_bytes' => $item['size_bytes'],
                    'clean_title' => $metadata['clean_title'],
                    'year' => $metadata['year'],
                    'quality' => $metadata['quality'],
                    'properties' => $metadata['properties'],
                    'category' => $metadata['category'],
                    'mime_type' => $this->guessMimeType($item['extension']),
                    'last_modified_at' => $item['modified_at'] ? date('Y-m-d H:i:s', strtotime($item['modified_at'])) : null,
                    'scanned_at' => now(),
                ]
            );

            if ($media->wasRecentlyCreated) {
                $created++;
            } else {
                $updated++;
            }

            $totalBytes += $item['size_bytes'];
        }

        $box->last_checked_at = now();
        $box->save();

        $duration = round(microtime(true) - $startTime, 2);

        Log::info("Storage Box ({$box->name}) medya taraması tamamlandı: ".count($videoFiles)." video, {$created} yeni, {$updated} güncellendi ({$duration}s)");

        return [
            'box_id' => $box->id,
            'box_name' => $box->name,
            'total_videos' => count($videoFiles),
            'created' => $created,
            'updated' => $updated,
            'total_size_bytes' => $totalBytes,
            'duration_seconds' => $duration,
        ];
    }

    /**
     * Scan all active Storage Boxes.
     *
     * @return array{
     *     total_boxes: int,
     *     total_videos: int,
     *     created: int,
     *     updated: int,
     *     total_size_bytes: int,
     *     duration_seconds: float,
     *     boxes: list<array>
     * }
     */
    public function scanAllBoxes(): array
    {
        $startTime = microtime(true);
        $boxes = StorageBox::active()->get();

        $boxSummaries = [];
        $totalVideos = 0;
        $totalCreated = 0;
        $totalUpdated = 0;
        $totalBytes = 0;

        foreach ($boxes as $box) {
            $summary = $this->scanStorageBox($box);
            $boxSummaries[] = $summary;

            $totalVideos += $summary['total_videos'];
            $totalCreated += $summary['created'];
            $totalUpdated += $summary['updated'];
            $totalBytes += $summary['total_size_bytes'];
        }

        return [
            'total_boxes' => $boxes->count(),
            'total_videos' => $totalVideos,
            'created' => $totalCreated,
            'updated' => $totalUpdated,
            'total_size_bytes' => $totalBytes,
            'duration_seconds' => round(microtime(true) - $startTime, 2),
            'boxes' => $boxSummaries,
        ];
    }

    /**
     * Scan Custom Storage Gateway node over signed /scan HTTP API.
     *
     * @param  list<array{filename: string, path: string, directory: string, extension: string, size_bytes: int, modified_at: ?string}>  $collected
     */
    protected function collectGatewayVideos(StorageBox $box, array &$collected): void
    {
        /** @var StorageTokenService $tokenService */
        $tokenService = app(StorageTokenService::class);
        $scanUrl = $tokenService->generateApiUrl('/scan', 0, $box, 30);

        try {
            $response = Http::withoutVerifying()
                ->timeout($this->timeout)
                ->connectTimeout(5)
                ->get($scanUrl);

            if (! $response->successful()) {
                Log::warning("MediaScannerService Custom Gateway tarama yanıtı başarısız ({$box->name}): HTTP {$response->status()}");

                return;
            }

            $data = $response->json();
            if (! isset($data['files']) || ! is_array($data['files'])) {
                return;
            }

            foreach ($data['files'] as $item) {
                $collected[] = [
                    'filename' => (string) ($item['filename'] ?? ''),
                    'path' => (string) ($item['path'] ?? ''),
                    'directory' => (string) ($item['directory'] ?? '/'),
                    'extension' => (string) ($item['extension'] ?? ''),
                    'size_bytes' => (int) ($item['size_bytes'] ?? 0),
                    'modified_at' => isset($item['modified_at']) ? (string) $item['modified_at'] : null,
                ];
            }
        } catch (Throwable $e) {
            Log::error("MediaScannerService Custom Gateway tarama hatası ({$box->name}): {$e->getMessage()}");
        }
    }

    /**
     * Guess standard MIME type based on extension.
     */
    protected function guessMimeType(string $extension): string
    {
        return match (strtolower($extension)) {
            'mkv' => 'video/x-matroska',
            'mp4', 'm4v' => 'video/mp4',
            'avi' => 'video/x-msvideo',
            'mov' => 'video/quicktime',
            'wmv' => 'video/x-ms-wmv',
            'webm' => 'video/webm',
            'flv' => 'video/x-flv',
            'ts', 'm2ts' => 'video/mp2t',
            default => 'video/octet-stream',
        };
    }
}
