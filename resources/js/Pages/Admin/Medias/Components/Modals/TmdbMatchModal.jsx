import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Sparkles, X, Unlink, Search, RefreshCw, HelpCircle, Film, Star, Check } from 'lucide-react';

export default function TmdbMatchModal({
    media,
    mediaIds = [],
    onClose,
    showToast
}) {
    if (!media) return null;

    const [tmdbQuery, setTmdbQuery] = useState(media.clean_title || media.name || '');
    const [tmdbYear, setTmdbYear] = useState(media.year ? String(media.year) : '');
    const [tmdbType, setTmdbType] = useState(
        media.category === 'series' ? 'tv' : (media.category === 'movie' ? 'movie' : 'all')
    );
    const [tmdbResults, setTmdbResults] = useState([]);
    const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
    const [isMatchingTmdb, setIsMatchingTmdb] = useState(false);

    const handleTmdbSearch = async (overrideQuery = null, overrideYear = null, overrideType = null) => {
        setIsSearchingTmdb(true);

        const q = overrideQuery !== null ? overrideQuery : tmdbQuery;
        const y = overrideYear !== null ? overrideYear : tmdbYear;
        const t = overrideType !== null ? overrideType : tmdbType;

        try {
            const params = new URLSearchParams();
            if (q) params.set('query', q);
            if (y) params.set('year', y);
            if (t && t !== 'all') params.set('type', t);

            const res = await fetch(`/admin/medias/${media.id}/tmdb-search?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.success) {
                setTmdbResults(data.results || []);
            } else {
                setTmdbResults([]);
                showToast(data.message || 'Arama yapılamadı', 'error');
            }
        } catch (err) {
            setTmdbResults([]);
            showToast('TMDB araması yapılırken bağlantı hatası oluştu', 'error');
        } finally {
            setIsSearchingTmdb(false);
        }
    };

    // Auto trigger initial search on mount
    useEffect(() => {
        const initialQuery = media.clean_title || media.name || '';
        const initialYear = media.year ? String(media.year) : '';
        const initialType = media.category === 'series' ? 'tv' : (media.category === 'movie' ? 'movie' : 'all');
        handleTmdbSearch(initialQuery, initialYear, initialType);
    }, [media.id]);

    const handleConfirmTmdbMatch = (candidate) => {
        setIsMatchingTmdb(true);

        router.post(`/admin/medias/${media.id}/tmdb-match`, {
            tmdb_id: candidate.id,
            media_type: candidate.media_type,
            media_ids: mediaIds.length > 0 ? mediaIds : [media.id],
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsMatchingTmdb(false);
                onClose();
                showToast(`"${media.clean_title || media.name}" içeriği ve gruptaki tüm kayıtlar "${candidate.title}" ile başarıyla eşleştirildi.`, 'success');
            },
            onError: () => {
                setIsMatchingTmdb(false);
                showToast('Eşleştirme sırasında bir hata oluştu.', 'error');
            },
        });
    };

    const handleDetachTmdbMatch = () => {
        setIsMatchingTmdb(true);

        router.post(`/admin/medias/${media.id}/tmdb-detach`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsMatchingTmdb(false);
                onClose();
                showToast('TMDB eşleştirmesi kaldırıldı.', 'success');
            },
            onError: () => {
                setIsMatchingTmdb(false);
                showToast('Eşleştirme kaldırılırken bir hata oluştu.', 'error');
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0D111A] border border-white/[0.1] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Modal Header */}
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-sm">TMDB İçerik Giydirme & Eşleştirme</h3>
                            <p className="text-xs text-gray-400 truncate max-w-md font-mono mt-0.5">
                                {media.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Active Match Banner (if already matched) */}
                {media.tmdb_title && (
                    <div className="px-5 py-3 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                            {media.tmdb_title.poster_url && (
                                <img
                                    src={media.tmdb_title.poster_url}
                                    alt=""
                                    className="w-7 h-10 object-cover rounded border border-emerald-500/30"
                                />
                            )}
                            <div>
                                <div className="font-semibold text-emerald-300 flex items-center gap-2">
                                    <span>{media.tmdb_title.title_tr || media.tmdb_title.title}</span>
                                    <span className="text-[10px] text-gray-400 font-mono">({media.tmdb_title.release_year})</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                                    <span>TR: <strong className="text-gray-200">{media.tmdb_title.title_tr || '-'}</strong></span>
                                    <span>·</span>
                                    <span>EN: <strong className="text-gray-200">{media.tmdb_title.title_en || '-'}</strong></span>
                                    <span>·</span>
                                    <span>Orijinal: <strong className="text-gray-200">{media.tmdb_title.title_original || '-'}</strong></span>
                                </div>
                                {media.tmdb_match_notes && (
                                    <div className="text-[11px] text-amber-300/80 mt-1">
                                        {media.tmdb_match_notes}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleDetachTmdbMatch}
                            disabled={isMatchingTmdb}
                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0"
                        >
                            <Unlink className="w-3 h-3" />
                            <span>Eşleşmeyi Kaldır</span>
                        </button>
                    </div>
                )}

                {/* Search Controls Form */}
                <div className="p-5 border-b border-white/[0.06] bg-[#0A0D14]/50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-6 relative">
                            <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">
                                Film / Dizi Adı, IMDB ID veya TMDB ID
                            </label>
                            <input
                                type="text"
                                value={tmdbQuery}
                                onChange={(e) => setTmdbQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTmdbSearch()}
                                placeholder="Örn: The Choral, Inception, tt0816692 veya 157336"
                                className="w-full bg-[#07090E] border border-white/[0.08] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">
                                Yapım Yılı (Opsiyonel)
                            </label>
                            <input
                                type="number"
                                value={tmdbYear}
                                onChange={(e) => setTmdbYear(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTmdbSearch()}
                                placeholder="2025"
                                className="w-full bg-[#07090E] border border-white/[0.08] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none font-mono"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">
                                İçerik Türü
                            </label>
                            <select
                                value={tmdbType}
                                onChange={(e) => setTmdbType(e.target.value)}
                                className="w-full bg-[#07090E] border border-white/[0.08] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                            >
                                <option value="all">Tümü</option>
                                <option value="movie">Film</option>
                                <option value="tv">Dizi</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-gray-500">
                            * İpucu: IMDB ID (tt...) veya doğrudan TMDB ID yazarak kesin eşleştirme yapabilirsiniz.
                        </span>
                        <button
                            type="button"
                            onClick={() => handleTmdbSearch()}
                            disabled={isSearchingTmdb}
                            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Search className={`w-3.5 h-3.5 ${isSearchingTmdb ? 'animate-spin' : ''}`} />
                            <span>{isSearchingTmdb ? 'Aranıyor...' : 'TMDB Ara'}</span>
                        </button>
                    </div>
                </div>

                {/* Search Results List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[220px]">
                    {isSearchingTmdb ? (
                        <div className="py-12 text-center text-gray-400 space-y-2">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                            <p className="text-xs">TMDB veritabanında aranıyor...</p>
                        </div>
                    ) : tmdbResults.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 space-y-2">
                            <HelpCircle className="w-8 h-8 mx-auto text-gray-600" />
                            <p className="text-xs text-gray-400">Aramanıza uygun TMDB sonucu bulunamadı.</p>
                            <p className="text-[11px] text-gray-600">Başlığı basitleştirip tekrar arayabilir veya IMDB / TMDB ID girebilirsiniz.</p>
                        </div>
                    ) : (
                        tmdbResults.map((candidate) => (
                            <div
                                key={`${candidate.media_type}-${candidate.id}`}
                                className="p-3.5 rounded-xl bg-[#090C13] border border-white/[0.06] hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                            >
                                <div className="flex items-start gap-3.5 min-w-0">
                                    {candidate.poster_url ? (
                                        <img
                                            src={candidate.poster_url}
                                            alt={candidate.title}
                                            className="w-12 h-16 object-cover rounded-lg shadow-md border border-white/10 shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-gray-600">
                                            <Film className="w-5 h-5" />
                                        </div>
                                    )}

                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-semibold text-white text-sm group-hover:text-indigo-300 transition-colors">
                                                {candidate.title}
                                            </h4>
                                            {candidate.release_year && (
                                                <span className="px-1.5 py-0.2 rounded bg-white/5 text-gray-300 text-[10px] font-mono">
                                                    {candidate.release_year}
                                                </span>
                                            )}
                                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${candidate.media_type === 'tv'
                                                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                                : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                                                }`}>
                                                {candidate.media_type === 'tv' ? 'Dizi' : 'Film'}
                                            </span>
                                            {candidate.vote_average > 0 && (
                                                <span className="text-amber-400 text-xs font-mono flex items-center gap-0.5">
                                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                    {candidate.vote_average}
                                                </span>
                                            )}
                                        </div>

                                        {candidate.original_title && candidate.original_title !== candidate.title && (
                                            <div className="text-[11px] text-gray-400 italic">
                                                Orijinal: {candidate.original_title}
                                            </div>
                                        )}

                                        {candidate.overview && (
                                            <p className="text-[11px] text-gray-400 line-clamp-2 max-w-xl leading-relaxed">
                                                {candidate.overview}
                                            </p>
                                        )}

                                        <div className="text-[10px] font-mono text-gray-500">
                                            TMDB ID: #{candidate.id}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleConfirmTmdbMatch(candidate)}
                                    disabled={isMatchingTmdb}
                                    className="px-4 py-2 rounded-lg bg-[#00B074] hover:bg-[#009663] text-white text-xs font-semibold shrink-0 shadow-md shadow-[#00B074]/20 transition-all flex items-center gap-1.5 disabled:opacity-50 self-end sm:self-center"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Bunu Eşle</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-white/[0.06] bg-[#0A0D14]/70 flex items-center justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-medium text-xs transition-colors"
                    >
                        Kapat
                    </button>
                </div>

            </div>
        </div>
    );
}
