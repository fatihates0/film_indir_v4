import React, { useState, useEffect, useRef } from 'react';
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
    Filter,
    MoreHorizontal,
    CreditCard,
    ArrowRight,
    CheckCircle,
    AlertCircle
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

    // Active Section: 'plans' | 'users' | 'notifications' | 'methods' | 'history'
    const [currentSection, setCurrentSection] = useState(filters?.tab || activeSection || 'plans');

    // Quick filter states
    const [userSearchInput, setUserSearchInput] = useState(filters?.user_search || '');
    const [notifSearchInput, setNotifSearchInput] = useState(filters?.notif_search || '');
    const [historySearchInput, setHistorySearchInput] = useState(filters?.history_search || '');

    // Active User Actions Dropdown Menu state (fixed viewport coordinates)
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

    // Handle toggle user action menu with fixed viewport coordinates
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

    // Confirmation Modals (Custom, not window.confirm)
    const [confirmModal, setConfirmModal] = useState(null); // { type, title, message, onConfirm, confirmText, isDanger }

    // Comprehensive User Packages Management Modal State
    const [managePackagesUser, setManagePackagesUser] = useState(null);
    const [isEditingMainPlanInline, setIsEditingMainPlanInline] = useState(false);
    const [isExtendingDurationInline, setIsExtendingDurationInline] = useState(false);
    const [isAddingExtraQuotaInline, setIsAddingExtraQuotaInline] = useState(false);

    // Form states for Comprehensive Modal
    const [editMainPlanForm, setEditMainPlanForm] = useState({
        user_id: '',
        plan_id: 'custom',
        custom_quota_gb: 500,
        custom_speed_limit_mbps: '',
        duration_type: '1',
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
        name: '',
        notes: '',
    });
    const [isSubmittingInlineExtra, setIsSubmittingInlineExtra] = useState(false);

    // Editing an existing extra quota
    const [editingExtraQuota, setEditingExtraQuota] = useState(null);
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

    // Initial plan form state
    const initialPlanForm = {
        name: '',
        slug: '',
        type: 'individual',
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

    // Switch Tab Section
    const handleSwitchSection = (sectionKey, extraFilters = {}) => {
        setCurrentSection(sectionKey);
        router.get('/admin/plans', {
            tab: sectionKey,
            per_page: filters?.per_page || 15,
            ...extraFilters
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

    // Clear User Search
    const handleClearUserSearch = () => {
        setUserSearchInput('');
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

    // User Segment Filter change
    const handleUserSegmentChange = (planFilterValue, quotaFilterValue = 'all') => {
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
        setActiveUserMenu(null);
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

    // Reset User Usage with friendly confirmation
    const promptResetUserUsage = (user) => {
        setActiveUserMenu(null);
        setConfirmModal({
            title: 'Kotayı Sıfırla',
            message: `"${user.name}" kullanıcısının bu dönemde harcadığı kotayı sıfırlamak istiyor musunuz? Kullanıcı yeniden paket kotasını kullanabilecektir.`,
            confirmText: 'Evet, Kotayı Sıfırla',
            isDanger: false,
            onConfirm: () => {
                router.post(`/admin/plans/users/${user.id}/reset-usage`, {}, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal(null)
                });
            }
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
        setActiveUserMenu(null);
        router.post(`/admin/plans/users/${user.id}/sync-media-account`, {}, {
            preserveScroll: true,
        });
    };

    // Remove User Plan with friendly confirmation
    const promptRemoveUserPlan = (user) => {
        setActiveUserMenu(null);
        setConfirmModal({
            title: 'Paketi ve Kotaları Kaldır',
            message: `"${user.name}" kullanıcısının tüm paket haklarını ve ek kotalarını iptal etmek üzeresiniz. Kullanıcı standart paketsiz duruma getirilecektir.`,
            confirmText: 'Paketi İptal Et',
            isDanger: true,
            onConfirm: () => {
                router.post(`/admin/plans/users/${user.id}/remove`, {}, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal(null)
                });
            }
        });
    };

    // Open Comprehensive User Packages Modal
    const handleOpenManagePackagesModal = (user) => {
        setActiveUserMenu(null);
        setManagePackagesUser(user);
        setIsEditingMainPlanInline(false);
        setIsExtendingDurationInline(false);
        setIsAddingExtraQuotaInline(false);
        setEditingExtraQuota(null);

        // Populate inline main plan edit form with current user's values
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

        // Populate extra quota inline form
        setExtraInlineForm({
            quota_gb: 200,
            days: 30,
            name: `${user.name} Ek Kota`,
            notes: '',
        });

        setExtendInlineDays(30);
        setExtendInlineNotes('');
    };

    // Save inline main plan assignment
    const handleSaveInlineMainPlan = (e) => {
        e?.preventDefault();
        const targetUser = managePackagesUser ? (usersList.find(u => u.id === managePackagesUser.id) || managePackagesUser) : null;
        if (!targetUser) return;
        setIsSubmittingInlinePlan(true);

        router.post('/admin/plans/users/assign', {
            user_id: targetUser.id,
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
        const targetUser = managePackagesUser ? (usersList.find(u => u.id === managePackagesUser.id) || managePackagesUser) : null;
        if (!targetUser) return;
        setIsSubmittingInlineExtend(true);

        router.post(`/admin/plans/users/${targetUser.id}/extend-duration`, {
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
        const targetUser = managePackagesUser ? (usersList.find(u => u.id === managePackagesUser.id) || managePackagesUser) : null;
        if (!targetUser) return;
        setIsSubmittingInlineExtra(true);

        router.post(`/admin/plans/users/${targetUser.id}/extra-quota`, extraInlineForm, {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddingExtraQuotaInline(false);
                setExtraInlineForm({
                    quota_gb: 200,
                    days: 30,
                    name: `${targetUser.name} Ek Kota`,
                    notes: '',
                });
            },
            onFinish: () => setIsSubmittingInlineExtra(false),
        });
    };

    // Remove single extra quota pool
    const promptRemoveUserExtraQuota = (user, extra) => {
        setConfirmModal({
            title: 'Ek Kota Havuzunu Sil',
            message: `"${user.name}" kullanıcısına ait "${extra.name}" (${extra.remaining_formatted} kalan) ek kota havuzunu silmek istediğinizden emin misiniz?`,
            confirmText: 'Evet, Ek Kotayı Sil',
            isDanger: true,
            onConfirm: () => {
                router.delete(`/admin/plans/users/${user.id}/extra-quota/${extra.id}`, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal(null)
                });
            }
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
        const targetUser = managePackagesUser ? (usersList.find((u) => u.id === managePackagesUser.id) || managePackagesUser) : null;
        if (!targetUser || !editingExtraQuota) return;
        setIsSubmittingEditExtra(true);

        router.put(`/admin/plans/users/${targetUser.id}/extra-quota/${editingExtraQuota.id}`, editExtraForm, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingExtraQuota(null);
            },
            onFinish: () => setIsSubmittingEditExtra(false),
        });
    };

    // Remove ONLY main subscription plan (keeping extra quotas)
    const promptRemoveOnlyMainPlan = (user) => {
        setConfirmModal({
            title: 'Ana Paketi İptal Et',
            message: `"${user.name}" kullanıcısının yalnızca ana abonelik paketini iptal etmek üzeresiniz. (Varsa tanımlı ek kota havuzları korunacaktır). Devam edilsin mi?`,
            confirmText: 'Ana Paketi Kaldır',
            isDanger: true,
            onConfirm: () => {
                router.post('/admin/plans/users/assign', {
                    user_id: user.id,
                    plan_id: 'none',
                    duration_type: '1',
                }, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal(null)
                });
            }
        });
    };

    // Approve Payment Notification with modal
    const promptApproveNotification = (notification) => {
        setConfirmModal({
            title: 'Ödeme Bildirimini Onayla',
            message: `"${notification.user_name}" adına yapılan ${notification.formatted_amount} tutarındaki ödeme onaylanarak "${notification.plan_name}" paketi anında aktif edilecek. Onaylıyor musunuz?`,
            confirmText: 'Ödemeyi Onayla & Paketi Başlat',
            isDanger: false,
            onConfirm: () => {
                router.post(`/admin/payment-notifications/${notification.id}/approve`, {}, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal(null)
                });
            }
        });
    };

    // Reject Payment Notification with prompt/reason
    const [rejectingNotification, setRejectingNotification] = useState(null);
    const [rejectReason, setRejectReason] = useState('Ödeme doğrulanamadı.');

    const handleConfirmReject = (e) => {
        e?.preventDefault();
        if (!rejectingNotification) return;

        router.post(`/admin/payment-notifications/${rejectingNotification.id}/reject`, {
            admin_notes: rejectReason,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setRejectingNotification(null);
                setRejectReason('Ödeme doğrulanamadı.');
            }
        });
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

    // Live-synced user for manage packages modal
    const currentManageUser = managePackagesUser
        ? (usersList.find((u) => u.id === managePackagesUser.id) || managePackagesUser)
        : null;

    const currentTab = currentSection;
    const pendingCount = stats?.pendingNotificationsCount ?? 0;

    return (
        <AdminLayout
            title="Paket & Kota Yönetimi"
            subtitle="İndirme paketleri, kullanıcı kota tahsisleri ve onay bekleyen ödeme bildirimleri."
            activeTab="plans"
            statsSummary={{ 
                total_plans: stats?.totalPlansCount ?? plans.length,
            }}
            headerActions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenCreatePlan}
                        className="px-3.5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs transition-all shadow-md shadow-[#00B074]/20 flex items-center gap-1.5 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Yeni Paket</span>
                    </button>
                    <button
                        onClick={() => handleOpenAssignModal()}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white font-semibold text-xs transition-all flex items-center gap-1.5"
                    >
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        <span>Kota Tanımla</span>
                    </button>
                </div>
            }
        >
            <div className="space-y-6">

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{flash.success}</span>
                        </div>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>{flash.error}</span>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* 1. INTERACTIVE KPI CARDS (Click to jump to relevant section) */}
                {/* ========================================================= */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    
                    {/* Card 1: Plans Catalog */}
                    <button
                        type="button"
                        onClick={() => handleSwitchSection('plans')}
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
                            {stats?.activePlansCount ?? plans.filter(p => p.is_active).length}
                            <span className="text-xs font-normal text-gray-400 ml-1.5">/ {stats?.totalPlansCount ?? plans.length} Aktif</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
                            <span>Kataloğu Görüntüle</span>
                            <ArrowRight className="w-3 h-3" />
                        </p>
                    </button>

                    {/* Card 2: Subscribed Users */}
                    <button
                        type="button"
                        onClick={() => handleSwitchSection('users', { user_plan: 'active_sub' })}
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
                            {stats?.totalSubscribedUsers ?? 0}
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
                        onClick={() => handleSwitchSection('users')}
                        className="text-left p-4 rounded-2xl border bg-[#0A0D15] border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.02] transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-200">Tahsis Kota</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                                <HardDrive className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-amber-400 font-mono">
                            {(stats?.totalAllocatedGb ?? 0).toLocaleString('tr-TR')}
                            <span className="text-xs font-normal text-gray-400 ml-1.5">GB</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                            Kullanılan: {(stats?.totalUsedGb ?? 0).toLocaleString('tr-TR')} GB
                        </p>
                    </button>

                    {/* Card 4: Pending Payments */}
                    <button
                        type="button"
                        onClick={() => handleSwitchSection('notifications', { notif_status: 'pending' })}
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

                {/* ========================================================= */}
                {/* 2. COMFORTABLE HORIZONTAL TAB NAVIGATION */}
                {/* ========================================================= */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 overflow-x-auto no-scrollbar gap-2">
                    <div className="flex items-center gap-1.5 bg-[#06080E] p-1 rounded-2xl border border-white/[0.06]">
                        
                        {/* Tab 1: Paketler */}
                        <button
                            onClick={() => handleSwitchSection('plans')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentTab === 'plans'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Paket Kataloğu</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/25">
                                {plans.length}
                            </span>
                        </button>

                        {/* Tab 2: Kullanıcı Kotaları */}
                        <button
                            onClick={() => handleSwitchSection('users')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentTab === 'users'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>Kullanıcı Kotaları</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/25">
                                {stats?.totalSubscribedUsers ?? 0}
                            </span>
                        </button>

                        {/* Tab 3: Ödeme Bildirimleri */}
                        <button
                            onClick={() => handleSwitchSection('notifications')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentTab === 'notifications'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Ödeme Bildirimleri</span>
                            {pendingCount > 0 ? (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500 text-black animate-pulse">
                                    {pendingCount}
                                </span>
                            ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/25">
                                    {paymentNotifications?.total ?? notifsList.length}
                                </span>
                            )}
                        </button>

                        {/* Tab 4: Ödeme Yöntemleri */}
                        <button
                            onClick={() => handleSwitchSection('methods')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentTab === 'methods'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Ödeme Yöntemleri</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/25">
                                {paymentMethods.length}
                            </span>
                        </button>

                        {/* Tab 5: İşlem Geçmişi */}
                        <button
                            onClick={() => handleSwitchSection('history')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentTab === 'history'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <History className="w-3.5 h-3.5" />
                            <span>İşlem Geçmişi</span>
                        </button>

                    </div>
                </div>

                {/* ========================================================= */}
                {/* SECTION 1: PAKET KATALOĞU (PLANS) */}
                {/* ========================================================= */}
                {currentTab === 'plans' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-white">Mevcut İndirme Paketleri</h3>
                                <p className="text-xs text-gray-400">Kullanıcılara sunulan indirme kotaları, fiyatlar ve hız limitleri.</p>
                            </div>
                            <button
                                onClick={handleOpenCreatePlan}
                                className="px-3.5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs transition-all shadow-md shadow-[#00B074]/20 flex items-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Yeni Paket Ekle</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {plans.map((plan) => {
                                const isBusiness = plan.type === 'business';
                                const isExtra = plan.type === 'extra';

                                return (
                                    <div
                                        key={plan.id}
                                        className={`bg-[#0A0D15] border rounded-2xl p-5 transition-all flex flex-col justify-between shadow-xl relative group ${
                                            plan.is_active
                                                ? isBusiness
                                                    ? 'border-indigo-500/30 hover:border-indigo-500/60'
                                                    : isExtra
                                                    ? 'border-amber-500/30 hover:border-amber-500/60'
                                                    : 'border-white/[0.08] hover:border-[#00B074]/50'
                                                : 'border-white/[0.04] opacity-60'
                                        }`}
                                    >
                                        <div className="space-y-4">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                                                    <h4 className="text-base font-bold text-white mt-1.5 group-hover:text-emerald-400 transition-colors">
                                                        {plan.name}
                                                    </h4>
                                                    <p className="text-[11px] text-gray-500 font-mono">
                                                        /{plan.slug}
                                                    </p>
                                                </div>

                                                {/* Active Toggle Switch */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleTogglePlan(plan)}
                                                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
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
                                            <div className="p-3.5 rounded-xl bg-[#06080E] border border-white/[0.04]">
                                                <span className="text-[11px] text-gray-400">İndirme Kotası</span>
                                                <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1.5 mt-0.5">
                                                    <span>{plan.monthly_quota_gb.toLocaleString('tr-TR')}</span>
                                                    <span className="text-xs font-semibold text-gray-400">GB {isExtra ? 'Tek Seferlik' : '/ Ay'}</span>
                                                </div>
                                            </div>

                                            {/* Pricing Grid */}
                                            <div className="space-y-1.5">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fiyatlandırma</div>
                                                <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                                                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] flex justify-between items-center">
                                                        <span className="text-gray-400">1 Ay:</span>
                                                        <span className="text-white font-bold">₺{Number(plan.price_1m).toFixed(2)}</span>
                                                    </div>
                                                    {!isExtra && (
                                                        <>
                                                            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] flex justify-between items-center">
                                                                <span className="text-gray-400">3 Ay:</span>
                                                                <span className="text-white font-bold">₺{Number(plan.price_3m).toFixed(2)}</span>
                                                            </div>
                                                            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] flex justify-between items-center">
                                                                <span className="text-gray-400">6 Ay:</span>
                                                                <span className="text-white font-bold">₺{Number(plan.price_6m).toFixed(2)}</span>
                                                            </div>
                                                            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] flex justify-between items-center">
                                                                <span className="text-gray-400">12 Ay:</span>
                                                                <span className="text-white font-bold">₺{Number(plan.price_12m).toFixed(2)}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Features & Gateway Limits */}
                                            <div className="pt-2 border-t border-white/[0.04] space-y-1 text-[11px] text-gray-400 font-mono">
                                                <div className="flex items-center justify-between">
                                                    <span>Eşzamanlı İndirme:</span>
                                                    <span className="text-white font-bold">
                                                        {plan.max_parallel_downloads === 0 ? 'Limitsiz' : `${plan.max_parallel_downloads} Dosya`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>Hız Limiti:</span>
                                                    <span className="text-white font-bold">
                                                        {plan.speed_limit_mbps ? `${plan.speed_limit_mbps} Mbps` : 'Tam Hat Hızı'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span>VPS / Sunucu İzni:</span>
                                                    <span className={plan.allow_vps_access ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
                                                        {plan.allow_vps_access ? 'Evet' : 'Hayır'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Actions Footer */}
                                        <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => handleSwitchSection('users', { user_plan: plan.id })}
                                                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                                            >
                                                <span>Aboneleri Gör</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleClonePlan(plan)}
                                                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                                                    title="Paketi Kopyala"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                    <span>Klonla</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditPlan(plan)}
                                                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                                                    title="Düzenle"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                    <span>Düzenle</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeletingPlan(plan);
                                                        setTargetPlanForDelete('none');
                                                    }}
                                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                                    title="Sil"
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
                {currentTab === 'users' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        
                        {/* Quick Filter Segment Pills & Search Bar */}
                        <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-4 space-y-3.5 shadow-xl">
                            
                            {/* Top Segmented Pills (1-click filtering) */}
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => handleUserSegmentChange('all', 'all')}
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
                                        onClick={() => handleUserSegmentChange('active_sub', 'all')}
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
                                        onClick={() => handleUserSegmentChange('all', 'over_80')}
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
                                        onClick={() => handleUserSegmentChange('perpetual', 'all')}
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
                                        onClick={() => handleUserSegmentChange('no_sub', 'all')}
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
                                <form onSubmit={handleUserSearchSubmit} className="relative flex-1">
                                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                                    <input
                                        type="text"
                                        placeholder="Kullanıcı adı veya e-posta ile ara..."
                                        value={userSearchInput}
                                        onChange={(e) => setUserSearchInput(e.target.value)}
                                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl pl-10 pr-20 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                                    />
                                    {userSearchInput && (
                                        <button
                                            type="button"
                                            onClick={handleClearUserSearch}
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
                                        onChange={(e) => handleUserSegmentChange(e.target.value, filters?.user_quota || 'all')}
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
                                        onClick={() => handleOpenAssignModal()}
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
                                                            onClick={() => handleOpenManagePackagesModal(u)}
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
                                                                onClick={() => handleOpenManagePackagesModal(u)}
                                                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm shadow-emerald-500/10"
                                                                title="Tüm Paketleri ve Kotaları Yönet (Modal)"
                                                            >
                                                                <Package className="w-3.5 h-3.5 text-emerald-400" />
                                                                <span>Paketleri Yönet</span>
                                                            </button>

                                                            {/* Quick Action 1: Add Extra Quota */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setExtraQuotaModalUser(u);
                                                                    setExtraQuotaForm({
                                                                        quota_gb: 200,
                                                                        days: 30,
                                                                        name: `${u.name} Ek Kota`,
                                                                        notes: '',
                                                                    });
                                                                }}
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
                                                                    onClick={() => {
                                                                        setExtendDurationUser(u);
                                                                        setExtendDurationDays(30);
                                                                    }}
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

                    </div>
                )}

                {/* ========================================================= */}
                {/* SECTION 3: ÖDEME BİLDİRİMLERİ (NOTIFICATIONS) */}
                {/* ========================================================= */}
                {currentTab === 'notifications' && (
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
                                    onClick={() => handleNotifFilterChange('pending')}
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
                                    {pendingCount > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                                            {pendingCount}
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
                                                        <div className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]" title={pn.tx_hash}>
                                                            {pn.tx_hash}
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
                                                            <button
                                                                type="button"
                                                                onClick={() => promptApproveNotification(pn)}
                                                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span>Onayla</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setRejectingNotification(pn)}
                                                                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all"
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
                {currentTab === 'methods' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {paymentMethods.map((method) => (
                                <div
                                    key={method.id}
                                    className={`bg-[#0A0D15] border rounded-2xl p-5 transition-all flex flex-col justify-between shadow-xl ${
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
                                                    <h4 className="font-bold text-white text-sm">{method.name}</h4>
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

                                    <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
                                        <span className={`text-[11px] font-bold ${method.is_active ? 'text-emerald-400' : 'text-gray-500'}`}>
                                            ● {method.is_active ? 'Kullanımda' : 'Pasif'}
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
                {currentTab === 'history' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        
                        {/* Filters */}
                        <div className="flex items-center justify-between gap-4 flex-wrap bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-4 shadow-xl">
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
                                handleOpenManagePackagesModal(u);
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
                                setExtraQuotaModalUser(u);
                                setExtraQuotaForm({
                                    quota_gb: 200,
                                    days: 30,
                                    name: `${u.name} Ek Kota`,
                                    notes: '',
                                });
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
                                    setExtendDurationUser(u);
                                    setExtendDurationDays(30);
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
                                handleOpenAssignModal(u);
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
                                promptResetUserUsage(u);
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
                                handleSyncMediaAccount(u);
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
                                    promptRemoveUserPlan(u);
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

            {/* ========================================================= */}
            {/* MODAL: COMPREHENSIVE USER PACKAGES & QUOTA MANAGEMENT */}
            {/* ========================================================= */}
            {currentManageUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
                    <div className="bg-[#0A0D15] border border-white/[0.12] rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8 relative max-h-[90vh] overflow-y-auto">
                        
                        {/* Header: User Info & Sync & Close */}
                        <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-base flex items-center justify-center font-bold shrink-0 shadow-lg shadow-emerald-500/10">
                                    {currentManageUser.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-white tracking-tight">{currentManageUser.name}</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-gray-300 font-medium">
                                            {currentManageUser.role_label || 'Kullanıcı'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono mt-0.5">{currentManageUser.email}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleSyncMediaAccount(currentManageUser)}
                                    className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                                    title="Jellyfin / Emby Medya Sunucusuyla Senkronize Et"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Jellyfin Senkronize Et</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setManagePackagesUser(null)}
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
                                {currentManageUser.custom_speed_limit_mbps ? (
                                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                        Hız Sınırı: {currentManageUser.custom_speed_limit_mbps} Mbps
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
                                    <div className="text-sm font-bold text-white font-mono mt-0.5">{currentManageUser.quota_total}</div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Harcanan Kota</div>
                                    <div className="text-sm font-bold text-gray-200 font-mono mt-0.5">{currentManageUser.quota_used}</div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                    <div className="text-[10px] text-emerald-400 uppercase font-semibold">Toplam Kalan Kota</div>
                                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                                        {currentManageUser.quota_remaining || currentManageUser.quota_total}
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-mono text-gray-400">
                                    <span>Kullanım Oranı</span>
                                    <span className={currentManageUser.quota_percentage >= 90 ? 'text-rose-400 font-bold' : 'text-gray-200'}>
                                        %{currentManageUser.quota_percentage || 0}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            (currentManageUser.quota_percentage || 0) >= 90
                                                ? 'bg-rose-500'
                                                : (currentManageUser.quota_percentage || 0) >= 70
                                                ? 'bg-amber-400'
                                                : 'bg-emerald-400'
                                        }`}
                                        style={{ width: `${Math.min(100, currentManageUser.quota_percentage || 0)}%` }}
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
                                        currentManageUser.has_active_sub 
                                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                            : 'bg-white/[0.06] text-gray-400'
                                    }`}>
                                        {currentManageUser.has_active_sub ? 'Aktif Abonelik' : 'Paketsiz'}
                                    </span>
                                </div>

                                {!isEditingMainPlanInline && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingMainPlanInline(true)}
                                        className="px-3 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>{currentManageUser.has_active_sub ? 'Paketi Düzenle' : '+ Paket Tanımla'}</span>
                                    </button>
                                )}
                            </div>

                            {/* View Mode */}
                            {!isEditingMainPlanInline ? (
                                <div className="space-y-4">
                                    {currentManageUser.has_active_sub ? (
                                        <div className="bg-black/30 border border-white/[0.04] rounded-xl p-4 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="text-base font-bold text-white flex items-center gap-2">
                                                        <span>{currentManageUser.main_plan_name || currentManageUser.plan_name}</span>
                                                        {currentManageUser.is_perpetual && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                                <Infinity className="w-3 h-3" />
                                                                <span>Süresiz</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-3">
                                                        <span>Aylık Kota: <strong className="text-gray-200">{currentManageUser.main_quota_total}</strong></span>
                                                        <span>•</span>
                                                        <span>Harcanan: <strong className="text-gray-200">{currentManageUser.main_quota_used}</strong></span>
                                                        <span>•</span>
                                                        <span>Kalan: <strong className="text-emerald-400">{currentManageUser.main_remaining_formatted}</strong></span>
                                                        <span>•</span>
                                                        <span>Bitiş: <strong className="text-gray-200">{currentManageUser.expires_at || 'Süresiz'}</strong></span>
                                                    </div>
                                                    {currentManageUser.subscription_notes && (
                                                        <div className="text-[11px] text-gray-500 mt-2 italic">
                                                            Not: {currentManageUser.subscription_notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action bar for main plan */}
                                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.04]">
                                                <button
                                                    type="button"
                                                    onClick={() => promptResetUserUsage(currentManageUser)}
                                                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                                    title="Harcanan kotayı 0 yapar"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>Kotayı Sıfırla</span>
                                                </button>

                                                {!currentManageUser.is_perpetual && (
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
                                                    onClick={() => promptRemoveOnlyMainPlan(currentManageUser)}
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
                                                        <span className="text-[11px] text-gray-400">Mevcut Bitiş: {currentManageUser.expires_at}</span>
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
                                        {currentManageUser.extras?.length || 0} Aktif Havuz
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
                                {currentManageUser.extras && currentManageUser.extras.length > 0 ? (
                                    currentManageUser.extras.map((extra) => (
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
                                                        onClick={() => promptRemoveUserExtraQuota(currentManageUser, extra)}
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
                                {currentManageUser.has_any_package && (
                                    <button
                                        type="button"
                                        onClick={() => promptRemoveUserPlan(currentManageUser)}
                                        className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
                                    >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>Tüm Paket ve Ek Kotaları Sıfırla</span>
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setManagePackagesUser(null)}
                                className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors"
                            >
                                Kapat
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: GENERAL CONFIRMATION MODAL (Replaces browser confirm) */}
            {/* ========================================================= */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-white/[0.12] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl shrink-0 ${confirmModal.isDanger ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                {confirmModal.isDanger ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                    {confirmModal.message}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                            <button
                                type="button"
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-gray-300 transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                onClick={confirmModal.onConfirm}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                    confirmModal.isDanger
                                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                        : 'bg-[#00B074] hover:bg-[#009663] text-white shadow-[#00B074]/20'
                                }`}
                            >
                                {confirmModal.confirmText || 'Onayla'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: REJECT PAYMENT NOTIFICATION MODAL */}
            {/* ========================================================= */}
            {rejectingNotification && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <XCircle className="w-5 h-5 text-rose-400" />
                                <span>Ödeme Bildirimini Reddet</span>
                            </h3>
                            <button onClick={() => setRejectingNotification(null)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-400">
                            <strong>{rejectingNotification.user_name}</strong> kullanıcısına ait {rejectingNotification.formatted_amount} tutarındaki bildirim reddedilecek.
                        </p>

                        <form onSubmit={handleConfirmReject} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Reddetme Nedeni (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Örn: Hesap hareketlerinde ödeme bulunamadı."
                                    className="w-full bg-[#06080E] border border-white/[0.08] focus:border-rose-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                                <button
                                    type="button"
                                    onClick={() => setRejectingNotification(null)}
                                    className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-gray-300"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                                >
                                    Bildirimi Reddet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: CREATE / EDIT PLAN MODAL */}
            {/* ========================================================= */}
            {isCreatePlanOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-emerald-400" />
                                <span>{editingPlan ? `Paketi Düzenle: ${editingPlan.name}` : 'Yeni İndirme Paketi Ekle'}</span>
                            </h3>
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
                                        placeholder="Örn: Standart 500 GB"
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
                                        <span className="text-[10px] text-gray-400">1 Ay</span>
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
                                                <span className="text-[10px] text-gray-400">3 Ay</span>
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
                                                <span className="text-[10px] text-gray-400">6 Ay</span>
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
                                                <span className="text-[10px] text-gray-400">12 Ay</span>
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
                                        Eşzamanlı İndirme Limiti (0 = Limitsiz)
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
                                        Hız Limiti Mbps (Boş = Tam Hat Hızı)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Limitsiz için boş"
                                        value={planForm.speed_limit_mbps}
                                        onChange={(e) => setPlanForm({ ...planForm, speed_limit_mbps: e.target.value })}
                                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-6 pt-1">
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

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
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
                                    {isSubmittingPlan ? 'Kaydediliyor...' : (editingPlan ? 'Güncelle' : 'Paketi Kaydet')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: DELETE PLAN WITH TRANSFER */}
            {/* ========================================================= */}
            {deletingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Paketi Sil: {deletingPlan.name}</h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Bu paketi silmek istediğinize emin misiniz? Bu pakete sahip aktif aboneleri başka bir pakete transfer edebilirsiniz.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-300">
                                Mevcut Aboneler İçin Transfer Hedefi:
                            </label>
                            <select
                                value={targetPlanForDelete}
                                onChange={(e) => setTargetPlanForDelete(e.target.value)}
                                className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                            >
                                <option value="none">Abonelikleri İptal Et (Paketsiz / Standart Yap)</option>
                                {plans.filter(p => p.id !== deletingPlan.id).map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} Paketine Transfer Et
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
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
            {/* MODAL: ASSIGN PLAN / QUOTA MODAL */}
            {/* ========================================================= */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-white/[0.1] rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-emerald-400" />
                                <span>{assignModalUser ? `${assignModalUser.name} - Kota & Paket Tanımla` : 'Kullanıcıya Kota / Paket Ata'}</span>
                            </h3>
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
                                    <option value="custom">Özel Boyutlu Kota (GB)</option>
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
                                    placeholder="Örn: Manuel tanımlandı"
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
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
            {/* MODAL: DIRECT EXTRA QUOTA MODAL */}
            {/* ========================================================= */}
            {extraQuotaModalUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-400" />
                                <span>Ek Kota Tanımla (+GB)</span>
                            </h3>
                            <button onClick={() => setExtraQuotaModalUser(null)} className="text-gray-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-400">
                            <strong>{extraQuotaModalUser.name}</strong> kullanıcısına mevcut paket kotasının üzerine eklenecek süreli ek indirme kotası tanımlayın.
                        </p>

                        <form onSubmit={handleSaveExtraQuota} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Miktar (GB)</label>
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
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Açıklama (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={extraQuotaForm.name}
                                    onChange={(e) => setExtraQuotaForm({ ...extraQuotaForm, name: e.target.value })}
                                    placeholder="Örn: Manuel Telafi Kotası"
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
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
                                    {isSubmittingExtraQuota ? 'Ekleniyor...' : 'Ek Kotayı Tanımla'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: EXTEND DURATION MODAL */}
            {/* ========================================================= */}
            {extendDurationUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-indigo-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
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
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Açıklama / Not (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={extendDurationNotes}
                                    onChange={(e) => setExtendDurationNotes(e.target.value)}
                                    placeholder="Örn: Sunucu bakım telafisi"
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
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
            {/* MODAL: EDIT PAYMENT METHOD MODAL */}
            {/* ========================================================= */}
            {editingMethod && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#0A0D15] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Coins className="w-5 h-5 text-emerald-400" />
                                <span>Ödeme Yöntemini Düzenle: {editingMethod.name}</span>
                            </h3>
                            <button onClick={() => setEditingMethod(null)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
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

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
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
