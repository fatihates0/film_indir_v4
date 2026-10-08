import React, { useState, useEffect } from 'react';
import { useUpload } from '../Context/UploadContext';
import {
    Sparkles,
    Search,
    Check,
    ChevronRight,
    ChevronLeft,
    X,
    Film,
    Tv,
    Calendar,
    Star,
    ExternalLink,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

export default function TmdbWizardModal() {
    const {
        isTmdbWizardOpen,
        completedQueue,
        wizardCurrentIndex,
        setWizardCurrentIndex,
        closeTmdbWizard
    } = useUpload();

    const currentMedia = completedQueue[wizardCurrentIndex] || null;

    const [query, setQuery] = useState('');
    const [year, setYear] = useState('');
    const [mediaType, setMediaType] = useState('all');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [notification, setNotification] = useState(null);

    // Initialize search whenever currentMedia changes
    useEffect(() => {
        if (currentMedia) {
            const initialQuery = currentMedia.clean_title || currentMedia.name || '';
            const initialYear = currentMedia.year || '';
            const initialType = currentMedia.category === 'series' ? 'tv' : 'movie';

            setQuery(initialQuery);
            setYear(initialYear);
            setMediaType(initialType);
            searchTmdb(initialQuery, initialYear, initialType);
        }
    }, [currentMedia, wizardCurrentIndex]);

    const searchTmdb = async (q, y, t) => {
        if (!currentMedia || !q) return;
        setIsLoading(true);
        setResults([]);

        try {
            const params = new URLSearchParams({
                query: q,
                year: y || '',
                type: t === 'all' ? '' : t,
            });

            const res = await fetch(`/admin/medias/${currentMedia.id}/tmdb-search?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await res.json();
            if (data.success && Array.isArray(data.results)) {
                setResults(data.results);
            } else {
                setResults([]);
            }
        } catch (e) {
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        searchTmdb(query, year, mediaType);
    };

    const handleMatchCandidate = async (candidate) => {
        if (!currentMedia || isMatching) return;
        setIsMatching(true);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const tmdbId = candidate.id || candidate.tmdb_id;
            if (!tmdbId) {
                setNotification({ type: 'error', message: 'Geçersiz TMDB ID' });
                setIsMatching(false);
                return;
            }

            const res = await fetch(`/admin/medias/${currentMedia.id}/tmdb-match`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    tmdb_id: Number(tmdbId),
                    media_type: candidate.media_type || (currentMedia.category === 'series' ? 'tv' : 'movie'),
                    match_all_series: true,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setNotification({ type: 'success', message: `"${currentMedia.clean_title}" eşleştirildi!` });
                setTimeout(() => {
                    setNotification(null);
                    advanceToNext();
                }, 1000);
            } else {
                setNotification({ type: 'error', message: data.message || 'Eşleştirme başarısız' });
            }
        } catch (err) {
            setNotification({ type: 'error', message: 'Bağlantı hatası: ' + err.message });
        } finally {
            setIsMatching(false);
        }
    };

    const advanceToNext = () => {
        if (wizardCurrentIndex < completedQueue.length - 1) {
            setWizardCurrentIndex(wizardCurrentIndex + 1);
        } else {
            closeTmdbWizard();
        }
    };

    const prevItem = () => {
        if (wizardCurrentIndex > 0) {
            setWizardCurrentIndex(wizardCurrentIndex - 1);
        }
    };

    if (!isTmdbWizardOpen || !currentMedia) {
        return null;
    }

    const totalCount = completedQueue.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-4xl bg-[#0B0F19] border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-sans flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 bg-[#111625] border-b border-white/[0.08] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white">TMDB Eşleştirme Sihirbazı</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                                    Dosya {wizardCurrentIndex + 1} / {totalCount}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">
                                Yüklenen dosyaları sitede kapak görseli ve detaylarıyla göstermek için TMDB ile eşleştirin.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={closeTmdbWizard}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub-Header: Current File Details */}
                <div className="px-6 py-3 bg-[#151C2C] border-b border-white/[0.04] flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 font-mono font-bold rounded-lg border border-emerald-500/20 shrink-0">
                            YÜKLENDİ
                        </span>
                        <div className="truncate">
                            <p className="font-bold text-white truncate" title={currentMedia.name}>
                                {currentMedia.clean_title || currentMedia.name}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                                Yol: {currentMedia.path} ({currentMedia.formatted_size || formatBytes(currentMedia.size_bytes)})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={prevItem}
                            disabled={wizardCurrentIndex === 0}
                            className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-300 rounded-lg transition-all"
                            title="Önceki Dosya"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-mono text-gray-400 text-xs">
                            {wizardCurrentIndex + 1}/{totalCount}
                        </span>
                        <button
                            onClick={advanceToNext}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg flex items-center gap-1 transition-all"
                        >
                            <span>Atla / Sonraki</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {notification && (
                        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                            notification.type === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                            <span>{notification.message}</span>
                        </div>
                    )}

                    {/* Search Form */}
                    <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-6 relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Film veya Dizi Adı (Örn: Avatar, Breaking Bad)"
                                className="w-full bg-[#151B2A] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-all"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="Yıl (Opsiyonel)"
                                className="w-full bg-[#151B2A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-all"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20"
                            >
                                <Search className="w-3.5 h-3.5" />
                                <span>{isLoading ? 'Aranıyor...' : 'TMDB Ara'}</span>
                            </button>
                        </div>
                    </form>

                    {/* TMDB Results Grid */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <span>TMDB Arama Sonuçları</span>
                            {results.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-[10px]">
                                    {results.length} Sonuç
                                </span>
                            )}
                        </h4>

                        {isLoading ? (
                            <div className="py-12 text-center text-gray-400 space-y-2">
                                <Sparkles className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                                <p className="text-xs">TMDB veritabanında arama yapılıyor...</p>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="py-12 text-center bg-white/[0.01] border border-white/[0.04] rounded-2xl">
                                <Film className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-gray-400">Sonuç bulunamadı</p>
                                <p className="text-[11px] text-gray-500">Lütfen film/dizi adını değiştirip tekrar arayın.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {results.map((item) => (
                                    <div
                                        key={(item.id || item.tmdb_id) + '_' + item.media_type}
                                        className="p-3 bg-[#131927] hover:bg-[#182032] border border-white/[0.06] hover:border-amber-500/50 rounded-2xl transition-all flex gap-3 group"
                                    >
                                        {/* Poster */}
                                        <div className="w-16 h-24 bg-gray-800 rounded-xl overflow-hidden shrink-0 border border-white/10 relative">
                                            {item.poster_url ? (
                                                <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                    <Film className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Meta */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                                        item.media_type === 'tv'
                                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                    }`}>
                                                        {item.media_type === 'tv' ? 'Dizi' : 'Film'}
                                                    </span>
                                                    {item.release_year && (
                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                            {item.release_year}
                                                        </span>
                                                    )}
                                                </div>

                                                <h5 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate" title={item.title}>
                                                    {item.title}
                                                </h5>
                                                {item.original_title && item.original_title !== item.title && (
                                                    <p className="text-[10px] text-gray-400 truncate">
                                                        {item.original_title}
                                                    </p>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleMatchCandidate(item)}
                                                disabled={isMatching}
                                                className="w-full mt-2 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-[11px] rounded-lg border border-amber-500/30 flex items-center justify-center gap-1 transition-all"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Bu Yapımla Eşleştir</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-[#111625] border-t border-white/[0.08] flex items-center justify-between shrink-0">
                    <button
                        onClick={closeTmdbWizard}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 font-semibold text-xs rounded-xl transition-all"
                    >
                        Tümünü Kapat / Sonra Eşleştir
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={advanceToNext}
                            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <span>
                                {wizardCurrentIndex < totalCount - 1 ? 'Sonraki Dosya' : 'Tamamla ve Bitir'}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return bytes + ' B';
}
