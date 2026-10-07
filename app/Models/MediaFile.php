<?php

namespace App\Models;

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
     * Parse film/series title, year, quality, properties and category from filename and path.
     *
     * @return array{clean_title: string, year: ?int, quality: ?string, category: string, properties: list<string>}
     */
    public static function parseMetadata(string $filename, string $path): array
    {
        $raw = pathinfo($filename, PATHINFO_FILENAME);

        // Quality detection
        $quality = null;
        if (preg_match('/\b(2160p|4k|uhd)\b/i', $raw)) {
            $quality = '2160p';
        } elseif (preg_match('/\bm1080p\b/i', $raw)) {
            $quality = 'm1080p';
        } elseif (preg_match('/\b(1080p|fullhd)\b/i', $raw)) {
            $quality = '1080p';
        } elseif (preg_match('/\bm720p\b/i', $raw)) {
            $quality = 'm720p';
        } elseif (preg_match('/\b(720p|hd)\b/i', $raw)) {
            $quality = '720p';
        } elseif (preg_match('/\b(480p|sd)\b/i', $raw)) {
            $quality = '480p';
        }

        // Year detection (1920 - 2099)
        $year = null;
        if (preg_match('/\b(19\d{2}|20\d{2})\b/', $raw, $yearMatch)) {
            $year = (int) $yearMatch[1];
        }

        // Category detection based on folder path and filename
        $category = self::detectCategory($filename, $path);

        // Extract media properties (features): Atmos, Bluray, DV, HDR, IMAX, DUAL, etc.
        $properties = self::parseProperties($filename);

        // Clean title generation: strip scene tags, codecs, resolutions
        $clean = $raw;

        // Strip season & episode tags for cleaner series title (S01E01, 1x01, Season 01, S01, etc.)
        $clean = preg_replace('/[._\s-]s\d{1,2}e\d{1,2}.*/i', '', $clean);
        $clean = preg_replace('/[._\s-]\d{1,2}x\d{1,2}.*/i', '', $clean);
        $clean = preg_replace('/[._\s-](season|sezon)[._\s-]?\d{1,2}.*/i', '', $clean);
        $clean = preg_replace('/[._\s-]s\d{1,2}(?![0-9a-z]).*/i', '', $clean);

        // Cut off everything after year if year is present
        if ($year && preg_match('/^(.*?)\b'.$year.'\b/i', $clean, $m)) {
            $clean = $m[1];
        } else {
            // Cut off at first occurrence of resolution or common release tags
            $patterns = [
                '/\b(2160p|1080p|m1080p|720p|m720p|480p|uhd|bluray|web-dl|webrip|remux|hdtv|dual|ac3|dts|x264|x265|hevc|h264|h265)\b.*/i',
            ];
            $clean = preg_replace($patterns, '', $clean);
        }

        // Replace dots, underscores, hyphens with spaces
        $clean = str_replace(['.', '_', '-'], ' ', $clean);
        $clean = trim(preg_replace('/\s+/', ' ', $clean));

        if (empty($clean)) {
            $clean = pathinfo($filename, PATHINFO_FILENAME);
        }

        return [
            'clean_title' => $clean,
            'year' => $year,
            'quality' => $quality,
            'category' => $category,
            'properties' => $properties,
        ];
    }

    /**
     * Detect whether a file is a movie or series based on directory structure and filename patterns.
     */
    public static function detectCategory(string $filename, string $path): string
    {
        $raw = pathinfo($filename, PATHINFO_FILENAME);
        $normalizedPath = strtolower(str_replace('\\', '/', $path));
        $dirPath = dirname($normalizedPath);

        // 1. Check directory path for TV series folder indicators (as directory segments)
        if (
            preg_match('/(?:^|[\/_-])(dizi|diziler|series|tv[._\s-]?shows|tv[._\s-]?series)(?:$|[\/_-])/i', $dirPath) ||
            preg_match('/(?:^|[\/_-])(sezon|season)[._\s-]?\d{1,2}(?:$|[\/_-])/i', $dirPath) ||
            preg_match('/(?:^|[\/_-])s\d{1,2}(?:$|[\/_-])/i', $dirPath)
        ) {
            return 'series';
        }

        // Check for episode tag in filename (e.g. S01E01, 1x01)
        $hasEpisodeTag = preg_match('/[._\s-]s\d{1,2}e\d{1,2}[._\s-]/i', '.'.$raw.'.') ||
                         preg_match('/[._\s-]\d{1,2}x\d{1,2}[._\s-]/i', '.'.$raw.'.');

        // If in a Film/Movies folder and has no explicit S01E01 tag, it is a movie
        if (! $hasEpisodeTag && preg_match('/(?:^|[\/_-])(film|filmler|movies|movie|4k)(?:$|[\/_-])/i', $dirPath)) {
            return 'movie';
        }

        // 2. Check filename for Season/Episode patterns: S01E01, s1e2, 1x01
        if ($hasEpisodeTag) {
            return 'series';
        }

        // 3. Check filename for explicit Season pack indicators: Season.1, Sezon.01, 1.Sezon, Sezon.1
        // Must NOT match "Happiest.Season.2020" or "Wedding.Season.2022" (where Season is followed by year)
        if (
            preg_match('/[._\s-](season|sezon)[._\s-]?\d{1,2}(?![0-9])([._\s-]|$)/i', '.'.$raw.'.') ||
            preg_match('/[._\s-]\d{1,2}[._\s-](season|sezon)([._\s-]|$)/i', '.'.$raw.'.')
        ) {
            return 'series';
        }

        // 4. Standalone S01, S02 tag (must NOT match "Season.2020" or "Season.2022")
        if (preg_match('/[._\s-]s\d{1,2}(?![0-9a-z])([._\s-]|$)/i', '.'.$raw.'.')) {
            return 'series';
        }

        return 'movie';
    }

    /**
     * Extract specific audio, video, dynamic range, source, and release properties from filename.
     * Excludes generic terms like 'Film', 'Dizi' or file extensions like '.mkv'.
     *
     * @return list<string>
     */
    public static function parseProperties(string $filename): array
    {
        $raw = pathinfo($filename, PATHINFO_FILENAME);
        $properties = [];

        // 1. Resolution / Quality
        if (preg_match('/\b(2160p|4k|uhd)\b/i', $raw)) {
            $properties[] = '2160p';
        } elseif (preg_match('/\bm1080p\b/i', $raw)) {
            $properties[] = 'm1080p';
        } elseif (preg_match('/\b(1080p|fullhd)\b/i', $raw)) {
            $properties[] = '1080p';
        } elseif (preg_match('/\bm720p\b/i', $raw)) {
            $properties[] = 'm720p';
        } elseif (preg_match('/\b720p\b/i', $raw)) {
            $properties[] = '720p';
        } elseif (preg_match('/\b(480p|sd)\b/i', $raw)) {
            $properties[] = '480p';
        }

        // 2. Source / Format
        if (preg_match('/\bremux\b/i', $raw)) {
            $properties[] = 'Remux';
        } elseif (preg_match('/\b(bluray|blu-ray|bdrip|brrip)\b/i', $raw)) {
            $properties[] = 'BluRay';
        } elseif (preg_match('/\b(web-dl|webdl)\b/i', $raw)) {
            $properties[] = 'WEB-DL';
        } elseif (preg_match('/\b(webrip|web-rip)\b/i', $raw)) {
            $properties[] = 'WEBRip';
        } elseif (preg_match('/\bhdtv\b/i', $raw)) {
            $properties[] = 'HDTV';
        }

        // 3. Dynamic Range & Presentation (DV, HDR, IMAX)
        if (preg_match('/\b(dv|dovi|dolbyvision|dolby[._\s-]vision)\b/i', $raw)) {
            $properties[] = 'DV';
        }

        if (preg_match('/\bhdr10\+\b/i', $raw)) {
            $properties[] = 'HDR10+';
        } elseif (preg_match('/\bhdr10\b/i', $raw)) {
            $properties[] = 'HDR10';
        } elseif (preg_match('/\bhdr\b/i', $raw)) {
            $properties[] = 'HDR';
        }

        if (preg_match('/\b(imax|imax[._\s-]enhanced)\b/i', $raw)) {
            $properties[] = 'IMAX';
        }

        if (preg_match('/\b(10bit|10-bit|hi10p)\b/i', $raw)) {
            $properties[] = '10bit';
        }

        // 4. Audio Features (Atmos, DTS-HD, TrueHD, etc.)
        // Matches "Atmos" and scene variants like "Atmox"
        if (preg_match('/\b(atmos|atmox|dolby[._\s-]atmos)\b/i', $raw)) {
            $properties[] = 'Atmos';
        }

        if (preg_match('/\b(truehd|true-hd)\b/i', $raw)) {
            $properties[] = 'TrueHD';
        }

        if (preg_match('/\b(dts-hd[._\s-]ma|dtshdma)\b/i', $raw)) {
            $properties[] = 'DTS-HD MA';
        } elseif (preg_match('/\b(dts-hd|dtshd)\b/i', $raw)) {
            $properties[] = 'DTS-HD';
        } elseif (preg_match('/\bdts\b/i', $raw)) {
            $properties[] = 'DTS';
        }

        if (preg_match('/\b(ddp\d?\.?\d?|dd\+|e-?ac-?3)\b/i', $raw)) {
            $properties[] = 'DDP';
        } elseif (preg_match('/\b(ac3|ac-3|dd5\.1)\b/i', $raw)) {
            $properties[] = 'AC3';
        }

        if (preg_match('/\b(7[._]1)\b/', $raw)) {
            $properties[] = '7.1';
        } elseif (preg_match('/\b(5[._]1)\b/', $raw)) {
            $properties[] = '5.1';
        }

        // 5. Dubbing & Language Tags
        if (preg_match('/\b(dual|ikili)\b/i', $raw)) {
            $properties[] = 'DUAL';
        }

        if (preg_match('/\b(multi|multisubs)\b/i', $raw)) {
            $properties[] = 'MULTI';
        }

        if (preg_match('/\b(trdub|turkce[._\s-]dublaj)\b/i', $raw)) {
            $properties[] = 'TR Dublaj';
        }

        if (preg_match('/\b(trsub|turkce[._\s-]altyazi)\b/i', $raw)) {
            $properties[] = 'TR Altyazı';
        }

        // 6. Video Codecs
        if (preg_match('/\b(x265|x-265)\b/i', $raw)) {
            $properties[] = 'x265';
        } elseif (preg_match('/\b(x264|x-264)\b/i', $raw)) {
            $properties[] = 'x264';
        } elseif (preg_match('/\bhevc\b/i', $raw)) {
            $properties[] = 'HEVC';
        } elseif (preg_match('/\b(avc|h264|h-264)\b/i', $raw)) {
            $properties[] = 'AVC';
        } elseif (preg_match('/\bav1\b/i', $raw)) {
            $properties[] = 'AV1';
        }

        // 7. Special Editions
        if (preg_match('/\b(directors?[._\s-]cut|dc)\b/i', $raw)) {
            $properties[] = "Director's Cut";
        } elseif (preg_match('/\bextended\b/i', $raw)) {
            $properties[] = 'Extended';
        } elseif (preg_match('/\bremastered\b/i', $raw)) {
            $properties[] = 'Remastered';
        } elseif (preg_match('/\bcriterion\b/i', $raw)) {
            $properties[] = 'Criterion';
        } elseif (preg_match('/\bunrated\b/i', $raw)) {
            $properties[] = 'Unrated';
        }

        return array_values(array_unique($properties));
    }
}
