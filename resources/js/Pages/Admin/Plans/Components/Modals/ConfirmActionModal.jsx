import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function ConfirmActionModal({ modal, onClose }) {
    if (!modal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#0A0D15] border border-white/[0.12] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${modal.isDanger ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {modal.isDanger ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">{modal.title}</h3>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                            {modal.message}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-gray-300 transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            modal.onConfirm?.();
                            onClose();
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                            modal.isDanger
                                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                : 'bg-[#00B074] hover:bg-[#009663] text-white shadow-[#00B074]/20'
                        }`}
                    >
                        {modal.confirmText || 'Onayla'}
                    </button>
                </div>
            </div>
        </div>
    );
}
