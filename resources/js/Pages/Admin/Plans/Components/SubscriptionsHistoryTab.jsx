import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Pagination from '../../../../Components/Pagination';
import { Search } from 'lucide-react';

export default function SubscriptionsHistoryTab({
    subscriptionsHistory = { data: [] },
    filters = {},
}) {
    const historyList = Array.isArray(subscriptionsHistory) ? subscriptionsHistory : (subscriptionsHistory?.data || []);
    const [searchInput, setSearchInput] = useState(filters?.history_search || '');

    useEffect(() => {
        setSearchInput(filters?.history_search || '');
    }, [filters?.history_search]);

    const handleFilterChange = (status) => {
        router.get('/admin/plans', {
            ...filters,
            tab: 'history',
            history_status: status,
            history_page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            router.get('/admin/plans', {
                ...filters,
                tab: 'history',
                history_search: searchInput,
                history_page: 1,
            }, { preserveState: true, preserveScroll: true });
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Filters */}
            <div className="flex items-center justify-between gap-4 flex-wrap bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-1 bg-[#06080E] p-1 rounded-xl border border-white/[0.08] text-xs">
                    <button
                        onClick={() => handleFilterChange('all')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            (filters?.history_status || 'all') === 'all'
                                ? 'bg-[#00B074] text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Tümü
                    </button>
                    <button
                        onClick={() => handleFilterChange('active')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            filters?.history_status === 'active'
                                ? 'bg-[#00B074] text-white shadow-sm'
                                : 'text-emerald-400 hover:text-white'
                        }`}
                    >
                        Aktif
                    </button>
                    <button
                        onClick={() => handleFilterChange('cancelled')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            filters?.history_status === 'cancelled'
                                ? 'bg-[#00B074] text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        İptal Edilenler
                    </button>
                    <button
                        onClick={() => handleFilterChange('expired')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            filters?.history_status === 'expired'
                                ? 'bg-[#00B074] text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Süresi Dolanlar
                    </button>
                </div>

                <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                        type="text"
                        placeholder="Kullanıcı, paket veya not ara..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* History Table */}
            <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.02] border-b border-white/[0.04]">
                            <tr>
                                <th className="px-5 py-3.5 font-semibold">ID</th>
                                <th className="px-5 py-3.5 font-semibold">Kullanıcı</th>
                                <th className="px-5 py-3.5 font-semibold">Paket</th>
                                <th className="px-5 py-3.5 font-semibold">Döngü & Tutar</th>
                                <th className="px-5 py-3.5 font-semibold">Başlangıç - Bitiş</th>
                                <th className="px-5 py-3.5 font-semibold">Durum</th>
                                <th className="px-5 py-3.5 font-semibold">Notlar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {historyList.map((sub) => (
                                <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3.5 font-mono text-gray-500 text-[11px]">#{sub.id}</td>
                                    <td className="px-5 py-3.5">
                                        <div className="font-bold text-white">{sub.user_name}</div>
                                        <div className="text-[11px] text-gray-400 font-mono">{sub.user_email}</div>
                                    </td>
                                    <td className="px-5 py-3.5 font-semibold text-white">
                                        {sub.plan_name}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="font-bold text-emerald-400 font-mono">{sub.formatted_price}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            {sub.is_perpetual ? 'Süresiz' : `${sub.duration_months} Ay`}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 font-mono text-[11px] text-gray-300">
                                        <div>{sub.starts_at}</div>
                                        <div className="text-gray-500">Bitiş: {sub.expires_at}</div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            sub.status === 'active'
                                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                : sub.status === 'cancelled'
                                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                        }`}>
                                            {sub.status_label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-gray-400 text-[11px] max-w-xs truncate" title={sub.notes}>
                                        {sub.notes || '-'}
                                    </td>
                                </tr>
                            ))}

                            {historyList.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        Abonelik geçmişi kaydı bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {subscriptionsHistory?.last_page > 1 && (
                    <div className="px-6 py-4 border-t border-white/[0.06]">
                        <Pagination
                            pagination={subscriptionsHistory}
                            onPageChange={(page) => {
                                router.get('/admin/plans', {
                                    ...filters,
                                    tab: 'history',
                                    history_page: page,
                                }, { preserveState: true, preserveScroll: true });
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
