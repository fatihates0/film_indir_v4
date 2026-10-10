using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
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

            if (Plugin.Instance != null)
            {
                Plugin.Instance.QuotaService = this;
            }
        }

        public async Task<AccessCheckResult> CheckUserAccessAsync(string username)
        {
            var config = Plugin.Instance?.Configuration;
            if (config == null || string.IsNullOrWhiteSpace(config.LaravelApiUrl))
            {
                // Fallback to allowed if API URL not configured
                return new AccessCheckResult { Allowed = true, Reason = "not_configured", Message = "Laravel API yapılandırılmamış." };
            }

            try
            {
                string url = $"{config.LaravelApiUrl.TrimEnd('/')}/check-access?username={Uri.EscapeDataString(username)}";
                var request = new HttpRequestMessage(HttpMethod.Get, url);

                if (!string.IsNullOrWhiteSpace(config.LaravelApiKey))
                {
                    request.Headers.Add("X-Api-Key", config.LaravelApiKey);
                }

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<AccessCheckResult>();
                    return result ?? new AccessCheckResult { Allowed = true, Reason = "parse_null" };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Laravel check-access API hatası ({Username}).", username);
            }

            return new AccessCheckResult { Allowed = true, Reason = "api_error", Message = "API erişim hatası, varsayılan izin." };
        }

        public async Task DeductQuotaAsync(string username, long bytesTransferred)
        {
            if (bytesTransferred <= 0) return;

            var config = Plugin.Instance?.Configuration;
            if (config == null || string.IsNullOrWhiteSpace(config.LaravelApiUrl)) return;

            try
            {
                string url = $"{config.LaravelApiUrl.TrimEnd('/')}/deduct-quota";
                var payload = new { username = username, bytes = bytesTransferred };
                var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = JsonContent.Create(payload)
                };

                if (!string.IsNullOrWhiteSpace(config.LaravelApiKey))
                {
                    request.Headers.Add("X-Api-Key", config.LaravelApiKey);
                }

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<DeductQuotaResult>();
                    if (result != null && result.QuotaExhausted)
                    {
                        _logger.LogWarning("Kullanıcı {Username} kotası tükendi! Oynatması sonlandırılıyor.", username);
                        
                        // Disable user or stop sessions
                        var user = _userManager.Users.FirstOrDefault(u => u.Username.Equals(username, StringComparison.OrdinalIgnoreCase));
                        if (user != null)
                        {
                            var userQuota = GetOrCreateUserQuota(user.Id, user.Username);
                            userQuota.IsExceeded = true;
                            await EnforceQuotaExceededAsync(userQuota);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Laravel deduct-quota API hatası ({Username}).", username);
            }
        }

        public UserQuotaConfig GetOrCreateUserQuota(Guid userId, string username)
        {
            lock (_lock)
            {
                var config = Plugin.Instance?.Configuration;
                if (config == null) return new UserQuotaConfig { UserId = userId, Username = username };

                var userQuota = config.UserQuotas.FirstOrDefault(u => u.UserId == userId);
                if (userQuota == null)
                {
                    userQuota = new UserQuotaConfig
                    {
                        UserId = userId,
                        Username = username,
                        MaxBytes = (long)config.DefaultQuotaGB * 1024 * 1024 * 1024,
                        UsedBytes = 0,
                        CycleStartDate = DateTime.UtcNow,
                        CycleEndDate = DateTime.UtcNow.AddMonths(1)
                    };
                    config.UserQuotas.Add(userQuota);
                    Plugin.Instance.SaveConfiguration();
                }

                return userQuota;
            }
        }

        public void AddBytesUsed(Guid userId, string username, long bytesTransferred)
        {
            if (bytesTransferred <= 0) return;

            lock (_lock)
            {
                var config = Plugin.Instance?.Configuration;
                if (config == null) return;

                var userQuota = GetOrCreateUserQuota(userId, username);
                
                // Check if current date is past the cycle end date (Renewal Cycle)
                if (DateTime.UtcNow > userQuota.CycleEndDate)
                {
                    _logger.LogInformation("Kullanıcı {Username} abonelik periyodu dolduğu için kota sıfırlandı.", username);
                    userQuota.UsedBytes = 0;
                    userQuota.CycleStartDate = DateTime.UtcNow;
                    userQuota.CycleEndDate = DateTime.UtcNow.AddMonths(1);
                    userQuota.IsExceeded = false;
                }

                userQuota.UsedBytes += bytesTransferred;

                if (userQuota.UsedBytes >= userQuota.MaxBytes && !userQuota.IsExceeded)
                {
                    userQuota.IsExceeded = true;
                    _logger.LogWarning("Kullanıcı {Username} trafik kotasını aştı! ({UsedGB} GB / {MaxGB} GB)", 
                        username, userQuota.UsedGB, userQuota.MaxGB);
                    
                    _ = EnforceQuotaExceededAsync(userQuota);
                }

                Plugin.Instance.SaveConfiguration();
            }

            // Sync with Laravel
            _ = DeductQuotaAsync(username, bytesTransferred);
        }

        public async Task EnforceQuotaExceededAsync(UserQuotaConfig userQuota)
        {
            var config = Plugin.Instance?.Configuration;
            if (config == null) return;

            var user = _userManager.GetUserById(userQuota.UserId);
            if (user == null) return;

            // 1. Terminate active sessions if enabled
            if (config.EnableSessionTermination)
            {
                var userSessions = _sessionManager.Sessions.Where(s => s.UserId == userQuota.UserId).ToList();
                foreach (var session in userSessions)
                {
                    _logger.LogInformation("Kullanıcı {Username} (ID: {UserId}) kotası bittiği için oynatma durduruluyor.",
                        userQuota.Username, userQuota.UserId);
                    
                    try
                    {
                        await _sessionManager.SendPlaystateCommand(
                            session.Id,
                            session.Id,
                            new PlaystateRequest { Command = PlaystateCommand.Stop },
                            default);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Oturum oynatma durdurma hatası.");
                    }
                }
            }

            // 2. Disable user account if enabled
            if (config.EnableAutoDisable)
            {
                _logger.LogInformation("Kullanıcı {Username} Jellyfin hesabı pasife alınıyor (IsDisabled = true).", userQuota.Username);
                user.SetPermission(PermissionKind.IsDisabled, true);
                await _userManager.UpdateUserAsync(user);
            }

            // 3. Notify Laravel API
            await SendQuotaExceededWebhookAsync(userQuota);
        }

        public async Task SyncWithLaravelAsync()
        {
            var config = Plugin.Instance?.Configuration;
            if (config == null || string.IsNullOrWhiteSpace(config.LaravelApiUrl)) return;

            try
            {
                _logger.LogInformation("Laravel API ile kullanıcı kotaları senkronize ediliyor...");

                var requestMessage = new HttpRequestMessage(HttpMethod.Get, $"{config.LaravelApiUrl.TrimEnd('/')}/quotas");
                if (!string.IsNullOrWhiteSpace(config.LaravelApiKey))
                {
                    requestMessage.Headers.Add("X-Api-Key", config.LaravelApiKey);
                }

                var response = await _httpClient.SendAsync(requestMessage);
                if (response.IsSuccessStatusCode)
                {
                    var payload = await response.Content.ReadFromJsonAsync<List<LaravelUserQuotaSyncDto>>();
                    if (payload != null)
                    {
                        foreach (var item in payload)
                        {
                            var user = _userManager.Users.FirstOrDefault(u => u.Username.Equals(item.Username, StringComparison.OrdinalIgnoreCase) || u.Id == item.UserId);
                            if (user != null)
                            {
                                lock (_lock)
                                {
                                    var quota = GetOrCreateUserQuota(user.Id, user.Username);
                                    quota.MaxBytes = item.MaxBytes;
                                    quota.CycleStartDate = item.CycleStartDate;
                                    quota.CycleEndDate = item.CycleEndDate;
                                    quota.LastSyncTime = DateTime.UtcNow;

                                    // If Laravel reset the cycle or updated quota, reactivate user if needed
                                    if (quota.UsedBytes < quota.MaxBytes && user.HasPermission(PermissionKind.IsDisabled) && quota.IsExceeded)
                                    {
                                        quota.IsExceeded = false;
                                        user.SetPermission(PermissionKind.IsDisabled, false);
                                        _ = _userManager.UpdateUserAsync(user);
                                        _logger.LogInformation("Kullanıcı {Username} kotası yenilendiği için hesabı tekrar aktifleştirildi.", user.Username);
                                    }
                                }
                            }
                        }
                        Plugin.Instance.SaveConfiguration();
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
            if (config == null || string.IsNullOrWhiteSpace(config.LaravelApiUrl)) return;

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

                var request = new HttpRequestMessage(HttpMethod.Post, $"{config.LaravelApiUrl.TrimEnd('/')}/quota-exceeded")
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
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public long MaxBytes { get; set; }
        public DateTime CycleStartDate { get; set; }
        public DateTime CycleEndDate { get; set; }
    }
}
