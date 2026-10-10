<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class JellyfinQuotaController extends Controller
{
    public function __construct(
        protected SubscriptionService $subscriptionService
    ) {}

    /**
     * Jellyfin C# eklentisi tarafından periyodik sorgulanan kullanıcı kota ve abonelik yenilenme tarihleri.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $this->validateApiKey($request)) {
            return response()->json(['error' => 'Yetkisiz erişim: Geçersiz API anahtarı.'], 401);
        }

        $users = User::all();
        $response = [];

        foreach ($users as $user) {
            $summary = $this->subscriptionService->getQuotaSummary($user);
            $hasPackage = $this->subscriptionService->hasActiveMainSubscription($user);

            $response[] = [
                'user_id' => $user->id,
                'username' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->isAdmin(),
                'has_package' => $hasPackage,
                'max_bytes' => $summary['allocated_bytes'] ?? 0,
                'used_bytes' => $summary['used_bytes'] ?? 0,
                'remaining_bytes' => $summary['remaining_bytes'] ?? 0,
                'cycle_start_date' => now()->startOfMonth()->toIso8601String(),
                'cycle_end_date' => $summary['period_end'] ?? now()->addMonth()->toIso8601String(),
            ];
        }

        return response()->json($response);
    }

    /**
     * Jellyfin oynatma başlatılmadan önce kullanıcının paket ve kota erişimini denetler.
     *
     * Kural 1: Paketi ve kotası yoksa -> İzletilmez (allowed: false, reason: no_package).
     * Kural 2: Paketi var kotası yoksa -> İzletilmez (allowed: false, reason: quota_exhausted).
     * Kural 3: Paketi var kotası varsa -> İzletilir (allowed: true, reason: access_granted).
     */
    public function checkAccess(Request $request): JsonResponse
    {
        if (! $this->validateApiKey($request)) {
            return response()->json([
                'allowed' => false,
                'reason' => 'unauthorized',
                'message' => 'Yetkisiz erişim: Geçersiz API anahtarı.',
            ], 401);
        }

        $username = $request->query('username') ?? $request->input('username');

        if (! $username) {
            return response()->json([
                'allowed' => false,
                'reason' => 'missing_username',
                'has_package' => false,
                'remaining_bytes' => 0,
                'message' => 'Kullanıcı adı veya e-posta belirtilmedi.',
            ]);
        }

        /** @var User|null $user */
        $user = User::whereRaw('LOWER(name) = ?', [strtolower($username)])
            ->orWhereRaw('LOWER(email) = ?', [strtolower($username)])
            ->first();

        if (! $user) {
            return response()->json([
                'allowed' => false,
                'reason' => 'user_not_found',
                'has_package' => false,
                'remaining_bytes' => 0,
                'message' => 'Kullanıcı sistemde kayıtlı bulunamadı.',
            ]);
        }

        // Yönetici kullanıcılar için sınırsız erişim
        if ($user->isAdmin()) {
            return response()->json([
                'allowed' => true,
                'reason' => 'admin',
                'has_package' => true,
                'remaining_bytes' => 999999999999999,
                'message' => 'Yönetici erişimi (sınırsız kota).',
            ]);
        }

        // 1. Paket kontrolü (Aktif ana aboneliği var mı?)
        $hasPackage = $this->subscriptionService->hasActiveMainSubscription($user);

        // 2. Kalan kota kontrolü (Ana paket + ek kotalar)
        $remainingBytes = $this->subscriptionService->getTotalRemainingBytes($user);

        // Durum 1: Paketi yoksa (veya hem paket hem kota yoksa)
        if (! $hasPackage) {
            return response()->json([
                'allowed' => false,
                'reason' => 'no_package',
                'has_package' => false,
                'remaining_bytes' => max(0, $remainingBytes),
                'message' => 'Aktif bir abonelik paketiniz bulunmamaktadır. İçerik izleyemezsiniz.',
            ]);
        }

        // Durum 2: Paketi var ama kotası tükenmişse
        if ($remainingBytes <= 0) {
            return response()->json([
                'allowed' => false,
                'reason' => 'quota_exhausted',
                'has_package' => true,
                'remaining_bytes' => 0,
                'message' => 'İzleme kotanız dolmuştur. İçerik izleyemezsiniz.',
            ]);
        }

        // Durum 3: Paketi var VE kotası var
        return response()->json([
            'allowed' => true,
            'reason' => 'access_granted',
            'has_package' => true,
            'remaining_bytes' => $remainingBytes,
            'message' => 'İçerik izlemeye izin verildi.',
        ]);
    }

    /**
     * Jellyfin oynatma esnasında harcanan veri miktarını Laravel abonelik kotasından düşer.
     */
    public function deductQuota(Request $request): JsonResponse
    {
        if (! $this->validateApiKey($request)) {
            return response()->json(['error' => 'Yetkisiz erişim: Geçersiz API anahtarı.'], 401);
        }

        $validated = $request->validate([
            'username' => 'required|string',
            'bytes' => 'required|integer|min:1',
        ]);

        /** @var User|null $user */
        $user = User::whereRaw('LOWER(name) = ?', [strtolower($validated['username'])])
            ->orWhereRaw('LOWER(email) = ?', [strtolower($validated['username'])])
            ->first();

        if (! $user) {
            return response()->json(['status' => 'error', 'message' => 'Kullanıcı bulunamadı.'], 404);
        }

        if (! $user->isAdmin()) {
            $this->subscriptionService->deductUserQuota($user, (int) $validated['bytes']);
        }

        $remainingBytes = $this->subscriptionService->getTotalRemainingBytes($user);

        return response()->json([
            'status' => 'success',
            'deducted_bytes' => (int) $validated['bytes'],
            'remaining_bytes' => $remainingBytes,
            'quota_exhausted' => ! $user->isAdmin() && $remainingBytes <= 0,
        ]);
    }

    /**
     * Jellyfin C# eklentisinden kota dolduğunda tetiklenen Webhook.
     */
    public function quotaExceeded(Request $request): JsonResponse
    {
        if (! $this->validateApiKey($request)) {
            return response()->json(['error' => 'Yetkisiz erişim: Geçersiz API anahtarı.'], 401);
        }

        $data = $request->validate([
            'username' => 'required|string',
            'used_bytes' => 'required|numeric',
            'max_bytes' => 'required|numeric',
        ]);

        Log::warning('Jellyfin kullanıcısı kotasını doldurdu.', [
            'username' => $data['username'],
            'used_bytes' => $data['used_bytes'],
            'max_bytes' => $data['max_bytes'],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Quota exceeded event logged successfully',
        ]);
    }

    /**
     * Gelen istekteki API anahtarını doğrular.
     */
    protected function validateApiKey(Request $request): bool
    {
        $configuredKey = (string) config('services.jellyfin.plugin_api_key', '');

        if ($configuredKey === '') {
            return true;
        }

        $providedKey = (string) ($request->header('X-Api-Key') ?? $request->query('api_key') ?? '');

        return hash_equals($configuredKey, $providedKey);
    }
}
