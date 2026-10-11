using System;

namespace Emby.Plugin.QuotaManager.Configuration
{
    public class UserQuotaConfig
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public bool HasPackage { get; set; } = true;
        public long MaxBytes { get; set; } = 50L * 1024 * 1024 * 1024; // Default 50 GB
        public long UsedBytes { get; set; } = 0;
        public DateTime CycleStartDate { get; set; } = DateTime.UtcNow;
        public DateTime CycleEndDate { get; set; } = DateTime.UtcNow.AddMonths(1);
        public bool IsExceeded { get; set; } = false;
        public DateTime? LastSyncTime { get; set; }

        public double UsedGB => Math.Round((double)UsedBytes / (1024 * 1024 * 1024), 2);
        public double MaxGB => Math.Round((double)MaxBytes / (1024 * 1024 * 1024), 2);
        public double RemainingGB => Math.Max(0, Math.Round((double)(MaxBytes - UsedBytes) / (1024 * 1024 * 1024), 2));
    }
}
