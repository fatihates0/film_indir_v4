# SineKutu Kota Yönetimi (Emby Server Eklentisi)
**Sürüm:** v5.0 (Emby Kararlı Sürüm)  
**Hedef Framework:** .NET 8.0  
**Uyumlu Emby Server Sürümleri:** 4.8.x, 4.9.x, 4.10.x  

---

## 📌 İçindekiler
1. [Genel Bakış ve Çalışma Mantığı](#1-genel-bakış-ve-çalışma-mantığı)
2. [Gelişmiş Koruma Sistemleri](#2-gelişmiş-koruma-sistemleri)
3. [Gereksinimler ve Derleme (Build)](#3-gereksinimler-ve-derleme-build)
4. [Sunucuya Kurulum (Manuel / SSH)](#4-sunucuya-kurulum-manuel--ssh)
5. [Yetkilendirme ve Güvenlik Ayarları](#5-yetkilendirme-ve-güvenlik-ayarları)
6. [Emby Web Panelinde Yapılandırma](#6-emby-web-panelinde-yapılandırma)
7. [Laravel API Uç Noktaları (Endpoints)](#7-laravel-api-uç-noktaları-endpoints)
8. [Sorun Giderme ve Canlı Log İzleme](#8-sorun-giderme-ve-canlı-log-izleme)

---

## 1. Genel Bakış ve Çalışma Mantığı

SineKutu Kota Yönetimi, Jellyfin eklentisindeki mimarinin ve koruma mekanizmalarının birebir aynısını Emby Server için sunan modern bir C# (.NET 8.0) eklentisidir.

Kullanıcı Emby üzerinde herhangi bir film veya dizi içeriğini **oynatmaya başladığı anda (`PlaybackStart`)**, eklenti Laravel API'sine canlı sorgu gönderir:

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
Kullanıcı bir filme kaldığı yerden devam ettiğinde (örneğin 15. dakikada `943901ms`), istemciden gelen ilk konum bilgisi kota sayacının **referans başlangıcı** olarak kabul edilir. İlk açılışta geçmiş 15 dakikanın kotası **asla haksız yere düşülmez**, sadece o andan sonra izlenen saniyeler kotadan kesilir.

### B. İleri Sarma ve Atlama Koruması (Anti-Seek Guard)
Kullanıcı videoyu 30 dakika veya 1 saat ileri sardığında gerçekte bu süreyi indirip izlememiştir; oynatıcı yalnızca atlanan yerdeki birkaç saniyelik tampon (buffer) verisini indirir. Eklenti, gerçek dünya süresinden belirgin derecede hızlı ilerlemeleri tespit eder ve süreyi en fazla 3 saniyelik tampon ile sınırlar.

### C. Toplu Veri Bildirimi (Batching & Disk I/O Guard)
Emby'nin saniyelik ilerleme olaylarında Laravel veritabanını kilitlememek için veriler RAM üzerinde biriktirilir (varsayılan: 15 MB veya 30 saniye). Eşik aşıldığında veya video kapatıldığında tek bir HTTP isteği ile Laravel'e aktarılır.

### D. Emby 4.10+ SPA Uyumlu Web Kontrolcüsü (AMD / RequireJS)
Emby Server 4.10 web arayüzünün konfigürasyon sayfasını açarken aradığı `SineKutuConfig.js` RequireJS kontrolcüsü eklenti DLL'i içine gömülüdür. Bu sayede sayfa açılışında ekranın boş kalması veya kilitlenmesi engellenir.

---

## 3. Gereksinimler ve Derleme (Build)

### Gereksinimler
- **.NET 8.0 SDK** (Geliştirme / derleme ortamında)
- **Emby Server** (Ubuntu / Debian veya Windows Server)

### Derleme Komutu
Terminalden şu komutu çalıştırarak yayın klasörünü hazırlayabilirsiniz:

```powershell
cd c:\film_indir\film_indir_v4\emby-plugins\Emby.Plugin.QuotaManager
dotnet publish -c Release -o publish
```

Hazır DLL çıktısı:
```text
publish/Emby.Plugin.QuotaManager.dll
```

---

## 4. Sunucuya Kurulum (Manuel / SSH)

### Adım 1: Sunucuda Eklenti Dizinini Kontrol Edin
Ubuntu / Debian sunucunuzda eklentiler `/var/lib/emby/plugins/` dizininde yer alır.

```bash
# Eklentiler klasörü kontrolü
sudo ls -la /var/lib/emby/plugins/
```

> **Windows Sunucular için Klasör Yolu:**  
> `C:\Users\<Kullanici>\AppData\Roaming\Emby-Server\programdata\plugins\` veya `C:\ProgramData\EmbyServer\plugins\`

### Adım 2: DLL Dosyasını Sunucuya Gönderme (SCP)
Geliştirme makinenizin PowerShell terminalinden `publish` altındaki DLL dosyasını sunucuya kopyalayın:

```powershell
# Windows PowerShell üzerinden:
scp c:\film_indir\film_indir_v4\emby-plugins\Emby.Plugin.QuotaManager\publish\Emby.Plugin.QuotaManager.dll root@SUNUCU_IP:/var/lib/emby/plugins/
```

### Adım 3: Yetkilendirme ve İzinleri Düzenleme
Sunucu tarafında dosya sahipliğini `emby` kullanıcısına verin ve çalıştırma izinlerini ayarlayın:

```bash
sudo chown emby:emby /var/lib/emby/plugins/Emby.Plugin.QuotaManager.dll
sudo chmod 755 /var/lib/emby/plugins/Emby.Plugin.QuotaManager.dll
```

### Adım 4: Emby Server'ı Yeniden Başlatma
```bash
sudo systemctl restart emby-server
```

---

## 5. Yetkilendirme ve Güvenlik Ayarları

Eklenti ile Laravel arasındaki iletişim API Anahtarı (API Key) ile güvence altına alınmıştır.

### Laravel Tarafı (`.env`)
Laravel projenizin `.env` dosyasında anahtarınızı tanımlayın:
```env
JELLYFIN_PLUGIN_API_KEY=sinekutu_super_secret_key_2026
EMBY_PLUGIN_API_KEY=sinekutu_super_secret_key_2026
```

---

## 6. Emby Web Panelinde Yapılandırma

1. Emby Yönetim Paneli -> **Eklentiler (Plugins)** sayfasına gidin.
2. **SineKutu Kota Yönetimi** eklentisine tıklayın. (Doğrudan URL: `http://SUNUCU_IP:8096/web/index.html#!/configurationpage?name=SineKutuConfig`)
3. Ayarları yapılandırın:
   - **Laravel API Base URL:** `http://localhost:8000/api/jellyfin` veya `http://localhost:8000/api/emby` (veya sunucu IP/domain adresi)
   - **Laravel API Anahtarı:** `.env` dosyasındaki `JELLYFIN_PLUGIN_API_KEY` veya `EMBY_PLUGIN_API_KEY`
   - **API Hatasında Yayını Durdur:** Güvenlik için işaretleyin (Laravel API'sine erişilemezse yayını engeller).
   - **Kota Bitince Oturumu Kapat:** Kota tükenince yayını anında durdurur.
   - **Kota Bitince Hesabı Pasife Al:** Kota dolduğunda kullanıcı hesabını Emby üzerinde pasife alır (isteğe bağlı).
   - **Toplu Kota Düşüm Eşiği (MB):** `15` MB
   - **Toplu Düşüm Zaman Aralığı (Sn):** `30` saniye
   - **Periyodik Senkronizasyon (Dakika):** `30` dakika
4. **Kaydet** butonuna tıklayın.

> **İpucu:** Ayarlar kaydedildikten sonra tarayıcı önbelleğinden dolayı eski sayfa kalmaması için **Ctrl + F5** ile sayfayı yenileyebilirsiniz.

---

## 7. Laravel API Uç Noktaları (Endpoints)

Eklenti hem `/api/jellyfin` hem de `/api/emby` uç noktaları üzerinden çalışacak şekilde hazır yapılandırılmıştır:

| Metot | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/api/emby/check-access?username={kullanici}` | Oynatma öncesi canlı paket ve kota kontrolü |
| `POST` | `/api/emby/deduct-quota` | Harcanan bayt verisini kullanıcının kotasından düşme |
| `GET` | `/api/emby/quotas` | Tüm kullanıcıların kota özetini senkronize etme |
| `POST` | `/api/emby/quota-exceeded` | Kota aşımı bildirim günlüğü |

---

## 8. Sorun Giderme ve Canlı Log İzleme

Ubuntu sunucunuzda eklentinin canlı olarak ne yaptığını izlemek için:

```bash
tail -f /var/lib/emby/logs/embyserver.txt | grep QuotaManager
```

### Beklenen Sağlıklı Log Örnekleri:

**1. Oynatma Başladığında (Canlı Doğrulama):**
```text
Info QuotaManager: Kullanıcı finishedtakip1@gmail.com bir içerik başlatıyor (Oturum: 088be7d...). Laravel erişim denetimi yapılıyor...
Info QuotaManager: Kullanıcı finishedtakip1@gmail.com erişimi ONAYLANDI. Kalan kota: 1999.01 GB
Info QuotaManager: Kullanıcı finishedtakip1@gmail.com oturumu başlangıç/resume konumu 15.73 dakika olarak eşitlendi. İlk senkronizasyonda kota düşülmedi.
```

**2. Video Durdurulduğunda (Kalan Tampon Verisi):**
```text
Info QuotaManager: Kullanıcı finishedtakip1@gmail.com yayını durdurdu. Kalan son 3.65 MB Laravel'e aktarılıyor.
Info QuotaManager: Kullanıcı finishedtakip1@gmail.com kotasından 3.65 MB düşüldü. Kalan: 2044377.92 MB
```

**3. Paketsiz veya Kotasız Kullanıcı Engellendiğinde:**
```text
Warn QuotaManager: Kullanıcı ahmet@gmail.com erişimi REDDEDİLDİ (quota_exhausted): İzleme kotanız dolmuştur. İçerik izleyemezsiniz.
```
