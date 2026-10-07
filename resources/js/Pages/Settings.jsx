import React, { useState } from 'react';
import Layout from '../Components/Layout';
import { User, CreditCard, Shield, Laptop, Smartphone, ChevronRight, Globe, Clock, Lock, Key, Mail, Phone } from 'lucide-react';

export default function Settings({ user }) {
    const [activeSection, setActiveSection] = useState('account');
    const [language, setLanguage] = useState('EN, ID');

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* LEFT SIDEBAR NAVIGATION */}
                    <div className="space-y-1">
                        <button 
                            onClick={() => setActiveSection('account')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeSection === 'account' ? 'bg-[#181D2A] text-[#00B074] border border-[#00B074]/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <User className="w-4 h-4" /> Hesap
                        </button>
                        <button 
                            onClick={() => setActiveSection('membership')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeSection === 'membership' ? 'bg-[#181D2A] text-[#00B074] border border-[#00B074]/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <CreditCard className="w-4 h-4" /> Üyelik
                        </button>
                        <button 
                            onClick={() => setActiveSection('security')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeSection === 'security' ? 'bg-[#181D2A] text-[#00B074] border border-[#00B074]/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Shield className="w-4 h-4" /> Güvenlik
                        </button>
                        <button 
                            onClick={() => setActiveSection('devices')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeSection === 'devices' ? 'bg-[#181D2A] text-[#00B074] border border-[#00B074]/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Laptop className="w-4 h-4" /> Cihazlar
                        </button>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="lg:col-span-3 space-y-10">
                        
                        {/* SECTION 1: ACCOUNT */}
                        <div id="account" className="space-y-4">
                            <h2 className="text-base font-bold text-white">Hesap</h2>
                            <div className="bg-[#131722] border border-white/5 rounded-2xl divide-y divide-white/5 text-xs">
                                
                                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span className="font-bold text-white">Profili düzenle</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                </div>

                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Globe className="w-4 h-4 text-gray-400" />
                                        <span className="font-bold text-white">Diller</span>
                                    </div>
                                    <select 
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="bg-[#1B202E] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#00B074]"
                                    >
                                        <option value="TR">Türkçe</option>
                                        <option value="EN, US">English (US)</option>
                                    </select>
                                </div>

                                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <span className="font-bold text-white block">Etkinlikler</span>
                                            <span className="text-[10px] text-gray-400">İzleme geçmişi ve puanlamaları yönetin</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                </div>

                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 opacity-60">
                                        <Lock className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <span className="font-bold text-white block">Ebeveyn kontrolleri</span>
                                            <span className="text-[10px] text-gray-400">Yaş derecelendirmelerini ayarla, içerik engelle</span>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 bg-[#00B074]/20 text-[#00B074] rounded-md text-[10px] font-bold">
                                        Yakında
                                    </span>
                                </div>

                            </div>
                        </div>

                        {/* SECTION 2: MEMBERSHIP */}
                        <div id="membership" className="space-y-4">
                            <h2 className="text-base font-bold text-white">Üyelik</h2>
                            
                            {/* Current Plan Card */}
                            <div className="bg-[#131722] border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-300">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">Temel Plan</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">720p video çözünürlüğü, reklamsız izleme ve daha fazlası.</p>
                                    </div>
                                </div>
                                <button className="px-5 py-2.5 bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs rounded-xl shadow-md">
                                    Premium'a Yükselt
                                </button>
                            </div>

                            <div className="bg-[#131722] border border-white/5 rounded-2xl divide-y divide-white/5 text-xs">
                                <div className="p-4 flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-white block">23 Temmuz 2026</span>
                                        <span className="text-[10px] text-gray-400">Sonraki ödeme</span>
                                    </div>
                                    <span className="text-gray-400 font-mono">Kart ***048</span>
                                </div>

                                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
                                    <span className="font-bold text-white">Ödeme bilgilerini değiştir</span>
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                </div>

                                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
                                    <span className="font-bold text-white">Ödeme geçmişini görüntüle</span>
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: SECURITY */}
                        <div id="security" className="space-y-4">
                            <h2 className="text-base font-bold text-white">Güvenlik</h2>
                            <div className="bg-[#131722] border border-white/5 rounded-2xl divide-y divide-white/5 text-xs">
                                
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Key className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <span className="font-bold text-white block">Şifreyi değiştir</span>
                                            <span className="text-[10px] text-gray-400">Son değişiklik: 8/24</span>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 bg-[#1B202E] text-gray-300 hover:text-white font-semibold rounded-xl">
                                        Şifreyi değiştir
                                    </button>
                                </div>

                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <span className="font-bold text-white block">E-posta</span>
                                            <span className="text-[10px] text-gray-400">ingwiwibowo@gmail.com</span>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 bg-[#1B202E] text-gray-300 hover:text-white font-semibold rounded-xl">
                                        Değiştir
                                    </button>
                                </div>

                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <span className="font-bold text-white block">Cep telefonu</span>
                                            <span className="text-[10px] text-gray-400">+90 532 ******50</span>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 bg-[#1B202E] text-gray-300 hover:text-white font-semibold rounded-xl">
                                        Değiştir
                                    </button>
                                </div>

                            </div>
                        </div>

                        {/* SECTION 4: ACCESS AND DEVICES */}
                        <div id="devices" className="space-y-4">
                            <h2 className="text-base font-bold text-white">Erişim ve cihazlar</h2>
                            <div className="bg-[#131722] border border-white/5 rounded-2xl divide-y divide-white/5 text-xs">
                                
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Laptop className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <span className="font-bold text-white block">Macbook Air M2 - Irvan (Aktif)</span>
                                            <span className="text-[10px] text-gray-400">İstanbul, Türkiye</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-gray-500 text-[10px]">Dünden beri</span>
                                        <button className="px-4 py-2 bg-[#1B202E] text-gray-300 hover:text-white font-semibold rounded-xl">
                                            Oturumu kapat
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <span className="font-bold text-white block">iPhone 13</span>
                                            <span className="text-[10px] text-gray-400">İstanbul, Türkiye</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-gray-500 text-[10px]">23 Haziran 2026'dan beri</span>
                                        <button className="px-4 py-2 bg-[#1B202E] text-gray-300 hover:text-white font-semibold rounded-xl">
                                            Oturumu kapat
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 flex items-center justify-between opacity-50">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <span className="font-bold text-white block">Samsung A-53</span>
                                            <span className="text-[10px] text-gray-400">Ankara, Türkiye</span>
                                        </div>
                                    </div>
                                    <span className="text-gray-500 text-[10px]">Bağlı değil</span>
                                </div>

                                <div className="p-4 flex items-center justify-between opacity-50">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <span className="font-bold text-white block">iPhone 15 Pro</span>
                                            <span className="text-[10px] text-gray-400">İzmir, Türkiye</span>
                                        </div>
                                    </div>
                                    <span className="text-gray-500 text-[10px]">Bağlı değil</span>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Layout>
    );
}
