import React, { useRef, useState } from 'react';
import { useUpload } from '../Context/UploadContext';
import {
    Upload,
    Pause,
    Play,
    X,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    HardDrive,
    Sparkles,
    FileVideo,
    RefreshCw,
    FolderPlus
} from 'lucide-react';

export default function AdminUploadWidget() {
    const {
        queue,
        addFilesToQueue,
        pauseUpload,
        resumeUpload,
        cancelUpload,
        clearCompleted,
        isWidgetOpen,
        setIsWidgetOpen,
        isUploadModalOpen,
        setIsUploadModalOpen,
        setIsTmdbWizardOpen,
        completedQueue
    } = useUpload();

    const [isExpanded, setIsExpanded] = useState(true);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    if (queue.length === 0 && !isUploadModalOpen) {
        return null;
    }

    const activeCount = queue.filter((i) => i.status === 'uploading' || i.status === 'init').length;
    const pausedCount = queue.filter((i) => i.status === 'paused').length;
    const completedCount = queue.filter((i) => i.status === 'completed').length;
    const errorCount = queue.filter((i) => i.status === 'error').length;
    const totalCount = queue.length;

    // Helper: format bytes into MB/GB
    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    };

    // Helper: format speed (e.g. 14.5 MB/s)
    const formatSpeed = (bps) => {
        if (!bps || bps <= 0) return '0 MB/s';
        if (bps >= 1048576) return (bps / 1048576).toFixed(1) + ' MB/s';
        if (bps >= 1024) return (bps / 1024).toFixed(0) + ' KB/s';
        return bps + ' B/s';
    };

    // Helper: format ETA seconds
    const formatEta = (sec) => {
        if (!sec || sec <= 0) return 'Hesaplanıyor...';
        if (sec >= 3600) {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return `${h}s ${m}dk`;
        }
        if (sec >= 60) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return `${m}dk ${s}sn`;
        }
        return `${sec}sn`;
    };

    // Overall progress percentage
    const totalBytes = queue.reduce((acc, item) => acc + (item.size || 0), 0);
    const totalUploadedBytes = queue.reduce((acc, item) => acc + (item.uploadedBytes || 0), 0);
    const overallProgress = totalBytes > 0 ? Math.min(100, Math.round((totalUploadedBytes / totalBytes) * 100)) : 0;

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            addFilesToQueue(e.target.files);
            setIsUploadModalOpen(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFilesToQueue(e.dataTransfer.files);
            setIsUploadModalOpen(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    return (
        <>
            {/* FLOATING CORNER UPLOADER WIDGET */}
            {isWidgetOpen && queue.length > 0 && (
                <div className="fixed bottom-5 right-5 z-50 w-full max-w-md bg-[#0F1420]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden font-sans transition-all duration-300">

                    {/* Header */}
                    <div className="bg-[#151C2C] px-4 py-3 flex items-center justify-between border-b border-white/[0.08] select-none">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#00B074]/20 border border-[#00B074]/30 flex items-center justify-center text-[#00B074]">
                                <Upload className={`w-4 h-4 ${activeCount > 0 ? 'animate-bounce' : ''}`} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                                    Gateway Dosya Yükleyici
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                        {activeCount > 0 ? `${activeCount} Aktif` : completedCount === totalCount ? 'Tamamlandı' : 'Bekliyor'}
                                    </span>
                                </h3>
                                <p className="text-[10px] text-gray-400">
                                    {completedCount}/{totalCount} dosya tamamlandı (%{overallProgress})
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            {completedQueue.length > 0 && (
                                <button
                                    onClick={() => setIsTmdbWizardOpen(true)}
                                    className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                    title="TMDB Eşleştirme Sihirbazı"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    <span>TMDB ({completedQueue.length})</span>
                                </button>
                            )}

                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                            >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setIsWidgetOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Overall Progress Bar */}
                    <div className="w-full bg-gray-900 h-1">
                        <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1 transition-all duration-300"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>

                    {/* Queue Items List */}
                    {isExpanded && (
                        <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04] no-scrollbar">
                            {queue.map((item) => (
                                <div key={item.id} className="p-3 hover:bg-white/[0.02] transition-all space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <FileVideo className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <div className="truncate">
                                                <p className="text-xs font-semibold text-gray-200 truncate" title={item.filename}>
                                                    {item.filename}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                    <span>{formatSize(item.size)}</span>
                                                    {item.storageBox && (
                                                        <span className="flex items-center gap-1 text-emerald-400">
                                                            <HardDrive className="w-2.5 h-2.5" />
                                                            {item.storageBox.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {item.status === 'uploading' && (
                                                <button
                                                    onClick={() => pauseUpload(item.id)}
                                                    className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/20 transition-all"
                                                    title="Durdur"
                                                >
                                                    <Pause className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            {item.status === 'paused' && (
                                                <button
                                                    onClick={() => resumeUpload(item.id)}
                                                    className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/20 transition-all"
                                                    title="Devam Et"
                                                >
                                                    <Play className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            {item.status === 'completed' && (
                                                <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-bold">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </span>
                                            )}

                                            {item.status === 'error' && (
                                                <button
                                                    onClick={() => resumeUpload(item.id)}
                                                    className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md border border-red-500/20 transition-all"
                                                    title="Yeniden Denetle"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => cancelUpload(item.id)}
                                                className="p-1 text-gray-400 hover:text-red-400 rounded-md hover:bg-white/5 transition-all"
                                                title="İptal Et"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Details */}
                                    {item.status !== 'completed' && (
                                        <div className="space-y-1">
                                            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-200 ${item.status === 'error'
                                                            ? 'bg-red-500'
                                                            : item.status === 'paused'
                                                                ? 'bg-amber-500'
                                                                : 'bg-emerald-400'
                                                        }`}
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                                                <span>
                                                    {item.status === 'init' && 'Oturum Başlatılıyor...'}
                                                    {item.status === 'uploading' && `%${item.progress} - ${formatSpeed(item.speedBps)}`}
                                                    {item.status === 'paused' && 'Durduruldu'}
                                                    {item.status === 'error' && (
                                                        <span className="text-red-400 flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            {item.errorMessage || 'Hata'}
                                                        </span>
                                                    )}
                                                </span>
                                                {item.status === 'uploading' && (
                                                    <span>Kalan: {formatEta(item.etaSeconds)}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="bg-[#121826] px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between text-xs">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 transition-colors"
                        >
                            <FolderPlus className="w-4 h-4" />
                            <span>Yeni Dosya Ekle</span>
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            multiple
                            accept="video/*,.mkv,.mp4,.avi,.mov,.ts,.iso"
                            className="hidden"
                        />

                        {completedCount > 0 && (
                            <button
                                onClick={clearCompleted}
                                className="text-gray-400 hover:text-gray-200 font-medium transition-colors"
                            >
                                Tamamlananları Temizle
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* FULL UPLOAD MODAL FOR DRAG & DROP / FILE SELECTION */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-xl bg-[#0F1420] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Gateway Sunucuya Dosya Yükle</h3>
                                    <p className="text-xs text-gray-400">
                                        Büyük video dosyalarını kesintisiz, dilimlenmiş ve rastgele storage box ünitesine yükleyin.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Drag Drop Zone */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragActive
                                        ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                                        : 'border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-emerald-500/50'
                                    }`}
                            >
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-400 mb-4">
                                    <Upload className="w-7 h-7" />
                                </div>

                                <h4 className="text-sm font-bold text-white mb-1">
                                    Dosyaları Buraya Sürükleyin veya Seçin
                                </h4>
                                <p className="text-xs text-gray-400 mb-4">
                                    Birden fazla dev MKV, MP4, AVI veya TS video dosyasını sıraya ekleyebilirsiniz.
                                </p>

                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20">
                                    Dosya Seç
                                </span>
                            </div>

                        </div>

                        <div className="px-6 py-4 bg-[#121826] border-t border-white/[0.04] flex justify-end">
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl transition-all"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
