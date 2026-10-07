<?php

namespace Tests\Feature;

use App\Enums\UserPlan;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserRolesAndPlansTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_user_has_user_role_and_free_plan(): void
    {
        $user = User::factory()->create();

        $this->assertEquals(UserRole::USER, $user->role);
        $this->assertEquals(UserPlan::FREE, $user->plan);
        $this->assertFalse($user->isAdmin());
        $this->assertTrue($user->isUser());
    }

    public function test_admin_role_check(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($admin->isUser());
    }

    public function test_user_plan_level_comparison(): void
    {
        $user = User::factory()->create([
            'plan' => UserPlan::PREMIUM,
        ]);

        $this->assertTrue($user->hasMinPlan(UserPlan::BASIC));
        $this->assertTrue($user->hasMinPlan(UserPlan::PREMIUM));
        $this->assertFalse($user->hasMinPlan(UserPlan::VIP));
    }
}
