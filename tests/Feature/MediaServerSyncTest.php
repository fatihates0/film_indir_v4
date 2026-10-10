<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Jobs\DisableExpiredMediaAccount;
use App\Jobs\ProvisionMediaAccount;
use App\Models\MediaServerAccount;
use App\Models\Subscription;
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

    public function test_expired_subscription_purges_media_server_account_via_command(): void
    {
        $user = User::factory()->create(['email' => 'expiretest@example.com']);

        // Create an expired subscription
        Subscription::create([
            'user_id' => $user->id,
            'plan_id' => null,
            'status' => 'active',
            'starts_at' => now()->subDays(30),
            'expires_at' => now()->subMinute(),
            'billing_anchor_day' => 1,
        ]);

        // Create a media server account record in DB
        MediaServerAccount::create([
            'user_id' => $user->id,
            'server_type' => 'jellyfin',
            'external_user_id' => 'fake-guid-123',
            'external_username' => $user->email,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('media_server_accounts', [
            'user_id' => $user->id,
            'external_username' => 'expiretest@example.com',
        ]);

        // Run check-subscriptions command
        $this->artisan('app:check-subscriptions')->assertSuccessful();

        // Ensure the media server account was purged from DB
        $this->assertDatabaseMissing('media_server_accounts', [
            'user_id' => $user->id,
        ]);
    }

    public function test_visiting_media_server_without_active_subscription_purges_account(): void
    {
        $user = User::factory()->create(['email' => 'visittest@example.com', 'role' => UserRole::USER]);

        MediaServerAccount::create([
            'user_id' => $user->id,
            'server_type' => 'jellyfin',
            'external_user_id' => 'fake-guid-456',
            'external_username' => $user->email,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('media_server_accounts', [
            'user_id' => $user->id,
        ]);

        // User visits /media-server without active subscription
        $response = $this->actingAs($user)->get(route('media-server.index'));
        $response->assertOk();

        // Account should be automatically purged from DB
        $this->assertDatabaseMissing('media_server_accounts', [
            'user_id' => $user->id,
        ]);
    }
}
