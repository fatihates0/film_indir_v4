<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediaFileResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $properties = (array) ($this->properties ?? []);

        $videoCodec = $this->video_codec;
        $audioCodec = $this->audio_codec;

        if (! $videoCodec) {
            foreach (['x265', 'h265', 'hevc', 'x264', 'h264', 'av1', 'avc'] as $codec) {
                if (in_array(strtolower($codec), array_map('strtolower', $properties)) || stripos($this->name, $codec) !== false) {
                    $videoCodec = strtoupper($codec);
                    break;
                }
            }
        }

        if (! $audioCodec) {
            foreach (['dual', 'atmos', 'dts', 'ac3', 'ddp', 'aac'] as $aud) {
                if (in_array(strtolower($aud), array_map('strtolower', $properties)) || stripos($this->name, $aud) !== false) {
                    $audioCodec = strtoupper($aud);
                    break;
                }
            }
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'filename' => $this->name,
            'clean_title' => $this->clean_title ?: $this->name,
            'file_size' => $this->size_bytes,
            'formatted_size' => $this->formatted_size ?: 'Bilinmiyor',
            'quality' => $this->quality ?: '1080p',
            'extension' => $this->extension ?: 'mkv',
            'properties' => $properties,
            'video_codec' => $videoCodec ?: 'x264',
            'audio_codec' => $audioCodec ?: 'DUAL',
            'download_url' => route('downloads.prepare', ['mediaFile' => $this->id]),
        ];
    }
}
