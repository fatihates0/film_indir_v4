<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Services\SubscriptionService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckSubscriptionsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-subscriptions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Abonelik sürelerini ve aydan aya kota yenilemelerini kontrol eder.';

    /**
     * Execute the console command.
     */
    public function handle(SubscriptionService $service): int
    {
        $this->info('Abonelik kontrolü başlatıldı...');

        $now = Carbon::now();
        $expiredCount = 0;
        $renewedCount = 0;

        // 1. Expire subscriptions that passed their total expiration date
        $subscriptionsToExpire = Subscription::where('status', 'active')
            ->where('expires_at', '<=', $now)
            ->get();

        foreach ($subscriptionsToExpire as $subscription) {
            $subscription->update(['status' => 'expired']);
            $subscription->periods()->where('is_active', true)->update(['is_active' => false]);
            $expiredCount++;
        }

        // 2. Advance monthly periods for active subscriptions whose current period has ended
        $activeSubscriptions = Subscription::where('status', 'active')
            ->where('starts_at', '<=', $now)
            ->where('expires_at', '>', $now)
            ->with(['user', 'periods' => fn ($q) => $q->where('is_active', true)])
            ->get();

        foreach ($activeSubscriptions as $subscription) {
            $currentPeriod = $subscription->periods->first();

            if (! $currentPeriod || $now->greaterThanOrEqualTo($currentPeriod->period_end)) {
                if ($subscription->user) {
                    $newPeriod = $service->getCurrentPeriod($subscription->user);
                    if ($newPeriod) {
                        $renewedCount++;
                    }
                }
            }
        }

        $this->info("Kontrol tamamlandı: {$expiredCount} abonelik sona erdirildi, {$renewedCount} yeni aylık kota periyodu başlatıldı.");

        return Command::SUCCESS;
    }
}
