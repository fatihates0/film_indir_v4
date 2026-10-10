import React, { useState, useEffect } from 'react';
import { Search, X, Trash2, Sparkles, RefreshCw, Layers } from 'lucide-react';

export default function FilterBar({
    filters = {},
    storageBoxes = [],
    availableExtensions = [],
    stats = {},
    selectedIds = [],
    isScanning = false,
    scanningBoxId = 'all',
    setScanningBoxId,
    groupSeries = true,
    totalCount = 0,
    onApplyFilters,
    onResetFilters,
    onBulkDelete,
    onOpenTmdbScanModal,
    onOpenClearModal,
    onTriggerScan,
    onToggleGroupSeries
}) {
    // Local search state isolated so typing does not re-render the entire table
    const [searchInput, setSearchInput] = useState(filters.search || '');

    useEffect(() => {
        setSearchInput(filters.search || '');
    }, [filters.search]);

    // Debounced search
    useEffect(() => {
        if (searchInput === (filters.search || '')) return;

        const timer = setTimeout(() => {
            onApplyFilters({ search: searchInput });
        }, 250);

        return () => clearTimeout(timer);
    }, [searchInput, filters.search]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        onApplyFilters({ search: searchInput });
    };

    const handleClearSearch = () => {
        setSearchInput('');
        onApplyFilters({ search: '' });
    };

    const currentStorageBox = filters.storage_box_id || 'all';
    const currentCategory = filters.category || 'all';
    const currentQuality = filters.quality || 'all';
    const currentExtension = filters.extension || 'all';
    const currentTmdbStatus = filters.tmdb_status || 'all';
    const currentSort = `${filters.sort_by || 'created_at'}-${filters.sort_order || 'desc'}`;

    const hasActiveFilters = Boolean(
        searchInput ||
        currentStorageBox !== 'all' ||
        currentCategory !== 'all' ||
        currentQuality !== 'all' ||
        currentExtension !== 'all' ||
        currentTmdbStatus !== 'all'
    );

    return (
        <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                {/* Live Search */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Film adı, dizi adı veya dosya adı ile ara..."
                        className="w-full bg-[#07090E] border border-white/[0.08] focus:border-[#00B074] rounded-lg pl-9 pr-16 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    {searchInput && (
                        <button
                            type="button"
                            onClick={handleClearSearch}
                            className="absolute right-9 top-2.5 text-gray-500 hover:text-white"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        type="submit"
                        className="absolute right-2 top-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 font-medium"
                    >
                        Ara
                    </button>
                </form>

                {/* Actions Right */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={onBulkDelete}
                            className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Seçilenleri Sil ({selectedIds.length})</span>
                        </button>
                    )}

                    {/* TMDB Auto Scan Button */}
                    <button
                        onClick={onOpenTmdbScanModal}
                        className="px-3.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                        title="Tüm veya eşleşmeyen videoları tmdb_scan kuyruğu ile tara"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>TMDB Otomatik Tara</span>
                        {((stats?.tmdb_unmatched_count || 0) > 0 || (stats?.tmdb_review_count || 0) > 0) && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-500/30 text-indigo-200 font-mono">
                                {(stats?.tmdb_unmatched_count || 0) + (stats?.tmdb_review_count || 0)}
                            </span>
                        )}
                    </button>

                    {/* Target Storage Box Selector for Disk Scan */}
                    <div className="flex items-center gap-2">
                        <select
                            value={scanningBoxId}
                            onChange={(e) => setScanningBoxId(e.target.value)}
                            className="bg-[#07090E] border border-white/[0.08] text-xs text-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#00B074]"
                        >
                            <option value="all">Tüm Storage Box'lar</option>
                            {storageBoxes.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => onTriggerScan(scanningBoxId)}
                            disabled={isScanning}
                            className="px-4 py-2 rounded-lg bg-[#00B074] hover:bg-[#009663] text-white text-xs font-semibold shadow-md shadow-[#00B074]/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                            <span>{isScanning ? 'Taranıyor...' : 'Storage Box Tara'}</span>
                        </button>
                    </div>

                    {/* Clear All Archive Button */}
                    <button
                        onClick={onOpenClearModal}
                        disabled={stats?.total_count === 0}
                        className="px-3.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Tüm medya arşivi veritabanı indeksini temizle"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Tüm Arşivi Sil</span>
                    </button>
                </div>

            </div>

            {/* Filters Row */}
            <div className="pt-3 border-t border-white/[0.04] flex flex-wrap items-center gap-2.5 text-xs">

                {/* Storage Box Filter */}
                <select
                    value={currentStorageBox}
                    onChange={(e) => onApplyFilters({ storage_box_id: e.target.value })}
                    className="bg-[#07090E] border border-white/[0.08] text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00B074]"
                >
                    <option value="all">Depolama: Tümü</option>
                    {storageBoxes.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>

                {/* TMDB Status Filter */}
                <select
                    value={currentTmdbStatus}
                    onChange={(e) => onApplyFilters({ tmdb_status: e.target.value })}
                    className={`border rounded-lg px-2.5 py-1.5 focus:outline-none font-medium ${currentTmdbStatus === 'review'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-[#07090E] border-white/[0.08] text-gray-300 focus:border-indigo-500'
                        }`}
                >
                    <option value="all">TMDB: Tümü</option>
                    <option value="matched">✔ TMDB Eşleşti ({stats?.tmdb_matched_count || 0})</option>
                    <option value="review">⚠️ İnceleme Gerekiyor ({stats?.tmdb_review_count || 0})</option>
                    <option value="unmatched">✖ Eşleşmedi ({stats?.tmdb_unmatched_count || 0})</option>
                    <option value="pending">⏳ Kuyrukta ({stats?.tmdb_pending_count || 0})</option>
                </select>

                {/* Category Filter */}
                <select
                    value={currentCategory}
                    onChange={(e) => onApplyFilters({ category: e.target.value })}
                    className="bg-[#07090E] border border-white/[0.08] text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00B074]"
                >
                    <option value="all">Kategori: Tümü</option>
                    <option value="movie">Filmler</option>
                    <option value="series">Diziler</option>
                </select>

                {/* Quality Filter */}
                <select
                    value={currentQuality}
                    onChange={(e) => onApplyFilters({ quality: e.target.value })}
                    className="bg-[#07090E] border border-white/[0.08] text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00B074]"
                >
                    <option value="all">Kalite: Tümü</option>
                    <option value="2160p">4K UHD (2160p)</option>
                    <option value="1080p">1080p FHD</option>
                    <option value="m1080p">m1080p</option>
                    <option value="720p">720p HD</option>
                    <option value="m720p">m720p</option>
                </select>

                {/* Extension Filter */}
                <select
                    value={currentExtension}
                    onChange={(e) => onApplyFilters({ extension: e.target.value })}
                    className="bg-[#07090E] border border-white/[0.08] text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00B074]"
                >
                    <option value="all">Uzantı: Tümü</option>
                    {availableExtensions.map(ext => (
                        <option key={ext} value={ext}>.{ext}</option>
                    ))}
                </select>

                {/* Sort Filter */}
                <select
                    value={currentSort}
                    onChange={(e) => {
                        const [newSort, newOrder] = e.target.value.split('-');
                        onApplyFilters({ sort_by: newSort, sort_order: newOrder });
                    }}
                    className="bg-[#07090E] border border-white/[0.08] text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00B074]"
                >
                    <option value="created_at-desc">En Yeni Eklenenler</option>
                    <option value="size_bytes-desc">Boyut: En Büyük</option>
                    <option value="size_bytes-asc">Boyut: En Küçük</option>
                    <option value="clean_title-asc">Başlık (A-Z)</option>
                    <option value="year-desc">Yapım Yılı (En Yeni)</option>
                </select>

                {/* Grouping Toggle */}
                <button
                    type="button"
                    onClick={onToggleGroupSeries}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${groupSeries
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : 'bg-[#07090E] border-white/[0.08] text-gray-400 hover:text-white'
                        }`}
                    title="Aynı filme veya diziye ait video dosyalarını tek bir başlık altında topla ve sayfalamada 1 içerik olarak say"
                >
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>{groupSeries ? 'Gruplama: Açık' : 'Gruplama: Kapalı'}</span>
                </button>

                {/* Reset Button */}
                {hasActiveFilters && (
                    <button
                        onClick={onResetFilters}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors"
                    >
                        Filtreleri Temizle
                    </button>
                )}

                <span className="ml-auto text-gray-400 text-xs font-mono">
                    Toplam: <strong className="text-white">{totalCount}</strong> {groupSeries ? 'içerik' : 'dosya'}
                </span>
            </div>
        </div>
    );
}
