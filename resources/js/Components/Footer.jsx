import React from 'react';
import { Link } from '@inertiajs/react';
import { Globe, Share2, MessageCircle } from 'lucide-react';
import { useTheme } from '../Context/ThemeContext';

export default function Footer() {
    const { theme } = useTheme();
    const logoSrc = theme === 'light' ? '/logo_dark.png' : '/logo.png';

    return (
        <footer className="bg-slate-200/50 dark:bg-[#07080c] border-t border-slate-300/60 dark:border-white/5 pt-16 pb-12 mt-20 text-slate-600 dark:text-gray-400 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-12 border-b border-slate-300/60 dark:border-white/5">

                    {/* Main Headline */}
                    <div className="max-w-md">
                        <Link href="/" className="inline-block mb-4 group">
                            <img
                                src={logoSrc}
                                alt="SineKutu"
                                className="h-8 sm:h-9 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                            />
                        </Link>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                            Platformumuz milyonlarca kişi tarafından tercih edilmekte ve dünyanın dört bir yanından en güncel yapımları sunmaktadır.
                        </h2>
                    </div>

                    {/* Navigation & Socials */}
                    <div className="flex flex-col items-start md:items-end gap-6">

                        {/* Footer Links */}
                        <div className="flex flex-wrap gap-6 text-sm font-semibold text-slate-800 dark:text-white">
                            <Link href="/" className="hover:text-[#00B074] transition-colors">Ana Sayfa</Link>
                            <span>/</span>
                            <Link href="/movies" className="hover:text-[#00B074] transition-colors">Filmler</Link>
                            <span>/</span>
                            <Link href="/series" className="hover:text-[#00B074] transition-colors">Diziler</Link>
                            <span>/</span>
                            <Link href="/forum" className="hover:text-[#00B074] transition-colors">Forum</Link>
                            <span>/</span>
                            <Link href="/about" className="hover:text-[#00B074] transition-colors">Hakkımızda</Link>
                        </div>

                        {/* Social Icons */}
                        <div className="flex items-center gap-3">
                            <a href="#" className="w-9 h-9 rounded-full bg-[#00B074]/10 text-[#00B074] hover:bg-[#00B074] hover:text-white flex items-center justify-center transition-all">
                                <MessageCircle className="w-4 h-4" />
                            </a>
                            <a href="#" className="w-9 h-9 rounded-full bg-[#00B074]/10 text-[#00B074] hover:bg-[#00B074] hover:text-white flex items-center justify-center transition-all">
                                <Share2 className="w-4 h-4" />
                            </a>
                            <a href="#" className="w-9 h-9 rounded-full bg-[#00B074]/10 text-[#00B074] hover:bg-[#00B074] hover:text-white flex items-center justify-center transition-all font-extrabold text-xs">
                                𝕏
                            </a>
                            <a href="#" className="w-9 h-9 rounded-full bg-[#00B074]/10 text-[#00B074] hover:bg-[#00B074] hover:text-white flex items-center justify-center transition-all">
                                <Globe className="w-4 h-4" />
                            </a>
                        </div>

                    </div>
                </div>

                {/* Bottom Legal bar */}
                <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 dark:text-gray-500 gap-4">
                    <div className="flex items-center gap-6">
                        <a href="#" className="hover:text-slate-800 dark:hover:text-gray-300 transition-colors">Gizlilik Politikası</a>
                        <a href="#" className="hover:text-slate-800 dark:hover:text-gray-300 transition-colors">Kullanım Şartları</a>
                        <a href="#" className="hover:text-slate-800 dark:hover:text-gray-300 transition-colors">Dil</a>
                    </div>
                    <div>
                        © 2026 SineKutu. Tüm hakları saklıdır.
                    </div>
                </div>
            </div>
        </footer>
    );
}
