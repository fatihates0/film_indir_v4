<?php

namespace App\Console\Commands;

use App\Models\DownloadTicket;
use Illuminate\Console\Command;

/**
 * Periodically mark stale download tickets as stopped.
 *
 * Tickets are considered stale when:
 * - They are active/pending but have not been updated in the last 90 seconds.
 * - They are pending and were created more than 60 seconds ago.
 * - They are active with 0 bytes downloaded and were not updated in the last 60 seconds.
 *
 * Running this as a scheduled job removes 3 bulk UPDATE queries from every
 * download request, significantly reducing DB load under concurrent use.
 */
class CleanStaleTicketsCommand extends Command
{
    protected $signature = 'tickets:clean-stale';

    protected $description = 'Mark stale download tickets as stopped (runs every minute via scheduler)';

    public function handle(): int
    {
        $stopped = 0;

        // 1. Active/pending tickets not updated in 90 seconds
        $stopped += DownloadTicket::whereIn('status', ['active', 'pending'])
            ->where('updated_at', '<', now()->subSeconds(90))
            ->update(['status' => 'stopped']);

        // 2. Pending tickets older than 60 seconds (never activated)
        $stopped += DownloadTicket::where('status', 'pending')
            ->where('created_at', '<', now()->subSeconds(60))
            ->update(['status' => 'stopped']);

        // 3. Active tickets with 0 bytes downloaded, idle for 60 seconds
        $stopped += DownloadTicket::where('status', 'active')
            ->where('bytes_downloaded', 0)
            ->where('updated_at', '<', now()->subSeconds(60))
            ->update(['status' => 'stopped']);

        if ($stopped > 0) {
            $this->info("Cleaned {$stopped} stale download ticket(s).");
        }

        return self::SUCCESS;
    }
}
