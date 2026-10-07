<?php

namespace App\Console\Commands;

use App\Models\TmdbTitle;
use Illuminate\Console\Command;

class PopulateSlugsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:populate-slugs';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Populate slug for all TmdbTitle records';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $count = 0;
        TmdbTitle::chunk(100, function ($titles) use (&$count) {
            foreach ($titles as $title) {
                $title->slug = TmdbTitle::generateUniqueSlug($title);
                $title->saveQuietly();
                $count++;
            }
        });

        $this->info("Successfully populated slugs for {$count} titles.");
    }
}
