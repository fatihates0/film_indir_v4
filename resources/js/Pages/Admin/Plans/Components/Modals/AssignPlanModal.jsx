import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { UserCheck, X } from 'lucide-react';

export default function AssignPlanModal({ isOpen, user, plans = [], onClose }) {
    if (!isOpen) return null;

    const initialForm = {
        user_id: user ? user.id : '',
        plan_id: user?.plan_id ? String(user.plan_id) : 'custom',
        custom_quota_gb: user?.quota_allocated_bytes ? Math.round(user.quota_allocated_bytes / (1024 * 1024 * 1024)) : 500,
        custom_speed_limit_mbps: user?.custom_speed_limit_mbps !== null && user?.custom_speed_limit_mbps !== undefined ? user.custom_speed_limit_mbps : '',
        duration_type: user?.is_perpetual ? 'perpetual' : '1',
        custom_months: 1,
        price_paid: '',
        notes: '',
    };

    const [form, setForm] = useState(initialForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post('/admin/plans/users/assign', form, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#0A0D15] border border-white/[0.1] rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-emerald-400" />
                        <span>{user ? `${user.name} - Kota & Paket Tanımla` : 'Kullanıcıya Kota / Paket Ata'}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!user && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Hedef Kullanıcı ID</label>
                            <input
                                type="number"
                                required
                                value={form.user_id}
                                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                                placeholder="Kullanıcı ID girin..."
                                className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Tanımlanacak Paket</label>
                        <select
                            value={form.plan_id}
                            onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
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

                    {(form.plan_id === 'custom' || !form.plan_id) && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Özel Kota Miktarı (GB)</label>
                            <input
                                type="number"
                                min="1"
                                value={form.custom_quota_gb}
                                onChange={(e) => setForm({ ...form, custom_quota_gb: Number(e.target.value) })}
                                className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Süre / Döngü</label>
                            <select
                                value={form.duration_type}
                                onChange={(e) => setForm({ ...form, duration_type: e.target.value })}
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
                                value={form.custom_speed_limit_mbps}
                                onChange={(e) => setForm({ ...form, custom_speed_limit_mbps: e.target.value })}
                                className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                            />
                        </div>
                    </div>

                    {form.duration_type === 'custom' && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Ay Sayısı</label>
                            <input
                                type="number"
                                min="1"
                                max="120"
                                value={form.custom_months}
                                onChange={(e) => setForm({ ...form, custom_months: Number(e.target.value) })}
                                className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Admin Notu</label>
                        <input
                            type="text"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Örn: Manuel tanımlandı"
                            className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-gray-300"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-xs font-bold text-white shadow-lg shadow-[#00B074]/20 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Tanımlanıyor...' : 'Kotayı Tanımla'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
