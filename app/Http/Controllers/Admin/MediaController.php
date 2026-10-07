<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessMediaTmdbJob;
use App\Jobs\ScanStorageBoxJob;
use App\Models\MediaFile;
use App\Models\StorageBox;
use App\Models\TmdbTitle;
use App\Services\MediaScannerService;
use App\Services\TmdbService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class MediaController extends Controller
{
    public function __construct(
        protected MediaScannerService $scannerService,
        protected TmdbService $tmdbService,
    ) {}

    /**
     * Display a listing of indexed media and video files.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $boxId = $request->input('storage_box_id');
        $category = $request->string('category')->value();
        $quality = $request->string('quality')->value();
        $extension = $request->string('extension')->value();
        $tmdbStatus = $request->string('tmdb_status')->value();
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $perPage = min(100, max(10, (int) $request->input('per_page', 25)));
        $isGrouped = $request->input('grouped', '1') !== '0';

        $allowedSorts = ['created_at', 'size_bytes', 'clean_title', 'last_modified_at', 'year', 'tmdb_match_confidence'];
        if (! in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'created_at';
        }
        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';

        $baseQuery = MediaFile::query()
            ->search($search)
            ->filterByBox($boxId)
            ->filterByCategory($category)
            ->filterByQuality($quality)
            ->filterByExtension($extension)
            ->filterByTmdbStatus($tmdbStatus);

        if (! $isGrouped) {
            $medias = (clone $baseQuery)
                ->with(['storageBox:id,name,host,protocol,status', 'tmdbTitle'])
                ->orderBy($sortBy, $sortOrder)
                ->paginate($perPage)
                ->withQueryString()
                ->through(function (MediaFile $media) {
                    $formatted = $this->formatMediaItem($media);

                    return array_merge($formatted, [
                        'type' => 'single',
                        'item' => $formatted,
                    ]);
                });
        } else {
            $isSqlite = DB::connection()->getDriverName() === 'sqlite';
            $groupKeySql = $isSqlite
                ? "CASE 
                    WHEN category = 'series' AND tmdb_title_id IS NOT NULL THEN ('s_tmdb_' || tmdb_title_id)
                    WHEN category = 'series' THEN ('s_title_' || LOWER(TRIM(clean_title)))
                    WHEN tmdb_title_id IS NOT NULL THEN ('m_tmdb_' || tmdb_title_id)
                    WHEN clean_title IS NOT NULL AND clean_title != '' THEN ('m_title_' || LOWER(TRIM(clean_title)) || '_' || COALESCE(year, '0'))
                    ELSE ('m_file_' || id)
                END"
                : "CASE 
                    WHEN category = 'series' AND tmdb_title_id IS NOT NULL THEN CONCAT('s_tmdb_', tmdb_title_id)
                    WHEN category = 'series' THEN CONCAT('s_title_', LOWER(TRIM(clean_title)))
                    WHEN tmdb_title_id IS NOT NULL THEN CONCAT('m_tmdb_', tmdb_title_id)
                    WHEN clean_title IS NOT NULL AND clean_title != '' THEN CONCAT('m_title_', LOWER(TRIM(clean_title)), '_', COALESCE(year, '0'))
                    ELSE CONCAT('m_file_', id)
                END";

            $orderExpr = match ($sortBy) {
                'size_bytes' => 'SUM(size_bytes)',
                'clean_title' => 'MAX(clean_title)',
                'year' => 'MAX(year)',
                'last_modified_at' => 'MAX(last_modified_at)',
                'tmdb_match_confidence' => 'MAX(tmdb_match_confidence)',
                default => 'MAX(created_at)',
            };

            $groupSummary = (clone $baseQuery)
                ->selectRaw("
                    {$groupKeySql} AS group_key,
                    COUNT(*) AS total_files,
                    SUM(size_bytes) AS group_size_bytes,
                    MAX(created_at) AS max_created_at,
                    {$orderExpr} AS sort_value
                ")
                ->groupBy('group_key')
                ->orderBy('sort_value', $sortOrder);

            $paginatedGroups = $groupSummary->paginate($perPage)->withQueryString();
            $pageGroupKeys = $paginatedGroups->pluck('group_key')->all();

            if (empty($pageGroupKeys)) {
                $paginatedGroups->setCollection(collect());
            } else {
                $filesOnPage = (clone $baseQuery)
                    ->with(['storageBox:id,name,host,protocol,status', 'tmdbTitle'])
                    ->selectRaw("media_files.*, ({$groupKeySql}) AS g_key")
                    ->whereIn(DB::raw("({$groupKeySql})"), $pageGroupKeys)
                    ->get();

                $groupedFiles = $filesOnPage->groupBy('g_key');

                $transformed = $paginatedGroups->getCollection()->map(function ($g) use ($groupedFiles) {
                    $files = $groupedFiles->get($g->group_key, collect());
                    if ($files->isEmpty()) {
                        return null;
                    }

                    $first = $files->first();
                    $isSeries = $first->category === 'series' || $first->tmdbTitle?->media_type === 'tv';

                    if ($isSeries) {
                        // Sort episodes by season and episode number
                        $sortedFiles = $files->sort(function ($a, $b) {
                            preg_match('/[._\s-]s(\d{1,2})e(\d{1,2})[._\s-]/i', $a->name, $mA);
                            preg_match('/[._\s-]s(\d{1,2})e(\d{1,2})[._\s-]/i', $b->name, $mB);
                            if (empty($mA)) {
                                preg_match('/[._\s-](\d{1,2})x(\d{1,2})[._\s-]/i', $a->name, $mA);
                            }
                            if (empty($mB)) {
                                preg_match('/[._\s-](\d{1,2})x(\d{1,2})[._\s-]/i', $b->name, $mB);
                            }
                            $sA = isset($mA[1]) ? (int) $mA[1] : 999;
                            $eA = isset($mA[2]) ? (int) $mA[2] : 999;
                            $sB = isset($mB[1]) ? (int) $mB[1] : 999;
                            $eB = isset($mB[2]) ? (int) $mB[2] : 999;
                            if ($sA !== $sB) {
                                return $sA <=> $sB;
                            }

                            return $eA <=> $eB;
                        })->values();

                        $allProperties = [];
                        foreach ($sortedFiles as $file) {
                            if (is_array($file->properties)) {
                                foreach ($file->properties as $p) {
                                    if (! in_array($p, $allProperties, true)) {
                                        $allProperties[] = $p;
                                    }
                                }
                            }
                        }

                        $baseTitle = preg_replace('/[._\s-]s\d{1,2}e\d{1,2}.*/i', '', $first->clean_title ?: $first->name);
                        $baseTitle = preg_replace('/[._\s-]\d{1,2}x\d{1,2}.*/i', '', $baseTitle);
                        $baseTitle = preg_replace('/[._\s-](season|sezon)[._\s-]?\d{1,2}.*/i', '', $baseTitle);
                        $baseTitle = preg_replace('/[._\s-]s\d{1,2}(?![0-9a-z]).*/i', '', $baseTitle);
                        $baseTitle = trim(str_replace(['.', '_', '-'], ' ', $baseTitle)) ?: ($first->clean_title ?: $first->name);

                        return [
                            'type' => 'series_group',
                            'mediaType' => 'series',
                            'key' => $g->group_key,
                            'tmdb_title' => $this->formatTmdbTitle($first->tmdbTitle),
                            'clean_title' => $baseTitle,
                            'year' => $first->tmdbTitle?->release_year ?: $first->year,
                            'tmdb_match_status' => $first->tmdb_match_status,
                            'tmdb_match_notes' => $first->tmdb_match_notes,
                            'totalSizeBytes' => (int) $sortedFiles->sum('size_bytes'),
                            'allProperties' => $allProperties,
                            'items' => $sortedFiles->map(fn ($f) => $this->formatMediaItem($f))->all(),
                            'allIds' => $sortedFiles->pluck('id')->all(),
                            'representativeItem' => $this->formatMediaItem($first),
                        ];
                    }

                    if ($files->count() > 1) {
                        $sortedFiles = $files->sortByDesc('size_bytes')->values();

                        $allProperties = [];
                        foreach ($sortedFiles as $file) {
                            if (is_array($file->properties)) {
                                foreach ($file->properties as $p) {
                                    if (! in_array($p, $allProperties, true)) {
                                        $allProperties[] = $p;
                                    }
                                }
                            }
                        }

                        return [
                            'type' => 'movie_group',
                            'mediaType' => 'movie',
                            'key' => $g->group_key,
                            'tmdb_title' => $this->formatTmdbTitle($first->tmdbTitle),
                            'clean_title' => $first->clean_title ?: $first->name,
                            'year' => $first->tmdbTitle?->release_year ?: $first->year,
                            'tmdb_match_status' => $first->tmdb_match_status,
                            'tmdb_match_notes' => $first->tmdb_match_notes,
                            'totalSizeBytes' => (int) $sortedFiles->sum('size_bytes'),
                            'allProperties' => $allProperties,
                            'items' => $sortedFiles->map(fn ($f) => $this->formatMediaItem($f))->all(),
                            'allIds' => $sortedFiles->pluck('id')->all(),
                            'representativeItem' => $this->formatMediaItem($first),
                        ];
                    }

                    $singleFormatted = $this->formatMediaItem($first);

                    return array_merge($singleFormatted, [
                        'type' => 'single',
                        'item' => $singleFormatted,
                    ]);
                })->filter()->values();

                $paginatedGroups->setCollection($transformed);
            }

            $medias = $paginatedGroups;
        }

        // Aggregate statistics
        $totalBytes = (int) MediaFile::sum('size_bytes');
        $totalCount = MediaFile::count();
        $movieCount = MediaFile::where('category', 'movie')->count();
        $seriesCount = MediaFile::where('category', 'series')->count();
        $uhdCount = MediaFile::where('quality', '2160p')->count();
        $fhdCount = MediaFile::where('quality', '1080p')->count();
        $hdCount = MediaFile::where('quality', '720p')->count();

        // TMDB statistics
        $tmdbMatchedCount = MediaFile::where('tmdb_match_status', 'matched')->count();
        $tmdbReviewCount = MediaFile::where('tmdb_match_status', 'review')->count();
        $tmdbUnmatchedCount = MediaFile::where('tmdb_match_status', 'unmatched')->count();
        $tmdbPendingCount = MediaFile::where('tmdb_match_status', 'pending')->count();

        $stats = [
            'total_count' => $totalCount,
            'total_size_bytes' => $totalBytes,
            'total_size_formatted' => $this->formatBytes($totalBytes),
            'movie_count' => $movieCount,
            'series_count' => $seriesCount,
            'uhd_count' => $uhdCount,
            'fhd_count' => $fhdCount,
            'hd_count' => $hdCount,
            'tmdb_matched_count' => $tmdbMatchedCount,
            'tmdb_review_count' => $tmdbReviewCount,
            'tmdb_unmatched_count' => $tmdbUnmatchedCount,
            'tmdb_pending_count' => $tmdbPendingCount,
            'tmdb_is_configured' => $this->tmdbService->isConfigured(),
        ];

        $storageBoxes = StorageBox::orderBy('name')
            ->get(['id', 'name', 'host', 'protocol'])
            ->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'host' => $b->host,
                'protocol' => $b->protocol->value,
            ]);

        $availableExtensions = MediaFile::select('extension')
            ->distinct()
            ->orderBy('extension')
            ->pluck('extension')
            ->map(fn ($ext) => strtoupper($ext));

        return Inertia::render('Admin/Medias/Index', [
            'medias' => $medias,
            'stats' => $stats,
            'storageBoxes' => $storageBoxes,
            'availableExtensions' => $availableExtensions,
            'filters' => [
                'search' => $search,
                'storage_box_id' => $boxId ?: 'all',
                'category' => $category ?: 'all',
                'quality' => $quality ?: 'all',
                'extension' => $extension ?: 'all',
                'tmdb_status' => $tmdbStatus ?: 'all',
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'per_page' => $perPage,
                'grouped' => $isGrouped ? '1' : '0',
            ],
        ]);
    }

    /**
     * Trigger scanning of storage boxes for video files via the disk_scan queue.
     */
    public function scan(Request $request): JsonResponse|RedirectResponse
    {
        $boxId = $request->input('storage_box_id');
        $targetId = (! empty($boxId) && $boxId !== 'all') ? (int) $boxId : null;

        if ($targetId !== null) {
            $box = StorageBox::findOrFail($targetId);
            ScanStorageBoxJob::dispatch($targetId)->onQueue('disk_scan');
            $message = "\"{$box->name}\" ünitesi için video tarama görevi \"disk_scan\" kuyruğuna eklendi ve arka planda başlatıldı.";
        } else {
            ScanStorageBoxJob::dispatch(null)->onQueue('disk_scan');
            $message = 'Tüm aktif depolama üniteleri için video tarama görevi "disk_scan" kuyruğuna eklendi ve arka planda başlatıldı.';
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'queue' => 'disk_scan',
            ]);
        }

        return back()->with('success', $message);
    }

    /**
     * Search TMDB for a specific media file (for manual matching modal).
     */
    public function tmdbSearch(Request $request, MediaFile $mediaFile): JsonResponse
    {
        if (! $this->tmdbService->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'TMDB API anahtarı yapılandırılmamış (.env TMDB_API_KEY).',
                'results' => [],
            ], 422);
        }

        $query = $request->input('query', $mediaFile->clean_title ?: $mediaFile->name);
        $year = $request->input('year') ? (int) $request->input('year') : $mediaFile->year;
        $type = $request->input('type'); // 'movie', 'tv' or null for all

        $results = $this->tmdbService->search($query, $year, $type);

        return response()->json([
            'success' => true,
            'query' => $query,
            'year' => $year,
            'results' => $results,
        ]);
    }

    /**
     * Manually match a media file with a TMDB item.
     */
    public function tmdbMatch(Request $request, MediaFile $mediaFile): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'tmdb_id' => ['required', 'integer'],
            'media_type' => ['nullable', 'string', 'in:movie,tv'],
            'match_all_series' => ['nullable', 'boolean'],
            'media_ids' => ['nullable', 'array'],
            'media_ids.*' => ['integer', 'exists:media_files,id'],
        ]);

        $mediaType = $validated['media_type'] ?? ($mediaFile->category === 'series' ? 'tv' : 'movie');

        try {
            $tmdbTitle = $this->tmdbService->manualMatch($mediaFile, (int) $validated['tmdb_id'], $mediaType);

            $matchedCount = 1;

            if (! empty($validated['media_ids'])) {
                $siblings = MediaFile::whereIn('id', $validated['media_ids'])
                    ->where('id', '!=', $mediaFile->id)
                    ->get();

                foreach ($siblings as $sibling) {
                    $this->tmdbService->manualMatch($sibling, (int) $validated['tmdb_id'], $mediaType);
                    $matchedCount++;
                }
            } else {
                $shouldMatchAll = $request->boolean('match_all_series', true);
                if ($shouldMatchAll) {
                    if ($mediaFile->category === 'series' || $mediaType === 'tv') {
                        $baseTitle = preg_replace('/[._\s-]s\d{1,2}e\d{1,2}.*/i', '', $mediaFile->clean_title ?: $mediaFile->name);
                        $baseTitle = trim(str_replace(['.', '_', '-'], ' ', $baseTitle));

                        if (! empty($baseTitle)) {
                            $siblings = MediaFile::where('id', '!=', $mediaFile->id)
                                ->where(function ($q) use ($baseTitle, $mediaFile) {
                                    $q->where('clean_title', 'like', $baseTitle.'%')
                                        ->orWhere('clean_title', 'like', '%'.$baseTitle.'%');
                                    if (! empty($mediaFile->directory) && $mediaFile->directory !== '/') {
                                        $q->orWhere('directory', $mediaFile->directory);
                                    }
                                })
                                ->get();

                            foreach ($siblings as $sibling) {
                                $this->tmdbService->manualMatch($sibling, (int) $validated['tmdb_id'], $mediaType);
                                $matchedCount++;
                            }
                        }
                    } elseif ($mediaFile->category === 'movie' || $mediaType === 'movie') {
                        $cleanTitle = $mediaFile->clean_title ?: $mediaFile->name;
                        if (! empty($cleanTitle)) {
                            $siblings = MediaFile::where('id', '!=', $mediaFile->id)
                                ->where('clean_title', 'like', $cleanTitle)
                                ->get();

                            foreach ($siblings as $sibling) {
                                $this->tmdbService->manualMatch($sibling, (int) $validated['tmdb_id'], $mediaType);
                                $matchedCount++;
                            }
                        }
                    }
                }
            }

            $message = $matchedCount > 1
                ? "\"{$mediaFile->clean_title}\" içeriği ve gruptaki toplam {$matchedCount} adet kayıt \"{$tmdbTitle->title}\" ({$tmdbTitle->release_year}) ile başarıyla eşleştirildi."
                : "\"{$mediaFile->clean_title}\" içeriği \"{$tmdbTitle->title}\" ({$tmdbTitle->release_year}) ile başarıyla eşleştirildi.";

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'tmdb_title' => $tmdbTitle,
                ]);
            }

            return back()->with('success', $message);
        } catch (\Throwable $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Eşleştirme sırasında hata: '.$e->getMessage(),
                ], 500);
            }

            return back()->with('error', 'Eşleştirme yapılamadı: '.$e->getMessage());
        }
    }

    /**
     * Detach TMDB match from a media file.
     */
    public function tmdbDetach(Request $request, MediaFile $mediaFile): JsonResponse|RedirectResponse
    {
        $this->tmdbService->detachMatch($mediaFile);
        $message = "\"{$mediaFile->clean_title}\" için TMDB eşleştirmesi kaldırıldı.";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
            ]);
        }

        return back()->with('success', $message);
    }

    /**
     * Dispatch background TMDB scanning jobs for all media files to the tmdb_scan queue.
     */
    public function tmdbScanAll(Request $request): JsonResponse|RedirectResponse
    {
        if (! $this->tmdbService->isConfigured()) {
            $message = 'TMDB API anahtarı yapılandırılmamış. Lütfen .env dosyanıza TMDB_API_KEY ekleyin.';
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'message' => $message], 422);
            }

            return back()->with('error', $message);
        }

        $boxId = $request->input('storage_box_id');
        $scope = $request->input('scope', 'unmatched_and_review'); // 'unmatched_and_review', 'all', 'unmatched_only'

        $query = MediaFile::query();

        if (! empty($boxId) && $boxId !== 'all') {
            $query->where('storage_box_id', $boxId);
        }

        if ($scope === 'unmatched_and_review') {
            $query->whereIn('tmdb_match_status', ['unmatched', 'review', 'pending']);
        } elseif ($scope === 'unmatched_only') {
            $query->whereIn('tmdb_match_status', ['unmatched', 'pending']);
        }

        $count = 0;
        $query->chunkById(100, function ($files) use (&$count) {
            foreach ($files as $file) {
                $file->update(['tmdb_match_status' => 'pending']);
                ProcessMediaTmdbJob::dispatch($file->id)->onQueue('tmdb_scan');
                $count++;
            }
        });

        $message = "Toplam {$count} video için TMDB eşleştirme görevi 'tmdb_scan' kuyruğuna eklendi ve arka planda işleniyor.";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'dispatched_count' => $count,
                'queue' => 'tmdb_scan',
            ]);
        }

        return back()->with('success', $message);
    }

    /**
     * Remove a media record from the index.
     */
    public function destroy(MediaFile $mediaFile): RedirectResponse
    {
        $name = $mediaFile->clean_title ?: $mediaFile->name;
        $mediaFile->delete();

        return back()->with('success', "\"{$name}\" veritabanı indeksinden kaldırıldı.");
    }

    /**
     * Bulk delete media records from index.
     */
    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:media_files,id'],
        ]);

        $count = MediaFile::whereIn('id', $validated['ids'])->delete();

        return back()->with('success', "Seçilen {$count} adet video veritabanından kaldırıldı.");
    }

    /**
     * Clear all media records from the database index.
     * Optionally clear by specific storage_box_id.
     */
    public function clearAll(Request $request): RedirectResponse
    {
        $boxId = $request->input('storage_box_id');

        if (! empty($boxId) && $boxId !== 'all') {
            $box = StorageBox::findOrFail($boxId);
            $deletedCount = MediaFile::where('storage_box_id', $box->id)->delete();
            $message = "\"{$box->name}\" ünitesine ait {$deletedCount} adet video veritabanı indeksinden başarıyla temizlendi.";
        } else {
            $deletedCount = MediaFile::query()->delete();
            $message = "Tüm medya arşivi veritabanı indeksinden başarıyla temizlendi (Toplam {$deletedCount} kayıt silindi).";
        }

        return redirect()->route('admin.medias.index')
            ->with('success', $message);
    }

    /**
     * Format bytes into readable GB or TB string.
     */
    protected function formatBytes(int $bytes): string
    {
        if ($bytes >= 1099511627776) {
            return round($bytes / 1099511627776, 2).' TB';
        }
        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 2).' GB';
        }
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1).' MB';
        }

        return $bytes.' B';
    }

    /**
     * Format a TMDB title model into array shape for Inertia responses.
     */
    protected function formatTmdbTitle(?TmdbTitle $tmdbTitle): ?array
    {
        if (! $tmdbTitle) {
            return null;
        }

        return [
            'id' => $tmdbTitle->id,
            'tmdb_id' => $tmdbTitle->tmdb_id,
            'imdb_id' => $tmdbTitle->imdb_id,
            'title' => $tmdbTitle->title,
            'title_tr' => $tmdbTitle->title_tr ?: $tmdbTitle->title,
            'title_en' => $tmdbTitle->title_en ?: ($tmdbTitle->original_title ?: $tmdbTitle->title),
            'title_original' => $tmdbTitle->title_original ?: $tmdbTitle->original_title,
            'original_title' => $tmdbTitle->original_title,
            'media_type' => $tmdbTitle->media_type,
            'release_year' => $tmdbTitle->release_year,
            'release_date' => $tmdbTitle->release_date?->format('Y-m-d'),
            'vote_average' => $tmdbTitle->vote_average,
            'poster_url' => $tmdbTitle->poster_url,
            'backdrop_url' => $tmdbTitle->backdrop_url,
            'overview' => $tmdbTitle->overview,
            'overview_tr' => $tmdbTitle->overview_tr,
            'overview_en' => $tmdbTitle->overview_en,
            'genres' => $tmdbTitle->genres,
        ];
    }

    /**
     * Format a single MediaFile model into array shape for Inertia responses.
     */
    protected function formatMediaItem(MediaFile $media): array
    {
        return [
            'id' => $media->id,
            'name' => $media->name,
            'clean_title' => $media->clean_title ?: $media->name,
            'path' => $media->path,
            'directory' => $media->directory,
            'extension' => strtoupper($media->extension),
            'size_bytes' => $media->size_bytes,
            'formatted_size' => $media->formatted_size,
            'year' => $media->year,
            'quality' => $media->quality,
            'properties' => $media->properties ?: [],
            'category' => $media->category,
            'category_label' => $media->category === 'series' ? 'Dizi' : 'Film',
            'mime_type' => $media->mime_type,
            'tmdb_title_id' => $media->tmdb_title_id,
            'tmdb_match_status' => $media->tmdb_match_status,
            'tmdb_match_confidence' => $media->tmdb_match_confidence,
            'tmdb_match_notes' => $media->tmdb_match_notes,
            'tmdb_matched_at' => $media->tmdb_matched_at?->format('d.m.Y H:i'),
            'tmdb_title' => $this->formatTmdbTitle($media->tmdbTitle),
            'last_modified_at' => $media->last_modified_at?->format('d.m.Y H:i'),
            'scanned_at' => $media->scanned_at?->format('d.m.Y H:i'),
            'scanned_diff' => $media->scanned_at?->diffForHumans(),
            'storage_box' => $media->storageBox ? [
                'id' => $media->storageBox->id,
                'name' => $media->storageBox->name,
                'host' => $media->storageBox->host,
                'protocol' => $media->storageBox->protocol->value,
                'protocol_label' => $media->storageBox->protocol->label(),
            ] : null,
        ];
    }
}
