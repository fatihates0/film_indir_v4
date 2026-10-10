<?php

namespace App\Http\Controllers;

use App\Helpers\CertificationHelper;
use App\Helpers\GenreHelper;
use App\Helpers\QualityHelper;
use App\Http\Resources\MovieDetailResource;
use App\Http\Resources\SeriesDetailResource;
use App\Http\Resources\TmdbTitleListResource;
use App\Models\Comment;
use App\Models\PaymentMethod;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\TmdbCast;
use App\Models\TmdbTitle;
use App\Services\ReleaseCalendarService;
use App\Services\SubscriptionService;
use App\Services\TitleRecommendationService;
use App\Services\TmdbService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;

class FrontController extends Controller
{
    private function getDynamicPlatforms(): array
    {
        $platforms = Cache::remember('platform_icons_list_v5', now()->addDay(), function () {
            $iconsDir = public_path('icons');

            if (! File::isDirectory($iconsDir)) {
                File::makeDirectory($iconsDir, 0755, true);
            }

            $files = File::isDirectory($iconsDir) ? File::allFiles($iconsDir) : [];
            $platformsByKey = [];

            foreach ($files as $file) {
                $extension = strtolower($file->getExtension());
                if (in_array($extension, ['svg', 'png', 'webp', 'jpg', 'jpeg'])) {
                    $filename = $file->getFilename();
                    $nameKey = strtolower(pathinfo($filename, PATHINFO_FILENAME));

                    // If we already have an SVG for this platform key, don't overwrite with PNG
                    if (isset($platformsByKey[$nameKey]) && $extension !== 'svg') {
                        continue;
                    }

                    $displayName = match ($nameKey) {
                        'hbomax' => 'HBO Max',
                        'starwars' => 'Star Wars',
                        'nationalgeographic' => 'National Geographic',
                        'primevideo', 'amazon' => 'Prime Video',
                        'appletv', 'appletvplus' => 'Apple TV+',
                        'paramountplus' => 'Paramount+',
                        'dsmartgo' => 'D-Smart GO',
                        'beinconnect' => 'BeIN Connect',
                        'tvplus' => 'TV+',
                        'tod' => 'TOD',
                        'mubi' => 'MUBI',
                        'hulu' => 'Hulu',
                        'cosmogo' => 'Cosmogo',
                        'disney' => 'Disney+',
                        'netflix' => 'Netflix',
                        default => ucwords(str_replace(['_', '-'], ' ', $nameKey)),
                    };

                    $hasDark = File::exists(public_path('icons/dark/'.$filename));
                    $hasLight = File::exists(public_path('icons/light/'.$filename));
                    $hasRoot = File::exists(public_path('icons/'.$filename));

                    // Always use root-relative paths (/icons/...) so production HTTPS / proxy / custom domain never breaks or causes mixed-content / localhost mismatch
                    $platformsByKey[$nameKey] = [
                        'name' => $displayName,
                        'logo_url' => $hasRoot ? '/icons/'.$filename : ($hasDark ? '/icons/dark/'.$filename : '/icons/light/'.$filename),
                        'logo_dark_url' => $hasDark ? '/icons/dark/'.$filename : ($hasRoot ? '/icons/'.$filename : '/icons/light/'.$filename),
                        'logo_light_url' => $hasLight ? '/icons/light/'.$filename : ($hasRoot ? '/icons/'.$filename : '/icons/dark/'.$filename),
                        'filename' => $filename,
                    ];
                }
            }

            // Fallback default platforms if disk scanning returned empty (e.g. deployment directory issue)
            if (empty($platformsByKey)) {
                $fallbackPlatforms = [
                    ['key' => 'netflix', 'name' => 'Netflix', 'file' => 'netflix.png'],
                    ['key' => 'hbomax', 'name' => 'HBO Max', 'file' => 'hbomax.png'],
                    ['key' => 'disney', 'name' => 'Disney+', 'file' => 'disney.png'],
                    ['key' => 'amazon', 'name' => 'Prime Video', 'file' => 'amazon.png'],
                    ['key' => 'appletvplus', 'name' => 'Apple TV+', 'file' => 'appletvplus.png'],
                    ['key' => 'beinconnect', 'name' => 'BeIN Connect', 'file' => 'beinconnect.png'],
                    ['key' => 'tvplus', 'name' => 'TV+', 'file' => 'tvplus.png'],
                    ['key' => 'dsmartgo', 'name' => 'D-Smart GO', 'file' => 'dsmartgo.png'],
                    ['key' => 'tod', 'name' => 'TOD', 'file' => 'tod.png'],
                    ['key' => 'cosmogo', 'name' => 'Cosmogo', 'file' => 'cosmogo.png'],
                    ['key' => 'mubi', 'name' => 'MUBI', 'file' => 'mubi.png'],
                    ['key' => 'hulu', 'name' => 'Hulu', 'file' => 'hulu.png'],
                    ['key' => 'paramountplus', 'name' => 'Paramount+', 'file' => 'paramountplus.png'],
                ];
                foreach ($fallbackPlatforms as $item) {
                    $platformsByKey[$item['key']] = [
                        'name' => $item['name'],
                        'logo_url' => '/icons/dark/'.$item['file'],
                        'logo_dark_url' => '/icons/dark/'.$item['file'],
                        'logo_light_url' => '/icons/light/'.$item['file'],
                        'filename' => $item['file'],
                    ];
                }
            }

            // Desired priority order matching reference design
            $priorityOrder = ['netflix', 'hbomax', 'disney', 'amazon', 'primevideo', 'appletvplus', 'appletv', 'beinconnect', 'tvplus', 'tod', 'dsmartgo', 'cosmogo', 'mubi', 'hulu', 'paramountplus'];

            $orderedPlatforms = [];
            foreach ($priorityOrder as $key) {
                if (isset($platformsByKey[$key])) {
                    $orderedPlatforms[] = $platformsByKey[$key];
                    unset($platformsByKey[$key]);
                }
            }

            // Append remaining platforms
            foreach ($platformsByKey as $p) {
                $orderedPlatforms[] = $p;
            }

            return $orderedPlatforms;
        });

        return $platforms;
    }

    private function getCommonData()
    {
        return [
            'user' => [
                'name' => 'Irvan Wibowo',
                'email' => 'irvanwibowo@studio.com',
                'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
                'followers' => 24,
                'following' => 4,
                'bio' => 'Pandora gezegeninde yeni kurduğu ailesiyle yaşayan Jake, eski bir tehdit gezegeni yok etmek için geri döndüğünde, gezegenlerini korumak için Neytiri ve Na\'vi ordusuyla güçlerini birleştirmek zorundadır.',
            ],
            'platforms' => $this->getDynamicPlatforms(),
        ];
    }

