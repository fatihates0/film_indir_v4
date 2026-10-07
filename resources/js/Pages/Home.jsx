import React, { useState, useRef, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import { Play, Plus, Volume2, VolumeX, Star, Bookmark, ChevronLeft, ChevronRight, Clapperboard, Sparkles, Film } from 'lucide-react';
import MovieCard from '../Components/MovieCard';
import { toTrGenreString } from '../Utils/genreHelper';
import HeroTrailerBackground from '../Components/HeroTrailerBackground';
import { getCinemaVersion, cinemaConfig } from '../Config/cinemaConfig';
import { useHeroIdleFade } from '../Utils/useHeroIdleFade';
import { useTheme } from '../Context/ThemeContext';

export default function Home({
    hero,
    heroSlides = [],
    continueWatching = [],
    popularOfWeek = [],
    justRelease = [],
    watchlist = [],
    likes = [],
    genreSpotlight,
    genreSpotlights = [],
    platforms = []
}) {
    const { theme } = useTheme();
    const slides = Array.isArray(heroSlides) && heroSlides.length > 0 ? heroSlides : (hero ? [hero] : []);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const currentHero = slides[currentSlideIndex] || slides[0] || hero;

    const genreSliderRef = useRef(null);
    const genreCards = Array.isArray(genreSpotlights) && genreSpotlights.length > 0
        ? genreSpotlights
        : [
            {
                name: 'Aksiyon',
                image: genreSpotlight?.backdrop || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=1200',
                title: genreSpotlight?.title || 'Galaksinin Koruyucuları: 3. Bölüm',
                rating: genreSpotlight?.rating || '4.6',
                duration: genreSpotlight?.duration || '2s 40dk',
                year: genreSpotlight?.year || '2022',
                genres: ['Aksiyon', 'Macera'],
                ratingCode: 'PG-13',
                description: genreSpotlight?.description || "Uluslararası suç örgütlerine karşı mücadele eden kahramanların heyecan dolu maceraları.",
                url: genreSpotlight?.url || '/movies?genre=Aksiyon'
            }
        ];

    const [activeGenreIndex, setActiveGenreIndex] = useState(0);
    const [isSpotlightWatchlisted, setIsSpotlightWatchlisted] = useState(false);

    const currentSpotlight = genreCards[activeGenreIndex] || genreCards[0];

    const selectGenreByIndex = (index) => {
        const newIndex = (index + genreCards.length) % genreCards.length;
        setActiveGenreIndex(newIndex);

        if (genreSliderRef.current && genreSliderRef.current.children[newIndex]) {
            const container = genreSliderRef.current;
            const cardEl = container.children[newIndex];
            const targetScrollLeft = cardEl.offsetLeft - (container.clientWidth / 2) + (cardEl.clientWidth / 2);
            container.scrollTo({
                left: Math.max(0, targetScrollLeft),
                behavior: 'smooth'
            });
        }
    };

    const heroRef = useRef(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);

    const trailersList = Array.isArray(currentHero?.trailers) && currentHero.trailers.length > 0
        ? currentHero.trailers
        : (currentHero?.trailer ? [currentHero.trailer] : []);

    const [activeTrailerKey, setActiveTrailerKey] = useState(currentHero?.trailer?.key || trailersList[0]?.key || null);

    useEffect(() => {
        if (currentHero?.trailer?.key) {
            setActiveTrailerKey(currentHero.trailer.key);
        } else if (trailersList[0]?.key) {
            setActiveTrailerKey(trailersList[0].key);
        } else {
            setActiveTrailerKey(null);
        }
    }, [currentHero?.id, currentHero?.trailer?.key]);

    const activeTrailer = trailersList.find(t => t.key === activeTrailerKey) || currentHero?.trailer || trailersList[0] || null;

    const cinemaVersion = getCinemaVersion();
    const isV2Expanded = cinemaVersion === 'v2' && isTrailerPlaying && !isMuted;

    const {
        isHeroHovered,
        isOverlayVisible,
        handleMouseMove,
        handleMouseEnter,
        handleMouseLeave,
    } = useHeroIdleFade({ isMuted, cinemaVersion });

    const popularSliderRef = useRef(null);
    const [popularScrollLeft, setPopularScrollLeft] = useState(false);
    const [popularScrollRight, setPopularScrollRight] = useState(true);

    const releasesSliderRef = useRef(null);
    const [releasesScrollLeft, setReleasesScrollLeft] = useState(false);
    const [releasesScrollRight, setReleasesScrollRight] = useState(true);

    const handlePopularScroll = () => {
        if (!popularSliderRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = popularSliderRef.current;
        setPopularScrollLeft(scrollLeft > 15);
        setPopularScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
    };

    const scrollPopular = (direction) => {
        if (!popularSliderRef.current) return;
        const container = popularSliderRef.current;
        const firstCard = container.children[0];
        if (!firstCard) return;

        const gap = 24; // gap-6
        const cardWidthWithGap = firstCard.getBoundingClientRect().width + gap;
        const cardsToAdvance = typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : (window.innerWidth < 1024 ? 2 : 3);
        const scrollAmount = cardWidthWithGap * cardsToAdvance;

        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    const handleReleasesScroll = () => {
        if (!releasesSliderRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = releasesSliderRef.current;
        setReleasesScrollLeft(scrollLeft > 15);
        setReleasesScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
    };

    const scrollReleases = (direction) => {
        if (!releasesSliderRef.current) return;
        const container = releasesSliderRef.current;
        const firstCard = container.children[0];
        if (!firstCard) return;

        const gap = typeof window !== 'undefined' && window.innerWidth >= 640 ? 20 : 16;
        const cardWidthWithGap = firstCard.getBoundingClientRect().width + gap;
        const cardsToAdvance = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 4 : (window.innerWidth >= 768 ? 3 : (window.innerWidth >= 640 ? 2 : 1));
        const scrollAmount = cardWidthWithGap * cardsToAdvance;

        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        handlePopularScroll();
        handleReleasesScroll();
        const handleResize = () => {
            handlePopularScroll();
            handleReleasesScroll();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [popularOfWeek, justRelease]);

    const heroGenres = toTrGenreString(currentHero?.genres, ' • ', 3, 'Popüler');

    return (
        <Layout transparentNavbar={true}>
            {/* HERO SECTION */}
            {currentHero && (
                <div
                    ref={heroRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseMove={handleMouseMove}
                    className={`relative w-full overflow-hidden group/hero transition-all duration-1000 ease-out ${isV2Expanded
                        ? (cinemaConfig?.v2?.expandedHeroHeight || 'h-[85vh] sm:h-[92vh] lg:h-screen')
                        : 'h-[640px] sm:h-[720px] lg:h-[780px]'
                        }`}
                >
                    {/* Backdrop / Live Background Trailer */}
                    <HeroTrailerBackground
                        key={currentHero.id || currentSlideIndex}
                        backdrop={currentHero.backdrop}
                        title={currentHero.title}
                        trailer={activeTrailer}
                        trailers={trailersList}
                        onTrailerChange={(newTrailer) => setActiveTrailerKey(newTrailer.key)}
                        isMuted={isMuted}
                        onToggleMute={(forceMute) => setIsMuted(forceMute ?? !isMuted)}
                        heroRef={heroRef}
                        version={cinemaVersion}
                        onPlayStateChange={setIsTrailerPlaying}
                        isOverlayVisible={isOverlayVisible}
                    />

                    {/* Hero Overlay Content */}
                    <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
                        <div
                            className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-10 sm:pb-12 z-10 transition-all duration-700 ${cinemaVersion === 'v2'
                                ? isOverlayVisible
                                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                                    : 'opacity-0 translate-y-6 pointer-events-none'
                                : !isMuted && !isHeroHovered
                                    ? 'opacity-35 lg:opacity-25 translate-y-3 pointer-events-auto'
                                    : 'opacity-100 translate-y-0 pointer-events-auto'
                                }`}
                        >
                            {/* Quality / Season Badge & Multi-Trailer Switcher */}
                            <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
                                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#131722]/80 backdrop-blur-md border border-white/15 text-white shadow-sm">
                                    <Sparkles className="w-3.5 h-3.5 text-[#00B074]" />
                                    <span>{currentHero.quality || currentHero.season || '4K Ultra HD'}</span>
                                </div>

                                {!isMuted && trailersList.length > 1 && (
                                    <div className="inline-flex items-center p-1 rounded-full bg-[#131722]/80 backdrop-blur-md border border-white/15 shadow-sm gap-1 animate-in fade-in duration-300 pointer-events-auto">
                                        {trailersList.map((t, idx) => {
                                            const isActive = activeTrailer?.key === t.key;
                                            return (
                                                <button
                                                    key={t.id || t.key || idx}
                                                    onClick={() => setActiveTrailerKey(t.key)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${isActive
                                                        ? 'bg-[#00B074] text-white font-semibold shadow-md shadow-[#00B074]/30 scale-[1.02]'
                                                        : 'text-gray-200 hover:text-white hover:bg-white/10'
                                                        }`}
                                                    title={t.name || t.label}
                                                >
                                                    <Film className={`w-3 h-3 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                                    <span>{t.label || t.name || `Fragman ${idx + 1}`}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Title */}
                            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-3 drop-shadow-md">
                                {currentHero.title}
                            </h1>

                            {/* Metadata line */}
                            <div className="flex flex-wrap items-center gap-2 text-sm text-white/90 font-medium mb-5 drop-shadow-sm">
                                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    <span className="text-white font-extrabold">{currentHero.rating}</span>
                                </span>
                                {currentHero.year && (
                                    <>
                                        <span className="text-white/50 font-bold">•</span>
                                        <span className="text-white/90 font-medium">{currentHero.year}</span>
                                    </>
                                )}
                                {heroGenres && (
                                    <>
                                        <span className="text-white/50 font-bold">•</span>
                                        <span className="text-white/90 font-medium">{heroGenres}</span>
                                    </>
                                )}
                            </div>

                            {/* Description */}
                            <p className="text-xs sm:text-sm text-white/90 line-clamp-3 max-w-2xl leading-relaxed mb-6 font-normal drop-shadow-sm">
                                {currentHero.description}
                            </p>

                            {/* Action Buttons & Sound Toggle Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                <div className="flex items-center gap-3 pointer-events-auto">
                                    <Link
                                        href={currentHero.url || currentHero.detail_url || (currentHero.type === 'Dizi' || currentHero.media_type === 'tv' ? `/series/${currentHero.slug || currentHero.id}` : `/movie/${currentHero.slug || currentHero.id}`)}
                                        className="flex items-center gap-2 px-6 py-3 bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#00B074]/30 transition-all hover:scale-105 cursor-pointer"
                                    >
                                        <Play className="w-4 h-4 fill-white text-white" />
                                        <span>Hemen İzle</span>
                                    </Link>

                                    <Link
                                        href={currentHero.url || currentHero.detail_url || (currentHero.type === 'Dizi' || currentHero.media_type === 'tv' ? `/series/${currentHero.slug || currentHero.id}` : `/movie/${currentHero.slug || currentHero.id}`)}
                                        className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/15 font-semibold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
                                    >
                                        <span>Detayları Gör</span>
                                    </Link>
                                </div>

                                {/* Right group: Carousel Dots & Ambient Sound Toggle Button */}
                                <div className="flex items-center gap-3.5">
                                    {/* Carousel Manual Navigation (Prev/Next & Dots) */}
                                    {slides.length > 1 && (
                                        <div className="flex items-center gap-1.5 bg-slate-900/10 dark:bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-slate-900/20 dark:border-white/15 shadow-md pointer-events-auto">
                                            <button
                                                onClick={() => setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                                                className="p-1 rounded-full text-slate-900 dark:text-white/70 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all cursor-pointer"
                                                title="Önceki İçerik"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>

                                            <div className="flex items-center gap-1.5 px-1">
                                                {slides.map((s, idx) => {
                                                    const isActive = idx === currentSlideIndex;
                                                    return (
                                                        <button
                                                            key={s.id || idx}
                                                            onClick={() => setCurrentSlideIndex(idx)}
                                                            className={`transition-all duration-300 rounded-full cursor-pointer ${isActive
                                                                ? 'w-5 h-2 bg-[#00B074] shadow-md shadow-[#00B074]/50'
                                                                : 'w-2 h-2 bg-slate-900/40 dark:bg-white/40 hover:bg-slate-900/70 dark:hover:bg-white/70'
                                                                }`}
                                                            title={s.title}
                                                        />
                                                    );
                                                })}
                                            </div>

                                            <button
                                                onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % slides.length)}
                                                className="p-1 rounded-full text-slate-900 dark:text-white/70 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all cursor-pointer"
                                                title="Sonraki İçerik"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Ambient Sound Toggle Button */}
                                    <button
                                        onClick={() => {
                                            if (!activeTrailer) return;
                                            setIsMuted(!isMuted);
                                        }}
                                        disabled={!activeTrailer}
                                        className={`p-3.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer flex items-center gap-2 pointer-events-auto ${!activeTrailer
                                            ? 'bg-slate-900/5 dark:bg-white/5 border-slate-900/10 dark:border-white/10 text-slate-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                                            : !isMuted
                                                ? 'bg-[#00B074] hover:bg-[#009663] border-[#00B074] text-white shadow-lg shadow-[#00B074]/30'
                                                : 'bg-slate-900/10 hover:bg-slate-900/15 border-slate-900/20 text-slate-900 dark:bg-black/40 dark:hover:bg-black/70 dark:border-white/15 dark:text-white'
                                            }`}
                                        title={
                                            !activeTrailer
                                                ? 'Fragman bulunamadı'
                                                : isMuted
                                                    ? `${activeTrailer.label || 'Fragman'} Sesini Aç (Sinema Modu - Carousel Duraklatılır)`
                                                    : 'Sesi Kapat (Carousel Devam Eder)'
                                        }
                                    >
                                        {isMuted ? (
                                            <VolumeX className="w-4 h-4" />
                                        ) : (
                                            <Volume2 className="w-4 h-4 animate-pulse text-white" />
                                        )}
                                        {!isMuted && (
                                            <span className="text-xs font-semibold hidden sm:inline">Sesi Kapat</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STREAMING PLATFORMS BAR */}
            {platforms && platforms.length > 0 && (
                <div className="relative border-y border-slate-300/60 dark:border-white/[0.06] bg-slate-200/50 dark:bg-[#07080c] py-6 overflow-hidden">
                    {/* Left & Right gradient fade masks */}
                    <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-36 bg-gradient-to-r from-[#f4f5f8] dark:from-[#07080c] via-[#f4f5f8]/80 dark:via-[#07080c]/80 to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-36 bg-gradient-to-l from-[#f4f5f8] dark:from-[#07080c] via-[#f4f5f8]/80 dark:via-[#07080c]/80 to-transparent z-10 pointer-events-none" />

                    <div className="flex animate-marquee gap-3 sm:gap-4 md:gap-5">
                        {[...platforms, ...platforms, ...platforms, ...platforms].map((p, idx) => {
                            const iconFolder = theme === 'light' ? 'light' : 'dark';
                            const logoSrc = theme === 'light'
                                ? (p.logo_light_url || (p.filename ? `/icons/light/${p.filename}` : p.logo_url?.replace(/\/icons\/(?:dark\/|light\/)?([^/]+)$/, '/icons/light/$1')))
                                : (p.logo_dark_url || (p.filename ? `/icons/dark/${p.filename}` : p.logo_url?.replace(/\/icons\/(?:dark\/|light\/)?([^/]+)$/, '/icons/dark/$1')));

                            return (
                                <div
                                    key={idx}
                                    className="group flex-shrink-0 w-36 sm:w-44 md:w-48 h-20 sm:h-22 border border-slate-300/70 dark:border-white/10 bg-white dark:bg-transparent rounded-[14px] flex items-center justify-center p-3.5 sm:p-4 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:bg-slate-100 dark:hover:bg-[#1a1c24] hover:border-slate-400 dark:hover:border-white/30 hover:scale-[1.04] transition-all duration-300 ease-out cursor-pointer"
                                >
                                    {logoSrc ? (
                                        <img
                                            src={logoSrc}
                                            alt={p.name || 'Platform Logo'}
                                            className="max-h-[52%] max-w-[76%] w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-105 opacity-95 group-hover:opacity-100"
                                        />
                                    ) : (
                                        <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-gray-200 tracking-wider">
                                            {p.name}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 py-12">
                {/* CONTINUE WATCHING */}
                {continueWatching.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">İzlemeye Devam Et</h2>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {continueWatching.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.url || item.detail_url || (item.type === 'Dizi' || item.media_type === 'tv' ? `/series/${item.slug || item.id}` : `/movie/${item.slug || item.id}`)}
                                    className="group block relative rounded-2xl overflow-hidden bg-white dark:bg-[#131722] border border-slate-200 dark:border-white/5 hover:border-[#00B074]/50 transition-all duration-300 shadow-sm dark:shadow-none"
                                >
                                    <div className="aspect-[16/9] w-full relative overflow-hidden bg-black/40">
                                        <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    </div>
                                    <div className="p-3">
                                        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</h3>
                                        <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">{item.year}</p>

                                        {/* Progress Bar */}
                                        <div className="mt-2.5 flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#00B074] rounded-full" style={{ width: `${item.progress}%` }} />
                                            </div>
                                            <span className="text-[9px] text-slate-500 dark:text-gray-400 font-mono">{item.time?.split(' / ')[0]}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* POPULAR OF THE WEEK (WITH BIG NUMBERS & CAROUSEL) */}
                {popularOfWeek.length > 0 && (
                    <section className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Haftanın Popülerleri</h2>
                        </div>

                        {/* Slider Carousel Container */}
                        <div className="relative group/popular">
                            {/* Left Navigation Arrow */}
                            {popularScrollLeft && (
                                <button
                                    onClick={() => scrollPopular('left')}
                                    className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white dark:bg-[#181D2A]/95 hover:bg-slate-100 dark:hover:bg-[#252C3E] text-slate-800 dark:text-white flex items-center justify-center border border-slate-300/60 dark:border-white/10 shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                                    aria-label="Önceki"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}

                            {/* Cards Track */}
                            <div
                                ref={popularSliderRef}
                                onScroll={handlePopularScroll}
                                className="flex gap-6 overflow-x-auto scroll-smooth no-scrollbar py-2"
                            >
                                {popularOfWeek.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.url || item.detail_url || (item.type === 'Dizi' || item.media_type === 'tv' ? `/series/${item.slug || item.id}` : `/movie/${item.slug || item.id}`)}
                                        className="group flex-none flex items-center gap-3.5 sm:gap-4 w-[82%] sm:w-[calc((100%-3rem)/2.5)] lg:w-[calc((100%-4.5rem)/3.5)] cursor-pointer select-none transition-transform hover:-translate-y-0.5"
                                    >
                                        {/* Big Rank Number */}
                                        <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white/95 group-hover:text-[#00B074] transition-colors w-9 sm:w-10 text-center flex-shrink-0 select-none">
                                            {item.rank}
                                        </span>

                                        {/* Poster */}
                                        <div className="w-20 sm:w-[86px] h-28 sm:h-[124px] flex-shrink-0 rounded-xl overflow-hidden relative bg-slate-200 dark:bg-black/40 shadow-md dark:shadow-lg dark:shadow-black/50 border border-slate-300/60 dark:border-white/5">
                                            <img
                                                src={item.poster}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>

                                        {/* Movie Details */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1.5 py-0.5">
                                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-[#00B074] transition-colors" title={item.title}>
                                                {item.title}
                                            </h3>

                                            {/* Category / Genres with Clapperboard Icon */}
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-400 min-w-0">
                                                <Clapperboard className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 flex-shrink-0" />
                                                <span className="truncate">{item.genres}</span>
                                            </div>

                                            {/* Age / Content Rating Badge */}
                                            <div>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-zinc-300 border border-slate-300/60 dark:border-white/5">
                                                    {item.badge || 'Genel'}
                                                </span>
                                            </div>

                                            {/* Rating & Season / Type */}
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                                                <span className="font-bold text-amber-500 dark:text-amber-400">{item.rating}</span>
                                                <span className="text-slate-400 dark:text-zinc-500">•</span>
                                                <span className="text-slate-500 dark:text-zinc-400 font-medium">{item.season || item.type || 'Film'}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {/* Right Dark/Light Gradient Overlay */}
                            <div
                                className={`absolute right-0 top-0 bottom-0 w-24 sm:w-36 lg:w-48 bg-gradient-to-l from-[#f4f5f8] dark:from-[#0A0D14] via-[#f4f5f8]/80 dark:via-[#0A0D14]/80 to-transparent pointer-events-none z-20 transition-opacity duration-300 ${popularScrollRight ? 'opacity-100' : 'opacity-0'}`}
                            />

                            {/* Right Navigation Arrow */}
                            {popularScrollRight && (
                                <button
                                    onClick={() => scrollPopular('right')}
                                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white dark:bg-[#181D2A]/95 hover:bg-slate-100 dark:hover:bg-[#252C3E] text-slate-800 dark:text-white flex items-center justify-center border border-slate-300/60 dark:border-white/10 shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                                    aria-label="Sonraki"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </section>
                )}

                {/* JUST RELEASE */}
                {justRelease.length > 0 && (
                    <section className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Yeni Çıkanlar</h2>
                            <Link
                                href="/releases"
                                className="px-4 py-2 bg-white dark:bg-[#22242A] hover:bg-slate-100 dark:hover:bg-[#2C3038] text-xs font-semibold text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all border border-slate-300/60 dark:border-white/5 shadow-sm"
                            >
                                Tümünü Gör
                            </Link>
                        </div>

                        {/* Slider Carousel Container */}
                        <div className="relative group/slider">
                            {/* Left Navigation Arrow */}
                            {releasesScrollLeft && (
                                <button
                                    onClick={() => scrollReleases('left')}
                                    className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white dark:bg-[#181D2A]/95 hover:bg-slate-100 dark:hover:bg-[#252C3E] text-slate-800 dark:text-white flex items-center justify-center border border-slate-300/60 dark:border-white/10 shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                                    aria-label="Önceki"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}

                            {/* Cards Track */}
                            <div
                                ref={releasesSliderRef}
                                onScroll={handleReleasesScroll}
                                className="flex gap-4 sm:gap-5 overflow-x-auto scroll-smooth no-scrollbar py-2"
                            >
                                {justRelease.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex-none w-[70%] sm:w-[calc((100%-2.5rem)/2.5)] md:w-[calc((100%-3.75rem)/3.5)] lg:w-[calc((100%-5rem)/4.5)]"
                                    >
                                        <MovieCard item={item} variant="overlay" />
                                    </div>
                                ))}
                            </div>

                            {/* Right Dark/Light Gradient Overlay */}
                            <div
                                className={`absolute right-0 top-0 bottom-0 w-24 sm:w-36 lg:w-48 bg-gradient-to-l from-[#f4f5f8] dark:from-[#0A0D14] via-[#f4f5f8]/80 dark:via-[#0A0D14]/80 to-transparent pointer-events-none z-20 transition-opacity duration-300 ${releasesScrollRight ? 'opacity-100' : 'opacity-0'}`}
                            />

                            {/* Right Navigation Arrow */}
                            {releasesScrollRight && (
                                <button
                                    onClick={() => scrollReleases('right')}
                                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white dark:bg-[#181D2A]/95 hover:bg-slate-100 dark:hover:bg-[#252C3E] text-slate-800 dark:text-white flex items-center justify-center border border-slate-300/60 dark:border-white/10 shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                                    aria-label="Sonraki"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </section>
                )}

                {/* YOUR WATCHLIST */}
                {watchlist.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Öne Çıkan Başyapıtlar</h2>
                            <Link href="/movies" className="px-3 py-1.5 bg-white dark:bg-[#1B202E] hover:bg-slate-100 dark:hover:bg-[#252C3E] text-xs font-semibold text-slate-700 dark:text-gray-300 rounded-lg transition-colors border border-slate-300/60 dark:border-transparent shadow-sm dark:shadow-none">
                                Tümünü Gör
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                            {watchlist.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.url || item.detail_url || (item.type === 'Dizi' || item.media_type === 'tv' ? `/series/${item.slug || item.id}` : `/movie/${item.slug || item.id}`)}
                                    className="group block"
                                >
                                    <div className="aspect-[16/9] rounded-2xl overflow-hidden relative bg-slate-200 dark:bg-[#131722] border border-slate-300/60 dark:border-white/5 group-hover:border-[#00B074]/50 transition-all shadow-sm dark:shadow-none">
                                        <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    </div>
                                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-2">{item.title}</h3>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        <span>{item.rating}</span>
                                        <span>·</span>
                                        <span>{item.genres}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* YOUR LIKES / RECOMMENDED */}
                {likes.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Sizin İçin Önerilenler</h2>
                            <Link href="/movies" className="px-3 py-1.5 bg-white dark:bg-[#1B202E] hover:bg-slate-100 dark:hover:bg-[#252C3E] text-xs font-semibold text-slate-700 dark:text-gray-300 rounded-lg transition-colors border border-slate-300/60 dark:border-transparent shadow-sm dark:shadow-none">
                                Tümünü Gör
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                            {likes.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.url || item.detail_url || (item.type === 'Dizi' || item.media_type === 'tv' ? `/series/${item.slug || item.id}` : `/movie/${item.slug || item.id}`)}
                                    className="group block"
                                >
                                    <div className="aspect-[16/9] rounded-2xl overflow-hidden relative bg-slate-200 dark:bg-[#131722] border border-slate-300/60 dark:border-white/5 group-hover:border-[#00B074]/50 transition-all shadow-sm dark:shadow-none">
                                        <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    </div>
                                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-2">{item.title}</h3>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        <span>{item.rating}</span>
                                        <span>·</span>
                                        <span>{item.genres}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

            </div>

            {/* FULL-WIDTH EXPLORE BY GENRE BANNER SPOTLIGHT (RIGHT ABOVE FOOTER) */}
            <section className="relative w-full overflow-hidden bg-[#06080E] border-slate-300/40 dark:border-white/10 mt-16 h-[620px] sm:h-[700px] lg:h-[760px] flex flex-col justify-end">
                {/* Full Width Background Image */}
                <div className="absolute inset-0 z-0 w-full h-full overflow-hidden">
                    <img
                        key={currentSpotlight.name || activeGenreIndex}
                        src={currentSpotlight.image}
                        alt={currentSpotlight.title}
                        className="w-full h-full object-cover object-[center_20%] filter brightness-[0.9] transition-all duration-700 animate-in fade-in"
                    />
                    {/* Dark gradient overlays matching reference design (reduced left gradient opacity) */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#06080E]/95 via-[#06080E]/50 via-40% to-transparent z-10 w-full lg:w-[55%]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#06080E] via-[#06080E]/50 to-transparent z-10" />
                    <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#06080E] to-transparent z-10" />
                </div>

                {/* Main Content Container */}
                <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-10 flex flex-col justify-end">
                    <div className="max-w-2xl space-y-4 mb-8">
                        {/* Explore by the genre Pill */}
                        <div>
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-white/90 shadow-sm">
                                Türe Göre Keşfet
                            </span>
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] drop-shadow-lg">
                            {currentSpotlight.title}
                        </h2>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-semibold">
                            <div className="flex items-center gap-1 text-amber-400 font-extrabold">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span>{currentSpotlight.rating}</span>
                            </div>

                            <span className="text-white/40 font-bold">•</span>
                            <span className="text-[#00B074] font-bold">{currentSpotlight.duration}</span>

                            <span className="text-white/40 font-bold">•</span>
                            <span className="text-[#00B074] font-bold">{currentSpotlight.year}</span>

                            {currentSpotlight.genres.map((g, idx) => (
                                <React.Fragment key={idx}>
                                    <span className="text-white/40 font-bold">•</span>
                                    <span className="text-[#00B074] font-bold">{g}</span>
                                </React.Fragment>
                            ))}

                            <span className="text-white/40 font-bold">•</span>
                            <span className="text-[#00B074] font-bold px-2 py-0.5 rounded-md border border-[#00B074]/30 bg-[#00B074]/10 text-[11px]">
                                {currentSpotlight.ratingCode}
                            </span>
                        </div>

                        {/* Overview */}
                        <p className="text-xs sm:text-sm text-gray-300/90 line-clamp-3 leading-relaxed font-normal max-w-xl drop-shadow-sm">
                            {currentSpotlight.description}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3.5 pt-2">
                            <Link
                                href={currentSpotlight.url}
                                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#00B074]/30 transition-all hover:scale-105 cursor-pointer"
                            >
                                <Play className="w-4 h-4 fill-white text-white" />
                                <span>Hemen İzle</span>
                            </Link>

                            <button
                                onClick={() => setIsSpotlightWatchlisted(!isSpotlightWatchlisted)}
                                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/15 font-semibold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
                            >
                                <Bookmark className={`w-4 h-4 ${isSpotlightWatchlisted ? 'fill-white text-white' : 'text-white'}`} />
                                <span>{isSpotlightWatchlisted ? 'Listede' : 'Listeme Ekle'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Navigation Circular Arrow Buttons (Cycles categories & scrolls track) */}
                    <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={() => selectGenreByIndex(activeGenreIndex - 1)}
                            className="w-10 h-10 rounded-full bg-black/60 hover:bg-[#00B074] text-white flex items-center justify-center border border-white/15 backdrop-blur-md transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-md"
                            aria-label="Önceki Tür"
                            title="Önceki Tür"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => selectGenreByIndex(activeGenreIndex + 1)}
                            className="w-10 h-10 rounded-full bg-black/60 hover:bg-[#00B074] text-white flex items-center justify-center border border-white/15 backdrop-blur-md transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-md"
                            aria-label="Sonraki Tür"
                            title="Sonraki Tür"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Genre Cards Slider (Horizontal Bottom Track) */}
                    <div
                        ref={genreSliderRef}
                        className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar py-3 px-3"
                    >
                        {genreCards.map((card, idx) => {
                            const isActive = activeGenreIndex === idx;
                            return (
                                <div
                                    key={card.name || idx}
                                    onClick={() => selectGenreByIndex(idx)}
                                    className={`group relative flex-shrink-0 w-36 sm:w-44 md:w-52 h-24 sm:h-28 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 select-none ${isActive
                                            ? 'border-2 border-[#00B074] shadow-[0_0_20px_rgba(0,176,116,0.5)] scale-[1.03]'
                                            : 'border border-white/15 hover:border-white/40 hover:scale-[1.02]'
                                        }`}
                                >
                                    <img
                                        src={card.image}
                                        alt={card.name}
                                        className="w-full h-full object-cover object-[center_20%] filter brightness-75 group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                    <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
                                        <span className={`text-sm sm:text-base font-bold tracking-wide transition-colors ${isActive ? 'text-white font-extrabold' : 'text-white/90 group-hover:text-[#00B074]'}`}>
                                            {card.name}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </Layout>
    );
}
