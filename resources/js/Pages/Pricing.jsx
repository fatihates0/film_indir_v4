import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import Layout from '../Components/Layout';
import AuthModal from '../Components/AuthModal';
import { 
    Check, Zap, Shield, HardDrive, Download, ArrowRight, 
    Sparkles, RefreshCw, Clock, AlertCircle, Building2, Coins, 
    Copy, CheckCircle2, X, Info 
} from 'lucide-react';

export default function Pricing({ plans = [], paymentMethods = [] }) {
    const { auth, flash } = usePage().props;
    const [selectedDuration, setSelectedDuration] = useState(1); // 1, 3, 6, 12
    const [submittingPlanId, setSubmittingPlanId] = useState(null);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState('login');

    // Checkout Modal State
    const [checkoutPlan, setCheckoutPlan] = useState(null);
    const [selectedMethodId, setSelectedMethodId] = useState(paymentMethods.length > 0 ? paymentMethods[0].id : '');
    const [senderName, setSenderName] = useState('');
    const [txHash, setTxHash] = useState('');
    const [userNotes, setUserNotes] = useState('');
    const [copiedField, setCopiedField] = useState(null);
    const [isSubmittingNotice, setIsSubmittingNotice] = useState(false);

    const user = auth?.user;
    const quota = auth?.quota;

    const durationOptions = [
        { months: 1, label: '1 Aylık', badge: null },
        { months: 3, label: '3 Aylık', badge: '%10 Avantaj' },
        { months: 6, label: '6 Aylık', badge: '%20 İndirim' },
        { months: 12, label: '12 Aylık', badge: '%30 İndirim' },
    ];

    const getPrice = (plan, months) => {
        if (!plan) return 0;
        switch (months) {
            case 3:
                return parseFloat(plan.price_3m || 0);
            case 6:
                return parseFloat(plan.price_6m || 0);
            case 12:
                return parseFloat(plan.price_12m || 0);
            default:
                return parseFloat(plan.price_1m || 0);
        }
    };

    const handleOpenCheckout = (plan) => {
        if (!user) {
            setAuthModalMode('login');
            setAuthModalOpen(true);
            return;
        }

        setCheckoutPlan(plan);
        if (paymentMethods.length > 0) {
            setSelectedMethodId(paymentMethods[0].id);
        }
        setSenderName('');
        setTxHash('');
        setUserNotes('');
    };

    const handleCopy = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSubmitPaymentNotice = (e) => {
        e.preventDefault();
        if (!checkoutPlan || !selectedMethodId) return;

        setIsSubmittingNotice(true);

        router.post('/payment-notifications', {
            plan_id: checkoutPlan.id,
            payment_method_id: selectedMethodId,
            duration_months: selectedDuration,
            sender_name: senderName,
            tx_hash: txHash,
            user_notes: userNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setCheckoutPlan(null);
            },
            onFinish: () => setIsSubmittingNotice(false),
        });
    };

    return (
        <Layout>
            <Head title="İndirme Paketleri & Üyelikler - SineKutu" />

            <div className="min-h-screen bg-[#0A0D14] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-12">
                    
                    {/* CURRENT USER QUOTA BANNER */}
                    {user && quota && quota.has_subscription && (
                        <div className="bg-gradient-to-r from-[#00B074]/15 via-emerald-950/20 to-[#00B074]/5 border border-[#00B074]/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00B074] text-white">
                                            Aktif Paketiniz
                                        </span>
                                        <h3 className="text-xl font-bold text-white">{quota.plan_name}</h3>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        Kota yenilenme tarihi: <strong className="text-gray-200">{quota.period_end_formatted || 'Süresiz'}</strong>
                                    </p>
                                </div>

                                <div className="w-full md:w-72 space-y-2">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-gray-400">Kalan Kota</span>
                                        <span className="text-[#00B074] font-bold">{quota.formatted_remaining} / {quota.formatted_allocated}</span>
                                    </div>
                                    <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                            className="bg-gradient-to-r from-[#00B074] to-emerald-400 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${quota.usage_percentage}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[11px] text-gray-400">
                                        <span>Kullanılan: {quota.formatted_used}</span>
                                        <span>%{quota.usage_percentage} Dolu</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HEADER */}
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#00B074]/10 border border-[#00B074]/30 text-[#00B074] inline-flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" /> Yüksek Hızlı İndirme Paketleri
                        </span>
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                            İhtiyacınıza Uygun <span className="text-[#00B074]">Aylık Kota</span> Seçin
                        </h1>
                        <p className="text-sm sm:text-base text-gray-400">
                            Yalnızca indirdiğiniz tam bayt kotanızdan düşer. 10 GB dosyanın 3 GB'sini indirirseniz sadece 3 GB sayılır. Kotanız her ay abone olduğunuz gün sıfırlanır.
                        </p>

                        {/* DURATION TOGGLE */}
                        <div className="pt-6 flex justify-center">
                            <div className="bg-[#121620] p-1.5 rounded-2xl border border-white/10 flex items-center gap-1 max-w-md w-full">
                                {durationOptions.map((opt) => (
                                    <button
                                        key={opt.months}
                                        type="button"
                                        onClick={() => setSelectedDuration(opt.months)}
                                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
                                            selectedDuration === opt.months
                                                ? 'bg-[#00B074] text-white shadow-lg shadow-[#00B074]/20'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {opt.label}
                                        {opt.badge && (
                                            <span className="absolute -top-2.5 right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black shadow-sm">
                                                {opt.badge}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* PRICING CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-4">
                        {plans.map((plan, index) => {
                            const price = getPrice(plan, selectedDuration);
                            const monthlyEquivalent = (price / selectedDuration).toFixed(0);
                            const isFeatured = index === 1; // 2nd plan is popular

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                                        isFeatured
                                            ? 'bg-gradient-to-b from-[#161D2B] to-[#10141E] border-2 border-[#00B074] shadow-2xl shadow-[#00B074]/10 transform md:-translate-y-2'
                                            : 'bg-[#121620] border border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {isFeatured && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#00B074] text-white shadow-lg shadow-[#00B074]/30">
                                            En Çok Tercih Edilen
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        {/* Plan Header */}
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                            <p className="text-xs text-gray-400 line-clamp-2">{plan.description}</p>
                                        </div>

                                        {/* Quota Badge */}
                                        <div className="py-3 px-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <HardDrive className="w-5 h-5 text-[#00B074]" />
                                                <span className="text-xs text-gray-300">Aylık İndirme Kotası</span>
                                            </div>
                                            <span className="text-lg font-black text-white">{plan.formatted_quota}</span>
                                        </div>

                                        {/* Price */}
                                        <div className="space-y-1">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl sm:text-4xl font-black text-white">₺{price}</span>
                                                <span className="text-xs text-gray-400 font-medium">/ {selectedDuration} Ay</span>
                                            </div>
                                            {selectedDuration > 1 && (
                                                <p className="text-[11px] text-[#00B074]">
                                                    Aylık ~₺{monthlyEquivalent} denk gelir
                                                </p>
                                            )}
                                        </div>

                                        {/* Features List */}
                                        <ul className="space-y-3 pt-2 text-xs text-gray-300">
                                            <li className="flex items-center gap-2.5">
                                                <Check className="w-4 h-4 text-[#00B074] shrink-0" />
                                                <span><strong>{plan.formatted_quota}</strong> aylık transfer hakkı</span>
                                            </li>
                                            <li className="flex items-center gap-2.5">
                                                <Check className="w-4 h-4 text-[#00B074] shrink-0" />
                                                <span>Aydan aya otomatik sıfırlanan kota</span>
                                            </li>
                                            <li className="flex items-center gap-2.5">
                                                <Check className="w-4 h-4 text-[#00B074] shrink-0" />
                                                <span><strong>{plan.max_parallel_downloads}</strong> adet eşzamanlı paralel bağlantı</span>
                                            </li>
                                            <li className="flex items-center gap-2.5">
                                                <Check className="w-4 h-4 text-[#00B074] shrink-0" />
                                                <span>IDM, JDownloader ve tarayıcı desteği</span>
                                            </li>
                                            <li className="flex items-center gap-2.5">
                                                <Check className="w-4 h-4 text-[#00B074] shrink-0" />
                                                <span>Kaldığı yerden devam etme (Resume)</span>
                                            </li>
                                            <li className="flex items-center gap-2.5">
                                                <Check className="w-4 h-4 text-[#00B074] shrink-0" />
                                                <span>1 Gbps yüksek hızlı omurga bağlantısı</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Action Button */}
                                    <div className="pt-8">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenCheckout(plan)}
                                            className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                                isFeatured
                                                    ? 'bg-[#00B074] hover:bg-[#009663] text-white shadow-xl shadow-[#00B074]/30'
                                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                            }`}
                                        >
                                            <span>Paket Seç & Öde</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* FAQ / SYSTEM INFO */}
                    <div className="bg-[#121620] border border-white/5 rounded-3xl p-8 max-w-4xl mx-auto space-y-6">
                        <div className="text-center space-y-1">
                            <h3 className="text-lg font-bold text-white">Sistem Nasıl Çalışır?</h3>
                            <p className="text-xs text-gray-400">Şeffaf, adil ve tam bayt ölçümlü indirme altyapısı</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div className="space-y-2">
                                <div className="w-8 h-8 rounded-xl bg-[#00B074]/10 text-[#00B074] flex items-center justify-center font-bold text-xs">
                                    1
                                </div>
                                <h4 className="text-sm font-bold text-white">Gerçek Bayt Hesabı</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    10 GB'lık bir dosyanın indirilmesi yarıda kesilip 3 GB çekildiğinde kotanızdan asla 10 GB düşülmez. Tam olarak indirilen 3 GB sayılır.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="w-8 h-8 rounded-xl bg-[#00B074]/10 text-[#00B074] flex items-center justify-center font-bold text-xs">
                                    2
                                </div>
                                <h4 className="text-sm font-bold text-white">Aydan Aya Yenilenme</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Abone olduğunuz gün sayaç başlar. Örneğin ayın 17'sinde abone olduysanız, her ayın 17'sinde kotanız sıfırlanıp taze paketiniz başlar.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="w-8 h-8 rounded-xl bg-[#00B074]/10 text-[#00B074] flex items-center justify-center font-bold text-xs">
                                    3
                                </div>
                                <h4 className="text-sm font-bold text-white">Kota Güvenliği</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Aylık kotanız bittiğinde içerik indirme hakkınız duraklatılır. Süreniz geldiğinde ya da yeni paket aldığınızda anında tekrar aktif olur.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* CHECKOUT & PAYMENT NOTIFICATION MODAL */}
            {checkoutPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#0D111A] border border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-5">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00B074]">
                                    Sipariş ve Ödeme Bildirimi
                                </span>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                                    <span>{checkoutPlan.name} Paketi ({selectedDuration} Ay)</span>
                                </h3>
                            </div>
                            <button
                                onClick={() => setCheckoutPlan(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Order Summary Box */}
                        <div className="p-4 rounded-2xl bg-[#07090E] border border-white/[0.06] flex items-center justify-between">
                            <div>
                                <span className="text-xs text-gray-400 block">Ödenecek Tutar</span>
                                <span className="text-2xl font-black text-white font-mono">
                                    ₺{getPrice(checkoutPlan, selectedDuration)}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-400 block">Aylık İndirme Kotası</span>
                                <span className="text-sm font-bold text-emerald-400 font-mono">
                                    {checkoutPlan.monthly_quota_gb} GB / Ay
                                </span>
                            </div>
                        </div>

                        {/* Payment Methods Selector Tabs */}
                        {paymentMethods.length === 0 ? (
                            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>Şu anda kullanılabilir ödeme yöntemi bulunmamaktadır. Lütfen yönetici ile iletişime geçiniz.</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitPaymentNotice} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                                        Ödeme Yöntemi Seçin *
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {paymentMethods.map((pm) => {
                                            const isSelected = selectedMethodId === pm.id;
                                            return (
                                                <button
                                                    key={pm.id}
                                                    type="button"
                                                    onClick={() => setSelectedMethodId(pm.id)}
                                                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                                                        isSelected
                                                            ? 'bg-[#00B074]/15 border-[#00B074] text-white shadow-lg shadow-[#00B074]/10'
                                                            : 'bg-[#07090E] border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                        isSelected ? 'bg-[#00B074] text-white' : 'bg-white/5 text-gray-400'
                                                    }`}>
                                                        {pm.driver === 'bank' ? <Building2 className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold block text-white">{pm.name}</span>
                                                        <span className="text-[10px] text-gray-400 block line-clamp-1">{pm.description}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Active Payment Method Details Box */}
                                {(() => {
                                    const activeMethod = paymentMethods.find(m => m.id === selectedMethodId);
                                    if (!activeMethod) return null;
                                    const settings = activeMethod.settings || {};

                                    return (
                                        <div className="p-4 rounded-2xl bg-[#07090E] border border-white/[0.08] space-y-3">
                                            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                                                <span className="text-xs font-bold text-[#00B074] flex items-center gap-1.5">
                                                    <Info className="w-4 h-4" />
                                                    {activeMethod.name} Hesap Bilgileri
                                                </span>
                                            </div>

                                            {activeMethod.driver === 'bank' && (
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-400">Banka:</span>
                                                        <span className="text-white font-semibold">{settings.bank_name || 'Banka Belirtilmedi'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-400">Alıcı (Hesap Sahibi):</span>
                                                        <span className="text-white font-semibold">{settings.account_holder || '-'}</span>
                                                    </div>
                                                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-2">
                                                        <div>
                                                            <span className="text-[10px] text-gray-500 block">IBAN Numarası</span>
                                                            <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                                                                {settings.iban || '-'}
                                                            </span>
                                                        </div>
                                                        {settings.iban && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy(settings.iban, 'iban')}
                                                                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold flex items-center gap-1 shrink-0"
                                                            >
                                                                {copiedField === 'iban' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                                <span>{copiedField === 'iban' ? 'Kopyalandı' : 'Kopyala'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeMethod.driver === 'crypto' && (
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-400">Ağ (Network):</span>
                                                        <span className="text-emerald-400 font-bold font-mono">{settings.network || 'TRC-20'}</span>
                                                    </div>
                                                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-2">
                                                        <div className="overflow-hidden">
                                                            <span className="text-[10px] text-gray-500 block">TRC-20 USDT Cüzdan Adresi</span>
                                                            <span className="text-xs font-mono font-bold text-emerald-400 truncate block">
                                                                {settings.wallet_address || '-'}
                                                            </span>
                                                        </div>
                                                        {settings.wallet_address && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy(settings.wallet_address, 'wallet')}
                                                                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold flex items-center gap-1 shrink-0"
                                                            >
                                                                {copiedField === 'wallet' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                                <span>{copiedField === 'wallet' ? 'Kopyalandı' : 'Kopyala'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeMethod.instructions && (
                                                <div className="pt-2 text-[11px] text-gray-400 border-t border-white/[0.04] whitespace-pre-line leading-relaxed">
                                                    {activeMethod.instructions}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* User Notice Form Fields */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-white">Ödeme Bildirimi Formu</h4>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                            Gönderen Ad Soyad veya Hesap Sahibi *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Örn: Ahmet Yılmaz"
                                            value={senderName}
                                            onChange={(e) => setSenderName(e.target.value)}
                                            className="w-full px-3.5 py-2 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B074]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                            TxID / İşlem Hash veya Dekont Referans No (Opsiyonel)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Kripto TxID veya banka dekont referansı..."
                                            value={txHash}
                                            onChange={(e) => setTxHash(e.target.value)}
                                            className="w-full px-3.5 py-2 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B074]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                            Not (Opsiyonel)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Varsa eklemek istediğiniz not..."
                                            value={userNotes}
                                            onChange={(e) => setUserNotes(e.target.value)}
                                            className="w-full px-3.5 py-2 bg-[#07090E] border border-white/[0.08] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B074]"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                                    <button
                                        type="button"
                                        onClick={() => setCheckoutPlan(null)}
                                        className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-gray-300 text-xs font-semibold hover:bg-white/[0.08]"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingNotice}
                                        className="px-5 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold shadow-lg shadow-[#00B074]/20 flex items-center gap-2"
                                    >
                                        {isSubmittingNotice ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        <span>Ödeme Bildirimini Gönder</span>
                                    </button>
                                </div>
                            </form>
                        )}

                    </div>
                </div>
            )}

            <AuthModal
                isOpen={authModalOpen}
                mode={authModalMode}
                onClose={() => setAuthModalOpen(false)}
                onSwitchMode={(mode) => setAuthModalMode(mode)}
            />
        </Layout>
    );
}