    public function home()
    {
        // 1. Featured Hero Carousel Slides (Configurable: Manual IMDb Slots vs Auto Smart Hybrid Selection + Caching)
        $heroSlides = Cache::remember('dashboard_hero_slides_v4', now()->addHours(6), function () {
            $heroSettings = Setting::get('dashboard_hero_settings', ['mode' => 'auto', 'slots' => []]);
            $isManual = ($heroSettings['mode'] ?? 'auto') === 'manual';

            $selected = collect();
            $usedIds = [];

            // If in Manual Mode, load assigned IMDb IDs in exact slot order 1..5
            if ($isManual) {
                for ($slot = 1; $slot <= 5; $slot++) {
                    $imdbId = trim((string) ($heroSettings['slots'][$slot] ?? ($heroSettings['slots'][(string) $slot] ?? '')));
                    if ($imdbId !== '') {
                        $item = TmdbTitle::with('trailers')
                            ->where('imdb_id', $imdbId)
                            ->when(! empty($usedIds), fn ($q) => $q->whereNotIn('id', $usedIds))
                            ->first();

                        if ($item) {
                            $selected->push($item);
                            $usedIds[] = $item->id;
                        }
                    }
                }
            }

            $addCandidate = function ($query) use (&$selected, &$usedIds) {
                if ($selected->count() >= 5) {
                    return;
                }

                $item = (clone $query)
                    ->when(! empty($usedIds), fn ($q) => $q->whereNotIn('id', $usedIds))
                    ->first();

                if ($item) {
                    $selected->push($item);
                    $usedIds[] = $item->id;
                }
            };

            // Slot 1: Recently Updated Library Content with Turkish Trailer (Freshness)
            $addCandidate(
                TmdbTitle::with('trailers')
                    ->hasMatchedMedia()
                    ->hasTurkishTrailer()
                    ->whereNotNull('backdrop_path')
                    ->orderByDesc('updated_at')
            );

            // Slot 2: Top Trending Movie with Turkish Trailer (Movie Spotlight)
            $addCandidate(
                TmdbTitle::with('trailers')
                    ->hasMatchedMedia()
                    ->hasTurkishTrailer()
                    ->where('media_type', 'movie')
                    ->whereNotNull('backdrop_path')
                    ->orderByDesc('popularity')
            );

            // Slot 3: Top Trending or High Rated TV Series with Turkish Trailer (Series Spotlight)
            $addCandidate(
                TmdbTitle::with('trailers')
                    ->hasMatchedMedia()
                    ->hasTurkishTrailer()
                    ->where('media_type', 'tv')
                    ->whereNotNull('backdrop_path')
                    ->orderByDesc('popularity')
            );

            // Slot 4: Masterpiece / High-rated (vote_average >= 7.5) with Turkish Trailer
            $addCandidate(
                TmdbTitle::with('trailers')
                    ->hasMatchedMedia()
                    ->hasTurkishTrailer()
                    ->where('vote_average', '>=', 7.5)
                    ->whereNotNull('backdrop_path')
                    ->orderByDesc('popularity')
            );

            // Slot 5: Daily Rotation / Discovery from pool of Top 25 TR trailer titles
            if ($selected->count() < 5) {
                $pool = TmdbTitle::with('trailers')
                    ->hasMatchedMedia()
                    ->hasTurkishTrailer()
                    ->whereNotNull('backdrop_path')
                    ->when(! empty($usedIds), fn ($q) => $q->whereNotIn('id', $usedIds))
                    ->orderByDesc('popularity')
                    ->take(25)
                    ->get();

                if ($pool->isNotEmpty()) {
                    $todaySeed = (int) date('Ymd');
                    $index = $todaySeed % $pool->count();
                    $dailyPick = $pool->get($index) ?: $pool->first();
                    if ($dailyPick) {
                        $selected->push($dailyPick);
                        $usedIds[] = $dailyPick->id;
                    }
                }
            }

            // Fill remaining slots up to 5:
            // Priority A: Fill with Turkish Dubbed
            if ($selected->count() < 5) {
                $dubbedFill = TmdbTitle::with('trailers')
                    ->hasMatchedMedia()
                    ->hasTurkishTrailer(true) // only dubbed
                    ->whereNotNull('backdrop_path')
                    ->when(! empty($usedIds), fn ($q) => $q->whereNotIn('id', $usedIds))
                    ->orderByDesc('popularity')
                    ->take(5 - $selected->count())
                    ->get();

                foreach ($dubbedFill as $item) {
                    $selected->push($item);
                    $usedIds[] = $item->id;
                }
            }

            // Priority B: Fill with any Turkish Trailer (Subtitled / TR iso)
            if ($selected->count() < 5) {
                $trFill = TmdbTitle::with('trailers')
                    ->hasMatchedMedia()
                    ->hasTurkishTrailer(false)
                    ->whereNotNull('backdrop_path')
                    ->when(! empty($usedIds), fn ($q) => $q->whereNotIn('id', $usedIds))
                    ->orderByDesc('popularity')
                    ->take(5 - $selected->count())
                    ->get();

                foreach ($trFill as $item) {
                    $selected->push($item);
                    $usedIds[] = $item->id;
                }
            }

            // Safety Fallback: In case library has less than 5 TR trailers, ensure hero never stays empty
            if ($selected->count() < 5) {
                $fallbackFill = TmdbTitle::with('trailers')
                    ->hasMatchedMedia()
                    ->hasPlayableTrailer()
                    ->whereNotNull('backdrop_path')
                    ->when(! empty($usedIds), fn ($q) => $q->whereNotIn('id', $usedIds))
                    ->orderByDesc('popularity')
                    ->take(5 - $selected->count())
                    ->get();

                foreach ($fallbackFill as $item) {
                    $selected->push($item);
                    $usedIds[] = $item->id;
                }
            }

            // If library has no matched media yet (e.g. freshly installed project), try any title with trailer in DB
            if ($selected->isEmpty()) {
                $anyPlayable = TmdbTitle::with('trailers')
                    ->hasPlayableTrailer()
                    ->whereNotNull('backdrop_path')
                    ->orderByDesc('popularity')
                    ->take(5)
                    ->get();

                foreach ($anyPlayable as $item) {
                    $selected->push($item);
                }
            }

            // If still completely empty, fallback to sample Avengers: Endgame hero with Turkish Dubbed trailer
            if ($selected->isEmpty()) {
                return [$this->getDefaultAvengersHero()];
            }

            $formatted = $selected->map(fn ($item) => $this->formatHeroItem($item))->filter()->values()->all();

            return ! empty($formatted) ? $formatted : [$this->getDefaultAvengersHero()];
        });

        // Guaranteed fallback if cache or empty result
        if (empty($heroSlides)) {
            $heroSlides = [$this->getDefaultAvengersHero()];
        }

        $hero = $heroSlides[0] ?? null;
        $heroIds = collect($heroSlides)->pluck('id')->filter()->all();

        // 2. Continue Watching (from recently updated media items)
        $continueWatchingItems = TmdbTitle::hasMatchedMedia()
            ->whereNotNull('backdrop_path')
            ->orderByDesc('updated_at')
            ->take(5)
            ->get();

        $progressList = [45, 60, 30, 75, 20];
        $timeList = ['42:10 / 02:15:00', '18:30 / 50:00', '59:05 / 02:23:45', '1:12:00 / 01:45:00', '25:10 / 58:00'];

        $continueWatching = $continueWatchingItems->map(function ($item, $idx) use ($progressList, $timeList) {
            return [
                'id' => $item->id,
                'slug' => $item->slug,
                'url' => $item->detail_url,
                'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
                'year' => (string) ($item->release_year ?: ($item->release_date ? substr((string) $item->release_date, 0, 4) : '')),
                'progress' => $progressList[$idx % count($progressList)],
                'time' => $timeList[$idx % count($timeList)],
                'poster' => $item->backdrop_url ?: ($item->poster_url ?: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600'),
                'type' => $item->media_type === 'tv' ? 'Dizi' : 'Film',
                'media_type' => $item->media_type,
            ];
        });

        // 3. Popular of the Week (excluding titles shown in the hero carousel)
        $popularOfWeekItems = TmdbTitle::hasMatchedMedia()
            ->when(! empty($heroIds), fn ($q) => $q->whereNotIn('id', $heroIds))
            ->orderByDesc('popularity')
            ->take(12)
            ->get();

        $popularOfWeek = $popularOfWeekItems->map(function ($item, $index) {
            $genres = GenreHelper::toTrString($item->genres, ' • ', 3, $item->media_type === 'tv' ? 'Dizi' : 'Film');

            $rawBadge = $item->extra_data['certification'] ?? null;
            if (! $rawBadge && $item->tmdb_id) {
                $rawBadge = Cache::remember("tmdb_cert_{$item->media_type}_{$item->tmdb_id}", now()->addMonth(), function () use ($item) {
                    $cert = app(TmdbService::class)->getCertification((int) $item->tmdb_id, $item->media_type);
                    if ($cert) {
                        $extra = $item->extra_data ?? [];
                        $extra['certification'] = $cert;
                        $item->extra_data = $extra;
                        $item->saveQuietly();
                    }

                    return $cert;
                });
            }

            $badge = CertificationHelper::toTr($rawBadge, $item->media_type);

            $season = $item->media_type === 'tv'
                ? ($item->season_badge ?: '1. Sezon')
                : 'Film';

            return [
                'rank' => $index + 1,
                'id' => $item->id,
                'slug' => $item->slug,
                'url' => $item->detail_url,
                'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
                'year' => (string) ($item->release_year ?: ($item->release_date ? substr((string) $item->release_date, 0, 4) : '')),
                'rating' => number_format($item->vote_average ?: 0, 1),
                'type' => $item->media_type === 'tv' ? 'Dizi' : 'Film',
                'season' => $season,
                'media_type' => $item->media_type,
                'genres' => $genres,
                'badge' => $badge,
                'poster' => $item->poster_url ?: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400',
            ];
        });

        // 4. Just Released
        $justReleaseItems = TmdbTitle::hasMatchedMedia()
            ->whereNotNull('release_date')
            ->orderByDesc('release_date')
            ->take(12)
            ->get();

        $justRelease = $justReleaseItems->map(function ($item) {
            $trGenresList = GenreHelper::toTrList($item->genres);
            $firstGenre = ! empty($trGenresList) ? $trGenresList[0] : ($item->media_type === 'tv' ? 'Dizi' : 'Film');
            $genres = GenreHelper::toTrString($item->genres, ' · ', 2, $item->media_type === 'tv' ? 'Dizi' : 'Film');

            return [
                'id' => $item->id,
                'slug' => $item->slug,
                'url' => $item->detail_url,
                'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
                'rating' => number_format($item->vote_average ?: 0, 1),
                'year' => (string) ($item->release_year ?: ($item->release_date ? substr((string) $item->release_date, 0, 4) : '')),
                'genres' => $genres,
                'genre' => $firstGenre,
                'type' => $item->media_type === 'tv' ? 'Dizi' : 'Film',
                'season' => $item->media_type === 'tv' ? ($item->season_badge ?: '1. Sezon') : null,
                'media_type' => $item->media_type,
                'quality' => QualityHelper::getShortQuality($item),
                'language' => QualityHelper::getLanguageBadge($item),
                'poster' => $item->poster_url ?: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=500',
            ];
        });

        // 5. Watchlist / Top Rated
        $watchlistItems = TmdbTitle::hasMatchedMedia()
            ->where('vote_count', '>=', 30)
            ->orderByDesc('vote_average')
            ->take(5)
            ->get();

        $watchlist = $watchlistItems->map(function ($item) {
            $genres = GenreHelper::toTrString($item->genres, ' · ', 2, $item->media_type === 'tv' ? 'Dizi' : 'Film');

            return [
                'id' => $item->id,
                'slug' => $item->slug,
                'url' => $item->detail_url,
                'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
                'rating' => number_format($item->vote_average ?: 0, 1),
                'year' => (string) ($item->release_year ?: ($item->release_date ? substr((string) $item->release_date, 0, 4) : '')),
                'genres' => $genres,
                'type' => $item->media_type === 'tv' ? 'Dizi' : 'Film',
                'media_type' => $item->media_type,
                'poster' => $item->backdrop_url ?: ($item->poster_url ?: 'https://images.unsplash.com/photo-1519074069444-1ba4ea16028d?auto=format&fit=crop&q=80&w=500'),
            ];
        });

        // 6. Recommended / Likes
        $likesItems = TmdbTitle::hasMatchedMedia()
            ->orderByDesc('id')
            ->take(5)
            ->get();

        $likes = $likesItems->map(function ($item) {
            $genres = GenreHelper::toTrString($item->genres, ' · ', 2, $item->media_type === 'tv' ? 'Dizi' : 'Film');

            return [
                'id' => $item->id,
                'slug' => $item->slug,
                'url' => $item->detail_url,
                'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
                'rating' => number_format($item->vote_average ?: 0, 1),
                'year' => (string) ($item->release_year ?: ($item->release_date ? substr((string) $item->release_date, 0, 4) : '')),
                'genres' => $genres,
                'type' => $item->media_type === 'tv' ? 'Dizi' : 'Film',
                'media_type' => $item->media_type,
                'poster' => $item->backdrop_url ?: ($item->poster_url ?: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=500'),
            ];
        });

        // 7. Genre Spotlight Banner & Categories (Daily Rotated Top DB Content)
        $spotlightCategories = [
            'Aksiyon',
            'Dram',
            'Komedi',
            'Gerilim',
            'Bilim Kurgu',
            'Fantastik',
            'Korku',
            'Macera',
            'Animasyon',
            'Belgesel',
        ];

        $genreSpotlights = [];
        $usedSpotlightIds = [];
        $todaySeedStr = date('Ymd');

        foreach ($spotlightCategories as $trGenre) {
            $dbKeywords = GenreHelper::getDbGenreNames($trGenre);

            $query = TmdbTitle::hasMatchedMedia()
                ->whereNotNull('backdrop_path');

            if (! empty($usedSpotlightIds)) {
                $query->whereNotIn('id', $usedSpotlightIds);
            }

            if (! empty($dbKeywords)) {
                $query->where(function ($q) use ($dbKeywords) {
                    foreach ($dbKeywords as $k) {
                        $q->orWhere('genres', 'like', '%'.$k.'%');
                    }
                });
            }

            // Fetch top 15 candidates ordered by rating/quality for this genre
            $candidates = (clone $query)
                ->orderByDesc('vote_average')
                ->where('vote_count', '>=', 3)
                ->take(15)
                ->get();

            if ($candidates->isEmpty()) {
                $candidates = (clone $query)->take(10)->get();
            }

            $item = null;
            if ($candidates->isNotEmpty()) {
                // Compute daily deterministic index for this genre
                $hash = abs(crc32($todaySeedStr.'_'.$trGenre));
                $selectedIndex = $hash % $candidates->count();
                $item = $candidates->get($selectedIndex);
            }

            if (! $item) {
                $item = TmdbTitle::hasMatchedMedia()
                    ->whereNotNull('backdrop_path')
                    ->when(! empty($usedSpotlightIds), fn ($q) => $q->whereNotIn('id', $usedSpotlightIds))
                    ->orderByDesc('vote_average')
                    ->first();
            }

            if ($item) {
                $usedSpotlightIds[] = $item->id;
                $trList = GenreHelper::toTrList($item->genres);

                $genreSpotlights[] = [
                    'name' => $trGenre,
                    'image' => $item->backdrop_url ?: ($item->poster_url ?: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=1200'),
                    'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
                    'rating' => number_format($item->vote_average ?: 0, 1),
                    'duration' => $item->media_type === 'tv' ? 'Dizi' : 'Film',
                    'year' => (string) ($item->release_year ?: ($item->release_date ? substr((string) $item->release_date, 0, 4) : '')),
                    'genres' => ! empty($trList) ? array_slice($trList, 0, 3) : [$trGenre],
                    'ratingCode' => $item->media_type === 'tv' ? '13+' : 'PG-13',
                    'description' => $item->overview_tr ?: ($item->overview ?: 'Öne çıkan yüksek çözünürlüklü dijital yayın yapımı.'),
                    'url' => $item->detail_url,
                ];
            }
        }

        $genreSpotlight = $genreSpotlights[0] ?? null;

        return Inertia::render('Home', array_merge($this->getCommonData(), [
            'hero' => $hero,
            'heroSlides' => $heroSlides,
            'continueWatching' => $continueWatching,
            'popularOfWeek' => $popularOfWeek,
            'justRelease' => $justRelease,
            'watchlist' => $watchlist,
            'likes' => $likes,
            'genreSpotlight' => $genreSpotlight,
            'genreSpotlights' => $genreSpotlights,
        ]));
    }

    public function movies(Request $request)
    {
        $search = $request->input('q');
        $selectedGenre = $request->input('genre', 'Tümü');
        $selectedSort = $request->input('sort', 'Popüler');

        $columns = (int) $request->input('columns', 0);
        $perPageInput = (int) $request->input('per_page', 0);

        if (in_array($columns, [4, 5, 6])) {
            $perPage = match ($columns) {
                4 => 16,
                6 => 24,
                default => 20,
            };
        } elseif (in_array($perPageInput, [16, 20, 24])) {
            $perPage = $perPageInput;
            $columns = match ($perPage) {
                16 => 4,
                24 => 6,
                default => 5,
            };
        } else {
            $columns = 5;
            $perPage = 20;
        }

        $query = TmdbTitle::query()->where('media_type', 'movie')->hasMatchedMedia();

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('title_tr', 'like', "%{$search}%")
                    ->orWhere('title_en', 'like', "%{$search}%")
                    ->orWhere('original_title', 'like', "%{$search}%");
            });
        }

        if (! empty($selectedGenre) && $selectedGenre !== 'Tümü') {
            $dbGenres = GenreHelper::getDbGenreNames($selectedGenre);
            $query->where(function ($sub) use ($dbGenres) {
                foreach ($dbGenres as $g) {
                    $sub->orWhereJsonContains('genres', $g)
                        ->orWhere('genres', 'like', "%{$g}%");
                }
            });
        }

        switch ($selectedSort) {
            case 'Son Eklenenler':
                $query->orderByDesc('id');
                break;
            case 'En Yüksek Puanlı':
                $query->orderByDesc('vote_average');
                break;
            case 'En Düşük Puanlı':
                $query->orderBy('vote_average');
                break;
            case 'A-Z':
                $query->orderBy('title');
                break;
            case 'Z-A':
                $query->orderByDesc('title');
                break;
            case 'Çıkış Yılı':
                $query->orderByDesc('release_year');
                break;
            case 'Popüler':
            default:
                $query->orderByDesc('popularity');
                break;
        }

        $paginated = $query->paginate($perPage)->withQueryString();

        $grid = collect($paginated->items())->map(function ($item) {
            $genres = GenreHelper::toTrString($item->genres, ' · ', 2, 'Film');

            return [
                'id' => $item->id,
                'tmdb_id' => $item->tmdb_id,
                'slug' => $item->slug,
                'url' => $item->detail_url,
                'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
                'rating' => number_format($item->vote_average ?: 0, 1),
                'genres' => $genres,
                'year' => $item->release_year,
                'quality' => QualityHelper::getShortQuality($item),
                'language' => QualityHelper::getLanguageBadge($item),
                'poster' => $item->poster_url ?: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=500',
            ];
        });

        // Hero movie strictly from user's real DB mediaFiles
        $heroItem = TmdbTitle::where('media_type', 'movie')->hasMatchedMedia()->whereNotNull('backdrop_path')->orderByDesc('popularity')->first();
        $hero = $heroItem ? [
            'id' => $heroItem->id,
            'slug' => $heroItem->slug,
            'url' => $heroItem->detail_url,
            'title' => $heroItem->title_tr ?: $heroItem->title,
            'rating' => number_format($heroItem->vote_average ?: 0, 1),
            'year' => $heroItem->release_year,
            'genres' => GenreHelper::toTrList($heroItem->genres),
            'description' => $heroItem->overview_tr ?: ($heroItem->overview ?: 'Sistemde kayıtlı yüksek çözünürlüklü film.'),
            'backdrop' => $heroItem->backdrop_url ?: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=1920',
        ] : null;

        // Popular of the week from user's real DB mediaFiles
        $popularOfWeekItems = TmdbTitle::where('media_type', 'movie')->hasMatchedMedia()->orderByDesc('popularity')->take(4)->get();
        $popularOfWeek = $popularOfWeekItems->map(function ($item, $index) {
            $genres = GenreHelper::toTrString($item->genres, ' · ', 2, 'Film');

            return [
                'rank' => $index + 1,
                'id' => $item->id,
                'slug' => $item->slug,
                'url' => $item->detail_url,
                'title' => $item->title_tr ?: $item->title,
                'rating' => number_format($item->vote_average ?: 0, 1),
                'type' => 'Film',
                'genres' => $genres,
                'badge' => 'HD',
                'poster' => $item->poster_url ?: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400',
            ];
        });

        // Top rated movies from user's real DB mediaFiles
        $morePopular = TmdbTitle::where('media_type', 'movie')->hasMatchedMedia()->orderByDesc('vote_average')->take(4)->get()->map(fn ($item) => [
            'id' => $item->id,
            'slug' => $item->slug,
            'url' => $item->detail_url,
            'title' => $item->title_tr ?: $item->title,
            'rating' => number_format($item->vote_average ?: 0, 1),
            'genres' => GenreHelper::toTrString($item->genres, ' · ', 2, 'Film'),
            'badge' => '4K',
            'poster' => $item->poster_url ?: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=200',
        ]);

        // Latest added movies from user's real DB mediaFiles
        $newest = TmdbTitle::where('media_type', 'movie')->hasMatchedMedia()->orderByDesc('created_at')->take(4)->get()->map(fn ($item) => [
            'id' => $item->id,
            'slug' => $item->slug,
            'url' => $item->detail_url,
            'title' => $item->title_tr ?: $item->title,
            'rating' => number_format($item->vote_average ?: 0, 1),
            'genres' => GenreHelper::toTrString($item->genres, ' · ', 2, 'Film'),
            'badge' => 'Yeni',
            'poster' => $item->poster_url ?: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=200',
        ]);

        $moviesOnAwards = $hero ? [
            'id' => $hero['id'],
            'slug' => $hero['slug'] ?? null,
            'url' => $hero['url'] ?? null,
            'title' => $hero['title'],
            'badge' => 'En Çok İzlenen',
            'rating' => $hero['rating'],
            'duration' => '2s 15dk',
            'year' => $hero['year'],
            'genres' => $hero['genres'],
            'ratingCode' => 'PG-13',
            'description' => $hero['description'],
            'poster' => $hero['backdrop'],
        ] : null;

        $availableGenres = GenreHelper::getAvailableGenresList();
        $totalCount = TmdbTitle::where('media_type', 'movie')->hasMatchedMedia()->count();

        return Inertia::render('Movies', array_merge($this->getCommonData(), [
            'hero' => $hero,
            'popularOfWeek' => $popularOfWeek,
            'grid' => $grid,
            'moviesOnAwards' => $moviesOnAwards,
            'morePopular' => $morePopular,
            'newest' => $newest,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
            'totalCount' => $totalCount,
            'availableGenres' => $availableGenres,
            'filters' => [
                'q' => $search ?: '',
                'genre' => $selectedGenre,
                'sort' => $selectedSort,
                'columns' => $columns,
                'per_page' => $perPage,
            ],
        ]));
    }

