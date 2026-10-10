import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DeleteBoxModal({
    deletingBox,
    onClose,
    onConfirmDelete,
    isDeleting = false
}) {
    if (!deletingBox) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0D111A] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Sunucuyu Sil</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{deletingBox.name} sistemden kaldırılacak.</p>
                    </div>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                    Bu depolama sunucusunu kaldırmak istediğinizden emin misiniz? Sunucudaki dosyaların veritabanı bağlantısı kopabilir.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/[0.04] text-gray-300 text-xs font-semibold hover:bg-white/[0.08]"
                    >
                        İptal
                    </button>
                    <button
                        onClick={onConfirmDelete}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50"
                    >
                        {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
                    </button>
                </div>
            </div>
        </div>
    );
}
