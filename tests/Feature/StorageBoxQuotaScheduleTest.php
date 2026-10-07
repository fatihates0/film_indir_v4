<?php

namespace Tests\Feature;

use App\Enums\StorageBoxStatus;
use App\Models\StorageBox;
use App\Services\StorageGatewayService;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class StorageBoxQuotaScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_refresh_quota_command_runs_successfully(): void
    {
        $box = StorageBox::factory()->create([
            'status' => StorageBoxStatus::Active,
            'total_capacity_gb' => 1000,
            'used_capacity_gb' => 200,
            'free_capacity_gb' => 800,
        ]);

        $mockService = Mockery::mock(StorageGatewayService::class);
        $mockService->shouldReceive('checkAndUpdate')
            ->once()
            ->with(Mockery::on(fn ($b) => $b->id === $box->id))
            ->andReturn($box);

        $this->app->instance(StorageGatewayService::class, $mockService);

        $this->artisan('storage-box:refresh-quota')
            ->assertSuccessful();
    }

    public function test_quota_refresh_command_is_scheduled_every_thirty_minutes(): void
    {
        $schedule = $this->app->make(Schedule::class);
        $events = collect($schedule->events());

        $quotaEvent = $events->first(function ($event) {
            return str_contains($event->command ?? '', 'storage-box:refresh-quota');
        });

        $this->assertNotNull($quotaEvent, 'storage-box:refresh-quota command is not registered in schedule');
        $this->assertEquals('*/30 * * * *', $quotaEvent->expression);
    }
}
