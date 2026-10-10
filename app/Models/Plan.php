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

    public const TYPE_INDIVIDUAL = 'individual';

    public const TYPE_BUSINESS = 'business';

    public const TYPE_EXTRA = 'extra';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'type',
        'description',
        'monthly_quota_bytes',
        'monthly_quota_gb',
        'price_1m',
        'price_3m',
        'price_6m',
        'price_12m',
        'allowed_durations',
        'max_parallel_downloads',
        'speed_limit_mbps',
        'allow_vps_access',
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
        'type_label',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => 'string',
            'monthly_quota_bytes' => 'integer',
            'monthly_quota_gb' => 'integer',
            'price_1m' => 'decimal:2',
            'price_3m' => 'decimal:2',
            'price_6m' => 'decimal:2',
            'price_12m' => 'decimal:2',
            'allowed_durations' => 'array',
            'max_parallel_downloads' => 'integer',
            'speed_limit_mbps' => 'integer',
            'allow_vps_access' => 'boolean',
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
     * Scope to individual plans.
     */
    public function scopeIndividual(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_INDIVIDUAL);
    }

    /**
     * Scope to business plans.
     */
    public function scopeBusiness(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_BUSINESS);
    }

    /**
     * Scope to extra quota plans.
     */
    public function scopeExtra(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_EXTRA);
    }

    /**
     * Check if plan is individual type.
     */
    public function isIndividual(): bool
    {
        return $this->type === self::TYPE_INDIVIDUAL || empty($this->type);
    }

    /**
     * Check if plan is business type.
     */
    public function isBusiness(): bool
    {
        return $this->type === self::TYPE_BUSINESS;
    }

    /**
     * Check if plan is extra quota type.
     */
    public function isExtra(): bool
    {
        return $this->type === self::TYPE_EXTRA;
    }

    /**
     * Formatted quota string (e.g. "1.500 GB").
     */
    protected function formattedQuota(): Attribute
    {
        return Attribute::make(
            get: fn (): string => number_format((float) ($this->monthly_quota_gb ?? 0), 0, ',', '.').' GB'
        );
    }

    /**
     * Human-readable type label.
     */
    protected function typeLabel(): Attribute
    {
        return Attribute::make(
            get: fn (): string => match ($this->type) {
                self::TYPE_BUSINESS => 'Business Paket',
                self::TYPE_EXTRA => 'Ek Kota Paketi',
                default => 'Bireysel Paket',
            }
        );
    }

    /**
     * Allowed durations array fallback.
     */
    protected function allowedDurations(): Attribute
    {
        return Attribute::make(
            get: function ($value): array {
                if ($this->isExtra()) {
                    return [1];
                }

                if (empty($value)) {
                    return [1, 3, 6, 12];
                }
                $decoded = is_string($value) ? json_decode($value, true) : $value;
                if (! is_array($decoded) || empty($decoded)) {
                    return [1, 3, 6, 12];
                }

                return array_values(array_map('intval', $decoded));
            }
        );
    }

    /**
     * Check if a duration (in months) is allowed for this plan.
     */
    public function isDurationAllowed(int $months): bool
    {
        if ($this->isExtra()) {
            return $months === 1;
        }

        return in_array($months, $this->allowed_durations, true);
    }

    /**
     * Get the price for a specific duration in months.
     */
    public function getPriceForDuration(int $months): float
    {
        if ($this->isExtra()) {
            return (float) $this->price_1m;
        }

        return match ($months) {
            3 => (float) $this->price_3m,
            6 => (float) $this->price_6m,
            12 => (float) $this->price_12m,
            default => (float) $this->price_1m,
        };
    }
}
