<?php

namespace App\Services;

use App\Models\MediaFile;
use App\Models\TmdbCast;
use App\Models\TmdbEpisode;
use App\Models\TmdbSeason;
use App\Models\TmdbTitle;
use App\Models\TmdbVideo;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class TmdbService
{
    protected string $baseUrl;

    protected ?string $apiKey;

    protected ?string $token;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.tmdb.base_url', 'https://api.themoviedb.org/3'), '/');
        $this->apiKey = config('services.tmdb.api_key');
        $this->token = config('services.tmdb.token');
    }

    /**
     * Check whether TMDB credentials are configured.
     */
    public function isConfigured(): bool
    {
        return ! empty($this->token) || ! empty($this->apiKey);
    }

    /**
     * Create an HTTP client configured with TMDB headers and credentials.
     */
    protected function client(): PendingRequest
    {
        $request = Http::baseUrl($this->baseUrl)
            ->timeout(12)
            ->acceptJson();

        if (! empty($this->token)) {
            $request = $request->withToken($this->token);
        }

        return $request;
    }

    /**
     * Merge authentication parameters with request query params.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    protected function prepareParams(array $params = []): array
    {
        $defaults = [];

        // If no Bearer token, fallback to query api_key parameter
        if (empty($this->token) && ! empty($this->apiKey)) {
            $defaults['api_key'] = $this->apiKey;
        }

        return array_merge($defaults, $params);
    }

    /**
     * Search TMDB by flexible criteria: query, year, mediaType, or IMDB/TMDB ID.
     *
     * @return list<array{
     *     id: int,
     *     media_type: string,
     *     title: string,
     *     title_tr: ?string,
     *     title_en: ?string,
     *     title_original: ?string,
     *     original_title: ?string,
     *     release_date: ?string,
     *     release_year: ?int,
     *     vote_average: float,
     *     vote_count: int,
     *     poster_path: ?string,
     *     backdrop_path: ?string,
     *     overview: ?string,
     *     poster_url: ?string
     * }>
     */
    public function search(string $query, ?int $year = null, ?string $type = null): array
    {
        if (! $this->isConfigured()) {
            return [];
        }

        $query = trim($query);

        if (empty($query)) {
            return [];
        }

        // 1. Direct IMDB ID pattern: tt1234567
        if (preg_match('/^tt\d+$/i', $query)) {
            return $this->searchByImdbId($query);
        }

        // 2. Direct TMDB ID pattern: numeric query without year
        if (ctype_digit($query) && $year === null && (int) $query > 0) {
            $directItem = $this->getDetails((int) $query, $type ?: 'movie');
            if ($directItem) {
                return [$directItem];
            }
        }

        // 3. Categorized Search: movie vs tv
        if ($type === 'movie') {
            $params = ['query' => $query, 'include_adult' => 'false'];
            if ($year) {
                $params['year'] = $year;
            }

            $response = $this->client()->get('/search/movie', $this->prepareParams($params));

            return $this->formatSearchResults($response->json('results') ?: [], 'movie');
        }

        if ($type === 'tv' || $type === 'series') {
            $params = ['query' => $query, 'include_adult' => 'false'];
            if ($year) {
                $params['first_air_date_year'] = $year;
            }

            $response = $this->client()->get('/search/tv', $this->prepareParams($params));

            return $this->formatSearchResults($response->json('results') ?: [], 'tv');
        }

        // 4. Multi-search (searches both movies and TV)
        $params = ['query' => $query, 'include_adult' => 'false'];
        $response = $this->client()->get('/search/multi', $this->prepareParams($params));
        $raw = $response->json('results') ?: [];

        // Filter out people, keep only movie and tv
        $filtered = array_filter($raw, fn ($item) => in_array($item['media_type'] ?? '', ['movie', 'tv']));

        return $this->formatSearchResults(array_values($filtered));
    }

    /**
     * Search by IMDB ID via TMDB find endpoint.
     */
    public function searchByImdbId(string $imdbId): array
    {
        $response = $this->client()->get("/find/{$imdbId}", $this->prepareParams([
            'external_source' => 'imdb_id',
        ]));

        if (! $response->successful()) {
            return [];
        }

        $data = $response->json();
        $results = [];

        foreach ($data['movie_results'] ?? [] as $m) {
            $m['media_type'] = 'movie';
            $results[] = $m;
        }

        foreach ($data['tv_results'] ?? [] as $t) {
            $t['media_type'] = 'tv';
            $results[] = $t;
        }

        return $this->formatSearchResults($results);
    }

    /**
     * Retrieve full details of a movie or TV show, extracting Turkish, English, and Original titles.
     *
     * @return array{
     *     id: int,
     *     media_type: string,
     *     title: string,
     *     title_tr: ?string,
     *     title_en: ?string,
     *     title_original: ?string,
     *     original_title: ?string,
     *     original_language: ?string,
     *     release_date: ?string,
     *     release_year: ?int,
     *     vote_average: float,
     *     vote_count: int,
     *     popularity: float,
     *     poster_path: ?string,
     *     backdrop_path: ?string,
     *     overview: ?string,
     *     overview_tr: ?string,
     *     overview_en: ?string,
     *     genres: list<string>,
     *     imdb_id: ?string,
     *     extra_data: array<string, mixed>,
     *     poster_url: ?string,
     *     backdrop_url: ?string
     * }|null
     */
    public function getDetails(int $tmdbId, string $mediaType = 'movie'): ?array
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $append = $mediaType === 'tv'
            ? 'translations,credits,external_ids,videos,content_ratings'
            : 'translations,credits,external_ids,videos,release_dates';

        $endpoint = $mediaType === 'tv' ? "/tv/{$tmdbId}" : "/movie/{$tmdbId}";
        $response = $this->client()->get($endpoint, $this->prepareParams([
            'append_to_response' => $append,
            'include_video_language' => 'tr,en,null',
        ]));

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();

        // 1. Root and original titles
        $rootTitle = $data['title'] ?? $data['name'] ?? null;
        $titleOriginal = $data['original_title'] ?? $data['original_name'] ?? $rootTitle;
        $origLang = $data['original_language'] ?? 'en';

        // 2. Multilingual extraction
        $titleTr = null;
        $titleEn = null;
        $overviewTr = null;
        $overviewEn = null;

        foreach ($data['translations']['translations'] ?? [] as $trans) {
            $iso = $trans['iso_639_1'] ?? '';
            $tData = $trans['data'] ?? [];

            $tName = ! empty($tData['title']) ? trim($tData['title']) : (! empty($tData['name']) ? trim($tData['name']) : null);
            $tOverview = ! empty($tData['overview']) ? trim($tData['overview']) : null;

            if ($iso === 'tr') {
                if ($tName && ! $titleTr) {
                    $titleTr = $tName;
                }
                if ($tOverview && ! $overviewTr) {
                    $overviewTr = $tOverview;
                }
            } elseif ($iso === 'en') {
                if ($tName && ! $titleEn) {
                    $titleEn = $tName;
                }
                if ($tOverview && ! $overviewEn) {
                    $overviewEn = $tOverview;
                }
            }
        }

        // 3. Fallbacks
        if (! $titleEn) {
            $titleEn = $origLang === 'en' ? $titleOriginal : ($rootTitle ?: $titleOriginal);
        }

        if (! $titleTr) {
            $titleTr = $origLang === 'tr' ? $titleOriginal : ($titleEn ?: $titleOriginal);
        }

        if (! $titleOriginal) {
            $titleOriginal = $titleEn ?: ($titleTr ?: 'Bilinmeyen Başlık');
        }

        $rootOverview = $data['overview'] ?? null;
        if (! $overviewTr && $origLang === 'tr') {
            $overviewTr = $rootOverview;
        }
        if (! $overviewEn && $origLang === 'en') {
            $overviewEn = $rootOverview;
        }

        $dateStr = $data['release_date'] ?? $data['first_air_date'] ?? null;
        $year = $dateStr ? (int) substr($dateStr, 0, 4) : null;

        $genres = array_map(fn ($g) => $g['name'], $data['genres'] ?? []);
        $imdbId = $data['external_ids']['imdb_id'] ?? $data['imdb_id'] ?? null;

        $certification = null;
        if ($mediaType === 'tv') {
            $ratings = $data['content_ratings']['results'] ?? [];
            $us = collect($ratings)->firstWhere('iso_3166_1', 'US');
            $tr = collect($ratings)->firstWhere('iso_3166_1', 'TR');
            $certification = $us['rating'] ?? ($tr['rating'] ?? collect($ratings)->pluck('rating')->filter()->first());
        } else {
            $results = $data['release_dates']['results'] ?? [];
            $us = collect($results)->firstWhere('iso_3166_1', 'US');
            $tr = collect($results)->firstWhere('iso_3166_1', 'TR');
            $usCert = $us ? collect($us['release_dates'] ?? [])->pluck('certification')->filter()->first() : null;
            $trCert = $tr ? collect($tr['release_dates'] ?? [])->pluck('certification')->filter()->first() : null;
            $certification = $usCert ?: ($trCert ?: collect($results)->flatMap(fn ($r) => collect($r['release_dates'] ?? [])->pluck('certification'))->filter()->first());
        }

        $imageBase = config('services.tmdb.image_base_url', 'https://image.tmdb.org/t/p/w500');

        return [
            'id' => (int) $data['id'],
            'media_type' => $mediaType,
            'title' => $titleTr ?: ($titleEn ?: $titleOriginal),
            'title_tr' => $titleTr,
            'title_en' => $titleEn,
            'title_original' => $titleOriginal,
            'original_title' => $titleOriginal,
            'original_language' => $origLang,
            'release_date' => $dateStr,
            'release_year' => $year,
            'vote_average' => round((float) ($data['vote_average'] ?? 0), 1),
            'vote_count' => (int) ($data['vote_count'] ?? 0),
            'popularity' => round((float) ($data['popularity'] ?? 0), 2),
            'poster_path' => $data['poster_path'] ?? null,
            'backdrop_path' => $data['backdrop_path'] ?? null,
            'overview' => $overviewTr ?: ($overviewEn ?: $rootOverview),
            'overview_tr' => $overviewTr,
            'overview_en' => $overviewEn,
            'genres' => $genres,
            'imdb_id' => $imdbId,
            'extra_data' => [
                'tagline' => $data['tagline'] ?? null,
                'runtime' => $data['runtime'] ?? ($data['episode_run_time'][0] ?? null),
                'status' => $data['status'] ?? null,
                'certification' => $certification,
            ],
            'poster_url' => ! empty($data['poster_path']) ? rtrim($imageBase, '/').'/'.ltrim($data['poster_path'], '/') : null,
            'backdrop_url' => ! empty($data['backdrop_path']) ? 'https://image.tmdb.org/t/p/w1280/'.ltrim($data['backdrop_path'], '/') : null,
            'credits' => $data['credits'] ?? [],
            'videos' => $data['videos']['results'] ?? [],
            'seasons' => $data['seasons'] ?? [],
        ];
    }

    /**
     * Fetch certification/age rating for a given TMDB title.
     */
    public function getCertification(int $tmdbId, string $mediaType = 'movie'): ?string
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $endpoint = $mediaType === 'tv' ? "/tv/{$tmdbId}/content_ratings" : "/movie/{$tmdbId}/release_dates";
        $response = $this->client()->get($endpoint, $this->prepareParams());
        if (! $response->successful()) {
            return null;
        }

        $results = $response->json('results') ?? [];

        if ($mediaType === 'tv') {
            $us = collect($results)->firstWhere('iso_3166_1', 'US');
            $tr = collect($results)->firstWhere('iso_3166_1', 'TR');

            return $us['rating'] ?? ($tr['rating'] ?? collect($results)->pluck('rating')->filter()->first());
        }

        $us = collect($results)->firstWhere('iso_3166_1', 'US');
        $tr = collect($results)->firstWhere('iso_3166_1', 'TR');
        $usCert = $us ? collect($us['release_dates'] ?? [])->pluck('certification')->filter()->first() : null;
        $trCert = $tr ? collect($tr['release_dates'] ?? [])->pluck('certification')->filter()->first() : null;

        return $usCert ?: ($trCert ?: collect($results)->flatMap(fn ($r) => collect($r['release_dates'] ?? [])->pluck('certification'))->filter()->first());
    }

    /**
     * Fetch videos for a movie or TV show directly from TMDB.
     *
     * @return list<array<string, mixed>>
     */
    public function fetchVideos(int $tmdbId, string $mediaType = 'movie'): array
    {
        if (! $this->isConfigured()) {
            return [];
        }

        $endpoint = $mediaType === 'tv' ? "/tv/{$tmdbId}/videos" : "/movie/{$tmdbId}/videos";
        $response = $this->client()->get($endpoint, $this->prepareParams([
            'include_video_language' => 'tr,en,null',
        ]));

        if (! $response->successful()) {
            return [];
        }

        return $response->json('results') ?? [];
    }

    /**
     * Prioritize and filter videos:
     * 1. Multi-trailer architecture with ranked sorting.
     * 2. Checks if Turkish options exist; prioritizes Turkish if present, falls back to English/Original.
     * 3. Among Turkish options, prioritizes dubbed ('dublaj', 'dublajlı') first, then subtitled ('altyazı', 'altyazılı').
     *
     * @param  list<array<string, mixed>>  $rawVideos
     * @return list<array<string, mixed>>
     */
    public function prioritizeVideos(array $rawVideos): array
    {
        if (empty($rawVideos)) {
            return [];
        }

        // Keep videos with valid keys, primarily YouTube
        $playable = array_filter($rawVideos, function ($v) {
            $key = trim((string) ($v['key'] ?? ''));
            $site = strtolower(trim((string) ($v['site'] ?? '')));

            return ! empty($key) && ($site === 'youtube' || empty($site));
        });

        if (empty($playable)) {
            return [];
        }

        $analyzed = [];
        $hasTurkish = false;

        foreach ($playable as $v) {
            $name = trim((string) ($v['name'] ?? ''));
            $iso = strtolower(trim((string) ($v['iso_639_1'] ?? '')));
            $type = strtolower(trim((string) ($v['type'] ?? 'trailer')));
            $official = (bool) ($v['official'] ?? false);

            $isDubbed = (bool) preg_match('/(?:dublaj|dublajl[ıi]|dublajli|türkçe dublaj|turkce dublaj)/iu', $name);
            $isSubtitled = ! $isDubbed && (bool) preg_match('/(?:altyaz[ıi]|altyaz[ıi]l[ıi]|altyazili|türkçe altyaz[ıi]|turkce altyazi|subtitled)/iu', $name);
            $isTurkish = $iso === 'tr'
                || $isDubbed
                || $isSubtitled
                || (bool) preg_match('/(?:türkçe|turkce|resmi fragman|fragman)/iu', $name);

            if ($isTurkish) {
                $hasTurkish = true;
            }

            $analyzed[] = [
                'raw' => $v,
                'name' => $name,
                'iso' => $iso,
                'type' => $type,
                'official' => $official,
                'is_turkish' => $isTurkish,
                'is_dubbed' => $isDubbed,
                'is_subtitled' => $isSubtitled,
                'published_at' => $v['published_at'] ?? null,
            ];
        }

        foreach ($analyzed as &$item) {
            $score = 500;
            $isTrailer = $item['type'] === 'trailer';
            $isTeaser = $item['type'] === 'teaser';

            if ($item['is_turkish']) {
                if ($item['is_dubbed'] && $isTrailer) {
                    $score = 10;
                } elseif ($item['is_dubbed']) {
                    $score = 20;
                } elseif ($item['is_subtitled'] && $isTrailer) {
                    $score = 30;
                } elseif ($item['is_subtitled']) {
                    $score = 40;
                } elseif ($isTrailer && $item['official']) {
                    $score = 50;
                } elseif ($isTrailer) {
                    $score = 60;
                } elseif ($isTeaser) {
                    $score = 70;
                } else {
                    $score = 80;
                }
            } else {
                if ($hasTurkish) {
                    // When Turkish options exist, include English trailers as secondary options
                    if ($isTrailer && $item['official']) {
                        $score = 200;
                    } elseif ($isTrailer) {
                        $score = 210;
                    } elseif ($isTeaser && $item['official']) {
                        $score = 220;
                    } else {
                        $score = 300;
                    }
                } else {
                    // Fallback when no Turkish options exist
                    if ($isTrailer && $item['official']) {
                        $score = 10;
                    } elseif ($isTrailer) {
                        $score = 20;
                    } elseif ($isTeaser && $item['official']) {
                        $score = 30;
                    } elseif ($isTeaser) {
                        $score = 40;
                    } else {
                        $score = 100;
                    }
                }
            }

            if ($item['official']) {
                $score -= 2;
            }

            $item['score'] = $score;
        }
        unset($item);

        usort($analyzed, function ($a, $b) {
            if ($a['score'] !== $b['score']) {
                return $a['score'] <=> $b['score'];
            }

            $pubA = ! empty($a['published_at']) ? strtotime($a['published_at']) : 0;
            $pubB = ! empty($b['published_at']) ? strtotime($b['published_at']) : 0;

            return $pubB <=> $pubA;
        });

        $filtered = [];
        $nonTrCount = 0;
        $maxNonTr = $hasTurkish ? 2 : 5;

        foreach ($analyzed as $item) {
            if (! $item['is_turkish']) {
                if (! in_array($item['type'], ['trailer', 'teaser']) && count($filtered) > 0) {
                    continue;
                }
                if ($nonTrCount >= $maxNonTr) {
                    continue;
                }
                $nonTrCount++;
            }

            $raw = $item['raw'];
            $raw['is_dubbed'] = $item['is_dubbed'];
            $raw['is_subtitled'] = $item['is_subtitled'];
            $filtered[] = $raw;
        }

        return $filtered;
    }

    /**
     * Find existing or create a new TmdbTitle model record with all 3 names and sync relational data.
     */
    public function findOrCreateTmdbTitle(int $tmdbId, string $mediaType = 'movie', bool $syncRelations = true): ?TmdbTitle
    {
        $existing = TmdbTitle::where('tmdb_id', $tmdbId)->first();

        if ($existing) {
            if ($syncRelations && ($existing->castMembers()->count() === 0 || $existing->videos()->count() === 0)) {
                $details = $this->getDetails($tmdbId, $mediaType);
                if ($details) {
                    $this->syncTitleRelations($existing, $details);
                }
            }

            return $existing;
        }

        $details = $this->getDetails($tmdbId, $mediaType);

        if (! $details) {
            return null;
        }

        $title = TmdbTitle::create([
            'tmdb_id' => $details['id'],
            'imdb_id' => $details['imdb_id'],
            'media_type' => $details['media_type'],
            'title' => $details['title'],
            'title_tr' => $details['title_tr'],
            'title_en' => $details['title_en'],
            'title_original' => $details['title_original'],
            'original_title' => $details['original_title'],
            'original_language' => $details['original_language'],
            'overview' => $details['overview'],
            'overview_tr' => $details['overview_tr'],
            'overview_en' => $details['overview_en'],
            'poster_path' => $details['poster_path'],
            'backdrop_path' => $details['backdrop_path'],
            'release_date' => $details['release_date'],
            'release_year' => $details['release_year'],
            'vote_average' => $details['vote_average'],
            'vote_count' => $details['vote_count'],
            'popularity' => $details['popularity'],
            'genres' => $details['genres'],
            'extra_data' => $details['extra_data'],
        ]);

        if ($syncRelations) {
            $this->syncTitleRelations($title, $details);
        }

        return $title;
    }

    /**
     * Synchronize relational Cast, Crew, Videos/Trailers, and TV Seasons/Episodes.
     *
     * @param  array<string, mixed>  $details
     */
    public function syncTitleRelations(TmdbTitle $title, array $details): void
    {
        // 1. Cast & Crew (Actors and key crew members)
        if (! empty($details['credits'])) {
            // Actors (top 30)
            $castList = array_slice($details['credits']['cast'] ?? [], 0, 30);
            foreach ($castList as $c) {
                if (empty($c['name'])) {
                    continue;
                }

                TmdbCast::updateOrCreate(
                    [
                        'tmdb_title_id' => $title->id,
                        'role_type' => 'cast',
                        'tmdb_person_id' => $c['id'] ?? null,
                    ],
                    [
                        'name' => $c['name'],
                        'character' => $c['character'] ?? null,
                        'department' => $c['known_for_department'] ?? 'Acting',
                        'job' => 'Actor',
                        'profile_path' => $c['profile_path'] ?? null,
                        'order' => (int) ($c['order'] ?? 0),
                    ]
                );
            }

            // Crew (Directors, Writers, Key roles)
            $keyJobs = ['Director', 'Screenplay', 'Writer', 'Producer', 'Executive Producer', 'Director of Photography', 'Original Music Composer'];
            foreach ($details['credits']['crew'] ?? [] as $cr) {
                if (empty($cr['name'])) {
                    continue;
                }

                $job = $cr['job'] ?? '';
                $dept = $cr['department'] ?? '';

                if (in_array($job, $keyJobs) || in_array($dept, ['Directing', 'Writing'])) {
                    TmdbCast::updateOrCreate(
                        [
                            'tmdb_title_id' => $title->id,
                            'role_type' => 'crew',
                            'tmdb_person_id' => $cr['id'] ?? null,
                            'job' => $job ?: $dept,
                        ],
                        [
                            'name' => $cr['name'],
                            'character' => null,
                            'department' => $dept,
                            'profile_path' => $cr['profile_path'] ?? null,
                            'order' => 0,
                        ]
                    );
                }
            }
        }

        // 2. Videos / Fragmanlar (Prioritized by TR Dubbed > TR Subtitled > TR Other > EN)
        if (! empty($details['videos'])) {
            $prioritized = $this->prioritizeVideos($details['videos']);

            // Clean up existing unranked videos to ensure correct 1-based order
            TmdbVideo::where('tmdb_title_id', $title->id)->delete();

            $order = 1;
            foreach ($prioritized as $v) {
                if (empty($v['key'])) {
                    continue;
                }

                TmdbVideo::updateOrCreate(
                    [
                        'tmdb_title_id' => $title->id,
                        'key' => $v['key'],
                    ],
                    [
                        'tmdb_video_id' => $v['id'] ?? null,
                        'name' => $v['name'] ?? 'Video',
                        'site' => $v['site'] ?? 'YouTube',
                        'type' => $v['type'] ?? 'Trailer',
                        'size' => isset($v['size']) ? (int) $v['size'] : null,
                        'official' => (bool) ($v['official'] ?? true),
                        'published_at' => ! empty($v['published_at']) ? date('Y-m-d H:i:s', strtotime($v['published_at'])) : null,
                        'iso_639_1' => $v['iso_639_1'] ?? null,
                        'sort_order' => $order++,
                        'is_dubbed' => (bool) ($v['is_dubbed'] ?? false),
                        'is_subtitled' => (bool) ($v['is_subtitled'] ?? false),
                    ]
                );
            }
        }

        // 3. TV Seasons & Episodes (if TV series)
        if ($title->media_type === 'tv' && ! empty($details['seasons'])) {
            foreach ($details['seasons'] as $s) {
                $seasonNum = (int) ($s['season_number'] ?? 0);
                $rawSeasonName = $s['name'] ?? null;

                $defaultTrName = $seasonNum === 0 ? 'Özel Bölümler' : "Sezon {$seasonNum}";
                $nameTr = (preg_match('/^Season\s+(\d+)$/i', $rawSeasonName ?? '', $m))
                    ? "Sezon {$m[1]}"
                    : ($rawSeasonName === 'Specials' ? 'Özel Bölümler' : ($rawSeasonName ?: $defaultTrName));
                $nameEn = $rawSeasonName ?: ($seasonNum === 0 ? 'Specials' : "Season {$seasonNum}");

                // 2 Türkçe veri (name ve name_tr), 1 İngilizce veri (name_en)
                $season = TmdbSeason::updateOrCreate(
                    [
                        'tmdb_title_id' => $title->id,
                        'season_number' => $seasonNum,
                    ],
                    [
                        'tmdb_season_id' => $s['id'] ?? null,
                        'name' => $nameTr,
                        'name_tr' => $nameTr,
                        'name_en' => $nameEn,
                        'overview' => $s['overview'] ?? null,
                        'poster_path' => $s['poster_path'] ?? null,
                        'episode_count' => (int) ($s['episode_count'] ?? 0),
                        'air_date' => ! empty($s['air_date']) ? $s['air_date'] : null,
                        'vote_average' => isset($s['vote_average']) ? (float) $s['vote_average'] : null,
                    ]
                );

                // Auto-sync episodes for all valid seasons (season_number >= 1)
                if ($seasonNum >= 1 && $season->episode_count > 0 && $season->episodes()->count() === 0) {
                    $this->syncSeasonEpisodes($season);
                }
            }
        }
    }

    /**
     * Synchronize episodes for a specific TV Season fetching both Turkish and English metadata.
     */
    public function syncSeasonEpisodes(TmdbSeason $season): int
    {
        $title = $season->title;

        if (! $title || ! $this->isConfigured()) {
            return 0;
        }

        $endpoint = "/tv/{$title->tmdb_id}/season/{$season->season_number}";

        // 1. Fetch Turkish season data
        $resTr = $this->client()->get($endpoint, $this->prepareParams(['language' => 'tr-TR']));
        $trData = $resTr->successful() ? $resTr->json() : [];
        $trEpisodes = $trData['episodes'] ?? [];
        $trMap = [];
        foreach ($trEpisodes as $ep) {
            $epNum = (int) ($ep['episode_number'] ?? 0);
            if ($epNum > 0) {
                $trMap[$epNum] = $ep;
            }
        }

        // 2. Fetch English season data
        $resEn = $this->client()->get($endpoint, $this->prepareParams(['language' => 'en-US']));
        $enData = $resEn->successful() ? $resEn->json() : [];
        $enEpisodes = $enData['episodes'] ?? [];
        $enMap = [];
        foreach ($enEpisodes as $ep) {
            $epNum = (int) ($ep['episode_number'] ?? 0);
            if ($epNum > 0) {
                $enMap[$epNum] = $ep;
            }
        }

        // Update season multilingual metadata if available (2 Turkish, 1 English)
        $seasonNameTr = ! empty($trData['name']) ? trim($trData['name']) : null;
        $seasonNameEn = ! empty($enData['name']) ? trim($enData['name']) : null;
        $seasonOverviewTr = ! empty($trData['overview']) ? trim($trData['overview']) : null;
        $seasonOverviewEn = ! empty($enData['overview']) ? trim($enData['overview']) : null;

        $fallbackTr = $season->season_number === 0 ? 'Özel Bölümler' : "Sezon {$season->season_number}";
        $fallbackEn = $season->season_number === 0 ? 'Specials' : "Season {$season->season_number}";

        $resolvedTr = $seasonNameTr ?: ($season->name_tr ?: $fallbackTr);
        $resolvedEn = $seasonNameEn ?: ($season->name_en ?: $fallbackEn);

        $season->update([
            'name' => $resolvedTr,
            'name_tr' => $resolvedTr,
            'name_en' => $resolvedEn,
            'overview_tr' => $seasonOverviewTr ?: $season->overview_tr,
            'overview_en' => $seasonOverviewEn ?: $season->overview_en,
            'overview' => $seasonOverviewTr ?: ($seasonOverviewEn ?: $season->overview),
        ]);

        $allEpNumbers = array_unique(array_merge(array_keys($trMap), array_keys($enMap)));
        sort($allEpNumbers);

        $saved = 0;

        foreach ($allEpNumbers as $epNum) {
            $epTr = $trMap[$epNum] ?? [];
            $epEn = $enMap[$epNum] ?? [];
            $baseEp = ! empty($epTr) ? $epTr : $epEn;

            $nameTr = ! empty($epTr['name']) ? trim($epTr['name']) : null;
            $nameEn = ! empty($epEn['name']) ? trim($epEn['name']) : null;

            $overviewTr = ! empty($epTr['overview']) ? trim($epTr['overview']) : null;
            $overviewEn = ! empty($epEn['overview']) ? trim($epEn['overview']) : null;

            // Primary display name: prefer Turkish, fallback to English, fallback to Bölüm N
            $name = $nameTr ?: ($nameEn ?: "Bölüm {$epNum}");
            // Primary display overview: prefer Turkish, fallback to English overview
            $overview = $overviewTr ?: ($overviewEn ?: null);

            $stillPath = $epTr['still_path'] ?? ($epEn['still_path'] ?? null);
            $airDate = ! empty($baseEp['air_date']) ? $baseEp['air_date'] : null;
            $voteAverage = isset($baseEp['vote_average']) ? (float) $baseEp['vote_average'] : null;
            $runtime = isset($baseEp['runtime']) ? (int) $baseEp['runtime'] : null;
            $tmdbEpId = $baseEp['id'] ?? null;

            TmdbEpisode::updateOrCreate(
                [
                    'tmdb_season_id' => $season->id,
                    'episode_number' => $epNum,
                ],
                [
                    'tmdb_title_id' => $title->id,
                    'tmdb_episode_id' => $tmdbEpId,
                    'season_number' => $season->season_number,
                    'name' => $name,
                    'name_tr' => $nameTr,
                    'name_en' => $nameEn,
                    'overview' => $overview,
                    'overview_tr' => $overviewTr,
                    'overview_en' => $overviewEn,
                    'still_path' => $stillPath,
                    'air_date' => $airDate,
                    'vote_average' => $voteAverage,
                    'runtime' => $runtime,
                ]
            );

            $saved++;
        }

        return $saved;
    }

    /**
     * Automatically scan and match a media file with TMDB, applying the +-1 year review rule.
     */
    public function matchMediaFile(MediaFile $mediaFile): array
    {
        if (! $this->isConfigured()) {
            return [
                'success' => false,
                'status' => 'unmatched',
                'confidence' => 0,
                'notes' => 'TMDB API anahtarı yapılandırılmamış.',
                'tmdb_title' => null,
            ];
        }

        $cleanTitle = $mediaFile->clean_title ?: pathinfo($mediaFile->name, PATHINFO_FILENAME);
        $fileYear = $mediaFile->year;
        $mediaType = $mediaFile->category === 'series' ? 'tv' : 'movie';

        // 1. Search TMDB with title and file year first for higher precision
        $results = [];
        if ($fileYear) {
            $results = $this->search($cleanTitle, $fileYear, $mediaType);
        }

        // Fallback or expand search without year if year-specific search yielded no results or few results
        if (empty($results)) {
            $results = $this->search($cleanTitle, null, $mediaType);
        } else {
            // Also fetch general results to compare if needed, avoiding duplicates
            $generalResults = $this->search($cleanTitle, null, $mediaType);
            $existingIds = array_column($results, 'id');
            foreach ($generalResults as $gRes) {
                if (! in_array($gRes['id'], $existingIds, true)) {
                    $results[] = $gRes;
                }
            }
        }

        if (empty($results) && $mediaType === 'tv') {
            $results = $this->search($cleanTitle, null, 'movie');
        } elseif (empty($results) && $mediaType === 'movie') {
            $results = $this->search($cleanTitle, null, 'tv');
        }

        if (empty($results)) {
            $mediaFile->update([
                'tmdb_match_status' => 'unmatched',
                'tmdb_match_confidence' => 0,
                'tmdb_match_notes' => "TMDB'de \"{$cleanTitle}\" için eşleşen kayıt bulunamadı.",
                'tmdb_matched_at' => now(),
            ]);

            return [
                'success' => false,
                'status' => 'unmatched',
                'confidence' => 0,
                'notes' => "TMDB'de eşleşen kayıt bulunamadı.",
                'tmdb_title' => null,
            ];
        }

        // 2. Score candidates by similarity and year
        $bestCandidate = null;
        $bestScore = -1;
        $matchStatus = 'unmatched';
        $matchNotes = '';

        foreach ($results as $candidate) {
            $similarity = $this->calculateTitleSimilarity($cleanTitle, $candidate['title'], $candidate['original_title'] ?? '');
            $candYear = $candidate['release_year'];

            if ($similarity < 50) {
                continue;
            }

            $isTv = ($mediaType === 'tv') || (($candidate['media_type'] ?? '') === 'tv');

            // Case A: Exact Year Match
            if ($fileYear !== null && $candYear !== null && $fileYear === $candYear) {
                $score = $similarity + 40;
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestCandidate = $candidate;
                    $matchStatus = 'matched';
                    $matchNotes = "Otomatik tam eşleşme (Yıl: {$fileYear})";
                }
            }
            // Case B: User Rule: +- 1 year difference -> Mark as 'matched' directly per user requirement
            elseif ($fileYear !== null && $candYear !== null && abs($fileYear - $candYear) === 1) {
                $score = $similarity + 25;
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestCandidate = $candidate;
                    $matchStatus = 'matched';
                    $matchNotes = "Otomatik eşleşme (+-1 yıl farkı): Dosya Yılı: {$fileYear}, TMDB Yılı: {$candYear}";
                }
            }
            // Case C: File has no year, but high title similarity
            elseif ($fileYear === null && $similarity >= 80) {
                $score = $similarity + 15;
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestCandidate = $candidate;
                    if ($isTv) {
                        $matchStatus = 'matched';
                        $matchNotes = 'Otomatik eşleşme (Dizi - Yapım yılı olmadan isim eşleşmesi)';
                    } else {
                        $matchStatus = 'review';
                        $matchNotes = 'Dosyada yapım yılı belirtilmemiş. İnceleme gerekiyor.';
                    }
                }
            }
            // Case D: Year difference > 1 but high similarity (apply penalty for large year difference)
            elseif ($similarity >= 85 && $fileYear !== null && $candYear !== null) {
                $diff = abs($fileYear - $candYear);
                $score = $similarity - ($diff * 10);
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestCandidate = $candidate;
                    $matchStatus = 'review';
                    $matchNotes = "Belirgin yıl farkı ({$diff} yıl): Dosya: {$fileYear}, TMDB: {$candYear}. İnceleme gerekiyor.";
                }
            }
        }

        if (! $bestCandidate || $bestScore < 60) {
            $mediaFile->update([
                'tmdb_match_status' => 'unmatched',
                'tmdb_match_confidence' => 0,
                'tmdb_match_notes' => "Yakın eşleşme bulunamadı (En yüksek benzerlik skoru: {$bestScore}).",
                'tmdb_matched_at' => now(),
            ]);

            return [
                'success' => false,
                'status' => 'unmatched',
                'confidence' => 0,
                'notes' => 'Yeterli benzerlikte sonuç bulunamadı.',
                'tmdb_title' => null,
            ];
        }

        // Save or fetch TmdbTitle (storing title_tr, title_en, title_original)
        $tmdbTitle = $this->findOrCreateTmdbTitle($bestCandidate['id'], $bestCandidate['media_type']);

        if (! $tmdbTitle) {
            return [
                'success' => false,
                'status' => 'unmatched',
                'confidence' => 0,
                'notes' => 'TMDB detay verisi alınamadı.',
                'tmdb_title' => null,
            ];
        }

        $confidence = min(100, max(10, (int) round($bestScore)));

        $mediaFile->update([
            'tmdb_title_id' => $tmdbTitle->id,
            'tmdb_match_status' => $matchStatus,
            'tmdb_match_confidence' => $confidence,
            'tmdb_match_notes' => $matchNotes,
            'tmdb_matched_at' => now(),
        ]);

        return [
            'success' => true,
            'status' => $matchStatus,
            'confidence' => $confidence,
            'notes' => $matchNotes,
            'tmdb_title' => $tmdbTitle,
        ];
    }

    /**
     * Manually attach a TMDB item to a media file.
     */
    public function manualMatch(MediaFile $mediaFile, int $tmdbId, string $mediaType = 'movie'): TmdbTitle
    {
        $tmdbTitle = $this->findOrCreateTmdbTitle($tmdbId, $mediaType);

        if (! $tmdbTitle) {
            throw new \RuntimeException('TMDB başlık bilgisi çekilemedi.');
        }

        $mediaFile->update([
            'tmdb_title_id' => $tmdbTitle->id,
            'tmdb_match_status' => 'matched',
            'tmdb_match_confidence' => 100,
            'tmdb_match_notes' => 'Yönetici tarafından manuel olarak eşleştirildi.',
            'tmdb_matched_at' => now(),
        ]);

        return $tmdbTitle;
    }

    /**
     * Detach TMDB match from a media file.
     */
    public function detachMatch(MediaFile $mediaFile): void
    {
        $mediaFile->update([
            'tmdb_title_id' => null,
            'tmdb_match_status' => 'unmatched',
            'tmdb_match_confidence' => null,
            'tmdb_match_notes' => null,
            'tmdb_matched_at' => null,
        ]);
    }

    /**
     * Calculate similarity percentage between clean media title and TMDB titles.
     */
    protected function calculateTitleSimilarity(string $query, string $title, string $originalTitle): float
    {
        $normalize = function (string $str): string {
            $str = mb_strtolower($str, 'UTF-8');
            $str = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $str) ?? '';

            return trim(preg_replace('/\s+/', ' ', $str) ?? '');
        };

        $normQuery = $normalize($query);
        $normTitle = $normalize($title);
        $normOrig = $normalize($originalTitle);

        if ($normQuery === $normTitle || $normQuery === $normOrig) {
            return 100.0;
        }

        similar_text($normQuery, $normTitle, $percent1);
        similar_text($normQuery, $normOrig, $percent2);

        return max((float) $percent1, (float) $percent2);
    }

    /**
     * Format array of raw TMDB search items.
     *
     * @param  list<array<string, mixed>>  $items
     * @return list<array{
     *     id: int,
     *     media_type: string,
     *     title: string,
     *     title_tr: ?string,
     *     title_en: ?string,
     *     title_original: ?string,
     *     original_title: ?string,
     *     release_date: ?string,
     *     release_year: ?int,
     *     vote_average: float,
     *     vote_count: int,
     *     poster_path: ?string,
     *     backdrop_path: ?string,
     *     overview: ?string,
     *     poster_url: ?string
     * }>
     */
    protected function formatSearchResults(array $items, ?string $fallbackMediaType = null): array
    {
        $imageBase = config('services.tmdb.image_base_url', 'https://image.tmdb.org/t/p/w500');
        $formatted = [];

        foreach ($items as $item) {
            $mediaType = $item['media_type'] ?? ($fallbackMediaType ?: 'movie');

            if (! in_array($mediaType, ['movie', 'tv'])) {
                continue;
            }

            $title = $item['title'] ?? $item['name'] ?? '';
            $origTitle = $item['original_title'] ?? $item['original_name'] ?? null;
            $dateStr = $item['release_date'] ?? $item['first_air_date'] ?? null;
            $year = $dateStr ? (int) substr($dateStr, 0, 4) : null;
            $poster = $item['poster_path'] ?? null;

            $formatted[] = [
                'id' => (int) $item['id'],
                'media_type' => $mediaType,
                'title' => $title,
                'title_tr' => $title,
                'title_en' => $origTitle ?: $title,
                'title_original' => $origTitle ?: $title,
                'original_title' => $origTitle,
                'release_date' => $dateStr,
                'release_year' => $year,
                'vote_average' => round((float) ($item['vote_average'] ?? 0), 1),
                'vote_count' => (int) ($item['vote_count'] ?? 0),
                'poster_path' => $poster,
                'backdrop_path' => $item['backdrop_path'] ?? null,
                'overview' => $item['overview'] ?? null,
                'poster_url' => $poster ? rtrim($imageBase, '/').'/'.ltrim($poster, '/') : null,
            ];
        }

        return $formatted;
    }

    /**
     * Search person by name.
     *
     * @return list<array{id: int, name: string, profile_path: ?string}>
     */
    public function searchPerson(string $query): array
    {
        if (! $this->isConfigured()) {
            return [];
        }

        $query = trim($query);
        if (empty($query)) {
            return [];
        }

        $response = $this->client()->get('/search/person', $this->prepareParams([
            'query' => $query,
            'language' => 'tr-TR',
        ]));

        if (! $response->successful()) {
            return [];
        }

        $results = $response->json('results') ?? [];

        return array_map(function ($p) {
            return [
                'id' => (int) $p['id'],
                'name' => $p['name'],
                'profile_path' => $p['profile_path'] ?? null,
                'popularity' => (float) ($p['popularity'] ?? 0),
            ];
        }, $results);
    }

    /**
     * Get person details, filmography, external ids, and images from TMDB.
     *
     * @return array<string, mixed>|null
     */
    public function getPersonDetails(int $personId): ?array
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $cacheKey = "tmdb_person_details_v3_{$personId}";

        return Cache::remember($cacheKey, now()->addDays(7), function () use ($personId) {
            $response = $this->client()->get("/person/{$personId}", $this->prepareParams([
                'language' => 'tr-TR',
                'append_to_response' => 'combined_credits,external_ids,images',
            ]));

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();
            $biography = trim((string) ($data['biography'] ?? ''));

            // Fallback to English biography if Turkish is empty
            if (empty($biography)) {
                $enResponse = $this->client()->get("/person/{$personId}", $this->prepareParams([
                    'language' => 'en-US',
                ]));
                if ($enResponse->successful()) {
                    $biography = trim((string) ($enResponse->json('biography') ?? ''));
                }
            }

            // Profiles gallery
            $profiles = array_slice($data['images']['profiles'] ?? [], 0, 10);
            $formattedImages = array_map(function ($img) {
                return [
                    'file_path' => $img['file_path'],
                    'url' => 'https://image.tmdb.org/t/p/w500/'.ltrim($img['file_path'], '/'),
                    'width' => $img['width'] ?? null,
                    'height' => $img['height'] ?? null,
                ];
            }, $profiles);

            // Credits
            $creditsCast = $data['combined_credits']['cast'] ?? [];
            $formattedCredits = [];

            foreach ($creditsCast as $c) {
                $title = $c['title'] ?? $c['name'] ?? null;
                if (empty($title)) {
                    continue;
                }

                $mediaType = $c['media_type'] ?? 'movie';
                $dateStr = $c['release_date'] ?? $c['first_air_date'] ?? null;
                $year = $dateStr ? (int) substr($dateStr, 0, 4) : null;
                $posterPath = $c['poster_path'] ?? null;

                $formattedCredits[] = [
                    'tmdb_id' => (int) $c['id'],
                    'title' => $title,
                    'original_title' => $c['original_title'] ?? $c['original_name'] ?? null,
                    'character' => $c['character'] ?? '',
                    'role_type' => 'cast',
                    'department' => $c['department'] ?? 'Acting',
                    'job' => 'Actor',
                    'media_type' => $mediaType,
                    'release_date' => $dateStr,
                    'year' => $year,
                    'vote_average' => round((float) ($c['vote_average'] ?? 0), 1),
                    'vote_count' => (int) ($c['vote_count'] ?? 0),
                    'popularity' => (float) ($c['popularity'] ?? 0),
                    'poster_path' => $posterPath,
                    'poster' => $posterPath ? 'https://image.tmdb.org/t/p/w342/'.ltrim($posterPath, '/') : null,
                    'backdrop_path' => $c['backdrop_path'] ?? null,
                    'overview' => $c['overview'] ?? '',
                ];
            }

            // Sort by release year desc
            usort($formattedCredits, function ($a, $b) {
                $yearA = $a['year'] ?? 0;
                $yearB = $b['year'] ?? 0;
                if ($yearA === $yearB) {
                    return $b['popularity'] <=> $a['popularity'];
                }

                return $yearB <=> $yearA;
            });

            // Known for candidates: exclude "Self", "Himself", "Herself" talk shows and rank by real cinematic impact
            $knownForCandidates = array_filter($formattedCredits, function ($c) {
                if (empty($c['poster'])) {
                    return false;
                }

                $char = strtolower(trim((string) ($c['character'] ?? '')));
                if (str_starts_with($char, 'self') || str_starts_with($char, 'himself') || str_starts_with($char, 'herself') || $char === 'kendisi') {
                    return false;
                }

                return true;
            });

            // Sort by audience impact score (vote_count * vote_average)
            usort($knownForCandidates, function ($a, $b) {
                $scoreA = ((int) ($a['vote_count'] ?? 0)) * ((float) ($a['vote_average'] ?? 1));
                $scoreB = ((int) ($b['vote_count'] ?? 0)) * ((float) ($b['vote_average'] ?? 1));

                if ($scoreA === $scoreB) {
                    return ($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0);
                }

                return $scoreB <=> $scoreA;
            });

            // Fallback if no specific character roles exist
            if (empty($knownForCandidates)) {
                $knownForCandidates = array_filter($formattedCredits, fn ($c) => ! empty($c['poster']));
                usort($knownForCandidates, fn ($a, $b) => ($b['vote_count'] ?? 0) <=> ($a['vote_count'] ?? 0));
            }

            $knownFor = array_values(array_slice($knownForCandidates, 0, 8));

            // Age calculation
            $age = null;
            $birthday = $data['birthday'] ?? null;
            $deathday = $data['deathday'] ?? null;
            if ($birthday) {
                try {
                    $birthDate = new \DateTime($birthday);
                    $endDate = $deathday ? new \DateTime($deathday) : new \DateTime;
                    $age = $birthDate->diff($endDate)->y;
                } catch (\Throwable) {
                    $age = null;
                }
            }

            $genderLabel = match ((int) ($data['gender'] ?? 0)) {
                1 => 'Kadın',
                2 => 'Erkek',
                3 => 'Non-binary',
                default => 'Belirtilmemiş',
            };

            $deptLabel = match ($data['known_for_department'] ?? '') {
                'Acting' => 'Oyunculuk',
                'Directing' => 'Yönetmenlik',
                'Writing' => 'Senaryo / Yazarlık',
                'Production' => 'Yapımcılık',
                'Sound' => 'Müzik / Ses',
                'Camera' => 'Görüntü Yönetimi',
                default => $data['known_for_department'] ?? 'Sinema Sanatçısı',
            };

            return [
                'id' => (int) $data['id'],
                'name' => $data['name'],
                'also_known_as' => $data['also_known_as'] ?? [],
                'biography' => $biography,
                'birthday' => $birthday,
                'deathday' => $deathday,
                'age' => $age,
                'place_of_birth' => $data['place_of_birth'] ?? null,
                'known_for_department' => $deptLabel,
                'raw_department' => $data['known_for_department'] ?? 'Acting',
                'gender' => $genderLabel,
                'popularity' => round((float) ($data['popularity'] ?? 0), 1),
                'profile_path' => $data['profile_path'] ?? null,
                'profile_url' => ! empty($data['profile_path']) ? 'https://image.tmdb.org/t/p/h632/'.ltrim($data['profile_path'], '/') : null,
                'avatar' => ! empty($data['profile_path']) ? 'https://image.tmdb.org/t/p/w185/'.ltrim($data['profile_path'], '/') : 'https://ui-avatars.com/api/?name='.urlencode($data['name']).'&color=00B074&background=191D28',
                'images' => $formattedImages,
                'external_ids' => [
                    'imdb_id' => $data['external_ids']['imdb_id'] ?? null,
                    'imdb_url' => ! empty($data['external_ids']['imdb_id']) ? 'https://www.imdb.com/name/'.$data['external_ids']['imdb_id'] : null,
                    'instagram_id' => $data['external_ids']['instagram_id'] ?? null,
                    'instagram_url' => ! empty($data['external_ids']['instagram_id']) ? 'https://instagram.com/'.$data['external_ids']['instagram_id'] : null,
                    'twitter_id' => $data['external_ids']['twitter_id'] ?? null,
                    'twitter_url' => ! empty($data['external_ids']['twitter_id']) ? 'https://twitter.com/'.$data['external_ids']['twitter_id'] : null,
                    'facebook_id' => $data['external_ids']['facebook_id'] ?? null,
                    'facebook_url' => ! empty($data['external_ids']['facebook_id']) ? 'https://facebook.com/'.$data['external_ids']['facebook_id'] : null,
                ],
                'credits' => $formattedCredits,
                'known_for' => $knownFor,
                'total_credits' => count($formattedCredits),
            ];
        });
    }

    /**
     * Get movie collection / franchise details from TMDB.
     *
     * @return array{
     *     id: int,
     *     name: string,
     *     overview: ?string,
     *     poster_url: ?string,
     *     backdrop_url: ?string,
     *     parts: list<array{
     *         id: int,
     *         title: string,
     *         original_title: string,
     *         release_date: ?string,
     *         release_year: ?int,
     *         vote_average: float,
     *         vote_count: int,
     *         poster_path: ?string,
     *         poster_url: ?string,
     *         backdrop_url: ?string,
     *         overview: ?string
     *     }>
     * }|null
     */
    public function getMovieCollection(int $tmdbId): ?array
    {
        if (! $this->isConfigured()) {
            return null;
        }

        return Cache::remember("tmdb_movie_collection_{$tmdbId}", now()->addDays(30), function () use ($tmdbId) {
            $movieRes = $this->client()->get("/movie/{$tmdbId}", $this->prepareParams([
                'language' => 'tr-TR',
            ]));

            if (! $movieRes->successful()) {
                return null;
            }

            $belongsToCollection = $movieRes->json('belongs_to_collection');
            if (empty($belongsToCollection) || empty($belongsToCollection['id'])) {
                return null;
            }

            $collectionId = (int) $belongsToCollection['id'];

            $collRes = $this->client()->get("/collection/{$collectionId}", $this->prepareParams([
                'language' => 'tr-TR',
            ]));

            if (! $collRes->successful()) {
                return null;
            }

            $collData = $collRes->json();
            $parts = $collData['parts'] ?? [];

            $formattedParts = [];
            $imageBase = config('services.tmdb.image_base_url', 'https://image.tmdb.org/t/p/w500');

            foreach ($parts as $part) {
                $partYear = ! empty($part['release_date']) ? (int) substr($part['release_date'], 0, 4) : null;
                $posterPath = $part['poster_path'] ?? null;
                $backdropPath = $part['backdrop_path'] ?? null;

                $formattedParts[] = [
                    'id' => (int) $part['id'],
                    'title' => $part['title'] ?? ($part['original_title'] ?? 'Film'),
                    'original_title' => $part['original_title'] ?? '',
                    'release_date' => $part['release_date'] ?? null,
                    'release_year' => $partYear,
                    'vote_average' => round((float) ($part['vote_average'] ?? 0), 1),
                    'vote_count' => (int) ($part['vote_count'] ?? 0),
                    'poster_path' => $posterPath,
                    'poster_url' => $posterPath ? rtrim($imageBase, '/').'/'.ltrim($posterPath, '/') : null,
                    'backdrop_url' => $backdropPath ? 'https://image.tmdb.org/t/p/w1280/'.ltrim($backdropPath, '/') : null,
                    'overview' => $part['overview'] ?? null,
                ];
            }

            usort($formattedParts, function ($a, $b) {
                $dateA = $a['release_date'] ?: '9999-99-99';
                $dateB = $b['release_date'] ?: '9999-99-99';

                return strcmp($dateA, $dateB);
            });

            $rawName = $collData['name'] ?? 'Film Serisi';
            $cleanName = trim(str_ireplace(['[seri]', '[serisi]'], '', $rawName));

            return [
                'id' => $collectionId,
                'name' => $cleanName ?: $rawName,
                'overview' => $collData['overview'] ?? null,
                'poster_url' => ! empty($collData['poster_path']) ? rtrim($imageBase, '/').'/'.ltrim($collData['poster_path'], '/') : null,
                'backdrop_url' => ! empty($collData['backdrop_path']) ? 'https://image.tmdb.org/t/p/w1280/'.ltrim($collData['backdrop_path'], '/') : null,
                'parts' => $formattedParts,
            ];
        });
    }
}
