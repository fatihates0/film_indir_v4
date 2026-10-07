<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$scanner = app(\App\Services\MediaScannerService::class);
$boxes = \App\Models\StorageBox::active()->get();

foreach ($boxes as $box) {
    echo "Scanning box ID {$box->id}: {$box->name} ({$box->host})...\n";
    $res = $scanner->scanStorageBox($box);
    print_r($res);
}
