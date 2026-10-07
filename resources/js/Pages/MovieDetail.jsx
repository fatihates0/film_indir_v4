import React, { useState, useRef, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import {
    Play, Bookmark, Check, Heart, Share2, Download, Volume2, VolumeX,
    Star, Calendar, Clock, ChevronRight, ChevronLeft, ChevronDown,
    CheckCircle2, ThumbsUp, ThumbsDown, ArrowRight, MessageSquare, HardDrive, Film, Sparkles, ShieldCheck,
    LayoutGrid, List
} from 'lucide-react';
import MovieCard from '../Components/MovieCard';
import HeroTrailerBackground from '../Components/HeroTrailerBackground';
import { toTrGenreList } from '../Utils/genreHelper';
import { getCinemaVersion, cinemaConfig } from '../Config/cinemaConfig';
import { useHeroIdleFade } from '../Utils/useHeroIdleFade';


export default function MovieDetail({ movie, similarMovies, reviews, universe, news, collection }) {
    const [activeTab, setActiveTab] = useState('similar');
    const [downloadViewMode, setDownloadViewMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sinekutu_download_view') || 'grid';
        }
        return 'grid';
    });
    const [isLiked, setIsLiked] = useState(false);
    const [inWatchlist, setInWatchlist] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [showTrailerModal, setShowTrailerModal] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
    const [canExpandOverview, setCanExpandOverview] = useState(false);

    const castScrollRef = useRef(null);
    const overviewRef = useRef(null);
    const heroRef = useRef(null);

    if (!movie) {
        return (
            <Layout title="Film Bulunamadı - SineKutu">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center space-y-4">
                    <div className="w-16 h-16 bg-white dark:bg-[#131722] border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center mx-auto text-slate-400 dark:text-gray-500">
                        <Play className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Film Bulunamadı</h1>
                    <p className="text-sm text-slate-600 dark:text-gray-400">Aradığınız film arşivde bulunamadı veya henüz eklenmedi.</p>
                    <Link href="/movies" className="inline-block px-6 py-2.5 bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs rounded-xl transition-all">
                        Filmlere Dön
                    </Link>
                </div>
            </Layout>
        );
    }

    const defaultMovie = movie;

    const trailersList = Array.isArray(defaultMovie?.trailers) && defaultMovie.trailers.length > 0
        ? defaultMovie.trailers
        : (defaultMovie?.trailer ? [defaultMovie.trailer] : []);

    const [activeTrailerKey, setActiveTrailerKey] = useState(defaultMovie?.trailer?.key || trailersList[0]?.key || null);

    useEffect(() => {
        if (defaultMovie?.trailer?.key) {
            setActiveTrailerKey(defaultMovie.trailer.key);
        } else if (trailersList[0]?.key) {
            setActiveTrailerKey(trailersList[0].key);
        }
    }, [defaultMovie?.id, defaultMovie?.trailer?.key]);

    const activeTrailer = trailersList.find(t => t.key === activeTrailerKey) || defaultMovie?.trailer || trailersList[0] || null;
    const rawCast = Array.isArray(defaultMovie?.cast)
        ? defaultMovie.cast
        : (Array.isArray(defaultMovie?.cast?.data) ? defaultMovie.cast.data : []);
    const castList = rawCast.filter(item => !item.role_type || item.role_type === 'cast');

    const genresList = toTrGenreList(defaultMovie?.genres);

    const rawMediaFiles = Array.isArray(defaultMovie?.media_files) ? defaultMovie.media_files : [];

    const movieCleanSlug = (defaultMovie.title || 'Film')
        .replace(/[^a-zA-Z0-9]/g, '.')
        .replace(/\.+/g, '.');

    const downloadList = rawMediaFiles.length > 0
        ? rawMediaFiles.map((file, idx) => {
            const q = file.quality || '1080p';
            const is4k = q.toLowerCase().includes('2160') || q.toLowerCase().includes('4k');
            const is720 = q.toLowerCase().includes('720');
            const source = (file.properties?.find(p => ['bluray', 'web-dl', 'bdrip', 'hdtv', 'webrip'].includes(p.toLowerCase())) || 'BluRay').toUpperCase();
            const videoCodec = file.video_codec || (is4k ? 'x265 / HEVC 10-Bit' : 'x264 / AVC');
            const audioCodec = file.audio_codec || 'DUAL (TR Dublaj - EN)';
            const audioChannels = is4k ? 'Dolby Atmos 7.1' : (is720 ? '2.0 Stereo AC3' : '5.1 DTS Surround');

            return {
                id: file.id || idx + 1,
                name: file.name || `${movieCleanSlug}.${defaultMovie.year || 2024}.${q}.${source}.${videoCodec.split(' ')[0]}.DUAL.mkv`,
                clean_title: file.clean_title || `${defaultMovie.title} - ${is4k ? '4K Ultra HD' : (is720 ? 'HD 720p' : 'Full HD 1080p')}`,
                quality: q,
                quality_badge: is4k ? '4K UHD' : (is720 ? '720p HD' : '1080p FHD'),
                quality_grade: is4k ? '4k' : (is720 ? '720p' : '1080p'),
                source,
                video_codec: videoCodec,
                audio_codec: audioCodec,
                audio_channels: audioChannels,
                extension: file.extension || 'MKV',
                formatted_size: file.formatted_size || (is4k ? '14.85 GB' : (is720 ? '1.25 GB' : '2.65 GB')),
                download_url: file.download_url || `/downloads?id=${file.id || idx + 1}`,
            };
        })
        : [
            {
                id: 1,
                name: `${movieCleanSlug}.${defaultMovie.year || 2024}.2160p.UHD.HDR.BluRay.x265.DUAL.mkv`,
                clean_title: `${defaultMovie.title} - 4K Ultra HD BluRay`,
                quality: '2160p',
                quality_badge: '4K UHD',
                quality_grade: '4k',
                source: 'BLURAY',
                video_codec: 'x265 / HEVC 10-Bit HDR',
                audio_codec: 'DUAL (TR Dublaj - EN)',
                audio_channels: 'Dolby Atmos 7.1',
                extension: 'MKV',
                formatted_size: '14.85 GB',
                download_url: `/downloads?id=${defaultMovie.id}&q=4k`,
            },
            {
                id: 2,
                name: `${movieCleanSlug}.${defaultMovie.year || 2024}.1080p.BluRay.x264.DUAL.mkv`,
                clean_title: `${defaultMovie.title} - Full HD 1080p BluRay`,
                quality: '1080p',
                quality_badge: '1080p FHD',
                quality_grade: '1080p',
                source: 'BLURAY',
                video_codec: 'x264 / AVC High@L4.1',
                audio_codec: 'DUAL (TR Dublaj - EN)',
                audio_channels: '5.1 DTS Surround',
                extension: 'MKV',
                formatted_size: '2.65 GB',
                download_url: `/downloads?id=${defaultMovie.id}&q=1080p`,
            },
            {
                id: 3,
                name: `${movieCleanSlug}.${defaultMovie.year || 2024}.720p.WEB-DL.x264.DUAL.mkv`,
                clean_title: `${defaultMovie.title} - HD 720p WEB-DL`,
                quality: '720p',
                quality_badge: '720p HD',
                quality_grade: '720p',
                source: 'WEB-DL',
                video_codec: 'x264 / AVC',
                audio_codec: 'DUAL (TR Dublaj - EN)',
                audio_channels: '2.0 Stereo AC3',
                extension: 'MP4',
                formatted_size: '1.20 GB',
                download_url: `/downloads?id=${defaultMovie.id}&q=720p`,
            }
        ];

    const mediaFiles = downloadList;


    const mockReviews = reviews || [
        {
            id: 1,
            user: "Alex Rivera",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
            rating: 10,
            date: "2 days ago",
            title: "A visual and acoustic triumph",
            content: "Christopher Nolan delivers a visual and emotional epic that pushes the boundaries of cinematic storytelling. The score elevates every scene to unimaginable heights.",
            likes: 142,
            dislikes: 8
        },
        {
            id: 2,
            user: "Sarah Jenkins",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
            rating: 9,
            date: "1 week ago",
            title: "Visually breathtaking and deeply moving",
            content: "The representation of black holes and relativity is sci-fi at its finest. McConaughey gives a career-best performance that lingers long after.",
            likes: 98,
            dislikes: 3
        }
    ];

    const mockUniverse = universe || [
        { id: 101, title: `${defaultMovie.title}: Prelude`, type: "Comic", year: 2014, status: "Canon", poster: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80" },
        { id: 102, title: defaultMovie.title, type: "Main Feature", year: defaultMovie.year || 2014, status: "Canon", poster: defaultMovie.poster },
        { id: 103, title: `${defaultMovie.title}: Beyond the Wormhole`, type: "Documentary", year: 2015, status: "Bonus", poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80" }
    ];

    const mockNews = news || [
        { id: 1, title: `10th Anniversary IMAX Re-Release Announced for ${defaultMovie.title}`, date: "Oct 1, 2026", author: "SineKutu Editorial", image: defaultMovie.backdrop, summary: "The masterpiece returns to 70mm IMAX theaters worldwide with remastered audio and exclusive unreleased footage." },
        { id: 2, title: "Scientific Accuracy and Revolutionary Visual Effects Behind the Scenes", date: "Sep 28, 2026", author: "SciFi Daily", image: defaultMovie.poster, summary: "Renowned physicists detail the groundbreaking gravitational simulations created specifically for this production." }
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
    }, [defaultMovie]);

    const overviewText = defaultMovie?.storyline || defaultMovie?.overview || 'Film detayları ve konusu sistemde kayıtlıdır.';

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

    const handleDownload = () => {
        const target = document.getElementById('download-section');
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
        <Layout transparentNavbar={true} title={`${defaultMovie.title} - SineKutu`}>
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
                    backdrop={defaultMovie.backdrop}
                    title={defaultMovie.title}
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
                        {/* Quality / Status Badge & Multi-Trailer Switcher */}
                        <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
                            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#131722]/80 backdrop-blur-md border border-white/15 text-white shadow-sm">
                                <Sparkles className="w-3.5 h-3.5 text-[#00B074]" />
                                <span>{defaultMovie.quality || '4K Ultra HD'}</span>
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
                            {defaultMovie.title}
                        </h1>

                        {/* Metadata row: Rating · Year · Duration · Genres */}
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-900 dark:text-gray-300 font-medium mb-7">
                            <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold">
                                <Star className="w-4 h-4 fill-amber-500 dark:fill-amber-400 text-amber-500 dark:text-amber-400" />
                                <span className="text-slate-900 dark:text-white font-bold">{defaultMovie.rating || '4.9'}</span>
                            </div>
                            <span className="text-slate-900 dark:text-gray-500">·</span>
                            <span>{defaultMovie.year || '2023'}</span>
                            {defaultMovie.duration && (
                                <>
                                    <span className="text-slate-900 dark:text-gray-500">·</span>
                                    <span>{defaultMovie.duration}</span>
                                </>
                            )}
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
                                        if (activeTrailer) {
                                            setIsMuted(false);
                                        }
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
                                { name: "Matthew McConaughey", role: "Cooper", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" },
                                { name: "Anne Hathaway", role: "Brand", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" },
                                { name: "Jessica Chastain", role: "Murph", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" },
                                { name: "Michael Caine", role: "Professor Brand", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" },
                                { name: "Matt Damon", role: "Mann", image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80" },
                                { name: "Casey Affleck", role: "Tom", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80" },
                                { name: "John Lithgow", role: "Donald", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80" },
                                { name: "Ellen Burstyn", role: "Old Murph", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" }
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

                {/* 3. DEDICATED DOWNLOAD OPTIONS SECTION (Grid or List View) */}
                <div id="download-section" className="scroll-mt-24 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">İndirme Seçenekleri</h2>

                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300 border border-slate-300/60 dark:border-white/10">
                                {downloadList.length} Seçenek
                            </span>
                        </div>

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
                    </div>

                    {downloadViewMode === 'grid' ? (
                        /* 4 Items Per Row Grid Track flowing downwards */
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                            {downloadList.map((file, idx) => {
                                const is4k = file.quality_grade === '4k';
                                const is1080 = file.quality_grade === '1080p';

                                const badgeClass = is4k
                                    ? 'bg-amber-500/25 text-amber-300 border-amber-500/40'
                                    : is1080
                                        ? 'bg-[#00B074]/25 text-[#00B074] border-[#00B074]/40'
                                        : 'bg-sky-500/25 text-sky-300 border-sky-500/40';

                                return (
                                    <div
                                        key={file.id || idx}
                                        className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 hover:border-[#00B074]/60 transition-all duration-300 group shadow-xl flex flex-col justify-end p-4 sm:p-5 select-none"
                                    >
                                        {/* Background image */}
                                        <img
                                            src={defaultMovie.backdrop || defaultMovie.poster}
                                            alt={file.name}
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />

                                        {/* Dark gradient overlay matching reference */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/25 pointer-events-none" />

                                        {/* Content at Bottom - Matching reference image typography */}
                                        <div className="relative z-10 space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-white font-bold text-sm sm:text-base group-hover:text-[#00B074] transition-colors truncate">
                                                    {file.clean_title || `${file.quality_badge} ${file.source || ''}`}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border backdrop-blur-md ${badgeClass}`}>
                                                    {file.quality_badge}
                                                </span>
                                            </div>
                                            <p className="text-gray-300/90 text-xs line-clamp-2 leading-relaxed">
                                                {file.video_codec} • {file.audio_codec} {file.audio_channels ? `• ${file.audio_channels}` : ''} • {file.extension}
                                            </p>

                                            {/* Bottom Action Row */}
                                            <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold px-2.5 py-1 rounded-md bg-black/60 border border-white/10 backdrop-blur-md">
                                                    <HardDrive className="w-3.5 h-3.5 text-[#00B074]" />
                                                    <span>{file.formatted_size}</span>
                                                </div>

                                                <a
                                                    href={file.download_url}
                                                    className="px-4 py-1.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold transition-all shadow-md shadow-[#00B074]/30 flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>İndir</span>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Modern List View */
                        <div className="space-y-3">
                            {downloadList.map((file, idx) => {
                                const is4k = file.quality_grade === '4k';
                                const is1080 = file.quality_grade === '1080p';

                                const badgeClass = is4k
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 shadow-amber-500/10'
                                    : is1080
                                        ? 'bg-[#00B074]/20 text-[#00B074] border-[#00B074]/40 shadow-[#00B074]/10'
                                        : 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/40 shadow-sky-500/10';

                                const avatarBg = is4k
                                    ? 'from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : is1080
                                        ? 'from-[#00B074]/20 to-emerald-600/10 text-[#00B074] border-[#00B074]/30'
                                        : 'from-sky-500/20 to-blue-600/10 text-sky-600 dark:text-sky-400 border-sky-500/30';

                                return (
                                    <div
                                        key={file.id || idx}
                                        className="group relative bg-white dark:bg-[#131722]/80 hover:bg-slate-50 dark:hover:bg-[#181D2A] border border-slate-200 dark:border-white/10 hover:border-[#00B074]/50 rounded-2xl p-4 sm:p-5 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm dark:shadow-lg backdrop-blur-sm"
                                    >
                                        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                                            {/* Quality Icon Avatar */}
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br border flex flex-col items-center justify-center shrink-0 shadow-inner ${avatarBg}`}>
                                                <Film className="w-4 h-4 mb-0.5 opacity-80" />
                                                <span className="text-[10px] font-black tracking-wider leading-none">
                                                    {is4k ? '4K' : (is1080 ? '1080P' : '720P')}
                                                </span>
                                            </div>

                                            {/* Details & Metadata */}
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-slate-900 dark:text-white font-bold text-sm sm:text-base group-hover:text-[#00B074] transition-colors truncate">
                                                        {file.clean_title || `${file.quality_badge} ${file.source || ''}`}
                                                    </h3>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${badgeClass}`}>
                                                        {file.quality_badge}
                                                    </span>
                                                </div>

                                                {/* Technical tags */}
                                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                                    {file.source && (
                                                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-semibold text-slate-700 dark:text-gray-200">
                                                            {file.source}
                                                        </span>
                                                    )}
                                                    {file.video_codec && (
                                                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300">
                                                            {file.video_codec}
                                                        </span>
                                                    )}
                                                    {file.audio_codec && (
                                                        <span className="px-2 py-0.5 rounded bg-[#00B074]/10 border border-[#00B074]/20 text-[#00B074] font-medium">
                                                            {file.audio_codec}
                                                        </span>
                                                    )}
                                                    {file.audio_channels && (
                                                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300">
                                                            {file.audio_channels}
                                                        </span>
                                                    )}
                                                    {file.extension && (
                                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 font-mono text-[10px] uppercase">
                                                            {file.extension}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Action: Size + Download Button */}
                                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-white/10">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-gray-300 font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10">
                                                <HardDrive className="w-4 h-4 text-[#00B074]" />
                                                <span>{file.formatted_size}</span>
                                            </div>

                                            <a
                                                href={file.download_url}
                                                className="px-5 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#00B074]/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span>İndir</span>
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>


                {/* 4. TABS BAR - Underline style as in reference */}
                <div className="border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-8 text-sm overflow-x-auto no-scrollbar">
                        {[
                            { id: 'similar', label: 'Benzer Filmler' },
                            ...(collection && collection.parts && collection.parts.length > 0
                                ? [{ id: 'universe', label: `Serinin Diğer Filmleri (${collection.parts.length})` }]
                                : (universe ? [{ id: 'universe', label: 'Serinin Diğer Filmleri' }] : [])),
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
                <div id="movie-tabs-content" className="pt-2">
                    {/* SIMILAR MOVIES TAB */}
                    {activeTab === 'similar' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                                {(similarMovies && similarMovies.length > 0 ? similarMovies : [
                                    { id: 2, title: "Başlangıç", rating: "8.8", year: "2010", poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80" },
                                    { id: 3, title: "Marslı", rating: "8.0", year: "2015", poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80" },
                                    { id: 4, title: "Yerçekimi", rating: "7.7", year: "2013", poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80" },
                                    { id: 5, title: "Geliş", rating: "7.9", year: "2016", poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80" },
                                    { id: 6, title: "Bıçak Sırtı 2049", rating: "8.0", year: "2017", poster: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=80" },
                                    { id: 7, title: "Tenet", rating: "7.3", year: "2020", poster: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80" }
                                ]).map((item) => (
                                    <MovieCard key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    )}


                    {/* SERININ DIGER FILMLERI TAB */}
                    {activeTab === 'universe' && (
                        <div className="space-y-6">
                            {collection && collection.parts && collection.parts.length > 0 ? (
                                <>
                                    {/* Header Banner */}
                                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-[#131722] dark:via-[#10141e] dark:to-[#0A0D14] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/5 shadow-md dark:shadow-xl">
                                        {collection.backdrop && (
                                            <div
                                                className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none filter blur-sm"
                                                style={{ backgroundImage: `url(${collection.backdrop})` }}
                                            />
                                        )}
                                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="space-y-2 max-w-2xl">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#00B074]/15 text-[#00B074] border border-[#00B074]/30">
                                                    <Film className="w-3.5 h-3.5" />
                                                    <span>Film Serisi / Koleksiyon</span>
                                                </div>
                                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-wide">
                                                    {collection.name}
                                                </h3>
                                                <p className="text-slate-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-3">
                                                    {collection.overview || `${collection.name} serisine ait tüm filmler çıkış sırasına göre listelenmiştir.`}
                                                </p>
                                            </div>

                                            {/* Stats summary */}
                                            <div className="flex items-center gap-3 sm:gap-4 shrink-0 bg-white/90 dark:bg-[#0A0D14]/80 backdrop-blur-md p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-white/10 self-start md:self-auto">
                                                <div className="text-center px-2">
                                                    <span className="block text-xl font-black text-slate-900 dark:text-white">{collection.total_parts}</span>
                                                    <span className="text-[11px] font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Seri Film</span>
                                                </div>
                                                <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                                                <div className="text-center px-2">
                                                    <span className="block text-xl font-black text-[#00B074]">{collection.available_count}</span>
                                                    <span className="text-[11px] font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Sitede</span>
                                                </div>
                                                <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                                                <div className="text-center px-2">
                                                    <span className="block text-xl font-black text-amber-500 dark:text-amber-400">{collection.total_parts - collection.available_count}</span>
                                                    <span className="text-[11px] font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Ekli Değil</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parts Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {collection.parts.map((item, idx) => (
                                            <div
                                                key={item.id || idx}
                                                className={`group relative rounded-2xl overflow-hidden bg-white dark:bg-[#131722] border transition-all duration-300 flex flex-col justify-between ${item.is_current
                                                    ? 'border-[#00B074] ring-2 ring-[#00B074]/30 shadow-lg shadow-[#00B074]/10'
                                                    : item.is_available
                                                        ? 'border-slate-200 dark:border-white/10 hover:border-[#00B074]/60 hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-black/40 hover:-translate-y-1'
                                                        : 'border-slate-200/60 dark:border-white/5 opacity-80 hover:opacity-95'
                                                    }`}
                                            >
                                                <div>
                                                    {/* Poster / Backdrop Header */}
                                                    <div className="relative aspect-[16/10] sm:aspect-[16/11] w-full overflow-hidden bg-slate-900 dark:bg-[#0A0D14]">
                                                        {item.backdrop || item.poster ? (
                                                            <img
                                                                src={item.backdrop || item.poster}
                                                                alt={item.title}
                                                                className={`w-full h-full object-cover transition-transform duration-500 ${item.is_available ? 'group-hover:scale-105' : 'grayscale-[40%]'
                                                                    }`}
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-gray-600">
                                                                <Play className="w-8 h-8" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                                                        {/* Chronological Order Tag */}
                                                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-white font-extrabold text-xs shadow-md">
                                                            #{idx + 1}
                                                        </div>

                                                        {/* Availability status badge */}
                                                        <div className="absolute top-3 right-3">
                                                            {item.is_current ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#00B074] text-white shadow-lg shadow-[#00B074]/40">
                                                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                                    Şu Anki Film
                                                                </span>
                                                            ) : item.is_available ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    Sitede Mevcut
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/70 text-gray-400 border border-white/10 backdrop-blur-md">
                                                                    Sitede Ekli Değil
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Bottom Info on Image */}
                                                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                                                            {item.vote_average > 0 ? (
                                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-amber-400 font-bold">
                                                                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                                                                    <span>{item.vote_average}</span>
                                                                </div>
                                                            ) : <span />}

                                                            {item.release_year && (
                                                                <div className="flex items-center gap-1 text-gray-300 font-medium px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10">
                                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                                    <span>{item.release_year}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Content info */}
                                                    <div className="p-4 sm:p-5 space-y-2">
                                                        <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#00B074] transition-colors line-clamp-1">
                                                            {item.title}
                                                        </h4>
                                                        {item.original_title && item.original_title !== item.title && (
                                                            <p className="text-xs text-slate-400 dark:text-gray-500 italic line-clamp-1">
                                                                {item.original_title}
                                                            </p>
                                                        )}
                                                        {item.overview && (
                                                            <p className="text-slate-600 dark:text-gray-400 text-xs line-clamp-2 leading-relaxed mt-1">
                                                                {item.overview}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action footer */}
                                                <div className="p-4 sm:p-5 pt-0 mt-auto">
                                                    {item.is_current ? (
                                                        <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 text-xs font-semibold text-center flex items-center justify-center gap-1.5 cursor-default">
                                                            <Check className="w-4 h-4 text-[#00B074]" />
                                                            <span>Şu An Bu Sayfadasınız</span>
                                                        </div>
                                                    ) : item.is_available && item.url ? (
                                                        <Link
                                                            href={item.url}
                                                            className="w-full py-2.5 px-4 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#00B074]/20 group-hover:shadow-lg group-hover:shadow-[#00B074]/30"
                                                        >
                                                            <span>Filme Git {item.has_download ? '/ İndir' : ''}</span>
                                                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                                                        </Link>
                                                    ) : (
                                                        <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-slate-400 dark:text-gray-500 text-xs font-medium text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                                                            <span>Sitede Ekli Değil</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white dark:bg-[#131722] p-8 rounded-2xl border border-slate-200 dark:border-white/5 text-center space-y-3 shadow-sm">
                                    <Film className="w-10 h-10 text-slate-400 dark:text-gray-600 mx-auto" />
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Seri Bilgisi Bulunamadı</h4>
                                    <p className="text-sm text-slate-500 dark:text-gray-400 max-w-md mx-auto">Bu filme ait bağlantılı bir devam filmi veya film serisi koleksiyonu bulunmamaktadır.</p>
                                </div>
                            )}
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
                                    placeholder="Film hakkındaki düşüncelerinizi paylaşın..."
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

            {/* Trailer Modal */}
            {showTrailerModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#131722] border border-slate-200 dark:border-white/10 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{defaultMovie.title} - Fragman</h3>
                            <button
                                onClick={() => setShowTrailerModal(false)}
                                className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-sm px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5"
                            >
                                Kapat
                            </button>
                        </div>
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                            <p className="text-gray-400 text-sm">Fragman oynatıcı hazırlanıyor...</p>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
