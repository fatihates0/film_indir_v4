<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\JellyfinServer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JellyfinServerController extends Controller
{
    public function index(): Response
    {
        // Eğer tabloda hiç sunucu yoksa ve .env içinde config tanımlıysa otomatik 1 adet aktar
        if (JellyfinServer::count() === 0) {
            $envUrl = config('services.jellyfin.url');
            $envKey = config('services.jellyfin.api_key');
            if (! empty($envUrl) && ! empty($envKey)) {
                $created = JellyfinServer::create([
                    'name' => 'Varsayılan Jellyfin Sunucusu',
                    'url' => rtrim($envUrl, '/'),
                    'public_url' => rtrim($envUrl, '/'),
                    'api_key' => $envKey,
                    'is_active' => true,
                    'notes' => '.env dosyasından otomatik aktarıldı.',
                ]);
                $created->testConnection();
            }
        }

        $servers = JellyfinServer::orderByDesc('is_active')
            ->orderBy('id')
            ->get()
            ->map(function (JellyfinServer $server) {
                return [
                    'id' => $server->id,
                    'name' => $server->name,
                    'url' => $server->url,
                    'public_url' => $server->public_url,
                    'effective_public_url' => $server->effective_public_url,
                    'api_key' => $server->api_key,
                    'masked_api_key' => substr($server->api_key, 0, 6).'...'.substr($server->api_key, -4),
                    'is_active' => $server->is_active,
                    'notes' => $server->notes,
                    'last_status' => $server->last_status,
                    'last_checked_at' => $server->last_checked_at?->diffForHumans(),
                    'cached_users_count' => $server->cached_users_count,
                    'created_at' => $server->created_at->format('d.m.Y H:i'),
                ];
            });

        $totalServers = $servers->count();
        $activeServers = $servers->where('is_active', true)->count();
        $totalUsers = $servers->sum('cached_users_count');
        $avgUsers = $activeServers > 0 ? round($totalUsers / $activeServers, 1) : 0;

        $stats = [
            'total_servers' => $totalServers,
            'active_servers' => $activeServers,
            'total_users' => $totalUsers,
            'avg_users_per_server' => $avgUsers,
        ];

        return Inertia::render('Admin/JellyfinServers/Index', [
            'servers' => $servers,
            'stats' => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'url' => 'required|url|max:255',
            'public_url' => 'nullable|url|max:255',
            'api_key' => 'required|string|max:500',
            'is_active' => 'boolean',
            'notes' => 'nullable|string|max:1000',
            'test_immediately' => 'boolean',
        ]);

        $server = JellyfinServer::create([
            'name' => $validated['name'],
            'url' => rtrim($validated['url'], '/'),
            'public_url' => ! empty($validated['public_url']) ? rtrim($validated['public_url'], '/') : null,
            'api_key' => trim($validated['api_key']),
            'is_active' => $validated['is_active'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ]);

        if (! empty($validated['test_immediately'])) {
            $testResult = $server->testConnection();
            if ($testResult['success']) {
                return redirect()->back()->with('success', "Sunucu başarıyla eklendi ve bağlantı doğrulandı ({$testResult['latency_ms']} ms).");
            }

            return redirect()->back()->with('warning', "Sunucu eklendi fakat bağlantı testi başarısız oldu: {$testResult['message']}");
        }

        return redirect()->back()->with('success', 'Jellyfin sunucusu başarıyla eklendi.');
    }

    public function update(Request $request, JellyfinServer $jellyfinServer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'url' => 'required|url|max:255',
            'public_url' => 'nullable|url|max:255',
            'api_key' => 'required|string|max:500',
            'is_active' => 'boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        $jellyfinServer->update([
            'name' => $validated['name'],
            'url' => rtrim($validated['url'], '/'),
            'public_url' => ! empty($validated['public_url']) ? rtrim($validated['public_url'], '/') : null,
            'api_key' => trim($validated['api_key']),
            'is_active' => $validated['is_active'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', "{$jellyfinServer->name} sunucu bilgileri güncellendi.");
    }

    public function destroy(JellyfinServer $jellyfinServer)
    {
        $name = $jellyfinServer->name;
        $jellyfinServer->delete();

        return redirect()->back()->with('success', "{$name} sunucusu sistemden silindi.");
    }

    public function toggle(JellyfinServer $jellyfinServer)
    {
        $jellyfinServer->update([
            'is_active' => ! $jellyfinServer->is_active,
        ]);

        $status = $jellyfinServer->is_active ? 'etkinleştirildi' : 'devre dışı bırakıldı';

        return redirect()->back()->with('success', "{$jellyfinServer->name} sunucusu {$status}.");
    }

    public function test(JellyfinServer $jellyfinServer)
    {
        $result = $jellyfinServer->testConnection();

        if ($result['success']) {
            return redirect()->back()->with('success', "{$jellyfinServer->name} bağlantısı başarılı ({$result['latency_ms']} ms, {$result['users_count']} kullanıcı).");
        }

        return redirect()->back()->with('error', "{$jellyfinServer->name} bağlantı hatası: {$result['message']}");
    }

    public function testAll()
    {
        $servers = JellyfinServer::where('is_active', true)->get();
        $successCount = 0;
        $failCount = 0;

        foreach ($servers as $server) {
            $res = $server->testConnection();
            if ($res['success']) {
                $successCount++;
            } else {
                $failCount++;
            }
        }

        return redirect()->back()->with('success', "Bağlantı taraması tamamlandı: {$successCount} başarılı, {$failCount} başarısız.");
    }
}
