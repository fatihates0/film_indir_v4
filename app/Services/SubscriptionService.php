<?php

namespace App\Services;

use App\Jobs\ProvisionMediaAccount;
use App\Models\DownloadTicket;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;
use App\Models\User;
use App\Models\UserExtraQuota;
use Carbon\Carbon;
use Illuminate\Support\Collection;
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
                'duration_months' => $isPerpetual ? 0 : $durationMonths,
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
                if ($plan->isBusiness()) {
                    $user->update(['plan' => 'vip']);
                } else {
                    $slugLower = strtolower($plan->slug);
                    if (in_array($slugLower, ['free', 'basic', 'premium', 'vip'])) {
                        $user->update(['plan' => $slugLower]);
                    } else {
                        $user->update(['plan' => 'premium']);
                    }
                }
            } else {
                $user->update(['plan' => 'premium']);
            }

            $result = $subscription->load(['plan', 'activePeriod']);
            ProvisionMediaAccount::dispatch($user);

            return $result;
        });
    }

    /**
     * Check if user has an active main (individual or business) subscription.
     */
    public function hasActiveMainSubscription(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->subscriptions()
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>', now())
            ->where(function ($query) {
                $query->whereHas('plan', function ($pq) {
                    $pq->whereIn('type', [Plan::TYPE_INDIVIDUAL, Plan::TYPE_BUSINESS]);
                })->orWhereNull('plan_id');
            })
            ->exists();
    }

    /**
     * Check if user is eligible to purchase or be assigned an Extra Quota package.
     */
    public function canBuyExtraQuota(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $this->hasActiveMainSubscription($user);
    }

    /**
     * Purchase or assign an Extra Quota package to a user (valid for 30 days).
     */
    public function purchaseExtraQuota(
        User $user,
        Plan $extraPlan,
        ?float $pricePaid = null,
        ?string $notes = null
    ): UserExtraQuota {
        if (! $this->canBuyExtraQuota($user)) {
            throw new \RuntimeException('Ek kota satın alabilmek için aktif bir bireysel veya business paketinizin bulunması gerekmektedir.');
        }

        $now = Carbon::now();
        $expiresAt = $now->copy()->addDays(30);
        $pricePaid = $pricePaid ?? (float) $extraPlan->price_1m;

        return UserExtraQuota::create([
            'user_id' => $user->id,
            'plan_id' => $extraPlan->id,
            'name' => $extraPlan->name,
            'allocated_bytes' => $extraPlan->monthly_quota_bytes,
            'used_bytes' => 0,
            'starts_at' => $now,
            'expires_at' => $expiresAt,
            'status' => 'active',
            'price_paid' => $pricePaid,
            'notes' => $notes ?? '30 gün süreli ek kota tanımlandı',
        ]);
    }

    /**
     * Get all active and non-expired extra quotas for a user (auto-expires past ones).
     *
     * @return Collection<int, UserExtraQuota>
     */
    /**
     * Auto-expire and auto-exhaust stale Extra Quotas. Call this BEFORE read queries.
     */
    public function expireStaleExtraQuotas(User $user): void
    {
        $now = Carbon::now();

        UserExtraQuota::where('user_id', $user->id)
            ->where('status', 'active')
            ->where('expires_at', '<=', $now)
            ->update(['status' => 'expired']);

        UserExtraQuota::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereColumn('used_bytes', '>=', 'allocated_bytes')
            ->update(['status' => 'exhausted']);
    }

    /**
     * Get all active and non-expired extra quotas for a user.
     * Pure read — does NOT mutate state. Call expireStaleExtraQuotas() beforehand if needed.
     *
     * @return Collection<int, UserExtraQuota>
     */
    public function getActiveExtraQuotas(User $user): Collection
    {
        $now = Carbon::now();

        // Expire/exhaust stale records before reading
        $this->expireStaleExtraQuotas($user);

        return UserExtraQuota::where('user_id', $user->id)
            ->where('status', 'active')
            ->where('starts_at', '<=', $now)
            ->where('expires_at', '>', $now)
            ->whereColumn('used_bytes', '<', 'allocated_bytes')
            ->orderBy('expires_at', 'asc')
            ->get();
    }

    /**
     * Get total remaining bytes from active Extra Quotas.
     */
    public function getExtraQuotaRemainingBytes(User $user): int
    {
        $activeExtras = $this->getActiveExtraQuotas($user);

        return (int) $activeExtras->sum(fn (UserExtraQuota $eq) => $eq->remaining_bytes);
    }

    /**
     * Get main subscription period remaining bytes.
     */
    public function getMainPeriodRemainingBytes(User $user): int
    {
        $period = $this->getCurrentPeriod($user);

        return $period ? $period->remaining_bytes : 0;
    }

    /**
     * Get combined total remaining bytes (Main Period Quota + Active Extra Quotas).
     */
    public function getTotalRemainingBytes(User $user): int
    {
        if ($user->isAdmin()) {
            return 999999999999999;
        }

        return $this->getMainPeriodRemainingBytes($user) + $this->getExtraQuotaRemainingBytes($user);
    }

    /**
     * Get the active main subscription period for the user, advancing monthly cycle if needed.
     */
    public function getCurrentPeriod(User $user): ?SubscriptionPeriod
    {
        /** @var Subscription|null $subscription */
        $subscription = $user->subscriptions()
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where(function ($query) {
                $query->whereHas('plan', function ($pq) {
                    $pq->whereIn('type', [Plan::TYPE_INDIVIDUAL, Plan::TYPE_BUSINESS]);
                })->orWhereNull('plan_id');
            })
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
                if ($currentPeriod) {
                    $currentPeriod->update(['is_active' => false]);
                    $nextPeriodNum = $currentPeriod->period_number + 1;
                } else {
                    $nextPeriodNum = 1;
                }

                $periodStart = $subscription->is_perpetual
                    ? $subscription->starts_at->copy()
                    : $subscription->starts_at->copy()->addMonthsNoOverflow($nextPeriodNum - 1);

                if (! $subscription->is_perpetual && $periodStart->greaterThanOrEqualTo($subscription->expires_at)) {
                    $subscription->update(['status' => 'expired']);

                    return null;
                }

                $periodEnd = $subscription->is_perpetual
                    ? $subscription->expires_at->copy()
                    : $subscription->starts_at->copy()->addMonthsNoOverflow($nextPeriodNum);

                if ($periodEnd->isAfter($subscription->expires_at)) {
                    $periodEnd = $subscription->expires_at->copy();
                }

                $allocatedBytes = $subscription->plan ? $subscription->plan->monthly_quota_bytes : ($currentPeriod?->allocated_bytes ?? 0);

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
     * Record downloaded bytes against ticket, prioritizing Extra Quota FIRST before main subscription period.
     */
    public function recordBytes(string $token, int $bytes, bool $isClosed = false): bool
    {
        /** @var DownloadTicket|null $ticket */
        $ticket = DownloadTicket::where('token', $token)
            ->with(['mediaFile', 'user'])
            ->first();

        if (! $ticket) {
            Log::warning("DownloadTicket not found for token: {$token}");

            return false;
        }

        $fileSizeBytes = $ticket->mediaFile?->size_bytes ?? 0;
        $alreadyDownloaded = $ticket->bytes_downloaded ?? 0;

        if ($fileSizeBytes > 0) {
            $remainingTicketBytes = max(0, $fileSizeBytes - $alreadyDownloaded);
            $actualIncrement = min($bytes, $remainingTicketBytes);
        } else {
            $actualIncrement = $bytes;
        }

        // Auto-expire/exhaust extra quotas BEFORE the transaction (avoids nested mutations)
        $this->expireStaleExtraQuotas($ticket->user);

        // Collect active extra quota IDs ordered by expiry (soonest first)
        $activeExtraIds = DB::table('user_extra_quotas')
            ->where('user_id', $ticket->user->id)
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>', now())
            ->whereColumn('used_bytes', '<', 'allocated_bytes')
            ->orderBy('expires_at', 'asc')
            ->pluck('id')
            ->toArray();

        DB::transaction(function () use ($ticket, $actualIncrement, $fileSizeBytes, $isClosed, $activeExtraIds) {
            $newTotal = $ticket->bytes_downloaded + $actualIncrement;
            $ticket->bytes_downloaded = $newTotal;

            if ($fileSizeBytes > 0 && $newTotal >= (int) ($fileSizeBytes * 0.98)) {
                $ticket->status = 'completed';
            } elseif ($isClosed) {
                $ticket->status = 'stopped';
            } else {
                $ticket->status = 'active';
            }

            $ticket->touch();
            $ticket->save();

            // Deduct bytes: PRIORITY TO EXTRA QUOTA!
            if ($actualIncrement > 0 && $ticket->user) {
                $bytesLeftToDeduct = $actualIncrement;

                // 1. Deduct from active Extra Quotas first (DB-level, no model loads inside tx)
                foreach ($activeExtraIds as $extraId) {
                    if ($bytesLeftToDeduct <= 0) {
                        break;
                    }

                    $extra = DB::table('user_extra_quotas')->where('id', $extraId)->lockForUpdate()->first();
                    if (! $extra) {
                        continue;
                    }

                    $rem = max(0, $extra->allocated_bytes - $extra->used_bytes);
                    if ($rem <= 0) {
                        continue;
                    }

                    $deduct = min($bytesLeftToDeduct, $rem);
                    DB::table('user_extra_quotas')->where('id', $extraId)->increment('used_bytes', $deduct);
                    $bytesLeftToDeduct -= $deduct;

                    // Mark exhausted if now full
                    if (($extra->used_bytes + $deduct) >= $extra->allocated_bytes) {
                        DB::table('user_extra_quotas')->where('id', $extraId)->update(['status' => 'exhausted']);
                    }
                }

                // 2. Charge main subscription period for any remainder
                if ($bytesLeftToDeduct > 0 && $ticket->subscription_period_id) {
                    DB::table('subscription_periods')
                        ->where('id', $ticket->subscription_period_id)
                        ->increment('used_bytes', $bytesLeftToDeduct);
                }
            }
        });

        return true;
    }

    /**
     * Deduct streaming bytes from user's active extra quotas and main subscription period.
     */
    public function deductUserQuota(User $user, int $bytes): bool
    {
        if ($user->isAdmin() || $bytes <= 0) {
            return true;
        }

        $this->expireStaleExtraQuotas($user);

        $activeExtraIds = DB::table('user_extra_quotas')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>', now())
            ->whereColumn('used_bytes', '<', 'allocated_bytes')
            ->orderBy('expires_at', 'asc')
            ->pluck('id')
            ->toArray();

        $currentPeriod = $this->getCurrentPeriod($user);

        DB::transaction(function () use ($bytes, $activeExtraIds, $currentPeriod) {
            $bytesLeftToDeduct = $bytes;

            // 1. Deduct from extra quotas first
            foreach ($activeExtraIds as $extraId) {
                if ($bytesLeftToDeduct <= 0) {
                    break;
                }

                $extra = DB::table('user_extra_quotas')->where('id', $extraId)->lockForUpdate()->first();
                if (! $extra) {
                    continue;
                }

                $rem = max(0, $extra->allocated_bytes - $extra->used_bytes);
                if ($rem <= 0) {
                    continue;
                }

                $deduct = min($bytesLeftToDeduct, $rem);
                DB::table('user_extra_quotas')->where('id', $extraId)->increment('used_bytes', $deduct);
                $bytesLeftToDeduct -= $deduct;

                if (($extra->used_bytes + $deduct) >= $extra->allocated_bytes) {
                    DB::table('user_extra_quotas')->where('id', $extraId)->update(['status' => 'exhausted']);
                }
            }

            // 2. Charge main subscription period for remainder
            if ($bytesLeftToDeduct > 0 && $currentPeriod) {
                DB::table('subscription_periods')
                    ->where('id', $currentPeriod->id)
                    ->increment('used_bytes', $bytesLeftToDeduct);
            }
        });

        return true;
    }

    /**
     * Get maximum allowed parallel (concurrent different files) downloads for a user.
     */
    public function getMaxParallelDownloads(User $user): int
    {
        if ($user->isAdmin()) {
            return 99;
        }

        $period = $this->getCurrentPeriod($user);
        if ($period && $period->subscription && $period->subscription->plan) {
            $plan = $period->subscription->plan;

            // Business plans or plans with max_parallel_downloads == 0 mean UNLIMITED parallel downloads
            if ($plan->isBusiness() || $plan->max_parallel_downloads === 0) {
                return 999999;
            }

            if ($plan->max_parallel_downloads > 0) {
                return $plan->max_parallel_downloads;
            }
        }

        if ($user->plan) {
            return match ($user->plan->value) {
                'free' => 1,
                'basic' => 2,
                'vip' => 999999,
                default => 3, // premium
            };
        }

        return 1;
    }

    /**
     * Get maximum allowed download speed limit in Mbps for a user (null means unlimited).
     */
    public function getSpeedLimitMbps(User $user): ?int
    {
        if ($user->isAdmin()) {
            return $user->custom_speed_limit_mbps;
        }

        if ($user->custom_speed_limit_mbps !== null) {
            return $user->custom_speed_limit_mbps > 0 ? $user->custom_speed_limit_mbps : null;
        }

        $period = $this->getCurrentPeriod($user);
        if ($period && $period->subscription && $period->subscription->plan) {
            return $period->subscription->plan->speed_limit_mbps;
        }

        return null;
    }

    /**
     * Check if a user is allowed to download from VPS / Server IP addresses.
     * VPS access is strictly determined by the user's active MAIN subscription.
     * Extra quota packages do not grant or modify VPS download access.
     */
    public function allowsVpsAccess(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        // 1. Check all active main subscriptions directly via plan
        $hasActiveSubVps = $user->subscriptions()
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where(function ($q) {
                $q->where('is_perpetual', true)
                    ->orWhere('expires_at', '>', now());
            })
            ->whereHas('plan', function ($q) {
                $q->whereIn('type', [Plan::TYPE_INDIVIDUAL, Plan::TYPE_BUSINESS])
                    ->where(function ($pq) {
                        $pq->where('allow_vps_access', true)
                            ->orWhere('type', Plan::TYPE_BUSINESS);
                    });
            })
            ->exists();

        if ($hasActiveSubVps) {
            return true;
        }

        // 2. Check current active period's subscription plan
        $period = $this->getCurrentPeriod($user);
        if ($period) {
            $plan = $period->subscription?->plan;
            if ($plan && ($plan->isBusiness() || (bool) $plan->allow_vps_access)) {
                return true;
            }
        }

        // 3. Legacy User plan enum
        if ($user->plan && in_array($user->plan->value, ['vip', 'business'], true)) {
            return true;
        }

        return false;
    }

    /**
     * Get the count of distinct active media files currently being downloaded by a user.
     * Stale ticket cleanup is handled by the tickets:clean-stale scheduled command.
     */
    public function getActiveParallelDownloadsCount(User $user, ?int $excludeMediaFileId = null): int
    {
        $query = DownloadTicket::where('user_id', $user->id)
            ->whereIn('status', ['active', 'pending'])
            ->where('expires_at', '>', now())
            ->where('updated_at', '>=', now()->subSeconds(90));

        if ($excludeMediaFileId !== null) {
            $query->where('media_file_id', '!=', $excludeMediaFileId);
        }

        return (int) $query->distinct('media_file_id')->count('media_file_id');
    }

    /**
     * Check if user can start downloading a new media file given their plan's max parallel download limit.
     */
    public function canStartParallelDownload(User $user, int $mediaFileId): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $maxAllowed = $this->getMaxParallelDownloads($user);
        if ($maxAllowed >= 999999) {
            return true;
        }

        $activeCount = $this->getActiveParallelDownloadsCount($user, $mediaFileId);

        return $activeCount < $maxAllowed;
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
                'has_active_main_sub' => true,
                'can_buy_extra_quota' => true,
                'plan_name' => 'Yönetici (Sınırsız)',
                'plan_type' => 'business',
                'monthly_quota_gb' => 99999,
                'allocated_bytes' => 999999999999999,
                'used_bytes' => 0,
                'remaining_bytes' => 999999999999999,
                'usage_percentage' => 0.0,
                'formatted_allocated' => 'Sınırsız',
                'formatted_used' => '0 GB',
                'formatted_remaining' => 'Sınırsız',
                'main_remaining_bytes' => 999999999999999,
                'extra_remaining_bytes' => 0,
                'active_extra_quotas' => [],
                'period_end' => null,
                'period_end_formatted' => 'Süresiz',
                'subscription_expires_at' => null,
                'can_download' => true,
                'max_parallel_downloads' => 999999,
                'active_parallel_downloads' => 0,
                'speed_limit_mbps' => null,
                'allows_vps_access' => true,
            ];
        }

        $hasMainSub = $this->hasActiveMainSubscription($user);
        $period = $this->getCurrentPeriod($user);
        $activeExtras = $this->getActiveExtraQuotas($user);

        $mainAllocated = $period ? $period->allocated_bytes : 0;
        $mainUsed = $period ? $period->used_bytes : 0;
        $mainRemaining = $period ? $period->remaining_bytes : 0;

        $extraAllocated = (int) $activeExtras->sum('allocated_bytes');
        $extraUsed = (int) $activeExtras->sum('used_bytes');
        $extraRemaining = (int) $activeExtras->sum(fn ($e) => $e->remaining_bytes);

        $totalAllocated = $mainAllocated + $extraAllocated;
        $totalUsed = $mainUsed + $extraUsed;
        $totalRemaining = $mainRemaining + $extraRemaining;

        if (! $period && $activeExtras->isEmpty()) {
            return [
                'has_subscription' => false,
                'is_admin' => false,
                'has_active_main_sub' => false,
                'can_buy_extra_quota' => false,
                'plan_name' => 'Paket Yok',
                'plan_type' => 'none',
                'monthly_quota_gb' => 0,
                'allocated_bytes' => 0,
                'used_bytes' => 0,
                'remaining_bytes' => 0,
                'usage_percentage' => 100.0,
                'formatted_allocated' => '0 GB',
                'formatted_used' => '0 GB',
                'formatted_remaining' => '0 GB',
                'main_remaining_bytes' => 0,
                'extra_remaining_bytes' => 0,
                'active_extra_quotas' => [],
                'period_end' => null,
                'period_end_formatted' => null,
                'subscription_expires_at' => null,
                'can_download' => false,
                'max_parallel_downloads' => $this->getMaxParallelDownloads($user),
                'active_parallel_downloads' => $this->getActiveParallelDownloadsCount($user),
                'speed_limit_mbps' => null,
                'allows_vps_access' => false,
            ];
        }

        $subscription = $period?->subscription;
        $plan = $subscription?->plan;

        $planName = $plan ? $plan->name : ($subscription?->is_perpetual ? 'Süresiz Özel Kota' : 'Aktif Abonelik');
        $monthlyQuotaGb = $plan ? $plan->monthly_quota_gb : (int) round($mainAllocated / (1024 * 1024 * 1024));
        $periodEndFormatted = $subscription?->is_perpetual ? 'Süresiz (Sınırsız Süre)' : $period?->period_end->format('d.m.Y H:i');
        $maxParallel = $this->getMaxParallelDownloads($user);
        $activeParallel = $this->getActiveParallelDownloadsCount($user);
        $speedLimit = $this->getSpeedLimitMbps($user);
        $allowsVps = $this->allowsVpsAccess($user);

        $usagePct = $totalAllocated > 0 ? round(min(100.0, max(0.0, ($totalUsed / $totalAllocated) * 100)), 1) : 100.0;

        $formattedExtras = $activeExtras->map(fn (UserExtraQuota $eq) => [
            'id' => $eq->id,
            'name' => $eq->name,
            'allocated_bytes' => $eq->allocated_bytes,
            'used_bytes' => $eq->used_bytes,
            'remaining_bytes' => $eq->remaining_bytes,
            'formatted_remaining' => $eq->formatted_remaining,
            'formatted_allocated' => $eq->formatted_allocated,
            'expires_at' => $eq->expires_at->toIso8601String(),
            'expires_at_formatted' => $eq->expires_at->format('d.m.Y H:i'),
        ])->toArray();

        $canCancelPerpetual = (bool) (
            $subscription?->is_perpetual
            && $totalRemaining < (5 * 1024 * 1024 * 1024)
        );

        return [
            'has_subscription' => true,
            'is_admin' => false,
            'has_active_main_sub' => $hasMainSub,
            'can_buy_extra_quota' => $hasMainSub,
            'plan_name' => $planName,
            'plan_type' => $plan?->type ?? 'individual',
            'monthly_quota_gb' => $monthlyQuotaGb,
            'allocated_bytes' => $totalAllocated,
            'used_bytes' => $totalUsed,
            'remaining_bytes' => $totalRemaining,
            'usage_percentage' => $usagePct,
            'formatted_allocated' => SubscriptionPeriod::formatBytes($totalAllocated),
            'formatted_used' => SubscriptionPeriod::formatBytes($totalUsed),
            'formatted_remaining' => SubscriptionPeriod::formatBytes($totalRemaining),
            'main_remaining_bytes' => $mainRemaining,
            'extra_remaining_bytes' => $extraRemaining,
            'formatted_main_remaining' => SubscriptionPeriod::formatBytes($mainRemaining),
            'formatted_extra_remaining' => SubscriptionPeriod::formatBytes($extraRemaining),
            'active_extra_quotas' => $formattedExtras,
            'period_end' => $subscription?->is_perpetual ? null : $period?->period_end->toIso8601String(),
            'period_end_formatted' => $periodEndFormatted,
            'subscription_expires_at' => $subscription?->is_perpetual ? null : $subscription?->expires_at->toIso8601String(),
            'is_perpetual' => (bool) ($subscription?->is_perpetual),
            'can_cancel_perpetual' => $canCancelPerpetual,
            'plan_id' => $plan?->id,
            'can_upgrade' => (bool) ($hasMainSub && $plan && ! $subscription?->is_perpetual),
            'subscription_id' => $subscription?->id,
            'can_download' => $totalRemaining > 0,
            'max_parallel_downloads' => $maxParallel,
            'active_parallel_downloads' => $activeParallel,
            'speed_limit_mbps' => $speedLimit,
            'allows_vps_access' => $allowsVps,
        ];
    }

    /**
     * Calculate proration upgrade price and metadata for switching to a target plan.
     *
     * @return array<string, mixed>|null
     */
    public function calculateUpgrade(User $user, Plan $targetPlan): ?array
    {
        if ($user->isAdmin() || $targetPlan->isExtra()) {
            return null;
        }

        $period = $this->getCurrentPeriod($user);
        if (! $period) {
            return null;
        }

        $subscription = $period->subscription;
        if (! $subscription || $subscription->is_perpetual) {
            return null;
        }

        $currentPlan = $subscription->plan;
        if (! $currentPlan || $currentPlan->id === $targetPlan->id) {
            return null;
        }

        // Target plan must have higher monthly quota
        if ($targetPlan->monthly_quota_bytes <= $currentPlan->monthly_quota_bytes) {
            return null;
        }

        $now = Carbon::now();
        $periodStart = $period->period_start;
        $periodEnd = $period->period_end;

        $currentPeriodDays = max(1, (int) round($periodStart->diffInDays($periodEnd)));
        $remainingDays = max(0, (int) ceil($now->diffInDays($periodEnd, false)));

        if ($remainingDays <= 0) {
            return null;
        }

        $currentPrice1m = (float) $currentPlan->price_1m;
        $targetPrice1m = (float) $targetPlan->price_1m;

        // Daily rate difference for current cycle
        $dailyDiff = max(0.0, ($targetPrice1m - $currentPrice1m) / $currentPeriodDays);
        $currentCycleDiff = $dailyDiff * $remainingDays;

        // Check future months if multi-month subscription
        $totalMonths = max(1, $subscription->duration_months);
        $remainingFutureMonths = max(0, $totalMonths - $period->period_number);
        $futureMonthsDiff = 0.0;
        if ($remainingFutureMonths > 0) {
            $futureMonthlyCurrent = $currentPlan->getPriceForDuration($totalMonths) / $totalMonths;
            $futureMonthlyTarget = $targetPlan->getPriceForDuration($totalMonths) / $totalMonths;
            $futureMonthsDiff = max(0.0, ($futureMonthlyTarget - $futureMonthlyCurrent) * $remainingFutureMonths);
        }

        $totalUpgradeAmount = round(max(5.0, $currentCycleDiff + $futureMonthsDiff), 2);

        return [
            'can_upgrade' => true,
            'current_plan' => [
                'id' => $currentPlan->id,
                'name' => $currentPlan->name,
                'monthly_quota_gb' => $currentPlan->monthly_quota_gb,
                'formatted_quota' => $currentPlan->formatted_quota,
            ],
            'target_plan' => [
                'id' => $targetPlan->id,
                'name' => $targetPlan->name,
                'monthly_quota_gb' => $targetPlan->monthly_quota_gb,
                'formatted_quota' => $targetPlan->formatted_quota,
            ],
            'remaining_days' => $remainingDays,
            'period_end_formatted' => $periodEnd->format('d.m.Y H:i'),
            'upgrade_amount' => $totalUpgradeAmount,
            'formatted_upgrade_amount' => '₺'.number_format($totalUpgradeAmount, 2, ',', '.'),
            'quota_ceiling_gb' => $targetPlan->monthly_quota_gb,
        ];
    }

    /**
     * Perform the upgrade to a target plan preserving current billing period end and usage.
     */
    public function upgradeSubscription(
        User $user,
        Plan $targetPlan,
        float $pricePaid,
        ?string $notes = null
    ): Subscription {
        if ($targetPlan->isExtra()) {
            throw new \InvalidArgumentException('Ek kota paketine yükseltme yapılamaz.');
        }

        $period = $this->getCurrentPeriod($user);
        if (! $period) {
            throw new \RuntimeException('Aktif bir abonelik dönemi bulunamadı.');
        }

        $subscription = $period->subscription;
        if (! $subscription || $subscription->is_perpetual) {
            throw new \RuntimeException('Süresiz veya geçersiz bir abonelik yükseltilemez.');
        }

        $oldPlan = $subscription->plan;

        return DB::transaction(function () use ($user, $subscription, $period, $targetPlan, $pricePaid, $notes) {
            // Update subscription
            $subscription->update([
                'plan_id' => $targetPlan->id,
                'price_paid' => (float) $subscription->price_paid + $pricePaid,
                'notes' => trim(($subscription->notes ? $subscription->notes.' | ' : '').($notes ?? "Paket {$targetPlan->name} yükseltildi (₺{$pricePaid})")),
            ]);

            // Raise current period quota ceiling to target plan's monthly quota
            // Existing used_bytes is untouched, so remaining increases by the difference!
            $period->update([
                'allocated_bytes' => $targetPlan->monthly_quota_bytes,
            ]);

            // Sync user's plan attribute on User model
            if ($targetPlan->isBusiness()) {
                $user->update(['plan' => 'vip']);
            } else {
                $slugLower = strtolower($targetPlan->slug);
                if (in_array($slugLower, ['free', 'basic', 'premium', 'vip'])) {
                    $user->update(['plan' => $slugLower]);
                } else {
                    $user->update(['plan' => 'premium']);
                }
            }

            ProvisionMediaAccount::dispatch($user);

            return $subscription->fresh(['plan', 'activePeriod']);
        });
    }

    /**
     * Cancel/close a perpetual subscription if remaining quota is less than 5 GB.
     */
    public function cancelPerpetualSubscription(User $user): bool
    {
        $subscription = $user->subscriptions()
            ->where('status', 'active')
            ->where('is_perpetual', true)
            ->latest()
            ->first();

        if (! $subscription) {
            throw new \InvalidArgumentException('Aktif bir süresiz paketiniz bulunmuyor.');
        }

        $remainingBytes = $this->getTotalRemainingBytes($user);
        $thresholdBytes = 5 * 1024 * 1024 * 1024; // 5 GB

        if ($remainingBytes >= $thresholdBytes) {
            $formattedLimit = SubscriptionPeriod::formatBytes($thresholdBytes);
            throw new \InvalidArgumentException("Kalan kotanız {$formattedLimit} ve üzerinde olduğu için paketi kapatamazsınız.");
        }

        $subscription->update([
            'status' => 'cancelled',
            'notes' => trim(($subscription->notes ? $subscription->notes.' | ' : '').'Kullanıcı tarafından kota bittiği için sonlandırıldı ('.now()->format('d.m.Y H:i').')'),
        ]);

        $user->subscriptionPeriods()
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $user->update([
            'plan' => 'free',
        ]);

        return true;
    }
}
