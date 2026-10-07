<?php

namespace Tests\Feature;

use App\Enums\StorageBoxProtocol;
use App\Enums\StorageBoxStatus;
use App\Enums\UserRole;
use App\Jobs\ScanStorageBoxJob;
use App\Models\MediaFile;
use App\Models\StorageBox;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MediaManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_medias_index(): void
    {
        $response = $this->get('/admin/medias');

        $response->assertStatus(404);
    }

    public function test_standard_user_cannot_access_medias_index(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::USER,
        ]);

        $response = $this->actingAs($user)->get('/admin/medias');

        $response->assertStatus(404);
    }

    public function test_admin_can_access_medias_index(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create([
            'name' => 'Main Movie Storage',
            'protocol' => StorageBoxProtocol::CustomGateway,
        ]);

        MediaFile::factory()->count(3)->create([
            'storage_box_id' => $box->id,
            'category' => 'movie',
            'quality' => '1080p',
        ]);

        $response = $this->actingAs($admin)->get('/admin/medias');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Medias/Index')
            ->has('medias.data', 3)
            ->has('stats')
            ->has('storageBoxes', 1)
        );
    }

    public function test_admin_can_filter_medias_by_search_and_quality(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create();

        MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'name' => 'Inception.2010.2160p.mkv',
            'clean_title' => 'Inception',
            'quality' => '2160p',
            'category' => 'movie',
        ]);

        MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'name' => 'Interstellar.2014.1080p.mkv',
            'clean_title' => 'Interstellar',
            'quality' => '1080p',
            'category' => 'movie',
        ]);

        $response = $this->actingAs($admin)->get('/admin/medias?search=Inception&quality=2160p');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Medias/Index')
            ->has('medias.data', 1)
            ->where('medias.data.0.clean_title', 'Inception')
        );
    }

    public function test_admin_can_delete_media_record(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create();
        $media = MediaFile::factory()->create([
            'storage_box_id' => $box->id,
        ]);

        $response = $this->actingAs($admin)->delete("/admin/medias/{$media->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('media_files', [
            'id' => $media->id,
        ]);
    }

    public function test_admin_can_bulk_delete_media_records(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create();
        $medias = MediaFile::factory()->count(3)->create([
            'storage_box_id' => $box->id,
        ]);

        $idsToDelete = [$medias[0]->id, $medias[1]->id];

        $response = $this->actingAs($admin)->post('/admin/medias/bulk-delete', [
            'ids' => $idsToDelete,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseMissing('media_files', ['id' => $medias[0]->id]);
        $this->assertDatabaseMissing('media_files', ['id' => $medias[1]->id]);
        $this->assertDatabaseHas('media_files', ['id' => $medias[2]->id]);
    }

    public function test_admin_can_trigger_scan(): void
    {
        Queue::fake();

        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create([
            'status' => StorageBoxStatus::Active,
        ]);

        $response = $this->actingAs($admin)->post('/admin/medias/scan', [
            'storage_box_id' => $box->id,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        Queue::assertPushedOn('disk_scan', ScanStorageBoxJob::class, function ($job) use ($box) {
            return $job->storageBoxId === $box->id;
        });
    }

    public function test_admin_can_trigger_scan_for_all_boxes_on_disk_scan_queue(): void
    {
        Queue::fake();

        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $response = $this->actingAs($admin)->post('/admin/medias/scan', [
            'storage_box_id' => 'all',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        Queue::assertPushedOn('disk_scan', ScanStorageBoxJob::class, function ($job) {
            return $job->storageBoxId === null;
        });
    }

    public function test_admin_can_clear_all_medias(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create();
        MediaFile::factory()->count(5)->create([
            'storage_box_id' => $box->id,
        ]);

        $this->assertEquals(5, MediaFile::count());

        $response = $this->actingAs($admin)->post('/admin/medias/clear-all', [
            'storage_box_id' => 'all',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertEquals(0, MediaFile::count());
    }

    public function test_admin_can_clear_medias_for_specific_storage_box(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box1 = StorageBox::factory()->create(['name' => 'Box 1']);
        $box2 = StorageBox::factory()->create(['name' => 'Box 2']);

        MediaFile::factory()->count(3)->create(['storage_box_id' => $box1->id]);
        MediaFile::factory()->count(2)->create(['storage_box_id' => $box2->id]);

        $response = $this->actingAs($admin)->post('/admin/medias/clear-all', [
            'storage_box_id' => $box1->id,
        ]);

        $response->assertRedirect();
        $this->assertEquals(0, MediaFile::where('storage_box_id', $box1->id)->count());
        $this->assertEquals(2, MediaFile::where('storage_box_id', $box2->id)->count());
    }

    public function test_series_episodes_are_counted_as_one_item_in_pagination_when_grouped(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create();

        // Create 10 episodes of "How I Met Your Mother"
        for ($i = 1; $i <= 10; $i++) {
            $ep = sprintf('%02d', $i);
            MediaFile::factory()->create([
                'storage_box_id' => $box->id,
                'name' => "How.I.Met.Your.Mother.S01E{$ep}.1080p.mkv",
                'clean_title' => 'How I Met Your Mother',
                'category' => 'series',
            ]);
        }

        // Create 2 independent movies
        MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'name' => 'Inception.2010.1080p.mkv',
            'clean_title' => 'Inception',
            'category' => 'movie',
        ]);
        MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'name' => 'Interstellar.2014.1080p.mkv',
            'clean_title' => 'Interstellar',
            'category' => 'movie',
        ]);

        // When grouping is ON (default: grouped=1):
        // 10 episodes + 2 movies = 3 distinct titles in total
        $responseGrouped = $this->actingAs($admin)->get('/admin/medias?grouped=1');
        $responseGrouped->assertStatus(200);
        $responseGrouped->assertInertia(fn ($page) => $page
            ->component('Admin/Medias/Index')
            ->has('medias.data', 3)
            ->where('medias.total', 3)
        );

        // Verify the series group has all 10 episodes nested inside items
        $pageProps = $responseGrouped->getOriginalContent()->getData()['page']['props'];
        $seriesGroup = collect($pageProps['medias']['data'])->firstWhere('type', 'series_group');
        $this->assertNotNull($seriesGroup);
        $this->assertEquals('How I Met Your Mother', $seriesGroup['clean_title']);
        $this->assertCount(10, $seriesGroup['items']);

        // When grouping is OFF (grouped=0):
        // All 12 files are individually listed in pagination
        $responseUngrouped = $this->actingAs($admin)->get('/admin/medias?grouped=0');
        $responseUngrouped->assertStatus(200);
        $responseUngrouped->assertInertia(fn ($page) => $page
            ->component('Admin/Medias/Index')
            ->has('medias.data', 12)
            ->where('medias.total', 12)
        );
    }
}
