import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Clock, X } from 'lucide-react';

export default function ExtendDurationModal({ user, onClose }) {
    if (!user) return null;

    const [days, setDays] = useState(30);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e?.preventDefault();
        setIsSubmitting(true);

        router.post(`/admin/plans/users/${user.id}/extend-duration`, {
            days,
            notes,
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
            <div className="bg-[#0A0D15] border border-indigo-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        <span>Abonelik Süresini Uzat</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-xs text-gray-400">
                    <strong>{user.name}</strong> kullanıcısının aktif aboneliğinin bitiş tarihine gün ilave edin.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Eklenecek Gün Sayısı</label>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                            {[7, 15, 30, 90].map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDays(d)}
                                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                                        days === d ? 'bg-indigo-600 text-white' : 'bg-white/[0.04] text-gray-400 hover:text-white'
                                    }`}
                                >
                                    +{d} Gün
                                </button>
                            ))}
                        </div>
                        <input
                            type="number"
                            min="1"
                            max="3650"
                            required
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Açıklama / Not (Opsiyonel)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Örn: Sunucu bakım telafisi"
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
                            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Uzatılıyor...' : 'Süreyi Uzat'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
