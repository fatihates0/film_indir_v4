# Laravel 13 Medya Platformu --- Altyapı ve Teknik Tasarım Dokümantasyonu

**Belge türü:** Teknik mimari, uygulama planı ve gateway prototipi\
**Tarih:** 9 Ekim 2026\
**Durum:** Tasarım + ilk prototip taslağı; üretime hazır olduğu
doğrulanmamıştır.

------------------------------------------------------------------------

## 1. Projenin amacı

Laravel tabanlı film indirme platformundaki kullanıcıların hem doğrudan
film indirirken hem de Jellyfin veya Emby üzerinden film izlerken aynı
kota havuzunu tüketmesi hedeflenmektedir.

Sistem şu ihtiyaçları karşılamalıdır:

-   Laravel kullanıcı hesabı ve premium abonelik yönetimi.
-   Kullanıcı başına dönemsel trafik kotası.
-   İndirmede ve medya akışında gerçekten aktarılan baytların ölçülmesi.
-   Abonelik satın alındığında Jellyfin/Emby hesabı açılması veya
    etkinleştirilmesi.
-   Abonelik sona erdiğinde hesapların devre dışı bırakılması ve aktif
    oturumların sonlandırılması.
-   FTP/WebDAV/uzak depolamadaki medya dosyalarını yerel diske
    indirmeden akış halinde iletme.
-   Eşzamanlı bağlantılarda kota aşımını önleme.
-   Kullanım geçmişi ve hata kayıtları.

**Temel ilke:** Oynatma süresi gerçek ağ tüketiminin güvenilir karşılığı
değildir. Gerçek kota için, kullanıcıya giden medya verisinin
ölçülebildiği bir dağıtım katmanı gerekir.

## 2. Kullanıcı tarafından belirlenen mimari tercihleri

-   Uygulama: mevcut Laravel 13 projesi.
-   Gateway: medya HDD'sinin bulunduğu Ubuntu 24 sunucusunda.
-   Medya erişimi: FTP, WebDAV veya başka uzak depolama.
-   Medya sunucuları: Jellyfin ve Emby.
-   Kota ölçümü: gerçek aktarılan bayt/GB.
-   İlk geliştirme adımı: Laravel'e doğrudan entegre etmeden bağımsız
    gateway uygulaması.
-   Medya dosyaları gateway diskine kopyalanmamalı; mümkün olduğunca
    akış halinde aktarılmalı.
-   Kota, indirme ve medya oynatma için ortak olmalı.

## 3. Önerilen yüksek seviyeli mimari

``` text
                       ┌──────────────────────────┐
                       │       Laravel 13         │
                       │ Üyelik / Ödeme / Kota    │
                       │ Kullanıcı / Yönetim API  │
                       └─────────────┬────────────┘
                                     │
                         Yetki ve kullanım kayıtları
                                     │
                       ┌─────────────▼────────────┐
                       │    Media Gateway         │
                       │ Ubuntu 24 / Go HTTP      │
                       │ Kimlik / Akış / Sayaç    │
                       └───────┬─────────┬────────┘
                               │         │
                       ┌───────▼───┐ ┌───▼────────┐
                       │ Jellyfin  │ │   Emby     │
                       │ API/Media │ │ API/Media  │
                       └───────┬───┘ └───┬────────┘
                               │         │
                               └────┬────┘
                                    │
                       ┌────────────▼────────────┐
                       │ FTP / WebDAV / Uzak HDD │
                       │ Asıl medya dosyaları    │
                       └─────────────────────────┘

                  Redis: hızlı sayaç / rezervasyon / oturum
                  MySQL: kalıcı abonelik ve kullanım kayıtları
```

### Bileşenlerin sorumlulukları

**Laravel** - Kullanıcı, ödeme ve aboneliklerin ana kaynağı. - Kota
dönemi, limit ve kullanım kayıtlarının kalıcı sahibi. - Jellyfin/Emby
hesaplarının oluşturulması ve kapatılması için kuyruk işleri. - Gateway
token'larının güvenilir verilerden üretilmesi. - Yönetim paneli ve
raporlama.

**Media Gateway** - Gelen isteğin kullanıcı ve medya kaynağıyla
ilişkisini doğrulama. - Geçerli abonelik ve kota yetkisini kontrol
etme. - Uzak depolamadan akış alıp istemciye aktarma. - Gönderilen
baytları sayma. - Kota dolunca yeni veri aktarımını durdurma. -
Range/seek ve istemci bağlantısı kesilmesi senaryolarını ele alma.

**Jellyfin ve Emby** - Kütüphane, oynatıcı ve medya deneyimi. -
Kullanıcı ve oturum bilgileri. - Oynatma olayları ve oturum
eşleştirmesi. - Gateway'in dışında doğrudan erişime açık bırakılmamalı;
hedeflenen kota mimarisinde medya verisi gateway üzerinden geçmelidir.

**Redis** - Hızlı kota sayaçları, aktif akışlar ve geçici yetkiler. -
Atomik kota rezervasyonu için Lua script'leri veya uygun atomik
işlemler.

**MySQL** - Kalıcı kullanıcı, abonelik, kota dönemi, hesap eşleştirmesi
ve kullanım logları. - Redis sayacının kaybolması durumunda mutabakat
yapılabilecek kayıt kaynağı.

## 4. Kota tanımı ve ölçüm kuralları

Baytları veritabanında saklamak, GB dönüşümünü arayüzde yapmak önerilir.

-   Ondalık GB: `1 GB = 1,000,000,000 byte`
-   İkili GiB: `1 GiB = 1,073,741,824 byte`

Arayüz hangi birimi gösterdiğini açıkça belirtmelidir.

Önerilen kullanılabilir kota formülü:

``` text
available_bytes = limit_bytes - used_bytes - reserved_bytes
```

-   `limit_bytes`: dönem için izin verilen toplam miktar.
-   `used_bytes`: kesinleşmiş tüketim.
-   `reserved_bytes`: aktif akışlar için ayrılmış kota.

### Gerçek ölçümün sınırları

Gateway'in ölçtüğü HTTP yanıt baytları, uygulama katmanında istemciye
yazılan veri miktarıdır. Bu, TCP yeniden iletimleri dahil fiziksel ağ
arayüzünden geçen toplam baytla birebir aynı değildir. İş gereksinimi
uygulama katmanında aktarılan medya verisi ise gateway ölçümü uygundur.

Şunlar ayrıca ele alınmalıdır:

-   HTTP `206 Partial Content` ve `Range` başlıkları.
-   Devam eden indirmeler.
-   İleri/geri sarma ve yeniden bağlanma.
-   HLS/DASH segmentleri.
-   Aynı filmin tekrar izlenmesi.
-   Eşzamanlı akışların aynı kotayı tüketmesi.
-   Gateway sürecinin veya Redis'in yeniden başlaması.
-   İstemciye yazılamayan baytların muhasebesi.
-   Bir kullanım olayının tekrar işlenmesi nedeniyle çift sayım.

Yalnızca oynatma süresini bit hızıyla çarpmak bir tahmindir; gerçek kota
olarak kullanılmamalıdır.

## 5. Önerilen veritabanı tabloları

Bu tablo isimleri öneridir. Mevcut Laravel veritabanı incelenmeden
doğrudan migration olarak çalıştırılmamalıdır; var olan kullanıcı,
abonelik ve ödeme yapılarıyla eşleştirilmelidir.

### 5.1 `media_server_accounts`

Jellyfin/Emby kullanıcı eşleştirmesi:

-   `id`
-   `user_id`
-   `server_type` (`jellyfin`, `emby`)
-   `external_user_id`
-   `status` (`active`, `disabled`, `error`)
-   `synced_at`
-   `created_at`, `updated_at`

Önerilen unique indeks: `(server_type, external_user_id)`.

### 5.2 `user_quotas`

Kullanıcı başına kota dönemi:

-   `user_id`
-   `period_start`
-   `period_end`
-   `limit_bytes`
-   `used_bytes`
-   `reserved_bytes`
-   `created_at`, `updated_at`

Kullanıcı ve dönem için unique kısıt düşünülmelidir. Birden fazla dönem
veya geçmiş dönemler tutulacaksa tasarım buna göre yapılmalıdır.

### 5.3 `media_usage_logs`

Kalıcı aktarım kayıtları:

-   `id`
-   `user_id`
-   `server_type` (`download`, `jellyfin`, `emby`)
-   `session_id`
-   `media_id`
-   `bytes_sent`
-   `started_at`
-   `ended_at`
-   `status`
-   `request_id`
-   `created_at`

`request_id` veya aktarım kimliği tekrar işleme durumlarında çift sayımı
önleyecek idempotency anahtarı olarak kullanılmalıdır.

### 5.4 `active_streams`

Aktif aktarım ve rezervasyonlar:

-   `id`
-   `user_id`
-   `server_type`
-   `external_session_id`
-   `last_activity_at`
-   `reserved_bytes`
-   `status`

Bağlantı koptuğunda rezervasyonun serbest bırakılması ve gerçek
tüketimin mutabakatı gerekir.

### 5.5 Mevcut tablolara uyum

Laravel projesinde daha önce `file_transfers`, `disk_scans`,
`plex_sync`, `default` adlı kuyruklar kullanıldığı bildirilmiştir. Bu
kuyrukları yeniden adlandırmak zorunlu değildir. Gateway için ayrı bir
uygulama servisi kullanılır; Laravel tarafındaki kuyruk işleri mevcut
queue altyapısına göre düzenlenir.

## 6. Abonelik ve medya hesabı yaşam döngüsü

### Ödeme başarılı olduğunda

1.  Ödeme webhook imzası doğrulanır.
2.  Laravel aboneliği etkinleştirir.
3.  `ProvisionMediaAccount` kuyruğa alınır.
4.  Jellyfin/Emby kullanıcısı oluşturulur veya mevcut hesap
    etkinleştirilir.
