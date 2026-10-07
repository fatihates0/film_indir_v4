<?php

namespace Database\Factories;

use App\Models\MediaFile;
use App\Models\StorageBox;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MediaFile>
 */
class MediaFileFactory extends Factory
{
    protected $model = MediaFile::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $extensions = ['mkv', 'mp4', 'avi'];
        $ext = fake()->randomElement($extensions);
        $year = fake()->numberBetween(2000, 2026);
        $title = fake()->words(3, true);
        $quality = fake()->randomElement(['2160p', '1080p', '720p']);
        $filename = str_replace(' ', '.', ucwords($title)).".{$year}.{$quality}.BluRay.x264.{$ext}";

        return [
            'storage_box_id' => StorageBox::factory(),
            'name' => $filename,
            'path' => "/Filmler/{$filename}",
            'directory' => '/Filmler',
            'extension' => $ext,
            'size_bytes' => fake()->numberBetween(1000000000, 15000000000), // 1 GB - 15 GB
            'clean_title' => ucwords($title),
            'year' => $year,
            'quality' => $quality,
            'category' => fake()->randomElement(['movie', 'series']),
            'mime_type' => 'video/x-matroska',
            'last_modified_at' => now()->subDays(fake()->numberBetween(1, 60)),
            'scanned_at' => now(),
        ];
    }
}
