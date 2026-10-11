import React from 'react';
import { X, Tv, Key, Globe, Link as LinkIcon, FileText, CheckCircle2 } from 'lucide-react';

export default function CreateEditServerModal({
    isOpen,
    onClose,
    server = null,
    formData,
    setFormData,
    formErrors = {},
    onSubmit,
    isSubmitting = false
}) {
    if (!isOpen) return null;

    const isEdit = Boolean(server);
    const isEmby = formData.type === 'emby';

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0B0F19] border border-white/[0.12] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl shadow-black/80 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                            isEmby
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                        }`}>
                            <Tv className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">
                                {isEdit 
                                    ? (isEmby ? 'Emby Sunucusunu Düzenle' : 'Jellyfin Sunucusunu Düzenle')
                                    : (isEmby ? 'Yeni Emby Sunucusu Ekle' : 'Yeni Jellyfin Sunucusu Ekle')
                                }
                            </h3>
                            <p className="text-xs text-gray-400">
                                Medya akışı ve kullanıcı yük dengelemesi için sunucu parametreleri
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {/* Server Type Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            Sunucu Türü / Altyapısı <span className="text-rose-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleChange('type', 'jellyfin')}
                                className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                                    !isEmby
                                        ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30'
                                        : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.06]'
                                }`}
                            >
                                <span className={`w-2.5 h-2.5 rounded-full ${!isEmby ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'}`} />
                                <span>Jellyfin Media Server</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleChange('type', 'emby')}
                                className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                                    isEmby
                                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                                        : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.06]'
                                }`}
                            >
                                <span className={`w-2.5 h-2.5 rounded-full ${isEmby ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                                <span>Emby Server</span>
                            </button>
                        </div>
                    </div>

                    {/* Server Name */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            Sunucu Tanımı / Adı <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                            <Tv className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => handleChange('name', e.target.value)}
                                placeholder={isEmby ? 'Örn: Ubuntu Emby Node-01' : 'Örn: Frankfurt Jellyfin Node-01'}
                                required
                                className="w-full bg-[#121622] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60"
                            />
                        </div>
                        {formErrors.name && (
                            <p className="text-xs text-rose-400 mt-1">{formErrors.name}</p>
                        )}
                    </div>

                    {/* API URL */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            API Erişimi URL <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                            <Globe className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="url"
                                value={formData.url}
                                onChange={e => handleChange('url', e.target.value)}
                                placeholder={isEmby ? 'http://204.168.224.225:8097 veya https://emby.domain.com' : 'http://192.168.1.100:8096 veya https://jellyfin.domain.com'}
                                required
                                className="w-full bg-[#121622] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60"
                            />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Laravel'in doğrudan API komutları göndereceği iç/dış adres.</p>
                        {formErrors.url && (
                            <p className="text-xs text-rose-400 mt-1">{formErrors.url}</p>
                        )}
                    </div>

                    {/* Public URL (Optional) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            Kullanıcı Genel Giriş URL (Opsiyonel)
                        </label>
                        <div className="relative">
                            <LinkIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="url"
                                value={formData.public_url || ''}
                                onChange={e => handleChange('public_url', e.target.value)}
                                placeholder="https://izle.domain.com (Boş bırakılırsa API URL kullanılır)"
                                className="w-full bg-[#121622] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60"
                            />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Kullanıcıların tarayıcıda veya mobil/TV uygulamasında yazacağı web adresi.</p>
                        {formErrors.public_url && (
                            <p className="text-xs text-rose-400 mt-1">{formErrors.public_url}</p>
                        )}
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            {isEmby ? 'Emby Admin API Anahtarı' : 'Jellyfin Admin API Anahtarı'} <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                            <Key className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={formData.api_key}
                                onChange={e => handleChange('api_key', e.target.value)}
                                placeholder={isEmby ? 'Emby Yönetim Paneli > Gelişmiş > API Anahtarları' : 'Jellyfin Kontrol Paneli > Gelişmiş > API Anahtarları'}
                                required
                                className="w-full bg-[#121622] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60"
                            />
                        </div>
                        {formErrors.api_key && (
                            <p className="text-xs text-rose-400 mt-1">{formErrors.api_key}</p>
                        )}
                    </div>

                    {/* Is Active & Test immediately */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121622]/60 p-3.5 rounded-2xl border border-white/5">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-200">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={e => handleChange('is_active', e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-500 bg-white/10 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            <span>Sunucu Aktif (Yük Dengelemeye Dahil)</span>
                        </label>

                        {!isEdit && (
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-emerald-400">
                                <input
                                    type="checkbox"
                                    checked={formData.test_immediately}
                                    onChange={e => handleChange('test_immediately', e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-500 bg-white/10 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                                <span>Kaydederken Bağlantıyı Test Et</span>
                            </label>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            Yönetici Notları (Opsiyonel)
                        </label>
                        <div className="relative">
                            <FileText className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                            <textarea
                                value={formData.notes || ''}
                                onChange={e => handleChange('notes', e.target.value)}
                                rows={2}
                                placeholder="Donanım bilgisi, bant genişliği veya lokasyon açıklamaları..."
                                className="w-full bg-[#121622] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60"
                            />
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isSubmitting ? 'Kaydediliyor...' : (isEdit ? 'Güncellemeleri Kaydet' : 'Sunucuyu Ekle')}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
