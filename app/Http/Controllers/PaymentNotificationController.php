<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Models\PaymentNotification;
use App\Models\Plan;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentNotificationController extends Controller
{
    /**
     * Submit a new payment notification (User side).
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->back()->with('error', 'Lütfen önce giriş yapınız.');
        }

        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'duration_months' => 'required|integer|in:1,3,6,12',
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
        $durationMonths = (int) $validated['duration_months'];
        $amount = $plan->getPriceForDuration($durationMonths);

        $referenceCode = 'PAY-'.date('Ymd').'-'.strtoupper(Str::random(6));

        PaymentNotification::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'payment_method_id' => $paymentMethod->id,
            'duration_months' => $durationMonths,
            'amount' => $amount,
            'reference_code' => $referenceCode,
            'sender_name' => $validated['sender_name'] ?? null,
            'tx_hash' => $validated['tx_hash'] ?? null,
            'user_notes' => $validated['user_notes'] ?? null,
            'status' => 'pending',
        ]);

        return redirect()->back()->with('success', "Ödeme bildiriminiz başarıyla alındı! Referans Kodunuz: {$referenceCode}. Admin onayının ardından paketiniz tanımlanacaktır.");
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

        // Activate user subscription
        $subscriptionService->subscribe(
            $user,
            $plan,
            $notification->duration_months,
            (float) $notification->amount,
            "Ödeme Bildirimi #{$notification->reference_code} onaylandı"
        );

        $notification->update([
            'status' => 'approved',
            'processed_at' => now(),
            'processed_by' => $admin?->id,
            'admin_notes' => $request->input('admin_notes', 'Ödeme doğrulandı ve onaylandı.'),
        ]);

        return redirect()->back()->with('success', "#{$notification->reference_code} referanslı ödeme bildirimi onaylandı ve kullanıcının paketi tanımlandı.");
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
