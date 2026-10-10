# Jellyfin.Plugin.QuotaManager

Jellyfin sunucusu için geliştirilmiş **Bant Genişliği & Trafik Kota Yöneticisi (.NET 8.0)** eklentisi.

## Özellikler

1. **Gerçek Zamanlı Trafik Takibi (`PlaybackTracker`)**:
   - Kullanıcıların Jellyfin üzerinden izlediği film/dizi yayınlarının bit oranını (Bitrate) ve izleme sürelerini hesaplayarak harcanan veri miktarını (GB/MB) anlık takip eder.

2. **Otomatik Hesabı Pasifleştirme ve Oturum Kapatma (`QuotaManager`)**:
   - Belirlenen veri kotasına ulaşıldığında kullanıcının Jellyfin hesabını otomatik olarak pasife alır (`IsDisabled = true`).
   - Devam eden canlı oynatma oturumlarını (Active Sessions) mesaj göstererek derhal sonlandırır (`CloseSession`).

3. **Laravel Entegrasyonu ve Abonelik Yenilenme Döngüsü (`QuotaCheckTask`)**:
   - Kullanıcının abonelik paketine göre özel yenilenme tarihlerini (`expires_at` / `period_end`) Laravel API üzerinden otomatik sorgular ve senkronize eder.
   - Aboneliği yenilendiğinde Jellyfin hesabını otomatik olarak tekrar aktifleştirir.

4. **Jellyfin Yönetim Paneli Arayüzü (`configPage.html`)**:
   - Yöneticilerin varsayılan kotayı, otomatik kısıtlama kurallarını ve Laravel API bağlantı bilgilerini Jellyfin paneli üzerinden yönetebilmesini sağlar.

---

## Derleme (Build) Adımları

Eklentiyi derlemek için sisteminizde **.NET 8.0 SDK** yüklü olmalıdır.

```bash
cd jellyfin-plugins/Jellyfin.Plugin.QuotaManager
dotnet build -c Release
```

Derleme çıktısı `bin/Release/net8.0/Jellyfin.Plugin.QuotaManager.dll` konumunda oluşacaktır.

---

## Jellyfin Sunucusuna Kurulum (Deployment)

1. Jellyfin sunucu dizininizde `plugins/QuotaManager` adında yeni bir klasör oluşturun.
   - **Linux:** `/var/lib/jellyfin/plugins/QuotaManager` veya `/config/plugins/QuotaManager`
   - **Windows:** `C:\ProgramData\Jellyfin\Server\plugins\QuotaManager`
2. Oluşan `Jellyfin.Plugin.QuotaManager.dll` dosyasını bu klasöre kopyalayın.
3. **Linux İzinlerini Düzenleyin (ÖNEMLİ)**:
   Jellyfin servisi klasör içinde `meta.json` oluşturabilmek için klasör sahipliğine ihtiyaç duyar:
   ```bash
   sudo chown -R jellyfin:jellyfin /var/lib/jellyfin/plugins/QuotaManager
   sudo chmod -R 755 /var/lib/jellyfin/plugins/QuotaManager
   ```
   *(Docker kullanıyorsanız `chown -R 1000:1000` veya container kullanıcısına göre ayarlayın)*
4. Jellyfin sunucusunu yeniden başlatın (`sudo systemctl restart jellyfin`).
5. Jellyfin Yönetici Paneli -> **Eklentiler (Plugins)** sekmesine gidin ve **Quota Manager** ayarlarını yapılandırın:
   - **Laravel API Base URL**: `http://<your-laravel-domain>/api/jellyfin`
   - **Senkronizasyon Sıklığı**: 30 Dakika

---
## Jellyfin eklenti sıfırlama

# 1. Jellyfin'i durdurun:
sudo systemctl stop jellyfin

# 2. Eski önbellek meta.json dosyasını silin:
sudo rm -f /var/lib/jellyfin/plugins/QuotaManager/meta.json

# 3. Klasör izinlerini kontrol edin:
sudo chown -R jellyfin:jellyfin /var/lib/jellyfin/plugins/QuotaManager

# 4. Jellyfin'i tekrar başlatın:
sudo systemctl start jellyfin

---

## REST API Endpoint'leri

Jellyfin Quota Manager aşağıdaki REST endpoint'lerini dışa açar:

- `GET /QuotaManager/Users/{username}`: Kullanıcının anlık harcanan ve kalan kota bilgilerini döner.
- `POST /QuotaManager/Users/{username}/Reset`: Kullanıcı kotasını sıfırlar ve hesabını tekrar aktifleştirir.
- `POST /QuotaManager/SyncNow`: Laravel API ile anında senkronizasyon tetikler.
