<?php

namespace App\Helpers;

use App\Models\TmdbTitle;

class QualityHelper
{
    /**
     * Quality hierarchy weights.
     */
    protected static array $weights = [
        '2160p' => 500,
        '4k' => 500,
        'uhd' => 500,
        '1080p' => 400,
        'm1080p' => 380,
        '720p' => 300,
        'm720p' => 280,
        '480p' => 200,
        'sd' => 150,
    ];

    /**
     * Format a raw quality string into a clean, modern display label.
     */
    public static function formatDisplayLabel(?string $rawQuality, string $fallback = '1080p Full HD'): string
    {
        if (empty($rawQuality)) {
            return $fallback;
        }

        $clean = strtolower(trim($rawQuality));

        return match ($clean) {
            '2160p', '4k', 'uhd', 'm2160p' => '4K Ultra HD',
            '1080p', 'm1080p', 'fullhd', 'full-hd' => '1080p Full HD',
            '720p', 'm720p', 'hd' => '720p HD',
            '480p', 'sd' => '480p SD',
            default => strtoupper($clean),
        };
    }

    /**
     * Get quality weight for comparison.
     */
    public static function getWeight(?string $quality): int
    {
        if (empty($quality)) {
            return 0;
        }

        $clean = strtolower(trim($quality));

        return static::$weights[$clean] ?? 100;
    }

    /**
     * Get the highest quality available among files for a movie.
     */
    public static function getMovieQuality(TmdbTitle $movie): string
    {
        $files = $movie->relationLoaded('mediaFiles')
            ? $movie->mediaFiles
            : $movie->mediaFiles()->get(['id', 'tmdb_title_id', 'quality', 'name', 'properties']);

        if ($files->isEmpty()) {
            return '1080p Full HD';
        }

        $bestQuality = null;
        $maxWeight = -1;

        foreach ($files as $file) {
            $rawQuality = $file->quality;

            // If quality column is empty, attempt to parse from filename or properties
            if (empty($rawQuality)) {
                $name = $file->name ?? '';
                $props = is_array($file->properties) ? implode(' ', $file->properties) : '';
                $combined = $name.' '.$props;

                if (preg_match('/\b(2160p|4k|uhd)\b/i', $combined)) {
                    $rawQuality = '2160p';
                } elseif (preg_match('/\bm1080p\b/i', $combined)) {
                    $rawQuality = 'm1080p';
                } elseif (preg_match('/\b(1080p|fullhd)\b/i', $combined)) {
                    $rawQuality = '1080p';
                } elseif (preg_match('/\bm720p\b/i', $combined)) {
                    $rawQuality = 'm720p';
                } elseif (preg_match('/\b(720p|hd)\b/i', $combined)) {
                    $rawQuality = '720p';
                } elseif (preg_match('/\b(480p|sd)\b/i', $combined)) {
                    $rawQuality = '480p';
                }
            }

            if (empty($rawQuality)) {
                continue;
            }

            $weight = static::getWeight($rawQuality);
            if ($weight > $maxWeight) {
                $maxWeight = $weight;
                $bestQuality = $rawQuality;
            }
        }

        return static::formatDisplayLabel($bestQuality, '1080p Full HD');
    }

    /**
     * Get the most frequent quality among all episode files for a TV series.
     * If counts are tied, the higher quality wins.
     */
    public static function getSeriesQuality(TmdbTitle $series): string
    {
        $files = $series->relationLoaded('mediaFiles')
            ? $series->mediaFiles
            : $series->mediaFiles()->get(['id', 'tmdb_title_id', 'quality']);

        if ($files->isEmpty()) {
            return '1080p Full HD';
        }

        // Count occurrences of each quality
        $counts = [];
        foreach ($files as $file) {
            $rawQuality = $file->quality;
            if (empty($rawQuality)) {
                continue;
            }
            $clean = strtolower(trim($rawQuality));
            $counts[$clean] = ($counts[$clean] ?? 0) + 1;
        }

        if (empty($counts)) {
            return '1080p Full HD';
        }

        // Find the most frequent quality, breaking ties by quality weight
        $mostFrequentQuality = null;
        $maxCount = -1;
        $bestWeight = -1;

        foreach ($counts as $quality => $count) {
            $weight = static::getWeight($quality);

            if ($count > $maxCount) {
                $maxCount = $count;
                $bestWeight = $weight;
                $mostFrequentQuality = $quality;
            } elseif ($count === $maxCount) {
                // Break tie using quality weight
                if ($weight > $bestWeight) {
                    $bestWeight = $weight;
                    $mostFrequentQuality = $quality;
                }
            }
        }

        return static::formatDisplayLabel($mostFrequentQuality, '1080p Full HD');
    }

    /**
     * Get short quality badge (e.g. 4K, 1080p, 720p).
     */
    public static function getShortQuality(TmdbTitle $title): string
    {
        $full = $title->media_type === 'tv'
            ? static::getSeriesQuality($title)
            : static::getMovieQuality($title);

        if (str_contains($full, '4K')) {
            return '4K';
        }
        if (str_contains($full, '1080p')) {
            return '1080p';
        }
        if (str_contains($full, '720p')) {
            return '720p';
        }
        if (str_contains($full, '480p')) {
            return '480p';
        }

        return '1080p';
    }

    /**
     * Get language badge (DUAL, TR, Altyazı, etc.) for a title based on its media files.
     */
    public static function getLanguageBadge(TmdbTitle $title): string
    {
        $files = $title->relationLoaded('mediaFiles')
            ? $title->mediaFiles
            : $title->mediaFiles()->get(['id', 'tmdb_title_id', 'properties', 'name']);

        if ($files->isEmpty()) {
            return 'DUAL';
        }

        // 1. Check for Dual audio
        foreach ($files as $file) {
            $props = is_array($file->properties) ? $file->properties : [];
            $name = $file->name ?? '';
            $combined = strtoupper(implode(' ', $props).' '.$name);

            if (str_contains($combined, 'DUAL') || str_contains($combined, 'IKILI')) {
                return 'DUAL';
            }
        }

        // 2. Check for TR Dubbed
        foreach ($files as $file) {
            $props = is_array($file->properties) ? $file->properties : [];
            $name = $file->name ?? '';
            $combined = strtoupper(implode(' ', $props).' '.$name);

            if (str_contains($combined, 'TRDUB') || str_contains($combined, 'TURKCE DUBLAJ') || str_contains($combined, 'TR DUBLAJ')) {
                return 'TR';
            }
        }

        // 3. Check for Subtitled
        foreach ($files as $file) {
            $props = is_array($file->properties) ? $file->properties : [];
            $name = $file->name ?? '';
            $combined = strtoupper(implode(' ', $props).' '.$name);

            if (str_contains($combined, 'TRSUB') || str_contains($combined, 'ALTYAZI') || str_contains($combined, 'TURKCE ALTYAZI')) {
                return 'Altyazı';
            }
        }

        return 'DUAL';
    }
}
