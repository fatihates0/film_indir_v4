<?php

namespace Tests\Feature;

use App\Models\MediaFile;
use App\Models\StorageBox;
use App\Models\TmdbTitle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CatalogMatchedMediaFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_unmatched_and_review_media_are_not_listed_in_series_catalog(): void
    {
        $box = StorageBox::factory()->create();

        // 1. Matched TV show
        $matchedTitle = TmdbTitle::factory()->create([
            'media_type' => 'tv',
            'title' => 'Matched TV Show',
            'title_tr' => 'Matched TV Show',
        ]);
        MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'category' => 'series',
            'tmdb_title_id' => $matchedTitle->id,
            'tmdb_match_status' => 'matched',
        ]);

        // 2. Review-pending TV show
        $reviewTitle = TmdbTitle::factory()->create([
            'media_type' => 'tv',
            'title' => 'Review Needed TV Show',
            'title_tr' => 'Review Needed TV Show',
        ]);
        MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'category' => 'series',
            'tmdb_title_id' => $reviewTitle->id,
            'tmdb_match_status' => 'review',
        ]);

        // 3. Unmatched raw media file with no TMDB title
        MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'category' => 'series',
            'name' => 'LEGO.Ninjago.Dragons.Rising.S01E01.mkv',
            'clean_title' => 'LEGO Ninjago Dragons Rising',
            'tmdb_title_id' => null,
            'tmdb_match_status' => 'unmatched',
        ]);

        $response = $this->get('/series');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Series')
            ->has('grid', 1)
            ->where('grid.0.title', 'Matched TV Show')
            ->where('totalCount', 1)
        );
    }

    public function test_unmatched_and_review_media_are_not_listed_in_movies_catalog(): void
    {
        $box = StorageBox::factory()->create();

        // 1. Matched movie
        $matchedMovie = TmdbTitle::factory()->create([
            'media_type' => 'movie',
            'title' => 'Matched Movie',
            'title_tr' => 'Matched Movie',
        ]);
        MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'category' => 'movie',
            'tmdb_title_id' => $matchedMovie->id,
            'tmdb_match_status' => 'matched',
        ]);

        // 2. Review movie
        $reviewMovie = TmdbTitle::factory()->create([
            'media_type' => 'movie',
            'title' => 'Review Movie',
            'title_tr' => 'Review Movie',
        ]);
        MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'category' => 'movie',
            'tmdb_title_id' => $reviewMovie->id,
            'tmdb_match_status' => 'review',
        ]);

        // 3. Unmatched movie
        MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'category' => 'movie',
            'clean_title' => 'Random Unmatched Movie',
            'tmdb_title_id' => null,
            'tmdb_match_status' => 'unmatched',
        ]);

        $response = $this->get('/movies');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Movies')
            ->has('grid', 1)
            ->where('grid.0.title', 'Matched Movie')
            ->where('totalCount', 1)
        );
    }
}
