# Enterprise Storage Gateway v3.2 - Kurulum ve Kullanım Rehberi

Bu döküman, **Enterprise Virtual Storage Gateway Daemon v3.2** servisinin Linux (Ubuntu/Debian) sunucularda sıfırdan kurulması, konfigürasyonu, çoklu disk (depo) yönetimi ve Laravel yönetim paneli ile entegrasyonu için detaylı bir rehberdir.

---

## 📌 Genel Bakış ve Mimari

**Storage Gateway**, platformunuzdaki fiziksel/sanal depolama sunucularını (VPS, Dedicated, Storage Box vb.) yüksek performanslı birer indirme ve yükleme düğümüne (node) dönüştüren hafif ve güvenli bir servistir.

### Öne Çıkan Özellikler
* **Çoklu Disk Havuzu (Multi-Disk Storage Pool):** Birden fazla diski (`/mnt/depo1`, `/mnt/depo2` vb.) otomatik olarak birleştirip tek bir depolama havuzu olarak sunar.
* **Otomatik Disk Algılama ve Formatlama:** `lsblk` tabanlı evrensel disk tarayıcı ile bağlı diskleri tespit eder, gerekirse `ext4` formatlayıp `/etc/fstab` kaydını otomatik yapar.
* **HMAC SHA256 Güvenlik:** İndirme ve API istekleri imzalı token'lar ile doğrulanır, yetkisiz erişimler engellenir.
* **Nginx & Otomatik SSL (Certbot):** Nginx ters proxy (reverse proxy) konfigürasyonu ve Let's Encrypt SSL sertifikasını otomatik kurar.
* **Range & Direct Streaming:** Video/film dosyaları için kısmi indirme (HTTP Range requests - 206 Partial Content) desteği sunar.
* **Otomatik Sağlık & Uyarılama (Cron & Telegram/Webhook):** Disk doluluk oranlarını (%85 ve üzeri) ve servis durumunu takip edip Telegram/Webhook bildirimi gönderir.

---

## 📋 Sistem Gereksinimleri

* **İşletim Sistemi:** Ubuntu 20.04 / 22.04 LTS veya Debian 11 / 12 (Root yetkisi gereklidir)
* **Gerekli Paketler (Script Tarafından Otomatik Kurulur):** Node.js (v20.x), Nginx, Certbot, Python3, Git, Curl, Build-Essential.
* **Ağ & Alan Adı (DNS):**
  * Storage sunucunuza yönlendirilmiş bir subdomain (Örn: `storage1.filmindir.com`).
  * `80` (HTTP) ve `443` (HTTPS) portlarının dış erişime açık olması (güvenlik duvarında izinli).

---

## 🚀 1. Hızlı Kurulum Adımları

### Adım 1: Scripti Depolama Sunucusuna İndirin
Scripti sunucunuza indirin ve çalışma izni verin:

```bash
sudo curl -fsSL -o gateway_setup.sh https://siteniz.com/scripts/gateway_setup.sh
sudo chmod +x gateway_setup.sh
```

*(Veya Laravel projenizdeki `public/scripts/gateway_setup.sh` dosyasını sunucunuza yükleyin.)*

### Adım 2: Sihirbazı Çalıştırın
Kurulum sihirbazını başlatmak için şu komutu çalıştırın:

```bash
sudo bash gateway_setup.sh install
```

---

## ⚙️ 2. Kurulum Sihirbazı Parametreleri

Kurulum esnasında sihirbaz sizden sırasıyla aşağıdaki bilgileri isteyecektir:

1. **Depolama Subdomain Adresi:** 
   * *Örnek:* `storage1.filmindir.com`
   * *Açıklama:* Nginx ve Let's Encrypt SSL sertifikası bu domain adına göre yapılandırılır.
2. **Laravel İletişim Secret Key:**
   * *Örnek:* `Rastgele 48 karakterlik karmaşık key` veya ENTER (Script otomatik üretecektir).
   * *Açıklama:* Laravel backend ile Storage Gateway sunucusunun güvenli haberleşmesini sağlayan gizli anahtardır. **Laravel paneline eklerken bu anahtar kullanılacaktır.**
3. **Gateway Portu:**
   * *Varsayılan:* `8080` (İç servis portudur, dış dünyaya Nginx 80/443 portlarından sunulur).
