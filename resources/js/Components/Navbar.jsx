import React, { useState, useRef, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { Search, Bell, ChevronDown, User, Bookmark, Heart, Download, Settings as SettingsIcon, LogOut, X, Shield, Sun, Moon, HardDrive, Menu, Tv } from 'lucide-react';
import { useTheme } from '../Context/ThemeContext';

export default function Navbar({ onOpenAuth, transparent = false }) {
    const { url, props } = usePage();
    const user = props.auth?.user;
    const { theme, toggleTheme } = useTheme();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const dropdownRef = useRef(null);

    const isTransparentPage = transparent || url.startsWith('/movie/') || url.startsWith('/series/') || url.startsWith('/film/') || url.startsWith('/dizi/');

    // Handle scroll for transparent navbar
    useEffect(() => {
        if (!isTransparentPage) {
            setIsScrolled(false);
            return;
        }

        const handleScroll = () => {
            if (window.scrollY > 40) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isTransparentPage]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close mobile menu and search on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
    }, [url]);

    // Prevent scrolling when mobile menu modal is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const isActive = (path) => {
        if (path === '/' && url === '/') return true;
        if (path !== '/' && url.startsWith(path)) return true;
        return false;
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.visit(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    // Compute text and icon classes based on transparent/scrolled state
    const isHeaderUnscrolledTransparent = isTransparentPage && !isScrolled;

    const navLinkTextClass = isHeaderUnscrolledTransparent
        ? 'text-gray-200 hover:text-white'
        : 'text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white';

    const activeNavLinkTextClass = isHeaderUnscrolledTransparent
        ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#00B074] after:rounded-full'
        : 'text-slate-900 dark:text-white font-semibold after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#00B074] after:rounded-full';

    const actionIconClass = isHeaderUnscrolledTransparent
        ? 'text-gray-200 hover:text-white hover:bg-white/15'
        : 'text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10';

    const logoSrc = (theme === 'light' && !isHeaderUnscrolledTransparent)
        ? '/logo_dark.png'
        : '/logo.png';

    return (
        <header className={
            isTransparentPage
                ? `fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-none ${isScrolled
                    ? 'bg-white/95 dark:bg-[#07080c]/95 backdrop-blur-md shadow-md dark:shadow-xl border-b border-slate-200/60 dark:border-white/5'
                    : 'bg-gradient-to-b from-black/90 via-black/50 to-transparent'
                }`
                : 'sticky top-0 z-50 bg-white/90 dark:bg-[#07080c]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/5 transition-all shadow-sm dark:shadow-none'
        }>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

                {/* Brand Logo */}
                <Link href="/" className="flex items-center group py-1">
                    <img
                        src={logoSrc}
                        alt="SineKutu"
                        className="h-9 sm:h-10 md:h-11 w-auto object-contain transition-transform group-hover:scale-105"
                    />
                </Link>

                {/* Nav Links */}
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                    <Link
                        href="/"
                        className={`transition-colors relative py-1 ${isActive('/') ? activeNavLinkTextClass : navLinkTextClass}`}
                    >
                        Ana Sayfa
                    </Link>
                    <Link
                        href="/movies"
                        className={`transition-colors relative py-1 ${isActive('/movies') ? activeNavLinkTextClass : navLinkTextClass}`}
                    >
                        Filmler
                    </Link>
                    <Link
                        href="/series"
                        className={`transition-colors relative py-1 ${isActive('/series') ? activeNavLinkTextClass : navLinkTextClass}`}
                    >
                        Diziler
                    </Link>
                    <Link
                        href="/pricing"
                        className={`transition-colors relative py-1 ${isActive('/pricing') ? activeNavLinkTextClass : navLinkTextClass}`}
                    >
                        Paketler
                    </Link>
                    <Link
                        href="/releases"
                        className={`transition-colors relative py-1 ${isActive('/releases') ? activeNavLinkTextClass : navLinkTextClass}`}
                    >
                        Yeni Çıkanlar
                    </Link>
                    <Link
                        href="/forum"
                        className={`transition-colors relative py-1 ${isActive('/forum') ? activeNavLinkTextClass : navLinkTextClass}`}
                    >
                        Forum
                    </Link>
                    <Link
                        href="/about"
                        className={`transition-colors relative py-1 ${isActive('/about') ? activeNavLinkTextClass : navLinkTextClass}`}
                    >
                        Hakkımızda
                    </Link>
                </nav>

                {/* Right Action Icons & Profile */}
                <div className="flex items-center gap-3 sm:gap-5">

                    {/* Search Bar Toggle */}
                    {isSearchOpen ? (
                        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                            <input
                                type="text"
                                placeholder="Film, dizi ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                                className="bg-slate-100 dark:bg-[#161B26] border border-slate-300 dark:border-white/10 text-xs rounded-full pl-9 pr-8 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#00B074] w-48 sm:w-64 transition-all"
                            />
                            <Search className="w-4 h-4 text-slate-400 dark:text-gray-400 absolute left-3 top-2.5" />
                            <button
                                type="button"
                                onClick={() => setIsSearchOpen(false)}
                                className="absolute right-2.5 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className={`p-2 rounded-full transition-colors ${actionIconClass}`}
                            title="Ara"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    )}

                    {/* Notification Bell */}
                    <button className={`p-2 rounded-full transition-colors relative ${actionIconClass}`}>
                        <Bell className="w-5 h-5" />
                        <span className="w-2 h-2 bg-[#00B074] rounded-full absolute top-1.5 right-1.5 animate-pulse"></span>
                    </button>

                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-full transition-all flex items-center justify-center ${actionIconClass}`}
                        title={theme === 'dark' ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}
                        aria-label="Tema Değiştir"
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform duration-300" />
                        ) : (
                            <Moon className={`w-5 h-5 ${isHeaderUnscrolledTransparent ? 'text-amber-300' : 'text-slate-700 dark:text-gray-300'} hover:-rotate-12 transition-transform duration-300`} />
                        )}
                    </button>

                    {/* Auth / Profile Dropdown */}
                    {user ? (
                        <div className="flex items-center gap-3">
                            {/* Admin Shortcut Button */}
                            {(user.is_admin || user.role === 'admin') && (
                                <Link
                                    href="/admin"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00B074]/10 dark:bg-[#00B074]/20 hover:bg-[#00B074] text-[#00B074] hover:text-white border border-[#00B074]/40 text-xs font-bold rounded-xl transition-all shadow-md shadow-[#00B074]/10 group"
                                >
                                    <span>Admin</span>
                                </Link>
                            )}

                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-all focus:outline-none"
                                >
                                    <img
                                        src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                                        alt={user.name}
                                        className="w-9 h-9 rounded-full object-cover border-2 border-[#00B074]/50"
                                    />
                                    <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-3 w-72 bg-white/95 dark:bg-[#121622]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">

                                        {/* User Info Header */}
                                        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                                            <img
                                                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                                                alt={user.name}
                                                className="w-11 h-11 rounded-full object-cover border border-[#00B074]"
                                            />
                                            <div className="overflow-hidden">
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">{user.name}</h4>
                                                <p className="text-xs text-slate-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                                            </div>
                                        </div>

                                        {/* Quota Progress Summary */}
                                        {props.auth?.quota && (
                                            <div className="mx-2 my-2 p-2.5 bg-slate-50 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/5 space-y-1.5">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1">
                                                        {props.auth.quota.plan_name}
                                                        {props.auth.quota.active_extra_quotas?.length > 0 && (
                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                                                + Ek Kota
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[#00B074] font-bold">{props.auth.quota.formatted_remaining}</span>
                                                </div>
                                                <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="bg-[#00B074] h-full rounded-full transition-all"
                                                        style={{ width: `${props.auth.quota.usage_percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Menu Items */}
                                        <div className="p-2 text-sm text-slate-700 dark:text-gray-300">
                                            {(user.is_admin || user.role === 'admin') && (
                                                <Link
                                                    href="/admin"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#00B074]/10 text-[#00B074] hover:bg-[#00B074]/20 transition-colors font-bold mb-1 border border-[#00B074]/20"
                                                >
                                                    <Shield className="w-4 h-4 text-[#00B074]" />
                                                    <span>Yönetim Paneli</span>
                                                </Link>
                                            )}

                                            <Link
                                                href="/media-server"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-emerald-500 hover:text-emerald-400 transition-colors font-semibold"
                                            >
                                                <Tv className="w-4 h-4 text-emerald-500" />
                                                <span>Medya Sunucum</span>
                                            </Link>

                                            <Link
                                                href="/pricing"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-[#00B074] hover:text-[#009663] transition-colors font-semibold"
                                            >
                                                <HardDrive className="w-4 h-4 text-[#00B074]" />
                                                <span>İndirme Paketleri</span>
                                            </Link>

                                            <Link
                                                href="/settings"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                <User className="w-4 h-4 text-slate-400 dark:text-gray-400" />
                                                <span>Hesabı Düzenle</span>
                                            </Link>

                                            <Link
                                                href="/watchlist"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                <Bookmark className="w-4 h-4 text-slate-400 dark:text-gray-400" />
                                                <span>İzleme Listem</span>
                                            </Link>

                                            <Link
                                                href="/forum"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                <Heart className="w-4 h-4 text-slate-400 dark:text-gray-400" />
                                                <span>Beğenilenler</span>
                                            </Link>

                                            <Link
                                                href="/downloads"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                <Download className="w-4 h-4 text-slate-400 dark:text-gray-400" />
                                                <span>İndirilenler</span>
                                            </Link>

                                            <Link
                                                href="/settings"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            >
                                                <SettingsIcon className="w-4 h-4 text-slate-400 dark:text-gray-400" />
                                                <span>Ayarlar</span>
                                            </Link>
                                        </div>

                                        {/* Logout Button */}
                                        <div className="p-2 border-t border-slate-100 dark:border-white/5">
                                            <button
                                                onClick={() => {
                                                    setIsDropdownOpen(false);
                                                    router.post('/logout');
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors text-sm font-medium"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Çıkış Yap</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-2 ml-2">
                            <button
                                onClick={() => onOpenAuth && onOpenAuth('login')}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-white hover:text-[#00B074] dark:hover:text-[#00B074] transition-colors"
                            >
                                Giriş Yap
                            </button>
                            <button
                                onClick={() => onOpenAuth && onOpenAuth('signup')}
                                className="px-4 py-2 text-xs font-semibold bg-[#00B074] hover:bg-[#009663] text-white rounded-lg shadow-md shadow-[#00B074]/20 transition-all"
                            >
                                Kayıt Ol
                            </button>
                        </div>
                    )}

                    {/* Mobile Menu Toggle Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className={`md:hidden p-2 rounded-xl transition-all flex items-center justify-center border ${
                            isHeaderUnscrolledTransparent
                                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                : 'bg-slate-100 dark:bg-[#181a24] border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20'
                        }`}
                        aria-label="Menüyü Aç"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                </div>
            </div>

            {/* Mobile Menu Popup Modal */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-16 pb-8 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    <div
                        className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#161822] border border-slate-200 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white transform transition-all animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header: Dynamic Active Title / Logo + Close Button */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                            <span className="text-lg font-bold text-slate-900 dark:text-white">
                                {url === '/' ? 'Ana Sayfa' : (url.startsWith('/movies') ? 'Filmler' : (url.startsWith('/series') ? 'Diziler' : (url.startsWith('/pricing') ? 'Paketler' : (url.startsWith('/releases') ? 'Yeni Çıkanlar' : (url.startsWith('/forum') ? 'Forum' : (url.startsWith('/about') ? 'Hakkımızda' : 'Menü'))))))}
                            </span>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                aria-label="Menüyü Kapat"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <nav className="py-2.5 space-y-0.5">
                            <Link
                                href="/"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-2 rounded-xl text-base font-semibold transition-all ${
                                    isActive('/')
                                        ? 'bg-[#00B074]/10 text-[#00B074]'
                                        : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Ana Sayfa
                            </Link>
                            <Link
                                href="/movies"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-2 rounded-xl text-base font-semibold transition-all ${
                                    isActive('/movies')
                                        ? 'bg-[#00B074]/10 text-[#00B074]'
                                        : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Filmler
                            </Link>
                            <Link
                                href="/series"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-2 rounded-xl text-base font-semibold transition-all ${
                                    isActive('/series')
                                        ? 'bg-[#00B074]/10 text-[#00B074]'
                                        : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Diziler
                            </Link>
                            <Link
                                href="/pricing"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-2 rounded-xl text-base font-semibold transition-all ${
                                    isActive('/pricing')
                                        ? 'bg-[#00B074]/10 text-[#00B074]'
                                        : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Paketler
                            </Link>
                            <Link
                                href="/releases"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-2 rounded-xl text-base font-semibold transition-all ${
                                    isActive('/releases')
                                        ? 'bg-[#00B074]/10 text-[#00B074]'
                                        : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Yeni Çıkanlar
                            </Link>
                            <Link
                                href="/forum"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-2 rounded-xl text-base font-semibold transition-all ${
                                    isActive('/forum')
                                        ? 'bg-[#00B074]/10 text-[#00B074]'
                                        : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Forum
                            </Link>
                            <Link
                                href="/about"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-2 rounded-xl text-base font-semibold transition-all ${
                                    isActive('/about')
                                        ? 'bg-[#00B074]/10 text-[#00B074]'
                                        : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Hakkımızda
                            </Link>
                        </nav>

                        {/* Bottom Action Buttons */}
                        {!user ? (
                            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-white/10 flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        onOpenAuth && onOpenAuth('login');
                                    }}
                                    className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-white/15 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white text-center font-bold text-sm transition-all"
                                >
                                    Giriş Yap
                                </button>
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        onOpenAuth && onOpenAuth('signup');
                                    }}
                                    className="flex-1 py-3 px-4 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-center font-bold text-sm shadow-lg shadow-[#00B074]/20 transition-all"
                                >
                                    Kayıt Ol
                                </button>
                            </div>
                        ) : (
                            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-white/10 space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                    <img
                                        src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                                        alt={user.name}
                                        className="w-10 h-10 rounded-full object-cover border border-[#00B074]"
                                    />
                                    <div className="overflow-hidden flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</h4>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{user.email}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                                    {(user.is_admin || user.role === 'admin') && (
                                        <Link
                                            href="/admin"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#00B074]/10 text-[#00B074] rounded-xl border border-[#00B074]/30 font-bold"
                                        >
                                            <Shield className="w-3.5 h-3.5" />
                                            <span>Admin Paneli</span>
                                        </Link>
                                    )}
                                    <Link
                                        href="/media-server"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 font-bold"
                                    >
                                        <Tv className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Medya Sunucum</span>
                                    </Link>
                                    <Link
                                        href="/settings"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white rounded-xl"
                                    >
                                        <User className="w-3.5 h-3.5" />
                                        <span>Hesabım</span>
                                    </Link>
                                    <Link
                                        href="/watchlist"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white rounded-xl"
                                    >
                                        <Bookmark className="w-3.5 h-3.5" />
                                        <span>İzleme Listem</span>
                                    </Link>
                                    <Link
                                        href="/downloads"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white rounded-xl"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>İndirilenler</span>
                                    </Link>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        router.post('/logout');
                                    }}
                                    className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-center font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Çıkış Yap</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
