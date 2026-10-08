<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            // Bireysel Paketler
            [
                'name' => 'Paket 1',
                'slug' => 'paket-1',
                'type' => Plan::TYPE_INDIVIDUAL,
                'description' => 'Paket 1',
                'monthly_quota_gb' => 1500,
                'monthly_quota_bytes' => 1500 * 1024 * 1024 * 1024,
                'price_1m' => 250.00,
                'price_3m' => 715.00,
                'price_6m' => 1350.00,
                'price_12m' => 2400.00,
                'allowed_durations' => [1, 3, 6, 12],
                'max_parallel_downloads' => 4,
                'speed_limit_mbps' => null,
                'allow_vps_access' => false,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Paket 2',
                'slug' => 'paket-2',
                'type' => Plan::TYPE_INDIVIDUAL,
                'description' => null,
                'monthly_quota_gb' => 2500,
                'monthly_quota_bytes' => 2500 * 1024 * 1024 * 1024,
                'price_1m' => 350.00,
                'price_3m' => 1000.00,
                'price_6m' => 1890.00,
                'price_12m' => 3360.00,
                'allowed_durations' => [1, 3, 6, 12],
                'max_parallel_downloads' => 4,
                'speed_limit_mbps' => null,
                'allow_vps_access' => false,
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Paket 3',
                'slug' => 'paket-3',
                'type' => Plan::TYPE_INDIVIDUAL,
                'description' => null,
                'monthly_quota_gb' => 5000,
                'monthly_quota_bytes' => 5000 * 1024 * 1024 * 1024,
                'price_1m' => 450.00,
                'price_3m' => 1290.00,
                'price_6m' => 2430.00,
                'price_12m' => 4320.00,
                'allowed_durations' => [1, 3, 6, 12],
                'max_parallel_downloads' => 4,
                'speed_limit_mbps' => null,
                'allow_vps_access' => false,
                'is_active' => true,
                'sort_order' => 3,
            ],

            // Business Paketler
            [
                'name' => 'Site Yöneticisi 1',
                'slug' => 'site-yoneticisi-1',
                'type' => Plan::TYPE_BUSINESS,
                'description' => null,
                'monthly_quota_gb' => 7500,
                'monthly_quota_bytes' => 7500 * 1024 * 1024 * 1024,
                'price_1m' => 1500.00,
                'price_3m' => 4275.00,
                'price_6m' => 8100.00,
                'price_12m' => 14400.00,
                'allowed_durations' => [1, 3, 6, 12],
                'max_parallel_downloads' => 0, // Sınırsız
                'speed_limit_mbps' => null,
                'allow_vps_access' => true,
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'Site Yöneticisi 2',
                'slug' => 'site-yoneticisi-2',
                'type' => Plan::TYPE_BUSINESS,
                'description' => null,
                'monthly_quota_gb' => 15000,
                'monthly_quota_bytes' => 15000 * 1024 * 1024 * 1024,
                'price_1m' => 2500.00,
                'price_3m' => 7125.00,
                'price_6m' => 13500.00,
                'price_12m' => 24000.00,
                'allowed_durations' => [1, 3, 6, 12],
                'max_parallel_downloads' => 0, // Sınırsız
                'speed_limit_mbps' => null,
                'allow_vps_access' => true,
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'name' => 'Site Yöneticisi 3',
                'slug' => 'site-yoneticisi-3',
                'type' => Plan::TYPE_BUSINESS,
                'description' => null,
                'monthly_quota_gb' => 25000,
                'monthly_quota_bytes' => 25000 * 1024 * 1024 * 1024,
                'price_1m' => 3000.00,
                'price_3m' => 8550.00,
                'price_6m' => 16200.00,
                'price_12m' => 28800.00,
                'allowed_durations' => [1, 3, 6, 12],
                'max_parallel_downloads' => 0, // Sınırsız
                'speed_limit_mbps' => null,
                'allow_vps_access' => true,
                'is_active' => true,
                'sort_order' => 6,
            ],

            // Ek Kota Paketleri
            [
                'name' => 'Ek Paket 1',
                'slug' => 'ek-paket-1',
                'type' => Plan::TYPE_EXTRA,
                'description' => null,
                'monthly_quota_gb' => 2000,
                'monthly_quota_bytes' => 2000 * 1024 * 1024 * 1024,
                'price_1m' => 500.00,
                'price_3m' => 500.00,
                'price_6m' => 500.00,
                'price_12m' => 500.00,
                'allowed_durations' => [1],
                'max_parallel_downloads' => 4,
                'speed_limit_mbps' => null,
                'allow_vps_access' => false,
                'is_active' => true,
                'sort_order' => 7,
            ],
            [
                'name' => 'Ek Paket 2',
                'slug' => 'ek-paket-2',
                'type' => Plan::TYPE_EXTRA,
                'description' => null,
                'monthly_quota_gb' => 4000,
                'monthly_quota_bytes' => 4000 * 1024 * 1024 * 1024,
                'price_1m' => 750.00,
                'price_3m' => 750.00,
                'price_6m' => 750.00,
                'price_12m' => 750.00,
                'allowed_durations' => [1],
                'max_parallel_downloads' => 4,
                'speed_limit_mbps' => null,
                'allow_vps_access' => false,
                'is_active' => true,
                'sort_order' => 8,
            ],
            [
                'name' => 'Ek Paket 3',
                'slug' => 'ek-paket-3',
                'type' => Plan::TYPE_EXTRA,
                'description' => null,
                'monthly_quota_gb' => 6000,
                'monthly_quota_bytes' => 6000 * 1024 * 1024 * 1024,
                'price_1m' => 1000.00,
                'price_3m' => 1000.00,
                'price_6m' => 1000.00,
                'price_12m' => 1000.00,
                'allowed_durations' => [1],
                'max_parallel_downloads' => 4,
                'speed_limit_mbps' => null,
                'allow_vps_access' => false,
                'is_active' => true,
                'sort_order' => 9,
            ],
        ];

        foreach ($plans as $planData) {
            Plan::updateOrCreate(
                ['slug' => $planData['slug']],
                $planData
            );
        }
    }
}
