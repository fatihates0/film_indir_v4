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
        Schema::table('tmdb_seasons', function (Blueprint $table) {
            $table->string('name_tr')->nullable()->after('name');
            $table->string('name_en')->nullable()->after('name_tr');
            $table->text('overview_tr')->nullable()->after('overview');
            $table->text('overview_en')->nullable()->after('overview_tr');
        });

        Schema::table('tmdb_episodes', function (Blueprint $table) {
            $table->string('name_tr')->nullable()->after('name');
            $table->string('name_en')->nullable()->after('name_tr');
            $table->text('overview_tr')->nullable()->after('overview');
            $table->text('overview_en')->nullable()->after('overview_tr');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tmdb_episodes', function (Blueprint $table) {
            $table->dropColumn(['name_tr', 'name_en', 'overview_tr', 'overview_en']);
        });

        Schema::table('tmdb_seasons', function (Blueprint $table) {
            $table->dropColumn(['name_tr', 'name_en', 'overview_tr', 'overview_en']);
        });
    }
};
