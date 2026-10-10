import React from 'react';
import { Plus, Edit3, Trash2, Copy, ChevronRight } from 'lucide-react';

export default function PlansCatalogTab({
    plans = [],
    onOpenCreatePlan,
    onOpenEditPlan,
    onTogglePlan,
    onClonePlan,
    onDeletePlan,
    onSwitchSection,
}) {
    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-white">Mevcut İndirme Paketleri</h3>
                    <p className="text-xs text-gray-400">Kullanıcılara sunulan indirme kotaları, fiyatlar ve hız limitleri.</p>
                </div>
                <button
                    onClick={onOpenCreatePlan}
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
                                        onClick={() => onTogglePlan(plan)}
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
                                    onClick={() => onSwitchSection('users', { user_plan: plan.id })}
                                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                                >
                                    <span>Aboneleri Gör</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onClonePlan(plan)}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                                        title="Paketi Kopyala"
                                    >
                                        <Copy className="w-3 h-3" />
                                        <span>Klonla</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onOpenEditPlan(plan)}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                                        title="Düzenle"
                                    >
                                        <Edit3 className="w-3 h-3" />
                                        <span>Düzenle</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDeletePlan(plan)}
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
    );
}
