using System.Collections.Generic;
using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.QuotaManager.Configuration
{
    public class PluginConfiguration : BasePluginConfiguration
    {
        public int DefaultQuotaGB { get; set; } = 50;
        public bool EnableAutoDisable { get; set; } = true;
        public bool EnableSessionTermination { get; set; } = true;
        public string LaravelApiUrl { get; set; } = "http://localhost:8000/api/jellyfin";
        public string LaravelApiKey { get; set; } = string.Empty;
        public int SyncIntervalMinutes { get; set; } = 30;

        public List<UserQuotaConfig> UserQuotas { get; set; } = new List<UserQuotaConfig>();
    }
}
