import React, { useState, useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import { 
    Tv, 
    ExternalLink, 
    Key, 
    User, 
    Trash2, 
    Check, 
    Copy, 
    RefreshCw, 
    ShieldCheck, 
    Sparkles, 
    Laptop, 
    Smartphone, 
    Cast, 
    AlertTriangle,
    Eye,
    EyeOff,
    CheckCircle2,
    X,
    Info,
    ArrowRight,
    Mail,
    Lock
} from 'lucide-react';

export default function MediaServerIndex({
    has_account = false,
    account = null,
    suggested_username = '',
    active_servers_count = 0,
    has_available_servers = false
}) {
    const { flash } = usePage().props;

    // Creation Form State
    const [createUsername, setCreateUsername] = useState(suggested_username);
    const [createPassword, setCreatePassword] = useState('');
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

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

        setIsCreating(true);
        router.post('/media-server/account', {
            password: createPassword,
        }, {
            onFinish: () => setIsCreating(false),
            onSuccess: () => {
                setCreatePassword('');
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
            username: account?.username || suggested_username,
            password: newPassword,
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
                username: account?.username || suggested_username,
            },
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteModalOpen(false);
            }
        });
    };

    return (
        <Layout>
            <Head title="Medya Sunucum - SineKutu" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                
                {/* HERO BANNER & STATUS */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F1422] via-[#0E1726] to-[#0A101D] border border-white/10 p-6 sm:p-10 shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold tracking-wide">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Akıllı Jellyfin Medya Ağı</span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                                Kişisel Medya Sunucum
                            </h1>

                            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                Arşivdeki tüm film, dizi ve içerikleri kendi özel Jellyfin hesabınızla bilgisayarınızda, 
                                telefonunuzda veya Akıllı TV'nizde yüksek kalitede, donmadan ve reklamsız deneyimleyin.
                            </p>
                        </div>

                        {/* Node Cluster Indicator */}
                        <div className="shrink-0 bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                                <Tv className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sunucu Altyapısı</div>
                                <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>{active_servers_count} Aktif Node</span>
                                </div>
                                <div className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
                                    Dengeli Yük Dağıtımı Aktif
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FLASH NOTIFICATIONS */}
                {flash?.success && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-in fade-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="flex-1">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-in fade-in">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                        <span className="flex-1">{flash.error}</span>
                    </div>
                )}
                {flash?.warning && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-in fade-in">
                        <Info className="w-5 h-5 text-amber-400 shrink-0" />
                        <span className="flex-1">{flash.warning}</span>
                    </div>
                )}

                {/* STATE 1: USER HAS ACTIVE JELLYFIN ACCOUNT */}
                {has_account && account && (
                    <div className="space-y-6">
                        {/* Active Account Card */}
                        <div className="bg-[#0C101A] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                        <ShieldCheck className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <h3 className="text-lg font-bold text-white">Jellyfin Hesabınız Aktif</h3>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                Bağlı & Hazır
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Hesabınız <span className="text-emerald-400 font-semibold">{account.server_name}</span> sunucusunda çalışıyor.
                                        </p>
                                    </div>
                                </div>

                                {/* Main Launch Button */}
                                <div className="flex items-center gap-3">
                                    <a
                                        href={account.server_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all shadow-xl shadow-emerald-500/25"
                                    >
                                        <span>Jellyfin'e Git & İzle</span>
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>

                            {/* Credentials Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                                {/* Server URL */}
                                <div className="bg-[#121622] border border-white/5 p-4 rounded-2xl space-y-2">
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span className="font-semibold flex items-center gap-1.5">
                                            <Tv className="w-3.5 h-3.5 text-gray-500" /> Sunucu Adresi (Server URL)
                                        </span>
                                        <button
                                            onClick={() => handleCopy(account.server_url, 'url')}
                                            className="hover:text-white transition-colors text-gray-400 flex items-center gap-1 text-[11px]"
                                            title="Kopyala"
                                        >
                                            {copiedKey === 'url' ? (
                                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Kopyalandı
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    <Copy className="w-3 h-3" /> Kopyala
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                    <div className="font-mono text-sm text-emerald-400 font-bold truncate select-all">
                                        {account.server_url}
                                    </div>
                                    <p className="text-[11px] text-gray-500">
                                        Jellyfin mobil ve TV uygulamalarında sunucu adresi olarak bunu girin.
                                    </p>
                                </div>

                                {/* Username */}
                                <div className="bg-[#121622] border border-white/5 p-4 rounded-2xl space-y-2">
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span className="font-semibold flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-gray-500" /> Kullanıcı Adı (Username)
                                        </span>
                                        <button
                                            onClick={() => handleCopy(account.username, 'user')}
                                            className="hover:text-white transition-colors text-gray-400 flex items-center gap-1 text-[11px]"
                                            title="Kopyala"
                                        >
                                            {copiedKey === 'user' ? (
                                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Kopyalandı
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    <Copy className="w-3 h-3" /> Kopyala
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                    <div className="font-mono text-sm text-white font-bold truncate select-all">
                                        {account.username}
                                    </div>
                                    <p className="text-[11px] text-gray-500">
                                        Jellyfin girişinde belirlediğiniz şifreniz ile oturum açın.
                                    </p>
                                </div>
                            </div>

                            {/* Account Actions Bar */}
                            <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Info className="w-4 h-4 text-gray-500" />
                                    <span>Şifrenizi unuttuysanız tek tıkla yeni şifre tanımlayabilirsiniz.</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setNewPassword('');
                                            setIsResetModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-all active:scale-95"
                                    >
                                        <Key className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Şifremi Sıfırla / Değiştir</span>
                                    </button>

                                    <button
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all active:scale-95"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Hesabı Sil</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Setup Guide Accordion/Cards */}
                        <div className="bg-[#0C101A] border border-white/10 rounded-3xl p-6 sm:p-8">
                            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                                <Laptop className="w-5 h-5 text-emerald-400" />
                                <span>Cihazlarınızda Jellyfin Kurulumu</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-[#121622] border border-white/5 p-4 rounded-2xl space-y-2">
                                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs">
                                        <Laptop className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-xs font-bold text-white">Tarayıcı & Bilgisayar</h4>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        Herhangi bir ek programa gerek kalmadan yukarıdaki <strong className="text-emerald-400">Jellyfin'e Git</strong> butonuna tıklayarak hemen izlemeye başlayabilirsiniz.
                                    </p>
                                </div>

                                <div className="bg-[#121622] border border-white/5 p-4 rounded-2xl space-y-2">
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs">
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-xs font-bold text-white">Android & iPhone</h4>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        Google Play veya App Store'dan ücretsiz <strong className="text-white">Jellyfin</strong> uygulamasını indirin. Sunucu adresinizi ve bilgilerinizi girin.
                                    </p>
                                </div>

                                <div className="bg-[#121622] border border-white/5 p-4 rounded-2xl space-y-2">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                                        <Cast className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-xs font-bold text-white">Android TV & Apple TV</h4>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        TV uygulama mağazanızdan Jellyfin for Android TV uygulamasını kurun. Kumandanız ile dev ekranda 4K keyfi yaşayın.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STATE 2: USER DOES NOT HAVE JELLYFIN ACCOUNT YET */}
                {!has_account && (
                    <div className="bg-[#0C101A] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-xl max-w-2xl mx-auto">
                        <div className="text-center space-y-3 mb-8">
                            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                                <Tv className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-white">
                                Jellyfin Medya Hesabınızı Oluşturun
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                                Tek bir tıkla sistemimizdeki aktif Jellyfin sunucuları arasından en düşük yüke sahip olanına hesabınız otomatik olarak açılacaktır.
                            </p>
                        </div>

                        {!has_available_servers ? (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs text-center space-y-2">
                                <AlertTriangle className="w-6 h-6 mx-auto text-amber-400" />
                                <p className="font-bold">Şu anda aktif medya sunucusu bulunmuyor.</p>
                                <p className="text-gray-400">Yöneticiler sunucu altyapısını güncelliyor. Lütfen daha sonra tekrar deneyin.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateAccount} className="space-y-4">
                                {/* Username (Always User's Email) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-gray-300">
                                            Jellyfin Kullanıcı Adınız (E-posta)
                                        </label>
                                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Kayıtlı E-Postanız
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="email"
                                            value={createUsername || suggested_username}
                                            readOnly
                                            className="w-full bg-[#121622]/90 border border-emerald-500/30 rounded-xl pl-10 pr-10 py-3 text-sm text-emerald-300 font-mono select-all cursor-default focus:outline-none"
                                        />
                                        <Lock className="w-3.5 h-3.5 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Jellyfin sunucusuna giriş yaparken bu e-posta adresinizi kullanıcı adı olarak kullanacaksınız.
                                    </p>
                                </div>

                                {/* Password */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-gray-300">
                                            Hesap Şifreniz <span className="text-rose-400">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setCreatePassword(generateStrongPassword())}
                                            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                                        >
                                            Rastgele Güçlü Şifre Oluştur
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Key className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type={showCreatePassword ? 'text' : 'password'}
                                            value={createPassword}
                                            onChange={e => setCreatePassword(e.target.value)}
                                            placeholder="En az 4 karakter"
                                            required
                                            minLength={4}
                                            className="w-full bg-[#121622] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCreatePassword(!showCreatePassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Features badges */}
                                <div className="p-4 bg-[#121622]/50 rounded-2xl border border-white/5 space-y-2 text-xs text-gray-300">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>Yük dengeleme ile en hızlı sunucuya anında tahsis</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>Donanım hızlandırmalı 4K/1080p canlı dönüştürme</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>İstediğiniz zaman şifre değiştirme veya hesabı kaldırma özgürlüğü</span>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] transition-all shadow-xl shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Tv className={`w-4 h-4 ${isCreating ? 'animate-bounce' : ''}`} />
                                    <span>{isCreating ? 'Medya Hesabınız Oluşturuluyor...' : 'Medya Hesabımı Başlat'}</span>
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL: RESET PASSWORD */}
            {isResetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0B0F19] border border-white/[0.12] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <Key className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Jellyfin Şifresini Sıfırla</h3>
                                    <p className="text-xs text-gray-400">Mevcut medya sunucunuz için yeni şifre belirleyin</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsResetModalOpen(false)}
                                className="p-2 rounded-xl text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-gray-300">
                                        Yeni Şifre <span className="text-rose-400">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setNewPassword(generateStrongPassword())}
                                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                                    >
                                        Güçlü Şifre Üret
                                    </button>
                                </div>
                                <div className="relative">
                                    <Key className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Yeni şifreniz"
                                        required
                                        minLength={4}
                                        className="w-full bg-[#121622] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/60"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsResetModalOpen(false)}
                                    disabled={isResetting}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isResetting}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0B0F19] border border-white/[0.12] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                                <AlertTriangle className="w-6 h-6" />
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2">
                                Medya Hesabınızı Silmek İstiyor musunuz?
                            </h3>

                            <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                <span className="font-semibold text-white">{account?.server_name}</span> sunucusundaki Jellyfin hesabınız kalıcı olarak silinecektir. İzleme geçmişiniz ve favorileriniz temizlenecektir.
                            </p>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                                >
                                    {isDeleting ? 'Siliniyor...' : 'Evet, Hesabımı Sil'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
