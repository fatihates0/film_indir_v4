<?php

namespace App\Http\Controllers;

use App\Models\JellyfinServer;
use App\Models\TmdbTitle;
use App\Services\MediaServers\JellyfinLoadBalancerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MediaServerController extends Controller
{
    public function __construct(
        protected JellyfinLoadBalancerService $loadBalancer
    ) {}

    /**
     * Medya Sunucum sayfası görünümü.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $hasActiveSub = $user ? ($user->isAdmin() || $user->hasActiveSubscription()) : false;

        $jellyfinServersCount = JellyfinServer::where('is_active', true)->where('type', 'jellyfin')->count();
        $embyServersCount = JellyfinServer::where('is_active', true)->where('type', 'emby')->count();
        $activeServersCount = $jellyfinServersCount + $embyServersCount;

        // Eğer kullanıcı giriş yapmış ancak aktif aboneliği bitmişse ve admin değilse:
        // Sunuculardaki ve DB'deki hesabı anında temizle
        if ($user && ! $hasActiveSub) {
            $this->loadBalancer->purgeUserAccount($user);
        }

        $jellyfinAccount = null;
        $embyAccount = null;

        if ($user && $hasActiveSub) {
            // 1. Jellyfin hesabı var mı ara
            $foundJellyfin = $this->loadBalancer->findUserAcrossServers($user->email, 'jellyfin');
            if ($foundJellyfin === null && ! empty($user->name)) {
                $foundJellyfin = $this->loadBalancer->findUserAcrossServers($user->name, 'jellyfin');
            }
            if ($foundJellyfin !== null) {
                $srv = $foundJellyfin['server'];
                $jUser = $foundJellyfin['jellyfin_user'];
                $jellyfinAccount = [
                    'username' => $jUser['Name'] ?? $user->email,
                    'server_type' => 'jellyfin',
                    'server_type_label' => 'Jellyfin',
                    'server_id' => $srv->id,
                    'server_name' => $srv->name,
                    'server_url' => $srv->effective_public_url,
                    'last_activity_date' => $jUser['LastActivityDate'] ?? null,
                    'date_created' => $jUser['DateCreated'] ?? null,
                ];
            }

            // 2. Emby hesabı var mı ara
            $foundEmby = $this->loadBalancer->findUserAcrossServers($user->email, 'emby');
            if ($foundEmby === null && ! empty($user->name)) {
                $foundEmby = $this->loadBalancer->findUserAcrossServers($user->name, 'emby');
            }
            if ($foundEmby !== null) {
                $srv = $foundEmby['server'];
                $eUser = $foundEmby['jellyfin_user'];
                $embyAccount = [
                    'username' => $eUser['Name'] ?? $user->email,
                    'server_type' => 'emby',
                    'server_type_label' => 'Emby Server',
                    'server_id' => $srv->id,
                    'server_name' => $srv->name,
                    'server_url' => $srv->effective_public_url,
                    'last_activity_date' => $eUser['LastActivityDate'] ?? null,
                    'date_created' => $eUser['DateCreated'] ?? null,
                ];
            }
        }

        $featuredTitles = TmdbTitle::whereNotNull('poster_path')
            ->whereNotNull('backdrop_path')
            ->orderByDesc('vote_average')
            ->where('vote_count', '>', 250)
            ->take(8)
            ->get(['id', 'title', 'slug', 'poster_path', 'backdrop_path', 'vote_average', 'release_date', 'media_type']);

        $primaryAccount = $embyAccount ?? $jellyfinAccount;

        return Inertia::render('MediaServer/Index', [
            'has_account' => ($jellyfinAccount !== null || $embyAccount !== null),
            'account' => $primaryAccount,
            'accounts' => [
                'jellyfin' => $jellyfinAccount,
                'emby' => $embyAccount,
            ],
            'available_server_types' => [
                'jellyfin' => $jellyfinServersCount > 0,
                'emby' => $embyServersCount > 0,
            ],
            'counts' => [
                'jellyfin_servers' => $jellyfinServersCount,
                'emby_servers' => $embyServersCount,
            ],
            'suggested_username' => $user?->email ?? '',
            'active_servers_count' => $activeServersCount,
            'has_available_servers' => $activeServersCount > 0,
            'is_guest' => $user === null,
            'has_active_subscription' => $hasActiveSub,
            'featured_titles' => $featuredTitles,
        ]);
    }

    /**
     * Dengeli dağıtımlı yeni medya sunucusu (Jellyfin veya Emby) hesabı açma.
     */
    public function createAccount(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('home')->with('error', 'Lütfen önce giriş yapın.');
        }

        if (! $user->isAdmin() && ! $user->hasActiveSubscription()) {
            return redirect()->back()->with('error', 'Medya sunucusu hesabı oluşturmak için aktif bir abonelik paketinizin olması gerekir.');
        }

        $validated = $request->validate([
            'password' => 'required|string|min:4|max:100',
            'server_type' => 'nullable|in:jellyfin,emby',
        ]);

        $serverType = $validated['server_type'] ?? 'jellyfin';

        // Eğer sistemde sadece Emby varsa ve tip belirtilmemişse Emby seç
        if (empty($validated['server_type'])) {
            $hasJellyfin = JellyfinServer::where('is_active', true)->where('type', 'jellyfin')->exists();
            $hasEmby = JellyfinServer::where('is_active', true)->where('type', 'emby')->exists();
            if ($hasEmby && ! $hasJellyfin) {
                $serverType = 'emby';
            }
        }

        // Kullanıcı adı her zaman kullanıcının e-posta adresidir
        $username = $user->email;

        $result = $this->loadBalancer->createBalancedUser($username, $validated['password'], $user->id, $serverType);

        if (! empty($result['success'])) {
            return redirect()->back()->with('success', $result['message']);
        }

        return redirect()->back()->with('error', $result['message']);
    }

    /**
     * Mevcut hesabın şifresini sıfırlama/güncelleme.
     */
    public function resetPassword(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('home')->with('error', 'Lütfen önce giriş yapın.');
        }

        if (! $user->isAdmin() && ! $user->hasActiveSubscription()) {
            return redirect()->back()->with('error', 'Aktif bir aboneliğiniz bulunmadığı için bu işlem yapılamaz.');
        }

        $validated = $request->validate([
            'password' => 'required|string|min:4|max:100',
            'server_type' => 'nullable|in:jellyfin,emby',
        ]);

        $serverType = $validated['server_type'] ?? null;

        // Kullanıcı adı her zaman e-posta adresidir (eski hesaplar için name fallback)
        $username = $user->email;
        $found = $this->loadBalancer->findUserAcrossServers($username, $serverType);
        if ($found === null && ! empty($user->name)) {
            $username = $user->name;
        }

        $result = $this->loadBalancer->resetUserPassword($username, $validated['password'], $serverType);

        if (! empty($result['success'])) {
            return redirect()->back()->with('success', $result['message']);
        }

        return redirect()->back()->with('error', $result['message']);
    }

    /**
     * Kullanıcının medya hesabını silme.
     */
    public function deleteAccount(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('home')->with('error', 'Lütfen önce giriş yapın.');
        }

        $serverType = $request->input('server_type');

        if ($serverType) {
            $username = $user->email;
            $result = $this->loadBalancer->deleteUserAccount($username, $serverType);
            if (! empty($result['success'])) {
                return redirect()->back()->with('success', $result['message']);
            }

            return redirect()->back()->with('error', $result['message']);
        }

        $this->loadBalancer->purgeUserAccount($user);

        return redirect()->back()->with('success', 'Medya sunucusu hesaplarınız sunuculardan ve veritabanından başarıyla silindi.');
    }
}
