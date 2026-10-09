<?php

namespace App\Services\MediaServers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class JellyfinService implements MediaServerInterface
{
    protected string $url;

    protected string $apiKey;

    public function __construct()
    {
        $this->url = rtrim((string) config('services.jellyfin.url', ''), '/');
        $this->apiKey = (string) config('services.jellyfin.api_key', '');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->url) && ! empty($this->apiKey);
    }

    public function createUser(string $username, string $password): ?string
    {
        if (! $this->isConfigured()) {
            Log::info("Jellyfin sunucusu yapılandırılmamış, kullanıcı oluşturma atlandı: {$username}");

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
                Log::info("Jellyfin kullanıcısı başarıyla oluşturuldu: {$username} (ID: {$userId})");

                return $userId;
            }

            Log::error("Jellyfin kullanıcı oluşturma başarısız: HTTP {$response->status()}", [
                'body' => $response->body(),
            ]);
        } catch (Throwable $e) {
            Log::error("Jellyfin createUser istisnası: {$e->getMessage()}");
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

            if ($response->successful()) {
                Log::info("Jellyfin kullanıcı durumu güncellendi (ID: {$externalUserId}, Etkin: ".($enabled ? 'Evet' : 'Hayır').')');

                return true;
            }
        } catch (Throwable $e) {
            Log::error("Jellyfin setUserEnabled istisnası: {$e->getMessage()}");
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
            Log::error("Jellyfin terminateUserSessions istisnası: {$e->getMessage()}");
        }

        return false;
    }
}
