import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AdminUploadWidget from './AdminUploadWidget';
import TmdbWizardModal from './TmdbWizardModal';
import { useUpload } from '../Context/UploadContext';
import { 
    LayoutDashboard, 
    HardDrive, 
    Film, 
    Package, 
    ShieldCheck, 
    ChevronRight,
    Upload,
    ExternalLink,
    LogOut,
    Menu,
    X,
    Activity,
    User
} from 'lucide-react';

export default function AdminLayout({ 
    children, 
    title = 'Yönetim Konsolu', 
    subtitle,
    activeTab = 'overview', 
    statsSummary = {},
    headerActions = null 
}) {
    const { auth } = usePage().props;
    const currentUser = auth?.user;
    const { setIsUploadModalOpen, queue } = useUpload();
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    const activeUploadsCount = queue.filter(i => i.status === 'uploading' || i.status === 'init').length;

    const navItems = [
        {
            id: 'overview',
            label: 'Genel Bakış',
            href: '/admin',
            icon: LayoutDashboard,
            badge: null
        },
        {
            id: 'storage-boxes',
            label: 'Storage Box',
            href: '/admin/storage-boxes',
            icon: HardDrive,
            badge: statsSummary?.total_boxes !== undefined ? statsSummary.total_boxes : null
        },
        {
            id: 'medias',
            label: 'Medya Arşivi',
            href: '/admin/medias',
            icon: Film,
            badge: statsSummary?.total_medias !== undefined ? statsSummary.total_medias : null
        },
        {
            id: 'plans',
            label: 'Paket & Kotalar',
            href: '/admin/plans',
            icon: Package,
            badge: statsSummary?.total_plans !== undefined ? statsSummary.total_plans : null
        },
    ];

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <div className="min-h-screen bg-[#07090E] text-gray-100 font-sans selection:bg-[#00B074] selection:text-white flex flex-col">
            <Head title={`${title} - SineKutu Admin Console`} />

            {/* DEDICATED ADMIN TOP COMMAND BAR */}
            <header className="sticky top-0 z-50 bg-[#090C14]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl shadow-black/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-16 flex items-center justify-between gap-4">
                        
                        {/* Brand & Status Indicator */}
                        <div className="flex items-center gap-3 shrink-0">
                            <Link href="/admin" className="flex items-center gap-2.5 group">
                                <div className="w-9 h-9 rounded-xl bg-[#00B074]/15 border border-[#00B074]/30 flex items-center justify-center text-[#00B074] shadow-lg shadow-[#00B074]/10 group-hover:bg-[#00B074]/25 group-hover:scale-105 transition-all">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                                        SineKutu
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00B074]/20 text-emerald-400 border border-[#00B074]/30">
                                        CONSOLE
                                    </span>
                                </div>
                            </Link>

                            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-[11px] text-emerald-400 font-mono ml-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>v3.4 Live</span>
                            </div>
                        </div>

                        {/* Center Desktop Navigation Tabs */}
                        <nav className="hidden md:flex items-center gap-1.5 bg-[#0D111A] p-1 rounded-xl border border-white/[0.08] text-xs">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                                            isActive
                                                ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/25'
                                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                        <span>{item.label}</span>
                                        {item.badge !== null && item.badge !== undefined && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'
                                            }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Right Actions Cluster */}
                        <div className="flex items-center gap-2.5">
                            
                            {/* Upload Trigger */}
                            <button
                                type="button"
                                onClick={() => setIsUploadModalOpen(true)}
                                className="px-3 py-1.5 bg-[#00B074] hover:bg-[#009b66] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#00B074]/20 flex items-center gap-2 transition-all active:scale-95 shrink-0"
                                title="Medya Yükle"
                            >
                                <Upload className={`w-3.5 h-3.5 ${activeUploadsCount > 0 ? 'animate-bounce' : ''}`} />
                                <span className="hidden sm:inline">Dosya Yükle</span>
                                {queue.length > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded-md font-mono">
                                        {queue.length}
                                    </span>
                                )}
                            </button>

                            {/* Jump to Public Site */}
                            <Link
                                href="/"
                                className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
                                title="Site Arayüzüne Dön"
                            >
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                <span className="hidden lg:inline">Siteye Git</span>
                            </Link>

                            {/* User Profile & Logout */}
                            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold">
                                        {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
                                    </div>
                                    <div className="hidden xl:block text-left text-xs leading-none">
                                        <div className="text-gray-200 font-semibold truncate max-w-[100px]">{currentUser?.name || 'Admin'}</div>
                                        <span className="text-[10px] text-gray-500 font-mono">Yönetici</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    title="Oturumu Kapat"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Mobile Hamburger Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                                className="md:hidden p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:text-white"
                                aria-label="Menü"
                            >
                                {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation Dropdown */}
                    {isMobileNavOpen && (
                        <div className="md:hidden py-3 border-t border-white/[0.08] space-y-1 animate-in fade-in slide-in-from-top-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={() => setIsMobileNavOpen(false)}
                                        className={`w-full px-3 py-2 rounded-lg font-semibold text-xs flex items-center justify-between ${
                                            isActive
                                                ? 'bg-[#00B074] text-white'
                                                : 'text-gray-300 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Icon className="w-4 h-4" />
                                            <span>{item.label}</span>
                                        </div>
                                        {item.badge !== null && item.badge !== undefined && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                            
                            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between px-3 text-xs text-gray-400">
                                <span>{currentUser?.name || 'Admin'}</span>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="text-rose-400 flex items-center gap-1 text-xs"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Çıkış Yap</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* MAIN CONSOLE BODY */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
                
                {/* BREADCRUMB & PAGE TITLE HEADER */}
                {(title || headerActions) && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Link href="/admin" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                                    <LayoutDashboard className="w-3 h-3 text-gray-500" />
                                    <span>Konsol</span>
                                </Link>
                                <ChevronRight className="w-3 h-3 text-gray-600" />
                                <span className="text-gray-200 font-medium">{title}</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        {headerActions && (
                            <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                                {headerActions}
                            </div>
                        )}
                    </div>
                )}

                {children}
            </main>

            {/* CONSOLE STATUS FOOTER */}
            <footer className="mt-auto border-t border-white/[0.06] bg-[#05070B] py-4 text-xs text-gray-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-300">SineKutu Media Engine</span>
                        <span className="text-gray-600">·</span>
                        <span className="font-mono text-gray-400 text-[11px]">PHP 8.3 / Laravel 11 / Inertia React</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Gateway Nodes Online
                        </span>
                        <span className="text-gray-600">·</span>
                        <Link href="/" className="text-gray-400 hover:text-emerald-400 transition-colors">
                            Kullanıcı Arayüzü
                        </Link>
                    </div>
                </div>
            </footer>

            {/* Persistent Floating Upload Bar & TMDB Matching Wizard */}
            <AdminUploadWidget />
            <TmdbWizardModal />
        </div>
    );
}
