<?php

namespace App\Models;

use Database\Factories\TmdbSeasonFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TmdbSeason extends Model
{
    /** @use HasFactory<TmdbSeasonFactory> */
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'tmdb_seasons';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tmdb_title_id',
        'tmdb_season_id',
        'season_number',
        'name',
        'name_tr',
        'name_en',
        'overview',
        'overview_tr',
        'overview_en',
        'poster_path',
        'episode_count',
        'air_date',
        'vote_average',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'tmdb_title_id' => 'integer',
        'tmdb_season_id' => 'integer',
        'season_number' => 'integer',
        'episode_count' => 'integer',
        'air_date' => 'date',
        'vote_average' => 'float',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'poster_url',
    ];

    /**
     * Belongs to TMDB Title.
     */
    public function title(): BelongsTo
    {
        return $this->belongsTo(TmdbTitle::class, 'tmdb_title_id');
    }

    /**
     * Has many episodes.
     */
    public function episodes(): HasMany
    {
        return $this->hasMany(TmdbEpisode::class, 'tmdb_season_id')->orderBy('episode_number', 'asc');
    }

    /**
     * Get poster image URL.
     */
    public function getPosterUrlAttribute(): ?string
    {
        if (empty($this->poster_path)) {
            return null;
        }

        if (str_starts_with($this->poster_path, 'http')) {
            return $this->poster_path;
        }

        return 'https://image.tmdb.org/t/p/w500/'.ltrim($this->poster_path, '/');
    }
}
