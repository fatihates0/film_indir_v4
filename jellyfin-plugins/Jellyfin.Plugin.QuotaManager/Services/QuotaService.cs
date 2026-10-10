using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Data.Enums;
using Jellyfin.Plugin.QuotaManager.Configuration;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Session;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.QuotaManager.Services
{
    public class QuotaService
    {
        private readonly IUserManager _userManager;
        private readonly ISessionManager _sessionManager;
        private readonly ILogger<QuotaService> _logger;
        private readonly HttpClient _httpClient;
        private readonly object _lock = new object();
        private DateTime _lastConfigSave = DateTime.MinValue;

        public QuotaService(
            IUserManager userManager,
            ISessionManager sessionManager,
            ILogger<QuotaService> logger,
            IHttpClientFactory httpClientFactory)
        {
            _userManager = userManager;
            _sessionManager = sessionManager;
            _logger = logger;
            _httpClient = httpClientFactory.CreateClient("QuotaManager");
            _httpClient.Timeout = TimeSpan.FromSeconds(8);

            if (Plugin.Instance != null)
            {
                Plugin.Instance.QuotaService = this;
            }
        }

        /// <summary>
        /// Kullanıcının paket ve kalan kota durumunu Laravel API üzerinden canlı sorgular.
        /// </summary>
        public async Task<AccessCheckResult> CheckUserAccessAsync(string username)
        {
            var config = Plugin.Instance?.Configuration;
            if (config == null || string.IsNullOrWhiteSpace(config.LaravelApiUrl))
            {
                if (config?.BlockPlaybackOnApiFailure ?? true)
                {
                    return new AccessCheckResult
                    {
                        Allowed = false,
                        Reason = "not_configured",
                        HasPackage = false,
                        Message = "Laravel API adresi yapılandırılmamış. Yayın başlatılamaz."
                    };
                }

                return new AccessCheckResult
                {
                    Allowed = true,
                    Reason = "fallback_allowed",
                    HasPackage = true,
                    RemainingBytes = 999999999999999,
                    Message = "API yapılandırılmamış, izin verildi."
                };
            }

            try
            {
                string url = $"{config.LaravelApiUrl.TrimEnd('/')}/check-access?username={Uri.EscapeDataString(username)}";
                using var request = new HttpRequestMessage(HttpMethod.Get, url);

                if (!string.IsNullOrWhiteSpace(config.LaravelApiKey))
                {
                    request.Headers.Add("X-Api-Key", config.LaravelApiKey);
                }

                using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<AccessCheckResult>();
                    if (result != null)
                    {
                        return result;
                    }
                }
                else
                {
                    _logger.LogWarning("Laravel check-access API HTTP {StatusCode} döndürdü ({Username}).", response.StatusCode, username);
                    
                    try
                    {
                        var errorResult = await response.Content.ReadFromJsonAsync<AccessCheckResult>();
                        if (errorResult != null)
                        {
                            return errorResult;
                        }
                    }
                    catch
                    {
                        // JSON ayrıştırılamadıysa varsayılan hata sonucuna geç
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Laravel check-access API çağrısında hata oluştu ({Username}).", username);
            }

            // Hata durumunda güvenlik kuralı
            if (config?.BlockPlaybackOnApiFailure ?? true)
            {
                return new AccessCheckResult
                {
                    Allowed = false,
                    Reason = "api_error",
                    HasPackage = false,
                    Message = "Abonelik ve kota sorgulama sunucusuna ulaşılamadı. Yayın başlatılamıyor."
                };
            }

            return new AccessCheckResult
            {
                Allowed = true,
                Reason = "api_error_fallback",
                HasPackage = true,
                RemainingBytes = 999999999999999,
                Message = "API hatası sonrası geçici izin verildi."
            };
        }

        /// <summary>
        /// Oynatılan veriyi Laravel sunucusundaki kullanıcı kotasından düşer.
        /// </summary>
        public async Task<DeductQuotaResult?> DeductQuotaAsync(string username, long bytesTransferred)
        {
            if (bytesTransferred <= 0)
            {
                return null;
            }

            var config = Plugin.Instance?.Configuration;
            if (config == null || string.IsNullOrWhiteSpace(config.LaravelApiUrl))
            {
                return null;
            }

            try
            {
                string url = $"{config.LaravelApiUrl.TrimEnd('/')}/deduct-quota";
                var payload = new { username = username, bytes = bytesTransferred };
                using var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = JsonContent.Create(payload)
                };

                if (!string.IsNullOrWhiteSpace(config.LaravelApiKey))
                {
                    request.Headers.Add("X-Api-Key", config.LaravelApiKey);
                }

                using var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<DeductQuotaResult>();
                    if (result != null)
                    {
                        _logger.LogInformation("Kullanıcı {Username} kotasından {MB} MB düşüldü. Kalan: {RemainingMB} MB",
                            username,
                            Math.Round((double)bytesTransferred / (1024 * 1024), 2),
                            Math.Round((double)result.RemainingBytes / (1024 * 1024), 2));

                        if (result.QuotaExhausted)
                        {
                            _logger.LogWarning("Kullanıcı {Username} kotası tükendi! (Laravel yanıtı)", username);
                        }

                        return result;
                    }
                }
                else
                {
                    _logger.LogWarning("Laravel deduct-quota API HTTP {StatusCode} döndürdü ({Username}, {Bytes} bytes).",
                        response.StatusCode, username, bytesTransferred);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Laravel deduct-quota API çağrısında hata oluştu ({Username}).", username);
            }

            return null;
        }

        /// <summary>
        /// Yerel kullanıcı kota konfigürasyonunu döner veya yenisini oluşturur.
        /// </summary>
        public UserQuotaConfig GetOrCreateUserQuota(Guid userId, string username)
        {
            lock (_lock)
            {
                var config = Plugin.Instance?.Configuration;
                if (config == null)
                {
                    return new UserQuotaConfig { UserId = userId, Username = username };
                }

                var userQuota = config.UserQuotas.FirstOrDefault(u => u.UserId == userId);
                if (userQuota == null)
                {
                    userQuota = new UserQuotaConfig
                    {
                        UserId = userId,
                        Username = username,
                        HasPackage = true,
                        MaxBytes = (long)config.DefaultQuotaGB * 1024 * 1024 * 1024,
                        UsedBytes = 0,
                        CycleStartDate = DateTime.UtcNow,
                        CycleEndDate = DateTime.UtcNow.AddMonths(1)
                    };
                    config.UserQuotas.Add(userQuota);
                    Plugin.Instance?.SaveConfiguration();
                }

                return userQuota;
            }
        }

        /// <summary>
        /// Yerel kullanım miktarını günceller (aşırı disk I/O yapmadan).
        /// </summary>
        public void RecordLocalUsage(Guid userId, string username, long bytesTransferred)
        {
            if (bytesTransferred <= 0)
            {
                return;
            }

            lock (_lock)
            {
                var quota = GetOrCreateUserQuota(userId, username);
                quota.UsedBytes += bytesTransferred;

                if (quota.UsedBytes >= quota.MaxBytes && !quota.IsExceeded)
                {
                    quota.IsExceeded = true;
                    _logger.LogWarning("Kullanıcı {Username} yerel trafik kotasını aştı! ({UsedGB} GB / {MaxGB} GB)",
                        username, quota.UsedGB, quota.MaxGB);
                }

                // Diske yalnızca 3 dakikada bir kaydet (performans koruması)
                if ((DateTime.UtcNow - _lastConfigSave).TotalMinutes >= 3)
                {
                    _lastConfigSave = DateTime.UtcNow;
                    Plugin.Instance?.SaveConfiguration();
                }
            }
        }

        /// <summary>
        /// Kotası dolan kullanıcı için yapılandırılmış yaptırımları uygular.
        /// </summary>
        public async Task EnforceQuotaExceededAsync(UserQuotaConfig userQuota)
        {
            var config = Plugin.Instance?.Configuration;
            if (config == null)
            {
                return;
            }

            var user = _userManager.GetUserById(userQuota.UserId);
            if (user == null)
            {
                return;
            }

            // 1. Aktif oturumları kapat / yayını durdur
            if (config.EnableSessionTermination)
            {
                var userSessions = _sessionManager.Sessions.Where(s => s.UserId == userQuota.UserId).ToList();
                foreach (var session in userSessions)
                {
                    try
                    {
                        _logger.LogInformation("Kullanıcı {Username} oturumu kota dolması sebebiyle durduruluyor.", userQuota.Username);
                        
                        await _sessionManager.SendPlaystateCommand(
                            session.Id,
                            session.Id,
                            new PlaystateRequest { Command = PlaystateCommand.Stop },
                            CancellationToken.None);

                        try
                        {
                            await _sessionManager.SendMessageCommand(
                                session.Id,
                                session.Id,
                                new MessageCommand { Header = "Kota Doldu", Text = "İzleme kotanız tükendiği için yayın sonlandırıldı.", TimeoutMs = 7000 },
                                CancellationToken.None);
                        }
                        catch
                        {
                            // İstemci diyalog desteklemiyor olabilir
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Oturum durdurma hatası ({SessionId}).", session.Id);
                    }
                }
            }

            // 2. Hesabı Jellyfin üzerinde devre dışı bırak
            if (config.EnableAutoDisable)
            {
                _logger.LogInformation("Kullanıcı {Username} Jellyfin hesabı pasife alınıyor (IsDisabled = true).", userQuota.Username);
                user.SetPermission(PermissionKind.IsDisabled, true);
                await _userManager.UpdateUserAsync(user);
            }

            // 3. Laravel API'ye bildirim gönder
            await SendQuotaExceededWebhookAsync(userQuota);
        }

        /// <summary>
        /// Laravel API ile tüm kullanıcı kotalarını senkronize eder.
        /// </summary>
        public async Task SyncWithLaravelAsync()
        {
            var config = Plugin.Instance?.Configuration;
            if (config == null || string.IsNullOrWhiteSpace(config.LaravelApiUrl))
            {
                return;
            }

            try
            {
                _logger.LogInformation("Laravel API ile kullanıcı kotaları senkronize ediliyor...");

                string url = $"{config.LaravelApiUrl.TrimEnd('/')}/quotas";
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                if (!string.IsNullOrWhiteSpace(config.LaravelApiKey))
                {
                    request.Headers.Add("X-Api-Key", config.LaravelApiKey);
                }

                using var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var payload = await response.Content.ReadFromJsonAsync<List<LaravelUserQuotaSyncDto>>();
                    if (payload != null)
                    {
                        foreach (var item in payload)
                        {
                            var user = _userManager.Users.FirstOrDefault(u =>
                                u.Username.Equals(item.Username, StringComparison.OrdinalIgnoreCase) ||
                                (!string.IsNullOrEmpty(item.Email) && u.Username.Equals(item.Email, StringComparison.OrdinalIgnoreCase)) ||
                                u.Id == item.UserId);

                            if (user != null)
                            {
                                lock (_lock)
                                {
                                    var quota = GetOrCreateUserQuota(user.Id, user.Username);
                                    quota.HasPackage = item.HasPackage;
                                    quota.MaxBytes = item.MaxBytes;
                                    quota.UsedBytes = item.UsedBytes;
                                    quota.CycleStartDate = item.CycleStartDate;
                                    quota.CycleEndDate = item.CycleEndDate;
                                    quota.LastSyncTime = DateTime.UtcNow;

                                    // Kotası veya paketi yenilendiyse pasif kullanıcıyı yeniden aktifleştir
                                    if (item.HasPackage && (item.MaxBytes - item.UsedBytes) > 0 && user.HasPermission(PermissionKind.IsDisabled) && quota.IsExceeded)
                                    {
                                        quota.IsExceeded = false;
                                        user.SetPermission(PermissionKind.IsDisabled, false);
                                        _ = _userManager.UpdateUserAsync(user);
                                        _logger.LogInformation("Kullanıcı {Username} kotası/paketi yenilendiği için hesabı tekrar aktifleştirildi.", user.Username);
                                    }
                                }
                            }
                        }

                        Plugin.Instance?.SaveConfiguration();
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Laravel API senkronizasyon hatası.");
            }
        }

        private async Task SendQuotaExceededWebhookAsync(UserQuotaConfig userQuota)
        {
            var config = Plugin.Instance?.Configuration;
            if (config == null || string.IsNullOrWhiteSpace(config.LaravelApiUrl))
            {
                return;
            }

            try
            {
                var payload = new
                {
                    event_type = "quota_exceeded",
                    user_id = userQuota.UserId,
                    username = userQuota.Username,
                    used_bytes = userQuota.UsedBytes,
                    max_bytes = userQuota.MaxBytes,
                    timestamp = DateTime.UtcNow
                };

                using var request = new HttpRequestMessage(HttpMethod.Post, $"{config.LaravelApiUrl.TrimEnd('/')}/quota-exceeded")
                {
                    Content = JsonContent.Create(payload)
                };

                if (!string.IsNullOrWhiteSpace(config.LaravelApiKey))
                {
                    request.Headers.Add("X-Api-Key", config.LaravelApiKey);
                }

                await _httpClient.SendAsync(request);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Laravel webhook bildirimi gönderilemedi.");
            }
        }
    }

    public class AccessCheckResult
    {
        [JsonPropertyName("allowed")]
        public bool Allowed { get; set; }

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("has_package")]
        public bool HasPackage { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("remaining_bytes")]
        public long RemainingBytes { get; set; }
    }

    public class DeductQuotaResult
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("deducted_bytes")]
        public long DeductedBytes { get; set; }

        [JsonPropertyName("remaining_bytes")]
        public long RemainingBytes { get; set; }

        [JsonPropertyName("quota_exhausted")]
        public bool QuotaExhausted { get; set; }
    }

    public class LaravelUserQuotaSyncDto
    {
        [JsonPropertyName("user_id")]
        public Guid UserId { get; set; }

        [JsonPropertyName("username")]
        public string Username { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("is_admin")]
        public bool IsAdmin { get; set; }

        [JsonPropertyName("has_package")]
        public bool HasPackage { get; set; }

        [JsonPropertyName("max_bytes")]
        public long MaxBytes { get; set; }

        [JsonPropertyName("used_bytes")]
        public long UsedBytes { get; set; }

        [JsonPropertyName("remaining_bytes")]
        public long RemainingBytes { get; set; }

        [JsonPropertyName("cycle_start_date")]
        public DateTime CycleStartDate { get; set; }

        [JsonPropertyName("cycle_end_date")]
        public DateTime CycleEndDate { get; set; }
    }
}
