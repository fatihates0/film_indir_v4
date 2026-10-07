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
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
            $table->unsignedBigInteger('plan_id')->nullable()->change();
            $table->foreign('plan_id')->references('id')->on('plans')->nullOnDelete();
            $table->boolean('is_perpetual')->default(false)->after('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('is_perpetual');
            $table->dropForeign(['plan_id']);
            $table->unsignedBigInteger('plan_id')->change();
            $table->foreign('plan_id')->references('id')->on('plans')->cascadeOnDelete();
        });
    }
};

