<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('payment_methods')->updateOrInsert(
            ['id' => 'paddle'],
            [
                'name' => 'Kredi / Banka Kartı (Paddle)',
                'driver' => 'paddle',
                'description' => 'Visa, MasterCard ve Troy özellikli kartlarla 3D Secure güvencesiyle anında otomatik ödeme.',
                'instructions' => "Ödemeniz Paddle güvenli sanal POS altyapısı üzerinden 3D Secure ile anında onaylanır.\nÖdeme tamamlandığında indirme paketiniz saniyeler içinde otomatik olarak tanımlanır.",
                'is_active' => true,
                'settings' => json_encode([
                    'environment' => 'sandbox',
                    'client_token' => '',
                    'api_key' => '',
                    'webhook_secret' => '',
                    'currency' => 'TRY',
                ]),
                'sort_order' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('payment_methods')->where('id', 'paddle')->delete();
    }
};