5.  Medya sunucusunun kullanıcı ID'si `media_server_accounts` tablosuna
    yazılır.
6.  Gateway yetkisi etkin abonelikle eşleştirilir.

### Abonelik bittiğinde

1.  Zamanlanmış görev süresi dolan abonelikleri bulur.
2.  Jellyfin/Emby hesabı devre dışı bırakılır.
3.  İlgili aktif oturumlar sonlandırılır.
4.  Gateway yeni medya isteklerini reddeder ve aktif akış yetkisini
    iptal eder.
5.  İşlem sonucu kaydedilir; API hatalarında kontrollü tekrar deneme
    yapılır.

Yalnızca medya sunucusu hesabını kapatmak yeterli değildir. Gateway her
yeni istekte yetkiyi doğrulamalı ve mevcut akışları da sonlandırabilecek
iptal mekanizmasına sahip olmalıdır.

### Önerilen Laravel sınıfları

``` text
app/
├── Services/
│   ├── MediaServers/
│   │   ├── MediaServerInterface.php
│   │   ├── JellyfinService.php
│   │   └── EmbyService.php
│   ├── Quota/
│   │   ├── QuotaService.php
│   │   └── UsageRecorder.php
│   └── Gateway/
│       └── GatewayTokenService.php
├── Jobs/
│   ├── ProvisionMediaAccount.php
│   ├── DisableExpiredMediaAccount.php
│   └── ReconcileMediaUsage.php
└── Console/Commands/
    └── SyncMediaSubscriptions.php
```

Ortak medya sunucusu arayüzü için ilk taslak:

``` php
<?php

namespace App\Services\MediaServers;

interface MediaServerInterface
{
    public function createUser(
        string $username,
        string $password
    ): string;

    public function setUserEnabled(
        string $externalUserId,
        bool $enabled
    ): void;

    public function terminateUserSessions(
        string $externalUserId
    ): void;
}
```

Bu bir uygulama içi sözleşmedir; Jellyfin/Emby API uç noktalarının
gerçek isimleri değildir. Her adaptör kendi API'sine göre yazılmalı ve
test edilmelidir.

## 7. Güvenlik gereksinimleri

-   Jellyfin ve Emby portları internetten doğrudan erişilebilir
    olmamalı.
-   Gateway yalnızca izin verilen medya kaynaklarına erişmeli;
    istemciden gelen URL'yi doğrudan upstream olarak kullanmamalı.
-   Token kısa ömürlü olmalı, imzası doğrulanmalı ve kullanıcı, medya
    kaynağı, kota dönemi ile ilişkilendirilmeli.
-   Token'daki medya kimliği istenen kaynakla karşılaştırılmalı.
-   Medya sunucusu yönetici anahtarları istemciye gönderilmemeli.
-   API anahtarları ve WebDAV/FTP parolaları kaynak koduna yazılmamalı.
-   Gizli bilgiler root veya özel servis kullanıcısı tarafından
    okunabilen dosyalarda tutulmalı.
-   Redis dış internete açılmamalı.
-   Redis veya kota kontrolü erişilemiyorsa yeni akışlar güvenli biçimde
    reddedilmeli.
-   Hassas token ve `Authorization` başlıkları loglanmamalı.
-   Kullanıcı girdileri dosya yolu olarak doğrudan kullanılmamalı.
-   HTTP yönlendirmeleri kontrolsüz takip edilmemeli; aksi halde
    depolama kimlik bilgileri sızabilir.
-   Eşzamanlı kota rezervasyonları atomik yapılmalı.
-   Hata, denetim ve kullanım kayıtları tutulmalı.

## 8. Bağımsız Go gateway prototipi

İlk aşamada Go HTTP servisi önerilmiştir. Nedenleri:

-   Uzun süren akışları PHP-FPM süreçlerinden ayırmak.
-   Akış halinde veri aktarmak.
-   Her veri parçasını ölçmek.
-   Redis ile hızlı kota kontrolü yapmak.
-   Laravel'den bağımsız geliştirme ve yük testi.

Örnek dizin planı:

``` text
/opt/media-gateway/       # Go uygulaması
/etc/media-gateway/       # Root tarafından yönetilen yapılandırma
/var/log/media-gateway/   # Log dizini (journald de kullanılabilir)
/opt/media/               # Örnek yerel medya dizini; uzak kaynakta zorunlu değil
```

### 8.1 Ubuntu paketleri ve dizinler

``` bash
sudo apt update
sudo apt install -y golang-go redis-server ca-certificates curl
sudo systemctl enable --now redis-server

sudo install -d -m 0750 /opt/media-gateway
sudo install -d -m 0750 /etc/media-gateway
sudo install -d -m 0750 /var/log/media-gateway

go version
redis-cli ping
```

Redis için beklenen yanıt `PONG` olmalıdır.

### 8.2 Yapılandırma örneği

`/etc/media-gateway/gateway.env`:

``` ini
GATEWAY_ADDR=127.0.0.1:8787
GATEWAY_HMAC_SECRET=BURAYA_EN_AZ_32_BAYT_RASTGELE_GIZLI_ANAHTAR
REDIS_ADDR=127.0.0.1:6379

DAV_BASE_URL=https://storage.example.com/remote.php/dav/files/MEDIA_USER/
DAV_USERNAME=MEDIA_USER
DAV_PASSWORD=WEB_DAV_SIFREN
```

Gizli anahtar oluşturma:

``` bash
openssl rand -hex 32
```

`DAV_BASE_URL` bir örnektir; gerçek WebDAV URL'si kullanılmalıdır. Bu
ilk prototip yalnızca HTTP(S) üzerinden erişilebilen WebDAV kaynağı için
tasarlanmıştır. FTP adaptörü ayrıca geliştirilmelidir.

Dosya izinleri:

``` bash
sudo install -m 0600 /dev/null /etc/media-gateway/gateway.env
sudo nano /etc/media-gateway/gateway.env
```

Dikkat: `install -m 0600 /dev/null ...` boş dosya oluşturur; içeriği
düzenleyerek doldurmak gerekir.

### 8.3 Medya kimlik haritası

`/etc/media-gateway/media-map.json`:

``` json
{
  "movie-1001": "Filmler/Ornek.Film.2025.mkv",
  "movie-1002": "Filmler/Baska.Film.2024.mp4"
}
```

Dosya yolları WebDAV temel dizinine göre göreli olmalıdır. Gerçek dosya
adlarıyla değiştirilmelidir. İstemci keyfi URL veya keyfi dosya yolu
gönderememelidir.

### 8.4 Go prototipinin işleyişi

Önceki taslak `main.go` şu işlevleri içeriyordu:

-   HMAC-SHA256 imzalı token doğrulama.
-   Token'dan `uid`, `mid`, `exp`, `period`, `limit_bytes` alanlarını
    okuma.
-   Medya ID'sini izin verilen `media-map.json` listesinde arama.
-   WebDAV'a Basic Auth ile istek gönderme.
-   `Range` ve `If-Range` başlıklarını upstream'e iletme.
-   `Content-Type`, `Content-Length`, `Content-Range`, `Accept-Ranges`,
    `ETag` ve `Last-Modified` gibi yanıt başlıklarını iletme.
-   `Cache-Control: no-store` kullanma.
-   Yanıt gövdesini 64 KiB parçalarla okuyup Redis kota sayacını
    güncelleme.
-   Kota dolduğunda veya Redis erişilemez olduğunda akışı durdurma.
-   `/healthz` sağlık endpoint'i sağlama.

Redis için ilk taslakta atomik artırma yapan Lua script'i ve yazılamayan
baytları iade etmeye çalışan bir script vardı. Bu, yalnızca prototip
mantığıdır; aşağıdaki sınırlamalar giderilmeden üretim kullanımı için
yeterli değildir.

### 8.5 Go modülü ve derleme

``` bash
cd /opt/media-gateway
sudo go mod init media-gateway
sudo go get github.com/redis/go-redis/v9
sudo go mod tidy
sudo go build -o /usr/local/bin/media-gateway .
```

Bu komutlar, `main.go` dosyası doğru yerleştirilmiş ve gerekli kod
düzeltmeleri yapılmışsa kullanılmalıdır. `go mod init` daha önce
çalıştırıldıysa tekrar çalıştırılmamalıdır.

### 8.6 systemd servisi

`/etc/systemd/system/media-gateway.service`:

``` ini
[Unit]
Description=Media Streaming Gateway
After=network-online.target redis-server.service
Wants=network-online.target
Requires=redis-server.service

[Service]
Type=simple
User=media-gateway
Group=media-gateway
EnvironmentFile=/etc/media-gateway/gateway.env
ExecStart=/usr/local/bin/media-gateway
Restart=on-failure
RestartSec=3

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true

[Install]
WantedBy=multi-user.target
```

Servis kullanıcısı ve dosya izinleri:

``` bash
sudo useradd --system --no-create-home \
  --shell /usr/sbin/nologin media-gateway

sudo chown root:media-gateway /etc/media-gateway
sudo chmod 0750 /etc/media-gateway

sudo chown root:media-gateway \
  /etc/media-gateway/gateway.env \
  /etc/media-gateway/media-map.json

sudo chmod 0640 \
  /etc/media-gateway/gateway.env \
  /etc/media-gateway/media-map.json
```

Servisi başlatma:

``` bash
sudo systemctl daemon-reload
sudo systemctl enable --now media-gateway
sudo systemctl status media-gateway --no-pager
sudo journalctl -u media-gateway -f
curl http://127.0.0.1:8787/healthz
```

Beklenen sağlık yanıtı:

``` text
ok
```

Gateway ilk aşamada `127.0.0.1:8787` üzerinde dinlemelidir. HTTPS
reverse proxy, yetkilendirme ve kota testleri tamamlanmadan internete
açılmamalıdır.

