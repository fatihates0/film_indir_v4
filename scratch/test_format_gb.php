<?php

use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

function testFormat(int $bytes, int $precision = 2, bool $maxUnitGb = true): string
{
    if ($bytes <= 0) {
        return '0 GB';
    }

    $units = ['B', 'KB', 'MB', 'GB'];
    if (! $maxUnitGb) {
        $units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    }

    $power = $bytes > 0 ? (int) floor(log($bytes, 1024)) : 0;
    $power = min($power, count($units) - 1);

    $value = $bytes / pow(1024, $power);
    $formatted = number_format($value, $precision, ',', '.');
    if (str_ends_with($formatted, ',00')) {
        $formatted = substr($formatted, 0, -3);
    }

    return $formatted.' '.$units[$power];
}

$testCases = [
    0 => '0',
    500 * 1024 * 1024 => '500 MB',
    50 * 1024 * 1024 * 1024 => '50 GB',
    250 * 1024 * 1024 * 1024 => '250 GB',
    1000 * 1024 * 1024 * 1024 => '1000 GB',
    1500 * 1024 * 1024 * 1024 => '1500 GB',
    2000 * 1024 * 1024 * 1024 => '2000 GB',
    (int) (1450.75 * 1024 * 1024 * 1024) => '1450.75 GB',
];

foreach ($testCases as $bytes => $desc) {
    echo "Bytes: {$bytes} ({$desc}) -> Result: ".testFormat($bytes)."\n";
}
