<?php

namespace App\Console\Commands;

use App\Models\TmdbTitle;
use App\Services\TmdbService;
use Illuminate\Console\Command;

class SyncTmdbTrailersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tmdb:sync-trailers
                            {--limit=50 : Number of popular matched titles to inspect/sync}
                            {--all : Inspect and sync all matched titles in library}
                            {--force : Re-fetch even if Turkish trailer is already detected}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch and synchronize Turkish and official trailers for matched TMDB titles';

    /**
     * Execute the console command.
     */
    public function handle(TmdbService $tmdbService): int
    {
        if (! $tmdbService->isConfigured()) {
            $this->error('TMDB API key is not configured.');

            return self::FAILURE;
        }

        $query = TmdbTitle::hasMatchedMedia()
            ->whereNotNull('backdrop_path')
            ->orderByDesc('popularity');

        if (! $this->option('all')) {
            $limit = (int) $this->option('limit');
            $query->take($limit > 0 ? $limit : 50);
        }

        $titles = $query->get();
        $total = $titles->count();

        if ($total === 0) {
            $this->info('Eşleşmiş başlık bulunamadı.');

            return self::SUCCESS;
        }

        $this->info("{$total} adet popüler başlık için Türkçe fragman kontrolü ve senkronizasyonu başlatılıyor...");
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $synced = 0;
        $dubbedCount = 0;
        $subtitledCount = 0;

        foreach ($titles as $title) {
            $hasTrTrailer = $title->trailers()->where(function ($q) {
                $q->where('is_dubbed', 1)->orWhere('is_subtitled', 1)->orWhere('iso_639_1', 'tr');
            })->exists();

            if (! $hasTrTrailer || $this->option('force')) {
                $details = $tmdbService->getDetails((int) $title->tmdb_id, $title->media_type);
                if ($details) {
                    $tmdbService->syncTitleRelations($title, $details);
                    $synced++;
                }
                // Polite delay for TMDB rate limits
                usleep(150000);
            }

            $fresh = $title->fresh();
            if ($fresh->trailers()->where('is_dubbed', 1)->exists()) {
                $dubbedCount++;
            } elseif ($fresh->trailers()->where('is_subtitled', 1)->orWhere('iso_639_1', 'tr')->exists()) {
                $subtitledCount++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("İşlem tamamlandı! Toplam güncellenen: {$synced}");
        $this->info("Türkçe Dublaj Fragmanlı: {$dubbedCount}");
        $this->info("Türkçe Altyazılı Fragmanlı: {$subtitledCount}");

        // Clear dashboard hero cache
        cache()->forget('dashboard_hero_slides_v3');
        $this->info('Dashboard Hero önbelleği temizlendi.');

        return self::SUCCESS;
    }
}
