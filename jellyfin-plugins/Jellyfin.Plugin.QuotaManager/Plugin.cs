using System;
using System.Collections.Generic;
using Jellyfin.Plugin.QuotaManager.Configuration;
using Jellyfin.Plugin.QuotaManager.Services;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.QuotaManager
{
    public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
    {
        public static Plugin? Instance { get; private set; }

        public QuotaService? QuotaService { get; set; }

        public override string Name => "Quota Manager";

        public override Guid Id => Guid.Parse("d7e8f9a0-1234-4567-89ab-cdef01234567");

        public override string Description => "Jellyfin kullanıcı bant genişliği ve trafik kotalarını takip edip Laravel abonelikleri ile senkronize kısıtlar.";

        public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
            : base(applicationPaths, xmlSerializer)
        {
            Instance = this;
        }

        public IEnumerable<PluginPageInfo> GetPages()
        {
            return new[]
            {
                new PluginPageInfo
                {
                    Name = "Quota Manager",
                    EmbeddedResourcePath = GetType().Namespace + ".Web.configPage.html"
                }
            };
        }
    }
}
