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
            $table->string('bucket', 255)->nullable()->after('username');
            $table->string('region', 100)->nullable()->default('us-east-1')->after('bucket');
            $table->boolean('use_ssl')->default(true)->after('region');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('storage_boxes', function (Blueprint $table) {
            $table->dropColumn(['bucket', 'region', 'use_ssl']);
        });
    }
};
