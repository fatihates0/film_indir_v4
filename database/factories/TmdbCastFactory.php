<?php

namespace Database\Factories;

use App\Models\TmdbCast;
use App\Models\TmdbTitle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TmdbCast>
 */
class TmdbCastFactory extends Factory
{
    protected $model = TmdbCast::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tmdb_title_id' => TmdbTitle::factory(),
            'tmdb_person_id' => fake()->numberBetween(1000, 999999),
            'name' => fake()->name(),
            'character' => fake()->name(),
            'role_type' => 'cast',
            'department' => 'Acting',
            'job' => 'Actor',
            'profile_path' => '/'.fake()->lexify('????????????').'.jpg',
            'order' => fake()->numberBetween(0, 15),
        ];
    }
}
