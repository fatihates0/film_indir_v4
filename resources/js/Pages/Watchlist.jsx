import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import { Trash2, Play, Star, Plus, Film, Tv, CheckCircle, Clock } from 'lucide-react';

export default function Watchlist({ items }) {
    const [activeFilter, setActiveFilter] = useState("all");
    const [watchlist, setWatchlist] = useState(items || [
        {
            id: 1,
            title: "Interstellar",
            type: "Movie",
            rating: 8.6,
            year: 2014,
            duration: "2h 49m",
            poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80",
            status: "Plan to Watch"
        },
        {
            id: 2,
            title: "Stranger Things",
            type: "TV Series",
            rating: 8.7,
            year: 2016,
            duration: "4 Seasons",
            poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80",
            status: "Watching"
        },
        {
            id: 3,
            title: "Dune: Part Two",
            type: "Movie",
            rating: 8.9,
            year: 2024,
            duration: "2h 46m",
            poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
            status: "Plan to Watch"
        },
        {
            id: 4,
            title: "The Last of Us",
            type: "TV Series",
            rating: 8.8,
            year: 2023,
            duration: "1 Season",
            poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80",
            status: "Completed"
        }
    ]);

    const removeItem = (id) => {
        setWatchlist(watchlist.filter(item => item.id !== id));
    };

    const filteredItems = watchlist.filter(item => {
        if (activeFilter === "movies") return item.type === "Movie";
        if (activeFilter === "series") return item.type === "TV Series";
        if (activeFilter === "completed") return item.status === "Completed";
        return true;
    });

    return (
        <Layout title="My Watchlist - SineKutu">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800 pb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">İzleme Listem</h1>
                        <p className="text-gray-400 text-sm mt-1">İzlemek istediğiniz film ve dizileri takip edin</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { id: "all", label: `Tümü (${watchlist.length})` },
                            { id: "movies", label: "Filmler" },
                            { id: "series", label: "Diziler" },
                            { id: "completed", label: "Tamamlananlar" }
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFilter(f.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${activeFilter === f.id
                                    ? 'bg-[#00B074] border-[#00B074] text-black shadow-lg shadow-[#00B074]/20'
                                    : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:text-white'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Items Grid */}
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {filteredItems.map((item) => (
                            <div key={item.id} className="bg-[#0A0D14] rounded-2xl overflow-hidden border border-gray-800/60 hover:border-[#00B074]/50 transition-all group flex flex-col relative">
                                {/* Poster with Overlay */}
                                <div className="relative aspect-[2/3] overflow-hidden">
                                    <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <Link href={item.url || item.detail_url || (item.type === "TV Series" || item.media_type === 'tv' ? `/series/${item.slug || item.id}` : `/movie/${item.slug || item.id}`)}>
                                            <div className="w-12 h-12 rounded-full bg-[#00B074] text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                                <Play className="w-6 h-6 fill-black ml-0.5" />
                                            </div>
                                        </Link>
                                    </div>

                                    {/* Type Badge */}
                                    <div className="absolute top-2 left-2 bg-[#00B074] text-black font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">
                                        {item.type === "Movie" ? "Film" : item.type === "TV Series" ? "Dizi" : item.type}
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="absolute top-2 right-2 p-2 bg-black/70 backdrop-blur-md rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                        title="İzleme Listesinden Çıkar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                                    <div>
                                        <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
                                            <span className="flex items-center gap-1">
                                                <Star className="w-3.5 h-3.5 fill-amber-400" /> {item.rating}
                                            </span>
                                            <span className="text-gray-400 font-normal">{item.year}</span>
                                        </div>

                                        <h3 className="text-white font-bold text-sm line-clamp-1 group-hover:text-[#00B074] transition-colors">
                                            {item.title}
                                        </h3>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800/60">
                                        <span>{item.duration}</span>
                                        <span className={`font-semibold ${item.status === 'Completed' ? 'text-[#00B074]' : 'text-gray-400'}`}>
                                            {item.status === 'Plan to Watch' ? 'İzlenecek' : item.status === 'Watching' ? 'İzleniyor' : item.status === 'Completed' ? 'Tamamlandı' : item.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-[#0A0D14] p-12 rounded-3xl border border-gray-800 text-center space-y-4">
                        <Film className="w-12 h-12 text-gray-600 mx-auto" />
                        <h3 className="text-xl font-bold text-white">İzleme Listeniz Boş</h3>
                        <p className="text-gray-400 text-sm">Film ve dizileri keşfedin ve izleme listenize ekleyin.</p>
                        <Link href="/movies" className="inline-block bg-[#00B074] text-black font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#009663] transition-colors">
                            İçerik Keşfet
                        </Link>
                    </div>
                )}
            </div>
        </Layout>
    );
}
