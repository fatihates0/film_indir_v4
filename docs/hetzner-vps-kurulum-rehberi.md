# Hetzner VPS (Ubuntu 24.04 LTS) Sıfırdan Kurulum Rehberi

Bu rehber, **Ubuntu 24.04** işletim sistemine sahip sıfır bir Hetzner VPS sunucu üzerine **SineKutu v3** projesini, veritabanını, Nginx web sunucusunu ve indirme sayacını en sade, adım adım ve kopyala-yapıştır yapılabilecek şekilde kurmanızı sağlar.

---

## 🚀 Adım 1: Sunucuyu Güncelleyin ve Temel Paketleri Kurun

SSH ile sunucunuza `root` olarak bağlandıktan sonra:

```bash
# Paket listesini güncelleyin
sudo apt update && sudo apt upgrade -y

# Temel yardımcı araçları yükleyin
sudo apt install -y git curl zip unzip ufw software-properties-common certbot python3-certbot-nginx
```

---

## 🐘 Adım 2: Nginx ve PHP 8.3 Kurulumu

Ubuntu 24.04 varsayılan deposunda **PHP 8.3** barındırır, ekstra PPA eklemenize gerek yoktur.

```bash
# Nginx ve PHP 8.3 ile gerekli eklentileri yükleyin
sudo apt install -y nginx php8.3-fpm php8.3-cli php8.3-mysql php8.3-curl php8.3-xml php8.3-mbstring php8.3-zip php8.3-bcmath php8.3-intl
```

PHP ayarlarını düzenleyin:

```bash
# Web form yükleme limitleri (Sadece panelden afiş/resim yüklemek içindir)
sudo sed -i 's/upload_max_filesize = 2M/upload_max_filesize = 500M/' /etc/php/8.3/fpm/php.ini
sudo sed -i 's/post_max_size = 8M/post_max_size = 500M/' /etc/php/8.3/fpm/php.ini
sudo sed -i 's/memory_limit = 128M/memory_limit = 512M/' /etc/php/8.3/fpm/php.ini
sudo sed -i 's/max_execution_time = 30/max_execution_time = 1800/' /etc/php/8.3/fpm/php.ini
sudo systemctl restart php8.3-fpm
```

> 💡 **Önemli Not (100 GB İndirmeler Hakkında):**  
> `upload_max_filesize` sadece sunucuya dışarıdan dosya **yüklerken** geçerlidir. Kullanıcıların siteden film **indirmesinde (Download) hiçbir GB sınırı yoktur**. 100 GB'lık bir 4K film indirilirken Nginx canlı akış (`proxy_buffering off`) kullandığı için dosya RAM'i veya diski asla doldurmaz; veri Storage Box'tan çıktığı saniye kullanıcının soketine akar.

---

## 📦 Adım 3: Composer ve Node.js (Vite Derleyicisi) Kurulumu

```bash
# 1. Composer (PHP Paket Yöneticisi)
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# 2. Node.js 20 LTS & NPM
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 🗄️ Adım 4: MySQL Veritabanı Kurulumu ve Ayarlanması

```bash
# MySQL yükleyin
sudo apt install -y mysql-server

# Veritabanı ve kullanıcı oluşturun (Şifreyi kendinize göre belirleyin)
sudo mysql -e 'CREATE DATABASE film_indir CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
sudo mysql -e 'CREATE USER "filmuser"@"localhost" IDENTIFIED BY "GucluSifre123";'
sudo mysql -e 'GRANT ALL PRIVILEGES ON film_indir.* TO "filmuser"@"localhost";'
sudo mysql -e 'FLUSH PRIVILEGES;'
```

---

## 📁 Adım 5: Projeyi Sunucuya Çekme ve Çalıştırma

Projeyi `/var/www/film_indir` klasörüne klonlayın:

```bash
# Web dizinine gidin ve depoyu çekin
cd /var/www
git clone https://github.com/fatihates0/film_indir_v3.git film_indir
cd film_indir

# PHP ve React bağımlılıklarını yükleyin
composer install --no-dev --optimize-autoloader
npm install
npm run build

