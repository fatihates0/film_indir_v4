<?php

namespace Tests\Feature;

use App\Jobs\DisableExpiredMediaAccount;
use App\Jobs\ProvisionMediaAccount;
use App\Models\User;
use App\Services\MediaServers\EmbyService;
use App\Services\MediaServers\JellyfinService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MediaServerSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_provision_media_account_job_dispatches_cleanly(): void
    {
        Queue::fake();

        $user = User::factory()->create();

        ProvisionMediaAccount::dispatch($user);

        Queue::assertPushed(ProvisionMediaAccount::class, function ($job) use ($user) {
            return $job->user->id === $user->id;
        });
    }

    public function test_disable_expired_media_account_job_dispatches_cleanly(): void
    {
        Queue::fake();

        $user = User::factory()->create();

        DisableExpiredMediaAccount::dispatch($user);

        Queue::assertPushed(DisableExpiredMediaAccount::class, function ($job) use ($user) {
            return $job->user->id === $user->id;
        });
    }

    public function test_jellyfin_and_emby_services_handle_unconfigured_state_safely(): void
    {
        config(['services.jellyfin.url' => '', 'services.jellyfin.api_key' => '']);
        config(['services.emby.url' => '', 'services.emby.api_key' => '']);

        $jellyfin = new JellyfinService;
        $emby = new EmbyService;

        $this::assertFalse($jellyfin->isConfigured());
        $this::assertFalse($emby->isConfigured());

        $this::assertNull($jellyfin->createUser('testuser', 'secret123'));
        $this::assertFalse($jellyfin->setUserEnabled('ext123', false));
        $this::assertFalse($jellyfin->terminateUserSessions('ext123'));

        $this::assertNull($emby->createUser('testuser', 'secret123'));
        $this::assertFalse($emby->setUserEnabled('ext123', false));
        $this::assertFalse($emby->terminateUserSessions('ext123'));
    }
}
