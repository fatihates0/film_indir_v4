<?php

namespace Database\Factories;

use App\Models\TmdbSeason;
use App\Models\TmdbTitle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TmdbSeason>
 */
class TmdbSeasonFactory extends Factory
{
    protected $model = TmdbSeason::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tmdb_title_id' => TmdbTitle::factory(),
            'tmdb_season_id' => fake()->numberBetween(1000, 999999),
            'season_number' => 1,
            'name' => 'Sezon 1',
            'overview' => fake()->paragraph(),
            'poster_path' => '/'.fake()->lexify('????????????').'.jpg',
            'episode_count' => 10,
            'air_date' => fake()->date(),
            'vote_average' => 8.2,
        ];
    }
}
