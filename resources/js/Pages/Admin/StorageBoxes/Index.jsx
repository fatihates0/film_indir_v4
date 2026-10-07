import React, { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../../../Components/AdminLayout';
import {
    HardDrive,
    Server,
    Wifi,
    AlertTriangle,
    RefreshCw,
    Plus,
    Check,
    X,
    Folder,
    Film,
    Copy,
    Edit3,
    Trash2,
    Search,
    ChevronRight,
    Database,
    Zap,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    Shield,
    Activity
} from 'lucide-react';

export default function StorageBoxesIndex({ boxes = [], stats }) {
    const { auth } = usePage().props;

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingBox, setEditingBox] = useState(null);
    const [deletingBox, setDeletingBox] = useState(null);
    const [explorerBox, setExplorerBox] = useState(null);

    // Explorer State
    const [explorerPath, setExplorerPath] = useState('/');
    const [explorerData, setExplorerData] = useState(null);
    const [isExplorerLoading, setIsExplorerLoading] = useState(false);
    const [explorerSearch, setExplorerSearch] = useState('');

    // Testing State
    const [testingBoxId, setTestingBoxId] = useState(null);
    const [isTestingAll, setIsTestingAll] = useState(false);
    const [testFeedback, setTestFeedback] = useState(null);

    const [copiedHostId, setCopiedHostId] = useState(null);

    // Create/Edit Form State
    const initialFormState = {
        name: '',
        host: '',
        protocol: 'custom_gateway',
        port: 443,
        username: 'gateway',
        password: '',
        use_ssl: true,
        total_capacity_gb: 1000,
        status: 'active',
        notes: '',
        is_default: false,
        test_immediately: true,
    };

    const [formData, setFormData] = useState(initialFormState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Copy to clipboard helper
    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedHostId(id);
        setTimeout(() => setCopiedHostId(null), 2000);
    };

    // Filter boxes
    const filteredBoxes = useMemo(() => {
        return boxes.filter(box => {
            const matchesSearch =
                box.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                box.host.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || box.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [boxes, searchQuery, statusFilter]);

    // Handle single box test
    const handleTestBox = (box) => {
        setTestingBoxId(box.id);
        setTestFeedback(null);

        router.post(`/admin/storage-boxes/${box.id}/test`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setTestingBoxId(null);
            },
            onError: () => {
                setTestingBoxId(null);
            }
        });
    };

    // Handle test all boxes
    const handleTestAll = () => {
        setIsTestingAll(true);
        router.post('/admin/storage-boxes/test-all', {}, {
            preserveScroll: true,
            onFinish: () => setIsTestingAll(false),
        });
    };

    // Handle Form Submit (Create or Edit)
    const handleSubmitForm = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormErrors({});

        if (editingBox) {
            router.put(`/admin/storage-boxes/${editingBox.id}`, formData, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setEditingBox(null);
                    setFormData(initialFormState);
                },
                onError: (errors) => setFormErrors(errors),
                onFinish: () => setIsSubmitting(false),
            });
        } else {
            router.post('/admin/storage-boxes', formData, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setFormData(initialFormState);
                },
                onError: (errors) => setFormErrors(errors),
                onFinish: () => setIsSubmitting(false),
            });
        }
    };

    // Open Edit Modal
    const handleOpenEdit = (box) => {
        setEditingBox(box);
        setFormData({
            name: box.name,
            host: box.host,
            protocol: 'custom_gateway',
            port: box.port || 443,
            username: box.username || 'gateway',
            password: '', // Secret key hidden by default
            use_ssl: box.use_ssl,
            total_capacity_gb: box.total_capacity_gb || 1000,
            status: box.status,
            notes: box.notes || '',
            is_default: box.is_default,
            test_immediately: false,
        });
        setFormErrors({});
        setIsCreateModalOpen(true);
    };

    const [isDeleting, setIsDeleting] = useState(false);

    // Handle Delete Box
    const handleDeleteBox = () => {
        if (!deletingBox) return;
        setIsDeleting(true);
        router.delete(`/admin/storage-boxes/${deletingBox.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingBox(null);
                setIsDeleting(false);
            },
            onError: () => setIsDeleting(false),
            onFinish: () => setIsDeleting(false),
        });
    };

    // Handle Explorer Open
    const handleOpenExplorer = (box, path = '/') => {
        setExplorerBox(box);
        setExplorerPath(path);
        setIsExplorerLoading(true);

        fetch(`/admin/storage-boxes/${box.id}/browse?path=${encodeURIComponent(path)}`)
            .then(res => res.json())
            .then(data => {
                setExplorerData(data.data);
                setIsExplorerLoading(false);
            })
            .catch(() => {
                setIsExplorerLoading(false);
            });
    };

    return (
        <AdminLayout
            title="Depolama Sunucuları"
            subtitle="Nginx Gateway Node sunucularını yönetin, anlık gecikme sürelerini izleyin ve disk kapasitesini denetleyin."
            activeTab="storage-boxes"
            statsSummary={{ total_boxes: stats?.total_boxes || boxes.length }}
            headerActions={
                <button
                    onClick={() => {
                        setFormData(initialFormState);
                        setEditingBox(null);
                        setFormErrors({});
                        setIsCreateModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-[#00B074]/20 hover:shadow-[#00B074]/30"
                >
                    <Plus className="w-4 h-4" />
                    <span>Yeni Sunucu Ekle</span>
                </button>
            }
        >
            <div className="space-y-6">

                {/* STATS CARDS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Toplam Depolama Sunucusu</span>
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                <Server className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-black text-white tracking-tight">{stats?.total_boxes || boxes.length || 0} Node</div>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-1 font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>{stats?.online_boxes || 0} Sunucu Çevrimiçi</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Toplam Kapasite</span>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                <HardDrive className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-black text-white tracking-tight">{stats?.total_capacity_formatted || '0 GB'}</div>
                            <p className="text-xs text-gray-400 mt-1">Tüm gateway sunucularının toplamı</p>
                        </div>
                    </div>

                    <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-sky-500/40 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Kullanılan Alandan</span>
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                                <Database className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-black text-white tracking-tight">{stats?.total_used_formatted || '0 GB'}</div>
                            <p className="text-xs text-sky-400 mt-1 font-medium">Endeksli medya dosyaları</p>
                        </div>
                    </div>

                    <div className="bg-[#0D111A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Boş Depolama</span>
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                <Zap className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-black text-white tracking-tight">{stats?.total_free_formatted || '0 GB'}</div>
                            <p className="text-xs text-purple-400 mt-1 font-medium">Kullanılabilir boş alan</p>
                        </div>
                    </div>
                </div>

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
                        onClick={handleTestAll}
                        disabled={isTestingAll}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-200 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin text-emerald-400' : 'text-gray-400'}`} />
                        <span>{isTestingAll ? 'Bağlantılar Test Ediliyor...' : 'Tüm Node Bağlantılarını Test Et'}</span>
                    </button>
                </div>

                {/* NODES GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredBoxes.map((box) => {
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
                                            onClick={() => handleCopy(`${box.host}:${box.port}`, box.id)}
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
                                        onClick={() => handleTestBox(box)}
                                        disabled={isTesting}
                                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-400' : ''}`} />
                                        <span>{isTesting ? 'Test Ediliyor' : 'Ping Testi'}</span>
                                    </button>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleOpenExplorer(box, '/')}
                                            className="p-2 rounded-xl text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                            title="Dosya Gezgini"
                                        >
                                            <Folder className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleOpenEdit(box)}
                                            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                            title="Düzenle"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeletingBox(box)}
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

                {/* MODAL: CREATE / EDIT STORAGE NODE */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#0D111A] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0A0D14]">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#00B074]/15 text-[#00B074] flex items-center justify-center">
                                        <Server className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-sm font-bold text-white">
                                        {editingBox ? 'Depolama Sunucusunu Düzenle' : 'Yeni Depolama Sunucusu Ekle'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        setEditingBox(null);
                                    }}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">Sunucu Adı *</label>
                                    <input
                                        type="text"
                                        placeholder="Örn: Storage Node #1 (Hetzner FSN)"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-[#07090E] border border-white/[0.08] focus:border-[#00B074] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                                        required
                                    />
                                    {formErrors.name && <p className="text-rose-400 text-[11px] mt-1">{formErrors.name}</p>}
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-gray-300 font-semibold mb-1">Domain / IP Adresi *</label>
                                        <input
                                            type="text"
                                            placeholder="dl3.fatihates.com.tr"
                                            value={formData.host}
                                            onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                                            className="w-full bg-[#07090E] border border-white/[0.08] focus:border-[#00B074] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-gray-500 focus:outline-none transition-colors"
                                            required
                                        />
                                        {formErrors.host && <p className="text-rose-400 text-[11px] mt-1">{formErrors.host}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-gray-300 font-semibold mb-1">Port *</label>
                                        <input
                                            type="number"
                                            value={formData.port}
                                            onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 443 }))}
                                            className="w-full bg-[#07090E] border border-white/[0.08] focus:border-[#00B074] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-300 font-semibold mb-1">
                                        HMAC Secret Key (Gizli Anahtar) *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder={editingBox ? '•••••••• (Değiştirmek istemiyorsanız boş bırakın)' : 'Örn: test1'}
                                            value={formData.password}
                                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                            className="w-full bg-[#07090E] border border-white/[0.08] focus:border-[#00B074] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white font-mono focus:outline-none transition-colors"
                                            required={!editingBox}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-gray-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {formErrors.password && <p className="text-rose-400 text-[11px] mt-1">{formErrors.password}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-gray-300 font-semibold mb-1">Toplam Kapasite (GB)</label>
                                        <input
                                            type="number"
                                            value={formData.total_capacity_gb}
                                            onChange={(e) => setFormData(prev => ({ ...prev, total_capacity_gb: parseInt(e.target.value) || 1000 }))}
                                            className="w-full bg-[#07090E] border border-white/[0.08] focus:border-[#00B074] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none transition-colors"
                                        />
                                    </div>

                                    <div className="flex items-center pt-5">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.use_ssl}
                                                onChange={(e) => setFormData(prev => ({ ...prev, use_ssl: e.target.checked }))}
                                                className="w-4 h-4 rounded bg-[#07090E] border-white/20 text-[#00B074] focus:ring-0"
                                            />
                                            <span className="text-gray-200 font-medium">SSL / HTTPS Kullan</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_default}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                                            className="w-4 h-4 rounded bg-[#07090E] border-white/20 text-[#00B074] focus:ring-0"
                                        />
                                        <span className="text-gray-200 font-medium">Birincil Varsayılan Sunucu Yap</span>
                                    </label>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreateModalOpen(false);
                                            setEditingBox(null);
                                        }}
                                        className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white font-semibold transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold shadow-md shadow-[#00B074]/20 transition-colors flex items-center gap-1.5"
                                    >
                                        {isSubmitting ? 'Kaydediliyor...' : editingBox ? 'Değişiklikleri Kaydet' : 'Sunucu Ekle'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: DELETE CONFIRMATION */}
                {deletingBox && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#0D111A] border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Sunucuyu Sil</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{deletingBox.name} sistemden kaldırılacak.</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Bu depolama sunucusunu kaldırmak istediğinizden emin misiniz? Sunucudaki dosyaların veritabanı bağlantısı kopabilir.
                            </p>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setDeletingBox(null)}
                                    className="px-4 py-2 rounded-xl bg-white/[0.04] text-gray-300 text-xs font-semibold hover:bg-white/[0.08]"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleDeleteBox}
                                    disabled={isDeleting}
                                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50"
                                >
                                    {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </AdminLayout>
    );
}
