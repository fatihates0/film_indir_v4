import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Sparkles, Info } from 'lucide-react';

export default function TmdbScanAllModal({
    isOpen,
    onClose,
    storageBoxId = 'all',
    stats = {},
    showToast
}) {
    if (!isOpen) return null;

    const [tmdbScanScope, setTmdbScanScope] = useState('unmatched_and_review');
    const [isTmdbScanningAll, setIsTmdbScanningAll] = useState(false);

    const handleTriggerTmdbScanAll = () => {
        setIsTmdbScanningAll(true);

        router.post('/admin/medias/tmdb-scan-all', {
            storage_box_id: storageBoxId,
            scope: tmdbScanScope,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                setIsTmdbScanningAll(false);
                onClose();
                const msg = page.props?.flash?.success || 'TMDB tarama görevleri tmdb_scan kuyruğuna eklendi!';
                showToast(msg, 'success');
            },
            onError: (errors) => {
                setIsTmdbScanningAll(false);
                showToast(errors?.message || 'Tarama başlatılamadı.', 'error');
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0D111A] border border-indigo-500/20 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3 text-indigo-400">
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-base">Toplu TMDB Taraması Başlat</h3>
                        <p className="text-xs text-gray-400 mt-0.5">tmdb_scan kuyruğu ile arka planda çalışır</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-gray-300 block mb-1.5">
                            Taranacak İçerik Kapsamı:
                        </label>
                        <select
                            value={tmdbScanScope}
                            onChange={(e) => setTmdbScanScope(e.target.value)}
                            className="w-full bg-[#07090E] border border-white/[0.08] text-xs text-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="unmatched_and_review">
                                Sadece Eşleşmeyenler ve İnceleme Bekleyenler ({(stats?.tmdb_unmatched_count || 0) + (stats?.tmdb_review_count || 0)} Video)
                            </option>
                            <option value="unmatched_only">
                                Sadece Eşleşmeyenler ({stats?.tmdb_unmatched_count || 0} Video)
                            </option>
                            <option value="all">
                                Tüm Arşiv ({stats?.total_count || 0} Video - Yeniden Tara)
                            </option>
                        </select>
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                        <p className="font-medium text-indigo-200 flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>Kuyruk İşleyicisi (tmdb_scan)</span>
                        </p>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            Her video için bir TMDB eşleştirme görevi <strong className="text-indigo-200 font-mono">tmdb_scan</strong> kuyruğuna aktarılır. Yapım yılı farkı (±1 yıl) olan içerikler otomatik olarak "İnceleme" statüsüne alınacaktır.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                        onClick={onClose}
                        disabled={isTmdbScanningAll}
                        className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-medium text-xs transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleTriggerTmdbScanAll}
                        disabled={isTmdbScanningAll}
                        className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isTmdbScanningAll ? 'Kuyruğa Ekleniyor...' : 'Kuyruğu Başlat'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
