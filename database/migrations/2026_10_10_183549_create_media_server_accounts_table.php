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
        if (! Schema::hasTable('media_server_accounts')) {
            Schema::create('media_server_accounts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('server_type', 32)->default('jellyfin');
                $table->string('external_user_id', 64);
                $table->string('external_username', 255)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique(['server_type', 'external_user_id']);
                $table->index(['user_id', 'server_type']);
                $table->index('external_user_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media_server_accounts');
    }
};
