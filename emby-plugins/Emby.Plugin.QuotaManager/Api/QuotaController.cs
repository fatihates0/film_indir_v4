using System;
using System.Linq;
using Emby.Plugin.QuotaManager.Configuration;
using Emby.Plugin.QuotaManager.Services;
using MediaBrowser.Controller.Library;
using MediaBrowser.Model.Services;

namespace Emby.Plugin.QuotaManager.Api
{
    [Route("/QuotaManager/Users/{Username}", "GET", Summary = "Kullanıcı kota durumunu getirir")]
    public class GetUserQuotaRequest : IReturn<UserQuotaConfig>
    {
        public string Username { get; set; } = string.Empty;
    }

    [Route("/QuotaManager/Users/{Username}/Reset", "POST", Summary = "Kullanıcı kotasını sıfırlar")]
    public class ResetUserQuotaRequest : IReturn<object>
    {
        public string Username { get; set; } = string.Empty;
    }

    [Route("/QuotaManager/SyncNow", "POST", Summary = "Laravel API senkronizasyonunu anında tetikler")]
    public class TriggerSyncRequest : IReturn<object>
    {
    }

    public class QuotaController : IService
    {
        private readonly IUserManager _userManager;

        public QuotaController(IUserManager userManager)
        {
            _userManager = userManager;
        }

        private QuotaService? QuotaService => Plugin.Instance?.QuotaService;

        public object Get(GetUserQuotaRequest request)
        {
            var service = QuotaService;
            var user = service?.FindUser(Guid.Empty, request.Username);
            if (user == null)
            {
                return new { message = "Kullanıcı bulunamadı." };
            }

            if (service == null)
            {
                return new { message = "Kota servisi başlatılamadı." };
            }

            return service.GetOrCreateUserQuota(user.Id, user.Name);
        }

        public object Post(ResetUserQuotaRequest request)
        {
            var service = QuotaService;
            var user = service?.FindUser(Guid.Empty, request.Username);
            if (user == null)
            {
                return new { message = "Kullanıcı bulunamadı." };
            }

            var config = Plugin.Instance?.Configuration;
            if (service != null && config != null)
            {
                var quota = service.GetOrCreateUserQuota(user.Id, user.Name);
                quota.UsedBytes = 0;
                quota.IsExceeded = false;
                quota.CycleStartDate = DateTime.UtcNow;
                quota.CycleEndDate = DateTime.UtcNow.AddMonths(1);

                if (user.Policy != null && user.Policy.IsDisabled)
                {
                    user.Policy.IsDisabled = false;
                    try
                    {
                        _userManager.UpdateUser(user);
                    }
                    catch { }
                }

                Plugin.Instance?.SaveConfiguration();
            }

            return new { message = "Kullanıcı kotası başarıyla sıfırlandı ve hesabı aktifleştirildi." };
        }

        public object Post(TriggerSyncRequest request)
        {
            var service = QuotaService;
            if (service != null)
            {
                _ = service.SyncWithLaravelAsync();
                return new { message = "Laravel ile kota senkronizasyonu başlatıldı." };
            }

            return new { message = "Kota servisi henüz hazır değil." };
        }
    }
}
