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
        Schema::table('media_files', function (Blueprint $table) {
            $table->foreignId('tmdb_title_id')
                ->nullable()
                ->after('mime_type')
                ->constrained('tmdb_titles')
                ->nullOnDelete();

            $table->string('tmdb_match_status', 20)
                ->default('unmatched')
                ->after('tmdb_title_id')
                ->index();

            $table->unsignedTinyInteger('tmdb_match_confidence')
                ->nullable()
                ->after('tmdb_match_status');

            $table->string('tmdb_match_notes')
                ->nullable()
                ->after('tmdb_match_confidence');

            $table->timestamp('tmdb_matched_at')
                ->nullable()
                ->after('tmdb_match_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media_files', function (Blueprint $table) {
            $table->dropForeign(['tmdb_title_id']);
            $table->dropColumn([
                'tmdb_title_id',
                'tmdb_match_status',
                'tmdb_match_confidence',
                'tmdb_match_notes',
                'tmdb_matched_at',
            ]);
        });
    }
};
