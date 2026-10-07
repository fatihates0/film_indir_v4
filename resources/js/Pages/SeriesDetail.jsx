import React, { useState, useRef, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import {
    Play, Bookmark, Check, Heart, Share2, Download, Volume2, VolumeX,
    Star, Calendar, Clock, ChevronRight, ChevronLeft, ChevronDown,
    CheckCircle2, ThumbsUp, ThumbsDown, ArrowRight, MessageSquare, Sparkles,
    HardDrive, ShieldCheck, Film,
    LayoutGrid, List
} from 'lucide-react';
import MovieCard from '../Components/MovieCard';
import HeroTrailerBackground from '../Components/HeroTrailerBackground';
import { toTrGenreList } from '../Utils/genreHelper';
import { getCinemaVersion, cinemaConfig } from '../Config/cinemaConfig';
import { useHeroIdleFade } from '../Utils/useHeroIdleFade';

export default function SeriesDetail({ series, episodes, similarSeries, universe, news, reviews }) {
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [downloadViewMode, setDownloadViewMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sinekutu_download_view') || 'grid';
        }
        return 'grid';
    });
    const [activeTab, setActiveTab] = useState('similar');

    const [isLiked, setIsLiked] = useState(false);
    const [inWatchlist, setInWatchlist] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
    const [canExpandOverview, setCanExpandOverview] = useState(false);

    const castScrollRef = useRef(null);
    const overviewRef = useRef(null);
    const heroRef = useRef(null);

    if (!series) {
        return (
            <Layout title="Dizi Bulunamadı - SineKutu">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center space-y-4">
                    <div className="w-16 h-16 bg-white dark:bg-[#131722] border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center mx-auto text-slate-400 dark:text-gray-500">
                        <Play className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dizi Bulunamadı</h1>
                    <p className="text-sm text-slate-600 dark:text-gray-400">Aradığınız dizi arşivde bulunamadı veya henüz eklenmedi.</p>
                    <Link href="/series" className="inline-block px-6 py-2.5 bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs rounded-xl transition-all">
                        Dizilere Dön
                    </Link>
                </div>
            </Layout>
        );
    }

    const defaultSeries = series;

    const trailersList = Array.isArray(defaultSeries?.trailers) && defaultSeries.trailers.length > 0
        ? defaultSeries.trailers
        : (defaultSeries?.trailer ? [defaultSeries.trailer] : []);

    const [activeTrailerKey, setActiveTrailerKey] = useState(defaultSeries?.trailer?.key || trailersList[0]?.key || null);

    useEffect(() => {
        if (defaultSeries?.trailer?.key) {
            setActiveTrailerKey(defaultSeries.trailer.key);
        } else if (trailersList[0]?.key) {
            setActiveTrailerKey(trailersList[0].key);
        }
    }, [defaultSeries?.id, defaultSeries?.trailer?.key]);

    const activeTrailer = trailersList.find(t => t.key === activeTrailerKey) || defaultSeries?.trailer || trailersList[0] || null;
    const rawCast = Array.isArray(defaultSeries?.cast)
        ? defaultSeries.cast
        : (Array.isArray(defaultSeries?.cast?.data) ? defaultSeries.cast.data : []);
    const castList = rawCast.filter(item => !item.role_type || item.role_type === 'cast');

    const genresList = toTrGenreList(defaultSeries?.genres);

    const mockEpisodes = Array.isArray(defaultSeries?.episodes) && defaultSeries.episodes.length > 0
        ? defaultSeries.episodes.map((ep, idx) => ({
            id: ep.id || idx + 1,
            episodeNumber: ep.chapter || ep.episode_number || idx + 1,
            title: ep.title || `${idx + 1}. Bölüm`,
            duration: ep.duration || '55m',
            progress: idx === 0 ? 100 : (idx === 1 ? 40 : 0),
            date: ep.date || '2023',
            synopsis: ep.desc || ep.synopsis || 'Bölüm detayları ve özet bilgisi.',
            thumbnail: ep.poster || defaultSeries.backdrop
        }))
        : (episodes || [
            {
                id: 401,
                episodeNumber: 1,
                title: "When You're Lost in the Darkness",
                duration: "1h 21m",
                progress: 100,
                date: "Jan 15, 2023",
                synopsis: "Twenty years after a fungal outbreak ravages the planet, survivors Joel and Tess are tasked with a mission that could change everything.",
                thumbnail: defaultSeries.backdrop || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
            },
            {
                id: 402,
                episodeNumber: 2,
                title: "Infected",
                duration: "53m",
                progress: 60,
                date: "Jan 22, 2023",
                synopsis: "After escaping the QZ, Joel and Tess clash over Ellie's fate as they navigate the ruins of a long-abandoned Boston.",
                thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80"
            },
            {
                id: 403,
                episodeNumber: 3,
                title: "Long, Long Time",
                duration: "1h 15m",
                progress: 0,
                date: "Jan 29, 2023",
                synopsis: "When a stranger approaches his compound, survivalist Bill forges an unlikely connection.",
                thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80"
            },
            {
                id: 404,
                episodeNumber: 4,
                title: "Please Hold to My Hand",
                duration: "45m",
                progress: 0,
                date: "Feb 5, 2023",
                synopsis: "After abandoning their truck in Kansas City, Joel and Ellie attempt to escape without attracting the attention of a vindictive rebel leader.",
                thumbnail: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80"
            }
        ]);

    const seriesCleanSlug = (defaultSeries.title || 'Dizi')
        .replace(/[^a-zA-Z0-9]/g, '.')
        .replace(/\.+/g, '.');

    const seasonsList = Array.isArray(defaultSeries?.seasons) && defaultSeries.seasons.length > 0
        ? defaultSeries.seasons.map(s => ({
            number: s.season_number ?? 1,
            name: s.name || s.name_tr || (s.season_number === 0 ? 'Özel Bölümler' : `Sezon ${s.season_number ?? 1}`),
            episodeCount: s.episodes_count || (s.episodes ? s.episodes.length : 0),
            availableCount: s.available_count ?? 0,
            episodes: s.episodes || []
        }))
        : [
            { number: 1, name: "Sezon 1", episodeCount: 4, availableCount: 4, episodes: mockEpisodes },
            { number: 2, name: "Sezon 2", episodeCount: 4, availableCount: 0, episodes: [] },
            { number: 3, name: "Sezon 3", episodeCount: 4, availableCount: 0, episodes: [] },
            { number: 4, name: "Sezon 4", episodeCount: 4, availableCount: 0, episodes: [] },
        ];

    const activeSeasonData = seasonsList.find(s => s.number === selectedSeason) || seasonsList[0];
    const currentEpisodes = (activeSeasonData?.episodes && activeSeasonData.episodes.length > 0)
        ? activeSeasonData.episodes.map((ep, idx) => ({
            id: ep.id || idx + 1,
            episodeNumber: ep.chapter || ep.episode_number || idx + 1,
            title: ep.clean_name || ep.name_tr || ep.name_en || ep.title || `${idx + 1}. Bölüm`,
            duration: ep.duration || '45m',
            progress: idx === 0 ? 100 : (idx === 1 ? 40 : 0),
            date: ep.date || '',
            synopsis: ep.desc || ep.overview_tr || ep.overview_en || ep.synopsis || 'Bölüm detayları ve konusu.',
            thumbnail: ep.poster || defaultSeries.backdrop,
            isAvailable: ep.is_available ?? false,
            formattedSize: ep.formatted_size,
            downloadUrl: ep.download_url,
            files: ep.files || []
        }))
        : [];

    const mockUniverse = universe || [
        { id: 101, title: `${defaultSeries.title}: The Beginning`, type: "Prequel", year: 2021, status: "Canon", poster: defaultSeries.poster },
        { id: 102, title: defaultSeries.title, type: "Main Series", year: defaultSeries.year || 2023, status: "Canon", poster: defaultSeries.poster },
        { id: 103, title: `${defaultSeries.title}: Special Edition`, type: "Behind The Scenes", year: 2024, status: "Bonus", poster: defaultSeries.backdrop }
    ];


    const mockNews = news || [
        { id: 1, title: `${defaultSeries.title} Season 2 Production Updates and Cast News`, date: "Oct 2, 2026", author: "SineKutu Editorial", image: defaultSeries.backdrop, summary: "Filming wraps up on the highly anticipated second season with brand new characters and thrilling storyline developments." },
        { id: 2, title: `Behind The Scenes: How Visual Effects Brought The World to Life`, date: "Sep 25, 2026", author: "VFX Insider", image: defaultSeries.poster, summary: "Directors and artists describe the intricate practical effects and digital set extensions created for the show." }
    ];

    const mockReviews = reviews || [
        {
            id: 1,
            user: "Alex Rivera",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
            rating: 10,
            date: "2 days ago",
            title: "A monumental achievement in television storytelling",
            content: "Faithful to the source material while expanding upon character arcs in ways that elevate the entire emotional weight. Absolutely flawless direction and acting.",
            likes: 184,
            dislikes: 6
        },
        {
            id: 2,
            user: "Sarah Jenkins",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
            rating: 9,
            date: "1 week ago",
            title: "Gripping, emotional and visually stunning",
            content: "Every episode feels like a cinematic masterpiece. The bond between the leads drives the narrative forward with immense humanity.",
            likes: 122,
            dislikes: 4
        }
    ];

    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2500);
        }
    };

    const checkCastScroll = () => {
        if (castScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = castScrollRef.current;
            setCanScrollLeft(scrollLeft > 10);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkCastScroll();
        window.addEventListener('resize', checkCastScroll);
        return () => window.removeEventListener('resize', checkCastScroll);
    }, [defaultSeries]);

    const overviewText = defaultSeries?.storyline || defaultSeries?.overview || 'Dizi detayları ve konusu sistemde kayıtlıdır.';

    useEffect(() => {
        const checkClamp = () => {
            if (isOverviewExpanded) return;
            if (overviewRef.current) {
                const isClamped = overviewRef.current.scrollHeight > overviewRef.current.clientHeight + 2;
                setCanExpandOverview(isClamped || overviewText.length > 220);
            } else if (overviewText.length > 220) {
                setCanExpandOverview(true);
            }
        };
        checkClamp();
        const timer = setTimeout(checkClamp, 150);
        window.addEventListener('resize', checkClamp);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkClamp);
        };
    }, [overviewText, isOverviewExpanded]);

    const scrollCast = (direction) => {
        if (castScrollRef.current) {
            const container = castScrollRef.current;
            const firstItem = container.firstElementChild;
            if (!firstItem) return;

            const itemWidth = firstItem.getBoundingClientRect().width;
            const gap = 16;
            const fullStep = itemWidth + gap;

            const count = window.innerWidth >= 1024 ? 4 : (window.innerWidth >= 640 ? 3 : 2);
            const scrollDistance = fullStep * count;

            container.scrollBy({
                left: direction === 'left' ? -scrollDistance : scrollDistance,
                behavior: 'smooth'
            });
            setTimeout(checkCastScroll, 400);
        }
    };

    const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

    const handleDownload = () => {
        const target = document.getElementById('episodes-download-section');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    };



    const cinemaVersion = getCinemaVersion();
    const isV2Expanded = cinemaVersion === 'v2' && isTrailerPlaying && !isMuted;

    const {
        isHeroHovered,
        isOverlayVisible,
        handleMouseMove,
        handleMouseEnter,
        handleMouseLeave,
    } = useHeroIdleFade({ isMuted, cinemaVersion });

    return (
        <Layout transparentNavbar={true} title={`${defaultSeries.title} - SineKutu`}>
            {/* HERO SECTION - Exact reference layout with ambient trailer */}
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
                    backdrop={defaultSeries.backdrop}
                    title={defaultSeries.title}
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

                {/* Hero Overlay Content - Positioned at bottom with Netflix-style focus fade */}
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
                        {/* Quality Badge & Multi-Trailer Switcher */}
                        <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
                            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#131722]/80 backdrop-blur-md border border-white/15 text-white shadow-sm">
                                <Sparkles className="w-3.5 h-3.5 text-[#00B074]" />
                                <span>{defaultSeries.quality || defaultSeries.seasonNotice || '1080p Full HD'}</span>
                            </div>

                            {!isMuted && trailersList.length > 1 && (
                                <div className="inline-flex items-center p-1 rounded-full bg-slate-900/10 dark:bg-[#131722]/80 backdrop-blur-md border border-slate-900/20 dark:border-white/15 shadow-sm gap-1 animate-in fade-in duration-300">
                                    {trailersList.map((t, idx) => {
                                        const isActive = activeTrailer?.key === t.key;
                                        return (
                                            <button
                                                key={t.id || t.key || idx}
                                                onClick={() => setActiveTrailerKey(t.key)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${isActive
                                                    ? 'bg-[#00B074] text-white font-semibold shadow-md shadow-[#00B074]/30 scale-[1.02]'
                                                    : 'text-slate-900 dark:text-gray-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10'
                                                    }`}
                                                title={t.name || t.label}
                                            >
                                                <Film className={`w-3 h-3 ${isActive ? 'text-white' : 'text-slate-900 dark:text-gray-400'}`} />
                                                <span>{t.label || t.name || `Fragman ${idx + 1}`}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-3 drop-shadow-md">
                            {defaultSeries.title}
                        </h1>

                        {/* Metadata row: Rating · Year · Genres */}
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-900 dark:text-gray-300 font-medium mb-7">
                            <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold">
                                <Star className="w-4 h-4 fill-amber-500 dark:fill-amber-400 text-amber-500 dark:text-amber-400" />
                                <span className="text-slate-900 dark:text-white font-bold">{defaultSeries.rating || '4.9'}</span>
                            </div>
                            <span className="text-slate-900 dark:text-gray-500">·</span>
                            <span>{defaultSeries.year || '2023'}</span>
                            {genresList.length > 0 && (
                                <>
                                    <span className="text-slate-900 dark:text-gray-500">·</span>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {genresList.map((genre, idx) => (
                                            <React.Fragment key={idx}>
                                                {idx > 0 && <span className="text-slate-900 dark:text-gray-500">·</span>}
                                                <span className="hover:text-slate-950 dark:hover:text-white transition-colors">{genre}</span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            {/* Left Group: Continue Watching + Add Watchlist */}
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => {
                                        setActiveTab('episodes');
                                        const epSection = document.getElementById('episodes-tab-content');
                                        if (epSection) epSection.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="bg-[#00B074] hover:bg-[#009663] text-white font-semibold text-sm px-6 py-3.5 rounded-xl flex items-center gap-2.5 shadow-lg shadow-[#00B074]/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <Play className="w-4 h-4 fill-white text-white" />
                                    <span>İzlemeye Devam Et</span>
                                </button>

                                <button
                                    onClick={() => setInWatchlist(!inWatchlist)}
                                    className={`px-5 py-3.5 rounded-xl font-medium text-sm border flex items-center gap-2.5 backdrop-blur-md transition-all cursor-pointer ${inWatchlist
                                        ? 'bg-[#00B074]/20 border-[#00B074] text-[#00B074]'
                                        : 'bg-slate-900/10 hover:bg-slate-900/15 border-slate-900/20 text-slate-900 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/15 dark:text-white'
                                        }`}
                                >
                                    {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                                    <span>{inWatchlist ? 'İzleme Listesinde' : 'İzleme Listesine Ekle'}</span>
                                </button>
                            </div>

                            {/* Right Group: Sound, Like, Download, Share */}
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    onClick={() => {
                                        if (!activeTrailer) return;
                                        setIsMuted(!isMuted);
                                    }}
                                    disabled={!activeTrailer}
                                    className={`p-3.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer flex items-center gap-2 ${!activeTrailer
                                        ? 'bg-slate-900/5 dark:bg-white/5 border-slate-900/10 dark:border-white/10 text-slate-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                                        : !isMuted
                                            ? 'bg-[#00B074] hover:bg-[#009663] border-[#00B074] text-white shadow-lg shadow-[#00B074]/30'
                                            : 'bg-slate-900/10 hover:bg-slate-900/15 border-slate-900/20 text-slate-900 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/15 dark:text-white'
                                        }`}
                                    title={
                                        !activeTrailer
                                            ? 'Fragman bulunamadı'
                                            : isMuted
                                                ? `${activeTrailer.label || 'Fragman'} Sesini Aç (Sinema Modu)`
                                                : 'Sesi Kapat'
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

                                <button
                                    onClick={() => setIsLiked(!isLiked)}
                                    className={`px-5 py-3.5 rounded-xl border flex items-center gap-2 font-medium text-sm backdrop-blur-md transition-all cursor-pointer ${isLiked
                                        ? 'bg-[#00B074]/20 border-[#00B074] text-[#00B074]'
                                        : 'bg-slate-900/10 hover:bg-slate-900/15 border-slate-900/20 text-slate-900 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/15 dark:text-white'
                                        }`}
                                >
                                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#00B074] text-[#00B074]' : 'text-[#00B074]'}`} />
                                    <span>{isLiked ? 'Beğenildi' : 'Beğen'}</span>
                                </button>

                                <button
                                    onClick={handleDownload}
                                    className="px-5 py-3.5 bg-slate-900/10 hover:bg-slate-900/15 backdrop-blur-md border border-slate-900/20 text-slate-900 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/15 dark:text-white rounded-xl flex items-center gap-2 font-medium text-sm transition-all cursor-pointer"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>İndirme Seçenekleri</span>
                                </button>

                                <button
                                    onClick={handleShare}
                                    className="px-5 py-3.5 bg-slate-900/10 hover:bg-slate-900/15 backdrop-blur-md border border-slate-900/20 text-slate-900 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/15 dark:text-white rounded-xl flex items-center gap-2 font-medium text-sm transition-all relative cursor-pointer"
                                >
                                    <Share2 className="w-4 h-4" />
                                    <span>{shareCopied ? 'Bağlantı Kopyalandı!' : 'Paylaş'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
                {/* 1. STORY LINE */}
                <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2.5 tracking-tight">Özet</h2>
                    <p
                        ref={overviewRef}
                        style={!isOverviewExpanded ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}}
                        className={`text-slate-700 dark:text-gray-300/90 text-sm sm:text-base leading-relaxed font-normal transition-all duration-300 ${!isOverviewExpanded ? 'line-clamp-2' : ''
                            }`}
                    >
                        {overviewText}
                    </p>
                    {canExpandOverview && (
                        <button
                            type="button"
                            onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                            className="mt-2 text-xs font-semibold text-[#00B074] hover:text-[#009663] transition-colors cursor-pointer inline-flex items-center gap-1 group"
                        >
                            <span>{isOverviewExpanded ? 'Daha Az Göster' : 'Devamını Oku'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOverviewExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>

                {/* 2. TOP CAST */}
                <div>
                    <div className="flex items-center justify-between mb-3.5">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Öne Çıkan Oyuncular</h2>

                        {/* Navigation Arrows in Header - Never covers actors */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => scrollCast('left')}
                                disabled={!canScrollLeft}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${canScrollLeft
                                    ? 'bg-white dark:bg-[#181D2A] hover:bg-slate-100 dark:hover:bg-[#252C3E] text-slate-800 dark:text-white border-slate-300/80 dark:border-white/10 hover:scale-105 active:scale-95 shadow-md'
                                    : 'bg-slate-200/50 dark:bg-white/5 text-slate-400 dark:text-gray-600 border-slate-200/50 dark:border-white/5 cursor-not-allowed opacity-30'
                                    }`}
                                aria-label="Önceki"
                                title="Önceki"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => scrollCast('right')}
                                disabled={!canScrollRight}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${canScrollRight
                                    ? 'bg-white dark:bg-[#181D2A] hover:bg-slate-100 dark:hover:bg-[#252C3E] text-slate-800 dark:text-white border-slate-300/80 dark:border-white/10 hover:scale-105 active:scale-95 shadow-md'
                                    : 'bg-slate-200/50 dark:bg-white/5 text-slate-400 dark:text-gray-600 border-slate-200/50 dark:border-white/5 cursor-not-allowed opacity-30'
                                    }`}
                                aria-label="Sonraki"
                                title="Sonraki"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="relative group/cast">
                        {/* Left Gradient Overlay */}
                        <div
                            className={`absolute left-0 top-0 bottom-0 w-16 sm:w-20 bg-gradient-to-r from-[#f4f5f8] dark:from-[#0A0D14] to-transparent pointer-events-none z-20 transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
                        />

                        {/* Cards Track (6.5 items on desktop with smooth snap) */}
                        <div
                            ref={castScrollRef}
                            onScroll={checkCastScroll}
                            className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar py-2 snap-x snap-mandatory"
                        >
                            {(castList.length > 0 ? castList : [
                                { name: "Pedro Pascal", role: "Joel Miller", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" },
                                { name: "Bella Ramsey", role: "Ellie", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" },
                                { name: "Anna Torv", role: "Tessa", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" },
                                { name: "Ashley Johnson", role: "Ellie Mother", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80" },
                                { name: "Nick Offerman", role: "Bill", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" },
                                { name: "Nico Parker", role: "Sarah Miller", image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80" },
                                { name: "Gabriel Luna", role: "Tommy", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80" },
                                { name: "Merle Dandridge", role: "Marlene", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" }
                            ]).map((actor, idx) => {
                                const actorHref = actor.person_url || (actor.tmdb_person_id ? `/person/${actor.tmdb_person_id}` : null);
                                const ItemTag = actorHref ? Link : 'div';
                                const itemProps = actorHref ? { href: actorHref } : {};

                                return (
                                    <ItemTag
                                        key={idx}
                                        {...itemProps}
                                        className="flex-none snap-start flex items-center gap-3 w-[70%] sm:w-[calc((100%-3rem)/3.5)] md:w-[calc((100%-4rem)/4.5)] lg:w-[calc((100%-6rem)/6.5)] group cursor-pointer select-none"
                                    >
                                        <img
                                            src={actor.image || actor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name)}&color=00B074&background=191D28`}
                                            alt={actor.name}
                                            className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-white/15 group-hover:border-[#00B074] transition-all shrink-0"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name)}&color=00B074&background=191D28`;
                                            }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#00B074] transition-colors truncate">
                                                {actor.name}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                                                {actor.role || actor.character}
                                            </p>
                                        </div>
                                    </ItemTag>
                                );
                            })}
                        </div>

                        {/* Right Dark Gradient Overlay */}
                        <div
                            className={`absolute right-0 top-0 bottom-0 w-24 sm:w-36 lg:w-44 bg-gradient-to-l from-[#f4f5f8] via-[#f4f5f8]/85 dark:from-[#0A0D14] dark:via-[#0A0D14]/85 to-transparent pointer-events-none z-20 transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </div>
                </div>

                {/* 3. DEDICATED EPISODES & DOWNLOAD OPTIONS SECTION (Grid or List View) */}
                <div id="episodes-download-section" className="scroll-mt-24 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        {/* Title matching "1-9 episodes" in reference */}
                        <div className="flex items-center gap-3">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">İndirme Seçenekleri</h2>

                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300 border border-slate-300/60 dark:border-white/10">
                                {currentEpisodes.length > 0 ? `${currentEpisodes.length} bölüm` : 'bölüm'}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* View Mode Toggle: Grid / List */}
                            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-[#181D2A] p-1 rounded-xl border border-slate-300/60 dark:border-white/10 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDownloadViewMode('grid');
                                        if (typeof window !== 'undefined') {
                                            localStorage.setItem('sinekutu_download_view', 'grid');
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${downloadViewMode === 'grid'
                                        ? 'bg-[#00B074] text-white shadow-md font-semibold'
                                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-white/5'
                                        }`}
                                    title="Izgara Görünümü"
                                    aria-label="Izgara Görünümü"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Izgara</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDownloadViewMode('list');
                                        if (typeof window !== 'undefined') {
                                            localStorage.setItem('sinekutu_download_view', 'list');
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${downloadViewMode === 'list'
                                        ? 'bg-[#00B074] text-white shadow-md font-semibold'
                                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-white/5'
                                        }`}
                                    title="Liste Görünümü"
                                    aria-label="Liste Görünümü"
                                >
                                    <List className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Liste</span>
                                </button>
                            </div>

                            {/* Season Selector Dropdown */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                                    className="bg-white dark:bg-[#181D2A] hover:bg-slate-100 dark:hover:bg-[#222838] border border-slate-300/80 dark:border-white/10 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2.5 cursor-pointer shadow-sm transition-all"
                                >
                                    <span>{activeSeasonData?.name || `Sezon ${selectedSeason}`}</span>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-gray-400 transition-transform ${seasonDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {seasonDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-white/15 rounded-xl shadow-2xl py-1.5 z-30 backdrop-blur-xl">
                                        {seasonsList.map((season) => (
                                            <button
                                                key={season.number}
                                                onClick={() => {
                                                    setSelectedSeason(season.number);
                                                    setSeasonDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-xs sm:text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${selectedSeason === season.number
                                                    ? 'bg-[#00B074]/15 text-[#00B074] font-bold'
                                                    : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                <span className="truncate">{season.name} {season.availableCount !== undefined ? `(${season.availableCount}/${season.episodeCount})` : ''}</span>
                                                {selectedSeason === season.number && <Check className="w-3.5 h-3.5 text-[#00B074] shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {currentEpisodes.length > 0 ? (
                        downloadViewMode === 'grid' ? (
                            /* 4 Items Per Row Grid Track flowing downwards */
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                                {currentEpisodes.map((ep, epIdx) => {
                                    const isAvail = ep.isAvailable;

                                    return (
                                        <div
                                            key={ep.id || epIdx}
                                            className={`relative w-full aspect-[16/10] rounded-2xl overflow-hidden border transition-all duration-300 group shadow-xl flex flex-col justify-end p-4 sm:p-5 select-none ${isAvail
                                                ? 'border-white/10 hover:border-[#00B074]/60'
                                                : 'border-white/5 opacity-65 hover:opacity-90'
                                                }`}
                                        >
                                            {/* Background Episode Thumbnail */}
                                            <img
                                                src={ep.thumbnail}
                                                alt={ep.title}
                                                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${isAvail ? 'group-hover:scale-105' : 'grayscale-[35%]'
                                                    }`}
                                            />

                                            {/* Dark gradient overlay matching reference image */}
                                            <div className={`absolute inset-0 bg-gradient-to-t pointer-events-none ${isAvail ? 'from-black via-black/80 to-black/25' : 'from-black via-black/85 to-black/40'
                                                }`} />

                                            {/* Content at Bottom - Matching reference image typography */}
                                            <div className="relative z-10 space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className={`font-bold text-sm sm:text-base transition-colors truncate ${isAvail ? 'text-white group-hover:text-[#00B074]' : 'text-gray-300'
                                                        }`}>
                                                        Chapter {ep.episodeNumber}{ep.title && !ep.title.startsWith(`${ep.episodeNumber}.`) ? ` · ${ep.title}` : ''}
                                                    </h3>
                                                    {ep.duration && (
                                                        <span className="text-gray-400 text-xs shrink-0 font-medium">{ep.duration}</span>
                                                    )}
                                                </div>
                                                <p className="text-gray-300/90 text-xs line-clamp-2 leading-relaxed font-normal">
                                                    {ep.synopsis || ep.title || 'Bölüm detayları ve indirme linkleri.'}
                                                </p>

                                                {/* Bottom Action Row */}
                                                <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
                                                    {isAvail ? (
                                                        <>
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold px-2.5 py-1 rounded-md bg-black/60 border border-white/10 backdrop-blur-md">
                                                                <HardDrive className="w-3.5 h-3.5 text-[#00B074]" />
                                                                <span>{ep.formattedSize || 'HD'}</span>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                {ep.files && ep.files.length > 0 ? (
                                                                    ep.files.map((file) => (
                                                                        <a
                                                                            key={file.id}
                                                                            href={file.download_url}
                                                                            className="px-3 py-1 rounded-lg bg-[#00B074] hover:bg-[#009663] text-white text-[11px] font-bold transition-all shadow-md shadow-[#00B074]/30 flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer"
                                                                            title={`${file.quality} İndir`}
                                                                        >
                                                                            <Download className="w-3 h-3" />
                                                                            <span>{file.quality || 'İndir'}</span>
                                                                        </a>
                                                                    ))
                                                                ) : (
                                                                    <a
                                                                        href={ep.downloadUrl || `/downloads?id=${defaultSeries.id}&season=${selectedSeason}&episode=${ep.episodeNumber}`}
                                                                        className="px-3 py-1 rounded-lg bg-[#00B074] hover:bg-[#009663] text-white text-[11px] font-bold transition-all shadow-md shadow-[#00B074]/30 flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer"
                                                                    >
                                                                        <Download className="w-3 h-3" />
                                                                        <span>İndir</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
                                                                <span>Dosya Yok</span>
                                                            </div>

                                                            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-500 text-[11px] font-medium flex items-center gap-1 select-none">
                                                                <span>Mevcut Değil</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Modern Episode List View */
                            <div className="space-y-3">
                                {currentEpisodes.map((ep, epIdx) => {
                                    const isAvail = ep.isAvailable;
                                    const episodeNumStr = String(ep.episodeNumber).padStart(2, '0');

                                    return (
                                        <div
                                            key={ep.id || epIdx}
                                            className={`group relative bg-white dark:bg-[#131722]/80 hover:bg-slate-50 dark:hover:bg-[#181D2A] border rounded-2xl p-3.5 sm:p-4 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm dark:shadow-lg backdrop-blur-sm ${isAvail
                                                ? 'border-slate-200 dark:border-white/10 hover:border-[#00B074]/50'
                                                : 'border-slate-200/60 dark:border-white/5 opacity-60 hover:opacity-85'
                                                }`}
                                        >
                                            {/* Left: Number + Thumbnail + Details */}
                                            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                                                {/* Episode Number */}
                                                <div className="text-xl sm:text-2xl font-black text-slate-400 dark:text-gray-500 group-hover:text-[#00B074] transition-colors w-9 text-center shrink-0 tracking-tight">
                                                    {episodeNumStr}
                                                </div>

                                                {/* Thumbnail */}
                                                <div className="w-28 sm:w-36 aspect-[16/10] rounded-xl overflow-hidden relative shrink-0 border border-slate-200 dark:border-white/10 group-hover:border-[#00B074]/40 transition-colors bg-slate-900 dark:bg-black/40">
                                                    <img
                                                        src={ep.thumbnail}
                                                        alt={ep.title}
                                                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isAvail ? '' : 'grayscale-[35%]'
                                                            }`}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                    {ep.duration && (
                                                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] text-gray-300 font-medium">
                                                            {ep.duration}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Episode Details */}
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className={`font-bold text-sm sm:text-base transition-colors truncate ${isAvail ? 'text-slate-900 dark:text-white group-hover:text-[#00B074]' : 'text-slate-500 dark:text-gray-300'
                                                            }`}>
                                                            Chapter {ep.episodeNumber}{ep.title && !ep.title.startsWith(`${ep.episodeNumber}.`) ? ` · ${ep.title}` : ''}
                                                        </h3>
                                                        {ep.date && (
                                                            <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">
                                                                ({ep.date})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-600 dark:text-gray-300/80 text-xs line-clamp-2 leading-relaxed font-normal">
                                                        {ep.synopsis || ep.title || 'Bölüm detayları ve indirme linkleri.'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right: Size + Download Actions */}
                                            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-white/10">
                                                {isAvail ? (
                                                    <>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-gray-300 font-semibold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10">
                                                            <HardDrive className="w-3.5 h-3.5 text-[#00B074]" />
                                                            <span>{ep.formattedSize || 'HD'}</span>
                                                        </div>

                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {ep.files && ep.files.length > 0 ? (
                                                                ep.files.map((file) => (
                                                                    <a
                                                                        key={file.id}
                                                                        href={file.download_url}
                                                                        className="px-3.5 py-1.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold transition-all shadow-md shadow-[#00B074]/30 flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer"
                                                                        title={`${file.quality} İndir`}
                                                                    >
                                                                        <Download className="w-3.5 h-3.5" />
                                                                        <span>{file.quality || 'İndir'}</span>
                                                                    </a>
                                                                ))
                                                            ) : (
                                                                <a
                                                                    href={ep.downloadUrl || `/downloads?id=${defaultSeries.id}&season=${selectedSeason}&episode=${ep.episodeNumber}`}
                                                                    className="px-4 py-1.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold transition-all shadow-md shadow-[#00B074]/30 flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                    <span>İndir</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-400 dark:text-gray-500 font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                                            Dosya Yok
                                                        </span>
                                                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-gray-500 text-xs font-medium select-none">
                                                            Mevcut Değil
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className="py-12 text-center rounded-2xl bg-white dark:bg-[#181D2A]/40 border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                            <Film className="w-10 h-10 text-slate-400 dark:text-gray-500 mx-auto mb-3 opacity-60" />
                            <p className="text-slate-800 dark:text-gray-300 font-semibold text-sm">Bu sezona ait henüz bölüm verisi bulunmuyor.</p>
                            <p className="text-slate-500 dark:text-gray-500 text-xs mt-1">Yeni bölümler yayınlandığında veya eklendiğinde burada listelenecektir.</p>
                        </div>
                    )}
                </div>


                {/* 4. LOWER TABS BAR */}
                <div className="border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-8 text-sm overflow-x-auto no-scrollbar">
                        {[
                            { id: 'similar', label: 'Benzer Diziler' },
                            { id: 'universe', label: 'Serinin Diğer Yapımları' },
                            { id: 'news', label: 'Haberler' },
                            { id: 'reviews', label: `Yorumlar (${mockReviews.length})` }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-3 font-medium transition-colors whitespace-nowrap relative cursor-pointer ${activeTab === tab.id
                                    ? 'text-slate-900 dark:text-white font-semibold after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#00B074]'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 5. TAB CONTENTS */}
                <div className="pt-2">
                    {/* SIMILAR SERIES TAB */}
                    {activeTab === 'similar' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                                {(similarSeries && similarSeries.length > 0 ? similarSeries : [
                                    { id: 2, title: "Stranger Things", rating: "8.7", year: "2016", poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80" },
                                    { id: 3, title: "Dark", rating: "8.8", year: "2017", poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80" },
                                    { id: 4, title: "Breaking Bad", rating: "9.5", year: "2008", poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80" },
                                    { id: 5, title: "Chernobyl", rating: "9.4", year: "2019", poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80" },
                                    { id: 6, title: "The Mandalorian", rating: "8.7", year: "2019", poster: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=80" },
                                    { id: 7, title: "Game of Thrones", rating: "9.2", year: "2011", poster: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80" }
                                ]).map((item) => (
                                    <MovieCard key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    )}


                    {/* UNIVERSE TAB */}
                    {activeTab === 'universe' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-[#131722] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{defaultSeries.title} Evreni</h3>
                                <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">Kronolojik bağlantılı yapımlar ve evren genişlemeleri.</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {mockUniverse.map((item) => (
                                        <div key={item.id} className="bg-slate-50 dark:bg-[#0A0D14] p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-[#00B074]/50 transition-all flex flex-col">
                                            <div className="relative h-60 rounded-lg overflow-hidden mb-3">
                                                <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                                                <span className="absolute top-2 left-2 bg-[#00B074] text-white font-bold text-xs px-2.5 py-1 rounded shadow-md">
                                                    {item.type}
                                                </span>
                                            </div>
                                            <h4 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 mt-2">
                                                <span>Yıl: {item.year}</span>
                                                <span className="text-amber-500 dark:text-amber-400 font-semibold">{item.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NEWS TAB */}
                    {activeTab === 'news' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {mockNews.map((item) => (
                                <div key={item.id} className="bg-white dark:bg-[#131722] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row hover:border-slate-300 dark:hover:border-white/15 transition-all shadow-sm">
                                    <img src={item.image} alt={item.title} className="sm:w-52 h-48 sm:h-auto object-cover" />
                                    <div className="p-6 flex flex-col justify-between flex-1">
                                        <div>
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 mb-2">
                                                <span>{item.author}</span>
                                                <span>{item.date}</span>
                                            </div>
                                            <h4 className="text-base font-bold text-slate-900 dark:text-white hover:text-[#00B074] transition-colors cursor-pointer mb-2">
                                                {item.title}
                                            </h4>
                                            <p className="text-slate-600 dark:text-gray-400 text-sm line-clamp-2">
                                                {item.summary}
                                            </p>
                                        </div>
                                        <button className="mt-4 text-[#00B074] text-xs font-semibold flex items-center gap-1.5 hover:gap-2 transition-all cursor-pointer">
                                            Haberi Oku <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* REVIEWS TAB */}
                    {activeTab === 'reviews' && (
                        <div className="space-y-6">
                            {/* Write Review Box */}
                            <div className="bg-white dark:bg-[#131722] p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4 shadow-sm">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">İnceleme Yaz</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 dark:text-gray-400 text-xs">Puanınız:</span>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setUserRating(star)}
                                            className={`p-1 text-sm font-bold cursor-pointer ${star <= userRating ? 'text-amber-400' : 'text-slate-300 dark:text-gray-600 hover:text-amber-400'
                                                }`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                    <span className="text-amber-500 dark:text-amber-400 font-bold text-xs ml-2">{userRating > 0 ? `${userRating}/10` : ''}</span>
                                </div>
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Dizi hakkındaki düşüncelerinizi paylaşın..."
                                    className="w-full bg-slate-50 dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#00B074] min-h-[90px]"
                                />
                                <button className="bg-[#00B074] text-white font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-[#009663] transition-colors cursor-pointer">
                                    İncelemeyi Gönder
                                </button>
                            </div>

                            {/* User Reviews List */}
                            <div className="space-y-4">
                                {mockReviews.map((rev) => (
                                    <div key={rev.id} className="bg-white dark:bg-[#131722] p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <img src={rev.avatar} alt={rev.user} className="w-10 h-10 rounded-full object-cover" />
                                                <div>
                                                    <h4 className="text-slate-900 dark:text-white font-bold text-sm">{rev.user}</h4>
                                                    <p className="text-slate-500 dark:text-gray-400 text-xs">{rev.date}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 bg-amber-400/10 px-3 py-1 rounded-full text-amber-500 dark:text-amber-400 font-bold text-xs">
                                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                                {rev.rating}/10
                                            </div>
                                        </div>
                                        <h5 className="text-slate-900 dark:text-white font-semibold text-sm">{rev.title}</h5>
                                        <p className="text-slate-600 dark:text-gray-300 text-xs sm:text-sm leading-relaxed">{rev.content}</p>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-gray-400 pt-1">
                                            <button className="flex items-center gap-1.5 hover:text-[#00B074] transition-colors cursor-pointer">
                                                <ThumbsUp className="w-3.5 h-3.5" />
                                                <span>Faydalı ({rev.likes})</span>
                                            </button>
                                            <button className="flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-pointer">
                                                <ThumbsDown className="w-3.5 h-3.5" />
                                                <span>Faydasız ({rev.dislikes})</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
