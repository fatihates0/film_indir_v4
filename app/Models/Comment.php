<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Comment extends Model
{
    use HasFactory;

    protected $fillable = [
        'tmdb_title_id',
        'user_id',
        'parent_id',
        'guest_name',
        'guest_avatar',
        'rating',
        'content',
        'likes_count',
        'dislikes_count',
        'is_approved',
    ];

    protected $casts = [
        'rating' => 'integer',
        'likes_count' => 'integer',
        'dislikes_count' => 'integer',
        'is_approved' => 'boolean',
    ];

    protected $appends = [
        'user_name',
        'user_avatar',
        'formatted_date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function title(): BelongsTo
    {
        return $this->belongsTo(TmdbTitle::class, 'tmdb_title_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id')
            ->where('is_approved', true)
            ->with(['replies', 'user'])
            ->orderBy('created_at', 'asc');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(CommentReaction::class);
    }

    public function getUserNameAttribute(): string
    {
        if ($this->user) {
            return $this->user->name;
        }

        return $this->guest_name ?: 'Sinemasever';
    }

    public function getUserAvatarAttribute(): string
    {
        if ($this->guest_avatar) {
            return $this->guest_avatar;
        }

        // Avatar based on name hash if not user
        $avatars = [
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
            'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        ];

        $name = $this->getUserNameAttribute();
        $index = abs(crc32($name)) % count($avatars);

        return $avatars[$index];
    }

    public function getFormattedDateAttribute(): string
    {
        return $this->created_at ? $this->created_at->locale('tr')->diffForHumans() : 'Az önce';
    }
}