## 9. Token formatı ve Laravel imzalayıcısı

Prototip token biçimi:

``` text
base64url(JSON claims).base64url(HMAC-SHA256(payload))
```

Örnek claims:

``` json
{
  "uid": "123",
  "mid": "movie-1001",
  "exp": 1791570000,
  "period": "2026-10",
  "limit_bytes": 1000000000000
}
```

Bu örnek değerler test amaçlıdır. Gerçek token'ın süresi ve kotası
Laravel'in doğrulanmış abonelik ve kota kaydından gelmelidir. İstemcinin
gönderdiği limit değerine güvenilmemelidir.

Laravel dosyası: `app/Services/Gateway/GatewayTokenService.php`

``` php
<?php

namespace App\Services\Gateway;

use Illuminate\Support\Facades\Date;
use RuntimeException;

class GatewayTokenService
{
    public function issue(
        string $userId,
        string $mediaId,
        string $period,
        int $limitBytes
    ): string {
        $secret = config('services.media_gateway.secret');

        if (! is_string($secret) || strlen($secret) < 32) {
            throw new RuntimeException(
                'Media gateway secret is not configured.'
            );
        }

        $claims = [
            'uid' => $userId,
            'mid' => $mediaId,
            'exp' => Date::now()->addMinutes(5)->timestamp,
            'period' => $period,
            'limit_bytes' => $limitBytes,
        ];

        $json = json_encode(
            $claims,
            JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        );

        $payload = rtrim(
            strtr(base64_encode($json), '+/', '-_'),
            '='
        );

        $signature = hash_hmac(
            'sha256',
            $payload,
            $secret,
            true
        );

        $encodedSignature = rtrim(
            strtr(base64_encode($signature), '+/', '-_'),
            '='
        );

        return $payload.'.'.$encodedSignature;
    }
}
```

`config/services.php` içine:

``` php
'media_gateway' => [
    'secret' => env('MEDIA_GATEWAY_HMAC_SECRET'),
],
```

Laravel `.env` içine aynı gizli anahtar eklenir:

``` ini
MEDIA_GATEWAY_HMAC_SECRET=AYNI_GIZLI_ANAHTAR
```

Ardından:

``` bash
php artisan config:clear
```

### Token ve yetkilendirme için üretim öncesi düzeltmeler

-   Token'daki `mid`, istenen URL'deki medya kimliğiyle eşleşmeli.
-   Kullanıcı ve medya kaynağı gerçekten yetkilendirilmiş olmalı.
-   Token kısa ömürlü olmalı ve gerektiğinde iptal edilebilmeli.
-   Eski token'ın kota limitini süresiz kullanmasına izin verilmemeli.
-   Kullanıcı kotası her aktif akışta güvenilir biçimde uygulanmalı.
-   Token ve kimlik bilgileri loglanmamalı.
-   Token imzalama ve doğrulama testleri ortak test vektörleriyle
    yapılmalı.

## 10. Prototipin bilinen eksikleri

**Bu dokümandaki Go kodu üretime hazır bir kota uygulaması değildir.**
Uygulamaya geçmeden önce aşağıdaki maddeler çözülmelidir:

1.  Token'daki medya ID'si URL ile eşleştirilmeli.
2.  Kota, yalnızca toplam Redis sayacını artırmakla değil, aktif akış
    rezervasyonlarıyla yönetilmeli.
3.  Aktarım tamamlanınca, kesilince veya süreç çöktüğünde sayaç
    mutabakatı yapılmalı.
4.  `ResponseWriter.Write` sonucunun gerçek istemci teslimatını kesin
    olarak kanıtlamadığı kabul edilmeli.
5.  Redis erişimi kaybolduğunda güvenli davranış ve kalıcı kayıt
    mekanizması tanımlanmalı.
6.  HTTP Range, `206 Partial Content`, `HEAD`, istemci yeniden
    bağlanması ve seek test edilmeli.
7.  WebDAV yönlendirmeleri gerekiyorsa yalnızca güvenilir hostlara izin
    verilerek uygulanmalı.
8.  FTP kaynağı için ayrı bir adaptör yazılmalı; FTP URL'si HTTP
    istemcisine verilmemeli.
9.  HLS/DASH segmentleri ve Jellyfin/Emby API uç noktaları ayrı ayrı ele
    alınmalı.
10. Gateway dış erişime açılmadan HTTPS, rate limit, istek boyutu
    sınırları, bağlantı sınırları ve gözlemlenebilirlik tamamlanmalı.
11. Akış başına zaman aşımı, maksimum eşzamanlı akış ve kaynak hata
    politikaları belirlenmeli.
12. MySQL'e kalıcı kullanım kayıtları yazılmalı ve Redis ile düzenli
    mutabakat yapılmalı.

## 11. Jellyfin/Emby istemci entegrasyonu

Tek bir `/v1/stream/{mediaID}` endpoint'i bütün medya sunucusu
istemcileri için yeterli değildir. İstemciler şu tür isteklere ihtiyaç
duyabilir:

-   Oturum açma ve kullanıcı bilgisi.
-   Kütüphane ve medya metadata'sı.
-   Görseller ve posterler.
-   Altyazılar.
-   Doğrudan video dosyası veya Range isteği.
-   HLS/DASH playlist ve segmentleri.
-   Oynatma başlatma, ilerleme ve durdurma olayları.

Önerilen aşama:

1.  Önce doğrudan gateway üzerinden tek WebDAV film dosyasını test et.
2.  Sonra Jellyfin'in tüm gerekli API ve medya uç noktalarını
    haritalandır.
3.  Gateway'de kullanıcı oturumu ile Laravel hesabı arasında güvenli
    eşleştirme kur.
4.  Emby için ayrı adaptör ve istemci testleri ekle.
5.  Medya sunucularının doğrudan dış erişimini kapat ve tüm video
    yollarını gateway üzerinden geçir.
6.  Kullanım olaylarını izleme geçmişi için kullan; gerçek kota sayacı
    olarak gateway baytlarını kullan.

## 12. Test planı

Üretim öncesi kabul testleri:

-   [ ] Gateway systemd servisi otomatik başlıyor.
-   [ ] `/healthz` yalnızca beklenen ağ arayüzlerinden erişilebilir.
-   [ ] WebDAV kaynak dosyası yerel diske yazılmadan aktarılıyor.
-   [ ] Geçerli imzalı token doğru kaynağı açıyor.
-   [ ] Token süresi dolunca istek reddediliyor.
-   [ ] Token başka bir medya ID'si için kullanılamıyor.
-   [ ] Geçersiz veya bulunmayan medya ID'si reddediliyor.
-   [ ] Kota dolunca yeni aktarım reddediliyor.
-   [ ] Kota aktarım sürerken biterse akış durduruluyor.
-   [ ] Range ve `206 Partial Content` doğru çalışıyor.
-   [ ] Devam eden indirme ve seek işlemlerinde sadece yeniden aktarılan
    baytlar sayılıyor.
-   [ ] Aynı kullanıcı iki cihazdan yayın yaptığında toplam kota
    aşılamıyor.
-   [ ] İstemci bağlantısı kesildiğinde rezervasyon temizleniyor.
-   [ ] Gateway yeniden başladığında kalıcı tüketim kaybolmuyor.
-   [ ] Redis kesintisi güvenli şekilde ele alınıyor.
-   [ ] Jellyfin ve Emby kullanıcıları abonelik bitiminde devre dışı
    bırakılıyor.
-   [ ] Aktif medya oturumları abonelik bitiminde sonlandırılıyor.
-   [ ] Loglarda token veya parola bulunmuyor.

## 13. Önerilen geliştirme sırası

### Aşama 1 --- Bağımsız gateway temeli

-   Ubuntu 24 servis kurulumu.
-   WebDAV adaptörü.
-   Sağlık endpoint'i.
-   Token doğrulama.
-   Tek test filmiyle streaming.

### Aşama 2 --- Kota motorunu üretim güvenliğine getirme

-   Aktif akış tablosu ve kota rezervasyonları.
-   Atomik sayaç işlemleri.
-   Akış tamamlanması ve kesilmesi için mutabakat.
-   Kalıcı kullanım kayıtları ve idempotency.
-   Range/seek ve eşzamanlı akış testleri.

### Aşama 3 --- Laravel entegrasyonu

-   Kota ve abonelik servisleri.
-   Token üretimi.
-   Gateway kullanım API'si.
-   Yönetim paneli ve kullanım raporları.
-   Mevcut kuyruk ve scheduler yapısıyla uyum.

### Aşama 4 --- Jellyfin entegrasyonu

-   Kullanıcı oluşturma/etkinleştirme/devre dışı bırakma.
-   Oturum eşleştirme.
-   Medya API ve istemci uyumluluğu.
-   Direct Play ve gerçek bayt ölçümü testleri.

### Aşama 5 --- Emby entegrasyonu

-   Ayrı API adaptörü.
-   Kullanıcı ve oturum yaşam döngüsü.
-   İstemci uyumluluğu.
-   Kota ve abonelik testlerinin tekrarı.

### Aşama 6 --- Güvenlik ve yük testi

-   HTTPS ve güvenlik duvarı.
-   Eşzamanlı akış testi.
-   HDD, CPU, RAM, ağ ve Redis performansı.
-   Log/metric/alert altyapısı.
-   Yedekleme ve geri yükleme testi.

## 14. Nihai mimari kararı

Hedeflenen üretim mimarisi:

-   Laravel 13: üyelik, ödeme, abonelik, kota ve yönetim.
-   Go medya gateway: video akışı ve gerçek aktarılan bayt ölçümü.
-   Redis: hızlı sayaçlar ve aktif akış rezervasyonları.
-   MySQL: kalıcı kullanım ve abonelik kayıtları.
-   Jellyfin + Emby: kullanıcıya medya deneyimi.
-   FTP/WebDAV adaptörleri: uzak medya kaynağı.
-   HTTPS reverse proxy ve güvenlik duvarı: dış erişim sınırı.

