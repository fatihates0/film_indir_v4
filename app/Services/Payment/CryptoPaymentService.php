<?php

namespace App\Services\Payment;

use App\Models\PaymentNotification;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class CryptoPaymentService extends AbstractPaymentService
{
    public const DRIVER = 'crypto';

    public const METHOD_ID = 'usdt_crypto';

    public function getDriver(): string
    {
        return self::DRIVER;
    }

    public function getMethodId(): string
    {
        return self::METHOD_ID;
    }

    /**
     * Get crypto network (e.g. TRC-20).
     */
    public function getNetwork(): string
    {
        return (string) ($this->getSettings()['network'] ?? 'TRC-20');
    }

    /**
     * Get crypto destination wallet address.
     */
    public function getWalletAddress(): ?string
    {
        return $this->getSettings()['wallet_address'] ?? null;
    }

    /**
     * Get currency name (e.g. USDT).
     */
    public function getCurrency(): string
    {
        return (string) ($this->getSettings()['currency'] ?? 'USDT');
    }

    /**
     * Get extra notes or guidelines for sending crypto.
     */
    public function getNotes(): ?string
    {
        return $this->getSettings()['notes'] ?? null;
    }

    /**
     * Validate user notification data for Crypto payment.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    public function validateNotificationData(array $data): array
    {
        return Validator::make($data, [
            'tx_hash' => ['required', 'string', 'min:8', 'max:255'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'user_notes' => ['nullable', 'string', 'max:500'],
        ], [
            'tx_hash.required' => 'Kripto ödemesi için transfer işlem kodu (TxID / Hash) zorunludur.',
            'tx_hash.min' => 'Geçerli bir transfer işlem kodu (TxID) giriniz.',
            'tx_hash.max' => 'Transfer işlem kodu en fazla 255 karakter olabilir.',
        ])->validate();
    }

    /**
     * Create a pending crypto payment notification.
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
    ): PaymentNotification {
        $referenceCode = $this->generateReferenceCode('PAY-CRY');

        return PaymentNotification::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'is_upgrade' => $isUpgrade,
            'old_plan_id' => $oldPlanId,
            'payment_method_id' => $this->getMethodId(),
            'duration_months' => $durationMonths,
            'amount' => $amount,
            'reference_code' => $referenceCode,
            'sender_name' => $data['sender_name'] ?? null,
            'tx_hash' => trim((string) ($data['tx_hash'] ?? '')),
            'user_notes' => $data['user_notes'] ?? null,
            'status' => 'pending',
        ]);
    }
}
