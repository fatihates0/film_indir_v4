<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (Plan::count() === 0) {
            Plan::create([
                'name' => 'Temel Paket',
                'slug' => 'basic',
                'description' => 'Başlangıç seviyesi dizi ve film severler için ideal aylık kota paketi.',
                'monthly_quota_gb' => 250,
                'monthly_quota_bytes' => 250 * 1024 * 1024 * 1024,
                'price_1m' => 49.00,
                'price_3m' => 129.00,
                'price_6m' => 239.00,
                'price_12m' => 429.00,
                'max_parallel_downloads' => 2,
                'speed_limit_mbps' => null,
                'is_active' => true,
                'sort_order' => 1,
            ]);

            Plan::create([
                'name' => 'Premium Paket',
                'slug' => 'premium',
                'description' => 'Yüksek çözünürlük arşiv indiricileri için geniş kotalı popüler paket.',
                'monthly_quota_gb' => 750,
                'monthly_quota_bytes' => 750 * 1024 * 1024 * 1024,
                'price_1m' => 99.00,
                'price_3m' => 269.00,
                'price_6m' => 499.00,
                'price_12m' => 899.00,
                'max_parallel_downloads' => 4,
                'speed_limit_mbps' => null,
                'is_active' => true,
                'sort_order' => 2,
            ]);

            Plan::create([
                'name' => 'VIP Paket',
                'slug' => 'vip',
                'description' => 'Sınırsız hızda mega kotalı profesyonel arşivci üyeliği.',
                'monthly_quota_gb' => 2000,
                'monthly_quota_bytes' => 2000 * 1024 * 1024 * 1024,
                'price_1m' => 199.00,
                'price_3m' => 539.00,
                'price_6m' => 999.00,
                'price_12m' => 1799.00,
                'max_parallel_downloads' => 8,
                'speed_limit_mbps' => null,
                'is_active' => true,
                'sort_order' => 3,
            ]);
        }
    }
}
