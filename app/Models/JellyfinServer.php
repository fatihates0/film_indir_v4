<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class JellyfinServer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'url',
        'public_url',
        'api_key',
        'is_active',
        'notes',
        'last_status',
        'last_checked_at',
        'cached_users_count',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_checked_at' => 'datetime',
        'cached_users_count' => 'integer',
    ];

    /**
     * Kullanıcıların bağlanacağı erişim adresi.
     */
    public function getEffectivePublicUrlAttribute(): string
    {
        return ! empty($this->public_url) ? rtrim($this->public_url, '/') : rtrim($this->url, '/');
    }

    /**
     * Temizlenmiş API base URL.
     */
    public function getCleanUrlAttribute(): string
    {
        return rtrim($this->url, '/');
    }

    /**
     * Jellyfin HTTP Client yapılandırması.
     */
    public function client(int $timeout = 6)
    {
        return Http::withHeaders([
            'Authorization' => 'MediaBrowser Client="SineKutu", Device="Server", DeviceId="sine-01", Version="1.0.0", Token="'.$this->api_key.'"',
            'X-Emby-Token' => $this->api_key,
            'Content-Type' => 'application/json',
        ])->withoutVerifying()->timeout($timeout);
    }

    /**
     * Sunucu bağlantısını test eder ve durumunu günceller.
     *
     * @return array{success: bool, message: string, server_info?: array, users_count?: int, latency_ms?: int}
     */
    public function testConnection(): array
    {
        $start = microtime(true);

        try {
            $url = $this->clean_url;
            $response = $this->client(5)->get("{$url}/System/Info");

            // Eğer https ve :8096 portuyla denenip SSL hatası veya başarısız olursa, ters proxy 443 portunu dene
            if (! $response->successful() && str_starts_with($url, 'https://') && str_ends_with($url, ':8096')) {
                $fallbackUrl = preg_replace('/:8096$/', '', $url);
                $fallbackResponse = $this->client(5)->get("{$fallbackUrl}/System/Info");
                if ($fallbackResponse->successful()) {
                    $url = $fallbackUrl;
                    $response = $fallbackResponse;
                    $this->updateQuietly(['url' => $fallbackUrl]);
                }
            }

            $latency = (int) round((microtime(true) - $start) * 1000);

            if ($response->successful()) {
                $serverInfo = $response->json();

                // Kullanıcı sayısını da hızlıca güncelle
                $users = $this->getUsers(3);
                $usersCount = is_array($users) ? count($users) : $this->cached_users_count;

                $this->update([
                    'last_status' => 'online',
                    'last_checked_at' => now(),
                    'cached_users_count' => $usersCount,
                ]);

                return [
                    'success' => true,
                    'message' => 'Bağlantı başarılı! (Sürüm: '.($serverInfo['Version'] ?? 'Bilinmiyor').')',
                    'server_info' => $serverInfo,
                    'users_count' => $usersCount,
                    'latency_ms' => $latency,
                ];
            }

            $this->update([
                'last_status' => 'offline',
                'last_checked_at' => now(),
            ]);

            return [
                'success' => false,
                'message' => "Sunucu yanıt verdi ancak yetkilendirme veya HTTP hatası oluştu: HTTP {$response->status()}",
                'latency_ms' => $latency,
            ];
        } catch (Throwable $e) {
            // Eğer https:// ve :8096 ise cURL SSL hatası durumunda 443 portunu kurtarma denemesi yap
            if (str_starts_with($this->clean_url, 'https://') && str_ends_with($this->clean_url, ':8096')) {
                try {
                    $fallbackUrl = preg_replace('/:8096$/', '', $this->clean_url);
                    $fallbackResponse = $this->client(5)->get("{$fallbackUrl}/System/Info");
                    if ($fallbackResponse->successful()) {
                        $this->updateQuietly(['url' => $fallbackUrl]);
                        $serverInfo = $fallbackResponse->json();
                        $users = $this->getUsers(3);
                        $usersCount = is_array($users) ? count($users) : $this->cached_users_count;
                        $latency = (int) round((microtime(true) - $start) * 1000);

                        $this->update([
                            'last_status' => 'online',
                            'last_checked_at' => now(),
                            'cached_users_count' => $usersCount,
                        ]);

                        return [
                            'success' => true,
                            'message' => 'Bağlantı başarılı! (Sürüm: '.($serverInfo['Version'] ?? 'Bilinmiyor').' - URL portsuz HTTPS olarak düzeltildi)',
                            'server_info' => $serverInfo,
                            'users_count' => $usersCount,
                            'latency_ms' => $latency,
                        ];
                    }
                } catch (Throwable $ignored) {
                }
            }

            $latency = (int) round((microtime(true) - $start) * 1000);

            $this->update([
                'last_status' => 'offline',
                'last_checked_at' => now(),
            ]);

            return [
                'success' => false,
                'message' => 'Bağlantı kurulamadı: '.$e->getMessage(),
                'latency_ms' => $latency,
            ];
        }
    }

    /**
     * Sunucudaki tüm kullanıcıları çeker.
     */
    public function getUsers(int $timeout = 5): ?array
    {
        try {
            $response = $this->client($timeout)->get("{$this->clean_url}/Users");

            if ($response->successful()) {
                return $response->json() ?? [];
            }
        } catch (Throwable $e) {
            Log::warning("Jellyfin getUsers [Server: {$this->id} - {$this->name}] hata: {$e->getMessage()}");
        }

        return null;
    }

    /**
     * Kullanıcı sayısını güncel olarak alır ve cache_users_count sütununu senkronlar.
     */
    public function getUsersCount(bool $forceRefresh = false): int
    {
        if (! $forceRefresh && $this->last_checked_at && $this->last_checked_at->gt(now()->subMinutes(3))) {
            return $this->cached_users_count;
        }

        $users = $this->getUsers();
        if (is_array($users)) {
            $count = count($users);
            $this->updateQuietly([
                'cached_users_count' => $count,
                'last_checked_at' => now(),
            ]);

            return $count;
        }

        return $this->cached_users_count;
    }

    /**
     * Belirtilen kullanıcı adını bu sunucuda arar.
     */
    public function findUser(string $username): ?array
    {
        $users = $this->getUsers();
        if (! is_array($users)) {
            return null;
        }

        $normalized = mb_strtolower(trim($username));

        foreach ($users as $user) {
            $currentName = mb_strtolower(trim($user['Name'] ?? ''));
            if ($currentName === $normalized) {
                return $user;
            }
        }

        return null;
    }

    /**
     * Sunucuda yeni kullanıcı oluşturur.
     *
     * @return array{success: bool, user_id?: string, message?: string}
     */
    public function createUser(string $username, string $password): array
    {
        try {
            $response = $this->client(8)->post("{$this->clean_url}/Users/New", [
                'Name' => $username,
                'Password' => $password,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $userId = $data['Id'] ?? null;

                // Kullanıcı sayısını artır
                $this->increment('cached_users_count');

                return [
                    'success' => true,
                    'user_id' => $userId,
                    'message' => 'Kullanıcı hesabı başarıyla oluşturuldu.',
                ];
            }

            $errorMessage = $response->json('message') ?? $response->body();

            return [
                'success' => false,
                'message' => "Jellyfin hesabı oluşturulamadı (HTTP {$response->status()}): {$errorMessage}",
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Sunucu ile iletişim kurulamadı: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Sunucudan kullanıcı siler.
     */
    public function deleteUser(string $userId): bool
    {
        try {
            $response = $this->client(8)->delete("{$this->clean_url}/Users/{$userId}");

            if ($response->successful()) {
                if ($this->cached_users_count > 0) {
                    $this->decrement('cached_users_count');
                }

                return true;
            }
        } catch (Throwable $e) {
            Log::error("Jellyfin deleteUser [Server: {$this->id}, User: {$userId}] hata: {$e->getMessage()}");
        }

        return false;
    }

    /**
     * Kullanıcının şifresini sıfırlar / günceller.
     */
    public function resetPassword(string $userId, string $newPassword): bool
    {
        try {
            $response = $this->client(8)->post("{$this->clean_url}/Users/{$userId}/Password", [
                'CurrentPassword' => '',
                'NewPw' => $newPassword,
                'ResetPassword' => false,
            ]);

            return $response->successful();
        } catch (Throwable $e) {
            Log::error("Jellyfin resetPassword [Server: {$this->id}, User: {$userId}] hata: {$e->getMessage()}");
        }

        return false;
    }
}
