<?php

namespace App\Enums;

enum UserPlan: string
{
    case FREE = 'free';
    case BASIC = 'basic';
    case PREMIUM = 'premium';
    case VIP = 'vip';

    public function label(): string
    {
        return match ($this) {
            self::FREE => 'Ücretsiz Üyelik',
            self::BASIC => 'Temel Paket',
            self::PREMIUM => 'Preimum Paket',
            self::VIP => 'VIP Üyelik',
        };
    }

    /**
     * Priority level of the plan for feature access comparisons.
     */
    public function level(): int
    {
        return match ($this) {
            self::FREE => 0,
            self::BASIC => 1,
            self::PREMIUM => 2,
            self::VIP => 3,
        };
    }
}