En kritik kural: **Bütün medya trafiği ölçüm ve yetkilendirme yapan
gateway'den geçmeden gerçek kullanıcı bazlı kota garanti edilemez.**
Yalnızca oynatma olayları veya dosya boyutu üzerinden kota düşmek gerçek
aktarılan veriyi temsil etmez.

------------------------------------------------------------------------

## Ek: Mevcut kurulum hakkında notlar

Daha önce belirtilen proje bağlamı: - Laravel 13 tabanlı web
uygulaması. - Plesk üzerinde çalışan mevcut uygulama ve kuyruk
altyapısı. - `file_transfers`, `disk_scans`, `plex_sync` ve `default`
kuyrukları. - Ayrı Ubuntu 24 medya sunucusu. - Uzak depolama için
FTP/WebDAV seçenekleri.

Bu bilgiler uygulamaya başlamadan önce canlı sunucuda yeniden
doğrulanmalıdır. Bu belge, mimari ve prototip taslağıdır; mevcut
sunucuda komutların başarıyla çalıştığını veya üretim güvenliğinin
tamamlandığını iddia etmez.


---

# 15. Üretim mimarisi için kesinleştirilmesi gereken kararlar

Bu bölüm, önceki taslağı uygulanabilir bir şartnameye dönüştürmek için normatif kararları tanımlar. Buradaki “MUST” karşılığı zorunlu, “SHOULD” karşılığı güçlü öneridir.

## 15.1 Tek yetki kaynağı ve sorumluluk sınırları

- **Laravel/MySQL**, kullanıcının abonelik durumunun, kota limitinin ve kota döneminin kalıcı kaynağıdır.
- **Gateway**, medya yanıtını gönderen ve her aktarımın kota uygulamasını zorunlu kılan katmandır. Laravel'den aldığı eski bir kota değerini süresiz kullanamaz.
- **Redis**, aktif akış koordinasyonu ve atomik rezervasyon işlemleri için kullanılabilir; tek kalıcı muhasebe kaydı değildir.
- **Jellyfin/Emby**, oynatıcı ve medya deneyimi sağlar. Kota muhasebesi için oynatma olayları tek başına kaynak kabul edilmez.
- **Medya kaynak adaptörleri**, FTP/WebDAV gibi sağlayıcı ayrıntılarını ortak arayüz arkasına alır.

Bir istek için yetki zinciri şöyledir:

1. İstemci, gateway tarafından kabul edilen bir medya kimliği ve kısa ömürlü yetkiyle gelir.
2. Gateway token imzasını, süresini, kullanıcıyı, medya kimliğini ve abonelik/kota dönemini doğrular.
3. Gateway kota motorundan atomik rezervasyon almadan medya gövdesi göndermeye başlamaz.
4. Gateway veriyi küçük, sınırlandırılmış parçalarla aktarır; gönderim sonucu ve muhasebe kaydı aynı aktarım kimliğiyle ilişkilendirilir.
5. Kullanım olayları kalıcı depoya yazılır ve mutabakat sürecinden geçer.

## 15.2 “Gönderildi” baytının tanımı

HTTP sunucusunun yazma çağrısının başarılı olması, verinin son kullanıcı uygulaması tarafından işlendiğini veya fiziksel ağda yalnızca bir kez taşındığını kanıtlamaz. Bu sistemde kota tanımı şu şekilde sabitlenmelidir:

> **Kota tüketimi, gateway'in istemci bağlantısına başarıyla yazdığı medya gövdesi baytlarıdır.** HTTP başlıkları, TCP/IP ek yükü ve ağ katmanındaki yeniden iletimler bu ölçüme dahil değildir.

Her parça için yazılan gerçek bayt sayısı, yazma çağrısının döndürdüğü `n` değeriyle ölçülür. `n < len(chunk)` ise yalnızca `n` bayt yazılmış kabul edilir. Bağlantı hatasında yazılmayan kısmın kota tüketimi olarak kesinleştirilmemesi gerekir.

Ancak süreç, yazma sonucu aldıktan sonra kalıcı kayıt yazamadan çökerse son parçanın durumu belirsiz kalabilir. Bu nedenle mutlak “hiçbir koşulda eksik/fazla muhasebe olmaz” iddiası, yalnızca RAM sayaçlarıyla verilemez. Aşağıdaki tasarım bu belirsizliği sınırlandırır:

- Her aktarımın benzersiz `stream_id` ve her muhasebe parçasının artan `sequence_no` değeri olur.
- Kota, önceden ayrılmış byte bütçesi olmadan gönderime izin vermez.
- Her parça için en fazla ayrılan miktar kadar veri yazılır.
- Parça kaydı idempotency anahtarıyla kalıcılaştırılır.
- Çökme sonrası belirsiz parça `uncertain` olarak işaretlenir; otomatik olarak sınırsız kota iadesi yapılmaz.
- İhtiyaca göre muhasebe politikası “istemciye yazıldığı bilinen baytları say” veya daha muhafazakâr “rezervasyon kaybında en fazla rezervasyon miktarını geçici olarak tut” şeklinde açıkça seçilir. İkinci politika geçici fazla tüketim gösterebilir; ilk politika ise çökme anındaki son parçanın yeniden oynatılması halinde küçük bir ölçüm farkı doğurabilir.

## 15.3 Kota döneminin tanımı

- Kota dönemi tek bir saat dilimiyle tanımlanmalıdır; öneri UTC'de saklamak ve kullanıcı arayüzünde yerel saatle göstermektir.
- Dönem anahtarı `period_id` veya kesin başlangıç/bitiş zamanlarıyla temsil edilmelidir. Yalnızca `2026-10` gibi bir metin alanına güvenilmemelidir.
- Dönem değiştiğinde eski aktif akışların eski döneme mi devam edeceği, yoksa hemen durdurulacağı önceden belirlenmelidir. Güvenli varsayılan: yeni dönem için yetki yeniden doğrulanır; eski dönem rezervasyonları eski döneme yazılır ve yeni döneme taşınmaz.
- Abonelik bitişi, kota döneminin bitişinden farklı bir olaydır. Abonelik sona erdiğinde yeni istekler ve aktif akışlar ayrıca iptal edilmelidir.

---

# 16. Kota rezervasyonu ve aktarım algoritması

## 16.1 Neden rezervasyon gerekiyor?

Sadece her yazılan parçadan sonra sayacı artırmak yeterli değildir. Kullanıcının 5 GB kotası kalmışken iki akış da aynı eski değeri okuyup veri göndermeye başlayabilir. Bu nedenle gönderim öncesi atomik rezervasyon zorunludur.

Kota kontrolünün temel eşitsizliği:

```text
used_bytes + reserved_bytes + requested_reservation_bytes <= limit_bytes
```

Bu kontrol ile rezervasyonun artırılması tek bir atomik işlem olmalıdır. “Önce oku, sonra artır” şeklindeki ayrı işlemler yarış koşuluna açıktır.

## 16.2 Parça bazlı akış döngüsü

Önerilen akış:

1. Token ve abonelik doğrulanır.
2. Aktif akış kaydı oluşturulur; `stream_id` benzersiz olur.
3. Gateway, örneğin 1–4 MiB büyüklüğünde bir aktarım bütçesini atomik olarak rezerve eder. Gerçek parça boyutu performans testleriyle seçilir.
4. Gateway upstream'den en fazla rezerve edilen miktarı okur.
5. Veri istemci bağlantısına yazılır ve yazılan gerçek bayt sayısı ölçülür.
6. Yazılan baytlar `used_bytes` ve kalıcı kullanım defterine aktarılır; kullanılmayan rezervasyon serbest bırakılır veya sonraki parçaya devredilir.
7. Her parça için benzersiz `(stream_id, sequence_no)` anahtarı kullanılır; aynı kayıt tekrar işlendiğinde ikinci kez tüketim eklenmez.
8. Kota yetersiz kalırsa yeni rezervasyon verilmez ve akış kontrollü biçimde durdurulur.
9. İstemci ayrılırsa upstream isteği iptal edilir, stream durumu kapatılır ve kullanılmayan rezervasyon bırakılır.
10. Normal bitiş, iptal, timeout ve hata durumlarının hepsi aynı kapanış/finalizasyon yordamından geçer.

**Önemli:** Gateway, upstream'den büyük bir blok okuyup kota kontrolünden önce tamamını istemciye yazmamalıdır. Aksi halde rezerve edilen kotadan fazla veri gönderilebilir.

## 16.3 Rezervasyon kiraları ve temizleyici

Her aktif akışta en az şu alanlar tutulmalıdır:

- `stream_id`
- `user_id`
- `quota_period_id`
- `reserved_bytes`
- `committed_bytes`
- `last_activity_at`
- `lease_expires_at`
- `status`
- `gateway_instance_id`

Gateway düzenli heartbeat gönderir. `lease_expires_at` süresi geçen akışlar doğrudan silinmek yerine önce `reconciling` durumuna alınır. Mutabakat işlemi, kesinleşmiş parça kayıtlarını toplar ve yalnızca kullanılmadığı doğrulanan rezervasyonu serbest bırakır. Çökme anında belirsiz kalan rezervasyonlar gözlem ve politika gereği geçici olarak tutulabilir; sonsuza kadar kilitlenmemeleri için alarm ve kontrollü uzlaştırma bulunmalıdır.

## 16.4 Redis kesintisi ve çift kayıt koruması

