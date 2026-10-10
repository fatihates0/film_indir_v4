import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../Components/Layout';
import { ChevronDown, Search, Film } from 'lucide-react';
import Pagination from '../Components/Pagination';
import MovieCard from '../Components/MovieCard';
import GridColumnsSelector from '../Components/GridColumnsSelector';

export default function Movies({ hero, popularOfWeek, grid, moviesOnAwards, morePopular, newest, totalCount, availableGenres, filters, pagination }) {
    const perPageMap = { 4: 16, 5: 20, 6: 24 };

    const [columns, setColumns] = useState(() => {
        if (filters?.columns && [4, 5, 6].includes(Number(filters.columns))) {
            return Number(filters.columns);
        }
        try {
            const cached = localStorage.getItem('catalog_grid_columns');
            if (cached && [4, 5, 6].includes(Number(cached))) {
                return Number(cached);
            }
        } catch (e) { }
        return 5;
    });

    const [searchQuery, setSearchQuery] = useState(filters?.q || '');
    const [selectedGenre, setSelectedGenre] = useState(filters?.genre || 'Tümü');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [selectedSort, setSelectedSort] = useState(filters?.sort || 'Popüler');

    const sortOptions = ['Popüler', 'Son Eklenenler', 'En Yüksek Puanlı', 'En Düşük Puanlı', 'Çıkış Yılı', 'A-Z', 'Z-A'];

    // Sync with cached column preference on initial mount if not provided in URL
    useEffect(() => {
        try {
            const cached = localStorage.getItem('catalog_grid_columns');
            if (cached && [4, 5, 6].includes(Number(cached))) {
                const cachedCols = Number(cached);
                const currentCols = filters?.columns ? Number(filters.columns) : 5;
                if (cachedCols !== currentCols) {
                    setColumns(cachedCols);
                    router.get('/movies', {
                        q: searchQuery,
                        genre: selectedGenre,
                        sort: selectedSort,
                        columns: cachedCols,
                        per_page: perPageMap[cachedCols],
                        page: 1,
                    }, { preserveState: true, replace: true });
                }
            }
        } catch (e) { }
    }, []);

    const handleColumnsChange = (newCols) => {
        if (newCols === columns) return;
        setColumns(newCols);
        try {
            localStorage.setItem('catalog_grid_columns', newCols.toString());
        } catch (e) { }

        router.get('/movies', {
            q: searchQuery,
            genre: selectedGenre,
            sort: selectedSort,
            columns: newCols,
            per_page: perPageMap[newCols] || 20,
            page: 1,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        router.get('/movies', { q: searchQuery, genre: selectedGenre, sort: selectedSort, columns, per_page: perPageMap[columns] || 20, page: 1 }, { preserveState: true });
    };

    const handleGenreChange = (genre) => {
        setSelectedGenre(genre);
        router.get('/movies', { q: searchQuery, genre, sort: selectedSort, columns, per_page: perPageMap[columns] || 20, page: 1 }, { preserveState: true });
    };

    const handleSortChange = (sort) => {
        setSelectedSort(sort);
        setIsSortOpen(false);
        router.get('/movies', { q: searchQuery, genre: selectedGenre, sort, columns, per_page: perPageMap[columns] || 20, page: 1 }, { preserveState: true });
    };

    const handlePageChange = (page) => {
        router.get('/movies', { q: searchQuery, genre: selectedGenre, sort: selectedSort, columns, per_page: perPageMap[columns] || 20, page }, {
            preserveState: true,
            preserveScroll: false,
        });
        const el = document.getElementById('catalog-section');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const gridColsClass = {
        4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
        6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
    }[columns] || 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

    return (
        <Layout title="Filmler - SineKutu">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 py-10">
                {/* PAGE HEADER */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-2 bg-[#00B074]/10 rounded-xl text-[#00B074]">
                                <Film className="w-5 h-5" />
                            </span>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Film Arşivi <span className="text-slate-900 dark:text-white ml-2 capitalize"> {totalCount || grid.length} Adet</span></p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Sistemdeki film arşivine bu sayfadan erişebilirsiniz</p>
                    </div>

                    {/* Quick Search */}
                    <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Film ismi veya oyuncu ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#00B074] transition-all shadow-sm dark:shadow-none"
                        />
                        <Search className="w-4 h-4 text-slate-400 dark:text-gray-400 absolute left-3.5" />
                    </form>
                </div>


                {/* FILTER TABS & SORT DROPDOWN & POSTERS GRID */}
                <section id="catalog-section" className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-200/60 dark:bg-[#0A0D14]/60 p-3 rounded-2xl border border-slate-300/60 dark:border-white/5">
                        {/* Genre Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar py-1 text-xs font-semibold">
                            {(availableGenres || ['Tümü', 'Aksiyon', 'Komedi', 'Dram', 'Korku', 'Bilim Kurgu']).map((genre) => (
                                <button
                                    key={genre}
                                    onClick={() => handleGenreChange(genre)}
                                    className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all ${selectedGenre === genre
                                        ? 'bg-[#00B074] text-white font-bold shadow-md shadow-[#00B074]/20'
                                        : 'bg-white dark:bg-[#1F2636] text-slate-700 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2A344A] border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none'
                                        }`}
                                >
                                    {genre}
                                </button>
                            ))}
                        </div>

                        {/* Right Controls: Columns Selector + Sort Dropdown */}
                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                            <GridColumnsSelector columns={columns} onChange={handleColumnsChange} />

                            {/* Sort Dropdown */}
                            <div className="relative shrink-0">
                                <button
                                    onClick={() => setIsSortOpen(!isSortOpen)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1F2636] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm dark:shadow-none"
                                >
                                    <span className="text-slate-500 dark:text-gray-400 font-normal">Sıralama:</span>
                                    <span className="text-slate-900 dark:text-white font-bold">{selectedSort}</span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-gray-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isSortOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl py-1 z-30 animate-in fade-in duration-150">
                                        {sortOptions.map((opt) => (
                                            <button
                                                key={opt}
                                                onClick={() => handleSortChange(opt)}
                                                className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${selectedSort === opt ? 'text-[#00B074] font-bold bg-[#00B074]/10' : 'text-slate-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Grid of Movie Posters */}
                    {grid && grid.length > 0 ? (
                        <div className={`grid ${gridColsClass} gap-5`}>
                            {grid.map((item, idx) => (
                                <MovieCard key={item.id || idx} item={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#0A0D14] p-12 rounded-3xl border border-white/5 text-center space-y-3">
                            <Film className="w-10 h-10 text-gray-500 mx-auto" />
                            <h3 className="text-lg font-bold text-white">Film Bulunamadı</h3>
                            <p className="text-xs text-gray-400">Arama veya filtre kriterlerinize uygun film bulunamadı.</p>
                        </div>
                    )}

                    {/* Pagination controls */}
                    <Pagination pagination={pagination} onPageChange={handlePageChange} />
                </section>

            </div>
        </Layout>
    );
}
