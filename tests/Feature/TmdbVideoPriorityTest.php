<?php

namespace Tests\Feature;

use App\Models\TmdbTitle;
use App\Models\TmdbVideo;
use App\Services\TmdbService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TmdbVideoPriorityTest extends TestCase
{
    use RefreshDatabase;

    public function test_prioritize_videos_puts_turkish_dubbed_first_then_subtitled_then_original(): void
    {
        $service = app(TmdbService::class);

        $rawVideos = [
            [
                'id' => 'en-trailer',
                'name' => 'Official Main Trailer',
                'site' => 'YouTube',
                'key' => 'yt_en_123',
                'type' => 'Trailer',
                'official' => true,
                'iso_639_1' => 'en',
                'published_at' => '2025-01-01 10:00:00',
            ],
            [
                'id' => 'tr-sub-trailer',
                'name' => 'Resmi Türkçe Altyazılı Fragman',
                'site' => 'YouTube',
                'key' => 'yt_tr_sub_456',
                'type' => 'Trailer',
                'official' => true,
                'iso_639_1' => 'tr',
                'published_at' => '2025-01-02 10:00:00',
            ],
            [
                'id' => 'tr-dub-trailer',
                'name' => 'Türkçe Dublajlı Fragman 1',
                'site' => 'YouTube',
                'key' => 'yt_tr_dub_789',
                'type' => 'Trailer',
                'official' => true,
                'iso_639_1' => 'tr',
                'published_at' => '2025-01-03 10:00:00',
            ],
            [
                'id' => 'en-clip',
                'name' => 'Behind the Scenes Clip',
                'site' => 'YouTube',
                'key' => 'yt_en_clip_999',
                'type' => 'Behind the Scenes',
                'official' => false,
                'iso_639_1' => 'en',
            ],
        ];

        $prioritized = $service->prioritizeVideos($rawVideos);

        $this->assertNotEmpty($prioritized);
        // First should be Turkish Dubbed
        $this->assertEquals('yt_tr_dub_789', $prioritized[0]['key']);
        $this->assertTrue($prioritized[0]['is_dubbed']);
        $this->assertFalse($prioritized[0]['is_subtitled']);

        // Second should be Turkish Subtitled
        $this->assertEquals('yt_tr_sub_456', $prioritized[1]['key']);
        $this->assertFalse($prioritized[1]['is_dubbed']);
        $this->assertTrue($prioritized[1]['is_subtitled']);

        // Third should be English Official Trailer
        $this->assertEquals('yt_en_123', $prioritized[2]['key']);

        // BTS clip should be filtered out
        $keys = array_column($prioritized, 'key');
        $this->assertNotContains('yt_en_clip_999', $keys);
    }

    public function test_prioritize_videos_falls_back_to_english_when_no_turkish_available(): void
    {
        $service = app(TmdbService::class);

        $rawVideos = [
            [
                'id' => 'en-teaser',
                'name' => 'Official Teaser',
                'site' => 'YouTube',
                'key' => 'yt_teaser',
                'type' => 'Teaser',
                'official' => true,
                'iso_639_1' => 'en',
                'published_at' => '2024-12-01 10:00:00',
            ],
            [
                'id' => 'en-trailer',
                'name' => 'Official Trailer',
                'site' => 'YouTube',
                'key' => 'yt_main_trailer',
                'type' => 'Trailer',
                'official' => true,
                'iso_639_1' => 'en',
                'published_at' => '2024-12-15 10:00:00',
            ],
        ];

        $prioritized = $service->prioritizeVideos($rawVideos);

        $this->assertCount(2, $prioritized);
        $this->assertEquals('yt_main_trailer', $prioritized[0]['key']);
        $this->assertEquals('yt_teaser', $prioritized[1]['key']);
    }

    public function test_sync_title_relations_stores_multiple_videos_with_sort_order_and_flags(): void
    {
        $service = app(TmdbService::class);
        $title = TmdbTitle::factory()->create();

        $details = [
            'videos' => [
                [
                    'id' => 'sub-1',
                    'name' => 'Türkçe Altyazılı Fragman',
                    'site' => 'YouTube',
                    'key' => 'key_sub',
                    'type' => 'Trailer',
                    'official' => true,
                    'iso_639_1' => 'tr',
                ],
                [
                    'id' => 'dub-1',
                    'name' => 'Türkçe Dublaj Fragman',
                    'site' => 'YouTube',
                    'key' => 'key_dub',
                    'type' => 'Trailer',
                    'official' => true,
                    'iso_639_1' => 'tr',
                ],
                [
                    'id' => 'en-1',
                    'name' => 'Official Trailer',
                    'site' => 'YouTube',
                    'key' => 'key_en',
                    'type' => 'Trailer',
                    'official' => true,
                    'iso_639_1' => 'en',
                ],
            ],
        ];

        $service->syncTitleRelations($title, $details);

        $videos = TmdbVideo::where('tmdb_title_id', $title->id)
            ->orderBy('sort_order', 'asc')
            ->get();

        $this->assertCount(3, $videos);

        // 1st: Dubbed
        $this->assertEquals('key_dub', $videos[0]->key);
        $this->assertEquals(1, $videos[0]->sort_order);
        $this->assertTrue($videos[0]->is_dubbed);
        $this->assertFalse($videos[0]->is_subtitled);
        $this->assertEquals('Türkçe Dublaj Fragman', $videos[0]->label);

        // 2nd: Subtitled
        $this->assertEquals('key_sub', $videos[1]->key);
        $this->assertEquals(2, $videos[1]->sort_order);
        $this->assertFalse($videos[1]->is_dubbed);
        $this->assertTrue($videos[1]->is_subtitled);
        $this->assertEquals('Türkçe Altyazılı Fragman', $videos[1]->label);

        // 3rd: Original/English
        $this->assertEquals('key_en', $videos[2]->key);
        $this->assertEquals(3, $videos[2]->sort_order);
        $this->assertFalse($videos[2]->is_dubbed);
        $this->assertFalse($videos[2]->is_subtitled);

        // Verify TmdbTitle relationships
        $this->assertEquals('key_dub', $title->fresh()->trailer->key);
        $this->assertCount(3, $title->fresh()->trailers);
    }
}
