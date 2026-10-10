import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Package, X } from 'lucide-react';

export default function PlanFormModal({ isOpen, editingPlan, plansCount = 0, onClose }) {
    if (!isOpen) return null;

    const initialPlanForm = {
        name: editingPlan?.name || '',
        slug: editingPlan?.slug || '',
        type: editingPlan?.type || 'individual',
        description: editingPlan?.description || '',
        monthly_quota_gb: editingPlan?.monthly_quota_gb || (editingPlan ? 100 : 500),
        price_1m: editingPlan ? (editingPlan.price_1m || 0) : 99.00,
        price_3m: editingPlan ? (editingPlan.price_3m || 0) : 269.00,
        price_6m: editingPlan ? (editingPlan.price_6m || 0) : 499.00,
        price_12m: editingPlan ? (editingPlan.price_12m || 0) : 899.00,
        allowed_durations: editingPlan?.allowed_durations || [1, 3, 6, 12],
        max_parallel_downloads: editingPlan?.max_parallel_downloads ?? 4,
        speed_limit_mbps: editingPlan?.speed_limit_mbps || '',
        allow_vps_access: Boolean(editingPlan?.allow_vps_access),
        is_active: editingPlan ? Boolean(editingPlan.is_active) : true,
        sort_order: editingPlan?.sort_order ?? (plansCount + 1),
    };

    const [planForm, setPlanForm] = useState(initialPlanForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (editingPlan) {
            router.put(`/admin/plans/${editingPlan.id}`, planForm, {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onFinish: () => setIsSubmitting(false),
            });
        } else {
            router.post('/admin/plans', planForm, {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onFinish: () => setIsSubmitting(false),
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#0A0D15] border border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-emerald-400" />
                        <span>{editingPlan ? `Paketi Düzenle: ${editingPlan.name}` : 'Yeni İndirme Paketi Ekle'}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-gray-300"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-xs font-bold text-white shadow-lg shadow-[#00B074]/20 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Kaydediliyor...' : (editingPlan ? 'Güncelle' : 'Paketi Kaydet')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