4. **Disk Seçimi:**
   * Sihirbaz sunucuda takılı tüm fiziksel ve sanal diskleri sıralar.
   * Havuza eklemek istediğiniz disk numaralarını virgülle girin (Örn: `1,2`).
   * Seçilen diskler otomatik olarak `/mnt/depo1`, `/mnt/depo2` dizinlerine bağlanır ve `/etc/fstab` dosyasına işlenir.

---

## 💻 3. İnteraktif Yönetim Paneli

Kurulum tamamlandıktan sonra `sudo bash gateway_setup.sh` komutunu çalıştırarak ana yönetim menüsüne ulaşabilirsiniz:

```text
====================================================================
   DYNAMIC VIRTUAL STORAGE GATEWAY MANAGER v3.2
====================================================================
 Servis Durumu       : ÇALIŞIYOR / ONLINE
 Nginx Durumu        : ÇALIŞIYOR
 SSL Sertifikası     : GEÇERLİ (89 gün)
 Subdomain           : storage1.filmindir.com
 Gateway Port        : 8080
 Secret Key          : 4f8b9...
 Aktif Depo Diskleri : /mnt/depo1,/mnt/depo2
====================================================================

YÖNETİM İŞLEMLERİ:
  [1]  Aktif Disk Durumu ve Doluluk Analizi
  [2]  Yeni Disk Ekle
  [3]  Havuzdan Disk Çıkar
  [4]  Gateway Servis Loglarını Canlı İzle
  [5]  Gateway Servisini Yeniden Başlat
  [6]  Gateway Konfigürasyonunu Yeniden Kur / Güncelle
  ----------------------------------------------------
  [7]  🔑 Token Yönetimi (Üret / Test / Decode)
  [8]  📊 Disk Doluluk Grafiği (ASCII)
  [9]  📁 Dosya İstatistikleri
  [10] 🌐 Bağlantı ve Erişilebilirlik Testi
  [11] 💾 Disk Kota ve Etiket Yönetimi
  [12] 📧 Bildirim Ayarları (Webhook / Telegram)
  [13] 🔁 Cron Sağlık Kontrolü Yönetimi
  ====================================================
  [0]  Çıkış
```

---

## 🔧 4. Komut Satırı (CLI) Kısayolları

Scripti menüsüz olarak doğrudan özel parametrelerle de çalıştırabilirsiniz:

| Komut | Açıklama |
| :--- | :--- |
| `sudo bash gateway_setup.sh status` | Servis, Nginx, SSL ve Disk genel durum özetini gösterir. |
| `sudo bash gateway_setup.sh list-disks` | Havuzdaki aktif disklerin boyut, kullanılan ve boş alan analizi. |
| `sudo bash gateway_setup.sh add-disk` | Etkileşimli yeni disk arama ve havuza bağlama modunu açar. |
| `sudo bash gateway_setup.sh remove-disk` | Havuzdan disk güvenli çıkarma ve umount işlemi. |
| `sudo bash gateway_setup.sh logs` | Gateway Daemon canlı loglarını izler (`journalctl`). |
| `sudo bash gateway_setup.sh restart` | Storage Gateway servisini yeniden başlatır. |
| `sudo bash gateway_setup.sh token` | Test token üretme ve endpoint doğrulama aracı. |
| `sudo bash gateway_setup.sh disk-graph` | ASCII formatında görsel disk doluluk grafiği çizer. |
| `sudo bash gateway_setup.sh file-stats` | Disklerdeki toplam dosya/klasör sayısı ve uzantı dağılımı. |
| `sudo bash gateway_setup.sh connectivity` | Yerel ve dış ağ erişilebilirlik testlerini gerçekleştirir. |

---

## 🔌 5. API Endpoint'leri ve Protokol Özellikleri

Storage Gateway Node.js Daemon aşağıdaki REST HTTP/HTTPS API uç noktalarını sunar:

### 1. Servis Sağlık Durumu (`/health`)
* **Yöntem:** `GET`
* **Doğrulama:** Token gerektirmez.
* **Yanıt:**
  ```json
  { "success": true, "status": "online", "message": "Servis saglikli ve calisiyor" }
  ```

### 2. Disk Kapasite Raporu (`/disks`)
* **Yöntem:** `GET`
* **Doğrulama:** `token` (HMAC İmzalı)
* **Yanıt:** Havuzun toplam, kullanılan, boş bayt ve MB değerlerini, fiziksel disk bazında detaylarıyla döner.

