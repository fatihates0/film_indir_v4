import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function ClearArchiveModal({
    isOpen,
    onClose,
    storageBoxes = [],
    stats = {},
    showToast,
    onCleared
}) {
    if (!isOpen) return null;

    const [clearTargetBoxId, setClearTargetBoxId] = useState('all');
    const [isClearing, setIsClearing] = useState(false);

    const handleClearAll = () => {
        setIsClearing(true);
        router.post('/admin/medias/clear-all', {
            storage_box_id: clearTargetBoxId,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsClearing(false);
                onClose();
                if (onCleared) onCleared();
                showToast('Arşiv veritabanı indeksinden başarıyla temizlendi.', 'success');
            },
            onError: () => {
                setIsClearing(false);
                showToast('Arşiv temizlenirken bir hata oluştu.', 'error');
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0D111A] border border-rose-500/20 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
                <div className="flex items-center gap-3 text-rose-400">
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <AlertTriangle className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-base">Medya Arşivini Temizle</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Veritabanındaki taranmış video kayıtlarını siler</p>
                    </div>
                </div>

                <div className="bg-[#121622] rounded-xl p-4 border border-white/[0.04] space-y-3">
                    <label className="text-xs font-medium text-gray-300 block">
                        Temizlenecek Depolama Alanı:
                    </label>
                    <select
                        value={clearTargetBoxId}
                        onChange={(e) => setClearTargetBoxId(e.target.value)}
                        className="w-full bg-[#07090E] border border-white/[0.08] text-xs text-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-rose-500"
                    >
                        <option value="all">Tüm Arşiv (Tüm Storage Box'lar - {stats?.total_count || 0} Video)</option>
                        {storageBoxes.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/[0.08] border border-rose-500/20 text-xs text-rose-300 leading-relaxed space-y-1.5">
                    <p className="font-medium text-rose-200 flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>Bu işlem veritabanı indeksini sıfırlar!</span>
                    </p>
                    <p className="text-[11px] text-gray-400 leading-normal">
                        Seçilen filtrelere göre veritabanındaki tüm video indeksleri silinecektir. Depolama sunucusu disklerinizdeki fiziksel medya dosyalarına zarar gelmez. İstediğiniz an <strong className="text-gray-200">"Storage Box Tara"</strong> butonu ile arşivi saniyeler içinde tekrar taratabilirsiniz.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                        onClick={onClose}
                        disabled={isClearing}
                        className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-medium text-xs transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleClearAll}
                        disabled={isClearing}
                        className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isClearing ? 'Temizleniyor...' : 'Evet, Arşivi Sil'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
