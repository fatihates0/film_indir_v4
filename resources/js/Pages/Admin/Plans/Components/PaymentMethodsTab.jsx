import React from 'react';
import { Building2, Coins, CreditCard, Edit3 } from 'lucide-react';

export default function PaymentMethodsTab({
    paymentMethods = [],
    onTogglePaymentMethod,
    onOpenEditMethod,
}) {
    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paymentMethods.map((method) => (
                    <div
                        key={method.id}
                        className={`bg-[#0A0D15] border rounded-2xl p-5 transition-all flex flex-col justify-between shadow-xl ${
                            method.is_active ? 'border-white/[0.08] hover:border-[#00B074]/50' : 'border-white/[0.04] opacity-60'
                        }`}
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-emerald-400 font-mono font-bold">
                                        {method.driver === 'paddle' ? (
                                            <CreditCard className="w-4 h-4 text-blue-400" />
                                        ) : method.driver === 'bank' ? (
                                            <Building2 className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <Coins className="w-4 h-4 text-amber-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{method.name}</h4>
                                        <span className="text-[10px] text-gray-500 font-mono">
                                            Driver: {method.driver === 'paddle' ? 'Paddle Billing POS' : method.driver}
                                        </span>
                                    </div>
                                </div>

                                {/* Toggle Switch */}
                                <button
                                    type="button"
                                    onClick={() => onTogglePaymentMethod(method)}
                                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                                        method.is_active ? 'bg-emerald-500' : 'bg-white/[0.12]'
                                    }`}
                                    title={method.is_active ? 'Aktif (Tıklayarak Kapat)' : 'Pasif (Tıklayarak Aç)'}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                        method.is_active ? 'translate-x-5' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>

                            <p className="text-xs text-gray-400 leading-relaxed">
                                {method.description || 'Ödeme yöntemi açıklaması bulunmuyor.'}
                            </p>

                            {method.instructions && (
                                <div className="p-3 rounded-xl bg-[#06080E] border border-white/[0.04] text-[11px] text-gray-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
                                    {method.instructions}
                                </div>
                            )}
                        </div>

                        <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
                            <span className={`text-[11px] font-bold ${method.is_active ? 'text-emerald-400' : 'text-gray-500'}`}>
                                ● {method.is_active ? 'Kullanımda' : 'Pasif'}
                            </span>

                            <button
                                type="button"
                                onClick={() => onOpenEditMethod(method)}
                                className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
                            >
                                <Edit3 className="w-3 h-3" />
                                <span>Düzenle</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
