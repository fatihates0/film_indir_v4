import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../../../Components/AdminLayout';
import {
    Film,
    Tv,
    Search,
    RefreshCw,
    HardDrive,
    Database,
    Trash2,
    Copy,
    Check,
    Folder,
    Calendar,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    X,
    Layers,
    FileVideo,
    Star,
    ExternalLink,
    Unlink,
    Info,
    HelpCircle,
    ChevronDown,
    ChevronRight,
    ListFilter
} from 'lucide-react';

export default function MediasIndex({
    medias,
    stats,
    storageBoxes = [],
    availableExtensions = [],
    filters = {}
}) {
    // Filter State
    const [search, setSearch] = useState(filters.search || '');
    const [storageBoxId, setStorageBoxId] = useState(filters.storage_box_id || 'all');
    const [category, setCategory] = useState(filters.category || 'all');
    const [quality, setQuality] = useState(filters.quality || 'all');
    const [extension, setExtension] = useState(filters.extension || 'all');
    const [tmdbStatus, setTmdbStatus] = useState(filters.tmdb_status || 'all');
    const [sortBy, setSortBy] = useState(filters.sort_by || 'created_at');
    const [sortOrder, setSortOrder] = useState(filters.sort_order || 'desc');
    const [perPage, setPerPage] = useState(filters.per_page || 25);

    // Keep filter states synchronized with incoming props when back() or URL changes
    useEffect(() => {
        setSearch(filters.search || '');
        setStorageBoxId(filters.storage_box_id || 'all');
        setCategory(filters.category || 'all');
        setQuality(filters.quality || 'all');
        setExtension(filters.extension || 'all');
        setTmdbStatus(filters.tmdb_status || 'all');
        setSortBy(filters.sort_by || 'created_at');
        setSortOrder(filters.sort_order || 'desc');
        setPerPage(filters.per_page || 25);
        setGroupSeries(filters.grouped !== '0');
    }, [filters.search, filters.storage_box_id, filters.category, filters.quality, filters.extension, filters.tmdb_status, filters.sort_by, filters.sort_order, filters.per_page, filters.grouped]);

    // Live debounced search (250ms delay after user stops typing)
    useEffect(() => {
        if (search === (filters.search || '')) return;

        const timer = setTimeout(() => {
            applyFilters({ search });
        }, 250);

        return () => clearTimeout(timer);
    }, [search]);

    // Selection & Scan State
    const [selectedIds, setSelectedIds] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanningBoxId, setScanningBoxId] = useState('all');
    const [notification, setNotification] = useState(null);
    const [copiedPath, setCopiedPath] = useState(null);
    const [deletingMedia, setDeletingMedia] = useState(null);
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearTargetBoxId, setClearTargetBoxId] = useState('all');
    const [isClearing, setIsClearing] = useState(false);

    // Series Grouping State (Group multiple episode files into a single master series row)
    const [groupSeries, setGroupSeries] = useState(filters?.grouped !== '0');
    const [expandedGroups, setExpandedGroups] = useState({});

    // TMDB States
    const [tmdbModalMedia, setTmdbModalMedia] = useState(null);
    const [tmdbModalMediaIds, setTmdbModalMediaIds] = useState([]);
    const [tmdbQuery, setTmdbQuery] = useState('');
    const [tmdbYear, setTmdbYear] = useState('');
    const [tmdbType, setTmdbType] = useState('all');
    const [tmdbResults, setTmdbResults] = useState([]);
    const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
    const [isMatchingTmdb, setIsMatchingTmdb] = useState(false);
    const [showTmdbScanModal, setShowTmdbScanModal] = useState(false);
    const [tmdbScanScope, setTmdbScanScope] = useState('unmatched_and_review');
    const [isTmdbScanningAll, setIsTmdbScanningAll] = useState(false);

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4500);
    };

    // Toggle single group expand
    const toggleGroupExpand = (groupKey) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };

    // Helper: Extract Season & Episode tag (e.g. S03E11)
    const getEpisodeBadge = (filename) => {
        if (!filename) return null;
        const sMatch = filename.match(/[._\s-]s(\d{1,2})e(\d{1,2})[._\s-]/i);
        if (sMatch) {
            return `S${sMatch[1].padStart(2, '0')}E${sMatch[2].padStart(2, '0')}`;
        }
        const xMatch = filename.match(/[._\s-](\d{1,2})x(\d{1,2})[._\s-]/i);
        if (xMatch) {
            return `S${xMatch[1].padStart(2, '0')}E${xMatch[2].padStart(2, '0')}`;
        }
        return null;
    };

    // Helper: Format bytes into readable GB/MB string
    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        if (bytes >= 1099511627776) return (bytes / 1099511627776).toFixed(2) + ' TB';
        if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    };

    // Helper: Select / Deselect all IDs in a series group
    const handleToggleGroupSelect = (groupAllIds) => {
        const allSelected = groupAllIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !groupAllIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...groupAllIds])));
        }
    };

    // Helper: Extract base series title (stripping S01E01, 1x01, Sezon 01, S01, etc.)
    const getSeriesBaseTitle = (cleanTitle, filename) => {
        let title = cleanTitle || filename || '';
        title = title.replace(/[._\s-]s\d{1,2}e\d{1,2}.*/i, '');
        title = title.replace(/[._\s-]\d{1,2}x\d{1,2}.*/i, '');
        title = title.replace(/[._\s-](season|sezon)[._\s-]?\d{1,2}.*/i, '');
        title = title.replace(/[._\s-]s\d{1,2}(?![0-9a-z]).*/i, '');
        title = title.replace(/[\._-]/g, ' ').trim();
        return title || cleanTitle || filename;
    };

    // Helper: Normalize series title for key matching (combines TMDB matched and unmatched episodes)
    const getSeriesGroupKey = (item) => {
        if (item.tmdb_title?.original_title) {
            const tmdbBase = getSeriesBaseTitle(item.tmdb_title.original_title, '');
            const tmdbNorm = tmdbBase.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (tmdbNorm) return `series_${tmdbNorm}`;
        }

        const baseSeriesTitle = getSeriesBaseTitle(item.clean_title, item.name);
        const normalized = baseSeriesTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `series_${normalized}`;
    };

    // Helper: Normalize movie title for key matching (combines TMDB matched and unmatched movie files)
    const getMovieGroupKey = (item) => {
        if (item.tmdb_title?.id || item.tmdb_title?.title) {
            const tmdbId = item.tmdb_title.id || item.tmdb_title.title;
            const norm = String(tmdbId).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (norm) return `movie_${norm}`;
        }

        const baseTitle = item.clean_title || item.name || '';
        const normTitle = baseTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        const yearKey = item.year ? `_${item.year}` : '';
        return `movie_${normTitle}${yearKey}`;
    };

    // Helper: Parse Season & Episode numbers for numerical sorting inside series groups
    const parseSeasonEpisodeNumbers = (filename, cleanTitle) => {
        const text = `${cleanTitle || ''} ${filename || ''}`;
        let season = 999;
        let episode = 999;

        const sMatch = text.match(/[._\s-]s(\d{1,2})e(\d{1,2})[._\s-]/i);
        if (sMatch) {
            season = parseInt(sMatch[1], 10);
            episode = parseInt(sMatch[2], 10);
        } else {
            const xMatch = text.match(/[._\s-](\d{1,2})x(\d{1,2})[._\s-]/i);
            if (xMatch) {
                season = parseInt(xMatch[1], 10);
                episode = parseInt(xMatch[2], 10);
            }
        }

        return { season, episode };
    };

    // Process items for table view (flat or series & movie grouped)
    const getProcessedItems = () => {
        if (!medias?.data) return [];

        // If data is already structured by server (e.g. series_group, movie_group, single)
        if (medias.data.length > 0 && medias.data[0].type) {
            if (!groupSeries) {
                // If user toggles off grouping in UI before server round-trip, unroll items
                const flat = [];
                medias.data.forEach(entry => {
                    if (entry.items && Array.isArray(entry.items)) {
                        entry.items.forEach(it => flat.push({ type: 'single', item: it }));
                    } else if (entry.item) {
                        flat.push(entry);
                    }
                });
                return flat;
            }
            return medias.data;
        }

        if (!groupSeries) {
            return medias.data.map(item => ({ type: 'single', item: item.item || item }));
        }

        const seriesMap = new Map();
        const movieMap = new Map();

        medias.data.forEach((item) => {
            const isSeries = item.category === 'series' || item.tmdb_title?.media_type === 'tv';

            if (isSeries) {
                const baseSeriesTitle = getSeriesBaseTitle(item.clean_title, item.name);
                const groupKey = getSeriesGroupKey(item);

                if (seriesMap.has(groupKey)) {
                    const existingGroup = seriesMap.get(groupKey);
                    existingGroup.items.push(item);
                    existingGroup.totalSizeBytes += (item.size_bytes || 0);
                    if (item.id) existingGroup.allIds.push(item.id);

                    if (item.tmdb_title && !existingGroup.tmdb_title) {
                        existingGroup.tmdb_title = item.tmdb_title;
                        existingGroup.tmdb_match_status = item.tmdb_match_status;
                        existingGroup.representativeItem = item;
                    }

                    if (item.properties && Array.isArray(item.properties)) {
                        item.properties.forEach(p => {
                            if (!existingGroup.allProperties.includes(p)) {
                                existingGroup.allProperties.push(p);
                            }
                        });
                    }
                } else {
                    const newGroup = {
                        type: 'series_group',
                        mediaType: 'series',
                        key: groupKey,
                        tmdb_title: item.tmdb_title,
                        clean_title: baseSeriesTitle,
                        year: item.tmdb_title?.release_year || item.year,
                        tmdb_match_status: item.tmdb_match_status,
                        tmdb_match_notes: item.tmdb_match_notes,
                        totalSizeBytes: item.size_bytes || 0,
                        allProperties: [...(item.properties || [])],
                        items: [item],
                        allIds: item.id ? [item.id] : [],
                        representativeItem: item,
                    };
                    seriesMap.set(groupKey, newGroup);
                }
            } else {
                const groupKey = getMovieGroupKey(item);

                if (movieMap.has(groupKey)) {
                    const existingGroup = movieMap.get(groupKey);
                    existingGroup.items.push(item);
                    existingGroup.totalSizeBytes += (item.size_bytes || 0);
                    if (item.id) existingGroup.allIds.push(item.id);

                    if (item.tmdb_title && !existingGroup.tmdb_title) {
                        existingGroup.tmdb_title = item.tmdb_title;
                        existingGroup.tmdb_match_status = item.tmdb_match_status;
                        existingGroup.representativeItem = item;
                    }

                    if (item.properties && Array.isArray(item.properties)) {
                        item.properties.forEach(p => {
                            if (!existingGroup.allProperties.includes(p)) {
                                existingGroup.allProperties.push(p);
                            }
                        });
                    }
                } else {
                    const newGroup = {
                        type: 'movie_group',
                        mediaType: 'movie',
                        key: groupKey,
                        tmdb_title: item.tmdb_title,
                        clean_title: item.clean_title || item.name,
                        year: item.tmdb_title?.release_year || item.year,
                        tmdb_match_status: item.tmdb_match_status,
                        tmdb_match_notes: item.tmdb_match_notes,
                        totalSizeBytes: item.size_bytes || 0,
                        allProperties: [...(item.properties || [])],
                        items: [item],
                        allIds: item.id ? [item.id] : [],
                        representativeItem: item,
                    };
                    movieMap.set(groupKey, newGroup);
                }
            }
        });

        const result = [];
        const visitedKeys = new Set();

        medias.data.forEach((item) => {
            const isSeries = item.category === 'series' || item.tmdb_title?.media_type === 'tv';
            if (isSeries) {
                const groupKey = getSeriesGroupKey(item);
                if (!visitedKeys.has(groupKey)) {
                    visitedKeys.add(groupKey);
                    const group = seriesMap.get(groupKey);
                    if (group.items.length > 1) {
                        group.items.sort((a, b) => {
                            const seA = parseSeasonEpisodeNumbers(a.name, a.clean_title);
                            const seB = parseSeasonEpisodeNumbers(b.name, b.clean_title);
                            if (seA.season !== seB.season) return seA.season - seB.season;
                            return seA.episode - seB.episode;
                        });
                    }
                    result.push(group);
                }
            } else {
                const groupKey = getMovieGroupKey(item);
                if (!visitedKeys.has(groupKey)) {
                    visitedKeys.add(groupKey);
                    const group = movieMap.get(groupKey);
                    if (group.items.length > 1) {
                        group.items.sort((a, b) => (b.size_bytes || 0) - (a.size_bytes || 0));
                        result.push(group);
                    } else {
                        result.push({ type: 'single', item: group.items[0] });
                    }
                }
            }
        });

        return result;
    };

    // Apply Filters via Inertia Visit
    const applyFilters = (overrides = {}) => {
        const query = {
            search,
            storage_box_id: storageBoxId,
            category,
            quality,
            extension,
            tmdb_status: tmdbStatus,
            sort_by: sortBy,
            sort_order: sortOrder,
            per_page: perPage,
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
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        applyFilters({ search });
    };

    const handleResetFilters = () => {
        setSearch('');
        setStorageBoxId('all');
        setCategory('all');
        setQuality('all');
        setExtension('all');
        setTmdbStatus('all');
        setSortBy('created_at');
        setSortOrder('desc');
        router.get('/admin/medias');
    };

    // Trigger Scan via disk_scan queue
    const handleTriggerScan = (targetBoxId = 'all') => {
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
    };

    // Copy file path to clipboard
    const handleCopyPath = (path) => {
        navigator.clipboard.writeText(path);
        setCopiedPath(path);
        setTimeout(() => setCopiedPath(null), 2000);
    };

    // Checkbox handlers
    const handleSelectAll = (e) => {
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
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Bulk Delete
    const handleBulkDelete = () => {
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
    };

    // Delete Single
    const handleDeleteSingle = () => {
        if (!deletingMedia) return;

        router.delete(`/admin/medias/${deletingMedia.id}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setDeletingMedia(null);
                showToast(`"${deletingMedia.clean_title}" indeks listesinden kaldırıldı.`, 'success');
            },
        });
    };

    // Clear All Archive
    const handleClearAll = () => {
        setIsClearing(true);
        router.post('/admin/medias/clear-all', {
            storage_box_id: clearTargetBoxId,
        }, {
            onSuccess: () => {
                setShowClearModal(false);
                setIsClearing(false);
                setSelectedIds([]);
                showToast('Arşiv veritabanı indeksinden başarıyla temizlendi.', 'success');
            },
            onError: () => {
                setIsClearing(false);
                showToast('Arşiv temizlenirken bir hata oluştu.', 'error');
            },
        });
    };

    // TMDB Search in Modal
    const handleTmdbSearch = async (overrideQuery = null, overrideYear = null, overrideType = null) => {
        if (!tmdbModalMedia) return;
        setIsSearchingTmdb(true);

        const q = overrideQuery !== null ? overrideQuery : tmdbQuery;
        const y = overrideYear !== null ? overrideYear : tmdbYear;
        const t = overrideType !== null ? overrideType : tmdbType;

        try {
            const params = new URLSearchParams();
            if (q) params.set('query', q);
            if (y) params.set('year', y);
            if (t && t !== 'all') params.set('type', t);

            const res = await fetch(`/admin/medias/${tmdbModalMedia.id}/tmdb-search?${params.toString()}`, {
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

    // Open TMDB Match Modal
    const openTmdbModal = (media, groupAllIds = null) => {
        setTmdbModalMedia(media);
        setTmdbModalMediaIds(groupAllIds || (media ? [media.id] : []));
        const initialQuery = media.clean_title || media.name;
        const initialYear = media.year ? String(media.year) : '';
        const initialType = media.category === 'series' ? 'tv' : (media.category === 'movie' ? 'movie' : 'all');

        setTmdbQuery(initialQuery);
        setTmdbYear(initialYear);
        setTmdbType(initialType);
        setTmdbResults([]);

        // Auto trigger search
        setTimeout(() => {
            handleTmdbSearch(initialQuery, initialYear, initialType);
        }, 100);
    };

    // Confirm Manual Match
    const handleConfirmTmdbMatch = (candidate) => {
        if (!tmdbModalMedia) return;
        setIsMatchingTmdb(true);

        router.post(`/admin/medias/${tmdbModalMedia.id}/tmdb-match`, {
            tmdb_id: candidate.id,
            media_type: candidate.media_type,
            media_ids: tmdbModalMediaIds,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsMatchingTmdb(false);
                setTmdbModalMedia(null);
                setTmdbModalMediaIds([]);
                showToast(`"${tmdbModalMedia.clean_title}" içeriği ve gruptaki tüm kayıtlar "${candidate.title}" ile başarıyla eşleştirildi.`, 'success');
            },
            onError: () => {
                setIsMatchingTmdb(false);
                showToast('Eşleştirme sırasında bir hata oluştu.', 'error');
            },
        });
    };

    // Detach TMDB Match
    const handleDetachTmdbMatch = () => {
        if (!tmdbModalMedia) return;
        setIsMatchingTmdb(true);

        router.post(`/admin/medias/${tmdbModalMedia.id}/tmdb-detach`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsMatchingTmdb(false);
                setTmdbModalMedia(null);
                showToast('TMDB eşleştirmesi kaldırıldı.', 'success');
            },
            onError: () => {
                setIsMatchingTmdb(false);
                showToast('Eşleştirme kaldırılırken bir hata oluştu.', 'error');
            },
        });
    };

    // Trigger TMDB Scan All via tmdb_scan queue
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
                setShowTmdbScanModal(false);
                const msg = page.props?.flash?.success || 'TMDB tarama görevleri tmdb_scan kuyruğuna eklendi!';
                showToast(msg, 'success');
            },
            onError: (errors) => {
                setIsTmdbScanningAll(false);
                showToast(errors?.message || 'Tarama başlatılamadı.', 'error');
            },
        });
    };

    // Quality badge helper
    const getQualityBadge = (q) => {
        switch (q) {
            case '2160p':
                return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
            case '1080p':
            case 'm1080p':
                return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
            case '720p':
            case 'm720p':
                return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
            default:
                return 'bg-white/5 text-gray-300 border-white/10';
        }
    };

    // Properties badge helper (Atmos, Bluray, DV, HDR, IMAX, DUAL, codecs etc.)
    const getPropertyBadgeClass = (prop) => {
        const p = String(prop).toUpperCase();
        if (p.includes('DV') || p.includes('DOVI') || p.includes('VISION')) {
            return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
        }
        if (p.includes('HDR')) {
            return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
        }
        if (p === 'IMAX') {
            return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-bold';
        }
        if (p.includes('ATMOS') || p.includes('ATMOX') || p.includes('DTS') || p.includes('TRUEHD') || p === 'AC3' || p === 'DDP') {
            return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
        }
        if (p === 'BLURAY' || p === 'REMUX') {
            return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-medium';
        }
        if (p.includes('WEB')) {
            return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
        }
        if (p === 'DUAL' || p === 'MULTI' || p.includes('DUB')) {
            return 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-semibold';
        }
        if (p === '2160P' || p === '4K') {
            return 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40 font-bold';
        }
        if (p === '1080P') {
            return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
        }
        if (p === '720P') {
            return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
        }
        return 'bg-white/5 text-gray-300 border-white/10';
    };

    return (
        <AdminLayout
            title="Storage Box Medya Kataloğu & TMDB"
            subtitle="Hetzner Storage Box ünitelerindeki video dosyaları, otomatik TMDB giydirme ve yapım yılı kontrolü"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* Total Archive Size */}
                        <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                            <div className="flex items-center justify-between text-gray-400">
                                <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                    <Database className="w-3.5 h-3.5 text-[#00B074]" />
                                    <span>Toplam Video Arşivi</span>
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-mono">
                                    {stats?.total_count || 0} Dosya
                                </span>
                            </div>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-3xl font-semibold tracking-tight text-white font-mono">
                                    {stats?.total_size_formatted || '0 GB'}
                                </span>
                            </div>
                            <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                                <span>Depolama Üniteleri: <strong className="text-gray-200">{storageBoxes.length} Box</strong></span>
                                <span className="text-emerald-400 font-mono text-[10px]">Aktif</span>
                            </div>
                        </div>

                        {/* TMDB Matched & Review Card */}
                        <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                            <div className="flex items-center justify-between text-gray-400">
                                <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>TMDB Eşleşme Durumu</span>
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                                    Katalog
                                </span>
                            </div>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-3xl font-semibold tracking-tight text-emerald-400 font-mono">
                                    {stats?.tmdb_matched_count || 0}
                                </span>
                                <span className="text-xs text-gray-400">eşleşti</span>
                                {stats?.tmdb_review_count > 0 && (
                                    <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                                        {stats?.tmdb_review_count} İnceleme Bekliyor
                                    </span>
                                )}
                            </div>
                            <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                                <span>Eşleşmeyen: <strong className="text-gray-300 font-mono">{stats?.tmdb_unmatched_count || 0}</strong></span>
                                <span className="text-gray-600">·</span>
                                <span>Kuyrukta: <strong className="text-sky-400 font-mono">{stats?.tmdb_pending_count || 0}</strong></span>
                            </div>
                        </div>

                        {/* Category Distribution (Film / Dizi) */}
                        <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                            <div className="flex items-center justify-between text-gray-400">
                                <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                    <Film className="w-3.5 h-3.5 text-sky-400" />
                                    <span>Film / Dizi Dağılımı</span>
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">
                                    İçerik
                                </span>
                            </div>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-3xl font-semibold tracking-tight text-sky-400 font-mono">
                                    {stats?.movie_count || 0}
                                </span>
                                <span className="text-xs text-gray-400">film</span>
                                <span className="text-gray-600">/</span>
                                <span className="text-2xl font-semibold tracking-tight text-purple-400 font-mono">
                                    {stats?.series_count || 0}
                                </span>
                                <span className="text-xs text-gray-400">dizi</span>
                            </div>
                            <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                                <span>Klasör: <strong className="text-gray-200">/Filmler & /Diziler</strong></span>
                                <span className="text-sky-400 font-mono text-[10px]">Otomatik Ayrım</span>
                            </div>
                        </div>

                        {/* Quality Highlights */}
                        <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
                            <div className="flex items-center justify-between text-gray-400">
                                <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Çözünürlük Dağılımı</span>
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                                    Kalite
                                </span>
                            </div>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-3xl font-semibold tracking-tight text-white font-mono">
                                    {stats?.fhd_count || 0}
                                </span>
                                <span className="text-xs text-emerald-400 font-medium">1080p FHD</span>
                            </div>
                            <div className="mt-3 text-[11px] text-gray-400 border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                                <span>4K UHD: <strong className="text-purple-400 font-mono">{stats?.uhd_count || 0}</strong></span>
                                <span className="text-gray-600">·</span>
                                <span>720p: <strong className="text-sky-400 font-mono">{stats?.hd_count || 0}</strong></span>
                            </div>
                        </div>

                    </div>

                    {/* ACTION & SCAN CONTROLS BAR */}
                    <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl p-4 space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                            {/* Live Search */}
                            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Film adı, dizi adı veya dosya adı ile ara..."
                                    className="w-full bg-[#07090E] border border-white/[0.08] focus:border-[#00B074] rounded-lg pl-9 pr-16 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            applyFilters({ search: '' });
                                        }}
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
                                        onClick={handleBulkDelete}
                                        className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Seçilenleri Sil ({selectedIds.length})</span>
                                    </button>
                                )}

                                {/* TMDB Auto Scan Button */}
                                <button
                                    onClick={() => setShowTmdbScanModal(true)}
                                    className="px-3.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                                    title="Tüm veya eşleşmeyen videoları tmdb_scan kuyruğu ile tara"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>TMDB Otomatik Tara</span>
                                    {(stats?.tmdb_unmatched_count > 0 || stats?.tmdb_review_count > 0) && (
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
                                        onClick={() => handleTriggerScan(scanningBoxId)}
                                        disabled={isScanning}
                                        className="px-4 py-2 rounded-lg bg-[#00B074] hover:bg-[#009663] text-white text-xs font-semibold shadow-md shadow-[#00B074]/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                                        <span>{isScanning ? 'Taranıyor...' : 'Storage Box Tara'}</span>
                                    </button>
                                </div>

                                {/* Clear All Archive Button */}
                                <button
                                    onClick={() => {
                                        setClearTargetBoxId('all');
                                        setShowClearModal(true);
                                    }}
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
                                value={storageBoxId}
                                onChange={(e) => {
                                    setStorageBoxId(e.target.value);
                                    applyFilters({ storage_box_id: e.target.value });
                                }}
                                className="bg-[#07090E] border border-white/[0.08] text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00B074]"
                            >
                                <option value="all">Depolama: Tümü</option>
                                {storageBoxes.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>

                            {/* TMDB Status Filter */}
                            <select
                                value={tmdbStatus}
                                onChange={(e) => {
                                    setTmdbStatus(e.target.value);
                                    applyFilters({ tmdb_status: e.target.value });
                                }}
                                className={`border rounded-lg px-2.5 py-1.5 focus:outline-none font-medium ${tmdbStatus === 'review'
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
                                value={category}
                                onChange={(e) => {
                                    setCategory(e.target.value);
                                    applyFilters({ category: e.target.value });
                                }}
                                className="bg-[#07090E] border border-white/[0.08] text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00B074]"
                            >
                                <option value="all">Kategori: Tümü</option>
                                <option value="movie">Filmler</option>
                                <option value="series">Diziler</option>
                            </select>

                            {/* Quality Filter */}
                            <select
                                value={quality}
                                onChange={(e) => {
                                    setQuality(e.target.value);
                                    applyFilters({ quality: e.target.value });
                                }}
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
                                value={extension}
                                onChange={(e) => {
                                    setExtension(e.target.value);
                                    applyFilters({ extension: e.target.value });
                                }}
                                className="bg-[#07090E] border border-white/[0.08] text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00B074]"
                            >
                                <option value="all">Uzantı: Tümü</option>
                                {availableExtensions.map(ext => (
                                    <option key={ext} value={ext}>.{ext}</option>
                                ))}
                            </select>

                            {/* Sort Filter */}
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [newSort, newOrder] = e.target.value.split('-');
                                    setSortBy(newSort);
                                    setSortOrder(newOrder);
                                    applyFilters({ sort_by: newSort, sort_order: newOrder });
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
                                onClick={() => {
                                    const nextGrouped = !groupSeries;
                                    setGroupSeries(nextGrouped);
                                    applyFilters({ grouped: nextGrouped ? '1' : '0' });
                                }}
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
                            {(search || storageBoxId !== 'all' || category !== 'all' || quality !== 'all' || extension !== 'all' || tmdbStatus !== 'all') && (
                                <button
                                    onClick={handleResetFilters}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors"
                                >
                                    Filtreleri Temizle
                                </button>
                            )}

                            <span className="ml-auto text-gray-400 text-xs font-mono">
                                Toplam: <strong className="text-white">{medias.total || 0}</strong> {groupSeries ? 'içerik' : 'dosya'}
                            </span>
                        </div>
                    </div>

                    {/* MEDIA TABLE */}
                    <div className="bg-[#0D111A] border border-white/[0.06] rounded-xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/[0.06] bg-[#07090E]/60 text-gray-400">
                                        <th className="py-3 px-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={(() => {
                                                    const all = [];
                                                    medias.data?.forEach(entry => {
                                                        if (entry.allIds && Array.isArray(entry.allIds)) all.push(...entry.allIds);
                                                        else if (entry.items && Array.isArray(entry.items)) entry.items.forEach(it => { if (it.id) all.push(it.id); });
                                                        else if (entry.item?.id) all.push(entry.item.id);
                                                        else if (entry.id) all.push(entry.id);
                                                    });
                                                    return all.length > 0 && all.every(id => selectedIds.includes(id));
                                                })()}
                                                onChange={handleSelectAll}
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
                                                        onClick={() => handleTriggerScan('all')}
                                                        className="px-4 py-2 rounded-lg bg-[#00B074] hover:bg-[#009663] text-white text-xs font-semibold"
                                                    >
                                                        Tüm Depolama Birimlerini Şimdi Tara
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        getProcessedItems().map((entry) => {
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
                                                                onChange={() => handleToggleSelect(item.id)}
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
                                                                    onClick={() => openTmdbModal(item)}
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
                                                                        onClick={() => handleCopyPath(item.path)}
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

                                                        {/* Properties (Özellikler) Badges */}
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
                                                                {/* TMDB Match Modal Button */}
                                                                <button
                                                                    onClick={() => openTmdbModal(item)}
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

                                                                {/* Delete Row Button */}
                                                                <button
                                                                    onClick={() => setDeletingMedia(item)}
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

                                            // MOVIE GROUP MASTER ROW & COLLAPSIBLE VERSIONS ACCORDION
                                            if (entry.type === 'movie_group') {
                                                const group = entry;
                                                const isExpanded = !!expandedGroups[group.key];
                                                const isAllSelected = group.allIds.length > 0 && group.allIds.every(id => selectedIds.includes(id));
                                                const title = group.tmdb_title?.title_tr || group.tmdb_title?.title || group.clean_title;

                                                return (
                                                    <React.Fragment key={group.key}>
                                                        {/* MASTER MOVIE GROUP ROW */}
                                                        <tr className={`border-b border-white/[0.06] transition-colors ${isExpanded ? 'bg-indigo-950/20' : 'bg-indigo-500/[0.02] hover:bg-indigo-500/[0.05]'
                                                            }`}>
                                                            <td className="py-3.5 px-4">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isAllSelected}
                                                                    onChange={() => handleToggleGroupSelect(group.allIds)}
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
                                                                        {/* Group Badge */}
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

                                                                    {/* TMDB Match Modal Button */}
                                                                    <button
                                                                        onClick={() => openTmdbModal(group.representativeItem, group.allIds)}
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
                                                                                    {group.items.map((mvItem, mvIdx) => {
                                                                                        return (
                                                                                            <tr key={mvItem.id} className="hover:bg-white/[0.02] transition-colors">
                                                                                                <td className="py-2 px-2">
                                                                                                    <input
                                                                                                        type="checkbox"
                                                                                                        checked={selectedIds.includes(mvItem.id)}
                                                                                                        onChange={() => handleToggleSelect(mvItem.id)}
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
                                                                                                            onClick={() => handleCopyPath(mvItem.path)}
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
                                                                                                            onClick={() => openTmdbModal(mvItem)}
                                                                                                            className="p-1 rounded text-indigo-400 hover:bg-indigo-500/15"
                                                                                                            title="Versiyon Eşleştirmesi"
                                                                                                        >
                                                                                                            <Sparkles className="w-3 h-3" />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={() => setDeletingMedia(mvItem)}
                                                                                                            className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                                                                                                            title="Dosyayı Sil"
                                                                                                        >
                                                                                                            <Trash2 className="w-3 h-3" />
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
                                            }

                                            // SERIES GROUP MASTER ROW & COLLAPSIBLE EPISODES ACCORDION
                                            const group = entry;
                                            const isExpanded = !!expandedGroups[group.key];
                                            const isAllSelected = group.allIds.length > 0 && group.allIds.every(id => selectedIds.includes(id));
                                            const title = group.tmdb_title?.title_tr || group.tmdb_title?.title || group.clean_title;

                                            return (
                                                <React.Fragment key={group.key}>
                                                    {/* MASTER SERIES ROW */}
                                                    <tr className={`border-b border-white/[0.06] transition-colors ${isExpanded ? 'bg-purple-950/20' : 'bg-purple-500/[0.02] hover:bg-purple-500/[0.05]'
                                                        }`}>
                                                        <td className="py-3.5 px-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllSelected}
                                                                onChange={() => handleToggleGroupSelect(group.allIds)}
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
                                                                    {/* Series Badge */}
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

                                                                {/* TMDB Match Modal Button */}
                                                                <button
                                                                    onClick={() => openTmdbModal(group.representativeItem, group.allIds)}
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
                                                                                                    onChange={() => handleToggleSelect(epItem.id)}
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
                                                                                                        onClick={() => handleCopyPath(epItem.path)}
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
                                                                                                        onClick={() => openTmdbModal(epItem)}
                                                                                                        className="p-1 rounded text-indigo-400 hover:bg-indigo-500/15"
                                                                                                        title="Bölüm Eşleştirmesi"
                                                                                                    >
                                                                                                        <Sparkles className="w-3 h-3" />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => setDeletingMedia(epItem)}
                                                                                                        className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                                                                                                        title="Bölümü Sil"
                                                                                                    >
                                                                                                        <Trash2 className="w-3 h-3" />
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
                                        onChange={(e) => {
                                            setPerPage(e.target.value);
                                            applyFilters({ per_page: e.target.value });
                                        }}
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

                </div>

                {/* TMDB SEARCH & MANUAL MATCH MODAL */}
                {tmdbModalMedia && (
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
                                            {tmdbModalMedia.name}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setTmdbModalMedia(null)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Active Match Banner (if already matched) */}
                            {tmdbModalMedia.tmdb_title && (
                                <div className="px-5 py-3 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-3">
                                        {tmdbModalMedia.tmdb_title.poster_url && (
                                            <img
                                                src={tmdbModalMedia.tmdb_title.poster_url}
                                                alt=""
                                                className="w-7 h-10 object-cover rounded border border-emerald-500/30"
                                            />
                                        )}
                                        <div>
                                            <div className="font-semibold text-emerald-300 flex items-center gap-2">
                                                <span>{tmdbModalMedia.tmdb_title.title_tr || tmdbModalMedia.tmdb_title.title}</span>
                                                <span className="text-[10px] text-gray-400 font-mono">({tmdbModalMedia.tmdb_title.release_year})</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                                                <span>TR: <strong className="text-gray-200">{tmdbModalMedia.tmdb_title.title_tr || '-'}</strong></span>
                                                <span>·</span>
                                                <span>EN: <strong className="text-gray-200">{tmdbModalMedia.tmdb_title.title_en || '-'}</strong></span>
                                                <span>·</span>
                                                <span>Orijinal: <strong className="text-gray-200">{tmdbModalMedia.tmdb_title.title_original || '-'}</strong></span>
                                            </div>
                                            {tmdbModalMedia.tmdb_match_notes && (
                                                <div className="text-[11px] text-amber-300/80 mt-1">
                                                    {tmdbModalMedia.tmdb_match_notes}
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
                                    onClick={() => setTmdbModalMedia(null)}
                                    className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-medium text-xs transition-colors"
                                >
                                    Kapat
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* TMDB SCAN ALL QUEUE MODAL */}
                {showTmdbScanModal && (
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
                                    onClick={() => setShowTmdbScanModal(false)}
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
                )}

                {/* DELETE CONFIRMATION MODAL */}
                {deletingMedia && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center gap-3 text-rose-400">
                                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-white text-sm">Videoyu İndeksten Kaldır</h3>
                            </div>

                            <p className="text-xs text-gray-300 leading-relaxed">
                                <strong className="text-white">"{deletingMedia.clean_title}"</strong> adlı video veritabanı indeksinden kaldırılacak.
                            </p>
                            <p className="text-[11px] text-gray-500">
                                * Not: Bu işlem Hetzner Storage Box'ınızdaki gerçek dosyayı silmez; sadece admin panelindeki kayıt listesinden çıkartır.
                            </p>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    onClick={() => setDeletingMedia(null)}
                                    className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-medium text-xs transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleDeleteSingle}
                                    className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors"
                                >
                                    İndeksten Kaldır
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CLEAR ALL ARCHIVE MODAL */}
                {showClearModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-[#0D111A] border border-rose-500/20 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
                            <div className="flex items-center gap-3 text-rose-400">
                                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-base">Medya Arşivini Temizle</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Veritabanındaki taranmış video kayıtlarını siler</p>
                                </div>
                            </div>

                            <div className="bg-[#121622] rounded-xl p-4 border border-white/[0.04] space-y-3">
                                <label className="text-xs font-medium text-gray-300 block">
                                    Temizlenecek Depolama Alanı:
                                </label>
                                <select
                                    value={clearTargetBoxId}
                                    onChange={(e) => setClearTargetBoxId(e.target.value)}
                                    className="w-full bg-[#07090E] border border-white/[0.08] text-xs text-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-rose-500"
                                >
                                    <option value="all">Tüm Arşiv (Tüm Storage Box'lar - {stats?.total_count || 0} Video)</option>
                                    {storageBoxes.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-3.5 rounded-xl bg-rose-500/[0.08] border border-rose-500/20 text-xs text-rose-300 leading-relaxed space-y-1.5">
                                <p className="font-medium text-rose-200 flex items-center gap-1.5">
                                    <span>⚠️</span>
                                    <span>Bu işlem veritabanı indeksini sıfırlar!</span>
                                </p>
                                <p className="text-[11px] text-gray-400 leading-normal">
                                    Seçilen filtrelere göre veritabanındaki tüm video indeksleri silinecektir. Hetzner Storage Box disklerinizdeki fiziksel medya dosyalarına zarar gelmez. İstediğiniz an <strong className="text-gray-200">"Storage Box Tara"</strong> butonu ile arşivi saniyeler içinde tekrar taratabilirsiniz.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    onClick={() => setShowClearModal(false)}
                                    disabled={isClearing}
                                    className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-medium text-xs transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={handleClearAll}
                                    disabled={isClearing}
                                    className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{isClearing ? 'Temizleniyor...' : 'Evet, Arşivi Sil'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </AdminLayout>
    );
}
