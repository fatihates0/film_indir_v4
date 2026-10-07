<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPeriod extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'subscription_id',
        'user_id',
        'period_number',
        'period_start',
        'period_end',
        'allocated_bytes',
        'used_bytes',
        'is_active',
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
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_number' => 'integer',
            'period_start' => 'datetime',
            'period_end' => 'datetime',
            'allocated_bytes' => 'integer',
            'used_bytes' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * The parent subscription.
     */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /**
     * The user this period belongs to.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Tickets associated with this period.
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(DownloadTicket::class);
    }

    /**
     * Scope to active periods.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where('period_start', '<=', now())
            ->where('period_end', '>', now());
    }

    /**
     * Remaining quota in bytes (clamped at 0).
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
     * Human-readable allocated quota string.
     */
    protected function formattedAllocated(): Attribute
    {
        return Attribute::make(
            get: fn (): string => self::formatBytes($this->allocated_bytes)
        );
    }

    /**
     * Human-readable used bytes string.
     */
    protected function formattedUsed(): Attribute
    {
        return Attribute::make(
            get: fn (): string => self::formatBytes($this->used_bytes)
        );
    }

    /**
     * Human-readable remaining bytes string.
     */
    protected function formattedRemaining(): Attribute
    {
        return Attribute::make(
            get: fn (): string => self::formatBytes($this->remaining_bytes)
        );
    }

    /**
     * Check if the user has available quota to start an action.
     */
    public function hasAvailableQuota(): bool
    {
        return $this->remaining_bytes > 0;
    }

    /**
     * Check if quota is exhausted.
     */
    public function isExhausted(): bool
    {
        return $this->remaining_bytes <= 0;
    }

    /**
     * Format raw bytes into human readable format (GB / MB / TB).
     */
    public static function formatBytes(int $bytes, int $precision = 2): string
    {
        if ($bytes <= 0) {
            return '0 GB';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        $power = $bytes > 0 ? floor(log($bytes, 1024)) : 0;
        $power = min($power, count($units) - 1);

        $value = $bytes / pow(1024, $power);

        return number_format($value, $precision, ',', '.').' '.$units[$power];
    }
}
