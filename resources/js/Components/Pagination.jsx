import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Calculates a fixed 7-item pagination window for stability and clean aesthetics.
 * Returns array with numbers and unique string keys for ellipses ('...left', '...right').
 */
export function getPaginationItems(currentPage, lastPage) {
    if (!lastPage || lastPage <= 1) return [];

    // If total pages are 7 or fewer, show all
    if (lastPage <= 7) {
        return Array.from({ length: lastPage }, (_, i) => i + 1);
    }

    // Near start
    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, '...right', lastPage];
    }

    // Near end
    if (currentPage >= lastPage - 3) {
        return [1, '...left', lastPage - 4, lastPage - 3, lastPage - 2, lastPage - 1, lastPage];
    }

    // Somewhere in the middle
    return [1, '...left', currentPage - 1, currentPage, currentPage + 1, '...right', lastPage];
}

export default function Pagination({ pagination, onPageChange, className = '' }) {
    if (!pagination || pagination.last_page <= 1) {
        return null;
    }

    const { current_page, last_page, total } = pagination;
    const items = getPaginationItems(current_page, last_page);

    const handleEllipsisClick = (type) => {
        if (type === '...left') {
            onPageChange(Math.max(1, current_page - 5));
        } else if (type === '...right') {
            onPageChange(Math.min(last_page, current_page + 5));
        }
    };

    return (
        <div className={`flex flex-col md:flex-row items-center justify-between gap-4 py-6 border-t border-slate-200 dark:border-white/5 select-none ${className}`}>
            {/* Left: Summary Info */}
            <div className="text-xs text-slate-500 dark:text-gray-400 font-medium flex items-center gap-1.5 order-2 md:order-1 min-w-0 md:min-w-[140px]">
                {total ? (
                    <span>
                        Toplam <strong className="text-slate-900 dark:text-white font-bold">{total.toLocaleString('tr-TR')}</strong> içerik
                    </span>
                ) : null}
            </div>

            {/* Center: Main Pagination Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 order-1 md:order-2">
                {/* First Page */}
                <button
                    type="button"
                    onClick={() => onPageChange(1)}
                    disabled={current_page === 1}
                    title="İlk Sayfa"
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/5 transition-all ${current_page === 1
                            ? 'opacity-30 cursor-not-allowed bg-transparent'
                            : 'bg-white dark:bg-[#0A0D14] hover:bg-slate-100 dark:hover:bg-[#1C2233] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/10 active:scale-95 shadow-sm dark:shadow-none'
                        }`}
                >
                    <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous Page */}
                <button
                    type="button"
                    onClick={() => onPageChange(current_page - 1)}
                    disabled={current_page === 1}
                    title="Önceki Sayfa"
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/5 transition-all ${current_page === 1
                            ? 'opacity-30 cursor-not-allowed bg-transparent'
                            : 'bg-white dark:bg-[#0A0D14] hover:bg-slate-100 dark:hover:bg-[#1C2233] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/10 active:scale-95 shadow-sm dark:shadow-none'
                        }`}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Numbers & Ellipses */}
                {items.map((item) => {
                    if (typeof item === 'string') {
                        return (
                            <button
                                key={item}
                                type="button"
                                onClick={() => handleEllipsisClick(item)}
                                title={item === '...left' ? '5 sayfa geri git' : '5 sayfa ileri git'}
                                className="w-9 h-9 flex items-center justify-center rounded-xl text-xs font-semibold text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                            >
                                <span className="group-hover:hidden">···</span>
                                <span className="hidden group-hover:inline text-[10px] text-[#00B074] font-bold">
                                    {item === '...left' ? '-5' : '+5'}
                                </span>
                            </button>
                        );
                    }

                    const isActive = current_page === item;
                    return (
                        <button
                            key={item}
                            type="button"
                            onClick={() => onPageChange(item)}
                            className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${isActive
                                    ? 'bg-[#00B074] text-white shadow-lg shadow-[#00B074]/25 scale-105 pointer-events-none'
                                    : 'bg-white dark:bg-[#0A0D14] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C2233] border border-slate-200 dark:border-white/5 active:scale-95 shadow-sm dark:shadow-none'
                                }`}
                        >
                            {item}
                        </button>
                    );
                })}

                {/* Next Page */}
                <button
                    type="button"
                    onClick={() => onPageChange(current_page + 1)}
                    disabled={current_page === last_page}
                    title="Sonraki Sayfa"
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/5 transition-all ${current_page === last_page
                            ? 'opacity-30 cursor-not-allowed bg-transparent'
                            : 'bg-white dark:bg-[#0A0D14] hover:bg-slate-100 dark:hover:bg-[#1C2233] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/10 active:scale-95 shadow-sm dark:shadow-none'
                        }`}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                    type="button"
                    onClick={() => onPageChange(last_page)}
                    disabled={current_page === last_page}
                    title="Son Sayfa"
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/5 transition-all ${current_page === last_page
                            ? 'opacity-30 cursor-not-allowed bg-transparent'
                            : 'bg-white dark:bg-[#0A0D14] hover:bg-slate-100 dark:hover:bg-[#1C2233] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/10 active:scale-95 shadow-sm dark:shadow-none'
                        }`}
                >
                    <ChevronsRight className="w-4 h-4" />
                </button>
            </div>

            {/* Right Spacer to keep pagination controls centered */}
            <div className="hidden md:block min-w-0 md:min-w-[140px] order-3" />
        </div>
    );
}
