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
        Schema::create('tmdb_videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tmdb_title_id')->constrained('tmdb_titles')->cascadeOnDelete();
            $table->string('tmdb_video_id', 50)->nullable();
            $table->string('name');
            $table->string('site', 30)->default('YouTube');
            $table->string('key');
            $table->string('type', 30)->default('Trailer')->index();
            $table->unsignedSmallInteger('size')->nullable();
            $table->boolean('official')->default(true);
            $table->timestamp('published_at')->nullable();
            $table->string('iso_639_1', 10)->nullable();
            $table->timestamps();

            $table->index(['tmdb_title_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tmdb_videos');
    }
};
