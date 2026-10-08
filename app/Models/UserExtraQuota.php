<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserExtraQuota extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'plan_id',
        'name',
        'allocated_bytes',
        'used_bytes',
        'starts_at',
        'expires_at',
        'status',
        'price_paid',
        'notes',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'remaining_bytes',
        'usage_percentage',
        'formatted_allocated',
        'formatted_used',
        'formatted_remaining',
        'is_valid',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'allocated_bytes' => 'integer',
            'used_bytes' => 'integer',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'price_paid' => 'decimal:2',
        ];
    }

    /**
     * Owner user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Reference plan (if created from an Extra Quota Plan).
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * Scope to active, valid extra quotas.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>', now())
            ->whereColumn('used_bytes', '<', 'allocated_bytes');
    }

    /**
     * Remaining bytes for this extra quota item.
     */
    protected function remainingBytes(): Attribute
    {
        return Attribute::make(
            get: fn (): int => max(0, $this->allocated_bytes - $this->used_bytes)
        );
    }

    /**
     * Usage percentage (0 - 100).
     */
    protected function usagePercentage(): Attribute
    {
        return Attribute::make(
            get: function (): float {
                if ($this->allocated_bytes <= 0) {
                    return 100.0;
                }

                $pct = ($this->used_bytes / $this->allocated_bytes) * 100;

                return round(min(100.0, max(0.0, $pct)), 1);
            }
        );
    }

    /**
     * Formatted allocated bytes.
     */
    protected function formattedAllocated(): Attribute
    {
        return Attribute::make(
            get: fn (): string => SubscriptionPeriod::formatBytes($this->allocated_bytes)
        );
    }

    /**
     * Formatted used bytes.
     */
    protected function formattedUsed(): Attribute
    {
        return Attribute::make(
            get: fn (): string => SubscriptionPeriod::formatBytes($this->used_bytes)
        );
    }

    /**
     * Formatted remaining bytes.
     */
    protected function formattedRemaining(): Attribute
    {
        return Attribute::make(
            get: fn (): string => SubscriptionPeriod::formatBytes($this->remaining_bytes)
        );
    }

    /**
     * Check if extra quota is currently valid and active.
     */
    protected function isValid(): Attribute
    {
        return Attribute::make(
            get: fn (): bool => $this->status === 'active'
                && $this->starts_at->isPast()
                && $this->expires_at->isFuture()
                && $this->remaining_bytes > 0
        );
    }
}
