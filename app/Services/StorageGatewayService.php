<?php

namespace App\Services;

use App\Enums\StorageBoxConnectionStatus;
use App\Models\StorageBox;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class StorageGatewayService
{
    /**
     * Timeout for connection tests in seconds.
     */
    protected int $timeout = 3;

    /**
     * Connect timeout for HTTP requests in seconds.
     */
    protected int $connectTimeout = 2;

    public function __construct(
        protected StorageTokenService $tokenService
    ) {}

    /**
     * Test the connection to a Storage Gateway Node with fast non-blocking timeouts.
     *
     * @return array{
     *     success: bool,
     *     status: StorageBoxConnectionStatus,
     *     latency_ms: ?int,
     *     message: string,
     *     server_info?: ?string
     * }
     */
    public function testConnection(StorageBox $box): array
    {
        $startTime = microtime(true);
        $baseUrl = $this->tokenService->getBaseUrl($box);
        $healthUrl = rtrim($baseUrl, '/').'/health';

        try {
            $response = Http::withoutVerifying()
                ->timeout($this->timeout)
                ->connectTimeout($this->connectTimeout)
                ->get($healthUrl);

            $latency = (int) round((microtime(true) - $startTime) * 1000);
            $data = $response->json();

            $isOnline = $response->successful()
                && is_array($data)
                && isset($data['success']) && $data['success'] === true
                && isset($data['status']) && $data['status'] === 'online';

            if ($isOnline) {
                return [
                    'success' => true,
                    'status' => StorageBoxConnectionStatus::Online,
                    'latency_ms' => $latency,
                    'message' => $data['message'] ?? "Storage Gateway çevrimiçi. Gecikme: {$latency}ms",
                    'server_info' => 'Nginx Storage Gateway Node',
                ];
            }

            return [
                'success' => false,
                'status' => StorageBoxConnectionStatus::Offline,
                'latency_ms' => $latency,
                'message' => 'Storage Gateway çevrimdışı veya geçersiz yanıt verdi.',
            ];
        } catch (Throwable $e) {
            $latency = (int) round((microtime(true) - $startTime) * 1000);

            return [
                'success' => false,
                'status' => StorageBoxConnectionStatus::Offline,
                'latency_ms' => $latency > 0 ? $latency : null,
                'message' => 'Storage Gateway bağlantısı kurulamadı: '.$this->humanizeError($e->getMessage()),
            ];
        }
    }

    /**
     * Check connection and update storage box stats in DB.
     */
    public function checkAndUpdate(StorageBox $box): StorageBox
    {
        $result = $this->testConnection($box);

        $box->connection_status = $result['status'];
        $box->latency_ms = $result['latency_ms'];
        $box->last_checked_at = now();
        $box->last_error = $result['success'] ? null : $result['message'];

        if ($result['success']) {
            $diskSizeStats = $this->fetchNodeDiskSize($box);
            if ($diskSizeStats !== null) {
                $box->total_capacity_gb = $diskSizeStats['total_capacity_gb'];
                $box->used_capacity_gb = $diskSizeStats['used_capacity_gb'];
                $box->free_capacity_gb = $diskSizeStats['free_capacity_gb'];
            } else {
                $scanResult = $this->fetchNodeMediaUsage($box);
                if ($scanResult !== null) {
                    $usedGb = (int) round($scanResult['total_bytes'] / (1024 * 1024 * 1024));
                    $box->used_capacity_gb = $usedGb;
                    $totalGb = (int) ($box->total_capacity_gb ?: 1000);
                    $box->free_capacity_gb = max(0, $totalGb - $usedGb);
                }
            }
        }

        $box->save();

        return $box;
    }

    /**
     * Fetch total, used, and free disk capacity from storage node /disks endpoint.
     *
     * @return array{total_capacity_gb: int, used_capacity_gb: int, free_capacity_gb: int}|null
     */
    public function fetchNodeDiskSize(StorageBox $box): ?array
    {
        $apiUrl = $this->tokenService->generateApiUrl('/disks', 0, $box, 15);

        try {
            $response = Http::withoutVerifying()
                ->timeout($this->timeout)
                ->connectTimeout($this->connectTimeout)
                ->get($apiUrl);

            if ($response->successful()) {
                $data = $response->json();
                if (is_array($data) && ($data['success'] ?? false) === true) {
                    $summary = $data['summary'] ?? [];

                    // 1. Try bytes if available
                    $totalBytes = $data['total_bytes'] ?? $summary['total_bytes'] ?? null;
                    $usedBytes = $data['used_bytes'] ?? $summary['used_bytes'] ?? null;
                    $freeBytes = $data['free_bytes'] ?? $summary['free_bytes'] ?? null;

                    if ($totalBytes !== null && (float) $totalBytes > 0) {
                        $totalGb = (int) round(((float) $totalBytes) / (1024 * 1024 * 1024));
                        $usedGb = (int) round(((float) ($usedBytes ?? ($totalBytes - ($freeBytes ?? 0)))) / (1024 * 1024 * 1024));
                        $freeGb = (int) max(0, $totalGb - $usedGb);

                        return [
                            'total_capacity_gb' => $totalGb,
                            'used_capacity_gb' => $usedGb,
                            'free_capacity_gb' => $freeGb,
                        ];
                    }

                    // 2. Try MB if bytes not present
                    $totalMb = (float) ($data['total_mb'] ?? $summary['total_mb'] ?? 0);
                    $usedMb = (float) ($data['used_mb'] ?? $summary['used_mb'] ?? 0);
                    $freeMb = (float) ($data['free_mb'] ?? $summary['free_mb'] ?? 0);

                    if ($totalMb > 0) {
                        $totalGb = (int) round($totalMb / 1024);
                        $usedGb = (int) round($usedMb / 1024);
                        $freeGb = (int) max(0, $totalGb - $usedGb);

                        return [
                            'total_capacity_gb' => $totalGb,
                            'used_capacity_gb' => $usedGb,
                            'free_capacity_gb' => $freeGb,
                        ];
                    }
                }
            }
        } catch (Throwable $e) {
            Log::warning("StorageGateway fetchNodeDiskSize error ({$box->name}): ".$e->getMessage());
        }

        return null;
    }

    /**
     * Generate a Storage Gateway signed HMAC download URL.
     */
    public function generateGatewayUrl(StorageBox $box, string $filePath, int|string $userId, int $ttlMinutes = 180, ?string $ticketToken = null): string
    {
        return $this->tokenService->generateDownloadUrl($filePath, $userId, $box, $ttlMinutes, $ticketToken);
    }

    /**
     * Alias for backward compatibility.
     */
    public function generateCustomGatewayUrl(StorageBox $box, string $filePath, int|string $userId, int $ttlMinutes = 180, ?string $ticketToken = null): string
    {
        return $this->generateGatewayUrl($box, $filePath, $userId, $ttlMinutes, $ticketToken);
    }

    /**
     * List files on the storage node via signed /scan API.
     *
     * @return array{path: string, files: list<array>, count: int}
     */
    public function listFiles(StorageBox $box, string $path = '/'): array
    {
        $scanUrl = $this->tokenService->generateApiUrl('/scan', 0, $box, 15);

        try {
            $response = Http::withoutVerifying()
                ->timeout($this->timeout)
                ->connectTimeout($this->connectTimeout)
                ->get($scanUrl);

            if ($response->successful()) {
                $data = $response->json();
                $files = $data['files'] ?? [];

                return [
                    'path' => $path,
                    'count' => count($files),
                    'files' => $files,
                ];
            }
        } catch (Throwable $e) {
            Log::warning("StorageGateway listFiles error ({$box->name}): ".$e->getMessage());
        }

        return [
            'path' => $path,
            'count' => 0,
            'files' => [],
        ];
    }

    /**
     * Fetch media usage stats from storage node /scan endpoint.
     *
     * @return array{file_count: int, total_bytes: int}|null
     */
    public function fetchNodeMediaUsage(StorageBox $box): ?array
    {
        $scanUrl = $this->tokenService->generateApiUrl('/scan', 0, $box, 15);

        try {
            $response = Http::withoutVerifying()
                ->timeout($this->timeout)
                ->connectTimeout($this->connectTimeout)
                ->get($scanUrl);

            if ($response->successful()) {
                $data = $response->json();
                $files = $data['files'] ?? [];
                $totalBytes = 0;
                foreach ($files as $file) {
                    $totalBytes += (int) ($file['size_bytes'] ?? 0);
                }

                return [
                    'file_count' => count($files),
                    'total_bytes' => $totalBytes,
                ];
            }
        } catch (Throwable $e) {
            // Silently ignore
        }

        return null;
    }

    /**
     * Clean and humanize error messages.
     */
    protected function humanizeError(string $rawError): string
    {
        if (str_contains($rawError, 'timed out') || str_contains($rawError, 'Timeout')) {
            return 'Sunucu zaman aşımına uğradı (Timeout).';
        }
        if (str_contains($rawError, 'Connection refused') || str_contains($rawError, 'could not connect')) {
            return 'Sunucu bağlantıyı reddetti veya port kapalı.';
        }
        if (str_contains($rawError, 'Could not resolve host')) {
            return 'Alan adı çözümlenemedi (DNS Hatası).';
        }

        return $rawError;
    }
}
