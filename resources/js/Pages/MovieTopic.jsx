import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import { MessageSquare, ThumbsUp, Plus, Filter, Search, Users, ShieldAlert, Sparkles, TrendingUp, ChevronDown } from 'lucide-react';

export default function MovieTopic({ topic, discussions }) {
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isJoined, setIsJoined] = useState(false);

    const defaultTopic = topic || {
        id: 1,
        title: "Inception & Nolan Universe",
        banner: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
        avatar: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80",
        membersCount: "24.5K",
        discussionsCount: "1.2K",
        description: "Official discussion community dedicated to Christopher Nolan's mind-bending sci-fi epic Inception and related cinematic universes."
    };

    const mockDiscussions = discussions || [
        {
            id: 1,
            title: "Is Cobb still dreaming at the end? Analyzing the spinning top wobbling",
            author: "TotemMaster",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
            category: "Theories",
            upvotes: 412,
            replies: 89,
            timeAgo: "2 hours ago",
            pinned: true
        },
        {
            id: 2,
            title: "Breakdown of the architecture rules in dream layers",
            author: "AriadneDesign",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
            category: "Guides",
            upvotes: 285,
            replies: 45,
            timeAgo: "5 hours ago",
            pinned: false
        },
        {
            id: 3,
            title: "Hans Zimmer's soundtrack breakdown: 'Time' and slowed down Edith Piaf song",
            author: "AudioScale",
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
            category: "Music",
            upvotes: 198,
            replies: 31,
            timeAgo: "1 day ago",
            pinned: false
        }
    ];

    return (
        <Layout title={`${defaultTopic.title} - SineKutu Forum`}>
            {/* Topic Banner */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
                <img src={defaultTopic.banner} alt={defaultTopic.title} className="w-full h-full object-cover brightness-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/40 to-transparent" />
            </div>

            {/* Topic Header Details */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 mb-8">
                <div className="bg-[#131722] p-6 sm:p-8 rounded-2xl border border-gray-800/80 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <img src={defaultTopic.avatar} alt={defaultTopic.title} className="w-24 h-24 rounded-2xl object-cover border-4 border-[#0A0D14] shadow-xl" />
                        <div className="space-y-2">
                            <h1 className="text-3xl font-extrabold text-white">{defaultTopic.title}</h1>
                            <p className="text-gray-300 text-sm max-w-2xl">{defaultTopic.description}</p>
                            <div className="flex items-center gap-4 text-xs font-semibold text-gray-400 pt-1">
                                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-[#00B074]" /> {defaultTopic.membersCount} Üye</span>
                                <span>•</span>
                                <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-[#00B074]" /> {defaultTopic.discussionsCount} Tartışma</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setIsJoined(!isJoined)}
                            className={`flex-1 md:flex-initial px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                                isJoined
                                    ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                                    : 'bg-[#00B074] hover:bg-[#009663] text-black shadow-lg shadow-[#00B074]/20'
                            }`}
                        >
                            {isJoined ? 'Topluluğa Katılındı' : '+ Topluluğa Katıl'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Forum Feed & Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
                {/* Search & New Post Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#131722] p-4 rounded-xl border border-gray-800/60">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Bu konuda ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0A0D14] text-white text-sm pl-10 pr-4 py-2.5 rounded-lg border border-gray-800 focus:outline-none focus:border-[#00B074]"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex bg-[#0A0D14] p-1 rounded-lg border border-gray-800 text-xs">
                            {['all', 'theories', 'guides', 'music'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    className={`px-3 py-1.5 rounded-md font-semibold capitalize transition-colors ${
                                        activeFilter === f ? 'bg-[#00B074] text-black' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {f === 'all' ? 'Tümü' : f === 'theories' ? 'Teoriler' : f === 'guides' ? 'Rehberler' : f === 'music' ? 'Müzik' : f}
                                </button>
                            ))}
                        </div>

                        <button className="bg-[#00B074] text-black font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 hover:bg-[#009663] transition-colors whitespace-nowrap">
                            <Plus className="w-4 h-4" /> Konu Başlat
                        </button>
                    </div>
                </div>

                {/* Discussions Feed */}
                <div className="space-y-4">
                    {mockDiscussions.map((disc) => (
                        <Link
                            key={disc.id}
                            href={`/forum/discussion/${disc.id}`}
                            className="block bg-[#131722] hover:bg-[#181d2b] p-6 rounded-2xl border border-gray-800/60 hover:border-gray-700 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <img src={disc.avatar} alt={disc.author} className="w-10 h-10 rounded-full object-cover mt-1" />
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            {disc.pinned && (
                                                <span className="bg-amber-400/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded">
                                                    SABİTLENDİ
                                                </span>
                                            )}
                                            <span className="bg-gray-800 text-gray-300 text-xs font-semibold px-2.5 py-0.5 rounded">
                                                {disc.category}
                                            </span>
                                            <span className="text-gray-400 text-xs">• Yazar: <strong className="text-white">{disc.author}</strong> {disc.timeAgo}</span>
                                        </div>

                                        <h3 className="text-lg font-bold text-white group-hover:text-[#00B074] transition-colors">
                                            {disc.title}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 text-xs font-semibold text-gray-400">
                                    <div className="flex items-center gap-1.5 bg-[#0A0D14] px-3 py-1.5 rounded-lg border border-gray-800 text-white">
                                        <ThumbsUp className="w-3.5 h-3.5 text-[#00B074]" />
                                        <span>{disc.upvotes}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-[#0A0D14] px-3 py-1.5 rounded-lg border border-gray-800">
                                        <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{disc.replies}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </Layout>
    );
}
