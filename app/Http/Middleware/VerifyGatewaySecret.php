<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verify that incoming internal Gateway webhook requests carry a valid shared secret.
 *
 * The Gateway node must send the header:
 *   X-Gateway-Secret: <value of GATEWAY_WEBHOOK_SECRET>
 *
 * If GATEWAY_WEBHOOK_SECRET is empty, requests from localhost/loopback are still allowed
 * (development convenience). All other IPs are denied.
 */
class VerifyGatewaySecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $expectedSecret = config('services.storage.gateway_secret', '');

        if (! empty($expectedSecret)) {
            $providedSecret = $request->header('X-Gateway-Secret', '');

            if (! hash_equals($expectedSecret, $providedSecret)) {
                return response()->json([
                    'error' => 'Yetkisiz erişim. Geçersiz Gateway kimlik bilgisi.',
                ], 401);
            }

            return $next($request);
        }

        // No secret configured: allow only local/loopback IPs (dev mode only)
        $ip = $request->ip();
        $isLocal = in_array($ip, ['127.0.0.1', '::1', 'localhost'], true)
            || str_starts_with($ip, '192.168.')
            || str_starts_with($ip, '10.')
            || str_starts_with($ip, '172.');

        if (! $isLocal) {
            return response()->json([
                'error' => 'GATEWAY_WEBHOOK_SECRET env değişkeni tanımlanmamış. '.
                           'Bu uç nokta yalnızca yerel ağdan erişilebilir.',
            ], 401);
        }

        return $next($request);
    }
}
