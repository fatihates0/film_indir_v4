<?php

namespace App\Enums;

enum StorageBoxConnectionStatus: string
{
    case Online = 'online';
    case Offline = 'offline';
    case Error = 'error';
    case Unknown = 'unknown';

    /**
     * Get the human-readable label for the connection status.
     */
    public function label(): string
    {
        return match ($this) {
            self::Online => 'Çevrimiçi',
            self::Offline => 'Çevrimdışı',
            self::Error => 'Bağlantı Hatası',
            self::Unknown => 'Bilinmiyor',
        };
    }

    /**
     * Get visual badge classes for UI rendering.
     */
    public function badgeClasses(): string
    {
        return match ($this) {
            self::Online => 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            self::Offline => 'bg-rose-500/10 text-rose-400 border-rose-500/30',
            self::Error => 'bg-amber-500/10 text-amber-400 border-amber-500/30',
            self::Unknown => 'bg-white/5 text-gray-400 border-white/10',
        };
    }
}
