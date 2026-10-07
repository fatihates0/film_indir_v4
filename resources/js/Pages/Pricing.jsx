import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import Layout from '../Components/Layout';
import AuthModal from '../Components/AuthModal';
import { 
    Check, Zap, Shield, HardDrive, Download, ArrowRight, 
    Sparkles, RefreshCw, Clock, AlertCircle 
} from 'lucide-react';

export default function Pricing({ plans = [] }) {
    const { auth, flash } = usePage().props;
    const [selectedDuration, setSelectedDuration] = useState(1); // 1, 3, 6, 12
    const [submittingPlanId, setSubmittingPlanId] = useState(null);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState('login');

    const user = auth?.user;
    const quota = auth?.quota;

    const durationOptions = [
        { months: 1, label: '1 Aylık', badge: null },
        { months: 3, label: '3 Aylık', badge: '%10 Avantaj' },
        { months: 6, label: '6 Aylık', badge: '%20 İndirim' },
        { months: 12, label: '12 Aylık', badge: '%30 İndirim' },
    ];

    const getPrice = (plan, months) => {
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

    const handleSubscribe = (planId) => {
        if (!user) {
            setAuthModalMode('login');
            setAuthModalOpen(true);
            return;
        }

        setSubmittingPlanId(planId);
        router.post(`/subscribe/${planId}`, {
            duration_months: selectedDuration,
        }, {
            preserveScroll: true,
            onFinish: () => setSubmittingPlanId(null),
            onError: () => setSubmittingPlanId(null),
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
                                            disabled={submittingPlanId === plan.id}
                                            onClick={() => handleSubscribe(plan.id)}
                                            className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                                isFeatured
                                                    ? 'bg-[#00B074] hover:bg-[#009663] text-white shadow-xl shadow-[#00B074]/30'
                                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                            }`}
                                        >
                                            {submittingPlanId === plan.id ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Hemen Başla</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
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

            <AuthModal
                isOpen={authModalOpen}
                mode={authModalMode}
                onClose={() => setAuthModalOpen(false)}
                onSwitchMode={(mode) => setAuthModalMode(mode)}
            />
        </Layout>
    );
}
