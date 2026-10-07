<?php

namespace App\Services;

use App\Models\DownloadTicket;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionService
{
    /**
     * Subscribe a user to a plan or assign a custom download quota.
     */
    public function subscribe(
        User $user,
        ?Plan $plan = null,
        int $durationMonths = 1,
        ?float $pricePaid = null,
        ?string $notes = null,
        ?int $customQuotaGb = null,
        bool $isPerpetual = false
    ): Subscription {
        if ($isPerpetual) {
            $durationMonths = 1200; // 100 years
        } else {
            $durationMonths = max(1, $durationMonths);
        }

        $allocatedBytes = 0;
        if ($customQuotaGb !== null && $customQuotaGb > 0) {
            $allocatedBytes = (int) $customQuotaGb * 1024 * 1024 * 1024;
        } elseif ($plan) {
            $allocatedBytes = $plan->monthly_quota_bytes;
        }

        $pricePaid = $pricePaid ?? ($plan ? $plan->getPriceForDuration($durationMonths) : 0.0);

        return DB::transaction(function () use ($user, $plan, $durationMonths, $pricePaid, $notes, $allocatedBytes, $isPerpetual) {
            // Cancel any existing active subscriptions
            $user->subscriptions()
                ->where('status', 'active')
                ->update(['status' => 'cancelled']);

            // Deactivate all old periods
            $user->subscriptionPeriods()
                ->where('is_active', true)
                ->update(['is_active' => false]);

            $now = Carbon::now();
            $anchorDay = $now->day;
            $expiresAt = $isPerpetual ? $now->copy()->addYears(100) : $now->copy()->addMonthsNoOverflow($durationMonths);

            // Create new Subscription
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan?->id,
                'duration_months' => $isPerpetual ? 999 : $durationMonths,
                'starts_at' => $now,
                'expires_at' => $expiresAt,
                'is_perpetual' => $isPerpetual,
                'billing_anchor_day' => $anchorDay,
                'status' => 'active',
                'price_paid' => $pricePaid,
                'notes' => $notes,
            ]);

            // Create Period 1
            $periodEnd = $isPerpetual ? $expiresAt->copy() : $now->copy()->addMonthNoOverflow();
            if ($periodEnd->isAfter($expiresAt)) {
                $periodEnd = $expiresAt->copy();
            }

            SubscriptionPeriod::create([
                'subscription_id' => $subscription->id,
                'user_id' => $user->id,
                'period_number' => 1,
                'period_start' => $now,
                'period_end' => $periodEnd,
                'allocated_bytes' => $allocatedBytes,
                'used_bytes' => 0,
                'is_active' => true,
            ]);

            // Sync user's plan attribute on User model
            if ($plan) {
                $slugLower = strtolower($plan->slug);
                if (in_array($slugLower, ['free', 'basic', 'premium', 'vip'])) {
                    $user->update(['plan' => $slugLower]);
                } else {
                    $user->update(['plan' => 'premium']);
                }
            } else {
                $user->update(['plan' => 'premium']);
            }

            return $subscription->load(['plan', 'activePeriod']);
        });
    }

    /**
     * Get the active subscription period for the user, advancing monthly cycle if needed.
     */
    public function getCurrentPeriod(User $user): ?SubscriptionPeriod
    {
        /** @var Subscription|null $subscription */
        $subscription = $user->subscriptions()
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->with(['plan'])
            ->latest('id')
            ->first();

        if (! $subscription) {
            return null;
        }

        // Check if overall subscription has expired
        if (! $subscription->is_perpetual && $subscription->expires_at->isPast()) {
            $subscription->update(['status' => 'expired']);
            $subscription->periods()->where('is_active', true)->update(['is_active' => false]);

            return null;
        }

        /** @var SubscriptionPeriod|null $currentPeriod */
        $currentPeriod = $subscription->periods()
            ->where('is_active', true)
            ->latest('period_number')
            ->first();

        $now = Carbon::now();

        // If period doesn't exist or period has expired (monthly cycle renewal!)
        if (! $currentPeriod || (! $subscription->is_perpetual && $now->greaterThanOrEqualTo($currentPeriod->period_end))) {
            return DB::transaction(function () use ($subscription, $user, $currentPeriod) {
                // Deactivate old period if exists
                if ($currentPeriod) {
                    $currentPeriod->update(['is_active' => false]);
                    $nextPeriodNum = $currentPeriod->period_number + 1;
                    $periodStart = $currentPeriod->period_end->copy();
                } else {
                    $nextPeriodNum = 1;
                    $periodStart = $subscription->starts_at->copy();
                }

                // If next period start is already beyond subscription expiration, subscription is done
                if (! $subscription->is_perpetual && $periodStart->greaterThanOrEqualTo($subscription->expires_at)) {
                    $subscription->update(['status' => 'expired']);

                    return null;
                }

                // Calculate period end based on anchor date
                $periodEnd = $subscription->is_perpetual
                    ? $subscription->expires_at->copy()
                    : $subscription->starts_at->copy()->addMonthsNoOverflow($nextPeriodNum);

                if ($periodEnd->isAfter($subscription->expires_at)) {
                    $periodEnd = $subscription->expires_at->copy();
                }

                $allocatedBytes = $subscription->plan ? $subscription->plan->monthly_quota_bytes : ($currentPeriod?->allocated_bytes ?? 0);

                // Create the fresh monthly quota period (resets used_bytes to 0!)
                return SubscriptionPeriod::create([
                    'subscription_id' => $subscription->id,
                    'user_id' => $user->id,
                    'period_number' => $nextPeriodNum,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'allocated_bytes' => $allocatedBytes,
                    'used_bytes' => 0,
                    'is_active' => true,
                ]);
            });
        }

        return $currentPeriod;
    }

    /**
     * Record downloaded bytes against a ticket and its associated subscription period.
     */
    public function recordBytes(string $token, int $bytes): bool
    {
        if ($bytes <= 0) {
            return false;
        }

        /** @var DownloadTicket|null $ticket */
        $ticket = DownloadTicket::where('token', $token)
            ->with(['mediaFile'])
            ->first();

        if (! $ticket) {
            Log::warning("DownloadTicket not found for token: {$token}");

            return false;
        }

        $fileSizeBytes = $ticket->mediaFile?->size_bytes ?? 0;
        $alreadyDownloaded = $ticket->bytes_downloaded ?? 0;

        // Calculate max additional bytes that can be charged for this ticket (cap at file size)
        if ($fileSizeBytes > 0) {
            $remainingTicketBytes = max(0, $fileSizeBytes - $alreadyDownloaded);
            $actualIncrement = min($bytes, $remainingTicketBytes);
        } else {
            $actualIncrement = $bytes;
        }

        if ($actualIncrement <= 0) {
            return true;
        }

        DB::transaction(function () use ($ticket, $actualIncrement) {
            // Update ticket
            $ticket->increment('bytes_downloaded', $actualIncrement);
            if ($ticket->status === 'pending') {
                $ticket->status = 'completed';
                $ticket->save();
            }

            // Update user subscription period used_bytes
            if ($ticket->subscription_period_id) {
                DB::table('subscription_periods')
                    ->where('id', $ticket->subscription_period_id)
                    ->increment('used_bytes', $actualIncrement);
            }
        });

        return true;
    }

    /**
     * Get a formatted quota summary for the frontend/Inertia.
     *
     * @return array<string, mixed>|null
     */
    public function getQuotaSummary(User $user): ?array
    {
        if ($user->isAdmin()) {
            return [
                'has_subscription' => true,
                'is_admin' => true,
                'plan_name' => 'Yönetici (Sınırsız)',
                'monthly_quota_gb' => 99999,
                'allocated_bytes' => 999999999999999,
                'used_bytes' => 0,
                'remaining_bytes' => 999999999999999,
                'usage_percentage' => 0.0,
                'formatted_allocated' => 'Sınırsız',
                'formatted_used' => '0 GB',
                'formatted_remaining' => 'Sınırsız',
                'period_end' => null,
                'period_end_formatted' => 'Süresiz',
                'subscription_expires_at' => null,
                'can_download' => true,
            ];
        }

        $period = $this->getCurrentPeriod($user);

        if (! $period) {
            return [
                'has_subscription' => false,
                'is_admin' => false,
                'plan_name' => 'Paket Yok',
                'monthly_quota_gb' => 0,
                'allocated_bytes' => 0,
                'used_bytes' => 0,
                'remaining_bytes' => 0,
                'usage_percentage' => 100.0,
                'formatted_allocated' => '0 GB',
                'formatted_used' => '0 GB',
                'formatted_remaining' => '0 GB',
                'period_end' => null,
                'period_end_formatted' => null,
                'subscription_expires_at' => null,
                'can_download' => false,
            ];
        }

        $subscription = $period->subscription;
        $plan = $subscription->plan;

        $planName = $plan ? $plan->name : ($subscription->is_perpetual ? 'Süresiz Özel Kota' : 'Özel İndirme Kotası');
        $monthlyQuotaGb = $plan ? $plan->monthly_quota_gb : (int) round($period->allocated_bytes / (1024 * 1024 * 1024));
        $periodEndFormatted = $subscription->is_perpetual ? 'Süresiz (Sınırsız Süre)' : $period->period_end->format('d.m.Y H:i');

        return [
            'has_subscription' => true,
            'is_admin' => false,
            'plan_name' => $planName,
            'monthly_quota_gb' => $monthlyQuotaGb,
            'allocated_bytes' => $period->allocated_bytes,
            'used_bytes' => $period->used_bytes,
            'remaining_bytes' => $period->remaining_bytes,
            'usage_percentage' => $period->usage_percentage,
            'formatted_allocated' => $period->formatted_allocated,
            'formatted_used' => $period->formatted_used,
            'formatted_remaining' => $period->formatted_remaining,
            'period_end' => $subscription->is_perpetual ? null : $period->period_end->toIso8601String(),
            'period_end_formatted' => $periodEndFormatted,
            'subscription_expires_at' => $subscription->is_perpetual ? null : $subscription->expires_at->toIso8601String(),
            'is_perpetual' => $subscription->is_perpetual,
            'can_download' => $period->hasAvailableQuota(),
        ];
    }
}
