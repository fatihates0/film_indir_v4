# SineKutu Kota Yönetimi (Jellyfin Eklentisi)
**Sürüm:** v5.0 (Kararlı Sürüm)  
**Hedef Framework:** .NET 8.0  
**Uyumlu Jellyfin Sürümleri:** 10.8.x, 10.9.x, 10.10.x  

---

## 📌 İçindekiler
1. [Genel Bakış ve Çalışma Mantığı](#1-genel-bakış-ve-çalışma-mantığı)
2. [Gelişmiş Koruma Sistemleri](#2-gelişmiş-koruma-sistemleri)
3. [Gereksinimler ve Derleme (Build)](#3-gereksinimler-ve-derleme-build)
4. [Sunucuya Kurulum (Manuel / SSH)](#4-sunucuya-kurulum-manuel--ssh)
5. [Yeniden Kurulum ve Güncelleme (Update)](#5-yeniden-kurulum-ve-güncelleme-update)
6. [Jellyfin Özel Deposu (Custom Plugin Repository) Olarak Dağıtım](#6-jellyfin-özel-deposu-custom-plugin-repository-olarak-dağıtım)
7. [Yetkilendirme ve Güvenlik Ayarları](#7-yetkilendirme-ve-güvenlik-ayarları)
8. [Jellyfin Web Panelinde Yapılandırma](#8-jellyfin-web-panelinde-yapılandırma)
9. [Laravel API Uç Noktaları (Endpoints)](#9-laravel-api-uç-noktaları-endpoints)
10. [Sorun Giderme ve Canlı Log İzleme](#10-sorun-giderme-ve-canlı-log-izleme)

---

## 1. Genel Bakış ve Çalışma Mantığı

SineKutu Kota Yönetimi, Jellyfin medya sunucusu ile Laravel abonelik/kota altyapınızı gerçek zamanlı konuşturan bir C# (.NET 8.0) eklentisidir.

Kullanıcı Jellyfin üzerinde herhangi bir film veya dizi içeriğini **oynatmaya başladığı anda (`PlaybackStart`)**, eklenti Laravel API'sine canlı sorgu gönderir:

* **Durum 1: Paketi ve Kotası Yoksa:**
  - Oynatma derhal sunucu tarafından durdurulur (`PlaystateCommand.Stop`).
  - İstemci ekranına diyalog bildirimi gönderilir: *"Aktif bir abonelik paketiniz bulunmamaktadır."*
* **Durum 2: Paketi Var Fakat Kotası Yoksa (Tükenmişse):**
  - Oynatma anında engellenir.
  - Ekrana bildirim gönderilir: *"İzleme kotanız dolmuştur. İçerik izleyemezsiniz."*
* **Durum 3: Paketi Var ve Kotası Varsa:**
  - Oynatmaya anında onay verilir.
  - Video akışının gerçek bit hızı (bitrate) üzerinden izlenen süreye göre tüketilen veri bayt/GB cinsinden hesaplanır.
  - İzleme devam ederken periyodik olarak ve video durdurulduğunda (`PlaybackStopped`) Laravel veritabanından harcanan kota düşülür.
  - İzleme sırasında kullanıcının kotası 0'a ulaşırsa yayın canlı olarak kesilir.
* **Durum 4: Yönetici (Admin) Kullanıcıları:**
  - Laravel tarafında `is_admin = 1` olan kullanıcılar sınırsız kotaya sahiptir; kota düşüşü yapılmaz ve oynatma asla kesilmez.

---

## 2. Gelişmiş Koruma Sistemleri

### A. İlk Açılış ve Resume Koruması (`IsInitialized`)
Kullanıcı bir filme kaldığı yerden devam ettiğinde (örneğin 15. dakikada `943901ms`), istemciden gelen ilk konum bilgisi kota sayacının **referans başlangıcı** olarak kabul edilir. İlk açılışta geçmiş 15 dakikanın kotası (2.5 GB) **asla haksız yere düşülmez**, sadece o andan sonra izlenen saniyeler kotadan kesilir.

### B. İleri Sarma ve Atlama Koruması (Anti-Seek Guard)
Kullanıcı videoyu 30 dakika veya 1 saat ileri sardığında gerçekte bu süreyi indirip izlememiştir; oynatıcı yalnızca atlanan yerdeki birkaç saniyelik tampon (buffer) verisini indirir. Eklenti, gerçek dünya süresinden belirgin derecede hızlı ilerlemeleri tespit eder ve süreyi en fazla 3 saniyelik tampon ile sınırlar.

### C. Toplu Veri Bildirimi (Batching & Disk I/O Guard)
Jellyfin'in saniyelik ilerleme olaylarında Laravel veritabanını kilitlememek için veriler RAM üzerinde biriktirilir (varsayılan: 15 MB veya 30 saniye). Eşik aşıldığında veya video kapatıldığında tek bir HTTP isteği ile Laravel'e aktarılır.

---

## 3. Gereksinimler ve Derleme (Build)

### Gereksinimler
- **.NET 8.0 SDK** (Geliştirme / derleme ortamında)
- **Jellyfin Sunucusu** (Ubuntu 20.04/22.04/24.04 veya Windows Server)

### Release Modunda Derleme
Proje klasörüne gidin ve terminalden şu komutu çalıştırın:

```powershell
cd c:\film_indir\film_indir_v4\jellyfin-plugins\Jellyfin.Plugin.QuotaManager
dotnet build -c Release
```

Derleme çıktısı:
```
bin/Release/net8.0/Jellyfin.Plugin.QuotaManager.dll
```

---

## 4. Sunucuya Kurulum (Manuel / SSH)

### Adım 1: Sunucuda Eklenti Klasörünü Hazırlama
Ubuntu sunucunuza SSH ile bağlanıp eklenti dizinini oluşturun:

```bash
sudo mkdir -p "/var/lib/jellyfin/plugins/SineKutu Kota Yönetimi"
```

> **Windows Sunucular için Klasör Yolu:**  
> `C:\ProgramData\Jellyfin\Server\plugins\SineKutu Kota Yönetimi`

### Adım 2: DLL Dosyasını Sunucuya Gönderme (SCP)
Geliştirme makinenizin terminalinden derlenen DLL dosyasını sunucuya kopyalayın:

```bash
# Windows PowerShell üzerinden:
scp bin/Release/net8.0/Jellyfin.Plugin.QuotaManager.dll root@SUNUCU_IP:"/var/lib/jellyfin/plugins/SineKutu Kota Yönetimi/"
```

### Adım 3: Yetkilendirme ve İzinleri Düzenleme
Sunucu tarafında dosya sahipliğini `jellyfin` kullanıcısına verin ve çalıştırma izinlerini ayarlayın:

```bash
sudo chown -R jellyfin:jellyfin "/var/lib/jellyfin/plugins/SineKutu Kota Yönetimi"
sudo chmod -R 755 "/var/lib/jellyfin/plugins/SineKutu Kota Yönetimi"
```

### Adım 4: Jellyfin'i Yeniden Başlatma
```bash
sudo systemctl restart jellyfin
```

---

## 5. Yeniden Kurulum ve Güncelleme (Update)

Kodda güncelleme yapıldığında yeni DLL'i sunucuya aktarmak için 2 yol izleyebilirsiniz:

### A. Tek Komutla Otomatik Deploy (PowerShell Scripti)
Geliştirme klasörünüzdeki `deploy.ps1` dosyasını çalıştırarak derleme, SCP aktarımı ve Jellyfin restart işlemlerini tek adımda yapabilirsiniz:

```powershell
# deploy.ps1 içeriği:
dotnet build -c Release
scp bin/Release/net8.0/Jellyfin.Plugin.QuotaManager.dll root@SUNUCU_IP:"/var/lib/jellyfin/plugins/SineKutu Kota Yönetimi/"
ssh root@SUNUCU_IP "chown -R jellyfin:jellyfin '/var/lib/jellyfin/plugins/SineKutu Kota Yönetimi' && systemctl restart jellyfin"
```

### B. Manuel Güncelleme Adımları
1. Sunucuda Jellyfin servisini durdurun (DLL dosyasının kilitlenmesini önlemek için):
   ```bash
   sudo systemctl stop jellyfin
   ```
2. Yeni `Jellyfin.Plugin.QuotaManager.dll` dosyasını dizine kopyalayın (üzerine yazın).
3. İzinleri kontrol edin:
   ```bash
   sudo chown -R jellyfin:jellyfin "/var/lib/jellyfin/plugins/SineKutu Kota Yönetimi"
   ```
4. Servisi tekrar başlatın:
   ```bash
   sudo systemctl start jellyfin
   ```

---

## 6. Jellyfin Özel Deposu (Custom Plugin Repository) Olarak Dağıtım

Jellyfin'in yerleşik **"Eklenti Kataloğu (Plugin Catalog)"** özelliği sayesinde, eklentinizi bir depoya dönüştürerek sunucuya SSH ile girmeden Jellyfin web arayüzünden tek tıkla kurabilir ve güncelleyebilirsiniz.

### 1. Adım: Eklenti Paketini (ZIP) Oluşturma
Derlenen `Jellyfin.Plugin.QuotaManager.dll` dosyasını bir ZIP arşivi haline getirin:
* Dosya adı: `SineKutuQuotaManager_1.0.0.zip`

### 2. Adım: MD5 Checksum Değerini Alma
PowerShell üzerinden oluşturduğunuz ZIP dosyasının MD5 özetini alın:
```powershell
Get-FileHash -Algorithm MD5 .\SineKutuQuotaManager_1.0.0.zip
```
*(Çıkan 32 karakterlik Hash kodunu bir yere not edin)*

### 3. Adım: Depo Manifest Dosyasını (`manifest.json`) Hazırlama
GitHub Pages, GitHub Releases veya web sitenizde yayınlanacak bir `manifest.json` dosyası oluşturun:

```json
[
  {
    "guid": "c1f789d2-3b4e-4f1a-9e8d-5a6b7c8d9e0f",
    "name": "SineKutu Kota Yönetimi",
    "description": "SineKutu Laravel altyapısı ile entegre canlı paket ve kota denetleme sistemi.",
    "overview": "Oynatma anında kullanıcı yetkilerini ve kotalarını denetler, harcanan trafiği Laravel'den düşer.",
    "owner": "SineKutu",
    "category": "General",
    "versions": [
      {
        "version": "1.0.0.0",
        "changelog": "İlk kararlı sürüm; canlı erişim kontrolü, anti-seek koruması ve dinamik bitrate takibi eklendi.",
        "targetAbi": "10.9.0.0",
        "sourceUrl": "https://siteniz.com/plugins/SineKutuQuotaManager_1.0.0.zip",
        "checksum": "BURAYA_MD5_HASH_DEGERI_YAZILACAK",
        "timestamp": "2026-10-10T00:00:00Z"
      }
    ]
  }
]
```

### 4. Adım: Depoyu Jellyfin'e Tanımlama
1. Jellyfin Yönetim Paneline girin: **Yönetici Paneli (Dashboard) -> Eklentiler (Plugins) -> Depolar (Repositories)**.
2. Sağ üstteki **"+" (Depo Ekle)** butonuna tıklayın:
   * **Depo Adı:** `SineKutu Eklenti Deposu`
   * **Depo URL'si:** `https://siteniz.com/plugins/manifest.json` *(veya raw GitHub URL'si)*
3. **Kaydet** butonuna basın.

### 5. Adım: Arayüzden Tek Tıkla Kurulum
* **Katalog (Catalog)** sekmesine geçin.
* Listede **SineKutu Kota Yönetimi** görünecektir.
* Eklentiye tıklayıp **Yükle (Install)** butonuna basın ve Jellyfin'i yeniden başlatın.
* Yeni bir sürüm çıkardığınızda Jellyfin paneli eklenti için otomatik olarak **"Güncelle"** uyarısı verecektir.

---

## 7. Yetkilendirme ve Güvenlik Ayarları

Eklenti ile Laravel arasındaki iletişim API Anahtarı (API Key) ile güvence altına alınmıştır.

### Laravel Tarafı (`.env`)
Laravel projenizin `.env` dosyasında anahtarınızı tanımlayın:
```env
JELLYFIN_API_KEY=sinekutu_super_secret_key_2026
```

### Güvenlik Doğrulaması
Eklenti her HTTP isteğinde şu başlık veya parametreleri iletir:
* HTTP Başlığı: `X-Api-Key: sinekutu_super_secret_key_2026`
* Query Parametresi: `?api_key=sinekutu_super_secret_key_2026`

Anahtar eşleşmediğinde Laravel `401 Unauthorized` yanıtı döner ve kaçak erişimler anında engellenir.

---

## 8. Jellyfin Web Panelinde Yapılandırma

Jellyfin Yönetici Paneli -> **Eklentiler** -> **SineKutu Kota Yönetimi** sekmesine girerek ayarları yapın:

| Parametre | Açıklama | Varsayılan Değer |
| :--- | :--- | :--- |
| **Laravel API Base URL** | Laravel API uç noktası adresi | `https://siteniz.com/api/jellyfin` |
| **Laravel API Anahtarı** | `.env` içindeki `JELLYFIN_API_KEY` ile aynı olmalıdır | `sinekutu_super_secret_key_2026` |
| **Batch Düşüm Eşiği (MB)** | Laravel'e göndermeden önce RAM'de birikecek veri | `15` MB |
| **Batch Düşüm Aralığı (Sn)** | Veri eşiğe ulaşmasa bile Laravel'e aktarılma süresi | `30` saniye |
| **API Hatasında Yayını Durdur** | Laravel sunucusuna ulaşılamazsa yayını kes | `İşaretli (True)` |
| **Kota Bitince Oturumu Kapat** | Kota tükenince yayını zorla sonlandır | `İşaretli (True)` |

Ayarları girdikten sonra sayfanın altındaki **Kaydet** butonuna basın.

---

## 9. Laravel API Uç Noktaları (Endpoints)

Eklentinin Laravel ile haberleştiği hazır uç noktalar:

| Metot | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/api/jellyfin/check-access?username={kullanici}` | Oynatma öncesi paket ve kota kontrolü |
| `POST` | `/api/jellyfin/deduct-quota` | Harcanan bayt verisini kullanıcının kotasından düşme |
| `GET` | `/api/jellyfin/quotas` | Tüm kullanıcıların kota özetini senkronize etme |
| `POST` | `/api/jellyfin/quota-exceeded` | Kota aşımı bildirim günlüğü |

---

## 10. Sorun Giderme ve Canlı Log İzleme

### Canlı Logları Takip Etme
Ubuntu sunucunuzda eklentinin canlı olarak ne yaptığını izlemek için:

```bash
sudo journalctl -u jellyfin -f
```

### Beklenen Sağlıklı Log Örnekleri:

**1. Oynatma Başladığında (Canlı Doğrulama):**
```
[INF] Kullanıcı finishedtakip1@gmail.com bir içerik başlatıyor (Oturum: e3dc5a...). Laravel erişim denetimi yapılıyor...
[INF] Kullanıcı finishedtakip1@gmail.com erişimi ONAYLANDI. Kalan kota: 1999.01 GB
[INF] Kullanıcı finishedtakip1@gmail.com oturumu başlangıç/resume konumu 15.73 dakika olarak eşitlendi. İlk senkronizasyonda kota düşülmedi.
```

**2. İzleme Sürerken (Periyodik Kota Düşüşü):**
```
[INF] Kullanıcı finishedtakip1@gmail.com kotasından 16.43 MB düşüldü. Kalan: 2044388.2 MB
```

**3. Video Durdurulduğunda (Kalan Tampon Verisi):**
```
[INF] Kullanıcı finishedtakip1@gmail.com yayını durdurdu. Kalan son 10.28 MB Laravel'e aktarılıyor.
[INF] Kullanıcı finishedtakip1@gmail.com kotasından 10.28 MB düşüldü. Kalan: 2044377.92 MB
```

**4. Paketsiz veya Kotasız Kullanıcı Engellendiğinde:**
```
[WRN] Kullanıcı ahmet@gmail.com erişimi REDDEDİLDİ (quota_exhausted): İzleme kotanız dolmuştur. İçerik izleyemezsiniz.
```

### Sık Karşılaşılan Sorunlar ve Çözümleri
1. **`Unauthorized: Geçersiz API Anahtarı` Hatası:**
   * Jellyfin eklenti ayarlarındaki API anahtarı ile Laravel `.env` dosyasındaki `JELLYFIN_API_KEY` değerinin birebir aynı olduğunu kontrol edin.
2. **Eklenti Jellyfin'de Görünmüyor:**
   * Sunucuda dosya izinlerini kontrol edin: `sudo chown -R jellyfin:jellyfin "/var/lib/jellyfin/plugins/SineKutu Kota Yönetimi"`
   * `sudo systemctl restart jellyfin` komutunu çalıştırdığınızdan emin olun.
3. **HTTP 404 / Route Not Found:**
   * Laravel sunucunuzda route önbelleğini temizleyin: `php artisan route:clear && php artisan config:clear`.
