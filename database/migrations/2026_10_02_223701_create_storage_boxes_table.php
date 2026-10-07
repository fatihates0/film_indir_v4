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
        Schema::create('storage_boxes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('host', 255);
            $table->string('protocol', 20)->default('webdav');
            $table->unsignedSmallInteger('port')->default(443);
            $table->string('username', 100);
            $table->text('password');
            $table->string('base_path', 255)->default('/');
            $table->string('location', 100)->nullable();
            $table->unsignedBigInteger('total_capacity_gb')->default(1000);
            $table->unsignedBigInteger('used_capacity_gb')->default(0);
            $table->string('status', 30)->default('active');
            $table->string('connection_status', 30)->default('unknown');
            $table->unsignedInteger('latency_ms')->nullable();
            $table->timestamp('last_checked_at')->nullable();
            $table->text('last_error')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['status', 'connection_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('storage_boxes');
    }
};
