<?php

namespace Database\Factories;

use App\Models\TmdbTitle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TmdbTitle>
 */
class TmdbTitleFactory extends Factory
{
    protected $model = TmdbTitle::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tmdb_id' => $this->faker->unique()->numberBetween(10000, 999999),
            'imdb_id' => 'tt'.$this->faker->numberBetween(1000000, 9999999),
            'media_type' => 'movie',
            'title' => $this->faker->sentence(3),
            'title_tr' => $this->faker->sentence(3),
            'title_en' => $this->faker->sentence(3),
            'title_original' => $this->faker->sentence(3),
            'original_title' => $this->faker->sentence(3),
            'original_language' => 'en',
            'overview' => $this->faker->paragraph(),
            'overview_tr' => $this->faker->paragraph(),
            'overview_en' => $this->faker->paragraph(),
            'poster_path' => '/poster_'.$this->faker->lexify('??????').'.jpg',
            'backdrop_path' => '/backdrop_'.$this->faker->lexify('??????').'.jpg',
            'release_date' => $this->faker->date(),
            'release_year' => $this->faker->numberBetween(2000, 2026),
            'vote_average' => $this->faker->randomFloat(1, 4, 9),
            'vote_count' => $this->faker->numberBetween(100, 50000),
            'popularity' => $this->faker->randomFloat(2, 5, 200),
            'genres' => ['Action', 'Sci-Fi'],
            'extra_data' => ['tagline' => 'A great film'],
        ];
    }
}
