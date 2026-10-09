<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\MediaServers\EmbyService;
use App\Services\MediaServers\JellyfinService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProvisionMediaAccount implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public User $user
    ) {}

    public function handle(JellyfinService $jellyfin, EmbyService $emby): void
    {
        Log::info("ProvisionMediaAccount çalıştırılıyor: Kullanıcı {$this->user->name} (#{$this->user->id})");

        if ($jellyfin->isConfigured()) {
            $jellyfin->createUser($this->user->email, bin2hex(random_bytes(8)));
        }

        if ($emby->isConfigured()) {
            $emby->createUser($this->user->email, bin2hex(random_bytes(8)));
        }
    }
}
