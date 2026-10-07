import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { Eye, EyeOff, Check, X } from 'lucide-react';

export default function AuthModal({ isOpen, mode = 'login', onClose, onSwitchMode }) {
    const [showPassword, setShowPassword] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(true);

    // Login Form
    const loginForm = useForm({
        email: '',
        password: '',
        remember: false,
    });

    // Register Form
    const registerForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleLoginSubmit = (e) => {
        e.preventDefault();
        loginForm.post('/login', {
            onSuccess: () => {
                loginForm.reset();
                onClose();
            },
        });
    };

    const handleRegisterSubmit = (e) => {
        e.preventDefault();
        if (!agreeTerms) {
            alert('Lütfen kullanım koşullarını kabul ediniz.');
            return;
        }
        registerForm.post('/register', {
            onSuccess: () => {
                registerForm.reset();
                onClose();
            },
        });
    };

    const handleForgotSubmit = (e) => {
        e.preventDefault();
        alert('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        onClose();
    };

    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-white dark:bg-[#13161F] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-900 dark:text-white transition-colors"
            >
                
                {/* Cancel Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-300 bg-slate-100 hover:bg-slate-200 dark:bg-[#222736] dark:hover:bg-[#2C3347] rounded-lg transition-colors"
                >
                    İptal
                </button>

                {/* LOGIN MODE */}
                {mode === 'login' && (
                    <div>
                        <div className="mb-2">
                            <img src="/logo.png" alt="SineKutu" className="h-8 w-auto object-contain" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-6">Hesabınıza giriş yapın</p>

                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">E-posta</label>
                                <input 
                                    type="email"
                                    value={loginForm.data.email}
                                    onChange={(e) => loginForm.setData('email', e.target.value)}
                                    placeholder="E-posta adresinizi girin"
                                    className={`w-full bg-slate-100 dark:bg-[#0B0D14] border ${loginForm.errors.email ? 'border-red-500' : 'border-slate-300 dark:border-white/10'} focus:border-[#00B074] rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none transition-colors`}
                                />
                                {loginForm.errors.email && (
                                    <p className="text-red-500 dark:text-red-400 text-[11px] mt-1">{loginForm.errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">Şifre</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        value={loginForm.data.password}
                                        onChange={(e) => loginForm.setData('password', e.target.value)}
                                        placeholder="Şifreniz"
                                        className={`w-full bg-slate-100 dark:bg-[#0B0D14] border ${loginForm.errors.password ? 'border-red-500' : 'border-slate-300 dark:border-white/10'} focus:border-[#00B074] rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none transition-colors`}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-3.5 text-[#00B074] hover:text-[#009663]"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {loginForm.errors.password && (
                                    <p className="text-red-500 dark:text-red-400 text-[11px] mt-1">{loginForm.errors.password}</p>
                                )}
                            </div>

                            <div className="text-center pt-1">
                                <button 
                                    type="button" 
                                    onClick={() => onSwitchMode('forgot')}
                                    className="text-xs font-semibold text-[#00B074] hover:underline"
                                >
                                    Şifremi unuttum
                                </button>
                            </div>

                            <button 
                                type="submit"
                                disabled={loginForm.processing}
                                className="w-full py-3 mt-4 text-xs font-semibold text-white bg-[#00B074] hover:bg-[#009663] disabled:opacity-50 rounded-xl transition-all duration-200 shadow-lg shadow-[#00B074]/20"
                            >
                                {loginForm.processing ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                            </button>
                        </form>

                        <p className="text-xs text-slate-500 dark:text-gray-400 text-center mt-6">
                            Hesabınız yok mu?{' '}
                            <button 
                                onClick={() => onSwitchMode('signup')}
                                className="font-semibold text-[#00B074] hover:underline"
                            >
                                Kayıt Ol
                            </button>
                        </p>
                    </div>
                )}

                {/* SIGNUP MODE */}
                {mode === 'signup' && (
                    <div>
                        <div className="mb-2">
                            <img src="/logo.png" alt="SineKutu" className="h-8 w-auto object-contain" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-6">Tüm özelliklerden yararlanmak için kayıt olun</p>

                        <form onSubmit={handleRegisterSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">Kullanıcı Adı / Ad Soyad</label>
                                <input 
                                    type="text"
                                    value={registerForm.data.name}
                                    onChange={(e) => registerForm.setData('name', e.target.value)}
                                    placeholder="Adınız veya kullanıcı adınız"
                                    className={`w-full bg-slate-100 dark:bg-[#0B0D14] border ${registerForm.errors.name ? 'border-red-500' : 'border-slate-300 dark:border-white/10'} focus:border-[#00B074] rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none`}
                                />
                                {registerForm.errors.name && (
                                    <p className="text-red-500 dark:text-red-400 text-[11px] mt-1">{registerForm.errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">E-posta</label>
                                <input 
                                    type="email"
                                    value={registerForm.data.email}
                                    onChange={(e) => registerForm.setData('email', e.target.value)}
                                    placeholder="E-posta adresiniz"
                                    className={`w-full bg-slate-100 dark:bg-[#0B0D14] border ${registerForm.errors.email ? 'border-red-500' : 'border-slate-300 dark:border-white/10'} focus:border-[#00B074] rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none`}
                                />
                                {registerForm.errors.email && (
                                    <p className="text-red-500 dark:text-red-400 text-[11px] mt-1">{registerForm.errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">Şifre</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        value={registerForm.data.password}
                                        onChange={(e) => registerForm.setData('password', e.target.value)}
                                        placeholder="••••••••••••"
                                        className={`w-full bg-slate-100 dark:bg-[#0B0D14] border ${registerForm.errors.password ? 'border-red-500' : 'border-slate-300 dark:border-white/10'} focus:border-[#00B074] rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none`}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-3.5 text-slate-400 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {registerForm.errors.password && (
                                    <p className="text-red-500 dark:text-red-400 text-[11px] mt-1">{registerForm.errors.password}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setAgreeTerms(!agreeTerms)}
                                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${agreeTerms ? 'bg-[#00B074] text-white' : 'border border-slate-400 dark:border-gray-600'}`}
                                >
                                    {agreeTerms && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                                <span className="text-xs text-slate-600 dark:text-gray-400">
                                    <a href="#" className="text-[#00B074] underline">Gizlilik Politikası</a> ve <a href="#" className="text-[#00B074] underline">Kullanım Koşulları</a>'nı kabul ediyorum
                                </span>
                            </div>

                            <button 
                                type="submit"
                                disabled={registerForm.processing}
                                className="w-full py-3 mt-2 text-xs font-bold text-white bg-[#00B074] hover:bg-[#009663] disabled:opacity-50 rounded-xl shadow-lg shadow-[#00B074]/30 transition-all"
                            >
                                {registerForm.processing ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
                            </button>
                        </form>

                        <p className="text-xs text-slate-500 dark:text-gray-400 text-center mt-6">
                            Zaten bir hesabınız var mı?{' '}
                            <button 
                                onClick={() => onSwitchMode('login')}
                                className="font-semibold text-[#00B074] hover:underline"
                            >
                                Giriş Yap
                            </button>
                        </p>
                    </div>
                )}

                {/* FORGOT PASSWORD MODE */}
                {mode === 'forgot' && (
                    <div className="py-4 text-center">
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">Şifrenizi mi unuttunuz</h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-6">Şifrenizi sıfırlamanız için size bir bağlantı göndereceğiz.</p>

                        <form onSubmit={handleForgotSubmit} className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">E-posta</label>
                                <input 
                                    type="email"
                                    placeholder="E-posta adresiniz"
                                    required
                                    className="w-full bg-slate-100 dark:bg-[#0B0D14] border border-slate-300 dark:border-white/10 focus:border-[#00B074] rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none"
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-3 mt-2 text-xs font-semibold text-white bg-[#00B074] hover:bg-[#009663] rounded-xl transition-all shadow-lg shadow-[#00B074]/20"
                            >
                                Gönder
                            </button>
                        </form>

                        <p className="text-xs text-slate-500 dark:text-gray-400 text-center mt-6">
                            Şifrenizi hatırladınız mı?{' '}
                            <button 
                                onClick={() => onSwitchMode('login')}
                                className="font-semibold text-[#00B074] hover:underline"
                            >
                                Giriş Yap
                            </button>
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}
