<?php

namespace App\Models;

use App\Enums\StorageBoxConnectionStatus;
use App\Enums\StorageBoxProtocol;
use App\Enums\StorageBoxStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StorageBox extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'host',
        'protocol',
        'port',
        'username',
        'password',
        'use_ssl',
        'total_capacity_gb',
        'free_capacity_gb',
        'used_capacity_gb',
        'status',
        'connection_status',
        'latency_ms',
        'last_checked_at',
        'last_error',
        'notes',
        'is_default',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'has_password',
        'formatted_total',
        'formatted_free',
        'formatted_used',
        'free_percentage',
        'used_percentage',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'protocol' => StorageBoxProtocol::class,
            'status' => StorageBoxStatus::class,
            'connection_status' => StorageBoxConnectionStatus::class,
            'password' => 'encrypted',
            'is_default' => 'boolean',
            'use_ssl' => 'boolean',
            'last_checked_at' => 'datetime',
            'total_capacity_gb' => 'integer',
            'free_capacity_gb' => 'integer',
            'used_capacity_gb' => 'integer',
            'latency_ms' => 'integer',
        ];
    }

    /**
     * Alias api_secret to password column.
     */
    protected function apiSecret(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->password,
            set: fn (?string $value) => ['password' => $value],
        );
    }

    /**
     * Indicate if a password is set without revealing it.
     */
    protected function hasPassword(): Attribute
    {
        return Attribute::make(
            get: fn (): bool => ! empty($this->password)
        );
    }

    /**
     * Formatted string of total capacity (GB or TB).
     */
    protected function formattedTotal(): Attribute
    {
        return Attribute::make(
            get: fn (): string => $this->formatGb((int) $this->total_capacity_gb)
        );
    }

    /**
     * Formatted string of automatically detected free space (Boş Alan).
     */
    protected function formattedFree(): Attribute
    {
        return Attribute::make(
            get: function (): ?string {
                if ($this->free_capacity_gb === null) {
                    return null;
                }

                return $this->formatGb((int) $this->free_capacity_gb);
            }
        );
    }

    /**
     * Formatted string of automatically detected used space (Kullanılan Alan).
     */
    protected function formattedUsed(): Attribute
    {
        return Attribute::make(
            get: function (): ?string {
                if ($this->used_capacity_gb === null) {
                    return null;
                }

                return $this->formatGb((int) $this->used_capacity_gb);
            }
        );
    }

    /**
     * Free percentage of capacity (0 - 100).
     */
    protected function freePercentage(): Attribute
    {
        return Attribute::make(
            get: function (): ?float {
                if ($this->free_capacity_gb === null || (int) $this->total_capacity_gb <= 0) {
                    return null;
                }

                $pct = ((int) $this->free_capacity_gb / (int) $this->total_capacity_gb) * 100;

                return round(min(100.0, max(0.0, $pct)), 1);
            }
        );
    }

    /**
     * Used percentage of capacity (0 - 100).
     */
    protected function usedPercentage(): Attribute
    {
        return Attribute::make(
            get: function (): ?float {
                if ($this->used_capacity_gb === null || (int) $this->total_capacity_gb <= 0) {
                    return null;
                }

                $pct = ((int) $this->used_capacity_gb / (int) $this->total_capacity_gb) * 100;

                return round(min(100.0, max(0.0, $pct)), 1);
            }
        );
    }

    /**
     * Format gigabytes into a readable unit (GB or TB).
     */
    public function formatGb(int $gb): string
    {
        if ($gb >= 1024) {
            $tb = sprintf('%.2f', $gb / 1024);

            return "{$tb} TB";
        }

        return "{$gb} GB";
    }

    /**
     * Scope a query to only include active storage boxes.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', StorageBoxStatus::Active);
    }

    /**
     * Scope a query to only include online storage boxes.
     */
    public function scopeOnline(Builder $query): Builder
    {
        return $query->where('connection_status', StorageBoxConnectionStatus::Online);
    }

    /**
     * Video and media files indexed from this storage box.
     */
    public function mediaFiles(): HasMany
    {
        return $this->hasMany(MediaFile::class);
    }
}
