<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Storage Box kota ve disk durumunu her 30 dakikada bir otomatik yenile
Schedule::command('storage-box:refresh-quota')
    ->everyThirtyMinutes()
    ->name('refresh-storage-box-quota')
    ->withoutOverlapping();

// Kullanıcı abonelik ve aylık kota devir kontrolü (saat başı)
Schedule::command('app:check-subscriptions')
    ->hourly()
    ->name('check-subscriptions')
    ->withoutOverlapping();
