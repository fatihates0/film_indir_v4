import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import { Flame, Star, ThumbsUp, ThumbsDown, Heart, MessageSquare, Share2, Edit, Plus, ChevronRight, ChevronLeft } from 'lucide-react';

export default function Forum({ isLoggedIn = true, user, userLikes, likedMovies, hotTopics, discussions, premiereEvents }) {
    const [voteScores, setVoteScores] = useState({
        'spiderman3-worst': 22,
        'spiderverse-second': 0,
        'topgun-propaganda': 423,
        'statham-injuries': 13
    });

    const handleVote = (id, delta) => {
        setVoteScores(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + delta
        }));
    };

    return (
        <Layout>
            {/* HERO HEADER BANNER */}
            <div className="relative w-full h-[280px] bg-[#121622] overflow-hidden flex items-center justify-center text-center px-4">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-indigo-950/30" />
                <div className="relative max-w-2xl space-y-2 z-10">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        {isLoggedIn ? 'Film zevkinizle topluluğa yön verin' : 'Film Etkileyicisi Olun'}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-400">
                        Düşüncelerinizi paylaşın, sinema dünyasında ses getirin
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
                
                {/* LOGGED IN USER PROFILE & LIKES SECTIONS */}
                {isLoggedIn && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left column: New likes & Liked movies */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* New Likes */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-white">Yeni Beğeniler</h3>
                                    <div className="flex items-center gap-2">
                                        <button className="px-3 py-1 bg-[#1B202E] text-[11px] font-semibold text-gray-300 rounded-lg">Düzenle</button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
                                    {userLikes.map((item) => (
                                        <div key={item.id} className="w-28 flex-shrink-0 group cursor-pointer">
                                            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#131722] border border-white/5 group-hover:border-[#00B074]/50 transition-all">
                                                <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Liked Movie */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-white">Beğenilen Filmler</h3>
                                    <div className="flex items-center gap-2">
                                        <button className="px-3 py-1 bg-[#1B202E] text-[11px] font-semibold text-gray-300 rounded-lg">Düzenle</button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
                                    {likedMovies.map((item) => (
                                        <div key={item.id} className="w-28 flex-shrink-0 group cursor-pointer">
                                            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#131722] border border-white/5 group-hover:border-[#00B074]/50 transition-all">
                                                <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button className="px-4 py-2 bg-[#1B202E] hover:bg-[#252C3E] text-xs font-semibold text-gray-300 rounded-xl flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Yeni Bölüm Ekle
                            </button>

                        </div>

                        {/* Right column: User Profile Card */}
                        <div>
                            <div className="bg-[#131722] border border-white/10 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#00B074]" />
                                    <div className="flex items-center gap-6 text-center">
                                        <div>
                                            <span className="block text-base font-extrabold text-white">{user.followers}</span>
                                            <span className="text-[10px] text-gray-400">Takipçi</span>
                                        </div>
                                        <div>
                                            <span className="block text-base font-extrabold text-white">{user.following}</span>
                                            <span className="text-[10px] text-gray-400">Takip Edilen</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-white">{user.name}</h3>
                                    <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-4">{user.bio}</p>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button className="flex-1 py-2 bg-[#00B074] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md">
                                        <Edit className="w-3.5 h-3.5" /> Profili Düzenle
                                    </button>
                                    <button className="px-4 py-2 bg-[#1B202E] text-gray-300 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5">
                                        <Share2 className="w-3.5 h-3.5" /> Paylaş
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🔥 HOT MOVIE TOPICS */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <h2 className="text-lg font-bold text-white">Gündemdeki Film Konuları</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {hotTopics.map((item) => (
                            <Link key={item.id} href={`/forum/topic/${item.id}`} className="flex items-center gap-3 bg-[#131722] p-3 rounded-2xl border border-white/5 hover:border-[#00B074]/50 transition-all group">
                                <img src={item.poster} alt={item.title} className="w-14 h-14 rounded-xl object-cover" />
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.genres}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                                        <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                            <Star className="w-3 h-3 fill-amber-400" /> {item.rating}
                                        </span>
                                        <span>· {item.reviews} inceleme</span>
                                        <span>· {item.discussions} tartışma</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ⭐ POPULAR DISCUSSION LIST */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        <h2 className="text-lg font-bold text-white">Popüler Tartışmalar</h2>
                    </div>

                    <div className="space-y-4">
                        {discussions.map((d) => (
                            <div key={d.id} className="bg-[#131722] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 transition-all">
                                
                                {/* Upvote / Downvote Counter */}
                                <div className="flex sm:flex-col items-center justify-center gap-2 bg-[#0B0D14] px-3 py-2 sm:py-3 rounded-xl">
                                    <button onClick={() => handleVote(d.id, 1)} className="text-gray-400 hover:text-[#00B074]">
                                        <ThumbsUp className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs font-bold text-[#00B074]">{voteScores[d.id] ?? d.votes}</span>
                                    <button onClick={() => handleVote(d.id, -1)} className="text-gray-400 hover:text-red-400">
                                        <ThumbsDown className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Content Details */}
                                <div className="flex-1 space-y-2">
                                    <Link href={`/forum/discussion/${d.id}`} className="text-sm font-bold text-white hover:text-[#00B074] transition-colors leading-snug block">
                                        {d.title}
                                    </Link>
                                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{d.excerpt}</p>
                                    
                                    <div className="flex items-center gap-4 pt-2 text-xs text-gray-400">
                                        <span className="text-[#00B074] font-semibold">{d.author}</span>
                                        <span>• {d.time}</span>
                                        <div className="flex items-center gap-4 ml-auto">
                                            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-[#00B074]" /> {d.likes}</span>
                                            <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-gray-400" /> {d.comments}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Movie Thumbnail */}
                                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 self-center">
                                    <img src={d.poster} alt={d.title} className="w-full h-full object-cover" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-6">
                        <button className="px-6 py-2.5 bg-[#1B202E] hover:bg-[#252C3E] text-xs font-bold text-gray-300 rounded-xl">
                            Daha Fazla Göster
                        </button>
                    </div>
                </section>

                {/* MOVIE PREMIERE EVENT */}
                <section className="space-y-6">
                    <h2 className="text-xl font-bold text-white">Film Gala Etkinlikleri</h2>
                    
                    {premiereEvents.map((pe) => (
                        <div key={pe.month} className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-300">{pe.month}</h3>
                            <div className="space-y-4">
                                {pe.events.map((ev, idx) => (
                                    <div key={idx} className="bg-[#131722] border border-white/5 rounded-2xl p-5 flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white text-black font-extrabold text-base flex items-center justify-center flex-shrink-0">
                                            {ev.day}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <img src={ev.poster} alt={ev.title} className="w-10 h-10 rounded-lg object-cover" />
                                                <div>
                                                    <h4 className="text-xs font-bold text-white">{ev.title}</h4>
                                                    <p className="text-[10px] text-gray-400">{ev.sub}</p>
                                                </div>
                                            </div>
                                            {ev.info && (
                                                <div className="pt-2 text-xs space-y-2 border-t border-white/5">
                                                    <p className="text-[#00B074] font-bold">Başlangıç Saati: <span className="text-white font-normal">{ev.starTime}</span></p>
                                                    <p className="text-gray-300"><strong className="text-white">Bilgi:</strong> {ev.info}</p>
                                                    {ev.rules && (
                                                        <div>
                                                            <strong className="text-white">Kurallar:</strong>
                                                            <ul className="list-disc list-inside text-gray-400 mt-1 text-[11px]">
                                                                {ev.rules.map((r, i) => <li key={i}>{r}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

            </div>
        </Layout>
    );
}
