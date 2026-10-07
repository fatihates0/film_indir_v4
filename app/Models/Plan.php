<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'monthly_quota_bytes',
        'monthly_quota_gb',
        'price_1m',
        'price_3m',
        'price_6m',
        'price_12m',
        'max_parallel_downloads',
        'speed_limit_mbps',
        'is_active',
        'sort_order',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'formatted_quota',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'monthly_quota_bytes' => 'integer',
            'monthly_quota_gb' => 'integer',
            'price_1m' => 'decimal:2',
            'price_3m' => 'decimal:2',
            'price_6m' => 'decimal:2',
            'price_12m' => 'decimal:2',
            'max_parallel_downloads' => 'integer',
            'speed_limit_mbps' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Subscriptions for this plan.
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Scope to active plans ordered by sort order.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }

    /**
     * Formatted quota string (e.g. "1.500 GB").
     */
    protected function formattedQuota(): Attribute
    {
        return Attribute::make(
            get: fn (): string => number_format($this->monthly_quota_gb, 0, ',', '.').' GB'
        );
    }

    /**
     * Get the price for a specific duration in months.
     */
    public function getPriceForDuration(int $months): float
    {
        return match ($months) {
            3 => (float) $this->price_3m,
            6 => (float) $this->price_6m,
            12 => (float) $this->price_12m,
            default => (float) $this->price_1m,
        };
    }
}
