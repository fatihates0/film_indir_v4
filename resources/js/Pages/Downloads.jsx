import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import { Download, Play, Pause, Trash2, HardDrive, CheckCircle2, ArrowDownCircle, RefreshCw, Folder } from 'lucide-react';

export default function Downloads({ activeDownloads, completedDownloads }) {
    const [downloadsList, setDownloadsList] = useState(activeDownloads || [
        {
            id: 1,
            title: "Interstellar (2014)",
            quality: "4K UHD • HEVC",
            size: "18.4 GB",
            downloadedSize: "6.4 GB",
            speed: "18.5 MB/s",
            eta: "11 mins remaining",
            progress: 35,
            status: "Downloading",
            poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80"
        },
        {
            id: 2,
            title: "Stranger Things S04E01",
            quality: "1080p Full HD",
            size: "4.2 GB",
            downloadedSize: "3.36 GB",
            speed: "24.1 MB/s",
            eta: "1 min remaining",
            progress: 80,
            status: "Downloading",
            poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80"
        },
        {
            id: 3,
            title: "Dune: Part Two (2024)",
            quality: "4K HDR",
            size: "22.1 GB",
            downloadedSize: "21.65 GB",
            speed: "12.8 MB/s",
            eta: "20 secs remaining",
            progress: 98,
            status: "Downloading",
            poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80"
        }
    ]);

    const [completedList, setCompletedList] = useState(completedDownloads || [
        {
            id: 101,
            title: "Inception (2010)",
            quality: "1080p Full HD",
            size: "6.8 GB",
            completedDate: "Oct 1, 2026",
            poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80"
        },
        {
            id: 102,
            title: "Oppenheimer (2023)",
            quality: "4K Ultra HD",
            size: "24.5 GB",
            completedDate: "Sep 28, 2026",
            poster: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=300&q=80"
        }
    ]);

    const togglePause = (id) => {
        setDownloadsList(downloadsList.map(item => {
            if (item.id === id) {
                return { ...item, status: item.status === "Downloading" ? "Paused" : "Downloading" };
            }
            return item;
        }));
    };

    const removeDownload = (id) => {
        setDownloadsList(downloadsList.filter(item => item.id !== id));
    };

    return (
        <Layout title="Offline Downloads - SineKutu">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
                {/* Header & Storage Indicator */}
                <div className="bg-[#0A0D14] p-8 rounded-3xl border border-gray-800/60 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                                <Download className="w-8 h-8 text-[#00B074]" /> Çevrimdışı İndirilenler
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">Aktif indirmelerinizi ve çevrimdışı arşivinizi yönetin</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm border border-gray-700 transition-colors flex items-center gap-2">
                                <Folder className="w-4 h-4 text-[#00B074]" /> Depolama Ayarları
                            </button>
                        </div>
                    </div>

                    {/* Storage Bar */}
                    <div className="space-y-2 pt-2 border-t border-gray-800/80">
                        <div className="flex items-center justify-between text-xs text-gray-300">
                            <span className="flex items-center gap-2 font-semibold">
                                <HardDrive className="w-4 h-4 text-[#00B074]" /> Yerel Disk (C:) Depolama
                            </span>
                            <span className="font-bold">78.5 GB Kullanılan / 250 GB Kullanılabilir</span>
                        </div>
                        <div className="h-3 w-full bg-[#0A0D14] rounded-full overflow-hidden p-0.5 border border-gray-800">
                            <div className="h-full bg-gradient-to-r from-[#00B074] to-emerald-400 rounded-full" style={{ width: '31%' }} />
                        </div>
                    </div>
                </div>

                {/* ACTIVE DOWNLOADS SECTION WITH CIRCULAR PERCENTAGES (35%, 80%, 98%) */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <ArrowDownCircle className="w-6 h-6 text-[#00B074]" /> Aktif İndirmeler ({downloadsList.length})
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {downloadsList.map((item) => {
                            // Circular SVG Math
                            const radius = 38;
                            const circumference = 2 * Math.PI * radius;
                            const strokeDashoffset = circumference - (item.progress / 100) * circumference;

                            return (
                                <div key={item.id} className="bg-[#0A0D14] rounded-2xl p-6 border border-gray-800/60 hover:border-gray-700 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
                                    <div className="flex items-start gap-4">
                                        <img src={item.poster} alt={item.title} className="w-16 h-24 rounded-xl object-cover shrink-0 border border-gray-800" />

                                        <div className="space-y-1 flex-1">
                                            <span className="bg-[#00B074]/20 text-[#00B074] text-[10px] font-extrabold px-2 py-0.5 rounded">
                                                {item.quality}
                                            </span>
                                            <h3 className="text-white font-bold text-base line-clamp-1 group-hover:text-[#00B074] transition-colors">
                                                {item.title}
                                            </h3>
                                            <p className="text-gray-400 text-xs">{item.downloadedSize} / {item.size}</p>
                                            <p className="text-[#00B074] text-xs font-semibold">{item.speed} • {item.eta}</p>
                                        </div>
                                    </div>

                                    {/* Circular Progress Gauge */}
                                    <div className="flex items-center justify-around border-t border-gray-800/60 pt-4">
                                        <div className="relative w-24 h-24 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                {/* Background Circle */}
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r={radius}
                                                    className="text-gray-800"
                                                    strokeWidth="8"
                                                    stroke="currentColor"
                                                    fill="transparent"
                                                />
                                                {/* Progress Circle */}
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r={radius}
                                                    className="text-[#00B074] transition-all duration-500 ease-out"
                                                    strokeWidth="8"
                                                    strokeDasharray={circumference}
                                                    strokeDashoffset={strokeDashoffset}
                                                    strokeLinecap="round"
                                                    stroke="currentColor"
                                                    fill="transparent"
                                                />
                                            </svg>
                                            <div className="absolute flex flex-col items-center justify-center text-center">
                                                <span className="text-xl font-extrabold text-white">{item.progress}%</span>
                                            </div>
                                        </div>

                                        {/* Action Controls */}
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => togglePause(item.id)}
                                                className="p-3 bg-[#0A0D14] hover:bg-gray-800 text-white rounded-xl border border-gray-800 transition-colors flex items-center justify-center"
                                                title={item.status === "Downloading" ? "Duraklat" : "Devam Et"}
                                            >
                                                {item.status === "Downloading" ? <Pause className="w-5 h-5 text-amber-400" /> : <Play className="w-5 h-5 text-[#00B074]" />}
                                            </button>

                                            <button
                                                onClick={() => removeDownload(item.id)}
                                                className="p-3 bg-[#0A0D14] hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl border border-gray-800 transition-colors flex items-center justify-center"
                                                title="İptal Et & Sil"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* COMPLETED DOWNLOADS */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-[#00B074]" /> Tamamlanan Çevrimdışı Arşiv ({completedList.length})
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {completedList.map((comp) => (
                            <div key={comp.id} className="bg-[#0A0D14] p-5 rounded-2xl border border-gray-800/60 hover:border-gray-700 transition-all flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <img src={comp.poster} alt={comp.title} className="w-16 h-20 rounded-xl object-cover shrink-0" />
                                    <div>
                                        <h3 className="text-white font-bold text-base">{comp.title}</h3>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                            <span className="text-[#00B074] font-semibold">{comp.quality}</span>
                                            <span>•</span>
                                            <span>{comp.size}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-1 block">İndirildiği tarih: {comp.completedDate}</span>
                                    </div>
                                </div>

                                <button className="bg-[#00B074] hover:bg-[#009663] text-black font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
                                    <Play className="w-4 h-4 fill-black" /> Çevrimdışı İzle
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </Layout>
    );
}
