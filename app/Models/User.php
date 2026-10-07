<?php

namespace App\Models;

use App\Enums\UserPlan;
use App\Enums\UserRole;
use App\Services\SubscriptionService;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'role', 'plan', 'subscription_ends_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'plan' => UserPlan::class,
            'subscription_ends_at' => 'datetime',
        ];
    }

    /**
     * Check if the user is an admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === UserRole::ADMIN;
    }

    /**
     * Check if the user is a standard user.
     */
    public function isUser(): bool
    {
        return $this->role === UserRole::USER;
    }

    /**
     * Check if the user has a specific plan.
     */
    public function hasPlan(UserPlan|string $plan): bool
    {
        $targetPlan = is_string($plan) ? UserPlan::from($plan) : $plan;

        return $this->plan === $targetPlan;
    }

    /**
     * Check if user's plan is at least a certain level.
     */
    public function hasMinPlan(UserPlan|string $minPlan): bool
    {
        $targetPlan = is_string($minPlan) ? UserPlan::from($minPlan) : $minPlan;

        return $this->plan->level() >= $targetPlan->level();
    }

    /**
     * Check if the user has an active paid subscription.
     */
    public function hasActiveSubscription(): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        return $this->subscriptions()
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>', now())
            ->exists();
    }

    /**
     * All subscriptions of the user.
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Active subscription relationship.
     */
    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>', now())
            ->latestOfMany();
    }

    /**
     * All subscription periods for quota tracking.
     */
    public function subscriptionPeriods(): HasMany
    {
        return $this->hasMany(SubscriptionPeriod::class);
    }

    /**
     * Download tickets created by the user.
     */
    public function downloadTickets(): HasMany
    {
        return $this->hasMany(DownloadTicket::class);
    }

    /**
     * Check if user can initiate a download.
     */
    public function canDownload(): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        $period = app(SubscriptionService::class)->getCurrentPeriod($this);

        return $period !== null && $period->hasAvailableQuota();
    }
}
