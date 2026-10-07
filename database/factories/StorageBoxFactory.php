<?php

namespace Database\Factories;

use App\Enums\StorageBoxConnectionStatus;
use App\Enums\StorageBoxProtocol;
use App\Enums\StorageBoxStatus;
use App\Models\StorageBox;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StorageBox>
 */
class StorageBoxFactory extends Factory
{
    protected $model = StorageBox::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Storage Node '.fake()->city(),
            'host' => fake()->ipv4(),
            'protocol' => StorageBoxProtocol::CustomGateway,
            'port' => 80,
            'username' => 'gateway',
            'password' => 'test-gateway-secret-key-12345',
            'bucket' => null,
            'region' => null,
            'use_ssl' => false,
            'total_capacity_gb' => fake()->randomElement([1000, 2000, 5000, 10000]),
            'status' => StorageBoxStatus::Active,
            'connection_status' => StorageBoxConnectionStatus::Online,
            'latency_ms' => fake()->numberBetween(15, 65),
            'last_checked_at' => now(),
            'last_error' => null,
            'notes' => 'Filmler ve 4K medya arşivi depolama ünitesi.',
            'is_default' => false,
        ];
    }

    /**
     * Indicate that the storage box is online.
     */
    public function online(): static
    {
        return $this->state(fn (array $attributes) => [
            'connection_status' => StorageBoxConnectionStatus::Online,
            'latency_ms' => 24,
            'last_checked_at' => now(),
            'last_error' => null,
        ]);
    }

    /**
     * Indicate that the storage box is offline.
     */
    public function offline(): static
    {
        return $this->state(fn (array $attributes) => [
            'connection_status' => StorageBoxConnectionStatus::Offline,
            'latency_ms' => null,
            'last_checked_at' => now(),
            'last_error' => 'Sunucuya bağlanılamadı: Connection timed out',
        ]);
    }
}
