import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    RefreshCw,
    X,
    HardDrive,
    Package,
    Edit3,
    Infinity,
    RotateCcw,
    Clock,
    Trash2,
    Plus,
    Sliders,
    Sparkles,
    Zap,
    AlertTriangle
} from 'lucide-react';

export default function ManagePackagesModal({
    user,
    plans = [],
    onClose,
    onSyncMediaAccount,
    onResetUserUsage,
    onRemoveOnlyMainPlan,
    onRemoveUserExtraQuota,
    onRemoveUserPlan,
}) {
    if (!user) return null;

    const [isEditingMainPlanInline, setIsEditingMainPlanInline] = useState(false);
    const [isExtendingDurationInline, setIsExtendingDurationInline] = useState(false);
    const [isAddingExtraQuotaInline, setIsAddingExtraQuotaInline] = useState(false);
    const [editingExtraQuota, setEditingExtraQuota] = useState(null);

    // Form states
    const [editMainPlanForm, setEditMainPlanForm] = useState({
        user_id: user.id,
        plan_id: user.plan_id ? String(user.plan_id) : 'custom',
        custom_quota_gb: user.main_allocated_bytes ? Math.round(user.main_allocated_bytes / (1024 * 1024 * 1024)) : 500,
        custom_speed_limit_mbps: user.custom_speed_limit_mbps !== null && user.custom_speed_limit_mbps !== undefined ? user.custom_speed_limit_mbps : '',
        duration_type: user.is_perpetual ? 'perpetual' : (user.duration_months ? String(user.duration_months) : '1'),
        custom_months: 1,
        price_paid: '',
        notes: '',
    });
    const [isSubmittingInlinePlan, setIsSubmittingInlinePlan] = useState(false);

    const [extendInlineDays, setExtendInlineDays] = useState(30);
    const [extendInlineNotes, setExtendInlineNotes] = useState('');
    const [isSubmittingInlineExtend, setIsSubmittingInlineExtend] = useState(false);

    const [extraInlineForm, setExtraInlineForm] = useState({
        quota_gb: 200,
        days: 30,
        name: `${user.name} Ek Kota`,
        notes: '',
    });
    const [isSubmittingInlineExtra, setIsSubmittingInlineExtra] = useState(false);

    const [editExtraForm, setEditExtraForm] = useState({
        name: '',
        allocated_gb: 200,
        used_gb: 0,
        days_to_add: 0,
        expires_at: '',
        reset_usage: false,
        notes: '',
    });
    const [isSubmittingEditExtra, setIsSubmittingEditExtra] = useState(false);

    // Update main plan form if user changes
    useEffect(() => {
        setEditMainPlanForm({
            user_id: user.id,
            plan_id: user.plan_id ? String(user.plan_id) : 'custom',
            custom_quota_gb: user.main_allocated_bytes ? Math.round(user.main_allocated_bytes / (1024 * 1024 * 1024)) : 500,
            custom_speed_limit_mbps: user.custom_speed_limit_mbps !== null && user.custom_speed_limit_mbps !== undefined ? user.custom_speed_limit_mbps : '',
            duration_type: user.is_perpetual ? 'perpetual' : (user.duration_months ? String(user.duration_months) : '1'),
            custom_months: 1,
            price_paid: '',
            notes: '',
        });
        setExtraInlineForm({
            quota_gb: 200,
            days: 30,
            name: `${user.name} Ek Kota`,
            notes: '',
        });
    }, [user.id, user.plan_id, user.main_allocated_bytes, user.custom_speed_limit_mbps, user.is_perpetual, user.duration_months]);

    // Save inline main plan assignment
    const handleSaveInlineMainPlan = (e) => {
        e?.preventDefault();
        setIsSubmittingInlinePlan(true);

        router.post('/admin/plans/users/assign', {
            user_id: user.id,
            ...editMainPlanForm,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditingMainPlanInline(false);
            },
            onFinish: () => setIsSubmittingInlinePlan(false),
        });
    };

    // Save inline duration extension
    const handleSaveInlineExtend = (e) => {
        e?.preventDefault();
        setIsSubmittingInlineExtend(true);

        router.post(`/admin/plans/users/${user.id}/extend-duration`, {
            days: extendInlineDays,
            notes: extendInlineNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsExtendingDurationInline(false);
                setExtendInlineNotes('');
            },
            onFinish: () => setIsSubmittingInlineExtend(false),
        });
    };

    // Save inline extra quota grant
    const handleSaveInlineExtraQuota = (e) => {
        e?.preventDefault();
        setIsSubmittingInlineExtra(true);

        router.post(`/admin/plans/users/${user.id}/extra-quota`, extraInlineForm, {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddingExtraQuotaInline(false);
                setExtraInlineForm({
                    quota_gb: 200,
                    days: 30,
                    name: `${user.name} Ek Kota`,
                    notes: '',
                });
            },
            onFinish: () => setIsSubmittingInlineExtra(false),
        });
    };

    // Start editing an existing extra quota
    const handleStartEditExtraQuota = (extra) => {
        setEditingExtraQuota(extra);
        setEditExtraForm({
            name: extra.name || '',
            allocated_gb: extra.allocated_gb || Math.round(extra.allocated_bytes / (1024 * 1024 * 1024)),
            used_gb: extra.used_gb !== undefined && extra.used_gb !== null ? extra.used_gb : Math.round(extra.used_bytes / (1024 * 1024 * 1024)),
            days_to_add: 0,
            expires_at: extra.raw_expires_at || '',
            reset_usage: false,
            notes: extra.notes || '',
        });
    };

    // Save edited extra quota
    const handleSaveEditExtraQuota = (e) => {
        e?.preventDefault();
        if (!editingExtraQuota) return;
        setIsSubmittingEditExtra(true);

        router.put(`/admin/plans/users/${user.id}/extra-quota/${editingExtraQuota.id}`, editExtraForm, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingExtraQuota(null);
            },
            onFinish: () => setIsSubmittingEditExtra(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
            <div className="bg-[#0A0D15] border border-white/[0.12] rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8 relative max-h-[90vh] overflow-y-auto">
                
                {/* Header: User Info & Sync & Close */}
                <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-base flex items-center justify-center font-bold shrink-0 shadow-lg shadow-emerald-500/10">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white tracking-tight">{user.name}</h3>
                                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-gray-300 font-medium">
                                    {user.role_label || 'Kullanıcı'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{user.email}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onSyncMediaAccount(user)}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                            title="Jellyfin / Emby Medya Sunucusuyla Senkronize Et"
                        >
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Jellyfin Senkronize Et</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Total Quota Pool Summary Banner */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                            <HardDrive className="w-4 h-4 text-emerald-400" />
                            <span>Toplam Kullanılabilir Kota Havuzu</span>
                        </span>
                        {user.custom_speed_limit_mbps ? (
                            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                Hız Sınırı: {user.custom_speed_limit_mbps} Mbps
                            </span>
                        ) : (
                            <span className="text-[11px] font-mono text-gray-400">
                                Hız Sınırı: Limitsiz
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center py-1">
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                            <div className="text-[10px] text-gray-400 uppercase font-semibold">Toplam Havuz</div>
                            <div className="text-sm font-bold text-white font-mono mt-0.5">{user.quota_total}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                            <div className="text-[10px] text-gray-400 uppercase font-semibold">Harcanan Kota</div>
                            <div className="text-sm font-bold text-gray-200 font-mono mt-0.5">{user.quota_used}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="text-[10px] text-emerald-400 uppercase font-semibold">Toplam Kalan Kota</div>
                            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                                {user.quota_remaining || user.quota_total}
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-gray-400">
                            <span>Kullanım Oranı</span>
                            <span className={user.quota_percentage >= 90 ? 'text-rose-400 font-bold' : 'text-gray-200'}>
                                %{user.quota_percentage || 0}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    (user.quota_percentage || 0) >= 90
                                        ? 'bg-rose-500'
                                        : (user.quota_percentage || 0) >= 70
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-400'
                                }`}
                                style={{ width: `${Math.min(100, user.quota_percentage || 0)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 1: ANA ABONELİK PAKETİ */}
                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-sm font-bold text-white">Ana Abonelik Paketi</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                user.has_active_sub 
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                    : 'bg-white/[0.06] text-gray-400'
                            }`}>
                                {user.has_active_sub ? 'Aktif Abonelik' : 'Paketsiz'}
                            </span>
                        </div>

                        {!isEditingMainPlanInline && (
                            <button
                                type="button"
                                onClick={() => setIsEditingMainPlanInline(true)}
                                className="px-3 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{user.has_active_sub ? 'Paketi Düzenle' : '+ Paket Tanımla'}</span>
                            </button>
                        )}
                    </div>

                    {/* View Mode */}
                    {!isEditingMainPlanInline ? (
                        <div className="space-y-4">
                            {user.has_active_sub ? (
                                <div className="bg-black/30 border border-white/[0.04] rounded-xl p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="text-base font-bold text-white flex items-center gap-2">
                                                <span>{user.main_plan_name || user.plan_name}</span>
                                                {user.is_perpetual && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                        <Infinity className="w-3 h-3" />
                                                        <span>Süresiz</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-3">
                                                <span>Aylık Kota: <strong className="text-gray-200">{user.main_quota_total}</strong></span>
                                                <span>•</span>
                                                <span>Harcanan: <strong className="text-gray-200">{user.main_quota_used}</strong></span>
                                                <span>•</span>
                                                <span>Kalan: <strong className="text-emerald-400">{user.main_remaining_formatted}</strong></span>
                                                <span>•</span>
                                                <span>Bitiş: <strong className="text-gray-200">{user.expires_at || 'Süresiz'}</strong></span>
                                            </div>
                                            {user.subscription_notes && (
                                                <div className="text-[11px] text-gray-500 mt-2 italic">
                                                    Not: {user.subscription_notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action bar for main plan */}
                                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.04]">
                                        <button
                                            type="button"
                                            onClick={() => onResetUserUsage(user)}
                                            className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                            title="Harcanan kotayı 0 yapar"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Kotayı Sıfırla</span>
                                        </button>

                                        {!user.is_perpetual && (
                                            <button
                                                type="button"
                                                onClick={() => setIsExtendingDurationInline(!isExtendingDurationInline)}
                                                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                                    isExtendingDurationInline 
                                                        ? 'bg-indigo-600 text-white' 
                                                        : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30'
                                                }`}
                                            >
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{isExtendingDurationInline ? 'Uzatmayı Kapat' : 'Süre Uzat (+Gün)'}</span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => onRemoveOnlyMainPlan(user)}
                                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto"
                                            title="Yalnızca ana aboneliği kaldırır"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Ana Paketi Kaldır</span>
                                        </button>
                                    </div>

                                    {/* Inline Extend Duration Panel */}
                                    {isExtendingDurationInline && (
                                        <div className="p-3.5 rounded-xl bg-[#0E131F] border border-indigo-500/30 space-y-3 mt-3 animate-in fade-in">
                                            <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold">
                                                <span>Abonelik Süresini Uzat</span>
                                                <span className="text-[11px] text-gray-400">Mevcut Bitiş: {user.expires_at}</span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {[15, 30, 60, 90, 180, 365].map((d) => (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() => setExtendInlineDays(d)}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                            extendInlineDays === d
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]'
                                                        }`}
                                                    >
                                                        +{d} Gün
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="relative w-36">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="3650"
                                                        value={extendInlineDays}
                                                        onChange={(e) => setExtendInlineDays(parseInt(e.target.value) || 1)}
                                                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                    />
                                                    <span className="absolute right-3 top-2 text-[10px] text-gray-400">Gün</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Not / Açıklama (opsiyonel)"
                                                    value={extendInlineNotes}
                                                    onChange={(e) => setExtendInlineNotes(e.target.value)}
                                                    className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleSaveInlineExtend}
                                                    disabled={isSubmittingInlineExtend}
                                                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                                >
                                                    {isSubmittingInlineExtend ? 'Kaydediliyor...' : 'Süreyi Uzat'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-white/[0.08] rounded-xl p-4 space-y-2">
                                    <p className="text-xs text-gray-400">Bu kullanıcıya tanımlanmış aktif bir ana abonelik bulunmuyor.</p>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingMainPlanInline(true)}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Ana Paket Tanımla</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Inline Edit Form for Main Plan */
                        <form onSubmit={handleSaveInlineMainPlan} className="bg-black/30 border border-white/[0.08] rounded-xl p-4 space-y-4 animate-in fade-in">
                            <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Ana Paket & Kota Ayarları</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingMainPlanInline(false)}
                                    className="text-xs text-gray-400 hover:text-white"
                                >
                                    Vazgeç
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Paket Şablonu</label>
                                    <select
                                        value={editMainPlanForm.plan_id}
                                        onChange={(e) => {
                                            const pid = e.target.value;
                                            const found = plans.find(p => String(p.id) === pid);
                                            setEditMainPlanForm({
                                                ...editMainPlanForm,
                                                plan_id: pid,
                                                custom_quota_gb: found ? found.monthly_quota_gb : editMainPlanForm.custom_quota_gb,
                                                custom_speed_limit_mbps: found?.speed_limit_mbps || editMainPlanForm.custom_speed_limit_mbps,
                                            });
                                        }}
                                        className="w-full bg-[#0E131F] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="custom">Özel Kota Tanımla (Manuel GB)</option>
                                        <option value="none">Paketsiz Yap (Aboneliği İptal Et)</option>
                                        {plans.filter(p => p.type !== 'extra').map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.monthly_quota_gb} GB - ₺{p.price_1m}/ay)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Aylık Kota (GB)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50000"
                                        value={editMainPlanForm.custom_quota_gb}
                                        onChange={(e) => setEditMainPlanForm({ ...editMainPlanForm, custom_quota_gb: parseInt(e.target.value) || 100 })}
                                        className="w-full bg-[#0E131F] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Geçerlilik Süresi</label>
                                    <select
                                        value={editMainPlanForm.duration_type}
                                        onChange={(e) => setEditMainPlanForm({ ...editMainPlanForm, duration_type: e.target.value })}
                                        className="w-full bg-[#0E131F] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="1">1 Ay (30 Gün)</option>
                                        <option value="3">3 Ay (90 Gün)</option>
                                        <option value="6">6 Ay (180 Gün)</option>
                                        <option value="12">1 Yıl (365 Gün)</option>
                                        <option value="perpetual">Süresiz (Ömür Boyu)</option>
                                        <option value="custom">Özel Ay Sayısı</option>
                                    </select>
                                </div>

                                {editMainPlanForm.duration_type === 'custom' && (
                                    <div>
                                        <label className="block text-gray-300 font-semibold mb-1">Kaç Ay Geçerli?</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="120"
                                            value={editMainPlanForm.custom_months}
                                            onChange={(e) => setEditMainPlanForm({ ...editMainPlanForm, custom_months: parseInt(e.target.value) || 1 })}
                                            className="w-full bg-[#0E131F] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Hız Sınırı (Mbps)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10000"
                                        placeholder="Boş bırakılırsa limitsiz"
                                        value={editMainPlanForm.custom_speed_limit_mbps}
                                        onChange={(e) => setEditMainPlanForm({ ...editMainPlanForm, custom_speed_limit_mbps: e.target.value })}
                                        className="w-full bg-[#0E131F] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-gray-300 font-semibold mb-1">Yönetici Notu</label>
                                    <input
                                        type="text"
                                        placeholder="Örn: Müşteri talebiyle kota yükseltildi"
                                        value={editMainPlanForm.notes}
                                        onChange={(e) => setEditMainPlanForm({ ...editMainPlanForm, notes: e.target.value })}
                                        className="w-full bg-[#0E131F] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditingMainPlanInline(false)}
                                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-gray-300"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingInlinePlan}
                                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                                >
                                    {isSubmittingInlinePlan ? 'Kaydediliyor...' : 'Paketi Kaydet & Güncelle'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* SECTION 2: EK KOTA HAVUZLARI */}
                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <h4 className="text-sm font-bold text-white">Ek Kota Havuzları</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                {user.extras?.length || 0} Aktif Havuz
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsAddingExtraQuotaInline(!isAddingExtraQuotaInline)}
                            className="px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isAddingExtraQuotaInline ? 'Formu Kapat' : '+ Yeni Ek Kota Tanımla'}</span>
                        </button>
                    </div>

                    {/* Inline Add Extra Quota Form */}
                    {isAddingExtraQuotaInline && (
                        <form onSubmit={handleSaveInlineExtraQuota} className="bg-black/30 border border-amber-500/30 rounded-xl p-4 space-y-3 animate-in fade-in">
                            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5" />
                                <span>Yeni Ek Kota Tanımlama Formu</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Kota Miktarı (GB)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10000"
                                        value={extraInlineForm.quota_gb}
                                        onChange={(e) => setExtraInlineForm({ ...extraInlineForm, quota_gb: parseInt(e.target.value) || 50 })}
                                        className="w-full bg-[#0E131F] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Geçerlilik Süresi (Gün)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={extraInlineForm.days}
                                        onChange={(e) => setExtraInlineForm({ ...extraInlineForm, days: parseInt(e.target.value) || 30 })}
                                        className="w-full bg-[#0E131F] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Havuz İsmi</label>
                                    <input
                                        type="text"
                                        placeholder="Örn: Hızlı Ek Kota"
                                        value={extraInlineForm.name}
                                        onChange={(e) => setExtraInlineForm({ ...extraInlineForm, name: e.target.value })}
                                        className="w-full bg-[#0E131F] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingExtraQuotaInline(false)}
                                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-gray-300"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingInlineExtra}
                                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                                >
                                    {isSubmittingInlineExtra ? 'Ekleniyor...' : 'Ek Kotayı Tanımla'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* List of Extra Quotas */}
                    <div className="space-y-2">
                        {user.extras && user.extras.length > 0 ? (
                            user.extras.map((extra) => (
                                editingExtraQuota?.id === extra.id ? (
                                    <form
                                        key={extra.id}
                                        onSubmit={handleSaveEditExtraQuota}
                                        className="p-4 rounded-xl bg-[#0E131F] border border-amber-500/40 space-y-3 animate-in fade-in"
                                    >
                                        <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                                            <span className="flex items-center gap-1.5">
                                                <Edit3 className="w-3.5 h-3.5" />
                                                <span>Ek Kota Havuzunu Düzenle: {extra.name}</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setEditingExtraQuota(null)}
                                                className="text-gray-400 hover:text-white text-xs font-normal transition-colors"
                                            >
                                                Vazgeç
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                            <div>
                                                <label className="block text-gray-300 font-semibold mb-1">Havuz İsmi</label>
                                                <input
                                                    type="text"
                                                    value={editExtraForm.name}
                                                    onChange={(e) => setEditExtraForm({ ...editExtraForm, name: e.target.value })}
                                                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-gray-300 font-semibold mb-1">Toplam Tahsis (GB)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="50000"
                                                    value={editExtraForm.allocated_gb}
                                                    onChange={(e) => setEditExtraForm({ ...editExtraForm, allocated_gb: parseInt(e.target.value) || 1 })}
                                                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-gray-300 font-semibold mb-1">Harcanan Kota (GB)</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editExtraForm.used_gb}
                                                        onChange={(e) => setEditExtraForm({ ...editExtraForm, used_gb: parseFloat(e.target.value) || 0, reset_usage: false })}
                                                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditExtraForm({ ...editExtraForm, used_gb: 0, reset_usage: true })}
                                                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[10px] text-emerald-400 font-bold shrink-0 transition-colors"
                                                        title="Harcananı 0 yap"
                                                    >
                                                        Sıfırla
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-gray-300 font-semibold mb-1">Süre Uzat (+Gün)</label>
                                                <div className="flex items-center gap-1">
                                                    {[15, 30, 60, 90].map((d) => (
                                                        <button
                                                            key={d}
                                                            type="button"
                                                            onClick={() => setEditExtraForm({ ...editExtraForm, days_to_add: editExtraForm.days_to_add === d ? 0 : d })}
                                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                                                editExtraForm.days_to_add === d
                                                                    ? 'bg-amber-500 text-black'
                                                                    : 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]'
                                                            }`}
                                                        >
                                                            +{d}G
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-gray-300 font-semibold mb-1">Doğrudan Bitiş Tarihi</label>
                                                <input
                                                    type="date"
                                                    value={editExtraForm.expires_at}
                                                    onChange={(e) => setEditExtraForm({ ...editExtraForm, expires_at: e.target.value, days_to_add: 0 })}
                                                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-gray-300 font-semibold mb-1">Açıklama / Not</label>
                                                <input
                                                    type="text"
                                                    placeholder="Opsiyonel not"
                                                    value={editExtraForm.notes}
                                                    onChange={(e) => setEditExtraForm({ ...editExtraForm, notes: e.target.value })}
                                                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.04]">
                                            <button
                                                type="button"
                                                onClick={() => setEditingExtraQuota(null)}
                                                className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-gray-300"
                                            >
                                                Vazgeç
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmittingEditExtra}
                                                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                                            >
                                                {isSubmittingEditExtra ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div
                                        key={extra.id}
                                        className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/[0.04] hover:border-white/[0.1] transition-all"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-white">{extra.name}</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                                    {extra.days_left !== null ? `${extra.days_left} gün kaldı` : 'Aktif'}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-gray-400 font-mono flex flex-wrap items-center gap-2">
                                                <span>Kalan: <strong className="text-emerald-400">{extra.remaining_formatted}</strong></span>
                                                <span>/</span>
                                                <span>Toplam: {extra.allocated_formatted}</span>
                                                <span>•</span>
                                                <span>Harcanan: {extra.used_formatted}</span>
                                                <span>•</span>
                                                <span>Bitiş: {extra.expires_at || '-'}</span>
                                            </div>
                                            {extra.notes && (
                                                <div className="text-[10px] text-gray-500 italic">
                                                    Not: {extra.notes}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleStartEditExtraQuota(extra)}
                                                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-amber-400 hover:text-amber-300 border border-white/[0.08] text-xs font-semibold transition-colors"
                                                title="Bu ek kota havuzunu düzenle"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onRemoveUserExtraQuota(user, extra)}
                                                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
                                                title="Bu ek kota havuzunu sil"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))
                        ) : (
                            <div className="text-center py-4 border border-dashed border-white/[0.06] rounded-xl text-gray-400 text-xs">
                                Kullanıcıya ait tanımlı ek kota havuzu bulunmuyor.
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                    <div>
                        {user.has_any_package && (
                            <button
                                type="button"
                                onClick={() => onRemoveUserPlan(user)}
                                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Tüm Paket ve Ek Kotaları Sıfırla</span>
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors"
                    >
                        Kapat
                    </button>
                </div>

            </div>
        </div>
    );
}
