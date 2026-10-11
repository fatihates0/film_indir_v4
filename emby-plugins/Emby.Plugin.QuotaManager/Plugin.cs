using System;
using System.Collections.Generic;
using Emby.Plugin.QuotaManager.Configuration;
using Emby.Plugin.QuotaManager.Services;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Emby.Plugin.QuotaManager
{
    public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
    {
        public static Plugin? Instance { get; private set; }

        public QuotaService? QuotaService { get; set; }

        public override string Name => "SineKutu Kota Yönetimi";

        public override Guid Id => Guid.Parse("c1f2e3d4-5678-90ab-cdef-1234567890ab");

        public override string Description => "SineKutu kullanıcı paket ve trafik kotalarını takip edip Emby üzerinde Laravel abonelikleri ile senkronize kısıtlar.";

        public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
            : base(applicationPaths, xmlSerializer)
        {
            Instance = this;
        }

        public IEnumerable<PluginPageInfo> GetPages()
        {
            var htmlPath = GetType().Namespace + ".Web.configPage.html";
            var jsPath = GetType().Namespace + ".Web.configPage.js";

            return new[]
            {
                // 1. Emby Web ana rota (URL: configurationpage?name=SineKutuConfig)
                new PluginPageInfo
                {
                    Name = "SineKutuConfig",
                    DisplayName = "SineKutu Kota Yönetimi",
                    EmbeddedResourcePath = htmlPath,
                    EnableInMainMenu = true,
                    MenuSection = "server",
                    MenuIcon = "account_balance_wallet",
                    IsMainConfigPage = true
                },
                new PluginPageInfo
                {
                    Name = "SineKutuConfig.js",
                    EmbeddedResourcePath = jsPath
                },

                // 2. SineKutuQuotaManager rotası
                new PluginPageInfo
                {
                    Name = "SineKutuQuotaManager",
                    DisplayName = "SineKutu Kota Yönetimi",
                    EmbeddedResourcePath = htmlPath,
                    EnableInMainMenu = true,
                    MenuSection = "server",
                    MenuIcon = "account_balance_wallet",
                    IsMainConfigPage = true
                },
                new PluginPageInfo
                {
                    Name = "SineKutuQuotaManager.js",
                    EmbeddedResourcePath = jsPath
                },

                // 3. Eklenti adı ile doğrudan eşleşme rotası
                new PluginPageInfo
                {
                    Name = this.Name,
                    DisplayName = "SineKutu Kota Yönetimi",
                    EmbeddedResourcePath = htmlPath,
                    IsMainConfigPage = true
                },
                new PluginPageInfo
                {
                    Name = this.Name + ".js",
                    EmbeddedResourcePath = jsPath
                }
            };
        }
    }
}
