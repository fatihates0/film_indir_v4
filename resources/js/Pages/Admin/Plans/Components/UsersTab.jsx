import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import Pagination from '../../../../Components/Pagination';
import {
    Users,
    AlertTriangle,
    Infinity,
    Search,
    X,
    Plus,
    Edit3,
    Sparkles,
    Package,
    Zap,
    Clock,
    MoreHorizontal,
    Sliders,
    RotateCcw,
    RefreshCw,
    Trash2
} from 'lucide-react';

export default function UsersTab({
    users = { data: [] },
    plans = [],
    stats = {},
    filters = {},
    onOpenAssignModal,
    onOpenManagePackagesModal,
    onOpenExtraQuotaModal,
    onOpenExtendDurationModal,
    onResetUserUsage,
    onSyncMediaAccount,
    onRemoveUserPlan,
}) {
    const usersList = Array.isArray(users) ? users : (users?.data || []);
    const [searchInput, setSearchInput] = useState(filters?.user_search || '');

    // Synchronize local search input if filters change externally (e.g. back/forward navigation)
    useEffect(() => {
        setSearchInput(filters?.user_search || '');
    }, [filters?.user_search]);

    // Active User Actions Dropdown Menu state
    const [activeUserMenu, setActiveUserMenu] = useState(null); // { user, top, bottom, right, placement }
    const menuRef = useRef(null);

    // Close menu when clicking outside or scrolling
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveUserMenu(null);
            }
        }
        function handleScroll() {
            if (activeUserMenu) {
                setActiveUserMenu(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [activeUserMenu]);

    const handleToggleUserMenu = (e, u) => {
        e.stopPropagation();
        if (activeUserMenu?.user?.id === u.id) {
            setActiveUserMenu(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const placement = spaceBelow < 220 ? 'top' : 'bottom';

        setActiveUserMenu({
            user: u,
            placement,
            top: rect.bottom + 6,
            bottom: window.innerHeight - rect.top + 6,
            right: window.innerWidth - rect.right,
        });
    };

    const handleSearchSubmit = (e) => {
        e?.preventDefault();
        router.get('/admin/plans', {
            ...filters,
            tab: 'users',
            user_search: searchInput,
            users_page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleClearSearch = () => {
        setSearchInput('');
        router.get('/admin/plans', {
            ...filters,
            tab: 'users',
            user_search: '',
            users_page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSegmentChange = (planFilterValue, quotaFilterValue = 'all') => {
        router.get('/admin/plans', {
            ...filters,
            tab: 'users',
            user_plan: planFilterValue,
            user_quota: quotaFilterValue,
            users_page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Quick Filter Segment Pills & Search Bar */}
            <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-4 space-y-3.5 shadow-xl">
                
                {/* Top Segmented Pills (1-click filtering) */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                            type="button"
                            onClick={() => handleSegmentChange('all', 'all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                (filters?.user_plan || 'all') === 'all' && (filters?.user_quota || 'all') === 'all'
                                    ? 'bg-white text-black font-bold shadow'
                                    : 'bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                            }`}
                        >
                            Tüm Kullanıcılar
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSegmentChange('active_sub', 'all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                filters?.user_plan === 'active_sub'
                                    ? 'bg-[#00B074] text-white font-bold shadow-md shadow-[#00B074]/20'
                                    : 'bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>Aktif Aboneler</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/20">
                                {stats?.totalSubscribedUsers ?? 0}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSegmentChange('all', 'over_80')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                filters?.user_quota === 'over_80'
                                    ? 'bg-amber-500 text-black font-bold shadow'
                                    : 'bg-white/[0.04] text-amber-400/80 hover:text-amber-300 hover:bg-white/[0.08]'
                            }`}
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>%80+ Dolanlar</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSegmentChange('perpetual', 'all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                filters?.user_plan === 'perpetual'
                                    ? 'bg-indigo-600 text-white font-bold shadow'
                                    : 'bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                            }`}
                        >
                            <Infinity className="w-3.5 h-3.5" />
                            <span>Süresiz Kotalar</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSegmentChange('no_sub', 'all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                filters?.user_plan === 'no_sub'
                                    ? 'bg-gray-700 text-white font-bold'
                                    : 'bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                            }`}
                        >
                            Paketsizler
                        </button>
                    </div>

                    <div className="text-xs text-gray-500 font-mono">
                        Toplam: {users?.total ?? usersList.length} kayıt
                    </div>
                </div>

                {/* Search and Specific Plan Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                        <input
                            type="text"
                            placeholder="Kullanıcı adı veya e-posta ile ara..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl pl-10 pr-20 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="absolute right-14 top-2 text-gray-400 hover:text-white"
                                title="Temizle"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            type="submit"
                            className="absolute right-2 top-1.5 px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                        >
                            Ara
                        </button>
                    </form>

                    <div className="flex items-center gap-2">
                        <select
                            value={filters?.user_plan || 'all'}
                            onChange={(e) => handleSegmentChange(e.target.value, filters?.user_quota || 'all')}
                            className="bg-[#06080E] border border-white/[0.08] text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                        >
                            <option value="all">Filtre: Paket Seçin</option>
                            {plans.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={() => onOpenAssignModal()}
                            className="px-3.5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Kota Tanımla</span>
                        </button>
                    </div>
                </div>

            </div>

            {/* Users Table */}
            <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto min-h-[140px]">
                    <table className="w-full text-left text-xs">
                        <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.02] border-b border-white/[0.04]">
                            <tr>
                                <th className="px-5 py-3.5 font-semibold">Kullanıcı</th>
                                <th className="px-5 py-3.5 font-semibold">Aktif Paket & Ek</th>
                                <th className="px-5 py-3.5 font-semibold">Kota Kullanımı</th>
                                <th className="px-5 py-3.5 font-semibold">Bitiş Tarihi</th>
                                <th className="px-5 py-3.5 font-semibold text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {usersList.map((u) => {
                                const pct = u.quota_percentage || 0;
                                const progressColor = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400';
                                const isMenuOpen = activeUserMenu?.user?.id === u.id;

                                return (
                                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                        
                                        {/* User Info */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                                                    {u.name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-xs">{u.name}</div>
                                                    <div className="text-[11px] text-gray-400 font-mono">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Active Plan & Extra Quota */}
                                        <td className="px-5 py-3.5">
                                            <button
                                                type="button"
                                                onClick={() => onOpenManagePackagesModal(u)}
                                                className="text-left w-full group/pkg p-1.5 -m-1.5 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer"
                                                title="Tüm Paketleri ve Kotaları Yönet"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-transform group-hover/pkg:scale-[1.02] ${
                                                            u.has_active_sub 
                                                                ? u.is_perpetual 
                                                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                                                    : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                                                : 'bg-white/[0.04] text-gray-400'
                                                        }`}>
                                                            {u.is_perpetual && <Infinity className="w-3 h-3" />}
                                                            <span>{u.plan_name}</span>
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 group-hover/pkg:text-emerald-400 transition-colors flex items-center gap-0.5">
                                                            <Edit3 className="w-2.5 h-2.5" />
                                                        </span>
                                                    </div>

                                                    {u.has_extras && (
                                                        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                                                            <Sparkles className="w-3 h-3 shrink-0" />
                                                            <span>+{u.extra_quota_formatted} ({u.active_extras_count} Ek Havuz)</span>
                                                        </div>
                                                    )}
                                                    
                                                    {u.custom_speed_limit_mbps && (
                                                        <div className="text-[10px] text-amber-400/90 font-mono">
                                                            Hız Limiti: {u.custom_speed_limit_mbps} Mbps
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        </td>

                                        {/* Quota Usage Bar */}
                                        <td className="px-5 py-3.5 min-w-[200px]">
                                            {u.has_any_package ? (
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[11px] font-mono">
                                                        <span className="text-gray-300 font-medium">{u.quota_used} / {u.quota_total}</span>
                                                        <span className={`font-bold ${pct >= 90 ? 'text-rose-400' : 'text-gray-200'}`}>%{pct}</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
                                                        <div className={`h-full ${progressColor} rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 font-mono text-[11px]">- Tanımsız -</span>
                                            )}
                                        </td>

                                        {/* Expiration Date */}
                                        <td className="px-5 py-3.5 font-mono text-[11px] text-gray-300">
                                            {u.is_perpetual ? (
                                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                                    <Infinity className="w-3 h-3" />
                                                    <span>Süresiz</span>
                                                </span>
                                            ) : (
                                                <span>{u.expires_at || '-'}</span>
                                            )}
                                        </td>

                                        {/* Smart Actions (One-click + Dropdown) */}
                                        <td className="px-5 py-3.5 text-right relative">
                                            <div className="flex items-center justify-end gap-1.5">
                                                
                                                {/* Primary Action: Comprehensive Packages & Quotas Modal */}
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenManagePackagesModal(u)}
                                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm shadow-emerald-500/10"
                                                    title="Tüm Paketleri ve Kotaları Yönet (Modal)"
                                                >
                                                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>Paketleri Yönet</span>
                                                </button>

                                                {/* Quick Action 1: Add Extra Quota */}
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenExtraQuotaModal(u)}
                                                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                                                    title="Ek Kota Ekle"
                                                >
                                                    <Zap className="w-3 h-3" />
                                                    <span>+ Ek Kota</span>
                                                </button>

                                                {/* Quick Action 2: Extend Duration (If active subscription) */}
                                                {u.has_active_sub && !u.is_perpetual && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenExtendDurationModal(u)}
                                                        className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                                                        title="Süre Uzat"
                                                    >
                                                        <Clock className="w-3 h-3" />
                                                        <span>Süre Uzat</span>
                                                    </button>
                                                )}

                                                {/* Operations Menu Trigger (···) */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleToggleUserMenu(e, u)}
                                                    className={`p-1.5 rounded-xl transition-all ${
                                                        isMenuOpen
                                                            ? 'bg-white text-black font-bold'
                                                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white'
                                                    }`}
                                                    title="Diğer İşlemler"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>

                                            </div>
                                        </td>

                                    </tr>
                                );
                            })}

                            {usersList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        Kriterlere uygun kullanıcı hesabı bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {users?.last_page > 1 && (
                    <div className="px-6 py-4 border-t border-white/[0.06]">
                        <Pagination
                            pagination={users}
                            onPageChange={(page) => {
                                router.get('/admin/plans', {
                                    ...filters,
                                    tab: 'users',
                                    users_page: page,
                                }, {
                                    preserveState: true,
                                    preserveScroll: true,
                                });
                            }}
                        />
                    </div>
                )}
            </div>

            {/* FLOATING ACTION DROPDOWN FOR USER (Fixed Viewport to prevent overflow clipping) */}
            {activeUserMenu && (
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        zIndex: 9999,
                        right: `${activeUserMenu.right}px`,
                        ...(activeUserMenu.placement === 'top'
                            ? { bottom: `${activeUserMenu.bottom}px` }
                            : { top: `${activeUserMenu.top}px` }),
                    }}
                    className="w-56 bg-[#0E131F] border border-white/[0.12] rounded-2xl shadow-2xl py-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 divide-y divide-white/[0.06]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3.5 py-2">
                        <div className="text-[11px] font-bold text-white truncate">{activeUserMenu.user.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono truncate">{activeUserMenu.user.email}</div>
                    </div>

                    <div className="py-1">
                        <button
                            type="button"
                            onClick={() => {
                                const u = activeUserMenu.user;
                                setActiveUserMenu(null);
                                onOpenManagePackagesModal(u);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-emerald-500/10 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-2.5 transition-colors"
                        >
                            <Package className="w-3.5 h-3.5 shrink-0" />
                            <span>Tüm Paket & Kotaları Yönet</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const u = activeUserMenu.user;
                                setActiveUserMenu(null);
                                onOpenExtraQuotaModal(u);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-white/[0.04] text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-2.5 transition-colors"
                        >
                            <Zap className="w-3.5 h-3.5 shrink-0" />
                            <span>Ek Kota Tanımla</span>
                        </button>

                        {activeUserMenu.user.has_active_sub && !activeUserMenu.user.is_perpetual && (
                            <button
                                type="button"
                                onClick={() => {
                                    const u = activeUserMenu.user;
                                    setActiveUserMenu(null);
                                    onOpenExtendDurationModal(u);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-white/[0.04] text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-2.5 transition-colors"
                            >
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span>Abonelik Süresi Uzat</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                const u = activeUserMenu.user;
                                setActiveUserMenu(null);
                                onOpenAssignModal(u);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-white/[0.04] text-[11px] text-gray-200 hover:text-white font-medium flex items-center gap-2.5 transition-colors"
                        >
                            <Sliders className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                            <span>Paket & Kota Düzenle</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const u = activeUserMenu.user;
                                setActiveUserMenu(null);
                                onResetUserUsage(u);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-white/[0.04] text-[11px] text-gray-200 hover:text-white font-medium flex items-center gap-2.5 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                            <span>Kullanımı Sıfırla</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const u = activeUserMenu.user;
                                setActiveUserMenu(null);
                                onSyncMediaAccount(u);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-white/[0.04] text-[11px] text-gray-200 hover:text-white font-medium flex items-center gap-2.5 transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                            <span>Jellyfin Senkronize Et</span>
                        </button>
                    </div>

                    {activeUserMenu.user.has_active_sub && (
                        <div className="py-1">
                            <button
                                type="button"
                                onClick={() => {
                                    const u = activeUserMenu.user;
                                    setActiveUserMenu(null);
                                    onRemoveUserPlan(u);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-rose-500/10 text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-2.5 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Paketi İptal Et / Sıfırla</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
