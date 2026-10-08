import React, { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../../../Components/AdminLayout';
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
    ToggleLeft,
    ToggleRight,
    Check,
    XCircle,
    BellRing,
    Gauge
} from 'lucide-react';

export default function PlansIndex({ 
    plans = [], 
    users = [], 
    subscriptionsHistory = [],
    paymentMethods = [],
    paymentNotifications = []
}) {
    const { flash } = usePage().props;

    // Main section tabs: 'plans' | 'users' | 'history' | 'methods' | 'notifications'
    const [activeSection, setActiveSection] = useState('plans');

    // Search and filters
    const [planSearch, setPlanSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userPlanFilter, setUserPlanFilter] = useState('all');
    const [historySearch, setHistorySearch] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
    const [notificationStatusFilter, setNotificationStatusFilter] = useState('pending');

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

    // Initial plan form state
    const initialPlanForm = {
        name: '',
        slug: '',
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

    // Helper to toggle allowed duration in plan form
    const toggleAllowedDuration = (months) => {
        const current = planForm.allowed_durations || [1, 3, 6, 12];
        if (current.includes(months)) {
            if (current.length <= 1) return; // Prevent unchecking all
            setPlanForm({ ...planForm, allowed_durations: current.filter(m => m !== months) });
        } else {
            setPlanForm({ ...planForm, allowed_durations: [...current, months].sort((a, b) => a - b) });
        }
    };

    // Initial user assignment form state
    const initialAssignForm = {
        user_id: '',
        plan_id: 'custom', // plan ID or 'custom' or 'none'
        custom_quota_gb: 500,
        custom_speed_limit_mbps: '',
        duration_type: '1', // '1', '3', '6', '12', 'custom', 'perpetual'
        custom_months: 1,
        price_paid: '',
        notes: '',
    };
    const [assignForm, setAssignForm] = useState(initialAssignForm);
    const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

    // Statistics calculation
    const stats = useMemo(() => {
        const activePlansCount = plans.filter(p => p.is_active).length;
        const totalSubscribedUsers = users.filter(u => u.has_active_sub).length;
        const perpetualUsersCount = users.filter(u => u.is_perpetual).length;

        let totalAllocatedGb = 0;
        users.forEach(u => {
            if (u.has_active_sub && u.quota_allocated_bytes) {
                totalAllocatedGb += Math.round(u.quota_allocated_bytes / (1024 * 1024 * 1024));
            }
        });

        return {
            activePlansCount,
            totalSubscribedUsers,
            perpetualUsersCount,
            totalAllocatedGb,
        };
    }, [plans, users]);

    // Filtered plans
    const filteredPlans = useMemo(() => {
        return plans.filter(p =>
            p.name.toLowerCase().includes(planSearch.toLowerCase()) ||
            p.slug.toLowerCase().includes(planSearch.toLowerCase())
        );
    }, [plans, planSearch]);

    // Filtered users
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch =
                u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                u.email.toLowerCase().includes(userSearch.toLowerCase());

            let matchesPlan = true;
            if (userPlanFilter === 'active_sub') {
                matchesPlan = u.has_active_sub;
            } else if (userPlanFilter === 'no_sub') {
                matchesPlan = !u.has_active_sub;
            } else if (userPlanFilter === 'perpetual') {
                matchesPlan = u.is_perpetual;
            } else if (userPlanFilter !== 'all') {
                matchesPlan = String(u.plan_id) === String(userPlanFilter);
            }

            return matchesSearch && matchesPlan;
        });
    }, [users, userSearch, userPlanFilter]);

    // Filtered subscription transaction history
    const filteredHistory = useMemo(() => {
        return subscriptionsHistory.filter(h => {
            const matchesSearch =
                (h.user_name && h.user_name.toLowerCase().includes(historySearch.toLowerCase())) ||
                (h.user_email && h.user_email.toLowerCase().includes(historySearch.toLowerCase())) ||
                (h.plan_name && h.plan_name.toLowerCase().includes(historySearch.toLowerCase())) ||
                (h.notes && h.notes.toLowerCase().includes(historySearch.toLowerCase()));

            const matchesStatus = historyStatusFilter === 'all' || h.status === historyStatusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [subscriptionsHistory, historySearch, historyStatusFilter]);

    // Total revenue calculation
    const totalRevenue = useMemo(() => {
        return subscriptionsHistory.reduce((sum, item) => sum + (item.price_paid || 0), 0);
    }, [subscriptionsHistory]);

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
            description: plan.description || '',
            monthly_quota_gb: plan.monthly_quota_gb || 100,
            price_1m: plan.price_1m || 0,
            price_3m: plan.price_3m || 0,
            price_6m: plan.price_6m || 0,
            price_12m: plan.price_12m || 0,
            allowed_durations: plan.allowed_durations || [1, 3, 6, 12],
            max_parallel_downloads: plan.max_parallel_downloads || 4,
            speed_limit_mbps: plan.speed_limit_mbps || '',
            allow_vps_access: Boolean(plan.allow_vps_access),
            is_active: Boolean(plan.is_active),
            sort_order: plan.sort_order || 0,
        });
        setIsCreatePlanOpen(true);
    };

    // Submit Plan Form (Create / Edit)
    const handleSavePlan = (e) => {
        e.preventDefault();
        setIsSubmittingPlan(true);

        if (editingPlan) {
            router.put(`/admin/plans/${editingPlan.id}`, planForm, {
                onSuccess: () => {
                    setIsCreatePlanOpen(false);
                    setEditingPlan(null);
                },
                onFinish: () => setIsSubmittingPlan(false),
            });
        } else {
            router.post('/admin/plans', planForm, {
                onSuccess: () => {
                    setIsCreatePlanOpen(false);
                },
                onFinish: () => setIsSubmittingPlan(false),
            });
        }
    };

    // Pending payment notifications count
    const pendingNotificationsCount = useMemo(() => {
        return paymentNotifications.filter(n => n.status === 'pending').length;
    }, [paymentNotifications]);

    // Filtered payment notifications
    const filteredNotifications = useMemo(() => {
        return paymentNotifications.filter(n => {
            if (notificationStatusFilter === 'all') return true;
            return n.status === notificationStatusFilter;
        });
    }, [paymentNotifications, notificationStatusFilter]);

    // Toggle Payment Method Active State
    const handleToggleMethod = (method) => {
        router.post(`/admin/payment-methods/${method.id}/toggle`, {}, {
            preserveScroll: true,
        });
    };

    // Open Payment Method Edit Modal
    const handleOpenEditMethod = (method) => {
        setEditingMethod(method);
        setMethodForm({
            name: method.name || '',
            description: method.description || '',
            instructions: method.instructions || '',
            is_active: Boolean(method.is_active),
            settings: method.settings ? { ...method.settings } : {},
        });
    };

    // Save Payment Method Edit Form
    const handleSaveMethod = (e) => {
        e.preventDefault();
        if (!editingMethod) return;

        setIsSubmittingMethod(true);
        router.put(`/admin/payment-methods/${editingMethod.id}`, methodForm, {
            preserveScroll: true,
            onSuccess: () => setEditingMethod(null),
            onFinish: () => setIsSubmittingMethod(false),
        });
    };

    // Approve Payment Notification
    const handleApproveNotification = (notification) => {
        if (window.confirm(`#${notification.reference_code} referanslı ödemeyi onaylamak ve kullanıcının paketini tanımlamak istediğinize emin misiniz?`)) {
            router.post(`/admin/payment-notifications/${notification.id}/approve`, {}, {
                preserveScroll: true,
            });
        }
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

    // Confirm Plan Delete
    const handleConfirmDeletePlan = () => {
        if (!deletingPlan) return;
        setIsSubmittingPlan(true);

        router.delete(`/admin/plans/${deletingPlan.id}`, {
            data: { target_plan_id: targetPlanForDelete },
            onSuccess: () => {
                setDeletingPlan(null);
                setTargetPlanForDelete('none');
            },
            onFinish: () => setIsSubmittingPlan(false),
        });
    };

    // Open Assign Modal for specific user or generic
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
            setAssignForm({
                ...initialAssignForm,
                user_id: users.length > 0 ? users[0].id : '',
                plan_id: plans.length > 0 ? String(plans[0].id) : 'custom',
            });
        }
        setIsAssignModalOpen(true);
    };

    // Submit User Plan / Quota Assignment
    const handleSaveAssignment = (e) => {
        e.preventDefault();
        setIsSubmittingAssign(true);

        router.post('/admin/plans/users/assign', assignForm, {
            onSuccess: () => {
                setIsAssignModalOpen(false);
            },
            onFinish: () => setIsSubmittingAssign(false),
        });
    };

    // Remove plan from user directly
    const handleRemoveUserPlan = (user) => {
        if (window.confirm(`${user.name} kullanıcısının paket ve kotasını kaldırmak istediğinize emin misiniz?`)) {
            router.post(`/admin/plans/users/${user.id}/remove`);
        }
    };

    return (
        <AdminLayout
            title="Paket & Kota Yönetimi"
            subtitle="Sistem abonelik paketlerini tanımlayın, indirme kotası limitlerini yapılandırın ve kullanıcılara süreli/süresiz özel kotalar atayın."
            activeTab="plans"
            statsSummary={{ total_plans: plans.length }}
            headerActions={
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenCreatePlan}
                        className="px-4 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-semibold text-xs transition-all shadow-lg shadow-[#00B074]/20 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Yeni Paket Ekle</span>
                    </button>
                    <button
                        onClick={() => handleOpenAssignModal()}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white font-semibold text-xs transition-all flex items-center gap-2"
                    >
                        <UserCheck className="w-4 h-4 text-[#00B074]" />
                        <span>Kullanıcıya Kota Tanımla</span>
                    </button>
                </div>
            }
        >
            <div className="space-y-6">

                {/* Flash Notification */}
                {flash?.success && (
                    <div className="p-4 rounded-2xl bg-[#00B074]/15 border border-[#00B074]/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-5 h-5 text-[#00B074] shrink-0" />
                            <span>{flash.success}</span>
                        </div>
                    </div>
                )}

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#0D111A] border border-white/[0.08] p-5 rounded-2xl flex items-center justify-between group hover:border-[#00B074]/40 transition-all">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Aktif Paketler</p>
                            <h3 className="text-2xl font-black text-white">{stats.activePlansCount} <span className="text-xs font-normal text-gray-500">/ {plans.length} Toplam</span></h3>
                        </div>
                        <div className="p-3 rounded-xl bg-[#00B074]/10 text-[#00B074] border border-[#00B074]/20">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-[#0D111A] border border-white/[0.08] p-5 rounded-2xl flex items-center justify-between group hover:border-blue-500/40 transition-all">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Aktif Aboneler</p>
                            <h3 className="text-2xl font-black text-white">{stats.totalSubscribedUsers} Kullanıcı</h3>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-[#0D111A] border border-white/[0.08] p-5 rounded-2xl flex items-center justify-between group hover:border-emerald-500/40 transition-all">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Süresiz Kotalar</p>
                            <h3 className="text-2xl font-black text-emerald-400">{stats.perpetualUsersCount} <span className="text-xs font-normal text-gray-500">Kullanıcı</span></h3>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Infinity className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-[#0D111A] border border-white/[0.08] p-5 rounded-2xl flex items-center justify-between group hover:border-amber-500/40 transition-all">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Tanımlı İndirme Kotası</p>
                            <h3 className="text-2xl font-black text-amber-400">{stats.totalAllocatedGb.toLocaleString('tr-TR')} <span className="text-xs font-normal text-gray-500">GB</span></h3>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <HardDrive className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Section Selector Controls */}
                <div className="flex items-center justify-between bg-[#0D111A] p-2 rounded-2xl border border-white/[0.08]">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                            onClick={() => setActiveSection('plans')}
                            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                                activeSection === 'plans'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <Package className="w-4 h-4" />
                            <span>Paket Listesi ({plans.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveSection('users')}
                            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                                activeSection === 'users'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            <span>Kullanıcı Kota Listesi ({users.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveSection('history')}
                            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                                activeSection === 'history'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <History className="w-4 h-4" />
                            <span>Satın Alım & İşlem Geçmişi ({subscriptionsHistory.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveSection('methods')}
                            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                                activeSection === 'methods'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <Building2 className="w-4 h-4" />
                            <span>Ödeme Yöntemleri ({paymentMethods.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveSection('notifications')}
                            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                                activeSection === 'notifications'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <BellRing className="w-4 h-4" />
                            <span>Ödeme Bildirimleri ({paymentNotifications.length})</span>
                            {pendingNotificationsCount > 0 && (
                                <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-bold animate-pulse">
                                    {pendingNotificationsCount} Bekliyor
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* SECTION 1: ABONELİK PAKETLERİ (PLAN CARDS & MANAGEMENT) */}
                {activeSection === 'plans' && (
                    <div className="space-y-6">
                        {/* Search Toolbar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D111A] p-4 rounded-2xl border border-white/[0.08]">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Paket adına veya slug'a göre ara..."
                                    value={planSearch}
                                    onChange={(e) => setPlanSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B074] transition-colors"
                                />
                            </div>
                            <div className="text-xs text-gray-400 font-medium">
                                Toplam <strong className="text-white font-mono">{filteredPlans.length}</strong> paket gösteriliyor
                            </div>
                        </div>

                        {/* Plan Cards Grid */}
                        {filteredPlans.length === 0 ? (
                            <div className="p-12 text-center bg-[#0D111A] rounded-2xl border border-white/[0.08]">
                                <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <h3 className="text-base font-bold text-white mb-1">Henüz Paket Bulunmuyor</h3>
                                <p className="text-xs text-gray-400 mb-4">Sisteme henüz paket eklenmemiş veya aramanıza uygun paket bulunamadı.</p>
                                <button
                                    onClick={handleOpenCreatePlan}
                                    className="px-4 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold"
                                >
                                    + Yeni Paket Oluştur
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPlans.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={`relative bg-[#0D111A] rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-white/20 shadow-xl ${
                                            plan.is_active ? 'border-white/[0.08]' : 'border-white/[0.04] opacity-75'
                                        }`}
                                    >
                                        {/* Card Top Info */}
                                        <div className="p-6 border-b border-white/[0.06] relative bg-[#0A0D14]/40">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div>
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5 uppercase">
                                                        {plan.slug}
                                                    </span>
                                                    <h3 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2 tracking-tight">
                                                        {plan.name}
                                                    </h3>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                                    plan.is_active
                                                        ? 'bg-[#00B074]/15 border-[#00B074]/30 text-[#00B074]'
                                                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                                }`}>
                                                    {plan.is_active ? 'Aktif Paket' : 'Pasif'}
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-400 line-clamp-2 min-h-[32px]">
                                                {plan.description || 'Bu paket için açıklama belirtilmedi.'}
                                            </p>

                                            {/* Quota Feature Banner */}
                                            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-[#00B074]/15 to-emerald-950/20 border border-[#00B074]/30 flex items-center justify-between">
                                                <span className="text-xs text-gray-300 font-semibold">Aylık İndirme Kotası</span>
                                                <span className="text-base font-black text-emerald-400 font-mono">
                                                    {plan.monthly_quota_gb.toLocaleString('tr-TR')} GB
                                                </span>
                                            </div>
                                        </div>

                                        {/* Pricing & Limits Body */}
                                        <div className="p-6 space-y-4 flex-1">
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {(() => {
                                                    const allowed = plan.allowed_durations || [1, 3, 6, 12];
                                                    return [
                                                        { months: 1, label: '1 Aylık', price: plan.price_1m },
                                                        { months: 3, label: '3 Aylık', price: plan.price_3m },
                                                        { months: 6, label: '6 Aylık', price: plan.price_6m },
                                                        { months: 12, label: '12 Aylık', price: plan.price_12m },
                                                    ].map((item) => {
                                                        const isAllowed = allowed.includes(item.months);
                                                        return (
                                                            <div
                                                                key={item.months}
                                                                className={`p-2.5 rounded-xl border ${
                                                                    isAllowed
                                                                        ? 'bg-[#07090E] border-white/[0.06]'
                                                                        : 'bg-rose-950/10 border-rose-500/20 opacity-50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">
                                                                        {item.label}
                                                                    </span>
                                                                    {!isAllowed && (
                                                                        <span className="text-[9px] font-bold text-rose-400">Kapalı</span>
                                                                    )}
                                                                </div>
                                                                <span className={`text-sm font-bold ${isAllowed ? 'text-white' : 'text-gray-500 line-through'}`}>
                                                                    ₺{parseFloat(item.price || 0).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                            <div className="pt-2 border-t border-white/[0.06] space-y-2 text-xs text-gray-400">
                                                <div className="flex justify-between items-center">
                                                    <span>Eşzamanlı İndirme Limiti:</span>
                                                    <span className="text-white font-semibold font-mono">{plan.max_parallel_downloads} Bağlantı</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span>Hız Sınırı:</span>
                                                    <span className="text-white font-semibold">
                                                        {plan.speed_limit_mbps ? `${plan.speed_limit_mbps} Mbps` : 'Sınırsız / Tam Hız'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span>VPS / Sunucu IP İzni:</span>
                                                    <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                                                        plan.allow_vps_access
                                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                                    }`}>
                                                        {plan.allow_vps_access ? 'İzin Verildi' : 'Engellendi'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span>Kayıtlı Aktif Abone:</span>
                                                    <span className="text-[#00B074] font-bold font-mono">
                                                        {plan.subscriptions_count || 0} Kullanıcı
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Actions Footer */}
                                        <div className="p-4 bg-[#07090E] border-t border-white/[0.06] flex items-center justify-between gap-3">
                                            <button
                                                onClick={() => handleOpenEditPlan(plan)}
                                                className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                                                <span>Düzenle</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setDeletingPlan(plan);
                                                    setTargetPlanForDelete('none');
                                                }}
                                                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                                title="Paketi Sil"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Sil</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* SECTION 2: KULLANICI PAKET & KOTA LİSTESİ */}
                {activeSection === 'users' && (
                    <div className="space-y-6">
                        {/* Search & Filter Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D111A] p-4 rounded-2xl border border-white/[0.08]">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Kullanıcı adı veya e-posta ile ara..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B074] transition-colors"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <select
                                    value={userPlanFilter}
                                    onChange={(e) => setUserPlanFilter(e.target.value)}
                                    className="bg-[#07090E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00B074] transition-colors"
                                >
                                    <option value="all">Tüm Kullanıcılar ({users.length})</option>
                                    <option value="active_sub">Aktif Paketi Olanlar</option>
                                    <option value="perpetual">Süresiz Kotası Olanlar</option>
                                    <option value="no_sub">Paketi / Kotası Olmayanlar</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} Paketi</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="bg-[#0D111A] rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0A0D14] text-gray-400 border-b border-white/[0.06] uppercase text-[10px] tracking-wider font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Kullanıcı</th>
                                            <th className="px-6 py-4">Aktif Paket / Kota</th>
                                            <th className="px-6 py-4">Kota Kullanımı</th>
                                            <th className="px-6 py-4">Hız Limiti</th>
                                            <th className="px-6 py-4">Bitiş Tarihi</th>
                                            <th className="px-6 py-4 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                    Aramanıza veya filtrenize uygun kullanıcı bulunamadı.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00B074] to-emerald-600 flex items-center justify-center text-white font-black text-xs uppercase shadow-md shadow-[#00B074]/10">
                                                                {user.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-white flex items-center gap-2">
                                                                    <span>{user.name}</span>
                                                                    {user.role === 'admin' && (
                                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-mono font-bold">ADMIN</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[11px] text-gray-400">{user.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        {user.has_active_sub ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-3 py-1 rounded-xl bg-[#00B074]/15 border border-[#00B074]/30 text-[#00B074] font-bold text-xs flex items-center gap-1.5">
                                                                    <Sparkles className="w-3.5 h-3.5" />
                                                                    {user.plan_name}
                                                                </span>
                                                                {user.is_perpetual && (
                                                                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                                                        <Infinity className="w-3.5 h-3.5" /> Süresiz
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="px-3 py-1 rounded-xl bg-gray-800 text-gray-400 text-xs font-semibold">
                                                                Paket Yok / Ücretsiz
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        {user.has_active_sub ? (
                                                            <div className="w-48 space-y-1.5">
                                                                <div className="flex justify-between text-[11px]">
                                                                    <span className="text-gray-300 font-mono">{user.quota_used} / {user.quota_total}</span>
                                                                    <span className="text-gray-400 font-bold">{Math.round(user.quota_percentage)}%</span>
                                                                </div>
                                                                <div className="w-full h-2 bg-[#07090E] rounded-full overflow-hidden border border-white/[0.04]">
                                                                    <div
                                                                        className={`h-full transition-all duration-500 rounded-full ${
                                                                            user.quota_percentage > 90 ? 'bg-rose-500' : 'bg-[#00B074]'
                                                                        }`}
                                                                        style={{ width: `${Math.min(100, user.quota_percentage)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-500 text-xs">Kota Tanımlanmamış</span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        {user.custom_speed_limit_mbps !== null && user.custom_speed_limit_mbps !== undefined ? (
                                                            user.custom_speed_limit_mbps === 0 ? (
                                                                <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[11px] flex items-center gap-1 w-fit">
                                                                    ⚡ Sınırsız (Özel)
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono text-[11px] flex items-center gap-1 w-fit">
                                                                    <Gauge className="w-3.5 h-3.5" />
                                                                    {user.custom_speed_limit_mbps} Mbps (Özel)
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-gray-400 text-xs flex items-center gap-1">
                                                                <Gauge className="w-3.5 h-3.5 text-gray-500" />
                                                                Paket Varsayılanı
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        {user.has_active_sub ? (
                                                            <span className={`text-xs font-mono ${user.is_perpetual ? 'text-emerald-400 font-bold' : 'text-gray-300'}`}>
                                                                {user.expires_at}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500 text-xs">-</span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleOpenAssignModal(user)}
                                                                className="px-3 py-1.5 rounded-xl bg-[#00B074]/10 hover:bg-[#00B074]/20 border border-[#00B074]/30 text-[#00B074] text-xs font-semibold transition-colors flex items-center gap-1"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                                <span>{user.has_active_sub ? 'Kota Düzenle' : 'Kota Ata'}</span>
                                                            </button>

                                                            {user.has_active_sub && (
                                                                <button
                                                                    onClick={() => handleRemoveUserPlan(user)}
                                                                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold transition-colors"
                                                                    title="Paketi Kaldır"
                                                                >
                                                                    <UserX className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 3: SATIN ALIM & İŞLEM GEÇMİŞİ */}
                {activeSection === 'history' && (
                    <div className="space-y-6">
                        {/* History Statistics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-[#0D111A] border border-white/[0.08] p-4 rounded-2xl flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Toplam İşlem Kaydı</p>
                                    <h4 className="text-xl font-black text-white mt-1">{subscriptionsHistory.length} Kayıt</h4>
                                </div>
                                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    <Receipt className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-[#0D111A] border border-white/[0.08] p-4 rounded-2xl flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Toplam Ciro / Hasılat</p>
                                    <h4 className="text-xl font-black text-emerald-400 mt-1">₺{totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h4>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-[#0D111A] border border-white/[0.08] p-4 rounded-2xl flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Şu An Aktif Abonelikler</p>
                                    <h4 className="text-xl font-black text-blue-400 mt-1">{subscriptionsHistory.filter(h => h.status === 'active').length} İşlem</h4>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        {/* Search & Filter Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D111A] p-4 rounded-2xl border border-white/[0.08]">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Kullanıcı adı, e-posta, paket adı veya notlarda ara..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B074] transition-colors"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <select
                                    value={historyStatusFilter}
                                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                                    className="bg-[#07090E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00B074] transition-colors"
                                >
                                    <option value="all">Tüm Durumlar ({subscriptionsHistory.length})</option>
                                    <option value="active">Aktif Abonelikler</option>
                                    <option value="cancelled">İptal Edilenler</option>
                                    <option value="expired">Süresi Dolanlar</option>
                                </select>
                            </div>
                        </div>

                        {/* History Table */}
                        <div className="bg-[#0D111A] rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0A0D14] text-gray-400 border-b border-white/[0.06] uppercase text-[10px] tracking-wider font-bold">
                                        <tr>
                                            <th className="px-6 py-4">İşlem ID / Tarih</th>
                                            <th className="px-6 py-4">Kullanıcı</th>
                                            <th className="px-6 py-4">Paket / Kota</th>
                                            <th className="px-6 py-4">Süre</th>
                                            <th className="px-6 py-4">Tutar</th>
                                            <th className="px-6 py-4">Durum</th>
                                            <th className="px-6 py-4">Notlar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {filteredHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                                    Aramanıza veya filtrelerinize uygun satın alım kaydı bulunamadı.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredHistory.map((item) => (
                                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-mono text-white font-bold">#{item.id}</div>
                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{item.created_at}</span>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-white">{item.user_name}</div>
                                                        <div className="text-[11px] text-gray-400">{item.user_email}</div>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-emerald-400">
                                                            {item.plan_name}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        {item.is_perpetual ? (
                                                            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-[10px] font-bold inline-flex items-center gap-1">
                                                                <Infinity className="w-3 h-3" /> Süresiz
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300 font-medium">
                                                                {item.duration_months} Ay
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <span className="font-mono font-bold text-white">
                                                            {item.formatted_price}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                            item.status === 'active'
                                                                ? 'bg-[#00B074]/15 border-[#00B074]/30 text-[#00B074]'
                                                                : item.status === 'cancelled'
                                                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                                                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                                        }`}>
                                                            {item.status_label}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4 max-w-xs">
                                                        <span className="text-gray-400 text-[11px] truncate block" title={item.notes}>
                                                            {item.notes || '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 4: ÖDEME YÖNTEMLERİ (MODÜLER AKTİF/PASİF & YÖNETİM) */}
                {activeSection === 'methods' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D111A] p-4 rounded-2xl border border-white/[0.08]">
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-[#00B074]" />
                                    <span>Modüler Ödeme Yöntemleri Yönetimi</span>
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Sistemde aktif/pasif olmasını istediğiniz ödeme yöntemlerini kolayca açıp kapatabilir, IBAN ve Cüzdan adresi ayarlarını yapılandırabilirsiniz.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {paymentMethods.map((method) => {
                                const settings = method.settings || {};
                                return (
                                    <div
                                        key={method.id}
                                        className={`bg-[#0D111A] rounded-2xl border transition-all duration-300 p-6 space-y-4 shadow-xl flex flex-col justify-between ${
                                            method.is_active ? 'border-white/[0.08]' : 'border-rose-500/20 opacity-75'
                                        }`}
                                    >
                                        <div className="space-y-4">
                                            {/* Card Top / Toggle Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                        method.is_active ? 'bg-[#00B074]/15 text-[#00B074] border border-[#00B074]/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                    }`}>
                                                        {method.driver === 'bank' ? <Building2 className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-base font-bold text-white">{method.name}</h4>
                                                        <span className="text-[10px] font-mono text-gray-400 uppercase">
                                                            Sürücü: {method.driver}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Active/Passive Toggle Button */}
                                                <button
                                                    onClick={() => handleToggleMethod(method)}
                                                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                                        method.is_active
                                                            ? 'bg-[#00B074]/20 border border-[#00B074]/40 text-[#00B074] hover:bg-[#00B074]/30'
                                                            : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                                                    }`}
                                                    title={method.is_active ? 'Pasife Al' : 'Aktif Et'}
                                                >
                                                    {method.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                    <span>{method.is_active ? 'AKTİF' : 'PASİF'}</span>
                                                </button>
                                            </div>

                                            <p className="text-xs text-gray-400">
                                                {method.description || 'Açıklama belirtilmedi.'}
                                            </p>

                                            {/* Settings Preview */}
                                            <div className="p-3.5 rounded-xl bg-[#07090E] border border-white/[0.06] space-y-2 text-xs">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                                    Mevcut Yapılandırma Bilgileri
                                                </span>
                                                {method.driver === 'bank' ? (
                                                    <div className="space-y-1 font-mono text-[11px]">
                                                        <div><span className="text-gray-500">Banka:</span> <span className="text-white">{settings.bank_name || '-'}</span></div>
                                                        <div><span className="text-gray-500">Alıcı:</span> <span className="text-white">{settings.account_holder || '-'}</span></div>
                                                        <div><span className="text-gray-500">IBAN:</span> <span className="text-emerald-400">{settings.iban || '-'}</span></div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1 font-mono text-[11px]">
                                                        <div><span className="text-gray-500">Ağ:</span> <span className="text-white">{settings.network || '-'}</span></div>
                                                        <div className="truncate"><span className="text-gray-500">Adres:</span> <span className="text-emerald-400">{settings.wallet_address || '-'}</span></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end">
                                            <button
                                                onClick={() => handleOpenEditMethod(method)}
                                                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 text-[#00B074]" />
                                                <span>Ayarları Düzenle</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SECTION 5: ÖDEME BİLDİRİMLERİ (ONAYLA / REDDET) */}
                {activeSection === 'notifications' && (
                    <div className="space-y-6">
                        {/* Search & Filter Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D111A] p-4 rounded-2xl border border-white/[0.08]">
                            <div className="flex items-center gap-3">
                                <select
                                    value={notificationStatusFilter}
                                    onChange={(e) => setNotificationStatusFilter(e.target.value)}
                                    className="bg-[#07090E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00B074] transition-colors"
                                >
                                    <option value="pending">Bekleyen Ödeme Bildirimleri ({paymentNotifications.filter(n => n.status === 'pending').length})</option>
                                    <option value="approved">Onaylanan Bildirimler ({paymentNotifications.filter(n => n.status === 'approved').length})</option>
                                    <option value="rejected">Reddedilen Bildirimler ({paymentNotifications.filter(n => n.status === 'rejected').length})</option>
                                    <option value="all">Tüm Bildirimler ({paymentNotifications.length})</option>
                                </select>
                            </div>

                            <div className="text-xs text-gray-400 font-medium">
                                Gösterilen: <strong className="text-white font-mono">{filteredNotifications.length}</strong> bildirim
                            </div>
                        </div>

                        {/* Notifications Table */}
                        <div className="bg-[#0D111A] rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0A0D14] text-gray-400 border-b border-white/[0.06] uppercase text-[10px] tracking-wider font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Ref Kodu / Tarih</th>
                                            <th className="px-6 py-4">Kullanıcı</th>
                                            <th className="px-6 py-4">Paket & Tutar</th>
                                            <th className="px-6 py-4">Ödeme Yöntemi</th>
                                            <th className="px-6 py-4">Gönderen / TxID</th>
                                            <th className="px-6 py-4">Durum</th>
                                            <th className="px-6 py-4 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {filteredNotifications.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                                    Seçilen filtreye uygun ödeme bildirimi bulunamadı.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredNotifications.map((item) => (
                                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-6 py-4 font-mono">
                                                        <div className="font-bold text-white">{item.reference_code}</div>
                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{item.created_at}</span>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-white">{item.user_name}</div>
                                                        <div className="text-[11px] text-gray-400">{item.user_email}</div>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-white">{item.plan_name} ({item.duration_months} Ay)</div>
                                                        <div className="text-emerald-400 font-mono font-bold">{item.formatted_amount}</div>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-200 font-medium inline-flex items-center gap-1.5">
                                                            {item.method_driver === 'bank' ? <Building2 className="w-3.5 h-3.5 text-[#00B074]" /> : <Coins className="w-3.5 h-3.5 text-amber-400" />}
                                                            {item.method_name}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4 max-w-xs">
                                                        {item.sender_name && <div className="text-gray-200 font-semibold">{item.sender_name}</div>}
                                                        {item.tx_hash && <div className="text-[10px] font-mono text-gray-400 truncate" title={item.tx_hash}>Tx: {item.tx_hash}</div>}
                                                        {item.user_notes && <div className="text-[10px] text-gray-400 italic truncate" title={item.user_notes}>Not: {item.user_notes}</div>}
                                                        {!item.sender_name && !item.tx_hash && !item.user_notes && <span className="text-gray-500">-</span>}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                            item.status === 'approved'
                                                                ? 'bg-[#00B074]/15 border-[#00B074]/30 text-[#00B074]'
                                                                : item.status === 'rejected'
                                                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                                                : 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse'
                                                        }`}>
                                                            {item.status_label}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4 text-right">
                                                        {item.status === 'pending' ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleApproveNotification(item)}
                                                                    className="px-3 py-1.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold transition-all shadow-md shadow-[#00B074]/20 flex items-center gap-1"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                    <span>Onayla</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectNotification(item)}
                                                                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold transition-colors flex items-center gap-1"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                    <span>Reddet</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-500 block">
                                                                {item.processed_at}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 1: CREATE / EDIT PLAN */}
                {isCreatePlanOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#0D111A] border border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Package className="w-5 h-5 text-[#00B074]" />
                                    <span>{editingPlan ? `'${editingPlan.name}' Paketini Düzenle` : 'Yeni Abonelik Paketi Oluştur'}</span>
                                </h3>
                                <button
                                    onClick={() => setIsCreatePlanOpen(false)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSavePlan} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-1">Paket Adı *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Örn: VIP Paket, Temel Paket"
                                            value={planForm.name}
                                            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-1">Slug (Benzersiz Kod)</label>
                                        <input
                                            type="text"
                                            placeholder="Örn: vip, basic, premium (Boş bırakılırsa otomatik)"
                                            value={planForm.slug}
                                            onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Açıklama</label>
                                    <textarea
                                        rows="2"
                                        placeholder="Paket avantajları, içerik hakları..."
                                        value={planForm.description}
                                        onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#07090E] border border-white/[0.06]">
                                    <div>
                                        <label className="block text-xs font-semibold text-emerald-400 mb-1">Aylık İndirme Kotası (GB) *</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            max="100000"
                                            placeholder="Örn: 500"
                                            value={planForm.monthly_quota_gb}
                                            onChange={(e) => setPlanForm({ ...planForm, monthly_quota_gb: parseInt(e.target.value) || '' })}
                                            className="w-full px-3.5 py-2.5 bg-[#0A0D14] border border-emerald-500/40 rounded-xl text-sm font-bold text-emerald-400 focus:outline-none focus:border-[#00B074]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-1">Eşzamanlı İndirme Limiti</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            max="20"
                                            value={planForm.max_parallel_downloads}
                                            onChange={(e) => setPlanForm({ ...planForm, max_parallel_downloads: parseInt(e.target.value) || 4 })}
                                            className="w-full px-3.5 py-2.5 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-1">Hız Limiti (Mbps)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Sınırsız (Boş)"
                                            value={planForm.speed_limit_mbps}
                                            onChange={(e) => setPlanForm({ ...planForm, speed_limit_mbps: e.target.value === '' ? '' : parseInt(e.target.value) || '' })}
                                            className="w-full px-3.5 py-2.5 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                        />
                                    </div>
                                </div>

                                {/* Pricing Inputs */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-300">Süreye Göre Fiyatlandırma (₺)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                            <span className="block text-[10px] text-gray-400 mb-1">1 Ay Fiyatı</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={planForm.price_1m}
                                                onChange={(e) => setPlanForm({ ...planForm, price_1m: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-gray-400 mb-1">3 Ay Fiyatı</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={planForm.price_3m}
                                                onChange={(e) => setPlanForm({ ...planForm, price_3m: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-gray-400 mb-1">6 Ay Fiyatı</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={planForm.price_6m}
                                                onChange={(e) => setPlanForm({ ...planForm, price_6m: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-gray-400 mb-1">12 Ay Fiyatı</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={planForm.price_12m}
                                                onChange={(e) => setPlanForm({ ...planForm, price_12m: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Allowed Durations Toggle */}
                                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                                    <label className="block text-xs font-semibold text-gray-300">
                                        Geçerli Abonelik Döngüleri (Satın Alınabilir Süreler) *
                                    </label>
                                    <p className="text-[11px] text-gray-400">
                                        Bu paket için aktif edilecek döngüleri seçin. Örneğin sadece 6 ay ve 1 yıla özel paket oluşturmak için 1 ve 3 ayı kapatabilirsiniz.
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                                        {[
                                            { months: 1, label: '1 Aylık' },
                                            { months: 3, label: '3 Aylık' },
                                            { months: 6, label: '6 Aylık' },
                                            { months: 12, label: '12 Aylık' },
                                        ].map((opt) => {
                                            const isAllowed = (planForm.allowed_durations || [1, 3, 6, 12]).includes(opt.months);
                                            return (
                                                <button
                                                    key={opt.months}
                                                    type="button"
                                                    onClick={() => toggleAllowedDuration(opt.months)}
                                                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                                        isAllowed
                                                            ? 'bg-[#00B074]/15 border-[#00B074] text-white shadow-sm'
                                                            : 'bg-[#07090E] border-white/[0.08] text-gray-500 hover:text-gray-300'
                                                    }`}
                                                >
                                                    <span>{opt.label}</span>
                                                    {isAllowed ? (
                                                        <Check className="w-4 h-4 text-[#00B074]" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-gray-600" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* VPS / Sunucu IP İzni Toggle */}
                                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#07090E] border border-white/[0.08]">
                                        <div>
                                            <label className="text-xs font-bold text-white block">
                                                VPS / Sunucu IP İndirme İzni
                                            </label>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                Açık olursa kullanıcılar VPS, Veri Merkezi veya Sunucu IP'lerinden indirme yapabilir. Kapalı olursa sadece ev/mobil IP'lerden indirme yapabilirler.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPlanForm({ ...planForm, allow_vps_access: !planForm.allow_vps_access })}
                                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                                planForm.allow_vps_access
                                                    ? 'bg-[#00B074]/20 border border-[#00B074]/40 text-[#00B074]'
                                                    : 'bg-gray-800 border border-gray-700 text-gray-400'
                                            }`}
                                        >
                                            {planForm.allow_vps_access ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                            <span>{planForm.allow_vps_access ? 'İZİN VERİLDİ' : 'ENGELLE (KAPALI)'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatePlanOpen(false)}
                                        className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-gray-300 text-xs font-semibold hover:bg-white/[0.08]"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingPlan}
                                        className="px-5 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold shadow-md shadow-[#00B074]/20"
                                    >
                                        {isSubmittingPlan ? 'Kaydediliyor...' : editingPlan ? 'Güncelle' : 'Paketi Oluştur'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 2: ASSIGN QUOTA / PLAN TO USER */}
                {isAssignModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#0D111A] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
                            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <UserCheck className="w-5 h-5 text-[#00B074]" />
                                    <span>Kullanıcıya Paket & Kota Tanımla</span>
                                </h3>
                                <button
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Hedef Kullanıcı *</label>
                                    {assignModalUser ? (
                                        <div className="p-3 bg-[#07090E] border border-white/[0.08] rounded-xl font-bold text-white flex items-center justify-between">
                                            <span>{assignModalUser.name} ({assignModalUser.email})</span>
                                        </div>
                                    ) : (
                                        <select
                                            value={assignForm.user_id}
                                            onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
                                            className="w-full p-3 bg-[#07090E] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00B074]"
                                            required
                                        >
                                            <option value="">Kullanıcı Seçiniz...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} - ({u.email})</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Paket Şablonu veya Özel Kota</label>
                                    <select
                                        value={assignForm.plan_id}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val !== 'custom' && val !== 'none') {
                                                const selPlan = plans.find(p => String(p.id) === String(val));
                                                setAssignForm({
                                                    ...assignForm,
                                                    plan_id: val,
                                                    custom_quota_gb: selPlan ? selPlan.monthly_quota_gb : 500,
                                                });
                                            } else {
                                                setAssignForm({ ...assignForm, plan_id: val });
                                            }
                                        }}
                                        className="w-full p-3 bg-[#07090E] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00B074]"
                                    >
                                        <option value="custom">Özel Tanımlı İndirme Kotası (Manuel GB)</option>
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} Şablonu ({p.monthly_quota_gb} GB/Ay)</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Verilecek İndirme Kotası (GB)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={assignForm.custom_quota_gb}
                                        onChange={(e) => setAssignForm({ ...assignForm, custom_quota_gb: parseInt(e.target.value) || 0 })}
                                        className="w-full p-3 bg-[#07090E] border border-emerald-500/30 rounded-xl text-emerald-400 font-bold font-mono focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1 text-xs">
                                        Kullanıcıya Özel Hız Limiti (Mbps)
                                        <span className="text-[10px] text-gray-400 font-normal ml-2 block sm:inline">(Boş = Paket Varsayılanını Kullan, 0 = Sınırsız / Tam Hız)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10000"
                                        placeholder="Paket Varsayılanı (Boş)"
                                        value={assignForm.custom_speed_limit_mbps}
                                        onChange={(e) => setAssignForm({ ...assignForm, custom_speed_limit_mbps: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                        className="w-full p-3 bg-[#07090E] border border-white/[0.08] rounded-xl text-white font-mono focus:outline-none focus:border-[#00B074] text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Süre Türü</label>
                                    <select
                                        value={assignForm.duration_type}
                                        onChange={(e) => setAssignForm({ ...assignForm, duration_type: e.target.value })}
                                        className="w-full p-3 bg-[#07090E] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00B074]"
                                    >
                                        <option value="1">1 Ay (30 Gün)</option>
                                        <option value="3">3 Ay (90 Gün)</option>
                                        <option value="6">6 Ay (180 Gün)</option>
                                        <option value="12">1 Yıl (365 Gün)</option>
                                        <option value="perpetual">♾️ SÜRESİZ KOTA (Süre Sınırı Yok)</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                                    <button
                                        type="button"
                                        onClick={() => setIsAssignModalOpen(false)}
                                        className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-gray-300 text-xs font-semibold hover:bg-white/[0.08]"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingAssign}
                                        className="px-5 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold shadow-md shadow-[#00B074]/20"
                                    >
                                        {isSubmittingAssign ? 'Kaydediliyor...' : 'Kotayı Tanımla'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 3: DELETE PLAN CONFIRMATION */}
                {deletingPlan && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#0D111A] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Paketi Sil</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{deletingPlan.name} silinecektir.</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Bu paketi silmek istediğinizden emin misiniz? Bu pakete bağlı olan kullanıcıların kotası etkilenmeyecektir.
                            </p>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setDeletingPlan(null)}
                                    className="px-4 py-2 rounded-xl bg-white/[0.04] text-gray-300 text-xs font-semibold hover:bg-white/[0.08]"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleConfirmDeletePlan}
                                    disabled={isSubmittingPlan}
                                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50"
                                >
                                    {isSubmittingPlan ? 'Siliniyor...' : 'Evet, Paketi Sil'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 4: EDIT PAYMENT METHOD SETTINGS */}
                {editingMethod && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#0D111A] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 overflow-y-auto max-h-[90vh]">
                            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-[#00B074]" />
                                    <span>'{editingMethod.name}' Ayarlarını Düzenle</span>
                                </h3>
                                <button
                                    onClick={() => setEditingMethod(null)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveMethod} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Yöntem Adı *</label>
                                    <input
                                        type="text"
                                        required
                                        value={methodForm.name}
                                        onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-[#07090E] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Kısa Açıklama</label>
                                    <input
                                        type="text"
                                        value={methodForm.description}
                                        onChange={(e) => setMethodForm({ ...methodForm, description: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-[#07090E] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>

                                {/* Driver Specific Settings */}
                                {editingMethod.driver === 'bank' && (
                                    <div className="p-4 rounded-2xl bg-[#07090E] border border-white/[0.06] space-y-3">
                                        <span className="text-xs font-bold text-[#00B074] block">Banka Hesabı Bilgileri</span>
                                        
                                        <div>
                                            <label className="block text-[11px] text-gray-400 mb-1">Banka Adı</label>
                                            <input
                                                type="text"
                                                placeholder="Örn: Ziraat Bankası, Garanti BBVA"
                                                value={methodForm.settings?.bank_name || ''}
                                                onChange={(e) => setMethodForm({
                                                    ...methodForm,
                                                    settings: { ...methodForm.settings, bank_name: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 bg-[#0A0D14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00B074]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] text-gray-400 mb-1">Alıcı Adı (Hesap Sahibi)</label>
                                            <input
                                                type="text"
                                                placeholder="Örn: Fatih Ateş"
                                                value={methodForm.settings?.account_holder || ''}
                                                onChange={(e) => setMethodForm({
                                                    ...methodForm,
                                                    settings: { ...methodForm.settings, account_holder: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 bg-[#0A0D14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00B074]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] text-gray-400 mb-1">IBAN Numarası</label>
                                            <input
                                                type="text"
                                                placeholder="TR00 0000 0000 0000 0000 0000 00"
                                                value={methodForm.settings?.iban || ''}
                                                onChange={(e) => setMethodForm({
                                                    ...methodForm,
                                                    settings: { ...methodForm.settings, iban: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 bg-[#0A0D14] border border-emerald-500/30 font-mono text-emerald-400 font-bold rounded-xl focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {editingMethod.driver === 'crypto' && (
                                    <div className="p-4 rounded-2xl bg-[#07090E] border border-white/[0.06] space-y-3">
                                        <span className="text-xs font-bold text-amber-400 block">Kripto Cüzdan Bilgileri</span>
                                        
                                        <div>
                                            <label className="block text-[11px] text-gray-400 mb-1">Ağ (Network)</label>
                                            <input
                                                type="text"
                                                placeholder="Örn: TRC-20 (Tron Network)"
                                                value={methodForm.settings?.network || ''}
                                                onChange={(e) => setMethodForm({
                                                    ...methodForm,
                                                    settings: { ...methodForm.settings, network: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 bg-[#0A0D14] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00B074]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] text-gray-400 mb-1">USDT Cüzdan Adresi</label>
                                            <input
                                                type="text"
                                                placeholder="TRC-20 Cüzdan adresi..."
                                                value={methodForm.settings?.wallet_address || ''}
                                                onChange={(e) => setMethodForm({
                                                    ...methodForm,
                                                    settings: { ...methodForm.settings, wallet_address: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 bg-[#0A0D14] border border-amber-500/30 font-mono text-amber-400 font-bold rounded-xl focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Ödeme Talimatları & Kullanıcı Notu</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Kullanıcıya gösterilecek özel talimatlar..."
                                        value={methodForm.instructions}
                                        onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-[#07090E] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-[#07090E] border border-white/[0.06]">
                                    <span className="text-gray-300 font-semibold">Aktiflik Durumu</span>
                                    <button
                                        type="button"
                                        onClick={() => setMethodForm({ ...methodForm, is_active: !methodForm.is_active })}
                                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                            methodForm.is_active
                                                ? 'bg-[#00B074]/20 border border-[#00B074]/40 text-[#00B074]'
                                                : 'bg-gray-800 border border-gray-700 text-gray-400'
                                        }`}
                                    >
                                        {methodForm.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                        <span>{methodForm.is_active ? 'AKTİF' : 'PASİF'}</span>
                                    </button>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                                    <button
                                        type="button"
                                        onClick={() => setEditingMethod(null)}
                                        className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-gray-300 text-xs font-semibold hover:bg-white/[0.08]"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingMethod}
                                        className="px-5 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold shadow-md shadow-[#00B074]/20"
                                    >
                                        {isSubmittingMethod ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </AdminLayout>
    );
}

