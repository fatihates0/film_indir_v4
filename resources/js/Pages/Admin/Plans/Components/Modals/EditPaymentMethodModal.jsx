import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { CheckCircle2, Coins, Copy, CreditCard, HelpCircle, Info, X } from 'lucide-react';
import PaddleSetupGuideModal from './PaddleSetupGuideModal';

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
    const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);

    const isPaddle = method.driver === 'paddle';
    const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/webhooks/paddle` : '/webhooks/paddle';

    const handleSettingChange = (key, value) => {
        setForm((prev) => ({
            ...prev,
            settings: {
                ...prev.settings,
                [key]: value,
            },
        }));
    };

    const handleCopyWebhookUrl = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopiedWebhookUrl(true);
        setTimeout(() => setCopiedWebhookUrl(false), 2000);
    };

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
                        {isPaddle ? (
                            <CreditCard className="w-5 h-5 text-blue-400" />
                        ) : (
                            <Coins className="w-5 h-5 text-emerald-400" />
                        )}
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

                    {isPaddle && (
                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-3.5">
                            <div className="flex items-center justify-between border-b border-blue-500/15 pb-2.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                                    <Info className="w-4 h-4 shrink-0" />
                                    <span>Paddle Billing (v2) Yapılandırması</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowGuideModal(true)}
                                    className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>Nasıl Yapılır? (Rehber)</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                        Çalışma Ortamı (Mode)
                                    </label>
                                    <select
                                        value={form.settings?.environment || 'sandbox'}
                                        onChange={(e) => handleSettingChange('environment', e.target.value)}
                                        className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="sandbox">Sandbox (Test Modu)</option>
                                        <option value="production">Production (Canlı Mod)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                        Para Birimi (Currency)
                                    </label>
                                    <select
                                        value={form.settings?.currency || 'TRY'}
                                        onChange={(e) => handleSettingChange('currency', e.target.value)}
                                        className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="TRY">TRY (Türk Lirası)</option>
                                        <option value="USD">USD (Dolar)</option>
                                        <option value="EUR">EUR (Euro)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-semibold text-gray-300">
                                        Client-Side Token (Paddle.js İstemci Anahtarı)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowGuideModal(true)}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                                    >
                                        <HelpCircle className="w-3 h-3" />
                                        <span>Nasıl alınır?</span>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="test_... veya live_..."
                                    value={form.settings?.client_token || ''}
                                    onChange={(e) => handleSettingChange('client_token', e.target.value)}
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-[10px] text-gray-500 block mt-0.5">
                                    Paddle Dashboard &gt; Developer tools &gt; Authentication &gt; Client-side tokens
                                </span>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-semibold text-gray-300">
                                        API Key (Gizli API Anahtarı)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowGuideModal(true)}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                                    >
                                        <HelpCircle className="w-3 h-3" />
                                        <span>Nasıl alınır?</span>
                                    </button>
                                </div>
                                <input
                                    type="password"
                                    placeholder="pdl_sdb_... veya pdl_live_..."
                                    value={form.settings?.api_key || ''}
                                    onChange={(e) => handleSettingChange('api_key', e.target.value)}
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-[10px] text-gray-500 block mt-0.5">
                                    Paddle Dashboard &gt; Developer tools &gt; Authentication &gt; API keys (Transactions: Read &amp; Write)
                                </span>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-semibold text-gray-300">
                                        Webhook Secret Key (Bildirim Gizli Anahtarı)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowGuideModal(true)}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                                    >
                                        <HelpCircle className="w-3 h-3" />
                                        <span>Nasıl kurulur?</span>
                                    </button>
                                </div>
                                <input
                                    type="password"
                                    placeholder="pdl_ntfset_..."
                                    value={form.settings?.webhook_secret || ''}
                                    onChange={(e) => handleSettingChange('webhook_secret', e.target.value)}
                                    className="w-full bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-[10px] text-gray-500 block mt-0.5">
                                    Paddle Dashboard &gt; Notifications &gt; Destination webhook secret key
                                </span>
                            </div>

                            {/* Webhook Endpoint Display */}
                            <div className="pt-2 border-t border-white/[0.06]">
                                <span className="text-[11px] font-semibold text-gray-300 block mb-1">
                                    Paddle Webhook Hedef URL'iniz (Dashboard'a Ekleyin):
                                </span>
                                <div className="p-2 rounded-xl bg-black/50 border border-white/[0.06] flex items-center justify-between gap-2">
                                    <span className="text-xs font-mono text-emerald-400 truncate">
                                        {webhookUrl}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyWebhookUrl}
                                        className="px-2 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-[10px] font-semibold text-white flex items-center gap-1 shrink-0"
                                    >
                                        {copiedWebhookUrl ? (
                                            <>
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                <span>Kopyalandı</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                <span>Kopyala</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <span className="text-[10px] text-gray-400 block mt-1 leading-relaxed">
                                    Olaylar (Events): <strong>transaction.completed</strong>, <strong>transaction.paid</strong> seçilmelidir.
                                </span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                            {isPaddle ? 'Kullanıcıya Gösterilecek Bilgi / Talimat Metni' : 'Havale / IBAN / Cüzdan Talimatları'}
                        </label>
                        <textarea
                            rows={isPaddle ? 3 : 5}
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

            {isPaddle && (
                <PaddleSetupGuideModal
                    isOpen={showGuideModal}
                    onClose={() => setShowGuideModal(false)}
                    webhookUrl={webhookUrl}
                    environment={form.settings?.environment || 'sandbox'}
                />
            )}
        </div>
    );
}
