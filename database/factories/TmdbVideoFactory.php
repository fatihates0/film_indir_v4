<?php

namespace Database\Factories;

use App\Models\TmdbTitle;
use App\Models\TmdbVideo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TmdbVideo>
 */
class TmdbVideoFactory extends Factory
{
    protected $model = TmdbVideo::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tmdb_title_id' => TmdbTitle::factory(),
            'tmdb_video_id' => fake()->uuid(),
            'name' => 'Official Trailer',
            'site' => 'YouTube',
            'key' => fake()->regexify('[a-zA-Z0-9_-]{11}'),
            'type' => 'Trailer',
            'size' => 1080,
            'official' => true,
            'published_at' => now()->subMonths(2),
            'iso_639_1' => 'en',
            'sort_order' => 1,
            'is_dubbed' => false,
            'is_subtitled' => false,
        ];
    }

    /**
     * Indicate that the trailer is Turkish dubbed.
     */
    public function dubbed(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Türkçe Dublajlı Fragman',
            'iso_639_1' => 'tr',
            'is_dubbed' => true,
            'is_subtitled' => false,
            'sort_order' => 1,
        ]);
    }

    /**
     * Indicate that the trailer is Turkish subtitled.
     */
    public function subtitled(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Türkçe Altyazılı Fragman',
            'iso_639_1' => 'tr',
            'is_dubbed' => false,
            'is_subtitled' => true,
            'sort_order' => 2,
        ]);
    }
}
