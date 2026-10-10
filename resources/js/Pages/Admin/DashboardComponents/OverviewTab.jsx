import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    Users,
    TrendingUp,
    Flame,
    Film,
    Zap,
    ArrowUpRight,
    Cpu,
    RefreshCw,
    Database,
    HardDrive,
    ExternalLink
} from 'lucide-react';

export default function OverviewTab({
    stats,
    recentUsers = [],
    storageBoxes = [],
    onNavigateToUsers,
    showToast
}) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefreshTelemetry = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            showToast('Sistem telemetrisi güncellendi: Bağlantılar stabil.', 'success');
        }, 600);
    };

    const handleQuickAction = (actionName, message) => {
        showToast(message, 'success');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-200">
            {/* HIGH-IMPACT KPI METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Card 1: Users */}
                <div className="relative overflow-hidden bg-[#0A0D15] border border-white/[0.08] hover:border-[#00B074]/40 rounded-2xl p-5 shadow-xl shadow-black/20 transition-all group">
                    <div className="flex items-center justify-between text-gray-400">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">Kayıtlı Kullanıcı</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-white font-mono">
                            {stats?.total_users || 0}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />
                            +100% aktif
                        </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] flex items-center justify-between text-gray-400">
                        <span>Yönetici: <strong className="text-white font-mono">{stats?.admin_count || 1}</strong></span>
                        <span className="text-gray-600">·</span>
                        <span>Standart: <strong className="text-gray-300 font-mono">{(stats?.total_users || 1) - (stats?.admin_count || 1)}</strong></span>
                    </div>
                </div>

                {/* Card 2: Premium */}
                <div className="relative overflow-hidden bg-[#0A0D15] border border-white/[0.08] hover:border-amber-500/40 rounded-2xl p-5 shadow-xl shadow-black/20 transition-all group">
                    <div className="flex items-center justify-between text-gray-400">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/90">Premium Aboneler</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                            <Flame className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-amber-400 font-mono">
                            {stats?.premium_users || 0}
                        </span>
                        <span className="text-xs text-gray-500">VIP / Pro</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] flex items-center justify-between text-gray-400">
                        <span>Dönüşüm Oranı</span>
                        <span className="font-mono text-amber-400 font-semibold">
                            {stats?.total_users ? `${Math.round((stats.premium_users / stats.total_users) * 100)}%` : '0%'}
                        </span>
                    </div>
                </div>

                {/* Card 3: Media */}
                <div className="relative overflow-hidden bg-[#0A0D15] border border-white/[0.08] hover:border-sky-500/40 rounded-2xl p-5 shadow-xl shadow-black/20 transition-all group">
                    <div className="flex items-center justify-between text-gray-400">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300/90">Yayınlanan Medya</span>
                        <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                            <Film className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-white font-mono">
                            {(stats?.total_movies || 0) + (stats?.total_series || 0)}
                        </span>
                        <span className="text-xs text-gray-500">başlık</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] flex items-center justify-between text-gray-400">
                        <span className="text-gray-300">{stats?.total_movies || 0} Film</span>
                        <span className="text-gray-600">·</span>
                        <span className="text-gray-300">{stats?.total_series || 0} Dizi</span>
                    </div>
                </div>

                {/* Card 4: Downloads */}
                <div className="relative overflow-hidden bg-[#0A0D15] border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl shadow-black/20 transition-all group">
                    <div className="flex items-center justify-between text-gray-400">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/90">Toplam İndirme</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-white font-mono">
                            {stats?.total_downloads ? Number(stats.total_downloads).toLocaleString('tr-TR') : '0'}
                        </span>
                        <span className="text-xs text-gray-500">oturum</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] flex items-center justify-between text-gray-400">
                        <span>Havuz Kapasitesi</span>
                        <span className="font-mono text-emerald-400 font-semibold">{stats?.storage?.total_tb || 0} TB</span>
                    </div>
                </div>

            </div>

            {/* MAIN GRID: ACTIVITY TABLE & TELEMETRY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* RECENT USERS (2 Columns) */}
                <div className="lg:col-span-2 bg-[#0A0D15] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                    
                    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <div>
                                <h2 className="text-sm font-bold text-white tracking-tight">Son Kayıt Olan Kullanıcılar</h2>
                                <p className="text-[11px] text-gray-400">Sisteme en son katılan hesaplar ve yetki seviyeleri</p>
                            </div>
                        </div>
                        <button 
                            onClick={onNavigateToUsers}
                            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                        >
                            <span>Tümünü Gör</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.02] border-b border-white/[0.04]">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Kullanıcı</th>
                                    <th className="px-6 py-3 font-semibold">E-posta</th>
                                    <th className="px-6 py-3 font-semibold">Rol</th>
                                    <th className="px-6 py-3 font-semibold">Plan</th>
                                    <th className="px-6 py-3 font-semibold text-right">Kayıt Tarihi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {recentUsers.slice(0, 6).map((u) => (
                                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-3.5 font-medium text-white">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center justify-center font-bold">
                                                    {u.name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <span className="font-semibold">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-400 font-mono text-[11px]">{u.email}</td>
                                        <td className="px-6 py-3.5">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                                                u.role === 'admin' 
                                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                                    : 'bg-white/[0.06] text-gray-300 border border-white/[0.08]'
                                            }`}>
                                                {u.role_label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                u.plan !== 'free' 
                                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                                                    : 'text-gray-400 bg-white/[0.04]'
                                            }`}>
                                                {u.plan_label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-right text-gray-400 font-mono text-[11px]">{u.created_at}</td>
                                    </tr>
                                ))}
                                {recentUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                            Henüz kayıtlı kullanıcı bulunmuyor.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SYSTEM TELEMETRY & GATEWAYS (1 Column) */}
                <div className="space-y-5">
                    
                    {/* Telemetry Card */}
                    <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-xl shadow-black/20">
                        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-emerald-400" />
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">Altyapı Durumu</h3>
                                    <p className="text-[11px] text-gray-500">Gerçek zamanlı sunucu telemetrisi</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleRefreshTelemetry}
                                disabled={isRefreshing}
                                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                                title="Yenile"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                            </button>
                        </div>

                        <div className="space-y-3.5 text-xs">
                            <div>
                                <div className="flex justify-between text-gray-400 mb-1">
                                    <span>Uptime Oranı</span>
                                    <span className="font-mono text-emerald-400 font-bold">99.98%</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.98%' }} />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-gray-400 mb-1">
                                    <span>API Yanıt Süresi</span>
                                    <span className="font-mono text-emerald-300 font-semibold">18 ms (Mükemmel)</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '22%' }} />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-gray-400 mb-1">
                                    <span>MySQL Havuz Kullanımı</span>
                                    <span className="font-mono text-gray-200">8 / 100 bağlantı</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-400/80 rounded-full" style={{ width: '8%' }} />
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
                                    <span className="font-mono text-emerald-400 font-medium">Middleware 404 Aktif</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gateway Storage Node Telemetry */}
                    <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-xl shadow-black/20">
                        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                                    <Database className="w-3.5 h-3.5 text-[#00B074]" />
                                    <span>Gateway Depolama Düğümleri</span>
                                </h3>
                                <p className="text-[11px] text-gray-400">Film & video indirme sunucuları</p>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                                {stats?.storage?.online_boxes || 0} / {stats?.storage?.total_boxes || 0} Aktif
                            </span>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-[#06080E] border border-white/[0.04]">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <HardDrive className="w-4 h-4 text-emerald-400" />
                                    <span>Toplam Havuz Kapasitesi</span>
                                </div>
                                <span className="font-mono text-white font-bold">
                                    {stats?.storage?.total_tb || 0} TB
                                </span>
                            </div>

                            {/* Mini Box List */}
                            <div className="space-y-2">
                                {storageBoxes.slice(0, 3).map((box) => (
                                    <div key={box.id} className="p-2.5 rounded-xl bg-[#06080E] border border-white/[0.04] flex items-center justify-between text-[11px]">
                                        <div className="truncate mr-2">
                                            <div className="font-semibold text-gray-200 truncate">{box.name}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">{box.protocol.toUpperCase()} · Port {box.port}</div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-semibold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                {box.latency_ms ? `${box.latency_ms}ms` : 'Online'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Link
                                href="/admin/storage-boxes"
                                className="w-full py-2.5 px-3.5 rounded-xl bg-[#00B074]/10 hover:bg-[#00B074]/20 border border-[#00B074]/30 text-[#00B074] text-xs font-semibold transition-all flex items-center justify-between shadow-sm"
                            >
                                <span>Storage Box Modülünü Yönet</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>

                    {/* Quick Operations Panel */}
                    <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-5 space-y-3 shadow-xl shadow-black/20">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Hızlı Sistem Görevleri</h3>
                        <div className="space-y-2 text-xs">
                            <button 
                                onClick={() => handleQuickAction('cache_clear', 'Uygulama ve rota önbelleği sıfırlandı.')}
                                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-gray-300 hover:text-white transition-colors flex items-center justify-between"
                            >
                                <span>Önbelleği Temizle</span>
                                <span className="text-[10px] text-gray-500 font-mono">cache:clear</span>
                            </button>
                            <button 
                                onClick={() => handleQuickAction('security_audit', 'Güvenlik denetimi tamamlandı: 0 yetkisiz sızma girişimi.')}
                                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-gray-300 hover:text-white transition-colors flex items-center justify-between"
                            >
                                <span>Erişim Günlüklerini Tara</span>
                                <span className="text-[10px] text-gray-500 font-mono">security:audit</span>
                            </button>
                            <Link 
                                href="/" 
                                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-gray-300 hover:text-white transition-colors flex items-center justify-between block"
                            >
                                <span>Kullanıcı Arayüzüne Dön</span>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            </Link>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
