import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Pagination from '../../../../Components/Pagination';
import { BellRing, Search, Check, FileText } from 'lucide-react';

export default function PaymentNotificationsTab({
    paymentNotifications = { data: [] },
    pendingCount = 0,
    filters = {},
    onApproveNotification,
    onOpenRejectModal,
}) {
    const notifsList = Array.isArray(paymentNotifications) ? paymentNotifications : (paymentNotifications?.data || []);
    const [searchInput, setSearchInput] = useState(filters?.notif_search || '');

    useEffect(() => {
        setSearchInput(filters?.notif_search || '');
    }, [filters?.notif_search]);

    const handleFilterChange = (status) => {
        router.get('/admin/plans', {
            ...filters,
            tab: 'notifications',
            notif_status: status,
            notifs_page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            router.get('/admin/plans', {
                ...filters,
                tab: 'notifications',
                notif_search: searchInput,
                notifs_page: 1,
            }, { preserveState: true, preserveScroll: true });
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Pending Notification Alert Callout if any */}
            {pendingCount > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                            <BellRing className="w-5 h-5 animate-bounce" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">
                                {pendingCount} adet ödeme bildirimi inceleme bekliyor
                            </h4>
                            <p className="text-xs text-gray-400">
                                Onay verdiğiniz anda kullanıcının indirme paketi anında tanımlanır.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleFilterChange('pending')}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-all whitespace-nowrap"
                    >
                        Bekleyenleri Filtrele
                    </button>
                </div>
            )}

            {/* Status Filters & Search */}
            <div className="flex items-center justify-between gap-4 flex-wrap bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-1 bg-[#06080E] p-1 rounded-xl border border-white/[0.08] text-xs">
                    <button
                        onClick={() => handleFilterChange('all')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            (filters?.notif_status || 'all') === 'all'
                                ? 'bg-[#00B074] text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Tümü
                    </button>
                    <button
                        onClick={() => handleFilterChange('pending')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                            filters?.notif_status === 'pending'
                                ? 'bg-amber-500 text-black font-black shadow-sm'
                                : 'text-amber-400 hover:text-amber-300'
                        }`}
                    >
                        <span>Bekleyenler</span>
                        {pendingCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => handleFilterChange('approved')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            filters?.notif_status === 'approved'
                                ? 'bg-[#00B074] text-white shadow-sm'
                                : 'text-emerald-400 hover:text-white'
                        }`}
                    >
                        Onaylananlar
                    </button>
                    <button
                        onClick={() => handleFilterChange('rejected')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            filters?.notif_status === 'rejected'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-rose-400 hover:text-white'
                        }`}
                    >
                        Reddedilenler
                    </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                        type="text"
                        placeholder="Referans kodu, isim veya dekont no..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Notifications Table */}
            <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.02] border-b border-white/[0.04]">
                            <tr>
                                <th className="px-5 py-3.5 font-semibold">Ref & Tarih</th>
                                <th className="px-5 py-3.5 font-semibold">Kullanıcı</th>
                                <th className="px-5 py-3.5 font-semibold">Paket</th>
                                <th className="px-5 py-3.5 font-semibold">Tutar & Yöntem</th>
                                <th className="px-5 py-3.5 font-semibold">Gönderen / Dekont No</th>
                                <th className="px-5 py-3.5 font-semibold">Durum</th>
                                <th className="px-5 py-3.5 font-semibold text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {notifsList.map((pn) => (
                                <tr key={pn.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3.5">
                                        <div className="font-mono font-bold text-white text-xs">{pn.reference_code}</div>
                                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">{pn.created_at}</div>
                                    </td>

                                    <td className="px-5 py-3.5">
                                        <div className="font-bold text-white">{pn.user_name}</div>
                                        <div className="text-[11px] text-gray-400 font-mono">{pn.user_email}</div>
                                    </td>

                                    <td className="px-5 py-3.5">
                                        <div className="font-semibold text-white">{pn.plan_name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            {pn.duration_months} Ay {pn.is_upgrade && <span className="text-amber-400 font-bold">(Yükseltme)</span>}
                                        </div>
                                    </td>

                                    <td className="px-5 py-3.5">
                                        <div className="font-black text-emerald-400 font-mono text-sm">{pn.formatted_amount}</div>
                                        <div className="text-[10px] text-gray-400">{pn.method_name}</div>
                                    </td>

                                    <td className="px-5 py-3.5">
                                        <div className="text-gray-200 font-medium">{pn.sender_name || '-'}</div>
                                        {pn.tx_hash && (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] text-gray-500 font-mono truncate max-w-[130px]" title={pn.tx_hash}>
                                                    {pn.tx_hash}
                                                </span>
                                                {pn.method_driver === 'paddle' && (
                                                    <a
                                                        href={`/admin/payment-notifications/${pn.id}/paddle-invoice`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Paddle PDF Dekontunu Aç"
                                                        className="p-1 rounded-md bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition-all hover:scale-110 flex items-center justify-center shrink-0 shadow-sm"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                            pn.status === 'pending'
                                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                                                : pn.status === 'approved'
                                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                        }`}>
                                            {pn.status_label}
                                        </span>
                                    </td>

                                    <td className="px-5 py-3.5 text-right">
                                        {pn.status === 'pending' ? (
                                            <div className="flex items-center justify-end gap-2">
                                                {pn.method_driver === 'paddle' && pn.tx_hash && (
                                                    <a
                                                        href={`/admin/payment-notifications/${pn.id}/paddle-invoice`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Paddle PDF Dekontunu Aç"
                                                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition-all hover:scale-110 flex items-center justify-center shrink-0 shadow-sm"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => onApproveNotification(pn)}
                                                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Onayla</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenRejectModal(pn)}
                                                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all"
                                                >
                                                    <span>Reddet</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2.5">
                                                <span className="text-[11px] text-gray-500 font-mono">
                                                    {pn.processed_at}
                                                </span>
                                                {pn.method_driver === 'paddle' && pn.tx_hash && (
                                                    <a
                                                        href={`/admin/payment-notifications/${pn.id}/paddle-invoice`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Paddle PDF Dekontunu Aç"
                                                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition-all hover:scale-110 flex items-center justify-center shrink-0 shadow-sm"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {notifsList.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        Bildirim kaydı bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {paymentNotifications?.last_page > 1 && (
                    <div className="px-6 py-4 border-t border-white/[0.06]">
                        <Pagination
                            pagination={paymentNotifications}
                            onPageChange={(page) => {
                                router.get('/admin/plans', {
                                    ...filters,
                                    tab: 'notifications',
                                    notifs_page: page,
                                }, { preserveState: true, preserveScroll: true });
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
