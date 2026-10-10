<?php

namespace App\Services\Payment;

use App\Models\PaymentMethod;
use App\Models\PaymentNotification;
use App\Models\User;
use App\Services\SubscriptionService;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

abstract class AbstractPaymentService implements PaymentServiceInterface
{
    public function __construct(
        protected SubscriptionService $subscriptionService
    ) {}

    public function getMethod(): ?PaymentMethod
    {
        return PaymentMethod::find($this->getMethodId());
    }

    public function isActive(): bool
    {
        return (bool) ($this->getMethod()?->is_active ?? false);
    }

    public function getSettings(): array
    {
        return (array) ($this->getMethod()?->settings ?? []);
    }

    /**
     * Generate a unique reference code.
     */
    protected function generateReferenceCode(string $prefix = 'PAY'): string
    {
        return $prefix.'-'.date('Ymd').'-'.strtoupper(Str::random(6));
    }

    /**
     * Default approval logic across payment notifications.
     */
    public function approve(PaymentNotification $notification, ?User $admin = null, ?string $notes = null): bool
    {
        if ($notification->status === 'approved') {
            return true;
        }

        $user = $notification->user;
        $plan = $notification->plan;

        if (! $user) {
            throw new Exception('Ödeme bildirimine ait kullanıcı bulunamadı.');
        }

        DB::transaction(function () use ($notification, $user, $plan, $admin, $notes) {
            $driverName = strtoupper($this->getDriver());

            if ($notification->is_upgrade) {
                $this->subscriptionService->upgradeSubscription(
                    $user,
                    $plan,
                    (float) $notification->amount,
                    "{$driverName} Ödeme Bildirimi #{$notification->reference_code} (Paket Yükseltme) onaylandı"
                );
            } elseif ($plan && $plan->isExtra()) {
                $this->subscriptionService->purchaseExtraQuota(
                    $user,
                    $plan,
                    (float) $notification->amount,
                    "{$driverName} Ödeme Bildirimi #{$notification->reference_code} (Ek Kota) onaylandı"
                );
            } else {
                $this->subscriptionService->subscribe(
                    $user,
                    $plan,
                    $notification->duration_months,
                    (float) $notification->amount,
                    "{$driverName} Ödeme Bildirimi #{$notification->reference_code} onaylandı"
                );
            }

            $notification->update([
                'status' => 'approved',
                'processed_at' => now(),
                'processed_by' => $admin?->id,
                'admin_notes' => $notes ?: 'Ödeme doğrulandı ve onaylandı.',
            ]);

            Log::info("{$driverName} payment notification approved", [
                'notification_id' => $notification->id,
                'reference_code' => $notification->reference_code,
                'admin_id' => $admin?->id,
                'user_id' => $user->id,
            ]);
        });

        return true;
    }

    /**
     * Default rejection logic across payment notifications.
     */
    public function reject(PaymentNotification $notification, ?User $admin = null, ?string $notes = null): bool
    {
        $notification->update([
            'status' => 'rejected',
            'processed_at' => now(),
            'processed_by' => $admin?->id,
            'admin_notes' => $notes ?: 'Ödeme doğrulanamadı veya reddedildi.',
        ]);

        Log::info(strtoupper($this->getDriver()).' payment notification rejected', [
            'notification_id' => $notification->id,
            'reference_code' => $notification->reference_code,
            'admin_id' => $admin?->id,
        ]);

        return true;
    }
}
