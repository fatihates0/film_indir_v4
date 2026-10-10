<?php

use App\Http\Controllers\Admin\AdminUploadController;
use App\Http\Controllers\Admin\JellyfinServerController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\Admin\PaymentMethodController;
use App\Http\Controllers\Admin\PlanController;
use App\Http\Controllers\Admin\StorageBoxController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\DownloadController;
use App\Http\Controllers\FrontController;
use App\Http\Controllers\MediaServerController;
use App\Http\Controllers\PaymentNotificationController;
use Illuminate\Support\Facades\Route;

Route::get('/', [FrontController::class, 'home'])->name('home');
Route::get('/discover', function () {
    return redirect()->route('movies');
})->name('discover');
Route::get('/movies', [FrontController::class, 'movies'])->name('movies');
Route::get('/series', [FrontController::class, 'series'])->name('series');
Route::get('/forum', [FrontController::class, 'forum'])->name('forum');
Route::get('/about', [FrontController::class, 'about'])->name('about');
Route::get('/settings', [FrontController::class, 'settings'])->name('settings');
Route::get('/pricing', [FrontController::class, 'pricing'])->name('pricing');
Route::post('/subscribe/{plan}', [FrontController::class, 'subscribePlan'])->name('subscribe.plan');
Route::post('/subscription/cancel-perpetual', [FrontController::class, 'cancelPerpetualSubscription'])->name('subscription.cancel-perpetual');
Route::post('/payment-notifications', [PaymentNotificationController::class, 'store'])->name('payment-notifications.store');

Route::get('/movie/{id?}', [FrontController::class, 'movieDetail'])->name('movie.detail');
Route::get('/series/{id}', [FrontController::class, 'seriesDetail'])->name('series.detail');

// Comments & Reviews Routes
Route::post('/comments', [CommentController::class, 'store'])->name('comments.store');
Route::post('/comments/{comment}/react', [CommentController::class, 'react'])->name('comments.react');
Route::delete('/comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');
Route::get('/person/{id}', [FrontController::class, 'personDetail'])->name('person.detail');
Route::get('/actor/{id}', function ($id) {
    return redirect()->route('person.detail', ['id' => $id]);
});

Route::get('/forum/discussion/{id?}', [FrontController::class, 'discussionDetail'])->name('forum.discussion');
Route::get('/forum/topic/{id?}', [FrontController::class, 'movieTopic'])->name('forum.topic');

Route::get('/search', [FrontController::class, 'search'])->name('search');
Route::get('/watchlist', [FrontController::class, 'watchlist'])->name('watchlist');
Route::get('/downloads', [FrontController::class, 'downloads'])->name('downloads');

// User Media Server Management
Route::get('/media-server', [MediaServerController::class, 'index'])->name('media-server.index');
Route::post('/media-server/account', [MediaServerController::class, 'createAccount'])->name('media-server.create');
Route::post('/media-server/password', [MediaServerController::class, 'resetPassword'])->name('media-server.reset-password');
Route::delete('/media-server/account', [MediaServerController::class, 'deleteAccount'])->name('media-server.delete');

// Secure Download Routes
Route::match(['get', 'post'], '/downloads/prepare/{mediaFile}', [DownloadController::class, 'prepare'])->name('downloads.prepare');
Route::get('/downloads/file/{token}', [DownloadController::class, 'stream'])->name('downloads.stream');

// Internal Gateway Webhook Routes (protected by shared secret)
Route::middleware(['gateway.secret'])->group(function () {
    Route::post('/api/internal/downloads/log-bytes', [DownloadController::class, 'logBytes'])->name('downloads.log-bytes');
    Route::post('/api/internal/downloads/check-active', [DownloadController::class, 'checkActive'])->name('downloads.check-active');
});

