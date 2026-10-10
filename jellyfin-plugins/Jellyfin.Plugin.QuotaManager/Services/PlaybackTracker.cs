using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.QuotaManager.Services;
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

        // Active session tracking state: SessionId -> (LastPositionTicks, LastCheckTime)
        private readonly ConcurrentDictionary<string, (long PositionTicks, DateTime Timestamp)> _sessionTicks 
            = new ConcurrentDictionary<string, (long, DateTime)>();

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

        private async void OnPlaybackStart(object? sender, PlaybackProgressEventArgs e)
        {
            try
            {
                if (e.Session == null || e.Session.UserId.Equals(Guid.Empty) || string.IsNullOrEmpty(e.Session.UserName))
                {
                    return;
                }

                var username = e.Session.UserName;
                var sessionId = e.Session.Id;

                var accessCheck = await _quotaService.CheckUserAccessAsync(username);
                if (!accessCheck.Allowed)
                {
                    _logger.LogWarning("Kullanıcı {Username} paket/kota yetersizliği sebebiyle yayını başlatılamadı ({Reason}): {Message}",
                        username, accessCheck.Reason, accessCheck.Message);

                    // Stop playback immediately on client
                    await _sessionManager.SendPlaystateCommand(
                        sessionId,
                        sessionId,
                        new PlaystateRequest { Command = PlaystateCommand.Stop },
                        default);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PlaybackStart erişim kontrolü esnasında hata oluştu.");
            }
        }

        private void OnPlaybackProgress(object? sender, PlaybackProgressEventArgs e)
        {
            try
            {
                if (e.Session == null || e.Session.UserId.Equals(Guid.Empty) || string.IsNullOrEmpty(e.Session.UserName))
                {
                    return;
                }

                var sessionId = e.Session.Id;
                var currentTicks = e.PlaybackPositionTicks ?? 0;
                var now = DateTime.UtcNow;

                if (_sessionTicks.TryGetValue(sessionId, out var lastState))
                {
                    long elapsedTicks = currentTicks - lastState.PositionTicks;
                    
                    // Only process positive progress forward (ignore backwards seeking)
                    if (elapsedTicks > 0)
                    {
                        double elapsedSeconds = (double)elapsedTicks / TimeSpan.TicksPerSecond;
                        
                        // Determine stream bitrate (in bits per second)
                        int bitrate = e.Session.TranscodingInfo?.Bitrate 
                                     ?? e.Item?.GetMediaSources(false)?.FirstOrDefault()?.Bitrate 
                                     ?? 8_000_000; // Default fallback to 8 Mbps if unknown

                        if (bitrate <= 0) bitrate = 8_000_000;

                        // Calculate bytes transferred: (bitrate / 8) * elapsedSeconds
                        long bytesTransferred = (long)((bitrate / 8.0) * elapsedSeconds);

                        if (bytesTransferred > 0)
                        {
                            _quotaService.AddBytesUsed(e.Session.UserId, e.Session.UserName, bytesTransferred);
                        }
                    }
                }

                _sessionTicks[sessionId] = (currentTicks, now);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PlaybackProgress takibi esnasında hata oluştu.");
            }
        }

        private void OnPlaybackStopped(object? sender, PlaybackStopEventArgs e)
        {
            if (e.Session != null && !string.IsNullOrEmpty(e.Session.Id))
            {
                _sessionTicks.TryRemove(e.Session.Id, out _);
            }
        }
    }
}
