import React from 'react';
import { Layers, Users, HardDrive, CreditCard, ArrowRight } from 'lucide-react';

export default function StatsKpiCards({ stats = {}, plans = [], currentTab, pendingCount, onSwitchSection }) {
    const activePlans = stats?.activePlansCount ?? plans.filter(p => p.is_active).length;
    const totalPlans = stats?.totalPlansCount ?? plans.length;
    const totalSubs = stats?.totalSubscribedUsers ?? 0;
    const allocatedGb = (stats?.totalAllocatedGb ?? 0).toLocaleString('tr-TR');
    const usedGb = (stats?.totalUsedGb ?? 0).toLocaleString('tr-TR');

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Plans Catalog */}
            <button
                type="button"
                onClick={() => onSwitchSection('plans')}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer group ${
                    currentTab === 'plans'
                        ? 'bg-[#00B074]/10 border-[#00B074]/50 shadow-lg shadow-[#00B074]/10'
                        : 'bg-[#0A0D15] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.02]'
                }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-200">Paketler</span>
                    <div className="p-2 rounded-xl bg-white/[0.04] text-emerald-400 group-hover:scale-110 transition-transform">
                        <Layers className="w-4 h-4" />
                    </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                    {activePlans}
                    <span className="text-xs font-normal text-gray-400 ml-1.5">/ {totalPlans} Aktif</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
                    <span>Kataloğu Görüntüle</span>
                    <ArrowRight className="w-3 h-3" />
                </p>
            </button>

            {/* Card 2: Subscribed Users */}
            <button
                type="button"
                onClick={() => onSwitchSection('users', { user_plan: 'active_sub' })}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer group ${
                    currentTab === 'users'
                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                        : 'bg-[#0A0D15] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.02]'
                }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-200">Aboneler</span>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                        <Users className="w-4 h-4" />
                    </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                    {totalSubs}
                    <span className="text-xs font-normal text-gray-400 ml-1.5">Kullanıcı</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
                    <span>Kotaları Yönet</span>
                    <ArrowRight className="w-3 h-3" />
                </p>
            </button>

            {/* Card 3: Total Allocated Quota */}
            <button
                type="button"
                onClick={() => onSwitchSection('users')}
                className="text-left p-4 rounded-2xl border bg-[#0A0D15] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.02] transition-all cursor-pointer group"
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-200">Tahsis Kota</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                        <HardDrive className="w-4 h-4" />
                    </div>
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                    {allocatedGb}
                    <span className="text-xs font-normal text-gray-400 ml-1.5">GB</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                    Kullanılan: {usedGb} GB
                </p>
            </button>

            {/* Card 4: Pending Payments */}
            <button
                type="button"
                onClick={() => onSwitchSection('notifications', { notif_status: 'pending' })}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer group ${
                    pendingCount > 0
                        ? 'bg-amber-500/10 border-amber-500/40 hover:border-amber-500 shadow-lg shadow-amber-500/10'
                        : currentTab === 'notifications'
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-[#0A0D15] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.02]'
                }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-200">Ödemeler</span>
                    <div className={`p-2 rounded-xl ${pendingCount > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        <CreditCard className="w-4 h-4" />
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono">{pendingCount}</span>
                    {pendingCount > 0 ? (
                        <span className="text-xs font-bold text-amber-400 font-mono">Onay Bekliyor</span>
                    ) : (
                        <span className="text-xs text-gray-400">Bekleyen Yok</span>
                    )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 group-hover:text-amber-400 transition-colors">
                    <span>Ödemeleri İncele</span>
                    <ArrowRight className="w-3 h-3" />
                </p>
            </button>
        </div>
    );
}
