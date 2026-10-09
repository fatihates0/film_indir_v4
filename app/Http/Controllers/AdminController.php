<?php

namespace App\Http\Controllers;

use App\Enums\StorageBoxConnectionStatus;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\StorageBox;
use App\Models\TmdbTitle;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    /**
     * Display the admin dashboard overview.
     */
    public function index(Request $request): Response
    {
        $totalUsers = User::count();
        $adminCount = User::where('role', 'admin')->count();
        $premiumUsers = User::where('plan', '!=', 'free')->count();

        $plans = Plan::active()->get();

        $recentUsers = User::latest()
            ->take(15)
            ->get()
            ->map(function (User $u) {
                $period = app(SubscriptionService::class)->getCurrentPeriod($u);

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->role->value,
                    'role_label' => $u->role->label(),
                    'plan' => $u->plan->value,
                    'plan_label' => $period?->subscription?->plan?->name ?? $u->plan->label(),
                    'quota_used' => $period ? $period->formatted_used : '0 GB',
                    'quota_total' => $period ? $period->formatted_allocated : '0 GB',
                    'quota_remaining' => $period ? $period->formatted_remaining : '0 GB',
                    'quota_percentage' => $period ? $period->usage_percentage : 0,
                    'created_at' => $u->created_at->format('d.m.Y H:i'),
                ];
            });

        $storageBoxes = StorageBox::orderBy('is_default', 'desc')
            ->latest()
            ->take(6)
            ->get()
            ->map(fn (StorageBox $b) => [
                'id' => $b->id,
                'name' => $b->name,
                'host' => $b->host,
                'protocol' => $b->protocol->value,
                'protocol_label' => $b->protocol->label(),
                'port' => $b->port,
                'connection_status' => $b->connection_status->value,
                'connection_label' => $b->connection_status->label(),
                'connection_badge' => $b->connection_status->badgeClasses(),
                'latency_ms' => $b->latency_ms,
                'formatted_total' => $b->formatted_total,
                'is_default' => $b->is_default,
            ]);

        $totalBoxes = StorageBox::count();
        $onlineBoxes = StorageBox::where('connection_status', StorageBoxConnectionStatus::Online)->count();
        $totalCapGb = (int) StorageBox::sum('total_capacity_gb');

        $stats = [
            'total_users' => $totalUsers,
            'admin_count' => $adminCount,
            'premium_users' => $premiumUsers,
            'total_movies' => 480,
            'total_series' => 145,
            'total_downloads' => 12400,
            'storage' => [
                'total_boxes' => $totalBoxes,
                'online_boxes' => $onlineBoxes,
                'total_tb' => round($totalCapGb / 1000, 1),
            ],
        ];

        $heroSettings = Setting::get('dashboard_hero_settings', [
            'mode' => 'auto',
            'slots' => [
                '1' => '',
                '2' => '',
                '3' => '',
                '4' => '',
                '5' => '',
            ],
        ]);

        $heroSlotPreviews = [];
        foreach ($heroSettings['slots'] ?? [] as $slotIdx => $imdbId) {
            $cleanId = trim((string) $imdbId);
            if ($cleanId !== '') {
                $title = TmdbTitle::with('trailers')->where('imdb_id', $cleanId)->first();
                if ($title) {
                    $hasTr = $title->trailers->contains(fn ($t) => $t->is_dubbed || $t->is_subtitled || $t->iso_639_1 === 'tr');
                    $dubbed = $title->trailers->contains('is_dubbed', true);
                    $subtitled = $title->trailers->contains('is_subtitled', true);

                    $heroSlotPreviews[$slotIdx] = [
                        'id' => $title->id,
                        'imdb_id' => $cleanId,
                        'title' => $title->title_tr ?: ($title->title ?: $title->original_title),
                        'year' => $title->release_year,
                        'poster' => $title->poster_url,
                        'has_tr' => $hasTr,
                        'is_dubbed' => $dubbed,
                        'is_subtitled' => $subtitled,
                        'trailer_label' => $title->trailer?->label,
                    ];
                }
            }
        }

        $ipAccessSettings = Setting::get('ip_access_settings', [
            'whitelist' => [],
            'blacklist' => [],
        ]);

        $faqSettings = Setting::get('pricing_faq_settings', self::defaultFaqs());

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'recentUsers' => $recentUsers,
            'storageBoxes' => $storageBoxes,
            'plans' => $plans,
            'heroSettings' => $heroSettings,
            'heroSlotPreviews' => $heroSlotPreviews,
            'ipAccessSettings' => $ipAccessSettings,
            'faqSettings' => $faqSettings,
        ]);
    }

    /**
     * Update IP Access Settings (Whitelist & Blacklist).
     */
    public function updateIpAccessSettings(Request $request)
    {
        $validated = $request->validate([
            'whitelist' => ['nullable', 'array'],
            'whitelist.*' => ['nullable', 'string', 'max:50'],
            'blacklist' => ['nullable', 'array'],
            'blacklist.*' => ['nullable', 'string', 'max:50'],
        ]);

        $whitelist = array_values(array_filter(array_map('trim', $validated['whitelist'] ?? [])));
        $blacklist = array_values(array_filter(array_map('trim', $validated['blacklist'] ?? [])));

        Setting::set('ip_access_settings', [
            'whitelist' => $whitelist,
            'blacklist' => $blacklist,
        ]);

        return redirect()->back()->with('success', 'IP Erişim Listeleri (Whitelist / Blacklist) başarıyla güncellendi.');
    }

    /**
     * Update dashboard hero carousel settings (Auto vs Manual IMDb assignments).
     */
    public function updateHeroSettings(Request $request)
    {
        $validated = $request->validate([
            'mode' => ['required', 'string', 'in:auto,manual'],
            'slots' => ['nullable', 'array'],
            'slots.*' => ['nullable', 'string', 'max:25'],
        ]);

        $slots = [];
        for ($i = 1; $i <= 5; $i++) {
            $slots[(string) $i] = trim((string) ($validated['slots'][$i] ?? ''));
        }

        Setting::set('dashboard_hero_settings', [
            'mode' => $validated['mode'],
            'slots' => $slots,
        ]);

        // Clear hero slides cache so changes apply immediately
        cache()->forget('dashboard_hero_slides_v3');

        return redirect()->back()->with('success', 'Dashboard fragman vitrin ayarları başarıyla kaydedildi.');
    }

    /**
     * Execute tmdb:sync-trailers console command on-demand from admin console.
     */
    public function syncTrailers(Request $request)
    {
        $limit = max(1, min(200, (int) $request->input('limit', 50)));

        Artisan::call('tmdb:sync-trailers', [
            '--limit' => $limit,
            '--force' => (bool) $request->input('force', false),
        ]);

        $output = Artisan::output();

        // Clear dashboard cache
        cache()->forget('dashboard_hero_slides_v3');

        return response()->json([
            'success' => true,
            'message' => 'Fragman senkronizasyon komutu başarıyla tamamlandı.',
            'output' => $output,
        ]);
    }

    /**
     * Lookup an IMDb ID and return matching title details and trailer status.
     */
    public function lookupImdb(Request $request)
    {
        $imdbId = trim((string) $request->input('imdb_id', ''));

        if (! $imdbId) {
            return response()->json(['found' => false, 'message' => 'IMDb ID belirtilmedi.']);
        }

        $title = TmdbTitle::with('trailers')->where('imdb_id', $imdbId)->first();

        if (! $title) {
            return response()->json([
                'found' => false,
                'message' => "Arşivde '{$imdbId}' IMDb ID'sine sahip kayıtlı bir içerik bulunamadı.",
            ]);
        }

        $hasTr = $title->trailers->contains(fn ($t) => $t->is_dubbed || $t->is_subtitled || $t->iso_639_1 === 'tr');
        $dubbed = $title->trailers->contains('is_dubbed', true);
        $subtitled = $title->trailers->contains('is_subtitled', true);

        return response()->json([
            'found' => true,
            'title' => [
                'id' => $title->id,
                'imdb_id' => $title->imdb_id,
                'title' => $title->title_tr ?: ($title->title ?: $title->original_title),
                'year' => $title->release_year,
                'poster' => $title->poster_url,
                'media_type' => $title->media_type,
                'has_tr' => $hasTr,
                'is_dubbed' => $dubbed,
                'is_subtitled' => $subtitled,
                'trailer_label' => $title->trailer?->label ?: 'Fragman Yok',
                'trailers_count' => $title->trailers->count(),
            ],
        ]);
    }

    /**
     * Assign or update a subscription plan for a user directly from admin.
     */
    public function assignPlan(Request $request, User $user, SubscriptionService $subscriptionService)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'duration_months' => 'required|in:1,3,6,12',
            'notes' => 'nullable|string|max:500',
        ]);

        $plan = Plan::findOrFail($validated['plan_id']);
        $subscriptionService->subscribe(
            $user,
            $plan,
            (int) $validated['duration_months'],
            null,
            $validated['notes'] ?? 'Yönetici tarafından atandı'
        );

        return back()->with('success', "{$user->name} kullanıcısına {$plan->name} ({$validated['duration_months']} Ay) başarıyla tanımlandı.");
    }

    /**
     * Update Pricing FAQ (SSS) settings.
     */
    public function updateFaqSettings(Request $request)
    {
        $validated = $request->validate([
            'faqs' => ['nullable', 'array'],
            'faqs.*.question' => ['required', 'string', 'max:255'],
            'faqs.*.answer' => ['required', 'string', 'max:5000'],
        ]);

        $faqs = array_values(array_filter($validated['faqs'] ?? [], function ($item) {
            return ! empty(trim($item['question'] ?? '')) && ! empty(trim($item['answer'] ?? ''));
        }));

        Setting::set('pricing_faq_settings', $faqs);

        return redirect()->back()->with('success', 'Fiyatlandırma Sıkça Sorulan Sorular (SSS) başarıyla güncellendi.');
    }

    /**
     * Default FAQ list.
     */
    public static function defaultFaqs(): array
    {
        return [
            [
                'question' => 'İndirmeler VIP/Premium sunuculardan mı yapılıyor?',
                'answer' => 'Evet! Tüm indirmeler yüksek hızlı Dedicated Gateway (Storage Box) sunucularımız üzerinden doğrudan bağlantı ile maksimum hızınızda gerçekleştirilir.',
            ],
            [
                'question' => 'Aynı anda birden fazla dosya indirebilir miyim?',
                'answer' => 'Paket seviyenize bağlı olarak aynı anda 2, 5 veya sınırsız eş zamanlı indirme yapabilirsiniz. Detaylar paket özelliklerinde belirtilmiştir.',
            ],
            [
                'question' => 'Kotalarım ne zaman yenilenir?',
                'answer' => 'Aylık paket kotalarınız abonelik süreniz boyunca her 30 günde bir otomatik yenilenir. Kullanılmayan kotalar bir sonraki aya devretmez. Ek kotalar ise 30 gün geçerlidir.',
            ],
            [
                'question' => 'Hangi ödeme yöntemleri destekleniyor?',
                'answer' => 'Banka havalesi, EFT, FAST ve Kripto para (USDT, BTC vb.) ile ödeme yapabilirsiniz.',
            ],
            [
                'question' => 'İndirme hızı sınırı var mı?',
                'answer' => 'Hayır! İndirmelerde herhangi bir sunucu kaynaklı hız kısıtlaması uygulanmaz. İnternet servis sağlayıcınızın desteklediği maksimum bant genişliğini kullanabilirsiniz.',
            ],
        ];
    }
}
