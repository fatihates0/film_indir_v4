<?php

namespace Tests\Feature;

use App\Models\PaymentMethod;
use App\Models\PaymentNotification;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaddlePaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure paddle payment method exists in DB
        PaymentMethod::updateOrCreate(
            ['id' => 'paddle'],
            [
                'name' => 'Kredi / Banka Kartı (Paddle)',
                'driver' => 'paddle',
                'description' => 'Paddle test',
                'instructions' => 'Test instructions',
                'is_active' => true,
                'settings' => [
                    'environment' => 'sandbox',
                    'client_token' => 'test_client_token_123',
                    'api_key' => 'pdl_sdb_test_api_key_456',
                    'webhook_secret' => 'pdl_ntfset_secret_789',
                    'currency' => 'TRY',
                ],
            ]
        );
    }

    public function test_guest_cannot_initiate_paddle_checkout(): void
    {
        $plan = Plan::create([
            'name' => 'Test Plan',
            'slug' => 'test-plan',
            'type' => Plan::TYPE_INDIVIDUAL,
            'monthly_quota_bytes' => 100 * 1024 * 1024 * 1024,
            'monthly_quota_gb' => 100,
            'price_1m' => 150.00,
            'is_active' => true,
        ]);

        $response = $this->postJson(route('paddle.checkout.init'), [
            'plan_id' => $plan->id,
            'duration_months' => 1,
        ]);

        $response->assertStatus(401);
    }

    public function test_user_can_initiate_paddle_checkout(): void
    {
        $user = User::factory()->create();

        $plan = Plan::create([
            'name' => 'Test Plan',
            'slug' => 'test-plan',
            'type' => Plan::TYPE_INDIVIDUAL,
            'monthly_quota_bytes' => 100 * 1024 * 1024 * 1024,
            'monthly_quota_gb' => 100,
            'price_1m' => 200.00,
            'allowed_durations' => [1, 3, 6, 12],
            'is_active' => true,
        ]);

        Http::fake([
            'https://sandbox-api.paddle.com/transactions' => Http::response([
                'data' => [
                    'id' => 'txn_01j_test_12345',
                    'status' => 'draft',
                ],
            ], 200),
        ]);

        $response = $this->actingAs($user)->postJson(route('paddle.checkout.init'), [
            'plan_id' => $plan->id,
            'duration_months' => 1,
        ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'transaction_id' => 'txn_01j_test_12345',
            'client_token' => 'test_client_token_123',
            'environment' => 'sandbox',
            'amount' => 200.0,
            'plan_name' => 'Test Plan',
        ]);

        $this->assertDatabaseHas('payment_notifications', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'payment_method_id' => 'paddle',
            'amount' => 200.00,
            'tx_hash' => 'txn_01j_test_12345',
            'status' => 'pending',
        ]);
    }

    public function test_paddle_webhook_rejects_invalid_signature(): void
    {
        $payload = json_encode([
            'event_type' => 'transaction.completed',
            'data' => ['id' => 'txn_test'],
        ]);

        $response = $this->call(
            'POST',
            route('paddle.webhook'),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_PADDLE_SIGNATURE' => 'ts='.time().';h1=invalid_hash',
            ],
            $payload
        );

        $response->assertStatus(400);
        $response->assertJson(['success' => false]);
    }

    public function test_paddle_webhook_processes_transaction_completed_and_activates_subscription(): void
    {
        $user = User::factory()->create();

        $plan = Plan::create([
            'name' => 'VIP Paket',
            'slug' => 'vip-paket',
            'type' => Plan::TYPE_INDIVIDUAL,
            'monthly_quota_bytes' => 500 * 1024 * 1024 * 1024,
            'monthly_quota_gb' => 500,
            'price_1m' => 350.00,
            'is_active' => true,
        ]);

        $referenceCode = 'PAY-PAD-TEST-001';
        $txnId = 'txn_live_paddle_test_999';

        $notification = PaymentNotification::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'payment_method_id' => 'paddle',
            'duration_months' => 1,
            'amount' => 350.00,
            'reference_code' => $referenceCode,
            'tx_hash' => $txnId,
            'status' => 'pending',
        ]);

        $payloadData = [
            'event_id' => 'evt_123',
            'event_type' => 'transaction.completed',
            'data' => [
                'id' => $txnId,
                'status' => 'completed',
                'custom_data' => [
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'duration_months' => 1,
                    'is_upgrade' => false,
                    'amount' => 350.00,
                    'reference_code' => $referenceCode,
                ],
            ],
        ];

        $rawBody = json_encode($payloadData);
        $ts = time();
        $secret = 'pdl_ntfset_secret_789';
        $h1 = hash_hmac('sha256', "{$ts}:{$rawBody}", $secret);
        $signatureHeader = "ts={$ts};h1={$h1}";

        $response = $this->call(
            'POST',
            route('paddle.webhook'),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_PADDLE_SIGNATURE' => $signatureHeader,
            ],
            $rawBody
        );

        $response->assertOk();
        $response->assertJson(['success' => true]);

        // Verify payment notification marked approved
        $this->assertDatabaseHas('payment_notifications', [
            'id' => $notification->id,
            'status' => 'approved',
            'tx_hash' => $txnId,
        ]);

        // Verify user has active subscription created
        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'active',
        ]);
    }
}