### 3. Dosya Taraması (`/scan`)
* **Yöntem:** `GET`
* **Doğrulama:** `token` (HMAC İmzalı)
* **Açıklama:** `/mnt/depo1`, `/mnt/depo2` vb. tüm aktif havuz disklerini derinlemesine tarar; mkv, mp4, avi gibi medya dosyalarını indeksler.

### 4. Güvenli Dosya İndirme / Streaming (`/download`)
* **Yöntem:** `GET`
* **Doğrulama:** `token` (HMAC İmzalı)
* **Destek:** HTTP 206 Partial Content (Range), `Accept-Ranges: bytes`. Video ileri-geri sarmayı tam destekler.
* **Otomatik Kota Webhook'u (Byte Tracking):** İndirme bağlantısı sağlandığında indirme biletinin token'ı (`ticket_token`) ve Laravel adresi (`app_url`) HMAC payload'ında taşınır. İndirme tamamlandığında veya bağlantı sonlandığında Storage Gateway arka planda otomatik olarak Laravel'in `POST /api/internal/downloads/log-bytes` adresine istek atarak aktarılan bayt miktarını bildirir ve kullanıcının kotasından düşer.

### 5. Yükleme (`/upload`)
* **Yöntem:** `POST`
* **Doğrulama:** `token` (HMAC İmzalı)
* **Açıklama:** Multipart/form-data veya raw stream yüklemelerini kabul eder. Yüklenen dosyayı havuz içinde **en çok boş alanı olan diske (Best Target Disk)** otomatik kaydeder.

---

## 🌐 6. Laravel Admin Paneline Depolama Sunucusu Ekleme

Sunucu kurulumu tamamlandıktan sonra Laravel yönetici panelinizden bağlantıyı kurabilirsiniz:

1. **Admin Paneline Giriş Yapın:** `Admin -> Depolama Sunucuları (Storage Boxes)` sayfasına gidin.
2. **Yeni Depolama Sunucusu Ekle** butonuna tıklayın.
3. **Form Bilgilerini Doldurulması:**
   * **Sunucu Adı:** Örn: `Hetzner Storage Node #1`
   * **Host / IP:** Subdomain adresiniz (Örn: `storage1.filmindir.com`) veya Sunucu IP Adresi.
   * **Protokol:** `Custom Storage Gateway` (`custom_gateway`) seçin.
   * **Port:** `443` (SSL aktif ise) veya `8080` / `80`.
   * **Secret Key:** Kurulum esnasında belirlediğiniz `STORAGE_SECRET_KEY` değerini yapıştırın.
   * **Durum:** `Aktif`
4. **Bağlantıyı Test Et:** Panel üzerindeki **"Test Et"** butonuna basarak yeşil **Online** durumunu ve gecikme (ping) süresini doğrulayın.
5. **Medyaları Tara:** **"Taramayı Başlat"** butonuna tıklayarak depolama sunucusundaki film/dizi dosyalarının katalog veritabanına otomatik aktarılmasını sağlayın.

---

## 🛠️ 7. Dosya Yapısı ve Konfigürasyon Lokasyonları

* **Servis Dizin Yolu:** `/opt/storage-gateway`
* **Çevre Değişkenleri Dosyası:** `/opt/storage-gateway/.env`
* **Daemon Çalıştırıcı:** `/opt/storage-gateway/server.js`
* **Systemd Servis Tanımı:** `/etc/systemd/system/storage-gateway.service`
* **Nginx Konfigürasyonu:** `/etc/nginx/sites-available/storage.conf`
* **Sağlık Kontrol Logu:** `/var/log/storage-gateway-health.log`
* **Depolama Mount Dizinleri:** `/mnt/depo1`, `/mnt/depo2`, `/mnt/depo3` ...

---

## ❓ Sorun Giderme (Troubleshooting)

### 1. Servis Başlamıyor Veya Offline Görünüyor
Logları kontrol edin:
```bash
journalctl -u storage-gateway -n 50 --no-pager
```
* `.env` dosyasındaki `STORAGE_SECRET_KEY` veya `STORAGE_DISKS` dizinlerinin varlığını doğrulayın.

### 2. Nginx 502 Bad Gateway Hatası
Node.js uygulamasının 8080 portunda dinlediğinden emin olun:
```bash
ss -tlnp | grep 8080
sudo systemctl restart storage-gateway
```

### 3. SSL Sertifikası Yenileme
Let's Encrypt sertifikasını manuel yenilemek için:
```bash
sudo certbot renew --nginx
sudo systemctl reload nginx
```
