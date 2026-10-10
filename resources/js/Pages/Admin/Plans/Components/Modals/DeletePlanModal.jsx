import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';

export default function DeletePlanModal({ plan, plans = [], onClose }) {
    if (!plan) return null;

    const [targetPlanId, setTargetPlanId] = useState('none');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirmDelete = () => {
        setIsSubmitting(true);
        router.delete(`/admin/plans/${plan.id}`, {
            data: { target_plan_id: targetPlanId },
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#0A0D15] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">Paketi Sil: {plan.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Bu paketi silmek istediğinize emin misiniz? Bu pakete sahip aktif aboneleri başka bir pakete transfer edebilirsiniz.
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300">
                        Mevcut Aboneler İçin Transfer Hedefi:
                    </label>
                    <select
                        value={targetPlanId}
                        onChange={(e) => setTargetPlanId(e.target.value)}
                        className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                    >
                        <option value="none">Abonelikleri İptal Et (Paketsiz / Standart Yap)</option>
                        {plans.filter(p => p.id !== plan.id).map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} Paketine Transfer Et
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-gray-300"
                    >
                        Vazgeç
                    </button>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleConfirmDelete}
                        className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white disabled:opacity-50"
                    >
                        {isSubmitting ? 'Siliniyor...' : 'Paketi Kalıcı Olarak Sil'}
                    </button>
                </div>
            </div>
        </div>
    );
}
