import React from 'react';
import { Database, Sparkles, Film, AlertTriangle } from 'lucide-react';

export default function StatsCards({ stats, storageBoxes = [] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Archive Size */}
            <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-[#00B074]" />
                        <span>Toplam Video Arşivi</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-mono">
                        {stats?.total_count || 0} Dosya
                    </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-white font-mono">
                        {stats?.total_size_formatted || '0 GB'}
                    </span>
                </div>
                <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                    <span>Depolama Üniteleri: <strong className="text-gray-200">{storageBoxes.length} Box</strong></span>
                    <span className="text-emerald-400 font-mono text-[10px]">Aktif</span>
                </div>
            </div>

            {/* TMDB Matched & Review Card */}
            <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>TMDB Eşleşme Durumu</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                        Katalog
                    </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-emerald-400 font-mono">
                        {stats?.tmdb_matched_count || 0}
                    </span>
                    <span className="text-xs text-gray-400">eşleşti</span>
                    {stats?.tmdb_review_count > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            {stats?.tmdb_review_count} İnceleme Bekliyor
                        </span>
                    )}
                </div>
                <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                    <span>Eşleşmeyen: <strong className="text-gray-300 font-mono">{stats?.tmdb_unmatched_count || 0}</strong></span>
                    <span className="text-gray-600">·</span>
                    <span>Kuyrukta: <strong className="text-sky-400 font-mono">{stats?.tmdb_pending_count || 0}</strong></span>
                </div>
            </div>

            {/* Category Distribution (Film / Dizi) */}
            <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-sky-400" />
                        <span>Film / Dizi Dağılımı</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">
                        İçerik
                    </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-sky-400 font-mono">
                        {stats?.movie_count || 0}
                    </span>
                    <span className="text-xs text-gray-400">film</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-2xl font-semibold tracking-tight text-purple-400 font-mono">
                        {stats?.series_count || 0}
                    </span>
                    <span className="text-xs text-gray-400">dizi</span>
                </div>
                <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                    <span>Klasör: <strong className="text-gray-200">/Filmler & /Diziler</strong></span>
                    <span className="text-sky-400 font-mono text-[10px]">Otomatik Ayrım</span>
                </div>
            </div>

            {/* Quality Highlights */}
            <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between text-gray-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Çözünürlük Dağılımı</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                        Kalite
                    </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-white font-mono">
                        {stats?.fhd_count || 0}
                    </span>
                    <span className="text-xs text-emerald-400 font-medium">1080p FHD</span>
                </div>
                <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                    <span>4K UHD: <strong className="text-purple-400 font-mono">{stats?.uhd_count || 0}</strong></span>
                    <span className="text-gray-600">·</span>
                    <span>720p: <strong className="text-sky-400 font-mono">{stats?.hd_count || 0}</strong></span>
                </div>
            </div>
        </div>
    );
}
