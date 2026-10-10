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
        $users = User::all();
        $response = [];

        foreach ($users as $user) {
            $summary = $this->subscriptionService->getQuotaSummary($user);

            if (! $summary || ! $summary['has_subscription']) {
                continue;
            }

            $response[] = [
                'user_id' => $user->id,
                'username' => $user->name,
                'max_bytes' => $summary['allocated_bytes'],
                'used_bytes' => $summary['used_bytes'],
                'remaining_bytes' => $summary['remaining_bytes'],
                'cycle_start_date' => now()->startOfMonth()->toIso8601String(),
                'cycle_end_date' => $summary['period_end'] ?? now()->addMonth()->toIso8601String(),
            ];
        }

        return response()->json($response);
    }

    /**
     * Jellyfin oynatma başlatılmadan önce kullanıcının paket ve kota erişimini denetler.
     */
    public function checkAccess(Request $request): JsonResponse
    {
        $username = $request->query('username');

        if (! $username) {
            return response()->json(['allowed' => false, 'message' => 'Kullanıcı adı belirtilmedi.'], 400);
        }

        /** @var User|null $user */
        $user = User::where('name', $username)->orWhere('email', $username)->first();

        if (! $user) {
            return response()->json([
                'allowed' => false,
                'reason' => 'user_not_found',
                'message' => 'Kullanıcı sistemde bulunamadı.',
            ], 404);
        }

        if ($user->isAdmin()) {
            return response()->json([
                'allowed' => true,
                'reason' => 'admin',
                'remaining_bytes' => 999999999999999,
                'message' => 'Yönetici erişimi.',
            ]);
        }

        $hasMainSub = $this->subscriptionService->hasActiveMainSubscription($user);

        if (! $hasMainSub) {
            return response()->json([
                'allowed' => false,
                'reason' => 'no_package',
                'message' => 'Aktif bir abonelik paketiniz bulunmamaktadır.',
            ]);
        }

        $remainingBytes = $this->subscriptionService->getTotalRemainingBytes($user);

        if ($remainingBytes <= 0) {
            return response()->json([
                'allowed' => false,
                'reason' => 'quota_exceeded',
                'message' => 'İzleme kotanız dolmuştur. İçerik izleyemezsiniz.',
            ]);
        }

        return response()->json([
            'allowed' => true,
            'reason' => 'active_quota',
            'remaining_bytes' => $remainingBytes,
            'message' => 'İçerik izlemeye izin verildi.',
        ]);
    }

    /**
     * Jellyfin oynatma esnasında harcanan veri miktarını Laravel abonelik kotasından düşer.
     */
    public function deductQuota(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string',
            'bytes' => 'required|integer|min:1',
        ]);

        /** @var User|null $user */
        $user = User::where('name', $validated['username'])->orWhere('email', $validated['username'])->first();

        if (! $user) {
            return response()->json(['status' => 'error', 'message' => 'Kullanıcı bulunamadı.'], 404);
        }

        $this->subscriptionService->deductUserQuota($user, (int) $validated['bytes']);

        $remainingBytes = $this->subscriptionService->getTotalRemainingBytes($user);

        return response()->json([
            'status' => 'success',
            'deducted_bytes' => $validated['bytes'],
            'remaining_bytes' => $remainingBytes,
            'quota_exhausted' => $remainingBytes <= 0,
        ]);
    }

    /**
     * Jellyfin C# eklentisinden kota dolduğunda tetiklenen Webhook.
     */
    public function quotaExceeded(Request $request): JsonResponse
    {
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
}
