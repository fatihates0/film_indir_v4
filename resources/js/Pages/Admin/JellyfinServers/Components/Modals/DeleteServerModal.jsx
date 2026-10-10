import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DeleteServerModal({
    isOpen,
    onClose,
    server,
    onConfirm,
    isDeleting = false
}) {
    if (!isOpen || !server) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0B0F19] border border-white/[0.12] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/80">
                <div className="p-6">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                        <AlertTriangle className="w-6 h-6" />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">
                        Sunucuyu Silmek İstiyor musunuz?
                    </h3>

                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                        <span className="font-semibold text-white">{server.name}</span> isimli Jellyfin sunucusunu sistemden kaldırmak üzeresiniz. 
                        Sunucu üzerindeki kullanıcılar ve medya verileri Jellyfin sunucusunda kalmaya devam eder, ancak sistem artık bu sunucuya yeni kullanıcı yönlendirmeyecektir.
                    </p>

                    <div className="p-3 bg-rose-500/[0.08] border border-rose-500/20 rounded-xl text-xs text-rose-300 font-mono mb-6">
                        {server.url}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isDeleting}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Vazgeç
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                        >
                            {isDeleting ? 'Siliniyor...' : 'Evet, Sunucuyu Sil'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
