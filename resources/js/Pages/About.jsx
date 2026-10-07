import React from 'react';
import { Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import { Play, Pause, Volume2, Maximize, MessageSquare, Compass, Users, Video, Calendar, UserCheck, Download } from 'lucide-react';

export default function About() {
    return (
        <Layout>
            {/* HERO BANNER */}
            <div className="relative w-full h-[540px] bg-[#0A0D14] overflow-hidden">
                <img 
                    src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1920" 
                    alt="Theater Seats" 
                    className="w-full h-full object-cover filter brightness-50" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/60 to-transparent" />
                
                <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
                    <div className="max-w-xl space-y-4">
                        <span className="px-3 py-1 bg-[#00B074]/20 border border-[#00B074]/40 rounded-md text-[11px] font-bold text-[#00B074]">
                            Yayınlanmaya Hazır
                        </span>
                        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
                            <span className="text-[#00B074]">Sinemaseverler</span> İçin Özel Topluluk
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-300">
                            İzleyin, çevre edinin, yeni arkadaşlar edinin ve birlikte seyredin
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <Link href="/discover" className="px-6 py-3 bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-[#00B074]/30">
                                <Compass className="w-4 h-4" /> Daha Fazla Keşfet
                            </Link>
                            <Link href="/forum" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl flex items-center gap-2">
                                <Users className="w-4 h-4" /> Toplulukla Tanışın
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
                
                {/* ABOUT SINEKUTU */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">
                            SİNEKUTU <br /><span className="text-[#00B074]">HAKKINDA</span>
                        </h2>
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                            SineKutu, sinemaseverlerin ve dizi tutkunlarının buluşma noktası olarak tasarlanmış modern bir dijital yayın ve topluluk platformudur. En güncel yapımlar, kaliteli yayın akışları ve sinema dünyasına yön veren tartışma forumlarıyla kusursuz bir seyir tecrübesi sunar.
                        </p>
                    </div>
                </section>

                {/* IMAGE BANNER */}
                <div className="rounded-3xl overflow-hidden border border-white/10 aspect-[21/9]">
                    <img 
                        src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=1600" 
                        alt="Cinema view" 
                        className="w-full h-full object-cover" 
                    />
                </div>

                {/* MAXIMIZE YOUR WATCHING EXPERIENCE */}
                <section className="text-center space-y-8">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white">
                            İZLEME DENEYİMİNİZİ <br /><span className="text-[#00B074]">EN ÜST DÜZEYE ÇIKARIN</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar justify-center py-2">
                        {['https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=300', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=300', 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=300', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=300', 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=300'].map((url, i) => (
                            <img key={i} src={url} alt="Poster" className="w-36 h-52 rounded-xl object-cover border border-white/5 flex-shrink-0" />
                        ))}
                    </div>

                    <Link href="/discover" className="inline-flex items-center gap-2 px-6 py-3 bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs rounded-xl shadow-lg">
                        <Compass className="w-4 h-4" /> Daha Fazla Keşfet
                    </Link>
                </section>

                {/* SAINTS FEATURES */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="rounded-3xl overflow-hidden border border-white/10 aspect-[4/5] bg-[#131722]">
                        <img 
                            src="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800" 
                            alt="Neon theater sign" 
                            className="w-full h-full object-cover" 
                        />
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-3xl font-black text-white">
                            SİNEKUTU <span className="text-[#00B074]">ÖZELLİKLERİ</span>
                        </h2>

                        <div className="space-y-6 pt-4">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#00B074]/10 text-[#00B074] flex items-center justify-center flex-shrink-0">
                                    <Video className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">Farklı Kalite Seçenekleriyle İzleyin</h4>
                                    <p className="text-xs text-gray-400 mt-1">4K Ultra HD ve 1080p seçenekleriyle en üst seviye görüntü kalitesinin keyfini çıkarın.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#00B074]/10 text-[#00B074] flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">Yeni Yayın Takvimi</h4>
                                    <p className="text-xs text-gray-400 mt-1">Vizyona girecek ve dijital platformlara gelecek filmlerin tarihlerini takip edin.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#00B074]/10 text-[#00B074] flex items-center justify-center flex-shrink-0">
                                    <UserCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">Profil ve İncelemeler</h4>
                                    <p className="text-xs text-gray-400 mt-1">Kendi profilinizi oluşturun, izleme listelerinizi ve incelemelerinizi takipçilerinizle paylaşın.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#00B074]/10 text-[#00B074] flex items-center justify-center flex-shrink-0">
                                    <Download className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">Çevrimdışı İndirme Özelliği</h4>
                                    <p className="text-xs text-gray-400 mt-1">Favori içeriklerinizi cihazınıza indirerek internetiniz olmadan da seyredin.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#00B074]/10 text-[#00B074] flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">Sinemaseverler İçin Forum</h4>
                                    <p className="text-xs text-gray-400 mt-1">Filmler hakkındaki teorilerinizi, incelemelerinizi ve yorumlarınızı binlerce kullanıcıyla tartışın.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* EXCLUSIVE INTERVIEW & EVENTS */}
                <section className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl sm:text-3xl font-black text-white">
                            ÖZEL RÖPORTAJLAR <br /><span className="text-[#00B074]">& ETKİNLİKLER</span>
                        </h2>
                    </div>

                    <div className="bg-[#131722] border border-white/10 rounded-3xl p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-white">Riverdale Hakkında Her Şey: Gizemler ve Oyuncu Röportajı</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                1941 yılında başlayan Archie Comics hikayelerinden uyarlanan Riverdale dizisinin başrol oyuncularıyla gerçekleştirdiğimiz özel röportaj ve perde arkası görüntüleri.
                            </p>
                            <span className="inline-block text-xs font-semibold text-gray-400">📅 24 Mayıs 2026</span>
                        </div>

                        {/* Video Player Card */}
                        <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 group">
                            <img src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=800" alt="Interview" className="w-full h-64 object-cover filter brightness-75" />
                            
                            {/* Player Bar Overlay */}
                            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center gap-3 text-xs text-white">
                                <button className="p-1.5 bg-white/20 hover:bg-[#00B074] rounded-full transition-colors">
                                    <Pause className="w-4 h-4 fill-white" />
                                </button>
                                <span>1:05</span>
                                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#00B074] w-1/3" />
                                </div>
                                <span>53:45</span>
                                <Volume2 className="w-4 h-4 text-gray-300" />
                                <Maximize className="w-4 h-4 text-gray-300" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* JOIN OUR COMMUNITY DISCORD */}
                <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-white/10 p-12 text-center space-y-6">
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">TOPLULUĞUMUZA KATILIN</h2>
                    <div>
                        <a href="https://discord.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs rounded-xl shadow-lg transition-all">
                            <Users className="w-4 h-4" /> Discord'a Katılın
                        </a>
                    </div>
                </section>

            </div>
        </Layout>
    );
}
