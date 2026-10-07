<?php

namespace App\Jobs;

use App\Models\MediaFile;
use App\Services\TmdbService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessMediaTmdbJob implements ShouldQueue
{
    use Queueable;

    /**
     * The number of seconds the job can run before timing out.
     */
    public int $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $mediaFileId,
        public bool $force = false
    ) {
        $this->onQueue('tmdb_scan');
    }

    /**
     * Execute the job.
     */
    public function handle(TmdbService $tmdbService): void
    {
        $mediaFile = MediaFile::find($this->mediaFileId);

        if (! $mediaFile) {
            Log::warning("ProcessMediaTmdbJob (tmdb_scan): MediaFile #{$this->mediaFileId} not found.");

            return;
        }

        // If already matched and force is false, skip
        if ($mediaFile->tmdb_match_status === 'matched' && ! $this->force) {
            Log::info("ProcessMediaTmdbJob (tmdb_scan): MediaFile #{$mediaFile->id} already matched. Skipping.");

            return;
        }

        Log::info("ProcessMediaTmdbJob (tmdb_scan): Matching \"{$mediaFile->clean_title}\" (#{$mediaFile->id}) with TMDB...");
        $result = $tmdbService->matchMediaFile($mediaFile);

        Log::info("ProcessMediaTmdbJob (tmdb_scan): Completed for #{$mediaFile->id} with status [{$result['status']}]. Note: {$result['notes']}");
    }
}
