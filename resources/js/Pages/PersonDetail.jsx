import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import MovieCard from '../Components/MovieCard';
import Pagination from '../Components/Pagination';
import {
    Star,
    Calendar,
    MapPin,
    Film,
    Tv,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Search,
    Play,
    CheckCircle2,
    User,
    Sparkles,
    Flame,
    ArrowRight,
    LayoutGrid,
    List,
    X
} from 'lucide-react';

export default function PersonDetail({ person }) {
    const [bioExpanded, setBioExpanded] = useState(false);
    const [selectedTab, setSelectedTab] = useState('all'); // 'all' | 'movie' | 'tv' | 'library'
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('year_desc'); // 'year_desc' | 'year_asc' | 'rating_desc' | 'pop_desc'
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(12);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

    if (!person) {
        return (
            <Layout title="Sanatçı Bulunamadı - SineKutu">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-4">
                    <div className="w-16 h-16 bg-[#131722] border border-white/10 rounded-2xl flex items-center justify-center mx-auto text-gray-500">
                        <User className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Sanatçı Bulunamadı</h1>
                    <p className="text-xs text-gray-400">Aradığınız sanatçı profili bulunamadı.</p>
                    <Link href="/movies" className="inline-block px-6 py-2.5 bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs rounded-xl transition-all">
                        Filmlere Dön
                    </Link>
                </div>
            </Layout>
        );
    }

    const allCredits = person.credits || [];
    const localTitles = person.local_titles || [];
    const knownFor = person.known_for || [];
    const images = person.images || [];

    // Filter and search credits
    const filteredCredits = useMemo(() => {
        let list = [...allCredits];

        if (selectedTab === 'movie') {
            list = list.filter(item => item.media_type === 'movie');
        } else if (selectedTab === 'tv') {
            list = list.filter(item => item.media_type === 'tv');
        } else if (selectedTab === 'library') {
            list = list.filter(item => item.in_library);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter(item =>
                (item.title && item.title.toLowerCase().includes(query)) ||
                (item.original_title && item.original_title.toLowerCase().includes(query)) ||
                (item.character && item.character.toLowerCase().includes(query))
            );
        }

        list.sort((a, b) => {
            if (sortBy === 'year_desc') {
                return (b.year || 0) - (a.year || 0);
            }
            if (sortBy === 'year_asc') {
                return (a.year || 9999) - (b.year || 9999);
            }
            if (sortBy === 'rating_desc') {
                return (b.vote_average || 0) - (a.vote_average || 0);
            }
            if (sortBy === 'pop_desc') {
                return (b.popularity || 0) - (a.popularity || 0);
            }
            return 0;
        });

        return list;
    }, [allCredits, selectedTab, searchQuery, sortBy]);

    const lastPage = Math.max(1, Math.ceil(filteredCredits.length / perPage));

    const paginatedCredits = useMemo(() => {
        const start = (currentPage - 1) * perPage;
        return filteredCredits.slice(start, start + perPage);
    }, [filteredCredits, currentPage, perPage]);

    const movieCreditsCount = allCredits.filter(c => c.media_type === 'movie').length;
    const tvCreditsCount = allCredits.filter(c => c.media_type === 'tv').length;
    const libraryCreditsCount = allCredits.filter(c => c.in_library).length;

    // Format birth date nicely
    const formatBirthDate = (dateStr) => {
        if (!dateStr) return null;
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const hasBio = Boolean(person.biography && person.biography.trim().length > 0);
    const isBioLong = hasBio && person.biography.length > 420;
    const displayBio = hasBio
        ? (isBioLong && !bioExpanded ? `${person.biography.slice(0, 420)}...` : person.biography)
        : 'Bu sanatçı için biyografi bilgisi henüz eklenmedi.';

    return (
        <Layout title={`${person.name} - Sanatçı Profili ve Filmleri - SineKutu`}>
            <Head>
                <meta name="description" content={`${person.name} biyografisi, rol aldığı filmler ve diziler, SineKutu arşivindeki yüksek kaliteli yayınları.`} />
            </Head>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs text-gray-400">
                    <Link href="/" className="hover:text-white transition-colors">Anasayfa</Link>
                    <span>/</span>
                    <Link href="/movies" className="hover:text-white transition-colors">Sanatçılar</Link>
                    <span>/</span>
                    <span className="text-[#00B074] font-semibold">{person.name}</span>
                </nav>

                {/* Hero Profile Header */}
                <div className="relative bg-gradient-to-br from-[#131722] via-[#0F131D] to-[#0A0D14] rounded-3xl p-6 sm:p-10 border border-gray-800/80 shadow-2xl overflow-hidden">
                    {/* Background accent glow */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#00B074]/10 rounded-full filter blur-3xl pointer-events-none -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/5 rounded-full filter blur-3xl pointer-events-none" />

                    <div className="relative flex flex-col md:flex-row gap-8 items-center md:items-start z-10">
                        {/* Profile Image */}
                        <div className="relative shrink-0 group">
                            <div className="w-44 h-60 sm:w-52 sm:h-72 rounded-2xl overflow-hidden border-2 border-[#00B074]/40 shadow-2xl shadow-[#00B074]/20 group-hover:border-[#00B074] transition-all duration-300">
                                <img
                                    src={person.profile_url || person.avatar}
                                    alt={person.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&color=00B074&background=191D28`;
                                    }}
                                />
                            </div>
                            {person.known_for_department && (
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#00B074] text-black font-extrabold text-[11px] px-3.5 py-1 rounded-full shadow-lg whitespace-nowrap uppercase tracking-wider">
                                    {person.known_for_department}
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 text-center md:text-left space-y-5">
                            <div>
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                                    {person.name}
                                </h1>
                                {person.also_known_as && person.also_known_as.length > 0 && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Bilinen diğer isimleri: <span className="text-gray-300">{person.also_known_as.slice(0, 3).join(', ')}</span>
                                    </p>
                                )}
                            </div>

                            {/* Meta Tags */}
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs">
                                {person.birthday && (
                                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-gray-300">
                                        <Calendar className="w-3.5 h-3.5 text-[#00B074]" />
                                        <span>
                                            {formatBirthDate(person.birthday)}
                                            {person.age != null && ` (${person.age} Yaşında)`}
                                        </span>
                                    </div>
                                )}
                                {person.place_of_birth && (
                                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-gray-300">
                                        <MapPin className="w-3.5 h-3.5 text-[#00B074]" />
                                        <span>{person.place_of_birth}</span>
                                    </div>
                                )}
                                {person.gender && person.gender !== 'Belirtilmemiş' && (
                                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-gray-300">
                                        <User className="w-3.5 h-3.5 text-[#00B074]" />
                                        <span>{person.gender}</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                <div className="bg-[#0A0D14]/80 p-3.5 rounded-2xl border border-gray-800 text-center">
                                    <span className="block text-2xl font-black text-white">{person.total_credits || allCredits.length}</span>
                                    <span className="text-[11px] font-medium text-gray-400">Toplam Yapım</span>
                                </div>
                                <div className="bg-[#0A0D14]/80 p-3.5 rounded-2xl border border-gray-800 text-center relative overflow-hidden">
                                    <span className="block text-2xl font-black text-[#00B074]">{person.local_titles_count || 0}</span>
                                    <span className="text-[11px] font-medium text-gray-400">Sitede Mevcut</span>
                                    {person.local_titles_count > 0 && (
                                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#00B074] animate-pulse" />
                                    )}
                                </div>
                                <div className="bg-[#0A0D14]/80 p-3.5 rounded-2xl border border-gray-800 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <Star className="w-4 h-4 fill-[#00B074] text-[#00B074]" />
                                        <span className="text-2xl font-black text-white">
                                            {knownFor.length > 0
                                                ? (knownFor.reduce((acc, cur) => acc + (cur.vote_average || 0), 0) / knownFor.length).toFixed(1)
                                                : '8.1'}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-medium text-gray-400">Ortalama Puan</span>
                                </div>
                                <div className="bg-[#0A0D14]/80 p-3.5 rounded-2xl border border-gray-800 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <Flame className="w-4 h-4 text-amber-400" />
                                        <span className="text-2xl font-black text-white">{person.popularity || '42.5'}</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-gray-400">Popülerlik</span>
                                </div>
                            </div>

                            {/* Biography */}
                            <div className="bg-[#0A0D14]/60 p-4 sm:p-5 rounded-2xl border border-gray-800/80">
                                <h3 className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-[#00B074]" /> Biyografi
                                </h3>
                                <p className="text-sm text-gray-300 leading-relaxed font-normal">
                                    {displayBio}
                                </p>
                                {isBioLong && (
                                    <button
                                        onClick={() => setBioExpanded(!bioExpanded)}
                                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#00B074] hover:text-[#00B074]/80 transition-colors cursor-pointer"
                                    >
                                        <span>{bioExpanded ? "Daha Az Göster" : "Devamını Oku"}</span>
                                        {bioExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                            </div>

                            {/* External Links */}
                            {person.external_ids && (person.external_ids.imdb_url || person.external_ids.instagram_url || person.external_ids.twitter_url) && (
                                <div className="flex items-center gap-3 pt-1 justify-center md:justify-start">
                                    {person.external_ids.imdb_url && (
                                        <a
                                            href={person.external_ids.imdb_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5C518] hover:bg-[#E5B508] text-black font-black text-xs rounded-xl shadow transition-all hover:scale-105"
                                        >
                                            <span>IMDb</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {person.external_ids.instagram_url && (
                                        <a
                                            href={person.external_ids.instagram_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow transition-all hover:scale-105"
                                        >
                                            <span>Instagram</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {person.external_ids.twitter_url && (
                                        <a
                                            href={person.external_ids.twitter_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1DA1F2] hover:bg-[#0c85d0] text-white font-bold text-xs rounded-xl shadow transition-all hover:scale-105"
                                        >
                                            <span>Twitter / X</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 1: Available in SineKutu (Local Library) */}
                {localTitles.length > 0 && (
                    <section className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-8 bg-[#00B074] rounded-full" />
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                                        SineKutu'da İzlenebilir Yapımları
                                        <span className="text-xs font-bold bg-[#00B074]/20 text-[#00B074] border border-[#00B074]/30 px-2.5 py-0.5 rounded-full">
                                            {localTitles.length} Yapım
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {person.name}'ın sitemizde bulunan ve hemen yüksek kalitede izleyip indirebileceğiniz yapımları.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {localTitles.map((item) => (
                                <div key={item.id} className="flex flex-col">
                                    <MovieCard item={item} />
                                    {item.character && (
                                        <div className="mt-1 px-2 py-1 bg-[#131722] border border-gray-800 rounded-lg text-center">
                                            <span className="text-[11px] text-[#00B074] font-semibold line-clamp-1">
                                                {item.character}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Section 2: Known For (Öne Çıkanlar) */}
                {knownFor.length > 0 && (
                    <section className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-8 bg-amber-500 rounded-full" />
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-white">Öne Çıkan Eserleri</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">{person.name}'ın kariyerinde en çok beğenilen ve ses getiren yapımları.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
                            {knownFor.map((item, idx) => {
                                const CardWrapper = item.in_library && item.library_url ? Link : 'div';
                                const cardProps = item.in_library && item.library_url ? { href: item.library_url } : {};

                                return (
                                    <CardWrapper
                                        key={idx}
                                        {...cardProps}
                                        className="group bg-[#131722] rounded-xl overflow-hidden border border-gray-800/80 hover:border-[#00B074]/60 transition-all flex flex-col cursor-pointer"
                                    >
                                        <div className="relative aspect-[2/3] overflow-hidden bg-[#0A0D14]">
                                            <img
                                                src={item.poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400'}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            {item.in_library && (
                                                <div className="absolute top-2 left-2 bg-[#00B074] text-black text-[10px] font-black px-2 py-0.5 rounded shadow">
                                                    Sitede Var
                                                </div>
                                            )}
                                            {item.vote_average > 0 && (
                                                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                    <span>{item.vote_average}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                                            <h4 className="text-white font-bold text-xs line-clamp-1 group-hover:text-[#00B074] transition-colors">
                                                {item.title}
                                            </h4>
                                            <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                                                <span>{item.year || '-'}</span>
                                                <span className="text-gray-500">{item.media_type === 'tv' ? 'Dizi' : 'Film'}</span>
                                            </div>
                                        </div>
                                    </CardWrapper>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Section 3: Full Filmography */}
                <section id="filmography-section" className="bg-[#131722] rounded-3xl p-6 sm:p-8 border border-gray-800/80 shadow-2xl space-y-6 scroll-mt-24">
                    {/* Top Row: Title, Subtitle, View Switcher & PerPage */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-7 bg-[#00B074] rounded-full shadow-lg shadow-[#00B074]/30" />
                                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                                    Tüm Filmografi
                                    <span className="text-xs font-bold bg-[#00B074]/15 text-[#00B074] border border-[#00B074]/30 px-3 py-0.5 rounded-full">
                                        {filteredCredits.length} Yapım
                                    </span>
                                </h2>
                            </div>
                            <p className="text-xs text-gray-400 mt-1 pl-5.5">
                                Kariyeri boyunca rol aldığı tüm sinema filmleri ve televizyon dizileri.
                            </p>
                        </div>

                        {/* View Switcher & Per Page */}
                        <div className="flex items-center gap-2.5 self-start sm:self-center">
                            {/* Grid / List Switcher */}
                            <div className="flex items-center bg-[#0A0D14] p-1 rounded-xl border border-gray-800 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    title="Liste Görünümü"
                                    className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-[#00B074] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    title="Kart / Izgara Görünümü"
                                    className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-[#00B074] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Per Page Select */}
                            <select
                                value={perPage}
                                onChange={(e) => {
                                    setPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-[#0A0D14] border border-gray-800 text-gray-300 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-[#00B074] cursor-pointer shadow-inner"
                                title="Sayfa başına gösterilecek yapım sayısı"
                            >
                                <option value={12}>12 Yapım</option>
                                <option value={24}>24 Yapım</option>
                                <option value={48}>48 Yapım</option>
                            </select>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#0A0D14]/90 p-3 sm:p-3.5 rounded-2xl border border-gray-800/80 shadow-md">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Film veya karakter adı ile ara..."
                                className="w-full pl-10 pr-9 py-2 bg-[#131722] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B074] shadow-inner transition-colors"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold overflow-x-auto py-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedTab('all');
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${selectedTab === 'all' ? 'bg-[#00B074] text-black font-black shadow-md shadow-[#00B074]/20' : 'bg-[#131722] text-gray-400 hover:text-white border border-gray-800'}`}
                            >
                                Tümü ({allCredits.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedTab('movie');
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${selectedTab === 'movie' ? 'bg-[#00B074] text-black font-black shadow-md shadow-[#00B074]/20' : 'bg-[#131722] text-gray-400 hover:text-white border border-gray-800'}`}
                            >
                                Filmler ({movieCreditsCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedTab('tv');
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${selectedTab === 'tv' ? 'bg-[#00B074] text-black font-black shadow-md shadow-[#00B074]/20' : 'bg-[#131722] text-gray-400 hover:text-white border border-gray-800'}`}
                            >
                                Diziler ({tvCreditsCount})
                            </button>
                            {libraryCreditsCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedTab('library');
                                        setCurrentPage(1);
                                    }}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${selectedTab === 'library' ? 'bg-[#00B074] text-black font-black shadow-md shadow-[#00B074]/20' : 'bg-[#00B074]/10 text-[#00B074] hover:bg-[#00B074]/20 border border-[#00B074]/30'}`}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Sitede Olanlar ({libraryCreditsCount})</span>
                                </button>
                            )}
                        </div>

                        {/* Sort Dropdown */}
                        <select
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="bg-[#131722] border border-gray-800 text-gray-300 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-[#00B074] cursor-pointer shadow-inner"
                        >
                            <option value="year_desc">Yıl (Yeniden Eskiye)</option>
                            <option value="year_asc">Yıl (Eskiden Yeniye)</option>
                            <option value="rating_desc">Puan (En Yüksek)</option>
                            <option value="pop_desc">Popülerlik</option>
                        </select>
                    </div>

                    {/* Content List or Grid */}
                    {filteredCredits.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 space-y-3 bg-[#0A0D14]/40 rounded-2xl border border-gray-800/50">
                            <p className="text-sm font-medium">Arama veya filtre kriterlerinize uygun yapım bulunamadı.</p>
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedTab('all'); setCurrentPage(1); }}
                                className="inline-block px-4 py-1.5 bg-[#00B074]/15 text-[#00B074] border border-[#00B074]/30 rounded-xl text-xs font-bold hover:bg-[#00B074] hover:text-black transition-all"
                            >
                                Filtreleri Sıfırla
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* LIST VIEW */}
                            {viewMode === 'list' && (
                                <div className="space-y-3">
                                    {paginatedCredits.map((item, idx) => (
                                        <div
                                            key={item.tmdb_id || idx}
                                            className="group bg-[#0E121B] hover:bg-[#151B28] border border-gray-800/80 hover:border-[#00B074]/50 rounded-2xl p-3 sm:p-4 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-[#00B074]/5 flex items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
                                                {/* Timeline Year Pill */}
                                                <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-[#0A0D14] border border-gray-800 flex flex-col items-center justify-center shrink-0 group-hover:border-[#00B074]/40 group-hover:bg-[#00B074]/5 transition-colors">
                                                    <span className="text-sm sm:text-base font-black text-white group-hover:text-[#00B074] transition-colors">
                                                        {item.year || '—'}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                                                        YIL
                                                    </span>
                                                </div>

                                                {/* Poster Thumbnail */}
                                                <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl overflow-hidden bg-gray-950 border border-gray-800 shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300 relative">
                                                    {item.poster ? (
                                                        <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                                                            {item.media_type === 'tv' ? <Tv className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                                                        </div>
                                                    )}
                                                    {item.in_library && (
                                                        <div className="absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-[#00B074] shadow-md animate-pulse" />
                                                    )}
                                                </div>

                                                {/* Title & Character Info */}
                                                <div className="min-w-0 space-y-1.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="text-sm sm:text-base font-black text-white group-hover:text-[#00B074] transition-colors truncate">
                                                            {item.title}
                                                        </h4>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider ${item.media_type === 'tv' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                                                            {item.media_type === 'tv' ? 'Dizi' : 'Film'}
                                                        </span>
                                                        {item.in_library && (
                                                            <span className="bg-[#00B074]/20 text-[#00B074] border border-[#00B074]/30 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                                                                Sitede Mevcut
                                                            </span>
                                                        )}
                                                    </div>

                                                    {item.character ? (
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <span className="text-gray-400">Canlandırdığı Rol:</span>
                                                            <span className="text-[#00B074] font-semibold bg-[#0A0D14] border border-gray-800/80 px-2 py-0.5 rounded-md truncate max-w-[200px] sm:max-w-md">
                                                                {item.character}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-500">Rol bilgisi belirtilmemiş</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right: Rating & Action */}
                                            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                                {item.vote_average > 0 && (
                                                    <div className="bg-[#0A0D14] border border-gray-800 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                        <span className="text-xs font-bold text-white">{item.vote_average}</span>
                                                    </div>
                                                )}

                                                {item.in_library && item.library_url ? (
                                                    <Link
                                                        href={item.library_url}
                                                        className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-[#00B074] hover:bg-[#009663] text-black font-extrabold text-xs rounded-xl transition-all shadow-md shadow-[#00B074]/20 hover:scale-105 cursor-pointer whitespace-nowrap"
                                                    >
                                                        <Play className="w-3.5 h-3.5 fill-black" />
                                                        <span>Sitede İzle</span>
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-gray-500 bg-[#0A0D14] border border-gray-800/80 px-3 py-1.5 rounded-xl hidden sm:inline-block">
                                                        Arşivde Yok
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* GRID VIEW */}
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {paginatedCredits.map((item, idx) => (
                                        <div
                                            key={item.tmdb_id || idx}
                                            className="group relative bg-[#0E121B] rounded-2xl overflow-hidden border border-gray-800/80 hover:border-[#00B074]/60 transition-all duration-300 flex flex-col hover:shadow-xl hover:shadow-[#00B074]/10 hover:scale-[1.02]"
                                        >
                                            {/* Poster Aspect Ratio */}
                                            <div className="relative aspect-[2/3] overflow-hidden bg-gray-950">
                                                {item.poster ? (
                                                    <img
                                                        src={item.poster}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                                                        {item.media_type === 'tv' ? <Tv className="w-8 h-8" /> : <Film className="w-8 h-8" />}
                                                        <span className="text-[11px]">Afiş Yok</span>
                                                    </div>
                                                )}

                                                {/* Top Badges */}
                                                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                                                    {item.in_library ? (
                                                        <span className="bg-[#00B074] text-black text-[10px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider">
                                                            Sitede Var
                                                        </span>
                                                    ) : (
                                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow uppercase tracking-wider ${item.media_type === 'tv' ? 'bg-purple-600/90 text-white' : 'bg-blue-600/90 text-white'}`}>
                                                            {item.media_type === 'tv' ? 'Dizi' : 'Film'}
                                                        </span>
                                                    )}

                                                    {item.vote_average > 0 && (
                                                        <div className="bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                            <span>{item.vote_average}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Hover Action Overlay if in library */}
                                                {item.in_library && item.library_url && (
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                                        <Link
                                                            href={item.library_url}
                                                            className="w-12 h-12 rounded-full bg-[#00B074] hover:bg-[#009663] text-black flex items-center justify-center shadow-xl shadow-[#00B074]/30 hover:scale-110 transition-transform"
                                                        >
                                                            <Play className="w-5 h-5 fill-black ml-0.5" />
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                                                <div>
                                                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                                                        <span className="font-semibold text-gray-300">{item.year || '—'}</span>
                                                        <span>{item.media_type === 'tv' ? 'Dizi' : 'Film'}</span>
                                                    </div>
                                                    <h4 className="text-sm font-extrabold text-white group-hover:text-[#00B074] transition-colors line-clamp-1">
                                                        {item.title}
                                                    </h4>
                                                </div>

                                                {item.character && (
                                                    <div className="pt-1.5 border-t border-gray-800/80">
                                                        <p className="text-[11px] text-[#00B074] font-medium line-clamp-1" title={item.character}>
                                                            🎭 {item.character}
                                                        </p>
                                                    </div>
                                                )}

                                                {item.in_library && item.library_url && (
                                                    <Link
                                                        href={item.library_url}
                                                        className="w-full mt-2 py-1.5 bg-[#00B074]/15 hover:bg-[#00B074] text-[#00B074] hover:text-black border border-[#00B074]/30 text-xs font-bold rounded-xl text-center transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <Play className="w-3 h-3 fill-current" />
                                                        <span>SineKutu'da İzle</span>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {filteredCredits.length > perPage && (
                                <div className="pt-4 border-t border-gray-800/80">
                                    <Pagination
                                        pagination={{
                                            current_page: currentPage,
                                            last_page: lastPage,
                                            total: filteredCredits.length
                                        }}
                                        onPageChange={(page) => {
                                            setCurrentPage(page);
                                            const elem = document.getElementById('filmography-section');
                                            if (elem) {
                                                elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Section 4: Photo Gallery (If Available) */}
                {images.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-8 bg-blue-500 rounded-full" />
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">Fotoğraf Galerisi</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{person.name}'ın çeşitli dönem ve yapımlardan fotoğrafları.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {images.map((img, idx) => (
                                <div key={idx} className="aspect-[2/3] rounded-2xl overflow-hidden border border-gray-800 bg-[#131722] group">
                                    <img
                                        src={img.url}
                                        alt={`${person.name} ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </Layout>
    );
}
