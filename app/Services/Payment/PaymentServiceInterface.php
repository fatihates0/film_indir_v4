<?php

namespace App\Services\Payment;

use App\Models\PaymentMethod;
use App\Models\PaymentNotification;
use App\Models\Plan;
use App\Models\User;

interface PaymentServiceInterface
{
    /**
     * Get the driver name (e.g. 'bank', 'crypto', 'paddle').
     */
    public function getDriver(): string;

    /**
     * Get the primary PaymentMethod ID associated with this service (e.g. 'bank_transfer', 'usdt_crypto', 'paddle').
     */
    public function getMethodId(): string;

    /**
     * Retrieve the Eloquent PaymentMethod model.
     */
    public function getMethod(): ?PaymentMethod;

    /**
     * Determine whether the payment method is active.
     */
    public function isActive(): bool;

    /**
     * Get settings array configured for this payment method.
     *
     * @return array<string, mixed>
     */
    public function getSettings(): array;

    /**
     * Validate user notification input for this payment method.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function validateNotificationData(array $data): array;

    /**
     * Create a payment notification record.
     *
     * @param  array<string, mixed>  $data
     */
    public function createNotification(
        User $user,
        Plan $plan,
        array $data,
        float $amount,
        int $durationMonths,
        bool $isUpgrade = false,
        ?int $oldPlanId = null
    ): PaymentNotification;

    /**
     * Approve a payment notification and activate the subscription.
     */
    public function approve(PaymentNotification $notification, ?User $admin = null, ?string $notes = null): bool;

    /**
     * Reject a payment notification.
     */
    public function reject(PaymentNotification $notification, ?User $admin = null, ?string $notes = null): bool;
}
