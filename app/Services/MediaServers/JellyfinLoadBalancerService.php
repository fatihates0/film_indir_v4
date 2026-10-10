<?php

namespace App\Services\MediaServers;

use App\Models\JellyfinServer;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class JellyfinLoadBalancerService
{
    /**
     * Aktif tüm Jellyfin sunucuları arasından kullanıcının hesabını arar.
     *
     * @return array{server: JellyfinServer, jellyfin_user: array}|null
     */
    public function findUserAcrossServers(string $username): ?array
    {
        $servers = JellyfinServer::where('is_active', true)->get();

        foreach ($servers as $server) {
            $user = $server->findUser($username);
            if ($user !== null) {
                return [
                    'server' => $server,
                    'jellyfin_user' => $user,
                ];
            }
        }

        return null;
    }

    /**
     * Yük dengeleme (Least Loaded + Random Tie-Break) ile en uygun sunucuyu seçer.
     */
    public function selectBestServer(): ?JellyfinServer
    {
        /** @var Collection<int, JellyfinServer> $servers */
        $servers = JellyfinServer::where('is_active', true)->get();

        if ($servers->isEmpty()) {
            return null;
        }

        if ($servers->count() === 1) {
            return $servers->first();
        }

        // Her sunucunun güncel kullanıcı sayısını hesapla
        $serverLoads = $servers->map(function (JellyfinServer $server) {
            return [
                'server' => $server,
                'count' => $server->getUsersCount(),
            ];
        });

        // En az yüke sahip sayıyı bul
        $minCount = $serverLoads->min('count');

        // En az yüke sahip tüm adayları al
        $candidates = $serverLoads->where('count', $minCount);

        // Adaylar arasından rastgele birini seç (Load balancing + Random)
        /** @var array{server: JellyfinServer, count: int} $selected */
        $selected = $candidates->random();

        Log::info("Jellyfin Yük Dengeleyici: Sunucu seçildi: {$selected['server']->name} (Mevcut kullanıcı: {$selected['count']})");

        return $selected['server'];
    }

    /**
     * Dengeli dağıtım ile yeni Jellyfin hesabı açar.
     *
     * @return array{success: bool, message: string, server?: JellyfinServer, user_id?: string}
     */
    public function createBalancedUser(string $username, string $password): array
    {
        // 1. Zaten var mı kontrol et
        $existing = $this->findUserAcrossServers($username);
        if ($existing !== null) {
            return [
                'success' => false,
                'message' => "Bu kullanıcı adı ({$username}) zaten '{$existing['server']->name}' sunucusunda tanımlı.",
            ];
        }

        // 2. En uygun sunucuyu seç
        $targetServer = $this->selectBestServer();
        if ($targetServer === null) {
            return [
                'success' => false,
                'message' => 'Sistemde kayıtlı veya aktif bir Jellyfin sunucusu bulunamadı. Lütfen yönetici ile iletişime geçin.',
            ];
        }

        // 3. Kullanıcıyı oluştur
        $result = $targetServer->createUser($username, $password);

        if (! empty($result['success'])) {
            return [
                'success' => true,
                'message' => "'{$targetServer->name}' sunucusunda hesabınız başarıyla oluşturuldu.",
                'server' => $targetServer,
                'user_id' => $result['user_id'] ?? null,
            ];
        }

        return [
            'success' => false,
            'message' => $result['message'] ?? 'Hesap oluşturulurken beklenmeyen bir hata meydana geldi.',
        ];
    }

    /**
     * Kullanıcının şifresini bulunduğu sunucuda sıfırlar.
     */
    public function resetUserPassword(string $username, string $newPassword): array
    {
        $found = $this->findUserAcrossServers($username);
        if ($found === null) {
            return [
                'success' => false,
                'message' => 'Sunucularda belirtilen kullanıcı adına sahip bir hesap bulunamadı.',
            ];
        }

        $server = $found['server'];
        $jellyfinUser = $found['jellyfin_user'];
        $userId = $jellyfinUser['Id'] ?? null;

        if (! $userId) {
            return [
                'success' => false,
                'message' => 'Jellyfin kullanıcı kimliği okunamadı.',
            ];
        }

        $success = $server->resetPassword($userId, $newPassword);

        if ($success) {
            return [
                'success' => true,
                'message' => "'{$server->name}' sunucusundaki şifreniz başarıyla güncellendi.",
                'server' => $server,
            ];
        }

        return [
            'success' => false,
            'message' => 'Şifre sıfırlanırken Jellyfin sunucusu hata verdi.',
        ];
    }

    /**
     * Kullanıcının hesabını bulunduğu sunucudan siler.
     */
    public function deleteUserAccount(string $username): array
    {
        $found = $this->findUserAcrossServers($username);
        if ($found === null) {
            return [
                'success' => false,
                'message' => 'Silinecek kullanıcı sunucularda bulunamadı.',
            ];
        }

        $server = $found['server'];
        $jellyfinUser = $found['jellyfin_user'];
        $userId = $jellyfinUser['Id'] ?? null;

        if (! $userId) {
            return [
                'success' => false,
                'message' => 'Kullanıcı kimliği tespit edilemedi.',
            ];
        }

        $deleted = $server->deleteUser($userId);

        if ($deleted) {
            return [
                'success' => true,
                'message' => "'{$server->name}' sunucusundaki hesabınız başarıyla silindi.",
            ];
        }

        return [
            'success' => false,
            'message' => 'Hesap silinirken Jellyfin sunucusu hata verdi.',
        ];
    }
}