- Yeni rezervasyon verilemiyorsa yeni akış başlatılmaz.
- Aktif akış, önceden rezerve edilmiş byte bütçesini aşamaz. Rezervasyon bütçesi bittiğinde Redis/otoritatif kota servisi erişilemiyorsa akış durur.
- Redis yeniden geldiğinde sayaçlar kalıcı muhasebe defteri ve açık rezervasyonlar üzerinden uzlaştırılır.
- Redis anahtarları tek başına geçmiş tüketimin kanıtı sayılmaz.
- Kullanım olayının tekrar gönderilmesi, kuyruk tarafından yeniden denenmesi veya iki worker tarafından görülmesi ikinci kez kota düşmemelidir.
- Redis yedekleme, kalıcılık ve failover ayarları tek başına muhasebe garantisi olarak sunulmamalıdır.

---

# 17. Laravel–Gateway API sözleşmesi

Bu API, uygulama kodu geliştirilirken iki tarafın aynı varsayımları kullanması için önerilen ilk sözleşmedir. Gerçek uygulama öncesinde sürüm numarası ve hata gövdeleri sabitlenmelidir.

## 17.1 İç ağda kullanılacak endpoint'ler

| Endpoint | Amaç | Kimlik doğrulama |
|---|---|---|
| `GET /healthz` | Süreç canlı mı? | Yalnızca loopback/özel ağ |
| `GET /readyz` | Redis, yapılandırma ve gerekli bağımlılıklar hazır mı? | Yalnızca loopback/özel ağ |
| `POST /internal/v1/streams/authorize` | Kullanıcı/medya/kota için kısa süreli yetki üretmek veya doğrulamak | Servisler arası imzalı istek |
| `POST /internal/v1/streams/{id}/cancel` | Akışı iptal etmek | Servisler arası imzalı istek |
| `GET /internal/v1/usage` | Kullanım mutabakatı/raporlama verisi | Servisler arası imzalı istek |
| `GET /v1/media/{media_id}/stream` | Yetkili medya gövdesi | Kısa ömürlü kullanıcı token'ı |

Bu liste nihai Jellyfin/Emby proxy API'si değildir. Jellyfin/Emby istemcilerinin tüm katalog, kimlik doğrulama, görsel, altyazı, oynatma ve medya endpoint'leri ayrıca envanterlenmelidir.

## 17.2 Standart hata yanıtı

Hata yanıtı sır veya upstream kimlik bilgisi içermeyen ortak bir biçimde olmalıdır:

```json
{
  "error": {
    "code": "quota_exceeded",
    "message": "Kullanılabilir kota yetersiz.",
    "request_id": "01JEXAMPLE..."
  }
}
```

Önerilen kodlar:

| HTTP | Kod | Anlam |
|---|---|---|
| `400` | `invalid_request` | Hatalı parametre veya Range |
| `401` | `invalid_token` | Token eksik, imza yanlış veya süresi geçmiş |
| `403` | `subscription_inactive` | Abonelik veya medya yetkisi geçersiz |
| `404` | `media_not_found` | Medya kimliği katalogda yok |
| `416` | `range_not_satisfiable` | Range geçersiz veya desteklenmiyor |
| `429` | `rate_limited` | İstek hızı limiti |
| `503` | `quota_service_unavailable` | Güvenilir kota kararı verilemiyor |
| `502` | `upstream_error` | FTP/WebDAV kaynağı hata verdi |
| `504` | `upstream_timeout` | Kaynak zaman aşımına uğradı |

İstemciye iç hata ayrıntıları verilmez; ayrıntı `request_id` üzerinden sunucu loglarında bulunur.

## 17.3 Servisler arası imza

Laravel'den gateway'e giden yönetim çağrılarında:

- TLS kullanılmalı; aynı makinede loopback veya güvenilir özel ağ tercih edilmelidir.
- İstek imzası HTTP metodu, normalize edilmiş yol, zaman damgası, nonce ve gövde özeti üzerinden hesaplanmalıdır.
- Gateway kabul ettiği zaman penceresini sınırlandırmalı ve nonce tekrarlarını reddetmelidir.
- Saatler NTP ile eşitlenmelidir.
- Anahtarlar ayrı amaçlar için ayrılmalı, düzenli rotasyon ve eski anahtarın kontrollü kaldırılması belgelenmelidir.
- Kullanıcı token'ı, servisler arası yönetim anahtarı yerine geçmemelidir.

## 17.4 Token sözleşmesinin eksik alanları

Mevcut örnekteki `limit_bytes` claim'i tek başına otoritatif kota değildir. Token imzalı olsa bile beş dakikalık token ömrü boyunca abonelik iptalini veya kota tüketimini kendiliğinden yansıtmaz. Üretim sözleşmesinde en az şu alanlar değerlendirilmelidir:

- `iss`: token'ı veren servis
- `aud`: hedef gateway
- `sub` veya `uid`: Laravel kullanıcı kimliği
- `mid`: izin verilen medya kimliği
- `exp`, `iat`, gerekirse `nbf`
- `jti`: benzersiz token kimliği
- `quota_period_id`: kota dönemi kimliği
- `entitlement_version`: iptal/yenileme durumunu kontrol etmeye yardımcı sürüm
- `scope`: izin verilen işlem, ör. `media:read`

Token kısa ömürlü olmalıdır; ancak kota kararı her yeni parça rezervasyonunda güvenilir kota motoruna dayanmalıdır. Token içindeki kota limiti yalnızca bağlam/üst sınır olarak değerlendirilmeli, güncel kullanımın yerine geçmemelidir.

---

# 18. Veritabanı şeması için ayrıntılı tasarım

Aşağıdaki alanlar başlangıç tasarımıdır; gerçek migration'lar mevcut Laravel tabloları incelenip isim çakışmaları kontrol edildikten sonra hazırlanmalıdır. Tüm bayt alanları işaretli `BIGINT` sınırlarını aşmayacak şekilde doğrulanmalı; negatif değerler uygulama ve veritabanı katmanında engellenmelidir.

## 18.1 `quota_periods`

| Alan | Önerilen tür | Not |
|---|---|---|
| `id` | BIGINT veya ULID | Birincil anahtar |
| `user_id` | mevcut users FK türü | Kullanıcı |
| `starts_at`, `ends_at` | UTC datetime | Başlangıç dahil, bitiş hariç |
| `limit_bytes` | BIGINT | Dönem kotası |
| `used_bytes` | BIGINT | Mutabakatlı kullanım özeti |
| `reserved_bytes` | BIGINT | Açık rezervasyon özeti |
| `status` | varchar/enum | `active`, `closed`, `reconciling` |
| `created_at`, `updated_at` | timestamp | Laravel zaman alanları |

İndeksler: `(user_id, starts_at, ends_at)`, `status`, ayrıca uygulamanın tek aktif dönem kuralına uygun benzersiz kısıt. Veritabanı motoru ve dönem modeline göre tek aktif dönem garantisi ayrıca tasarlanmalıdır.

## 18.2 `media_streams`

| Alan | Önerilen tür | Not |
|---|---|---|
| `id` | ULID/UUID | `stream_id` |
| `user_id` | FK | Kullanıcı |
| `quota_period_id` | FK | Kullanılan kota dönemi |
| `media_id` | varchar | İç katalog kimliği |
| `source_id` | FK/varchar | Kaynak adaptörü ve kaynak kaydı |
| `server_type` | varchar | `download`, `jellyfin`, `emby` |
| `reserved_bytes` | BIGINT | Henüz serbest bırakılmamış rezervasyon |
| `committed_bytes` | BIGINT | Bu akışın kesinleşen kullanımı |
| `status` | varchar | `authorizing`, `active`, `closing`, `closed`, `failed`, `reconciling` |
| `gateway_instance_id` | varchar | Çoklu gateway'de sahiplik |
| `last_activity_at` | datetime | Heartbeat |
| `lease_expires_at` | datetime | Süresi dolan rezervasyonları bulmak için |
| `started_at`, `ended_at` | datetime nullable | Akış yaşam döngüsü |
| `created_at`, `updated_at` | timestamp | Laravel alanları |

İndeksler: `(user_id, status)`, `(status, lease_expires_at)`, `(quota_period_id, status)`, `(source_id, status)`.

## 18.3 `media_usage_events`

| Alan | Önerilen tür | Not |
|---|---|---|
| `id` | BIGINT | Birincil anahtar |
| `event_id` | UUID/ULID | Tekrara dayanıklı olay kimliği |
| `stream_id` | FK veya ULID | İlgili akış |
| `sequence_no` | BIGINT | Akış içi artan sıra |
| `user_id` | FK | Raporlama ve uzlaştırma |
| `quota_period_id` | FK | Hangi döneme yazılacağı |
| `media_id` | varchar | Medya kimliği |
| `bytes_reserved` | BIGINT | Bu parça için ayrılan miktar |
| `bytes_written` | BIGINT | İstemci bağlantısına yazma çağrısının bildirdiği miktar |
| `bytes_committed` | BIGINT | Kota muhasebesine kesinleşen miktar |
| `status` | varchar | `pending`, `committed`, `uncertain`, `reconciled` |
| `occurred_at` | datetime | Gateway olayı |
| `recorded_at` | datetime | Kalıcı kayıt zamanı |
| `request_id` | varchar | İstek korelasyonu |

Benzersiz anahtarlar: `event_id` ve `(stream_id, sequence_no)`. Kullanım olayı işlenirken bu anahtarlar üzerinden tekrar işleme engellenmelidir. Büyük hacimde partitioning ancak gerçek veri hacmi ve sorgu örüntüsü ölçüldükten sonra düşünülmelidir.

## 18.4 `media_sources`

- `id`, `name`, `adapter_type` (`webdav`, `ftp`, daha sonra diğerleri)
- `base_url` veya gizli referansla saklanan bağlantı yapılandırması
- `credential_reference` (parolayı doğrudan katalog satırında tutmak yerine gizli yapılandırmaya referans)
- `status`, `priority`, `max_connections`
- `health_checked_at`, `health_status`
- `created_at`, `updated_at`

