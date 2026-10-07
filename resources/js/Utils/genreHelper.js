/**
 * Map international/English TMDB genre names to friendly Turkish genre names.
 */
const genreMap = {
    'action': 'Aksiyon',
    'adventure': 'Macera',
    'animation': 'Animasyon',
    'comedy': 'Komedi',
    'crime': 'Suç',
    'documentary': 'Belgesel',
    'drama': 'Dram',
    'family': 'Aile',
    'fantasy': 'Fantastik',
    'history': 'Tarih',
    'horror': 'Korku',
    'music': 'Müzik',
    'mystery': 'Gizem',
    'romance': 'Romantik',
    'science fiction': 'Bilim Kurgu',
    'sci-fi': 'Bilim Kurgu',
    'tv movie': 'TV Filmi',
    'thriller': 'Gerilim',
    'war': 'Savaş',
    'western': 'Vahşi Batı',
    // TV specific
    'action & adventure': 'Aksiyon & Macera',
    'kids': 'Çocuk',
    'news': 'Haber',
    'reality': 'Reality-TV',
    'sci-fi & fantasy': 'Bilim Kurgu & Fantastik',
    'soap': 'Pembe Dizi',
    'talk': 'Sohbet',
    'war & politics': 'Savaş & Politika',
};

/**
 * Translate a single genre name to Turkish.
 */
export function translateGenre(genre) {
    if (!genre) return '';
    const clean = String(genre).trim();
    const lower = clean.toLowerCase();
    return genreMap[lower] || clean;
}

/**
 * Translate genres to an array of Turkish genre strings.
 */
export function toTrGenreList(genres) {
    if (!genres) return [];
    
    let list = [];
    if (Array.isArray(genres)) {
        list = genres;
    } else if (typeof genres === 'string') {
        list = genres.split(/[,·•|\/]+/);
    } else {
        return [];
    }

    const unique = [];
    for (const item of list) {
        if (!item) continue;
        const translated = translateGenre(item);
        if (translated && !unique.includes(translated)) {
            unique.push(translated);
        }
    }

    return unique;
}

/**
 * Format genres as a Turkish display string.
 */
export function toTrGenreString(genres, separator = ' · ', limit = 0, fallback = 'Film') {
    const list = toTrGenreList(genres);
    if (!list || list.length === 0) return fallback;
    const sliced = limit > 0 ? list.slice(0, limit) : list;
    return sliced.join(separator);
}
