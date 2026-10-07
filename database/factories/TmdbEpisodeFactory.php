<?php

namespace Database\Factories;

use App\Models\TmdbEpisode;
use App\Models\TmdbSeason;
use App\Models\TmdbTitle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TmdbEpisode>
 */
class TmdbEpisodeFactory extends Factory
{
    protected $model = TmdbEpisode::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tmdb_title_id' => TmdbTitle::factory(),
            'tmdb_season_id' => TmdbSeason::factory(),
            'tmdb_episode_id' => fake()->numberBetween(1000, 999999),
            'season_number' => 1,
            'episode_number' => 1,
            'name' => 'Bölüm 1',
            'overview' => fake()->paragraph(),
            'still_path' => '/'.fake()->lexify('????????????').'.jpg',
            'air_date' => fake()->date(),
            'vote_average' => 8.0,
            'runtime' => 50,
        ];
    }
}
