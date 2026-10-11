using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Emby.Plugin.QuotaManager.Configuration;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.Logging;
using MediaBrowser.Model.Session;

namespace Emby.Plugin.QuotaManager.Services
{
    public class QuotaService
    {
        private readonly IUserManager _userManager;
        private readonly ISessionManager _sessionManager;
        private readonly ILogger _logger;
        private readonly HttpClient _httpClient;
        private readonly object _lock = new object();
        private DateTime _lastConfigSave = DateTime.MinValue;

        public QuotaService(
            IUserManager userManager,
            ISessionManager sessionManager,
            ILogger logger,
            IHttpClientFactory? httpClientFactory = null)
        {
            _userManager = userManager;
            _sessionManager = sessionManager;
            _logger = logger;
            _httpClient = httpClientFactory != null ? httpClientFactory.CreateClient("QuotaManager") : new HttpClient();
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
                    _logger.Warn("Laravel check-access API HTTP {0} döndürdü ({1}).", response.StatusCode, username);

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
                _logger.ErrorException("Laravel check-access API çağrısında hata oluştu ({0}).", ex, username);
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
                        _logger.Info("Kullanıcı {0} kotasından {1} MB düşüldü. Kalan: {2} MB",
                            username,
                            Math.Round((double)bytesTransferred / (1024 * 1024), 2),
                            Math.Round((double)result.RemainingBytes / (1024 * 1024), 2));

                        if (result.QuotaExhausted)
                        {
                            _logger.Warn("Kullanıcı {0} kotası tükendi! (Laravel yanıtı)", username);
                        }

                        return result;
                    }
                }
                else
                {
                    _logger.Warn("Laravel deduct-quota API HTTP {0} döndürdü ({1}, {2} bytes).",
                        response.StatusCode, username, bytesTransferred);
                }
            }
            catch (Exception ex)
            {
                _logger.ErrorException("Laravel deduct-quota API çağrısında hata oluştu ({0}).", ex, username);
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
                    _logger.Warn("Kullanıcı {0} yerel trafik kotasını aştı! ({1} GB / {2} GB)",
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

            var user = FindUser(userQuota.UserId, userQuota.Username);
            if (user == null)
            {
                return;
            }

            // 1. Aktif oturumları kapat / yayını durdur
            if (config.EnableSessionTermination)
            {
                var userSessions = _sessionManager.Sessions.Where(s => IsSameUser(s, userQuota.UserId, userQuota.Username)).ToList();
                foreach (var session in userSessions)
                {
                    try
                    {
                        _logger.Info("Kullanıcı {0} oturumu kota dolması sebebiyle durduruluyor.", userQuota.Username);

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
                        _logger.ErrorException("Oturum durdurma hatası ({0}).", ex, session.Id);
                    }
                }
            }

            // 2. Hesabı Emby üzerinde devre dışı bırak
            if (config.EnableAutoDisable)
            {
                _logger.Info("Kullanıcı {0} Emby hesabı pasife alınıyor.", userQuota.Username);
                SetUserDisabled(user, true);
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
                _logger.Info("Laravel API ile kullanıcı kotaları senkronize ediliyor...");

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
                            var user = FindUser(item.UserId, item.Username) ?? (string.IsNullOrEmpty(item.Email) ? null : FindUser(Guid.Empty, item.Email));

                            if (user != null)
                            {
                                var userId = GetUserId(user);
                                var username = GetUsername(user);

                                lock (_lock)
                                {
                                    var quota = GetOrCreateUserQuota(userId, username);
                                    quota.HasPackage = item.HasPackage;
                                    quota.MaxBytes = item.MaxBytes;
                                    quota.UsedBytes = item.UsedBytes;
                                    quota.CycleStartDate = item.CycleStartDate;
                                    quota.CycleEndDate = item.CycleEndDate;
                                    quota.LastSyncTime = DateTime.UtcNow;

                                    // Kotası veya paketi yenilendiyse pasif kullanıcıyı yeniden aktifleştir
                                    if (item.HasPackage && (item.MaxBytes - item.UsedBytes) > 0 && IsUserDisabled(user) && quota.IsExceeded)
                                    {
                                        quota.IsExceeded = false;
                                        SetUserDisabled(user, false);
                                        _logger.Info("Kullanıcı {0} kotası/paketi yenilendiği için hesabı tekrar aktifleştirildi.", username);
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
                _logger.ErrorException("Laravel API senkronizasyon hatası.", ex);
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
                _logger.ErrorException("Laravel webhook bildirimi gönderilemedi.", ex);
            }
        }

        #region Helper Methods for Emby User SDK Compatibility

        public User? FindUser(Guid userId, string username)
        {
            try
            {
                if (userId != Guid.Empty)
                {
                    try
                    {
                        var u = _userManager.GetUserById(userId);
                        if (u != null) return u;
                    }
                    catch { }
                }

                if (!string.IsNullOrEmpty(username))
                {
                    try
                    {
                        var u = _userManager.GetUserByName(username);
                        if (u != null) return u;
                    }
                    catch { }
                }

                // Fallback: Kullanıcı listesinden eşleştirme
                try
                {
                    var users = _userManager.Users;
                    if (users != null)
                    {
                        foreach (var u in users)
                        {
                            if (u == null) continue;
                            if (userId != Guid.Empty && GetUserId(u) == userId) return u;
                            if (!string.IsNullOrEmpty(username) && string.Equals(GetUsername(u), username, StringComparison.OrdinalIgnoreCase)) return u;
                        }
                    }
                }
                catch { }
            }
            catch (Exception ex)
            {
                _logger.ErrorException("FindUser hatası.", ex);
            }
            return null;
        }

        private Guid GetUserId(User user)
        {
            if (user == null) return Guid.Empty;
            try
            {
                var prop = user.GetType().GetProperty("Id");
                if (prop != null)
                {
                    var val = prop.GetValue(user);
                    if (val is Guid g) return g;
                    if (val is string s && Guid.TryParse(s, out var parsed)) return parsed;
                }
            }
            catch { }
            return Guid.Empty;
        }

        private string GetUsername(User user)
        {
            if (user == null) return string.Empty;
            try
            {
                var prop = user.GetType().GetProperty("Name") ?? user.GetType().GetProperty("Username");
                if (prop != null)
                {
                    return prop.GetValue(user)?.ToString() ?? string.Empty;
                }
            }
            catch { }
            return string.Empty;
        }

        private bool IsSameUser(SessionInfo session, Guid userId, string username)
        {
            if (session == null) return false;
            try
            {
                if (userId != Guid.Empty)
                {
                    var prop = session.GetType().GetProperty("UserId");
                    if (prop != null)
                    {
                        var val = prop.GetValue(session);
                        if (val is Guid g && g == userId) return true;
                        if (val is string s && Guid.TryParse(s, out var parsed) && parsed == userId) return true;
                    }
                }

                if (!string.IsNullOrEmpty(username))
                {
                    var prop = session.GetType().GetProperty("UserName") ?? session.GetType().GetProperty("Username");
                    if (prop != null)
                    {
                        var sName = prop.GetValue(session)?.ToString();
                        if (string.Equals(sName, username, StringComparison.OrdinalIgnoreCase)) return true;
                    }
                }
            }
            catch { }
            return false;
        }

        private bool IsUserDisabled(User user)
        {
            if (user == null) return false;
            try
            {
                if (user.Policy != null)
                {
                    return user.Policy.IsDisabled;
                }
            }
            catch { }
            return false;
        }

        private void SetUserDisabled(User user, bool disabled)
        {
            if (user == null) return;
            try
            {
                if (user.Policy != null)
                {
                    user.Policy.IsDisabled = disabled;
                    _userManager.UpdateUser(user);
                }
            }
            catch (Exception ex)
            {
                _logger.ErrorException("SetUserDisabled hatası.", ex);
            }
        }

        #endregion
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
