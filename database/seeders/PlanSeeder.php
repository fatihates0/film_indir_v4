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
            [
                'name' => '1. Paket (1500 GB)',
                'slug' => 'paket-1500-gb',
                'description' => 'Aylık 1.500 GB indirme kotası, yüksek hız, 4 eşzamanlı indirme.',
                'monthly_quota_gb' => 1500,
                'monthly_quota_bytes' => 1500 * 1024 * 1024 * 1024, // 1,610,612,736,000 bytes
                'price_1m' => 149.00,
                'price_3m' => 399.00,
                'price_6m' => 749.00,
                'price_12m' => 1399.00,
                'max_parallel_downloads' => 4,
                'speed_limit_mbps' => null,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => '2. Paket (2500 GB)',
                'slug' => 'paket-2500-gb',
                'description' => 'Aylık 2.500 GB indirme kotası, yüksek hız, 8 eşzamanlı indirme.',
                'monthly_quota_gb' => 2500,
                'monthly_quota_bytes' => 2500 * 1024 * 1024 * 1024, // 2,684,354,560,000 bytes
                'price_1m' => 229.00,
                'price_3m' => 599.00,
                'price_6m' => 1099.00,
                'price_12m' => 1999.00,
                'max_parallel_downloads' => 8,
                'speed_limit_mbps' => null,
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => '3. Paket (4000 GB)',
                'slug' => 'paket-4000-gb',
                'description' => 'Aylık 4.000 GB indirme kotası, sınırsız hız, 16 eşzamanlı indirme.',
                'monthly_quota_gb' => 4000,
                'monthly_quota_bytes' => 4000 * 1024 * 1024 * 1024, // 4,294,967,296,000 bytes
                'price_1m' => 349.00,
                'price_3m' => 899.00,
                'price_6m' => 1649.00,
                'price_12m' => 2999.00,
                'max_parallel_downloads' => 16,
                'speed_limit_mbps' => null,
                'is_active' => true,
                'sort_order' => 3,
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
