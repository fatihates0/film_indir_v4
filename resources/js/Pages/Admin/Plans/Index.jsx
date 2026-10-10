import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '../../../Components/AdminLayout';
import {
    Plus,
    UserCheck,
    CheckCircle2,
    AlertTriangle,
    Layers,
    Users,
    Receipt,
    Coins,
    History
} from 'lucide-react';

// Subcomponents
import StatsKpiCards from './Components/StatsKpiCards';
import PlansCatalogTab from './Components/PlansCatalogTab';
import UsersTab from './Components/UsersTab';
import PaymentNotificationsTab from './Components/PaymentNotificationsTab';
import PaymentMethodsTab from './Components/PaymentMethodsTab';
import SubscriptionsHistoryTab from './Components/SubscriptionsHistoryTab';

// Modals
import PlanFormModal from './Components/Modals/PlanFormModal';
import DeletePlanModal from './Components/Modals/DeletePlanModal';
import AssignPlanModal from './Components/Modals/AssignPlanModal';
import ManagePackagesModal from './Components/Modals/ManagePackagesModal';
import DirectExtraQuotaModal from './Components/Modals/DirectExtraQuotaModal';
import ExtendDurationModal from './Components/Modals/ExtendDurationModal';
import RejectNotificationModal from './Components/Modals/RejectNotificationModal';
import EditPaymentMethodModal from './Components/Modals/EditPaymentMethodModal';
import ConfirmActionModal from './Components/Modals/ConfirmActionModal';

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

    // Modals state
    const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [deletingPlan, setDeletingPlan] = useState(null);

    // Assign plan/quota modal state
    const [assignModalUser, setAssignModalUser] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    // Direct Extra Quota Modal State
    const [extraQuotaModalUser, setExtraQuotaModalUser] = useState(null);

    // Extend Duration Modal State
    const [extendDurationUser, setExtendDurationUser] = useState(null);

    // Comprehensive User Packages Management Modal State
    const [managePackagesUser, setManagePackagesUser] = useState(null);

    // Reject Payment Notification Modal
    const [rejectingNotification, setRejectingNotification] = useState(null);

    // Payment Method Edit Modal State
    const [editingMethod, setEditingMethod] = useState(null);

    // Confirmation Modal (Custom friendly dialog)
    const [confirmModal, setConfirmModal] = useState(null);

    // Data helpers
    const usersList = Array.isArray(users) ? users : (users?.data || []);
    const notifsList = Array.isArray(paymentNotifications) ? paymentNotifications : (paymentNotifications?.data || []);
    const pendingCount = stats?.pendingNotificationsCount ?? 0;

    // Live-synced user for manage packages modal
    const currentManageUser = managePackagesUser
        ? (usersList.find((u) => u.id === managePackagesUser.id) || managePackagesUser)
        : null;

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

    // Plan Actions
    const handleOpenCreatePlan = () => {
        setEditingPlan(null);
        setIsCreatePlanOpen(true);
    };

    const handleOpenEditPlan = (plan) => {
        setEditingPlan(plan);
        setIsCreatePlanOpen(true);
    };

    const handleTogglePlan = (plan) => {
        router.post(`/admin/plans/${plan.id}/toggle`, {}, {
            preserveScroll: true,
        });
    };

    const handleClonePlan = (plan) => {
        router.post(`/admin/plans/${plan.id}/clone`, {}, {
            preserveScroll: true,
        });
    };

    // Assign Modal
    const handleOpenAssignModal = (user = null) => {
        setAssignModalUser(user);
        setIsAssignModalOpen(true);
    };

    // Reset User Usage with friendly confirmation
    const promptResetUserUsage = (user) => {
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

    // Remove User Plan with friendly confirmation
    const promptRemoveUserPlan = (user) => {
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

    // Remove single extra quota pool
    const promptRemoveUserExtraQuota = (user, extra) => {
        setConfirmModal({
            title: 'Ek Kota Havuzunu Sil',
            message: `"${user.name}" kullanıcısına ait "${extra.name}" (${extra.remaining_formatted || ''} kalan) ek kota havuzunu silmek istediğinizden emin misiniz?`,
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

    // Toggle Payment Method
    const handleTogglePaymentMethod = (method) => {
        router.post(`/admin/payment-methods/${method.id}/toggle`, {}, {
            preserveScroll: true,
        });
    };

    // Sync Jellyfin/Emby
    const handleSyncMediaAccount = (user) => {
        router.post(`/admin/plans/users/${user.id}/sync-media-account`, {}, {
            preserveScroll: true,
        });
    };

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

                {/* 1. INTERACTIVE KPI CARDS */}
                <StatsKpiCards
                    stats={stats}
                    plans={plans}
                    currentTab={currentSection}
                    pendingCount={pendingCount}
                    onSwitchSection={handleSwitchSection}
                />

                {/* 2. COMFORTABLE HORIZONTAL TAB NAVIGATION */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 overflow-x-auto no-scrollbar gap-2">
                    <div className="flex items-center gap-1.5 bg-[#06080E] p-1 rounded-2xl border border-white/[0.06]">
                        
                        {/* Tab 1: Paketler */}
                        <button
                            onClick={() => handleSwitchSection('plans')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                currentSection === 'plans'
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
                                currentSection === 'users'
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
                                currentSection === 'notifications'
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
                                currentSection === 'methods'
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
                                currentSection === 'history'
                                    ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                        >
                            <History className="w-3.5 h-3.5" />
                            <span>İşlem Geçmişi</span>
                        </button>

                    </div>
                </div>

                {/* SECTIONS / TABS */}
                {currentSection === 'plans' && (
                    <PlansCatalogTab
                        plans={plans}
                        onOpenCreatePlan={handleOpenCreatePlan}
                        onOpenEditPlan={handleOpenEditPlan}
                        onTogglePlan={handleTogglePlan}
                        onClonePlan={handleClonePlan}
                        onDeletePlan={(plan) => setDeletingPlan(plan)}
                        onSwitchSection={handleSwitchSection}
                    />
                )}

                {currentSection === 'users' && (
                    <UsersTab
                        users={users}
                        plans={plans}
                        stats={stats}
                        filters={filters}
                        onOpenAssignModal={handleOpenAssignModal}
                        onOpenManagePackagesModal={(u) => setManagePackagesUser(u)}
                        onOpenExtraQuotaModal={(u) => setExtraQuotaModalUser(u)}
                        onOpenExtendDurationModal={(u) => setExtendDurationUser(u)}
                        onResetUserUsage={promptResetUserUsage}
                        onSyncMediaAccount={handleSyncMediaAccount}
                        onRemoveUserPlan={promptRemoveUserPlan}
                    />
                )}

                {currentSection === 'notifications' && (
                    <PaymentNotificationsTab
                        paymentNotifications={paymentNotifications}
                        pendingCount={pendingCount}
                        filters={filters}
                        onApproveNotification={promptApproveNotification}
                        onOpenRejectModal={(pn) => setRejectingNotification(pn)}
                    />
                )}

                {currentSection === 'methods' && (
                    <PaymentMethodsTab
                        paymentMethods={paymentMethods}
                        onTogglePaymentMethod={handleTogglePaymentMethod}
                        onOpenEditMethod={(m) => setEditingMethod(m)}
                    />
                )}

                {currentSection === 'history' && (
                    <SubscriptionsHistoryTab
                        subscriptionsHistory={subscriptionsHistory}
                        filters={filters}
                    />
                )}

            </div>

            {/* MODALS - Conditional Mounting to prevent any unnecessary DOM bloat */}
            <PlanFormModal
                isOpen={isCreatePlanOpen}
                editingPlan={editingPlan}
                plansCount={plans.length}
                onClose={() => {
                    setIsCreatePlanOpen(false);
                    setEditingPlan(null);
                }}
            />

            <DeletePlanModal
                plan={deletingPlan}
                plans={plans}
                onClose={() => setDeletingPlan(null)}
            />

            <AssignPlanModal
                isOpen={isAssignModalOpen}
                user={assignModalUser}
                plans={plans}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setAssignModalUser(null);
                }}
            />

            <ManagePackagesModal
                user={currentManageUser}
                plans={plans}
                onClose={() => setManagePackagesUser(null)}
                onSyncMediaAccount={handleSyncMediaAccount}
                onResetUserUsage={promptResetUserUsage}
                onRemoveOnlyMainPlan={promptRemoveOnlyMainPlan}
                onRemoveUserExtraQuota={promptRemoveUserExtraQuota}
                onRemoveUserPlan={promptRemoveUserPlan}
            />

            <DirectExtraQuotaModal
                user={extraQuotaModalUser}
                onClose={() => setExtraQuotaModalUser(null)}
            />

            <ExtendDurationModal
                user={extendDurationUser}
                onClose={() => setExtendDurationUser(null)}
            />

            <RejectNotificationModal
                notification={rejectingNotification}
                onClose={() => setRejectingNotification(null)}
            />

            <EditPaymentMethodModal
                method={editingMethod}
                onClose={() => setEditingMethod(null)}
            />

            <ConfirmActionModal
                modal={confirmModal}
                onClose={() => setConfirmModal(null)}
            />
        </AdminLayout>
    );
}