    public function series(Request $request)
    {
        $search = $request->input('q');
        $selectedGenre = $request->input('genre', 'Tümü');
        $selectedSort = $request->input('sort', 'Popüler');

        $query = TmdbTitle::query()->where('media_type', 'tv')->hasMatchedMedia();

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('title_tr', 'like', "%{$search}%")
                    ->orWhere('title_en', 'like', "%{$search}%")
                    ->orWhere('original_title', 'like', "%{$search}%");
            });
        }

        if (! empty($selectedGenre) && $selectedGenre !== 'Tümü') {
            $dbGenres = GenreHelper::getDbGenreNames($selectedGenre);
            $query->where(function ($sub) use ($dbGenres) {
                foreach ($dbGenres as $g) {
                    $sub->orWhereJsonContains('genres', $g)
                        ->orWhere('genres', 'like', "%{$g}%");
                }
            });
        }

        switch ($selectedSort) {
            case 'Son Eklenenler':
                $query->orderByDesc('id');
                break;
            case 'En Yüksek Puanlı':
                $query->orderByDesc('vote_average');
                break;
            case 'Popüler':
            default:
                $query->orderByDesc('popularity');
                break;
        }

        $tmdbSeriesList = $query->get();

        $gridItems = collect();

        foreach ($tmdbSeriesList as $item) {
            $genres = GenreHelper::toTrString($item->genres, ' · ', 2, 'Dizi');
            $gridItems->push([
                'id' => $item->id,
                'tmdb_id' => $item->tmdb_id,
                'slug' => $item->slug,
                'url' => $item->detail_url,
                'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
                'rating' => number_format($item->vote_average ?: 0, 1),
                'genres' => $genres,
                'year' => $item->release_year ?: 2023,
                'season' => 'Dizi',
                'quality' => QualityHelper::getShortQuality($item),
                'language' => QualityHelper::getLanguageBadge($item),
                'poster' => $item->poster_url ?: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=500',
            ]);
        }

        // Real hero from user's DB
        $heroItem = TmdbTitle::where('media_type', 'tv')->hasMatchedMedia()->whereNotNull('backdrop_path')->orderByDesc('popularity')->first();
        $hero = $heroItem ? [
            'id' => $heroItem->id,
            'slug' => $heroItem->slug,
            'url' => $heroItem->detail_url,
            'title' => $heroItem->title_tr ?: $heroItem->title,
            'season' => QualityHelper::getSeriesQuality($heroItem),
            'rating' => number_format($heroItem->vote_average ?: 0, 1),
            'year' => $heroItem->release_year,
            'genres' => GenreHelper::toTrList($heroItem->genres),
            'description' => $heroItem->overview_tr ?: ($heroItem->overview ?: 'Sistemde kayıtlı dizi serisi.'),
            'backdrop' => $heroItem->backdrop_url ?: ($heroItem->poster_url ?: ''),
        ] : null;

        // Real popular of the week from user's DB
        $popularOfWeek = $gridItems->take(4)->values()->map(function ($item, $index) {
            return [
                'rank' => $index + 1,
                'id' => $item['id'],
                'slug' => $item['slug'] ?? null,
                'url' => $item['url'] ?? null,
                'title' => $item['title'],
                'rating' => $item['rating'],
                'type' => 'Dizi',
                'genres' => $item['genres'],
                'badge' => $item['season'] ?? 'Dizi',
                'poster' => $item['poster'],
            ];
        });

        $columns = (int) $request->input('columns', 0);
        $perPageInput = (int) $request->input('per_page', 0);

        if (in_array($columns, [4, 5, 6])) {
            $perPage = match ($columns) {
                4 => 16,
                6 => 24,
                default => 20,
            };
        } elseif (in_array($perPageInput, [16, 20, 24])) {
            $perPage = $perPageInput;
            $columns = match ($perPage) {
                16 => 4,
                24 => 6,
                default => 5,
            };
        } else {
            $columns = 5;
            $perPage = 20;
        }

        $page = max(1, (int) $request->input('page', 1));
        $total = $gridItems->count();
        $paginatedGrid = $gridItems->slice(($page - 1) * $perPage, $perPage)->values();
        $lastPage = (int) max(1, ceil($total / $perPage));

        $availableGenres = ['Tümü', 'Aksiyon & Macera', 'Animasyon', 'Komedi', 'Dram', 'Çocuk', 'Bilim Kurgu & Fantastik', 'Gizem', 'Suç'];

        return Inertia::render('Series', array_merge($this->getCommonData(), [
            'hero' => $hero,
            'popularOfWeek' => $popularOfWeek,
            'grid' => $paginatedGrid,
            'totalCount' => $total,
            'availableGenres' => $availableGenres,
            'filters' => [
                'q' => $search ?: '',
                'genre' => $selectedGenre,
                'sort' => $selectedSort,
                'columns' => $columns,
                'per_page' => $perPage,
            ],
            'pagination' => [
                'current_page' => min($page, $lastPage),
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
                'from' => $total > 0 ? (($page - 1) * $perPage) + 1 : null,
                'to' => $total > 0 ? min($page * $perPage, $total) : null,
            ],
        ]));
    }

    public function releases(Request $request, ReleaseCalendarService $releaseService)
    {
        $type = (string) $request->query('type', 'all');
        $platform = (string) $request->query('platform', 'all');
        $availability = (string) $request->query('availability', 'all');
        $month = (string) $request->query('month', 'all');

        $calendarData = $releaseService->getCalendarData($type, $platform, $availability, $month);

        return Inertia::render('ReleaseSchedule', array_merge($this->getCommonData(), [
            'months' => $calendarData['months'],
            'featured' => $calendarData['featured'],
            'totalCount' => $calendarData['totalCount'],
            'availableMonths' => $calendarData['availableMonths'],
            'filters' => [
                'type' => $type,
                'platform' => $platform,
                'availability' => $availability,
                'month' => $month,
            ],
        ]));
    }

    public function forum(Request $request)
    {
        $isLoggedIn = $request->query('auth', '1') === '1';

        return Inertia::render('Forum', array_merge($this->getCommonData(), [
            'isLoggedIn' => $isLoggedIn,
            'userLikes' => [
                ['id' => 'oldway', 'title' => 'Eski Yol', 'poster' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300'],
                ['id' => 'unwelcome', 'title' => 'İstenmeyen', 'poster' => 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&q=80&w=300'],
                ['id' => 'unlocked', 'title' => 'Kilitsiz', 'poster' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=300'],
                ['id' => 'fastx', 'title' => 'Hızlı ve Öfkeli 10', 'poster' => 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=300'],
                ['id' => 'children', 'title' => 'Mısır Çocukları', 'poster' => 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=300'],
                ['id' => 'mario', 'title' => 'Süper Mario', 'poster' => 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=300'],
            ],
            'likedMovies' => [
                ['id' => 'starwars', 'title' => 'Star Wars', 'poster' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300'],
                ['id' => 'covenant', 'title' => 'The Covenant', 'poster' => 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=300'],
                ['id' => 'spiderman3', 'title' => 'Örümcek Adam 3', 'poster' => 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=300'],
                ['id' => 'oppenheimer', 'title' => 'Oppenheimer', 'poster' => 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=300'],
                ['id' => 'topgun', 'title' => 'Top Gun Maverick', 'poster' => 'https://images.unsplash.com/photo-1519074069444-1ba4ea16028d?auto=format&fit=crop&q=80&w=300'],
                ['id' => 'spiderverse', 'title' => 'Örümcek Evreni', 'poster' => 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=300'],
            ],
            'hotTopics' => [
                ['id' => 'manfromtoronto', 'title' => 'Torontolu Adam', 'genres' => 'Komedi · Aksiyon', 'rating' => '4.6', 'reviews' => '45', 'discussions' => '9', 'poster' => 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=200'],
                ['id' => 'elvis', 'title' => 'Elvis', 'genres' => 'Komedi · Aksiyon', 'rating' => '4.6', 'reviews' => '45', 'discussions' => '9', 'poster' => 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=200'],
                ['id' => 'spiderman3', 'title' => 'Örümcek Adam 3', 'genres' => 'Komedi · Aksiyon', 'rating' => '4.6', 'reviews' => '45', 'discussions' => '9', 'poster' => 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=200'],
                ['id' => 'themechanic', 'title' => 'Mechanic', 'genres' => 'Komedi · Aksiyon', 'rating' => '4.6', 'reviews' => '45', 'discussions' => '9', 'poster' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=200'],
                ['id' => 'theendmovie', 'title' => 'Son Film', 'genres' => 'Komedi · Aksiyon', 'rating' => '4.6', 'reviews' => '45', 'discussions' => '9', 'poster' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=200'],
                ['id' => 'threethousand', 'title' => 'Üç Bin Yıllık Arzular', 'genres' => 'Komedi · Aksiyon', 'rating' => '4.6', 'reviews' => '45', 'discussions' => '9', 'poster' => 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=200'],
                ['id' => 'topgun', 'title' => 'Top Gun Maverick', 'genres' => 'Komedi · Aksiyon', 'rating' => '4.6', 'reviews' => '45', 'discussions' => '9', 'poster' => 'https://images.unsplash.com/photo-1519074069444-1ba4ea16028d?auto=format&fit=crop&q=80&w=200'],
                ['id' => 'spiderverse', 'title' => 'Örümcek-Adam: Örümcek Evrenine...', 'genres' => 'Komedi · Aksiyon', 'rating' => '4.6', 'reviews' => '45', 'discussions' => '9', 'poster' => 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=200'],
            ],
            'discussions' => [
                ['id' => 'spiderman3-worst', 'votes' => 22, 'title' => 'Örümcek Adam 3\'ün serinin en kötü filmi olduğuna katılıyor musunuz? Neden?', 'author' => '@GaranAlbino', 'time' => '3 Saat önce', 'likes' => '24b', 'comments' => 17, 'poster' => 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=200', 'excerpt' => 'Ahmad Movie, Pandora gezegeninde yeni kurduğu ailesiyle yaşamaktadır. Eski bir tehdit geri döndüğünde, Jake gezegenlerini korumak için Neytiri ve Na\'vi ordusuyla birlikte çalışmalıdır.'],
                ['id' => 'spiderverse-second', 'votes' => 0, 'title' => 'Örümcek Evrenine Geçiş filminin devam halkası hakkında ne düşünüyorsunuz?', 'author' => '@GaranAlbino', 'time' => '3 Saat önce', 'likes' => '24b', 'comments' => 17, 'poster' => 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=200', 'excerpt' => 'Ahmad Movie, Pandora gezegeninde yeni kurduğu ailesiyle yaşamaktadır. Eski bir tehdit geri döndüğünde, Jake gezegenlerini korumak için Neytiri ve Na\'vi ordusuyla birlikte çalışmalıdır.'],
                ['id' => 'topgun-propaganda', 'votes' => 423, 'title' => 'Top Gun sinema dünyası için bir propaganda filmi mi?', 'author' => '@GaranAlbino', 'time' => '3 Saat önce', 'likes' => '24b', 'comments' => 17, 'poster' => 'https://images.unsplash.com/photo-1519074069444-1ba4ea16028d?auto=format&fit=crop&q=80&w=200', 'excerpt' => 'Ahmad Movie, Pandora gezegeninde yeni kurduğu ailesiyle yaşamaktadır. Eski bir tehdit geri döndüğünde, Jake gezegenlerini korumak için Neytiri ve Na\'vi ordusuyla birlikte çalışmalıdır.'],
                ['id' => 'statham-injuries', 'votes' => 13, 'title' => 'Mechanic filmindeki Jason Statham sakatlıkları gerçek mi?', 'author' => '@GaranAlbino', 'time' => '3 Saat önce', 'likes' => '24b', 'comments' => 17, 'poster' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=200', 'excerpt' => 'Ahmad Movie, Pandora gezegeninde yeni kurduğu ailesiyle yaşamaktadır. Eski bir tehdit geri döndüğünde, Jake gezegenlerini korumak için Neytiri ve Na\'vi ordusuyla birlikte çalışmalıdır.'],
            ],
            'premiereEvents' => [
                [
                    'month' => 'Kasım',
                    'events' => [
                        [
                            'day' => '05',
                            'title' => 'Zayıf Kahraman S1: 4. Bölüm İnceleme Yayını',
                            'sub' => '1. Sezon 3. Bölüm: Birinci Kısım',
                            'poster' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=200',
                            'starTime' => '17:00 TSİ',
                            'info' => 'Archie Comics hikayesinden uyarlanan yayın etkinliğinde Riverdale sırlarını ve tüm detayları tartışıyoruz...',
                            'rules' => ['Saygılı Olun', 'Küfür ve Hakaret Yasaktır', 'Keyifli Sohbetler...'],
                        ],
                        [
                            'day' => '08',
                            'title' => 'Şeytanın Köleleri: Komünyon Özel Yayını',
                            'sub' => '1. Sezon 3. Bölüm: Birinci Kısım',
                            'poster' => 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&q=80&w=200',
                        ],
                        [
                            'day' => '08',
                            'title' => 'Örümcek Evrenine Geçiş Özel İncelesi',
                            'sub' => '1. Sezon 3. Bölüm: Birinci Kısım',
                            'poster' => 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=200',
                        ],
                    ],
                ],
            ],
        ]));
    }

    public function about()
    {
        return Inertia::render('About', $this->getCommonData());
    }

    public function settings()
    {
        return Inertia::render('Settings', $this->getCommonData());
    }

    public function movieDetail($id = null)
    {
        $movieItem = TmdbTitle::findBySlugOrId($id, 'movie');

        if (! $movieItem) {
            $movieItem = TmdbTitle::with(['castMembers', 'videos', 'mediaFiles'])
                ->where('media_type', 'movie')
                ->hasMatchedMedia()
                ->orderByDesc('popularity')
                ->first();
        } else {
            $movieItem->load(['castMembers', 'videos', 'mediaFiles']);
        }

        if ($movieItem && $movieItem->videos->isEmpty() && $movieItem->tmdb_id) {
            try {
                $tmdbService = app(TmdbService::class);
                $videos = $tmdbService->fetchVideos((int) $movieItem->tmdb_id, 'movie');
                if (! empty($videos)) {
                    $tmdbService->syncTitleRelations($movieItem, ['videos' => $videos]);
                    $movieItem->load('videos');
                }
            } catch (\Throwable) {
            }
        }

        $movieData = $movieItem ? (new MovieDetailResource($movieItem))->resolve() : null;

        $similarMovies = $movieItem
            ? TitleRecommendationService::getSimilar($movieItem, 6)
            : collect();

        $collection = null;
        if ($movieItem && $movieItem->tmdb_id) {
            $tmdbService = app(TmdbService::class);
            $rawCollection = $tmdbService->getMovieCollection((int) $movieItem->tmdb_id);

            if ($rawCollection && ! empty($rawCollection['parts'])) {
                $partIds = array_column($rawCollection['parts'], 'id');
                $localTitles = TmdbTitle::whereIn('tmdb_id', $partIds)
                    ->where('media_type', 'movie')
                    ->withCount('mediaFiles')
                    ->get()
                    ->keyBy('tmdb_id');

                $formattedParts = [];
                foreach ($rawCollection['parts'] as $part) {
                    $local = $localTitles->get($part['id']);
                    $isCurrent = ($part['id'] === (int) $movieItem->tmdb_id);
                    $isAvailable = $local !== null;

                    $formattedParts[] = [
                        'id' => $part['id'],
                        'title' => $part['title'],
                        'original_title' => $part['original_title'],
                        'release_date' => $part['release_date'],
                        'release_year' => $part['release_year'],
                        'vote_average' => $part['vote_average'],
                        'vote_count' => $part['vote_count'] ?? 0,
                        'poster' => $part['poster_url'],
                        'backdrop' => $part['backdrop_url'],
                        'overview' => $part['overview'],
                        'is_current' => $isCurrent,
                        'is_available' => $isAvailable,
                        'has_download' => $local ? ($local->media_files_count > 0) : false,
                        'url' => $local ? $local->detail_url : null,
                    ];
                }

                $collection = [
                    'id' => $rawCollection['id'],
                    'name' => $rawCollection['name'],
                    'overview' => $rawCollection['overview'],
                    'poster' => $rawCollection['poster_url'],
                    'backdrop' => $rawCollection['backdrop_url'],
                    'total_parts' => count($formattedParts),
                    'available_count' => count(array_filter($formattedParts, fn ($p) => $p['is_available'])),
                    'parts' => $formattedParts,
                ];
            }
        }

        $comments = collect();
        $userRatingAvg = null;
        $userRatingCount = 0;

        if ($movieItem) {
            $comments = Comment::where('tmdb_title_id', $movieItem->id)
                ->whereNull('parent_id')
                ->where('is_approved', true)
                ->with(['replies' => function ($q) {
                    $q->where('is_approved', true)->orderBy('created_at', 'asc');
                }, 'user'])
                ->orderByDesc('created_at')
                ->get();

            $userRatingAvg = Comment::where('tmdb_title_id', $movieItem->id)
                ->whereNotNull('rating')
                ->where('rating', '>', 0)
                ->avg('rating');

            $userRatingCount = Comment::where('tmdb_title_id', $movieItem->id)
                ->whereNotNull('rating')
                ->where('rating', '>', 0)
                ->count();
        }

        return Inertia::render('MovieDetail', array_merge($this->getCommonData(), [
            'movie' => $movieData,
            'similarMovies' => TmdbTitleListResource::collection($similarMovies)->resolve(),
            'collection' => $collection,
            'comments' => $comments,
            'userRatingAvg' => $userRatingAvg ? round((float) $userRatingAvg, 1) : null,
            'userRatingCount' => $userRatingCount,
        ]));
    }

    public function seriesDetail($id = null)
    {
        $seriesItem = TmdbTitle::findBySlugOrId($id, 'tv');

        if (! $seriesItem) {
            $seriesItem = TmdbTitle::with(['castMembers', 'seasons.episodes', 'episodes', 'mediaFiles', 'videos'])
                ->where('media_type', 'tv')
                ->hasMatchedMedia()
                ->orderByDesc('popularity')
                ->first();
        } else {
            $seriesItem->load(['castMembers', 'seasons.episodes', 'episodes', 'mediaFiles', 'videos']);
        }

        if ($seriesItem && $seriesItem->videos->isEmpty() && $seriesItem->tmdb_id) {
            try {
                $tmdbService = app(TmdbService::class);
                $videos = $tmdbService->fetchVideos((int) $seriesItem->tmdb_id, 'tv');
                if (! empty($videos)) {
                    $tmdbService->syncTitleRelations($seriesItem, ['videos' => $videos]);
                    $seriesItem->load('videos');
                }
            } catch (\Throwable) {
            }
        }

        $seriesData = $seriesItem ? (new SeriesDetailResource($seriesItem))->resolve() : null;

        $similarSeries = $seriesItem
            ? TitleRecommendationService::getSimilar($seriesItem, 6)
            : collect();

        $comments = collect();
        $userRatingAvg = null;
        $userRatingCount = 0;

        if ($seriesItem) {
            $comments = Comment::where('tmdb_title_id', $seriesItem->id)
                ->whereNull('parent_id')
                ->where('is_approved', true)
                ->with(['replies' => function ($q) {
                    $q->where('is_approved', true)->orderBy('created_at', 'asc');
                }, 'user'])
                ->orderByDesc('created_at')
                ->get();

            $userRatingAvg = Comment::where('tmdb_title_id', $seriesItem->id)
                ->whereNotNull('rating')
                ->where('rating', '>', 0)
                ->avg('rating');

            $userRatingCount = Comment::where('tmdb_title_id', $seriesItem->id)
                ->whereNotNull('rating')
                ->where('rating', '>', 0)
                ->count();
        }

        return Inertia::render('SeriesDetail', array_merge($this->getCommonData(), [
            'series' => $seriesData,
            'similarSeries' => TmdbTitleListResource::collection($similarSeries)->resolve(),
            'comments' => $comments,
            'userRatingAvg' => $userRatingAvg ? round((float) $userRatingAvg, 1) : null,
            'userRatingCount' => $userRatingCount,
        ]));
    }

    public function personDetail($id, TmdbService $tmdbService)
    {
        $personId = null;
        $cleanId = trim((string) $id);

        if (preg_match('/^(\d+)/', $cleanId, $matches)) {
            $personId = (int) $matches[1];
        } else {
            $nameSearch = str_replace('-', ' ', $cleanId);
            $cast = TmdbCast::where('name', 'like', "%{$nameSearch}%")
                ->whereNotNull('tmdb_person_id')
                ->first();

            if ($cast) {
                $personId = $cast->tmdb_person_id;
            } else {
                $searchResult = $tmdbService->searchPerson($nameSearch);
                if (! empty($searchResult[0]['id'])) {
                    $personId = $searchResult[0]['id'];
                }
            }
        }

        $personData = $personId ? $tmdbService->getPersonDetails($personId) : null;

        if (! $personData) {
            $cast = TmdbCast::where('tmdb_person_id', $personId)
                ->orWhere('id', (int) $cleanId)
                ->orWhere('name', 'like', "%{$cleanId}%")
                ->first();

            if ($cast) {
                $personData = [
                    'id' => $cast->tmdb_person_id ?: $cast->id,
                    'name' => $cast->name,
                    'also_known_as' => [],
                    'biography' => 'Bu sanatçı için biyografi bilgisi henüz eklenmedi.',
                    'birthday' => null,
                    'deathday' => null,
                    'age' => null,
                    'place_of_birth' => null,
                    'known_for_department' => $cast->department ?: 'Oyunculuk',
                    'raw_department' => 'Acting',
                    'gender' => 'Belirtilmemiş',
                    'popularity' => 0,
                    'profile_path' => $cast->profile_path,
                    'profile_url' => $cast->profile_url,
                    'avatar' => $cast->profile_url ?: 'https://ui-avatars.com/api/?name='.urlencode($cast->name).'&color=00B074&background=191D28',
                    'images' => [],
                    'external_ids' => [
                        'imdb_id' => null,
                        'imdb_url' => null,
                        'instagram_id' => null,
                        'instagram_url' => null,
                        'twitter_id' => null,
                        'twitter_url' => null,
                        'facebook_id' => null,
                        'facebook_url' => null,
                    ],
                    'credits' => [],
                    'known_for' => [],
                    'total_credits' => 0,
                ];
            }
        }

        if (! $personData) {
            abort(404, 'Sanatçı profili bulunamadı.');
        }

        $personName = $personData['name'];

        // Find titles in local database where this person is in the cast
        $localQuery = TmdbTitle::query()
            ->whereHas('castMembers', function ($q) use ($personId, $personName) {
                $q->where(function ($sub) use ($personId, $personName) {
                    if ($personId) {
                        $sub->where('tmdb_person_id', $personId);
                    }
                    if (! empty($personName)) {
                        $sub->orWhere('name', $personName);
                    }
                });
            })
            ->hasMatchedMedia()
            ->with(['mediaFiles', 'castMembers' => function ($q) use ($personId, $personName) {
                $q->where(function ($sub) use ($personId, $personName) {
                    if ($personId) {
                        $sub->where('tmdb_person_id', $personId);
                    }
                    if (! empty($personName)) {
                        $sub->orWhere('name', $personName);
                    }
                });
            }])
            ->orderByDesc('vote_average');

        $localTitles = $localQuery->get();

        $localMap = [];
        $localItemsFormatted = $localTitles->map(function ($item) use (&$localMap) {
            $isTv = $item->media_type === 'tv';
            $genres = is_array($item->genres) ? implode(' · ', array_slice($item->genres, 0, 2)) : ($item->genres ?: ($isTv ? 'Dizi' : 'Film'));
            $playedRole = $item->castMembers->first()?->character ?: ($item->castMembers->first()?->job ?: 'Oyuncu');

            $formatted = [
                'id' => $item->id,
                'tmdb_id' => $item->tmdb_id,
                'slug' => $item->slug,
                'url' => $item->detail_url,
                'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
                'rating' => number_format($item->vote_average ?: 0, 1),
                'genres' => $genres,
                'year' => (string) ($item->release_year ?: ($item->release_date ? substr((string) $item->release_date, 0, 4) : '')),
                'quality' => '4K Ultra HD',
                'type' => $isTv ? 'TV Series' : 'Movie',
                'isTv' => $isTv,
                'media_type' => $item->media_type,
                'character' => $playedRole,
                'poster' => $item->poster_url ?: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400',
            ];

            if ($item->tmdb_id) {
                $localMap[$item->tmdb_id] = $formatted;
            }

            return $formatted;
        })->values()->all();

        // Cross-reference person's credits with local catalog
        $enrichedCredits = array_map(function ($credit) use ($localMap) {
            $creditTmdbId = $credit['tmdb_id'] ?? null;
            if ($creditTmdbId && isset($localMap[$creditTmdbId])) {
                $credit['in_library'] = true;
                $credit['library_url'] = $localMap[$creditTmdbId]['url'];
                $credit['library_title'] = $localMap[$creditTmdbId]['title'];
            } else {
                $credit['in_library'] = false;
                $credit['library_url'] = null;
            }

            return $credit;
        }, $personData['credits'] ?? []);

        $enrichedKnownFor = array_map(function ($credit) use ($localMap) {
            $creditTmdbId = $credit['tmdb_id'] ?? null;
            if ($creditTmdbId && isset($localMap[$creditTmdbId])) {
                $credit['in_library'] = true;
                $credit['library_url'] = $localMap[$creditTmdbId]['url'];
            } else {
                $credit['in_library'] = false;
                $credit['library_url'] = null;
            }

            return $credit;
        }, $personData['known_for'] ?? []);

        $personData['credits'] = $enrichedCredits;
        $personData['known_for'] = $enrichedKnownFor;
        $personData['local_titles'] = $localItemsFormatted;
        $personData['local_titles_count'] = count($localItemsFormatted);

        return Inertia::render('PersonDetail', array_merge($this->getCommonData(), [
            'person' => $personData,
        ]));
    }

    public function discussionDetail($id = 'spiderman3-worst')
    {
        return Inertia::render('DiscussionDetail', array_merge($this->getCommonData(), [
            'discussion' => [
                'id' => $id,
                'title' => 'Örümcek Adam 3\'ün serinin en kötü filmi olduğuna katılıyor musunuz? Neden?',
                'votes' => 22,
                'author' => '@GaranAlbino',
                'time' => '3 Saat önce',
                'likes' => '24b',
                'commentsCount' => 17,
                'poster' => 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=300',
                'body' => 'Ahmad Movie, Pandora gezegeninde yeni kurduğu ailesiyle yaşamaktadır. Eski bir tehdit geri döndüğünde, Jake gezegenlerini korumak için Neytiri ve Na\'vi ordusuyla birlikte çalışmalıdır.',
                'comments' => [
                    ['id' => 1, 'author' => '@GaranAlbino', 'badge' => 'Kurucu', 'time' => '3 Saat önce', 'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100', 'text' => 'Bence Pandora gezegeninde kurduğu aile ile yaşam mücadelesinde Jake ve Neytiri gezegeni korumak için harika bir duruş sergiliyor...', 'upvotes' => 22, 'downvotes' => 0],
                    ['id' => 2, 'author' => '@Eric', 'time' => '3 Saat önce', 'avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100', 'text' => 'Jake ve Neytiri birlik olmalı.', 'upvotes' => 1, 'downvotes' => 0],
                    ['id' => 3, 'author' => '@GaranAlbino', 'time' => '3 Saat önce', 'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100', 'text' => 'Çok beğendim.', 'upvotes' => 0, 'downvotes' => 0],
                    ['id' => 4, 'author' => '@Irvanwibowo (Siz)', 'time' => '3 Saat önce', 'isUser' => true, 'avatar' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100', 'text' => 'Filmi gerçekten çok sevdim.', 'upvotes' => 0, 'downvotes' => 0],
                ],
            ],
        ]));
    }

    public function movieTopic($id = 'starwars')
    {
        return Inertia::render('MovieTopic', array_merge($this->getCommonData(), [
            'movieTopic' => [
                'id' => $id,
                'title' => 'Star Wars: Güç Uyanıyor',
                'rating' => '4.8',
                'duration' => '2s 40dk',
                'year' => '2022',
                'genres' => ['Fantezi', 'Aksiyon'],
                'ratingCode' => 'PG-13',
                'backdrop' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1920',
                'discussions' => [
                    ['id' => 'spiderman3-worst', 'title' => 'Örümcek Adam 3\'ün serinin en kötü filmi olduğuna katılıyor musunuz? Neden?', 'author' => '@irvanwibowo', 'time' => '3 Saat önce', 'likes' => '24b', 'comments' => 17, 'excerpt' => 'Ahmad Movie, Pandora gezegeninde yeni kurduğu ailesiyle yaşamaktadır. Eski bir tehdit geri döndüğünde, Jake gezegenlerini korumak için Neytiri ve Na\'vi ordusuyla birlikte çalışmalıdır.'],
                    ['id' => 'barbie-sex', 'title' => 'Barbie filminde yetişkin içerikli sahneler var mı?', 'author' => '@amandahui', 'time' => '3 Saat önce', 'likes' => '24b', 'comments' => 17, 'excerpt' => 'Ahmad Movie, Pandora gezegeninde yeni kurduğu ailesiyle yaşamaktadır. Eski bir tehdit geri döndüğünde, Jake gezegenlerini korumak için Neytiri ve Na\'vi ordusuyla birlikte çalışmalıdır.'],
                    ['id' => 'topgun-propaganda', 'title' => 'Top Gun sinema dünyası için bir propaganda filmi mi?', 'author' => '@Gerrardway', 'time' => '3 Saat önce', 'likes' => '24b', 'comments' => 17, 'excerpt' => 'Ahmad Movie, Pandora gezegeninde yeni kurduğu ailesiyle yaşamaktadır. Eski bir tehdit geri döndüğünde, Jake gezegenlerini korumak için Neytiri ve Na\'vi ordusuyla birlikte çalışmalıdır.'],
                    ['id' => 'statham-injuries', 'title' => 'Mechanic filmindeki Jason Statham sakatlıkları gerçek mi?', 'author' => '@jasonmraz', 'time' => '3 Saat önce', 'likes' => '24b', 'comments' => 17, 'excerpt' => 'Ahmad Movie, Pandora gezegeninde yeni kurduğu ailesiyle yaşamaktadır. Eski bir tehdit geri döndüğünde, Jake gezegenlerini korumak için Neytiri ve Na\'vi ordusuyla birlikte çalışmalıdır.'],
                ],
            ],
        ]));
    }

    public function search(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        $query = TmdbTitle::query()->with('seasons')->hasMatchedMedia();

        if (! empty($q)) {
            $query->where(function ($sub) use ($q) {
                $sub->where('title', 'like', "%{$q}%")
                    ->orWhere('title_tr', 'like', "%{$q}%")
                    ->orWhere('title_en', 'like', "%{$q}%")
                    ->orWhere('original_title', 'like', "%{$q}%");
            });
        }

        $paginated = $query->orderByDesc('popularity')->paginate(24)->withQueryString();

        $results = collect($paginated->items())->map(function ($item) {
            $genres = is_array($item->genres)
                ? $item->genres
                : (is_string($item->genres) ? array_values(array_filter(array_map('trim', explode(',', $item->genres)))) : ['Film']);

            $isTv = $item->media_type === 'tv';
            $seasonBadge = null;
            if ($isTv) {
                $maxSeason = $item->relationLoaded('seasons') && $item->seasons->isNotEmpty()
                    ? $item->seasons->where('season_number', '>', 0)->max('season_number')
                    : 1;
                $seasonBadge = 'S'.($maxSeason ?: 1);
            }

            return [
                'id' => $item->id,
                'slug' => $item->slug,
                'url' => $item->detail_url,
                'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
                'rating' => number_format($item->vote_average ?: 0, 1),
                'genres' => ! empty($genres) ? $genres : ['Film'],
                'year' => (string) ($item->release_year ?: ($item->release_date ? substr((string) $item->release_date, 0, 4) : '')),
                'duration' => $isTv ? 'Dizi' : 'Film',
                'type' => $isTv ? 'TV Series' : 'Movie',
                'media_type' => $item->media_type,
                'season_badge' => $seasonBadge,
                'poster' => $item->poster_url ?: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
                'overview' => $item->overview_tr ?: ($item->overview ?: 'Açıklama bulunmuyor.'),
            ];
        });

        return Inertia::render('SearchResult', array_merge($this->getCommonData(), [
            'query' => $q,
            'results' => $results,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
        ]));
    }

    public function watchlist()
    {
        return Inertia::render('Watchlist', array_merge($this->getCommonData(), [
            'items' => [
                ['id' => 'flash', 'title' => 'The Flash', 'poster' => 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=500'],
                ['id' => 'witcher2', 'title' => 'The Witcher 2. Cilt', 'poster' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=500'],
                ['id' => 'reign', 'title' => 'Reign', 'poster' => 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=500'],
                ['id' => 'tlou', 'title' => 'The Last Of Us', 'poster' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=500'],
                ['id' => 'enola2', 'title' => 'Enola Holmes 2', 'poster' => 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500'],
                ['id' => 'satansslaves', 'title' => 'Şeytanın Köleleri', 'poster' => 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&q=80&w=500'],
                ['id' => 'weakhero', 'title' => 'Zayıf Kahraman', 'poster' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=500'],
                ['id' => 'wonderwoman', 'title' => 'Wonder Woman', 'poster' => 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=500'],
            ],
        ]));
    }

    public function downloads()
    {
        return Inertia::render('Downloads', array_merge($this->getCommonData(), [
            'downloads' => [
                ['id' => 'tlou', 'title' => 'The Last of Us', 'year' => '2022', 'meta' => '4. Bölüm · 1s 4dk', 'progress' => 35, 'isMovie' => false, 'poster' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600'],
                ['id' => 'gotg3', 'title' => 'Galaksinin Koruyucuları Vol.3', 'year' => '2022', 'meta' => '2s 4dk', 'progress' => 80, 'isMovie' => true, 'poster' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600'],
                ['id' => 'satansslave', 'title' => 'Şeytanın Kölesi', 'year' => '2022', 'meta' => '2s 4dk', 'progress' => 98, 'isMovie' => true, 'poster' => 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&q=80&w=600'],
                ['id' => 'jumanji', 'title' => 'Jumanji', 'year' => '2022', 'meta' => '2s 4dk', 'progress' => 100, 'isMovie' => true, 'poster' => 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600'],
                ['id' => 'dungeon', 'title' => 'Zindanlar ve Ejderhalar', 'year' => '2022', 'meta' => '2s 4dk', 'progress' => 100, 'isMovie' => true, 'poster' => 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=600'],
                ['id' => 'tlou3', 'title' => 'The Last of Us', 'year' => '2022', 'meta' => '3. Bölüm · 48dk', 'progress' => 100, 'isMovie' => false, 'poster' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600'],
            ],
        ]));
    }

    /**
     * Format a TmdbTitle model into Hero Slide data array.
     *
     * @return array<string, mixed>|null
     */
    protected function formatHeroItem(?TmdbTitle $item): ?array
    {
        if (! $item) {
            return null;
        }

        return [
            'id' => $item->id,
            'slug' => $item->slug,
            'url' => $item->detail_url,
            'title' => $item->title_tr ?: ($item->title ?: $item->original_title),
            'season' => $item->media_type === 'tv' ? 'Dizi' : 'Film',
            'rating' => number_format($item->vote_average ?: 0, 1),
            'year' => (string) ($item->release_year ?: ($item->release_date ? substr((string) $item->release_date, 0, 4) : '')),
            'genres' => GenreHelper::toTrList($item->genres),
            'description' => $item->overview_tr ?: ($item->overview ?: 'Öne çıkan yüksek çözünürlüklü dijital yayın içeriği.'),
            'backdrop' => $item->backdrop_url ?: ($item->poster_url ?: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1920'),
            'type' => $item->media_type === 'tv' ? 'Dizi' : 'Film',
            'media_type' => $item->media_type,
            'quality' => $item->media_type === 'tv' ? QualityHelper::getSeriesQuality($item) : QualityHelper::getMovieQuality($item),
            'trailer' => $item->trailer ? [
                'id' => $item->trailer->id,
                'key' => $item->trailer->key,
                'name' => $item->trailer->name,
                'label' => $item->trailer->label,
                'site' => $item->trailer->site,
                'type' => $item->trailer->type,
                'is_dubbed' => (bool) $item->trailer->is_dubbed,
                'is_subtitled' => (bool) $item->trailer->is_subtitled,
                'embed_url' => $item->trailer->embed_url,
                'video_url' => $item->trailer->video_url,
            ] : null,
            'trailers' => ($item->relationLoaded('trailers')
                ? $item->trailers
                : ($item->relationLoaded('videos')
                    ? $item->videos->where('type', 'Trailer')->sortBy('sort_order')->values()
                    : $item->trailers()->get())
            )->map(fn ($t) => [
                'id' => $t->id,
                'key' => $t->key,
                'name' => $t->name,
                'label' => $t->label,
                'site' => $t->site,
                'type' => $t->type,
                'is_dubbed' => (bool) $t->is_dubbed,
                'is_subtitled' => (bool) $t->is_subtitled,
                'embed_url' => $t->embed_url,
                'video_url' => $t->video_url,
            ])->values()->all(),
        ];
    }

    /**
     * Fallback hero slide with Avengers: Endgame Turkish Dubbed trailer
     * when the system is freshly installed or has no matched media yet.
     *
     * @return array<string, mixed>
     */
    protected function getDefaultAvengersHero(): array
    {
        return [
            'id' => 999999,
            'slug' => 'avengers-endgame',
            'url' => '/movie/avengers-endgame',
            'title' => 'Avengers: Endgame',
            'season' => 'Film',
            'rating' => '8.4',
            'year' => '2019',
            'genres' => ['Aksiyon', 'Macera', 'Bilim Kurgu'],
            'description' => 'Thanos\'un evrenin yarısını yok etmesinin ardından geriye kalan Yenilmezler, kayıplarını geri getirmek ve evreni eski haline döndürmek için son bir fedakarlıkla bir araya gelir.',
            'backdrop' => 'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zJW8Q92Zu070U.jpg',
            'type' => 'Film',
            'media_type' => 'movie',
            'quality' => '4K Ultra HD',
            'trailer' => [
                'id' => 1,
                'key' => 'kYJv1zT058k',
                'name' => 'Avengers: Endgame - Dublajlı Resmi Fragman',
                'label' => 'Türkçe Dublaj',
                'site' => 'YouTube',
                'type' => 'Trailer',
                'is_dubbed' => true,
                'is_subtitled' => false,
                'embed_url' => 'https://www.youtube.com/embed/kYJv1zT058k',
                'video_url' => 'https://www.youtube.com/watch?v=kYJv1zT058k',
            ],
            'trailers' => [
                [
                    'id' => 1,
                    'key' => 'kYJv1zT058k',
                    'name' => 'Avengers: Endgame - Dublajlı Resmi Fragman',
                    'label' => 'Türkçe Dublaj',
                    'site' => 'YouTube',
                    'type' => 'Trailer',
                    'is_dubbed' => true,
                    'is_subtitled' => false,
                    'embed_url' => 'https://www.youtube.com/embed/kYJv1zT058k',
                    'video_url' => 'https://www.youtube.com/watch?v=kYJv1zT058k',
                ],
                [
                    'id' => 2,
                    'key' => 'J_gP4Ld6d7Q',
                    'name' => 'Avengers: Endgame - Resmi Fragman',
                    'label' => 'Türkçe Dublaj 2',
                    'site' => 'YouTube',
                    'type' => 'Trailer',
                    'is_dubbed' => true,
                    'is_subtitled' => false,
                    'embed_url' => 'https://www.youtube.com/embed/J_gP4Ld6d7Q',
                    'video_url' => 'https://www.youtube.com/watch?v=J_gP4Ld6d7Q',
                ],
            ],
        ];
    }

    /**
     * Display the subscription packages & pricing page.
     */
    public function pricing()
    {
        $plans = Plan::active()->get();
        $paymentMethods = PaymentMethod::active()->get();
        $faqs = Setting::get('pricing_faq_settings', AdminController::defaultFaqs());

        return Inertia::render('Pricing', array_merge($this->getCommonData(), [
            'plans' => $plans,
            'paymentMethods' => $paymentMethods,
            'faqs' => $faqs,
        ]));
    }

    /**
     * Subscribe user to a chosen plan with selected duration or purchase Extra Quota.
     */
    public function subscribePlan(Request $request, Plan $plan, SubscriptionService $subscriptionService)
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->route('home')->with('error', 'Lütfen önce giriş yapınız.');
        }

        if ($plan->isExtra()) {
            if (! $subscriptionService->canBuyExtraQuota($user)) {
                return redirect()->back()->with('error', 'Ek kota satın alabilmek için aktif bir bireysel veya business paketinizin bulunması gerekmektedir.');
            }

            try {
                $subscriptionService->purchaseExtraQuota($user, $plan);

                return redirect()->back()->with('success', "Tebrikler! {$plan->name} ({$plan->monthly_quota_gb} GB - 30 Gün) ek kotanız aktif edildi.");
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage());
            }
        }

        $validated = $request->validate([
            'duration_months' => 'required|in:1,3,6,12',
        ]);

        $duration = (int) $validated['duration_months'];

        if (! $plan->isDurationAllowed($duration)) {
            return redirect()->back()->with('error', "{$plan->name} paketi için seçilen {$duration} aylık abonelik döngüsü geçerli değildir.");
        }

        $subscriptionService->subscribe($user, $plan, $duration);

        return redirect()->back()->with('success', "Tebrikler! {$plan->name} ({$duration} Ay) paketiniz aktif edildi.");
    }

    /**
     * Cancel/close perpetual subscription when remaining quota is low (< 5GB).
     */
    public function cancelPerpetualSubscription(Request $request, SubscriptionService $subscriptionService)
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->route('home')->with('error', 'Lütfen önce giriş yapınız.');
        }

        try {
            $subscriptionService->cancelPerpetualSubscription($user);

            return redirect()->back()->with('success', 'Süresiz özel kotanız başarıyla kapatıldı. Artık yeni bir indirme paketi seçip satın alabilirsiniz.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }
}
