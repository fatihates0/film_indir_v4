<?php

namespace App\Jobs;

use App\Models\StorageBox;
use App\Services\MediaScannerService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ScanStorageBoxJob implements ShouldQueue
{
    use Queueable;

    /**
     * The number of seconds the job can run before timing out.
     */
    public int $timeout = 900;

    /**
     * Create a new job instance.
     */
    public function __construct(public ?int $storageBoxId = null)
    {
        $this->onQueue('disk_scan');
    }

    /**
     * Execute the job.
     */
    public function handle(MediaScannerService $scannerService): void
    {
        if ($this->storageBoxId !== null) {
            $box = StorageBox::find($this->storageBoxId);

            if (! $box) {
                Log::warning("ScanStorageBoxJob: Storage box #{$this->storageBoxId} not found.");

                return;
            }

            Log::info("ScanStorageBoxJob (disk_scan): Starting scan for Storage Box \"{$box->name}\" (#{$box->id})...");
            $result = $scannerService->scanStorageBox($box);
            Log::info("ScanStorageBoxJob (disk_scan): Scan completed for \"{$box->name}\".", [
                'total_videos' => $result['total_videos'],
                'created' => $result['created'],
                'updated' => $result['updated'],
                'duration_seconds' => $result['duration_seconds'],
            ]);
        } else {
            Log::info('ScanStorageBoxJob (disk_scan): Starting scan for all active storage boxes...');
            $result = $scannerService->scanAllBoxes();
            Log::info('ScanStorageBoxJob (disk_scan): Scan completed for all active storage boxes.', [
                'total_boxes' => $result['total_boxes'],
                'total_videos' => $result['total_videos'],
                'created' => $result['created'],
                'updated' => $result['updated'],
                'duration_seconds' => $result['duration_seconds'],
            ]);
        }
    }
}
