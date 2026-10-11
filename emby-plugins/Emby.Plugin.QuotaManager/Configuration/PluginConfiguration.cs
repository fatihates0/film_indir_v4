using System.Collections.Generic;
using MediaBrowser.Model.Plugins;

namespace Emby.Plugin.QuotaManager.Configuration
{
    public class PluginConfiguration : BasePluginConfiguration
    {
        public int DefaultQuotaGB { get; set; } = 50;
        public bool EnableAutoDisable { get; set; } = false;
        public bool EnableSessionTermination { get; set; } = true;
        public bool BlockPlaybackOnApiFailure { get; set; } = false;
        public string LaravelApiUrl { get; set; } = "http://localhost:8000/api/emby";
        public string LaravelApiKey { get; set; } = string.Empty;
        public int SyncIntervalMinutes { get; set; } = 30;
        public int BatchDeductIntervalSeconds { get; set; } = 30;
        public int BatchDeductThresholdMB { get; set; } = 15;

        public List<UserQuotaConfig> UserQuotas { get; set; } = new List<UserQuotaConfig>();
    }
}
