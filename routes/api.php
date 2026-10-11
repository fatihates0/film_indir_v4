<?php

use App\Http\Controllers\Api\CatalogApiController;
use App\Http\Controllers\Api\JellyfinQuotaController;
use App\Http\Controllers\Api\MovieApiController;
use App\Http\Controllers\Api\SeriesApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// API v1 Routes
Route::prefix('v1')->group(function () {
    // Movies API
    Route::get('/movies', [MovieApiController::class, 'index'])->name('api.v1.movies.index');
    Route::get('/movies/{id}', [MovieApiController::class, 'show'])->name('api.v1.movies.show');

    // Series API
    Route::get('/series', [SeriesApiController::class, 'index'])->name('api.v1.series.index');
    Route::get('/series/{id}', [SeriesApiController::class, 'show'])->name('api.v1.series.show');

    // Catalog & Search API
    Route::get('/home', [CatalogApiController::class, 'home'])->name('api.v1.home');
    Route::get('/search', [CatalogApiController::class, 'search'])->name('api.v1.search');
});

// Jellyfin Quota Sync Endpoints
Route::prefix('jellyfin')->group(function () {
    Route::get('/quotas', [JellyfinQuotaController::class, 'index'])->name('api.jellyfin.quotas');
    Route::get('/check-access', [JellyfinQuotaController::class, 'checkAccess'])->name('api.jellyfin.check_access');
    Route::post('/deduct-quota', [JellyfinQuotaController::class, 'deductQuota'])->name('api.jellyfin.deduct_quota');
    Route::post('/quota-exceeded', [JellyfinQuotaController::class, 'quotaExceeded'])->name('api.jellyfin.quota_exceeded');
});

// Emby Quota Sync Endpoints (Emby plugin entegrasyonu)
Route::prefix('emby')->group(function () {
    Route::get('/quotas', [JellyfinQuotaController::class, 'index'])->name('api.emby.quotas');
    Route::get('/check-access', [JellyfinQuotaController::class, 'checkAccess'])->name('api.emby.check_access');
    Route::post('/deduct-quota', [JellyfinQuotaController::class, 'deductQuota'])->name('api.emby.deduct_quota');
    Route::post('/quota-exceeded', [JellyfinQuotaController::class, 'quotaExceeded'])->name('api.emby.quota_exceeded');
});
