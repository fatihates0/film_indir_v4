<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DownloadTicket extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'token',
        'user_id',
        'media_file_id',
        'subscription_period_id',
        'bytes_downloaded',
        'ip_address',
        'user_agent',
        'status',
        'expires_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'bytes_downloaded' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * The user this ticket belongs to.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The media file being downloaded.
     */
    public function mediaFile(): BelongsTo
    {
        return $this->belongsTo(MediaFile::class);
    }

    /**
     * The subscription period this download counts towards.
     */
    public function subscriptionPeriod(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPeriod::class);
    }

    /**
     * Scope to valid and unexpired tickets.
     */
    public function scopeValid(Builder $query): Builder
    {
        return $query->where('expires_at', '>', now())
            ->whereNotIn('status', ['aborted', 'expired']);
    }

    /**
     * Check if the ticket is currently valid.
     */
    public function isValid(): bool
    {
        return $this->expires_at->isFuture() && ! in_array($this->status, ['aborted', 'expired'], true);
    }

    /**
     * Generate a new random ticket token.
     */
    public static function generateToken(): string
    {
        return Str::random(40).bin2hex(random_bytes(12));
    }
}
