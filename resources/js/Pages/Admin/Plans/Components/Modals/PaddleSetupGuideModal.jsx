import React, { useState } from 'react';
import {
    BookOpen, CheckCircle2, ChevronRight, Copy, ExternalLink,
    HelpCircle, Key, Lock, ShieldCheck, Webhook, X, Zap
} from 'lucide-react';

export default function PaddleSetupGuideModal({
    isOpen,
    onClose,
    webhookUrl,
    environment = 'sandbox',
}) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('token'); // 'token' | 'api' | 'webhook'
    const [copiedUrl, setCopiedUrl] = useState(false);

    const isSandbox = environment === 'sandbox';
    const paddleBaseUrl = isSandbox
        ? 'https://sandbox-vendors.paddle.com'
        : 'https://vendors.paddle.com';

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const tabs = [
        { id: 'token', label: '1. Client-Side Token', icon: Key },
        { id: 'api', label: '2. API Secret Key', icon: Lock },
        { id: 'webhook', label: '3. Webhook Kurulumu', icon: Webhook },
        { id: 'payment-link', label: '4. Default Payment Link', icon: ExternalLink },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#0A0D15] border border-white/[0.12] rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>Paddle Billing Kurulum Rehberi</span>
                            </h3>
                            <span className="text-[11px] text-gray-400">
                                Adım adım API, Client Token ve Webhook yapılandırması
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Direct Dashboard Link */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/10 via-emerald-500/5 to-transparent border border-blue-500/20 flex items-center justify-between gap-3 text-xs">
                    <div>
                        <span className="text-gray-300 font-semibold block">Paddle Yönetici Paneli:</span>
                        <span className="text-[11px] text-gray-500 font-mono">
                            Mod: <strong className={isSandbox ? 'text-amber-400' : 'text-emerald-400'}>{isSandbox ? 'Sandbox (Test)' : 'Production (Canlı)'}</strong>
                        </span>
                    </div>
                    <a
                        href={paddleBaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20 shrink-0"
                    >
                        <span>Paddle Paneline Git</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>

                {/* Tab Navigation */}
                <div className="flex p-1 rounded-xl bg-[#06080E] border border-white/[0.06] gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-md'
                                        : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Tab Contents */}
                <div className="space-y-4 text-xs">
                    {/* Tab 1: Client-Side Token */}
                    {activeTab === 'token' && (
                        <div className="space-y-3.5 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                                    <Key className="w-4 h-4 text-blue-400" />
                                    Client-Side Token Nasıl Alınır?
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono">
                                    Paddle.js İstemci Anahtarı
                                </span>
                            </div>

                            <p className="text-gray-300 leading-relaxed">
                                Bu anahtar, kullanıcılarınızın sitenizden ayrılmadan güvenli açılır kart formunu (Paddle Overlay Checkout) görebilmesi için kullanılır.
                            </p>

                            <ol className="space-y-2.5 p-4 rounded-xl bg-[#06080E] border border-white/[0.06] text-gray-300">
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                                    <span>
                                        Paddle Dashboard'da sol menüden <strong className="text-white">Developer tools &gt; Authentication</strong> sayfasına gidin.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                                    <span>
                                        Üstteki <strong className="text-white">Client-side tokens</strong> sekmesine geçin ve <strong className="text-blue-400">"Generate client-side token"</strong> butonuna basın.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                                    <span>
                                        Token açıklamasına örneğin <strong className="text-white font-mono">Web Checkout</strong> yazıp onaylayın.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[11px] flex items-center justify-center shrink-0">4</span>
                                    <span>
                                        Oluşturulan ve <strong className="text-emerald-400 font-mono">test_...</strong> (veya live modda <strong className="text-emerald-400 font-mono">live_...</strong>) ile başlayan anahtarı kopyalayıp formdaki alana yapıştırın.
                                    </span>
                                </li>
                            </ol>
                        </div>
                    )}

                    {/* Tab 2: API Secret Key */}
                    {activeTab === 'api' && (
                        <div className="space-y-3.5 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                                    <Lock className="w-4 h-4 text-emerald-400" />
                                    API Secret Key Nasıl Alınır?
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                                    Sunucu Gizli Anahtarı
                                </span>
                            </div>

                            <p className="text-gray-300 leading-relaxed">
                                Bu anahtar yalnızca sunucunuzda kullanılır. Kullanıcı paket seçtiğinde Paddle üzerinde sipariş oturumu (transaction) başlatılmasını sağlar.
                            </p>

                            <ol className="space-y-2.5 p-4 rounded-xl bg-[#06080E] border border-white/[0.06] text-gray-300">
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                                    <span>
                                        Paddle Dashboard'da <strong className="text-white">Developer tools &gt; Authentication</strong> sayfasına gidin.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                                    <span>
                                        <strong className="text-white">API keys</strong> sekmesinde <strong className="text-emerald-400">"Generate API key"</strong> butonuna tıklayın.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                                    <span>
                                        Yetkiler (Permissions) kısmında özellikle <strong className="text-white">Transactions: Read &amp; Write</strong> seçeneğinin işaretli olduğundan emin olun.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">4</span>
                                    <span>
                                        Oluşturulan <strong className="text-emerald-400 font-mono">pdl_sdb_...</strong> (veya live modda <strong className="text-emerald-400 font-mono">pdl_live_...</strong>) anahtarını kopyalayıp formdaki alana yapıştırın.
                                    </span>
                                </li>
                            </ol>
                        </div>
                    )}

                    {/* Tab 3: Webhook Setup */}
                    {activeTab === 'webhook' && (
                        <div className="space-y-3.5 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                                    <Zap className="w-4 h-4 text-amber-400" />
                                    Webhook (Otomatik Aktivasyon) Kurulumu
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                                    Önemli: Otomatik Onay
                                </span>
                            </div>

                            <p className="text-gray-300 leading-relaxed">
                                Kullanıcı kredi kartı ile ödemeyi tamamladığında, Paddle sunucunuza güvenli bir bildirim gönderir ve kullanıcının indirme kotası <strong>saniyeler içinde otomatik olarak</strong> tanımlanır.
                            </p>

                            <ol className="space-y-3 p-4 rounded-xl bg-[#06080E] border border-white/[0.06] text-gray-300">
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                                    <span>
                                        Paddle Dashboard'da sol menüden <strong className="text-white">Notifications</strong> sekmesine gidin.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                                    <span>
                                        Sağ üstteki <strong className="text-amber-400">"New destination"</strong> butonuna tıklayın.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                                    <div className="space-y-1.5 w-full">
                                        <span>
                                            <strong className="text-white">Destination URL</strong> alanına aşağıdaki adresi yapıştırın:
                                        </span>
                                        <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-between gap-2">
                                            <span className="text-xs font-mono text-emerald-400 select-all truncate">
                                                {webhookUrl}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleCopyUrl}
                                                className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-[10px] font-semibold text-white flex items-center gap-1 shrink-0"
                                            >
                                                {copiedUrl ? (
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
                                    </div>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0">4</span>
                                    <div className="space-y-1">
                                        <span>
                                            <strong className="text-white">Events</strong> kısmından mutlaka şu iki olayı seçin:
                                        </span>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                                                ✓ transaction.completed
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                                                ✓ transaction.paid
                                            </span>
                                        </div>
                                    </div>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0">5</span>
                                    <span>
                                        Kaydettikten sonra hedef sayfasında görüntülenen <strong className="text-amber-400 font-mono">Secret key (pdl_ntfset_...)</strong> değerini kopyalayıp formdaki "Webhook Secret Key" kutusuna yapıştırın.
                                    </span>
                                </li>
                            </ol>
                        </div>
                    )}

                    {/* Tab 4: Default Payment Link */}
                    {activeTab === 'payment-link' && (
                        <div className="space-y-3.5 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                                    <ExternalLink className="w-4 h-4 text-sky-400" />
                                    Default Payment Link Yapılandırması
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
                                    Zorunlu Adım
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs leading-relaxed">
                                <strong>⚠️ Önemli Kural:</strong> Paddle Billing API, panelinizde bir <em>Varsayılan Ödeme Bağlantısı (Default Payment Link)</em> tanımlanmadığı sürece işlem başlatmaya (transaction oluşturmaya) izin vermez.
                            </div>

                            <ol className="space-y-3 p-4 rounded-xl bg-[#06080E] border border-white/[0.06] text-gray-300">
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                                    <span>
                                        Paddle Dashboard'da sol menüden <strong className="text-white">Checkout &gt; Checkout settings</strong> (veya <strong className="text-white">Checkout configuration</strong>) sayfasına gidin.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                                    <span>
                                        <strong className="text-white">Default payment link</strong> başlığını bulun.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                                    <div className="space-y-1.5 w-full">
                                        <span>
                                            Bu alana paketlerinizin veya sitenizin URL adresini yazın:
                                        </span>
                                        <div className="p-2 rounded-lg bg-black/60 border border-white/[0.08] font-mono text-[11px] text-emerald-400">
                                            {typeof window !== 'undefined' ? `${window.location.origin}/pricing` : 'http://localhost:8000/pricing'}
                                        </div>
                                    </div>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[11px] flex items-center justify-center shrink-0">4</span>
                                    <span>
                                        <strong className="text-white">Save (Kaydet)</strong> butonuna tıklayın. Artık Paddle ödeme ekranınız sorunsuz başlatılacaktır.
                                    </span>
                                </li>
                            </ol>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.08]">
                    <span className="text-[11px] text-gray-500">
                        💡 Test işlemleri için test kart numaralarını Paddle dokümanlarında bulabilirsiniz.
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors"
                    >
                        Anladım, Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
