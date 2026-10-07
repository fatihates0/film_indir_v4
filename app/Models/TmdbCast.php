<?php

namespace App\Models;

use Database\Factories\TmdbCastFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TmdbCast extends Model
{
    /** @use HasFactory<TmdbCastFactory> */
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'tmdb_casts';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tmdb_title_id',
        'tmdb_person_id',
        'name',
        'character',
        'role_type',
        'department',
        'job',
        'profile_path',
        'order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'tmdb_title_id' => 'integer',
        'tmdb_person_id' => 'integer',
        'order' => 'integer',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'profile_url',
    ];

    /**
     * Belongs to TMDB Title.
     */
    public function title(): BelongsTo
    {
        return $this->belongsTo(TmdbTitle::class, 'tmdb_title_id');
    }

    /**
     * Get profile image URL.
     */
    public function getProfileUrlAttribute(): ?string
    {
        if (empty($this->profile_path)) {
            return null;
        }

        if (str_starts_with($this->profile_path, 'http')) {
            return $this->profile_path;
        }

        return 'https://image.tmdb.org/t/p/w185/'.ltrim($this->profile_path, '/');
    }

    /**
     * Scope for actor cast members.
     */
    public function scopeActors(Builder $query): Builder
    {
        return $query->where('role_type', 'cast')->orderBy('order', 'asc');
    }

    /**
     * Scope for crew members.
     */
    public function scopeCrew(Builder $query): Builder
    {
        return $query->where('role_type', 'crew');
    }

    /**
     * Scope for directors.
     */
    public function scopeDirectors(Builder $query): Builder
    {
        return $query->where('role_type', 'crew')->where(function ($q) {
            $q->where('job', 'Director')->orWhere('department', 'Directing');
        });
    }
}
