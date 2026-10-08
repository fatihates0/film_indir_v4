<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessMediaTmdbJob;
use App\Models\MediaFile;
use App\Models\StorageBox;
use App\Services\StorageTokenService;
use App\Services\TmdbService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class AdminUploadController extends Controller
{
    public function __construct(
        protected StorageTokenService $tokenService,
        protected TmdbService $tmdbService
    ) {}

    /**
     * Initiate a new upload session by choosing an eligible storage box at random
     * and initializing the gateway node upload session.
     */
    public function init(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'filename' => ['required', 'string', 'max:255'],
            'file_size' => ['required', 'numeric', 'min:1'],
            'category' => ['nullable', 'string', 'in:movie,series,auto'],
        ]);

        $filename = $validated['filename'];
        $fileSizeBytes = (int) $validated['file_size'];
        $category = $validated['category'] ?? 'auto';

        // Fetch active and online storage boxes
        $boxes = StorageBox::active()->online()->get();

        if ($boxes->isEmpty()) {
            // Fallback to active storage boxes if online check hasn't updated yet
            $boxes = StorageBox::active()->get();
        }

        if ($boxes->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Yüklenecek aktif storage box (gateway) bulunamadı. Lütfen önce bir Storage Box ekleyin.',
            ], 422);
        }

        // Filter eligible boxes that have enough free space for the file size
        $eligibleBoxes = $boxes->filter(function (StorageBox $box) use ($fileSizeBytes) {
            if ($box->free_capacity_gb === null || $box->free_capacity_gb <= 0) {
                return true; // No capacity restriction registered, assume available
            }
            $freeBytes = $box->free_capacity_gb * 1024 * 1024 * 1024;

            return $freeBytes >= $fileSizeBytes;
        });

        if ($eligibleBoxes->isEmpty()) {
            // Fallback to all active boxes if no specific free capacity metadata exists
            $eligibleBoxes = $boxes;
        }

        // Requirement #4: Pick a storage box randomly from eligible options
        /** @var StorageBox $selectedBox */
        $selectedBox = $eligibleBoxes->random();

        $existingUploadId = $request->input('existing_upload_id');
        $existingStorageBoxId = $request->input('storage_box_id');

        if ($existingUploadId && $existingStorageBoxId) {
            $foundBox = StorageBox::find($existingStorageBoxId);
            if ($foundBox) {
                $selectedBox = $foundBox;
            }
        }

        // Parse metadata preview to guess directory structure
        $parsed = MediaFile::parseMetadata($filename, '/');
        $effectiveCategory = ($category !== 'auto') ? $category : $parsed['category'];

        if ($effectiveCategory === 'series') {
            $folderName = Str::slug($parsed['clean_title']) ?: 'Series';
            $targetRelPath = "/Diziler/{$parsed['clean_title']}/{$filename}";
        } else {
            $targetRelPath = "/Filmler/{$filename}";
        }

        // Prepare signed URL endpoints for Gateway
        $tokenValiditySec = 86400;
        $baseUrl = $this->tokenService->getBaseUrl($selectedBox);

        $initParams = [
            'filename' => $filename,
            'file_size' => $fileSizeBytes,
            'file_path' => $targetRelPath,
        ];
        if ($existingUploadId) {
            $initParams['upload_id'] = $existingUploadId;
        }

        $initApiUrl = $this->tokenService->generateApiUrl('/upload/init', auth()->id() ?? 0, $selectedBox, $tokenValiditySec, $initParams);

        try {
            // Contact gateway to initialize chunked upload session
            $response = Http::withoutVerifying()
                ->timeout(10)
                ->post($initApiUrl, $initParams);

            if (! $response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gateway sunucusu yükleme oturumunu başlatamadı: '.$response->body(),
                ], 500);
            }

            $gatewayData = $response->json();

            if (! is_array($gatewayData) || empty($gatewayData['success'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gateway oturum yanıtı geçersiz: '.($gatewayData['error'] ?? 'Bilinmeyen hata'),
                ], 500);
            }

            $uploadId = $gatewayData['upload_id'] ?? $existingUploadId;

            // Build signed gateway URLs for chunking, status, and completion
            $chunkUrl = $this->tokenService->generateApiUrl('/upload/chunk', auth()->id() ?? 0, $selectedBox, $tokenValiditySec, [
                'upload_id' => $uploadId,
            ]);

            $statusUrl = $this->tokenService->generateApiUrl('/upload/status', auth()->id() ?? 0, $selectedBox, $tokenValiditySec, [
                'upload_id' => $uploadId,
            ]);

            $finishUrl = $this->tokenService->generateApiUrl('/upload/finish', auth()->id() ?? 0, $selectedBox, $tokenValiditySec, [
                'upload_id' => $uploadId,
                'filename' => $filename,
                'file_path' => $targetRelPath,
            ]);

            return response()->json([
                'success' => true,
                'upload_id' => $uploadId,
                'storage_box' => [
                    'id' => $selectedBox->id,
                    'name' => $selectedBox->name,
                    'host' => $selectedBox->host,
                    'protocol' => $selectedBox->protocol->value,
                ],
                'target_path' => $targetRelPath,
                'chunk_size' => $gatewayData['chunk_size'] ?? (5 * 1024 * 1024),
                'gateway_base_url' => $baseUrl,
                'urls' => [
                    'chunk' => $chunkUrl,
                    'status' => $statusUrl,
                    'finish' => $finishUrl,
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => "Gateway sunucusuna ({$selectedBox->name}) bağlanılamadı: ".$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Complete upload session and create/update MediaFile in database.
     */
    public function complete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'storage_box_id' => ['required', 'integer', 'exists:storage_boxes,id'],
            'file_path' => ['required', 'string'],
            'filename' => ['required', 'string'],
            'size_bytes' => ['required', 'integer', 'min:1'],
        ]);

        $storageBox = StorageBox::findOrFail($validated['storage_box_id']);
        $filePath = $validated['file_path'];
        $filename = $validated['filename'];
        $sizeBytes = (int) $validated['size_bytes'];

        $parsed = MediaFile::parseMetadata($filename, $filePath);

        $mediaFile = MediaFile::updateOrCreate(
            [
                'storage_box_id' => $storageBox->id,
                'path' => $filePath,
            ],
            [
                'name' => $filename,
                'directory' => dirname($filePath) === '.' ? '/' : dirname($filePath),
                'extension' => strtolower(pathinfo($filename, PATHINFO_EXTENSION)),
                'size_bytes' => $sizeBytes,
                'clean_title' => $parsed['clean_title'],
                'year' => $parsed['year'],
                'quality' => $parsed['quality'],
                'category' => $parsed['category'],
                'properties' => $parsed['properties'],
                'tmdb_match_status' => 'unmatched',
                'last_modified_at' => now(),
                'scanned_at' => now(),
            ]
        );

        // Optional background job trigger for TMDB matching
        if ($this->tmdbService->isConfigured()) {
            $mediaFile->update(['tmdb_match_status' => 'pending']);
            ProcessMediaTmdbJob::dispatch($mediaFile->id)->onQueue('tmdb_scan');
        }

        $formattedMedia = [
            'id' => $mediaFile->id,
            'name' => $mediaFile->name,
            'clean_title' => $mediaFile->clean_title ?: $mediaFile->name,
            'path' => $mediaFile->path,
            'directory' => $mediaFile->directory,
            'extension' => strtoupper($mediaFile->extension),
            'size_bytes' => $mediaFile->size_bytes,
            'formatted_size' => $mediaFile->formatted_size,
            'year' => $mediaFile->year,
            'quality' => $mediaFile->quality,
            'properties' => $mediaFile->properties ?: [],
            'category' => $mediaFile->category,
            'category_label' => $mediaFile->category === 'series' ? 'Dizi' : 'Film',
            'tmdb_match_status' => $mediaFile->tmdb_match_status,
            'storage_box' => [
                'id' => $storageBox->id,
                'name' => $storageBox->name,
            ],
        ];

        return response()->json([
            'success' => true,
            'message' => "\"{$mediaFile->clean_title}\" medya kütüphanesine başarıyla eklendi.",
            'media_file' => $formattedMedia,
        ]);
    }
}
