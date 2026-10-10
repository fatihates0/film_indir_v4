import React, { useState } from 'react';
import { Server, X, Zap, Copy, Check, Eye, EyeOff } from 'lucide-react';

export default function CreateEditBoxModal({
    isOpen,
    editingBox,
    onClose,
    formData,
    setFormData,
    formErrors = {},
    isSubmitting = false,
    onSubmit
}) {
    if (!isOpen) return null;

    const [showPassword, setShowPassword] = useState(false);
    const [copiedSecret, setCopiedSecret] = useState(false);

    // Generate random 64-character hex HMAC secret key
    const generateRandomSecret = () => {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        const hexSecret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        setFormData(prev => ({ ...prev, password: hexSecret }));
        setShowPassword(true);
        navigator.clipboard.writeText(hexSecret);
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2500);
    };

    const handleCopySecret = () => {
        if (!formData.password) return;
        navigator.clipboard.writeText(formData.password);
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
    };

    return (
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
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
                    <div>
                        <label className="block text-gray-300 font-semibold mb-1">Sunucu Adı *</label>
                        <input
                            type="text"
                            placeholder="Örn: Storage Gateway Node #1"
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
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-gray-300 font-semibold">
                                HMAC Secret Key (Gizli Anahtar) *
                            </label>
                            <div className="flex items-center gap-2">
                                {formData.password && (
                                    <button
                                        type="button"
                                        onClick={handleCopySecret}
                                        className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-medium transition-all flex items-center gap-1"
                                    >
                                        {copiedSecret ? <Check className="w-3 dot-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        <span>{copiedSecret ? 'Kopyalandı!' : 'Kopyala'}</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={generateRandomSecret}
                                    className="px-2.5 py-0.5 rounded-lg bg-[#00B074]/15 hover:bg-[#00B074]/25 text-[#00B074] hover:text-emerald-300 text-[11px] font-bold transition-all flex items-center gap-1 border border-[#00B074]/30"
                                >
                                    <Zap className="w-3 h-3" />
                                    <span>Hızlı Anahtar Üret</span>
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder={editingBox ? '•••••••• (Değiştirmek istemiyorsanız boş bırakın)' : 'Hızlı anahtar üretin veya girin'}
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full bg-[#07090E] border border-white/[0.08] focus:border-[#00B074] rounded-xl pl-3.5 pr-16 py-2.5 text-xs text-white font-mono focus:outline-none transition-colors"
                                required={!editingBox}
                            />
                            <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                                {formData.password && (
                                    <button
                                        type="button"
                                        onClick={handleCopySecret}
                                        title="Panoya Kopyala"
                                        className="p-1 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? 'Gizle' : 'Göster'}
                                    className="p-1 text-gray-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                        {formErrors.password && <p className="text-rose-400 text-[11px] mt-1">{formErrors.password}</p>}
                        <p className="text-[11px] text-gray-400 mt-1">
                            Storage Gateway kurulurken sunucudaki <code className="text-emerald-400 font-mono">STORAGE_SECRET_KEY</code> değişkenine bu gizli anahtarı yapıştırın.
                        </p>
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
                            onClick={onClose}
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
    );
}