Kaynak parolaları loglara, istemciye veya normal yönetim API yanıtlarına hiçbir zaman dahil edilmemelidir.

## 18.5 Mevcut Laravel şemasıyla birleştirme ilkeleri

- Yeni bir `users` veya `subscriptions` tablosu oluşturmadan önce mevcut tablolar incelenmelidir.
- `user_id` veri türü, mevcut `users.id` ile aynı olmalıdır.
- Abonelik sağlayıcısının webhook event ID'si için unique indeks bulunmalıdır.
- Ödeme webhook'u, abonelik durumu değişikliği ve medya hesabı senkronizasyonu idempotent olmalıdır.
- Büyük kullanım kayıtları ile normal web uygulaması sorguları birbirini kilitlememelidir; indeksler ve transaction kapsamı yük testleriyle doğrulanmalıdır.
- `used_bytes` bir özet alandır; otoritatif denetim gerektiğinde olay defteriyle uzlaştırılabilmelidir.

---

# 19. Jellyfin ve Emby yaşam döngüsü: tutarlılık ve tekrar deneme

## 19.1 Durum makinesi

Hesap eşleştirmesi için aşağıdaki durumlar kullanılabilir:

```text
pending -> provisioning -> active
                    \-> error -> retrying -> active
active -> disabling -> disabled
active -> revoking_sessions -> disabled
```

Durumlar işlem adımlarını görünür kılar. Harici API çağrısı başarılı olmadan Laravel kaydı `active` yapılmamalı; fakat harici çağrı başarılı olduktan sonra veritabanı yazımı başarısız olabileceğinden periyodik mutabakat işi bulunmalıdır.

## 19.2 Idempotency ve outbox yaklaşımı

Ödeme webhook'u aynı olay için birden fazla gelebilir. Her olayın sağlayıcı event ID'si benzersiz olarak saklanmalı ve aynı event ikinci kez yeni hesap veya yeni abonelik oluşturmamalıdır.

Önerilen sıra:

1. Webhook imzasını doğrula.
2. Event ID için duplicate kontrolü yap.
3. Veritabanı transaction'ında abonelik durumunu güncelle ve bir outbox işi yaz.
4. Transaction tamamlandıktan sonra worker, Jellyfin/Emby API çağrısını yapar.
5. Sonuç ve hata sınıfı kaydedilir.
6. Geçici hatalar artan bekleme süresiyle tekrar denenir; kalıcı hatalar yönetici alarmına düşer.
7. Periyodik `SyncMediaSubscriptions` işi Laravel ile harici medya sunucularının durumunu karşılaştırır.

Harici API çağrısını uzun süre açık veritabanı transaction'ı içinde çalıştırmayın.

## 19.3 Abonelik sona erdiğinde erişimi kesme

- Laravel aboneliği `expired`/`cancelled` olarak işaretler.
- Gateway yetki kontrolü, eski token'ı yalnızca imzası doğru diye kabul etmemelidir; iptal/sürüm kontrolü veya kısa token ömrüyle birlikte güncel yetki doğrulanmalıdır.
- Gateway aktif `stream_id` kayıtlarına iptal sinyali gönderir.
- Akış kapatılır, upstream isteği iptal edilir ve rezervasyon uzlaştırılır.
- Jellyfin/Emby hesabı devre dışı bırakılır ve desteklenen API yöntemiyle oturumları sonlandırılır.
- Harici API erişilemiyorsa gateway tarafındaki ret, hesabı kapatma işinden bağımsız olarak uygulanmalıdır.

## 19.4 Özel senaryolar

- **Ödeme iadesi/chargeback:** Ürün politikasına göre aboneliği iptal et, yeni token'ları reddet, aktif akışları kapat.
- **Ödeme yenilemesi:** Aynı hesabı tekrar kullan; duplicate kullanıcı açma.
- **Ödeme sağlayıcısı gecikmesi:** Webhook gelmedi diye yalnızca istemci bildirimine dayanarak premium açma.
- **Jellyfin/Emby geçici olarak kapalı:** Kuyruk tekrar dener; gateway, geçersiz aboneliği kabul etmez.
- **Harici kullanıcı elle silinmiş:** Mutabakat işi hesabı yeniden oluşturma veya hataya alma kararını açık kurala göre verir.

---

# 20. Yayın yolu, istemci uyumluluğu ve kaynak izolasyonu

## 20.1 İki ayrı dağıtım yolu

### A. Web sitesi / IDM indirmesi

İstemci, Laravel'in yetki kontrolünden sonra gateway'e yönlendirilir. Gateway medya kimliğini katalogdan çözer, kota rezervasyonu alır ve dosyayı stream eder. Kaynak FTP/WebDAV URL'si kullanıcıya dönülmez.

### B. Jellyfin/Emby uygulaması

Jellyfin/Emby istemcileri yalnızca tek bir dosya URL'si istemez. Kimlik doğrulama, katalog, görseller, altyazı, medya bilgisi, oynatma raporları ve medya byte akışı ayrı endpoint'ler olabilir. Üretim tasarımı öncesinde kullanılan istemcilerde gerçek HTTP istekleri kaydedilip sınıflandırılmalıdır.

Kota garantisi isteniyorsa medya gövdesi gateway'den geçmelidir. Jellyfin/Emby'nin istemciye doğrudan dosya URL'si vermesi, istemcinin gateway'i atlamasına yol açmamalıdır. Bu nedenle yalnızca webhook ile kota uygulandığı varsayılmamalıdır.

## 20.2 Direct Play ve transcoding

Transcoding kapalıyken uyumsuz codec, kapsayıcı, ses veya altyazı kombinasyonu istemcide oynatılamayabilir. Gateway'in dosyayı aynen aktarması bu uyumsuzluğu dönüştürmez. Kabul testleri en azından şu kombinasyonları içermelidir:

- MKV/MP4 kapsayıcıları ve kullanılan video codec'leri.
- Farklı ses codec'leri ve çoklu ses parçaları.
- Harici ve gömülü altyazı.
- HTTP Range ile seek.
- TV, Android/iOS ve tarayıcı istemcileri.
- Doğrudan dosya, HLS ve varsa DASH akışları.

Üretim şartnamesi, desteklenmeyen istemci/codec durumunda “hata ver” mi yoksa sınırlı transcoding'e izin ver mi kararını açıkça vermelidir.

## 20.3 Range ve başlık güvenliği

- `Range` ve `If-Range` başlıkları doğrulanarak upstream'e aktarılmalıdır.
- `206 Partial Content`, `Content-Range`, `Content-Length`, `ETag`, `Last-Modified` ve `Accept-Ranges` yalnızca upstream yanıtıyla tutarlıysa iletilmelidir.
- `HEAD` isteği kota tüketen medya gövdesi üretmemelidir; fakat yetki ve metadata politikası uygulanmalıdır.
- İstemci tarafından gelen `Host`, `Forwarded` veya benzeri başlıklar upstream URL'sini belirlememelidir.
- Redirect yalnızca izin verilen kaynak hostlarına takip edilmeli; redirect hedefi her adımda yeniden doğrulanmalıdır.
- Gateway istemciden tam URL almamalı; `media_id -> source_id + relative_path` eşlemesini sunucu tarafında çözmelidir.

---

# 21. Güvenlik tehdit modeli

| Tehdit | Önlem | Kabul testi |
|---|---|---|
| Başka kullanıcının token'ı | `uid`, `mid`, `aud`, `exp` ve yetki kontrolü | Token ile farklı kullanıcı/medya isteği reddedilir |
| Token süresi dolduktan sonra açık akış | Her rezervasyonda yetki yenileme/iptal kontrolü; akış iptali | Süre/abonelik iptalinden sonra akış durur |
| Medya ID'sini değiştirerek başka dosyaya erişim | İmzalı medya kimliği ve sunucu tarafı katalog eşlemesi | ID değiştirme `403/404` döndürür |
| Kaynak FTP/WebDAV adresinin sızması | Kaynak URL'si istemci yanıtına/loglara konmaz | İstemci yanıtları ve normal loglar incelenir |
| Sahte/tekrarlanan ödeme webhook'u | İmza, timestamp, event ID unique kısıtı | Aynı event tekrarında tek abonelik işlemi oluşur |
| Gateway'in yetkisiz dış erişimi | Firewall, loopback/özel bind, TLS, servis imzası | Yetkisiz ağdan iç endpoint'e erişilemez |
| SSRF ve redirect saldırısı | İzin listeli kaynaklar, URL normalizasyonu, redirect doğrulaması | Loopback, private IP ve farklı host hedefleri reddedilir |
| Dosya yolu manipülasyonu | Serbest path kabul etme; normalize edilmiş göreli katalog yolu | `../` ve kodlanmış varyantlar reddedilir |
| API anahtarı/parola sızıntısı | Secret dosyası, dar izinler, log redaksiyonu, rotasyon | Test loglarında gizli değer aranır |
| Kota yarış koşulu | Atomik rezervasyon ve parça bütçesi | Paralel akışların toplamı limiti aşamaz |
| Tekrarlanan kullanım olayı | `event_id` ve `(stream_id, sequence_no)` unique | Aynı olay N defa işlendiğinde tek kez sayılır |
| Redis/DB kesintisi | Fail-closed ve kurtarma prosedürü | Kota kararı verilemiyorsa yeni aktarım başlamaz |
| Kaynak sağlayıcı limiti | Kaynak başına bağlantı havuzu/semafor ve timeout | Limit aşıldığında kuyruklama veya kontrollü ret olur |

Ek güvenlik gereksinimleri:

