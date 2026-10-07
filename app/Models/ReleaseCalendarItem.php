<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReleaseCalendarItem extends Model
{
    use HasFactory;

    protected $table = 'release_calendar_items';

    protected $fillable = [
        'item_key',
        'tmdb_id',
        'media_type',
        'title',
        'title_tr',
        'title_en',
        'original_title',
        'overview',
        'release_date',
        'season_number',
        'episode_number',
        'episode_name',
        'poster_url',
        'backdrop_url',
        'vote_average',
        'popularity',
        'platform',
        'platform_name',
        'platform_logo',
        'language_used',
        'is_available',
        'detail_url',
        'extra_data',
    ];

    protected $casts = [
        'tmdb_id' => 'integer',
        'season_number' => 'integer',
        'episode_number' => 'integer',
        'vote_average' => 'float',
        'popularity' => 'float',
        'is_available' => 'boolean',
        'release_date' => 'date:Y-m-d',
        'extra_data' => 'array',
    ];
}
