import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import { Play, Plus, Star, ChevronDown, Bookmark } from 'lucide-react';
import MovieCard from '../Components/MovieCard';
import { toTrGenreString } from '../Utils/genreHelper';

export default function Discover({ hero, popularOfWeek, grid, moviesOnAwards, morePopular, newest }) {
    const [activeTab, setActiveTab] = useState('All');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [selectedSort, setSelectedSort] = useState('En Yüksek Puanlı');

    const sortOptions = ['Popüler', 'Son Eklenenler', 'En Yüksek Puanlı', 'En Düşük Puanlı', 'A-Z', 'Z-A'];
    const genreTabs = ['Süper Kahraman', 'Drama', 'Komedi Dizisi', 'Gerilim', 'Komedi', 'Fantastik'];

    return (
        <Layout>
            {/* HERO BANNER */}
            <div className="relative w-full h-[540px] overflow-hidden">
                <img src={hero.backdrop} alt={hero.title} className="w-full h-full object-cover filter brightness-75" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0A0D14] via-[#0A0D14]/80 to-transparent w-2/3" />

                <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12">
                    <div className="max-w-xl space-y-3">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-md text-xs font-semibold text-white">
                            {hero.season}
                        </span>
                        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">{hero.title}</h1>
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                            <Star className="w-4 h-4 fill-amber-400" />
                            <span>{hero.rating}</span>
                            <span className="text-gray-300">• {hero.year} {toTrGenreString(hero.genres, ' • ', 3) ? `• ${toTrGenreString(hero.genres, ' • ', 3)}` : ''}</span>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-3">{hero.description}</p>

                        <div className="flex items-center gap-3 pt-2">
                            <Link href="/movie/flash" className="px-6 py-2.5 bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs rounded-xl flex items-center gap-2">
                                <Play className="w-4 h-4 fill-white" /> Hemen İzle
                            </Link>
                            <button className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold text-xs rounded-xl flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Listeme Ekle
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 py-10">

                {/* POPULAR OF THE WEEK */}
                <section>
                    <h2 className="text-xl font-bold text-white mb-6">Haftanın Popülerleri</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {popularOfWeek.map((item) => (
                            <Link key={item.id} href={`/movie/${item.id}`} className="flex items-center gap-4 bg-[#0A0D14] p-3 rounded-2xl border border-white/5 hover:border-[#00B074]/50 transition-all group">
                                <span className="text-4xl font-black text-white/80 group-hover:text-[#00B074] w-8 text-center">{item.rank}</span>
                                <img src={item.poster} alt={item.title} className="w-16 h-24 rounded-xl object-cover" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                                    <p className="text-[10px] text-gray-400 mt-1">{item.genres}</p>
                                    <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold mt-2">
                                        <Star className="w-3 h-3 fill-amber-400" />
                                        <span>{item.rating}</span>
                                        <span className="text-gray-400 font-normal">· {item.type}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* FILTER TABS & SORT DROPDOWN & POSTERS GRID */}
                <section>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-2 bg-[#0A0D14] p-1 rounded-xl border border-white/5 text-xs font-semibold">
                            {['Tümü', 'Movie', 'Series'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg transition-all ${activeTab === tab ? 'bg-[#1F2636] text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {tab === 'Movie' ? '🎬 Film' : tab === 'Series' ? '📺 Dizi' : tab === 'Tümü' ? 'Tümü' : tab}
                                </button>
                            ))}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsSortOpen(!isSortOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0A0D14] border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                            >
                                <span>{selectedSort}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            </button>

                            {isSortOpen && (
                                <div className="absolute right-0 mt-2 w-44 bg-[#0A0D14] border border-white/10 rounded-xl shadow-2xl py-1 z-30">
                                    {sortOptions.map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => {
                                                setSelectedSort(opt);
                                                setIsSortOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 transition-colors ${selectedSort === opt ? 'text-[#00B074] font-bold' : 'text-gray-300'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grid of Posters */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                        {grid.map((item, idx) => (
                            <MovieCard key={item.id || idx} item={item} />
                        ))}
                    </div>

                    {/* Show More */}
                    <div className="text-center mt-10">
                        <button className="px-8 py-3 bg-[#1B202E] hover:bg-[#252C3E] text-xs font-bold text-gray-300 rounded-xl transition-all">
                            Daha Fazla Göster
                        </button>
                    </div>
                </section>

                {/* FEATURED SPOTLIGHT BANNER */}
                <section className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0A0D14]">
                    <div className="relative h-[420px] w-full">
                        <img src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1920" alt="Batman v Superman" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/70 to-transparent" />
                        <div className="absolute inset-0 p-8 flex flex-col justify-end">
                            <h2 className="text-3xl font-black text-white mb-2">Batman V Superman: Adaletin Şafağı</h2>
                            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-3">
                                <Star className="w-4 h-4 fill-amber-400" />
                                <span>4.6</span>
                                <span className="text-gray-300">• 2s 40dk • 2022 • Süper Kahraman • Aksiyon • 13+</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="px-6 py-2.5 bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs rounded-xl flex items-center gap-2">
                                    <Play className="w-4 h-4 fill-white" /> Hemen İzle
                                </button>
                                <button className="px-5 py-2.5 bg-white/10 text-white font-semibold text-xs rounded-xl flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Listeme Ekle
                                </button>
                            </div>

                            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mt-6 pt-4 border-t border-white/10">
                                {genreTabs.map((g) => (
                                    <button key={g} className="px-5 py-2 bg-[#1B202E] hover:bg-[#252C3E] rounded-xl text-xs font-semibold text-gray-300">
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* BOTTOM THREE COLUMNS */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Movies on Awards */}
                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-white">Ödüllü Yapımlar</h2>
                        <div className="bg-[#0A0D14] rounded-2xl overflow-hidden border border-white/5 p-4">
                            <img src={moviesOnAwards.poster} alt={moviesOnAwards.title} className="w-full h-48 object-cover rounded-xl mb-4" />
                            <span className="px-2.5 py-1 bg-white/10 rounded text-[10px] font-semibold text-gray-300">
                                {moviesOnAwards.badge}
                            </span>
                            <h3 className="text-lg font-bold text-white mt-2">{moviesOnAwards.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mt-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                <span>{moviesOnAwards.rating}</span>
                                <span className="text-gray-400 font-normal">• {moviesOnAwards.duration} • {moviesOnAwards.year}</span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-3 mt-2">{moviesOnAwards.description}</p>
                            <div className="flex items-center gap-3 mt-4">
                                <button className="px-4 py-2 bg-[#00B074] text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
                                    <Play className="w-3.5 h-3.5 fill-white" /> Hemen İzle
                                </button>
                                <button className="px-4 py-2 bg-white/10 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
                                    <Bookmark className="w-3.5 h-3.5" /> Listeme Ekle
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* More popular */}
                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-white">Öne Çıkanlar</h2>
                        <div className="space-y-3">
                            {morePopular.map((item) => (
                                <Link key={item.id} href={`/movie/${item.id}`} className="flex items-center gap-3 bg-[#0A0D14] p-2.5 rounded-xl border border-white/5 hover:border-[#00B074]/50 transition-all">
                                    <img src={item.poster} alt={item.title} className="w-12 h-16 rounded-lg object-cover" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{item.genres}</p>
                                        <span className="inline-block px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-semibold text-gray-300 mt-1">
                                            {item.badge}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold mt-1">
                                            <Star className="w-3 h-3 fill-amber-400" />
                                            <span>{item.rating}</span>
                                            <span className="text-gray-400 font-normal">· Film</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Newest */}
                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-white">En Yeniler</h2>
                        <div className="space-y-3">
                            {newest.map((item) => (
                                <Link key={item.id} href={`/movie/${item.id}`} className="flex items-center gap-3 bg-[#0A0D14] p-2.5 rounded-xl border border-white/5 hover:border-[#00B074]/50 transition-all">
                                    <img src={item.poster} alt={item.title} className="w-12 h-16 rounded-lg object-cover" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{item.genres}</p>
                                        <span className="inline-block px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-semibold text-gray-300 mt-1">
                                            {item.badge}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold mt-1">
                                            <Star className="w-3 h-3 fill-amber-400" />
                                            <span>{item.rating}</span>
                                            <span className="text-gray-400 font-normal">· Film</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                </section>

            </div>
        </Layout>
    );
}
