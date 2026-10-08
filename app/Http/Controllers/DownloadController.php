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

        // Check if remaining quota is sufficient for this specific media file size
        if (! $user->isAdmin() && $mediaFile->size_bytes > 0 && $activePeriod) {
            if ($activePeriod->remaining_bytes < $mediaFile->size_bytes) {
                $remFormatted = SubscriptionPeriod::formatBytes($activePeriod->remaining_bytes);
                $fileSizeFormatted = SubscriptionPeriod::formatBytes($mediaFile->size_bytes);

                return response()->json([
                    'success' => false,
                    'code' => 'INSUFFICIENT_QUOTA',
                    'message' => "Kalan indirme kotanız ({$remFormatted}), indirmek istediğiniz içerik boyutu ({$fileSizeFormatted}) için yeterli değildir. Lütfen paketinizi yükseltin.",
                    'remaining_bytes' => $activePeriod->remaining_bytes,
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

        $clientIp = $this->getCleanIp($request);

        // Check VPS / Datacenter IP restrictions
        if (! $user->isAdmin() && ! $this->subscriptionService->allowsVpsAccess($user)) {
            if ($clientIp && $this->vpsDetectionService->isVpsIp($clientIp)) {
                abort(403, 'Mevcut paketiniz ile VPS / Sunucu IP adreslerinden indirme yapılmasına izin verilmemektedir.');
            }
        }

        // Update ticket IP address with actual streaming client IP
        if ($clientIp) {
            $ticket->update(['ip_address' => $clientIp]);
        }

        $mediaFile = $ticket->mediaFile;
        if (! $mediaFile || ! $mediaFile->storageBox) {
            abort(404, 'İstenen medya dosyası veya depolama alanı bulunamadı.');
        }

        // Extra safety: Check remaining quota for new tickets
        if (! $user->isAdmin() && $ticket->bytes_downloaded == 0 && $mediaFile->size_bytes > 0) {
            $period = $this->subscriptionService->getCurrentPeriod($user);
            if ($period && $period->remaining_bytes < $mediaFile->size_bytes) {
                $remFormatted = SubscriptionPeriod::formatBytes($period->remaining_bytes);
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
        $clientIp = $this->getCleanIp($request, $request->input('client_ip'));

        /** @var DownloadTicket|null $ticket */
        $ticket = null;
        if ($token) {
            $ticket = DownloadTicket::where('token', $token)->with(['user'])->first();
        }

        $user = $ticket?->user ?? ($userId ? User::find($userId) : null);

        if (! $user || $user->isAdmin()) {
            if ($ticket && $clientIp) {
                $ticket->update(['status' => 'active', 'ip_address' => $clientIp]);
            }

            return response()->json(['allowed' => true]);
        }

        // Check VPS / Datacenter IP restrictions
        if (! $this->subscriptionService->allowsVpsAccess($user)) {
            if ($clientIp && $this->vpsDetectionService->isVpsIp($clientIp)) {
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
            if ($clientIp) {
                $ticketData['ip_address'] = $clientIp;
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
     * Extract a clean IPv4 address from request headers or candidate IP.
     * Strips IPv4-mapped IPv6 prefixes (::ffff:), filters out Cloudflare proxy IPs, and prefers real client IPv4.
     */
    protected function getCleanIp(Request $request, ?string $candidateIp = null): string
    {
        $headersToCheck = ['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip', 'client-ip'];
        foreach ($headersToCheck as $headerName) {
            $headerValue = $request->header($headerName);
            if (! empty($headerValue)) {
                $ips = explode(',', $headerValue);
                foreach ($ips as $ip) {
                    $clean = trim(preg_replace('/^::ffff:/i', '', $ip));
                    if (filter_var($clean, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                        if (! $this->isCloudflareOrProxyIp($clean)) {
                            return $clean;
                        }
                    }
                }
            }
        }

        if ($candidateIp) {
            $cleanCandidate = trim(preg_replace('/^::ffff:/i', '', $candidateIp));
            if (filter_var($cleanCandidate, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                if (! $this->isCloudflareOrProxyIp($cleanCandidate)) {
                    return $cleanCandidate;
                }
            }
        }

        $directIp = trim(preg_replace('/^::ffff:/i', '', $request->ip() ?? ''));
        if (filter_var($directIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            if (! $this->isCloudflareOrProxyIp($directIp)) {
                return $directIp;
            }
        }

        return $candidateIp ? trim(preg_replace('/^::ffff:/i', '', $candidateIp)) : $directIp;
    }

    /**
     * Check if an IP address belongs to Cloudflare's known IPv4 proxy ranges.
     */
    protected function isCloudflareOrProxyIp(string $ip): bool
    {
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
}
