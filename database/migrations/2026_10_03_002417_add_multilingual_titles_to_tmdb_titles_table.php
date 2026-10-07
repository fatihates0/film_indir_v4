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
        Schema::table('tmdb_titles', function (Blueprint $table) {
            $table->string('title_tr')->nullable()->after('title')->index();
            $table->string('title_en')->nullable()->after('title_tr')->index();
            $table->string('title_original')->nullable()->after('title_en')->index();
            $table->text('overview_tr')->nullable()->after('overview');
            $table->text('overview_en')->nullable()->after('overview_tr');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tmdb_titles', function (Blueprint $table) {
            $table->dropColumn([
                'title_tr',
                'title_en',
                'title_original',
                'overview_tr',
                'overview_en',
            ]);
        });
    }
};
