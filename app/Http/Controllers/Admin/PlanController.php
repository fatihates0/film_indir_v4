<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Jobs\ProvisionMediaAccount;
use App\Models\PaymentMethod;
use App\Models\PaymentNotification;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;
use App\Models\User;
use App\Models\UserExtraQuota;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller
{
    /**
     * Display plan & subscription management dashboard with scalable server-side querying and pagination.
     */
    public function index(Request $request): Response
    {
        $activeTab = $request->input('tab', 'plans');
        $perPage = max(5, min(100, (int) $request->input('per_page', 15)));

        // 1. Instant SQL Aggregate KPI Stats (Executes in ~2ms instead of iterating all users in PHP/JS)
        $activePlansCount = Plan::where('is_active', true)->count();
        $totalPlansCount = Plan::count();
        $totalSubscribedUsers = Subscription::where('status', 'active')
            ->whereHas('user', fn ($q) => $q->where('role', '!=', UserRole::ADMIN))
            ->distinct('user_id')
            ->count('user_id');
        $perpetualUsersCount = Subscription::where('status', 'active')
            ->where('is_perpetual', true)
            ->whereHas('user', fn ($q) => $q->where('role', '!=', UserRole::ADMIN))
            ->count();
        $pendingNotificationsCount = PaymentNotification::where('status', 'pending')
            ->whereHas('user', fn ($q) => $q->where('role', '!=', UserRole::ADMIN))
            ->count();

        $mainAllocatedBytes = (int) SubscriptionPeriod::where('is_active', true)
            ->whereHas('user', fn ($q) => $q->where('role', '!=', UserRole::ADMIN))
            ->sum('allocated_bytes');
        $mainUsedBytes = (int) SubscriptionPeriod::where('is_active', true)
            ->whereHas('user', fn ($q) => $q->where('role', '!=', UserRole::ADMIN))
            ->sum('used_bytes');

        $extraAllocatedBytes = (int) UserExtraQuota::where('status', 'active')
            ->whereHas('user', fn ($q) => $q->where('role', '!=', UserRole::ADMIN))
            ->sum('allocated_bytes');
        $extraUsedBytes = (int) UserExtraQuota::where('status', 'active')
            ->whereHas('user', fn ($q) => $q->where('role', '!=', UserRole::ADMIN))
            ->sum('used_bytes');

        $totalAllocatedGb = round(($mainAllocatedBytes + $extraAllocatedBytes) / (1024 * 1024 * 1024));
        $totalUsedGb = round(($mainUsedBytes + $extraUsedBytes) / (1024 * 1024 * 1024));
        $totalRevenue = (float) Subscription::where('status', 'active')->sum('price_paid');

        $stats = [
            'activePlansCount' => $activePlansCount,
            'totalPlansCount' => $totalPlansCount,
            'totalSubscribedUsers' => $totalSubscribedUsers,
            'perpetualUsersCount' => $perpetualUsersCount,
            'pendingNotificationsCount' => $pendingNotificationsCount,
            'totalAllocatedGb' => $totalAllocatedGb,
            'totalUsedGb' => $totalUsedGb,
            'totalRevenue' => $totalRevenue,
            'formattedRevenue' => '₺'.number_format($totalRevenue, 2, ',', '.'),
        ];

        // 2. All Plan definitions (Always loaded, lightweight)
        $plans = Plan::withCount(['subscriptions' => function ($q) {
            $q->where('status', 'active')->whereHas('user', function ($uq) {
                $uq->where('role', '!=', UserRole::ADMIN);
            });
        }])->orderBy('sort_order')->get();

        // 3. Payment Methods (Always loaded, lightweight)
        $paymentMethods = PaymentMethod::orderBy('sort_order')->get();

        // 4. Server-Side Paginated Users Query
        $userSearch = trim((string) $request->input('user_search', ''));
        $userPlanFilter = (string) $request->input('user_plan', 'all');
        $userQuotaFilter = (string) $request->input('user_quota', 'all');

        $usersQuery = User::where('role', '!=', UserRole::ADMIN);

        if ($userSearch !== '') {
            $usersQuery->where(function ($q) use ($userSearch) {
                $q->where('name', 'like', "%{$userSearch}%")
                    ->orWhere('email', 'like', "%{$userSearch}%");
            });
        }

        if ($userPlanFilter === 'active_sub') {
            $usersQuery->whereHas('subscriptions', fn ($q) => $q->where('status', 'active'));
        } elseif ($userPlanFilter === 'no_sub') {
            $usersQuery->whereDoesntHave('subscriptions', fn ($q) => $q->where('status', 'active'));
        } elseif ($userPlanFilter === 'perpetual') {
            $usersQuery->whereHas('subscriptions', fn ($q) => $q->where('status', 'active')->where('is_perpetual', true));
        } elseif (is_numeric($userPlanFilter)) {
            $usersQuery->whereHas('subscriptions', fn ($q) => $q->where('status', 'active')->where('plan_id', (int) $userPlanFilter));
        }

        if ($userQuotaFilter === 'over_80') {
            $usersQuery->whereHas('subscriptionPeriods', fn ($q) => $q->where('is_active', true)->whereRaw('used_bytes >= allocated_bytes * 0.8'));
        } elseif ($userQuotaFilter === 'exhausted') {
            $usersQuery->whereHas('subscriptionPeriods', fn ($q) => $q->where('is_active', true)->whereColumn('used_bytes', '>=', 'allocated_bytes'));
        }

        $usersPaginated = $usersQuery->orderBy('name')->paginate($perPage, ['*'], 'users_page')->withQueryString();

        $subscriptionService = app(SubscriptionService::class);
        $mappedUsers = $usersPaginated->getCollection()->map(function (User $u) use ($subscriptionService) {
            $period = $subscriptionService->getCurrentPeriod($u);
            $activeSub = $u->subscriptions()->where('status', 'active')->latest()->first();
            $activeExtras = $subscriptionService->getActiveExtraQuotas($u);

            $mainAllocated = $period ? $period->allocated_bytes : 0;
            $mainUsed = $period ? $period->used_bytes : 0;
            $extraAllocated = (int) $activeExtras->sum('allocated_bytes');
            $extraUsed = (int) $activeExtras->sum('used_bytes');

            $totalAllocated = $mainAllocated + $extraAllocated;
            $totalUsed = $mainUsed + $extraUsed;
            $totalPercentage = $totalAllocated > 0 ? round(min(100.0, max(0.0, ($totalUsed / $totalAllocated) * 100)), 1) : 0;

            $extrasList = $activeExtras->map(function ($extra) {
                return [
                    'id' => $extra->id,
                    'name' => $extra->name,
                    'allocated_formatted' => SubscriptionPeriod::formatBytes($extra->allocated_bytes),
                    'used_formatted' => SubscriptionPeriod::formatBytes($extra->used_bytes),
                    'remaining_formatted' => SubscriptionPeriod::formatBytes($extra->remaining_bytes),
                    'allocated_bytes' => $extra->allocated_bytes,
                    'used_bytes' => $extra->used_bytes,
                    'remaining_bytes' => $extra->remaining_bytes,
                    'expires_at' => $extra->expires_at ? $extra->expires_at->format('d.m.Y H:i') : null,
                    'days_left' => $extra->expires_at ? max(0, (int) now()->diffInDays($extra->expires_at, false)) : null,
                ];
            })->values()->all();

            $mainPlanName = $period ? ($period->subscription->plan?->name ?? ($period->subscription->is_perpetual ? 'Süresiz Özel Kota' : 'Özel İndirme Kotası')) : null;

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role->value,
                'role_label' => $u->role->label(),
                'plan_key' => $u->plan->value,
                'plan_name' => $mainPlanName ?? ($activeExtras->isNotEmpty() ? 'Ek Kota Paketi' : $u->plan->label()),
                'main_plan_name' => $mainPlanName,
                'plan_id' => $period?->subscription?->plan_id,
                'plan_type' => $period?->subscription?->plan?->type ?? 'individual',
                'has_active_sub' => $activeSub !== null,
                'has_extras' => ! empty($extrasList),
                'has_any_package' => $activeSub !== null || ! empty($extrasList),
                'is_perpetual' => (bool) ($activeSub?->is_perpetual),
                'quota_used' => SubscriptionPeriod::formatBytes($totalUsed),
                'quota_total' => SubscriptionPeriod::formatBytes($totalAllocated),
                'quota_used_bytes' => $totalUsed,
                'quota_allocated_bytes' => $totalAllocated,
                'quota_percentage' => $totalPercentage,
                'main_quota_used' => SubscriptionPeriod::formatBytes($mainUsed),
                'main_quota_total' => SubscriptionPeriod::formatBytes($mainAllocated),
                'main_allocated_bytes' => $mainAllocated,
                'main_used_bytes' => $mainUsed,
                'extra_quota_used' => SubscriptionPeriod::formatBytes($extraUsed),
                'extra_quota_total' => SubscriptionPeriod::formatBytes($extraAllocated),
                'active_extras_count' => count($extrasList),
                'extra_quota_formatted' => SubscriptionPeriod::formatBytes($activeExtras->sum(fn ($e) => $e->remaining_bytes)),
                'extras' => $extrasList,
                'custom_speed_limit_mbps' => $u->custom_speed_limit_mbps,
                'expires_at' => $activeSub ? ($activeSub->is_perpetual ? 'Süresiz' : $activeSub->expires_at->format('d.m.Y H:i')) : null,
                'created_at' => $u->created_at->format('d.m.Y H:i'),
            ];
        });

        $usersPaginated->setCollection($mappedUsers);

        // 5. Server-Side Paginated Payment Notifications
        $notifSearch = trim((string) $request->input('notif_search', ''));
        $notifStatus = (string) $request->input('notif_status', 'all');

        $notifsQuery = PaymentNotification::with(['user', 'plan', 'oldPlan', 'paymentMethod'])
            ->whereHas('user', fn ($q) => $q->where('role', '!=', UserRole::ADMIN));

        if ($notifStatus !== 'all') {
            $notifsQuery->where('status', $notifStatus);
        }

        if ($notifSearch !== '') {
            $notifsQuery->where(function ($q) use ($notifSearch) {
                $q->where('reference_code', 'like', "%{$notifSearch}%")
                    ->orWhere('sender_name', 'like', "%{$notifSearch}%")
                    ->orWhere('tx_hash', 'like', "%{$notifSearch}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$notifSearch}%")->orWhere('email', 'like', "%{$notifSearch}%"));
            });
        }

        $paymentNotificationsPaginated = $notifsQuery->latest('id')->paginate($perPage, ['*'], 'notifs_page')->withQueryString();
        $mappedNotifs = $paymentNotificationsPaginated->getCollection()->map(function (PaymentNotification $pn) {
            return [
                'id' => $pn->id,
                'user_name' => $pn->user ? $pn->user->name : 'Silinmiş Kullanıcı',
                'user_email' => $pn->user ? $pn->user->email : '-',
                'plan_name' => $pn->plan?->name ?? 'Özel Paket',
                'plan_type' => $pn->plan?->type ?? 'individual',
                'is_upgrade' => (bool) $pn->is_upgrade,
                'old_plan_name' => $pn->oldPlan?->name,
                'method_name' => $pn->paymentMethod?->name ?? $pn->payment_method_id,
                'method_driver' => $pn->paymentMethod?->driver ?? 'manual',
                'duration_months' => $pn->duration_months,
                'amount' => (float) $pn->amount,
                'formatted_amount' => '₺'.number_format((float) $pn->amount, 2, ',', '.'),
                'reference_code' => $pn->reference_code,
                'sender_name' => $pn->sender_name,
                'tx_hash' => $pn->tx_hash,
                'user_notes' => $pn->user_notes,
                'admin_notes' => $pn->admin_notes,
                'status' => $pn->status,
                'status_label' => match ($pn->status) {
                    'pending' => 'Bekliyor',
                    'approved' => 'Onaylandı',
                    'rejected' => 'Reddedildi',
                    default => ucfirst($pn->status),
                },
                'created_at' => $pn->created_at ? $pn->created_at->format('d.m.Y H:i') : null,
                'processed_at' => $pn->processed_at ? $pn->processed_at->format('d.m.Y H:i') : null,
            ];
        });
        $paymentNotificationsPaginated->setCollection($mappedNotifs);

        // 6. Server-Side Paginated Subscriptions History
        $historySearch = trim((string) $request->input('history_search', ''));
        $historyStatus = (string) $request->input('history_status', 'all');

        $historyQuery = Subscription::with(['user', 'plan'])
            ->whereHas('user', fn ($q) => $q->where('role', '!=', UserRole::ADMIN));

        if ($historyStatus !== 'all') {
            $historyQuery->where('status', $historyStatus);
        }

        if ($historySearch !== '') {
            $historyQuery->where(function ($q) use ($historySearch) {
                $q->where('notes', 'like', "%{$historySearch}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$historySearch}%")->orWhere('email', 'like', "%{$historySearch}%"))
                    ->orWhereHas('plan', fn ($pq) => $pq->where('name', 'like', "%{$historySearch}%"));
            });
        }

        $historyPaginated = $historyQuery->latest('id')->paginate(20, ['*'], 'history_page')->withQueryString();
        $mappedHistory = $historyPaginated->getCollection()->map(function (Subscription $sub) {
            return [
                'id' => $sub->id,
                'user_id' => $sub->user_id,
                'user_name' => $sub->user ? $sub->user->name : 'Silinmiş Kullanıcı',
                'user_email' => $sub->user ? $sub->user->email : '-',
                'plan_name' => $sub->plan?->name ?? ($sub->is_perpetual ? 'Süresiz Özel Kota' : 'Özel İndirme Kotası'),
                'plan_type' => $sub->plan?->type ?? 'individual',
                'duration_months' => $sub->duration_months,
                'is_perpetual' => (bool) $sub->is_perpetual,
                'price_paid' => (float) $sub->price_paid,
                'formatted_price' => '₺'.number_format((float) $sub->price_paid, 2, ',', '.'),
                'status' => $sub->status,
                'status_label' => match ($sub->status) {
                    'active' => 'Aktif',
                    'cancelled' => 'İptal Edildi',
                    'expired' => 'Süresi Doldu',
                    default => ucfirst($sub->status),
                },
                'starts_at' => $sub->starts_at ? $sub->starts_at->format('d.m.Y H:i') : null,
                'expires_at' => $sub->is_perpetual ? 'Süresiz' : ($sub->expires_at ? $sub->expires_at->format('d.m.Y H:i') : null),
                'notes' => $sub->notes,
                'created_at' => $sub->created_at ? $sub->created_at->format('d.m.Y H:i') : null,
            ];
        });
        $historyPaginated->setCollection($mappedHistory);

        return Inertia::render('Admin/Plans/Index', [
            'stats' => $stats,
            'activeSection' => $activeTab,
            'plans' => $plans,
            'users' => $usersPaginated,
            'paymentMethods' => $paymentMethods,
            'paymentNotifications' => $paymentNotificationsPaginated,
            'subscriptionsHistory' => $historyPaginated,
            'filters' => [
                'tab' => $activeTab,
                'user_search' => $userSearch,
                'user_plan' => $userPlanFilter,
                'user_quota' => $userQuotaFilter,
                'notif_search' => $notifSearch,
                'notif_status' => $notifStatus,
                'history_search' => $historySearch,
                'history_status' => $historyStatus,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Store a newly created plan.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'nullable|string|max:100|unique:plans,slug',
            'type' => 'required|string|in:individual,business,extra',
            'description' => 'nullable|string|max:1000',
            'monthly_quota_gb' => 'required|integer|min:1|max:100000',
            'price_1m' => 'required|numeric|min:0',
            'price_3m' => 'required|numeric|min:0',
            'price_6m' => 'required|numeric|min:0',
            'price_12m' => 'required|numeric|min:0',
            'allowed_durations' => 'nullable|array',
            'allowed_durations.*' => 'integer|in:1,3,6,12',
            'max_parallel_downloads' => 'required|integer|min:0|max:100',
            'speed_limit_mbps' => 'nullable|integer|min:1',
            'allow_vps_access' => 'nullable|boolean',
            'is_active' => 'required|boolean',
            'sort_order' => 'required|integer|min:0',
        ]);

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);
        if (Plan::where('slug', $slug)->exists()) {
            $slug = $slug.'-'.time();
        }

        $type = $validated['type'];
        $monthlyQuotaBytes = (int) $validated['monthly_quota_gb'] * 1024 * 1024 * 1024;
        $allowedDurations = $type === Plan::TYPE_EXTRA ? [1] : (! empty($validated['allowed_durations']) ? array_values(array_map('intval', $validated['allowed_durations'])) : [1, 3, 6, 12]);

        $allowVps = match ($type) {
            Plan::TYPE_BUSINESS => true,
            Plan::TYPE_EXTRA => false,
            default => (bool) ($validated['allow_vps_access'] ?? false),
        };
        $maxParallel = $type === Plan::TYPE_BUSINESS ? 0 : (int) $validated['max_parallel_downloads'];

        Plan::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'type' => $type,
            'description' => $validated['description'] ?? null,
            'monthly_quota_gb' => $validated['monthly_quota_gb'],
            'monthly_quota_bytes' => $monthlyQuotaBytes,
            'price_1m' => $validated['price_1m'],
            'price_3m' => $type === Plan::TYPE_EXTRA ? $validated['price_1m'] : $validated['price_3m'],
            'price_6m' => $type === Plan::TYPE_EXTRA ? $validated['price_1m'] : $validated['price_6m'],
            'price_12m' => $type === Plan::TYPE_EXTRA ? $validated['price_1m'] : $validated['price_12m'],
            'allowed_durations' => $allowedDurations,
            'max_parallel_downloads' => $maxParallel,
            'speed_limit_mbps' => $validated['speed_limit_mbps'] ?? null,
            'allow_vps_access' => $allowVps,
            'is_active' => $validated['is_active'],
            'sort_order' => $validated['sort_order'],
        ]);

        return redirect()->back()->with('success', "'{$validated['name']}' paketi başarıyla oluşturuldu.");
    }

    /**
     * Update an existing plan.
     */
    public function update(Request $request, Plan $plan)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:100|unique:plans,slug,'.$plan->id,
            'type' => 'required|string|in:individual,business,extra',
            'description' => 'nullable|string|max:1000',
            'monthly_quota_gb' => 'required|integer|min:1|max:100000',
            'price_1m' => 'required|numeric|min:0',
            'price_3m' => 'required|numeric|min:0',
            'price_6m' => 'required|numeric|min:0',
            'price_12m' => 'required|numeric|min:0',
            'allowed_durations' => 'nullable|array',
            'allowed_durations.*' => 'integer|in:1,3,6,12',
            'max_parallel_downloads' => 'required|integer|min:0|max:100',
            'speed_limit_mbps' => 'nullable|integer|min:1',
            'allow_vps_access' => 'nullable|boolean',
            'is_active' => 'required|boolean',
            'sort_order' => 'required|integer|min:0',
        ]);

        $type = $validated['type'];
        $monthlyQuotaBytes = (int) $validated['monthly_quota_gb'] * 1024 * 1024 * 1024;
        $allowedDurations = $type === Plan::TYPE_EXTRA ? [1] : (! empty($validated['allowed_durations']) ? array_values(array_map('intval', $validated['allowed_durations'])) : [1, 3, 6, 12]);

        $allowVps = match ($type) {
            Plan::TYPE_BUSINESS => true,
            Plan::TYPE_EXTRA => false,
            default => (bool) ($validated['allow_vps_access'] ?? false),
        };
        $maxParallel = $type === Plan::TYPE_BUSINESS ? 0 : (int) $validated['max_parallel_downloads'];

        $plan->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['slug']),
            'type' => $type,
            'description' => $validated['description'] ?? null,
            'monthly_quota_gb' => $validated['monthly_quota_gb'],
            'monthly_quota_bytes' => $monthlyQuotaBytes,
            'price_1m' => $validated['price_1m'],
            'price_3m' => $type === Plan::TYPE_EXTRA ? $validated['price_1m'] : $validated['price_3m'],
            'price_6m' => $type === Plan::TYPE_EXTRA ? $validated['price_1m'] : $validated['price_6m'],
            'price_12m' => $type === Plan::TYPE_EXTRA ? $validated['price_1m'] : $validated['price_12m'],
            'allowed_durations' => $allowedDurations,
            'max_parallel_downloads' => $maxParallel,
            'speed_limit_mbps' => $validated['speed_limit_mbps'] ?? null,
            'allow_vps_access' => $allowVps,
            'is_active' => $validated['is_active'],
            'sort_order' => $validated['sort_order'],
        ]);

        return redirect()->back()->with('success', "'{$plan->name}' paketi güncellendi.");
    }

    /**
     * Toggle active/passive status of a plan directly.
     */
    public function toggle(Plan $plan)
    {
        $plan->update(['is_active' => ! $plan->is_active]);
        $statusStr = $plan->is_active ? 'aktif (satışta)' : 'pasif (satışa kapalı)';

        return redirect()->back()->with('success', "'{$plan->name}' paketi {$statusStr} hale getirildi.");
    }

    /**
     * Clone an existing plan.
     */
    public function clone(Plan $plan)
    {
        $clone = $plan->replicate();
        $clone->name = $plan->name.' (Kopya)';
        $clone->slug = Str::slug($plan->slug.'-kopya-'.time());
        $clone->sort_order = $plan->sort_order + 1;
        $clone->save();

        return redirect()->back()->with('success', "'{$plan->name}' paketi başarıyla kopyalandı.");
    }

    /**
     * Delete a plan with option to transfer existing subscribers.
     */
    public function destroy(Request $request, Plan $plan)
    {
        $targetPlanId = $request->input('target_plan_id');

        $activeSubscriptions = Subscription::where('plan_id', $plan->id)
            ->where('status', 'active')
            ->get();

        $count = $activeSubscriptions->count();

        if ($targetPlanId && $targetPlanId !== 'none') {
            $targetPlan = Plan::find($targetPlanId);
            if ($targetPlan) {
                foreach ($activeSubscriptions as $sub) {
                    $sub->update(['plan_id' => $targetPlan->id]);
                    $sub->activePeriod()?->update([
                        'allocated_bytes' => $targetPlan->monthly_quota_bytes,
                    ]);

                    $user = $sub->user;
                    if ($user) {
                        $slugLower = strtolower($targetPlan->slug);
                        $user->update(['plan' => in_array($slugLower, ['free', 'basic', 'premium', 'vip']) ? $slugLower : 'premium']);
                    }
                }
                $message = "'{$plan->name}' paketi silindi. Kayıtlı {$count} kullanıcı '{$targetPlan->name}' paketine başarıyla transfer edildi.";
            } else {
                $message = "'{$plan->name}' paketi silindi.";
            }
        } else {
            foreach ($activeSubscriptions as $sub) {
                $sub->update(['status' => 'cancelled', 'plan_id' => null]);
                $sub->periods()->where('is_active', true)->update(['is_active' => false]);

                $user = $sub->user;
                if ($user) {
                    $user->update(['plan' => 'free']);
                }
            }
            $message = "'{$plan->name}' paketi silindi. Etkilenen {$count} kullanıcının paketi kaldırıldı.";
        }

        $plan->delete();

        return redirect()->back()->with('success', $message);
    }

    /**
     * Assign or update plan / custom download quota for a user.
     */
    public function assignUserPlan(Request $request, SubscriptionService $subscriptionService)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'plan_id' => 'nullable|string',
            'custom_quota_gb' => 'nullable|integer|min:1|max:100000',
            'custom_speed_limit_mbps' => 'nullable|integer|min:0|max:100000',
            'duration_type' => 'required|string|in:1,3,6,12,custom,perpetual',
            'custom_months' => 'nullable|integer|min:1|max:120',
            'price_paid' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = User::findOrFail($validated['user_id']);

        $customSpeed = isset($validated['custom_speed_limit_mbps']) && $validated['custom_speed_limit_mbps'] !== ''
            ? (int) $validated['custom_speed_limit_mbps']
            : null;

        if ($validated['plan_id'] === 'none') {
            $user->subscriptions()->where('status', 'active')->update(['status' => 'cancelled']);
            $user->subscriptionPeriods()->where('is_active', true)->update(['is_active' => false]);
            $user->update([
                'plan' => 'free',
                'custom_speed_limit_mbps' => $customSpeed,
            ]);

            return redirect()->back()->with('success', "{$user->name} kullanıcısının paketi kaldırıldı.");
        }

        $plan = Plan::find($validated['plan_id']);

        if ($plan && $plan->isExtra()) {
            UserExtraQuota::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'name' => $plan->name,
                'allocated_bytes' => $plan->monthly_quota_bytes,
                'used_bytes' => 0,
                'starts_at' => now(),
                'expires_at' => now()->addDays(30),
                'status' => 'active',
                'price_paid' => $validated['price_paid'] ?? (float) $plan->price_1m,
                'notes' => $validated['notes'] ?? 'Yönetici tarafından ek kota tanımlandı',
            ]);

            return redirect()->back()->with('success', "{$user->name} kullanıcısına {$plan->name} ({$plan->monthly_quota_gb} GB - 30 Gün) ek kotası başarıyla eklendi.");
        }

        $isPerpetual = $validated['duration_type'] === 'perpetual';
        $durationMonths = 1;

        if (! $isPerpetual) {
            if ($validated['duration_type'] === 'custom') {
                $durationMonths = max(1, (int) ($validated['custom_months'] ?? 1));
            } else {
                $durationMonths = (int) $validated['duration_type'];
            }
        }

        $customQuotaGb = null;

        if ($validated['plan_id'] === 'custom' || empty($validated['plan_id'])) {
            $customQuotaGb = (int) ($validated['custom_quota_gb'] ?? 100);
        } else {
            if ($validated['custom_quota_gb']) {
                $customQuotaGb = (int) $validated['custom_quota_gb'];
            }
        }

        $notes = $validated['notes'] ?? ($plan ? "Yönetici tarafından {$plan->name} paketi tanımlandı" : 'Yönetici tarafından özel kota tanımlandı');

        $subscriptionService->subscribe(
            $user,
            $plan,
            $durationMonths,
            $validated['price_paid'] ?? null,
            $notes,
            $customQuotaGb,
            $isPerpetual
        );

        $user->update([
            'custom_speed_limit_mbps' => $customSpeed,
        ]);

        $targetLabel = $plan ? $plan->name : "Özel Kota ({$customQuotaGb} GB)";
        $durationLabel = $isPerpetual ? 'Süresiz' : "{$durationMonths} Ay";

        return redirect()->back()->with('success', "{$user->name} kullanıcısına {$targetLabel} ({$durationLabel}) başarıyla tanımlandı.");
    }

    /**
     * Reset used quota bytes for user's active period.
     */
    public function resetUsage(Request $request, User $user, SubscriptionService $subscriptionService)
    {
        $period = $subscriptionService->getCurrentPeriod($user);
        if (! $period) {
            return redirect()->back()->with('error', "{$user->name} kullanıcısının aktif bir kota dönemi bulunamadı.");
        }

        $previousUsed = $period->formatted_used;
        $period->update(['used_bytes' => 0]);

        return redirect()->back()->with('success', "{$user->name} kullanıcısının harcanan kotası ({$previousUsed}) başarıyla sıfırlandı.");
    }

    /**
     * Extend user's active subscription expiration.
     */
    public function extendDuration(Request $request, User $user)
    {
        $validated = $request->validate([
            'days' => 'required|integer|min:1|max:3650',
            'notes' => 'nullable|string|max:255',
        ]);

        $subscription = $user->subscriptions()->where('status', 'active')->latest()->first();
        if (! $subscription) {
            return redirect()->back()->with('error', "{$user->name} kullanıcısının aktif bir aboneliği bulunamadı.");
        }

        if ($subscription->is_perpetual) {
            return redirect()->back()->with('error', 'Kullanıcının aboneliği zaten süresizdir.');
        }

        $baseDate = $subscription->expires_at->isPast() ? now() : $subscription->expires_at;
        $newExpiresAt = $baseDate->copy()->addDays($validated['days']);

        $subscription->update([
            'expires_at' => $newExpiresAt,
            'notes' => $validated['notes'] ? $subscription->notes.' | '.$validated['notes'] : $subscription->notes,
        ]);

        return redirect()->back()->with('success', "{$user->name} kullanıcısının aboneliği {$validated['days']} gün uzatıldı (Yeni Bitiş: {$newExpiresAt->format('d.m.Y H:i')}).");
    }

    /**
     * Directly grant an Extra Quota pool to a user.
     */
    public function addExtraQuotaDirect(Request $request, User $user)
    {
        $validated = $request->validate([
            'quota_gb' => 'required|integer|min:1|max:10000',
            'days' => 'required|integer|min:1|max:365',
            'name' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:255',
        ]);

        $allocatedBytes = (int) $validated['quota_gb'] * 1024 * 1024 * 1024;
        $name = $validated['name'] ?: "Ek Kota (+{$validated['quota_gb']} GB)";

        UserExtraQuota::create([
            'user_id' => $user->id,
            'name' => $name,
            'allocated_bytes' => $allocatedBytes,
            'used_bytes' => 0,
            'starts_at' => now(),
            'expires_at' => now()->addDays($validated['days']),
            'status' => 'active',
            'price_paid' => 0,
            'notes' => $validated['notes'] ?? 'Admin paneli üzerinden doğrudan tanımlandı',
        ]);

        return redirect()->back()->with('success', "{$user->name} kullanıcısına {$validated['quota_gb']} GB ({$validated['days']} Gün Geçerli) ek kota tanımlandı.");
    }

    /**
     * Trigger manual Jellyfin/Emby synchronization for user.
     */
    public function syncMediaAccount(User $user)
    {
        ProvisionMediaAccount::dispatch($user);

        return redirect()->back()->with('success', "{$user->name} kullanıcısı için medya sunucusu (Jellyfin/Emby) senkronizasyon görevi kuyruğa eklendi.");
    }

    /**
     * Remove active subscription/plan from a user.
     */
    public function removeUserPlan(Request $request, User $user)
    {
        $user->subscriptions()->where('status', 'active')->update(['status' => 'cancelled']);
        $user->subscriptionPeriods()->where('is_active', true)->update(['is_active' => false]);
        $user->extraQuotas()->where('status', 'active')->update(['status' => 'expired']);

        $user->update([
            'plan' => 'free',
            'custom_speed_limit_mbps' => null,
        ]);

        return redirect()->back()->with('success', "{$user->name} kullanıcısının tüm paket ve ek kota hakları temizlendi.");
    }
}
