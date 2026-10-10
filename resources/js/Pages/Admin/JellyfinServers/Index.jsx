import React, { useState, useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';
import AdminLayout from '../../../Components/AdminLayout';
import { Plus, Search, RefreshCw, Tv, AlertCircle } from 'lucide-react';

import StatsCards from './Components/StatsCards';
import ServersGrid from './Components/ServersGrid';
import CreateEditServerModal from './Components/Modals/CreateEditServerModal';
import DeleteServerModal from './Components/Modals/DeleteServerModal';

const initialFormState = {
    name: '',
    url: '',
    public_url: '',
    api_key: '',
    is_active: true,
    notes: '',
    test_immediately: true,
};

export default function JellyfinServersIndex({ servers = [], stats }) {
    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingServer, setEditingServer] = useState(null);
    const [deletingServer, setDeletingServer] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Testing State
    const [testingServerId, setTestingServerId] = useState(null);
    const [isTestingAll, setIsTestingAll] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    // Form State
    const [formData, setFormData] = useState(initialFormState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Copy to clipboard helper
    const handleCopy = useCallback((text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }, []);

    // Filter servers
    const filteredServers = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return servers;
        return servers.filter(s => {
            return (s.name || '').toLowerCase().includes(query) ||
                (s.url || '').toLowerCase().includes(query) ||
                (s.effective_public_url || '').toLowerCase().includes(query);
        });
    }, [servers, searchQuery]);

    // Handle Open Create Modal
    const handleOpenCreateModal = () => {
        setEditingServer(null);
        setFormData(initialFormState);
        setFormErrors({});
        setIsCreateModalOpen(true);
    };

    // Handle Open Edit Modal
    const handleOpenEditModal = (server) => {
        setEditingServer(server);
        setFormData({
            name: server.name || '',
            url: server.url || '',
            public_url: server.public_url || '',
            api_key: server.api_key || '',
            is_active: Boolean(server.is_active),
            notes: server.notes || '',
            test_immediately: false,
        });
        setFormErrors({});
        setIsCreateModalOpen(true);
    };

    // Handle Form Submit (Store / Update)
    const handleFormSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormErrors({});

        if (editingServer) {
            router.put(`/admin/jellyfin-servers/${editingServer.id}`, formData, {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setEditingServer(null);
                    setFormData(initialFormState);
                },
                onError: (errors) => {
                    setFormErrors(errors);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                }
            });
        } else {
            router.post('/admin/jellyfin-servers', formData, {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setFormData(initialFormState);
                },
                onError: (errors) => {
                    setFormErrors(errors);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                }
            });
        }
    };

    // Handle Delete
    const handleConfirmDelete = () => {
        if (!deletingServer) return;
        setIsDeleting(true);

        router.delete(`/admin/jellyfin-servers/${deletingServer.id}`, {
            onSuccess: () => {
                setDeletingServer(null);
            },
            onFinish: () => {
                setIsDeleting(false);
            }
        });
    };

    // Handle Toggle Active
    const handleToggleServer = (server) => {
        router.post(`/admin/jellyfin-servers/${server.id}/toggle`, {}, {
            preserveScroll: true,
        });
    };

    // Handle Single Server Test
    const handleTestServer = (server) => {
        setTestingServerId(server.id);
        router.post(`/admin/jellyfin-servers/${server.id}/test`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setTestingServerId(null);
            }
        });
    };

    // Handle Test All
    const handleTestAll = () => {
        setIsTestingAll(true);
        router.post('/admin/jellyfin-servers/test-all', {}, {
            preserveScroll: true,
            onFinish: () => {
                setIsTestingAll(false);
            }
        });
    };

    return (
        <AdminLayout
            title="Jellyfin Sunucuları"
            subtitle="Kullanıcı akış yükünü dengelemek için çoklu Jellyfin sunucusu yönetimi"
        >
            <div className="space-y-6">
                {/* Stats Cards */}
                <StatsCards stats={stats} />

                {/* Filter and Actions Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0D111A] border border-white/[0.08] p-4 rounded-2xl">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Sunucu adı veya URL ile ara..."
                            className="w-full bg-[#121622] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={handleTestAll}
                            disabled={isTestingAll || servers.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-gray-300 bg-white/5 hover:text-white hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin' : ''}`} />
                            <span>Tümünü Test Et</span>
                        </button>

                        <button
                            onClick={handleOpenCreateModal}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Yeni Sunucu Ekle</span>
                        </button>
                    </div>
                </div>

                {/* Servers Grid */}
                <ServersGrid
                    servers={filteredServers}
                    onTest={handleTestServer}
                    testingServerId={testingServerId}
                    onToggle={handleToggleServer}
                    onEdit={handleOpenEditModal}
                    onDelete={(server) => setDeletingServer(server)}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                />

                {/* Modals */}
                <CreateEditServerModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    server={editingServer}
                    formData={formData}
                    setFormData={setFormData}
                    formErrors={formErrors}
                    onSubmit={handleFormSubmit}
                    isSubmitting={isSubmitting}
                />

                <DeleteServerModal
                    isOpen={Boolean(deletingServer)}
                    onClose={() => setDeletingServer(null)}
                    server={deletingServer}
                    onConfirm={handleConfirmDelete}
                    isDeleting={isDeleting}
                />
            </div>
        </AdminLayout>
    );
}
