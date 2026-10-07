<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Jobs\ProcessMediaTmdbJob;
use App\Models\MediaFile;
use App\Models\StorageBox;
use App\Models\TmdbTitle;
use App\Models\User;
use App\Services\TmdbService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TmdbIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.tmdb.api_key' => 'fake-test-api-key',
            'services.tmdb.base_url' => 'https://api.themoviedb.org/3',
        ]);
    }

    public function test_guest_cannot_access_tmdb_routes(): void
    {
        $box = StorageBox::factory()->create();
        $media = MediaFile::factory()->create(['storage_box_id' => $box->id]);

        $this->getJson("/admin/medias/{$media->id}/tmdb-search?query=Inception")->assertStatus(404);
        $this->postJson("/admin/medias/{$media->id}/tmdb-match", ['tmdb_id' => 123])->assertStatus(404);
        $this->postJson("/admin/medias/{$media->id}/tmdb-detach")->assertStatus(404);
        $this->postJson('/admin/medias/tmdb-scan-all')->assertStatus(404);
    }

    public function test_admin_can_search_tmdb(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $box = StorageBox::factory()->create();
        $media = MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'clean_title' => 'Inception',
        ]);

        Http::fake([
            'https://api.themoviedb.org/3/search/movie*' => Http::response([
                'results' => [
                    [
                        'id' => 27205,
                        'media_type' => 'movie',
                        'title' => 'Inception',
                        'original_title' => 'Inception',
                        'release_date' => '2010-07-15',
                        'vote_average' => 8.4,
                        'vote_count' => 35000,
                        'poster_path' => '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
                        'overview' => 'Cobb steals information from targets dreams.',
                    ],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($admin)->getJson("/admin/medias/{$media->id}/tmdb-search?query=Inception&type=movie");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'results' => [
                [
                    'id' => 27205,
                    'title' => 'Inception',
                    'release_year' => 2010,
                ],
            ],
        ]);
    }

    public function test_admin_can_manually_match_tmdb_title(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $box = StorageBox::factory()->create();
        $media = MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'clean_title' => 'The Choral',
            'year' => 2025,
            'tmdb_match_status' => 'unmatched',
        ]);

        Http::fake([
            'https://api.themoviedb.org/3/movie/12345*' => Http::response([
                'id' => 12345,
                'title' => 'The Choral',
                'original_title' => 'The Choral',
                'original_language' => 'en',
                'release_date' => '2025-05-20',
                'vote_average' => 7.8,
                'vote_count' => 150,
                'poster_path' => '/choral_poster.jpg',
                'overview' => 'In 1916 Ramsden, Yorkshire, a chorus recruits boys.',
                'genres' => [['id' => 18, 'name' => 'Drama']],
                'external_ids' => ['imdb_id' => 'tt9876543'],
                'translations' => [
                    'translations' => [
                        [
                            'iso_639_1' => 'tr',
                            'data' => [
                                'title' => 'Koro',
                                'overview' => 'Koro filmi konusu...',
                            ],
                        ],
                        [
                            'iso_639_1' => 'en',
                            'data' => [
                                'title' => 'The Choral',
                                'overview' => 'In 1916 Ramsden, Yorkshire...',
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($admin)->postJson("/admin/medias/{$media->id}/tmdb-match", [
            'tmdb_id' => 12345,
            'media_type' => 'movie',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $media->refresh();
        $this->assertEquals('matched', $media->tmdb_match_status);
        $this->assertEquals(100, $media->tmdb_match_confidence);
        $this->assertNotNull($media->tmdb_title_id);

        $tmdbTitle = TmdbTitle::find($media->tmdb_title_id);
        $this->assertNotNull($tmdbTitle);
        $this->assertEquals('Koro', $tmdbTitle->title_tr);
        $this->assertEquals('The Choral', $tmdbTitle->title_en);
        $this->assertEquals('The Choral', $tmdbTitle->title_original);
        $this->assertEquals(2025, $tmdbTitle->release_year);
    }

    public function test_admin_can_detach_tmdb_match(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $box = StorageBox::factory()->create();
        $tmdb = TmdbTitle::factory()->create();
        $media = MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'tmdb_title_id' => $tmdb->id,
            'tmdb_match_status' => 'matched',
        ]);

        $response = $this->actingAs($admin)->postJson("/admin/medias/{$media->id}/tmdb-detach");

        $response->assertStatus(200);
        $media->refresh();
        $this->assertNull($media->tmdb_title_id);
        $this->assertEquals('unmatched', $media->tmdb_match_status);
    }

    public function test_tmdb_scan_all_dispatches_jobs_to_tmdb_scan_queue(): void
    {
        Queue::fake();

        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $box = StorageBox::factory()->create();

        $media1 = MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'tmdb_match_status' => 'unmatched',
        ]);
        $media2 = MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'tmdb_match_status' => 'review',
        ]);
        $media3 = MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'tmdb_match_status' => 'matched',
        ]);

        $response = $this->actingAs($admin)->postJson('/admin/medias/tmdb-scan-all', [
            'scope' => 'unmatched_and_review',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'queue' => 'tmdb_scan',
            'dispatched_count' => 2,
        ]);

        Queue::assertPushedOn('tmdb_scan', ProcessMediaTmdbJob::class);
        Queue::assertPushed(ProcessMediaTmdbJob::class, 2);
    }

    public function test_auto_match_with_exact_year_marks_as_matched(): void
    {
        $box = StorageBox::factory()->create();
        $media = MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'clean_title' => 'The Choral',
            'year' => 2025,
            'category' => 'movie',
            'tmdb_match_status' => 'unmatched',
        ]);

        Http::fake([
            'https://api.themoviedb.org/3/search/movie*' => Http::response([
                'results' => [
                    [
                        'id' => 99911,
                        'media_type' => 'movie',
                        'title' => 'The Choral',
                        'original_title' => 'The Choral',
                        'release_date' => '2025-06-01',
                        'vote_average' => 8.0,
                        'vote_count' => 100,
                        'poster_path' => '/choral.jpg',
                        'overview' => 'A film about a youth choir.',
                    ],
                ],
            ], 200),
            'https://api.themoviedb.org/3/movie/99911*' => Http::response([
                'id' => 99911,
                'title' => 'The Choral',
                'original_title' => 'The Choral',
                'release_date' => '2025-06-01',
                'vote_average' => 8.0,
                'vote_count' => 100,
                'poster_path' => '/choral.jpg',
                'overview' => 'A film about a youth choir.',
                'genres' => [],
                'external_ids' => [],
            ], 200),
        ]);

        $service = app(TmdbService::class);
        $result = $service->matchMediaFile($media);

        $this->assertTrue($result['success']);
        $this->assertEquals('matched', $result['status']);
        $media->refresh();
        $this->assertEquals('matched', $media->tmdb_match_status);
        $this->assertNotNull($media->tmdb_title_id);
    }

    public function test_auto_match_with_plus_minus_one_year_matches_directly(): void
    {
        // File has year 2024, but TMDB says 2025 (+-1 year rule -> matches directly)
        $box = StorageBox::factory()->create();
        $media = MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'clean_title' => 'The Choral',
            'year' => 2024,
            'category' => 'movie',
            'tmdb_match_status' => 'unmatched',
        ]);

        Http::fake([
            'https://api.themoviedb.org/3/search/movie*' => Http::response([
                'results' => [
                    [
                        'id' => 99922,
                        'media_type' => 'movie',
                        'title' => 'The Choral',
                        'original_title' => 'The Choral',
                        'release_date' => '2025-06-01', // 2025 vs 2024
                        'vote_average' => 8.0,
                        'vote_count' => 100,
                        'poster_path' => '/choral2.jpg',
                        'overview' => 'A film about a youth choir.',
                    ],
                ],
            ], 200),
            'https://api.themoviedb.org/3/movie/99922*' => Http::response([
                'id' => 99922,
                'title' => 'The Choral',
                'original_title' => 'The Choral',
                'release_date' => '2025-06-01',
                'vote_average' => 8.0,
                'vote_count' => 100,
                'poster_path' => '/choral2.jpg',
                'overview' => 'A film about a youth choir.',
                'genres' => [],
                'external_ids' => [],
            ], 200),
        ]);

        $service = app(TmdbService::class);
        $result = $service->matchMediaFile($media);

        $this->assertTrue($result['success']);
        // Must be marked as 'matched' per user requirement!
        $this->assertEquals('matched', $result['status']);
        $media->refresh();
        $this->assertEquals('matched', $media->tmdb_match_status);
        $this->assertStringContainsString('+-1 yıl farkı', $media->tmdb_match_notes);
        $this->assertNotNull($media->tmdb_title_id);
    }

    public function test_tmdb_syncs_relational_casts_videos_and_seasons(): void
    {
        $box = StorageBox::factory()->create();
        $media = MediaFile::factory()->create([
            'storage_box_id' => $box->id,
            'clean_title' => 'Breaking Bad',
            'year' => 2008,
            'category' => 'series',
            'tmdb_match_status' => 'unmatched',
        ]);

        Http::fake([
            'https://api.themoviedb.org/3/search/tv*' => Http::response([
                'results' => [
                    [
                        'id' => 1396,
                        'media_type' => 'tv',
                        'name' => 'Breaking Bad',
                        'original_name' => 'Breaking Bad',
                        'first_air_date' => '2008-01-20',
                        'vote_average' => 8.9,
                        'vote_count' => 12000,
                        'poster_path' => '/breakingbad.jpg',
                        'overview' => 'A chemistry teacher diagnosed with cancer turns to manufacturing meth.',
                    ],
                ],
            ], 200),
            'https://api.themoviedb.org/3/tv/1396/season/1*' => Http::response([
                'id' => 3572,
                'season_number' => 1,
                'episodes' => [
                    [
                        'id' => 62085,
                        'season_number' => 1,
                        'episode_number' => 1,
                        'name' => 'Pilot',
                        'overview' => 'When an unassuming high school chemistry teacher is told he has cancer...',
                        'still_path' => '/ep1.jpg',
                        'air_date' => '2008-01-20',
                        'vote_average' => 8.4,
                        'runtime' => 58,
                    ],
                ],
            ], 200),
            'https://api.themoviedb.org/3/tv/1396*' => Http::response([
                'id' => 1396,
                'name' => 'Breaking Bad',
                'original_name' => 'Breaking Bad',
                'original_language' => 'en',
                'first_air_date' => '2008-01-20',
                'vote_average' => 8.9,
                'vote_count' => 12000,
                'poster_path' => '/breakingbad.jpg',
                'backdrop_path' => '/breakingbad_bg.jpg',
                'overview' => 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.',
                'genres' => [['id' => 18, 'name' => 'Drama']],
                'external_ids' => ['imdb_id' => 'tt0903747'],
                'credits' => [
                    'cast' => [
                        [
                            'id' => 17419,
                            'name' => 'Bryan Cranston',
                            'character' => 'Walter White',
                            'known_for_department' => 'Acting',
                            'profile_path' => '/bryan.jpg',
                            'order' => 0,
                        ],
                        [
                            'id' => 84497,
                            'name' => 'Aaron Paul',
                            'character' => 'Jesse Pinkman',
                            'known_for_department' => 'Acting',
                            'profile_path' => '/aaron.jpg',
                            'order' => 1,
                        ],
                    ],
                    'crew' => [
                        [
                            'id' => 66633,
                            'name' => 'Vince Gilligan',
                            'department' => 'Directing',
                            'job' => 'Director',
                            'profile_path' => '/vince.jpg',
                        ],
                    ],
                ],
                'videos' => [
                    'results' => [
                        [
                            'id' => 'v123',
                            'key' => 'HhesaQXLuRY',
                            'name' => 'Series Trailer',
                            'site' => 'YouTube',
                            'type' => 'Trailer',
                            'size' => 1080,
                            'official' => true,
                            'published_at' => '2008-01-01T00:00:00Z',
                            'iso_639_1' => 'en',
                        ],
                    ],
                ],
                'seasons' => [
                    [
                        'id' => 3572,
                        'season_number' => 1,
                        'name' => 'Season 1',
                        'overview' => 'Season 1 description',
                        'poster_path' => '/s1.jpg',
                        'episode_count' => 7,
                        'air_date' => '2008-01-20',
                        'vote_average' => 8.2,
                    ],
                ],
            ], 200),
        ]);

        $service = app(TmdbService::class);
        $result = $service->matchMediaFile($media);

        $this->assertTrue($result['success']);
        $media->refresh();
        $this->assertEquals('matched', $media->tmdb_match_status);

        $tmdbTitle = $media->tmdbTitle;
        $this->assertNotNull($tmdbTitle);

        // Check Cast
        $this->assertCount(3, $tmdbTitle->castMembers);
        $this->assertCount(2, $tmdbTitle->actors);
        $this->assertEquals('Bryan Cranston', $tmdbTitle->actors->first()->name);
        $this->assertEquals('Walter White', $tmdbTitle->actors->first()->character);
        $this->assertCount(1, $tmdbTitle->directors);
        $this->assertEquals('Vince Gilligan', $tmdbTitle->directors->first()->name);

        // Check Videos
        $this->assertCount(1, $tmdbTitle->videos);
        $this->assertCount(1, $tmdbTitle->trailers);
        $this->assertEquals('https://www.youtube.com/watch?v=HhesaQXLuRY', $tmdbTitle->trailers->first()->video_url);

        // Check Seasons & Episodes
        $this->assertCount(1, $tmdbTitle->seasons);
        $season = $tmdbTitle->seasons->first();
        $this->assertEquals(1, $season->season_number);
        $this->assertCount(1, $season->episodes);
        $this->assertEquals('Pilot', $season->episodes->first()->name);
    }
}
