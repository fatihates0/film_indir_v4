import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import Layout from '../Components/Layout';
import AuthModal from '../Components/AuthModal';
import {
    Check, Zap, Shield, HardDrive, Download, ArrowRight,
    Sparkles, RefreshCw, Clock, AlertCircle, Building2, Coins,
    Copy, CheckCircle2, X, Info, Server, PlusCircle, UserCheck, Lock,
    HelpCircle, ChevronDown
} from 'lucide-react';

export default function Pricing({ plans = [], paymentMethods = [], faqs = [], upgrades = {} }) {
    const { auth, flash } = usePage().props;
    const [selectedDuration, setSelectedDuration] = useState(1); // 1, 3, 6, 12
    const [openFaqIndex, setOpenFaqIndex] = useState(0); // Default open first FAQ item
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState('login');

    // Checkout Modal State
    const [checkoutPlan, setCheckoutPlan] = useState(null);
    const [isUpgradeCheckout, setIsUpgradeCheckout] = useState(false);
    const [selectedMethodId, setSelectedMethodId] = useState(paymentMethods.length > 0 ? paymentMethods[0].id : '');
    const [senderName, setSenderName] = useState('');
    const [txHash, setTxHash] = useState('');
    const [userNotes, setUserNotes] = useState('');
    const [copiedField, setCopiedField] = useState(null);
    const [isSubmittingNotice, setIsSubmittingNotice] = useState(false);
    const [isCancellingPerpetual, setIsCancellingPerpetual] = useState(false);

    const user = auth?.user;
    const quota = auth?.quota;

    const handleCancelPerpetual = () => {
        if (!window.confirm("Süresiz özel kotanızı sonlandırmak istediğinize emin misiniz?\n\nKalan kotanız kapatılacak ve dilediğiniz yeni indirme paketini hemen satın alabileceksiniz.")) {
            return;
        }

        setIsCancellingPerpetual(true);
        router.post('/subscription/cancel-perpetual', {}, {
            preserveScroll: true,
            onFinish: () => setIsCancellingPerpetual(false),
        });
    };

    const durationOptions = [
        { months: 1, label: '1 Aylık', badge: null },
        { months: 3, label: '3 Aylık', badge: '%10 Avantaj' },
        { months: 6, label: '6 Aylık', badge: '%20 İndirim' },
        { months: 12, label: '12 Aylık', badge: '%30 İndirim' },
    ];

    // Filter plans by type
    const individualPlans = plans.filter(p => !p.type || p.type === 'individual');
    const businessPlans = plans.filter(p => p.type === 'business');
    const extraPlans = plans.filter(p => p.type === 'extra');

    const getPrice = (plan, months) => {
        if (!plan) return 0;
        if (plan.type === 'extra') return parseFloat(plan.price_1m || 0);
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

    const isDurationAllowedForPlan = (plan, months) => {
        if (!plan) return true;
        if (plan.type === 'extra') return months === 1;
        const allowed = plan.allowed_durations || [1, 3, 6, 12];
        return allowed.includes(months);
    };

    const getAllowedDurationLabels = (plan) => {
        if (plan.type === 'extra') return '30 Günlük Kullanım';
        const allowed = plan?.allowed_durations || [1, 3, 6, 12];
        return allowed.map(m => m === 12 ? '12 Aylık' : `${m} Aylık`).join(', ');
    };

    const handleOpenCheckout = (plan, isUpgrade = false) => {
        if (!user) {
            setAuthModalMode('login');
            setAuthModalOpen(true);
            return;
        }

        // Check Extra Quota eligibility
        if (plan.type === 'extra' && (!quota || !quota.can_buy_extra_quota)) {
            alert('Ek kota alabilmek için aktif bir bireysel veya business paketinizin bulunması gerekmektedir.');
            return;
        }

        const allowed = plan.allowed_durations || [1, 3, 6, 12];
        const isAllowed = plan.type === 'extra' || isUpgrade ? true : allowed.includes(selectedDuration);

        if (!isAllowed) {
            const firstAllowed = allowed[0] || 1;
            setSelectedDuration(firstAllowed);
            return;
        }

        setCheckoutPlan(plan);
        setIsUpgradeCheckout(Boolean(isUpgrade));
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
            duration_months: checkoutPlan.type === 'extra' || isUpgradeCheckout ? 1 : selectedDuration,
            is_upgrade: isUpgradeCheckout,
            sender_name: senderName,
            tx_hash: txHash,
            user_notes: userNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setCheckoutPlan(null);
                setIsUpgradeCheckout(false);
            },
            onFinish: () => setIsSubmittingNotice(false),
        });
    };

    const renderPlanCard = (plan, index) => {
        const isAllowed = isDurationAllowedForPlan(plan, selectedDuration);
        const price = getPrice(plan, selectedDuration);
        const monthlyEquivalent = selectedDuration > 1 ? (price / selectedDuration).toFixed(0) : price;
        const isFeatured = index === 1 || plan.type === 'business';

        const isExtraPlan = plan.type === 'extra';
        const isBusinessPlan = plan.type === 'business';

        const upgradeInfo = upgrades && upgrades[plan.id];
        const isUpgradeAvailable = Boolean(upgradeInfo && upgradeInfo.can_upgrade);
        const isCurrentPlan = Boolean(user && quota?.has_active_main_sub && quota?.plan_id === plan.id);
        const isDowngrade = Boolean(
            user &&
            quota?.has_active_main_sub &&
            !isExtraPlan &&
            !isCurrentPlan &&
            !isUpgradeAvailable &&
            plan.monthly_quota_gb < (quota?.monthly_quota_gb || 0)
        );

        return (
            <div
                key={plan.id}
                className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${isCurrentPlan
                        ? 'bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 dark:from-[#0D1F18] dark:to-[#0A1612] border-2 border-[#00B074] shadow-2xl shadow-[#00B074]/15'
                        : isUpgradeAvailable
                            ? 'bg-gradient-to-b from-purple-500/5 via-indigo-500/5 to-purple-500/10 dark:from-[#171124] dark:to-[#0F0C18] border-2 border-purple-500/40 hover:border-purple-500 shadow-xl shadow-purple-500/10'
                            : isBusinessPlan
                                ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-amber-500/10 dark:from-[#1E1912] dark:to-[#12100C] border-2 border-amber-500/80 shadow-2xl shadow-amber-500/10'
                                : isExtraPlan
                                    ? 'bg-gradient-to-b from-sky-50 to-white dark:from-[#101B2B] dark:to-[#0D1420] border border-sky-500/50 hover:border-sky-400 shadow-xl'
                                    : isFeatured
                                        ? 'bg-gradient-to-b from-emerald-50 to-white dark:from-[#161D2B] dark:to-[#10141E] border-2 border-[#00B074] shadow-2xl shadow-[#00B074]/10 transform md:-translate-y-2'
                                        : 'bg-white dark:bg-[#121620] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-md dark:shadow-none'
                    }`}
            >
                {/* Badges */}
                {isCurrentPlan && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#00B074] text-white shadow-lg shadow-[#00B074]/30 flex items-center gap-1.5 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mevcut Paketiniz
                    </div>
                )}
                {!isCurrentPlan && isUpgradeAvailable && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 flex items-center gap-1.5 whitespace-nowrap">
                        <Sparkles className="w-3.5 h-3.5" /> Yükseltilebilir Paket
                    </div>
                )}
                {!isCurrentPlan && !isUpgradeAvailable && isBusinessPlan && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-black shadow-lg shadow-amber-500/30 flex items-center gap-1.5 whitespace-nowrap">
                        <Server className="w-3.5 h-3.5" /> Sunucu IP Destekli Business
                    </div>
                )}
                {!isCurrentPlan && !isUpgradeAvailable && isExtraPlan && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-sky-500 text-white shadow-lg shadow-sky-500/30 flex items-center gap-1.5 whitespace-nowrap">
                        <PlusCircle className="w-3.5 h-3.5" /> 30 Gün Geçerli Ek Kota
                    </div>
                )}
                {!isCurrentPlan && !isUpgradeAvailable && !isBusinessPlan && !isExtraPlan && isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#00B074] text-white shadow-lg shadow-[#00B074]/30 whitespace-nowrap">
                        En Çok Tercih Edilen
                    </div>
                )}

                <div className="space-y-6 pt-2">
                    {/* Plan Header */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isBusinessPlan
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : isExtraPlan
                                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                                        : 'bg-[#00B074]/10 text-[#00B074] border-[#00B074]/30'
                                }`}>
                                {plan.type_label}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-gray-400 line-clamp-2">{plan.description}</p>
                    </div>

                    {/* Quota Badge */}
                    <div className="py-3 px-4 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <HardDrive className={`w-5 h-5 ${isBusinessPlan ? 'text-amber-500 dark:text-amber-400' : isExtraPlan ? 'text-sky-500 dark:text-sky-400' : 'text-[#00B074]'}`} />
                            <span className="text-xs text-slate-700 dark:text-gray-300">
                                {isExtraPlan ? 'Ek Transfer Kotası' : 'Aylık İndirme Kotası'}
                            </span>
                        </div>
                        <span className="text-lg font-black text-slate-900 dark:text-white">{plan.formatted_quota}</span>
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">₺{price}</span>
                            <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                                / {isExtraPlan ? '30 Gün' : `${selectedDuration} Ay`}
                            </span>
                        </div>
                        {!isExtraPlan && selectedDuration > 1 && (
                            <p className="text-[11px] text-[#00B074] font-medium">
                                Aylık ~₺{monthlyEquivalent} denk gelir
                            </p>
                        )}
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 pt-2 text-xs text-slate-700 dark:text-gray-300">
                        {isBusinessPlan ? (
                            <>
                                <li className="flex items-center gap-2.5 font-bold text-amber-700 dark:text-amber-300">
                                    <Check className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                                    <span>Sunucu / VPS IP adreslerinden indirme izni</span>
                                </li>
                                <li className="flex items-center gap-2.5 font-bold text-amber-700 dark:text-amber-300">
                                    <Check className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                                    <span>Sınırsız Eşzamanlı Paralel Bağlantı</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <Check className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                                    <span><strong className="text-slate-900 dark:text-white">{plan.formatted_quota}</strong> dev aylık transfer kotası</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <Check className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                                    <span>1 Gbps yüksek hızlı kurumsal omurga</span>
                                </li>
                            </>
                        ) : isExtraPlan ? (
                            <>
                                <li className="flex items-center gap-2.5 font-bold text-sky-700 dark:text-sky-300">
                                    <Check className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                                    <span><strong className="text-slate-900 dark:text-white">{plan.formatted_quota}</strong> anında tanımlanan ek kota</span>
                                </li>
                                <li className="flex items-center gap-2.5 font-bold text-sky-700 dark:text-sky-300">
                                    <Check className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                                    <span>İlk Önce Bu Kota Harcanır (Öncelikli)</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <Check className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                                    <span>Satın alma tarihinden itibaren 30 gün geçerli</span>
                                </li>
                                <li className="flex items-center gap-2.5 text-slate-500 dark:text-gray-400">
                                    <UserCheck className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                                    <span>Aktif ana paket aboneleri yararlanabilir</span>
                                </li>
                            </>
                        ) : (
                            <>
                                <li className="flex items-center gap-2.5">
                                    <Check className="w-4 h-4 text-[#00B074] shrink-0" />
                                    <span><strong className="text-slate-900 dark:text-white">{plan.formatted_quota}</strong> aylık transfer hakkı</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <Check className="w-4 h-4 text-[#00B074] shrink-0" />
                                    <span>Aydan aya otomatik sıfırlanan kota</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <Check className="w-4 h-4 text-[#00B074] shrink-0" />
                                    <span><strong className="text-slate-900 dark:text-white">{plan.max_parallel_downloads}</strong> adet eşzamanlı paralel bağlantı</span>
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <Check className="w-4 h-4 text-[#00B074] shrink-0" />
                                    <span>IDM, JDownloader ve tarayıcı desteği</span>
                                </li>
                            </>
                        )}
                    </ul>
                </div>

                {/* Action Button */}
                <div className="pt-8">
                    {isCurrentPlan ? (
                        <div className="w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-[#00B074]/15 border border-[#00B074]/40 text-[#00B074] flex items-center justify-center gap-2 select-none shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-[#00B074]" />
                            <span>Mevcut Aktif Paketiniz</span>
                        </div>
                    ) : isUpgradeAvailable ? (
                        <div className="space-y-2.5">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-300">
                                <span className="font-semibold flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                    Kalan {upgradeInfo.remaining_days} gün farkı:
                                </span>
                                <span className="font-black text-xs font-mono text-purple-900 dark:text-purple-200">
                                    {upgradeInfo.formatted_upgrade_amount}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleOpenCheckout(plan, true)}
                                className="w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-500/25 active:scale-[0.99]"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Paketi Yükselt ({upgradeInfo.formatted_upgrade_amount})</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : isDowngrade ? (
                        <button
                            type="button"
                            disabled
                            className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-400 dark:text-gray-500 flex items-center justify-center gap-2 cursor-not-allowed opacity-75"
                            title="Mevcut paketinizden daha düşük kotalı bir pakete geçiş yapılamaz."
                        >
                            <Lock className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                            <span>Daha Düşük Paket</span>
                        </button>
                    ) : isExtraPlan && user && quota && !quota.can_buy_extra_quota ? (
                        <button
                            type="button"
                            disabled
                            className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold bg-slate-200 dark:bg-gray-800 text-slate-500 dark:text-gray-400 border border-slate-300 dark:border-white/5 flex items-center justify-center gap-2 cursor-not-allowed opacity-75"
                            title="Ek kota satın alabilmek için aktif bir ana paketinizin bulunması gerekmektedir."
                        >
                            <Lock className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                            <span>Aktif Paket Gerekli</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleOpenCheckout(plan, false)}
                            className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${isBusinessPlan
                                    ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-xl shadow-amber-500/20'
                                    : isExtraPlan
                                        ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-xl shadow-sky-500/20'
                                        : isFeatured
                                            ? 'bg-[#00B074] hover:bg-[#009663] text-white shadow-xl shadow-[#00B074]/30'
                                            : 'bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20 text-white'
                                }`}
                        >
                            <span>{isExtraPlan ? 'Ek Kota Satın Al' : 'Paket Seç & Öde'}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Layout>
            <Head title="İndirme Paketleri & Üyelikler - SineKutu" />

            <div className="min-h-screen bg-[#f4f5f8] dark:bg-[#0A0D14] text-slate-800 dark:text-gray-200 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
                <div className="max-w-7xl mx-auto space-y-16">

                    {/* CURRENT USER QUOTA BANNER */}
                    {user && quota && quota.has_subscription && (
                        <div className="bg-gradient-to-r from-[#00B074]/10 via-emerald-500/10 to-[#00B074]/5 dark:from-[#00B074]/15 dark:via-emerald-950/20 dark:to-[#00B074]/5 bg-white dark:bg-emerald-950/10 border border-[#00B074]/30 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-4">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00B074] text-white flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" /> Aktif Paketiniz
                                        </span>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{quota.plan_name}</h3>
                                        {quota.allows_vps_access && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                                Sunucu/VPS Erişimi Aktif
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-gray-400">
                                        Kota yenilenme tarihi: <strong className="text-slate-900 dark:text-gray-200">{quota.period_end_formatted || 'Süresiz'}</strong>
                                    </p>
                                </div>

                                <div className="w-full md:w-80 space-y-2">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-slate-600 dark:text-gray-400">Toplam Kalan Kota</span>
                                        <span className="text-[#00B074] font-bold">{quota.formatted_remaining} / {quota.formatted_allocated}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-black/40 h-2.5 rounded-full overflow-hidden border border-slate-300 dark:border-white/5">
                                        <div
                                            className="bg-gradient-to-r from-[#00B074] to-emerald-400 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${quota.usage_percentage}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-gray-400">
                                        <span>Kullanılan: {quota.formatted_used}</span>
                                        <span>%{quota.usage_percentage} Dolu</span>
                                    </div>
                                </div>
                            </div>

                            {/* Active Extra Quotas Breakdown */}
                            {quota.active_extra_quotas && quota.active_extra_quotas.length > 0 && (
                                <div className="pt-3 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {quota.active_extra_quotas.map((eq) => (
                                        <div key={eq.id} className="p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-[#00B074]/30 flex items-center justify-between gap-3 text-xs">
                                            <div>
                                                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                                                    <PlusCircle className="w-3.5 h-3.5" />
                                                    <span>{eq.name}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 dark:text-gray-400 block mt-0.5">
                                                    Son Kullanma: <strong className="text-slate-800 dark:text-gray-200">{eq.expires_at_formatted}</strong>
                                                </span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-black text-[#00B074] block">
                                                    {eq.formatted_remaining}
                                                </span>
                                                <span className="text-[9px] text-slate-500 dark:text-gray-400 block">Öncelikli Kota</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Low Quota Perpetual Cancellation Action */}
                            {quota.can_cancel_perpetual && (
                                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl">
                                    <div className="flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                        <span>
                                            Süresiz özel kotanız <strong>5 GB</strong>'ın altına düşmüştür. Yeni bir paket satın alabilmek için bu paketi sonlandırabilirsiniz.
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCancelPerpetual}
                                        disabled={isCancellingPerpetual}
                                        className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/20 shrink-0 flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        <span>{isCancellingPerpetual ? 'Kapatılıyor...' : 'Süresiz Paketi Kapat'}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MAIN HEADER */}
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#00B074]/10 border border-[#00B074]/30 text-[#00B074] inline-flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" /> Yüksek Hızlı İndirme Paketleri
                        </span>
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            İhtiyacınıza Uygun <span className="text-[#00B074]">İndirme Paketleri</span>
                        </h1>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400">
                            Bireysel, Business veya Ek Kota seçeneklerimizden dilediğinizi tercih edebilirsiniz. Yalnızca indirdiğiniz tam bayt kotanızdan düşer.
                        </p>

                        {/* GLOBAL DURATION TOGGLE (FOR INDIVIDUAL & BUSINESS) */}
                        <div className="pt-6 flex justify-center">
                            <div className="bg-slate-200/80 dark:bg-[#121620] p-1.5 rounded-2xl border border-slate-300/80 dark:border-white/10 flex items-center gap-1 max-w-md w-full">
                                {durationOptions.map((opt) => (
                                    <button
                                        key={opt.months}
                                        type="button"
                                        onClick={() => setSelectedDuration(opt.months)}
                                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${selectedDuration === opt.months
                                                ? 'bg-[#00B074] text-white shadow-lg shadow-[#00B074]/20'
                                                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-white/5'
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

                    {/* SECTION 1: BİREYSEL PAKETLER */}
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-white/10">
                            <div className="w-10 h-10 rounded-2xl bg-[#00B074]/15 text-[#00B074] border border-[#00B074]/30 flex items-center justify-center">
                                <HardDrive className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <span>Bireysel Paketler</span>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00B074]/20 text-[#00B074] border border-[#00B074]/30">
                                        Standart Ev & Mobil Kullanım
                                    </span>
                                </h2>
                                <p className="text-xs text-slate-600 dark:text-gray-400">
                                    Kişisel indirmeleriniz için yüksek hızlı ve uygun fiyatlı aylık transfer paketleri.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-2">
                            {individualPlans.length === 0 ? (
                                <div className="col-span-full py-8 text-center text-slate-500 dark:text-gray-400 bg-white dark:bg-[#121620] rounded-3xl border border-slate-200 dark:border-white/5 text-xs">
                                    Bireysel paket bulunmamaktadır.
                                </div>
                            ) : (
                                individualPlans.map((plan, idx) => renderPlanCard(plan, idx))
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: BUSINESS PAKETLER */}
                    <div className="space-y-6 pt-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-white/10">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center">
                                <Server className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <span>Business Paketler</span>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                        Sunucu & VPS Destekli
                                    </span>
                                </h2>
                                <p className="text-xs text-slate-600 dark:text-gray-400">
                                    Sunucu / VPS IP adreslerine izin veren, yüksek kotalı ve eşzamanlı indirme sınırı olmayan profesyonel paketler.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-2">
                            {businessPlans.length === 0 ? (
                                <div className="col-span-full py-8 text-center text-slate-500 dark:text-gray-400 bg-white dark:bg-[#121620] rounded-3xl border border-slate-200 dark:border-white/5 text-xs">
                                    Business paket bulunmamaktadır.
                                </div>
                            ) : (
                                businessPlans.map((plan, idx) => renderPlanCard(plan, idx))
                            )}
                        </div>
                    </div>

                    {/* SECTION 3: EK KOTA PAKETLERİ */}
                    <div className="space-y-6 pt-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-white/10">
                            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-500 dark:text-sky-400 border border-sky-500/30 flex items-center justify-center">
                                <PlusCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <span>Ek Kota Paketleri</span>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                                        30 Gün Kullanım Süreli
                                    </span>
                                </h2>
                                <p className="text-xs text-slate-600 dark:text-gray-400">
                                    Ay içerisinde kotası biten aktif paketi olan kullanıcılarımız için öncelikli harcanan ek kota paketleri.
                                </p>
                            </div>
                        </div>

                        {/* NOTICE BOX */}
                        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-start gap-3 text-xs text-sky-900 dark:text-sky-200">
                            <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <strong className="block text-slate-900 dark:text-white font-bold">Ek Kota Bilgilendirmesi:</strong>
                                <p className="leading-relaxed text-slate-700 dark:text-sky-200">
                                    Ek kota paketleri <strong>30 gün geçerlidir</strong> ve indirmelerinizde <strong>ilk olarak ek kotanız harcanır</strong>. Ek kota satın alabilmek için hesabınızda aktif bir Bireysel veya Business paketinin bulunması gerekmektedir.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-2">
                            {extraPlans.length === 0 ? (
                                <div className="col-span-full py-8 text-center text-slate-500 dark:text-gray-400 bg-white dark:bg-[#121620] rounded-3xl border border-slate-200 dark:border-white/5 text-xs">
                                    Ek kota paketi bulunmamaktadır.
                                </div>
                            ) : (
                                extraPlans.map((plan, idx) => renderPlanCard(plan, idx))
                            )}
                        </div>
                    </div>

                    {/* FAQ / SYSTEM INFO */}
                    <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-white/5 rounded-3xl p-8 max-w-4xl mx-auto space-y-6 shadow-sm dark:shadow-none">
                        <div className="text-center space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sistem Nasıl Çalışır?</h3>
                            <p className="text-xs text-slate-600 dark:text-gray-400">Şeffaf, adil ve tam bayt ölçümlü indirme altyapısı</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div className="space-y-2">
                                <div className="w-8 h-8 rounded-xl bg-[#00B074]/10 text-[#00B074] flex items-center justify-center font-bold text-xs">
                                    1
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Gerçek Bayt Hesabı</h4>
                                <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                                    10 GB'lık bir dosyanın indirilmesi yarıda kesilip 3 GB çekildiğinde kotanızdan asla 10 GB düşülmez. Tam olarak indirilen 3 GB sayılır.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                                    2
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Business & Sunucu IP</h4>
                                <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                                    Business paketlerde Sunucu/VPS IP adreslerinden indirme engeline takılmadan yüksek omurga hızıyla sınırsız paralel indirme yapabilirsiniz.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                                    3
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ek Kota Önceliği</h4>
                                <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                                    Kotanız bittiğinde veya azaldığında ek kota alabilirsiniz. İndirme yaparken sistem ilk olarak 30 gün geçerli ek kotanızı tüketir.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: SIKÇA SORULAN SORULAR (SSS / FAQ) */}
                    {faqs && faqs.length > 0 && (
                        <div className="space-y-8 pt-8 border-t border-slate-200 dark:border-white/10">
                            <div className="text-center max-w-2xl mx-auto space-y-3">
                                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#00B074]/10 border border-[#00B074]/30 text-[#00B074] inline-flex items-center gap-2">
                                    <HelpCircle className="w-3.5 h-3.5" /> Sıkça Sorulan Sorular
                                </span>
                                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    Aklınıza Takılan <span className="text-[#00B074]">Sorular ve Yanıtlar</span>
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400">
                                    Abonelikler, indirme hızı, kotalar ve ödeme yöntemleri hakkında merak ettiğiniz tüm detaylar.
                                </p>
                            </div>

                            <div className="max-w-3xl mx-auto space-y-3">
                                {faqs.map((faq, index) => {
                                    const isOpen = openFaqIndex === index;
                                    return (
                                        <div
                                            key={index}
                                            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isOpen
                                                    ? 'bg-white dark:bg-[#121620] border-[#00B074]/50 shadow-xl shadow-[#00B074]/5'
                                                    : 'bg-white/70 dark:bg-[#0D111A]/80 border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/15'
                                                }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                                                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 dark:text-white cursor-pointer select-none"
                                            >
                                                <span className="flex items-center gap-3 min-w-0">
                                                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 font-mono font-bold ${isOpen ? 'bg-[#00B074] text-white' : 'bg-[#00B074]/10 text-[#00B074] border border-[#00B074]/20'
                                                        }`}>
                                                        ?
                                                    </span>
                                                    <span className="truncate">{faq.question}</span>
                                                </span>
                                                <span className={`p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#00B074]' : ''}`}>
                                                    <ChevronDown className="w-4 h-4" />
                                                </span>
                                            </button>

                                            {isOpen && (
                                                <div className="px-6 pb-5 pt-1 text-xs text-slate-600 dark:text-gray-300 leading-relaxed border-t border-slate-100 dark:border-white/[0.04] whitespace-pre-line animate-in fade-in duration-200">
                                                    {faq.answer}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* CHECKOUT & PAYMENT NOTIFICATION MODAL */}
            {checkoutPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#0D111A] border border-slate-200 dark:border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-5 text-slate-800 dark:text-gray-200">

                        {/* Modal Header */}
                        {(() => {
                            const currentUpgrade = isUpgradeCheckout && upgrades ? upgrades[checkoutPlan.id] : null;
                            return (
                                <>
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08]">
                                        <div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                                isUpgradeCheckout
                                                    ? 'text-purple-600 dark:text-purple-400'
                                                    : checkoutPlan.type === 'business'
                                                        ? 'text-amber-600 dark:text-amber-400'
                                                        : checkoutPlan.type === 'extra'
                                                            ? 'text-sky-600 dark:text-sky-400'
                                                            : 'text-[#00B074]'
                                            }`}>
                                                {isUpgradeCheckout ? 'Paket Yükseltme Bildirimi' : 'Sipariş ve Ödeme Bildirimi'}
                                            </span>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                                                {isUpgradeCheckout && currentUpgrade ? (
                                                    <span className="flex items-center gap-2">
                                                        <span>{currentUpgrade.current_plan.name}</span>
                                                        <ArrowRight className="w-4 h-4 text-purple-500 shrink-0" />
                                                        <span className="text-purple-600 dark:text-purple-400">{checkoutPlan.name}</span>
                                                    </span>
                                                ) : (
                                                    <span>{checkoutPlan.name} {checkoutPlan.type === 'extra' ? '(30 Gün)' : `(${selectedDuration} Ay)`}</span>
                                                )}
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => setCheckoutPlan(null)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Order Summary Box */}
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#07090E] border border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
                                        <div>
                                            <span className="text-xs text-slate-500 dark:text-gray-400 block">
                                                {isUpgradeCheckout ? `Ödenecek Fark (${currentUpgrade?.remaining_days || 0} Gün)` : 'Ödenecek Tutar'}
                                            </span>
                                            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                                                {isUpgradeCheckout && currentUpgrade
                                                    ? currentUpgrade.formatted_upgrade_amount
                                                    : `₺${getPrice(checkoutPlan, selectedDuration)}`}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-slate-500 dark:text-gray-400 block">
                                                {isUpgradeCheckout ? 'Yeni Kota Tavanı' : checkoutPlan.type === 'extra' ? 'Ek İndirme Kotası' : 'Aylık İndirme Kotası'}
                                            </span>
                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                {checkoutPlan.monthly_quota_gb} GB {isUpgradeCheckout ? '(Mevcut Dönem)' : checkoutPlan.type === 'extra' ? '(30 Gün)' : '/ Ay'}
                                            </span>
                                        </div>
                                    </div>

                                    {isUpgradeCheckout && currentUpgrade && (
                                        <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/30 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                                            <div className="space-y-0.5">
                                                <strong className="block text-slate-900 dark:text-white font-bold">Paket Yükseltme Bilgisi:</strong>
                                                <p className="leading-relaxed text-[11px] text-slate-600 dark:text-purple-200">
                                                    Mevcut döneminizin bitiş tarihi (<strong>{currentUpgrade.period_end_formatted}</strong>) değişmez. İndirme kotanız anında <strong>{checkoutPlan.monthly_quota_gb} GB</strong> tavanına yükseltilir, şu ana kadarki harcamanız korunur.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {/* Payment Methods Selector Tabs */}
                        {paymentMethods.length === 0 ? (
                            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>Şu anda kullanılabilir ödeme yöntemi bulunmamaktadır. Lütfen yönetici ile iletişime geçiniz.</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitPaymentNotice} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-2">
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
                                                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${isSelected
                                                            ? 'bg-[#00B074]/10 dark:bg-[#00B074]/15 border-[#00B074] text-slate-900 dark:text-white shadow-lg shadow-[#00B074]/10'
                                                            : 'bg-slate-50 dark:bg-[#07090E] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:border-slate-300 dark:hover:border-white/20'
                                                        }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#00B074] text-white' : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-gray-400'
                                                        }`}>
                                                        {pm.driver === 'bank' ? <Building2 className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold block text-slate-900 dark:text-white">{pm.name}</span>
                                                        <span className="text-[10px] text-slate-500 dark:text-gray-400 block line-clamp-1">{pm.description}</span>
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
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#07090E] border border-slate-200 dark:border-white/[0.08] space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06] pb-2">
                                                <span className="text-xs font-bold text-[#00B074] flex items-center gap-1.5">
                                                    <Info className="w-4 h-4" />
                                                    {activeMethod.name} Hesap Bilgileri
                                                </span>
                                            </div>

                                            {activeMethod.driver === 'bank' && (
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-500 dark:text-gray-400">Banka:</span>
                                                        <span className="text-slate-900 dark:text-white font-semibold">{settings.bank_name || 'Banka Belirtilmedi'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-500 dark:text-gray-400">Alıcı (Hesap Sahibi):</span>
                                                        <span className="text-slate-900 dark:text-white font-semibold">{settings.account_holder || '-'}</span>
                                                    </div>
                                                    <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-2">
                                                        <div>
                                                            <span className="text-[10px] text-slate-500 dark:text-gray-500 block">IBAN Numarası</span>
                                                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                                                                {settings.iban || '-'}
                                                            </span>
                                                        </div>
                                                        {settings.iban && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy(settings.iban, 'iban')}
                                                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white text-[10px] font-semibold flex items-center gap-1 shrink-0"
                                                            >
                                                                {copiedField === 'iban' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                                <span>{copiedField === 'iban' ? 'Kopyalandı' : 'Kopyala'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeMethod.driver === 'crypto' && (
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-500 dark:text-gray-400">Ağ (Network):</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{settings.network || 'TRC-20'}</span>
                                                    </div>
                                                    <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-2">
                                                        <div className="overflow-hidden">
                                                            <span className="text-[10px] text-slate-500 dark:text-gray-500 block">TRC-20 USDT Cüzdan Adresi</span>
                                                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate block">
                                                                {settings.wallet_address || '-'}
                                                            </span>
                                                        </div>
                                                        {settings.wallet_address && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy(settings.wallet_address, 'wallet')}
                                                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white text-[10px] font-semibold flex items-center gap-1 shrink-0"
                                                            >
                                                                {copiedField === 'wallet' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                                <span>{copiedField === 'wallet' ? 'Kopyalandı' : 'Kopyala'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeMethod.instructions && (
                                                <div className="pt-2 text-[11px] text-slate-600 dark:text-gray-400 border-t border-slate-200 dark:border-white/[0.04] whitespace-pre-line leading-relaxed">
                                                    {activeMethod.instructions}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* User Notice Form Fields */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Ödeme Bildirimi Formu</h4>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">
                                            Gönderen Ad Soyad veya Hesap Sahibi *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Örn: Ahmet Yılmaz"
                                            value={senderName}
                                            onChange={(e) => setSenderName(e.target.value)}
                                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#07090E] border border-slate-300 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#00B074] focus:bg-white dark:focus:bg-[#07090E]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">
                                            TxID / İşlem Hash veya Dekont Referans No (Opsiyonel)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Kripto TxID veya banka dekont referansı..."
                                            value={txHash}
                                            onChange={(e) => setTxHash(e.target.value)}
                                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#07090E] border border-slate-300 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#00B074] focus:bg-white dark:focus:bg-[#07090E]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-gray-300 mb-1">
                                            Not (Opsiyonel)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Varsa eklemek istediğiniz not..."
                                            value={userNotes}
                                            onChange={(e) => setUserNotes(e.target.value)}
                                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#07090E] border border-slate-300 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#00B074] focus:bg-white dark:focus:bg-[#07090E]"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/[0.08]">
                                    <button
                                        type="button"
                                        onClick={() => setCheckoutPlan(null)}
                                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-gray-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/[0.08]"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingNotice}
                                        className="px-5 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-bold shadow-lg shadow-[#00B074]/20 flex items-center gap-2 cursor-pointer"
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
