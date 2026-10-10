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
        Schema::table('payment_notifications', function (Blueprint $table) {
            $table->boolean('is_upgrade')->default(false)->after('plan_id');
            $table->foreignId('old_plan_id')->nullable()->after('is_upgrade')->constrained('plans')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_notifications', function (Blueprint $table) {
            $table->dropForeign(['old_plan_id']);
            $table->dropColumn(['is_upgrade', 'old_plan_id']);
        });
    }
};
