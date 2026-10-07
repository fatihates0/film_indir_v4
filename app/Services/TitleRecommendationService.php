<?php

namespace App\Services;

use App\Models\TmdbTitle;
use Illuminate\Support\Collection;

class TitleRecommendationService
{
    /**
     * Get dynamic, content-aware similar titles.
     *
     * @param  TmdbTitle  $title  Current movie or series
     * @param  int  $limit  Number of similar titles to return (default: 6)
     * @return Collection<int, TmdbTitle>
     */
    public static function getSimilar(TmdbTitle $title, int $limit = 6): Collection
    {
        $genres = is_array($title->genres) ? array_values(array_filter($title->genres)) : [];
        $mediaType = $title->media_type ?: 'movie';

        // Base query: same media type, has downloadable files, exclude current title
        $baseQuery = TmdbTitle::query()
            ->where('media_type', $mediaType)
            ->hasMatchedMedia()
            ->where('id', '!=', $title->id);

        if (! empty($genres)) {
            // Find titles matching at least one genre
            $matchedQuery = (clone $baseQuery)->where(function ($sub) use ($genres) {
                foreach ($genres as $genre) {
                    $sub->orWhereJsonContains('genres', $genre);
                }
            });

            // Fetch a pool of candidate titles (up to 40)
            $candidates = $matchedQuery
                ->orderByDesc('popularity')
                ->take(40)
                ->get();

            if ($candidates->isNotEmpty()) {
                $targetYear = $title->release_year ?: ($title->release_date ? (int) substr((string) $title->release_date, 0, 4) : null);

                $scored = $candidates->map(function ($candidate) use ($genres, $targetYear) {
                    $candGenres = is_array($candidate->genres) ? $candidate->genres : [];
                    $commonCount = count(array_intersect($genres, $candGenres));

                    // 1. Genre similarity (primary weight)
                    $genreScore = $commonCount * 40;

                    // 2. Year proximity (bonus for same era)
                    $yearScore = 0;
                    if ($targetYear) {
                        $candYear = $candidate->release_year ?: ($candidate->release_date ? (int) substr((string) $candidate->release_date, 0, 4) : null);
                        if ($candYear) {
                            $diff = abs($targetYear - $candYear);
                            if ($diff <= 3) {
                                $yearScore = 15;
                            } elseif ($diff <= 8) {
                                $yearScore = 8;
                            }
                        }
                    }

                    // 3. Quality & popularity weighting
                    $voteScore = min(($candidate->vote_average ?: 0) * 3, 30);
                    $popScore = min(($candidate->popularity ?: 0) * 0.05, 20);

                    // 4. Subtle dynamic variation (jitter) so refresh doesn't feel completely frozen
                    $jitter = mt_rand(0, 12);

                    $totalScore = $genreScore + $yearScore + $voteScore + $popScore + $jitter;

                    return [
                        'model' => $candidate,
                        'score' => $totalScore,
                    ];
                });

                // Sort by total recommendation score
                $topModels = $scored->sortByDesc('score')->pluck('model')->take($limit)->values();

                if ($topModels->count() >= $limit) {
                    return $topModels;
                }

                // If fewer than limit, fill up with general popular titles
                $existingIds = $topModels->pluck('id')->push($title->id)->all();
                $additional = (clone $baseQuery)
                    ->whereNotIn('id', $existingIds)
                    ->orderByDesc('popularity')
                    ->take($limit - $topModels->count())
                    ->get();

                return $topModels->merge($additional);
            }
        }

        // Fallback: take popular titles with slight randomized pool
        return $baseQuery
            ->orderByDesc('popularity')
            ->take(20)
            ->get()
            ->shuffle()
            ->take($limit)
            ->values();
    }
}
