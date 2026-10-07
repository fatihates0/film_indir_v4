<?php

namespace Tests\Unit;

use App\Models\MediaFile;
use PHPUnit\Framework\TestCase;

class MediaFileTest extends TestCase
{
    /**
     * Test quality detection for m720p, m1080p, and standard resolutions.
     */
    public function test_quality_detection_in_parse_metadata(): void
    {
        $m720p = MediaFile::parseMetadata('Inception.2010.m720p.BluRay.mkv', '/film/Inception.2010.m720p.BluRay.mkv');
        $this->assertEquals('m720p', $m720p['quality']);
        $this->assertContains('m720p', $m720p['properties']);

        $m1080p = MediaFile::parseMetadata('Inception.2010.m1080p.WEB-DL.mkv', '/film/Inception.2010.m1080p.WEB-DL.mkv');
        $this->assertEquals('m1080p', $m1080p['quality']);
        $this->assertContains('m1080p', $m1080p['properties']);

        $fhd = MediaFile::parseMetadata('Inception.2010.1080p.BluRay.mkv', '/film/Inception.2010.1080p.BluRay.mkv');
        $this->assertEquals('1080p', $fhd['quality']);

        $hd = MediaFile::parseMetadata('Inception.2010.720p.BluRay.mkv', '/film/Inception.2010.720p.BluRay.mkv');
        $this->assertEquals('720p', $hd['quality']);

        $uhd = MediaFile::parseMetadata('Inception.2010.2160p.UHD.mkv', '/film/Inception.2010.2160p.UHD.mkv');
        $this->assertEquals('2160p', $uhd['quality']);
    }

    /**
     * Test category detection logic for movies containing "season" or "series" in title vs actual TV shows.
     */
    public function test_category_detection(): void
    {
        // Movies with "Season" or similar words in title must be categorized as 'movie'
        $happiestSeason = MediaFile::parseMetadata(
            'Happiest.Season.2020.m1080p.WEB-DL.H264.DuaL.uHDFilmindir.mkv',
            '/Filmler/Happiest.Season.2020.m1080p.WEB-DL.H264.DuaL.uHDFilmindir.mkv'
        );
        $this->assertEquals('movie', $happiestSeason['category']);

        $weddingSeason = MediaFile::parseMetadata(
            'Wedding.Season.2022.m1080p.WEB-DL.DUAL.x264-AC3.mkv',
            '/Filmler/Wedding.Season.2022.m1080p.WEB-DL.DUAL.x264-AC3.mkv'
        );
        $this->assertEquals('movie', $weddingSeason['category']);

        $openSeason = MediaFile::parseMetadata('Open.Season.2006.1080p.mkv', '/Filmler/Open.Season.2006.1080p.mkv');
        $this->assertEquals('movie', $openSeason['category']);

        $seasonWitch = MediaFile::parseMetadata('Season.of.the.Witch.2011.1080p.mkv', '/Filmler/Season.of.the.Witch.2011.1080p.mkv');
        $this->assertEquals('movie', $seasonWitch['category']);

        // Actual TV Series must be categorized as 'series'
        $got = MediaFile::parseMetadata('Game.of.Thrones.S01E01.1080p.mkv', '/Diziler/Game.of.Thrones.S01E01.1080p.mkv');
        $this->assertEquals('series', $got['category']);

        $loki = MediaFile::parseMetadata('Loki.Season.1.1080p.mkv', '/Diziler/Loki/Season.1/Loki.Season.1.1080p.mkv');
        $this->assertEquals('series', $loki['category']);

        $bb = MediaFile::parseMetadata('Breaking.Bad.Sezon.02.1080p.mkv', '/Diziler/Breaking.Bad/Sezon.02/Breaking.Bad.Sezon.02.1080p.mkv');
        $this->assertEquals('series', $bb['category']);
    }
}
