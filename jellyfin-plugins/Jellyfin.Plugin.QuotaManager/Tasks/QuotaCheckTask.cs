using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.QuotaManager.Services;
using MediaBrowser.Model.Tasks;

namespace Jellyfin.Plugin.QuotaManager.Tasks
{
    public class QuotaCheckTask : IScheduledTask
    {
        private readonly QuotaService? _quotaService;

        public QuotaCheckTask(QuotaService quotaService)
        {
            _quotaService = quotaService;
        }

        public QuotaCheckTask()
        {
            _quotaService = Plugin.Instance?.QuotaService;
        }

        public string Name => "SineKutu Kota Senkronizasyon Görevi";

        public string Key => "SineKutuQuotaCheckTask";

        public string Description => "SineKutu kullanıcı trafik kotalarını kontrol eder, Laravel API ile abonelik tarihlerini senkronize eder ve kotası bitenleri kısıtlar.";

        public string Category => "SineKutu Kota Yönetimi";

        public async Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
        {
            progress.Report(10);
            var service = _quotaService ?? Plugin.Instance?.QuotaService;
            if (service != null)
            {
                await service.SyncWithLaravelAsync();
            }
            progress.Report(100);
        }

        public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
        {
            return new[]
            {
                new TaskTriggerInfo
                {
                    Type = TaskTriggerInfo.TriggerInterval,
                    IntervalTicks = TimeSpan.FromMinutes(30).Ticks
                }
            };
        }
    }
}
