import React from 'react';
import Layout from '../Components/Layout';
import { ChevronDown } from 'lucide-react';

export default function ReleaseSchedule({ months }) {
    return (
        <Layout>
            {/* TOP HERO BANNER */}
            <div className="relative w-full h-[320px] bg-[#121622] border-b border-white/5 overflow-hidden flex items-center justify-center text-center px-4">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-emerald-900/20 to-blue-900/20" />
                <div className="relative max-w-3xl space-y-3 z-10">
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                        Tüm Dünyada Popüler Filmlerin Yayın Takvimi
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-400">
                        Dünya genelindeki tüm film çıkış tarihlerinden anında haberdar olun
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                
                {/* UPCOMING RELEASE HEADER & FILTERS */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
                    <h2 className="text-2xl font-black text-white tracking-tight">Yaklaşan Yayınlar</h2>
                    
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#131722] border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:text-white">
                            <span>Dünya Geneli</span>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#131722] border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:text-white">
                            <span>2026</span>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* MONTHLY RELEASES GRID */}
                <div className="space-y-12">
                    {months.map((m) => (
                        <div key={m.name} className="space-y-6">
                            <h3 className="text-xl font-bold text-white border-b border-white/5 pb-2">{m.name}</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-12 gap-y-6">
                                {m.releases.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-[#131722]/50 hover:bg-[#131722] p-3 rounded-2xl border border-white/5 hover:border-[#00B074]/40 transition-all">
                                        
                                        {/* Date Circle Badge */}
                                        <div className="w-12 h-12 rounded-full bg-white text-black font-extrabold text-base flex items-center justify-center flex-shrink-0 shadow-lg">
                                            {item.day}
                                        </div>

                                        {/* Poster Thumbnail */}
                                        <img src={item.poster} alt={item.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />

                                        {/* Title & Subtitle */}
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                                            <p className="text-xs text-gray-400 truncate mt-0.5">{item.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* SHOW MORE */}
                <div className="text-center mt-12">
                    <button className="px-8 py-3 bg-[#1B202E] hover:bg-[#252C3E] text-xs font-bold text-gray-300 rounded-xl transition-all">
                        Daha Fazla Göster
                    </button>
                </div>

            </div>
        </Layout>
    );
}
