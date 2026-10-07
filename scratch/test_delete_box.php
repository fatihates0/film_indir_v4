<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $box = \App\Models\StorageBox::find(1);
    if ($box) {
        echo "Attempting to delete box: {$box->name}\n";
        // $box->delete();
        echo "Can delete box successfully\n";
    }
} catch (\Throwable $e) {
    echo "ERROR DELETING BOX: " . $e->getMessage() . "\n";
}
