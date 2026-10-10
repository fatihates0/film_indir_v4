import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Zap, X } from 'lucide-react';

export default function DirectExtraQuotaModal({ user, onClose }) {
    if (!user) return null;

    const [form, setForm] = useState({
        quota_gb: 200,
        days: 30,
        name: `${user.name} Ek Kota`,
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e?.preventDefault();
        setIsSubmitting(true);

        router.post(`/admin/plans/users/${user.id}/extra-quota`, form, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#0A0D15] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        <span>Ek Kota Tanımla (+GB)</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-xs text-gray-400">
                    <strong>{user.name}</strong> kullanıcısına mevcut paket kotasının üzerine eklenecek süreli ek indirme kotası tanımlayın.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1">Miktar (GB)</label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={form.quota_gb}
                                onChange={(e) => setForm({ ...form, quota_gb: Number(e.target.value) })}
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
                                value={form.days}
                                onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}
                                className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Açıklama (Opsiyonel)</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Örn: Manuel Telafi Kotası"
                            className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
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
                            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Ekleniyor...' : 'Ek Kotayı Tanımla'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
