<?php

use App\Models\StorageBox;
use App\Services\MediaScannerService;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$scanner = app(MediaScannerService::class);
$boxes = StorageBox::active()->get();

foreach ($boxes as $box) {
    echo "Scanning box ID {$box->id}: {$box->name} ({$box->host})...\n";
    $res = $scanner->scanStorageBox($box);
    print_r($res);
}
