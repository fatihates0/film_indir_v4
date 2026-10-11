define(['loading'], function (loading) {
    'use strict';

    var pluginUniqueId = "c1f2e3d4-5678-90ab-cdef-1234567890ab";

    function getApiClient() {
        return window.ApiClient || (window.Dashboard ? window.Dashboard.getCurrentApiClient() : null);
    }

    function showLoading() {
        if (loading && loading.show) {
            loading.show();
        } else if (window.Dashboard && window.Dashboard.showLoadingMsg) {
            window.Dashboard.showLoadingMsg();
        }
    }

    function hideLoading() {
        if (loading && loading.hide) {
            loading.hide();
        } else if (window.Dashboard && window.Dashboard.hideLoadingMsg) {
            window.Dashboard.hideLoadingMsg();
        }
    }

    function loadConfiguration(view) {
        var apiClient = getApiClient();
        if (!apiClient) {
            setTimeout(function () { loadConfiguration(view); }, 300);
            return;
        }

        showLoading();
        apiClient.getPluginConfiguration(pluginUniqueId).then(function (config) {
            config = config || {};

            var inputUrl = view.querySelector('#LaravelApiUrl');
            if (inputUrl) inputUrl.value = config.LaravelApiUrl || config.laravelApiUrl || 'http://localhost:8000/api/jellyfin';

            var inputKey = view.querySelector('#LaravelApiKey');
            if (inputKey) inputKey.value = config.LaravelApiKey || config.laravelApiKey || '';

            var chkBlock = view.querySelector('#BlockPlaybackOnApiFailure');
            if (chkBlock) chkBlock.checked = (config.BlockPlaybackOnApiFailure !== undefined) ? config.BlockPlaybackOnApiFailure : (config.blockPlaybackOnApiFailure !== undefined ? config.blockPlaybackOnApiFailure : true);

            var chkTerm = view.querySelector('#EnableSessionTermination');
            if (chkTerm) chkTerm.checked = (config.EnableSessionTermination !== undefined) ? config.EnableSessionTermination : (config.enableSessionTermination !== undefined ? config.enableSessionTermination : true);

            var chkAuto = view.querySelector('#EnableAutoDisable');
            if (chkAuto) chkAuto.checked = !!(config.EnableAutoDisable || config.enableAutoDisable);

            var inputThreshold = view.querySelector('#BatchDeductThresholdMB');
            if (inputThreshold) inputThreshold.value = config.BatchDeductThresholdMB || config.batchDeductThresholdMB || 15;

            var inputInterval = view.querySelector('#BatchDeductIntervalSeconds');
            if (inputInterval) inputInterval.value = config.BatchDeductIntervalSeconds || config.batchDeductIntervalSeconds || 30;

            var inputSync = view.querySelector('#SyncIntervalMinutes');
            if (inputSync) inputSync.value = config.SyncIntervalMinutes || config.syncIntervalMinutes || 30;

            hideLoading();
        }).catch(function (err) {
            hideLoading();
            console.error('SineKutu konfigürasyonu yüklenemedi:', err);
        });
    }

    function saveConfiguration(view, e) {
        if (e) {
            e.preventDefault();
        }

        var apiClient = getApiClient();
        if (!apiClient) {
            return false;
        }

        showLoading();
        apiClient.getPluginConfiguration(pluginUniqueId).then(function (config) {
            config = config || {};

            var url = view.querySelector('#LaravelApiUrl').value;
            var key = view.querySelector('#LaravelApiKey').value;
            var blockApi = view.querySelector('#BlockPlaybackOnApiFailure').checked;
            var termSession = view.querySelector('#EnableSessionTermination').checked;
            var autoDisable = view.querySelector('#EnableAutoDisable').checked;
            var threshold = parseInt(view.querySelector('#BatchDeductThresholdMB').value, 10) || 15;
            var interval = parseInt(view.querySelector('#BatchDeductIntervalSeconds').value, 10) || 30;
            var syncMins = parseInt(view.querySelector('#SyncIntervalMinutes').value, 10) || 30;

            config.LaravelApiUrl = url;
            config.laravelApiUrl = url;

            config.LaravelApiKey = key;
            config.laravelApiKey = key;

            config.BlockPlaybackOnApiFailure = blockApi;
            config.blockPlaybackOnApiFailure = blockApi;

            config.EnableSessionTermination = termSession;
            config.enableSessionTermination = termSession;

            config.EnableAutoDisable = autoDisable;
            config.enableAutoDisable = autoDisable;

            config.BatchDeductThresholdMB = threshold;
            config.batchDeductThresholdMB = threshold;

            config.BatchDeductIntervalSeconds = interval;
            config.batchDeductIntervalSeconds = interval;

            config.SyncIntervalMinutes = syncMins;
            config.syncIntervalMinutes = syncMins;

            apiClient.updatePluginConfiguration(pluginUniqueId, config).then(function (result) {
                hideLoading();
                if (window.Dashboard && window.Dashboard.processPluginConfigurationUpdateResult) {
                    window.Dashboard.processPluginConfigurationUpdateResult(result);
                } else if (window.Dashboard && window.Dashboard.alert) {
                    window.Dashboard.alert('Ayarlar başarıyla kaydedildi.');
                }
            }).catch(function (err) {
                hideLoading();
                console.error('SineKutu ayarları kaydedilemedi:', err);
                if (window.Dashboard && window.Dashboard.alert) {
                    window.Dashboard.alert('Ayarlar kaydedilirken hata oluştu.');
                }
            });
        });

        return false;
    }

    return function (view) {
        view.addEventListener('viewshow', function () {
            loadConfiguration(view);
        });

        view.addEventListener('pageshow', function () {
            loadConfiguration(view);
        });

        var form = view.querySelector('#SineKutuConfigForm');
        if (form) {
            form.addEventListener('submit', function (e) {
                return saveConfiguration(view, e);
            });
        }

        loadConfiguration(view);
    };
});
