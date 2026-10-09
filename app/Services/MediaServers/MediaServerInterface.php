<?php

namespace App\Services\MediaServers;

interface MediaServerInterface
{
    public function createUser(string $username, string $password): ?string;

    public function setUserEnabled(string $externalUserId, bool $enabled): bool;

    public function terminateUserSessions(string $externalUserId): bool;
}
