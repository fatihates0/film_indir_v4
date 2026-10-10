import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    Film,
    Tv,
    HardDrive,
    Trash2,
    Copy,
    Check,
    Sparkles,
    FileVideo,
    Star,
    ChevronDown,
    ChevronRight,
    RefreshCw,
    AlertTriangle
} from 'lucide-react';
import {
    formatBytes,
    getEpisodeBadge,
    getPropertyBadgeClass
} from './mediaUtils';

export default function MediaTable({
    medias,
    processedItems = [],
    selectedIds = [],
    groupSeries = true,
    perPage = 25,
    copiedPath = null,
    onSelectAll,
    onToggleSelect,
    onToggleGroupSelect,
    onCopyPath,
    onOpenTmdbModal,
    onSetDeletingMedia,
    onTriggerScan,
    onPerPageChange
}) {
    const [expandedGroups, setExpandedGroups] = useState({});

    const toggleGroupExpand = (groupKey) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };

    const isAllSelected = (() => {
        const all = [];
        medias.data?.forEach(entry => {
            if (entry.allIds && Array.isArray(entry.allIds)) all.push(...entry.allIds);
            else if (entry.items && Array.isArray(entry.items)) entry.items.forEach(it => { if (it.id) all.push(it.id); });
            else if (entry.item?.id) all.push(entry.item.id);
            else if (entry.id) all.push(entry.id);
        });
        return all.length > 0 && all.every(id => selectedIds.includes(id));
    })();

    return (
        <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-white/[0.06] bg-[#07090E]/60 text-gray-400">
                            <th className="py-3 px-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={onSelectAll}
                                    className="w-3.5 h-3.5 rounded bg-[#07090E] border-white/20 text-[#00B074] focus:ring-0"
                                />
                            </th>
                            <th className="py-3 px-3 font-semibold text-center w-14">Afiş</th>
                            <th className="py-3 px-4 font-semibold">Video / Dosya Adı</th>
                            <th className="py-3 px-4 font-semibold whitespace-nowrap">Dosya Boyutu</th>
                            <th className="py-3 px-4 font-semibold">Özellikler</th>
                            <th className="py-3 px-4 font-semibold text-right w-24">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {medias.data.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-gray-400">
                                    <div className="max-w-sm mx-auto space-y-3">
                                        <FileVideo className="w-10 h-10 text-gray-600 mx-auto" />
                                        <div className="font-semibold text-white">İndekslenmiş Video Bulunamadı</div>
                                        <p className="text-xs text-gray-500">
                                            Kriterlerinize uygun video bulunamadı veya henüz tarama yapılmadı. Yukarıdaki "Storage Box Tara" butonuna tıklayarak tarama başlatabilirsiniz.
                                        </p>
                                        <button
                                            onClick={() => onTriggerScan('all')}
                                            className="px-4 py-2 rounded-lg bg-[#00B074] hover:bg-[#009663] text-white text-xs font-semibold"
                                        >
                                            Tüm Depolama Birimlerini Şimdi Tara
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            processedItems.map((entry) => {
                                if (entry.type === 'single') {
                                    const item = entry.item;
                                    return (
                                        <tr
                                            key={item.id}
                                            className={`hover:bg-white/[0.02] transition-colors ${selectedIds.includes(item.id) ? 'bg-emerald-500/[0.03]' : ''
                                                } ${item.tmdb_match_status === 'review' ? 'bg-amber-500/[0.02]' : ''}`}
                                        >
                                            <td className="py-3 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => onToggleSelect(item.id)}
                                                    className="w-3.5 h-3.5 rounded bg-[#07090E] border-white/20 text-[#00B074] focus:ring-0"
                                                />
                                            </td>

                                            {/* Poster Column */}
                                            <td className="py-3 px-3 w-14 text-center">
                                                {item.tmdb_title ? (
                                                    item.tmdb_title.poster_url ? (
                                                        <img
                                                            src={item.tmdb_title.poster_url}
                                                            alt={item.tmdb_title.title}
                                                            className="w-8 h-12 object-cover rounded shadow border border-white/10 shrink-0 mx-auto"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-gray-600 mx-auto">
                                                            <Film className="w-4 h-4" />
                                                        </div>
                                                    )
                                                ) : item.tmdb_match_status === 'pending' ? (
                                                    <div
                                                        className="w-8 h-12 rounded bg-gradient-to-b from-sky-500/10 via-[#0E131F] to-[#07090E] border border-sky-500/30 flex flex-col items-center justify-between shrink-0 shadow-sm relative overflow-hidden mx-auto"
                                                        title="TMDB tarama kuyruğunda"
                                                    >
                                                        <div className="flex-1 flex items-center justify-center pt-1">
                                                            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                                                        </div>
                                                        <div className="w-full bg-sky-500/20 text-sky-300 text-[6.5px] font-extrabold tracking-tighter text-center py-0.5 border-t border-sky-500/30 uppercase leading-none">
                                                            TARANIYOR
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => onOpenTmdbModal(item)}
                                                        className="w-8 h-12 rounded bg-gradient-to-b from-amber-500/10 via-[#0E131F] to-[#07090E] border border-amber-500/30 flex flex-col items-center justify-between shrink-0 shadow-sm relative overflow-hidden group/poster cursor-pointer hover:border-amber-400 hover:scale-105 transition-all mx-auto"
                                                        title="TMDB Eşleştirmesi yapmak için tıklayın"
                                                    >
                                                        <div className="flex-1 flex items-center justify-center pt-1">
                                                            <Film className="w-3.5 h-3.5 text-amber-400/90 group-hover/poster:text-amber-300 transition-colors" />
                                                        </div>
                                                        <div className="w-full bg-amber-500/20 text-amber-300 text-[6.5px] font-extrabold tracking-tighter text-center py-0.5 border-t border-amber-500/30 group-hover/poster:bg-amber-500/30 transition-colors uppercase leading-none">
                                                            BEKLENİYOR
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Title & Filename Column */}
                                            <td className="py-3 px-4 max-w-md">
                                                <div className="space-y-1">
                                                    {item.tmdb_title ? (
                                                        <>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-semibold text-white truncate max-w-xs" title={item.tmdb_title.title_tr || item.tmdb_title.title}>
                                                                    {item.tmdb_title.title_tr || item.tmdb_title.title}
                                                                </span>
                                                                {item.tmdb_title.release_year && (
                                                                    <span className="px-1.5 py-0.2 rounded bg-white/5 text-gray-400 text-[10px] font-mono shrink-0">
                                                                        {item.tmdb_title.release_year}
                                                                    </span>
                                                                )}
                                                                {item.tmdb_title.vote_average > 0 && (
                                                                    <span className="text-amber-400 flex items-center gap-0.5 text-[10px] font-mono">
                                                                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                                                        {item.tmdb_title.vote_average}
                                                                    </span>
                                                                )}
                                                                {item.tmdb_match_status === 'matched' && (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                                                        <Check className="w-2.5 h-2.5" />
                                                                        <span>Eşleşti</span>
                                                                    </span>
                                                                )}
                                                                {item.tmdb_match_status === 'review' && (
                                                                    <span
                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 cursor-help"
                                                                        title={item.tmdb_match_notes || 'İnceleme gerekiyor'}
                                                                    >
                                                                        <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                                                        <span>İnceleme ({item.tmdb_title.release_year !== item.year ? '±1 Yıl' : 'Kontrol'})</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.tmdb_title.title_en && item.tmdb_title.title_en !== (item.tmdb_title.title_tr || item.tmdb_title.title) && (
                                                                <div className="text-[10px] text-gray-400 truncate max-w-xs" title={`İngilizce: ${item.tmdb_title.title_en}`}>
                                                                    EN: {item.tmdb_title.title_en}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-white truncate max-w-[200px]" title={item.clean_title}>
                                                                {item.clean_title}
                                                            </span>
                                                            {item.year && (
                                                                <span className="px-1.5 py-0.2 rounded bg-white/5 text-gray-400 text-[10px] font-mono shrink-0">
                                                                    {item.year}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="text-[11px] font-mono text-gray-400 truncate" title={item.name}>
                                                        {item.name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-mono pt-0.5 group/path" title={`${item.storage_box?.name ? item.storage_box.name + ' · ' : ''}${item.directory || '/'}`}>
                                                        <HardDrive className="w-3 h-3 text-emerald-400/80 shrink-0" />
                                                        {item.storage_box && (
                                                            <>
                                                                <span className="text-emerald-400 font-medium">{item.storage_box.name}</span>
                                                                <span className="text-gray-500">·</span>
                                                            </>
                                                        )}
                                                        <span className="text-gray-400 truncate max-w-[200px]">{item.directory || '/'}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => onCopyPath(item.path)}
                                                            className="opacity-0 group-hover/path:opacity-100 transition-opacity text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10"
                                                            title="Tam dosya yolunu kopyala"
                                                        >
                                                            {copiedPath === item.path ? (
                                                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                                            ) : (
                                                                <Copy className="w-2.5 h-2.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* File Size */}
                                            <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                                                <span className="font-semibold text-emerald-400">
                                                    {item.formatted_size}
                                                </span>
                                            </td>

                                            {/* Properties Badges */}
                                            <td className="py-3 px-4 min-w-[180px] max-w-[280px]">
                                                <div className="flex flex-wrap items-center gap-1">
                                                    {item.properties && item.properties.length > 0 ? (
                                                        item.properties.map((prop, idx) => (
                                                            <span
                                                                key={idx}
                                                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border font-mono tracking-tight ${getPropertyBadgeClass(prop)}`}
                                                                title={`Özellik: ${prop}`}
                                                            >
                                                                {prop}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-500 text-[10px] font-mono">-</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => onOpenTmdbModal(item)}
                                                        className={`p-1.5 rounded-lg transition-all ${item.tmdb_title
                                                            ? 'text-[#00B074] hover:bg-[#00B074]/15 bg-[#00B074]/10'
                                                            : item.tmdb_match_status === 'review'
                                                                ? 'text-amber-400 hover:bg-amber-500/15 bg-amber-500/10 animate-pulse'
                                                                : 'text-indigo-400 hover:bg-indigo-500/15 bg-indigo-500/10'
                                                            }`}
                                                        title={item.tmdb_title ? `TMDB Eşleşmesi: ${item.tmdb_title.title} (Düzenle)` : "TMDB'de Ara ve Eşleştir"}
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onSetDeletingMedia(item)}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                        title="İndeksten Kaldır"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                if (entry.type === 'movie_group') {
                                    const group = entry;
                                    const isExpanded = !!expandedGroups[group.key];
                                    const isGroupAllSelected = group.allIds.length > 0 && group.allIds.every(id => selectedIds.includes(id));
                                    const title = group.tmdb_title?.title_tr || group.tmdb_title?.title || group.clean_title;

                                    return (
                                        <React.Fragment key={group.key}>
                                            <tr className={`border-b border-white/[0.06] transition-colors ${isExpanded ? 'bg-indigo-950/20' : 'bg-indigo-500/[0.02] hover:bg-indigo-500/[0.05]'
                                                }`}>
                                                <td className="py-3.5 px-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={isGroupAllSelected}
                                                        onChange={() => onToggleGroupSelect(group.allIds)}
                                                        className="w-3.5 h-3.5 rounded bg-[#07090E] border-white/20 text-indigo-500 focus:ring-0"
                                                    />
                                                </td>

                                                {/* Movie Poster */}
                                                <td className="py-3.5 px-3 w-14 text-center cursor-pointer" onClick={() => toggleGroupExpand(group.key)}>
                                                    {group.tmdb_title?.poster_url ? (
                                                        <img
                                                            src={group.tmdb_title.poster_url}
                                                            alt={title}
                                                            className="w-9 h-13 object-cover rounded-lg shadow-md border border-indigo-500/30 shrink-0 mx-auto group-hover:scale-105 transition-all"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-13 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 mx-auto">
                                                            <Film className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Movie Title & Badges */}
                                                <td className="py-3.5 px-4 max-w-md">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold text-[10px] flex items-center gap-1 border border-indigo-500/30">
                                                                <Film className="w-3 h-3 text-indigo-400" />
                                                                <span>{group.items.length} Versiyon / Dosya</span>
                                                            </span>

                                                            <h3
                                                                onClick={() => toggleGroupExpand(group.key)}
                                                                className="font-bold text-white text-sm hover:text-indigo-300 cursor-pointer transition-colors"
                                                                title={title}
                                                            >
                                                                {title}
                                                            </h3>

                                                            {group.year && (
                                                                <span className="px-1.5 py-0.2 rounded bg-white/5 text-gray-400 text-[10px] font-mono shrink-0">
                                                                    {group.year}
                                                                </span>
                                                            )}

                                                            {group.tmdb_title?.vote_average > 0 && (
                                                                <span className="text-amber-400 flex items-center gap-0.5 text-[10px] font-mono">
                                                                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                                                    {group.tmdb_title.vote_average}
                                                                </span>
                                                            )}

                                                            {group.tmdb_match_status === 'matched' && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                                                    <Check className="w-2.5 h-2.5" />
                                                                    <span>TMDB Eşleşti</span>
                                                                </span>
                                                            )}

                                                            {group.tmdb_match_status === 'review' && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                                                    <span>İnceleme</span>
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="text-[11px] text-gray-400 flex items-center gap-2 font-mono">
                                                            <HardDrive className="w-3 h-3 text-indigo-400 shrink-0" />
                                                            <span className="text-gray-300 font-medium">
                                                                {group.representativeItem?.storage_box?.name || 'Storage Box'}
                                                            </span>
                                                            <span>·</span>
                                                            <span className="truncate max-w-xs">{group.representativeItem?.directory || '/Filmler'}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Total Group Size */}
                                                <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                                                    <div className="space-y-0.5">
                                                        <span className="font-bold text-indigo-300 text-sm">
                                                            {formatBytes(group.totalSizeBytes)}
                                                        </span>
                                                        <div className="text-[10px] text-gray-500 font-mono">
                                                            Toplam Boyut ({group.items.length} Versiyon)
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Combined Group Properties */}
                                                <td className="py-3.5 px-4 min-w-[180px] max-w-[280px]">
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        {group.allProperties && group.allProperties.length > 0 ? (
                                                            group.allProperties.map((prop, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border font-mono tracking-tight ${getPropertyBadgeClass(prop)}`}
                                                                >
                                                                    {prop}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-500 text-[10px] font-mono">-</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleGroupExpand(group.key)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm ${isExpanded
                                                                ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                                                                : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30'
                                                                }`}
                                                        >
                                                            {isExpanded ? (
                                                                <>
                                                                    <ChevronDown className="w-4 h-4" />
                                                                    <span>Versiyonları Gizle</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronRight className="w-4 h-4" />
                                                                    <span>{group.items.length} Versiyonu Göster</span>
                                                                </>
                                                            )}
                                                        </button>

                                                        <button
                                                            onClick={() => onOpenTmdbModal(group.representativeItem, group.allIds)}
                                                            className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/15 bg-indigo-500/10 transition-colors"
                                                            title="TMDB Filmini Düzenle / Gruba Uygula"
                                                        >
                                                            <Sparkles className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* EXPANDED MOVIE VERSIONS SUB-TABLE DRAWER */}
                                            {isExpanded && (
                                                <tr className="bg-[#05070B]/80">
                                                    <td colSpan={6} className="p-3 pl-8 sm:pl-12">
                                                        <div className="bg-[#090C13] border border-indigo-500/20 rounded-xl p-3 space-y-2 shadow-2xl">
                                                            <div className="flex items-center justify-between px-2 pb-2 border-b border-white/[0.06] text-xs">
                                                                <div className="flex items-center gap-2 font-semibold text-indigo-300">
                                                                    <Film className="w-4 h-4 text-indigo-400" />
                                                                    <span>"{title}" — İndekslenmiş Film Dosyaları / Versiyonları ({group.items.length} Adet)</span>
                                                                </div>
                                                                <div className="text-[11px] text-gray-400 font-mono">
                                                                    Toplam: <strong className="text-white">{formatBytes(group.totalSizeBytes)}</strong>
                                                                </div>
                                                            </div>

                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left text-xs">
                                                                    <thead>
                                                                        <tr className="text-gray-500 text-[10px] uppercase font-semibold border-b border-white/[0.04]">
                                                                            <th className="py-2 px-2 w-8">#</th>
                                                                            <th className="py-2 px-3">Video / Dosya Adı</th>
                                                                            <th className="py-2 px-3 whitespace-nowrap">Storage Box & Konum</th>
                                                                            <th className="py-2 px-3 whitespace-nowrap">Boyut</th>
                                                                            <th className="py-2 px-3">Özellikler</th>
                                                                            <th className="py-2 px-3 text-right w-20">İşlem</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-white/[0.03]">
                                                                        {group.items.map((mvItem, mvIdx) => (
                                                                            <tr key={mvItem.id} className="hover:bg-white/[0.02] transition-colors">
                                                                                <td className="py-2 px-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedIds.includes(mvItem.id)}
                                                                                        onChange={() => onToggleSelect(mvItem.id)}
                                                                                        className="w-3 h-3 rounded bg-[#07090E] border-white/20 text-indigo-500 focus:ring-0"
                                                                                    />
                                                                                </td>

                                                                                <td className="py-2 px-3">
                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                        {mvItem.quality ? (
                                                                                            <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-mono font-bold text-[10px] border border-indigo-500/30 shrink-0">
                                                                                                {mvItem.quality}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-mono text-[10px] shrink-0">
                                                                                                v{mvIdx + 1}
                                                                                            </span>
                                                                                        )}
                                                                                        <span className="font-mono text-gray-200 text-[11px] truncate max-w-md" title={mvItem.name}>
                                                                                            {mvItem.name}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>

                                                                                <td className="py-2 px-3 whitespace-nowrap">
                                                                                    <div className="flex items-center gap-1.5 text-[10px] font-mono group/subpath">
                                                                                        <HardDrive className="w-3 h-3 text-emerald-400 shrink-0" />
                                                                                        <span className="text-emerald-400 font-medium">{mvItem.storage_box?.name || 'Storage Box'}</span>
                                                                                        <span className="text-gray-500">·</span>
                                                                                        <span className="text-gray-400 truncate max-w-[150px]">{mvItem.directory || '/'}</span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => onCopyPath(mvItem.path)}
                                                                                            className="opacity-0 group-hover/subpath:opacity-100 transition-opacity text-gray-400 hover:text-white p-0.5 rounded"
                                                                                            title="Tam dosya yolunu kopyala"
                                                                                        >
                                                                                            {copiedPath === mvItem.path ? (
                                                                                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                                                                            ) : (
                                                                                                <Copy className="w-2.5 h-2.5" />
                                                                                            )}
                                                                                        </button>
                                                                                    </div>
                                                                                </td>

                                                                                <td className="py-2 px-3 font-mono text-emerald-400 font-semibold text-xs whitespace-nowrap">
                                                                                    {mvItem.formatted_size}
                                                                                </td>

                                                                                <td className="py-2 px-3">
                                                                                    <div className="flex flex-wrap items-center gap-1">
                                                                                        {mvItem.properties && mvItem.properties.length > 0 ? (
                                                                                            mvItem.properties.map((prop, pIdx) => (
                                                                                                <span
                                                                                                    key={pIdx}
                                                                                                    className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border font-mono ${getPropertyBadgeClass(prop)}`}
                                                                                                >
                                                                                                    {prop}
                                                                                                </span>
                                                                                            ))
                                                                                        ) : (
                                                                                            <span className="text-gray-600 text-[10px] font-mono">-</span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>

                                                                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                                                                    <div className="flex items-center justify-end gap-1">
                                                                                        <button
                                                                                            onClick={() => onOpenTmdbModal(mvItem)}
                                                                                            className="p-1 rounded text-indigo-400 hover:bg-indigo-500/15"
                                                                                            title="Versiyon Eşleştirmesi"
                                                                                        >
                                                                                            <Sparkles className="w-3 h-3" />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => onSetDeletingMedia(mvItem)}
                                                                                            className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                                                                                            title="Dosyayı Sil"
                                                                                        >
                                                                                            <Trash2 className="w-3 h-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                }

                                // SERIES GROUP MASTER ROW & COLLAPSIBLE EPISODES ACCORDION
                                const group = entry;
                                const isExpanded = !!expandedGroups[group.key];
                                const isGroupAllSelected = group.allIds.length > 0 && group.allIds.every(id => selectedIds.includes(id));
                                const title = group.tmdb_title?.title_tr || group.tmdb_title?.title || group.clean_title;

                                return (
                                    <React.Fragment key={group.key}>
                                        <tr className={`border-b border-white/[0.06] transition-colors ${isExpanded ? 'bg-purple-950/20' : 'bg-purple-500/[0.02] hover:bg-purple-500/[0.05]'
                                            }`}>
                                            <td className="py-3.5 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isGroupAllSelected}
                                                    onChange={() => onToggleGroupSelect(group.allIds)}
                                                    className="w-3.5 h-3.5 rounded bg-[#07090E] border-white/20 text-purple-500 focus:ring-0"
                                                />
                                            </td>

                                            {/* Series Poster */}
                                            <td className="py-3.5 px-3 w-14 text-center cursor-pointer" onClick={() => toggleGroupExpand(group.key)}>
                                                {group.tmdb_title?.poster_url ? (
                                                    <img
                                                        src={group.tmdb_title.poster_url}
                                                        alt={title}
                                                        className="w-9 h-13 object-cover rounded-lg shadow-md border border-purple-500/30 shrink-0 mx-auto group-hover:scale-105 transition-all"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-13 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400 mx-auto">
                                                        <Tv className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </td>

                                            {/* Series Title & Badges */}
                                            <td className="py-3.5 px-4 max-w-md">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-semibold text-[10px] flex items-center gap-1 border border-purple-500/30">
                                                            <Tv className="w-3 h-3 text-purple-400" />
                                                            <span>{group.items.length} Bölüm Dosyası</span>
                                                        </span>

                                                        <h3
                                                            onClick={() => toggleGroupExpand(group.key)}
                                                            className="font-bold text-white text-sm hover:text-purple-300 cursor-pointer transition-colors"
                                                            title={title}
                                                        >
                                                            {title}
                                                        </h3>

                                                        {group.year && (
                                                            <span className="px-1.5 py-0.2 rounded bg-white/5 text-gray-400 text-[10px] font-mono shrink-0">
                                                                {group.year}
                                                            </span>
                                                        )}

                                                        {group.tmdb_title?.vote_average > 0 && (
                                                            <span className="text-amber-400 flex items-center gap-0.5 text-[10px] font-mono">
                                                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                                                {group.tmdb_title.vote_average}
                                                            </span>
                                                        )}

                                                        {group.tmdb_match_status === 'matched' && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                                                <Check className="w-2.5 h-2.5" />
                                                                <span>TMDB Eşleşti</span>
                                                            </span>
                                                        )}

                                                        {group.tmdb_match_status === 'review' && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                                <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                                                <span>İnceleme</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="text-[11px] text-gray-400 flex items-center gap-2 font-mono">
                                                        <HardDrive className="w-3 h-3 text-purple-400 shrink-0" />
                                                        <span className="text-gray-300 font-medium">
                                                            {group.representativeItem?.storage_box?.name || 'Storage Box'}
                                                        </span>
                                                        <span>·</span>
                                                        <span className="truncate max-w-xs">{group.representativeItem?.directory || '/Diziler'}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Total Group Size */}
                                            <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                                                <div className="space-y-0.5">
                                                    <span className="font-bold text-purple-300 text-sm">
                                                        {formatBytes(group.totalSizeBytes)}
                                                    </span>
                                                    <div className="text-[10px] text-gray-500 font-mono">
                                                        Toplam Boyut ({group.items.length} Dosya)
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Combined Group Properties */}
                                            <td className="py-3.5 px-4 min-w-[180px] max-w-[280px]">
                                                <div className="flex flex-wrap items-center gap-1">
                                                    {group.allProperties && group.allProperties.length > 0 ? (
                                                        group.allProperties.map((prop, idx) => (
                                                            <span
                                                                key={idx}
                                                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border font-mono tracking-tight ${getPropertyBadgeClass(prop)}`}
                                                            >
                                                                {prop}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-500 text-[10px] font-mono">-</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleGroupExpand(group.key)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm ${isExpanded
                                                            ? 'bg-purple-500 text-white shadow-purple-500/20'
                                                            : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30'
                                                            }`}
                                                    >
                                                        {isExpanded ? (
                                                            <>
                                                                <ChevronDown className="w-4 h-4" />
                                                                <span>Bölümleri Gizle</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronRight className="w-4 h-4" />
                                                                <span>{group.items.length} Bölümü Göster</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={() => onOpenTmdbModal(group.representativeItem, group.allIds)}
                                                        className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/15 bg-indigo-500/10 transition-colors"
                                                        title="TMDB Dizisini Düzenle / Gruba Uygula"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* EXPANDED EPISODES SUB-TABLE DRAWER */}
                                        {isExpanded && (
                                            <tr className="bg-[#05070B]/80">
                                                <td colSpan={6} className="p-3 pl-8 sm:pl-12">
                                                    <div className="bg-[#090C13] border border-purple-500/20 rounded-xl p-3 space-y-2 shadow-2xl">
                                                        <div className="flex items-center justify-between px-2 pb-2 border-b border-white/[0.06] text-xs">
                                                            <div className="flex items-center gap-2 font-semibold text-purple-300">
                                                                <Tv className="w-4 h-4 text-purple-400" />
                                                                <span>"{title}" — İndekslenmiş Bölüm Dosyaları ({group.items.length} Adet)</span>
                                                            </div>
                                                            <div className="text-[11px] text-gray-400 font-mono">
                                                                Toplam: <strong className="text-white">{formatBytes(group.totalSizeBytes)}</strong>
                                                            </div>
                                                        </div>

                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-xs">
                                                                <thead>
                                                                    <tr className="text-gray-500 text-[10px] uppercase font-semibold border-b border-white/[0.04]">
                                                                        <th className="py-2 px-2 w-8">#</th>
                                                                        <th className="py-2 px-3">Bölüm / Video Dosyası</th>
                                                                        <th className="py-2 px-3 whitespace-nowrap">Storage Box & Konum</th>
                                                                        <th className="py-2 px-3 whitespace-nowrap">Boyut</th>
                                                                        <th className="py-2 px-3">Özellikler</th>
                                                                        <th className="py-2 px-3 text-right w-20">İşlem</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-white/[0.03]">
                                                                    {group.items.map((epItem, epIdx) => {
                                                                        const epTag = getEpisodeBadge(epItem.name);
                                                                        return (
                                                                            <tr key={epItem.id} className="hover:bg-white/[0.02] transition-colors">
                                                                                <td className="py-2 px-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedIds.includes(epItem.id)}
                                                                                        onChange={() => onToggleSelect(epItem.id)}
                                                                                        className="w-3 h-3 rounded bg-[#07090E] border-white/20 text-purple-500 focus:ring-0"
                                                                                    />
                                                                                </td>

                                                                                <td className="py-2 px-3">
                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                        {epTag ? (
                                                                                            <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-mono font-bold text-[10px] border border-sky-500/30 shrink-0">
                                                                                                {epTag}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-mono text-[10px] shrink-0">
                                                                                                Bölüm {epIdx + 1}
                                                                                            </span>
                                                                                        )}
                                                                                        <span className="font-mono text-gray-200 text-[11px] truncate max-w-md" title={epItem.name}>
                                                                                            {epItem.name}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>

                                                                                <td className="py-2 px-3 whitespace-nowrap">
                                                                                    <div className="flex items-center gap-1.5 text-[10px] font-mono group/subpath">
                                                                                        <HardDrive className="w-3 h-3 text-emerald-400 shrink-0" />
                                                                                        <span className="text-emerald-400 font-medium">{epItem.storage_box?.name || 'Storage Box'}</span>
                                                                                        <span className="text-gray-500">·</span>
                                                                                        <span className="text-gray-400 truncate max-w-[150px]">{epItem.directory || '/'}</span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => onCopyPath(epItem.path)}
                                                                                            className="opacity-0 group-hover/subpath:opacity-100 transition-opacity text-gray-400 hover:text-white p-0.5 rounded"
                                                                                            title="Tam dosya yolunu kopyala"
                                                                                        >
                                                                                            {copiedPath === epItem.path ? (
                                                                                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                                                                            ) : (
                                                                                                <Copy className="w-2.5 h-2.5" />
                                                                                            )}
                                                                                        </button>
                                                                                    </div>
                                                                                </td>

                                                                                <td className="py-2 px-3 font-mono text-emerald-400 font-semibold text-xs whitespace-nowrap">
                                                                                    {epItem.formatted_size}
                                                                                </td>

                                                                                <td className="py-2 px-3">
                                                                                    <div className="flex flex-wrap items-center gap-1">
                                                                                        {epItem.properties && epItem.properties.length > 0 ? (
                                                                                            epItem.properties.map((prop, pIdx) => (
                                                                                                <span
                                                                                                    key={pIdx}
                                                                                                    className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border font-mono ${getPropertyBadgeClass(prop)}`}
                                                                                                >
                                                                                                    {prop}
                                                                                                </span>
                                                                                            ))
                                                                                        ) : (
                                                                                            <span className="text-gray-600 text-[10px] font-mono">-</span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>

                                                                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                                                                    <div className="flex items-center justify-end gap-1">
                                                                                        <button
                                                                                            onClick={() => onOpenTmdbModal(epItem)}
                                                                                            className="p-1 rounded text-indigo-400 hover:bg-indigo-500/15"
                                                                                            title="Bölüm Eşleştirmesi"
                                                                                        >
                                                                                            <Sparkles className="w-3 h-3" />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => onSetDeletingMedia(epItem)}
                                                                                            className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                                                                                            title="Bölümü Sil"
                                                                                        >
                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION FOOTER */}
            {medias.total > 0 && (
                <div className="p-4 bg-[#07090E]/60 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <span>Sayfa başına:</span>
                        <select
                            value={perPage}
                            onChange={(e) => onPerPageChange(e.target.value)}
                            className="bg-[#07090E] border border-white/[0.08] text-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
                        >
                            <option value={15}>15</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>(Toplam {medias.total} {groupSeries ? 'içerik' : 'video'})</span>
                    </div>

                    {/* Pagination Links */}
                    <div className="flex items-center gap-1">
                        {medias.links.map((link, idx) => {
                            if (!link.url) {
                                return (
                                    <span
                                        key={idx}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className="px-2.5 py-1 rounded text-gray-600 cursor-not-allowed select-none text-xs"
                                    />
                                );
                            }

                            return (
                                <Link
                                    key={idx}
                                    href={link.url}
                                    preserveScroll
                                    preserveState
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${link.active
                                        ? 'bg-[#00B074] text-white font-semibold'
                                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white'
                                        }`}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
