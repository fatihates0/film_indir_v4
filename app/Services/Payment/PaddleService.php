<?php

namespace App\Services\Payment;

use App\Models\PaymentMethod;
use App\Models\PaymentNotification;
use App\Models\Plan;
use App\Models\User;
use App\Services\SubscriptionService;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaddleService
{
    public const SANDBOX_API_URL = 'https://sandbox-api.paddle.com';

    public const PRODUCTION_API_URL = 'https://api.paddle.com';

    public function __construct(
        protected SubscriptionService $subscriptionService
    ) {}

    /**
     * Get the active Paddle configuration merging DB settings and config/services.php.
     *
     * @return array{
     *     environment: string,
     *     base_url: string,
     *     client_token: string,
     *     api_key: string,
     *     webhook_secret: string,
     *     currency: string,
     *     is_active: bool
     * }
     */
    public function getConfig(): array
    {
        $method = PaymentMethod::find('paddle');
        $dbSettings = (array) ($method?->settings ?? []);

        $env = (string) ($dbSettings['environment'] ?? config('services.paddle.env', 'sandbox'));
        $env = strtolower(trim($env)) === 'production' ? 'production' : 'sandbox';

        $clientToken = trim((string) ($dbSettings['client_token'] ?? config('services.paddle.client_token', '')));
        $clientToken = trim($clientToken, " \t\n\r\0\x0B\"'");

        $apiKey = trim((string) ($dbSettings['api_key'] ?? config('services.paddle.api_key', '')));
        $apiKey = trim($apiKey, " \t\n\r\0\x0B\"'");
        if (str_starts_with(strtolower($apiKey), 'bearer ')) {
            $apiKey = trim(substr($apiKey, 7));
        }

        $webhookSecret = trim((string) ($dbSettings['webhook_secret'] ?? config('services.paddle.webhook_secret', '')));
        $webhookSecret = trim($webhookSecret, " \t\n\r\0\x0B\"'");

        $currency = strtoupper(trim((string) ($dbSettings['currency'] ?? config('services.paddle.currency', 'TRY'))));

        $baseUrl = $env === 'production' ? self::PRODUCTION_API_URL : self::SANDBOX_API_URL;

        return [
            'environment' => $env,
            'base_url' => $baseUrl,
            'client_token' => $clientToken,
            'api_key' => $apiKey,
            'webhook_secret' => $webhookSecret,
            'currency' => $currency ?: 'TRY',
            'is_active' => (bool) ($method?->is_active ?? false),
        ];
    }

    /**
     * Create a Paddle Billing transaction for a checkout session.
     *
     * @return array{
     *     transaction_id: string,
     *     reference_code: string,
     *     client_token: string,
     *     environment: string
     * }
     *
     * @throws Exception
     */
    public function createTransaction(
        User $user,
        Plan $plan,
        int $durationMonths,
        float $amount,
        bool $isUpgrade = false,
        ?int $oldPlanId = null
    ): array {
        $config = $this->getConfig();

        if (! $config['is_active']) {
            throw new Exception('Kredi kartı (Paddle) ile ödeme yöntemi şu anda aktif değildir.');
        }

        if (empty($config['api_key']) || empty($config['client_token'])) {
            throw new Exception('Paddle API anahtarı veya Client Token henüz yapılandırılmamış. Lütfen yönetici ile iletişime geçiniz.');
        }

        $referenceCode = 'PAY-PAD-'.date('Ymd').'-'.strtoupper(Str::random(6));

        // Amount in minor currency units (e.g. 250.00 TRY -> "25000")
        $minorUnitAmount = (string) (int) round($amount * 100);

        $durationLabel = $plan->isExtra()
            ? '30 Günlük Ek Kota'
            : ($durationMonths === 12 ? '1 Yıllık (12 Ay)' : "{$durationMonths} Aylık");

        $itemDescription = "{$plan->name} ({$durationLabel})";

        $customData = [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'duration_months' => $durationMonths,
            'is_upgrade' => $isUpgrade,
            'old_plan_id' => $oldPlanId,
            'amount' => $amount,
            'reference_code' => $referenceCode,
        ];

        $payload = [
            'items' => [
                [
                    'quantity' => 1,
                    'price' => [
                        'description' => $itemDescription,
                        'name' => $plan->name,
                        'product' => [
                            'name' => $plan->name,
                            'description' => "film_indir - {$itemDescription}",
                            'tax_category' => 'standard',
                        ],
                        'unit_price' => [
                            'amount' => $minorUnitAmount,
                            'currency_code' => $config['currency'],
                        ],
                    ],
                ],
            ],
            'customer_details' => [
                'email' => $user->email,
            ],
            'custom_data' => $customData,
        ];

        $response = Http::withToken($config['api_key'])
            ->withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->timeout(20)
            ->post("{$config['base_url']}/transactions", $payload);

        if (! $response->successful()) {
            $errorBody = $response->json();
            $detail = (string) ($errorBody['error']['detail'] ?? '');
            $code = (string) ($errorBody['error']['code'] ?? '');

            if (str_contains($detail, 'no default payment link') || str_contains($code, 'no_default_payment_link')) {
                $errorMessage = "Paddle hesabınızda 'Default Payment Link' tanımlanmamış. Lütfen Paddle Dashboard > Checkout > Checkout settings ekranında varsayılan ödeme bağlantınızı (örn: ".url('/pricing').') girip kaydedin.';
            } elseif (str_contains($detail, 'Authentication header') || str_contains($code, 'authentication_malformed')) {
                $errorMessage = "Paddle API anahtar biçimi geçersiz. API Key 'pdl_sdbx_apikey_...' formatında olmalı ve başında 'Bearer' yazmamalıdır.";
            } else {
                $errorMessage = $detail ?: $response->body();
            }

            Log::error('Paddle createTransaction failed', [
                'status' => $response->status(),
                'response' => $errorBody,
                'payload' => $payload,
            ]);

            throw new Exception("Paddle işlemi başlatılamadı: {$errorMessage}");
        }

        $responseData = $response->json('data');
        $transactionId = (string) ($responseData['id'] ?? '');

        if (empty($transactionId)) {
            throw new Exception('Paddle işlem kimliği (transaction_id) alınamadı.');
        }

        // Create pending payment notification record
        PaymentNotification::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'is_upgrade' => $isUpgrade,
            'old_plan_id' => $oldPlanId,
            'payment_method_id' => 'paddle',
            'duration_months' => $durationMonths,
            'amount' => $amount,
            'reference_code' => $referenceCode,
            'sender_name' => $user->name,
            'tx_hash' => $transactionId,
            'user_notes' => 'Paddle Güvenli Kart Ödemesi Başlatıldı',
            'status' => 'pending',
        ]);

        return [
            'transaction_id' => $transactionId,
            'reference_code' => $referenceCode,
            'client_token' => $config['client_token'],
            'environment' => $config['environment'],
        ];
    }

    /**
     * Verify the raw Paddle Billing webhook signature.
     */
    public function verifyWebhookSignature(string $rawPayload, ?string $signatureHeader): bool
    {
        $config = $this->getConfig();
        $secretKey = $config['webhook_secret'];

        if (empty($secretKey) || empty($signatureHeader)) {
            Log::warning('Paddle webhook signature verification skipped: missing secret or header');

            return false;
        }

        // Header format: ts=1671552777;h1=0bc...
        $parts = explode(';', $signatureHeader);
        $ts = null;
        $h1 = null;

        foreach ($parts as $part) {
            $pair = explode('=', trim($part), 2);
            if (count($pair) === 2) {
                if ($pair[0] === 'ts') {
                    $ts = $pair[1];
                } elseif ($pair[0] === 'h1') {
                    $h1 = $pair[1];
                }
            }
        }

        if (! $ts || ! $h1) {
            return false;
        }

        // Prevent replay attacks (tolerance 300 seconds)
        if (abs(time() - (int) $ts) > 300) {
            Log::warning('Paddle webhook timestamp out of tolerance', ['ts' => $ts, 'now' => time()]);

            return false;
        }

        $signedPayload = "{$ts}:{$rawPayload}";
        $computedHash = hash_hmac('sha256', $signedPayload, $secretKey);

        return hash_equals($h1, $computedHash);
    }

    /**
     * Process verified Paddle Billing webhook event payload.
     *
     * @param  array<string, mixed>  $payload
     *
     * @throws Exception
     */
    public function processWebhookEvent(array $payload): bool
    {
        $eventType = (string) ($payload['event_type'] ?? '');
        $data = (array) ($payload['data'] ?? []);

        Log::info("Paddle webhook received: {$eventType}", ['event_id' => $payload['event_id'] ?? null]);

        // We handle completed, paid, or billed transactions
        if (! in_array($eventType, ['transaction.completed', 'transaction.paid', 'transaction.billed'], true)) {
            return true;
        }

        $transactionId = (string) ($data['id'] ?? '');
        $customData = (array) ($data['custom_data'] ?? []);

        $referenceCode = (string) ($customData['reference_code'] ?? '');
        $userId = (int) ($customData['user_id'] ?? 0);
        $planId = (int) ($customData['plan_id'] ?? 0);
        $durationMonths = (int) ($customData['duration_months'] ?? 1);
        $isUpgrade = (bool) ($customData['is_upgrade'] ?? false);
        $amount = (float) ($customData['amount'] ?? 0.0);

        if ($amount <= 0 && isset($data['details']['totals']['total'])) {
            $minorTotal = (float) $data['details']['totals']['total'];
            $amount = round($minorTotal / 100, 2);
        }

        $user = User::find($userId);
        $plan = Plan::find($planId);

        if (! $user || ! $plan) {
            Log::error('Paddle webhook user or plan not found', [
                'user_id' => $userId,
                'plan_id' => $planId,
                'transaction_id' => $transactionId,
            ]);

            return false;
        }

        // Find or locate PaymentNotification
        $notification = null;
        if (! empty($referenceCode)) {
            $notification = PaymentNotification::where('reference_code', $referenceCode)->first();
        }

        if (! $notification && ! empty($transactionId)) {
            $notification = PaymentNotification::where('tx_hash', $transactionId)->first();
        }

        if ($notification && $notification->status === 'approved') {
            Log::info("Paddle transaction {$transactionId} already approved. Skipping duplicate processing.");

            return true;
        }

        DB::transaction(function () use (
            $notification,
            $user,
            $plan,
            $isUpgrade,
            $amount,
            $durationMonths,
            $transactionId,
            $referenceCode,
            $eventType
        ) {
            // Activate plan/subscription via SubscriptionService
            if ($isUpgrade) {
                $this->subscriptionService->upgradeSubscription(
                    $user,
                    $plan,
                    $amount,
                    "Paddle Kredi Kartı (#{$referenceCode} / {$transactionId}) ile paket yükseltme otomatik tamamlandı"
                );
            } elseif ($plan->isExtra()) {
                $this->subscriptionService->purchaseExtraQuota(
                    $user,
                    $plan,
                    $amount,
                    "Paddle Kredi Kartı (#{$referenceCode} / {$transactionId}) ile ek kota otomatik tanımlandı"
                );
            } else {
                $this->subscriptionService->subscribe(
                    $user,
                    $plan,
                    $durationMonths,
                    $amount,
                    "Paddle Kredi Kartı (#{$referenceCode} / {$transactionId}) ile ödeme otomatik onaylandı"
                );
            }

            // Update or create PaymentNotification as approved
            $updateData = [
                'status' => 'approved',
                'tx_hash' => $transactionId,
                'processed_at' => now(),
                'admin_notes' => "Paddle Webhook ({$eventType}) ile otomatik onaylandı ve anında aktif edildi.",
            ];

            if ($notification) {
                $notification->update($updateData);
            } else {
                PaymentNotification::create(array_merge($updateData, [
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'is_upgrade' => $isUpgrade,
                    'payment_method_id' => 'paddle',
                    'duration_months' => $durationMonths,
                    'amount' => $amount,
                    'reference_code' => $referenceCode ?: 'PAY-PAD-'.strtoupper(Str::random(8)),
                    'sender_name' => $user->name,
                ]));
            }
        });

        Log::info("Paddle transaction {$transactionId} successfully activated for user {$user->id} ({$plan->name}).");

        return true;
    }
}
