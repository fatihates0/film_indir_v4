<?php

namespace App\Enums;

enum StorageBoxStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Maintenance = 'maintenance';

    /**
     * Get the human-readable label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::Active => 'Aktif',
            self::Inactive => 'Pasif',
            self::Maintenance => 'Bakımda',
        };
    }

    /**
     * Get badge styling classes for UI display.
     */
    public function badgeClasses(): string
    {
        return match ($this) {
            self::Active => 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            self::Inactive => 'bg-gray-500/10 text-gray-400 border-gray-500/20',
            self::Maintenance => 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
    }
}
