<?php

namespace App\Helpers;

class GenreHelper
{
    /**
     * Map international/English TMDB genre names to friendly Turkish genre names.
     */
    protected static array $genreMap = [
        'action' => 'Aksiyon',
        'adventure' => 'Macera',
        'animation' => 'Animasyon',
        'comedy' => 'Komedi',
        'crime' => 'Suç',
        'documentary' => 'Belgesel',
        'drama' => 'Dram',
        'family' => 'Aile',
        'fantasy' => 'Fantastik',
        'history' => 'Tarih',
        'horror' => 'Korku',
        'music' => 'Müzik',
        'mystery' => 'Gizem',
        'romance' => 'Romantik',
        'science fiction' => 'Bilim Kurgu',
        'sci-fi' => 'Bilim Kurgu',
        'tv movie' => 'TV Filmi',
        'thriller' => 'Gerilim',
        'war' => 'Savaş',
        'western' => 'Vahşi Batı',
        // TV specific genres
        'action & adventure' => 'Aksiyon & Macera',
        'kids' => 'Çocuk',
        'news' => 'Haber',
        'reality' => 'Reality-TV',
        'sci-fi & fantasy' => 'Bilim Kurgu & Fantastik',
        'soap' => 'Pembe Dizi',
        'talk' => 'Sohbet',
        'war & politics' => 'Savaş & Politika',
    ];

    /**
     * Translate a single genre name to Turkish.
     */
    public static function translate(?string $genre): string
    {
        if (empty($genre)) {
            return '';
        }

        $trimmed = trim($genre);
        $lower = mb_strtolower($trimmed, 'UTF-8');

        return static::$genreMap[$lower] ?? $trimmed;
    }

    /**
     * Translate a list of genres to Turkish array.
     *
     * @param  array<string>|string|null  $genres
     * @return array<string>
     */
    public static function toTrList(mixed $genres): array
    {
        if (empty($genres)) {
            return [];
        }

        if (is_string($genres)) {
            $genres = preg_split('/[,·•|\/]+/', $genres);
        }

        if (! is_array($genres)) {
            return [];
        }

        $result = [];
        foreach ($genres as $genre) {
            if (! is_string($genre)) {
                continue;
            }
            $clean = trim($genre);
            if ($clean === '') {
                continue;
            }
            $result[] = static::translate($clean);
        }

        return array_values(array_unique($result));
    }

    /**
     * Convert genres into a Turkish formatted separator string (e.g. "Aksiyon · Bilim Kurgu").
     *
     * @param  array<string>|string|null  $genres
     */
    public static function toTrString(mixed $genres, string $separator = ' · ', int $limit = 0, string $fallback = 'Film'): string
    {
        $list = static::toTrList($genres);

        if (empty($list)) {
            return $fallback;
        }

        if ($limit > 0) {
            $list = array_slice($list, 0, $limit);
        }

        return implode($separator, $list);
    }

    /**
     * Map a Turkish genre back to its original DB English names.
     * E.g. "Aksiyon" -> ['Action', 'Action & Adventure', 'Aksiyon']
     *
     * @return array<string>
     */
    public static function getDbGenreNames(?string $trGenre): array
    {
        if (empty($trGenre) || $trGenre === 'Tümü' || $trGenre === 'All') {
            return [];
        }

        $clean = trim($trGenre);
        $lower = mb_strtolower($clean, 'UTF-8');
        $matches = [$clean];

        foreach (static::$genreMap as $orig => $tr) {
            if (mb_strtolower($tr, 'UTF-8') === $lower || mb_strtolower($orig, 'UTF-8') === $lower) {
                $matches[] = ucwords($orig);
                $matches[] = $orig;
            }
        }

        return array_values(array_unique($matches));
    }

    /**
     * Get unique, clean Turkish genre filters for movies or series.
     *
     * @return array<string>
     */
    public static function getAvailableGenresList(): array
    {
        return [
            'Tümü',
            'Aksiyon',
            'Macera',
            'Animasyon',
            'Komedi',
            'Suç',
            'Dram',
            'Fantastik',
            'Korku',
            'Gizem',
            'Romantik',
            'Bilim Kurgu',
            'Gerilim',
            'Aile',
            'Tarih',
            'Savaş',
            'Belgesel',
        ];
    }
}
