<?php

namespace App\Services\Payment;

use App\Models\PaymentNotification;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class BankTransferService extends AbstractPaymentService
{
    public const DRIVER = 'bank';

    public const METHOD_ID = 'bank_transfer';

    public function getDriver(): string
    {
        return self::DRIVER;
    }

    public function getMethodId(): string
    {
        return self::METHOD_ID;
    }

    /**
     * Get configured bank name.
     */
    public function getBankName(): ?string
    {
        return $this->getSettings()['bank_name'] ?? null;
    }

    /**
     * Get account holder name.
     */
    public function getAccountHolder(): ?string
    {
        return $this->getSettings()['account_holder'] ?? null;
    }

    /**
     * Get IBAN number.
     */
    public function getIban(): ?string
    {
        return $this->getSettings()['iban'] ?? null;
    }

    /**
     * Get branch code.
     */
    public function getBranchCode(): ?string
    {
        return $this->getSettings()['branch_code'] ?? null;
    }

    /**
     * Get account number.
     */
    public function getAccountNumber(): ?string
    {
        return $this->getSettings()['account_number'] ?? null;
    }

    /**
     * Format IBAN with spaces for clear readability.
     */
    public function getFormattedIban(): string
    {
        $raw = preg_replace('/\s+/', '', (string) $this->getIban());

        return trim(chunk_split((string) $raw, 4, ' '));
    }

    /**
     * Validate user notification data for Bank Transfer.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    public function validateNotificationData(array $data): array
    {
        return Validator::make($data, [
            'sender_name' => ['required', 'string', 'max:150'],
            'user_notes' => ['nullable', 'string', 'max:500'],
        ], [
            'sender_name.required' => 'Banka havalesi için ödemeyi gönderen kişinin Adı Soyadı zorunludur.',
            'sender_name.max' => 'Gönderen adı en fazla 150 karakter olabilir.',
        ])->validate();
    }

    /**
     * Create a pending bank transfer payment notification.
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
        $referenceCode = $this->generateReferenceCode('PAY-BNK');

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
            'tx_hash' => null,
            'user_notes' => $data['user_notes'] ?? null,
            'status' => 'pending',
        ]);
    }
}