- Yönetim endpoint'leri medya istemcilerine açılmamalıdır.
- Gateway'in yalnızca gerekli kaynaklara çıkış yapmasına izin veren egress kuralları değerlendirilmelidir.
- Kullanıcıdan gelen `media_id`, `source_id`, dosya adı ve HTTP başlıkları doğrulanmalıdır.
- Hata yanıtları dosya sistemi yolu, upstream host, kimlik bilgisi veya stack trace sızdırmamalıdır.
- Her isteğe `request_id` eklenmeli; loglarda token yerine `jti`/hash gibi güvenli korelasyon değeri kullanılmalıdır.
- Log saklama süresi, erişim yetkisi ve kişisel veri kapsamı belirlenmelidir.
- TLS sertifikası yenileme ve gizli anahtar rotasyonu canlıya geçiş prosedürüne dahil edilmelidir.

---

# 22. 300 eşzamanlı kullanıcı için kapasite ve yük testi

## 22.1 Bant genişliği hesabı

Eşzamanlı kullanıcı sayısı tek başına sunucu gereksinimini belirlemez. Yaklaşık çıkış ihtiyacı:

```text
required_mbps = concurrent_streams * average_bitrate_mbps
```

Örnekler:

| Eşzamanlı akış | Ortalama 4 Mbit/s | Ortalama 8 Mbit/s | Ortalama 15 Mbit/s |
|---:|---:|---:|---:|
| 50 | 200 Mbit/s | 400 Mbit/s | 750 Mbit/s |
| 100 | 400 Mbit/s | 800 Mbit/s | 1.5 Gbit/s |
| 300 | 1.2 Gbit/s | 2.4 Gbit/s | 4.5 Gbit/s |

Bunlar teorik medya bit hızı toplamlarıdır; protokol ek yükü, bitrate dalgalanması, kaynak okuma hızı ve ağ sağlayıcısı limitleri ayrıca değerlendirilmelidir. Sunucu veya sağlayıcı hattı bu kapasiteyi sürdüremiyorsa uygulama optimizasyonu tek başına çözüm olmaz.

## 22.2 Yük testinin basamakları

Testler üretim kullanıcılarına değil, test hesaplarına ve kontrol edilen medya dosyalarına karşı yapılmalıdır.

1. 1 akış: doğruluk ve temel ölçüm.
2. 10 akış: bağlantı ve log davranışı.
3. 50 akış: rezervasyon yarışları ve kaynak bağlantıları.
4. 100 akış: RAM/CPU/ağ eğrisi.
5. 300 akış: hedef kapasite, sağlayıcı sınırları ve uzun süreli kararlılık.

Her basamakta en az şu senaryolar test edilir:

- Aynı kullanıcıdan birden fazla akış.
- Farklı kullanıcılar ve farklı kota bakiyeleri.
- Kota tam doluyken yeni yayın.
- Yayın sırasında kota bitmesi.
- Range/seek ve yeniden bağlanma.
- İstemciyi zorla kapatma.
- Redis, MySQL veya upstream kısa süreli kesintisi.
- Gateway prosesinin kontrollü yeniden başlatılması.
- Bir medya kaynağının bağlantı limitine ulaşması.

## 22.3 İzlenecek ölçümler

- Aktif stream sayısı, başlatma başarısı ve ret nedeni.
- Toplam çıkış Mbit/s ve her akışın hız dağılımı.
- CPU, RSS bellek, goroutine sayısı ve dosya tanıtıcıları.
- Gateway yanıt gecikmesi: p50/p95/p99.
- Redis komut gecikmesi ve hata oranı.
- MySQL transaction süresi, deadlock ve kuyruk gecikmesi.
- FTP/WebDAV bağlantı sayısı, ilk byte süresi ve hata oranı.
- Kota defteri ile sayaçlar arasındaki fark.
- Uzun testte bellek artışı ve kapanmayan stream sayısı.

## 22.4 Örnek kabul kriterleri

Bunlar başlangıç hedefleridir; gerçek sunucu ve sağlayıcı ölçümleriyle onaylanmadan garanti sayılmaz:

- 300 eşzamanlı kontrollü akış testinde kota limiti hiçbir kullanıcı için aşılmamalı.
- Aynı kullanım olayı tekrar oynatıldığında iki kez sayılmamalı.
- Kota servisi kullanılamıyorsa yeni akış fail-closed davranmalı.
- İstemci ayrıldıktan sonra upstream aktarımı ve rezervasyon sonlu bir süre içinde kapanmalı.
- 60 dakikalık kararlılık testinde bellek ve açık dosya tanıtıcıları sürekli artmamalı.
- Kullanım kayıtları ve özet sayaçları test sonunda mutabık olmalı veya açıklanabilir `uncertain` olayları raporlanmalı.
- Hedeflenen bitrate toplamı ağ sağlayıcısının gerçek çıkış kapasitesinin altında olmalı.

Yük testi sonucu olmadan “300 kullanıcı destekleniyor” ifadesi dokümantasyonda kesin özellik olarak kullanılmamalıdır.

---

# 23. İzleme, günlükleme ve arıza kurtarma

## 23.1 Sağlık kontrolleri

- `/healthz`: süreç yanıt veriyor mu? Harici bağımlılıkları beklemeden hızlı yanıt vermelidir.
- `/readyz`: gerekli yapılandırma ve kota bağımlılıkları kullanılabilir mi? İç ağdan erişilmelidir.
- Kaynak sağlık kontrolü: FTP/WebDAV kaynağına sınırlı süreli ve düşük maliyetli kontrol.
- Laravel worker ve scheduler durumu ayrıca izlenmelidir.

Sağlık endpoint'leri gizli yapılandırma, kullanıcı verisi veya upstream URL'si döndürmemelidir.

## 23.2 Önerilen metrikler ve alarmlar

- `gateway_active_streams`
- `gateway_stream_start_total{result}`
- `gateway_bytes_written_total`
- `gateway_quota_denied_total`
- `gateway_reservation_bytes`
- `gateway_usage_uncertain_total`
- `gateway_upstream_errors_total{source,reason}`
- `gateway_request_duration_seconds`
- `gateway_redis_errors_total`
- `gateway_reconciliation_delta_bytes`

Etiketlere kullanıcı ID'si, token veya tam dosya yolu eklenmemelidir; yüksek kardinalite ve kişisel veri riski doğurur.

Alarm örnekleri:

- Kota mutabakat farkı sıfırdan farklı kalırsa.
- `uncertain` kayıtları belirlenen eşiği aşarsa.
- Upstream hata oranı veya ilk byte süresi yükselirse.
- Kaynak bağlantı limiti dolarsa.
- Disk, RAM, CPU veya ağ kapasitesi belirlenen eşiğe yaklaşırsa.
- Süresi geçmiş rezervasyonlar temizlenemiyorsa.
- Laravel queue ya da subscription sync işi belirli süredir çalışmıyorsa.

## 23.3 Arıza matrisi

| Arıza | Yeni akış | Aktif akış | Kurtarma |
|---|---|---|---|
| Redis erişilemiyor | Reddet | Yalnızca güvenli mevcut rezervasyon bütçesi kadar; bütçe biterse durdur | Redis dönünce defterle uzlaştır |
| MySQL erişilemiyor | Kalıcı yetki/kota kararı verilemiyorsa reddet | Politika ve mevcut rezervasyona göre sınırla; belirsiz bütçeyi aşma | Olay kuyruğunu dayanıklı tut ve sonra yaz |
| WebDAV/FTP erişilemiyor | `502/504` | Hata/timeout sonrası kapat | Kaynak sağlık kontrolü, sınırlı tekrar deneme |
| Gateway yeniden başlıyor | Servis hazır olana kadar reddet | Bağlantılar kopabilir; istemci tekrar bağlanır | Lease ve kullanım olaylarını uzlaştır |
| Laravel erişilemiyor | Süresi dolmuş/iptal edilmiş yetkiyi kabul etme | Kısa süreli token ve rezervasyon sınırlarını aşma | Laravel geri geldiğinde yetki/abonelik mutabakatı |
| Jellyfin/Emby API erişilemiyor | İstemci oturum/metadata işlemleri etkilenebilir | Gateway medya yetkisi geçersizleşirse akışı kapat | Queue retry ve periyodik sync |
| Bir kaynak kota/bağlantı sınırına ulaşıyor | Başka uygun kaynak yoksa kontrollü ret | Var olan akışı kesme politikası ayrıca belirlenir | Bağlantı semaforu ve kaynak sağlık kontrolü |

Veri kaybı riskine rağmen “hata durumunda her şeye izin ver” yaklaşımı kullanılmamalıdır.

## 23.4 Yedekleme ve geri yükleme

Yedeklenecekler:

- Laravel/MySQL veritabanı ve gerekli şema/migration bilgisi.
- Kaynak kataloğu ve medya kimlik eşleştirmeleri.
- Gateway yapılandırması ve gizli anahtarlar için güvenli yedekleme/rotasyon planı.
- Gerekliyse Redis yapılandırması; Redis verisi kalıcı muhasebe defterinin yerine geçmez.
- systemd, Nginx ve firewall yapılandırmaları.

Yedeklemenin alınmış olması yeterli değildir. Ayrı test ortamında geri yükleme yapılmalı; kullanıcı kotası, abonelik durumu ve medya eşleştirmeleri kontrol edilmelidir. RPO/RTO hedefleri iş gereksinimine göre yazılmalıdır.

---

# 24. Çoklu FTP/WebDAV kaynağı ve sağlayıcı bağımsızlığı

## 24.1 Ortak adaptör arayüzü

Kaynak sağlayıcı değişikliğinin Laravel ve kota motorunu etkilememesi için gateway içinde ortak bir arayüz kullanılmalıdır. Örnek kavramsal sözleşme:

```go
type MediaSource interface {
    Stat(ctx context.Context, mediaID string) (MediaInfo, error)
    OpenRange(ctx context.Context, mediaID string, start, end int64) (io.ReadCloser, MediaInfo, error)
    HealthCheck(ctx context.Context) error
}
```

