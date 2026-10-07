<?php

namespace App\Models;

use Database\Factories\TmdbEpisodeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TmdbEpisode extends Model
{
    /** @use HasFactory<TmdbEpisodeFactory> */
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'tmdb_episodes';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tmdb_title_id',
        'tmdb_season_id',
        'tmdb_episode_id',
        'season_number',
        'episode_number',
        'name',
        'name_tr',
        'name_en',
        'overview',
        'overview_tr',
        'overview_en',
        'still_path',
        'air_date',
        'vote_average',
        'runtime',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'tmdb_title_id' => 'integer',
        'tmdb_season_id' => 'integer',
        'tmdb_episode_id' => 'integer',
        'season_number' => 'integer',
        'episode_number' => 'integer',
        'runtime' => 'integer',
        'air_date' => 'date',
        'vote_average' => 'float',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'still_url',
    ];

    /**
     * Belongs to season.
     */
    public function season(): BelongsTo
    {
        return $this->belongsTo(TmdbSeason::class, 'tmdb_season_id');
    }

    /**
     * Belongs to title.
     */
    public function title(): BelongsTo
    {
        return $this->belongsTo(TmdbTitle::class, 'tmdb_title_id');
    }

    /**
     * Get still image URL.
     */
    public function getStillUrlAttribute(): ?string
    {
        if (empty($this->still_path)) {
            return null;
        }

        if (str_starts_with($this->still_path, 'http')) {
            return $this->still_path;
        }

        return 'https://image.tmdb.org/t/p/w300/'.ltrim($this->still_path, '/');
    }
}
