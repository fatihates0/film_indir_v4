<?php

namespace App\Services;

use App\Models\StorageBox;

class StorageTokenService
{
    protected string $defaultSecretKey;

    protected string $defaultNodeUrl;

    public function __construct()
    {
        $this->defaultSecretKey = config('services.storage.secret_key', env('STORAGE_SECRET_KEY', 'test1'));
        $this->defaultNodeUrl = config('services.storage.default_node_url', env('STORAGE_NODE_1_URL', 'https://dl3.fatihates.com.tr'));
    }

    /**
     * Build full base URL for a storage box or default node.
     * Fully supports IP addresses, domains, custom ports, HTTP, and HTTPS.
     */
    public function getBaseUrl(?StorageBox $storageBox = null): string
    {
        if ($storageBox && $storageBox->host) {
            $rawHost = trim($storageBox->host);
            $cleanHost = preg_replace('#^https?://#i', '', $rawHost);
            $cleanHost = rtrim($cleanHost, '/');
            $cleanHost = preg_replace('#:\d+$#', '', $cleanHost);

            $useSsl = (bool) $storageBox->use_ssl;
            $scheme = $useSsl ? 'https' : 'http';
            $port = (int) $storageBox->port;
            $portSuffix = ($port === 80 || $port === 443 || $port === 0) ? '' : ":{$port}";

            return "{$scheme}://{$cleanHost}{$portSuffix}";

        }

        return rtrim($this->defaultNodeUrl, '/');
    }

    /**
     * Get secret key for a storage box or default key.
     */
    public function getSecretKey(?StorageBox $storageBox = null): string
    {
        if ($storageBox && $storageBox->password) {
            return trim($storageBox->password);
        }

        return $this->defaultSecretKey;
    }

    /**
     * Generate a signed API URL for any endpoint (/scan, /download, etc.).
     */
    public function generateApiUrl(string $endpoint, $userId = 0, ?StorageBox $storageBox = null, int $ttlMinutes = 180, array $extraPayload = []): string
    {
        $baseUrl = $this->getBaseUrl($storageBox);
        $secretKey = $this->getSecretKey($storageBox);
        $cleanEndpoint = '/'.ltrim($endpoint, '/');

        $payload = array_merge([
            'endpoint' => $cleanEndpoint,
            'user_id' => $userId,
            'expires' => time() + ($ttlMinutes * 60),
            'nonce' => bin2hex(random_bytes(8)),
        ], $extraPayload);

        $payloadBase64 = base64_encode(json_encode($payload));
        $signature = hash_hmac('sha256', $payloadBase64, $secretKey);
        $token = $payloadBase64.'.'.$signature;

        return "{$baseUrl}{$cleanEndpoint}?token=".urlencode($token);
    }

    /**
     * Generate a signed download URL for a file.
     */
    public function generateDownloadUrl(string $filePath, $userId, ?StorageBox $storageBox = null, int $ttlMinutes = 180, ?string $ticketToken = null): string
    {
        $appUrl = config('services.storage.app_url', config('app.url', url('/')));

        if ((str_contains($appUrl, '127.0.0.1') || str_contains($appUrl, 'localhost')) && request()->hasHeader('host')) {
            $requestUrl = request()->schemeAndHttpHost();
            if (! str_contains($requestUrl, '127.0.0.1') && ! str_contains($requestUrl, 'localhost')) {
                $appUrl = $requestUrl;
            }
        }

        $extraPayload = [
            'file_path' => '/'.ltrim($filePath, '/'),
            'app_url' => $appUrl,
        ];

        if ($ticketToken) {
            $extraPayload['ticket_token'] = $ticketToken;
        }

        return $this->generateApiUrl('/download', $userId, $storageBox, $ttlMinutes, $extraPayload);
    }
}
