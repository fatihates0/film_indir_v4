<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\StorageBox;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_initialize_upload(): void
    {
        $user = User::factory()->create(['role' => UserRole::USER]);

        $response = $this->actingAs($user)->postJson(route('admin.uploads.init'), [
            'filename' => 'Test.Movie.2024.1080p.mkv',
            'file_size' => 1073741824,
        ]);

        $response->assertNotFound();
    }

    public function test_admin_can_initiate_upload_with_random_storage_box_selection(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        $box1 = StorageBox::factory()->create([
            'status' => 'active',
            'connection_status' => 'online',
            'free_capacity_gb' => 500,
        ]);

        $box2 = StorageBox::factory()->create([
            'status' => 'active',
            'connection_status' => 'online',
            'free_capacity_gb' => 1000,
        ]);

        Http::fake([
            '*' => Http::response([
                'success' => true,
                'upload_id' => 'test_upload_123',
                'chunk_size' => 5242880,
            ], 200),
        ]);

        $response = $this->actingAs($admin)->postJson(route('admin.uploads.init'), [
            'filename' => 'Inception.2010.1080p.mkv',
            'file_size' => 2147483648,
            'category' => 'movie',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'upload_id',
            'storage_box' => ['id', 'name', 'host'],
            'target_path',
            'urls' => ['chunk', 'status', 'finish'],
        ]);

        $chosenBoxId = $response->json('storage_box.id');
        $this->assertContains($chosenBoxId, [$box1->id, $box2->id]);
    }

    public function test_admin_can_complete_upload_and_register_media_file(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        $box = StorageBox::factory()->create([
            'status' => 'active',
            'connection_status' => 'online',
        ]);

        $response = $this->actingAs($admin)->postJson(route('admin.uploads.complete'), [
            'storage_box_id' => $box->id,
            'file_path' => '/Filmler/Avatar.2009.1080p.mkv',
            'filename' => 'Avatar.2009.1080p.mkv',
            'size_bytes' => 4294967296,
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('media_file.name', 'Avatar.2009.1080p.mkv');

        $this->assertDatabaseHas('media_files', [
            'storage_box_id' => $box->id,
            'path' => '/Filmler/Avatar.2009.1080p.mkv',
            'name' => 'Avatar.2009.1080p.mkv',
            'clean_title' => 'Avatar',
            'year' => 2009,
            'quality' => '1080p',
        ]);
    }
}
