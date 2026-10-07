<?php

namespace App\Console\Commands;

use App\Jobs\ProcessMediaTmdbJob;
use App\Models\MediaFile;
use App\Services\TmdbService;
use Illuminate\Console\Command;

class ScanTmdbCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tmdb:scan
                            {--all : Process all media files including already matched}
                            {--box= : Target specific storage box ID}
                            {--sync : Run synchronously instead of pushing to tmdb_scan queue}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scan and match media files with TMDB via tmdb_scan queue';

    /**
     * Execute the console command.
     */
    public function handle(TmdbService $tmdbService): int
    {
        if (! $tmdbService->isConfigured()) {
            $this->error('TMDB API anahtarı yapılandırılmamış. Lütfen .env dosyanıza TMDB_API_KEY veya TMDB_READ_ACCESS_TOKEN ekleyin.');

            return self::FAILURE;
        }

        $query = MediaFile::query();

        if ($boxId = $this->option('box')) {
            $query->where('storage_box_id', $boxId);
        }

        if (! $this->option('all')) {
            $query->whereIn('tmdb_match_status', ['unmatched', 'pending']);
        }

        $total = $query->count();

        if ($total === 0) {
            $this->info('İşlenecek herhangi bir medya dosyası bulunamadı.');

            return self::SUCCESS;
        }

        $this->info("Toplam {$total} adet video dosyası TMDB eşleştirmesi için hazırlanıyor...");

        if ($this->option('sync')) {
            $bar = $this->output->createProgressBar($total);
            $bar->start();

            $matched = 0;
            $review = 0;
            $unmatched = 0;

            $query->chunkById(50, function ($files) use ($tmdbService, $bar, &$matched, &$review, &$unmatched) {
                foreach ($files as $file) {
                    $res = $tmdbService->matchMediaFile($file);
                    if ($res['status'] === 'matched') {
                        $matched++;
                    } elseif ($res['status'] === 'review') {
                        $review++;
                    } else {
                        $unmatched++;
                    }
                    $bar->advance();
                    usleep(150000); // 150ms polite delay
                }
            });

            $bar->finish();
            $this->newLine(2);
            $this->info("Senkron tarama tamamlandı: {$matched} eşleşti, {$review} inceleme gerekiyor, {$unmatched} eşleşmedi.");

            return self::SUCCESS;
        }

        // Default: Dispatch each file to tmdb_scan queue
        $dispatched = 0;
        $query->chunkById(100, function ($files) use (&$dispatched) {
            foreach ($files as $file) {
                $file->update(['tmdb_match_status' => 'pending']);
                ProcessMediaTmdbJob::dispatch($file->id)->onQueue('tmdb_scan');
                $dispatched++;
            }
        });

        $this->info("✔ Toplam {$dispatched} adet tarama görevi 'tmdb_scan' kuyruğuna başarıyla eklendi.");
        $this->comment('Kuyruğu çalıştırmak için: php artisan queue:work --queue=tmdb_scan');

        return self::SUCCESS;
    }
}
