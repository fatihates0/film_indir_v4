<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('driver')->default('manual');
            $table->text('description')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('settings')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('payment_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('payment_method_id');
            $table->foreign('payment_method_id')->references('id')->on('payment_methods')->cascadeOnDelete();
            $table->integer('duration_months')->default(1);
            $table->decimal('amount', 10, 2)->default(0.00);
            $table->string('reference_code')->unique();
            $table->string('sender_name')->nullable();
            $table->string('tx_hash')->nullable();
            $table->text('user_notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('processed_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Insert initial default payment methods
        DB::table('payment_methods')->insert([
            [
                'id' => 'bank_transfer',
                'name' => 'Banka Havalesi / FAST',
                'driver' => 'bank',
                'description' => 'Tüm Türkiye bankalarından FAST veya Havale ile anında ödeme yapabilirsiniz.',
                'instructions' => "Lütfen ödemeyi yaparken açıklama kısmına yalnızca belirtilen Sipariş Referans Kodunu yazınız.\nÖdemeniz yapıldıktan sonra admin onayının ardından paketiniz anında tanımlanır.",
                'is_active' => true,
                'settings' => json_encode([
                    'bank_name' => 'Ziraat Bankası',
                    'account_holder' => 'Fatih Ateş',
                    'iban' => 'TR00 0000 0000 0000 0000 0000 00',
                    'branch_code' => '1234',
                    'account_number' => '567890',
                ]),
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 'usdt_crypto',
                'name' => 'Kripto Ödeme (USDT TRC-20)',
                'driver' => 'crypto',
                'description' => 'Tether USDT (TRC-20 ağı) ile komisyonsuz ve hızlı ödeme.',
                'instructions' => "Aşağıda belirtilen TRC-20 cüzdan adresine ilgili USDT tutarını transfer ediniz.\nİşlem sonrasında tarafınıza verilen TxID (Transfer Hash) kodunu ödeme bildirim formuna yapıştırınız.",
                'is_active' => true,
                'settings' => json_encode([
                    'network' => 'TRC-20 (Tron Network)',
                    'wallet_address' => 'TYuX59ZzKk4wP1mN7qRtV8sL2xD3eF6gHj',
                    'currency' => 'USDT',
                    'notes' => 'Yalnızca TRC-20 ağından gönderim yapınız. Diğer ağlardan yapılan gönderimler kaybolabilir.',
                ]),
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_notifications');
        Schema::dropIfExists('payment_methods');
    }
};
