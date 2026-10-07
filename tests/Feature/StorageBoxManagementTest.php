<?php

namespace Tests\Feature;

use App\Enums\StorageBoxProtocol;
use App\Enums\StorageBoxStatus;
use App\Enums\UserRole;
use App\Models\StorageBox;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StorageBoxManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_storage_boxes_index(): void
    {
        $response = $this->get('/admin/storage-boxes');

        $response->assertStatus(404);
    }

    public function test_standard_user_cannot_access_storage_boxes_index(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::USER,
        ]);

        $response = $this->actingAs($user)->get('/admin/storage-boxes');

        $response->assertStatus(404);
    }

    public function test_admin_can_access_storage_boxes_index(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        StorageBox::factory()->create([
            'name' => 'Test Storage Gateway Node',
            'protocol' => StorageBoxProtocol::CustomGateway,
        ]);

        $response = $this->actingAs($admin)->get('/admin/storage-boxes');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/StorageBoxes/Index')
            ->has('boxes')
            ->has('stats')
            ->has('protocols')
        );
    }

    public function test_admin_can_create_new_storage_box(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $response = $this->actingAs($admin)->post('/admin/storage-boxes', [
            'name' => 'Gateway Node 1 - DL3',
            'host' => '155.103.194.61',
            'protocol' => 'custom_gateway',
            'port' => 8080,
            'api_secret' => 'secretkey123',
            'total_capacity_gb' => 5000,
            'status' => 'active',
            'notes' => 'Test açıklaması',
            'is_default' => true,
            'test_immediately' => false,
        ]);

        $response->assertRedirect('/admin/storage-boxes');
        $this->assertDatabaseHas('storage_boxes', [
            'name' => 'Gateway Node 1 - DL3',
            'host' => '155.103.194.61',
            'port' => 8080,
            'is_default' => true,
        ]);
    }

    public function test_admin_can_update_existing_storage_box(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create([
            'name' => 'Eski İsim',
            'host' => '155.103.194.61',
            'total_capacity_gb' => 1000,
        ]);

        $response = $this->actingAs($admin)->put("/admin/storage-boxes/{$box->id}", [
            'name' => 'Güncellenmiş Storage Box',
            'host' => 'dl3.fatihates.com.tr',
            'protocol' => 'custom_gateway',
            'port' => 443,
            'use_ssl' => true,
            'api_secret' => 'newsecret123',
            'total_capacity_gb' => 5000,
            'status' => 'active',
            'test_immediately' => false,
        ]);

        $response->assertRedirect('/admin/storage-boxes');
        $box->refresh();

        $this->assertSame('Güncellenmiş Storage Box', $box->name);
        $this->assertSame('dl3.fatihates.com.tr', $box->host);
        $this->assertSame(5000, $box->total_capacity_gb);
        $this->assertSame('newsecret123', $box->api_secret);
    }

    public function test_admin_can_delete_storage_box(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create([
            'name' => 'Silinecek Storage Box',
        ]);

        $response = $this->actingAs($admin)->delete("/admin/storage-boxes/{$box->id}");

        $response->assertRedirect('/admin/storage-boxes');
        $this->assertDatabaseMissing('storage_boxes', [
            'id' => $box->id,
        ]);
    }

    public function test_admin_can_toggle_storage_box_status(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create([
            'status' => StorageBoxStatus::Active,
        ]);

        $response = $this->actingAs($admin)->post("/admin/storage-boxes/{$box->id}/toggle");
        $response->assertRedirect('/admin/storage-boxes');

        $box->refresh();
        $this->assertSame(StorageBoxStatus::Inactive, $box->status);

        // Toggle back to active
        $this->actingAs($admin)->post("/admin/storage-boxes/{$box->id}/toggle");
        $box->refresh();
        $this->assertSame(StorageBoxStatus::Active, $box->status);
    }

    public function test_admin_can_browse_storage_box_files_via_json(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create([
            'name' => 'Film Gezgini Box',
            'protocol' => StorageBoxProtocol::CustomGateway,
        ]);

        $response = $this->actingAs($admin)->getJson("/admin/storage-boxes/{$box->id}/browse?path=/4K_UHD_Filmler");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'box_id',
            'box_name',
            'protocol',
            'data' => [
                'path',
                'count',
                'files',
            ],
        ]);
    }

    public function test_admin_can_test_connection_via_json(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
        ]);

        $box = StorageBox::factory()->create([
            'name' => 'Test Ping Box',
            'protocol' => StorageBoxProtocol::CustomGateway,
        ]);

        $response = $this->actingAs($admin)->postJson("/admin/storage-boxes/{$box->id}/test");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'status',
            'status_label',
            'message',
            'total_capacity_gb',
            'free_capacity_gb',
            'formatted_free',
        ]);
    }
}
