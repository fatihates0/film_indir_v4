<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Models\PaymentNotification;
use App\Models\Plan;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentNotificationController extends Controller
{
    /**
     * Submit a new payment notification (User side).
     */
    public function store(Request $request, SubscriptionService $subscriptionService)
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->back()->with('error', 'Lütfen önce giriş yapınız.');
        }

        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'duration_months' => 'required|integer|in:1,3,6,12',
            'is_upgrade' => 'nullable|boolean',
            'sender_name' => 'nullable|string|max:150',
            'tx_hash' => 'nullable|string|max:255',
            'user_notes' => 'nullable|string|max:500',
        ]);

        $paymentMethod = PaymentMethod::where('id', $validated['payment_method_id'])
            ->where('is_active', true)
            ->first();

        if (! $paymentMethod) {
            return redirect()->back()->with('error', 'Seçilen ödeme yöntemi şu anda aktif değildir.');
        }

        $plan = Plan::findOrFail($validated['plan_id']);
        $isUpgrade = $request->boolean('is_upgrade');
        $oldPlanId = null;

        if ($isUpgrade) {
            $calc = $subscriptionService->calculateUpgrade($user, $plan);
            if (! $calc || ! ($calc['can_upgrade'] ?? false)) {
                return redirect()->back()->with('error', 'Bu pakete yükseltme yapılamaz veya aktif paketiniz bulunmamaktadır.');
            }

            $amount = (float) $calc['upgrade_amount'];
            $oldPlanId = (int) $calc['current_plan']['id'];
            $durationMonths = (int) ($calc['duration_months'] ?? 1);
        } elseif ($plan->isExtra()) {
            // Extra Quota validation: User MUST have an active main subscription to buy extra quota!
            if (! $subscriptionService->canBuyExtraQuota($user)) {
                return redirect()->back()->with('error', 'Ek kota satın alabilmek için aktif bir bireysel veya business paketinizin bulunması gerekmektedir.');
            }
            $durationMonths = 1;
            $amount = $plan->getPriceForDuration(1);
        } else {
            $durationMonths = (int) $validated['duration_months'];
            if (! $plan->isDurationAllowed($durationMonths)) {
                return redirect()->back()->with('error', "{$plan->name} paketi için seçilen {$durationMonths} aylık abonelik döngüsü geçerli değildir.");
            }
            $amount = $plan->getPriceForDuration($durationMonths);
        }

        $referenceCode = 'PAY-'.date('Ymd').'-'.strtoupper(Str::random(6));

        PaymentNotification::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'is_upgrade' => $isUpgrade,
            'old_plan_id' => $oldPlanId,
            'payment_method_id' => $paymentMethod->id,
            'duration_months' => $durationMonths,
            'amount' => $amount,
            'reference_code' => $referenceCode,
            'sender_name' => $validated['sender_name'] ?? null,
            'tx_hash' => $validated['tx_hash'] ?? null,
            'user_notes' => $validated['user_notes'] ?? null,
            'status' => 'pending',
        ]);

        $successMsg = $isUpgrade
            ? "Paket yükseltme bildiriminiz başarıyla alındı! Referans Kodunuz: {$referenceCode}. Admin onayının ardından yeni paketiniz aktif edilecektir."
            : "Ödeme bildiriminiz başarıyla alındı! Referans Kodunuz: {$referenceCode}. Admin onayının ardından paketiniz tanımlanacaktır.";

        return redirect()->back()->with('success', $successMsg);
    }

    /**
     * Approve a payment notification (Admin side).
     */
    public function approve(Request $request, PaymentNotification $notification, SubscriptionService $subscriptionService)
    {
        if ($notification->status === 'approved') {
            return redirect()->back()->with('error', 'Bu ödeme bildirimi zaten onaylanmış.');
        }

        $admin = $request->user();
        $user = $notification->user;
        $plan = $notification->plan;

        if (! $user) {
            return redirect()->back()->with('error', 'Kullanıcı bulunamadı.');
        }

        try {
            DB::transaction(function () use ($notification, $subscriptionService, $user, $plan, $admin, $request) {
                if ($notification->is_upgrade) {
                    $subscriptionService->upgradeSubscription(
                        $user,
                        $plan,
                        (float) $notification->amount,
                        "Ödeme Bildirimi #{$notification->reference_code} (Paket Yükseltme) onaylandı"
                    );
                } elseif ($plan && $plan->isExtra()) {
                    $subscriptionService->purchaseExtraQuota(
                        $user,
                        $plan,
                        (float) $notification->amount,
                        "Ödeme Bildirimi #{$notification->reference_code} onaylandı"
                    );
                } else {
                    $subscriptionService->subscribe(
                        $user,
                        $plan,
                        $notification->duration_months,
                        (float) $notification->amount,
                        "Ödeme Bildirimi #{$notification->reference_code} onaylandı"
                    );
                }

                $notification->update([
                    'status' => 'approved',
                    'processed_at' => now(),
                    'processed_by' => $admin?->id,
                    'admin_notes' => $request->input('admin_notes', 'Ödeme doğrulandı ve onaylandı.'),
                ]);
            });
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        $successMsg = $notification->is_upgrade
            ? "#{$notification->reference_code} referanslı paket yükseltme bildirimi onaylandı ve kullanıcının yeni kotası tanımlandı."
            : "#{$notification->reference_code} referanslı ödeme bildirimi onaylandı ve kullanıcının paketi tanımlandı.";

        return redirect()->back()->with('success', $successMsg);
    }

    /**
     * Reject a payment notification (Admin side).
     */
    public function reject(Request $request, PaymentNotification $notification)
    {
        $admin = $request->user();

        $notification->update([
            'status' => 'rejected',
            'processed_at' => now(),
            'processed_by' => $admin?->id,
            'admin_notes' => $request->input('admin_notes', 'Ödeme doğrulanamadı veya yetersiz tutar.'),
        ]);

        return redirect()->back()->with('success', "#{$notification->reference_code} referanslı ödeme bildirimi reddedildi.");
    }
}
