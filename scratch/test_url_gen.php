<?php

use App\Models\StorageBox;
use App\Services\StorageTokenService;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$tokenService = app(StorageTokenService::class);

// Test 1: IP + HTTP + Custom Port 8080
$b1 = new StorageBox(['host' => 'http://155.103.194.61:8080/', 'port' => 8080, 'use_ssl' => false, 'password' => 'test1']);
echo "IP HTTP Port 8080 Scan URL:\n".$tokenService->generateApiUrl('/scan', 0, $b1)."\n\n";

// Test 2: Domain + HTTPS + Port 443
$b2 = new StorageBox(['host' => 'https://dl3.fatihates.com.tr/', 'port' => 443, 'use_ssl' => true, 'password' => 'test1']);
echo "Domain HTTPS Port 443 Scan URL:\n".$tokenService->generateApiUrl('/scan', 0, $b2)."\n\n";

// Test 3: Domain + HTTP + Port 80
$b3 = new StorageBox(['host' => 'storage.local', 'port' => 80, 'use_ssl' => false, 'password' => 'test1']);
echo "Domain HTTP Port 80 Scan URL:\n".$tokenService->generateApiUrl('/scan', 0, $b3)."\n\n";
