<?php

namespace App\Services\MediaServers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class EmbyService implements MediaServerInterface
{
    protected string $url;

    protected string $apiKey;

    public function __construct()
    {
        $this->url = rtrim((string) config('services.emby.url', ''), '/');
        $this->apiKey = (string) config('services.emby.api_key', '');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->url) && ! empty($this->apiKey);
    }

    public function createUser(string $username, string $password): ?string
    {
        if (! $this->isConfigured()) {
            Log::info("Emby sunucusu yapılandırılmamış, kullanıcı oluşturma atlandı: {$username}");

            return null;
        }

        try {
            $response = Http::withHeaders([
                'X-Emby-Token' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(5)->post("{$this->url}/Users/New", [
                'Name' => $username,
                'Password' => $password,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $userId = $data['Id'] ?? null;
                Log::info("Emby kullanıcısı başarıyla oluşturuldu: {$username} (ID: {$userId})");

                return $userId;
            }
        } catch (Throwable $e) {
            Log::error("Emby createUser istisnası: {$e->getMessage()}");
        }

        return null;
    }

    public function setUserEnabled(string $externalUserId, bool $enabled): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        try {
            $response = Http::withHeaders([
                'X-Emby-Token' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(5)->post("{$this->url}/Users/{$externalUserId}/Policy", [
                'IsDisabled' => ! $enabled,
            ]);

            return $response->successful();
        } catch (Throwable $e) {
            Log::error("Emby setUserEnabled istisnası: {$e->getMessage()}");
        }

        return false;
    }

    public function terminateUserSessions(string $externalUserId): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        try {
            $response = Http::withHeaders([
                'X-Emby-Token' => $this->apiKey,
            ])->timeout(5)->get("{$this->url}/Sessions");

            if ($response->successful()) {
                $sessions = $response->json() ?? [];
                foreach ($sessions as $session) {
                    if (($session['UserId'] ?? '') === $externalUserId && isset($session['Id'])) {
                        Http::withHeaders([
                            'X-Emby-Token' => $this->apiKey,
                        ])->timeout(3)->post("{$this->url}/Sessions/{$session['Id']}/Close");
                    }
                }

                return true;
            }
        } catch (Throwable $e) {
            Log::error("Emby terminateUserSessions istisnası: {$e->getMessage()}");
        }

        return false;
    }
}
