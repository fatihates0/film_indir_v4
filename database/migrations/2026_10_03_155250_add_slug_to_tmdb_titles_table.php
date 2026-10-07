<?php

use App\Models\TmdbTitle;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tmdb_titles', function (Blueprint $table) {
            $table->string('slug')->nullable()->index()->after('title');
        });

        // Populate slug column for existing titles
        TmdbTitle::chunk(100, function ($titles) {
            foreach ($titles as $title) {
                $rawTitle = $title->title_tr ?: ($title->title_en ?: ($title->title ?: $title->original_title));
                $slugStr = Str::slug($rawTitle ?: ('title-'.$title->id));
                if (! Str::endsWith($slugStr, '-indir')) {
                    $slugStr .= '-indir';
                }
                $title->update(['slug' => $slugStr]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tmdb_titles', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
