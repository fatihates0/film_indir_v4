import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import AuthModal from '../../Components/AuthModal';
import {
    Tv,
    ExternalLink,
    Key,
    User,
    Trash2,
    Check,
    Copy,
    ShieldCheck,
    Laptop,
    Smartphone,
    Cast,
    AlertTriangle,
    Eye,
    EyeOff,
    CheckCircle2,
    X,
    Info,
    Mail,
    Lock,
    Star,
    Sparkles,
    Play,
    Compass,
    Film,
    Volume2
} from 'lucide-react';

export default function MediaServerIndex({
    has_account = false,
    account = null,
    accounts = { jellyfin: null, emby: null },
    available_server_types = { jellyfin: false, emby: false },
    counts = { jellyfin_servers: 0, emby_servers: 0 },
    suggested_username = '',
    active_servers_count = 0,
    has_available_servers = false,
    is_guest = false,
    has_active_subscription = false,
    featured_titles = []
}) {
    const { flash } = usePage().props;

    // Active Server Tab for viewing/creating (jellyfin or emby)
    const initialTab = accounts?.jellyfin ? 'jellyfin' : (accounts?.emby ? 'emby' : (available_server_types?.emby && !available_server_types?.jellyfin ? 'emby' : 'jellyfin'));
    const [activeTab, setActiveTab] = useState(initialTab);

    // Which account is currently being viewed:
    const currentAccount = accounts?.[activeTab] || (account?.server_type === activeTab ? account : (accounts?.jellyfin || accounts?.emby || account));
    const hasCurrentAccount = Boolean(currentAccount && currentAccount.server_type === activeTab);
    const hasAnyAccount = Boolean(accounts?.jellyfin || accounts?.emby || account);

    // Guest Auth Modal State
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // Creation Form State
    const [createPassword, setCreatePassword] = useState('');
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [creationServerType, setCreationServerType] = useState(
        available_server_types?.emby && !available_server_types?.jellyfin ? 'emby' : 'jellyfin'
    );

    // Password Reset Modal State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Copy Feedback
    const [copiedKey, setCopiedKey] = useState(null);

    const handleCopy = (text, key) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // Helper: Generate Random Strong Password
    const generateStrongPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
        let pass = '';
        for (let i = 0; i < 10; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pass;
    };

    // Handle Create Account
    const handleCreateAccount = (e) => {
        e.preventDefault();
        if (!createPassword || createPassword.length < 4) {
            alert('Lütfen en az 4 karakterli bir şifre belirleyin.');
            return;
        }

        const targetType = activeTab || creationServerType;
        setIsCreating(true);
        router.post('/media-server/account', {
            password: createPassword,
            server_type: targetType,
        }, {
            onFinish: () => setIsCreating(false),
            onSuccess: () => {
                setCreatePassword('');
                setActiveTab(targetType);
            }
        });
    };

    // Handle Reset Password
    const handleResetPassword = (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 4) {
            alert('Lütfen en az 4 karakterli bir şifre belirleyin.');
            return;
        }

        setIsResetting(true);
        router.post('/media-server/password', {
            username: currentAccount?.username || suggested_username,
            password: newPassword,
            server_type: currentAccount?.server_type || activeTab,
        }, {
            onFinish: () => setIsResetting(false),
            onSuccess: () => {
                setIsResetModalOpen(false);
                setNewPassword('');
            }
        });
    };

    // Handle Delete Account
    const handleDeleteAccount = () => {
        setIsDeleting(true);
        router.delete('/media-server/account', {
            data: {
                username: currentAccount?.username || suggested_username,
                server_type: currentAccount?.server_type || activeTab,
            },
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteModalOpen(false);
            }
        });
    };

    const heroBackdrop = featured_titles?.[0]?.backdrop_url ||
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1920';

    return (
        <Layout>
            <Head title="Kişisel Medya Sunucum - SineKutu" />

            {/* CINEMATIC HERO BANNER */}
            <div className="relative w-full min-h-[420px] sm:min-h-[460px] bg-[#07080c] overflow-hidden flex items-center">
                {/* Backdrop Image with Multi-layer Gradient Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={heroBackdrop}
                        alt="Cinema Backdrop"
                        className="w-full h-full object-cover filter brightness-[0.35] scale-105 transform motion-safe:transition-transform motion-safe:duration-10000 motion-safe:hover:scale-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/70 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#07080c] via-[#07080c]/80 to-transparent" />
                    <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-[#00B074]/15 rounded-full blur-[120px] pointer-events-none" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                    <div className="max-w-3xl space-y-4 sm:space-y-5">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00B074]/20 border border-[#00B074]/40 text-[#00B074] text-xs font-black tracking-wide backdrop-blur-md shadow-lg shadow-[#00B074]/10">
                            <Tv className="w-3.5 h-3.5" />
                            <span>Jellyfin Akıllı Medya Ağı</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                            Kişisel <span className="text-[#00B074]">Medya Sunucunuz</span>
                        </h1>

                        <p className="text-sm sm:text-base text-gray-300 max-w-2xl leading-relaxed">
                            SineKutu arşivindeki binlerce film ve diziyi kendi özel Jellyfin hesabınızla bilgisayarınızda,
                            telefonunuzda veya Akıllı TV'nizde yüksek kalitede, donmadan ve reklamsız deneyimleyin.
                        </p>

                        {/* Badges Strip */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            <span className="px-3 py-1 rounded-lg bg-white/10 dark:bg-white/5 border border-white/10 text-gray-200 font-semibold backdrop-blur-sm flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#00B074]" /> 4K Ultra HD & HDR
                            </span>
                            <span className="px-3 py-1 rounded-lg bg-white/10 dark:bg-white/5 border border-white/10 text-gray-200 font-semibold backdrop-blur-sm flex items-center gap-1.5">
                                <Play className="w-3.5 h-3.5 text-emerald-400" /> Doğrudan Oynatma (Direct Play)
                            </span>
                            <span className="px-3 py-1 rounded-lg bg-white/10 dark:bg-white/5 border border-white/10 text-gray-200 font-semibold backdrop-blur-sm flex items-center gap-1.5">
                                <Film className="w-3.5 h-3.5 text-sky-400" /> Otomatik Altyazı & Dublaj
                            </span>
                            <div className="px-3 py-1 rounded-lg bg-[#00B074]/15 border border-[#00B074]/30 text-[#00B074] font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#00B074] animate-pulse" />
                                <span>{active_servers_count} Aktif Node</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT WRAPPER */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">

                {/* FLASH NOTIFICATIONS */}
                {flash?.success && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#00B074]/15 border border-[#00B074]/30 text-[#00B074] text-xs sm:text-sm font-semibold animate-in fade-in">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs sm:text-sm font-semibold animate-in fade-in">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{flash.error}</span>
                    </div>
                )}
                {flash?.warning && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs sm:text-sm font-semibold animate-in fade-in">
                        <Info className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{flash.warning}</span>
                    </div>
                )}

                {/* ============================================================== */}
                {/* 1. SECTION: FULL-WIDTH ACCOUNT SECTION (HER ZAMAN EN ÜSTTE)     */}
                {/* ============================================================== */}

                {/* ============================================================== */}
                {/* 1. SECTION: FULL-WIDTH ACCOUNT SECTION (HER ZAMAN EN ÜSTTE)     */}
                {/* ============================================================== */}

                {/* SERVER SELECTION TABS (AUTHENTICATED USERS) */}
                {!is_guest && (
                    <div className="flex flex-wrap items-center gap-3 pb-2">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('jellyfin');
                                setCreationServerType('jellyfin');
                            }}
                            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                                activeTab === 'jellyfin'
                                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${accounts?.jellyfin ? 'bg-purple-400 animate-pulse' : 'bg-gray-500'}`} />
                            <span>Jellyfin {accounts?.jellyfin ? 'Hesabım (Aktif)' : '(Hesap Yok)'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('emby');
                                setCreationServerType('emby');
                            }}
                            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                                activeTab === 'emby'
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${accounts?.emby ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                            <span>Emby Server {accounts?.emby ? 'Hesabım (Aktif)' : '(Hesap Yok)'}</span>
                        </button>
                    </div>
                )}

                {/* CASE A: USER HAS ACTIVE ACCOUNT ON SELECTED TAB */}
                {!is_guest && hasCurrentAccount && currentAccount && (
                    <div className={`bg-white dark:bg-[#0A0D14] border-2 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden transition-colors space-y-6 ${
                        currentAccount.server_type === 'emby' ? 'border-[#00B074]/40' : 'border-purple-500/40'
                    }`}>
                        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
                            currentAccount.server_type === 'emby' ? 'bg-[#00B074]/10' : 'bg-purple-500/10'
                        }`} />

                        {/* Header & Launch Bar */}
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${
                                    currentAccount.server_type === 'emby'
                                        ? 'bg-[#00B074]/15 border-[#00B074]/30 text-[#00B074]'
                                        : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                                }`}>
                                    <ShieldCheck className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                            {currentAccount.server_type === 'emby' ? 'Emby Hesabınız Aktif' : 'Jellyfin Hesabınız Aktif'}
                                        </h2>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                                            currentAccount.server_type === 'emby'
                                                ? 'bg-[#00B074]/15 text-[#00B074] border-[#00B074]/30'
                                                : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                                currentAccount.server_type === 'emby' ? 'bg-[#00B074]' : 'bg-purple-400'
                                            }`} />
                                            Bağlı & Hazır
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
                                        Aktif Sunucu: <span className={`font-bold ${currentAccount.server_type === 'emby' ? 'text-[#00B074]' : 'text-purple-400'}`}>{currentAccount.server_name}</span> · Hesabınız tüm cihazlarda izlemeye hazır
                                    </p>
                                </div>
                            </div>

                            {/* Launch Button */}
                            <div className="flex items-center gap-3">
                                <a
                                    href={currentAccount.server_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-extrabold text-white active:scale-[0.99] transition-all shadow-xl group ${
                                        currentAccount.server_type === 'emby'
                                            ? 'bg-[#00B074] hover:bg-[#009663] shadow-[#00B074]/30'
                                            : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                                    }`}
                                >
                                    <Play className="w-4 h-4 fill-white" />
                                    <span>{currentAccount.server_type === 'emby' ? "Emby Web Player'ı Aç & İzle" : "Jellyfin Web Player'ı Aç & İzle"}</span>
                                    <ExternalLink className="w-4 h-4 ml-1 opacity-75 group-hover:opacity-100" />
                                </a>
                            </div>
                        </div>

                        {/* Credentials Grid (3 Columns on Desktop) */}
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Server URL */}
                            <div className="bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/5 p-5 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                                    <span className="font-bold flex items-center gap-1.5">
                                        <Tv className="w-4 h-4 text-slate-400" /> Sunucu Adresi (Server URL)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(currentAccount.server_url, 'url')}
                                        className="hover:text-slate-900 dark:hover:text-white transition-colors text-slate-500 dark:text-gray-400 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                                    >
                                        {copiedKey === 'url' ? (
                                            <span className="text-[#00B074] font-bold flex items-center gap-1">
                                                <Check className="w-3.5 h-3.5" /> Kopyalandı
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <Copy className="w-3.5 h-3.5" /> Kopyala
                                            </span>
                                        )}
                                    </button>
                                </div>
                                <div className={`font-mono text-sm sm:text-base font-bold truncate select-all ${
                                    currentAccount.server_type === 'emby' ? 'text-[#00B074]' : 'text-purple-400'
                                }`}>
                                    {currentAccount.server_url}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-gray-500">
                                    Mobil veya TV uygulamasında sunucu adresi alanına bu adresi yapıştırın.
                                </p>
                            </div>

                            {/* Username */}
                            <div className="bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/5 p-5 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                                    <span className="font-bold flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-slate-400" /> Kullanıcı Adı (Username)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(currentAccount.username, 'user')}
                                        className="hover:text-slate-900 dark:hover:text-white transition-colors text-slate-500 dark:text-gray-400 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                                    >
                                        {copiedKey === 'user' ? (
                                            <span className="text-[#00B074] font-bold flex items-center gap-1">
                                                <Check className="w-3.5 h-3.5" /> Kopyalandı
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <Copy className="w-3.5 h-3.5" /> Kopyala
                                            </span>
                                        )}
                                    </button>
                                </div>
                                <div className="font-mono text-sm sm:text-base text-slate-900 dark:text-white font-bold truncate select-all">
                                    {currentAccount.username}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-gray-500">
                                    Girişte belirlediğiniz şifreniz ile oturum açın.
                                </p>
                            </div>

                            {/* Quick Actions & Security */}
                            <div className="bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/5 p-5 rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="text-xs text-slate-500 dark:text-gray-400 space-y-1">
                                    <span className="font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                                        <Lock className="w-4 h-4 text-slate-400" /> Hesap Güvenliği & Ayarlar
                                    </span>
                                    <p className="text-[11px] leading-relaxed">
                                        Şifrenizi dilediğiniz an güncelleyebilir veya bu hesabı silebilirsiniz.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewPassword('');
                                            setIsResetModalOpen(true);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-sm"
                                    >
                                        <Key className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Şifre Sıfırla</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Hesabı Sil</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CASE B: AUTHENTICATED USER - ACCOUNT CREATION (NO ACCOUNT ON CURRENT TAB) */}
                {!is_guest && !hasCurrentAccount && (
                    <div className="bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden transition-colors space-y-8">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00B074]/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                            <div className="space-y-1.5 max-w-2xl">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#00B074]/15 text-[#00B074]">
                                    <Sparkles className="w-3.5 h-3.5" /> Anında Otomatik Tanımlama
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                    {activeTab === 'emby' ? 'Emby Medya Hesabınızı Oluşturun' : 'Jellyfin Medya Hesabınızı Oluşturun'}
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                                    {activeTab === 'emby'
                                        ? 'Tek bir tıkla aktif Emby sunucu havuzumuzdan en hızlı ve en düşük yüke sahip node üzerinde hesabınız anında açılır.'
                                        : 'Tek bir tıkla aktif Jellyfin sunucu havuzumuzdan en hızlı ve en düşük yüke sahip node üzerinde hesabınız anında açılır.'}
                                </p>
                            </div>

                            {/* Node Status Indicator */}
                            <div className="shrink-0 flex items-center gap-3 bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/5 px-4 py-3 rounded-2xl">
                                <div className="w-10 h-10 rounded-xl bg-[#00B074]/15 text-[#00B074] flex items-center justify-center font-bold">
                                    <Tv className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sunucu Altyapısı</div>
                                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#00B074] animate-pulse" />
                                        <span>{active_servers_count} Aktif Node</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!has_available_servers ? (
                            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs text-center space-y-2">
                                <AlertTriangle className="w-6 h-6 mx-auto text-amber-500" />
                                <p className="font-bold text-sm">Şu anda aktif medya sunucusu bulunmuyor.</p>
                                <p className="text-slate-500 dark:text-gray-400">Yöneticiler sunucu altyapısını güncelliyor. Lütfen kısa bir süre sonra tekrar deneyin.</p>
                            </div>
                        ) : !has_active_subscription ? (
                            <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-center space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <div className="space-y-1.5 max-w-md mx-auto">
                                    <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                                        Aktif Abonelik Paketi Gereklidir
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                                        Medya sunucumuzda hesap oluşturabilmek ve yüksek hızlı yayın akışını kullanabilmek için aktif bir abonelik paketinizin olması gerekir. Paketinizin süresi dolmuş veya henüz bir paket tanımlanmamış olabilir.
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <Link
                                        href="/pricing"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold transition-all shadow-lg shadow-[#00B074]/20"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span>Paketleri ve Abonelikleri İncele</span>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateAccount} className="relative z-10 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Username (Email) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-gray-300">
                                                Kullanıcı Adınız (E-posta)
                                            </label>
                                            <span className="text-[11px] text-[#00B074] font-semibold flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Kayıtlı E-Postanız
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <Mail className="w-4 h-4 text-[#00B074] absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="email"
                                                value={suggested_username}
                                                readOnly
                                                className="w-full bg-slate-50 dark:bg-[#0c0e15] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-10 py-3.5 text-sm text-[#00B074] font-mono select-all cursor-default focus:outline-none"
                                            />
                                            <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
                                            {activeTab === 'emby' ? 'Emby' : 'Jellyfin'} istemcilerinde oturum açarken bu e-posta adresinizi kullanacaksınız.
                                        </p>
                                    </div>

                                    {/* Password Input */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-gray-300">
                                                {activeTab === 'emby' ? 'Emby Şifreniz' : 'Jellyfin Şifreniz'} <span className="text-rose-500">*</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setCreatePassword(generateStrongPassword())}
                                                className="text-[11px] font-bold text-[#00B074] hover:text-[#009663] transition-colors cursor-pointer"
                                            >
                                                Rastgele Güçlü Şifre Üret
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type={showCreatePassword ? 'text' : 'password'}
                                                value={createPassword}
                                                onChange={e => setCreatePassword(e.target.value)}
                                                placeholder="En az 4 karakterli şifre belirleyin"
                                                required
                                                minLength={4}
                                                className="w-full bg-slate-50 dark:bg-[#0c0e15] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-10 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#00B074] focus:ring-1 focus:ring-[#00B074] font-mono transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCreatePassword(!showCreatePassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                                            >
                                                {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
                                            Şifrenizi unuttuğunuzda bu sayfadan dilediğiniz an tek tıkla yenileyebilirsiniz.
                                        </p>
                                    </div>
                                </div>

                                {/* Features Checklist */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-[#0c0e15] rounded-2xl border border-slate-200/80 dark:border-white/5 text-xs text-slate-600 dark:text-gray-300">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-[#00B074] shrink-0" />
                                        <span>Kayıpsız 4K & 1080p Doğrudan Akış</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-[#00B074] shrink-0" />
                                        <span>Otomatik Türkçe Dublaj & Altyazı</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-[#00B074] shrink-0" />
                                        <span>Tüm Cihazlarda Anlık Senkronizasyon</span>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className={`w-full py-4 px-8 rounded-2xl text-sm sm:text-base font-extrabold text-white active:scale-[0.99] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer ${
                                        activeTab === 'emby'
                                            ? 'bg-[#00B074] hover:bg-[#009663] shadow-[#00B074]/30'
                                            : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                                    }`}
                                >
                                    <Tv className={`w-5 h-5 ${isCreating ? 'animate-bounce' : ''}`} />
                                    <span>{isCreating ? 'Medya Hesabınız Oluşturuluyor...' : `${activeTab === 'emby' ? 'Emby' : 'Jellyfin'} Hesabımı Başlat`}</span>
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* CASE C: GUEST USER - FULL WIDTH CARD */}
                {!has_account && is_guest && (
                    <div className="bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden transition-colors space-y-6">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00B074]/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                            <div className="space-y-2 max-w-2xl">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#00B074]/15 text-[#00B074]">
                                    <Sparkles className="w-3.5 h-3.5" /> Üyelere Özel Medya Sunucusu
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                    Jellyfin Kişisel Medya Hesabınızı Başlatın
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                                    SineKutu arşivindeki binlerce film ve diziyi kendi özel Jellyfin hesabınız ile tüm cihazlarınızda reklamsız izleyin.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsAuthModalOpen(true)}
                                className="shrink-0 px-8 py-4 rounded-2xl text-sm font-extrabold text-white bg-[#00B074] hover:bg-[#009663] active:scale-[0.99] transition-all shadow-xl shadow-[#00B074]/30 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <User className="w-4 h-4" />
                                <span>Giriş Yap & Hesabı Başlat</span>
                            </button>
                        </div>

                        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-gray-300">
                            <div className="p-4 bg-slate-50 dark:bg-[#0c0e15] rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-1">
                                <span className="font-bold text-slate-900 dark:text-white block">Doğrudan Kayıpsız Oynatma</span>
                                <p className="text-[11px] text-slate-500 dark:text-gray-400">Orijinal kalitede 4K Ultra HD ve 1080p yüksek bitrate video akışı.</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-[#0c0e15] rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-1">
                                <span className="font-bold text-slate-900 dark:text-white block">Çoklu Ses & Altyazı Desteği</span>
                                <p className="text-[11px] text-slate-500 dark:text-gray-400">Türkçe dublaj ve orijinal dilde altyazı seçeneklerini anında seçebilme.</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-[#0c0e15] rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-1">
                                <span className="font-bold text-slate-900 dark:text-white block">Tüm Cihazlarda Eşzamanlı</span>
                                <p className="text-[11px] text-slate-500 dark:text-gray-400">Bilgisayar, mobil uygulama ve Akıllı TV'de kaldığınız dakikadan devam edin.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* 2. SECTION: JELLYFIN SHOWCASE & FEATURES (HESAP ALTI)          */}
                {/* ============================================================== */}
                <div className="bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl transition-colors space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                SineKutu Kütüphanesi Parmaklarınızın Ucunda
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
                                Arşivdeki filmler ve diziler Jellyfin kütüphanenizde otomatik olarak eşzamanlanır.
                            </p>
                        </div>

                        <Link
                            href="/discover"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00B074] hover:text-[#009663] transition-colors self-start sm:self-auto"
                        >
                            <span>Tüm Arşivi Keşfet</span>
                            <Compass className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* MINI POSTER STRIP (4 POSTER) */}
                    {featured_titles && featured_titles.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {featured_titles.slice(0, 4).map((title) => (
                                <Link
                                    key={title.id}
                                    href={title.detail_url || `/movie/${title.slug}`}
                                    className="group relative rounded-2xl overflow-hidden aspect-[2/3] bg-slate-100 dark:bg-[#0c0e15] border border-slate-200 dark:border-white/5 shadow-md hover:border-[#00B074]/50 transition-all duration-300"
                                >
                                    <img
                                        src={title.poster_url}
                                        alt={title.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <div className="text-xs font-bold text-white line-clamp-1">{title.title}</div>
                                        <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold mt-0.5">
                                            <Star className="w-3 h-3 fill-amber-400" />
                                            <span>{title.vote_average}</span>
                                        </div>
                                    </div>
                                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-extrabold text-[#00B074]">
                                        4K HDR
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* 4 CORE JELLYFIN PILLARS (TRANSCODING YERİNE DIRECT PLAY & AUDIO) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-4 border-t border-slate-100 dark:border-white/5">
                        <div className="space-y-1.5">
                            <div className="w-10 h-10 rounded-xl bg-[#00B074]/10 text-[#00B074] flex items-center justify-center font-bold">
                                <Play className="w-5 h-5 fill-[#00B074]" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">Doğrudan Akış (Direct Play)</h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                                Orijinal video ve ses kalitesinde kayıpsız, en yüksek bitrate ile doğrudan oynatma.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                                <Volume2 className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">Çoklu Ses & Dublaj</h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                                Türkçe dublaj veya orijinal ses kanalları arasında anında geçiş yapabilme.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                                <Cast className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">Çapraz Cihaz Senkronu</h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                                Bilgisayarda başlayıp televizyonda kaldığınız dakikadan aynen devam edin.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                                <Film className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">Sıfır Reklam & Kesintisiz</h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                                Bekleme, popup veya reklam olmadan doğrudan kendi kişisel sinema salonunuz.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* 3. SECTION: DEVICE ECOSYSTEM & SETUP (CİHAZLAR)                 */}
                {/* ============================================================== */}
                <div className="bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl transition-colors space-y-6">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Laptop className="w-6 h-6 text-[#00B074]" />
                            <span>Cihazlarınızda Nasıl İzlersiniz?</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
                            Emby ve Jellyfin, favori tüm platformlarınızda resmi uygulamalarıyla sorunsuz çalışır.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/5 p-6 rounded-2xl space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                                <Laptop className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">Tarayıcı & Bilgisayar</h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                                Ekstra bir program kurmanıza gerek kalmadan yukarıdaki <strong className="text-[#00B074]">Web Player'ı Aç</strong> butonu ile doğrudan web üzerinden izleyin.
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/5 p-6 rounded-2xl space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">iOS & Android</h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                                App Store veya Google Play'den resmi <strong className="text-slate-800 dark:text-gray-200">Emby</strong> veya <strong className="text-slate-800 dark:text-gray-200">Jellyfin</strong> uygulamasını indirin ve sunucu adresinizi girin.
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/5 p-6 rounded-2xl space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                                <Cast className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">Android TV, LG & Samsung</h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                                Smart TV mağazalarından Emby veya Jellyfin uygulamasını kurup kumandanız ile dev ekranda sinema keyfi yaşayın.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* 4. SECTION: BOTTOM FEATURED TITLES ARCHIVE                      */}
                {/* ============================================================== */}
                {featured_titles && featured_titles.length > 0 && (
                    <div className="pt-6 border-t border-slate-200 dark:border-white/10 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                    Jellyfin Kütüphanenizde Sizi Bekleyenler
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
                                    SineKutu'daki binlerce yapım kişisel medya sunucunuzda izlenmeye hazır.
                                </p>
                            </div>

                            <Link
                                href="/discover"
                                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#00B074] hover:text-[#009663] transition-colors"
                            >
                                <span>Tümünü Keşfet</span>
                                <Compass className="w-4 h-4" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
                            {featured_titles.map((title) => (
                                <Link
                                    key={title.id}
                                    href={title.detail_url || `/movie/${title.slug}`}
                                    className="group relative rounded-2xl overflow-hidden aspect-[2/3] bg-slate-100 dark:bg-[#0A0D14] border border-slate-200 dark:border-white/5 shadow-md hover:border-[#00B074]/50 transition-all duration-300"
                                >
                                    <img
                                        src={title.poster_url}
                                        alt={title.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                                        <div className="text-[11px] font-bold text-white line-clamp-1">{title.title}</div>
                                        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold mt-0.5">
                                            <Star className="w-3 h-3 fill-amber-400" />
                                            <span>{title.vote_average}</span>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-extrabold text-[#00B074]">
                                        4K HDR
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* MODAL: RESET PASSWORD */}
            {isResetModalOpen && (
                <div
                    onClick={() => setIsResetModalOpen(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                                    <Key className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Jellyfin Şifresini Sıfırla</h3>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Yeni şifre belirleyin</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsResetModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-gray-300">
                                        Yeni Şifre <span className="text-rose-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setNewPassword(generateStrongPassword())}
                                        className="text-[11px] font-bold text-[#00B074] hover:text-[#009663] cursor-pointer"
                                    >
                                        Güçlü Şifre Üret
                                    </button>
                                </div>
                                <div className="relative">
                                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Yeni şifreniz"
                                        required
                                        minLength={4}
                                        className="w-full bg-slate-50 dark:bg-[#0c0e15] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#00B074]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsResetModalOpen(false)}
                                    disabled={isResetting}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isResetting}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                                >
                                    {isResetting ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: DELETE ACCOUNT */}
            {isDeleteModalOpen && (
                <div
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4">
                                <AlertTriangle className="w-6 h-6" />
                            </div>

                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
                                Medya Hesabınızı Silmek İstiyor musunuz?
                            </h3>

                            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed mb-6">
                                <span className="font-bold text-slate-800 dark:text-white">{account?.server_name}</span> sunucusundaki Jellyfin hesabınız kalıcı olarak silinecektir. İzleme geçmişiniz ve favorileriniz temizlenecektir.
                            </p>

                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 active:scale-[0.98] transition-all shadow-md shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
                                >
                                    {isDeleting ? 'Siliniyor...' : 'Evet, Hesabımı Sil'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: AUTH FOR GUESTS */}
            <AuthModal
                isOpen={isAuthModalOpen}
                mode="login"
                onClose={() => setIsAuthModalOpen(false)}
                onSwitchMode={() => { }}
            />
        </Layout>
    );
}
