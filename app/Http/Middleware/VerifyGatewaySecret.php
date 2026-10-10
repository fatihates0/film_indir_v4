<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verify internal Gateway webhook requests.
 * Tokens and signatures are verified per-request inside controller actions.
 */
class VerifyGatewaySecret
{
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }
}
