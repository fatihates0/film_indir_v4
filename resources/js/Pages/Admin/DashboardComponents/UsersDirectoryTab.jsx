import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

export default function UsersDirectoryTab({ recentUsers = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'user'
    const [planFilter, setPlanFilter] = useState('all');

    // Filtered users memoized locally
    const filteredUsers = useMemo(() => {
        return recentUsers.filter(u => {
            const matchesSearch = 
                (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' || u.role === roleFilter;
            const matchesPlan = planFilter === 'all' || (planFilter === 'premium' ? u.plan !== 'free' : u.plan === 'free');
            return matchesSearch && matchesRole && matchesPlan;
        });
    }, [recentUsers, searchQuery, roleFilter, planFilter]);

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Directory Controls */}
            <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xl shadow-black/20">
                
                {/* Search input */}
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input 
                        type="text"
                        placeholder="Kullanıcı adı veya e-posta ile ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#06080E] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-white"
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-[#06080E] p-1 rounded-xl border border-white/[0.08] text-xs">
                        <button 
                            onClick={() => setRoleFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors font-medium ${roleFilter === 'all' ? 'bg-[#00B074] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Tüm Roller
                        </button>
                        <button 
                            onClick={() => setRoleFilter('admin')}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors font-medium ${roleFilter === 'admin' ? 'bg-[#00B074] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Admin
                        </button>
                        <button 
                            onClick={() => setRoleFilter('user')}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors font-medium ${roleFilter === 'user' ? 'bg-[#00B074] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Kullanıcı
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-[#06080E] p-1 rounded-xl border border-white/[0.08] text-xs">
                        <button 
                            onClick={() => setPlanFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors font-medium ${planFilter === 'all' ? 'bg-[#00B074] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Tüm Paketler
                        </button>
                        <button 
                            onClick={() => setPlanFilter('premium')}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors font-medium ${planFilter === 'premium' ? 'bg-[#00B074] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Ücretli
                        </button>
                    </div>
                </div>

            </div>

            {/* Full Users Table */}
            <div className="bg-[#0A0D15] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                <div className="px-6 py-3.5 border-b border-white/[0.06] flex items-center justify-between text-xs text-gray-400">
                    <span>Eşleşen <strong className="text-emerald-400 font-mono">{filteredUsers.length}</strong> hesap listeleniyor</span>
                    <span>Toplam: {recentUsers.length} hesap</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="text-[11px] uppercase tracking-wider text-gray-400 bg-white/[0.02] border-b border-white/[0.04]">
                            <tr>
                                <th className="px-6 py-3 font-semibold">ID</th>
                                <th className="px-6 py-3 font-semibold">Kullanıcı</th>
                                <th className="px-6 py-3 font-semibold">E-posta</th>
                                <th className="px-6 py-3 font-semibold">Yetki Rolü</th>
                                <th className="px-6 py-3 font-semibold">Abonelik</th>
                                <th className="px-6 py-3 font-semibold">Kayıt Tarihi</th>
                                <th className="px-6 py-3 font-semibold text-right">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-3 text-gray-500 font-mono text-[11px]">#{u.id}</td>
                                    <td className="px-6 py-3 font-medium text-white">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center justify-center font-bold">
                                                {u.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <span className="font-semibold">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-gray-400 font-mono text-[11px]">{u.email}</td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                                            u.role === 'admin' 
                                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                                : 'bg-white/[0.06] text-gray-300 border border-white/[0.08]'
                                        }`}>
                                            {u.role_label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            u.plan !== 'free' 
                                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                                                : 'text-gray-400 bg-white/[0.04]'
                                        }`}>
                                            {u.plan_label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-gray-400 font-mono text-[11px]">{u.created_at}</td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Aktif
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        Aradığınız kriterlere uygun kullanıcı bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
