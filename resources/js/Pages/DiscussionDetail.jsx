import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import { ThumbsUp, ThumbsDown, MessageSquare, Share2, Flag, ArrowUp, ArrowDown, Send, CornerDownRight, ShieldCheck, Tag } from 'lucide-react';

export default function DiscussionDetail({ discussion, comments }) {
    const [upvotes, setUpvotes] = useState(342);
    const [userVote, setUserVote] = useState(null); // 'up', 'down', or null
    const [replyText, setReplyText] = useState('');
    const [activeReplyId, setActiveReplyId] = useState(null);

    const defaultDiscussion = discussion || {
        id: 1,
        title: "What is your theory on Dune: Part Two's ending and Paul's path forward?",
        category: "Movie Theory",
        author: {
            name: "CinephileMax",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
            role: "Top Contributor"
        },
        createdAt: "5 hours ago",
        views: 1840,
        content: `The ending of Dune: Part Two left many viewers stunned as Paul Atreides embraces his role as the Lisan al-Gaib and initiates the Holy War across the galaxy. 

Do you think Denis Villeneuve will follow Frank Herbert's Messiah faithfully in Part 3, or will he give Chani a significantly different arc given how her character reacted to Paul's marriage to Princess Irulan?

Key points I want to discuss:
1. Chani leaving on the sandworm alone - what does this mean for her alliance?
2. Feyd-Rautha's duel significance.
3. The Great Houses refusing to accept Paul's ascendancy.`,
        image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80"
    };

    const mockComments = comments || [
        {
            id: 1,
            user: "PaulMuadDib",
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
            role: "Moderator",
            date: "4 hours ago",
            content: "Villeneuve explicitly mentioned in interviews that he wants Chani's perspective to be the emotional anchor of the tragedy. Her departure sets up the moral conflict of Dune Messiah perfectly.",
            likes: 89,
            replies: [
                {
                    id: 11,
                    user: "SciFiNerd99",
                    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
                    date: "3 hours ago",
                    content: "Agreed! It highlights how Paul's path is not a classic hero's journey, but a cautionary tale of fanaticism.",
                    likes: 34
                }
            ]
        },
        {
            id: 2,
            user: "Stellan_V",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80",
            role: "Member",
            date: "2 hours ago",
            content: "Hans Zimmer's score during the final battle gave me absolute chills. The transition from hero music to ominous choir sang volumes about what's coming next.",
            likes: 45,
            replies: []
        }
    ];

    const handleVote = (type) => {
        if (userVote === type) {
            setUserVote(null);
            setUpvotes(upvotes - (type === 'up' ? 1 : -1));
        } else {
            const diff = userVote ? 2 : 1;
            setUpvotes(type === 'up' ? upvotes + diff : upvotes - diff);
            setUserVote(type);
        }
    };

    return (
        <Layout title={`${defaultDiscussion.title} - SineKutu Forum`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Back to Forum Breadcrumb */}
                <div className="mb-6">
                    <Link href="/forum" className="text-gray-400 hover:text-[#00B074] text-sm font-semibold flex items-center gap-2 transition-colors">
                        ← Forum Tartışmalarına Dön
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Discussion Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Discussion Card */}
                        <div className="bg-[#131722] rounded-2xl border border-gray-800/60 p-6 sm:p-8 space-y-6">
                            {/* Header & Author Info */}
                            <div className="flex items-start justify-between gap-4 border-b border-gray-800/80 pb-6">
                                <div className="flex items-center gap-4">
                                    <img src={defaultDiscussion.author.avatar} alt={defaultDiscussion.author.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#00B074]/30" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-bold text-base">{defaultDiscussion.author.name}</h3>
                                            <span className="bg-[#00B074]/20 text-[#00B074] text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                                <ShieldCheck className="w-3 h-3" /> {defaultDiscussion.author.role}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                            <span>{defaultDiscussion.createdAt}</span>
                                            <span>•</span>
                                            <span>{defaultDiscussion.views} Görüntülenme</span>
                                        </div>
                                    </div>
                                </div>

                                <span className="bg-gray-800 text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-gray-700">
                                    {defaultDiscussion.category}
                                </span>
                            </div>

                            {/* Title & Body */}
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                                {defaultDiscussion.title}
                            </h1>

                            <div className="text-gray-300 text-base leading-relaxed space-y-4 whitespace-pre-line">
                                {defaultDiscussion.content}
                            </div>

                            {/* Image Attachment */}
                            {defaultDiscussion.image && (
                                <div className="rounded-xl overflow-hidden border border-gray-800 max-h-96">
                                    <img src={defaultDiscussion.image} alt="Discussion Attachment" className="w-full h-full object-cover" />
                                </div>
                            )}

                            {/* Action Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-800/80 pt-6">
                                <div className="flex items-center gap-2 bg-[#0A0D14] border border-gray-800 rounded-xl p-1">
                                    <button
                                        onClick={() => handleVote('up')}
                                        className={`p-2 rounded-lg transition-colors ${
                                            userVote === 'up' ? 'bg-[#00B074] text-black font-bold' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <ArrowUp className="w-5 h-5" />
                                    </button>
                                    <span className="px-3 font-bold text-sm text-white">{upvotes}</span>
                                    <button
                                        onClick={() => handleVote('down')}
                                        className={`p-2 rounded-lg transition-colors ${
                                            userVote === 'down' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <ArrowDown className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-800/60 hover:bg-gray-800 text-gray-300 rounded-xl text-sm font-semibold transition-colors">
                                        <Share2 className="w-4 h-4" /> Paylaş
                                    </button>
                                    <button className="p-2 text-gray-500 hover:text-red-400 transition-colors">
                                        <Flag className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Reply Composer */}
                        <div className="bg-[#131722] rounded-2xl border border-gray-800/60 p-6 space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-[#00B074]" /> Tartışmaya Katılın
                            </h3>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Düşüncelerinizi yazın..."
                                className="w-full bg-[#0A0D14] border border-gray-800 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-[#00B074] min-h-[120px]"
                            />
                            <div className="flex justify-end">
                                <button className="bg-[#00B074] text-black font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#009663] transition-colors flex items-center gap-2">
                                    <Send className="w-4 h-4" /> Yanıt Gönder
                                </button>
                            </div>
                        </div>

                        {/* Comments Thread */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-white">Yanıtlar ({mockComments.length + 1})</h3>

                            {mockComments.map((comment) => (
                                <div key={comment.id} className="bg-[#131722] rounded-2xl border border-gray-800/60 p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={comment.avatar} alt={comment.user} className="w-10 h-10 rounded-full object-cover" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-white font-bold text-sm">{comment.user}</h4>
                                                    <span className="text-[10px] bg-gray-800 text-gray-300 font-bold px-2 py-0.5 rounded">
                                                        {comment.role}
                                                    </span>
                                                </div>
                                                <span className="text-gray-400 text-xs">{comment.date}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        {comment.content}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-gray-800/60 pt-3">
                                        <button className="flex items-center gap-1.5 hover:text-[#00B074] transition-colors">
                                            <ThumbsUp className="w-4 h-4" /> {comment.likes}
                                        </button>
                                        <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                                            <CornerDownRight className="w-4 h-4" /> Yanıtla
                                        </button>
                                    </div>

                                    {/* Nested Replies */}
                                    {comment.replies && comment.replies.length > 0 && (
                                        <div className="ml-6 pl-4 border-l-2 border-gray-800 space-y-4 pt-2">
                                            {comment.replies.map((sub) => (
                                                <div key={sub.id} className="bg-[#0A0D14] p-4 rounded-xl space-y-2 border border-gray-800/50">
                                                    <div className="flex items-center gap-2">
                                                        <img src={sub.avatar} alt={sub.user} className="w-7 h-7 rounded-full object-cover" />
                                                        <span className="text-white font-bold text-xs">{sub.user}</span>
                                                        <span className="text-gray-500 text-[10px]">{sub.date}</span>
                                                    </div>
                                                    <p className="text-gray-300 text-xs leading-relaxed">{sub.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-[#131722] p-6 rounded-2xl border border-gray-800/60 space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-gray-800 pb-3">İlgili Konular</h3>
                            <div className="space-y-3">
                                {[
                                    { title: "Interstellar'ın Teserakt sahnesinin fiziksel incelemesi", replies: 89 },
                                    { title: "Tüm Christopher Nolan filmlerini en iyiden en kötüye sıralayın", replies: 154 },
                                    { title: "Oppenheimer'ın IMAX deneyimindeki ses tasarımı", replies: 42 }
                                ].map((rel, idx) => (
                                    <div key={idx} className="group cursor-pointer">
                                        <h4 className="text-white text-sm font-semibold group-hover:text-[#00B074] transition-colors line-clamp-2">
                                            {rel.title}
                                        </h4>
                                        <span className="text-xs text-gray-400 mt-1 block">{rel.replies} yanıt</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rules Box */}
                        <div className="bg-[#131722] p-6 rounded-2xl border border-gray-800/60 space-y-3">
                            <h3 className="text-lg font-bold text-white">Topluluk Kuralları</h3>
                            <ul className="text-xs text-gray-400 space-y-2 list-disc list-inside">
                                <li>Tartışmalarda saygılı ve yapıcı olun.</li>
                                <li>Yeni çıkan filmleri tartışırken spoiler uyarısı kullanın.</li>
                                <li>Kendi tanıtımınızı yapmayın veya reklam bağlantısı paylaşmayın.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
