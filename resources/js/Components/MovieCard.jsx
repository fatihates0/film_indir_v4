import React from 'react';
import { Link } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { toTrGenreString, translateGenre } from '../Utils/genreHelper';

export default function MovieCard({
    item = {},
    href,
    poster,
    title,
    rating,
    year,
    genres,
    quality,
    language,
    badge,
    isTv: isTvProp,
    className = '',
    variant = 'standard', // 'standard' | 'overlay'
}) {
    const isTv = isTvProp ?? (
        item.media_type === 'tv' ||
        item.type === 'TV Series' ||
        item.type === 'Dizi' ||
        item.type === 'series'
    );

    const cardHref = href || item.url || item.detail_url || (
        isTv
            ? `/series/${item.slug || item.id}`
            : `/movie/${item.slug || item.id}`
    );

    const cardPoster = poster || item.poster || item.poster_path || item.image;
    const cardTitle = title || item.title || item.name || '';

    // Rating calculation / formatting
    const rawRating = rating ?? item.rating ?? item.vote_average;
    const formattedRating = rawRating != null && rawRating !== ''
        ? (typeof rawRating === 'number' ? (rawRating > 0 ? rawRating.toFixed(1) : rawRating) : rawRating)
        : null;

    // Top-Right Highest Quality Badge
    const rawQuality = quality || item.quality || item.max_quality || item.quality_badge || badge || item.badge || '1080p';
    const cardQuality = typeof rawQuality === 'string'
        ? rawQuality.replace(/\s+(Ultra\s+HD|Full\s+HD|HD|SD)/i, '').trim()
        : rawQuality;

    // Top-Right Language Badge (directly under Quality)
    const resolveLanguage = () => {
        if (language) return language;
        if (item.language) return item.language;
        if (item.language_badge) return item.language_badge;
        if (item.lang) return item.lang;
        if (item.audio) return item.audio;

        const props = Array.isArray(item.properties) ? item.properties : [];
        const propsUpper = props.map(p => String(p).toUpperCase());

        if (propsUpper.includes('DUAL') || propsUpper.includes('IKILI')) return 'DUAL';
        if (propsUpper.includes('TR DUBLAJ') || propsUpper.includes('TR') || propsUpper.includes('TRDUB')) return 'TR';
        if (propsUpper.includes('TR ALTYAZI') || propsUpper.includes('ALTYAZI') || propsUpper.includes('TRSUB')) return 'Altyazı';
        if (propsUpper.includes('MULTI')) return 'DUAL';

        return 'DUAL';
    };

    const cardLanguage = resolveLanguage();

    // Genres string
    const rawGenres = genres ?? item.genres;
    const genresString = toTrGenreString(rawGenres, ' · ', 2, isTv ? 'Dizi' : 'Film');

    // Primary Genre for overlay
    const primaryGenre = translateGenre(item.genre || (Array.isArray(rawGenres) && rawGenres.length > 0
        ? rawGenres[0]
        : (typeof rawGenres === 'string' ? rawGenres.split(/[·,]/)[0].trim() : (isTv ? 'Dizi' : 'Film'))));

    // Type / Sub-meta label
    const typeLabel = item.season || (isTv ? 'Dizi' : (item.type || 'Film'));

    // Year
    const cardYear = year ?? item.year ?? (
        item.release_date ? new Date(item.release_date).getFullYear() : null
    );

    if (variant === 'overlay') {
        return (
            <Link
                href={cardHref}
                className={`group block select-none ${className}`}
            >
                <div className="aspect-[2/3] rounded-2xl overflow-hidden relative bg-slate-200 dark:bg-[#0A0D14] border border-slate-300/60 dark:border-white/5 hover:border-[#00B074]/50 transition-all duration-300 shadow-sm hover:shadow-lg">
                    {/* Poster Image */}
                    {cardPoster ? (
                        <img
                            src={cardPoster}
                            alt={cardTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-200 dark:bg-[#0A0D14] flex items-center justify-center text-slate-400 dark:text-gray-500 text-xs">
                            Görsel Yok
                        </div>
                    )}

                    {/* Top-Right Badges Stack: Quality & Language */}
                    <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1 z-10 pointer-events-none">
                        {cardQuality && (
                            <div className="px-2 py-0.5 bg-[#00B074] backdrop-blur-md rounded text-[9px] font-black text-white uppercase tracking-wider shadow-sm">
                                {cardQuality}
                            </div>
                        )}
                        {cardLanguage && (
                            <div className="px-1.5 py-0.5 bg-black/75 backdrop-blur-md border border-white/15 rounded text-[8.5px] font-extrabold text-white uppercase tracking-wide shadow-sm">
                                {cardLanguage}
                            </div>
                        )}
                    </div>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />

                    {/* Bottom Card Meta Details */}
                    <div className="absolute bottom-0 inset-x-0 p-3.5 sm:p-4 z-10 pointer-events-none space-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-white tracking-wide truncate group-hover:text-[#00B074] transition-colors drop-shadow-sm">
                            {cardTitle}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                            {formattedRating && (
                                <>
                                    <div className="flex items-center gap-1 text-amber-400 font-semibold">
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                        <span>{formattedRating}</span>
                                    </div>
                                    {(primaryGenre || typeLabel) && <span className="text-gray-500 text-[10px]">•</span>}
                                </>
                            )}
                            {primaryGenre && <span className="text-gray-300 truncate">{primaryGenre}</span>}
                            {primaryGenre && typeLabel && <span className="text-gray-500 text-[10px]">•</span>}
                            {typeLabel && <span className="text-gray-400 shrink-0">{typeLabel}</span>}
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link
            href={cardHref}
            className={`group block select-none ${className}`}
        >
            <div className="aspect-[2/3] rounded-2xl overflow-hidden relative bg-slate-200 dark:bg-[#0A0D14] border border-slate-300/60 dark:border-white/5 group-hover:border-[#00B074]/50 group-hover:shadow-lg dark:group-hover:shadow-xl dark:group-hover:shadow-[#00B074]/10 transition-all duration-300">
                {/* Poster Image */}
                {cardPoster ? (
                    <img
                        src={cardPoster}
                        alt={cardTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-200 dark:bg-[#0A0D14] flex items-center justify-center text-slate-400 dark:text-gray-500 text-xs">
                        Görsel Yok
                    </div>
                )}

                {/* Rating Badge (Top-Left) */}
                {formattedRating && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-extrabold text-amber-400 flex items-center gap-1 border border-white/10 z-10">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{formattedRating}</span>
                    </div>
                )}

                {/* Top-Right Badges Stack: Quality & Language */}
                <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1 z-10 pointer-events-none">
                    {cardQuality && (
                        <div className="px-2 py-0.5 bg-[#00B074] backdrop-blur-md rounded text-[9px] font-black text-white uppercase tracking-wider shadow-sm">
                            {cardQuality}
                        </div>
                    )}
                    {cardLanguage && (
                        <div className="px-1.5 py-0.5 bg-black/75 backdrop-blur-md border border-white/15 rounded text-[8.5px] font-extrabold text-white uppercase tracking-wide shadow-sm">
                            {cardLanguage}
                        </div>
                    )}
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* Bottom Card Meta Details */}
                <div className="absolute bottom-3 left-3 right-3 space-y-1 pointer-events-none z-10">
                    <h3 className="text-xs font-bold text-white truncate group-hover:text-[#00B074] transition-colors">
                        {cardTitle}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-gray-300">
                        <span className="truncate">{genresString}</span>
                        {cardYear && <span>{cardYear}</span>}
                    </div>
                </div>
            </div>
        </Link>
    );
}

export { MovieCard as PosterCard };
