import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from './Layout';
import { 
    LayoutDashboard, 
    HardDrive, 
    Film, 
    Package, 
    ShieldCheck, 
    ChevronRight
} from 'lucide-react';

export default function AdminLayout({ 
    children, 
    title = 'Yönetim Konsolu', 
    subtitle,
    activeTab = 'overview', 
    statsSummary = {},
    headerActions = null 
}) {
    const { auth } = usePage().props;
    const currentUser = auth?.user;

    const navItems = [
        {
            id: 'overview',
            label: 'Genel Bakış',
            href: '/admin',
            icon: LayoutDashboard,
            badge: null
        },
        {
            id: 'storage-boxes',
            label: 'Storage Box',
            href: '/admin/storage-boxes',
            icon: HardDrive,
            badge: statsSummary?.total_boxes !== undefined ? statsSummary.total_boxes : null
        },
        {
            id: 'medias',
            label: 'Medya Arşivi',
            href: '/admin/medias',
            icon: Film,
            badge: statsSummary?.total_medias !== undefined ? statsSummary.total_medias : null
        },
        {
            id: 'plans',
            label: 'Paket & Kotalar',
            href: '/admin/plans',
            icon: Package,
            badge: statsSummary?.total_plans !== undefined ? statsSummary.total_plans : null
        },
    ];

    return (
        <Layout>
            <Head title={`${title} - SineKutu Admin`} />

            <div className="min-h-screen bg-[#07090E] text-gray-100 font-sans selection:bg-[#00B074] selection:text-white">
                
                {/* UNIFIED STICKY CONSOLE SUB-HEADER */}
                <div className="sticky top-20 z-40 bg-[#0A0D14]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl shadow-black/50 transition-all">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        {/* Title & Console Identity */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#00B074]/15 border border-[#00B074]/30 flex items-center justify-center text-[#00B074] shadow-lg shadow-[#00B074]/10 shrink-0">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                        Sistem Yönetim Konsolu
                                    </h1>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        v3.4 Live
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-400">
                                    Yönetici: <span className="text-gray-200 font-medium">{currentUser?.name || 'Admin'}</span>
                                </p>
                            </div>
                        </div>

                        {/* Navigation Tabs (Console Navigation) */}
                        <nav className="flex items-center gap-1 bg-[#10141F] p-1.5 rounded-xl border border-white/[0.08] text-xs overflow-x-auto no-scrollbar scrollbar-none self-start md:self-auto">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                                            isActive
                                                ? 'bg-[#00B074] text-white shadow-md shadow-[#00B074]/20'
                                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                        <span>{item.label}</span>
                                        {item.badge !== null && item.badge !== undefined && (
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'
                                            }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* MAIN CONSOLE BODY */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
                    
                    {/* BREADCRUMB & PAGE TITLE HEADER (IF PROVIDED) */}
                    {(title || headerActions) && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.04]">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Link href="/admin" className="hover:text-emerald-400 transition-colors">Admin</Link>
                                    <ChevronRight className="w-3 h-3 text-gray-600" />
                                    <span className="text-gray-200 font-medium">{title}</span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p className="text-xs text-gray-400 max-w-2xl">
                                        {subtitle}
                                    </p>
                                )}
                            </div>

                            {headerActions && (
                                <div className="flex items-center gap-3 shrink-0">
                                    {headerActions}
                                </div>
                            )}
                        </div>
                    )}

                    {children}
                </div>
            </div>
        </Layout>
    );
}
