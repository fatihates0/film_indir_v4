<?php

namespace App\Services\MediaServers;

use App\Models\JellyfinServer;
use App\Models\MediaServerAccount;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
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
    public function createBalancedUser(string $username, string $password, ?int $userId = null): array
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
            $jellyfinUserId = $result['user_id'] ?? null;

            if ($userId && $jellyfinUserId) {
                MediaServerAccount::updateOrCreate(
                    [
                        'user_id' => $userId,
                        'server_type' => 'jellyfin',
                    ],
                    [
                        'external_user_id' => $jellyfinUserId,
                        'external_username' => $username,
                        'is_active' => true,
                    ]
                );
            }

            return [
                'success' => true,
                'message' => "'{$targetServer->name}' sunucusunda hesabınız başarıyla oluşturuldu.",
                'server' => $targetServer,
                'user_id' => $jellyfinUserId,
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
            MediaServerAccount::where('external_username', $username)->delete();

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
            MediaServerAccount::where('external_username', $username)
                ->orWhere('external_user_id', $userId)
                ->delete();

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

    /**
     * Kullanıcının Jellyfin hesabını tüm sunuculardan ve DB'den tamamen siler.
     */
    public function purgeUserAccount(User|int|string $user): bool
    {
        $userModel = null;
        if ($user instanceof User) {
            $userModel = $user;
        } elseif (is_numeric($user)) {
            $userModel = User::find($user);
        }

        $usernames = [];
        $userId = $userModel?->id ?? (is_numeric($user) ? (int) $user : null);

        if ($userModel) {
            if (! empty($userModel->email)) {
                $usernames[] = $userModel->email;
            }
            if (! empty($userModel->name)) {
                $usernames[] = $userModel->name;
            }
        } elseif (is_string($user)) {
            $usernames[] = $user;
        }

        // DB'deki media_server_accounts kayıtlarını topla
        $dbAccounts = collect();
        if ($userId) {
            $dbAccounts = MediaServerAccount::where('user_id', $userId)->get();
        } elseif (! empty($usernames)) {
            $dbAccounts = MediaServerAccount::whereIn('external_username', $usernames)->get();
        }

        foreach ($dbAccounts as $acc) {
            if (! empty($acc->external_username)) {
                $usernames[] = $acc->external_username;
            }
        }
        $usernames = array_unique(array_filter($usernames));

        $deletedAny = false;

        // 1. Kullanıcı adlarıyla tüm aktif Jellyfin sunucularında ara ve sil
        foreach ($usernames as $uname) {
            $found = $this->findUserAcrossServers($uname);
            if ($found !== null) {
                $server = $found['server'];
                $jellyfinUser = $found['jellyfin_user'];
                $guid = $jellyfinUser['Id'] ?? null;
                if ($guid) {
                    $server->deleteUser($guid);
                    $deletedAny = true;
                    Log::info("JellyfinLoadBalancer: Kullanıcı sunucudan silindi: {$uname} (ID: {$guid}, Sunucu: {$server->name})");
                }
            }
        }

        // 2. DB'deki external_user_id bilgisiyle de tüm sunucularda silmeyi garantile
        $servers = JellyfinServer::where('is_active', true)->get();
        foreach ($dbAccounts as $acc) {
            if (! empty($acc->external_user_id)) {
                foreach ($servers as $srv) {
                    $srv->deleteUser($acc->external_user_id);
                }
            }
        }

        // 3. Veritabanından (media_server_accounts) temizle
        $query = MediaServerAccount::query();
        if ($userId) {
            $query->where('user_id', $userId);
        }
        if (! empty($usernames)) {
            $query->orWhereIn('external_username', $usernames);
        }
        $deletedDbCount = $query->delete();

        if ($deletedDbCount > 0) {
            Log::info("JellyfinLoadBalancer: media_server_accounts tablosundan {$deletedDbCount} kayıt silindi.");
        }

        return $deletedAny || $deletedDbCount > 0;
    }
}
