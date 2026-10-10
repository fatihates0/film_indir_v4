using System;
using System.Linq;
using System.Net.Mime;
using System.Threading.Tasks;
using Jellyfin.Data.Enums;
using Jellyfin.Plugin.QuotaManager.Configuration;
using Jellyfin.Plugin.QuotaManager.Services;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.QuotaManager.Api
{
    [ApiController]
    [Route("QuotaManager")]
    [Produces(MediaTypeNames.Application.Json)]
    public class QuotaController : ControllerBase
    {
        private readonly QuotaService _quotaService;
        private readonly IUserManager _userManager;

        public QuotaController(QuotaService quotaService, IUserManager userManager)
        {
            _quotaService = quotaService;
            _userManager = userManager;
        }

        [HttpGet("Users/{username}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public ActionResult<UserQuotaConfig> GetUserQuota([FromRoute] string username)
        {
            var user = _userManager.Users.FirstOrDefault(u => u.Username.Equals(username, StringComparison.OrdinalIgnoreCase));
            if (user == null)
            {
                return NotFound(new { message = "Kullanıcı bulunamadı." });
            }

            var quota = _quotaService.GetOrCreateUserQuota(user.Id, user.Username);
            return Ok(quota);
        }

        [HttpPost("Users/{username}/Reset")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ResetUserQuota([FromRoute] string username)
        {
            var user = _userManager.Users.FirstOrDefault(u => u.Username.Equals(username, StringComparison.OrdinalIgnoreCase));
            if (user == null)
            {
                return NotFound(new { message = "Kullanıcı bulunamadı." });
            }

            var config = Plugin.Instance?.Configuration;
            if (config != null)
            {
                var quota = _quotaService.GetOrCreateUserQuota(user.Id, user.Username);
                quota.UsedBytes = 0;
                quota.IsExceeded = false;
                quota.CycleStartDate = DateTime.UtcNow;
                quota.CycleEndDate = DateTime.UtcNow.AddMonths(1);

                if (user.HasPermission(PermissionKind.IsDisabled))
                {
                    user.SetPermission(PermissionKind.IsDisabled, false);
                    await _userManager.UpdateUserAsync(user);
                }

                Plugin.Instance?.SaveConfiguration();
            }

            return Ok(new { message = "Kullanıcı kotası başarıyla sıfırlandı ve hesabı aktifleştirildi." });
        }

        [HttpPost("SyncNow")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> TriggerSync()
        {
            await _quotaService.SyncWithLaravelAsync();
            return Ok(new { message = "Laravel ile kota senkronizasyonu başlatıldı." });
        }
    }
}
