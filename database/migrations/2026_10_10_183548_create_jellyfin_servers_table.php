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
        Schema::create('jellyfin_servers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('url');
            $table->string('public_url')->nullable();
            $table->text('api_key');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->string('last_status')->default('unknown');
            $table->timestamp('last_checked_at')->nullable();
            $table->unsignedInteger('cached_users_count')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jellyfin_servers');
    }
};
