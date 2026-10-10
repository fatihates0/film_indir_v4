import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';
import AdminLayout from '../../../Components/AdminLayout';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

import StatsCards from './Components/StatsCards';
import FilterBar from './Components/FilterBar';
import MediaTable from './Components/MediaTable';
import { processMediaItems } from './Components/mediaUtils';

import TmdbMatchModal from './Components/Modals/TmdbMatchModal';
import TmdbScanAllModal from './Components/Modals/TmdbScanAllModal';
import DeleteMediaModal from './Components/Modals/DeleteMediaModal';
import ClearArchiveModal from './Components/Modals/ClearArchiveModal';

export default function MediasIndex({
    medias,
    stats,
    storageBoxes = [],
    availableExtensions = [],
    filters = {}
}) {
    // Top-level notification & copied path state
    const [notification, setNotification] = useState(null);
    const [copiedPath, setCopiedPath] = useState(null);

    // Scan & Action states
    const [isScanning, setIsScanning] = useState(false);
    const [scanningBoxId, setScanningBoxId] = useState('all');
    const [selectedIds, setSelectedIds] = useState([]);

    // Series Grouping State
    const [groupSeries, setGroupSeries] = useState(filters?.grouped !== '0');

    // Modals state
    const [tmdbModalMedia, setTmdbModalMedia] = useState(null);
    const [tmdbModalMediaIds, setTmdbModalMediaIds] = useState([]);
    const [showTmdbScanModal, setShowTmdbScanModal] = useState(false);
    const [deletingMedia, setDeletingMedia] = useState(null);
    const [showClearModal, setShowClearModal] = useState(false);

    useEffect(() => {
        setGroupSeries(filters?.grouped !== '0');
    }, [filters?.grouped]);

    const showToast = useCallback((message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4500);
    }, []);

    // Memoize processed items for 60fps rendering
    const processedItems = useMemo(() => {
        return processMediaItems(medias, groupSeries);
    }, [medias, groupSeries]);

    // Apply Filters via Inertia Visit
    const applyFilters = useCallback((overrides = {}) => {
        const query = {
            search: filters.search || '',
            storage_box_id: filters.storage_box_id || 'all',
            category: filters.category || 'all',
            quality: filters.quality || 'all',
            extension: filters.extension || 'all',
            tmdb_status: filters.tmdb_status || 'all',
            sort_by: filters.sort_by || 'created_at',
            sort_order: filters.sort_order || 'desc',
            per_page: filters.per_page || 25,
            grouped: groupSeries ? '1' : '0',
            page: 1,
            ...overrides,
        };

        // Clean default values
        Object.keys(query).forEach(key => {
            if (query[key] === 'all' || query[key] === '' || query[key] === null) {
                delete query[key];
            }
        });

        router.get('/admin/medias', query, {
            preserveState: true,
            preserveScroll: true,
        });
    }, [filters, groupSeries]);

    const handleResetFilters = useCallback(() => {
        router.get('/admin/medias');
    }, []);

    const handleToggleGroupSeries = useCallback(() => {
        const nextGrouped = !groupSeries;
        setGroupSeries(nextGrouped);
        applyFilters({ grouped: nextGrouped ? '1' : '0' });
    }, [groupSeries, applyFilters]);

    // Trigger Scan via disk_scan queue
    const handleTriggerScan = useCallback((targetBoxId = 'all') => {
        setIsScanning(true);
        setScanningBoxId(targetBoxId);

        router.post('/admin/medias/scan', { storage_box_id: targetBoxId }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                setIsScanning(false);
                const msg = page.props?.flash?.success || 'Tarama görevi "disk_scan" kuyruğuna eklendi!';
                showToast(msg, 'success');
            },
            onError: () => {
                setIsScanning(false);
                showToast('Tarama başlatılırken bir hata oluştu.', 'error');
            },
        });
    }, [showToast]);

    // Copy file path to clipboard
    const handleCopyPath = useCallback((path) => {
        navigator.clipboard.writeText(path);
        setCopiedPath(path);
        setTimeout(() => setCopiedPath(null), 2000);
    }, []);

    // Checkbox handlers
    const handleSelectAll = useCallback((e) => {
        if (e.target.checked) {
            const all = [];
            medias.data?.forEach(entry => {
                if (entry.allIds && Array.isArray(entry.allIds)) {
                    all.push(...entry.allIds);
                } else if (entry.items && Array.isArray(entry.items)) {
                    entry.items.forEach(it => { if (it.id) all.push(it.id); });
                } else if (entry.item?.id) {
                    all.push(entry.item.id);
                } else if (entry.id) {
                    all.push(entry.id);
                }
            });
            setSelectedIds(Array.from(new Set(all)));
        } else {
            setSelectedIds([]);
        }
    }, [medias]);

    const handleToggleSelect = useCallback((id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    }, []);

    const handleToggleGroupSelect = useCallback((groupAllIds) => {
        const allSelected = groupAllIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !groupAllIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...groupAllIds])));
        }
    }, [selectedIds]);

    // Bulk Delete
    const handleBulkDelete = useCallback(() => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Seçilen ${selectedIds.length} adet video kaydını veritabanı indeksinden kaldırmak istediğinize emin misiniz? (Storage box'taki orijinal dosyalar silinmez)`)) {
            return;
        }

        router.post('/admin/medias/bulk-delete', { ids: selectedIds }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setSelectedIds([]);
                showToast('Seçilen videolar veritabanından kaldırıldı.', 'success');
            },
        });
    }, [selectedIds, showToast]);

    // Open TMDB Match Modal
    const handleOpenTmdbModal = useCallback((media, groupAllIds = null) => {
        setTmdbModalMedia(media);
        setTmdbModalMediaIds(groupAllIds || (media ? [media.id] : []));
    }, []);

    const handlePerPageChange = useCallback((newPerPage) => {
        applyFilters({ per_page: newPerPage });
    }, [applyFilters]);

    return (
        <AdminLayout
            title="Medya Kataloğu & TMDB"
            subtitle="Depolama sunucularındaki video dosyaları, otomatik TMDB giydirme ve yapım yılı kontrolü"
            activeTab="medias"
            statsSummary={{ total_medias: stats?.total_count || 0 }}
        >
            <div className="space-y-6">

                {/* TOAST NOTIFICATION */}
                {notification && (
                    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-medium backdrop-blur-md ${notification.type === 'error'
                            ? 'bg-rose-950/80 text-rose-200 border-rose-500/30 shadow-rose-950/50'
                            : 'bg-[#00B074]/15 text-emerald-200 border-[#00B074]/30 shadow-[#00B074]/10'
                            }`}>
                            {notification.type === 'error' ? (
                                <AlertTriangle className="w-4 h-4 text-rose-400" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 text-[#00B074]" />
                            )}
                            <span>{notification.message}</span>
                            <button
                                onClick={() => setNotification(null)}
                                className="ml-2 hover:opacity-75"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* TMDB NOT CONFIGURED BANNER */}
                {!stats?.tmdb_is_configured && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                        <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold text-white">TMDB API Yapılandırması Eksik: </span>
                                <span>Otomatik film/dizi afiş ve içerik eşleştirmesini kullanabilmek için lütfen </span>
                                <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono">.env</code>
                                <span> dosyanıza </span>
                                <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono">TMDB_API_KEY</code>
                                <span> veya </span>
                                <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono">TMDB_READ_ACCESS_TOKEN</code>
                                <span> ekleyiniz.</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* MAIN CONTENT AREA */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                    {/* TOP STATS CARDS GRID */}
                    <StatsCards stats={stats} storageBoxes={storageBoxes} />

                    {/* ACTION & SCAN CONTROLS BAR */}
                    <FilterBar
                        filters={filters}
                        storageBoxes={storageBoxes}
                        availableExtensions={availableExtensions}
                        stats={stats}
                        selectedIds={selectedIds}
                        isScanning={isScanning}
                        scanningBoxId={scanningBoxId}
                        setScanningBoxId={setScanningBoxId}
                        groupSeries={groupSeries}
                        totalCount={medias.total || 0}
                        onApplyFilters={applyFilters}
                        onResetFilters={handleResetFilters}
                        onBulkDelete={handleBulkDelete}
                        onOpenTmdbScanModal={() => setShowTmdbScanModal(true)}
                        onOpenClearModal={() => setShowClearModal(true)}
                        onTriggerScan={handleTriggerScan}
                        onToggleGroupSeries={handleToggleGroupSeries}
                    />

                    {/* MEDIA TABLE */}
                    <MediaTable
                        medias={medias}
                        processedItems={processedItems}
                        selectedIds={selectedIds}
                        groupSeries={groupSeries}
                        perPage={filters.per_page || 25}
                        copiedPath={copiedPath}
                        onSelectAll={handleSelectAll}
                        onToggleSelect={handleToggleSelect}
                        onToggleGroupSelect={handleToggleGroupSelect}
                        onCopyPath={handleCopyPath}
                        onOpenTmdbModal={handleOpenTmdbModal}
                        onSetDeletingMedia={setDeletingMedia}
                        onTriggerScan={handleTriggerScan}
                        onPerPageChange={handlePerPageChange}
                    />

                </div>

                {/* CONDITIONAL MODALS */}
                {tmdbModalMedia && (
                    <TmdbMatchModal
                        media={tmdbModalMedia}
                        mediaIds={tmdbModalMediaIds}
                        onClose={() => {
                            setTmdbModalMedia(null);
                            setTmdbModalMediaIds([]);
                        }}
                        showToast={showToast}
                    />
                )}

                {showTmdbScanModal && (
                    <TmdbScanAllModal
                        isOpen={showTmdbScanModal}
                        onClose={() => setShowTmdbScanModal(false)}
                        storageBoxId={filters.storage_box_id || 'all'}
                        stats={stats}
                        showToast={showToast}
                    />
                )}

                {deletingMedia && (
                    <DeleteMediaModal
                        media={deletingMedia}
                        onClose={() => setDeletingMedia(null)}
                        showToast={showToast}
                    />
                )}

                {showClearModal && (
                    <ClearArchiveModal
                        isOpen={showClearModal}
                        onClose={() => setShowClearModal(false)}
                        storageBoxes={storageBoxes}
                        stats={stats}
                        showToast={showToast}
                        onCleared={() => setSelectedIds([])}
                    />
                )}

            </div>
        </AdminLayout>
    );
}
