using System;
using Emby.Plugin.QuotaManager.Services;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Plugins;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Logging;

namespace Emby.Plugin.QuotaManager
{
    public class ServerEntryPoint : IServerEntryPoint
    {
        private readonly PlaybackTracker _playbackTracker;
        private readonly QuotaService _quotaService;

        public ServerEntryPoint(
            ISessionManager sessionManager,
            IUserManager userManager,
            ILogManager logManager)
        {
            var logger = logManager.GetLogger("QuotaManager");
            _quotaService = new QuotaService(userManager, sessionManager, logger);
            _playbackTracker = new PlaybackTracker(sessionManager, _quotaService, logger);
        }

        public void Run()
        {
            _playbackTracker.Start();
        }

        public void Dispose()
        {
            _playbackTracker.Stop();
        }
    }
}
