<?php

namespace App\Http\Resources;

use App\Helpers\GenreHelper;
use App\Helpers\QualityHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TmdbTitleListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tmdb_id' => $this->tmdb_id,
            'slug' => $this->slug,
            'url' => $this->detail_url,
            'title' => $this->title_tr ?: ($this->title ?: $this->original_title),
            'media_type' => $this->media_type,
            'rating' => number_format($this->vote_average ?: 0, 1),
            'year' => $this->release_year ?: ($this->release_date ? $this->release_date->format('Y') : '2023'),
            'genres' => GenreHelper::toTrString($this->genres, ' · ', 2, $this->media_type === 'tv' ? 'Dizi' : 'Film'),
            'quality' => QualityHelper::getShortQuality($this->resource),
            'language' => QualityHelper::getLanguageBadge($this->resource),
            'poster' => $this->poster_url ?: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400',
            'backdrop' => $this->backdrop_url ?: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1920',
        ];
    }
}
