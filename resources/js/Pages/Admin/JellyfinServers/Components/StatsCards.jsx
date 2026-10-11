import React from 'react';
import { Tv, Activity, Users, Scale } from 'lucide-react';

export default function StatsCards({ stats }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Toplam Medya Sunucusu</span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <Tv className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-2xl font-black text-white tracking-tight">{stats?.total_servers || 0} Sunucu</div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{stats?.active_servers || 0} Aktif Küme</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Jellyfin Sunucuları</span>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                        <Activity className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-2xl font-black text-white tracking-tight">{stats?.jellyfin_count || 0} Node</div>
                    <p className="text-xs text-purple-400 mt-1 font-medium">{stats?.active_jellyfin_count || 0} Aktif Dağıtımda</p>
                </div>
            </div>

            <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Emby Sunucuları</span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <Tv className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-2xl font-black text-white tracking-tight">{stats?.emby_count || 0} Node</div>
                    <p className="text-xs text-emerald-400 mt-1 font-medium">{stats?.active_emby_count || 0} Aktif Dağıtımda</p>
                </div>
            </div>

            <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-sky-500/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Toplam Kullanıcı</span>
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                        <Users className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-2xl font-black text-white tracking-tight">{stats?.total_users || 0} Hesap</div>
                    <p className="text-xs text-sky-400 mt-1 font-medium">Ortalama {stats?.avg_users_per_server || 0} / Sunucu</p>
                </div>
            </div>
        </div>
    );
}
