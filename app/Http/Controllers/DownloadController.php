<?php

namespace App\Http\Controllers;

use App\Models\DownloadTicket;
use App\Models\MediaFile;
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
        protected StorageGatewayService $gatewayService
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

        $activePeriod = $this->subscriptionService->getCurrentPeriod($user);

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

        $mediaFile = $ticket->mediaFile;
        if (! $mediaFile || ! $mediaFile->storageBox) {
            abort(404, 'İstenen medya dosyası veya depolama alanı bulunamadı.');
        }

        $box = $mediaFile->storageBox;
        $filename = $mediaFile->name;

        $ticket->update(['status' => 'active']);
        $gatewayUrl = $this->gatewayService->generateGatewayUrl($box, $mediaFile->path, $user->id, 180, $ticket->token);

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

        if (! $token || $bytesSent <= 0) {
            return response()->json(['status' => 'ignored'], 200);
        }

        $this->subscriptionService->recordBytes($token, $bytesSent);

        return response()->json(['status' => 'ok']);
    }
}
