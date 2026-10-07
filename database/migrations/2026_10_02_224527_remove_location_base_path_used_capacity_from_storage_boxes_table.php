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
            $table->dropColumn(['location', 'base_path', 'used_capacity_gb']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('storage_boxes', function (Blueprint $table) {
            $table->string('location', 100)->nullable();
            $table->string('base_path', 255)->default('/');
            $table->unsignedBigInteger('used_capacity_gb')->default(0);
        });
    }
};
