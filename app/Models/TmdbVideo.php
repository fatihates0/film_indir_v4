<?php

namespace App\Models;

use Database\Factories\TmdbVideoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TmdbVideo extends Model
{
    /** @use HasFactory<TmdbVideoFactory> */
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'tmdb_videos';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tmdb_title_id',
        'tmdb_video_id',
        'name',
        'site',
        'key',
        'type',
        'size',
        'official',
        'published_at',
        'iso_639_1',
        'sort_order',
        'is_dubbed',
        'is_subtitled',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'tmdb_title_id' => 'integer',
        'size' => 'integer',
        'official' => 'boolean',
        'published_at' => 'datetime',
        'sort_order' => 'integer',
        'is_dubbed' => 'boolean',
        'is_subtitled' => 'boolean',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'video_url',
        'embed_url',
        'label',
    ];

    /**
     * Belongs to TMDB Title.
     */
    public function title(): BelongsTo
    {
        return $this->belongsTo(TmdbTitle::class, 'tmdb_title_id');
    }

    /**
     * Get direct video URL (e.g. YouTube watch URL).
     */
    public function getVideoUrlAttribute(): ?string
    {
        if (strtolower((string) $this->site) === 'youtube' && ! empty($this->key)) {
            return "https://www.youtube.com/watch?v={$this->key}";
        }

        return null;
    }

    /**
     * Get video embed URL (e.g. YouTube embed URL).
     */
    public function getEmbedUrlAttribute(): ?string
    {
        if (strtolower((string) $this->site) === 'youtube' && ! empty($this->key)) {
            return "https://www.youtube.com/embed/{$this->key}?autoplay=1&cc_load_policy=0";
        }

        return null;
    }

    /**
     * Get user-friendly display label (e.g. Türkçe Dublaj Fragman, Türkçe Altyazılı Fragman, Orijinal Fragman).
     */
    public function getLabelAttribute(): string
    {
        $name = trim((string) $this->name);
        $iso = strtolower((string) $this->iso_639_1);

        if ($this->is_dubbed) {
            return 'Türkçe Dublaj Fragman';
        }

        if ($this->is_subtitled) {
            return 'Türkçe Altyazılı Fragman';
        }

        if ($iso === 'tr') {
            return $name ?: 'Türkçe Fragman';
        }

        if (strtolower((string) $this->type) === 'trailer') {
            return $name ?: 'Orijinal Fragman';
        }

        return $name ?: 'Fragman';
    }

    /**
     * Scope for trailers ordered by priority.
     */
    public function scopeTrailers(Builder $query): Builder
    {
        return $query->where('type', 'Trailer')
            ->orderBy('sort_order', 'asc')
            ->orderByDesc('official');
    }
}
