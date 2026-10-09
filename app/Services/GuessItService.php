<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class GuessItService
{
    /**
     * In-memory cache for parsed filenames during request execution.
     *
     * @var array<string, array<string, mixed>>
     */
    protected static array $memoryCache = [];

    /**
     * Get the base directory path for scripts.
     */
    protected static function getScriptPath(): string
    {
        try {
            if (function_exists('base_path')) {
                return base_path('scripts/guessit_parser.js');
            }
        } catch (\Throwable $e) {
            // Container not initialized
        }

        return dirname(__DIR__, 2).'/scripts/guessit_parser.js';
    }

    /**
     * Get configured node binary path.
     */
    protected static function getNodePath(): string
    {
        try {
            if (function_exists('config')) {
                return config('app.node_path') ?: 'node';
            }
        } catch (\Throwable $e) {
            // Container not initialized
        }

        return 'node';
    }

    /**
     * Parse film/series title, year, quality, properties and category using guessit-js.
     *
     * @return array{clean_title: string, year: ?int, quality: ?string, category: string, properties: list<string>}
     */
    public static function parse(string $filename, string $path = ''): array
    {
        $cacheKey = md5($filename.'|'.$path);
        if (isset(self::$memoryCache[$cacheKey])) {
            return self::$memoryCache[$cacheKey];
        }

        $scriptPath = self::getScriptPath();
        $nodePath = self::getNodePath();

        $process = new Process([$nodePath, $scriptPath, $filename, $path]);
        $process->setTimeout(10);
        $process->run();

        if (! $process->isSuccessful()) {
            self::logWarning('GuessIt process failed: '.$process->getErrorOutput(), [
                'filename' => $filename,
                'path' => $path,
            ]);

            $fallback = self::fallbackParse($filename, $path);
            self::$memoryCache[$cacheKey] = $fallback;

            return $fallback;
        }

        $output = trim($process->getOutput());
        $data = json_decode($output, true);

        if (! is_array($data) || ! isset($data['clean_title'])) {
            self::logWarning('GuessIt returned invalid JSON output: '.$output);
            $fallback = self::fallbackParse($filename, $path);
            self::$memoryCache[$cacheKey] = $fallback;

            return $fallback;
        }

        $result = [
            'clean_title' => (string) ($data['clean_title'] ?? pathinfo($filename, PATHINFO_FILENAME)),
            'year' => isset($data['year']) && is_numeric($data['year']) ? (int) $data['year'] : null,
            'quality' => ! empty($data['quality']) ? (string) $data['quality'] : null,
            'category' => (string) ($data['category'] ?? 'movie'),
            'properties' => is_array($data['properties'] ?? null) ? array_values($data['properties']) : [],
        ];

        self::$memoryCache[$cacheKey] = $result;

        return $result;
    }

    /**
     * Parse multiple media files in a single batch Node process execution.
     *
     * @param  list<array{filename: string, path: string}>  $items
     * @return list<array{clean_title: string, year: ?int, quality: ?string, category: string, properties: list<string>}>
     */
    public static function parseBatch(array $items): array
    {
        if (empty($items)) {
            return [];
        }

        $scriptPath = self::getScriptPath();
        $nodePath = self::getNodePath();

        $inputJson = json_encode($items);

        $process = new Process([$nodePath, $scriptPath]);
        $process->setInput($inputJson);
        $process->setTimeout(30);
        $process->run();

        if (! $process->isSuccessful()) {
            self::logWarning('GuessIt batch process failed: '.$process->getErrorOutput());

            return array_map(fn ($item) => self::parse($item['filename'], $item['path']), $items);
        }

        $output = trim($process->getOutput());
        $batchData = json_decode($output, true);

        if (! is_array($batchData)) {
            return array_map(fn ($item) => self::parse($item['filename'], $item['path']), $items);
        }

        $results = [];
        foreach ($batchData as $idx => $data) {
            $item = $items[$idx] ?? ['filename' => '', 'path' => ''];
            $res = [
                'clean_title' => (string) ($data['clean_title'] ?? pathinfo($item['filename'], PATHINFO_FILENAME)),
                'year' => isset($data['year']) && is_numeric($data['year']) ? (int) $data['year'] : null,
                'quality' => ! empty($data['quality']) ? (string) $data['quality'] : null,
                'category' => (string) ($data['category'] ?? 'movie'),
                'properties' => is_array($data['properties'] ?? null) ? array_values($data['properties']) : [],
            ];

            $cacheKey = md5($item['filename'].'|'.$item['path']);
            self::$memoryCache[$cacheKey] = $res;
            $results[] = $res;
        }

        return $results;
    }

    /**
     * Safely log a warning message.
     */
    protected static function logWarning(string $message, array $context = []): void
    {
        try {
            if (class_exists(Log::class)) {
                Log::warning($message, $context);
            }
        } catch (\Throwable $e) {
            // Container not initialized
        }
    }

    /**
     * Fallback parser if Node.js execution fails.
     *
     * @return array{clean_title: string, year: ?int, quality: ?string, category: string, properties: list<string>}
     */
    protected static function fallbackParse(string $filename, string $path): array
    {
        $raw = pathinfo($filename, PATHINFO_FILENAME);
        $clean = str_replace(['.', '_', '-'], ' ', $raw);
        $clean = trim(preg_replace('/\s+/', ' ', $clean));

        return [
            'clean_title' => $clean ?: $raw,
            'year' => null,
            'quality' => null,
            'category' => 'movie',
            'properties' => [],
        ];
    }

    /**
     * Clear in-memory cache (useful for testing).
     */
    public static function clearCache(): void
    {
        self::$memoryCache = [];
    }
}
