<?php

use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\Admin\PaymentMethodController;
use App\Http\Controllers\Admin\PlanController;
use App\Http\Controllers\Admin\StorageBoxController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DownloadController;
use App\Http\Controllers\FrontController;
use App\Http\Controllers\PaymentNotificationController;
use Illuminate\Support\Facades\Route;

Route::get('/', [FrontController::class, 'home'])->name('home');
Route::get('/discover', function () {
    return redirect()->route('movies');
})->name('discover');
Route::get('/movies', [FrontController::class, 'movies'])->name('movies');
Route::get('/series', [FrontController::class, 'series'])->name('series');
Route::get('/releases', [FrontController::class, 'releases'])->name('releases');
Route::get('/forum', [FrontController::class, 'forum'])->name('forum');
Route::get('/about', [FrontController::class, 'about'])->name('about');
Route::get('/settings', [FrontController::class, 'settings'])->name('settings');
Route::get('/pricing', [FrontController::class, 'pricing'])->name('pricing');
Route::post('/subscribe/{plan}', [FrontController::class, 'subscribePlan'])->name('subscribe.plan');
Route::post('/payment-notifications', [PaymentNotificationController::class, 'store'])->name('payment-notifications.store');

Route::get('/movie/{id?}', [FrontController::class, 'movieDetail'])->name('movie.detail');
Route::get('/series/{id}', [FrontController::class, 'seriesDetail'])->name('series.detail');
Route::get('/person/{id}', [FrontController::class, 'personDetail'])->name('person.detail');
Route::get('/actor/{id}', function ($id) {
    return redirect()->route('person.detail', ['id' => $id]);
});

Route::get('/forum/discussion/{id?}', [FrontController::class, 'discussionDetail'])->name('forum.discussion');
Route::get('/forum/topic/{id?}', [FrontController::class, 'movieTopic'])->name('forum.topic');

Route::get('/search', [FrontController::class, 'search'])->name('search');
Route::get('/watchlist', [FrontController::class, 'watchlist'])->name('watchlist');
Route::get('/downloads', [FrontController::class, 'downloads'])->name('downloads');

// Secure Download Routes
Route::match(['get', 'post'], '/downloads/prepare/{mediaFile}', [DownloadController::class, 'prepare'])->name('downloads.prepare');
Route::get('/downloads/file/{token}', [DownloadController::class, 'stream'])->name('downloads.stream');
Route::post('/api/internal/downloads/log-bytes', [DownloadController::class, 'logBytes'])->name('downloads.log-bytes');

// Authentication Routes
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::post('/register', [AuthController::class, 'register'])->name('register');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Admin Sub Routes (Only accessible by authenticated Admin users, returns 404 otherwise)
Route::middleware(['admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('dashboard');
    Route::post('/users/{user}/assign-plan', [AdminController::class, 'assignPlan'])->name('users.assign-plan');
    Route::post('/hero-settings', [AdminController::class, 'updateHeroSettings'])->name('hero-settings.update');
    Route::post('/sync-trailers', [AdminController::class, 'syncTrailers'])->name('sync-trailers');
    Route::get('/lookup-imdb', [AdminController::class, 'lookupImdb'])->name('lookup-imdb');

    // Gateway Storage Node Routes
    Route::get('/storage-boxes', [StorageBoxController::class, 'index'])->name('storage-boxes.index');
    Route::post('/storage-boxes', [StorageBoxController::class, 'store'])->name('storage-boxes.store');
    Route::put('/storage-boxes/{storageBox}', [StorageBoxController::class, 'update'])->name('storage-boxes.update');
    Route::delete('/storage-boxes/{storageBox}', [StorageBoxController::class, 'destroy'])->name('storage-boxes.destroy');
    Route::post('/storage-boxes/{storageBox}/test', [StorageBoxController::class, 'test'])->name('storage-boxes.test');
    Route::post('/storage-boxes/test-all', [StorageBoxController::class, 'testAll'])->name('storage-boxes.test-all');
    Route::get('/storage-boxes/{storageBox}/browse', [StorageBoxController::class, 'browse'])->name('storage-boxes.browse');
    Route::post('/storage-boxes/{storageBox}/toggle', [StorageBoxController::class, 'toggleStatus'])->name('storage-boxes.toggle');
    // Media & Video Catalog Routes
    Route::get('/medias', [MediaController::class, 'index'])->name('medias.index');
    Route::post('/medias/scan', [MediaController::class, 'scan'])->name('medias.scan');
    Route::delete('/medias/{mediaFile}', [MediaController::class, 'destroy'])->name('medias.destroy');
    Route::post('/medias/bulk-delete', [MediaController::class, 'bulkDestroy'])->name('medias.bulk-delete');
    Route::post('/medias/clear-all', [MediaController::class, 'clearAll'])->name('medias.clear-all');

    // TMDB Integration Routes
    Route::post('/medias/tmdb-scan-all', [MediaController::class, 'tmdbScanAll'])->name('medias.tmdb-scan-all');
    Route::get('/medias/{mediaFile}/tmdb-search', [MediaController::class, 'tmdbSearch'])->name('medias.tmdb-search');
    Route::post('/medias/{mediaFile}/tmdb-match', [MediaController::class, 'tmdbMatch'])->name('medias.tmdb-match');
    Route::post('/medias/{mediaFile}/tmdb-detach', [MediaController::class, 'tmdbDetach'])->name('medias.tmdb-detach');

    // Plan & Quota Management Routes
    Route::get('/plans', [PlanController::class, 'index'])->name('plans.index');
    Route::post('/plans', [PlanController::class, 'store'])->name('plans.store');
    Route::put('/plans/{plan}', [PlanController::class, 'update'])->name('plans.update');
    Route::delete('/plans/{plan}', [PlanController::class, 'destroy'])->name('plans.destroy');
    Route::post('/plans/users/assign', [PlanController::class, 'assignUserPlan'])->name('plans.users.assign');
    Route::post('/plans/users/{user}/remove', [PlanController::class, 'removeUserPlan'])->name('plans.users.remove');

    // Payment Method & Notification Management Routes
    Route::post('/payment-methods/{paymentMethod}/toggle', [PaymentMethodController::class, 'toggle'])->name('payment-methods.toggle');
    Route::put('/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update'])->name('payment-methods.update');
    Route::post('/payment-notifications/{notification}/approve', [PaymentNotificationController::class, 'approve'])->name('payment-notifications.approve');
    Route::post('/payment-notifications/{notification}/reject', [PaymentNotificationController::class, 'reject'])->name('payment-notifications.reject');
});
