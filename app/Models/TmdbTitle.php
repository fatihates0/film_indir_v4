<?php

namespace App\Models;

use App\Helpers\CertificationHelper;
use App\Helpers\GenreHelper;
use App\Helpers\QualityHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class TmdbTitle extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'tmdb_titles';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tmdb_id',
        'imdb_id',
        'media_type',
        'slug',
        'title',
        'title_tr',
        'title_en',
        'title_original',
        'original_title',
        'original_language',
        'overview',
        'overview_tr',
        'overview_en',
        'poster_path',
        'backdrop_path',
        'release_date',
        'release_year',
        'vote_average',
        'vote_count',
        'popularity',
        'genres',
        'extra_data',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'tmdb_id' => 'integer',
        'release_year' => 'integer',
        'vote_average' => 'float',
        'vote_count' => 'integer',
        'popularity' => 'float',
        'release_date' => 'date',
        'genres' => 'array',
        'extra_data' => 'array',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'poster_url',
        'backdrop_url',
        'detail_url',
    ];

    protected static function booted(): void
    {
        static::saving(function ($model) {
            if (empty($model->slug)) {
                $model->slug = static::generateUniqueSlug($model);
            }
        });
    }

    public static function makeSlug($model): string
    {
        $rawTitle = $model->title_tr ?: ($model->title_en ?: ($model->title ?: $model->original_title));
        $slugStr = Str::slug($rawTitle ?: ('title-'.$model->id));

        $year = $model->release_year ?: ($model->release_date ? substr((string) $model->release_date, 0, 4) : null);
        if ($year && ! Str::endsWith($slugStr, (string) $year)) {
            $slugStr .= '-'.$year;
        }

        return $slugStr;
    }

    public static function generateUniqueSlug($model): string
    {
        $base = static::makeSlug($model);
        $slug = $base;
        $counter = 1;

        while (static::where('slug', $slug)->where('id', '!=', $model->id ?? 0)->exists()) {
            $counter++;
            $slug = "{$base}-{$counter}";
        }

        return $slug;
    }

    public function getDetailUrlAttribute(): string
    {
        $prefix = $this->media_type === 'tv' ? '/series/' : '/movie/';
        $slugValue = $this->slug ?: static::makeSlug($this);

        return $prefix.$slugValue;
    }

    public static function findBySlugOrId($slugOrId, ?string $mediaType = null): ?self
    {
        if (empty($slugOrId)) {
            return null;
        }

        $query = static::query();
        if ($mediaType) {
            $query->where('media_type', $mediaType);
        }

        // 1. Exact slug match in DB
        $item = (clone $query)->where('slug', $slugOrId)->first();
        if ($item) {
            return $item;
        }

        // 1b. Match with or without -indir suffix
        $stripped = preg_replace('/-indir$/', '', strtolower($slugOrId));
        if ($stripped !== $slugOrId) {
            $item = (clone $query)->where('slug', $stripped)->first();
            if ($item) {
                return $item;
            }
        }

        // 2. Numeric ID match
        if (is_numeric($slugOrId)) {
            $item = (clone $query)->where(function ($q) use ($slugOrId) {
                $q->where('id', $slugOrId)->orWhere('tmdb_id', $slugOrId);
            })->first();

            if ($item) {
                return $item;
            }

            $media = MediaFile::with('tmdbTitle')
                ->where('tmdb_match_status', 'matched')
                ->find($slugOrId);
            if ($media && $media->tmdbTitle) {
                if (! $mediaType || $media->tmdbTitle->media_type === $mediaType) {
                    return $media->tmdbTitle;
                }
            }
        }

        // 3. Fallback candidates search
        $candidates = (clone $query)->get();
        foreach ($candidates as $candidate) {
            $candSlug = static::makeSlug($candidate);
            $candTitleSlug = Str::slug($candidate->title_tr ?: ($candidate->title ?: $candidate->original_title));
            if ($candSlug === $slugOrId || $candTitleSlug === $slugOrId || $candTitleSlug === $stripped) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Scope a query to only include titles that have matched media files.
     *
     * @param  Builder  $query
     * @return Builder
     */
    public function scopeHasMatchedMedia($query)
    {
        return $query->whereHas('mediaFiles', function ($q) {
            $q->where('tmdb_match_status', 'matched');
        });
    }

    /**
     * Scope a query to titles that have a Turkish trailer (prioritizing or filtering dubbed).
     */
    public function scopeHasTurkishTrailer(Builder $query, bool $onlyDubbed = false): Builder
    {
        return $query->whereHas('videos', function ($q) use ($onlyDubbed) {
            $q->where(function ($siteQ) {
                $siteQ->whereNull('site')->orWhere('site', 'YouTube');
            })
                ->where(function ($typeQ) {
                    $typeQ->where('type', 'Trailer')->orWhere('type', 'Teaser');
                })
                ->where(function ($langQ) use ($onlyDubbed) {
                    $langQ->where('is_dubbed', true);
                    if (! $onlyDubbed) {
                        $langQ->orWhere('is_subtitled', true)
                            ->orWhere('iso_639_1', 'tr');
                    }
                });
        });
    }

    /**
     * Scope a query to titles that have any playable YouTube trailer.
     */
    public function scopeHasPlayableTrailer(Builder $query): Builder
    {
        return $query->whereHas('videos', function ($q) {
            $q->where(function ($siteQ) {
                $siteQ->whereNull('site')->orWhere('site', 'YouTube');
            })->where(function ($typeQ) {
                $typeQ->where('type', 'Trailer')->orWhere('type', 'Teaser');
            });
        });
    }

    /**
     * Relationship with media files.
     */
    public function mediaFiles(): HasMany
    {
        return $this->hasMany(MediaFile::class, 'tmdb_title_id');
    }

    /**
     * Cast & Crew members.
     */
    public function castMembers(): HasMany
    {
        return $this->hasMany(TmdbCast::class, 'tmdb_title_id')
            ->orderBy('role_type', 'asc')
            ->orderBy('order', 'asc');
    }

    /**
     * Alias for cast members.
     */
    public function cast(): HasMany
    {
        return $this->castMembers();
    }

    /**
     * Actors only.
     */
    public function actors(): HasMany
    {
        return $this->hasMany(TmdbCast::class, 'tmdb_title_id')
            ->where('role_type', 'cast')
            ->orderBy('order', 'asc');
    }

    /**
     * Crew members.
     */
    public function crew(): HasMany
    {
        return $this->hasMany(TmdbCast::class, 'tmdb_title_id')
            ->where('role_type', 'crew');
    }

    /**
     * Directors.
     */
    public function directors(): HasMany
    {
        return $this->hasMany(TmdbCast::class, 'tmdb_title_id')
            ->where('role_type', 'crew')
            ->where(function ($q) {
                $q->where('job', 'Director')->orWhere('department', 'Directing');
            });
    }

    /**
     * Trailers and videos ordered by priority.
     */
    public function videos(): HasMany
    {
        return $this->hasMany(TmdbVideo::class, 'tmdb_title_id')
            ->orderBy('sort_order', 'asc');
    }

    /**
     * Official trailers ordered by priority.
     */
    public function trailers(): HasMany
    {
        return $this->hasMany(TmdbVideo::class, 'tmdb_title_id')
            ->where('type', 'Trailer')
            ->orderBy('sort_order', 'asc')
            ->orderByDesc('official');
    }

    /**
     * Get the primary trailer video model (highest priority based on sort_order).
     */
    public function getTrailerAttribute(): ?TmdbVideo
    {
        $vids = $this->relationLoaded('trailers')
            ? $this->trailers
            : ($this->relationLoaded('videos')
                ? $this->videos->where('type', 'Trailer')->sortBy('sort_order')->values()
                : $this->trailers()->get());

        if ($vids->isNotEmpty()) {
            // 1. YouTube + Turkish Dubbed
            $ytDubbed = $vids->first(fn ($v) => strtolower((string) $v->site) === 'youtube' && $v->is_dubbed);
            if ($ytDubbed) {
                return $ytDubbed;
            }

            // 2. YouTube + Turkish Subtitled or TR iso
            $ytSub = $vids->first(fn ($v) => strtolower((string) $v->site) === 'youtube' && ($v->is_subtitled || strtolower((string) $v->iso_639_1) === 'tr'));
            if ($ytSub) {
                return $ytSub;
            }

            // 3. Any YouTube trailer
            $ytTrailer = $vids->first(fn ($v) => strtolower((string) $v->site) === 'youtube');
            if ($ytTrailer) {
                return $ytTrailer;
            }

            return $vids->first();
        }

        $allVideos = $this->relationLoaded('videos')
            ? $this->videos->sortBy('sort_order')->values()
            : $this->videos()->get();

        if ($allVideos->isEmpty()) {
            return null;
        }

        // 1. YouTube + Dubbed in all videos
        $dubbedAny = $allVideos->first(fn ($v) => strtolower((string) $v->site) === 'youtube' && $v->is_dubbed);
        if ($dubbedAny) {
            return $dubbedAny;
        }

        // 2. YouTube + Subtitled / TR in all videos
        $subAny = $allVideos->first(fn ($v) => strtolower((string) $v->site) === 'youtube' && ($v->is_subtitled || strtolower((string) $v->iso_639_1) === 'tr'));
        if ($subAny) {
            return $subAny;
        }

        return $allVideos->first(fn ($v) => strtolower((string) $v->site) === 'youtube') ?: $allVideos->first();
    }

    /**
     * TV Seasons.
     */
    public function seasons(): HasMany
    {
        return $this->hasMany(TmdbSeason::class, 'tmdb_title_id')->orderBy('season_number', 'asc');
    }

    /**
     * TV Episodes across all seasons.
     */
    public function episodes(): HasMany
    {
        return $this->hasMany(TmdbEpisode::class, 'tmdb_title_id')
            ->orderBy('season_number', 'asc')
            ->orderBy('episode_number', 'asc');
    }

    /**
     * Get full poster image URL.
     */
    public function getPosterUrlAttribute(): ?string
    {
        if (empty($this->poster_path)) {
            return null;
        }

        if (str_starts_with($this->poster_path, 'http')) {
            return $this->poster_path;
        }

        $base = config('services.tmdb.image_base_url', 'https://image.tmdb.org/t/p/w500');

        return rtrim($base, '/').'/'.ltrim($this->poster_path, '/');
    }

    /**
     * Get full backdrop image URL.
     */
    public function getBackdropUrlAttribute(): ?string
    {
        if (empty($this->backdrop_path)) {
            return null;
        }

        if (str_starts_with($this->backdrop_path, 'http')) {
            return $this->backdrop_path;
        }

        return 'https://image.tmdb.org/t/p/w1280/'.ltrim($this->backdrop_path, '/');
    }

    /**
     * Get the raw certification saved in extra_data.
     */
    public function getCertificationAttribute(): ?string
    {
        return $this->extra_data['certification'] ?? null;
    }

    /**
     * Get the Turkish-adapted certification label (e.g. 18+, 13+, 7+, Genel).
     */
    public function getTrCertificationAttribute(): string
    {
        return CertificationHelper::toTr($this->certification, $this->media_type);
    }

    /**
     * Get the Turkish translated genre list.
     *
     * @return array<string>
     */
    public function getTrGenresAttribute(): array
    {
        return GenreHelper::toTrList($this->genres);
    }

    /**
     * Get the Turkish translated genre string.
     */
    public function getTrGenresStringAttribute(): string
    {
        return GenreHelper::toTrString($this->genres, ' · ', 2, $this->media_type === 'tv' ? 'Dizi' : 'Film');
    }

    /**
     * Get the display quality label based on attached media files.
     */
    public function getDisplayQualityAttribute(): string
    {
        return $this->media_type === 'tv'
            ? QualityHelper::getSeriesQuality($this)
            : QualityHelper::getMovieQuality($this);
    }
}
