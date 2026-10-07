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
    Shield
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
                    <div className="flex items-center gap-2 text-xs">
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
                                                <div className="bg-[#07090E] p-2.5 rounded-xl border border-white/[0.04]">
                                                    <span className="text-gray-500 block text-[10px] uppercase tracking-wider font-semibold">1 Aylık</span>
                                                    <span className="text-sm font-bold text-white">₺{parseFloat(plan.price_1m).toFixed(2)}</span>
                                                </div>
                                                <div className="bg-[#07090E] p-2.5 rounded-xl border border-white/[0.04]">
                                                    <span className="text-gray-500 block text-[10px] uppercase tracking-wider font-semibold">3 Aylık</span>
                                                    <span className="text-sm font-bold text-white">₺{parseFloat(plan.price_3m).toFixed(2)}</span>
                                                </div>
                                                <div className="bg-[#07090E] p-2.5 rounded-xl border border-white/[0.04]">
                                                    <span className="text-gray-500 block text-[10px] uppercase tracking-wider font-semibold">6 Aylık</span>
                                                    <span className="text-sm font-bold text-white">₺{parseFloat(plan.price_6m).toFixed(2)}</span>
                                                </div>
                                                <div className="bg-[#07090E] p-2.5 rounded-xl border border-white/[0.04]">
                                                    <span className="text-gray-500 block text-[10px] uppercase tracking-wider font-semibold">12 Aylık</span>
                                                    <span className="text-sm font-bold text-emerald-400">₺{parseFloat(plan.price_12m).toFixed(2)}</span>
                                                </div>
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
                                            <th className="px-6 py-4">Bitiş Tarihi</th>
                                            <th className="px-6 py-4 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#07090E] border border-white/[0.06]">
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

            </div>
        </AdminLayout>
    );
}
