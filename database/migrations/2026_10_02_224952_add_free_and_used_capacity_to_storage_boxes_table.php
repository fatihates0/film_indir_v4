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
        Schema::table('storage_boxes', function (Blueprint $table) {
            $table->unsignedBigInteger('free_capacity_gb')->nullable()->after('total_capacity_gb');
            $table->unsignedBigInteger('used_capacity_gb')->nullable()->after('free_capacity_gb');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('storage_boxes', function (Blueprint $table) {
            $table->dropColumn(['free_capacity_gb', 'used_capacity_gb']);
        });
    }
};
