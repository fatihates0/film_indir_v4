<?php

namespace App\Console\Commands;

use App\Models\StorageBox;
use App\Services\StorageGatewayService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RefreshStorageBoxQuotaCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'storage-box:refresh-quota';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Query and refresh quota, connection status, and disk usage for active Storage Gateway Nodes';

    /**
     * Execute the console command.
     */
    public function handle(StorageGatewayService $storageService): int
    {
        $boxes = StorageBox::active()->get();

        if ($boxes->isEmpty()) {
            $this->info('Aktif durumda herhangi bir Depolama Sunucusu bulunamadı.');

            return self::SUCCESS;
        }

        $this->info("Toplam {$boxes->count()} adet aktif Depolama Sunucusu için kota yenileme başlatılıyor...");
        $rows = [];

        foreach ($boxes as $box) {
            try {
                $storageService->checkAndUpdate($box);
                $box->refresh();

                $rows[] = [
                    $box->id,
                    $box->name,
                    $box->host,
                    $box->connection_status->value ?? 'unknown',
                    $box->total_capacity_gb.' GB',
                    $box->used_capacity_gb.' GB',
                    $box->free_capacity_gb.' GB',
                    $box->latency_ms ? $box->latency_ms.'ms' : '-',
                    'Başarılı',
                ];

                Log::info("Storage box #{$box->id} ({$box->name}) kota bilgisi başarıyla güncellendi.", [
                    'total_gb' => $box->total_capacity_gb,
                    'used_gb' => $box->used_capacity_gb,
                    'free_gb' => $box->free_capacity_gb,
                ]);
            } catch (\Throwable $e) {
                $rows[] = [
                    $box->id,
                    $box->name,
                    $box->host,
                    'error',
                    '-',
                    '-',
                    '-',
                    '-',
                    $e->getMessage(),
                ];

                Log::error("Storage box #{$box->id} ({$box->name}) kota bilgisi güncellenemedi: {$e->getMessage()}");
            }
        }

        $this->table(
            ['ID', 'Ad', 'Host', 'Durum', 'Toplam', 'Kullanılan', 'Boş Alan', 'Gecikme', 'Sonuç'],
            $rows
        );

        $this->info('Tüm aktif depolama sunucularının kotaları başarıyla yenilendi.');

        return self::SUCCESS;
    }
}
