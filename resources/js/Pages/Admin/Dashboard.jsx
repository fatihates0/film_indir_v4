import React, { useState, useCallback } from 'react';
import AdminLayout from '../../Components/AdminLayout';
import {
    Activity,
    Users,
    SlidersHorizontal,
    AlertCircle,
    CheckCircle2,
    X
} from 'lucide-react';

import OverviewTab from './DashboardComponents/OverviewTab';
import UsersDirectoryTab from './DashboardComponents/UsersDirectoryTab';
import SettingsTab from './DashboardComponents/SettingsTab';

export default function AdminDashboard({ 
    stats, 
    recentUsers = [], 
    storageBoxes = [],
    plans = [],
    heroSettings = { mode: 'auto', slots: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
    heroSlotPreviews = {},
    ipAccessSettings = { whitelist: [], blacklist: [] },
    faqSettings = []
}) {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'settings'
    const [toastNotice, setToastNotice] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToastNotice({ message, type });
        setTimeout(() => setToastNotice(null), 3500);
    }, []);

    return (
        <AdminLayout
            title="Sistem Genel Bakış"
            subtitle="Platform telemetrisi, depolama düğümleri, kullanıcı hesapları ve vitrin manşet yönetimi."
            activeTab="overview"
            statsSummary={{ 
                total_boxes: stats?.storage?.total_boxes || storageBoxes.length || 0,
                total_plans: plans?.length || 0
            }}
            headerActions={
                <div className="flex items-center gap-1.5 bg-[#0D111A] p-1.5 rounded-xl border border-white/[0.08] shadow-inner text-xs">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
                            activeTab === 'overview'
                                ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/25'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                        }`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Genel Bakış</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
                            activeTab === 'users'
                                ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/25'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>Kullanıcılar</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'
                        }`}>
                            {stats?.total_users || 0}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
                            activeTab === 'settings'
                                ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/25'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                        }`}
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Sistem Ayarları</span>
                    </button>
                </div>
            }
        >
            {/* FLOATING TOAST NOTIFICATION */}
            {toastNotice && (
                <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-semibold backdrop-blur-xl ${
                        toastNotice.type === 'error'
                            ? 'bg-rose-950/90 text-rose-200 border-rose-500/30 shadow-rose-950/50'
                            : 'bg-[#00B074]/15 text-emerald-300 border-[#00B074]/40 shadow-[#00B074]/20'
                    }`}>
                        {toastNotice.type === 'error' ? (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4 text-[#00B074] shrink-0" />
                        )}
                        <span>{toastNotice.message}</span>
                        <button onClick={() => setToastNotice(null)} className="ml-2 hover:opacity-75">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                    <OverviewTab
                        stats={stats}
                        recentUsers={recentUsers}
                        storageBoxes={storageBoxes}
                        onNavigateToUsers={() => setActiveTab('users')}
                        showToast={showToast}
                    />
                )}

                {/* TAB 2: USERS DIRECTORY */}
                {activeTab === 'users' && (
                    <UsersDirectoryTab recentUsers={recentUsers} />
                )}

                {/* TAB 3: SETTINGS */}
                {activeTab === 'settings' && (
                    <SettingsTab
                        heroSettings={heroSettings}
                        heroSlotPreviews={heroSlotPreviews}
                        ipAccessSettings={ipAccessSettings}
                        faqSettings={faqSettings}
                        showToast={showToast}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
