import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const UploadContext = createContext(null);

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

export function UploadProvider({ children }) {
    const [queue, setQueue] = useState([]);
    const [isWidgetOpen, setIsWidgetOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    // TMDB Matching Wizard State
    const [isTmdbWizardOpen, setIsTmdbWizardOpen] = useState(false);
    const [completedQueue, setCompletedQueue] = useState([]);
    const [wizardCurrentIndex, setWizardCurrentIndex] = useState(0);

    // Refs to hold active abort controllers and current processing item
    const abortControllersRef = useRef({});
    const processingRef = useRef(false);

    // Restore active upload queue on F5 reload
    useEffect(() => {
        try {
            const savedQueue = localStorage.getItem('sine_active_queue');
            if (savedQueue) {
                const parsed = JSON.parse(savedQueue);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const restoredQueue = parsed.map((item) => ({
                        ...item,
                        file: null, // Native File handle lost on page refresh
                        status: item.status === 'completed' ? 'completed' : 'paused',
                        errorMessage: item.status !== 'completed' ? 'F5 Yenileme: Devam etmek için dosyayı tekrar seçin' : null,
                    }));
                    setQueue(restoredQueue);
                    setIsWidgetOpen(true);
                }
            }
        } catch (e) {}
    }, []);

    // Synchronize queue to localStorage for F5 resilience
    useEffect(() => {
        try {
            const queueToSave = queue.map(({ file, ...rest }) => rest);
            if (queueToSave.length > 0) {
                localStorage.setItem('sine_active_queue', JSON.stringify(queueToSave));
            } else {
                localStorage.removeItem('sine_active_queue');
            }
        } catch (e) {}
    }, [queue]);

    // Add files to upload queue or attach file to restored F5 queue items
    const addFilesToQueue = (files, category = 'auto') => {
        const fileArray = Array.from(files);

        setQueue((prev) => {
            let updatedQueue = [...prev];

            fileArray.forEach((file) => {
                // Check if file matches an existing restored F5 item
                const existingIndex = updatedQueue.findIndex(
                    (item) => item.filename === file.name && item.size === file.size && !item.file
                );

                if (existingIndex !== -1) {
                    // Attach native file blob to existing session
                    updatedQueue[existingIndex] = {
                        ...updatedQueue[existingIndex],
                        file: file,
                        status: 'queued',
                        errorMessage: null,
                    };
                } else {
                    // Add new item
                    updatedQueue.push({
                        id: 'up_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
                        file: file,
                        filename: file.name,
                        size: file.size,
                        category: category,
                        status: 'queued', // queued, init, uploading, paused, completed, error
                        progress: 0,
                        uploadedBytes: 0,
                        speedBps: 0,
                        etaSeconds: 0,
                        storageBox: null,
                        uploadId: null,
                        mediaFile: null,
                        errorMessage: null,
                    });
                }
            });

            return updatedQueue;
        });

        setIsWidgetOpen(true);
    };

    // Pause a specific upload
    const pauseUpload = (id) => {
        if (abortControllersRef.current[id]) {
            abortControllersRef.current[id].abort();
            delete abortControllersRef.current[id];
        }

        setQueue((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, status: 'paused', speedBps: 0 } : item
            )
        );
    };

    // Resume a specific upload
    const resumeUpload = (id) => {
        const targetItem = queue.find((item) => item.id === id);

        // If file object is missing (due to F5 refresh), open upload modal or prompt file select
        if (targetItem && !targetItem.file) {
            setIsUploadModalOpen(true);
            return;
        }

        setQueue((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, status: 'queued', errorMessage: null } : item
            )
        );
    };

    // Cancel / Remove upload from queue
    const cancelUpload = (id) => {
        if (abortControllersRef.current[id]) {
            abortControllersRef.current[id].abort();
            delete abortControllersRef.current[id];
        }

        setQueue((prev) => {
            const itemToCancel = prev.find((i) => i.id === id);
            if (itemToCancel) {
                try {
                    const sessionKey = `sine_up_${itemToCancel.filename}_${itemToCancel.size}`;
                    localStorage.removeItem(sessionKey);
                } catch (e) {}
            }
            return prev.filter((item) => item.id !== id);
        });
    };

    // Clear completed uploads from list
    const clearCompleted = () => {
        setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
    };

    // Process next queued file in queue loop
    useEffect(() => {
        if (processingRef.current) return;

        const nextItem = queue.find((item) => item.status === 'queued' && item.file);
        if (!nextItem) return;

        processingRef.current = true;
        uploadFileItem(nextItem);
    }, [queue]);

    // Core chunked uploader function
    const uploadFileItem = async (item) => {
        const itemId = item.id;
        const file = item.file;
        const totalSize = file.size;

        if (!file) {
            processingRef.current = false;
            return;
        }

        // Create AbortController for pause/cancel
        const controller = new AbortController();
        abortControllersRef.current[itemId] = controller;

        const updateItemState = (updates) => {
            setQueue((prev) =>
                prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
            );
        };

        updateItemState({ status: 'init', errorMessage: null });

        try {
            const sessionKey = `sine_up_${file.name}_${totalSize}`;
            let session = null;
            try {
                const stored = localStorage.getItem(sessionKey);
                if (stored) {
                    session = JSON.parse(stored);
                }
            } catch (e) {}

            let upload_id = session?.upload_id || item.uploadId || null;
            let storage_box = session?.storage_box || item.storageBox || null;
            let target_path = session?.target_path || null;
            let urls = session?.urls || null;
            let chunkSize = session?.chunk_size || CHUNK_SIZE;

            // Function to request/refresh signed URLs from Laravel backend
            const initOrRefreshSession = async (existingId = null, boxId = null) => {
                const initRes = await fetch('/admin/uploads/init', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        filename: file.name,
                        file_size: totalSize,
                        category: item.category,
                        existing_upload_id: existingId,
                        storage_box_id: boxId,
                    }),
                    signal: controller.signal,
                });

                if (!initRes.ok) {
                    const errData = await initRes.json().catch(() => ({}));
                    throw new Error(errData.message || `Oturum başlatılamadı (${initRes.status})`);
                }

                const initData = await initRes.json();
                if (!initData.success) {
                    throw new Error(initData.message || 'Oturum başlatılamadı');
                }

                upload_id = initData.upload_id;
                storage_box = initData.storage_box;
                target_path = initData.target_path;
                urls = initData.urls;
                chunkSize = initData.chunk_size || CHUNK_SIZE;

                // Cache active session to localStorage
                try {
                    localStorage.setItem(sessionKey, JSON.stringify({
                        upload_id,
                        storage_box,
                        target_path,
                        urls,
                        chunk_size: chunkSize,
                    }));
                } catch (e) {}
            };

            // If session is absent, initialize session with Laravel backend
            if (!urls || !upload_id) {
                await initOrRefreshSession();
            }

            // Step 2: Check status on Gateway to find existing chunks on disk
            let uploadedChunks = [];
            try {
                let statusRes = await fetch(urls.status, { signal: controller.signal });
                
                // If Gateway returns 404 (stale session or tempDir deleted), clear stale session & create fresh session
                if (statusRes.status === 404) {
                    try { localStorage.removeItem(sessionKey); } catch (e) {}
                    upload_id = null;
                    urls = null;
                    await initOrRefreshSession();
                    statusRes = await fetch(urls.status, { signal: controller.signal });
                } else if (!statusRes.ok && upload_id) {
                    // If Gateway URL is expired (403/410), re-sign URLs from Laravel backend
                    await initOrRefreshSession(upload_id, storage_box?.id);
                    statusRes = await fetch(urls.status, { signal: controller.signal });
                }

                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    if (statusData.success && Array.isArray(statusData.chunks)) {
                        uploadedChunks = statusData.chunks;
                    }
                }
            } catch (e) {
                // Ignore status check errors, fallback to chunk 0
            }

            const totalChunks = Math.ceil(totalSize / chunkSize);
            let uploadedBytes = uploadedChunks.length * chunkSize;
            let initialProgress = Math.min(99, Math.round((uploadedBytes / totalSize) * 100));

            updateItemState({
                status: 'uploading',
                uploadId: upload_id,
                storageBox: storage_box,
                progress: initialProgress,
                uploadedBytes: uploadedBytes,
            });

            // Step 3: Upload chunks sequentially with non-blocking Blob slices
            let startTime = Date.now();
            let lastUpdate = Date.now();

            for (let i = 0; i < totalChunks; i++) {
                if (controller.signal.aborted) {
                    processingRef.current = false;
                    return;
                }

                if (uploadedChunks.includes(i)) {
                    continue; // Skip chunk already written to disk
                }

                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, totalSize);
                const chunkBlob = file.slice(start, end);

                let chunkRes = await fetch(urls.chunk, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'X-Chunk-Index': i.toString(),
                    },
                    body: chunkBlob,
                    signal: controller.signal,
                });

                // Re-sign token if expired during a long upload
                if (!chunkRes.ok && (chunkRes.status === 403 || chunkRes.status === 410)) {
                    await initOrRefreshSession(upload_id, storage_box?.id);
                    chunkRes = await fetch(urls.chunk, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'X-Chunk-Index': i.toString(),
                        },
                        body: chunkBlob,
                        signal: controller.signal,
                    });
                }

                if (!chunkRes.ok) {
                    const chunkErr = await chunkRes.json().catch(() => ({}));
                    throw new Error(chunkErr.error || `Dilim ${i + 1}/${totalChunks} yüklenemedi`);
                }

                uploadedBytes += (end - start);
                const now = Date.now();

                // Throttle progress updates for smooth rendering
                if (now - lastUpdate > 150 || uploadedBytes >= totalSize) {
                    const elapsedSec = (now - startTime) / 1000;
                    const speedBps = elapsedSec > 0 ? Math.round((uploadedBytes - (uploadedChunks.length * chunkSize)) / elapsedSec) : 0;
                    const remainingBytes = totalSize - uploadedBytes;
                    const etaSeconds = speedBps > 0 ? Math.round(remainingBytes / speedBps) : 0;
                    const progress = Math.min(99, Math.round((uploadedBytes / totalSize) * 100));

                    updateItemState({
                        progress,
                        uploadedBytes,
                        speedBps: Math.max(0, speedBps),
                        etaSeconds: Math.max(0, etaSeconds),
                    });
                    lastUpdate = now;
                }
            }

            // Step 4: Call gateway finish endpoint to assemble file
            let finishRes = await fetch(urls.finish, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ upload_id, file_path: target_path }),
                signal: controller.signal,
            });

            if (!finishRes.ok && (finishRes.status === 403 || finishRes.status === 410)) {
                await initOrRefreshSession(upload_id, storage_box?.id);
                finishRes = await fetch(urls.finish, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ upload_id, file_path: target_path }),
                    signal: controller.signal,
                });
            }

            if (!finishRes.ok) {
                const finishErr = await finishRes.json().catch(() => ({}));
                throw new Error(finishErr.error || 'Gateway dosya birleştirme hatası');
            }

            const finishData = await finishRes.json();

            // Step 5: Notify Laravel backend to save MediaFile record in DB
            const completeRes = await fetch('/admin/uploads/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    storage_box_id: storage_box.id,
                    file_path: target_path,
                    filename: file.name,
                    size_bytes: finishData.size_bytes || totalSize,
                }),
                signal: controller.signal,
            });

            const completeData = await completeRes.json();
            const createdMediaFile = completeData.media_file || null;

            // Remove session cache on completion
            try {
                localStorage.removeItem(sessionKey);
            } catch (e) {}

            updateItemState({
                status: 'completed',
                progress: 100,
                uploadedBytes: totalSize,
                speedBps: 0,
                etaSeconds: 0,
                mediaFile: createdMediaFile,
            });

            delete abortControllersRef.current[itemId];
            processingRef.current = false;

            // Add completed item to TMDB wizard queue
            if (createdMediaFile) {
                setCompletedQueue((prev) => {
                    const newQueue = [...prev, createdMediaFile];
                    setTimeout(() => checkQueueFinishedAndPromptTmdb(newQueue), 500);
                    return newQueue;
                });
            }

        } catch (err) {
            delete abortControllersRef.current[itemId];
            processingRef.current = false;

            if (err.name === 'AbortError') {
                return; // User intentionally paused/canceled
            }

            updateItemState({
                status: 'error',
                errorMessage: err.message || 'Yükleme başarısız',
                speedBps: 0,
            });
        }
    };

    // Trigger TMDB wizard after upload finishes
    const checkQueueFinishedAndPromptTmdb = (newCompletedItems) => {
        setQueue((currentQueue) => {
            const hasPending = currentQueue.some(
                (i) => i.status === 'queued' || i.status === 'uploading' || i.status === 'init'
            );

            if (!hasPending && newCompletedItems.length > 0) {
                setWizardCurrentIndex(0);
                setIsTmdbWizardOpen(true);
            }

            return currentQueue;
        });
    };

    // Close TMDB wizard
    const closeTmdbWizard = () => {
        setIsTmdbWizardOpen(false);
        setCompletedQueue([]);
        setWizardCurrentIndex(0);
    };

    return (
        <UploadContext.Provider
            value={{
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
                isTmdbWizardOpen,
                setIsTmdbWizardOpen,
                completedQueue,
                wizardCurrentIndex,
                setWizardCurrentIndex,
                closeTmdbWizard,
            }}
        >
            {children}
        </UploadContext.Provider>
    );
}

export function useUpload() {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
}
