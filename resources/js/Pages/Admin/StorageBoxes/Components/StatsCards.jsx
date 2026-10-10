import React from 'react';
import { Server, HardDrive, Database, Zap } from 'lucide-react';

export default function StatsCards({ stats, totalBoxes = 0 }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Toplam Depolama Sunucusu</span>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                        <Server className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-2xl font-black text-white tracking-tight">{stats?.total_boxes || totalBoxes || 0} Node</div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{stats?.online_boxes || 0} Sunucu Çevrimiçi</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Toplam Kapasite</span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <HardDrive className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-2xl font-black text-white tracking-tight">{stats?.total_capacity_formatted || '0 GB'}</div>
                    <p className="text-xs text-gray-400 mt-1">Tüm gateway sunucularının toplamı</p>
                </div>
            </div>

            <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-sky-500/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Kullanılan Alandan</span>
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                        <Database className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-2xl font-black text-white tracking-tight">{stats?.total_used_formatted || '0 GB'}</div>
                    <p className="text-xs text-sky-400 mt-1 font-medium">Endeksli medya dosyaları</p>
                </div>
            </div>

            <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Boş Depolama</span>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                        <Zap className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-2xl font-black text-white tracking-tight">{stats?.total_free_formatted || '0 GB'}</div>
                    <p className="text-xs text-purple-400 mt-1 font-medium">Kullanılabilir boş alan</p>
                </div>
            </div>
        </div>
    );
}
