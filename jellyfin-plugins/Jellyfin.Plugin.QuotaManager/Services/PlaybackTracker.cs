using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.QuotaManager.Configuration;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Session;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.QuotaManager.Services
{
    public class PlaybackTracker : IHostedService
    {
        private readonly ISessionManager _sessionManager;
        private readonly QuotaService _quotaService;
        private readonly ILogger<PlaybackTracker> _logger;

        // Aktif oynatılan oturumların durum takibi: SessionId -> TrackedPlaybackSession
        private readonly ConcurrentDictionary<string, TrackedPlaybackSession> _activeSessions
            = new ConcurrentDictionary<string, TrackedPlaybackSession>();

        // İzni reddedilmiş oturumlar: SessionId -> Red Sebebi
        private readonly ConcurrentDictionary<string, string> _deniedSessions
            = new ConcurrentDictionary<string, string>();

        // Başlatılmakta olan oturumlar (race condition koruması)
        private readonly ConcurrentDictionary<string, byte> _startingSessions
            = new ConcurrentDictionary<string, byte>();

        public PlaybackTracker(
            ISessionManager sessionManager,
            QuotaService quotaService,
            ILogger<PlaybackTracker> logger)
        {
            _sessionManager = sessionManager;
            _quotaService = quotaService;
            _logger = logger;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _sessionManager.PlaybackStart += OnPlaybackStart;
            _sessionManager.PlaybackProgress += OnPlaybackProgress;
            _sessionManager.PlaybackStopped += OnPlaybackStopped;
            _logger.LogInformation("Jellyfin QuotaManager PlaybackTracker başlatıldı ve oynatma dinleyicileri bağlandı.");
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _sessionManager.PlaybackStart -= OnPlaybackStart;
            _sessionManager.PlaybackProgress -= OnPlaybackProgress;
            _sessionManager.PlaybackStopped -= OnPlaybackStopped;
            return Task.CompletedTask;
        }

        /// <summary>
        /// Kullanıcı bir medya içeriğini oynatmaya başladığında tetiklenir.
        /// Canlı olarak Laravel API'ye paket ve kota sorgusu gönderilir.
        /// </summary>
        private async void OnPlaybackStart(object? sender, PlaybackProgressEventArgs e)
        {
            if (e.Session == null || e.Session.UserId.Equals(Guid.Empty) || string.IsNullOrEmpty(e.Session.UserName))
            {
                return;
            }

            var username = e.Session.UserName;
            var sessionId = e.Session.Id;

            // Aynı oturum için eşzamanlı erişim denetimi yapılmasını engelle
            if (!_startingSessions.TryAdd(sessionId, 0))
            {
                return;
            }

            try
            {
                _logger.LogInformation("Kullanıcı {Username} bir içerik başlatıyor (Oturum: {SessionId}). Laravel erişim denetimi yapılıyor...", username, sessionId);

                // 1. Laravel üzerinden canlı paket ve kota kontrolü
                var accessCheck = await _quotaService.CheckUserAccessAsync(username);

                if (!accessCheck.Allowed)
                {
                    _logger.LogWarning("Kullanıcı {Username} erişimi REDDEDİLDİ ({Reason}): {Message}",
                        username, accessCheck.Reason, accessCheck.Message);

                    // Bu oturumu reddedilenler listesine ekle
                    _deniedSessions[sessionId] = accessCheck.Message;

                    // Oynatmayı derhal durdur
                    await _sessionManager.SendPlaystateCommand(
                        sessionId,
                        sessionId,
                        new PlaystateRequest { Command = PlaystateCommand.Stop },
                        CancellationToken.None);

                    // Kullanıcıya ekran bildirimi / hata mesajı gönder
                    try
                    {
                        await _sessionManager.SendMessageCommand(
                            sessionId,
                            sessionId,
                            new MessageCommand
                            {
                                Header = "İzleme İzni Yok",
                                Text = accessCheck.Message,
                                TimeoutMs = 8000
                            },
                            CancellationToken.None);
                    }
                    catch
                    {
                        // Bazı istemciler UI mesaj bildirimlerini desteklemez
                    }

                    return;
                }

                // Erişim onaylandı
                _logger.LogInformation("Kullanıcı {Username} erişimi ONAYLANDI. Kalan kota: {RemainingGB} GB",
                    username,
                    Math.Round((double)accessCheck.RemainingBytes / (1024 * 1024 * 1024), 2));

                _deniedSessions.TryRemove(sessionId, out _);

                var sessionState = new TrackedPlaybackSession
                {
                    SessionId = sessionId,
                    UserId = e.Session.UserId,
                    Username = username,
                    LastPositionTicks = e.PlaybackPositionTicks ?? 0,
                    LastCheckTime = DateTime.UtcNow,
                    AccumulatedBytes = 0,
                    LastSyncTime = DateTime.UtcNow,
                    RemainingBytes = accessCheck.RemainingBytes,
                    IsExhausted = false,
                    IsInitialized = false // İlk gelen progress raporu konumu senkronize edecek
                };

                _activeSessions[sessionId] = sessionState;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PlaybackStart erişim denetimi esnasında beklenmeyen bir hata oluştu.");
            }
            finally
            {
                _startingSessions.TryRemove(sessionId, out _);
            }
        }

        /// <summary>
        /// Oynatma sürerken periyodik olarak tetiklenir (istemciden her 3-10 saniyede bir).
        /// Gerçek veri akışı hesaplanır ve biriktirilerek Laravel'den düşülür.
        /// </summary>
        private void OnPlaybackProgress(object? sender, PlaybackProgressEventArgs e)
        {
            try
            {
                if (e.Session == null || string.IsNullOrEmpty(e.Session.Id) || string.IsNullOrEmpty(e.Session.UserName))
                {
                    return;
                }

                var sessionId = e.Session.Id;

                // Eğer oturum reddedilmişse, istemci tekrar oynatmayı denerse derhal tekrar durdur
                if (_deniedSessions.TryGetValue(sessionId, out var denialReason))
                {
                    _ = _sessionManager.SendPlaystateCommand(
                        sessionId,
                        sessionId,
                        new PlaystateRequest { Command = PlaystateCommand.Stop },
                        CancellationToken.None);
                    return;
                }

                // Oturum aktif listede yoksa (örneğin eklenti yeniden başlatıldıysa)
                if (!_activeSessions.TryGetValue(sessionId, out var sessionState))
                {
                    if (!_startingSessions.ContainsKey(sessionId))
                    {
                        OnPlaybackStart(sender, e);
                    }
                    return;
                }

                if (sessionState.IsExhausted)
                {
                    _ = _sessionManager.SendPlaystateCommand(
                        sessionId,
                        sessionId,
                        new PlaystateRequest { Command = PlaystateCommand.Stop },
                        CancellationToken.None);
                    return;
                }

                var currentTicks = e.PlaybackPositionTicks ?? 0;
                var now = DateTime.UtcNow;

                // 1. İLK KONUM SENKRONİZASYONU (Resume / Başlangıç Koruması):
                // Kullanıcı filme kaldığı yerden (örneğin 15. veya 50. dakikada) devam etse dahi,
                // ilk gelen progress raporu sadece başlangıç konumunu senkronize eder.
                // Geçmiş dakikalar için KESİNLİKLE kota düşülmez.
                if (!sessionState.IsInitialized)
                {
                    sessionState.LastPositionTicks = currentTicks;
                    sessionState.LastCheckTime = now;
                    sessionState.IsInitialized = true;
                    _logger.LogInformation("Kullanıcı {Username} oturumu ({SessionId}) başlangıç/resume konumu {Minutes} dakika ({Ticks} ticks) olarak eşitlendi. İlk senkronizasyonda kota düşülmedi.",
                        sessionState.Username, sessionId, Math.Round((double)currentTicks / (TimeSpan.TicksPerSecond * 60), 2), currentTicks);
                    return;
                }

                long elapsedTicks = currentTicks - sessionState.LastPositionTicks;
                double wallClockSeconds = (now - sessionState.LastCheckTime).TotalSeconds;
                if (wallClockSeconds < 0.01)
                {
                    wallClockSeconds = 0.01;
                }
                sessionState.LastCheckTime = now;

                if (elapsedTicks > 0)
                {
                    double playbackSeconds = (double)elapsedTicks / TimeSpan.TicksPerSecond;

                    // 2. İLERİ SARMA KORUMASI (Anti-Seek Guard):
                    // Kullanıcı videoyu ileri sardığında (örneğin 10 dakika ileri atladığında),
                    // o 10 dakikayı indirip izlememiştir; yalnızca yeni atladığı yerdeki 2-3 saniyelik tampon (buffer) verisini indirmiştir.
                    // Bu sebeple oynatma ilerlemesi gerçek dünyada geçen süreden belirgin derecede fazlaysa, süreyi tampon miktarıyla sınırla.
                    if (playbackSeconds > wallClockSeconds * 2.0)
                    {
                        playbackSeconds = Math.Min(playbackSeconds, Math.Max(wallClockSeconds * 1.5, 3.0));
                    }

                    // Akışın gerçek bitrate değerini belirle (Transcode veya doğrudan oynatma)
                    int bitrate = GetStreamBitrate(e);

                    // Aktarılan bayt miktarı: (bitrate / 8) * geçen saniye
                    long bytesTransferred = (long)((bitrate / 8.0) * playbackSeconds);

                    if (bytesTransferred > 0)
                    {
                        sessionState.AccumulatedBytes += bytesTransferred;
                        sessionState.RemainingBytes -= bytesTransferred;
                        sessionState.LastPositionTicks = currentTicks;

                        // Yerel kota sayacını güncelle (I/O dostu)
                        _quotaService.RecordLocalUsage(sessionState.UserId, sessionState.Username, bytesTransferred);

                        // KOTA TAMAMEN BİTTİ Mİ?
                        if (sessionState.RemainingBytes <= 0)
                        {
                            sessionState.IsExhausted = true;
                            _deniedSessions[sessionId] = "İzleme kotanız dolmuştur.";

                            long toFlush = sessionState.AccumulatedBytes;
                            sessionState.AccumulatedBytes = 0;
                            sessionState.LastSyncTime = now;

                            _ = Task.Run(async () =>
                            {
                                if (toFlush > 0)
                                {
                                    await _quotaService.DeductQuotaAsync(sessionState.Username, toFlush);
                                }
                                await StopExhaustedSessionAsync(sessionId, sessionState.Username, "İzleme kotanız tükendiği için yayın durduruldu.");
                            });

                            return;
                        }

                        // Periyodik toplu bildirim (Batching):
                        // Varsayılan: 15 MB veya 30 saniye birikince Laravel'e gönder
                        var config = Plugin.Instance?.Configuration;
                        long batchThresholdBytes = (long)(config?.BatchDeductThresholdMB ?? 15) * 1024 * 1024;
                        double batchIntervalSeconds = config?.BatchDeductIntervalSeconds ?? 30;

                        if (sessionState.AccumulatedBytes >= batchThresholdBytes || (now - sessionState.LastSyncTime).TotalSeconds >= batchIntervalSeconds)
                        {
                            long toFlush = sessionState.AccumulatedBytes;
                            sessionState.AccumulatedBytes = 0;
                            sessionState.LastSyncTime = now;

                            _ = Task.Run(async () =>
                            {
                                var deductResult = await _quotaService.DeductQuotaAsync(sessionState.Username, toFlush);
                                if (deductResult != null)
                                {
                                    sessionState.RemainingBytes = deductResult.RemainingBytes;

                                    if (deductResult.QuotaExhausted || deductResult.RemainingBytes <= 0)
                                    {
                                        sessionState.IsExhausted = true;
                                        _deniedSessions[sessionId] = "İzleme kotanız dolmuştur.";
                                        await StopExhaustedSessionAsync(sessionId, sessionState.Username, "İzleme kotanız tükendiği için yayın sonlandırıldı.");
                                    }
                                }
                            });
                        }
                    }
                }
                else
                {
                    // Duraklatıldı veya geri sarıldı
                    sessionState.LastPositionTicks = currentTicks;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PlaybackProgress takibi esnasında hata oluştu.");
            }
        }

        /// <summary>
        /// Kullanıcı içeriği durdurduğunda veya video bittiğinde tetiklenir.
        /// Birikmiş son veriler Laravel'e aktarılır ve oturum kapatılır.
        /// </summary>
        private void OnPlaybackStopped(object? sender, PlaybackStopEventArgs e)
        {
            try
            {
                if (e.Session != null && !string.IsNullOrEmpty(e.Session.Id))
                {
                    var sessionId = e.Session.Id;
                    _deniedSessions.TryRemove(sessionId, out _);

                    if (_activeSessions.TryRemove(sessionId, out var sessionState))
                    {
                        if (sessionState.AccumulatedBytes > 0)
                        {
                            long remainingBytes = sessionState.AccumulatedBytes;
                            _logger.LogInformation("Kullanıcı {Username} yayını durdurdu. Kalan son {MB} MB Laravel'e aktarılıyor.",
                                sessionState.Username, Math.Round((double)remainingBytes / (1024 * 1024), 2));

                            _ = Task.Run(async () =>
                            {
                                await _quotaService.DeductQuotaAsync(sessionState.Username, remainingBytes);
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PlaybackStopped işlenirken hata oluştu.");
            }
        }

        /// <summary>
        /// Kotası tükenen oturumu durdurur ve istemciye bilgi mesajı gönderir.
        /// </summary>
        private async Task StopExhaustedSessionAsync(string sessionId, string username, string message)
        {
            _logger.LogWarning("Kullanıcı {Username} kotası dolduğu için oturumu ({SessionId}) sonlandırılıyor.", username, sessionId);

            try
            {
                await _sessionManager.SendPlaystateCommand(
                    sessionId,
                    sessionId,
                    new PlaystateRequest { Command = PlaystateCommand.Stop },
                    CancellationToken.None);

                try
                {
                    await _sessionManager.SendMessageCommand(
                        sessionId,
                        sessionId,
                        new MessageCommand
                        {
                            Header = "Kota Doldu",
                            Text = message,
                            TimeoutMs = 8000
                        },
                        CancellationToken.None);
                }
                catch
                {
                    // Bazı istemciler UI diyalog komutunu desteklemez
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Oturum durdurma esnasında hata ({SessionId}).", sessionId);
            }
        }

        /// <summary>
        /// Farklı Jellyfin sürümlerinde binary uyumsuzluk ve MissingMethodException olmadan güvenli bitrate tespiti yapar.
        /// </summary>
        private int GetStreamBitrate(PlaybackProgressEventArgs e)
        {
            // 1. Transcoding bilgisi
            try
            {
                if (e.Session?.TranscodingInfo?.Bitrate > 0)
                {
                    return e.Session.TranscodingInfo.Bitrate.Value;
                }
            }
            catch { }

            // 2. e.Session.NowPlayingItem (BaseItemDto) MediaSources bilgisi
            try
            {
                var mediaSources = e.Session?.NowPlayingItem?.MediaSources;
                if (mediaSources != null)
                {
                    var firstSource = mediaSources.FirstOrDefault();
                    if (firstSource?.Bitrate != null && firstSource.Bitrate.Value > 0)
                    {
                        return firstSource.Bitrate.Value;
                    }
                }
            }
            catch { }

            // 3. Dosya boyutu ve oynatma süresi
            try
            {
                if (e.Item?.RunTimeTicks > 0)
                {
                    long runtimeTicks = e.Item.RunTimeTicks.Value;
                    long? fileSize = null;

                    var sizeProp = e.Item.GetType().GetProperty("Size");
                    if (sizeProp != null)
                    {
                        fileSize = sizeProp.GetValue(e.Item) as long?;
                    }

                    if (fileSize.HasValue && fileSize.Value > 0)
                    {
                        return (int)((fileSize.Value * 8.0 * TimeSpan.TicksPerSecond) / runtimeTicks);
                    }
                }
            }
            catch { }

            // 4. Refleksiyon ile GetMediaSources çağrısı (Sürüm farkları için koruma)
            try
            {
                if (e.Item != null)
                {
                    var itemType = e.Item.GetType();
                    var method = itemType.GetMethod("GetMediaSources", new[] { typeof(bool) })
                                 ?? itemType.GetMethod("GetMediaSources", Type.EmptyTypes);

                    if (method != null)
                    {
                        var parameters = method.GetParameters().Length == 1 ? new object[] { false } : null;
                        var result = method.Invoke(e.Item, parameters) as System.Collections.IEnumerable;
                        if (result != null)
                        {
                            foreach (var src in result)
                            {
                                var bitrateProp = src?.GetType().GetProperty("Bitrate");
                                if (bitrateProp != null)
                                {
                                    var bVal = bitrateProp.GetValue(src) as int?;
                                    if (bVal.HasValue && bVal.Value > 0)
                                    {
                                        return bVal.Value;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            }
            catch { }

            // 5. Güvenli varsayılan değer: 6 Mbps
            return 6_000_000;
        }
    }

    /// <summary>
    /// Aktif oynatılan bir oturumun veri ve kota durumunu saklayan nesne.
    /// </summary>
    public class TrackedPlaybackSession
    {
        public string SessionId { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public long LastPositionTicks { get; set; }
        public DateTime LastCheckTime { get; set; }
        public long AccumulatedBytes { get; set; }
        public DateTime LastSyncTime { get; set; }
        public long RemainingBytes { get; set; }
        public bool IsExhausted { get; set; }
        public bool IsInitialized { get; set; }
    }
}
