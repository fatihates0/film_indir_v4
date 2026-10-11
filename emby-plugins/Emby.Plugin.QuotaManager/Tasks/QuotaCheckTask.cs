using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Emby.Plugin.QuotaManager.Services;
using MediaBrowser.Model.Tasks;

namespace Emby.Plugin.QuotaManager.Tasks
{
    public class QuotaCheckTask : IScheduledTask
    {
        public QuotaCheckTask()
        {
        }

        public string Name => "SineKutu Kota Senkronizasyon Görevi";

        public string Key => "SineKutuQuotaCheckTask";

        public string Description => "SineKutu kullanıcı trafik kotalarını kontrol eder, Laravel API ile abonelik tarihlerini senkronize eder ve kotası bitenleri kısıtlar.";

        public string Category => "SineKutu Kota Yönetimi";

        public async Task Execute(CancellationToken cancellationToken, IProgress<double> progress)
        {
            progress.Report(10);
            var service = Plugin.Instance?.QuotaService;
            if (service != null)
            {
                await service.SyncWithLaravelAsync();
            }
            progress.Report(100);
        }

        public async Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
        {
            await Execute(cancellationToken, progress);
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
