<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SeriesDetailResource;
use App\Http\Resources\TmdbTitleListResource;
use App\Models\TmdbTitle;
use App\Services\TitleRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeriesApiController extends Controller
{
    /**
     * Get list of series.
     */
    public function index(Request $request): JsonResponse
    {
        $query = TmdbTitle::where('media_type', 'tv')->hasMatchedMedia();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('title_tr', 'like', "%{$search}%")
                    ->orWhere('original_title', 'like', "%{$search}%");
            });
        }

        $series = $query->orderByDesc('popularity')->paginate($request->input('per_page', 18));

        return response()->json([
            'success' => true,
            'data' => TmdbTitleListResource::collection($series),
            'meta' => [
                'current_page' => $series->currentPage(),
                'last_page' => $series->lastPage(),
                'per_page' => $series->perPage(),
                'total' => $series->total(),
            ],
        ]);
    }

    /**
     * Get details of a single series by ID or TMDB ID.
     */
    public function show(string|int $id): JsonResponse
    {
        $seriesItem = TmdbTitle::findBySlugOrId($id, 'tv');

        if (! $seriesItem) {
            $seriesItem = TmdbTitle::with(['castMembers', 'seasons.episodes', 'episodes', 'mediaFiles'])
                ->where('media_type', 'tv')
                ->hasMatchedMedia()
                ->orderByDesc('popularity')
                ->first();
        } else {
            $seriesItem->load(['castMembers', 'seasons.episodes', 'episodes', 'mediaFiles']);
        }

        if (! $seriesItem) {
            return response()->json([
                'success' => false,
                'message' => 'Dizi bulunamadı.',
            ], 404);
        }

        $similarSeries = TitleRecommendationService::getSimilar($seriesItem, 6);

        return response()->json([
            'success' => true,
            'data' => new SeriesDetailResource($seriesItem),
            'similar' => TmdbTitleListResource::collection($similarSeries),
        ]);
    }
}
