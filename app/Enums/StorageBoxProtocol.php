<?php

namespace App\Enums;

enum StorageBoxProtocol: string
{
    case CustomGateway = 'custom_gateway';

    /**
     * Check if protocol belongs to S3 family (false for Gateway).
     */
    public function isS3(): bool
    {
        return false;
    }

    /**
     * Check if protocol is Custom Storage Gateway.
     */
    public function isGateway(): bool
    {
        return true;
    }

    /**
     * Get the human-readable label for the protocol.
     */
    public function label(): string
    {
        return 'Nginx Storage Node (Gateway Daemon)';
    }

    /**
     * Get the default network port for the protocol.
     */
    public function defaultPort(): int
    {
        return 443;
    }

    /**
     * Get badge visual styling attributes for UI.
     */
    public function badgeClasses(): string
    {
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
}
