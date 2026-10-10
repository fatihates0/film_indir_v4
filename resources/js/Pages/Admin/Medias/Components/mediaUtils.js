// Helper: Format bytes into readable GB/MB string
export const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes >= 1099511627776) return (bytes / 1099511627776).toFixed(2) + ' TB';
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
};

// Helper: Extract Season & Episode tag (e.g. S03E11)
export const getEpisodeBadge = (filename) => {
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

// Quality badge helper
export const getQualityBadge = (q) => {
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
export const getPropertyBadgeClass = (prop) => {
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

// Helper: Extract base series title (stripping S01E01, 1x01, Sezon 01, S01, etc.)
export const getSeriesBaseTitle = (cleanTitle, filename) => {
    let title = cleanTitle || filename || '';
    title = title.replace(/[._\s-]s\d{1,2}e\d{1,2}.*/i, '');
    title = title.replace(/[._\s-]\d{1,2}x\d{1,2}.*/i, '');
    title = title.replace(/[._\s-](season|sezon)[._\s-]?\d{1,2}.*/i, '');
    title = title.replace(/[._\s-]s\d{1,2}(?![0-9a-z]).*/i, '');
    title = title.replace(/[\._-]/g, ' ').trim();
    return title || cleanTitle || filename;
};

// Helper: Normalize series title for key matching (combines TMDB matched and unmatched episodes)
export const getSeriesGroupKey = (item) => {
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
export const getMovieGroupKey = (item) => {
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
export const parseSeasonEpisodeNumbers = (filename, cleanTitle) => {
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
export const processMediaItems = (medias, groupSeries) => {
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
