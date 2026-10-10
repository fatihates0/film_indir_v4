<?php

namespace Tests\Feature;

use App\Enums\StorageBoxProtocol;
use App\Enums\UserRole;
use App\Models\DownloadTicket;
use App\Models\MediaFile;
use App\Models\Plan;
use App\Models\StorageBox;
use App\Models\User;
use App\Services\SubscriptionService;
use Carbon\Carbon;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionQuotaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    public function test_user_can_subscribe_to_plan_for_multiple_months(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();

        $service = app(SubscriptionService::class);
        $subscription = $service->subscribe($user, $plan, 3);

        $this->assertEquals(3, $subscription->duration_months);
        $this->assertEquals('active', $subscription->status);

        $currentPeriod = $service->getCurrentPeriod($user);
        $this->assertNotNull($currentPeriod);
        $this->assertEquals(1, $currentPeriod->period_number);
        $this->assertEquals($plan->monthly_quota_bytes, $currentPeriod->allocated_bytes);
        $this->assertEquals(0, $currentPeriod->used_bytes);
        $this->assertTrue($currentPeriod->hasAvailableQuota());
    }

    public function test_user_can_subscribe_via_web_route(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();

        $response = $this->actingAs($user)->post("/subscribe/{$plan->id}", [
            'duration_months' => 1,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('subscription_periods', [
            'user_id' => $user->id,
            'is_active' => true,
        ]);
    }

    public function test_byte_deduction_records_exact_bytes_transferred(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 1);
        $period = $service->getCurrentPeriod($user);

        $box = StorageBox::create([
            'name' => 'Box 1',
            'host' => 'u123.your-storagebox.de',
            'protocol' => 'custom_gateway',
            'port' => 443,
            'username' => 'u123',
            'password' => 'secret',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $file = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'Matrix.1999.1080p.mkv',
            'path' => '/movies/Matrix.1999.1080p.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 10737418240, // 10 GB
        ]);

        $ticket = DownloadTicket::create([
            'token' => DownloadTicket::generateToken(),
            'user_id' => $user->id,
            'media_file_id' => $file->id,
            'subscription_period_id' => $period->id,
            'bytes_downloaded' => 0,
            'expires_at' => now()->addHour(),
        ]);

        // Simulate downloading exactly 3 GB (3,221,225,472 bytes) and disconnecting
        $exactThreeGb = 3 * 1024 * 1024 * 1024;
        $service->recordBytes($ticket->token, $exactThreeGb);

        $period->refresh();
        $ticket->refresh();

        $this->assertEquals($exactThreeGb, $ticket->bytes_downloaded);
        $this->assertEquals($exactThreeGb, $period->used_bytes);
        $this->assertEquals($plan->monthly_quota_bytes - $exactThreeGb, $period->remaining_bytes);
    }

    public function test_monthly_quota_resets_automatically_after_one_month(): void
    {
        Carbon::setTestNow('2026-03-15 10:00:00');

        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 3); // 3 months subscription

        $period1 = $service->getCurrentPeriod($user);
        $this->assertEquals(1, $period1->period_number);

        // Download 500 GB in month 1
        $service->recordBytes('dummy', 0); // test safety
        $period1->update(['used_bytes' => 500 * 1024 * 1024 * 1024]);
        $this->assertEquals(500 * 1024 * 1024 * 1024, $period1->fresh()->used_bytes);

        // Fast-forward 1 month + 1 day to 2026-04-16
        Carbon::setTestNow('2026-04-16 10:00:00');

        // Lazy evaluation or cron advances cycle:
        $period2 = $service->getCurrentPeriod($user);
        $this->assertNotNull($period2);
        $this->assertEquals(2, $period2->period_number);
        $this->assertEquals(0, $period2->used_bytes, 'Aylık kota sıfırlanmalıdır');
        $this->assertEquals($plan->monthly_quota_bytes, $period2->remaining_bytes);

        // Old period is deactivated
        $this->assertFalse($period1->fresh()->is_active);

        Carbon::setTestNow(); // reset
    }

    public function test_download_is_blocked_when_quota_exhausted(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 1);
        $period = $service->getCurrentPeriod($user);

        // Exhaust the quota completely
        $period->update(['used_bytes' => $plan->monthly_quota_bytes]);
        $this->assertFalse($period->fresh()->hasAvailableQuota());
        $this->assertFalse($user->fresh()->canDownload());

        $box = StorageBox::create([
            'name' => 'Box 1',
            'host' => 'u123.your-storagebox.de',
            'protocol' => 'custom_gateway',
            'port' => 443,
            'username' => 'u123',
            'password' => 'secret',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $file = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'Avatar.2009.1080p.mkv',
            'path' => '/movies/Avatar.2009.1080p.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 10737418240,
        ]);

        $response = $this->actingAs($user)->postJson(route('downloads.prepare', ['mediaFile' => $file->id]));

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'code' => 'QUOTA_EXHAUSTED',
        ]);
    }

    public function test_stream_url_includes_ticket_token_and_log_bytes_updates_quota(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 1);
        $period = $service->getCurrentPeriod($user);

        $box = StorageBox::create([
            'name' => 'Box 1',
            'host' => 'storage1.filmindir.com',
            'protocol' => 'custom_gateway',
            'port' => 443,
            'username' => 'u123',
            'password' => 'secret',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $file = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'Matrix.mkv',
            'path' => '/movies/Matrix.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 10737418240,
        ]);

        $prepareRes = $this->actingAs($user)->postJson(route('downloads.prepare', ['mediaFile' => $file->id]));
        $prepareRes->assertStatus(200);
        $token = $prepareRes->json('token');

        $streamRes = $this->actingAs($user)->get(route('downloads.stream', ['token' => $token]));
        $streamRes->assertStatus(302);
        $targetUrl = $streamRes->headers->get('Location');

        // Parse token from target URL query params
        parse_str(parse_url($targetUrl, PHP_URL_QUERY), $queryParams);
        $gatewayToken = $queryParams['token'];
        [$payloadBase64] = explode('.', $gatewayToken);
        $payload = json_decode(base64_decode($payloadBase64), true);

        $this->assertEquals($token, $payload['ticket_token']);
        $this->assertNotEmpty($payload['app_url']);

        // Simulate Storage Gateway webhook callback to log-bytes endpoint
        $transferredBytes = 5 * 1024 * 1024 * 1024; // 5 GB
        $webhookRes = $this->postJson(route('downloads.log-bytes'), [
            'token' => $payload['ticket_token'],
            'bytes_sent' => $transferredBytes,
        ]);

        $webhookRes->assertStatus(200);
        $webhookRes->assertJson(['status' => 'ok']);

        $period->refresh();
        $this->assertEquals($transferredBytes, $period->used_bytes);
    }

    public function test_multiple_range_requests_are_capped_at_media_file_size_bytes(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 1);
        $period = $service->getCurrentPeriod($user);

        $box = StorageBox::create([
            'name' => 'Box 1',
            'host' => 'storage1.filmindir.com',
            'protocol' => 'custom_gateway',
            'port' => 443,
            'username' => 'u123',
            'password' => 'secret',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $fileSizeBytes = 2520295065; // ~2.35 GB
        $file = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'StarWars.mkv',
            'path' => '/movies/StarWars.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => $fileSizeBytes,
        ]);

        $ticket = DownloadTicket::create([
            'token' => DownloadTicket::generateToken(),
            'user_id' => $user->id,
            'media_file_id' => $file->id,
            'subscription_period_id' => $period->id,
            'bytes_downloaded' => 0,
            'expires_at' => now()->addHour(),
        ]);

        // Request 1: 168 MB initial Range request
        $chunk1 = 168524098;
        $service->recordBytes($ticket->token, $chunk1);

        // Request 2: Full file transfer 2.35 GB
        $service->recordBytes($ticket->token, $fileSizeBytes);

        $period->refresh();
        $ticket->refresh();

        // Total recorded bytes for this ticket must equal fileSizeBytes exactly, not exceeding it!
        $this->assertEquals($fileSizeBytes, $ticket->bytes_downloaded);
        $this->assertEquals($fileSizeBytes, $period->used_bytes);
    }

    public function test_download_prepare_fails_when_file_size_exceeds_remaining_quota(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 1);
        $period = $service->getCurrentPeriod($user);

        // User has 15 GB remaining quota
        $fifteenGb = 15 * 1024 * 1024 * 1024;
        $usedBytes = $plan->monthly_quota_bytes - $fifteenGb;
        $period->update(['used_bytes' => $usedBytes]);

        $box = StorageBox::create([
            'name' => 'Box 1',
            'host' => 'storage1.filmindir.com',
            'protocol' => 'custom_gateway',
            'port' => 443,
            'username' => 'u123',
            'password' => 'secret',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        // File is 18 GB
        $eighteenGb = 18 * 1024 * 1024 * 1024;
        $largeFile = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'Oppenheimer.2023.2160p.4K.mkv',
            'path' => '/movies/Oppenheimer.2023.2160p.4K.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => $eighteenGb,
        ]);

        $response = $this->actingAs($user)->postJson(route('downloads.prepare', ['mediaFile' => $largeFile->id]));

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'code' => 'INSUFFICIENT_QUOTA',
        ]);

        $this->assertStringContainsString('15,00 GB', $response->json('message'));
        $this->assertStringContainsString('18,00 GB', $response->json('message'));
    }

    public function test_admin_can_download_file_larger_than_user_quota(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        $box = StorageBox::create([
            'name' => 'Box 1',
            'host' => 'storage1.filmindir.com',
            'protocol' => 'custom_gateway',
            'port' => 443,
            'username' => 'u123',
            'password' => 'secret',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $largeFile = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'Avatar.2009.4K.mkv',
            'path' => '/movies/Avatar.2009.4K.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 100 * 1024 * 1024 * 1024, // 100 GB
        ]);

        $response = $this->actingAs($admin)->postJson(route('downloads.prepare', ['mediaFile' => $largeFile->id]));

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
    }

    public function test_user_is_restricted_by_max_parallel_downloads_limit(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();
        $plan->update(['max_parallel_downloads' => 1]);

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 1);

        $box = StorageBox::create([
            'name' => 'Box 1',
            'host' => 'storage1.filmindir.com',
            'protocol' => 'custom_gateway',
            'port' => 443,
            'username' => 'u123',
            'password' => 'secret',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $file1 = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'Movie1.mkv',
            'path' => '/movies/Movie1.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 2000000000,
        ]);

        $file2 = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'Movie2.mkv',
            'path' => '/movies/Movie2.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 2000000000,
        ]);

        // Start active download for File 1
        DownloadTicket::create([
            'token' => DownloadTicket::generateToken(),
            'user_id' => $user->id,
            'media_file_id' => $file1->id,
            'bytes_downloaded' => 100,
            'status' => 'active',
            'expires_at' => now()->addHour(),
        ]);

        // Attempting to download File 2 should fail due to parallel limit (max_parallel_downloads = 1)
        $response = $this->actingAs($user)->postJson(route('downloads.prepare', ['mediaFile' => $file2->id]));

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'code' => 'PARALLEL_LIMIT_EXCEEDED',
        ]);
    }

    public function test_user_can_request_same_media_file_multiple_times_without_parallel_limit_block(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();
        $plan->update(['max_parallel_downloads' => 1]);

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 1);

        $box = StorageBox::create([
            'name' => 'Box 1',
            'host' => 'storage1.filmindir.com',
            'protocol' => 'custom_gateway',
            'port' => 443,
            'username' => 'u123',
            'password' => 'secret',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $file1 = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'Movie1.mkv',
            'path' => '/movies/Movie1.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 2000000000,
        ]);

        // Active ticket for File 1
        DownloadTicket::create([
            'token' => DownloadTicket::generateToken(),
            'user_id' => $user->id,
            'media_file_id' => $file1->id,
            'bytes_downloaded' => 100,
            'status' => 'active',
            'expires_at' => now()->addHour(),
        ]);

        // Requesting File 1 again (e.g. IDM connection or resume) should be ALLOWED because it's the SAME file
        $response = $this->actingAs($user)->postJson(route('downloads.prepare', ['mediaFile' => $file1->id]));

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
    }

    public function test_check_active_endpoint_rejects_download_if_another_gateway_has_active_download(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();
        $plan->update(['max_parallel_downloads' => 1]);

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 1);

        $box = StorageBox::create([
            'name' => 'Box 1',
            'host' => 'storage1.filmindir.com',
            'protocol' => 'custom_gateway',
            'port' => 443,
            'username' => 'u123',
            'password' => 'secret',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $file1 = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'Movie1.mkv',
            'path' => '/movies/Movie1.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 2000000000,
        ]);

        $file2 = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'Movie2.mkv',
            'path' => '/movies/Movie2.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 2000000000,
        ]);

        // Active ticket on Gateway 1 for File 1
        $ticket1 = DownloadTicket::create([
            'token' => DownloadTicket::generateToken(),
            'user_id' => $user->id,
            'media_file_id' => $file1->id,
            'bytes_downloaded' => 100,
            'status' => 'active',
            'expires_at' => now()->addHour(),
        ]);

        // Gateway 2 calls check-active endpoint for File 2
        $response = $this->postJson(route('downloads.check-active'), [
            'token' => DownloadTicket::generateToken(),
            'user_id' => $user->id,
            'media_file_id' => $file2->id,
            'max_parallel_downloads' => 1,
        ]);

        $response->assertStatus(429);
        $response->assertJson([
            'allowed' => false,
            'code' => 'PARALLEL_LIMIT_EXCEEDED',
        ]);
    }

    public function test_download_token_includes_speed_limit_mbps_from_user_plan(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('monthly_quota_gb', 1500)->firstOrFail();
        $plan->update(['speed_limit_mbps' => 10]);

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 1);

        $this->assertEquals(10, $service->getSpeedLimitMbps($user));

        $box = StorageBox::create([
            'name' => 'Gateway Box 1',
            'protocol' => StorageBoxProtocol::CustomGateway,
            'host' => '1.2.3.4',
            'port' => 8080,
            'username' => 'root',
            'password' => 'secret123',
            'is_active' => true,
        ]);

        $file = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'LimitedSpeedMovie.mkv',
            'path' => '/movies/LimitedSpeedMovie.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 1000000,
        ]);

        $ticket = DownloadTicket::create([
            'token' => DownloadTicket::generateToken(),
            'user_id' => $user->id,
            'media_file_id' => $file->id,
            'bytes_downloaded' => 0,
            'status' => 'pending',
            'expires_at' => now()->addHours(3),
        ]);

        $response = $this->actingAs($user)->get(route('downloads.stream', ['token' => $ticket->token]));

        $response->assertStatus(302);
        $redirectUrl = $response->getTargetUrl();

        // Extract token parameter from redirect URL
        $parsed = parse_url($redirectUrl);
        parse_str($parsed['query'], $queryParams);
        $rawToken = $queryParams['token'];

        $parts = explode('.', $rawToken);
        $payload = json_decode(base64_decode($parts[0]), true);

        $this->assertEquals(10, $payload['speed_limit_mbps']);
    }

    public function test_business_plan_allows_vps_access_and_unlimited_parallel_downloads(): void
    {
        $user = User::factory()->create();
        $businessPlan = Plan::where('type', Plan::TYPE_BUSINESS)->firstOrFail();

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $businessPlan, 1);

        $this->assertTrue($service->allowsVpsAccess($user));
        $this->assertEquals(999999, $service->getMaxParallelDownloads($user));
        $this->assertTrue($service->canStartParallelDownload($user, 99));
    }

    public function test_extra_quota_requires_active_main_subscription(): void
    {
        $user = User::factory()->create();
        $extraPlan = Plan::where('type', Plan::TYPE_EXTRA)->firstOrFail();
        $service = app(SubscriptionService::class);

        $this->assertFalse($service->canBuyExtraQuota($user));

        $this->expectException(\RuntimeException::class);
        $service->purchaseExtraQuota($user, $extraPlan);
    }

    public function test_extra_quota_priority_over_main_subscription_period(): void
    {
        $user = User::factory()->create();
        $individualPlan = Plan::where('type', Plan::TYPE_INDIVIDUAL)->firstOrFail();
        $extraPlan = Plan::where('type', Plan::TYPE_EXTRA)->firstOrFail();

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $individualPlan, 1);

        $extraQuota = $service->purchaseExtraQuota($user, $extraPlan);
        $this->assertEquals(0, $extraQuota->used_bytes);

        $box = StorageBox::create([
            'name' => 'Box Extra Test',
            'host' => 'extra.storagebox.de',
            'protocol' => StorageBoxProtocol::CustomGateway,
            'port' => 443,
            'username' => 'u123',
            'password' => 'secret',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $file = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'TestMovie.mkv',
            'path' => '/movies/TestMovie.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 10 * 1024 * 1024 * 1024, // 10 GB
        ]);

        $ticket = DownloadTicket::create([
            'token' => DownloadTicket::generateToken(),
            'user_id' => $user->id,
            'media_file_id' => $file->id,
            'subscription_period_id' => $service->getCurrentPeriod($user)->id,
            'bytes_downloaded' => 0,
            'status' => 'active',
            'expires_at' => now()->addHours(3),
        ]);

        // Download 5 GB
        $downloadBytes = 5 * 1024 * 1024 * 1024;
        $service->recordBytes($ticket->token, $downloadBytes, false);

        // Verify Extra Quota used_bytes increased by 5 GB, while main period used_bytes remains 0!
        $extraQuota->refresh();
        $this->assertEquals($downloadBytes, $extraQuota->used_bytes);

        $mainPeriod = $service->getCurrentPeriod($user);
        $this->assertEquals(0, $mainPeriod->used_bytes);
    }

    public function test_extra_quota_expires_after_30_days(): void
    {
        $user = User::factory()->create();
        $individualPlan = Plan::where('type', Plan::TYPE_INDIVIDUAL)->firstOrFail();
        $extraPlan = Plan::where('type', Plan::TYPE_EXTRA)->firstOrFail();

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $individualPlan, 1);

        $extraQuota = $service->purchaseExtraQuota($user, $extraPlan);
        $this->assertEquals('active', $extraQuota->status);

        // Travel 31 days into future
        Carbon::setTestNow(now()->addDays(31));

        $activeExtras = $service->getActiveExtraQuotas($user);
        $this->assertCount(0, $activeExtras);

        $extraQuota->refresh();
        $this->assertEquals('expired', $extraQuota->status);

        Carbon::setTestNow();
    }

    public function test_user_with_exhausted_main_quota_can_download_using_extra_quota(): void
    {
        $user = User::factory()->create();
        $individualPlan = Plan::where('type', Plan::TYPE_INDIVIDUAL)->firstOrFail();
        $extraPlan = Plan::where('type', Plan::TYPE_EXTRA)->firstOrFail();

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $individualPlan, 1);

        // Exhaust main subscription period (0 remaining bytes)
        $period = $service->getCurrentPeriod($user);
        $period->update(['used_bytes' => $period->allocated_bytes]);
        $this->assertEquals(0, $period->fresh()->remaining_bytes);

        // Purchase extra quota
        $extraQuota = $service->purchaseExtraQuota($user, $extraPlan);
        $this->assertGreaterThan(0, $extraQuota->remaining_bytes);

        $box = StorageBox::create([
            'name' => 'Box Extra Quota Test',
            'host' => 'extra2.storagebox.de',
            'protocol' => StorageBoxProtocol::CustomGateway,
            'port' => 443,
            'username' => 'u999',
            'password' => 'secret_key_12345',
            'total_capacity_gb' => 5000,
            'free_capacity_gb' => 4000,
            'used_capacity_gb' => 1000,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        // 18 GB file
        $eighteenGb = 18 * 1024 * 1024 * 1024;
        $file = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'LargeMovie.mkv',
            'path' => '/movies/LargeMovie.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => $eighteenGb,
        ]);

        // User should be able to prepare download successfully
        $response = $this->actingAs($user)->postJson(route('downloads.prepare', ['mediaFile' => $file->id]));
        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'file_name' => 'LargeMovie.mkv',
        ]);

        $token = $response->json('token');
        $this->assertNotEmpty($token);

        // User should also be able to stream download successfully
        $streamResponse = $this->actingAs($user)->get(route('downloads.stream', ['token' => $token]));
        $streamResponse->assertRedirect();

        // Verify downloading deducts directly from extra quota
        $fiveGb = 5 * 1024 * 1024 * 1024;
        $service->recordBytes($token, $fiveGb, false);

        $extraQuota->refresh();
        $this->assertEquals($fiveGb, $extraQuota->used_bytes);
    }

    public function test_check_active_endpoint_evaluates_client_ip_not_gateway_server_ip(): void
    {
        $user = User::factory()->create();
        $plan = Plan::where('type', Plan::TYPE_INDIVIDUAL)->firstOrFail();
        $service = app(SubscriptionService::class);
        $service->subscribe($user, $plan, 1);

        $box = StorageBox::create([
            'name' => 'Gateway Box IP Test',
            'host' => 'gw.filmindir.com',
            'protocol' => StorageBoxProtocol::CustomGateway,
            'port' => 443,
            'username' => 'u1',
            'password' => 'secret123',
            'total_capacity_gb' => 1000,
            'free_capacity_gb' => 500,
            'used_capacity_gb' => 500,
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $file = MediaFile::create([
            'storage_box_id' => $box->id,
            'name' => 'File.mkv',
            'path' => '/movies/File.mkv',
            'directory' => '/movies',
            'extension' => 'mkv',
            'size_bytes' => 1024 * 1024 * 1024,
        ]);

        $ticket = DownloadTicket::create([
            'token' => DownloadTicket::generateToken(),
            'user_id' => $user->id,
            'media_file_id' => $file->id,
            'subscription_period_id' => $service->getCurrentPeriod($user)?->id,
            'bytes_downloaded' => 0,
            'status' => 'pending',
            'expires_at' => now()->addHours(3),
        ]);

        // Simulated webhook from Gateway server with Hetzner datacenter IP in CF-Connecting-IP header,
        // but real residential client_ip in body.
        $response = $this->withHeaders([
            'CF-Connecting-IP' => '159.69.1.1', // Hetzner datacenter IP (hosting keyword)
        ])->postJson(route('downloads.check-active'), [
            'token' => $ticket->token,
            'user_id' => $user->id,
            'media_file_id' => $file->id,
            'client_ip' => '176.234.12.34', // Residential IP
            'max_parallel_downloads' => 3,
        ]);

        $response->assertOk();
        $response->assertJson([
            'allowed' => true,
        ]);
    }

    public function test_extra_quota_packages_do_not_grant_vps_access_only_main_subscription_controls_it(): void
    {
        $user = User::factory()->create();
        $individualPlan = Plan::where('type', Plan::TYPE_INDIVIDUAL)->firstOrFail();
        $individualPlan->update(['allow_vps_access' => false]);

        $service = app(SubscriptionService::class);
        $service->subscribe($user, $individualPlan, 1);

        // Ana pakette VPS kapalı -> VPS izni yok
        $this->assertFalse($service->allowsVpsAccess($user));

        // Ek paket satın alınsa dahi ana pakette VPS kapalı olduğu için VPS izni verilmemeli
        $extraPlan = Plan::create([
            'name' => '2000 GB Extra VPS',
            'slug' => '2000-gb-extra-vps',
            'type' => Plan::TYPE_EXTRA,
            'monthly_quota_gb' => 2000,
            'monthly_quota_bytes' => 2000 * 1024 * 1024 * 1024,
            'price_1m' => 100,
            'price_3m' => 100,
            'price_6m' => 100,
            'price_12m' => 100,
            'max_parallel_downloads' => 3,
            'allow_vps_access' => true,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $service->purchaseExtraQuota($user, $extraPlan);

        // Ek paket VPS iznini değiştiremez: hala false olmalı
        $this->assertFalse($service->allowsVpsAccess($user));

        // Ana pakette VPS izni açıldığında ise izin verilmeli
        $individualPlan->update(['allow_vps_access' => true]);
        $this->assertTrue($service->allowsVpsAccess($user));
    }

    public function test_can_assign_perpetual_plan_to_user(): void
    {
        $user = User::factory()->create();
        $service = app(SubscriptionService::class);

        $subscription = $service->subscribe(
            $user,
            null, // custom quota
            1,
            0,
            'Yönetici tarafından özel kota tanımlandı',
            100, // 100 GB
            true // isPerpetual
        );

        $this->assertNotNull($subscription);
        $this->assertTrue($subscription->is_perpetual);
        $this->assertEquals(0, $subscription->duration_months);
        $this->assertEquals('active', $subscription->status);
        $this->assertTrue($subscription->expires_at->isAfter(now()->addYears(90)));
    }

    public function test_user_cannot_cancel_perpetual_subscription_if_remaining_quota_is_5gb_or_more(): void
    {
        $user = User::factory()->create();
        $service = app(SubscriptionService::class);

        // 10 GB perpetual quota, 0 GB used -> 10 GB remaining (>= 5 GB)
        $service->subscribe($user, null, 1, 0, 'Süresiz 10 GB', 10, true);

        $quota = $service->getQuotaSummary($user);
        $this->assertFalse($quota['can_cancel_perpetual']);

        $this->expectException(\InvalidArgumentException::class);
        $service->cancelPerpetualSubscription($user);
    }

    public function test_user_can_cancel_perpetual_subscription_when_remaining_quota_is_under_5gb(): void
    {
        $user = User::factory()->create();
        $service = app(SubscriptionService::class);

        // 10 GB perpetual quota
        $sub = $service->subscribe($user, null, 1, 0, 'Süresiz 10 GB', 10, true);
        $period = $service->getCurrentPeriod($user);

        // Use 9 GB -> 1 GB remaining (< 5 GB)
        $period->update([
            'used_bytes' => 9 * 1024 * 1024 * 1024,
        ]);

        $quota = $service->getQuotaSummary($user);
        $this->assertTrue($quota['can_cancel_perpetual']);

        // Cancel via web endpoint
        $response = $this->actingAs($user)->post(route('subscription.cancel-perpetual'));
        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Check subscription is cancelled
        $sub->refresh();
        $this->assertEquals('cancelled', $sub->status);
        $period->refresh();
        $this->assertFalse($period->is_active);

        // Quota summary should reflect no subscription
        $newQuota = $service->getQuotaSummary($user);
        $this->assertFalse($newQuota['has_subscription']);
    }
}
