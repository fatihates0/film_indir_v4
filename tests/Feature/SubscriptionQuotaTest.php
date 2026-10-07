<?php

namespace Tests\Feature;

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
}
