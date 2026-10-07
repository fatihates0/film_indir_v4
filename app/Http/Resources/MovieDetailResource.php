<?php

namespace App\Http\Resources;

use App\Helpers\CertificationHelper;
use App\Helpers\GenreHelper;
use App\Helpers\QualityHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MovieDetailResource extends JsonResource
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
            'original_title' => $this->original_title,
            'tagline' => $this->extra_data['tagline'] ?? '',
            'rating' => number_format($this->vote_average ?: 0, 1),
            'reviewsCount' => $this->vote_count ?: 0,
            'year' => $this->release_year ?: ($this->release_date ? $this->release_date->format('Y') : '2023'),
            'duration' => isset($this->extra_data['runtime']) ? $this->extra_data['runtime'].' dk' : '120 dk',
            'quality' => QualityHelper::getMovieQuality($this->resource),
            'certification' => CertificationHelper::toTr($this->extra_data['certification'] ?? null, 'movie'),
            'raw_certification' => $this->extra_data['certification'] ?? null,
            'genres' => GenreHelper::toTrList($this->genres),
            'raw_genres' => $this->genres,
            'storyline' => $this->overview_tr ?: ($this->overview ?: 'Sistemde kayıtlı film detayları.'),
            'overview' => $this->overview_tr ?: ($this->overview ?: 'Sistemde kayıtlı film detayları.'),
            'backdrop' => $this->backdrop_url ?: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1920',
            'poster' => $this->poster_url ?: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600',
            'cast' => $this->relationLoaded('castMembers')
                ? TmdbCastResource::collection(
                    $this->castMembers
                        ->filter(fn ($item) => $item->role_type === 'cast' || (empty($item->role_type) && ($item->job === 'Actor' || empty($item->job))))
                        ->sortBy('order')
                        ->values()
                )->resolve()
                : [],
            'media_files' => $this->relationLoaded('mediaFiles')
                ? MediaFileResource::collection($this->mediaFiles)->resolve()
                : [],
            'trailer' => $this->trailer ? [
                'id' => $this->trailer->id,
                'key' => $this->trailer->key,
                'name' => $this->trailer->name,
                'label' => $this->trailer->label,
                'site' => $this->trailer->site,
                'type' => $this->trailer->type,
                'is_dubbed' => (bool) $this->trailer->is_dubbed,
                'is_subtitled' => (bool) $this->trailer->is_subtitled,
                'embed_url' => $this->trailer->embed_url,
                'video_url' => $this->trailer->video_url,
            ] : null,
            'trailers' => ($this->relationLoaded('trailers')
                ? $this->trailers
                : ($this->relationLoaded('videos')
                    ? $this->videos->where('type', 'Trailer')->sortBy('sort_order')->values()
                    : $this->trailers()->get())
            )->map(fn ($t) => [
                'id' => $t->id,
                'key' => $t->key,
                'name' => $t->name,
                'label' => $t->label,
                'site' => $t->site,
                'type' => $t->type,
                'is_dubbed' => (bool) $t->is_dubbed,
                'is_subtitled' => (bool) $t->is_subtitled,
                'embed_url' => $t->embed_url,
                'video_url' => $t->video_url,
            ])->values(),
        ];
    }
}
