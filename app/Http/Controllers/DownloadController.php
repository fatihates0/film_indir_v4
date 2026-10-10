<?php

namespace App\Http\Controllers;

use App\Models\DownloadTicket;
use App\Models\MediaFile;
use App\Models\SubscriptionPeriod;
use App\Models\User;
use App\Services\IpVpsDetectionService;
use App\Services\StorageGatewayService;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class DownloadController extends Controller
{
    public function __construct(
        protected SubscriptionService $subscriptionService,
        protected StorageGatewayService $gatewayService,
        protected IpVpsDetectionService $vpsDetectionService
    ) {}

    /**
     * Prepare a secure download ticket for the given media file.
     */
    public function prepare(Request $request, MediaFile $mediaFile): JsonResponse
    {
        $user = Auth::user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'code' => 'UNAUTHENTICATED',
                'message' => 'Dosya indirmek için lütfen giriş yapınız.',
            ], 401);
        }

        // Check if user has available quota or is admin
        if (! $user->canDownload()) {
            return response()->json([
                'success' => false,
                'code' => 'QUOTA_EXHAUSTED',
                'message' => 'Aylık indirme kotanız tükenmiştir veya aktif bir paketiniz bulunmamaktadır. Lütfen paketinizi yükseltin veya yenileyin.',
            ], 403);
        }

        // Check if user has reached max parallel (concurrent different files) download limit
        if (! $user->isAdmin() && ! $this->subscriptionService->canStartParallelDownload($user, $mediaFile->id)) {
            $maxParallel = $this->subscriptionService->getMaxParallelDownloads($user);
            $activeParallel = $this->subscriptionService->getActiveParallelDownloadsCount($user);

            return response()->json([
                'success' => false,
                'code' => 'PARALLEL_LIMIT_EXCEEDED',
                'message' => "Paketiniz aynı anda en fazla {$maxParallel} farklı dosya indirmenize izin vermektedir. (Şu an aktif: {$activeParallel} dosya). Lütfen devam eden indirmelerinizin tamamlanmasını bekleyin.",
                'max_parallel_downloads' => $maxParallel,
                'active_parallel_downloads' => $activeParallel,
            ], 403);
        }

        $activePeriod = $this->subscriptionService->getCurrentPeriod($user);
        $totalRemaining = $this->subscriptionService->getTotalRemainingBytes($user);

        // Check if total remaining quota (main period + active extra quotas) is sufficient for this specific media file size
        if (! $user->isAdmin() && $mediaFile->size_bytes > 0) {
            if ($totalRemaining < $mediaFile->size_bytes) {
                $remFormatted = SubscriptionPeriod::formatBytes($totalRemaining);
                $fileSizeFormatted = SubscriptionPeriod::formatBytes($mediaFile->size_bytes);

                return response()->json([
                    'success' => false,
                    'code' => 'INSUFFICIENT_QUOTA',
                    'message' => "Kalan indirme kotanız ({$remFormatted}), indirmek istediğiniz içerik boyutu ({$fileSizeFormatted}) için yeterli değildir. Lütfen paketinizi yükseltin.",
                    'remaining_bytes' => $totalRemaining,
                    'formatted_remaining' => $remFormatted,
                    'file_size_bytes' => $mediaFile->size_bytes,
                    'formatted_file_size' => $fileSizeFormatted,
                ], 403);
            }
        }

        // Generate download ticket valid for 3 hours
        $ticket = DownloadTicket::create([
            'token' => DownloadTicket::generateToken(),
            'user_id' => $user->id,
            'media_file_id' => $mediaFile->id,
            'subscription_period_id' => $activePeriod?->id,
            'bytes_downloaded' => 0,
            'ip_address' => $this->getCleanIp($request),
            'user_agent' => $request->userAgent(),
            'status' => 'pending',
            'expires_at' => now()->addHours(3),
        ]);

        return response()->json([
            'success' => true,
            'token' => $ticket->token,
            'file_name' => $mediaFile->name,
            'size_bytes' => $mediaFile->size_bytes,
            'formatted_size' => $mediaFile->formatted_size,
            'download_url' => route('downloads.stream', ['token' => $ticket->token]),
        ]);
    }

    /**
     * Issue a direct 302 redirect to the Custom Storage Gateway signed HMAC URL.
     */
    public function stream(Request $request, string $token): mixed
    {
        /** @var DownloadTicket|null $ticket */
        $ticket = DownloadTicket::where('token', $token)
            ->with(['mediaFile.storageBox', 'user'])
            ->first();

        if (! $ticket || ! $ticket->isValid()) {
            abort(403, 'Geçersiz veya süresi dolmuş indirme bağlantısı.');
        }

        $user = $ticket->user;
        if (! $user || (! $user->isAdmin() && ! $user->canDownload())) {
            abort(403, 'Aylık indirme kotanız tükenmiş durumdadır.');
        }

        $clientIps = $this->getAllClientIps($request);
        $primaryIp = $this->getCleanIp($request);

        // 1. Blacklist Check (Always Deny - checks all candidate IPv4 and IPv6 addresses)
        if (! empty($clientIps) && $this->vpsDetectionService->isBlacklisted($clientIps)) {
            abort(403, 'IP adresiniz sistem yönetimi tarafından engellenmiştir.');
        }

        // 2. VPS / Datacenter IP restrictions (Skipped if Whitelisted - checks all candidate IPv4 and IPv6 addresses)
        if (! $user->isAdmin() && ! $this->vpsDetectionService->isWhitelisted($clientIps) && ! $this->subscriptionService->allowsVpsAccess($user)) {
            if (! empty($clientIps) && $this->vpsDetectionService->isVpsIp($clientIps)) {
                abort(403, 'Mevcut paketiniz ile VPS / Sunucu IP adreslerinden indirme yapılmasına izin verilmemektedir.');
            }
        }

        // Update ticket IP address with actual streaming client IP
        if ($primaryIp) {
            $ticket->update(['ip_address' => $primaryIp]);
        }

        $mediaFile = $ticket->mediaFile;
        if (! $mediaFile || ! $mediaFile->storageBox) {
            abort(404, 'İstenen medya dosyası veya depolama alanı bulunamadı.');
        }

        // Extra safety: Check remaining quota for new tickets
        if (! $user->isAdmin() && $ticket->bytes_downloaded == 0 && $mediaFile->size_bytes > 0) {
            $totalRemaining = $this->subscriptionService->getTotalRemainingBytes($user);
            if ($totalRemaining < $mediaFile->size_bytes) {
                $remFormatted = SubscriptionPeriod::formatBytes($totalRemaining);
                $fileSizeFormatted = SubscriptionPeriod::formatBytes($mediaFile->size_bytes);
                abort(403, "Kalan indirme kotanız ({$remFormatted}), indirmek istediğiniz içerik boyutu ({$fileSizeFormatted}) için yeterli değildir.");
            }
        }

        // Check if user has reached max parallel download limit
        if (! $user->isAdmin() && ! $this->subscriptionService->canStartParallelDownload($user, $mediaFile->id)) {
            $maxParallel = $this->subscriptionService->getMaxParallelDownloads($user);
            $activeParallel = $this->subscriptionService->getActiveParallelDownloadsCount($user);

            abort(403, "Paketiniz aynı anda en fazla {$maxParallel} farklı dosya indirmenize izin vermektedir. (Şu an aktif: {$activeParallel} dosya). Lütfen devam eden indirmelerinizin tamamlanmasını bekleyin.");
        }

        $box = $mediaFile->storageBox;
        $filename = $mediaFile->name;

        $maxParallel = $this->subscriptionService->getMaxParallelDownloads($user);
        $speedLimitMbps = $this->subscriptionService->getSpeedLimitMbps($user);
        $ticket->update(['status' => 'active']);
        $gatewayUrl = $this->gatewayService->generateGatewayUrl(
            $box,
            $mediaFile->path,
            $user->id,
            180,
            $ticket->token,
            $mediaFile->id,
            $maxParallel,
            $speedLimitMbps
        );

        Log::info("İndirme Başlatıldı: Kullanıcı '{$user->name}' ({$user->email}), '{$filename}' dosyasını 'Storage Gateway' yöntemiyle indirmeyi başlattı.", [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'media_file_id' => $mediaFile->id,
            'file_name' => $filename,
            'storage_box_id' => $box->id,
            'storage_box_name' => $box->name,
            'protocol' => $box->protocol->value,
            'download_method' => 'Custom Storage Gateway (Direct Stream 302)',
            'ip_address' => $request->ip(),
            'ticket_token' => $ticket->token,
        ]);

        return redirect()->away($gatewayUrl, 302);
    }

    /**
     * Internal webhook for Nginx post_action to record bytes transferred.
     */
    public function logBytes(Request $request): JsonResponse
    {
        $token = $request->input('token');
        $bytesSent = (int) $request->input('bytes_sent', 0);
        $isClosed = (bool) ($request->input('closed') || $request->input('is_closed') || $request->input('finished'));

        $this->subscriptionService->recordBytes($token, $bytesSent, $isClosed);

        return response()->json(['status' => 'ok']);
    }

    /**
     * Internal endpoint for Gateway nodes to check real-time parallel download authorization and VPS IP limits.
     */
    public function checkActive(Request $request): JsonResponse
    {
        $token = $request->input('token');
        $userId = $request->input('user_id');
        $mediaFileId = (int) $request->input('media_file_id');

        /** @var DownloadTicket|null $ticket */
        $ticket = null;
        if ($token) {
            $ticket = DownloadTicket::where('token', $token)->with(['user'])->first();
        }

        $user = $ticket?->user ?? ($userId ? User::find($userId) : null);

        // Extract client IPs strictly for the downloading client, NOT the gateway server
        $candidateIp = $request->input('client_ip');
        $clientIps = [];

        if (! empty($candidateIp)) {
            $parts = explode(',', (string) $candidateIp);
            foreach ($parts as $p) {
                $clean = trim(preg_replace('/^::ffff:/i', '', $p));
                if (! empty($clean) && filter_var($clean, FILTER_VALIDATE_IP)) {
                    if (! $this->isCloudflareOrProxyIp($clean)) {
                        $clientIps[] = $clean;
                    }
                }
            }
        }

        // Fallback to ticket's original client IP if gateway didn't supply one
        if (empty($clientIps) && $ticket?->ip_address) {
            $ticketIp = trim(preg_replace('/^::ffff:/i', '', (string) $ticket->ip_address));
            if (! empty($ticketIp) && filter_var($ticketIp, FILTER_VALIDATE_IP) && ! $this->isCloudflareOrProxyIp($ticketIp)) {
                $clientIps[] = $ticketIp;
            }
        }

        // Only fall back to request IPs if neither gateway nor ticket provided one
        if (empty($clientIps)) {
            $clientIps = $this->getAllClientIps($request);
        }

        $primaryIp = ! empty($clientIps) ? $clientIps[0] : $this->getCleanIp($request);

        // 1. Blacklist Check (Always Deny - checks all candidate IPv4 and IPv6 addresses)
        if (! empty($clientIps) && $this->vpsDetectionService->isBlacklisted($clientIps)) {
            return response()->json([
                'allowed' => false,
                'code' => 'IP_BLACKLISTED',
                'message' => 'IP adresiniz sistem yönetimi tarafından engellenmiştir (Blacklist).',
            ], 403);
        }

        if (! $user || $user->isAdmin()) {
            if ($ticket && $primaryIp) {
                $ticket->update(['status' => 'active', 'ip_address' => $primaryIp]);
            }

            return response()->json(['allowed' => true]);
        }

        // 2. VPS / Datacenter IP restrictions (Skipped if Whitelisted - checks all candidate IPv4 and IPv6 addresses)
        if (! $this->vpsDetectionService->isWhitelisted($clientIps) && ! $this->subscriptionService->allowsVpsAccess($user)) {
            if (! empty($clientIps) && $this->vpsDetectionService->isVpsIp($clientIps)) {
                return response()->json([
                    'allowed' => false,
                    'code' => 'VPS_ACCESS_DENIED',
                    'message' => 'Mevcut paketiniz ile VPS / Sunucu IP adreslerinden indirme yapılmasına izin verilmemektedir.',
                ], 403);
            }
        }

        $targetFileId = $mediaFileId ?: ($ticket?->media_file_id ?? 0);

        if (! $this->subscriptionService->canStartParallelDownload($user, $targetFileId)) {
            $maxParallel = $this->subscriptionService->getMaxParallelDownloads($user);
            $activeParallel = $this->subscriptionService->getActiveParallelDownloadsCount($user, $targetFileId);

            return response()->json([
                'allowed' => false,
                'code' => 'PARALLEL_LIMIT_EXCEEDED',
                'message' => "Paketiniz aynı anda en fazla {$maxParallel} farklı dosya indirmenize izin vermektedir. (Şu an aktif: {$activeParallel} dosya). Lütfen devam eden indirmelerinizin tamamlanmasını bekleyin.",
                'max_parallel_downloads' => $maxParallel,
                'active_parallel_downloads' => $activeParallel,
            ], 429);
        }

        if ($ticket) {
            $ticketData = ['status' => 'active'];
            if ($primaryIp) {
                $ticketData['ip_address'] = $primaryIp;
            }
            $ticket->update($ticketData);
        }

        $speedLimitMbps = $this->subscriptionService->getSpeedLimitMbps($user);

        return response()->json([
            'allowed' => true,
            'speed_limit_mbps' => $speedLimitMbps,
        ]);
    }

    /**
     * Extract all candidate client IP addresses (both IPv4 and IPv6) from request headers.
     * Filters out known Cloudflare proxy IPs and returns an array of unique client IPs.
     */
    protected function getAllClientIps(Request $request, ?string $candidateIp = null): array
    {
        $rawIps = [];

        $headersToCheck = ['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip', 'client-ip'];
        foreach ($headersToCheck as $headerName) {
            $headerValue = $request->header($headerName);
            if (! empty($headerValue)) {
                $parts = explode(',', $headerValue);
                foreach ($parts as $p) {
                    $rawIps[] = trim($p);
                }
            }
        }

        if ($candidateIp) {
            $rawIps[] = trim($candidateIp);
        }

        if ($request->ip()) {
            $rawIps[] = trim($request->ip());
        }

        $cleanIps = [];
        foreach ($rawIps as $ip) {
            $clean = trim(preg_replace('/^::ffff:/i', '', $ip));
            if (empty($clean)) {
                continue;
            }

            if (filter_var($clean, FILTER_VALIDATE_IP)) {
                if (! $this->isCloudflareOrProxyIp($clean)) {
                    $cleanIps[] = $clean;
                }
            }
        }

        return array_values(array_unique($cleanIps));
    }

    /**
     * Extract primary clean client IP address (prefers IPv4, falls back to IPv6).
     */
    protected function getCleanIp(Request $request, ?string $candidateIp = null): string
    {
        $allIps = $this->getAllClientIps($request, $candidateIp);

        // Prefer IPv4 for ticket storage if present
        foreach ($allIps as $ip) {
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                return $ip;
            }
        }

        // Fallback to first clean IPv6 or candidate
        if (! empty($allIps[0])) {
            return $allIps[0];
        }

        $fallback = $candidateIp ?: ($request->ip() ?? '');

        return trim(preg_replace('/^::ffff:/i', '', $fallback));
    }

    /**
     * Check if an IP address belongs to Cloudflare's known IPv4 or IPv6 proxy ranges.
     */
    protected function isCloudflareOrProxyIp(string $ip): bool
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $long = ip2long($ip);
            if ($long === false) {
                return false;
            }

            $cfRanges = [
                ['173.245.48.0', '173.245.63.255'],
                ['103.21.244.0', '103.21.247.255'],
                ['103.22.200.0', '103.22.203.255'],
                ['103.31.4.0', '103.31.7.255'],
                ['141.101.64.0', '141.101.127.255'],
                ['108.162.192.0', '108.162.255.255'],
                ['190.93.240.0', '190.93.255.255'],
                ['188.114.96.0', '188.114.111.255'],
                ['197.234.240.0', '197.234.243.255'],
                ['198.41.128.0', '198.41.255.255'],
                ['162.158.0.0', '162.159.255.255'],
                ['104.16.0.0', '104.31.255.255'],
                ['172.64.0.0', '172.71.255.255'],
                ['131.0.72.0', '131.0.75.255'],
            ];

            foreach ($cfRanges as [$start, $end]) {
                if ($long >= ip2long($start) && $long <= ip2long($end)) {
                    return true;
                }
            }

            return false;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $cfIpv6Cidrs = [
                '2400:cb00::/32',
                '2606:4700::/32',
                '2803:f800::/32',
                '2405:b500::/32',
                '2405:8100::/32',
                '2a06:98c0::/29',
                '2c0f:f248::/32',
            ];

            foreach ($cfIpv6Cidrs as $cidr) {
                if ($this->vpsDetectionService->matchCidr($ip, $cidr)) {
                    return true;
                }
            }
        }

        return false;
    }
}
