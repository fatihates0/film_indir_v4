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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedBigInteger('monthly_quota_bytes');
            $table->unsignedInteger('monthly_quota_gb');
            $table->decimal('price_1m', 10, 2)->default(0);
            $table->decimal('price_3m', 10, 2)->default(0);
            $table->decimal('price_6m', 10, 2)->default(0);
            $table->decimal('price_12m', 10, 2)->default(0);
            $table->unsignedInteger('max_parallel_downloads')->default(4);
            $table->unsignedInteger('speed_limit_mbps')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
