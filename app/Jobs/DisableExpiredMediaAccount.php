<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\MediaServers\EmbyService;
use App\Services\MediaServers\JellyfinService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class DisableExpiredMediaAccount implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public User $user,
        public ?string $externalUserId = null
    ) {}

    public function handle(JellyfinService $jellyfin, EmbyService $emby): void
    {
        Log::info("DisableExpiredMediaAccount çalıştırılıyor: Kullanıcı {$this->user->name} (#{$this->user->id})");

        $externalId = $this->externalUserId ?? (string) $this->user->id;

        if ($jellyfin->isConfigured()) {
            $jellyfin->setUserEnabled($externalId, false);
            $jellyfin->terminateUserSessions($externalId);
        }

        if ($emby->isConfigured()) {
            $emby->setUserEnabled($externalId, false);
            $emby->terminateUserSessions($externalId);
        }
    }
}
