import React, { useState, useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';
import AdminLayout from '../../../Components/AdminLayout';
import { Plus } from 'lucide-react';

import StatsCards from './Components/StatsCards';
import NodesGrid from './Components/NodesGrid';
import CreateEditBoxModal from './Components/Modals/CreateEditBoxModal';
import DeleteBoxModal from './Components/Modals/DeleteBoxModal';

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

export default function StorageBoxesIndex({ boxes = [], stats }) {
    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingBox, setEditingBox] = useState(null);
    const [deletingBox, setDeletingBox] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Testing State
    const [testingBoxId, setTestingBoxId] = useState(null);
    const [isTestingAll, setIsTestingAll] = useState(false);
    const [copiedHostId, setCopiedHostId] = useState(null);

    // Form State
    const [formData, setFormData] = useState(initialFormState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Copy to clipboard helper
    const handleCopy = useCallback((text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedHostId(id);
        setTimeout(() => setCopiedHostId(null), 2000);
    }, []);

    // Filter boxes
    const filteredBoxes = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return boxes;
        return boxes.filter(box => {
            return (box.name || '').toLowerCase().includes(query) ||
                (box.host || '').toLowerCase().includes(query);
        });
    }, [boxes, searchQuery]);

    // Handle single box test
    const handleTestBox = useCallback((box) => {
        setTestingBoxId(box.id);

        router.post(`/admin/storage-boxes/${box.id}/test`, {}, {
            preserveScroll: true,
            onSuccess: () => setTestingBoxId(null),
            onError: () => setTestingBoxId(null)
        });
    }, []);

    // Handle test all boxes
    const handleTestAll = useCallback(() => {
        setIsTestingAll(true);
        router.post('/admin/storage-boxes/test-all', {}, {
            preserveScroll: true,
            onFinish: () => setIsTestingAll(false),
        });
    }, []);

    // Open Edit Modal
    const handleOpenEdit = useCallback((box) => {
        setEditingBox(box);
        setFormData({
            name: box.name || '',
            host: box.host || '',
            protocol: 'custom_gateway',
            port: box.port || 443,
            username: box.username || 'gateway',
            password: '',
            use_ssl: Boolean(box.use_ssl),
            total_capacity_gb: box.total_capacity_gb || 1000,
            status: box.status || 'active',
            notes: box.notes || '',
            is_default: Boolean(box.is_default),
            test_immediately: false,
        });
        setFormErrors({});
        setIsCreateModalOpen(true);
    }, []);

    const handleOpenCreate = useCallback(() => {
        setFormData(initialFormState);
        setEditingBox(null);
        setFormErrors({});
        setIsCreateModalOpen(true);
    }, []);

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

    return (
        <AdminLayout
            title="Depolama Sunucuları"
            subtitle="Nginx Gateway Node sunucularını yönetin, anlık gecikme sürelerini izleyin ve disk kapasitesini denetleyin."
            activeTab="storage-boxes"
            statsSummary={{ total_boxes: stats?.total_boxes || boxes.length }}
            headerActions={
                <button
                    onClick={handleOpenCreate}
                    className="px-4 py-2.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-[#00B074]/20 hover:shadow-[#00B074]/30"
                >
                    <Plus className="w-4 h-4" />
                    <span>Yeni Sunucu Ekle</span>
                </button>
            }
        >
            <div className="space-y-6">
                {/* STATS CARDS GRID */}
                <StatsCards stats={stats} totalBoxes={boxes.length} />

                {/* NODES GRID & TOOLBAR */}
                <NodesGrid
                    boxes={filteredBoxes}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isTestingAll={isTestingAll}
                    onTestAll={handleTestAll}
                    testingBoxId={testingBoxId}
                    onTestBox={handleTestBox}
                    copiedHostId={copiedHostId}
                    onCopy={handleCopy}
                    onOpenEdit={handleOpenEdit}
                    onSetDeletingBox={setDeletingBox}
                />

                {/* MODAL: CREATE / EDIT STORAGE NODE */}
                {isCreateModalOpen && (
                    <CreateEditBoxModal
                        isOpen={isCreateModalOpen}
                        editingBox={editingBox}
                        onClose={() => {
                            setIsCreateModalOpen(false);
                            setEditingBox(null);
                        }}
                        formData={formData}
                        setFormData={setFormData}
                        formErrors={formErrors}
                        isSubmitting={isSubmitting}
                        onSubmit={handleSubmitForm}
                    />
                )}

                {/* MODAL: DELETE CONFIRMATION */}
                {deletingBox && (
                    <DeleteBoxModal
                        deletingBox={deletingBox}
                        onClose={() => setDeletingBox(null)}
                        onConfirmDelete={handleDeleteBox}
                        isDeleting={isDeleting}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
