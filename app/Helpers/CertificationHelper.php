<?php

namespace App\Helpers;

class CertificationHelper
{
    /**
     * Map international/TMDB age certifications (e.g. R, PG-13, TV-Y7, TV-MA)
     * to user-friendly Turkish ratings (18+, 13+, 7+, Genel, etc.).
     *
     * Note: Original TMDB data should remain stored in the database.
     * This helper is used for display formatting.
     */
    public static function toTr(?string $certification, ?string $mediaType = null): string
    {
        if (empty($certification)) {
            return $mediaType === 'tv' ? '13+' : 'Genel';
        }

        $clean = strtoupper(trim($certification));

        return match ($clean) {
            // Genel İzleyici
            'G', 'TV-G', 'TV-Y', '0', '0+', 'ALL', 'GENEL', 'GENEL İZLEYİCI', 'GENEL İZLEYİCİ', 'U' => 'Genel',

            // 7 Yaş ve Üzeri
            'PG', 'TV-Y7', 'TV-Y7-FV', '6', '6+', '6A', '7', '7+' => '7+',

            // 10 Yaş ve Üzeri
            'TV-PG', '10', '10+', '10A' => '10+',

            // 13 Yaş ve Üzeri
            'PG-13', 'TV-14', '12', '12+', '12A', '13', '13+', '13A', '14', '14+' => '13+',

            // 16 Yaş ve Üzeri
            '15', '15+', '16', '16+' => '16+',

            // 18 Yaş ve Üzeri / Yetişkin
            'R', 'NC-17', 'TV-MA', '18', '18+', 'X' => '18+',

            // Derecelendirilmemiş
            'NR', 'NOT RATED', 'UNRATED' => '13+',

            default => $clean,
        };
    }
}
