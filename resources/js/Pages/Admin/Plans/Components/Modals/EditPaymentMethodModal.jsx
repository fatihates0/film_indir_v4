import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Coins, X } from 'lucide-react';

export default function EditPaymentMethodModal({ method, onClose }) {
    if (!method) return null;

    const [form, setForm] = useState({
        name: method.name || '',
        description: method.description || '',
        instructions: method.instructions || '',
        is_active: Boolean(method.is_active),
        settings: method.settings || {},
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.put(`/admin/payment-methods/${method.id}`, form, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#0A0D15] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Coins className="w-5 h-5 text-emerald-400" />
                        <span>Ödeme Yöntemini Düzenle: {method.name}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Görünen Ad</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Kısa Açıklama</label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                            Havale / IBAN / Cüzdan Talimatları (Kullanıcıya Gösterilir)
                        </label>
                        <textarea
                            rows={5}
                            value={form.instructions}
                            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                            className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl p-3 text-xs text-white font-mono leading-relaxed"
                        />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-[#06080E] border-white/20"
                        />
                        <span>Bu Ödeme Yöntemi Aktif (Kullanıcılara Göster)</span>
                    </label>

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
                            className="px-5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs shadow-lg shadow-[#00B074]/20 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Kaydediliyor...' : 'Yöntemi Güncelle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
