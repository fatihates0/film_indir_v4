<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MovieDetailResource;
use App\Http\Resources\TmdbTitleListResource;
use App\Models\TmdbTitle;
use App\Services\TitleRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MovieApiController extends Controller
{
    /**
     * Get list of movies.
     */
    public function index(Request $request): JsonResponse
    {
        $query = TmdbTitle::where('media_type', 'movie')->hasMatchedMedia();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('title_tr', 'like', "%{$search}%")
                    ->orWhere('original_title', 'like', "%{$search}%");
            });
        }

        if ($request->filled('sort')) {
            switch ($request->input('sort')) {
                case 'popular':
                    $query->orderByDesc('popularity');
                    break;
                case 'newest':
                    $query->orderByDesc('release_date');
                    break;
                case 'rating':
                    $query->orderByDesc('vote_average');
                    break;
                default:
                    $query->orderByDesc('id');
            }
        } else {
            $query->orderByDesc('popularity');
        }

        $movies = $query->paginate($request->input('per_page', 18));

        return response()->json([
            'success' => true,
            'data' => TmdbTitleListResource::collection($movies),
            'meta' => [
                'current_page' => $movies->currentPage(),
                'last_page' => $movies->lastPage(),
                'per_page' => $movies->perPage(),
                'total' => $movies->total(),
            ],
        ]);
    }

    /**
     * Get details of a single movie by ID or TMDB ID.
     */
    public function show(string|int $id): JsonResponse
    {
        $movieItem = TmdbTitle::findBySlugOrId($id, 'movie');

        if (! $movieItem) {
            $movieItem = TmdbTitle::with(['castMembers', 'videos', 'mediaFiles'])
                ->where('media_type', 'movie')
                ->hasMatchedMedia()
                ->orderByDesc('popularity')
                ->first();
        } else {
            $movieItem->load(['castMembers', 'videos', 'mediaFiles']);
        }

        if (! $movieItem) {
            return response()->json([
                'success' => false,
                'message' => 'Film bulunamadı.',
            ], 404);
        }

        $similarMovies = TitleRecommendationService::getSimilar($movieItem, 6);

        return response()->json([
            'success' => true,
            'data' => new MovieDetailResource($movieItem),
            'similar' => TmdbTitleListResource::collection($similarMovies),
        ]);
    }
}
