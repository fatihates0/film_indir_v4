<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\PaymentNotification;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller
{
    /**
     * Display plan management dashboard.
     */
    public function index(Request $request): Response
    {
        $plans = Plan::withCount(['subscriptions' => function ($q) {
            $q->where('status', 'active')->whereHas('user', function ($uq) {
                $uq->where('role', '!=', UserRole::ADMIN);
            });
        }])->orderBy('sort_order')->get();

        $users = User::where('role', '!=', UserRole::ADMIN)
            ->orderBy('name')
            ->get()
            ->map(function (User $u) {
                $period = app(SubscriptionService::class)->getCurrentPeriod($u);
                $activeSub = $u->subscriptions()->where('status', 'active')->latest()->first();

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->role->value,
                    'role_label' => $u->role->label(),
                    'plan_key' => $u->plan->value,
                    'plan_name' => $period ? ($period->subscription->plan?->name ?? ($period->subscription->is_perpetual ? 'Süresiz Özel Kota' : 'Özel İndirme Kotası')) : $u->plan->label(),
                    'plan_id' => $period?->subscription?->plan_id,
                    'has_active_sub' => $activeSub !== null,
                    'is_perpetual' => (bool) ($activeSub?->is_perpetual),
                    'quota_used' => $period ? $period->formatted_used : '0 GB',
                    'quota_total' => $period ? $period->formatted_allocated : '0 GB',
                    'quota_used_bytes' => $period?->used_bytes ?? 0,
                    'quota_allocated_bytes' => $period?->allocated_bytes ?? 0,
                    'quota_percentage' => $period ? $period->usage_percentage : 0,
                    'custom_speed_limit_mbps' => $u->custom_speed_limit_mbps,
                    'expires_at' => $activeSub ? ($activeSub->is_perpetual ? 'Süresiz' : $activeSub->expires_at->format('d.m.Y H:i')) : null,
                    'created_at' => $u->created_at->format('d.m.Y H:i'),
                ];
            });

        $subscriptionsHistory = Subscription::with(['user', 'plan'])
            ->whereHas('user', function ($q) {
                $q->where('role', '!=', UserRole::ADMIN);
            })
            ->latest('id')
            ->get()
            ->map(function (Subscription $sub) {
                return [
                    'id' => $sub->id,
                    'user_id' => $sub->user_id,
                    'user_name' => $sub->user ? $sub->user->name : 'Silinmiş Kullanıcı',
                    'user_email' => $sub->user ? $sub->user->email : '-',
                    'plan_name' => $sub->plan?->name ?? ($sub->is_perpetual ? 'Süresiz Özel Kota' : 'Özel İndirme Kotası'),
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

        $paymentMethods = PaymentMethod::orderBy('sort_order')->get();

        $paymentNotifications = PaymentNotification::with(['user', 'plan', 'paymentMethod'])
            ->whereHas('user', function ($q) {
                $q->where('role', '!=', UserRole::ADMIN);
            })
            ->latest('id')
            ->get()
            ->map(function (PaymentNotification $pn) {
                return [
                    'id' => $pn->id,
                    'user_name' => $pn->user ? $pn->user->name : 'Silinmiş Kullanıcı',
                    'user_email' => $pn->user ? $pn->user->email : '-',
                    'plan_name' => $pn->plan?->name ?? 'Özel Paket',
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

        return Inertia::render('Admin/Plans/Index', [
            'plans' => $plans,
            'users' => $users,
            'subscriptionsHistory' => $subscriptionsHistory,
            'paymentMethods' => $paymentMethods,
            'paymentNotifications' => $paymentNotifications,
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
            'description' => 'nullable|string|max:1000',
            'monthly_quota_gb' => 'required|integer|min:1|max:100000',
            'price_1m' => 'required|numeric|min:0',
            'price_3m' => 'required|numeric|min:0',
            'price_6m' => 'required|numeric|min:0',
            'price_12m' => 'required|numeric|min:0',
            'allowed_durations' => 'nullable|array',
            'allowed_durations.*' => 'integer|in:1,3,6,12',
            'max_parallel_downloads' => 'required|integer|min:1|max:20',
            'speed_limit_mbps' => 'nullable|integer|min:1',
            'allow_vps_access' => 'nullable|boolean',
            'is_active' => 'required|boolean',
            'sort_order' => 'required|integer|min:0',
        ]);

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);
        if (Plan::where('slug', $slug)->exists()) {
            $slug = $slug.'-'.time();
        }

        $monthlyQuotaBytes = (int) $validated['monthly_quota_gb'] * 1024 * 1024 * 1024;
        $allowedDurations = ! empty($validated['allowed_durations']) ? array_values(array_map('intval', $validated['allowed_durations'])) : [1, 3, 6, 12];

        Plan::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'monthly_quota_gb' => $validated['monthly_quota_gb'],
            'monthly_quota_bytes' => $monthlyQuotaBytes,
            'price_1m' => $validated['price_1m'],
            'price_3m' => $validated['price_3m'],
            'price_6m' => $validated['price_6m'],
            'price_12m' => $validated['price_12m'],
            'allowed_durations' => $allowedDurations,
            'max_parallel_downloads' => $validated['max_parallel_downloads'],
            'speed_limit_mbps' => $validated['speed_limit_mbps'] ?? null,
            'allow_vps_access' => (bool) ($validated['allow_vps_access'] ?? false),
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
            'description' => 'nullable|string|max:1000',
            'monthly_quota_gb' => 'required|integer|min:1|max:100000',
            'price_1m' => 'required|numeric|min:0',
            'price_3m' => 'required|numeric|min:0',
            'price_6m' => 'required|numeric|min:0',
            'price_12m' => 'required|numeric|min:0',
            'allowed_durations' => 'nullable|array',
            'allowed_durations.*' => 'integer|in:1,3,6,12',
            'max_parallel_downloads' => 'required|integer|min:1|max:20',
            'speed_limit_mbps' => 'nullable|integer|min:1',
            'allow_vps_access' => 'nullable|boolean',
            'is_active' => 'required|boolean',
            'sort_order' => 'required|integer|min:0',
        ]);

        $monthlyQuotaBytes = (int) $validated['monthly_quota_gb'] * 1024 * 1024 * 1024;
        $allowedDurations = ! empty($validated['allowed_durations']) ? array_values(array_map('intval', $validated['allowed_durations'])) : [1, 3, 6, 12];

        $plan->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['slug']),
            'description' => $validated['description'] ?? null,
            'monthly_quota_gb' => $validated['monthly_quota_gb'],
            'monthly_quota_bytes' => $monthlyQuotaBytes,
            'price_1m' => $validated['price_1m'],
            'price_3m' => $validated['price_3m'],
            'price_6m' => $validated['price_6m'],
            'price_12m' => $validated['price_12m'],
            'allowed_durations' => $allowedDurations,
            'max_parallel_downloads' => $validated['max_parallel_downloads'],
            'speed_limit_mbps' => $validated['speed_limit_mbps'] ?? null,
            'allow_vps_access' => (bool) ($validated['allow_vps_access'] ?? false),
            'is_active' => $validated['is_active'],
            'sort_order' => $validated['sort_order'],
        ]);

        return redirect()->back()->with('success', "'{$plan->name}' paketi güncellendi.");
    }

    /**
     * Delete a plan with option to transfer existing subscribers to another plan or set them plan-less.
     */
    public function destroy(Request $request, Plan $plan)
    {
        $targetPlanId = $request->input('target_plan_id'); // null, 'none', or plan_id

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
            $message = "'{$plan->name}' paketi silindi. Etkilenen {$count} kullanıcının paketi kaldırıldı (Paketsiz yapıldı).";
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
            'plan_id' => 'nullable|string', // plan ID or 'custom' or 'none'
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
            // Remove user subscription
            $user->subscriptions()->where('status', 'active')->update(['status' => 'cancelled']);
            $user->subscriptionPeriods()->where('is_active', true)->update(['is_active' => false]);
            $user->update([
                'plan' => 'free',
                'custom_speed_limit_mbps' => $customSpeed,
            ]);

            return redirect()->back()->with('success', "{$user->name} kullanıcısının paketi kaldırıldı.");
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

        $plan = null;
        $customQuotaGb = null;

        if ($validated['plan_id'] === 'custom' || empty($validated['plan_id'])) {
            $customQuotaGb = (int) ($validated['custom_quota_gb'] ?? 100);
        } else {
            $plan = Plan::find($validated['plan_id']);
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
     * Remove active subscription/plan from a user.
     */
    public function removeUserPlan(Request $request, User $user)
    {
        $user->subscriptions()->where('status', 'active')->update(['status' => 'cancelled']);
        $user->subscriptionPeriods()->where('is_active', true)->update(['is_active' => false]);
        $user->update([
            'plan' => 'free',
            'custom_speed_limit_mbps' => null,
        ]);

        return redirect()->back()->with('success', "{$user->name} kullanıcısının tüm paket ve kotası temizlendi.");
    }
}
