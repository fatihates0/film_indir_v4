<?php

namespace App\Http\Controllers;

use App\Models\JellyfinServer;
use App\Services\MediaServers\JellyfinLoadBalancerService;
use Illuminate\Http\RedirectResponse;
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
    public function index(Request $request): Response|RedirectResponse
    {
        $user = Auth::user();

        if (! $user) {
            return redirect()->route('home')->with('error', 'Medya sunucusu yönetimi için lütfen giriş yapın.');
        }

        // Kullanıcının e-posta adresiyle (veya önceden açılmışsa adıyla) aktif sunucularda hesabı var mı ara
        $found = $this->loadBalancer->findUserAcrossServers($user->email);

        if ($found === null && ! empty($user->name)) {
            $found = $this->loadBalancer->findUserAcrossServers($user->name);
        }

        $activeServersCount = JellyfinServer::where('is_active', true)->count();

        $accountData = null;
        if ($found !== null) {
            $server = $found['server'];
            $jellyfinUser = $found['jellyfin_user'];

            $accountData = [
                'username' => $jellyfinUser['Name'] ?? $user->email,
                'server_id' => $server->id,
                'server_name' => $server->name,
                'server_url' => $server->effective_public_url,
                'last_activity_date' => $jellyfinUser['LastActivityDate'] ?? null,
                'date_created' => $jellyfinUser['DateCreated'] ?? null,
            ];
        }

        return Inertia::render('MediaServer/Index', [
            'has_account' => $accountData !== null,
            'account' => $accountData,
            'suggested_username' => $user->email,
            'active_servers_count' => $activeServersCount,
            'has_available_servers' => $activeServersCount > 0,
        ]);
    }

    /**
     * Dengeli dağıtımlı yeni Jellyfin hesabı açma.
     */
    public function createAccount(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('home')->with('error', 'Lütfen önce giriş yapın.');
        }

        $validated = $request->validate([
            'password' => 'required|string|min:4|max:100',
        ]);

        // Kullanıcı adı her zaman kullanıcının e-posta adresidir
        $username = $user->email;

        $result = $this->loadBalancer->createBalancedUser($username, $validated['password']);

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

        $validated = $request->validate([
            'password' => 'required|string|min:4|max:100',
        ]);

        // Kullanıcı adı her zaman e-posta adresidir (eski hesaplar için name fallback)
        $username = $user->email;
        $found = $this->loadBalancer->findUserAcrossServers($username);
        if ($found === null && ! empty($user->name)) {
            $username = $user->name;
        }

        $result = $this->loadBalancer->resetUserPassword($username, $validated['password']);

        if (! empty($result['success'])) {
            return redirect()->back()->with('success', $result['message']);
        }

        return redirect()->back()->with('error', $result['message']);
    }

    /**
     * Kullanıcının Jellyfin hesabını silme.
     */
    public function deleteAccount(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('home')->with('error', 'Lütfen önce giriş yapın.');
        }

        // Kullanıcı adı her zaman e-posta adresidir (eski hesaplar için name fallback)
        $username = $user->email;
        $found = $this->loadBalancer->findUserAcrossServers($username);
        if ($found === null && ! empty($user->name)) {
            $username = $user->name;
        }

        $result = $this->loadBalancer->deleteUserAccount($username);

        if (! empty($result['success'])) {
            return redirect()->back()->with('success', $result['message']);
        }

        return redirect()->back()->with('error', $result['message']);
    }
}
