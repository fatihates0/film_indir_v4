import React, { useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    ChevronRight,
    Compass,
    Copy,
    CreditCard,
    ExternalLink,
    Key,
    Lock,
    ShieldAlert,
    Sparkles,
    Webhook,
    X,
    Zap,
} from 'lucide-react';

export default function PaddleSetupGuideModal({
    isOpen,
    onClose,
    webhookUrl,
    environment = 'sandbox',
}) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('token');
    const [copiedWebhook, setCopiedWebhook] = useState(false);
    const [copiedPaymentLink, setCopiedPaymentLink] = useState(false);

    const isSandbox = environment === 'sandbox';
    const paddleBaseUrl = isSandbox
        ? 'https://sandbox-vendors.paddle.com'
        : 'https://vendors.paddle.com';

    const defaultPaymentLinkUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/pricing`
        : 'http://localhost:8000/pricing';

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopiedWebhook(true);
        setTimeout(() => setCopiedWebhook(false), 2200);
    };

    const handleCopyPaymentLink = () => {
        navigator.clipboard.writeText(defaultPaymentLinkUrl);
        setCopiedPaymentLink(true);
        setTimeout(() => setCopiedPaymentLink(false), 2200);
    };

    const steps = [
        {
            id: 'token',
            number: '01',
            title: 'Client-Side Token',
            subtitle: 'Paddle.js Arayüzü',
            icon: Key,
        },
        {
            id: 'api',
            number: '02',
            title: 'API Secret Key',
            subtitle: 'Sunucu İşlem Yetkisi',
            icon: Lock,
        },
        {
            id: 'webhook',
            number: '03',
            title: 'Webhook Kurulumu',
            subtitle: 'Otomatik Kota Tanımı',
            icon: Webhook,
        },
        {
            id: 'payment-link',
            number: '04',
            title: 'Default Payment Link',
            subtitle: 'Zorunlu Hesap Ayarı',
            icon: ExternalLink,
        },
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === activeTab);

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setActiveTab(steps[currentStepIndex + 1].id);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setActiveTab(steps[currentStepIndex - 1].id);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-[#090C15] border border-white/[0.09] rounded-2xl max-w-4xl w-full shadow-[0_24px_70px_rgba(0,0,0,0.85)] flex flex-col max-h-[92vh] overflow-hidden text-gray-200 relative">
                
                {/* Top Ambient Glow Line */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />

                {/* Header Bar */}
                <div className="px-6 py-4 border-b border-white/[0.07] bg-[#070A10]/90 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                                    Paddle Billing Kurulum Kılavuzu
                                </h3>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border tracking-wide">
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                            isSandbox ? 'bg-amber-400' : 'bg-emerald-400'
                                        }`}
                                    />
                                    <span className={isSandbox ? 'text-amber-300' : 'text-emerald-300'}>
                                        {isSandbox ? 'Sandbox (Test)' : 'Production (Canlı)'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                                Kredi kartı ile sorunsuz ödeme almak için gereken 4 adımlı entegrasyon
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <a
                            href={paddleBaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-gray-200 hover:text-white border border-white/[0.08] text-xs font-medium transition-all"
                        >
                            <span>Paddle Paneline Git</span>
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                            aria-label="Kapat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Body: Master-Detail Layout */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                    
                    {/* Left Sidebar: Step Selector */}
                    <div className="w-full md:w-64 lg:w-72 bg-[#06080E]/75 border-b md:border-b-0 md:border-r border-white/[0.06] p-3 sm:p-4 flex md:flex-col justify-between shrink-0 overflow-x-auto md:overflow-x-visible">
                        <div className="w-full space-y-1.5">
                            <span className="hidden md:block text-[10px] font-mono font-semibold tracking-wider text-gray-400 uppercase px-2 mb-2">
                                Kurulum Adımları
                            </span>
                            <div className="flex md:flex-col gap-1 w-full">
                                {steps.map((step, idx) => {
                                    const Icon = step.icon;
                                    const isSelected = activeTab === step.id;
                                    const isPassed = idx < currentStepIndex;

                                    return (
                                        <button
                                            key={step.id}
                                            type="button"
                                            onClick={() => setActiveTab(step.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-3 group relative cursor-pointer shrink-0 md:shrink ${
                                                isSelected
                                                    ? 'bg-sky-500/10 text-white border border-sky-500/25 shadow-sm'
                                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold shrink-0 transition-colors ${
                                                        isSelected
                                                            ? 'bg-sky-500 text-white'
                                                            : isPassed
                                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                                            : 'bg-white/[0.05] text-gray-400 border border-white/[0.06]'
                                                    }`}
                                                >
                                                    {isPassed ? <Check className="w-3.5 h-3.5" /> : step.number}
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <div className={`font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                        {step.title}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 truncate hidden md:block">
                                                        {step.subtitle}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight
                                                className={`w-3.5 h-3.5 transition-transform hidden md:block shrink-0 ${
                                                    isSelected
                                                        ? 'text-sky-400 translate-x-0.5'
                                                        : 'text-transparent group-hover:text-gray-600'
                                                }`}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sidebar Bottom Note */}
                        <div className="hidden md:block pt-4 border-t border-white/[0.05]">
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-gray-400 space-y-1">
                                <div className="font-semibold text-gray-300 flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    <span>Geliştirici İpucu</span>
                                </div>
                                <p className="leading-relaxed text-gray-400">
                                    Sandbox modunda gerçek para çekilmez. Test kredi kartları Paddle resmi dokümanlarında yer almaktadır.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Content Panel */}
                    <div className="flex-1 p-5 sm:p-7 overflow-y-auto min-h-0 bg-[#090C15] flex flex-col justify-between">
                        <div className="space-y-5">
                            
                            {/* Step 1: Client-Side Token */}
                            {activeTab === 'token' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                                        <div>
                                            <span className="text-[11px] font-mono text-sky-400 font-semibold uppercase tracking-wider block">
                                                Adım 01 / 04
                                            </span>
                                            <h4 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
                                                <span>Client-Side Token Oluşturma</span>
                                            </h4>
                                        </div>
                                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-medium">
                                            Paddle.js İstemcisi
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        Bu token, kullanıcılarınızın sitenizden ayrılmadan güvenli açılır kart formunu (Paddle Overlay Checkout) görebilmesi için tarayıcı tarafında kullanılır. Gizli değildir.
                                    </p>

                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                Paddle Dashboard sol menüsünden <strong className="text-white">Developer tools &gt; Authentication</strong> sayfasına gidin.
                                            </p>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                Üstteki <strong className="text-white">Client-side tokens</strong> sekmesine geçin ve <strong className="text-sky-300 font-medium">"Generate client-side token"</strong> butonuna tıklayın.
                                            </p>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                Token açıklamasına örneğin <strong className="text-white font-mono">Web Checkout</strong> yazarak token'ı oluşturun.
                                            </p>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                                            <div className="space-y-1.5 w-full">
                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                    Oluşturulan token'ı kopyalayıp admin panelindeki <strong className="text-white">Client-side Token</strong> alanına yapıştırın:
                                                </p>
                                                <div className="px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] font-mono text-[11px] text-sky-300">
                                                    {isSandbox ? 'test_d3a8...' : 'live_9b4c...'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: API Secret Key */}
                            {activeTab === 'api' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                                        <div>
                                            <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block">
                                                Adım 02 / 04
                                            </span>
                                            <h4 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
                                                <span>API Secret Key Oluşturma</span>
                                            </h4>
                                        </div>
                                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                                            Sunucu Gizli Anahtarı
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        Bu anahtar sunucunuz (backend) tarafından Paddle üzerinde güvenli bir sipariş oturumu (transaction) başlatmak için kullanılır. Asla tarayıcıda paylaşılmaz.
                                    </p>

                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                Paddle Dashboard'da <strong className="text-white">Developer tools &gt; Authentication</strong> sayfasına gidin.
                                            </p>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                <strong className="text-white">API keys</strong> sekmesinde <strong className="text-emerald-300 font-medium">"Generate API key"</strong> butonuna tıklayın.
                                            </p>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
                                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-emerald-200">
                                                    Yetkiler (Permissions) Ayarı:
                                                </p>
                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                    İzin listesinde özellikle <strong className="text-white">Transactions: Read &amp; Write</strong> izninin işaretli olduğundan emin olun.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                                            <div className="space-y-1.5 w-full">
                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                    Oluşturulan anahtarı kopyalayıp admin panelindeki <strong className="text-white">API Key</strong> alanına yapıştırın:
                                                </p>
                                                <div className="px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] font-mono text-[11px] text-emerald-300">
                                                    {isSandbox ? 'pdl_sdbx_apikey_...' : 'pdl_apikey_...'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Webhook Setup */}
                            {activeTab === 'webhook' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                                        <div>
                                            <span className="text-[11px] font-mono text-amber-400 font-semibold uppercase tracking-wider block">
                                                Adım 03 / 04
                                            </span>
                                            <h4 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
                                                <span>Webhook Bildirim Kurulumu</span>
                                            </h4>
                                        </div>
                                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                                            Otomatik Onay
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        Kullanıcı kredi kartı ile ödemeyi tamamladığında Paddle bu adrese güvenli bildirim gönderir. Kullanıcının indirme kotası anında otomatik tanımlanır.
                                    </p>

                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                Paddle Dashboard sol menüsünden <strong className="text-white">Notifications</strong> sayfasına gidin ve sağ üstteki <strong className="text-amber-300 font-medium">"New destination"</strong> butonuna basın.
                                            </p>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-[#06080E] border border-white/[0.06] space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-white flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                                                    <span>Destination URL (Bildirim Adresi)</span>
                                                </span>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-between gap-3">
                                                <span className="text-xs font-mono text-emerald-400 select-all truncate">
                                                    {webhookUrl}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyWebhook}
                                                    className="px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                                                >
                                                    {copiedWebhook ? (
                                                        <>
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                            <span className="text-emerald-300">Kopyalandı</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                                                            <span>Kopyala</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-[#06080E] border border-white/[0.06] space-y-2">
                                            <div className="flex items-start gap-3">
                                                <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                                                <div className="space-y-2 w-full">
                                                    <p className="text-xs text-gray-300 leading-relaxed">
                                                        <strong className="text-white">Events</strong> bölümünde mutlaka şu iki olayı işaretleyin:
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono text-[11px] font-semibold flex items-center gap-1">
                                                            <Check className="w-3 h-3 text-emerald-400" />
                                                            transaction.completed
                                                        </span>
                                                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono text-[11px] font-semibold flex items-center gap-1">
                                                            <Check className="w-3 h-3 text-emerald-400" />
                                                            transaction.paid
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                Kaydettikten sonra sayfadaki <strong className="text-white font-mono">Secret key (pdl_ntfset_...)</strong> değerini kopyalayıp formdaki <strong className="text-white">Webhook Secret Key</strong> alanına yapıştırın.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Default Payment Link */}
                            {activeTab === 'payment-link' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                                        <div>
                                            <span className="text-[11px] font-mono text-rose-400 font-semibold uppercase tracking-wider block">
                                                Adım 04 / 04
                                            </span>
                                            <h4 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
                                                <span>Default Payment Link Yapılandırması</span>
                                            </h4>
                                        </div>
                                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
                                            Zorunlu Hesap Ayarı
                                        </span>
                                    </div>

                                    {/* Clarified Notice Card */}
                                    <div className="p-3.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-xs flex items-start gap-3">
                                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <div className="font-semibold text-amber-300">
                                                Paddle Güvenlik Kuralı
                                            </div>
                                            <p className="text-amber-200/80 leading-relaxed">
                                                Paddle Billing v2 altyapısında, panelinizde bir <em>Varsayılan Ödeme Bağlantısı (Default Payment Link)</em> kayıtlı olmadan işlem (transaction) başlatılamaz.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                Paddle Dashboard sol menüsünden <strong className="text-white">Checkout &gt; Checkout settings</strong> sayfasına gidin.
                                            </p>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                Sayfada yer alan <strong className="text-white">Default payment link</strong> başlığını bulun.
                                            </p>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-[#06080E] border border-white/[0.06] space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-white flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-400 font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                                                    <span>Ödeme Bağlantısı (Sitenizin Fiyatlandırma Adresi)</span>
                                                </span>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-between gap-3">
                                                <span className="text-xs font-mono text-sky-300 select-all truncate">
                                                    {defaultPaymentLinkUrl}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyPaymentLink}
                                                    className="px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                                                >
                                                    {copiedPaymentLink ? (
                                                        <>
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                            <span className="text-emerald-300">Kopyalandı</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                                                            <span>Kopyala</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#06080E] border border-white/[0.06]">
                                            <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                Adresi yapıştırdıktan sonra sağ alttan <strong className="text-white">Save (Kaydet)</strong> butonuna basın. Artık ödeme modalı sorunsuz açılacaktır.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Step Content Footer Nav */}
                        <div className="pt-6 mt-6 border-t border-white/[0.06] flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-mono">
                                Adım <span className="text-white font-semibold">{currentStepIndex + 1}</span> / {steps.length}
                            </span>
                            <div className="flex items-center gap-2">
                                {currentStepIndex > 0 && (
                                    <button
                                        type="button"
                                        onClick={handlePrev}
                                        className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                        <span>Geri</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                                        currentStepIndex === steps.length - 1
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                                            : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/20'
                                    }`}
                                >
                                    <span>
                                        {currentStepIndex === steps.length - 1
                                            ? 'Tamamla & Kapat'
                                            : 'Sonraki Adım'}
                                    </span>
                                    {currentStepIndex === steps.length - 1 ? (
                                        <Check className="w-3.5 h-3.5" />
                                    ) : (
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
