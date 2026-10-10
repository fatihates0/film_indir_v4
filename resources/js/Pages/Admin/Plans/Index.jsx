import React, { useState } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import AdminLayout from '../../../Components/AdminLayout';
import Pagination from '../../../Components/Pagination';
import {
    Package,
    Plus,
    Edit3,
    Trash2,
    Users,
    HardDrive,
    Search,
    CheckCircle2,
    Infinity,
    Layers,
    X,
    UserCheck,
    UserX,
    Sparkles,
    AlertTriangle,
    Shield,
    History,
    Receipt,
    Clock,
    DollarSign,
    Building2,
    Coins,
    Check,
    XCircle,
    BellRing,
    Gauge,
    Copy,
    RefreshCw,
    TrendingUp,
    Calendar,
    ChevronRight,
    ArrowUpRight,
    Tv,
    ShieldCheck,
    RotateCcw,
    Zap,
    Sliders,
    Filter
} from 'lucide-react';

export default function PlansIndex({ 
    stats = {},
    activeSection = 'plans',
    plans = [], 
    users = { data: [] }, 
    subscriptionsHistory = { data: [] },
    paymentMethods = [],
    paymentNotifications = { data: [] },
    filters = {}
}) {
    const { flash } = usePage().props;

    // Active Section State: 'plans' | 'users' | 'notifications' | 'methods' | 'history'
    const [currentSection, setCurrentSection] = useState(filters?.tab || activeSection || 'plans');

    // Filter states
    const [userSearchInput, setUserSearchInput] = useState(filters?.user_search || '');
    const [notifSearchInput, setNotifSearchInput] = useState(filters?.notif_search || '');
    const [historySearchInput, setHistorySearchInput] = useState(filters?.history_search || '');

    // Modals state
    const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [deletingPlan, setDeletingPlan] = useState(null);
    const [targetPlanForDelete, setTargetPlanForDelete] = useState('none');

    // Payment Method Edit Modal State
    const [editingMethod, setEditingMethod] = useState(null);
    const [methodForm, setMethodForm] = useState({
        name: '',
        description: '',
        instructions: '',
        is_active: true,
        settings: {},
    });
    const [isSubmittingMethod, setIsSubmittingMethod] = useState(false);

    // Assign plan/quota modal state
    const [assignModalUser, setAssignModalUser] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    // Direct Extra Quota Modal State
    const [extraQuotaModalUser, setExtraQuotaModalUser] = useState(null);
    const [extraQuotaForm, setExtraQuotaForm] = useState({
        quota_gb: 200,
        days: 30,
        name: '',
        notes: '',
    });
    const [isSubmittingExtraQuota, setIsSubmittingExtraQuota] = useState(false);

    // Extend Duration Modal State
    const [extendDurationUser, setExtendDurationUser] = useState(null);
    const [extendDurationDays, setExtendDurationDays] = useState(30);
    const [extendDurationNotes, setExtendDurationNotes] = useState('');
    const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);

    // Initial plan form state
    const initialPlanForm = {
        name: '',
        slug: '',
        type: 'individual', // 'individual', 'business', 'extra'
        description: '',
        monthly_quota_gb: 500,
        price_1m: 99.00,
        price_3m: 269.00,
        price_6m: 499.00,
        price_12m: 899.00,
        allowed_durations: [1, 3, 6, 12],
        max_parallel_downloads: 4,
        speed_limit_mbps: '',
        allow_vps_access: false,
        is_active: true,
        sort_order: plans.length + 1,
    };
    const [planForm, setPlanForm] = useState(initialPlanForm);
    const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

    // Initial user assignment form state
    const initialAssignForm = {
        user_id: '',
        plan_id: 'custom',
        custom_quota_gb: 500,
        custom_speed_limit_mbps: '',
        duration_type: '1',
        custom_months: 1,
        price_paid: '',
        notes: '',
    };
    const [assignForm, setAssignForm] = useState(initialAssignForm);
    const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

    // Navigate Tab
    const handleSwitchSection = (sectionKey) => {
        setCurrentSection(sectionKey);
        router.get('/admin/plans', {
            tab: sectionKey,
            per_page: filters?.per_page || 15
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // User Search submit
    const handleUserSearchSubmit = (e) => {
        e?.preventDefault();
        router.get('/admin/plans', {
            ...filters,
            tab: 'users',
            user_search: userSearchInput,
            users_page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // User Filter change
    const handleUserFilterChange = (key, value) => {
        router.get('/admin/plans', {
            ...filters,
            tab: 'users',
            [key]: value,
            users_page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Notification filter change
    const handleNotifFilterChange = (status) => {
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

    // History filter change
    const handleHistoryFilterChange = (status) => {
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

    // Toggle Allowed Duration in plan form
    const toggleAllowedDuration = (months) => {
        const current = planForm.allowed_durations || [1, 3, 6, 12];
        if (current.includes(months)) {
            if (current.length <= 1) return;
            setPlanForm({ ...planForm, allowed_durations: current.filter(m => m !== months) });
        } else {
            setPlanForm({ ...planForm, allowed_durations: [...current, months].sort((a, b) => a - b) });
        }
    };

    // Open create plan modal
    const handleOpenCreatePlan = () => {
        setPlanForm({
            ...initialPlanForm,
            allowed_durations: [1, 3, 6, 12],
            sort_order: plans.length + 1,
        });
        setEditingPlan(null);
        setIsCreatePlanOpen(true);
    };

    // Open edit plan modal
    const handleOpenEditPlan = (plan) => {
        setEditingPlan(plan);
        setPlanForm({
            name: plan.name || '',
            slug: plan.slug || '',
            type: plan.type || 'individual',
            description: plan.description || '',
            monthly_quota_gb: plan.monthly_quota_gb || 100,
            price_1m: plan.price_1m || 0,
            price_3m: plan.price_3m || 0,
            price_6m: plan.price_6m || 0,
            price_12m: plan.price_12m || 0,
            allowed_durations: plan.allowed_durations || [1, 3, 6, 12],
            max_parallel_downloads: plan.max_parallel_downloads ?? 4,
            speed_limit_mbps: plan.speed_limit_mbps || '',
            allow_vps_access: Boolean(plan.allow_vps_access),
            is_active: Boolean(plan.is_active),
            sort_order: plan.sort_order || 0,
        });
        setIsCreatePlanOpen(true);
    };

    // Submit Plan Form
    const handleSavePlan = (e) => {
        e.preventDefault();
        setIsSubmittingPlan(true);

        if (editingPlan) {
            router.put(`/admin/plans/${editingPlan.id}`, planForm, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCreatePlanOpen(false);
                    setEditingPlan(null);
                },
                onFinish: () => setIsSubmittingPlan(false),
            });
        } else {
            router.post('/admin/plans', planForm, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCreatePlanOpen(false);
                },
                onFinish: () => setIsSubmittingPlan(false),
            });
        }
    };

    // Quick toggle plan active/passive
    const handleTogglePlan = (plan) => {
        router.post(`/admin/plans/${plan.id}/toggle`, {}, {
            preserveScroll: true,
        });
    };

    // Quick Clone plan
    const handleClonePlan = (plan) => {
        router.post(`/admin/plans/${plan.id}/clone`, {}, {
            preserveScroll: true,
        });
    };

    // Delete Plan
    const handleConfirmDeletePlan = () => {
        if (!deletingPlan) return;
        setIsSubmittingPlan(true);

        router.delete(`/admin/plans/${deletingPlan.id}`, {
            data: { target_plan_id: targetPlanForDelete },
            preserveScroll: true,
            onSuccess: () => {
                setDeletingPlan(null);
                setTargetPlanForDelete('none');
            },
            onFinish: () => setIsSubmittingPlan(false),
        });
    };

    // Open Assign Modal
    const handleOpenAssignModal = (user = null) => {
        if (user) {
            setAssignModalUser(user);
            setAssignForm({
                user_id: user.id,
                plan_id: user.plan_id ? String(user.plan_id) : 'custom',
                custom_quota_gb: user.quota_allocated_bytes ? Math.round(user.quota_allocated_bytes / (1024 * 1024 * 1024)) : 500,
                custom_speed_limit_mbps: user.custom_speed_limit_mbps !== null && user.custom_speed_limit_mbps !== undefined ? user.custom_speed_limit_mbps : '',
                duration_type: user.is_perpetual ? 'perpetual' : '1',
                custom_months: 1,
                price_paid: '',
                notes: '',
            });
        } else {
            setAssignModalUser(null);
            setAssignForm(initialAssignForm);
        }
        setIsAssignModalOpen(true);
    };

    // Submit Assign Plan
    const handleSaveAssign = (e) => {
        e.preventDefault();
        setIsSubmittingAssign(true);

        router.post('/admin/plans/users/assign', assignForm, {
            preserveScroll: true,
            onSuccess: () => {
                setIsAssignModalOpen(false);
                setAssignModalUser(null);
            },
            onFinish: () => setIsSubmittingAssign(false),
        });
    };

    // Reset User Usage
    const handleResetUserUsage = (user) => {
        if (!window.confirm(`${user.name} kullanıcısının mevcut dönemde harcadığı kotayı sıfırlamak istediğinize emin misiniz?`)) return;

        router.post(`/admin/plans/users/${user.id}/reset-usage`, {}, {
            preserveScroll: true,
        });
    };

    // Submit Extend Duration
    const handleSaveExtendDuration = (e) => {
        e?.preventDefault();
        if (!extendDurationUser) return;
        setIsSubmittingExtend(true);

        router.post(`/admin/plans/users/${extendDurationUser.id}/extend-duration`, {
            days: extendDurationDays,
            notes: extendDurationNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setExtendDurationUser(null);
                setExtendDurationNotes('');
            },
            onFinish: () => setIsSubmittingExtend(false),
        });
    };

    // Submit Direct Extra Quota
    const handleSaveExtraQuota = (e) => {
        e?.preventDefault();
        if (!extraQuotaModalUser) return;
        setIsSubmittingExtraQuota(true);

        router.post(`/admin/plans/users/${extraQuotaModalUser.id}/extra-quota`, extraQuotaForm, {
            preserveScroll: true,
            onSuccess: () => {
                setExtraQuotaModalUser(null);
            },
            onFinish: () => setIsSubmittingExtraQuota(false),
        });
    };

    // Sync Jellyfin/Emby
    const handleSyncMediaAccount = (user) => {
        router.post(`/admin/plans/users/${user.id}/sync-media-account`, {}, {
            preserveScroll: true,
        });
    };

    // Remove User Plan
    const handleRemoveUserPlan = (user) => {
        if (!window.confirm(`${user.name} kullanıcısının tüm paket haklarını ve ek kotalarını iptal etmek istediğinize emin misiniz?`)) return;

        router.post(`/admin/plans/users/${user.id}/remove`, {}, {
            preserveScroll: true,
        });
    };

    // Approve Payment Notification
    const handleApproveNotification = (notification) => {
        if (!window.confirm(`"${notification.user_name}" tarafından yapılan ${notification.formatted_amount} tutarındaki ödemeyi onaylayıp paketi aktif etmek istiyor musunuz?`)) return;

        router.post(`/admin/payment-notifications/${notification.id}/approve`, {}, {
            preserveScroll: true,
        });
    };

    // Reject Payment Notification
    const handleRejectNotification = (notification) => {
        const reason = window.prompt("Reddetme nedeni (Opsiyonel):", "Ödeme doğrulanamadı.");
        if (reason !== null) {
            router.post(`/admin/payment-notifications/${notification.id}/reject`, {
                admin_notes: reason,
            }, {
                preserveScroll: true,
            });
        }
    };

    // Toggle Payment Method
    const handleTogglePaymentMethod = (method) => {
        router.post(`/admin/payment-methods/${method.id}/toggle`, {}, {
            preserveScroll: true,
        });
    };

    // Open Edit Payment Method
    const handleOpenEditMethod = (method) => {
        setEditingMethod(method);
        setMethodForm({
            name: method.name || '',
            description: method.description || '',
            instructions: method.instructions || '',
            is_active: Boolean(method.is_active),
            settings: method.settings || {},
        });
    };

    // Submit Payment Method Update
    const handleSavePaymentMethod = (e) => {
        e.preventDefault();
        if (!editingMethod) return;
        setIsSubmittingMethod(true);

        router.put(`/admin/payment-methods/${editingMethod.id}`, methodForm, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingMethod(null);
            },
            onFinish: () => setIsSubmittingMethod(false),
        });
    };

    // User list data & pagination helper
    const usersList = Array.isArray(users) ? users : (users?.data || []);
    const notifsList = Array.isArray(paymentNotifications) ? paymentNotifications : (paymentNotifications?.data || []);
    const historyList = Array.isArray(subscriptionsHistory) ? subscriptionsHistory : (subscriptionsHistory?.data || []);

    return (
        <AdminLayout
            title="Paket & Kota Yönetimi"
            subtitle="İndirme paketleri, kullanıcı kota tahsisleri, ödeme bildirimleri ve gateway hız limitleri."
            activeTab="plans"
            statsSummary={{ 
                total_plans: stats?.totalPlansCount ?? plans.length,
            }}
            headerActions={
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleOpenCreatePlan}
                        className="px-4 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs transition-all shadow-lg shadow-[#00B074]/20 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Yeni Paket Ekle</span>
                    </button>
                    <button
                        onClick={() => handleOpenAssignModal()}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white font-semibold text-xs transition-all flex items-center gap-2"
                    >
                        <UserCheck className="w-4 h-4 text-[#00B074]" />
                        <span>Kota Tanımla</span>
                    </button>
                </div>
            }
        >
            <div className="space-y-6">

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-5 h-5 text-[#00B074] shrink-0" />
                            <span>{flash.success}</span>
                        </div>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                            <span>{flash.error}</span>
                        </div>
                    </div>
                )}

                {/* AGGREGATED HIGH-IMPACT KPI CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* KPI 1: Plans */}
                    <div className="bg-[#0A0D15] border border-white/[0.08] p-5 rounded-2xl flex items-center justify-between hover:border-[#00B074]/40 transition-all shadow-xl shadow-black/20">
                        <div>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Aktif Paketler</p>
                            <h3 className="text-2xl font-black text-white font-mono">
                                {stats?.activePlansCount ?? plans.filter(p => p.is_active).length}{' '}
                                <span className="text-xs font-normal text-gray-500">/ {stats?.totalPlansCount ?? plans.length} Toplam</span>
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-1">Bireysel, VIP ve Ek Kotalar</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[#00B074]/10 text-[#00B074] border border-[#00B074]/20">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>

                    {/* KPI 2: Subscribers */}
                    <div className="bg-[#0A0D15] border border-white/[0.08] p-5 rounded-2xl flex items-center justify-between hover:border-blue-500/40 transition-all shadow-xl shadow-black/20">
                        <div>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Aktif Aboneler</p>
                            <h3 className="text-2xl font-black text-white font-mono">
                                {stats?.totalSubscribedUsers ?? 0}{' '}
                                <span className="text-xs font-normal text-gray-500">Kullanıcı</span>
                            </h3>
                            <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                                {stats?.perpetualUsersCount ?? 0} Süresiz Kota
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>

                    {/* KPI 3: Quota Allocated */}
                    <div className="bg-[#0A0D15] border border-white/[0.08] p-5 rounded-2xl flex items-center justify-between hover:border-amber-500/40 transition-all shadow-xl shadow-black/20">
                        <div>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Tahsis Edilen Kota</p>
                            <h3 className="text-2xl font-black text-amber-400 font-mono">
                                {(stats?.totalAllocatedGb ?? 0).toLocaleString('tr-TR')}{' '}
                                <span className="text-xs font-normal text-gray-500">GB</span>
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-1 font-mono">
                                Kullanılan: {(stats?.totalUsedGb ?? 0).toLocaleString('tr-TR')} GB
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <HardDrive className="w-5 h-5" />
                        </div>
                    </div>

                    {/* KPI 4: Pending Notifications & Revenue */}
                    <div className="bg-[#0A0D15] border border-white/[0.08] p-5 rounded-2xl flex items-center justify-between hover:border-emerald-500/40 transition-all shadow-xl shadow-black/20">
                        <div>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Ödeme Bekleyenler</p>
                            <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-black text-white font-mono">
                                    {stats?.pendingNotificationsCount ?? 0}
                                </h3>
                                {(stats?.pendingNotificationsCount ?? 0) > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                                        İnceleme Bekliyor
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1 font-mono">
                                Toplam Ciro: {stats?.formattedRevenue || '₺0,00'}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>

                </div>

                {/* MODULAR SUB-NAVIGATION SECTIONS BAR */}
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2">
                        
                        <button
                            onClick={() => handleSwitchSection('plans')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentSection === 'plans'
                                    ? 'bg-[#00B074] text-white shadow-lg shadow-[#00B074]/20'
                                    : 'bg-[#0A0D15] text-gray-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.04]'
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            <span>Paket Kataloğu</span>
                            <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono">
                                {plans.length}
                            </span>
                        </button>

                        <button
                            onClick={() => handleSwitchSection('users')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentSection === 'users'
                                    ? 'bg-[#00B074] text-white shadow-lg shadow-[#00B074]/20'
                                    : 'bg-[#0A0D15] text-gray-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.04]'
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            <span>Kullanıcı Kotaları</span>
                            <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono">
                                {stats?.totalSubscribedUsers ?? 0}
                            </span>
                        </button>

                        <button
                            onClick={() => handleSwitchSection('notifications')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentSection === 'notifications'
                                    ? 'bg-[#00B074] text-white shadow-lg shadow-[#00B074]/20'
                                    : 'bg-[#0A0D15] text-gray-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.04]'
                            }`}
                        >
                            <Receipt className="w-4 h-4" />
                            <span>Ödeme Bildirimleri</span>
                            {(stats?.pendingNotificationsCount ?? 0) > 0 ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black font-black text-[10px] font-mono animate-pulse">
                                    {stats.pendingNotificationsCount}
                                </span>
                            ) : (
                                <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono">
                                    {paymentNotifications?.total ?? notifsList.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => handleSwitchSection('methods')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentSection === 'methods'
                                    ? 'bg-[#00B074] text-white shadow-lg shadow-[#00B074]/20'
                                    : 'bg-[#0A0D15] text-gray-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.04]'
                            }`}
                        >
                            <Coins className="w-4 h-4" />
                            <span>Ödeme Yöntemleri</span>
                            <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono">
                                {paymentMethods.length}
                            </span>
                        </button>

                        <button
                            onClick={() => handleSwitchSection('history')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentSection === 'history'
                                    ? 'bg-[#00B074] text-white shadow-lg shadow-[#00B074]/20'
                                    : 'bg-[#0A0D15] text-gray-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.04]'
                            }`}
                        >
                            <History className="w-4 h-4" />
                            <span>İşlem Günlüğü</span>
                        </button>

                    </div>
                </div>

                {/* ========================================================= */}
                {/* SECTION 1: PAKET KATALOĞU (PLANS) */}
                {/* ========================================================= */}
                {currentSection === 'plans' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map((plan) => {
                                const isBusiness = plan.type === 'business';
                                const isExtra = plan.type === 'extra';

                                return (
                                    <div
                                        key={plan.id}
                                        className={`bg-[#0A0D15] border rounded-2xl p-6 transition-all relative flex flex-col justify-between group shadow-xl shadow-black/20 ${
                                            plan.is_active
                                                ? isBusiness
                                                    ? 'border-indigo-500/30 hover:border-indigo-500/60'
                                                    : isExtra
                                                    ? 'border-amber-500/30 hover:border-amber-500/60'
                                                    : 'border-white/[0.08] hover:border-[#00B074]/50'
                                                : 'border-white/[0.05] opacity-60'
                                        }`}
                                    >
                                        <div className="space-y-4">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            isBusiness
                                                                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                                                : isExtra
                                                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                                : 'bg-[#00B074]/15 text-[#00B074] border border-[#00B074]/30'
                                                        }`}>
                                                            {plan.type_label}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-gray-500">
                                                            Sıra: {plan.sort_order}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">
                                                        {plan.name}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500 font-mono">
                                                        /{plan.slug}
                                                    </p>
                                                </div>

                                                {/* Active Toggle Switch */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleTogglePlan(plan)}
                                                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                                                        plan.is_active ? 'bg-emerald-500' : 'bg-white/[0.12]'
                                                    }`}
                                                    title={plan.is_active ? 'Satışta (Tıklayarak Pasif Yap)' : 'Pasif (Tıklayarak Aktif Yap)'}
                                                >
                                                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                                        plan.is_active ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                                </button>
                                            </div>

                                            {/* Quota Highlights */}
                                            <div className="p-4 rounded-xl bg-[#06080E] border border-white/[0.04] space-y-1">
                                                <div className="text-xs text-gray-400">Tahsis Edilen Kota</div>
                                                <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1.5">
                                                    <span>{plan.monthly_quota_gb.toLocaleString('tr-TR')}</span>
                                                    <span className="text-xs font-semibold text-gray-400">GB {isExtra ? 'Tek Seferlik' : '/ Ay'}</span>
                                                </div>
                                            </div>

                                            {/* Pricing Matrix */}
                                            <div className="space-y-1.5">
                                                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Fiyatlandırma Döngüsü</div>
                                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] flex justify-between">
                                                        <span className="text-gray-400">1 Ay:</span>
                                                        <span className="text-white font-bold">₺{Number(plan.price_1m).toFixed(2)}</span>
                                                    </div>
                                                    {!isExtra && (
                                                        <>
                                                            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] flex justify-between">
                                                                <span className="text-gray-400">3 Ay:</span>
                                                                <span className="text-white font-bold">₺{Number(plan.price_3m).toFixed(2)}</span>
                                                            </div>
                                                            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] flex justify-between">
                                                                <span className="text-gray-400">6 Ay:</span>
                                                                <span className="text-white font-bold">₺{Number(plan.price_6m).toFixed(2)}</span>
                                                            </div>
                                                            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] flex justify-between">
                                                                <span className="text-gray-400">12 Ay:</span>
                                                                <span className="text-white font-bold">₺{Number(plan.price_12m).toFixed(2)}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Feature Badges */}
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-gray-300 font-mono">
                                                    {plan.max_parallel_downloads === 0 ? '⚡ Limitsiz İndirme' : `${plan.max_parallel_downloads} Eşzamanlı İndirme`}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-gray-300 font-mono">
                                                    {plan.speed_limit_mbps ? `${plan.speed_limit_mbps} Mbps Limit` : '🚀 Limitsiz Hat'}
                                                </span>
                                                {plan.allow_vps_access ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold">
                                                        ✓ VPS/Datacenter İzni
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-gray-400">
                                                        Yalnızca Ev/Mobil IP
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                                            <span className="text-xs text-gray-400 font-mono">
                                                <strong className="text-white">{plan.subscriptions_count || 0}</strong> aktif abone
                                            </span>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleClonePlan(plan)}
                                                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
                                                    title="Paketi Klonla / Kopyala"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditPlan(plan)}
                                                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
                                                    title="Paketi Düzenle"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeletingPlan(plan);
                                                        setTargetPlanForDelete('none');
                                                    }}
                                                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                                    title="Paketi Sil"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* SECTION 2: KULLANICI KOTALARI (USERS) */}
                {/* ========================================================= */}
                {currentSection === 'users' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        
                        {/* Search & Server-Side Filter Controls */}
                        <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl shadow-black/20">
                            
                            {/* Search bar */}
                            <form onSubmit={handleUserSearchSubmit} className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    placeholder="Kullanıcı adı veya e-posta ile ara..."
                                    value={userSearchInput}
                                    onChange={(e) => setUserSearchInput(e.target.value)}
                                    className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl pl-10 pr-20 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 top-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                                >
                                    Ara
                                </button>
                            </form>

                            {/* Dropdown Filters */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <select
                                    value={filters?.user_plan || 'all'}
                                    onChange={(e) => handleUserFilterChange('user_plan', e.target.value)}
                                    className="bg-[#06080E] border border-white/[0.08] text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                                >
                                    <option value="all">Tüm Paketler</option>
                                    <option value="active_sub">Aktif Aboneler</option>
                                    <option value="no_sub">Aboneliği Olmayanlar</option>
                                    <option value="perpetual">Süresiz Kotalar</option>
                                    {plans.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filters?.user_quota || 'all'}
                                    onChange={(e) => handleUserFilterChange('user_quota', e.target.value)}
                                    className="bg-[#06080E] border border-white/[0.08] text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                                >
                                    <option value="all">Kota Doluluk: Tümü</option>
                                    <option value="over_80">%80+ Dolu</option>
                                    <option value="exhausted">Kotası Bitmiş (%100)</option>
                                </select>
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.02] border-b border-white/[0.04]">
                                        <tr>
                                            <th className="px-6 py-3.5 font-semibold">Kullanıcı</th>
                                            <th className="px-6 py-3.5 font-semibold">Aktif Paket & Ekstra</th>
                                            <th className="px-6 py-3.5 font-semibold">Kota Kullanımı</th>
                                            <th className="px-6 py-3.5 font-semibold">Hız Limiti</th>
                                            <th className="px-6 py-3.5 font-semibold">Bitiş Tarihi</th>
                                            <th className="px-6 py-3.5 font-semibold text-right">Yönetim</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {usersList.map((u) => {
                                            const pct = u.quota_percentage || 0;
                                            const progressColor = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400';

                                            return (
                                                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                                    
                                                    {/* User */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                                                                {u.name?.charAt(0).toUpperCase() || 'U'}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-white">{u.name}</div>
                                                                <div className="text-[11px] text-gray-400 font-mono">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Plan */}
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                u.has_active_sub 
                                                                    ? u.is_perpetual 
                                                                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                                                        : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                                                    : 'bg-white/[0.04] text-gray-400'
                                                            }`}>
                                                                {u.is_perpetual && <Infinity className="w-3 h-3" />}
                                                                <span>{u.plan_name}</span>
                                                            </span>

                                                            {u.has_extras && (
                                                                <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                                                                    <Sparkles className="w-3 h-3 shrink-0" />
                                                                    <span>+{u.extra_quota_formatted} Ek Kota ({u.active_extras_count})</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Quota Progress */}
                                                    <td className="px-6 py-4 min-w-[200px]">
                                                        {u.has_any_package ? (
                                                            <div className="space-y-1.5">
                                                                <div className="flex justify-between text-[11px] font-mono">
                                                                    <span className="text-gray-300 font-medium">{u.quota_used} / {u.quota_total}</span>
                                                                    <span className="font-bold text-gray-200">%{pct}</span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                                                                    <div className={`h-full ${progressColor} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-500 font-mono text-[11px]">- Paket Tanımsız -</span>
                                                        )}
                                                    </td>

                                                    {/* Speed Limit */}
                                                    <td className="px-6 py-4">
                                                        {u.custom_speed_limit_mbps ? (
                                                            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                                                                {u.custom_speed_limit_mbps} Mbps (Özel)
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-[11px] font-mono">Standart Hat</span>
                                                        )}
                                                    </td>

                                                    {/* Expiration */}
                                                    <td className="px-6 py-4 font-mono text-[11px] text-gray-300">
                                                        {u.expires_at || '-'}
                                                    </td>

                                                    {/* Operations */}
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            
                                                            {/* Assign / Change Plan */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenAssignModal(u)}
                                                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                                                                title="Kota / Paket Değiştir"
                                                            >
                                                                <Sliders className="w-3 h-3" />
                                                                <span>Kota Ata</span>
                                                            </button>

                                                            {/* Direct Extra Quota */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setExtraQuotaModalUser(u);
                                                                    setExtraQuotaForm({
                                                                        quota_gb: 200,
                                                                        days: 30,
                                                                        name: `${u.name} Özel Ek Kota`,
                                                                        notes: '',
                                                                    });
                                                                }}
                                                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-amber-400 transition-colors"
                                                                title="Anlık Ek Kota Tanımla (+GB)"
                                                            >
                                                                <Zap className="w-3.5 h-3.5" />
                                                            </button>

                                                            {/* Extend Duration */}
                                                            {u.has_active_sub && !u.is_perpetual && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setExtendDurationUser(u);
                                                                        setExtendDurationDays(30);
                                                                    }}
                                                                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-indigo-400 transition-colors"
                                                                    title="Süre Uzat (+Gün)"
                                                                >
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}

                                                            {/* Reset Usage */}
                                                            {u.has_active_sub && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleResetUserUsage(u)}
                                                                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
                                                                    title="Harcanan Kotayı Sıfırla"
                                                                >
                                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}

                                                            {/* Jellyfin Sync */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSyncMediaAccount(u)}
                                                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sky-400 transition-colors"
                                                                title="Jellyfin/Emby Hesabını Eşitle"
                                                            >
                                                                <Tv className="w-3.5 h-3.5" />
                                                            </button>

                                                            {/* Cancel / Remove Plan */}
                                                            {u.has_any_package && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveUserPlan(u)}
                                                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                                                    title="Paketi ve Kotaları Kaldır"
                                                                >
                                                                    <UserX className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}

                                                        </div>
                                                    </td>

                                                </tr>
                                            );
                                        })}

                                        {usersList.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                    Kriterlere uygun kullanıcı hesabı bulunamadı.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
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

                    </div>
                )}

                {/* ========================================================= */}
                {/* SECTION 3: ÖDEME BİLDİRİMLERİ (NOTIFICATIONS) */}
                {/* ========================================================= */}
                {currentSection === 'notifications' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        
                        {/* Status Filters */}
                        <div className="flex items-center justify-between gap-4 flex-wrap bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-4 shadow-xl shadow-black/20">
                            <div className="flex items-center gap-1 bg-[#06080E] p-1 rounded-xl border border-white/[0.08] text-xs">
                                <button
                                    onClick={() => handleNotifFilterChange('all')}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                                        (filters?.notif_status || 'all') === 'all'
                                            ? 'bg-[#00B074] text-white shadow-sm'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Tümü
                                </button>
                                <button
                                    onClick={() => handleNotifFilterChange('pending')}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                                        filters?.notif_status === 'pending'
                                            ? 'bg-amber-500 text-black font-black shadow-sm'
                                            : 'text-amber-400 hover:text-amber-300'
                                    }`}
                                >
                                    <span>Bekleyenler</span>
                                    {(stats?.pendingNotificationsCount ?? 0) > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                                            {stats.pendingNotificationsCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleNotifFilterChange('approved')}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                                        filters?.notif_status === 'approved'
                                            ? 'bg-[#00B074] text-white shadow-sm'
                                            : 'text-emerald-400 hover:text-white'
                                    }`}
                                >
                                    Onaylananlar
                                </button>
                                <button
                                    onClick={() => handleNotifFilterChange('rejected')}
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
                                    value={notifSearchInput}
                                    onChange={(e) => setNotifSearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            router.get('/admin/plans', {
                                                ...filters,
                                                tab: 'notifications',
                                                notif_search: notifSearchInput,
                                                notifs_page: 1,
                                            }, { preserveState: true, preserveScroll: true });
                                        }
                                    }}
                                    className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Notifications Table */}
                        <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.02] border-b border-white/[0.04]">
                                        <tr>
                                            <th className="px-6 py-3.5 font-semibold">Ref & Tarih</th>
                                            <th className="px-6 py-3.5 font-semibold">Kullanıcı</th>
                                            <th className="px-6 py-3.5 font-semibold">Paket & Yükseltme</th>
                                            <th className="px-6 py-3.5 font-semibold">Ödeme & Tutar</th>
                                            <th className="px-6 py-3.5 font-semibold">Gönderen / Dekont No</th>
                                            <th className="px-6 py-3.5 font-semibold">Durum</th>
                                            <th className="px-6 py-3.5 font-semibold text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {notifsList.map((pn) => (
                                            <tr key={pn.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-mono font-bold text-white text-[11px]">{pn.reference_code}</div>
                                                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">{pn.created_at}</div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white">{pn.user_name}</div>
                                                    <div className="text-[11px] text-gray-400 font-mono">{pn.user_email}</div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-white">{pn.plan_name}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono">
                                                        {pn.duration_months} Ay {pn.is_upgrade && <span className="text-amber-400 font-bold">(Yükseltme)</span>}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="font-black text-emerald-400 font-mono text-sm">{pn.formatted_amount}</div>
                                                    <div className="text-[10px] text-gray-400">{pn.method_name}</div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="text-gray-200 font-medium">{pn.sender_name || '-'}</div>
                                                    {pn.tx_hash && (
                                                        <div className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]" title={pn.tx_hash}>
                                                            {pn.tx_hash}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4">
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

                                                <td className="px-6 py-4 text-right">
                                                    {pn.status === 'pending' ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleApproveNotification(pn)}
                                                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span>Onayla</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRejectNotification(pn)}
                                                                className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all"
                                                            >
                                                                <span>Reddet</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-gray-500 font-mono">
                                                            {pn.processed_at}
                                                        </span>
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
                )}

                {/* ========================================================= */}
                {/* SECTION 4: ÖDEME YÖNTEMLERİ (METHODS) */}
                {/* ========================================================= */}
                {currentSection === 'methods' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paymentMethods.map((method) => (
                                <div
                                    key={method.id}
                                    className={`bg-[#0A0D15] border rounded-2xl p-6 transition-all relative flex flex-col justify-between shadow-xl shadow-black/20 ${
                                        method.is_active ? 'border-white/[0.08] hover:border-[#00B074]/50' : 'border-white/[0.04] opacity-60'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-emerald-400 font-mono font-bold">
                                                    <Coins className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-base">{method.name}</h3>
                                                    <span className="text-[10px] text-gray-500 font-mono">Driver: {method.driver}</span>
                                                </div>
                                            </div>

                                            {/* Toggle Switch */}
                                            <button
                                                type="button"
                                                onClick={() => handleTogglePaymentMethod(method)}
                                                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                                                    method.is_active ? 'bg-emerald-500' : 'bg-white/[0.12]'
                                                }`}
                                                title={method.is_active ? 'Aktif (Tıklayarak Kapat)' : 'Pasif (Tıklayarak Aç)'}
                                            >
                                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                                    method.is_active ? 'translate-x-5' : 'translate-x-0'
                                                }`} />
                                            </button>
                                        </div>

                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            {method.description || 'Ödeme yöntemi açıklaması bulunmuyor.'}
                                        </p>

                                        {method.instructions && (
                                            <div className="p-3 rounded-xl bg-[#06080E] border border-white/[0.04] text-[11px] text-gray-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
                                                {method.instructions}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                                        <span className={`text-[11px] font-bold ${method.is_active ? 'text-emerald-400' : 'text-gray-500'}`}>
                                            ● {method.is_active ? 'Aktif (Kullanımda)' : 'Pasif'}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditMethod(method)}
                                            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
                                        >
                                            <Edit3 className="w-3 h-3" />
                                            <span>Düzenle</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* SECTION 5: İŞLEM GEÇMİŞİ (HISTORY) */}
                {/* ========================================================= */}
                {currentSection === 'history' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        
                        {/* Filters */}
                        <div className="flex items-center justify-between gap-4 flex-wrap bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-4 shadow-xl shadow-black/20">
                            <div className="flex items-center gap-1 bg-[#06080E] p-1 rounded-xl border border-white/[0.08] text-xs">
                                <button
                                    onClick={() => handleHistoryFilterChange('all')}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                                        (filters?.history_status || 'all') === 'all'
                                            ? 'bg-[#00B074] text-white shadow-sm'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Tümü
                                </button>
                                <button
                                    onClick={() => handleHistoryFilterChange('active')}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                                        filters?.history_status === 'active'
                                            ? 'bg-[#00B074] text-white shadow-sm'
                                            : 'text-emerald-400 hover:text-white'
                                    }`}
                                >
                                    Aktif
                                </button>
                                <button
                                    onClick={() => handleHistoryFilterChange('cancelled')}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                                        filters?.history_status === 'cancelled'
                                            ? 'bg-[#00B074] text-white shadow-sm'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    İptal Edilenler
                                </button>
                                <button
                                    onClick={() => handleHistoryFilterChange('expired')}
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
                                    value={historySearchInput}
                                    onChange={(e) => setHistorySearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            router.get('/admin/plans', {
                                                ...filters,
                                                tab: 'history',
                                                history_search: historySearchInput,
                                                history_page: 1,
                                            }, { preserveState: true, preserveScroll: true });
                                        }
                                    }}
                                    className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* History Table */}
                        <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.02] border-b border-white/[0.04]">
                                        <tr>
                                            <th className="px-6 py-3.5 font-semibold">ID</th>
                                            <th className="px-6 py-3.5 font-semibold">Kullanıcı</th>
                                            <th className="px-6 py-3.5 font-semibold">Paket</th>
                                            <th className="px-6 py-3.5 font-semibold">Döngü & Tutar</th>
                                            <th className="px-6 py-3.5 font-semibold">Başlangıç - Bitiş</th>
                                            <th className="px-6 py-3.5 font-semibold">Durum</th>
                                            <th className="px-6 py-3.5 font-semibold">Notlar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {historyList.map((sub) => (
                                            <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 font-mono text-gray-500 text-[11px]">#{sub.id}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white">{sub.user_name}</div>
                                                    <div className="text-[11px] text-gray-400 font-mono">{sub.user_email}</div>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-white">
                                                    {sub.plan_name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-emerald-400 font-mono">{sub.formatted_price}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono">
                                                        {sub.is_perpetual ? 'Süresiz' : `${sub.duration_months} Ay`}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-[11px] text-gray-300">
                                                    <div>{sub.starts_at}</div>
                                                    <div className="text-gray-500">Bitiş: {sub.expires_at}</div>
                                                </td>
                                                <td className="px-6 py-4">
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
                                                <td className="px-6 py-4 text-gray-400 text-[11px] max-w-xs truncate" title={sub.notes}>
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
                )}

            </div>

            {/* ========================================================= */}
            {/* MODAL 1: CREATE / EDIT PLAN MODAL */}
            {/* ========================================================= */}
            {isCreatePlanOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl shadow-black/80 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-emerald-400" />
                                <span>{editingPlan ? `Paketi Düzenle: ${editingPlan.name}` : 'Yeni İndirme Paketi Oluştur'}</span>
                            </h2>
                            <button onClick={() => setIsCreatePlanOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Paket Adı</label>
                                    <input
                                        type="text"
                                        required
                                        value={planForm.name}
                                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                                        placeholder="Örn: Pro VIP 1 TB"
                                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Paket Tipi</label>
                                    <select
                                        value={planForm.type}
                                        onChange={(e) => setPlanForm({ ...planForm, type: e.target.value })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
                                    >
                                        <option value="individual">Bireysel Paket (Aylık Yenilenen)</option>
                                        <option value="business">Business / VIP Paket (Limitsiz İndirme & VPS İzni)</option>
                                        <option value="extra">Ek Kota Paketi (30 Gün Geçerli Tek Seferlik)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Kota Miktarı (GB)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={planForm.monthly_quota_gb}
                                        onChange={(e) => setPlanForm({ ...planForm, monthly_quota_gb: Number(e.target.value) })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Sıralama Önceliği</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={planForm.sort_order}
                                        onChange={(e) => setPlanForm({ ...planForm, sort_order: Number(e.target.value) })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                                    />
                                </div>
                            </div>

                            {/* Pricing Grid */}
                            <div className="p-4 rounded-xl bg-[#06080E] border border-white/[0.06] space-y-3">
                                <label className="block text-xs font-bold text-emerald-400">Abonelik Döngüsü Fiyatlandırması (₺)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <span className="text-[10px] text-gray-400">1 Ay Fiyatı</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={planForm.price_1m}
                                            onChange={(e) => setPlanForm({ ...planForm, price_1m: e.target.value })}
                                            className="w-full bg-[#0A0D15] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono mt-1"
                                        />
                                    </div>
                                    {planForm.type !== 'extra' && (
                                        <>
                                            <div>
                                                <span className="text-[10px] text-gray-400">3 Ay Fiyatı</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={planForm.price_3m}
                                                    onChange={(e) => setPlanForm({ ...planForm, price_3m: e.target.value })}
                                                    className="w-full bg-[#0A0D15] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono mt-1"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-400">6 Ay Fiyatı</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={planForm.price_6m}
                                                    onChange={(e) => setPlanForm({ ...planForm, price_6m: e.target.value })}
                                                    className="w-full bg-[#0A0D15] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono mt-1"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-400">12 Ay Fiyatı</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={planForm.price_12m}
                                                    onChange={(e) => setPlanForm({ ...planForm, price_12m: e.target.value })}
                                                    className="w-full bg-[#0A0D15] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono mt-1"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Speed & Concurrency & VPS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Eşzamanlı İndirme Sınırı (0 = Limitsiz)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={planForm.max_parallel_downloads}
                                        onChange={(e) => setPlanForm({ ...planForm, max_parallel_downloads: Number(e.target.value) })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Hız Limiti Mbps (Boş = Limitsiz Hat)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Limitsiz için boş bırakın"
                                        value={planForm.speed_limit_mbps}
                                        onChange={(e) => setPlanForm({ ...planForm, speed_limit_mbps: e.target.value })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={planForm.allow_vps_access}
                                        onChange={(e) => setPlanForm({ ...planForm, allow_vps_access: e.target.checked })}
                                        className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-[#06080E] border-white/20"
                                    />
                                    <span>VPS / Datacenter IP İndirmesine İzin Ver</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={planForm.is_active}
                                        onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                                        className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-[#06080E] border-white/20"
                                    />
                                    <span>Paket Satışta (Aktif)</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatePlanOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-gray-300"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingPlan}
                                    className="px-5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-xs font-bold text-white shadow-lg shadow-[#00B074]/20"
                                >
                                    {isSubmittingPlan ? 'Kaydediliyor...' : (editingPlan ? 'Değişiklikleri Güncelle' : 'Paketi Kaydet')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 2: DELETE PLAN MODAL WITH TRANSFER */}
            {/* ========================================================= */}
            {deletingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl shadow-black/80">
                        <div className="flex items-start gap-3">
                            <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400 shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Paketi Sil: {deletingPlan.name}</h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Bu paketi silmek istediğinize emin misiniz? Kayıtlı aboneleri başka bir pakete transfer edebilirsiniz.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-300">
                                Aktif Aboneler İçin Transfer Hedefi:
                            </label>
                            <select
                                value={targetPlanForDelete}
                                onChange={(e) => setTargetPlanForDelete(e.target.value)}
                                className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                            >
                                <option value="none">Abonelikleri İptal Et (Paketsiz / Free Yap)</option>
                                {plans.filter(p => p.id !== deletingPlan.id).map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} Paketine Transfer Et
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeletingPlan(null)}
                                className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-gray-300"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeletePlan}
                                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
                            >
                                Paketi Kalıcı Olarak Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 3: ASSIGN PLAN / QUOTA MODAL */}
            {/* ========================================================= */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-white/[0.1] rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl shadow-black/80 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-emerald-400" />
                                <span>{assignModalUser ? `${assignModalUser.name} - Kota & Paket Ata` : 'Kullanıcıya Kota / Paket Tanımla'}</span>
                            </h2>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAssign} className="space-y-4">
                            {!assignModalUser && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Hedef Kullanıcı ID</label>
                                    <input
                                        type="number"
                                        required
                                        value={assignForm.user_id}
                                        onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
                                        placeholder="Kullanıcı ID girin..."
                                        className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Tanımlanacak Paket</label>
                                <select
                                    value={assignForm.plan_id}
                                    onChange={(e) => setAssignForm({ ...assignForm, plan_id: e.target.value })}
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
                                >
                                    <option value="custom">Özel Boyutlu İndirme Kotası (GB)</option>
                                    <option value="none">Paketi Kaldır (Paketsiz Yap)</option>
                                    {plans.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.monthly_quota_gb} GB - {p.type_label})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {(assignForm.plan_id === 'custom' || !assignForm.plan_id) && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Özel Kota Miktarı (GB)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={assignForm.custom_quota_gb}
                                        onChange={(e) => setAssignForm({ ...assignForm, custom_quota_gb: Number(e.target.value) })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Süre / Döngü</label>
                                    <select
                                        value={assignForm.duration_type}
                                        onChange={(e) => setAssignForm({ ...assignForm, duration_type: e.target.value })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white cursor-pointer"
                                    >
                                        <option value="1">1 Ay</option>
                                        <option value="3">3 Ay</option>
                                        <option value="6">6 Ay</option>
                                        <option value="12">12 Ay (1 Yıl)</option>
                                        <option value="perpetual">Süresiz (Ömür Boyu)</option>
                                        <option value="custom">Özel Ay Sayısı</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Özel Hız Limiti Mbps (Opsiyonel)</label>
                                    <input
                                        type="number"
                                        placeholder="Standart hat için boş"
                                        value={assignForm.custom_speed_limit_mbps}
                                        onChange={(e) => setAssignForm({ ...assignForm, custom_speed_limit_mbps: e.target.value })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                                    />
                                </div>
                            </div>

                            {assignForm.duration_type === 'custom' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Ay Sayısı</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="120"
                                        value={assignForm.custom_months}
                                        onChange={(e) => setAssignForm({ ...assignForm, custom_months: Number(e.target.value) })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Admin Notu</label>
                                <input
                                    type="text"
                                    value={assignForm.notes}
                                    onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                                    placeholder="Örn: Kampanya kapsamında tanımlandı"
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-gray-300"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingAssign}
                                    className="px-5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-xs font-bold text-white shadow-lg shadow-[#00B074]/20"
                                >
                                    {isSubmittingAssign ? 'Tanımlanıyor...' : 'Kotayı Tanımla'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 4: DIRECT EXTRA QUOTA MODAL */}
            {/* ========================================================= */}
            {extraQuotaModalUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl shadow-black/80">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-400" />
                                <span>Anlık Ek Kota Ekle (+GB)</span>
                            </h3>
                            <button onClick={() => setExtraQuotaModalUser(null)} className="text-gray-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-400">
                            <strong>{extraQuotaModalUser.name}</strong> kullanıcısına mevcut paketinden bağımsız, belirlenen gün süresince geçerli ek indirme kotası tanımlayın.
                        </p>

                        <form onSubmit={handleSaveExtraQuota} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Kota Miktarı (GB)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={extraQuotaForm.quota_gb}
                                        onChange={(e) => setExtraQuotaForm({ ...extraQuotaForm, quota_gb: Number(e.target.value) })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Geçerlilik (Gün)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        required
                                        value={extraQuotaForm.days}
                                        onChange={(e) => setExtraQuotaForm({ ...extraQuotaForm, days: Number(e.target.value) })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Ek Kota Tanım Adı</label>
                                <input
                                    type="text"
                                    value={extraQuotaForm.name}
                                    onChange={(e) => setExtraQuotaForm({ ...extraQuotaForm, name: e.target.value })}
                                    placeholder="Örn: Telafi Ek Kotası"
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => setExtraQuotaModalUser(null)}
                                    className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-gray-300"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingExtraQuota}
                                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20"
                                >
                                    {isSubmittingExtraQuota ? 'Ekleniyor...' : 'Ek Kotayı Ekle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 5: EXTEND DURATION MODAL */}
            {/* ========================================================= */}
            {extendDurationUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-indigo-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl shadow-black/80">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-400" />
                                <span>Abonelik Süresini Uzat</span>
                            </h3>
                            <button onClick={() => setExtendDurationUser(null)} className="text-gray-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-400">
                            <strong>{extendDurationUser.name}</strong> kullanıcısının aktif aboneliğinin bitiş tarihine gün ilave edin.
                        </p>

                        <form onSubmit={handleSaveExtendDuration} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Eklenecek Gün Sayısı</label>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {[7, 15, 30, 90].map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setExtendDurationDays(d)}
                                            className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                                                extendDurationDays === d ? 'bg-indigo-600 text-white' : 'bg-white/[0.04] text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            +{d} Gün
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max="3650"
                                    required
                                    value={extendDurationDays}
                                    onChange={(e) => setExtendDurationDays(Number(e.target.value))}
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Açıklama / Not</label>
                                <input
                                    type="text"
                                    value={extendDurationNotes}
                                    onChange={(e) => setExtendDurationNotes(e.target.value)}
                                    placeholder="Örn: Sunucu bakım telafisi"
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => setExtendDurationUser(null)}
                                    className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-gray-300"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingExtend}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20"
                                >
                                    {isSubmittingExtend ? 'Uzatılıyor...' : 'Süreyi Uzat'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 6: EDIT PAYMENT METHOD MODAL */}
            {/* ========================================================= */}
            {editingMethod && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl shadow-black/80 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Coins className="w-5 h-5 text-emerald-400" />
                                <span>Ödeme Yöntemini Düzenle: {editingMethod.name}</span>
                            </h3>
                            <button onClick={() => setEditingMethod(null)} className="text-gray-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePaymentMethod} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Görünen Ad</label>
                                <input
                                    type="text"
                                    required
                                    value={methodForm.name}
                                    onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Kısa Açıklama</label>
                                <input
                                    type="text"
                                    value={methodForm.description}
                                    onChange={(e) => setMethodForm({ ...methodForm, description: e.target.value })}
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">
                                    Havale / IBAN / Cüzdan Talimatları (Kullanıcıya Gösterilir)
                                </label>
                                <textarea
                                    rows={5}
                                    value={methodForm.instructions}
                                    onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })}
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl p-3 text-xs text-white font-mono leading-relaxed"
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={methodForm.is_active}
                                    onChange={(e) => setMethodForm({ ...methodForm, is_active: e.target.checked })}
                                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-[#06080E] border-white/20"
                                />
                                <span>Bu Ödeme Yöntemi Aktif (Kullanıcılara Göster)</span>
                            </label>

                            <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => setEditingMethod(null)}
                                    className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-gray-300"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingMethod}
                                    className="px-5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs shadow-lg shadow-[#00B074]/20"
                                >
                                    {isSubmittingMethod ? 'Kaydediliyor...' : 'Yöntemi Güncelle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
