import React from 'react';

export default function GridColumnsSelector({ columns = 5, onChange, className = '' }) {
    const options = [
        { cols: 4, perPage: 16, label: '4' },
        { cols: 5, perPage: 20, label: '5' },
        { cols: 6, perPage: 24, label: '6' },
    ];

    return (
        <div className={`flex items-center bg-slate-200/80 dark:bg-[#1F2636] border border-slate-300/60 dark:border-white/10 rounded-xl p-1 gap-1 ${className}`}>
            <span className="text-[11px] text-slate-500 dark:text-gray-400 px-2 font-medium hidden sm:inline select-none">
                Sütun:
            </span>
            {options.map((opt) => {
                const isActive = columns === opt.cols;
                return (
                    <button
                        key={opt.cols}
                        type="button"
                        onClick={() => onChange(opt.cols)}
                        title={`${opt.cols} Sütun (${opt.perPage} içerik)`}
                        className={`min-w-[28px] px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                            isActive
                                ? 'bg-[#00B074] text-white shadow-sm shadow-[#00B074]/30'
                                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
