<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Services\Payment\PaddleService;
use App\Services\SubscriptionService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaddleCheckoutController extends Controller
{
    /**
     * Initiate a Paddle Billing checkout session and create a transaction.
     */
    public function initiate(
        Request $request,
        PaddleService $paddleService,
        SubscriptionService $subscriptionService
    ): JsonResponse {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Lütfen önce giriş yapınız.',
            ], 401);
        }

        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'duration_months' => 'required|integer|in:1,3,6,12',
            'is_upgrade' => 'nullable|boolean',
        ]);

        $plan = Plan::findOrFail($validated['plan_id']);
        $isUpgrade = $request->boolean('is_upgrade');
        $oldPlanId = null;

        if ($isUpgrade) {
            $calc = $subscriptionService->calculateUpgrade($user, $plan);
            if (! $calc || ! ($calc['can_upgrade'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bu pakete yükseltme yapılamaz veya aktif paketiniz bulunmamaktadır.',
                ], 422);
            }

            $amount = (float) $calc['upgrade_amount'];
            $oldPlanId = (int) $calc['current_plan']['id'];
            $durationMonths = (int) ($calc['duration_months'] ?? 1);
        } elseif ($plan->isExtra()) {
            if (! $subscriptionService->canBuyExtraQuota($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ek kota satın alabilmek için aktif bir bireysel veya business paketinizin bulunması gerekmektedir.',
                ], 422);
            }

            $durationMonths = 1;
            $amount = (float) $plan->getPriceForDuration(1);
        } else {
            if ($subscriptionService->hasActiveMainSubscription($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aktif bir aboneliğiniz bulunmaktadır. Yeni bir paket satın alamazsınız, yalnızca mevcut paketinizi yükseltebilir veya ek kota alabilirsiniz.',
                ], 422);
            }

            $durationMonths = (int) $validated['duration_months'];
            if (! $plan->isDurationAllowed($durationMonths)) {
                return response()->json([
                    'success' => false,
                    'message' => "{$plan->name} paketi için seçilen {$durationMonths} aylık abonelik döngüsü geçerli değildir.",
                ], 422);
            }

            $amount = (float) $plan->getPriceForDuration($durationMonths);
        }

        try {
            $transactionData = $paddleService->createTransaction(
                user: $user,
                plan: $plan,
                durationMonths: $durationMonths,
                amount: $amount,
                isUpgrade: $isUpgrade,
                oldPlanId: $oldPlanId
            );

            return response()->json([
                'success' => true,
                'transaction_id' => $transactionData['transaction_id'],
                'reference_code' => $transactionData['reference_code'],
                'client_token' => $transactionData['client_token'],
                'environment' => $transactionData['environment'],
                'amount' => $amount,
                'plan_name' => $plan->name,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
