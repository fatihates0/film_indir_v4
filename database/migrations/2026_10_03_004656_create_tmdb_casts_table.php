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
        Schema::create('tmdb_casts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tmdb_title_id')->constrained('tmdb_titles')->cascadeOnDelete();
            $table->unsignedBigInteger('tmdb_person_id')->nullable()->index();
            $table->string('name');
            $table->string('character')->nullable();
            $table->string('role_type', 20)->default('cast')->index(); // 'cast', 'crew'
            $table->string('department')->nullable();
            $table->string('job')->nullable();
            $table->string('profile_path')->nullable();
            $table->unsignedSmallInteger('order')->default(0);
            $table->timestamps();

            $table->index(['tmdb_title_id', 'role_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tmdb_casts');
    }
};