// Authentication Routes
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::post('/register', [AuthController::class, 'register'])->name('register');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Admin Sub Routes (Only accessible by authenticated Admin users, returns 404 otherwise)
Route::middleware(['admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('dashboard');
    Route::post('/users/{user}/assign-plan', [AdminController::class, 'assignPlan'])->name('users.assign-plan');
    Route::post('/hero-settings', [AdminController::class, 'updateHeroSettings'])->name('hero-settings.update');
    Route::post('/ip-access-settings', [AdminController::class, 'updateIpAccessSettings'])->name('ip-access-settings.update');
    Route::post('/faq-settings', [AdminController::class, 'updateFaqSettings'])->name('faq-settings.update');
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

    // Resumable Gateway Chunk Upload Routes
    Route::post('/uploads/init', [AdminUploadController::class, 'init'])->name('uploads.init');
    Route::post('/uploads/complete', [AdminUploadController::class, 'complete'])->name('uploads.complete');

    // TMDB Integration Routes
    Route::post('/medias/tmdb-scan-all', [MediaController::class, 'tmdbScanAll'])->name('medias.tmdb-scan-all');
    Route::get('/medias/{mediaFile}/tmdb-search', [MediaController::class, 'tmdbSearch'])->name('medias.tmdb-search');
    Route::post('/medias/{mediaFile}/tmdb-match', [MediaController::class, 'tmdbMatch'])->name('medias.tmdb-match');
    Route::post('/medias/{mediaFile}/tmdb-detach', [MediaController::class, 'tmdbDetach'])->name('medias.tmdb-detach');

    // Plan & Quota Management Routes
    Route::get('/plans', [PlanController::class, 'index'])->name('plans.index');
    Route::post('/plans', [PlanController::class, 'store'])->name('plans.store');
    Route::post('/plans/{plan}/toggle', [PlanController::class, 'toggle'])->name('plans.toggle');
    Route::post('/plans/{plan}/clone', [PlanController::class, 'clone'])->name('plans.clone');
    Route::put('/plans/{plan}', [PlanController::class, 'update'])->name('plans.update');
    Route::delete('/plans/{plan}', [PlanController::class, 'destroy'])->name('plans.destroy');
    Route::post('/plans/users/assign', [PlanController::class, 'assignUserPlan'])->name('plans.users.assign');
    Route::post('/plans/users/{user}/remove', [PlanController::class, 'removeUserPlan'])->name('plans.users.remove');
    Route::post('/plans/users/{user}/reset-usage', [PlanController::class, 'resetUsage'])->name('plans.users.reset-usage');
    Route::post('/plans/users/{user}/extend-duration', [PlanController::class, 'extendDuration'])->name('plans.users.extend-duration');
    Route::post('/plans/users/{user}/extra-quota', [PlanController::class, 'addExtraQuotaDirect'])->name('plans.users.extra-quota');
    Route::put('/plans/users/{user}/extra-quota/{extraQuota}', [PlanController::class, 'updateUserExtraQuota'])->name('plans.users.extra-quota.update');
    Route::delete('/plans/users/{user}/extra-quota/{extraQuota}', [PlanController::class, 'removeUserExtraQuota'])->name('plans.users.extra-quota.destroy');
    Route::post('/plans/users/{user}/sync-media-account', [PlanController::class, 'syncMediaAccount'])->name('plans.users.sync-media-account');

    // Payment Method & Notification Management Routes
    Route::post('/payment-methods/{paymentMethod}/toggle', [PaymentMethodController::class, 'toggle'])->name('payment-methods.toggle');
    Route::put('/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update'])->name('payment-methods.update');
    Route::post('/payment-notifications/{notification}/approve', [PaymentNotificationController::class, 'approve'])->name('payment-notifications.approve');
    Route::post('/payment-notifications/{notification}/reject', [PaymentNotificationController::class, 'reject'])->name('payment-notifications.reject');

    // Jellyfin Media Server Nodes Management Routes
    Route::get('/jellyfin-servers', [JellyfinServerController::class, 'index'])->name('jellyfin-servers.index');
    Route::post('/jellyfin-servers', [JellyfinServerController::class, 'store'])->name('jellyfin-servers.store');
    Route::put('/jellyfin-servers/{jellyfinServer}', [JellyfinServerController::class, 'update'])->name('jellyfin-servers.update');
    Route::delete('/jellyfin-servers/{jellyfinServer}', [JellyfinServerController::class, 'destroy'])->name('jellyfin-servers.destroy');
    Route::post('/jellyfin-servers/{jellyfinServer}/toggle', [JellyfinServerController::class, 'toggle'])->name('jellyfin-servers.toggle');
    Route::post('/jellyfin-servers/{jellyfinServer}/test', [JellyfinServerController::class, 'test'])->name('jellyfin-servers.test');
    Route::post('/jellyfin-servers/test-all', [JellyfinServerController::class, 'testAll'])->name('jellyfin-servers.test-all');
});
