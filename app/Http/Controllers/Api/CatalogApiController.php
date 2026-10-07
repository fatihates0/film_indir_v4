<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TmdbTitleListResource;
use App\Models\TmdbTitle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogApiController extends Controller
{
    /**
     * Get home screen catalog data (trending, popular, recent releases).
     */
    public function home(): JsonResponse
    {
        $trendingMovies = TmdbTitle::where('media_type', 'movie')
            ->hasMatchedMedia()
            ->orderByDesc('popularity')
            ->take(10)
            ->get();

        $trendingSeries = TmdbTitle::where('media_type', 'tv')
            ->hasMatchedMedia()
            ->orderByDesc('popularity')
            ->take(10)
            ->get();

        $recentReleases = TmdbTitle::hasMatchedMedia()
            ->orderByDesc('created_at')
            ->take(10)
            ->get();

        return response()->json([
            'success' => true,
            'trending_movies' => TmdbTitleListResource::collection($trendingMovies),
            'trending_series' => TmdbTitleListResource::collection($trendingSeries),
            'recent_releases' => TmdbTitleListResource::collection($recentReleases),
        ]);
    }

    /**
     * Search movies, series, and media files.
     */
    public function search(Request $request): JsonResponse
    {
        $queryStr = $request->input('q') ?: $request->input('search');

        if (empty($queryStr)) {
            return response()->json([
                'success' => true,
                'query' => '',
                'results' => [],
            ]);
        }

        $titles = TmdbTitle::hasMatchedMedia()->where(function ($q) use ($queryStr) {
            $q->where('title', 'like', "%{$queryStr}%")
                ->orWhere('title_tr', 'like', "%{$queryStr}%")
                ->orWhere('original_title', 'like', "%{$queryStr}%");
        })->take(20)->get();

        return response()->json([
            'success' => true,
            'query' => $queryStr,
            'results' => TmdbTitleListResource::collection($titles),
        ]);
    }
}
