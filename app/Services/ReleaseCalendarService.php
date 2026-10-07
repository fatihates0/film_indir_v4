<?php

namespace App\Services;

use App\Models\ReleaseCalendarItem;
use App\Models\TmdbTitle;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ReleaseCalendarService
{
    protected string $baseUrl;

    protected ?string $token;

    protected ?string $apiKey;

    protected string $imageBase;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.tmdb.base_url', 'https://api.themoviedb.org/3'), '/');
        $this->apiKey = config('services.tmdb.api_key');
        $this->token = config('services.tmdb.token');
        $this->imageBase = config('services.tmdb.image_base_url', 'https://image.tmdb.org/t/p/w500');
    }

    /**
     * Check if TMDB API credentials are set.
     */
    public function isConfigured(): bool
    {
        return ! empty($this->token) || ! empty($this->apiKey);
    }

    /**
     * Platform & Network mappings.
     */
    public function getPlatformsConfig(): array
    {
        return [
            'netflix' => [
                'name' => 'Netflix',
                'logo' => asset('icons/svg/netflix.svg'),
                'network_id' => 213,
                'provider_id' => 8,
            ],
            'disney' => [
                'name' => 'Disney+',
                'logo' => asset('icons/svg/disney.svg'),
                'network_id' => 2739,
                'provider_id' => 337,
            ],
            'prime' => [
                'name' => 'Prime Video',
                'logo' => asset('icons/svg/primevideo.svg'),
                'network_id' => 1024,
                'provider_id' => 119,
            ],
            'hbo' => [
                'name' => 'HBO / Max',
                'logo' => asset('icons/svg/hbomax.svg'),
                'network_id' => 49,
                'provider_id' => 384,
            ],
            'apple' => [
                'name' => 'Apple TV+',
                'logo' => asset('icons/svg/appletv.svg'),
                'network_id' => 2552,
                'provider_id' => 350,
            ],
            'paramount' => [
                'name' => 'Paramount+',
                'logo' => asset('icons/paramountplus.png'),
                'network_id' => 4330,
                'provider_id' => 531,
            ],
            'amc' => [
                'name' => 'AMC',
                'logo' => null,
                'network_id' => 174,
            ],
            'fx' => [
                'name' => 'FX',
                'logo' => null,
                'network_id' => 88,
            ],
            'bbc' => [
                'name' => 'BBC',
                'logo' => null,
                'network_id' => 4,
            ],
            'nbc' => [
                'name' => 'NBC',
                'logo' => null,
                'network_id' => 6,
            ],
            'cbs' => [
                'name' => 'CBS',
                'logo' => null,
                'network_id' => 16,
            ],
            'abc' => [
                'name' => 'ABC',
                'logo' => null,
                'network_id' => 2,
            ],
            'fox' => [
                'name' => 'FOX',
                'logo' => null,
                'network_id' => 19,
            ],
            'hulu' => [
                'name' => 'Hulu',
                'logo' => null,
                'network_id' => 453,
            ],
            'peacock' => [
                'name' => 'Peacock',
                'logo' => null,
                'network_id' => 3353,
            ],
            'cw' => [
                'name' => 'The CW',
                'logo' => null,
                'network_id' => 71,
            ],
            'showtime' => [
                'name' => 'Showtime',
                'logo' => null,
                'network_id' => 67,
            ],
            'starz' => [
                'name' => 'Starz',
                'logo' => null,
                'network_id' => 318,
            ],
            'cinema' => [
                'name' => 'Sinema Vizyon',
                'logo' => null,
            ],
            'tv_channel' => [
                'name' => 'TV Yayınları',
                'logo' => null,
            ],
        ];
    }

    /**
     * Resolve language content with Turkish primary and English fallback.
     * Returns null if neither Turkish nor English title/overview is available or readable.
     */
    public function resolveLanguageContent(array $itemTr, ?array $itemEn = null, bool $isTv = false): ?array
    {
        $isCjk = function (?string $str) {
            if (empty($str)) {
                return false;
            }

            return (bool) preg_match('/[\x{4e00}-\x{9fa5}\x{3040}-\x{30ff}\x{31f0}-\x{31ff}\x{ac00}-\x{d7af}]/u', $str);
        };

        $rawTitleTr = trim($isTv ? ($itemTr['name'] ?? '') : ($itemTr['title'] ?? ''));
        $overviewTr = trim($itemTr['overview'] ?? '');
        $originalTitle = trim($isTv ? ($itemTr['original_name'] ?? '') : ($itemTr['original_title'] ?? ''));

        $hasTrTitle = ! empty($rawTitleTr) && ! $isCjk($rawTitleTr);
        $hasTrOverview = ! empty($overviewTr);

        // If Turkish title is present and not untranslated CJK
        if ($hasTrTitle) {
            $titleEn = $itemEn ? trim($isTv ? ($itemEn['name'] ?? '') : ($itemEn['title'] ?? '')) : null;
            $overviewEn = $itemEn ? trim($itemEn['overview'] ?? '') : null;

            return [
                'title' => $rawTitleTr,
                'title_tr' => $rawTitleTr,
                'title_en' => (! empty($titleEn) && ! $isCjk($titleEn)) ? $titleEn : null,
                'original_title' => $originalTitle ?: $rawTitleTr,
                'overview' => $hasTrOverview ? $overviewTr : (! empty($overviewEn) ? $overviewEn : null),
                'language_used' => 'tr',
            ];
        }

        // If Turkish title is empty or CJK, check English fallback
        if ($itemEn) {
            $titleEn = trim($isTv ? ($itemEn['name'] ?? '') : ($itemEn['title'] ?? ''));
            $overviewEn = trim($itemEn['overview'] ?? '');
            $hasEnTitle = ! empty($titleEn) && ! $isCjk($titleEn);

            if ($hasEnTitle) {
                return [
                    'title' => $titleEn,
                    'title_tr' => null,
                    'title_en' => $titleEn,
                    'original_title' => $originalTitle ?: $titleEn,
                    'overview' => ! empty($overviewEn) ? $overviewEn : (! empty($overviewTr) ? $overviewTr : null),
                    'language_used' => 'en',
                ];
            }
        }

        // If neither TR nor EN title is valid/available -> return null (skip item)
        return null;
    }

    /**
     * Fetch API helper
     */
    protected function fetchTmdb(string $endpoint, array $params = []): ?array
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $request = Http::baseUrl($this->baseUrl)->timeout(12)->acceptJson();
        if (! empty($this->token)) {
            $request = $request->withToken($this->token);
        } else {
            $params['api_key'] = $this->apiKey;
        }

        $res = $request->get($endpoint, $params);
        if ($res->successful()) {
            return $res->json();
        }

        return null;
    }

    /**
     * Synchronize all releases (Movies & TV Episodes) for the date window.
     */
    public function syncAllReleases(int $monthsBack = 3, int $monthsAhead = 6): array
    {
        $startDate = Carbon::now()->subMonths($monthsBack)->startOfDay()->format('Y-m-d');
        $endDate = Carbon::now()->addMonths($monthsAhead)->endOfDay()->format('Y-m-d');

        $movieCount = $this->syncMovies($startDate, $endDate);
        $tvCount = $this->syncTvSeriesAndEpisodes($startDate, $endDate);

        $this->clearCache();

        return [
            'movies_synced' => $movieCount,
            'tv_episodes_synced' => $tvCount,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ];
    }

    /**
     * Fetch & Sync Movies released between startDate and endDate.
     */
    public function syncMovies(string $startDate, string $endDate): int
    {
        $count = 0;
        $seenIds = [];
        $localTitles = TmdbTitle::where('media_type', 'movie')->get()->keyBy('tmdb_id');

        // Fetch theatrical and digital discover movie pages (up to 5 pages)
        for ($page = 1; $page <= 5; $page++) {
            $resTr = $this->fetchTmdb('/discover/movie', [
                'language' => 'tr-TR',
                'primary_release_date.gte' => $startDate,
                'primary_release_date.lte' => $endDate,
                'sort_by' => 'popularity.desc',
                'page' => $page,
            ]);

            if (empty($resTr['results'])) {
                break;
            }

            // Fetch English fallback for the page
            $resEn = $this->fetchTmdb('/discover/movie', [
                'language' => 'en-US',
                'primary_release_date.gte' => $startDate,
                'primary_release_date.lte' => $endDate,
                'sort_by' => 'popularity.desc',
                'page' => $page,
            ]);

            $enMap = collect($resEn['results'] ?? [])->keyBy('id');

            foreach ($resTr['results'] as $itemTr) {
                $tmdbId = (int) ($itemTr['id'] ?? 0);
                if (! $tmdbId || isset($seenIds[$tmdbId])) {
                    continue;
                }
                $seenIds[$tmdbId] = true;

                $releaseDate = $itemTr['release_date'] ?? null;
                if (! $releaseDate || $releaseDate < $startDate || $releaseDate > $endDate) {
                    continue;
                }

                $itemEn = $enMap->get($tmdbId);
                $langContent = $this->resolveLanguageContent($itemTr, $itemEn, false);

                // Skip if neither TR nor EN title/overview is available
                if (! $langContent) {
                    continue;
                }

                $poster = $itemTr['poster_path'] ?? ($itemEn['poster_path'] ?? null);
                $backdrop = $itemTr['backdrop_path'] ?? ($itemEn['backdrop_path'] ?? null);

                // Check local site availability
                $matchedLocal = $localTitles->get($tmdbId);
                $isAvailable = $matchedLocal ? $matchedLocal->mediaFiles()->exists() : false;
                $detailUrl = ($isAvailable && $matchedLocal)
                    ? route('movie.detail', ['id' => $matchedLocal->slug ?: $matchedLocal->id])
                    : null;

                $itemKey = "movie_{$tmdbId}";

                ReleaseCalendarItem::updateOrCreate(
                    ['item_key' => $itemKey],
                    [
                        'tmdb_id' => $tmdbId,
                        'media_type' => 'movie',
                        'title' => $langContent['title'],
                        'title_tr' => $langContent['title_tr'],
                        'title_en' => $langContent['title_en'],
                        'original_title' => $langContent['original_title'],
                        'overview' => $langContent['overview'],
                        'release_date' => $releaseDate,
                        'season_number' => null,
                        'episode_number' => null,
                        'episode_name' => null,
                        'poster_url' => $poster ? rtrim($this->imageBase, '/').'/'.ltrim($poster, '/') : null,
                        'backdrop_url' => $backdrop ? 'https://image.tmdb.org/t/p/w1280/'.ltrim($backdrop, '/') : null,
                        'vote_average' => round((float) ($itemTr['vote_average'] ?? 0), 1),
                        'popularity' => (float) ($itemTr['popularity'] ?? 0),
                        'platform' => 'cinema',
                        'platform_name' => 'Sinema Vizyon',
                        'platform_logo' => null,
                        'language_used' => $langContent['language_used'],
                        'is_available' => $isAvailable,
                        'detail_url' => $detailUrl,
                    ]
                );

                $count++;
            }
        }

        return $count;
    }

    /**
     * Fetch & Sync TV Series and their Episodes.
     */
    public function syncTvSeriesAndEpisodes(string $startDate, string $endDate): int
    {
        $totalEpisodeCount = 0;
        $seenSeriesIds = [];
        $platformsConfig = $this->getPlatformsConfig();

        // 1. Discover TR origin TV series airing in date range
        for ($page = 1; $page <= 3; $page++) {
            $trTvRes = $this->fetchTmdb('/discover/tv', [
                'language' => 'tr-TR',
                'with_origin_country' => 'TR',
                'air_date.gte' => $startDate,
                'air_date.lte' => $endDate,
                'sort_by' => 'popularity.desc',
                'page' => $page,
            ]);

            if (empty($trTvRes['results'])) {
                break;
            }

            foreach ($trTvRes['results'] as $show) {
                $showId = (int) $show['id'];
                if (isset($seenSeriesIds[$showId])) {
                    continue;
                }
                $seenSeriesIds[$showId] = true;

                $epsSynced = $this->syncSingleTvSeriesEpisodes($showId, $startDate, $endDate, 'tv_channel', 'TV Yayınları (TR)');
                $totalEpisodeCount += $epsSynced;
            }
        }

        // 2. Discover TV series for major networks & digital platforms
        foreach ($platformsConfig as $platformKey => $cfg) {
            if (empty($cfg['network_id'])) {
                continue;
            }

            for ($page = 1; $page <= 3; $page++) {
                $netTvRes = $this->fetchTmdb('/discover/tv', [
                    'language' => 'tr-TR',
                    'with_networks' => $cfg['network_id'],
                    'air_date.gte' => $startDate,
                    'air_date.lte' => $endDate,
                    'sort_by' => 'popularity.desc',
                    'page' => $page,
                ]);

                if (empty($netTvRes['results'])) {
                    break;
                }

                foreach ($netTvRes['results'] as $show) {
                    $showId = (int) $show['id'];
                    if (isset($seenSeriesIds[$showId])) {
                        continue;
                    }
                    $seenSeriesIds[$showId] = true;

                    $epsSynced = $this->syncSingleTvSeriesEpisodes($showId, $startDate, $endDate, $platformKey, $cfg['name'], $cfg['logo']);
                    $totalEpisodeCount += $epsSynced;
                }
            }
        }

        // 3. Discover top popular global TV series overall in date range
        for ($page = 1; $page <= 10; $page++) {
            $popTvRes = $this->fetchTmdb('/discover/tv', [
                'language' => 'tr-TR',
                'air_date.gte' => $startDate,
                'air_date.lte' => $endDate,
                'sort_by' => 'popularity.desc',
                'page' => $page,
            ]);

            if (empty($popTvRes['results'])) {
                break;
            }

            foreach ($popTvRes['results'] as $show) {
                $showId = (int) $show['id'];
                if (isset($seenSeriesIds[$showId])) {
                    continue;
                }
                $seenSeriesIds[$showId] = true;

                $epsSynced = $this->syncSingleTvSeriesEpisodes($showId, $startDate, $endDate);
                $totalEpisodeCount += $epsSynced;
            }
        }

        return $totalEpisodeCount;
    }

    /**
     * Fetch & Sync all episodes of a single TV Series that air within the date window.
     */
    public function syncSingleTvSeriesEpisodes(
        int $tvId,
        string $startDate,
        string $endDate,
        ?string $forcedPlatform = null,
        ?string $forcedPlatformName = null,
        ?string $forcedPlatformLogo = null
    ): int {
        // Fetch show detail in TR and EN
        $showTr = $this->fetchTmdb("/tv/{$tvId}", ['language' => 'tr-TR']);
        if (! $showTr) {
            return 0;
        }

        $showEn = $this->fetchTmdb("/tv/{$tvId}", ['language' => 'en-US']);
        $langContent = $this->resolveLanguageContent($showTr, $showEn, true);

        // Skip show if neither TR nor EN title is available
        if (! $langContent) {
            return 0;
        }

        $showTitle = $langContent['title'];
        $showTitleTr = $langContent['title_tr'];
        $showTitleEn = $langContent['title_en'];
        $showOriginalTitle = $langContent['original_title'];
        $showOverview = $langContent['overview'];

        $showPoster = $showTr['poster_path'] ?? ($showEn['poster_path'] ?? null);
        $showBackdrop = $showTr['backdrop_path'] ?? ($showEn['backdrop_path'] ?? null);

        // Resolve platform / network if not forced
        $platformKey = $forcedPlatform ?: 'tv_channel';
        $platformName = $forcedPlatformName ?: 'TV Yayınları';
        $platformLogo = $forcedPlatformLogo ?: null;

        if (! $forcedPlatform && ! empty($showTr['networks'][0])) {
            $network = $showTr['networks'][0];
            $networkId = (int) $network['id'];
            $platformsConfig = $this->getPlatformsConfig();

            foreach ($platformsConfig as $pKey => $pCfg) {
                if (($pCfg['network_id'] ?? null) === $networkId) {
                    $platformKey = $pKey;
                    $platformName = $pCfg['name'];
                    $platformLogo = $pCfg['logo'];
                    break;
                }
            }

            if ($platformKey === 'tv_channel' && ! empty($network['name'])) {
                $platformName = $network['name'];
            }
        }

        // Check local title match
        $matchedLocal = TmdbTitle::where('media_type', 'tv')->where('tmdb_id', $tvId)->first();
        $isAvailable = $matchedLocal ? $matchedLocal->mediaFiles()->exists() : false;
        $detailUrl = ($isAvailable && $matchedLocal)
            ? route('series.detail', ['id' => $matchedLocal->slug ?: $matchedLocal->id])
            : null;

        $seasons = $showTr['seasons'] ?? [];
        $syncedCount = 0;
        $maxSeasonNum = collect($seasons)->where('season_number', '>', 0)->max('season_number') ?? 1;
        $cutoffDate = Carbon::parse($startDate)->subMonths(6)->format('Y-m-d');

        foreach ($seasons as $season) {
            $seasonNumber = (int) ($season['season_number'] ?? -1);
            if ($seasonNumber < 1) {
                continue; // Skip specials (Season 0)
            }

            // Skip old historical seasons that ended long before our date window
            if ($seasonNumber < ($maxSeasonNum - 2)) {
                $sAirDate = $season['air_date'] ?? null;
                if ($sAirDate && $sAirDate < $cutoffDate) {
                    continue;
                }
            }

            // Fetch season episodes in TR and EN
            $seasonTr = $this->fetchTmdb("/tv/{$tvId}/season/{$seasonNumber}", ['language' => 'tr-TR']);
            if (empty($seasonTr['episodes'])) {
                continue;
            }

            $seasonEn = $this->fetchTmdb("/tv/{$tvId}/season/{$seasonNumber}", ['language' => 'en-US']);
            $enEpsMap = collect($seasonEn['episodes'] ?? [])->keyBy('episode_number');

            foreach ($seasonTr['episodes'] as $epTr) {
                $airDate = $epTr['air_date'] ?? null;
                if (! $airDate || $airDate < $startDate || $airDate > $endDate) {
                    continue;
                }

                $epNumber = (int) ($epTr['episode_number'] ?? 0);
                $epEn = $enEpsMap->get($epNumber);

                // Episode title & overview TR / EN resolution
                $epLangContent = $this->resolveLanguageContent($epTr, $epEn, false);

                $episodeName = $epLangContent ? $epLangContent['title'] : "{$seasonNumber}. Sezon {$epNumber}. Bölüm";
                $episodeOverview = $epLangContent ? $epLangContent['overview'] : $showOverview;

                $epStill = $epTr['still_path'] ?? ($epEn['still_path'] ?? null);
                $epPosterUrl = $epStill
                    ? 'https://image.tmdb.org/t/p/w500/'.ltrim($epStill, '/')
                    : ($showPoster ? rtrim($this->imageBase, '/').'/'.ltrim($showPoster, '/') : null);

                $epBackdropUrl = $showBackdrop
                    ? 'https://image.tmdb.org/t/p/w1280/'.ltrim($showBackdrop, '/')
                    : null;

                $itemKey = "tv_{$tvId}_s{$seasonNumber}_e{$epNumber}";

                ReleaseCalendarItem::updateOrCreate(
                    ['item_key' => $itemKey],
                    [
                        'tmdb_id' => $tvId,
                        'media_type' => 'tv',
                        'title' => $showTitle,
                        'title_tr' => $showTitleTr,
                        'title_en' => $showTitleEn,
                        'original_title' => $showOriginalTitle,
                        'overview' => $episodeOverview ?: $showOverview,
                        'release_date' => $airDate,
                        'season_number' => $seasonNumber,
                        'episode_number' => $epNumber,
                        'episode_name' => $episodeName,
                        'poster_url' => $epPosterUrl,
                        'backdrop_url' => $epBackdropUrl,
                        'vote_average' => round((float) ($epTr['vote_average'] ?? $showTr['vote_average'] ?? 0), 1),
                        'popularity' => (float) ($showTr['popularity'] ?? 0),
                        'platform' => $platformKey,
                        'platform_name' => $platformName,
                        'platform_logo' => $platformLogo,
                        'language_used' => $langContent['language_used'],
                        'is_available' => $isAvailable,
                        'detail_url' => $detailUrl,
                    ]
                );

                $syncedCount++;
            }
        }

        return $syncedCount;
    }

    /**
     * Clear cached release calendar output by incrementing version ID.
     */
    public function clearCache(): void
    {
        if (Cache::has('release_cal_version_id')) {
            Cache::increment('release_cal_version_id');
        } else {
            Cache::forever('release_cal_version_id', 2);
        }
    }

    /**
     * Get current cache version ID.
     */
    protected function getCacheVersion(): int
    {
        return (int) Cache::rememberForever('release_cal_version_id', fn () => 1);
    }

    /**
     * Retrieve formatted release calendar data for frontend (/releases).
     * Uses smart versioned per-filter caching for instant response time.
     */
    public function getCalendarData(
        string $type = 'all',
        string $platform = 'all',
        string $availability = 'all',
        string $month = 'all'
    ): array {
        $fetcher = function () use ($type, $platform, $availability, $month) {
            $turkishMonths = [
                1 => 'Ocak', 2 => 'Şubat', 3 => 'Mart', 4 => 'Nisan',
                5 => 'Mayıs', 6 => 'Haziran', 7 => 'Temmuz', 8 => 'Ağustos',
                9 => 'Eylül', 10 => 'Ekim', 11 => 'Kasım', 12 => 'Aralık',
            ];

            $turkishDays = [
                'Monday' => 'Pazartesi', 'Tuesday' => 'Salı', 'Wednesday' => 'Çarşamba',
                'Thursday' => 'Perşembe', 'Friday' => 'Cuma', 'Saturday' => 'Cumartesi', 'Sunday' => 'Pazar',
            ];

            $query = ReleaseCalendarItem::where('release_date', '>=', now()->subMonths(3)->startOfDay()->format('Y-m-d'))
                ->where('release_date', '<=', now()->addMonths(6)->endOfDay()->format('Y-m-d'));

            // 1. Type Filter
            if (in_array($type, ['movie', 'tv'])) {
                $query->where('media_type', $type);
            }

            // 2. Availability Filter
            if ($availability === 'available') {
                $query->where('is_available', true);
            } elseif ($availability === 'upcoming') {
                $query->where('is_available', false);
            }

            // 3. Platform Filter
            // Popular digital OTT platforms requested by user
            $digitalPlatforms = ['netflix', 'disney', 'prime', 'hbo', 'apple', 'paramount'];

            if ($platform === 'cinema') {
                $query->where('platform', 'cinema');
            } elseif (in_array($platform, $digitalPlatforms)) {
                $query->where('platform', $platform);
            } elseif ($platform === 'tv_channel') {
                // TV Yayınları: All traditional TV channels (not cinema and not the 6 digital platforms)
                $query->whereNotIn('platform', array_merge(['cinema'], $digitalPlatforms));
            }

            // 4. Month Filter
            if ($month !== 'all' && ! empty($month)) {
                if (preg_match('/^\d{4}-\d{2}$/', $month)) {
                    $query->where('release_date', 'like', "{$month}%");
                } else {
                    foreach ($turkishMonths as $mNum => $mName) {
                        if (str_contains($month, $mName)) {
                            $mStr = str_pad((string) $mNum, 2, '0', STR_PAD_LEFT);
                            $yStr = preg_replace('/[^0-9]/', '', $month);
                            if ($yStr) {
                                $query->where('release_date', 'like', "{$yStr}-{$mStr}%");
                            }
                            break;
                        }
                    }
                }
            }

            $items = $query->orderBy('release_date', 'asc')->get();

            $formattedItems = [];
            $monthsMap = [];
            $featured = null;
            $todayStr = now()->format('Y-m-d');

            foreach ($items as $item) {
                $cDate = Carbon::parse($item->release_date);
                $mNum = (int) $cDate->format('m');
                $mYear = ($turkishMonths[$mNum] ?? $cDate->format('F')).' '.$cDate->format('Y');

                $formattedItem = [
                    'id' => $item->id,
                    'tmdb_id' => $item->tmdb_id,
                    'item_key' => $item->item_key,
                    'title' => $item->title,
                    'original_title' => $item->original_title,
                    'media_type' => $item->media_type,
                    'season_number' => $item->season_number,
                    'episode_number' => $item->episode_number,
                    'episode_name' => $item->episode_name,
                    'release_date' => $cDate->format('Y-m-d'),
                    'year' => $cDate->format('Y'),
                    'month_num' => $mNum,
                    'month_name' => $turkishMonths[$mNum] ?? $cDate->format('F'),
                    'month_year' => $mYear,
                    'day' => $cDate->format('d'),
                    'day_name' => $turkishDays[$cDate->format('l')] ?? $cDate->format('l'),
                    'poster' => $item->poster_url ?: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
                    'backdrop' => $item->backdrop_url,
                    'overview' => $item->overview ?: 'Açıklama bulunmuyor.',
                    'vote_average' => (float) $item->vote_average,
                    'platform' => $item->platform,
                    'platform_name' => $item->platform_name,
                    'platform_logo' => $item->platform_logo,
                    'is_available' => (bool) $item->is_available,
                    'detail_url' => $item->detail_url,
                ];

                $formattedItems[] = $formattedItem;

                if (! isset($monthsMap[$mYear])) {
                    $monthsMap[$mYear] = [
                        'name' => $mYear,
                        'month_num' => $mNum,
                        'year' => $cDate->format('Y'),
                        'releases' => [],
                    ];
                }

                $monthsMap[$mYear]['releases'][] = $formattedItem;

                // Select featured upcoming item
                if (! $featured && $item->release_date >= $todayStr && ! empty($item->backdrop_url)) {
                    $featured = $formattedItem;
                }
            }

            // Fallback featured if none found in future
            if (! $featured && count($formattedItems) > 0) {
                $featured = $formattedItems[0];
            }

            // Get list of available months in window for frontend dropdown
            $allMonthDates = ReleaseCalendarItem::where('release_date', '>=', now()->subMonths(3)->startOfDay()->format('Y-m-d'))
                ->where('release_date', '<=', now()->addMonths(6)->endOfDay()->format('Y-m-d'))
                ->pluck('release_date')
                ->map(fn ($d) => Carbon::parse($d)->format('Y-m'))
                ->unique()
                ->sort()
                ->values();

            $availableMonths = [
                ['id' => 'all', 'label' => 'Tüm Aylar', 'value' => 'all'],
            ];

            foreach ($allMonthDates as $ym) {
                [$y, $m] = explode('-', $ym);
                $mNum = (int) $m;
                $name = ($turkishMonths[$mNum] ?? 'Ay')." {$y}";
                $availableMonths[] = [
                    'id' => $ym,
                    'label' => $name,
                    'value' => $ym,
                ];
            }

            return [
                'months' => array_values($monthsMap),
                'featured' => $featured,
                'totalCount' => count($formattedItems),
                'availableMonths' => $availableMonths,
            ];
        };

        $isDefaultView = ($type === 'all' && $platform === 'all' && $availability === 'all' && $month === 'all');

        if ($isDefaultView) {
            return $fetcher();
        }

        $version = $this->getCacheVersion();
        $filterHash = md5("{$type}_{$platform}_{$availability}_{$month}");
        $cacheKey = "release_cal_v{$version}_{$filterHash}";

        return Cache::remember($cacheKey, now()->addHours(6), $fetcher);
    }
}
