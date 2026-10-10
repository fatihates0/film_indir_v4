import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';

export default function DeleteMediaModal({
    media,
    onClose,
    showToast
}) {
    if (!media) return null;

    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteSingle = () => {
        setIsDeleting(true);

        router.delete(`/admin/medias/${media.id}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsDeleting(false);
                onClose();
                showToast(`"${media.clean_title || media.name}" indeks listesinden kaldırıldı.`, 'success');
            },
            onError: () => {
                setIsDeleting(false);
                showToast('Video silinirken bir hata oluştu.', 'error');
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3 text-rose-400">
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-white text-sm">Videoyu İndeksten Kaldır</h3>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">
                    <strong className="text-white">"{media.clean_title || media.name}"</strong> adlı video veritabanı indeksinden kaldırılacak.
                </p>
                <p className="text-[11px] text-gray-500">
                    * Not: Bu işlem depolama sunucunuzdaki gerçek dosyayı silmez; sadece admin panelindeki kayıt listesinden çıkartır.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-medium text-xs transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleDeleteSingle}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? 'Kaldırılıyor...' : 'İndeksten Kaldır'}
                    </button>
                </div>
            </div>
        </div>
    );
}
