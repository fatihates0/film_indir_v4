<?php

namespace App\Models;

use App\Services\GuessItService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MediaFile extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'storage_box_id',
        'name',
        'path',
        'directory',
        'extension',
        'size_bytes',
        'clean_title',
        'year',
        'quality',
        'properties',
        'category',
        'mime_type',
        'tmdb_title_id',
        'tmdb_match_status',
        'tmdb_match_confidence',
        'tmdb_match_notes',
        'tmdb_matched_at',
        'last_modified_at',
        'scanned_at',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'formatted_size',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'year' => 'integer',
            'properties' => 'array',
            'tmdb_match_confidence' => 'integer',
            'tmdb_matched_at' => 'datetime',
            'last_modified_at' => 'datetime',
            'scanned_at' => 'datetime',
        ];
    }

    /**
     * Storage Box that hosts this media file.
     */
    public function storageBox(): BelongsTo
    {
        return $this->belongsTo(StorageBox::class);
    }

    /**
     * TMDB title metadata matched with this media file.
     */
    public function tmdbTitle(): BelongsTo
    {
        return $this->belongsTo(TmdbTitle::class, 'tmdb_title_id');
    }

    /**
     * Human readable file size (GB or MB).
     */
    protected function formattedSize(): Attribute
    {
        return Attribute::make(
            get: function (): string {
                $bytes = (int) $this->size_bytes;
                if ($bytes >= 1073741824) {
                    return round($bytes / 1073741824, 2).' GB';
                }
                if ($bytes >= 1048576) {
                    return round($bytes / 1048576, 1).' MB';
                }
                if ($bytes >= 1024) {
                    return round($bytes / 1024, 1).' KB';
                }

                return $bytes.' B';
            }
        );
    }

    /**
     * Scope to search by title, filename or path.
     */
    public function scopeSearch(Builder $query, ?string $search): Builder
    {
        if (blank($search)) {
            return $query;
        }

        $term = '%'.trim($search).'%';

        return $query->where(function (Builder $q) use ($term) {
            $q->where('name', 'like', $term)
                ->orWhere('clean_title', 'like', $term)
                ->orWhere('path', 'like', $term);
        });
    }

    /**
     * Scope to filter by storage box ID.
     */
    public function scopeFilterByBox(Builder $query, $boxId): Builder
    {
        if (blank($boxId) || $boxId === 'all') {
            return $query;
        }

        return $query->where('storage_box_id', (int) $boxId);
    }

    /**
     * Scope to filter by category (movie, series, other).
     */
    public function scopeFilterByCategory(Builder $query, ?string $category): Builder
    {
        if (blank($category) || $category === 'all') {
            return $query;
        }

        return $query->where('category', $category);
    }

    /**
     * Scope to filter by quality (2160p, 1080p, 720p).
     */
    public function scopeFilterByQuality(Builder $query, ?string $quality): Builder
    {
        if (blank($quality) || $quality === 'all') {
            return $query;
        }

        return $query->where('quality', $quality);
    }

    /**
     * Scope to filter by file extension (mkv, mp4, etc).
     */
    public function scopeFilterByExtension(Builder $query, ?string $extension): Builder
    {
        if (blank($extension) || $extension === 'all') {
            return $query;
        }

        return $query->where('extension', strtolower(ltrim($extension, '.')));
    }

    /**
     * Scope to filter by TMDB match status (matched, review, unmatched, pending).
     */
    public function scopeFilterByTmdbStatus(Builder $query, ?string $status): Builder
    {
        if (blank($status) || $status === 'all') {
            return $query;
        }

        return $query->where('tmdb_match_status', $status);
    }

    /**
     * Parse film/series title, year, quality, properties and category from filename and path using guessit-js.
     *
     * @return array{clean_title: string, year: ?int, quality: ?string, category: string, properties: list<string>}
     */
    public static function parseMetadata(string $filename, string $path): array
    {
        return GuessItService::parse($filename, $path);
    }

    /**
     * Detect whether a file is a movie or series based on directory structure and filename patterns.
     */
    public static function detectCategory(string $filename, string $path): string
    {
        return GuessItService::parse($filename, $path)['category'];
    }

    /**
     * Extract specific audio, video, dynamic range, source, and release properties from filename.
     *
     * @return list<string>
     */
    public static function parseProperties(string $filename): array
    {
        return GuessItService::parse($filename)['properties'];
    }
}
