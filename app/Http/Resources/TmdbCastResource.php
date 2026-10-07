<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class TmdbCastResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $defaultAvatar = 'https://ui-avatars.com/api/?name='.urlencode($this->name).'&color=00B074&background=191D28';

        $personSlug = null;
        if (! empty($this->tmdb_person_id)) {
            $personSlug = $this->tmdb_person_id.'-'.Str::slug($this->name);
        }

        return [
            'id' => $this->id,
            'tmdb_person_id' => $this->tmdb_person_id,
            'name' => $this->name,
            'role' => $this->character ?: ($this->job ?: 'Oyuncu'),
            'character' => $this->character,
            'job' => $this->job,
            'department' => $this->department,
            'avatar' => $this->profile_url ?: $defaultAvatar,
            'image' => $this->profile_url ?: $defaultAvatar,
            'profile_url' => $this->profile_url,
            'person_url' => $personSlug ? route('person.detail', ['id' => $personSlug]) : null,
        ];
    }
}
