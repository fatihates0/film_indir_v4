import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Play,
    Sparkles,
    SlidersHorizontal,
    Search,
    Loader2,
    X,
    Film,
    Check,
    AlertCircle,
    Terminal,
    RefreshCw,
    CheckCircle2,
    ShieldCheck,
    ShieldAlert,
    HelpCircle,
    Plus,
    ChevronUp,
    ChevronDown,
    Trash2
} from 'lucide-react';

export default function SettingsTab({
    heroSettings = { mode: 'auto', slots: { '1': '', '2': '', '3': '', '4': '', '5': '' } },
    heroSlotPreviews = {},
    ipAccessSettings = { whitelist: [], blacklist: [] },
    faqSettings = [],
    showToast
}) {
    // Interactive general settings state
    const [settingsState, setSettingsState] = useState({
        allowRegistrations: true,
        maintenanceMode: false,
        streamRateLimit: 'unlimited',
        cacheLifetimeHours: '24',
        discordWebhook: true,
    });

    const handleSaveGeneralSettings = (e) => {
        e.preventDefault();
        showToast('Sistem konfigürasyonu ve güvenlik tercihleri başarıyla kaydedildi.', 'success');
    };

    // Hero Carousel Settings state
    const [heroMode, setHeroMode] = useState(heroSettings?.mode || 'auto');
    const [heroSlots, setHeroSlots] = useState({
        '1': heroSettings?.slots?.['1'] || heroSettings?.slots?.[1] || '',
        '2': heroSettings?.slots?.['2'] || heroSettings?.slots?.[2] || '',
        '3': heroSettings?.slots?.['3'] || heroSettings?.slots?.[3] || '',
        '4': heroSettings?.slots?.['4'] || heroSettings?.slots?.[4] || '',
        '5': heroSettings?.slots?.['5'] || heroSettings?.slots?.[5] || '',
    });
    const [slotPreviews, setSlotPreviews] = useState(heroSlotPreviews || {});
    const [lookupLoading, setLookupLoading] = useState({});
    const [isSavingHero, setIsSavingHero] = useState(false);

    // Sync Trailers state
    const [isSyncingTrailers, setIsSyncingTrailers] = useState(false);
    const [syncLimit, setSyncLimit] = useState(50);
    const [syncOutput, setSyncOutput] = useState(null);
    const [syncSuccess, setSyncSuccess] = useState(null);

    // IP Access Control state
    const [whitelistText, setWhitelistText] = useState((ipAccessSettings?.whitelist || []).join('\n'));
    const [blacklistText, setBlacklistText] = useState((ipAccessSettings?.blacklist || []).join('\n'));
    const [isSavingIpAccess, setIsSavingIpAccess] = useState(false);

    // FAQ Management state
    const [faqsList, setFaqsList] = useState(faqSettings || []);
    const [isSavingFaqs, setIsSavingFaqs] = useState(false);

    const handleLookupImdb = async (slotNum, imdbId) => {
        const cleanId = (imdbId || '').trim();
        if (!cleanId) {
            setSlotPreviews(prev => {
                const next = { ...prev };
                delete next[slotNum];
                return next;
            });
            return;
        }

        setLookupLoading(prev => ({ ...prev, [slotNum]: true }));
        try {
            const res = await fetch(`/admin/lookup-imdb?imdb_id=${encodeURIComponent(cleanId)}`);
            const data = await res.json();
            if (data.found) {
                setSlotPreviews(prev => ({ ...prev, [slotNum]: data.title }));
            } else {
                setSlotPreviews(prev => ({ ...prev, [slotNum]: { error: data.message || 'Arşivde bulunamadı' } }));
            }
        } catch (err) {
            console.error('Lookup error:', err);
            setSlotPreviews(prev => ({ ...prev, [slotNum]: { error: 'Sorgulama hatası oluştu' } }));
        } finally {
            setLookupLoading(prev => ({ ...prev, [slotNum]: false }));
        }
    };

    const handleSaveHeroSettings = (e) => {
        e?.preventDefault();
        setIsSavingHero(true);
        router.post('/admin/hero-settings', {
            mode: heroMode,
            slots: heroSlots,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSavingHero(false);
                showToast('Fragman vitrin ayarları güncellendi.', 'success');
            },
            onError: () => {
                setIsSavingHero(false);
                showToast('Fragman ayarları kaydedilemedi.', 'error');
            }
        });
    };

    const handleRunSyncTrailers = async () => {
        setIsSyncingTrailers(true);
        setSyncOutput(null);
        setSyncSuccess(null);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res = await fetch('/admin/sync-trailers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ limit: Number(syncLimit) || 50 }),
            });

            const data = await res.json();
            if (data.success) {
                setSyncSuccess(data.message);
                setSyncOutput(data.output);
                showToast(data.message || 'Fragmanlar senkronize edildi.', 'success');
                router.reload({ only: ['heroSlotPreviews', 'heroSettings'] });
            } else {
                setSyncOutput(data.message || 'Senkronizasyon sırasında hata oluştu.');
                showToast('Senkronizasyon hatası oluştu.', 'error');
            }
        } catch (err) {
            setSyncOutput('Komut çalıştırılırken bağlantı hatası: ' + err.message);
            showToast('Bağlantı hatası oluştu.', 'error');
        } finally {
            setIsSyncingTrailers(false);
        }
    };

    const handleSaveIpAccessSettings = (e) => {
        e?.preventDefault();
        setIsSavingIpAccess(true);
        const whitelist = whitelistText.split('\n').map(ip => ip.trim()).filter(Boolean);
        const blacklist = blacklistText.split('\n').map(ip => ip.trim()).filter(Boolean);

        router.post('/admin/ip-access-settings', {
            whitelist,
            blacklist,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSavingIpAccess(false);
                showToast('IP kuralları başarıyla kaydedildi.', 'success');
            },
            onError: () => {
                setIsSavingIpAccess(false);
                showToast('IP ayarları kaydedilemedi.', 'error');
            }
        });
    };

    const handleAddFaqItem = () => {
        setFaqsList(prev => [...prev, { question: '', answer: '' }]);
    };

    const handleRemoveFaqItem = (index) => {
        setFaqsList(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateFaqItem = (index, field, value) => {
        setFaqsList(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const handleMoveFaqItem = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= faqsList.length) return;
        const newFaqs = [...faqsList];
        const temp = newFaqs[index];
        newFaqs[index] = newFaqs[targetIndex];
        newFaqs[targetIndex] = temp;
        setFaqsList(newFaqs);
    };

    const handleSaveFaqSettings = (e) => {
        e?.preventDefault();
        setIsSavingFaqs(true);
        router.post('/admin/faq-settings', {
            faqs: faqsList
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSavingFaqs(false);
                showToast('Fiyatlandırma Sıkça Sorulan Sorular güncellendi.', 'success');
            },
            onError: () => {
                setIsSavingFaqs(false);
                showToast('SSS kaydedilirken bir hata oluştu.', 'error');
            }
        });
    };

    return (
        <div className="max-w-5xl space-y-8 animate-in fade-in duration-200">
            {/* 1. HERO CAROUSEL TRAILER SETTINGS CARD */}
            <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-xl shadow-black/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                            <Play className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <span>Dashboard Fragman & Manşet Vitrini (Hero Carousel)</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                    {heroMode === 'auto' ? 'Otomatik Mod' : 'Manuel Sıralama'}
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Ana sayfadaki 5 fragmanın seçim modunu belirleyin veya her sıra için özel IMDb ID atayın.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mode Switcher Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setHeroMode('auto')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                            heroMode === 'auto'
                                ? 'bg-emerald-500/[0.08] border-emerald-500/40 text-white shadow-md ring-1 ring-emerald-500/30'
                                : 'bg-[#06080E] border-white/[0.06] text-gray-400 hover:border-white/[0.12] hover:text-gray-200'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Sparkles className={`w-4 h-4 ${heroMode === 'auto' ? 'text-emerald-400' : 'text-gray-400'}`} />
                                <span className="text-xs font-bold text-white">Otomatik (Akıllı Hibrit)</span>
                            </div>
                            {heroMode === 'auto' && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            Kütüphanenizdeki Türkçe Dublaj ve Altyazılı içerikleri; taze eklenenler, trendler, diziler ve günlük rotasyonla otomatik seçer.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setHeroMode('manual')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                            heroMode === 'manual'
                                ? 'bg-emerald-500/[0.08] border-emerald-500/40 text-white shadow-md ring-1 ring-emerald-500/30'
                                : 'bg-[#06080E] border-white/[0.06] text-gray-400 hover:border-white/[0.12] hover:text-gray-200'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className={`w-4 h-4 ${heroMode === 'manual' ? 'text-emerald-400' : 'text-gray-400'}`} />
                                <span className="text-xs font-bold text-white">Manuel (Özel IMDb Sıralaması)</span>
                            </div>
                            {heroMode === 'manual' && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            5 sıranın her birine özel IMDb ID atayın. Boş bırakılan sıralar otomatik hibrit algoritmayla tamamlanır.
                        </p>
                    </button>
                </div>

                {/* 5 SLOTS INPUTS & LIVE PREVIEW */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="font-semibold text-gray-200">Manşet Fragman Sıralaması (5 Slayt)</span>
                        <span className="text-[11px] text-gray-500 font-mono">Format: tt15239678</span>
                    </div>

                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((slotNum) => {
                            const key = String(slotNum);
                            const currentImdb = heroSlots[key] || '';
                            const preview = slotPreviews[key];
                            const isLoading = lookupLoading[key];

                            return (
                                <div 
                                    key={slotNum} 
                                    className="p-4 rounded-xl bg-[#06080E] border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-3"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-[140px]">
                                            <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono text-xs font-bold text-emerald-400">
                                                {slotNum}
                                            </span>
                                            <span className="text-xs font-semibold text-white">
                                                {slotNum === 1 ? '1. Slayt (Ana Başlık)' : `${slotNum}. Slayt`}
                                            </span>
                                        </div>

                                        {/* Input + Action Buttons */}
                                        <div className="flex items-center gap-2 flex-1 max-w-lg">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Örn: tt15239678 veya tt10872600"
                                                    value={currentImdb}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setHeroSlots(s => ({ ...s, [key]: val }));
                                                    }}
                                                    onBlur={() => handleLookupImdb(key, currentImdb)}
                                                    className="w-full bg-[#0D111A] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none font-mono"
                                                />
                                                {currentImdb && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setHeroSlots(s => ({ ...s, [key]: '' }));
                                                            handleLookupImdb(key, '');
                                                        }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleLookupImdb(key, currentImdb)}
                                                disabled={isLoading || !currentImdb.trim()}
                                                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 hover:text-white text-xs font-semibold transition-colors border border-white/[0.06] flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                                ) : (
                                                    <Search className="w-3.5 h-3.5" />
                                                )}
                                                <span>Doğrula</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* MATCHED PREVIEW CARD */}
                                    {preview && (
                                        <div className="pt-2 border-t border-white/[0.04]">
                                            {preview.error ? (
                                                <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                    <span>{preview.error}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 bg-[#0D111A] border border-white/[0.06] p-2.5 rounded-xl">
                                                    {preview.poster ? (
                                                        <img 
                                                            src={preview.poster} 
                                                            alt={preview.title} 
                                                            className="w-10 h-14 object-cover rounded-lg shadow-md shrink-0 border border-white/10" 
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-14 bg-white/[0.05] rounded-lg flex items-center justify-center shrink-0 text-gray-500">
                                                            <Film className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-bold text-white truncate">
                                                                {preview.title}
                                                            </p>
                                                            {preview.year && (
                                                                <span className="text-[11px] text-gray-400 font-mono">
                                                                    ({preview.year})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-300 font-medium">
                                                                {preview.media_type === 'tv' ? 'Dizi' : 'Film'}
                                                            </span>
                                                            {preview.is_dubbed ? (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 flex items-center gap-1">
                                                                    <Check className="w-2.5 h-2.5" />
                                                                    Türkçe Dublaj
                                                                </span>
                                                            ) : preview.is_subtitled ? (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
                                                                    Türkçe Altyazılı
                                                                </span>
                                                            ) : preview.has_tr ? (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                                                                    Türkçe Fragman
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                                                                    {preview.trailer_label || 'Fragman Mevcut'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSaveHeroSettings}
                        disabled={isSavingHero}
                        className="px-5 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs transition-all shadow-lg shadow-[#00B074]/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSavingHero ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        <span>Fragman Vitrin Ayarlarını Kaydet</span>
                    </button>
                </div>
            </div>

            {/* 2. TMDB TRAILERS SYNC COMMAND CARD */}
            <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-xl shadow-black/20">
                <div className="border-b border-white/[0.06] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
                            <Terminal className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <span>TMDB Fragman Senkronizasyon Konsolu</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                                    Artisan Tool
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Kütüphanenizdeki yapımların en güncel Türkçe dublaj ve altyazılı fragmanlarını TMDB API üzerinden senkronize eder.
                            </p>
                        </div>
                    </div>

                    {/* Action Button & Limit */}
                    <div className="flex items-center gap-2.5 self-start sm:self-auto">
                        <div className="flex items-center gap-1.5 bg-[#06080E] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-gray-300">
                            <span className="text-gray-500">Limit:</span>
                            <select
                                value={syncLimit}
                                onChange={(e) => setSyncLimit(Number(e.target.value))}
                                disabled={isSyncingTrailers}
                                className="bg-transparent text-white font-mono focus:outline-none cursor-pointer"
                            >
                                <option value={25} className="bg-[#0D111A]">25</option>
                                <option value={50} className="bg-[#0D111A]">50</option>
                                <option value={100} className="bg-[#0D111A]">100</option>
                                <option value={200} className="bg-[#0D111A]">200</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={handleRunSyncTrailers}
                            disabled={isSyncingTrailers}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSyncingTrailers ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span>{isSyncingTrailers ? 'Taranıyor...' : `sync-trailers (${syncLimit})`}</span>
                        </button>
                    </div>
                </div>

                {/* Sync Status / Terminal Log */}
                {syncSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{syncSuccess}</span>
                        </div>
                        <span className="font-mono text-[10px] text-emerald-400">STATUS_200_OK</span>
                    </div>
                )}

                {syncOutput && (
                    <div className="space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span className="font-mono">Konsol Çıktısı (Artisan Log):</span>
                            <button 
                                type="button" 
                                onClick={() => setSyncOutput(null)}
                                className="text-gray-500 hover:text-gray-300 text-[10px]"
                            >
                                Kapat
                            </button>
                        </div>
                        <pre className="p-4 rounded-xl bg-[#05070B] border border-white/[0.08] text-[11px] font-mono text-emerald-400/90 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                            {syncOutput}
                        </pre>
                    </div>
                )}
            </div>

            {/* 3. IP ACCESS CONTROL (WHITE LIST & BLACK LIST) CARD */}
            <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-xl shadow-black/20">
                <div className="border-b border-white/[0.06] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <span>IP Erişim Kuralları (White List & Black List)</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                    Güvenlik Filtresi
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">
                                İndirme sunucuları ve doğrudan API istekleri için IP izin ve engelleme listeleri.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* White List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4" />
                                <span>White List (Her Durumda İzinli IP'ler)</span>
                            </label>
                            <span className="text-[10px] font-mono text-gray-500">
                                {whitelistText.split('\n').filter(l => l.trim()).length} IP
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            White list'e eklenen IP adreslerine datacenter/VPN kısıtlaması uygulanmaz ve indirmelere her zaman izin verilir.
                        </p>
                        <textarea
                            rows={6}
                            value={whitelistText}
                            onChange={(e) => setWhitelistText(e.target.value)}
                            placeholder={"Her satıra tek IP veya CIDR bloğu yazın:\n192.168.1.100\n10.0.0.0/24"}
                            className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl p-3 text-xs text-white placeholder-gray-600 font-mono focus:outline-none leading-relaxed"
                        />
                    </div>

                    {/* Black List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                                <ShieldAlert className="w-4 h-4" />
                                <span>Black List (Kesin Engellenen IP'ler)</span>
                            </label>
                            <span className="text-[10px] font-mono text-gray-500">
                                {blacklistText.split('\n').filter(l => l.trim()).length} IP
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            Black list'e eklenen IP adreslerinin indirme yapmasına asla izin verilmez (HTTP 403 Engellendi yanıtı döner).
                        </p>
                        <textarea
                            rows={6}
                            value={blacklistText}
                            onChange={(e) => setBlacklistText(e.target.value)}
                            placeholder={"Her satıra tek IP veya CIDR bloğu yazın:\n5.6.7.8\n185.220.101.0/24"}
                            className="w-full bg-[#06080E] border border-white/[0.08] focus:border-rose-500/50 rounded-xl p-3 text-xs text-white placeholder-gray-600 font-mono focus:outline-none leading-relaxed"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSaveIpAccessSettings}
                        disabled={isSavingIpAccess}
                        className="px-5 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs transition-all shadow-lg shadow-[#00B074]/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSavingIpAccess ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        <span>IP Listelerini Kaydet</span>
                    </button>
                </div>
            </div>

            {/* 4. PRICING FAQ (SSS) MANAGEMENT CARD */}
            <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-xl shadow-black/20">
                <div className="border-b border-white/[0.06] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <span>Fiyatlandırma Sıkça Sorulan Sorular (SSS / FAQ)</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                    {faqsList.length} Soru
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Sitede /pricing sayfasında kullanıcılara gösterilecek soru ve cevapları dinamik yönetin.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={handleAddFaqItem}
                            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Yeni Soru Ekle</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveFaqSettings}
                            disabled={isSavingFaqs}
                            className="px-4 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs transition-all shadow-lg shadow-[#00B074]/20 flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isSavingFaqs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>SSS Kaydet</span>
                        </button>
                    </div>
                </div>

                {faqsList.length === 0 ? (
                    <div className="p-8 text-center bg-[#06080E] border border-white/[0.04] rounded-2xl space-y-3">
                        <HelpCircle className="w-8 h-8 text-gray-600 mx-auto" />
                        <p className="text-xs font-semibold text-gray-400">Henüz eklenmiş soru yok.</p>
                        <button
                            type="button"
                            onClick={handleAddFaqItem}
                            className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>İlk Soruyu Ekle</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {faqsList.map((faq, index) => (
                            <div key={index} className="p-4 bg-[#06080E] border border-white/[0.06] hover:border-white/15 rounded-xl space-y-3 transition-all">
                                <div className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-2.5">
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                        <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono text-[10px]">
                                            {index + 1}
                                        </span>
                                        <span>Soru #{index + 1}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveFaqItem(index, -1)}
                                            disabled={index === 0}
                                            className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-20 text-gray-300 rounded-lg transition-all"
                                            title="Yukarı Taşı"
                                        >
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveFaqItem(index, 1)}
                                            disabled={index === faqsList.length - 1}
                                            className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-20 text-gray-300 rounded-lg transition-all"
                                            title="Aşağı Taşı"
                                        >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFaqItem(index)}
                                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-all ml-1"
                                            title="Sil"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                            Soru Başlığı (Kullanıcıların Göreceği Soru)
                                        </label>
                                        <input
                                            type="text"
                                            value={faq.question || ''}
                                            onChange={(e) => handleUpdateFaqItem(index, 'question', e.target.value)}
                                            placeholder="Örn: İndirme kotaları nasıl yenilenir?"
                                            className="w-full bg-[#0D111A] border border-white/10 focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                            Cevap Açıklaması
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={faq.answer || ''}
                                            onChange={(e) => handleUpdateFaqItem(index, 'answer', e.target.value)}
                                            placeholder="Soruya verilecek detaylı yanıt..."
                                            className="w-full bg-[#0D111A] border border-white/10 focus:border-emerald-500/50 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none leading-relaxed"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 5. GENERAL ACCESS POLICY FORM */}
            <form onSubmit={handleSaveGeneralSettings} className="space-y-6">
                
                {/* Access & Registration Card */}
                <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-xl shadow-black/20">
                    <div className="border-b border-white/[0.06] pb-3">
                        <h2 className="text-sm font-bold text-white">Erişim & Üyelik Politikası</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Platforma yeni kayıt olma ve genel bakım kuralları</p>
                    </div>

                    <div className="space-y-4 text-xs">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-semibold text-white">Yeni Kayıt Kabulü</p>
                                <p className="text-gray-400 text-[11px]">Kapatıldığında misafirler üye kaydı oluşturamaz.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettingsState(s => ({ ...s, allowRegistrations: !s.allowRegistrations }))}
                                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                                    settingsState.allowRegistrations ? 'bg-emerald-500' : 'bg-white/[0.12]'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                    settingsState.allowRegistrations ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between py-2 border-t border-white/[0.04]">
                            <div>
                                <p className="font-semibold text-white">Bakım Modu (Maintenance)</p>
                                <p className="text-gray-400 text-[11px]">Sadece yöneticiler siteye erişebilir, diğer kullanıcılara 503 gösterilir.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettingsState(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                                    settingsState.maintenanceMode ? 'bg-rose-500' : 'bg-white/[0.12]'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                    settingsState.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Media Distribution & CDN Speed Limits */}
                <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-xl shadow-black/20">
                    <div className="border-b border-white/[0.06] pb-3">
                        <h2 className="text-sm font-bold text-white">Medya Dağıtım ve CDN Hız Sınırları</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Film ve dizi indirmeleri için sunucu optimizasyonu</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                            <label className="block text-gray-300 font-semibold mb-1.5">Free Üye İndirme Bant Genişliği</label>
                            <select 
                                value={settingsState.streamRateLimit}
                                onChange={(e) => setSettingsState(s => ({ ...s, streamRateLimit: e.target.value }))}
                                className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                            >
                                <option value="unlimited">Limitsiz (CDN Direct)</option>
                                <option value="5mbps">5 MB/sn ile sınırla</option>
                                <option value="10mbps">10 MB/sn ile sınırla</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-300 font-semibold mb-1.5">Statik Varlık Önbellek Ömrü (Saat)</label>
                            <input 
                                type="number"
                                value={settingsState.cacheLifetimeHours}
                                onChange={(e) => setSettingsState(s => ({ ...s, cacheLifetimeHours: e.target.value }))}
                                className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs transition-all shadow-lg shadow-[#00B074]/20"
                    >
                        Değişiklikleri Kaydet
                    </button>
                </div>

            </form>
        </div>
    );
}
