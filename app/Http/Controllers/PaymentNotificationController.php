<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Models\PaymentNotification;
use App\Models\Plan;
use App\Services\Payment\PaddleService;
use App\Services\Payment\PaymentManager;
use App\Services\SubscriptionService;
use Exception;
use Illuminate\Http\Request;

class PaymentNotificationController extends Controller
{
    /**
     * Submit a new payment notification (User side).
     */
    public function store(Request $request, SubscriptionService $subscriptionService, PaymentManager $paymentManager)
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

        $paymentService = $paymentManager->forMethod($paymentMethod);

        // Driver-specific validation (sender_name for bank, tx_hash for crypto, etc.)
        $paymentService->validateNotificationData($request->all());

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
            // Normal main plan purchase: User must NOT have an active main subscription!
            if ($subscriptionService->hasActiveMainSubscription($user)) {
                return redirect()->back()->with('error', 'Aktif bir aboneliğiniz bulunmaktadır. Yeni bir paket satın alamazsınız, yalnızca mevcut paketinizi yükseltebilir veya ek kota alabilirsiniz.');
            }

            $durationMonths = (int) $validated['duration_months'];
            if (! $plan->isDurationAllowed($durationMonths)) {
                return redirect()->back()->with('error', "{$plan->name} paketi için seçilen {$durationMonths} aylık abonelik döngüsü geçerli değildir.");
            }
            $amount = $plan->getPriceForDuration($durationMonths);
        }

        $notification = $paymentService->createNotification(
            $user,
            $plan,
            $validated,
            $amount,
            $durationMonths,
            $isUpgrade,
            $oldPlanId
        );

        $successMsg = $isUpgrade
            ? "Paket yükseltme bildiriminiz başarıyla alındı! Referans Kodunuz: {$notification->reference_code}. Admin onayının ardından yeni paketiniz aktif edilecektir."
            : "Ödeme bildiriminiz başarıyla alındı! Referans Kodunuz: {$notification->reference_code}. Admin onayının ardından paketiniz tanımlanacaktır.";

        return redirect()->back()->with('success', $successMsg);
    }

    /**
     * Approve a payment notification (Admin side).
     */
    public function approve(Request $request, PaymentNotification $notification, PaymentManager $paymentManager)
    {
        if ($notification->status === 'approved') {
            return redirect()->back()->with('error', 'Bu ödeme bildirimi zaten onaylanmış.');
        }

        try {
            $paymentManager->forNotification($notification)->approve(
                $notification,
                $request->user(),
                $request->input('admin_notes', 'Ödeme doğrulandı ve onaylandı.')
            );
        } catch (Exception $e) {
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
    public function reject(Request $request, PaymentNotification $notification, PaymentManager $paymentManager)
    {
        $paymentManager->forNotification($notification)->reject(
            $notification,
            $request->user(),
            $request->input('admin_notes', 'Ödeme doğrulanamadı veya yetersiz tutar.')
        );

        return redirect()->back()->with('success', "#{$notification->reference_code} referanslı ödeme bildirimi reddedildi.");
    }

    /**
     * View or download Paddle invoice PDF for a payment notification.
     */
    public function paddleInvoice(PaymentNotification $notification, PaddleService $paddleService)
    {
        $transactionId = $notification->tx_hash;

        if (empty($transactionId)) {
            return redirect()->back()->with('error', 'Bu bildirime ait bir Paddle işlem kodu (Transaction ID) bulunamadı.');
        }

        $invoiceUrl = $paddleService->getTransactionInvoiceUrl($transactionId);

        if (! empty($invoiceUrl)) {
            return redirect()->away($invoiceUrl);
        }

        // Fallback to Paddle Vendor Dashboard transaction page
        $dashboardUrl = $paddleService->getDashboardTransactionUrl($transactionId);

        return redirect()->away($dashboardUrl);
    }
}
