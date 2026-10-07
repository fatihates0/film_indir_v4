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
        Schema::create('tmdb_episodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tmdb_title_id')->constrained('tmdb_titles')->cascadeOnDelete();
            $table->foreignId('tmdb_season_id')->constrained('tmdb_seasons')->cascadeOnDelete();
            $table->unsignedBigInteger('tmdb_episode_id')->nullable()->index();
            $table->unsignedSmallInteger('season_number');
            $table->unsignedSmallInteger('episode_number');
            $table->string('name');
            $table->text('overview')->nullable();
            $table->string('still_path')->nullable();
            $table->date('air_date')->nullable();
            $table->decimal('vote_average', 3, 1)->nullable();
            $table->unsignedSmallInteger('runtime')->nullable();
            $table->timestamps();

            $table->unique(['tmdb_season_id', 'episode_number']);
            $table->index(['tmdb_title_id', 'season_number', 'episode_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tmdb_episodes');
    }
};
