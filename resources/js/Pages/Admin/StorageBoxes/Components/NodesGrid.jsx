import React from 'react';
import {
    Search,
    RefreshCw,
    Lock,
    Copy,
    Check,
    Wifi,
    Edit3,
    Trash2
} from 'lucide-react';

export default function NodesGrid({
    boxes = [],
    searchQuery = '',
    setSearchQuery,
    isTestingAll = false,
    onTestAll,
    testingBoxId = null,
    onTestBox,
    copiedHostId = null,
    onCopy,
    onOpenEdit,
    onSetDeletingBox
}) {
    return (
        <div className="space-y-5">
            {/* SEARCH & REFRESH TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0D111A] p-4 rounded-2xl border border-white/[0.08]">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Sunucu adı veya IP adresi ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#07090E] border border-white/[0.08] focus:border-[#00B074] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                    />
                </div>

                <button
                    onClick={onTestAll}
                    disabled={isTestingAll}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-200 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin text-emerald-400' : 'text-gray-400'}`} />
                    <span>{isTestingAll ? 'Bağlantılar Test Ediliyor...' : 'Tüm Node Bağlantılarını Test Et'}</span>
                </button>
            </div>

            {/* NODES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {boxes.map((box) => {
                    const isTesting = testingBoxId === box.id;

                    return (
                        <div
                            key={box.id}
                            className={`bg-[#0D111A] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-white/20 shadow-xl ${box.is_default ? 'border-[#00B074]/40 shadow-emerald-950/20' : 'border-white/[0.08]'
                                }`}
                        >
                            {/* CARD HEADER */}
                            <div className="p-5 border-b border-white/[0.06] space-y-3 bg-[#0A0D14]/50">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-bold text-white tracking-tight">
                                                {box.name}
                                            </h3>
                                            {box.is_default && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00B074]/20 text-[#00B074] border border-[#00B074]/40">
                                                    Varsayılan Node
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-1">
                                            Gateway Storage
                                        </p>
                                    </div>

                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${box.use_ssl ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>
                                        <Lock className="w-2.5 h-2.5" />
                                        <span>{box.use_ssl ? 'HTTPS' : 'HTTP'}</span>
                                    </span>
                                </div>

                                {/* Host Info Box */}
                                <div className="bg-[#07090E] rounded-xl p-2.5 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                                    <div className="truncate mr-2 text-gray-300">
                                        <span>{box.host}</span>
                                        <span className="text-gray-500">:{box.port}</span>
                                    </div>
                                    <button
                                        onClick={() => onCopy(`${box.host}:${box.port}`, box.id)}
                                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                                        title="Kopyala"
                                    >
                                        {copiedHostId === box.id ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* CARD BODY */}
                            <div className="p-5 space-y-4 flex-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${box.connection_badge}`}>
                                        {box.connection_status === 'online' && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        )}
                                        <span>{box.connection_label}</span>
                                    </span>

                                    {box.latency_ms !== null && (
                                        <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                                            <Wifi className="w-3 h-3 text-emerald-400" />
                                            <span>{box.latency_ms} ms</span>
                                        </span>
                                    )}
                                </div>

                                {/* Capacity Progress Bar */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-mono">
                                        <span className="text-gray-400">Kullanılan: <strong className="text-white">{box.formatted_used || '0 GB'}</strong></span>
                                        <span className="text-gray-400">Boş: <strong className="text-emerald-400">{box.formatted_free || '0 GB'}</strong></span>
                                    </div>
                                    <div className="w-full h-2.5 bg-[#07090E] rounded-full overflow-hidden border border-white/[0.06]">
                                        <div
                                            className={`h-full transition-all duration-500 rounded-full ${box.used_percentage > 90 ? 'bg-rose-500' : box.used_percentage > 75 ? 'bg-amber-500' : 'bg-[#00B074]'
                                                }`}
                                            style={{ width: `${Math.min(100, box.used_percentage || 0)}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                                        <span>Kapasite: {box.formatted_total}</span>
                                        <span className="font-semibold text-gray-300">%{box.used_percentage || 0} Doluluk</span>
                                    </div>
                                </div>
                            </div>

                            {/* CARD FOOTER ACTIONS */}
                            <div className="px-5 py-3.5 bg-[#07090E] border-t border-white/[0.06] flex items-center justify-between gap-2">
                                <button
                                    onClick={() => onTestBox(box)}
                                    disabled={isTesting}
                                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-400' : ''}`} />
                                    <span>{isTesting ? 'Test Ediliyor' : 'Ping Testi'}</span>
                                </button>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onOpenEdit(box)}
                                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                        title="Düzenle"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onSetDeletingBox(box)}
                                        className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                        title="Sil"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
