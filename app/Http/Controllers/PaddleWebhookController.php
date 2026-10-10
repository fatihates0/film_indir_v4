<?php

namespace App\Http\Controllers;

use App\Services\Payment\PaddleService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaddleWebhookController extends Controller
{
    /**
     * Handle incoming Paddle Billing webhook notifications.
     */
    public function handle(Request $request, PaddleService $paddleService): JsonResponse
    {
        $rawPayload = (string) $request->getContent();
        $signatureHeader = (string) $request->header('Paddle-Signature', '');

        // Verify webhook signature
        $isValid = $paddleService->verifyWebhookSignature($rawPayload, $signatureHeader);

        if (! $isValid) {
            Log::warning('Paddle webhook signature verification failed', [
                'ip' => $request->ip(),
                'signature' => $signatureHeader,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Geçersiz Paddle Webhook imzası.',
            ], 400);
        }

        $payload = json_decode($rawPayload, true);

        if (! is_array($payload)) {
            return response()->json([
                'success' => false,
                'message' => 'Geçersiz JSON verisi.',
            ], 400);
        }

        try {
            $processed = $paddleService->processWebhookEvent($payload);

            return response()->json([
                'success' => true,
                'processed' => $processed,
            ], 200);
        } catch (Exception $e) {
            Log::error('Paddle webhook handling exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
