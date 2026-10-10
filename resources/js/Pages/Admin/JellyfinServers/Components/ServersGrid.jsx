import React from 'react';
import { 
    Tv, 
    ExternalLink, 
    Copy, 
    Check, 
    Play, 
    Edit2, 
    Trash2, 
    RefreshCw, 
    Users, 
    Globe, 
    Key, 
    Clock, 
    Power,
    CheckCircle2,
    AlertCircle,
    HelpCircle
} from 'lucide-react';

export default function ServersGrid({
    servers = [],
    onTest,
    testingServerId = null,
    onToggle,
    onEdit,
    onDelete,
    copiedId = null,
    onCopy
}) {
    if (servers.length === 0) {
        return (
            <div className="bg-[#0D111A] border border-white/[0.08] rounded-3xl p-12 text-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-4">
                    <Tv className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Henüz Jellyfin Sunucusu Eklenmemiş</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto mb-6">
                    Kullanıcılarınıza medya akışı sağlamak ve yükü sunucular arasında dengeli paylaştırmak için ilk Jellyfin sunucunuzu ekleyin.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {servers.map(server => {
                const isOnline = server.last_status === 'online';
                const isOffline = server.last_status === 'offline';
                const isTesting = testingServerId === server.id;

                return (
                    <div 
                        key={server.id}
                        className={`bg-[#0D111A] border rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 relative group ${
                            server.is_active 
                                ? 'border-white/[0.08] hover:border-emerald-500/40 shadow-xl shadow-black/40' 
                                : 'border-white/[0.04] opacity-75 hover:opacity-100'
                        }`}
                    >
                        {/* TOP SECTION */}
                        <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                                        server.is_active 
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                            : 'bg-gray-800/40 border-white/10 text-gray-400'
                                    }`}>
                                        <Tv className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                                            {server.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {/* Status Badge */}
                                            {isOnline && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Çevrimiçi
                                                </span>
                                            )}
                                            {isOffline && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                                    Erişilemiyor
                                                </span>
                                            )}
                                            {!isOnline && !isOffline && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-white/10">
                                                    Bilinmiyor
                                                </span>
                                            )}

                                            {/* Active / Inactive Badge */}
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                server.is_active 
                                                    ? 'bg-white/5 text-gray-300' 
                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                                {server.is_active ? 'Yük Dengelemede' : 'Devre Dışı'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Toggle Active Button */}
                                <button
                                    onClick={() => onToggle(server)}
                                    title={server.is_active ? 'Sunucuyu Pasifleştir' : 'Sunucuyu Aktifleştir'}
                                    className={`p-2 rounded-xl border transition-all ${
                                        server.is_active 
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                                            : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <Power className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Details List */}
                            <div className="space-y-2 text-xs bg-[#121622]/60 p-3.5 rounded-2xl border border-white/5 mb-4">
                                {/* API URL */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-400 flex items-center gap-1.5 shrink-0">
                                        <Globe className="w-3.5 h-3.5 text-gray-500" /> API:
                                    </span>
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <span className="font-mono text-gray-300 truncate text-[11px]" title={server.url}>
                                            {server.url}
                                        </span>
                                        <button
                                            onClick={() => onCopy(server.url, `url-${server.id}`)}
                                            className="p-1 hover:text-white text-gray-500 transition-colors shrink-0"
                                            title="Kopyala"
                                        >
                                            {copiedId === `url-${server.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Public URL */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-400 flex items-center gap-1.5 shrink-0">
                                        <Tv className="w-3.5 h-3.5 text-gray-500" /> Web Giriş:
                                    </span>
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <a 
                                            href={server.effective_public_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="font-mono text-emerald-400 hover:underline truncate text-[11px] flex items-center gap-1"
                                            title={server.effective_public_url}
                                        >
                                            <span>{server.effective_public_url}</span>
                                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                        </a>
                                    </div>
                                </div>

                                {/* API Key */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-400 flex items-center gap-1.5 shrink-0">
                                        <Key className="w-3.5 h-3.5 text-gray-500" /> API Token:
                                    </span>
                                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-400">
                                        <span>{server.masked_api_key}</span>
                                        <button
                                            onClick={() => onCopy(server.api_key, `key-${server.id}`)}
                                            className="p-1 hover:text-white text-gray-500 transition-colors shrink-0"
                                            title="Tüm Anahtarı Kopyala"
                                        >
                                            {copiedId === `key-${server.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Users & Activity Metric */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-[#121622]/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-400 font-medium">Kullanıcı Sayısı</div>
                                        <div className="text-sm font-bold text-white">{server.cached_users_count} Hesap</div>
                                    </div>
                                </div>

                                <div className="bg-[#121622]/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-400 font-medium">Son Kontrol</div>
                                        <div className="text-xs font-bold text-gray-200 truncate">{server.last_checked_at || 'Yapılmadı'}</div>
                                    </div>
                                </div>
                            </div>

                            {server.notes && (
                                <p className="text-[11px] text-gray-400 italic mb-4 line-clamp-2 bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
                                    "{server.notes}"
                                </p>
                            )}
                        </div>

                        {/* BOTTOM ACTION BUTTONS */}
                        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
                            <button
                                onClick={() => onTest(server)}
                                disabled={isTesting}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                    isTesting 
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse' 
                                        : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                                }`}
                                title="Bağlantıyı Şimdi Test Et"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                                <span>{isTesting ? 'Test Ediliyor' : 'Test Et'}</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                                <a
                                    href={server.effective_public_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-xl text-gray-400 hover:text-emerald-400 hover:bg-white/5 transition-colors"
                                    title="Jellyfin Web İstemcisini Aç"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>

                                <button
                                    onClick={() => onEdit(server)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                    title="Düzenle"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={() => onDelete(server)}
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
    );
}
