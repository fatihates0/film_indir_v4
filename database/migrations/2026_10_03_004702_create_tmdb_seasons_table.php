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
        Schema::create('tmdb_seasons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tmdb_title_id')->constrained('tmdb_titles')->cascadeOnDelete();
            $table->unsignedBigInteger('tmdb_season_id')->nullable()->index();
            $table->unsignedSmallInteger('season_number');
            $table->string('name');
            $table->text('overview')->nullable();
            $table->string('poster_path')->nullable();
            $table->unsignedSmallInteger('episode_count')->default(0);
            $table->date('air_date')->nullable();
            $table->decimal('vote_average', 3, 1)->nullable();
            $table->timestamps();

            $table->unique(['tmdb_title_id', 'season_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tmdb_seasons');
    }
};
