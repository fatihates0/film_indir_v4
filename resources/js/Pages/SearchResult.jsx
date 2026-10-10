import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '../Components/Layout';
import { Search } from 'lucide-react';
import Pagination from '../Components/Pagination';
import MovieCard from '../Components/MovieCard';

export default function SearchResult({ query = '', results = [], pagination = null }) {
    const [searchQuery, setSearchQuery] = useState(query || '');

    useEffect(() => {
        setSearchQuery(query || '');
    }, [query]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (trimmed) {
            router.get('/search', { q: trimmed, page: 1 }, { preserveState: true });
        } else {
            router.get('/search', {}, { preserveState: true });
        }
    };

    const handlePageChange = (page) => {
        router.get('/search', { q: searchQuery, page }, {
            preserveState: true,
            preserveScroll: false,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Layout title={query ? `"${query}" için sonuçlar - SineKutu` : 'Arama Sonuçları - SineKutu'}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header: Result for "..." and Search input */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
                    <div>
                        <h1 className="text-2xl sm:text-xl font-extrabold text-white tracking-tight">
                            {query ? (
                                <><span className="text-white">"{query}"</span> için sonuçlar
                                    {pagination?.total ? (
                                        <span className="text-xs text-gray-400 mt-1">
                                            <strong className="ml-3 text-white font-semibold">{pagination.total}</strong> içerik
                                        </span>
                                    ) : null}
                                </>
                            ) : (
                                'Arama Sonuçları'
                            )}
                        </h1>
                    </div>

                    {/* Search Input Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80 md:w-96">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Film veya dizi ara..."
                            className="w-full bg-[#0A0D14] border border-white/10 rounded-2xl pl-4 pr-11 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00B074] transition-all"
                        />
                        <button
                            type="submit"
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            title="Ara"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                    </form>
                </div>

                {/* Grid of Posters (Identical design to Movies.jsx and Series.jsx) */}
                {results && results.length > 0 ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                            {results.map((item, idx) => (
                                <MovieCard key={item.id || idx} item={item} />
                            ))}
                        </div>

                        {/* Pagination component */}
                        <Pagination pagination={pagination} onPageChange={handlePageChange} />
                    </div>
                ) : (
                    <div className="bg-[#0A0D14] p-16 rounded-3xl border border-white/5 text-center space-y-4 my-8">
                        <Search className="w-12 h-12 text-gray-500 mx-auto" />
                        <h2 className="text-xl font-bold text-white">Sonuç Bulunamadı</h2>
                        <p className="text-sm text-gray-400 max-w-md mx-auto">
                            {query
                                ? `"${query}" aramanıza uygun içerik bulunamadı. Lütfen farklı anahtar kelimeler ile aramayı deneyin.`
                                : 'Aramak istediğiniz film veya dizinin adını yukarıdaki alana yazabilirsiniz.'}
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
