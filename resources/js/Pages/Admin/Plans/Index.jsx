import React, { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '../../../Components/Layout';
import {
    Package,
    Plus,
    Edit3,
    Trash2,
    Users,
    Clock,
    Zap,
    Check,
    X,
    Search,
    HardDrive,
    Shield,
    ArrowRight,
    AlertTriangle,
    CheckCircle2,
    Infinity,
    Layers,
    Filter,
    DollarSign,
    Info,
    RefreshCw,
    UserCheck,
    UserX,
    Sparkles
} from 'lucide-react';

export default function PlansIndex({ plans = [], users = [] }) {
    const { flash } = usePage().props;

    // Main section tabs: 'plans' | 'users'
    const [activeSection, setActiveSection] = useState('plans');

    // Search and filters
    const [planSearch, setPlanSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userPlanFilter, setUserPlanFilter] = useState('all');

    // Modals state
    const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [deletingPlan, setDeletingPlan] = useState(null);
    const [targetPlanForDelete, setTargetPlanForDelete] = useState('none');

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
        max_parallel_downloads: 4,
        speed_limit_mbps: '',
        is_active: true,
        sort_order: plans.length + 1,
    };
    const [planForm, setPlanForm] = useState(initialPlanForm);
    const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

    // Initial user assignment form state
    const initialAssignForm = {
        user_id: '',
        plan_id: 'custom', // plan ID or 'custom' or 'none'
        custom_quota_gb: 500,
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

    // Open create plan modal
    const handleOpenCreatePlan = () => {
        setPlanForm({
            ...initialPlanForm,
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
            max_parallel_downloads: plan.max_parallel_downloads || 4,
            speed_limit_mbps: plan.speed_limit_mbps || '',
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
        <Layout title="Paket & Kota Yönetimi - Admin Panel">
            <Head title="Paket & Kota Yönetimi - Admin" />

            <div className="min-h-screen bg-[#07080c] text-slate-100 pb-20">
                {/* Upper Gradient & Glass Header */}
                <div className="border-b border-white/5 bg-gradient-to-b from-black/80 via-[#0b0f19] to-[#07080c]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        
                        {/* Flash Notification */}
                        {flash?.success && (
                            <div className="mb-6 p-4 rounded-xl bg-[#00B074]/10 border border-[#00B074]/30 text-[#00B074] text-sm flex items-center justify-between animate-fadeIn">
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    <span>{flash.success}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="p-2 rounded-xl bg-[#00B074]/10 text-[#00B074] border border-[#00B074]/20">
                                        <Package className="w-6 h-6" />
                                    </span>
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                        Paket & Kota Yönetimi
                                    </h1>
                                </div>
                                <p className="text-sm text-gray-400">
                                    Sistem abonelik paketlerini tanımlayın, indirme kotası limitlerini yapılandırın ve kullanıcılara süreli/süresiz özel kotalar atayın.
                                </p>
                            </div>

                            {/* Header Buttons */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleOpenCreatePlan}
                                    className="px-4 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-medium text-sm transition-all shadow-lg shadow-[#00B074]/20 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Yeni Paket Ekle</span>
                                </button>
                                <button
                                    onClick={() => handleOpenAssignModal()}
                                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium text-sm transition-all flex items-center gap-2"
                                >
                                    <UserCheck className="w-4 h-4 text-[#00B074]" />
                                    <span>Kullanıcıya Kota Tanımla</span>
                                </button>
                            </div>
                        </div>

                        {/* Navigation Tabs Bar */}
                        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
                            <div className="flex items-center gap-1 bg-[#10141F] p-1 rounded-xl border border-white/[0.06] text-xs">
                                <Link
                                    href="/admin"
                                    className="px-3.5 py-1.5 rounded-lg transition-colors font-medium text-gray-400 hover:text-gray-200"
                                >
                                    Genel Bakış
                                </Link>
                                <Link
                                    href="/admin/storage-boxes"
                                    className="px-3.5 py-1.5 rounded-lg transition-colors font-medium text-gray-400 hover:text-gray-200 flex items-center gap-1.5"
                                >
                                    <span>Storage Box</span>
                                </Link>
                                <Link
                                    href="/admin/medias"
                                    className="px-3.5 py-1.5 rounded-lg transition-colors font-medium text-gray-400 hover:text-gray-200 flex items-center gap-1.5"
                                >
                                    <span>Medya Arşivi</span>
                                </Link>
                                <Link
                                    href="/admin/plans"
                                    className="px-3.5 py-1.5 rounded-lg transition-colors font-medium bg-white/[0.08] text-white shadow-sm flex items-center gap-1.5"
                                >
                                    <span>Paketler</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#00B074]/20 text-[#00B074] font-mono font-bold">
                                        {plans.length}
                                    </span>
                                </Link>
                            </div>

                            {/* Section Selector */}
                            <div className="flex items-center gap-2 bg-[#0c101d] p-1 rounded-xl border border-white/10 text-xs">
                                <button
                                    onClick={() => setActiveSection('plans')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                                        activeSection === 'plans'
                                            ? 'bg-[#00B074] text-white shadow-md'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <Package className="w-3.5 h-3.5" />
                                    <span>Paket Listesi ({plans.length})</span>
                                </button>
                                <button
                                    onClick={() => setActiveSection('users')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                                        activeSection === 'users'
                                            ? 'bg-[#00B074] text-white shadow-md'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    <span>Kullanıcı Kota Listesi ({users.length})</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Main Content Area */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-[#0f1422]/90 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400 font-medium mb-1">Aktif Paketler</p>
                                <h3 className="text-2xl font-bold text-white">{stats.activePlansCount} <span className="text-xs font-normal text-gray-500">/ {plans.length} Toplam</span></h3>
                            </div>
                            <div className="p-3 rounded-xl bg-[#00B074]/10 text-[#00B074] border border-[#00B074]/20">
                                <Layers className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-[#0f1422]/90 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400 font-medium mb-1">Aktif Abone Kullanıcılar</p>
                                <h3 className="text-2xl font-bold text-white">{stats.totalSubscribedUsers}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-[#0f1422]/90 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400 font-medium mb-1">Süresiz Kota Sahipleri</p>
                                <h3 className="text-2xl font-bold text-emerald-400">{stats.perpetualUsersCount} <span className="text-xs font-normal text-gray-500">Kullanıcı</span></h3>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Infinity className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-[#0f1422]/90 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400 font-medium mb-1">Tanımlı Toplam İndirme Kotası</p>
                                <h3 className="text-2xl font-bold text-amber-400">{stats.totalAllocatedGb.toLocaleString('tr-TR')} <span className="text-xs font-normal text-gray-500">GB</span></h3>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <HardDrive className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 1: ABONELİK PAKETLERİ (PLAN CARDS & MANAGEMENT) */}
                    {activeSection === 'plans' && (
                        <div className="space-y-6">
                            {/* Search & Filter header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d111d] p-4 rounded-2xl border border-white/5">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Paket adına veya slug'a göre ara..."
                                        value={planSearch}
                                        onChange={(e) => setPlanSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>
                                <div className="text-xs text-gray-400">
                                    Toplam <strong className="text-white">{filteredPlans.length}</strong> paket listeleniyor
                                </div>
                            </div>

                            {/* Plan Cards Grid */}
                            {filteredPlans.length === 0 ? (
                                <div className="p-12 text-center bg-[#0d111d] rounded-2xl border border-white/5">
                                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                    <h3 className="text-base font-semibold text-white mb-1">Henüz paket bulunmuyor</h3>
                                    <p className="text-xs text-gray-400 mb-4">Sisteme henüz hiç paket eklenmemiş veya aramanıza uygun paket bulunamadı.</p>
                                    <button
                                        onClick={handleOpenCreatePlan}
                                        className="px-4 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-medium"
                                    >
                                        + Yeni Paket Oluştur
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredPlans.map((plan) => (
                                        <div
                                            key={plan.id}
                                            className={`relative bg-[#0d111d] rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-white/20 ${
                                                plan.is_active ? 'border-white/10 shadow-lg shadow-black/40' : 'border-white/5 opacity-75'
                                            }`}
                                        >
                                            {/* Top Status & Ribbon */}
                                            <div className="p-6 border-b border-white/5 relative">
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div>
                                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5 uppercase">
                                                            {plan.slug}
                                                        </span>
                                                        <h3 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
                                                            {plan.name}
                                                        </h3>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                                                            plan.is_active
                                                                ? 'bg-[#00B074]/15 border-[#00B074]/30 text-[#00B074]'
                                                                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                                        }`}>
                                                            {plan.is_active ? 'Aktif Paket' : 'Pasif'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-gray-400 line-clamp-2 min-h-[32px]">
                                                    {plan.description || 'Bu paket için açıklama belirtilmedi.'}
                                                </p>

                                                {/* Quota Feature Highlight */}
                                                <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-[#00B074]/15 to-emerald-900/10 border border-[#00B074]/20 flex items-center justify-between">
                                                    <span className="text-xs text-gray-300 font-medium">Aylık İndirme Kotası</span>
                                                    <span className="text-base font-bold text-emerald-400 font-mono">
                                                        {plan.monthly_quota_gb.toLocaleString('tr-TR')} GB
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Details & Pricing */}
                                            <div className="p-6 space-y-4 flex-1">
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                                                        <span className="text-gray-500 block text-[10px]">1 Aylık Fiyat</span>
                                                        <span className="text-sm font-semibold text-white">₺{parseFloat(plan.price_1m).toFixed(2)}</span>
                                                    </div>
                                                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                                                        <span className="text-gray-500 block text-[10px]">3 Aylık Fiyat</span>
                                                        <span className="text-sm font-semibold text-white">₺{parseFloat(plan.price_3m).toFixed(2)}</span>
                                                    </div>
                                                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                                                        <span className="text-gray-500 block text-[10px]">6 Aylık Fiyat</span>
                                                        <span className="text-sm font-semibold text-white">₺{parseFloat(plan.price_6m).toFixed(2)}</span>
                                                    </div>
                                                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                                                        <span className="text-gray-500 block text-[10px]">12 Aylık Fiyat</span>
                                                        <span className="text-sm font-semibold text-emerald-400">₺{parseFloat(plan.price_12m).toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-white/5 space-y-2 text-xs text-gray-400">
                                                    <div className="flex justify-between items-center">
                                                        <span>Eşzamanlı İndirme Limiti:</span>
                                                        <span className="text-white font-medium">{plan.max_parallel_downloads} Bağlantı</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span>Hız Sınırı:</span>
                                                        <span className="text-white font-medium">
                                                            {plan.speed_limit_mbps ? `${plan.speed_limit_mbps} Mbps` : 'Sınırsız / Tam Hız'}
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

                                            {/* Action Buttons */}
                                            <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between gap-3">
                                                <button
                                                    onClick={() => handleOpenEditPlan(plan)}
                                                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                                                    <span>Düzenle</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setDeletingPlan(plan);
                                                        setTargetPlanForDelete('none');
                                                    }}
                                                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
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
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d111d] p-4 rounded-2xl border border-white/5">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Kullanıcı adı veya e-posta ile ara..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <select
                                        value={userPlanFilter}
                                        onChange={(e) => setUserPlanFilter(e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B074]"
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
                            <div className="bg-[#0d111d] rounded-2xl border border-white/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-black/50 text-gray-400 border-b border-white/5 uppercase text-[10px] tracking-wider font-semibold">
                                            <tr>
                                                <th className="px-6 py-4">Kullanıcı</th>
                                                <th className="px-6 py-4">Aktif Paket / Kota</th>
                                                <th className="px-6 py-4">Kota Kullanımı</th>
                                                <th className="px-6 py-4">Bitiş Tarihi</th>
                                                <th className="px-6 py-4 text-right">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                                        Aramanıza veya filtrenize uygun kullanıcı bulunamadı.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map((user) => (
                                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00B074] to-emerald-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                                                                    {user.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-white flex items-center gap-2">
                                                                        <span>{user.name}</span>
                                                                        {user.role === 'admin' && (
                                                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-mono">ADMIN</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-400">{user.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            {user.has_active_sub ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-1 rounded-lg bg-[#00B074]/15 border border-[#00B074]/30 text-[#00B074] font-semibold text-xs flex items-center gap-1.5">
                                                                        <Sparkles className="w-3 h-3" />
                                                                        {user.plan_name}
                                                                    </span>
                                                                    {user.is_perpetual && (
                                                                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                                                            <Infinity className="w-3 h-3" /> Süresiz
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 text-xs">
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
                                                                    <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
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
                                                                    className="px-3 py-1.5 rounded-lg bg-[#00B074]/10 hover:bg-[#00B074]/20 border border-[#00B074]/30 text-[#00B074] text-xs font-medium transition-colors flex items-center gap-1"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                    <span>{user.has_active_sub ? 'Kota Düzenle' : 'Kota Ata'}</span>
                                                                </button>

                                                                {user.has_active_sub && (
                                                                    <button
                                                                        onClick={() => handleRemoveUserPlan(user)}
                                                                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-medium transition-colors"
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
                </div>
            </div>

            {/* MODAL 1: CREATE / EDIT PLAN */}
            {isCreatePlanOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-[#0f1422] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-[#00B074]" />
                                <span>{editingPlan ? `'${editingPlan.name}' Paketini Düzenle` : 'Yeni Abonelik Paketi Oluştur'}</span>
                            </h3>
                            <button
                                onClick={() => setIsCreatePlanOpen(false)}
                                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Paket Adı *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Örn: VIP Paket, Temel Paket"
                                        value={planForm.name}
                                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Slug (Benzersiz Kod)</label>
                                    <input
                                        type="text"
                                        placeholder="Örn: vip, basic, premium (Boş bırakılırsa otomatik)"
                                        value={planForm.slug}
                                        onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
                                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">Açıklama</label>
                                <textarea
                                    rows="2"
                                    placeholder="Paket avantajları, içerik hakları..."
                                    value={planForm.description}
                                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-black/30 border border-white/5">
                                <div>
                                    <label className="block text-xs font-medium text-emerald-400 mb-1">Aylık İndirme Kotası (GB) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="100000"
                                        placeholder="Örn: 500"
                                        value={planForm.monthly_quota_gb}
                                        onChange={(e) => setPlanForm({ ...planForm, monthly_quota_gb: parseInt(e.target.value) || '' })}
                                        className="w-full px-3 py-2 bg-black/60 border border-emerald-500/30 rounded-xl text-sm font-bold text-emerald-400 focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Eşzamanlı İndirme Limiti</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="20"
                                        value={planForm.max_parallel_downloads}
                                        onChange={(e) => setPlanForm({ ...planForm, max_parallel_downloads: parseInt(e.target.value) || 4 })}
                                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
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
                                            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
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
                                            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
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
                                            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
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
                                            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Hız Sınırı (Mbps, İsteğe Bağlı)</label>
                                    <input
                                        type="number"
                                        placeholder="Boş bırakılırsa sınırsız"
                                        value={planForm.speed_limit_mbps}
                                        onChange={(e) => setPlanForm({ ...planForm, speed_limit_mbps: e.target.value })}
                                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Sıralama Önceliği</label>
                                    <input
                                        type="number"
                                        value={planForm.sort_order}
                                        onChange={(e) => setPlanForm({ ...planForm, sort_order: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={planForm.is_active}
                                        onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00B074]" />
                                </label>
                                <span className="text-xs font-medium text-gray-300">Bu paket sitede aktif olarak listelensin mi?</span>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatePlanOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingPlan}
                                    className="px-5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-semibold shadow-lg shadow-[#00B074]/20 flex items-center gap-2"
                                >
                                    {isSubmittingPlan && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>{editingPlan ? 'Değişiklikleri Kaydet' : 'Paketi Oluştur'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: DELETE PLAN & USER TRANSFER */}
            {deletingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-[#0f1422] border border-rose-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
                        <div className="flex items-center gap-3 text-rose-400 mb-4">
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Paket Silme ve Kullanıcı Transferi</h3>
                                <p className="text-xs text-rose-300/80">'{deletingPlan.name}' paketi silinecektir.</p>
                            </div>
                        </div>

                        <div className="space-y-4 my-4 text-xs text-gray-300 bg-black/40 p-4 rounded-xl border border-white/5">
                            <p>
                                Bu pakete kayıtlı <strong className="text-emerald-400 font-bold">{deletingPlan.subscriptions_count || 0} kullanıcı</strong> bulunmaktadır.
                            </p>

                            <div>
                                <label className="block text-xs font-medium text-white mb-2">
                                    Paketi silinirken bu kullanıcıları nereye aktarmak istersiniz?
                                </label>

                                <select
                                    value={targetPlanForDelete}
                                    onChange={(e) => setTargetPlanForDelete(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-black/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                >
                                    <option value="none">❌ Paketsiz Yap (Kullanıcı Aboneliklerini Sonlandır)</option>
                                    {plans.filter(p => p.id !== deletingPlan.id).map(p => (
                                        <option key={p.id} value={p.id}>
                                            🔄 '{p.name}' Paketine Transfer Et ({p.monthly_quota_gb} GB)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {targetPlanForDelete === 'none' ? (
                                <p className="text-[11px] text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                                    ⚠️ Seçilen işlem doğrultusunda bu paketteki kullanıcıların aktif abonelikleri iptal edilecek ve üye tipleri varsayılana çekilecektir.
                                </p>
                            ) : (
                                <p className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                                    ✅ Paketteki kullanıcıların abonelikleri seçtiğiniz yeni pakete otomatik güncellenecektir.
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeletingPlan(null)}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
                            >
                                İptal
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeletePlan}
                                disabled={isSubmittingPlan}
                                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 flex items-center gap-2"
                            >
                                {isSubmittingPlan && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                <span>Paketi Sil ve İşlemi Onayla</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: ASSIGN USER PLAN / CUSTOM DOWNLOAD QUOTA */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-[#0f1422] border border-white/10 rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-[#00B074]" />
                                <span>Kullanıcıya Paket / İndirme Kotası Tanımla</span>
                            </h3>
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAssignment} className="space-y-4">
                            {/* User Selection */}
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">Hedef Kullanıcı *</label>
                                <select
                                    required
                                    value={assignForm.user_id}
                                    onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                >
                                    <option value="" disabled>Kullanıcı Seçiniz...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.email}) - Current: {u.plan_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Plan vs Custom Quota choice */}
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">Tanımlanacak Paket veya Kota Tipi *</label>
                                <select
                                    value={assignForm.plan_id}
                                    onChange={(e) => setAssignForm({ ...assignForm, plan_id: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                >
                                    <optgroup label="Sistem Paketleri">
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id}>
                                                📦 {p.name} ({p.monthly_quota_gb} GB Kotası)
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Özel Kota Tanımları">
                                        <option value="custom">⚡ Özel İndirme Kotası Belirle (GB Manuel)</option>
                                        <option value="none">❌ Paket/Kota Kaldır (Paketsiz Yap)</option>
                                    </optgroup>
                                </select>
                            </div>

                            {/* Custom Quota Input if 'custom' selected */}
                            {(assignForm.plan_id === 'custom' || assignForm.plan_id === '' || !plans.some(p => String(p.id) === String(assignForm.plan_id))) && assignForm.plan_id !== 'none' && (
                                <div className="p-4 rounded-xl bg-[#00B074]/10 border border-[#00B074]/30">
                                    <label className="block text-xs font-semibold text-[#00B074] mb-1">
                                        Özel İndirme Kotası Miktarı (GB) *
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            max="100000"
                                            value={assignForm.custom_quota_gb}
                                            onChange={(e) => setAssignForm({ ...assignForm, custom_quota_gb: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 bg-black/60 border border-emerald-500/30 rounded-xl text-base font-bold text-white focus:outline-none focus:border-[#00B074]"
                                        />
                                        <span className="text-sm font-bold text-emerald-400">GB</span>
                                    </div>
                                </div>
                            )}

                            {/* Duration Option */}
                            {assignForm.plan_id !== 'none' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Abonelik / Kota Süresi *</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAssignForm({ ...assignForm, duration_type: '1' })}
                                            className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                                                assignForm.duration_type === '1'
                                                    ? 'bg-[#00B074] border-[#00B074] text-white'
                                                    : 'bg-black/40 border-white/10 text-gray-300 hover:border-white/20'
                                            }`}
                                        >
                                            1 Ay
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAssignForm({ ...assignForm, duration_type: '3' })}
                                            className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                                                assignForm.duration_type === '3'
                                                    ? 'bg-[#00B074] border-[#00B074] text-white'
                                                    : 'bg-black/40 border-white/10 text-gray-300 hover:border-white/20'
                                            }`}
                                        >
                                            3 Ay
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAssignForm({ ...assignForm, duration_type: '6' })}
                                            className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                                                assignForm.duration_type === '6'
                                                    ? 'bg-[#00B074] border-[#00B074] text-white'
                                                    : 'bg-black/40 border-white/10 text-gray-300 hover:border-white/20'
                                            }`}
                                        >
                                            6 Ay
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAssignForm({ ...assignForm, duration_type: '12' })}
                                            className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                                                assignForm.duration_type === '12'
                                                    ? 'bg-[#00B074] border-[#00B074] text-white'
                                                    : 'bg-black/40 border-white/10 text-gray-300 hover:border-white/20'
                                            }`}
                                        >
                                            12 Ay (1 Yıl)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAssignForm({ ...assignForm, duration_type: 'custom' })}
                                            className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                                                assignForm.duration_type === 'custom'
                                                    ? 'bg-[#00B074] border-[#00B074] text-white'
                                                    : 'bg-black/40 border-white/10 text-gray-300 hover:border-white/20'
                                            }`}
                                        >
                                            Özel Süre (Ay)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAssignForm({ ...assignForm, duration_type: 'perpetual' })}
                                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                                assignForm.duration_type === 'perpetual'
                                                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                    : 'bg-black/40 border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50'
                                            }`}
                                        >
                                            <Infinity className="w-3.5 h-3.5" />
                                            <span>Süresiz</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Custom Months Input */}
                            {assignForm.duration_type === 'custom' && assignForm.plan_id !== 'none' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Kaç Ay Tanımlansın?</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="120"
                                        value={assignForm.custom_months}
                                        onChange={(e) => setAssignForm({ ...assignForm, custom_months: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>
                            )}

                            {assignForm.duration_type === 'perpetual' && assignForm.plan_id !== 'none' && (
                                <p className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                                    <Infinity className="w-4 h-4 shrink-0" />
                                    <span>Bu kullanıcı için tanımlanan kota son kullanma tarihi olmadan sınırsız süre geçerli olacaktır.</span>
                                </p>
                            )}

                            {/* Notes & Price */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Tahsil Edilen Ücret (₺, Opsiyonel)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Örn: 0.00"
                                        value={assignForm.price_paid}
                                        onChange={(e) => setAssignForm({ ...assignForm, price_paid: e.target.value })}
                                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Yönetici Notu (Opsiyonel)</label>
                                    <input
                                        type="text"
                                        placeholder="Örn: Hediye kota verildi"
                                        value={assignForm.notes}
                                        onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#00B074]"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingAssign}
                                    className="px-5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-semibold shadow-lg shadow-[#00B074]/20 flex items-center gap-2"
                                >
                                    {isSubmittingAssign && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Atamayı Kaydet</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
