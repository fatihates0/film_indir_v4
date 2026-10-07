<?php

namespace App\Console\Commands;

use App\Jobs\ScanStorageBoxJob;
use App\Models\StorageBox;
use App\Services\MediaScannerService;
use Illuminate\Console\Command;

class ScanStorageBoxesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'storage-box:scan
                            {box? : ID of specific storage box to scan}
                            {--all : Scan all active storage boxes}
                            {--queue : Dispatch scan task to disk_scan queue}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scan Hetzner Storage Boxes recursively for video files and update media_files table';

    /**
     * Execute the console command.
     */
    public function handle(MediaScannerService $scanner): int
    {
        $boxId = $this->argument('box');
        $useQueue = (bool) $this->option('queue');

        if ($useQueue) {
            $targetId = $boxId ? (int) $boxId : null;
            ScanStorageBoxJob::dispatch($targetId)->onQueue('disk_scan');

            $this->info("✔ Tarama görevi 'disk_scan' kuyruğuna eklendi! (Hedef: ".($targetId ? "Storage Box #{$targetId}" : 'Tüm Aktif Depolama Birimleri').')');

            return self::SUCCESS;
        }

        if ($boxId) {
            $box = StorageBox::find($boxId);
            if (! $box) {
                $this->error("Storage Box #{$boxId} bulunamadı.");

                return self::FAILURE;
            }

            $this->info("Scanning Storage Box: {$box->name} ({$box->host})...");
            $res = $scanner->scanStorageBox($box);

            $this->table(
                ['Kutu', 'Toplam Video', 'Yeni Eklenen', 'Güncellenen', 'Toplam Boyut', 'Süre'],
                [[
                    $res['box_name'],
                    $res['total_videos'],
                    $res['created'],
                    $res['updated'],
                    round($res['total_size_bytes'] / (1024 * 1024 * 1024), 2).' GB',
                    $res['duration_seconds'].'s',
                ]]
            );

            return self::SUCCESS;
        }

        $this->info('Tüm aktif Storage Box depolama birimleri taranıyor...');
        $res = $scanner->scanAllBoxes();

        $rows = array_map(fn ($b) => [
            $b['box_name'],
            $b['total_videos'],
            $b['created'],
            $b['updated'],
            round($b['total_size_bytes'] / (1024 * 1024 * 1024), 2).' GB',
            $b['duration_seconds'].'s',
        ], $res['boxes']);

        $this->table(['Kutu', 'Toplam Video', 'Yeni', 'Güncellenen', 'Boyut', 'Süre'], $rows);
        $this->info("Tarama tamamlandı! Toplam {$res['total_videos']} video tespit edildi ({$res['created']} yeni, {$res['updated']} güncellendi). Geçen süre: {$res['duration_seconds']}s");

        return self::SUCCESS;
    }
}
