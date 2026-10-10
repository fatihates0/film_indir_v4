import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { XCircle, X } from 'lucide-react';

export default function RejectNotificationModal({ notification, onClose }) {
    if (!notification) return null;

    const [rejectReason, setRejectReason] = useState('Ödeme doğrulanamadı.');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e?.preventDefault();
        setIsSubmitting(true);

        router.post(`/admin/payment-notifications/${notification.id}/reject`, {
            admin_notes: rejectReason,
        }, {
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
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-rose-400" />
                        <span>Ödeme Bildirimini Reddet</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-xs text-gray-400">
                    <strong>{notification.user_name}</strong> kullanıcısına ait {notification.formatted_amount} tutarındaki bildirim reddedilecek.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Reddetme Nedeni (Opsiyonel)</label>
                        <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Örn: Hesap hareketlerinde ödeme bulunamadı."
                            className="w-full bg-[#06080E] border border-white/[0.08] focus:border-rose-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
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
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
                        >
                            {isSubmitting ? 'Reddediliyor...' : 'Bildirimi Reddet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
