<?php

namespace App\Http\Controllers\Admin;

use App\Enums\StorageBoxConnectionStatus;
use App\Enums\StorageBoxProtocol;
use App\Enums\StorageBoxStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStorageBoxRequest;
use App\Http\Requests\Admin\UpdateStorageBoxRequest;
use App\Models\StorageBox;
use App\Services\HetznerStorageBoxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StorageBoxController extends Controller
{
    public function __construct(
        protected HetznerStorageBoxService $storageService
    ) {}

    /**
     * Display a listing of Hetzner Storage Boxes with real-time statistics.
     */
    public function index(): Response
    {
        $boxes = StorageBox::orderBy('is_default', 'desc')
            ->latest()
            ->get()
            ->map(fn (StorageBox $box) => [
                'id' => $box->id,
                'name' => $box->name,
                'host' => $box->host,
                'protocol' => $box->protocol->value,
                'protocol_label' => $box->protocol->label(),
                'protocol_badge' => $box->protocol->badgeClasses(),
                'port' => $box->port,
                'username' => $box->username,
                'bucket' => $box->bucket,
                'region' => $box->region,
                'use_ssl' => (bool) $box->use_ssl,
                'total_capacity_gb' => $box->total_capacity_gb,
                'formatted_total' => $box->formatted_total,
                'free_capacity_gb' => $box->free_capacity_gb,
                'formatted_free' => $box->formatted_free,
                'used_capacity_gb' => $box->used_capacity_gb,
                'formatted_used' => $box->formatted_used,
                'free_percentage' => $box->free_percentage,
                'used_percentage' => $box->used_percentage,
                'status' => $box->status->value,
                'status_label' => $box->status->label(),
                'status_badge' => $box->status->badgeClasses(),
                'connection_status' => $box->connection_status->value,
                'connection_label' => $box->connection_status->label(),
                'connection_badge' => $box->connection_status->badgeClasses(),
                'latency_ms' => $box->latency_ms,
                'last_checked_at' => $box->last_checked_at?->format('d.m.Y H:i:s'),
                'last_checked_diff' => $box->last_checked_at?->diffForHumans(),
                'last_error' => $box->last_error,
                'notes' => $box->notes,
                'is_default' => (bool) $box->is_default,
                'has_password' => $box->has_password,
                'created_at' => $box->created_at?->format('d.m.Y H:i'),
            ]);

        $totalBoxes = $boxes->count();
        $activeBoxes = $boxes->where('status', StorageBoxStatus::Active->value)->count();
        $onlineBoxes = $boxes->where('connection_status', StorageBoxConnectionStatus::Online->value)->count();
        $totalCapGb = (int) $boxes->sum('total_capacity_gb');
        $totalFreeGb = (int) $boxes->sum('free_capacity_gb');
        $totalUsedGb = (int) $boxes->sum('used_capacity_gb');

        $stats = [
            'total_boxes' => $totalBoxes,
            'active_boxes' => $activeBoxes,
            'online_boxes' => $onlineBoxes,
            'total_capacity_gb' => $totalCapGb,
            'total_capacity_formatted' => $this->formatGb($totalCapGb),
            'total_free_gb' => $totalFreeGb,
            'total_free_formatted' => $this->formatGb($totalFreeGb),
            'total_used_gb' => $totalUsedGb,
            'total_used_formatted' => $this->formatGb($totalUsedGb),
        ];

        $protocols = collect(StorageBoxProtocol::cases())->map(fn ($p) => [
            'value' => $p->value,
            'label' => $p->label(),
            'default_port' => $p->defaultPort(),
            'is_s3' => $p->isS3(),
        ]);

        return Inertia::render('Admin/StorageBoxes/Index', [
            'boxes' => $boxes,
            'stats' => $stats,
            'protocols' => $protocols,
        ]);
    }

    /**
     * Store a newly created storage box in storage.
     */
    public function store(StoreStorageBoxRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        if (! empty($validated['is_default'])) {
            StorageBox::query()->update(['is_default' => false]);
        }

        if (empty($validated['total_capacity_gb'])) {
            $validated['total_capacity_gb'] = 1000;
        }

        $box = StorageBox::create($validated);

        if ($request->boolean('test_immediately', true)) {
            try {
                $this->storageService->checkAndUpdate($box);
            } catch (\Throwable $e) {
                // Ignore background test error during creation
            }
        }

        return redirect()->route('admin.storage-boxes.index')
            ->with('success', "Depolama Sunucusu \"{$box->name}\" başarıyla sisteme eklendi.");
    }

    /**
     * Update the specified storage box in storage.
     */
    public function update(UpdateStorageBoxRequest $request, StorageBox $storageBox): RedirectResponse
    {
        $validated = $request->validated();

        // Only update password if provided
        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        if (! empty($validated['is_default']) && ! $storageBox->is_default) {
            StorageBox::where('id', '!=', $storageBox->id)->update(['is_default' => false]);
        }

        $storageBox->update($validated);

        if ($request->boolean('test_immediately', true)) {
            try {
                $this->storageService->checkAndUpdate($storageBox);
            } catch (\Throwable $e) {
                // Ignore background test error during update
            }
        }

        return redirect()->route('admin.storage-boxes.index')
            ->with('success', "Depolama Sunucusu \"{$storageBox->name}\" güncellendi.");
    }

    /**
     * Remove the specified storage box from storage.
     */
    public function destroy(StorageBox $storageBox): RedirectResponse
    {
        $name = $storageBox->name;

        try {
            // Safely delete associated media files first
            $storageBox->mediaFiles()->delete();
            $storageBox->delete();

            return redirect()->route('admin.storage-boxes.index')
                ->with('success', "Depolama Sunucusu \"{$name}\" başarıyla silindi.");
        } catch (\Throwable $e) {
            return redirect()->route('admin.storage-boxes.index')
                ->with('error', "Sunucu silinemedi: {$e->getMessage()}");
        }
    }

    /**
     * Test connection to a specific storage box immediately.
     */
    public function test(Request $request, StorageBox $storageBox): JsonResponse|RedirectResponse
    {
        $this->storageService->checkAndUpdate($storageBox);
        $testDetails = $this->storageService->testConnection($storageBox);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => $testDetails['success'],
                'status' => $storageBox->connection_status->value,
                'status_label' => $storageBox->connection_status->label(),
                'status_badge' => $storageBox->connection_status->badgeClasses(),
                'latency_ms' => $storageBox->latency_ms,
                'last_checked_at' => $storageBox->last_checked_at?->format('d.m.Y H:i:s'),
                'last_checked_diff' => $storageBox->last_checked_at?->diffForHumans(),
                'last_error' => $storageBox->last_error,
                'message' => $testDetails['message'],
                'server_info' => $testDetails['server_info'] ?? null,
                'total_capacity_gb' => $storageBox->total_capacity_gb,
                'formatted_total' => $storageBox->formatted_total,
                'free_capacity_gb' => $storageBox->free_capacity_gb,
                'formatted_free' => $storageBox->formatted_free,
                'used_capacity_gb' => $storageBox->used_capacity_gb,
                'formatted_used' => $storageBox->formatted_used,
                'free_percentage' => $storageBox->free_percentage,
                'used_percentage' => $storageBox->used_percentage,
            ]);
        }

        $freeMsg = $storageBox->formatted_free ? " (Boş Alan: {$storageBox->formatted_free})" : '';
        $statusMsg = $testDetails['success']
            ? "Bağlantı başarılı! Yanıt süresi: {$storageBox->latency_ms} ms{$freeMsg}."
            : 'Bağlantı başarısız: '.($storageBox->last_error ?: 'Bilinmeyen hata');

        return redirect()->route('admin.storage-boxes.index')
            ->with($testDetails['success'] ? 'success' : 'error', "Storage Box [{$storageBox->name}]: {$statusMsg}");
    }

    /**
     * Test all active storage boxes in batch.
     */
    public function testAll(): RedirectResponse
    {
        $boxes = StorageBox::where('status', StorageBoxStatus::Active)->get();

        foreach ($boxes as $box) {
            $this->storageService->checkAndUpdate($box);
        }

        return redirect()->route('admin.storage-boxes.index')
            ->with('success', "Tüm aktif storage box birimleri ({$boxes->count()} adet) test edildi ve boş alanları güncellendi.");
    }

    /**
     * Browse files and movie folders on the storage box.
     */
    public function browse(Request $request, StorageBox $storageBox): JsonResponse
    {
        $path = $request->query('path', '/');
        $listing = $this->storageService->listFiles($storageBox, $path);

        return response()->json([
            'box_id' => $storageBox->id,
            'box_name' => $storageBox->name,
            'protocol' => $storageBox->protocol->value,
            'data' => $listing,
        ]);
    }

    /**
     * Toggle the status between active and inactive.
     */
    public function toggleStatus(StorageBox $storageBox): RedirectResponse
    {
        $newStatus = $storageBox->status === StorageBoxStatus::Active
            ? StorageBoxStatus::Inactive
            : StorageBoxStatus::Active;

        $storageBox->update(['status' => $newStatus]);

        return redirect()->route('admin.storage-boxes.index')
            ->with('success', "Storage Box durumu \"{$newStatus->label()}\" olarak güncellendi.");
    }

    /**
     * Format gigabytes into readable GB or TB string.
     */
    protected function formatGb(int $gb): string
    {
        if ($gb >= 1000) {
            $tb = sprintf('%.2f', $gb / 1000);

            return "{$tb} TB";
        }

        return "{$gb} GB";
    }
}
