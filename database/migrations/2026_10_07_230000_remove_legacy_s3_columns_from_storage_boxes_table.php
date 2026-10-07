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
        Schema::table('storage_boxes', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('storage_boxes', 'bucket')) {
                $columnsToDrop[] = 'bucket';
            }
            if (Schema::hasColumn('storage_boxes', 'region')) {
                $columnsToDrop[] = 'region';
            }

            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('storage_boxes', function (Blueprint $table) {
            if (! Schema::hasColumn('storage_boxes', 'bucket')) {
                $table->string('bucket', 255)->nullable()->after('username');
            }
            if (! Schema::hasColumn('storage_boxes', 'region')) {
                $table->string('region', 100)->nullable()->default('us-east-1')->after('bucket');
            }
        });
    }
};
