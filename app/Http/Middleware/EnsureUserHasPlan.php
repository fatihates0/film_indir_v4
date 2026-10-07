<?php

namespace App\Http\Middleware;

use App\Enums\UserPlan;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasPlan
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $minPlan): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('home');
        }

        // Admin always has access to all plan features
        if ($user->isAdmin()) {
            return $next($request);
        }

        $planEnum = UserPlan::tryFrom($minPlan);

        if ($planEnum && ! $user->hasMinPlan($planEnum)) {
            abort(403, 'Bu içeriğe erişmek için '.$planEnum->label().' veya üzeri bir üyeliğe sahip olmalısınız.');
        }

        return $next($request);
    }
}
