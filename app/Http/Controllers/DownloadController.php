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
            'ip_address' => $request->ip(),
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

        // Check VPS / Datacenter IP restrictions
        if (! $user->isAdmin() && ! $this->subscriptionService->allowsVpsAccess($user)) {
            $clientIp = $request->ip();
            if ($clientIp && $this->vpsDetectionService->isVpsIp($clientIp)) {
                abort(403, 'Mevcut paketiniz ile VPS / Sunucu IP adreslerinden indirme yapılmasına izin verilmemektedir.');
            }
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
        $clientIp = $request->input('client_ip') ?: $request->ip();

        /** @var DownloadTicket|null $ticket */
        $ticket = null;
        if ($token) {
            $ticket = DownloadTicket::where('token', $token)->with(['user'])->first();
        }

        $user = $ticket?->user ?? ($userId ? User::find($userId) : null);

        if (! $user || $user->isAdmin()) {
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
            $ticket->update(['status' => 'active']);
        }

        $speedLimitMbps = $this->subscriptionService->getSpeedLimitMbps($user);

        return response()->json([
            'allowed' => true,
            'speed_limit_mbps' => $speedLimitMbps,
        ]);
    }
}
