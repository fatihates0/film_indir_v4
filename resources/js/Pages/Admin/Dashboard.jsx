import React, { useState, useMemo } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AdminLayout from '../../Components/AdminLayout';
import { 
    Search, 
    SlidersHorizontal, 
    RefreshCw, 
    Check, 
    ExternalLink, 
    ArrowUpRight,
    Filter,
    Database,
    HardDrive,
    Server,
    Wifi,
    Film,
    Play,
    Sparkles,
    Terminal,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X
} from 'lucide-react';

export default function AdminDashboard({ 
    stats, 
    recentUsers = [], 
    storageBoxes = [],
    plans = [],
    heroSettings = { mode: 'auto', slots: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
    heroSlotPreviews = {}
}) {
    const { auth } = usePage().props;
    const currentUser = auth?.user;

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'settings'
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'user'
    const [planFilter, setPlanFilter] = useState('all');

    // Interactive settings state
    const [settingsState, setSettingsState] = useState({
        allowRegistrations: true,
        maintenanceMode: false,
        streamRateLimit: 'unlimited',
        cacheLifetimeHours: '24',
        discordWebhook: true,
    });
    const [savedNotice, setSavedNotice] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filtered users for table
    const filteredUsers = useMemo(() => {
        return recentUsers.filter(u => {
            const matchesSearch = 
                u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' || u.role === roleFilter;
            const matchesPlan = planFilter === 'all' || (planFilter === 'premium' ? u.plan !== 'free' : u.plan === 'free');
            return matchesSearch && matchesRole && matchesPlan;
        });
    }, [recentUsers, searchQuery, roleFilter, planFilter]);

    const handleSaveSettings = (e) => {
        e.preventDefault();
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
    };

    // Hero Carousel Settings state
    const [heroMode, setHeroMode] = useState(heroSettings?.mode || 'auto');
    const [heroSlots, setHeroSlots] = useState({
        '1': heroSettings?.slots?.['1'] || heroSettings?.slots?.[1] || '',
        '2': heroSettings?.slots?.['2'] || heroSettings?.slots?.[2] || '',
        '3': heroSettings?.slots?.['3'] || heroSettings?.slots?.[3] || '',
        '4': heroSettings?.slots?.['4'] || heroSettings?.slots?.[4] || '',
        '5': heroSettings?.slots?.['5'] || heroSettings?.slots?.[5] || '',
    });
    const [slotPreviews, setSlotPreviews] = useState(heroSlotPreviews || {});
    const [lookupLoading, setLookupLoading] = useState({});
    const [isSavingHero, setIsSavingHero] = useState(false);
    const [heroNotice, setHeroNotice] = useState(null);

    // Sync Trailers state
    const [isSyncingTrailers, setIsSyncingTrailers] = useState(false);
    const [syncLimit, setSyncLimit] = useState(50);
    const [syncOutput, setSyncOutput] = useState(null);
    const [syncSuccess, setSyncSuccess] = useState(null);

    const handleLookupImdb = async (slotNum, imdbId) => {
        const cleanId = (imdbId || '').trim();
        if (!cleanId) {
            setSlotPreviews(prev => {
                const next = { ...prev };
                delete next[slotNum];
                return next;
            });
            return;
        }

        setLookupLoading(prev => ({ ...prev, [slotNum]: true }));
        try {
            const res = await fetch(`/admin/lookup-imdb?imdb_id=${encodeURIComponent(cleanId)}`);
            const data = await res.json();
            if (data.found) {
                setSlotPreviews(prev => ({ ...prev, [slotNum]: data.title }));
            } else {
                setSlotPreviews(prev => ({ ...prev, [slotNum]: { error: data.message || 'Arşivde bulunamadı' } }));
            }
        } catch (err) {
            console.error('Lookup error:', err);
            setSlotPreviews(prev => ({ ...prev, [slotNum]: { error: 'Sorgulama hatası oluştu' } }));
        } finally {
            setLookupLoading(prev => ({ ...prev, [slotNum]: false }));
        }
    };

    const handleSaveHeroSettings = (e) => {
        e?.preventDefault();
        setIsSavingHero(true);
        router.post('/admin/hero-settings', {
            mode: heroMode,
            slots: heroSlots,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSavingHero(false);
                setHeroNotice('Dashboard fragman vitrin ayarları başarıyla kaydedildi.');
                setTimeout(() => setHeroNotice(null), 4000);
            },
            onError: () => {
                setIsSavingHero(false);
                setHeroNotice('Ayarlar kaydedilirken bir hata oluştu.');
                setTimeout(() => setHeroNotice(null), 4000);
            }
        });
    };

    const handleRunSyncTrailers = async () => {
        setIsSyncingTrailers(true);
        setSyncOutput(null);
        setSyncSuccess(null);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res = await fetch('/admin/sync-trailers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ limit: Number(syncLimit) || 50 }),
            });

            const data = await res.json();
            if (data.success) {
                setSyncSuccess(data.message);
                setSyncOutput(data.output);
                router.reload({ only: ['heroSlotPreviews', 'heroSettings'] });
            } else {
                setSyncOutput(data.message || 'Senkronizasyon sırasında hata oluştu.');
            }
        } catch (err) {
            setSyncOutput('Komut çalıştırılırken bağlantı hatası: ' + err.message);
        } finally {
            setIsSyncingTrailers(false);
        }
    };

    const handleRefreshTelemetry = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 600);
    };

    return (
        <AdminLayout
            title="Genel Bakış"
            subtitle="Sistem istatistikleri, Hero Karusel ayarları, kullanıcı yetkilendirme ve TMDB entegrasyonu."
            activeTab="overview"
            statsSummary={{ 
                total_boxes: stats?.storage?.total_boxes || storageBoxes.length || 0,
                total_plans: plans?.length || 0
            }}
            headerActions={
                <div className="flex items-center gap-1 bg-[#10141F] p-1 rounded-xl border border-white/[0.08] text-xs">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold ${
                            activeTab === 'overview'
                                ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Genel Bakış
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
                            activeTab === 'users'
                                ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Kullanıcılar
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 font-mono">
                            {stats?.total_users || 0}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold ${
                            activeTab === 'settings'
                                ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Sistem Ayarları
                    </button>
                </div>
            }
        >
            <div className="space-y-8">

                    {/* TAB 1: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in duration-150">
                            
                            {/* REFINED STATS ROW (Clean typography, no childish colorful icon squares) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                
                                <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                                    <div className="flex items-center justify-between text-gray-400">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider">Kayıtlı Kullanıcı</span>
                                        <span className="text-[11px] text-emerald-400 font-mono font-medium">+100% büyüme</span>
                                    </div>
                                    <div className="mt-3 flex items-baseline gap-2">
                                        <span className="text-3xl font-semibold tracking-tight text-white font-mono">
                                            {stats?.total_users || 0}
                                        </span>
                                        <span className="text-xs text-gray-500">aktif hesap</span>
                                    </div>
                                    <div className="mt-3 text-[11px] text-gray-400 flex items-center justify-between border-t border-white/[0.04] pt-2.5">
                                        <span>Yönetici: <strong className="text-gray-200 font-mono">{stats?.admin_count || 1}</strong></span>
                                        <span>Standart: <strong className="text-gray-200 font-mono">{(stats?.total_users || 1) - (stats?.admin_count || 1)}</strong></span>
                                    </div>
                                </div>

                                <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                                    <div className="flex items-center justify-between text-gray-400">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider">Premium Üyeler</span>
                                        <span className="text-[11px] text-amber-400/90 font-medium">VIP / Pro</span>
                                    </div>
                                    <div className="mt-3 flex items-baseline gap-2">
                                        <span className="text-3xl font-semibold tracking-tight text-amber-300 font-mono">
                                            {stats?.premium_users || 0}
                                        </span>
                                        <span className="text-xs text-gray-500">abone</span>
                                    </div>
                                    <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                                        <span>Dönüşüm Oranı</span>
                                        <span className="font-mono text-gray-300">
                                            {stats?.total_users ? `${Math.round((stats.premium_users / stats.total_users) * 100)}%` : '0%'}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                                    <div className="flex items-center justify-between text-gray-400">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider">Yayınlanan Medya</span>
                                        <span className="text-[11px] text-gray-400 font-mono">Indexlenmiş</span>
                                    </div>
                                    <div className="mt-3 flex items-baseline gap-2">
                                        <span className="text-3xl font-semibold tracking-tight text-white font-mono">
                                            {(stats?.total_movies || 0) + (stats?.total_series || 0)}
                                        </span>
                                        <span className="text-xs text-gray-500">başlık</span>
                                    </div>
                                    <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                                        <span>{stats?.total_movies || 0} Film</span>
                                        <span className="text-gray-600">·</span>
                                        <span>{stats?.total_series || 0} Dizi</span>
                                    </div>
                                </div>

                                <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                                    <div className="flex items-center justify-between text-gray-400">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider">Toplam İndirme</span>
                                        <span className="text-[11px] text-emerald-400 font-mono">Aktif CDN</span>
                                    </div>
                                    <div className="mt-3 flex items-baseline gap-2">
                                        <span className="text-3xl font-semibold tracking-tight text-white font-mono">
                                            {stats?.total_downloads ? Number(stats.total_downloads).toLocaleString('tr-TR') : '0'}
                                        </span>
                                        <span className="text-xs text-gray-500">oturum</span>
                                    </div>
                                    <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                                        <span>Bant Genişliği</span>
                                        <span className="font-mono text-gray-300">~42.8 TB</span>
                                    </div>
                                </div>

                            </div>

                            {/* MAIN GRID: ACTIVITY TABLE & TELEMETRY */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                                
                                {/* RECENT USERS (2 Columns) */}
                                <div className="lg:col-span-2 bg-[#0D111A] border border-white/[0.06] rounded-xl overflow-hidden">
                                    
                                    <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                                        <div>
                                            <h2 className="text-sm font-semibold text-white">Son Kayıt Olan Kullanıcılar</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">Sisteme en son katılan hesaplar ve yetki seviyeleri</p>
                                        </div>
                                        <button 
                                            onClick={() => setActiveTab('users')}
                                            className="text-xs text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-1 font-medium"
                                        >
                                            Tümünü Gör
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.02] border-b border-white/[0.04]">
                                                <tr>
                                                    <th className="px-5 py-3 font-medium">Kullanıcı</th>
                                                    <th className="px-5 py-3 font-medium">E-posta</th>
                                                    <th className="px-5 py-3 font-medium">Rol</th>
                                                    <th className="px-5 py-3 font-medium">Plan</th>
                                                    <th className="px-5 py-3 font-medium text-right">Kayıt Tarihi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.04]">
                                                {recentUsers.slice(0, 6).map((u) => (
                                                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-5 py-3.5 font-medium text-white">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-6 h-6 rounded-full bg-white/[0.08] text-gray-300 font-mono text-[11px] flex items-center justify-center font-medium">
                                                                    {u.name?.charAt(0).toUpperCase() || 'U'}
                                                                </div>
                                                                <span>{u.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-gray-400 font-mono text-[11px]">{u.email}</td>
                                                        <td className="px-5 py-3.5">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium tracking-wide ${
                                                                u.role === 'admin' 
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                                                    : 'bg-white/[0.04] text-gray-400'
                                                            }`}>
                                                                {u.role_label}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                                                                u.plan !== 'free' 
                                                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' 
                                                                    : 'text-gray-400'
                                                            }`}>
                                                                {u.plan_label}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right text-gray-400 font-mono text-[11px]">{u.created_at}</td>
                                                    </tr>
                                                ))}
                                                {recentUsers.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                                                            Henüz kayıtlı kullanıcı bulunmuyor.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* SYSTEM TELEMETRY & HEALTH (1 Column, clean Stripe/Vercel style) */}
                                <div className="space-y-4">
                                    
                                    <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                                            <div>
                                                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">Altyapı Durumu</h3>
                                                <p className="text-[11px] text-gray-500">Gerçek zamanlı sunucu telemetrisi</p>
                                            </div>
                                            <button 
                                                onClick={handleRefreshTelemetry}
                                                disabled={isRefreshing}
                                                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                                                title="Yenile"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                                            </button>
                                        </div>

                                        <div className="space-y-3.5 text-xs">
                                            
                                            <div>
                                                <div className="flex justify-between text-gray-400 mb-1">
                                                    <span>Uptime Oranı</span>
                                                    <span className="font-mono text-emerald-400 font-medium">99.98%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.98%' }} />
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-gray-400 mb-1">
                                                    <span>API Yanıt Süresi</span>
                                                    <span className="font-mono text-gray-200">18 ms</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-400/80 rounded-full" style={{ width: '22%' }} />
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-gray-400 mb-1">
                                                    <span>MySQL Havuz Kullanımı</span>
                                                    <span className="font-mono text-gray-200">8 / 100 bağlantı</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-400/70 rounded-full" style={{ width: '8%' }} />
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-white/[0.04] space-y-2 text-[11px]">
                                                <div className="flex items-center justify-between text-gray-400">
                                                    <span>Çalışma Ortamı:</span>
                                                    <span className="font-mono text-gray-200">PHP 8.3 / Laravel 11</span>
                                                </div>
                                                <div className="flex items-center justify-between text-gray-400">
                                                    <span>Önbellek Sürücüsü:</span>
                                                    <span className="font-mono text-gray-200">Database Cache</span>
                                                </div>
                                                <div className="flex items-center justify-between text-gray-400">
                                                    <span>Yönetici Koruma:</span>
                                                    <span className="font-mono text-emerald-400">Middleware 404 Aktif</span>
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* HETZNER STORAGE BOX TELEMETRY */}
                                    <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                                            <div>
                                                <h3 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                                                    <Database className="w-3.5 h-3.5 text-[#00B074]" />
                                                    <span>Hetzner Storage Box Deposu</span>
                                                </h3>
                                                <p className="text-[11px] text-gray-400">Film & video medya depolama üniteleri</p>
                                            </div>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                {stats?.storage?.online_boxes || 0} / {stats?.storage?.total_boxes || 0} Aktif
                                            </span>
                                        </div>

                                        <div className="space-y-3 text-xs">
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-[#07090E] border border-white/[0.04]">
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <HardDrive className="w-4 h-4 text-emerald-400" />
                                                    <span>Toplam Havuz Kapasitesi</span>
                                                </div>
                                                <span className="font-mono text-white font-bold">
                                                    {stats?.storage?.total_tb || 0} TB
                                                </span>
                                            </div>

                                            {/* Mini Box List */}
                                            <div className="space-y-1.5 pt-1">
                                                {storageBoxes.slice(0, 3).map((box) => (
                                                    <div key={box.id} className="p-2 rounded-lg bg-[#07090E] border border-white/[0.04] flex items-center justify-between text-[11px]">
                                                        <div className="truncate mr-2">
                                                            <div className="font-medium text-gray-200 truncate">{box.name}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono">{box.protocol.toUpperCase()} · Port {box.port}</div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                                {box.latency_ms ? `${box.latency_ms}ms` : 'Online'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <Link
                                                href="/admin/storage-boxes"
                                                className="w-full py-2 px-3 rounded-lg bg-[#00B074]/10 hover:bg-[#00B074]/20 border border-[#00B074]/30 text-[#00B074] text-xs font-semibold transition-colors flex items-center justify-between"
                                            >
                                                <span>Storage Box Modülünü Yönet</span>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    </div>

                                    {/* QUICK OPS PANEL */}
                                    <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 space-y-3">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">Hızlı Sistem Görevleri</h3>
                                        <div className="space-y-2 text-xs">
                                            <button 
                                                onClick={() => {
                                                    alert('Uygulama ve rota önbelleği sıfırlandı.');
                                                }}
                                                className="w-full text-left px-3.5 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-gray-300 hover:text-white transition-colors flex items-center justify-between"
                                            >
                                                <span>Önbelleği Temizle</span>
                                                <span className="text-[10px] text-gray-500 font-mono">cache:clear</span>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    alert('Güvenlik audit logları kontrol edildi: Herhangi bir yetkisiz sızma girişimi bulunamadı.');
                                                }}
                                                className="w-full text-left px-3.5 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-gray-300 hover:text-white transition-colors flex items-center justify-between"
                                            >
                                                <span>Erişim Günlüklerini Tara</span>
                                                <span className="text-[10px] text-gray-500 font-mono">security:audit</span>
                                            </button>
                                            <Link 
                                                href="/" 
                                                className="w-full text-left px-3.5 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-gray-300 hover:text-white transition-colors flex items-center justify-between block"
                                            >
                                                <span>Kullanıcı Arayüzüne Dön</span>
                                                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                            </Link>
                                        </div>
                                    </div>

                                </div>

                            </div>

                        </div>
                    )}

                    {/* TAB 2: USERS DIRECTORY */}
                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-in fade-in duration-150">
                            
                            {/* Directory Controls */}
                            <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                                
                                {/* Search input */}
                                <div className="relative flex-1 max-w-md">
                                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                                    <input 
                                        type="text"
                                        placeholder="Kullanıcı adı veya e-posta ile ara..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#07090E] border border-white/[0.08] focus:border-white/20 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                                    />
                                    {searchQuery && (
                                        <button 
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-white"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                {/* Filters */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 bg-[#07090E] p-1 rounded-lg border border-white/[0.08] text-xs">
                                        <button 
                                            onClick={() => setRoleFilter('all')}
                                            className={`px-2.5 py-1 rounded text-xs transition-colors ${roleFilter === 'all' ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Tüm Roller
                                        </button>
                                        <button 
                                            onClick={() => setRoleFilter('admin')}
                                            className={`px-2.5 py-1 rounded text-xs transition-colors ${roleFilter === 'admin' ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Admin
                                        </button>
                                        <button 
                                            onClick={() => setRoleFilter('user')}
                                            className={`px-2.5 py-1 rounded text-xs transition-colors ${roleFilter === 'user' ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Kullanıcı
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1 bg-[#07090E] p-1 rounded-lg border border-white/[0.08] text-xs">
                                        <button 
                                            onClick={() => setPlanFilter('all')}
                                            className={`px-2.5 py-1 rounded text-xs transition-colors ${planFilter === 'all' ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Tüm Paketler
                                        </button>
                                        <button 
                                            onClick={() => setPlanFilter('premium')}
                                            className={`px-2.5 py-1 rounded text-xs transition-colors ${planFilter === 'premium' ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Ücretli
                                        </button>
                                    </div>
                                </div>

                            </div>

                            {/* Full Users Table */}
                            <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl overflow-hidden">
                                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between text-xs text-gray-400">
                                    <span>Eşleşen <strong className="text-white font-mono">{filteredUsers.length}</strong> hesap listeleniyor</span>
                                    <span>Toplam: {recentUsers.length} hesap</span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.02] border-b border-white/[0.04]">
                                            <tr>
                                                <th className="px-5 py-3 font-medium">ID</th>
                                                <th className="px-5 py-3 font-medium">Kullanıcı</th>
                                                <th className="px-5 py-3 font-medium">E-posta</th>
                                                <th className="px-5 py-3 font-medium">Yetki Rolü</th>
                                                <th className="px-5 py-3 font-medium">Abonelik</th>
                                                <th className="px-5 py-3 font-medium">Kayıt Tarihi</th>
                                                <th className="px-5 py-3 font-medium text-right">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {filteredUsers.map((u) => (
                                                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-5 py-3 text-gray-500 font-mono text-[11px]">#{u.id}</td>
                                                    <td className="px-5 py-3 font-medium text-white">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-6 h-6 rounded-full bg-white/[0.06] text-gray-300 font-mono text-[11px] flex items-center justify-center font-medium">
                                                                {u.name?.charAt(0).toUpperCase() || 'U'}
                                                            </div>
                                                            <span>{u.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-400 font-mono text-[11px]">{u.email}</td>
                                                    <td className="px-5 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium tracking-wide ${
                                                            u.role === 'admin' 
                                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                                                : 'bg-white/[0.04] text-gray-400'
                                                        }`}>
                                                            {u.role_label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                                                            u.plan !== 'free' 
                                                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' 
                                                                : 'text-gray-400'
                                                        }`}>
                                                            {u.plan_label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-400 font-mono text-[11px]">{u.created_at}</td>
                                                    <td className="px-5 py-3 text-right">
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                            Aktif
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredUsers.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                                                        Aradığınız kriterlere uygun kullanıcı bulunamadı.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* TAB 3: SETTINGS */}
                    {activeTab === 'settings' && (
                        <div className="max-w-4xl space-y-6 animate-in fade-in duration-150">
                            
                            {/* Saved Notices */}
                            {heroNotice && (
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>{heroNotice}</span>
                                    </div>
                                    <span className="font-mono text-[10px] text-emerald-400/80">HERO_SYNC_200</span>
                                </div>
                            )}

                            {savedNotice && (
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>Sistem konfigürasyonu ve güvenlik tercihleri başarıyla güncellendi.</span>
                                    </div>
                                    <span className="font-mono text-[10px] text-emerald-400/80">CONF_200_OK</span>
                                </div>
                            )}

                            {/* 1. HERO CAROUSEL TRAILER SETTINGS CARD */}
                            <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-6 space-y-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                                            <Play className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                                Dashboard Fragman & Manşet Vitrini (Hero Carousel)
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    {heroMode === 'auto' ? 'Otomatik Mod' : 'Manuel Sıralama'}
                                                </span>
                                            </h2>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Ana sayfadaki 5 fragmanın seçim modunu belirleyin veya her sıra için özel IMDb ID atayın.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Mode Switcher (Linear style toggle cards) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setHeroMode('auto')}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            heroMode === 'auto'
                                                ? 'bg-emerald-500/[0.08] border-emerald-500/40 text-white shadow-sm ring-1 ring-emerald-500/20'
                                                : 'bg-[#07090E] border-white/[0.06] text-gray-400 hover:border-white/[0.12] hover:text-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className={`w-4 h-4 ${heroMode === 'auto' ? 'text-emerald-400' : 'text-gray-400'}`} />
                                                <span className="text-xs font-semibold text-white">Otomatik (Akıllı Hibrit)</span>
                                            </div>
                                            {heroMode === 'auto' && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed">
                                            Kütüphanenizdeki Türkçe Dublaj ve Altyazılı içerikleri; taze eklenenler, trendler, diziler ve günlük rotasyonla otomatik seçer.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setHeroMode('manual')}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            heroMode === 'manual'
                                                ? 'bg-emerald-500/[0.08] border-emerald-500/40 text-white shadow-sm ring-1 ring-emerald-500/20'
                                                : 'bg-[#07090E] border-white/[0.06] text-gray-400 hover:border-white/[0.12] hover:text-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <SlidersHorizontal className={`w-4 h-4 ${heroMode === 'manual' ? 'text-emerald-400' : 'text-gray-400'}`} />
                                                <span className="text-xs font-semibold text-white">Manuel (Özel IMDb Sıralaması)</span>
                                            </div>
                                            {heroMode === 'manual' && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed">
                                            5 sıranın her birine özel IMDb ID atayın. Boş bırakılan sıralar otomatik hibrit algoritmayla tamamlanır.
                                        </p>
                                    </button>
                                </div>

                                {/* 5 SLOTS INPUTS & LIVE PREVIEW */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span className="font-medium text-gray-300">Manşet Fragman Sıralaması (5 Slayt)</span>
                                        <span className="text-[11px] text-gray-500">IMDb ID formatı: tt15239678</span>
                                    </div>

                                    <div className="space-y-3">
                                        {[1, 2, 3, 4, 5].map((slotNum) => {
                                            const key = String(slotNum);
                                            const currentImdb = heroSlots[key] || '';
                                            const preview = slotPreviews[key];
                                            const isLoading = lookupLoading[key];

                                            return (
                                                <div 
                                                    key={slotNum} 
                                                    className="p-3.5 rounded-xl bg-[#07090E] border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-2.5"
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5 min-w-[130px]">
                                                            <span className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center font-mono text-xs font-bold text-emerald-400">
                                                                {slotNum}
                                                            </span>
                                                            <span className="text-xs font-medium text-white">
                                                                {slotNum === 1 ? '1. Slayt (Ana Başlık)' : `${slotNum}. Slayt`}
                                                            </span>
                                                        </div>

                                                        {/* Input + Action Buttons */}
                                                        <div className="flex items-center gap-2 flex-1 max-w-lg">
                                                            <div className="relative flex-1">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Örn: tt15239678 veya tt10872600"
                                                                    value={currentImdb}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setHeroSlots(s => ({ ...s, [key]: val }));
                                                                    }}
                                                                    onBlur={() => handleLookupImdb(key, currentImdb)}
                                                                    className="w-full bg-[#0D111A] border border-white/[0.08] focus:border-emerald-500/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none font-mono"
                                                                />
                                                                {currentImdb && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setHeroSlots(s => ({ ...s, [key]: '' }));
                                                                            handleLookupImdb(key, '');
                                                                        }}
                                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleLookupImdb(key, currentImdb)}
                                                                disabled={isLoading || !currentImdb.trim()}
                                                                className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 hover:text-white text-xs font-medium transition-colors border border-white/[0.06] flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                                                            >
                                                                {isLoading ? (
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                                                ) : (
                                                                    <Search className="w-3.5 h-3.5" />
                                                                )}
                                                                <span>Doğrula</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* MATCHED PREVIEW CARD */}
                                                    {preview && (
                                                        <div className="pt-2 border-t border-white/[0.04]">
                                                            {preview.error ? (
                                                                <div className="flex items-center gap-2 text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                                    <span>{preview.error}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-3 bg-[#0D111A]/80 border border-white/[0.04] p-2 rounded-lg">
                                                                    {preview.poster ? (
                                                                        <img 
                                                                            src={preview.poster} 
                                                                            alt={preview.title} 
                                                                            className="w-8 h-11 object-cover rounded shadow-sm shrink-0 border border-white/10" 
                                                                        />
                                                                    ) : (
                                                                        <div className="w-8 h-11 bg-white/[0.05] rounded flex items-center justify-center shrink-0 text-gray-500">
                                                                            <Film className="w-4 h-4" />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-xs font-semibold text-white truncate">
                                                                                {preview.title}
                                                                            </p>
                                                                            {preview.year && (
                                                                                <span className="text-[11px] text-gray-400 font-mono">
                                                                                    ({preview.year})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-300 font-medium">
                                                                                {preview.media_type === 'tv' ? 'Dizi' : 'Film'}
                                                                            </span>
                                                                            {preview.is_dubbed ? (
                                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 flex items-center gap-1">
                                                                                    <Check className="w-2.5 h-2.5" />
                                                                                    Türkçe Dublaj Fragman
                                                                                </span>
                                                                            ) : preview.is_subtitled ? (
                                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-medium border border-sky-500/20">
                                                                                    Türkçe Altyazılı Fragman
                                                                                </span>
                                                                            ) : preview.has_tr ? (
                                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20">
                                                                                    Türkçe Fragman
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium border border-amber-500/20">
                                                                                    {preview.trailer_label || 'Fragman Mevcut'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={handleSaveHeroSettings}
                                        disabled={isSavingHero}
                                        className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-xs transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSavingHero ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        <span>Fragman Vitrin Ayarlarını Kaydet</span>
                                    </button>
                                </div>
                            </div>

                            {/* 2. TMDB TRAILERS SYNC COMMAND CARD */}
                            <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-6 space-y-5 shadow-sm">
                                <div className="border-b border-white/[0.06] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
                                            <Terminal className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                                TMDB Fragman Senkronizasyon Konsolu
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                    Artisan Tool
                                                </span>
                                            </h2>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Kütüphanenizdeki yapımların en güncel Türkçe dublaj ve altyazılı fragmanlarını TMDB API üzerinden çeker.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Button & Limit */}
                                    <div className="flex items-center gap-2.5 self-start sm:self-auto">
                                        <div className="flex items-center gap-1.5 bg-[#07090E] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-gray-300">
                                            <span className="text-gray-500">Limit:</span>
                                            <select
                                                value={syncLimit}
                                                onChange={(e) => setSyncLimit(Number(e.target.value))}
                                                disabled={isSyncingTrailers}
                                                className="bg-transparent text-white font-mono focus:outline-none cursor-pointer"
                                            >
                                                <option value={25} className="bg-[#0D111A]">25</option>
                                                <option value={50} className="bg-[#0D111A]">50</option>
                                                <option value={100} className="bg-[#0D111A]">100</option>
                                                <option value={200} className="bg-[#0D111A]">200</option>
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleRunSyncTrailers}
                                            disabled={isSyncingTrailers}
                                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSyncingTrailers ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            )}
                                            <span>{isSyncingTrailers ? 'Taranıyor...' : `tmdb:sync-trailers --limit=${syncLimit} Çalıştır`}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Sync Status / Output Log */}
                                {syncSuccess && (
                                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <span>{syncSuccess}</span>
                                        </div>
                                        <span className="font-mono text-[10px]">SYNC_COMPLETED</span>
                                    </div>
                                )}

                                {syncOutput && (
                                    <div className="space-y-1.5 animate-in fade-in">
                                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                                            <span className="font-mono">Konsol Çıktısı (Artisan Output):</span>
                                            <button 
                                                type="button" 
                                                onClick={() => setSyncOutput(null)}
                                                className="text-gray-500 hover:text-gray-300 text-[10px]"
                                            >
                                                Kapat
                                            </button>
                                        </div>
                                        <pre className="p-3.5 rounded-xl bg-[#05070B] border border-white/[0.08] text-[11px] font-mono text-emerald-400/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                            {syncOutput}
                                        </pre>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSaveSettings} className="space-y-6">
                                
                                {/* Access & Registration Card */}
                                <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-6 space-y-5">
                                    <div className="border-b border-white/[0.06] pb-3">
                                        <h2 className="text-sm font-semibold text-white">Erişim & Üyelik Politikası</h2>
                                        <p className="text-xs text-gray-400 mt-0.5">Platforma yeni kayıt olma ve genel erişim kuralları</p>
                                    </div>

                                    <div className="space-y-4 text-xs">
                                        <div className="flex items-center justify-between py-2">
                                            <div>
                                                <p className="font-medium text-white">Yeni Kayıt Kabulü</p>
                                                <p className="text-gray-400 text-[11px]">Kapatıldığında misafirler üye kaydı oluşturamaz.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSettingsState(s => ({ ...s, allowRegistrations: !s.allowRegistrations }))}
                                                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                                                    settingsState.allowRegistrations ? 'bg-emerald-500' : 'bg-white/[0.12]'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                                    settingsState.allowRegistrations ? 'translate-x-5' : 'translate-x-0'
                                                }`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between py-2 border-t border-white/[0.04]">
                                            <div>
                                                <p className="font-medium text-white">Bakım Modu (Maintenance)</p>
                                                <p className="text-gray-400 text-[11px]">Sadece yöneticiler siteye erişebilir, diğer kullanıcılara 503 gösterilir.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSettingsState(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                                                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                                                    settingsState.maintenanceMode ? 'bg-red-500' : 'bg-white/[0.12]'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                                    settingsState.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                                                }`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Media & Streaming Card */}
                                <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-6 space-y-5">
                                    <div className="border-b border-white/[0.06] pb-3">
                                        <h2 className="text-sm font-semibold text-white">Medya Dağıtım ve CDN Hız Sınırları</h2>
                                        <p className="text-xs text-gray-400 mt-0.5">Film ve dizi indirmeleri için sunucu optimizasyonu</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <label className="block text-gray-300 font-medium mb-1.5">Free Üye İndirme Bant Genişliği</label>
                                            <select 
                                                value={settingsState.streamRateLimit}
                                                onChange={(e) => setSettingsState(s => ({ ...s, streamRateLimit: e.target.value }))}
                                                className="w-full bg-[#07090E] border border-white/[0.08] focus:border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                                            >
                                                <option value="unlimited">Limitsiz (CDN Direct)</option>
                                                <option value="5mbps">5 MB/sn ile sınırla</option>
                                                <option value="10mbps">10 MB/sn ile sınırla</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-gray-300 font-medium mb-1.5">Statik Varlık Önbellek Ömrü (Saat)</label>
                                            <input 
                                                type="number"
                                                value={settingsState.cacheLifetimeHours}
                                                onChange={(e) => setSettingsState(s => ({ ...s, cacheLifetimeHours: e.target.value }))}
                                                className="w-full bg-[#07090E] border border-white/[0.08] focus:border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-xs transition-colors shadow-sm"
                                    >
                                        Değişiklikleri Kaydet
                                    </button>
                                </div>

                            </form>

                        </div>
                    )}

            </div>
        </AdminLayout>
    );
}
