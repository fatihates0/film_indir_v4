<?php

use App\Models\StorageBox;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

try {
    $box = StorageBox::find(1);
    if ($box) {
        echo "Attempting to delete box: {$box->name}\n";
        // $box->delete();
        echo "Can delete box successfully\n";
    }
} catch (Throwable $e) {
    echo 'ERROR DELETING BOX: '.$e->getMessage()."\n";
}
