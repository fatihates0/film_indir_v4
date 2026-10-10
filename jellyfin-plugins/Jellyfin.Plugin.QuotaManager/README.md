# SineKutu Kota Yönetimi (Jellyfin Eklentisi)

Jellyfin sunucusu için geliştirilmiş **Canlı Paket & Kota Doğrulamalı Trafik Yöneticisi (.NET 8.0)** eklentisi.

## Mantık ve Çalışma Prensipleri

Kullanıcı Jellyfin üzerinde herhangi bir film veya dizi içeriğini **oynatmaya başladığı anda (PlaybackStart)** eklenti Laravel API'sine canlı sorgu atar:

1. **Paketi ve Kotası Yoksa:**
   - Oynatma anında engellenir (`PlaystateCommand.Stop`).
   - Kullanıcı ekranına diyalog uyarısı gönderilir: *"Aktif bir abonelik paketiniz bulunmamaktadır."*

2. **Paketi Var Fakat Kotası Yoksa (Tükenmişse):**
   - Oynatma anında engellenir.
   - Kullanıcı ekranına uyarı gönderilir: *"İzleme kotanız dolmuştur. İçerik izleyemezsiniz."*

3. **Paketi Var ve Kotası Varsa:**
   - Oynatmaya derhal izin verilir.
   - İzlediği süre ve akışın bit oranı (bitrate) üzerinden tüketilen bayt/GB miktarı hesaplanır.
   - İzleme sürerken periyodik olarak (ve yayın durdurulduğunda) Laravel kotasından düşüm yapılır (`/deduct-quota`).
   - Oynatma esnasında kullanıcının kotası biterse yayın canlı olarak kesilir.

4. **Yönetici (Admin) Erişimi:**
   - Laravel tarafında yönetici rolündeki kullanıcılar sınırsız kotaya sahiptir ve engellenmez.

---

## Özellikler

1. **Canlı Erişim Doğrulaması (`CheckUserAccessAsync`)**:
   - `GET /api/jellyfin/check-access?username={username}`
   - Kullanıcının kayıtlı olup olmadığını, paketinin aktifliğini ve kalan kotasını kontrol eder.

2. **Akıllı Veri ve Bitrate Takibi (`PlaybackTracker`)**:
   - Transcode (`TranscodingInfo.Bitrate`) veya doğrudan oynatma (`DirectPlay` dosya boyutu & süresi) üzerinden gerçek aktarım hızını hesaplar.
   - **İleri Sarma Koruması (Anti-Seek Glitch)**: Kullanıcı filmi 1 saat ileri sardığında, izlemediği 1 saatlik veri kotadan düşülmez; yalnızca gerçekte geçen tampon süre kadar düşülür.

3. **Toplu Bildirim & Disk Performans Koruyucu (Batching)**:
   - Jellyfin'in saniyelik progress olaylarında Laravel veritabanını kilitlememek için veriler RAM'de biriktirilir (varsayılan: 15 MB veya 30 saniye).
   - Eşik aşıldığında veya video kapatıldığında (`PlaybackStopped`) tek bir istek ile Laravel kotasından düşülür.

4. **Güvenlik & Fallback Yönetimi**:
   - Laravel API'ye ulaşılamadığı durumlarda kaçak izlemeyi önlemek için yayını durdurma kuralı (`BlockPlaybackOnApiFailure`).

---

## Derleme (Build) Adımları

Eklentiyi derlemek için sisteminizde **.NET 8.0 SDK** yüklü olmalıdır:

```bash
cd jellyfin-plugins/Jellyfin.Plugin.QuotaManager
dotnet build -c Release
```

Derleme çıktısı:
`jellyfin-plugins/Jellyfin.Plugin.QuotaManager/bin/Release/net8.0/Jellyfin.Plugin.QuotaManager.dll`

---

## Jellyfin Sunucusuna Kurulum (Deployment)

1. Jellyfin sunucu dizininizde `plugins/QuotaManager` klasörü oluşturun:
   - **Linux:** `/var/lib/jellyfin/plugins/QuotaManager`
   - **Windows:** `C:\ProgramData\Jellyfin\Server\plugins\QuotaManager`
2. `Jellyfin.Plugin.QuotaManager.dll` dosyasını bu klasöre kopyalayın.
3. Linux izinlerini verin:
   ```bash
   sudo chown -R jellyfin:jellyfin /var/lib/jellyfin/plugins/QuotaManager
   sudo chmod -R 755 /var/lib/jellyfin/plugins/QuotaManager
   ```
4. Jellyfin servisini yeniden başlatın:
   ```bash
   sudo systemctl restart jellyfin
   ```
5. Jellyfin Yönetici Paneli -> **Eklentiler (Plugins)** -> **SineKutu Kota Yönetimi** sekmesinden:
   - **Laravel API Base URL**: `http://<domain>/api/jellyfin`
   - **Laravel API Anahtarı**: *(Varsa .env içindeki JELLYFIN_PLUGIN_API_KEY)*
   - **Kaydet** butonuna basın.

---

## API Endpoint Listesi (Laravel)

- `GET /api/jellyfin/check-access?username={username}`: Canlı paket ve kota sorgulama.
- `POST /api/jellyfin/deduct-quota`: Kullanıcı kotasından harcanan baytı düşme.
- `GET /api/jellyfin/quotas`: Tüm kullanıcıların paket & kota özet senkronizasyonu.
- `POST /api/jellyfin/quota-exceeded`: Kota aşım webhook günlüğü.