# .env Dosyasını Oluşturun
cp .env.example .env
php artisan key:generate
```

`.env` dosyasını açıp veritabanı bilgilerinizi yazın:
```bash
nano .env
```
İçindeki veritabanı satırlarını güncelleyin:
```ini
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=film_indir
DB_USERNAME=filmuser
DB_PASSWORD=GucluSifre123
```
*(Kaydedip çıkmak için: `CTRL + O`, `Enter`, ardından `CTRL + X`)*

Veritabanı tablolarını ve paketleri oluşturun:
```bash
php artisan migrate --force
php artisan db:seed --class=PlanSeeder --force
```

Klasör izinlerini Nginx'e (`www-data`) verin:
```bash
sudo chown -R www-data:www-data /var/www/film_indir
sudo chmod -R 775 /var/www/film_indir/storage /var/www/film_indir/bootstrap/cache
```

---

## 🌐 Adım 6: Nginx Yapılandırması ve Alan Adı Bağlama

Yeni bir Nginx ayar dosyası oluşturun:
```bash
sudo nano /etc/nginx/sites-available/sinekutu.conf
```

Aşağıdaki yapılandırmayı yapıştırın *( `film.siteniz.com` yerine kendi domaininizi yazın )*:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name film.siteniz.com;

    root /var/www/film_indir/public;
    index index.php index.html;

    client_max_body_size 500M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 14400s;
    }

    # Hetzner Storage Box İçin X-Accel Dahili İndirme Bloğu (100 GB+ Dosya Akışı)
    location /internal-storage/ {
        internal;
        proxy_pass https://u123456.your-storagebox.de/;
        proxy_set_header Authorization "Basic dTEyMzQ1NjpTaWZyZW5pekJ1cmF5YQ==";
        proxy_set_header Range $http_range;
        proxy_set_header If-Range $http_if_range;
        proxy_http_version 1.1;

        # Canlı Akış: 100 GB dosya bile olsa belleği ve diski tüketmez
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 14400s;
        proxy_send_timeout 14400s;

        post_action @log_download_bytes;
    }

    # Bayt Sayıcı Webhook
    location @log_download_bytes {
        proxy_pass http://127.0.0.1/api/internal/downloads/log-bytes?token=$upstream_http_x_download_token&bytes_sent=$body_bytes_sent;
        proxy_method POST;
        proxy_set_body "";
    }
}
```

Siteyi aktifleştirin ve Nginx'i yeniden başlatın:
```bash
sudo ln -s /etc/nginx/sites-available/sinekutu.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Ücretsiz SSL (HTTPS) Kurulumu:
Domaininizin DNS A kaydı VPS IP'nize yönlenmişse tek komutla SSL kurun:
```bash
sudo certbot --nginx -d film.siteniz.com
```

---

## ⏰ Adım 7: Otomatik Görevleri (Cron) Başlatın

Kullanıcıların kotalarının günü geldiğinde aydan aya otomatik sıfırlanması için cron'u açın:

```bash
crontab -e
```
En alt satıra şunu ekleyin ve kaydedin:
```bash
* * * * * cd /var/www/film_indir && php artisan schedule:run >> /dev/null 2>&1
```

---

## ⚡ Adım 8: Arka Plan Kuyruk Yöneticisi (Supervisor - Disk & TMDB Taramaları)

Storage Box disk taraması (`disk_scan`) ve TMDB eşleme (`tmdb_scan`) işlemlerinin sunucu yeniden başlasa bile 7/24 arka planda kesintisiz çalışması için **Supervisor** kullanılır.

### 1. Supervisor'ı Yükleyin:
```bash
sudo apt install -y supervisor
```

### 2. Kuyruk Yapılandırma Dosyası Oluşturun:
```bash
sudo nano /etc/supervisor/conf.d/sinekutu-worker.conf
```

İçine aşağıdaki yapılandırmayı yapıştırın:
```ini
[program:sinekutu-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/film_indir/artisan queue:work --queue=disk_scan,tmdb_scan,default --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/film_indir/storage/logs/worker.log
stopwaitsecs=3600
```
*(Kaydedip çıkmak için: `CTRL + O`, `Enter`, ardından `CTRL + X`)*

### 3. Supervisor'ı Başlatın:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start sinekutu-worker:*
```

*Kuyruk durumunu kontrol etmek için:*
```bash
sudo supervisorctl status
```
*(Çıktıda `sinekutu-worker:sinekutu-worker_00 RUNNING` görüyorsanız kuyruklarınız tıkır tıkır çalışıyor demektir).*

---

## 🛡️ Adım 9: Güvenlik Duvarı (UFW) Ayarı

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

### 🎉 Tebrikler! Kurulum Tamamlandı!

Artık tarayıcınızdan alan adınıza girdiğinizde:
1. Siteniz yüksek hızla yayında olacaktır.
2. `disk_scan` ve `tmdb_scan` arka plan kuyrukları Supervisor ile 7/24 otomatik işlenecektir.
3. Kullanıcılar `/pricing` sayfasından istedikleri pakete abone olabilirler.
4. İndirilen her dosya Storage Box'tan yerel ağ üzerinden 1 Gbps hat hızıyla çekilip bayt bayt tam hesaplanarak kullanıcının kotasından düşülecektir.

