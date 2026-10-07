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
        Schema::table('tmdb_videos', function (Blueprint $table) {
            $table->unsignedSmallInteger('sort_order')->default(0)->after('iso_639_1');
            $table->boolean('is_dubbed')->default(false)->after('sort_order');
            $table->boolean('is_subtitled')->default(false)->after('is_dubbed');

            $table->index(['tmdb_title_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tmdb_videos', function (Blueprint $table) {
            $table->dropIndex(['tmdb_title_id', 'sort_order']);
            $table->dropColumn(['sort_order', 'is_dubbed', 'is_subtitled']);
        });
    }
};
