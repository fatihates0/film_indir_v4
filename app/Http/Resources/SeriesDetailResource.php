<?php

namespace App\Http\Resources;

use App\Helpers\CertificationHelper;
use App\Helpers\GenreHelper;
use App\Helpers\QualityHelper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SeriesDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $mediaFilesMap = [];
        if ($this->relationLoaded('mediaFiles') && $this->mediaFiles->isNotEmpty()) {
            foreach ($this->mediaFiles as $mf) {
                $seasonNum = null;
                $epNum = null;
                if (preg_match('/[Ss](\d+)[Ee](\d+)/i', $mf->name.' '.$mf->path, $m)) {
                    $seasonNum = (int) $m[1];
                    $epNum = (int) $m[2];
                } elseif (preg_match('/(\d+)[xX](\d+)/', $mf->name, $m)) {
                    $seasonNum = (int) $m[1];
                    $epNum = (int) $m[2];
                }

                if ($seasonNum !== null && $epNum !== null) {
                    $mediaFilesMap[$seasonNum][$epNum][] = [
                        'id' => $mf->id,
                        'name' => $mf->name,
                        'clean_title' => $mf->clean_title ?: $mf->name,
                        'quality' => $mf->quality ?: '1080p',
                        'formatted_size' => $mf->formatted_size,
                        'download_url' => route('downloads.prepare', ['mediaFile' => $mf->id]),
                    ];
                }
            }
        }

        $formatFullDate = function ($date) {
            if (! $date) {
                return null;
            }
            try {
                if ($date instanceof \DateTimeInterface) {
                    return $date->format('d.m.Y');
                }

                return Carbon::parse($date)->format('d.m.Y');
            } catch (\Throwable) {
                return (string) $date;
            }
        };

        $seriesFormattedDate = $formatFullDate($this->release_date) ?: ($this->release_year ?: null);

        $episodes = $this->episodes ? $this->episodes->map(function ($e, $idx) use ($mediaFilesMap, $seriesFormattedDate, $formatFullDate) {
            $seasonNum = $e->season_number ?: 1;
            $epNum = $e->episode_number ?: ($idx + 1);
            $matched = $mediaFilesMap[$seasonNum][$epNum] ?? [];
            $isAvailable = ! empty($matched);
            $mainFile = $isAvailable ? $matched[0] : null;

            $epName = $e->name_tr ?: ($e->name ?: ($e->name_en ?: ($idx + 1).'. Bölüm'));
            $epDesc = $e->overview_tr ?: ($e->overview_en ?: ($e->overview ?: 'Bölüm açıklaması bulunmuyor.'));
            $epFormattedDate = $formatFullDate($e->air_date) ?: $seriesFormattedDate;

            return [
                'id' => $e->id,
                'chapter' => $epNum,
                'episode_number' => $epNum,
                'season_number' => $seasonNum,
                'title' => $epName ? ($epNum.'. Bölüm - '.$epName) : ($idx + 1).'. Bölüm',
                'clean_name' => $epName,
                'name_tr' => $e->name_tr,
                'name_en' => $e->name_en,
                'desc' => $epDesc,
                'overview_tr' => $e->overview_tr,
                'overview_en' => $e->overview_en,
                'date' => $epFormattedDate,
                'air_date' => $formatFullDate($e->air_date),
                'duration' => $e->runtime ? $e->runtime.' dk' : '45:00',
                'poster' => $e->still_url ?: $this->poster_url,
                'is_available' => $isAvailable,
                'formatted_size' => $mainFile['formatted_size'] ?? null,
                'download_url' => $mainFile['download_url'] ?? null,
                'files' => $matched,
            ];
        })->toArray() : [];

        if (empty($episodes) && $this->relationLoaded('mediaFiles')) {
            $episodes = $this->mediaFiles->map(fn ($f, $idx) => [
                'id' => $f->id,
                'chapter' => $idx + 1,
                'episode_number' => $idx + 1,
                'season_number' => 1,
                'title' => ($idx + 1).'. Bölüm - '.($f->clean_title ?: $f->name),
                'clean_name' => $f->clean_title ?: $f->name,
                'desc' => 'Kalite: '.($f->quality ?: 'HD').' | Boyut: '.$f->formatted_size,
                'duration' => $f->formatted_size,
                'date' => $seriesFormattedDate,
                'poster' => $this->poster_url ?: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400',
                'is_available' => true,
                'formatted_size' => $f->formatted_size,
                'download_url' => route('downloads.prepare', ['mediaFile' => $f->id]),
                'files' => [[
                    'id' => $f->id,
                    'name' => $f->name,
                    'clean_title' => $f->clean_title ?: $f->name,
                    'quality' => $f->quality ?: '1080p',
                    'formatted_size' => $f->formatted_size,
                    'download_url' => route('downloads.prepare', ['mediaFile' => $f->id]),
                ]],
            ])->toArray();
        }

        $seriesQuality = QualityHelper::getSeriesQuality($this->resource);

        $seasons = [];
        if ($this->relationLoaded('seasons') && $this->seasons->isNotEmpty()) {
            $seasons = $this->seasons
                ->filter(fn ($s) => $s->season_number > 0 || ($s->episodes && $s->episodes->isNotEmpty()))
                ->sortBy('season_number')
                ->map(function ($s) use ($mediaFilesMap, $seriesFormattedDate, $formatFullDate) {
                    $seasonFormattedDate = $formatFullDate($s->air_date) ?: $seriesFormattedDate;

                    $episodesList = $s->relationLoaded('episodes') ? $s->episodes->sortBy('episode_number')->values()->map(function ($e, $idx) use ($s, $mediaFilesMap, $seasonFormattedDate, $formatFullDate) {
                        $epNum = $e->episode_number ?: ($idx + 1);
                        $matched = $mediaFilesMap[$s->season_number][$epNum] ?? [];
                        $isAvailable = ! empty($matched);
                        $mainFile = $isAvailable ? $matched[0] : null;

                        $epName = $e->name_tr ?: ($e->name ?: ($e->name_en ?: ($idx + 1).'. Bölüm'));
                        $epDesc = $e->overview_tr ?: ($e->overview_en ?: ($e->overview ?: 'Bölüm açıklaması bulunmuyor.'));
                        $epFormattedDate = $formatFullDate($e->air_date) ?: $seasonFormattedDate;

                        return [
                            'id' => $e->id,
                            'chapter' => $epNum,
                            'episode_number' => $epNum,
                            'season_number' => $s->season_number,
                            'title' => $epName ? ($epNum.'. Bölüm - '.$epName) : ($idx + 1).'. Bölüm',
                            'clean_name' => $epName,
                            'name_tr' => $e->name_tr,
                            'name_en' => $e->name_en,
                            'desc' => $epDesc,
                            'overview_tr' => $e->overview_tr,
                            'overview_en' => $e->overview_en,
                            'date' => $epFormattedDate,
                            'air_date' => $formatFullDate($e->air_date),
                            'duration' => $e->runtime ? $e->runtime.' dk' : '45:00',
                            'poster' => $e->still_url ?: $this->poster_url,
                            'is_available' => $isAvailable,
                            'formatted_size' => $mainFile['formatted_size'] ?? null,
                            'download_url' => $mainFile['download_url'] ?? null,
                            'files' => $matched,
                        ];
                    })->values()->toArray() : [];

                    $availCount = count(array_filter($episodesList, fn ($ep) => $ep['is_available']));

                    return [
                        'id' => $s->id,
                        'season_number' => $s->season_number,
                        'name' => $s->name ?: ($s->name_tr ?: ($s->season_number === 0 ? 'Özel Bölümler' : "Sezon {$s->season_number}")),
                        'name_tr' => $s->name_tr ?: $s->name,
                        'name_en' => $s->name_en,
                        'overview' => $s->overview_tr ?: ($s->overview ?: $s->overview_en),
                        'episodes_count' => $s->episode_count ?: count($episodesList),
                        'available_count' => $availCount,
                        'episodes' => $episodesList,
                    ];
                })->values()->toArray();
        }

        return [
            'id' => $this->id,
            'tmdb_id' => $this->tmdb_id,
            'slug' => $this->slug,
            'url' => $this->detail_url,
            'title' => $this->title_tr ?: ($this->title ?: $this->original_title),
            'quality' => $seriesQuality,
            'seasonNotice' => $seriesQuality,
            'rating' => number_format($this->vote_average ?: 0, 1),
            'year' => $this->release_year ?: ($this->release_date ? $this->release_date->format('Y') : null),
            'certification' => CertificationHelper::toTr($this->extra_data['certification'] ?? null, 'tv'),
            'raw_certification' => $this->extra_data['certification'] ?? null,
            'genres' => GenreHelper::toTrList($this->genres),
            'raw_genres' => $this->genres,
            'storyline' => $this->overview_tr ?: ($this->overview ?: 'Sistemde kayıtlı dizi serisi.'),
            'backdrop' => $this->backdrop_url ?: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1920',
            'poster' => $this->poster_url ?: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600',
            'cast' => $this->relationLoaded('castMembers')
                ? TmdbCastResource::collection(
                    $this->castMembers
                        ->filter(fn ($item) => $item->role_type === 'cast' || (empty($item->role_type) && ($item->job === 'Actor' || empty($item->job))))
                        ->sortBy('order')
                        ->values()
                )->resolve()
                : [],
            'episodes' => $episodes,
            'seasons' => $seasons,
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
