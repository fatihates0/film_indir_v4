<?php

namespace App\Services;

use App\Enums\StorageBoxConnectionStatus;
use App\Models\StorageBox;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class HetznerStorageBoxService
{
    /**
     * Timeout for connection tests in seconds.
     */
    protected int $timeout = 3;

    /**
     * Connect timeout for HTTP requests in seconds.
     */
    protected int $connectTimeout = 2;

    /**
     * Test the connection to a Custom Storage Gateway Node with fast non-blocking timeouts.
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
        /** @var StorageTokenService $tokenService */
        $tokenService = app(StorageTokenService::class);
        $testUrl = $tokenService->generateApiUrl('/download', 0, $box, 5);

        try {
            $response = Http::withoutVerifying()
                ->timeout($this->timeout)
                ->connectTimeout($this->connectTimeout)
                ->get($testUrl);

            $latency = (int) round((microtime(true) - $startTime) * 1000);

            if (in_array($response->status(), [401, 403, 200, 404], true)) {
                return [
                    'success' => true,
                    'status' => StorageBoxConnectionStatus::Online,
                    'latency_ms' => $latency,
                    'message' => "Custom Storage Gateway yanıt verdi (HTTP {$response->status()}). Gecikme: {$latency}ms",
                    'server_info' => 'Nginx Gateway Daemon (Node.js/Go/Rust)',
                ];
            }

            return [
                'success' => false,
                'status' => StorageBoxConnectionStatus::Error,
                'latency_ms' => $latency,
                'message' => "Custom Gateway beklenmeyen yanıt verdi (HTTP {$response->status()}).",
            ];
        } catch (Throwable $e) {
            $latency = (int) round((microtime(true) - $startTime) * 1000);

            return [
                'success' => false,
                'status' => StorageBoxConnectionStatus::Offline,
                'latency_ms' => $latency > 0 ? $latency : null,
                'message' => 'Custom Storage Gateway bağlantısı kurulamadı: '.$this->humanizeError($e->getMessage()),
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
            $scanResult = $this->fetchNodeMediaUsage($box);
            if ($scanResult !== null) {
                $usedGb = (int) round($scanResult['total_bytes'] / (1024 * 1024 * 1024));
                $box->used_capacity_gb = $usedGb;
                $totalGb = (int) ($box->total_capacity_gb ?: 1000);
                $box->free_capacity_gb = max(0, $totalGb - $usedGb);
            }
        }

        $box->save();

        return $box;
    }

    /**
     * Generate a Custom Storage Gateway signed HMAC URL.
     */
    public function generateCustomGatewayUrl(StorageBox $box, string $filePath, $userId, int $ttlMinutes = 180): string
    {
        /** @var StorageTokenService $tokenService */
        $tokenService = app(StorageTokenService::class);

        return $tokenService->generateDownloadUrl($filePath, $userId, $box, $ttlMinutes);
    }

    /**
     * List files on the storage box via signed /scan API.
     *
     * @return array{path: string, files: list<array>, count: int}
     */
    public function listFiles(StorageBox $box, string $path = '/'): array
    {
        /** @var StorageTokenService $tokenService */
        $tokenService = app(StorageTokenService::class);
        $scanUrl = $tokenService->generateApiUrl('/scan', 0, $box, 15);

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
            Log::warning("StorageBox listFiles error ({$box->name}): ".$e->getMessage());
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
    protected function fetchNodeMediaUsage(StorageBox $box): ?array
    {
        /** @var StorageTokenService $tokenService */
        $tokenService = app(StorageTokenService::class);
        $scanUrl = $tokenService->generateApiUrl('/scan', 0, $box, 15);

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
