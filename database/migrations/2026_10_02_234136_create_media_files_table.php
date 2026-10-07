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
        Schema::create('media_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('storage_box_id')->constrained('storage_boxes')->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('path', 500);
            $table->string('directory', 300);
            $table->string('extension', 20);
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('clean_title', 255)->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('quality', 20)->nullable();
            $table->string('category', 30)->default('movie');
            $table->string('mime_type', 100)->nullable();
            $table->timestamp('last_modified_at')->nullable();
            $table->timestamp('scanned_at')->nullable();
            $table->timestamps();

            $table->unique(['storage_box_id', 'path']);
            $table->index(['storage_box_id', 'category']);
            $table->index('quality');
            $table->index('extension');
            $table->index('year');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media_files');
    }
};
