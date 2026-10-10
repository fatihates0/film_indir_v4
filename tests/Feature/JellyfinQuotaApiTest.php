<?php

namespace Tests\Feature;

use App\Enums\UserPlan;
use App\Enums\UserRole;
use App\Models\Plan;
use App\Models\User;
use App\Services\SubscriptionService;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JellyfinQuotaApiTest extends TestCase
{
    use RefreshDatabase;

    protected SubscriptionService $subscriptionService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);
        $this->subscriptionService = app(SubscriptionService::class);
    }

    public function test_user_without_package_is_denied(): void
    {
        $user = User::factory()->create([
            'name' => 'deniz',
            'email' => 'deniz@example.com',
            'role' => UserRole::USER,
            'plan' => UserPlan::FREE,
        ]);

        $response = $this->getJson(route('api.jellyfin.check_access', ['username' => 'deniz']));

        $response->assertOk()
            ->assertJson([
                'allowed' => false,
                'reason' => 'no_package',
                'has_package' => false,
            ]);
    }

    public function test_user_with_package_but_exhausted_quota_is_denied(): void
    {
        $user = User::factory()->create([
            'name' => 'can',
            'email' => 'can@example.com',
            'role' => UserRole::USER,
            'plan' => UserPlan::BASIC,
        ]);

        $plan = Plan::where('type', Plan::TYPE_INDIVIDUAL)->firstOrFail();
        $this->subscriptionService->subscribe($user, $plan, 1);

        // Exhaust the quota completely
        $this->subscriptionService->deductUserQuota($user, $plan->monthly_quota_bytes);

        $response = $this->getJson(route('api.jellyfin.check_access', ['username' => 'can']));

        $response->assertOk()
            ->assertJson([
                'allowed' => false,
                'reason' => 'quota_exhausted',
                'has_package' => true,
                'remaining_bytes' => 0,
            ]);
    }

    public function test_user_with_package_and_remaining_quota_is_allowed(): void
    {
        $user = User::factory()->create([
            'name' => 'elif',
            'email' => 'elif@example.com',
            'role' => UserRole::USER,
            'plan' => UserPlan::PREMIUM,
        ]);

        $plan = Plan::where('type', Plan::TYPE_INDIVIDUAL)->firstOrFail();
        $this->subscriptionService->subscribe($user, $plan, 1);

        $response = $this->getJson(route('api.jellyfin.check_access', ['username' => 'elif']));

        $response->assertOk()
            ->assertJson([
                'allowed' => true,
                'reason' => 'access_granted',
                'has_package' => true,
            ]);

        $this->assertGreaterThan(0, $response->json('remaining_bytes'));
    }

    public function test_admin_is_always_allowed(): void
    {
        $admin = User::factory()->create([
            'name' => 'adminuser',
            'email' => 'admin@example.com',
            'role' => UserRole::ADMIN,
        ]);

        $response = $this->getJson(route('api.jellyfin.check_access', ['username' => 'adminuser']));

        $response->assertOk()
            ->assertJson([
                'allowed' => true,
                'reason' => 'admin',
                'has_package' => true,
            ]);
    }

    public function test_non_existent_user_is_denied(): void
    {
        $response = $this->getJson(route('api.jellyfin.check_access', ['username' => 'bilinmeyen_kullanici']));

        $response->assertOk()
            ->assertJson([
                'allowed' => false,
                'reason' => 'user_not_found',
            ]);
    }

    public function test_deduct_quota_reduces_remaining_bytes(): void
    {
        $user = User::factory()->create([
            'name' => 'murat',
            'email' => 'murat@example.com',
            'role' => UserRole::USER,
            'plan' => UserPlan::BASIC,
        ]);

        $plan = Plan::where('type', Plan::TYPE_INDIVIDUAL)->firstOrFail();
        $this->subscriptionService->subscribe($user, $plan, 1);

        $initialRemaining = $this->subscriptionService->getTotalRemainingBytes($user);
        $bytesToDeduct = 10 * 1024 * 1024 * 1024; // 10 GB

        $response = $this->postJson(route('api.jellyfin.deduct_quota'), [
            'username' => 'murat',
            'bytes' => $bytesToDeduct,
        ]);

        $response->assertOk()
            ->assertJson([
                'status' => 'success',
                'deducted_bytes' => $bytesToDeduct,
                'quota_exhausted' => false,
            ]);

        $this->assertEquals($initialRemaining - $bytesToDeduct, $response->json('remaining_bytes'));
    }
}