Bu yalnızca arayüz taslağıdır; gerçek kod, Range semantiği ve kaynak sağlayıcıların yetenekleri doğrulandıktan sonra yazılmalıdır. FTP adaptörü FTP'ye özgü kimlik doğrulama, pasif mod, TLS ve bağlantı kapanışını; WebDAV adaptörü HTTP durumları, Range ve redirect kurallarını kendi içinde yönetmelidir.

## 24.2 Kaynak seçimi ve fallback

- Her medya kaydı bir `media_id` ile bir veya daha fazla kaynak kopyasına bağlanabilir.
- Kaynak kopyaları aynı film olarak kabul edilmeden önce dosya boyutu, checksum (mevcutsa) veya yönetilen katalog kimliğiyle doğrulanmalıdır.
- Öncelik, sağlık durumu, kalan bağlantı kapasitesi ve maliyet bilgisi kaynak seçimine katılabilir.
- Aktif akış ortasında başka kaynağa geçiş, dosya içeriği ve byte offset eşleşmesi kanıtlanmadıkça yapılmamalıdır.
- Kaynak değiştirme, kullanıcı kotasını sıfırlamamalıdır; aynı `stream_id` ve kullanım defteri devam etmelidir.
- Bir sağlayıcı arızalandığında başka kopya yoksa kullanıcıya kontrollü hata döndürülür; kaynak URL'si açıklanmaz.

## 24.3 Trafik ve maliyet raporu

Aşağıdaki kalemler ayrı raporlanmalıdır:

- Depolama kapasitesi ve aylık depolama ücreti.
- Gateway sunucusu ve çıkış trafiği.
- Kaynak sağlayıcının indirme/çıkış veya bağlantı ücretleri.
- Laravel uygulama sunucusu ve veritabanı.
- Yedekleme ve izleme maliyetleri.

Bir sağlayıcının “sınırsız trafik” veya yüksek bağlantı sayısı beyanı, sözleşme ve gerçek yük testiyle doğrulanmadan kapasite garantisi sayılmamalıdır.

---

# 25. Dağıtım ve canlıya geçiş planı

## 25.1 Nginx ve ağ sınırı

- Gateway uygulaması ilk aşamada `127.0.0.1:8787` veya özel bir iç arayüzde dinlemelidir.
- İnternet trafiği gerekiyorsa Nginx/Caddy gibi TLS sonlandıran reverse proxy üzerinden geçirilmelidir.
- Yönetim endpoint'leri yalnızca loopback/özel ağda kalmalıdır.
- Firewall'da yalnızca gerekli inbound portlar açılmalıdır; Redis ve MySQL internete açılmamalıdır.
- Nginx buffering davranışı kontrol edilmelidir. Büyük medya yanıtlarının geçici diske yazılmasına neden olabilecek proxy buffering ayarları test edilmeli; amaç gereksiz yerel medya kopyası oluşturmadan stream etmektir.
- `client_max_body_size`, rate limit ve timeout ayarları gerçek endpoint türüne göre belirlenmelidir; uzun medya akışları için genel kısa timeout değerleri körlemesine uygulanmamalıdır.
- TLS sertifikası otomatik yenileme testi yapılmalıdır.

## 25.2 İlk canlıya geçiş sırası

1. Ayrı test kaynağı ve test kullanıcıları oluştur.
2. Tek dosyalı WebDAV akışını disk kullanımı gözlenerek doğrula.
3. Range, seek, istemci kesilmesi ve yeniden bağlanma testlerini çalıştır.
4. Token imzası, süre, medya yetkisi ve iptal testlerini tamamla.
5. Kota rezervasyonu ve idempotent kullanım defterini doğrula.
6. 10/50/100/300 yük testlerini sırayla yürüt.
7. Laravel ile abonelik yaşam döngüsü entegrasyonunu test et.
8. Jellyfin/Emby istemci uç noktalarını ayrı test planıyla doğrula.
9. Loglar, metrikler, alarmlar ve yedek geri yükleme testini tamamla.
10. Önce küçük bir test kullanıcı grubuna aç; ölçümler sağlıklıysa kademeli büyüt.

## 25.3 Geri alma planı

- Gateway sürümleri numaralandırılmalı ve önceki binary/config sürümü saklanmalıdır.
- Şema değişiklikleri mümkün olduğunca geriye uyumlu, aşamalı migration olarak uygulanmalıdır.
- Yeni kota motoru devreye alınırken eski ve yeni sayaçların aynı anda iki kez kota düşürmesi engellenmelidir.
- Hata halinde yeni yayın açılışları durdurulabilir; kota kontrolünü atlayan bir bypass yolu açılmamalıdır.
- Geri alma sonrası aktif stream kayıtları, belirsiz kullanım olayları ve rezervasyonlar uzlaştırılmalıdır.
- Geri alma komutları canlıya geçişten önce test ortamında denenmelidir.

---

# 26. Uygulama aşamaları ve kabul kriterleri

| Aşama | Çıktı | Tamamlanma kriteri |
|---|---|---|
| 1. Gateway prototipi | WebDAV adaptörü ve tek dosyalı akış | Dosya yerel diske kaydedilmeden aktarılır; Range testi geçer |
| 2. Güvenlik | Token, medya kimliği ve kaynak allowlist'i | Geçersiz/süresi dolmuş token ve path manipülasyonu reddedilir |
| 3. Kota motoru | Atomik rezervasyon, parça sayımı, idempotency | Eşzamanlı akışlar limitin üstünde byte yazamaz |
| 4. Kalıcı muhasebe | MySQL olay defteri ve mutabakat | Tekrarlanan olay çift sayılmaz; restart sonrası fark raporlanır |
| 5. Laravel entegrasyonu | Abonelik, kota, gateway yetkisi | Kullanıcı/abonelik değişikliği gateway kararına yansır |
| 6. Jellyfin | Hesap/oturum ve istemci medya yolu | Desteklenen istemcilerde Direct Play, seek ve iptal testleri geçer |
| 7. Emby | Ayrı adaptör ve hesap yaşam döngüsü | Jellyfin'den bağımsız kabul testleri geçer |
| 8. Dayanıklılık | Kesinti, restart, retry ve restore | Redis/upstream/API kesintisi güvenli şekilde ele alınır |
| 9. Yük testi | 10/50/100/300 akış raporu | Kota doğruluğu, ağ kapasitesi ve kararlılık ölçülür |
| 10. Canlıya geçiş | TLS, firewall, alarm, yedekleme ve rollback | Güvenlik ve geri yükleme kontrol listesi imzalanır |

Bir aşama, yalnızca servis başlıyor diye tamamlanmış sayılmaz. İlgili test çıktıları ve ölçümler kayıt altına alınmalıdır.

---

# 27. Canlıya geçiş öncesi son kontrol listesi

## Kota ve muhasebe
- [ ] Kota hesabı yalnızca gateway üzerinden geçen medya gövdesi baytlarını sayıyor.
- [ ] Kota rezervasyonu atomik ve gönderimden önce yapılıyor.
- [ ] Aynı kullanıcıdan paralel yayınlarda limit aşılmıyor.
- [ ] Her aktarım parçası idempotent kullanım olayıyla ilişkilendiriliyor.
- [ ] Kesilen bağlantı ve süreç çökmesi sonrası belirsiz tüketim politikası belgeli.
- [ ] Redis ve MySQL geri geldiğinde mutabakat çalışıyor.
- [ ] Abonelik bitince yeni istek ve aktif akışlar iptal ediliyor.

## Güvenlik
- [ ] Gateway kaynağı keyfi URL olarak kabul etmiyor.
- [ ] Token süresi, imzası, audience ve medya yetkisi doğrulanıyor.
- [ ] İç API'ler internete açık değil.
- [ ] Kaynak kimlik bilgileri ve token loglanmıyor.
- [ ] FTP/WebDAV redirect ve SSRF testleri geçiyor.
- [ ] HTTPS, firewall ve secret rotasyonu hazır.

## Dayanıklılık ve işletim
- [ ] Health/readiness kontrolleri var.
- [ ] Kota reddi, upstream hata ve belirsiz muhasebe alarmları var.
- [ ] Kaynak başına bağlantı sınırı uygulanıyor.
- [ ] Yedek geri yükleme testi yapıldı.
- [ ] Gateway sürüm geri alma prosedürü test edildi.
- [ ] 300 akış kapasitesi iddia ediliyorsa ölçümlü test raporu mevcut.

---

# 28. Belgenin kapsamı ve açık kalan işler

Bu belge mimari kararlar, API sözleşmesi ve test gereksinimlerini tarif eder; tek başına üretime hazır bir uygulama veya doğrulanmış 300 kullanıcı kapasitesi değildir.

Kodlamaya geçmeden önce yapılması gerekenler:

1. Mevcut Laravel 13 projesinin migration'larını, kullanıcı/abonelik tablolarını, queue yapılandırmasını ve ödeme webhook'larını incelemek.
2. Gateway prototipindeki gerçek `main.go` kodunu denetlemek; bu dokümandaki önceki örnek işlev listesinin gerçekten kodda bulunduğunu varsaymamak.
3. Kullanılacak Jellyfin/Emby sürümlerinde gerekli API ve istemci isteklerini kaydedip envanterlemek.
4. Kota rezervasyonunun Redis ve kalıcı olay defteri arasındaki kesin transaction/uzlaştırma tasarımını uygulama ve testlerle doğrulamak.
5. Gerçek kaynak sağlayıcıların bağlantı, Range, trafik ve eşzamanlılık sınırlarını doğrulamak.
6. Üretim yük testleri sonucuna göre donanım, ağ kapasitesi ve bağlantı limitlerini belirlemek.

**Üretim kararı:** Kota rezervasyonu, kalıcı kullanım defteri, çökme mutabakatı, güvenlik testleri ve yük testi tamamlanmadan bu gateway kota garantili üretim sistemi olarak kabul edilmemelidir.