#!/bin/bash

# ==============================================================================
# ENTERPRISE STORAGE GATEWAY MANAGER v3.3
# Direct Mount Scanning & Deep Subdirectory Auto-Discovery
#
# bash gateway_setup.sh update — ⚡ Hızlı Kod Güncelleme (1 Saniyede Server.js Günceller)
# bash gateway_setup.sh install — Sıfırdan Kurulum Sihirbazı
# bash gateway_setup.sh status — Dashboard ve Disk Listesi
# bash gateway_setup.sh token — Token Paneli
# bash gateway_setup.sh disk-graph — Doluluk Grafiği
# bash gateway_setup.sh file-stats — Dosya İstatistikleri
# bash gateway_setup.sh connectivity — Bağlantı Testi
# bash gateway_setup.sh add-disk — Yeni Disk Ekleme
#
# ==============================================================================

set -e

INSTALL_DIR="/opt/storage-gateway"
ENV_FILE="$INSTALL_DIR/.env"
SERVICE_NAME="storage-gateway"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[BİLGİ]${NC} $1"; }
log_success() { echo -e "${GREEN}[BAŞARILI]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[UYARI]${NC} $1"; }
log_error() { echo -e "${RED}[HATA]${NC} $1"; }
log_step() { echo -e "\n${MAGENTA}==>${NC} ${BOLD}$1${NC}"; }

if [ "$EUID" -ne 0 ]; then
    log_error "Lütfen bu scripti root yetkisi (sudo) ile çalıştırın!"
    exit 1
fi

is_installed() {
    if [ -d "$INSTALL_DIR" ] && [ -f "$ENV_FILE" ] && systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
        return 0
    else
        return 1
    fi
}

get_env_val() {
    local key=$1
    if [ -f "$ENV_FILE" ]; then
        grep "^${key}=" "$ENV_FILE" | cut -d'=' -f2- | sed -e 's/"//g' -e "s/'//g"
    fi
}

scan_all_block_devices() {
    lsblk -J -b -o NAME,SIZE,FSTYPE,MOUNTPOINT,TYPE,MODEL 2>/dev/null | \
    python3 - << 'PY_EOF' 2>/dev/null
import json, sys

SKIP_FS = {'vfat', 'iso9660', 'squashfs', 'tmpfs', 'devtmpfs'}
MIN_SIZE = 100 * 1024 * 1024
SKIP_DEV = ['sr', 'loop', 'ram', 'zram', 'dm-', 'md']

def parse_size(s):
    try: return int(s)
    except: return 0

result = []

def walk(devices, parent_model=''):
    for d in devices:
        dtype   = d.get('type', '')
        name    = d.get('name', '')
        dev     = '/dev/' + name
        size_b  = parse_size(d.get('size', 0))
        fs      = (d.get('fstype') or '').strip()
        mp      = (d.get('mountpoint') or '').strip()
        model   = ((d.get('model') or '').strip()) or parent_model
        children = d.get('children') or []

        if any(name.startswith(x) for x in SKIP_DEV):
            continue

        if dtype == 'disk':
            if children:
                walk(children, model)
            else:
                if size_b >= MIN_SIZE and fs not in SKIP_FS:
                    result.append((dev, size_b, fs, mp, model))
        elif dtype == 'part':
            if size_b < MIN_SIZE:
                continue
            if fs in SKIP_FS:
                continue
            result.append((dev, size_b, fs, mp, model))

walk(json.load(sys.stdin).get('blockdevices', []))
result.sort(key=lambda x: x[1], reverse=True)

for dev, size_b, fs, mp, model in result:
    if size_b >= 1024**4:
        size_str = f'{size_b/1024**4:.1f}T'
    elif size_b >= 1024**3:
        size_str = f'{size_b/1024**3:.1f}G'
    elif size_b >= 1024**2:
        size_str = f'{size_b/1024**2:.0f}M'
    else:
        size_str = f'{size_b}B'
    print(f'{dev}|{size_str}|{fs}|{mp}|{model}')
PY_EOF
}

auto_mount_disk() {
    local dev=$1
    local mp=$2
    local fs=$3

    mkdir -p "$mp"

    if [ -z "$fs" ]; then
        log_warn "$dev üzerinde dosya sistemi bulunamadı!"
        read -p "ext4 ile formatlamak ister misiniz? Tüm veri SİLİNECEK! (evet/hayır): " CONFIRM
        if [[ "$CONFIRM" =~ ^[Ee]vet$|^e$|^E$ ]]; then
            log_info "$dev ext4 ile formatlanıyor..."
            mkfs.ext4 -F "$dev" >/dev/null 2>&1
            fs="ext4"
            log_success "Format tamamlandı."
        else
            log_warn "Format iptal edildi. Bu disk kullanılamaz."
            return 1
        fi
    fi

    if ! mountpoint -q "$mp"; then
        mount "$dev" "$mp" 2>/dev/null || { log_error "Mount başarısız: $dev -> $mp"; return 1; }
        log_success "$dev -> $mp olarak mount edildi."
    fi

    local uuid
    uuid=$(blkid -s UUID -o value "$dev" 2>/dev/null)
    if [ -n "$uuid" ] && ! grep -q "$uuid" /etc/fstab; then
        echo "UUID=$uuid $mp auto defaults,nofail 0 2" >> /etc/fstab
        log_info "fstab'a eklendi: UUID=$uuid"
    fi
    return 0
}

get_next_depo_dir() {
    local i=1
    while [ -d "/mnt/depo$i" ] || grep -q "/mnt/depo$i" "$ENV_FILE" 2>/dev/null || mountpoint -q "/mnt/depo$i" 2>/dev/null; do
        ((i++))
    done
    echo "/mnt/depo$i"
}

ensure_depo_mount() {
    local dev=$1
    local mp=$2
    local target_dir=$3
    local fs=$4

    mkdir -p "$target_dir"
    chmod 755 "$target_dir"

    if [ -n "$mp" ]; then
        if [ "$mp" = "/" ]; then
            return 0
        elif [ "$mp" = "$target_dir" ]; then
            return 0
        else
            if ! mountpoint -q "$target_dir"; then
                mount --bind "$mp" "$target_dir" 2>/dev/null || { log_error "Bind mount başarısız: $mp -> $target_dir"; return 1; }
                log_success "Bind mount yapıldı: $mp -> $target_dir"
            fi
            if ! grep -q "$target_dir" /etc/fstab; then
                echo "$mp $target_dir none bind 0 0" >> /etc/fstab
                log_info "fstab bind kaydı eklendi: $mp -> $target_dir"
            fi
            return 0
        fi
    else
        auto_mount_disk "$dev" "$target_dir" "$fs"
    fi
}

set_env_val() {
    local key=$1
    local val=$2
    if [ -f "$ENV_FILE" ]; then
        if grep -q "^${key}=" "$ENV_FILE"; then
            sed -i "s|^${key}=.*|${key}=\"${val}\"|" "$ENV_FILE"
        else
            echo "${key}=\"${val}\"" >> "$ENV_FILE"
        fi
    fi
}

migrate_disks_to_depo_format() {
    if [ ! -f "$ENV_FILE" ]; then return; fi
    local current_disks=$(get_env_val "STORAGE_DISKS")
    [ -z "$current_disks" ] && return

    IFS=',' read -ra D_ARRAY <<< "$current_disks"
    local needs_migration=0
    for d in "${D_ARRAY[@]}"; do
        d_clean=$(echo "$d" | tr -d ' ')
        if [[ "$d_clean" != /mnt/depo* ]]; then
            needs_migration=1
            break
        fi
    done

    if [ $needs_migration -eq 1 ]; then
        local new_disks=()
        local idx=1
        for d in "${D_ARRAY[@]}"; do
            d_clean=$(echo "$d" | tr -d ' ')
            if [[ "$d_clean" == /mnt/depo* ]]; then
                new_disks+=("$d_clean")
            else
                local target="/mnt/depo$idx"
                while [[ " ${new_disks[*]} " =~ " $target " ]]; do
                    ((idx++))
                    target="/mnt/depo$idx"
                done
                mkdir -p "$target"
                chmod 755 "$target"
                if [ -d "$d_clean" ]; then
                    if mountpoint -q "$d_clean" || [ "$d_clean" = "/var/storage" ]; then
                        mountpoint -q "$target" || mount --bind "$d_clean" "$target" 2>/dev/null || true
                        grep -q "$target" /etc/fstab || echo "$d_clean $target none bind 0 0" >> /etc/fstab 2>/dev/null || true
                    fi
                fi
                new_disks+=("$target")
            fi
            ((idx++))
        done
        local new_csv=$(IFS=,; echo "${new_disks[*]}")
        set_env_val "STORAGE_DISKS" "$new_csv"
    fi
}

clean_media_suffixes() {
    if [ -f "$ENV_FILE" ]; then
        local current_disks=$(get_env_val "STORAGE_DISKS")
        if [ -n "$current_disks" ]; then
            local cleaned=$(echo "$current_disks" | sed 's|/media||g' | tr -s '/')
            set_env_val "STORAGE_DISKS" "$cleaned"
        fi
    fi
}

show_dashboard() {
    clean_media_suffixes
    migrate_disks_to_depo_format
    clear
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "${BOLD}${BLUE}   DYNAMIC VIRTUAL STORAGE GATEWAY MANAGER v3.3                     ${NC}"
    echo -e "${CYAN}====================================================================${NC}"

    local status_str="${RED}DURDURULDU / OFFLINE${NC}"
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        status_str="${GREEN}ÇALIŞIYOR / ONLINE${NC}"
    fi

    local nginx_str="${RED}DURDURULDU${NC}"
    if systemctl is-active --quiet nginx 2>/dev/null; then
        nginx_str="${GREEN}ÇALIŞIYOR${NC}"
    fi

    local ssl_str="${YELLOW}Kontrol edilemiyor${NC}"
    local domain=$(get_env_val "STORAGE_DOMAIN")
    if [ -n "$domain" ] && command -v openssl >/dev/null 2>&1; then
        local cert_file="/etc/letsencrypt/live/${domain}/cert.pem"
        if [ -f "$cert_file" ]; then
            local exp_date exp_epoch now_epoch days_left
            exp_date=$(openssl x509 -enddate -noout -in "$cert_file" 2>/dev/null | cut -d= -f2)
            exp_epoch=$(date -d "$exp_date" +%s 2>/dev/null || echo 0)
            now_epoch=$(date +%s)
            days_left=$(( (exp_epoch - now_epoch) / 86400 ))
            if [ "$days_left" -le 14 ]; then
                ssl_str="${RED}KRİTİK - $days_left gün kaldı!${NC}"
            elif [ "$days_left" -le 30 ]; then
                ssl_str="${YELLOW}UYARI - $days_left gün kaldı${NC}"
            else
                ssl_str="${GREEN}GEÇERLİ ($days_left gün)${NC}"
            fi
        else
            ssl_str="${YELLOW}Sertifika bulunamadı${NC}"
        fi
    fi

    local port=$(get_env_val "PORT" || echo "8080")
    local secret=$(get_env_val "STORAGE_SECRET_KEY" || echo "N/A")
    local disks=$(get_env_val "STORAGE_DISKS" || echo "N/A")
    local webhook=$(get_env_val "WEBHOOK_URL" || echo "")
    local webhook_str="${YELLOW}Tanımlanmamış${NC}"
    [ -n "$webhook" ] && webhook_str="${GREEN}Aktif${NC}"

    echo -e " Servis Durumu       : $status_str"
    echo -e " Nginx Durumu        : $nginx_str"
    echo -e " SSL Sertifikası     : $ssl_str"
    echo -e " Subdomain           : ${CYAN}${domain:-Tanımlanmamış}${NC}"
    echo -e " Gateway Port        : ${CYAN}$port${NC}"
    echo -e " Secret Key          : ${CYAN}$secret${NC}"
    echo -e " Aktif Depo Diskleri : ${CYAN}$disks${NC}"
    echo -e " Bildirim Webhook    : $webhook_str"
    echo -e "${CYAN}====================================================================${NC}"
    echo ""
}

list_active_disks() {
    show_dashboard
    log_step "Aktif Depolama Havuzu Disk Analizi"

    local disks_csv=$(get_env_val "STORAGE_DISKS")
    if [ -z "$disks_csv" ]; then
        log_warn "Havuzda tanımlı disk bulunamadı!"
        return
    fi

    IFS=',' read -ra DISK_ARRAY <<< "$disks_csv"
    echo -e "${YELLOW}--------------------------------------------------------------------${NC}"
    printf "%-3s | %-32s | %-8s | %-8s | %-8s\n" "#" "Dizin Yolu" "Toplam" "Kullanılan" "Boş"
    echo -e "${YELLOW}--------------------------------------------------------------------${NC}"

    local idx=1
    for disk_path in "${DISK_ARRAY[@]}"; do
        disk_path=$(echo "$disk_path" | tr -d ' ')
        if [ -d "$disk_path" ]; then
            df_out=$(df -h "$disk_path" | tail -n 1)
            size=$(echo "$df_out" | awk '{print $2}')
            used=$(echo "$df_out" | awk '{print $3}')
            avail=$(echo "$df_out" | awk '{print $4}')
            printf "%-3s | %-32s | %-8s | %-8s | %-8s\n" "$idx" "$disk_path" "$size" "$used" "$avail"
        else
            printf "%-3s | %-32s | %-8s\n" "$idx" "$disk_path (Erişilemiyor!)" "HATA"
        fi
        ((idx++))
    done
    echo -e "${YELLOW}--------------------------------------------------------------------${NC}"
    echo ""
}

add_disk_interactive() {
    show_dashboard
    log_step "Gateway Depolama Havuzuna Yeni Disk Ekleme"

    local current_disks=$(get_env_val "STORAGE_DISKS")

    echo -e "${YELLOW}SUNUCUDA BULUNAN TÜM FİZİKSEL DİSKLER VE DURUMLARI (Mount'lu + Mount'suz):${NC}"
    echo -e "${YELLOW}--------------------------------------------------------------------${NC}"

    DETECTED_DEVS=()
    DETECTED_TARGETS=()
    DETECTED_FS=()
    DETECTED_MPS=()
    depo_counter=1
    index=1

    while IFS='|' read -r dev size fs mp model; do
        [[ "$mp" == "/boot"* || "$mp" == "/snap"* ]] && continue

        DETECTED_DEVS+=("$dev")
        DETECTED_FS+=("$fs")
        DETECTED_MPS+=("$mp")

        already_in_pool=""
        if [ -n "$current_disks" ]; then
            IFS=',' read -ra C_DISKS <<< "$current_disks"
            for cd in "${C_DISKS[@]}"; do
                cd_clean=$(echo "$cd" | tr -d ' ')
                [ -z "$cd_clean" ] && continue
                if [ "$mp" = "$cd_clean" ]; then
                    already_in_pool="$cd_clean"
                    break
                fi
                cd_dev=$(df "$cd_clean" 2>/dev/null | tail -n1 | awk '{print $1}')
                if [ -n "$cd_dev" ] && [ "$cd_dev" = "$dev" ]; then
                    already_in_pool="$cd_clean"
                    break
                fi
            done
        fi

        if [ -n "$already_in_pool" ]; then
            target_dir="$already_in_pool"
            status_tag="${GREEN}[EKLİ / HAVUZDA]${NC}"
        else
            target_dir="/mnt/depo$depo_counter"
            while [[ " ${DETECTED_TARGETS[*]} " =~ " $target_dir " ]] || [[ ",$current_disks," == *",$target_dir,"* ]]; do
                ((depo_counter++))
                target_dir="/mnt/depo$depo_counter"
            done
            ((depo_counter++))
            status_tag="${CYAN}[EKLENMEDİ / BOŞTA]${NC}"
        fi

        DETECTED_TARGETS+=("$target_dir")

        if [ -n "$mp" ]; then
            avail=$(df -h "$mp" 2>/dev/null | tail -n1 | awk '{print $4}')
            mount_info="${CYAN}Mevcut Mount: $mp${NC} (Boyut: $size, Boş: $avail)"
            mount_tag="${BLUE}[MOUNT'LU]${NC}"
        else
            if [ -z "$fs" ]; then
                mount_info="Boyut: $size | ${RED}Dosya sistemi YOK (Formatlanacak)${NC}"
                mount_tag="${RED}[MOUNT'SUZ / FORMATSİZ]${NC}"
            else
                mount_info="Boyut: $size | FS: $fs | ${YELLOW}Henüz mount edilmemiş${NC}"
                mount_tag="${YELLOW}[MOUNT'SUZ]${NC}"
            fi
        fi

        model_str=""
        [ -n "$model" ] && model_str=" | Model: $model"

        echo -e "  [${CYAN}$index${NC}] ${BOLD}$dev${NC}$model_str"
        echo -e "       $mount_info"
        echo -e "       Hedef Depo Yolu: ${CYAN}$target_dir${NC}  $mount_tag  $status_tag"
        echo ""
        ((index++))
    done < <(scan_all_block_devices)

    echo -e "  [${CYAN}O${NC}] Özel Dizin Yolu Gir (Manuel)"
    echo -e "${YELLOW}--------------------------------------------------------------------${NC}"
    echo ""

    read -p "Eklenecek disk numarasını girin (veya 'O' basıp özel yol girin): " CHOICE

    local new_target=""
    local selected_dev=""
    local selected_fs=""
    local selected_mp=""

    if [[ "$CHOICE" =~ ^[0-9]+$ ]] && [ "$CHOICE" -ge 1 ] && [ "$CHOICE" -le ${#DETECTED_TARGETS[@]} ]; then
        new_target="${DETECTED_TARGETS[$((CHOICE-1))]}"
        selected_dev="${DETECTED_DEVS[$((CHOICE-1))]}"
        selected_fs="${DETECTED_FS[$((CHOICE-1))]}"
        selected_mp="${DETECTED_MPS[$((CHOICE-1))]}"

        ensure_depo_mount "$selected_dev" "$selected_mp" "$new_target" "$selected_fs" || return
    elif [[ "$CHOICE" =~ ^[Oo]$ ]]; then
        read -p "Özel Dizin Yolunu Girin (Örn: /mnt/my_disk): " new_target
    else
        log_error "Geçersiz seçim!"
        return
    fi

    if [ -n "$new_target" ]; then
        mkdir -p "$new_target"
        chmod 755 "$new_target"

        if [[ ",$current_disks," == *",$new_target,"* ]]; then
            log_warn "Bu disk zaten depolama havuzunda ekli: $new_target"
        else
            updated_disks="${current_disks},${new_target}"
            set_env_val "STORAGE_DISKS" "$updated_disks"
            systemctl restart "$SERVICE_NAME"
            log_success "Disk havuza eklendi ve servis güncellendi: $new_target"
        fi
    fi
}

remove_disk_interactive() {
    list_active_disks

    local current_disks=$(get_env_val "STORAGE_DISKS")
    if [ -z "$current_disks" ]; then return; fi

    IFS=',' read -ra DISK_ARRAY <<< "$current_disks"
    read -p "Havuzdan çıkarmak istediğiniz disk numarasını girin: " REM_IDX

    if [[ "$REM_IDX" =~ ^[0-9]+$ ]] && [ "$REM_IDX" -ge 1 ] && [ "$REM_IDX" -le ${#DISK_ARRAY[@]} ]; then
        target_rem="${DISK_ARRAY[$((REM_IDX-1))]}"
        target_rem=$(echo "$target_rem" | tr -d ' ')

        NEW_ARRAY=()
        for d in "${DISK_ARRAY[@]}"; do
            d_clean=$(echo "$d" | tr -d ' ')
            if [ "$d_clean" != "$target_rem" ]; then
                NEW_ARRAY+=("$d_clean")
            fi
        done

        if [ ${#NEW_ARRAY[@]} -eq 0 ]; then
            log_error "Havuzdaki son diski çıkaramazsınız! En az 1 aktif disk kalmalıdır."
            return
        fi

        new_disks_csv=$(IFS=,; echo "${NEW_ARRAY[*]}")
        set_env_val "STORAGE_DISKS" "$new_disks_csv"

        if mountpoint -q "$target_rem"; then
            log_info "$target_rem umount ediliyor..."
            umount -l "$target_rem" 2>/dev/null || true
            log_success "$target_rem başarıyla umount edildi."
        fi
        sed -i "\|[[:space:]]${target_rem}[[:space:]]|d" /etc/fstab 2>/dev/null || true
        rmdir "$target_rem" 2>/dev/null || true

        systemctl restart "$SERVICE_NAME"
        log_success "Disk havuzdan çıkarıldı ve servis güncellendi: $target_rem"
    else
        log_error "Geçersiz seçim!"
    fi
}

view_logs() {
    show_dashboard
    log_step "Gateway Servis Logları İzleme"

    echo -e "  [${CYAN}1${NC}] 📡 Canlı Log Akışı (Son 30 Satır - Canlı Takip)"
    echo -e "  [${CYAN}2${NC}] 📜 Tüm Log Geçmişini Görüntüle (Hepsini Gör - Pager)"
    echo -e "  [${CYAN}3${NC}] 🔢 Özel Satır Sayısı İle Göster (Örn: Son 100, 500 satır)"
    echo -e "  [${CYAN}0${NC}] ↩ Geri"
    echo ""
    read -p "Seçiminiz [Varsayılan: 1]: " LOG_CHOICE
    LOG_CHOICE=${LOG_CHOICE:-1}

    case "$LOG_CHOICE" in
        1)
            echo ""
            log_info "Son 30 log canlı izleniyor (Çıkmak için CTRL+C basınız)..."
            echo -e "${YELLOW}--------------------------------------------------------------------${NC}"
            journalctl -u "$SERVICE_NAME" -n 30 -f
            ;;
        2)
            echo ""
            log_info "Tüm servis logları gösteriliyor (Çıkmak için 'q' tuşuna basınız)..."
            sleep 1
            journalctl -u "$SERVICE_NAME" -n 2000 --no-pager | less +G 2>/dev/null || journalctl -u "$SERVICE_NAME" -n 1000
            ;;
        3)
            echo ""
            read -p "Kaç satır log gösterilsin? [Varsayılan: 100]: " N_NUM
            N_NUM=${N_NUM:-100}
            log_info "Son $N_NUM log gösteriliyor..."
            echo -e "${YELLOW}--------------------------------------------------------------------${NC}"
            journalctl -u "$SERVICE_NAME" -n "$N_NUM" --no-pager
            read -p "Devam etmek için ENTER'a basın..."
            ;;
        0)
            return
            ;;
        *)
            log_error "Geçersiz seçim!"
            sleep 1
            ;;
    esac
}

test_quota_webhook() {
    show_dashboard
    log_step "Laravel Kota Düşüm Webhook Test Aracı (POST /api/internal/downloads/log-bytes)"

    echo -e "${YELLOW}Bu araç, Storage Gateway'in indirme tamamlandığında Laravel backend'e gönderdiği${NC}"
    echo -e "${YELLOW}harcanan bayt bildirimini (log-bytes webhook) simüle ederek test eder.${NC}"
    echo ""

    local cur_laravel_url=$(get_env_val "LARAVEL_WEBHOOK_URL")
    read -p "1. Laravel Site Base URL [Varsayılan: ${cur_laravel_url:-https://sinekutu.com}]: " TARGET_URL
    TARGET_URL=${TARGET_URL:-$cur_laravel_url}
    TARGET_URL=${TARGET_URL:-https://sinekutu.com}

    TARGET_URL=$(echo "$TARGET_URL" | sed 's|/*$||')

    read -p "2. İndirme Bileti Token'ı (DownloadTicket Token) [Boş bırakırsanız test token üretilir]: " TICKET_TOKEN
    if [ -z "$TICKET_TOKEN" ]; then
        TICKET_TOKEN="TEST_TOKEN_$(date +%s)_$RANDOM"
    fi

    read -p "3. Test Edilecek İndirme Boyutu (MB cinsinden) [Varsayılan: 500 MB]: " SIZE_MB
    SIZE_MB=${SIZE_MB:-500}

    local bytes_sent=$(( SIZE_MB * 1024 * 1024 ))
    local full_endpoint="${TARGET_URL}/api/internal/downloads/log-bytes"

    log_info "İstek gönderiliyor -> POST $full_endpoint"
    log_info "Payload: {\"token\":\"$TICKET_TOKEN\", \"bytes_sent\":$bytes_sent} (${SIZE_MB} MB)"
    echo ""

    local http_response
    http_response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"token\":\"$TICKET_TOKEN\",\"bytes_sent\":$bytes_sent}" \
        --max-time 10 "$full_endpoint" 2>&1) || true

    local body
    body=$(echo "$http_response" | head -n -1)
    local code
    code=$(echo "$http_response" | tail -n 1 | cut -d: -f2)

    echo -e "${YELLOW}--------------------------------------------------------------------${NC}"
    if [ "$code" = "200" ]; then
        log_success "HTTP $code OK - Webhook isteği Laravel'e başarıyla ulaştı!"
        echo -e "  Laravel Yanıtı: ${GREEN}$body${NC}"
        log_info "Eğer bu gerçek bir bilet ise, kullanıcının kotasından ${SIZE_MB} MB düşülmüştür."
    else
        log_error "HTTP $code - Webhook isteği başarısız oldu!"
        echo -e "  Sunucu Yanıtı: ${RED}$body${NC}"
        log_warn "İpucu: Laravel sitenizin URL'sini ve /api/internal/downloads/log-bytes rotasını kontrol edin."
    fi
    echo -e "${YELLOW}--------------------------------------------------------------------${NC}"
    echo ""
}

token_management() {
    show_dashboard
    log_step "Token ve Webhook Yönetim Paneli"
    local secret=$(get_env_val "STORAGE_SECRET_KEY")
    local domain=$(get_env_val "STORAGE_DOMAIN")
    local port=$(get_env_val "PORT")
    local base_url="http://127.0.0.1:${port:-8080}"

    if [ -z "$secret" ]; then
        log_error "Secret Key tanımlanmamış! Önce kurulum yapın."
        return
    fi

    echo -e "  [${CYAN}1${NC}] Test Token Üret (1 saatlik geçerli)"
    echo -e "  [${CYAN}2${NC}] Kalıcı Token Üret (süresiz)"
    echo -e "  [${CYAN}3${NC}] Token ile /health endpoint test et"
    echo -e "  [${CYAN}4${NC}] Token ile /scan endpoint test et"
    echo -e "  [${CYAN}5${NC}] Token ile /disks endpoint test et"
    echo -e "  [${CYAN}6${NC}] Var olan token'ı decode et"
    echo -e "  [${CYAN}7${NC}] 🎯 Laravel Kota Düşüm Webhook'unu Test Et (POST /log-bytes)"
    echo -e "  [${CYAN}0${NC}] Geri"
    echo ""
    read -p "Seçiminiz: " T_CHOICE

    generate_token() {
        local expires=$1
        local payload_data='{"action":"admin"'
        if [ -n "$expires" ]; then
            payload_data="$payload_data,\"expires\":$expires"
        fi
        payload_data="$payload_data}"
        local payload_b64
        payload_b64=$(echo -n "$payload_data" | base64 -w 0)
        local sig
        sig=$(echo -n "$payload_b64" | openssl dgst -sha256 -hmac "$secret" | awk '{print $2}')
        echo "${payload_b64}.${sig}"
    }

    case $T_CHOICE in
        1)
            local exp=$(( $(date +%s) + 3600 ))
            local token
            token=$(generate_token "$exp")
            echo ""
            log_success "Test Token (1 saat geçerli):"
            echo -e "  ${CYAN}$token${NC}"
            echo ""
            echo -e "  Örnek kullanım:"
            echo -e "  ${YELLOW}curl '$base_url/scan?token=$token'${NC}"
            ;;
        2)
            local token
            token=$(generate_token "")
            echo ""
            log_success "Kalıcı Token:"
            echo -e "  ${CYAN}$token${NC}"
            echo ""
            echo -e "  Örnek kullanım:"
            echo -e "  ${YELLOW}curl '$base_url/scan?token=$token'${NC}"
            ;;
        3)
            local token
            token=$(generate_token "$(( $(date +%s) + 300 ))")
            log_info "/health endpoint test ediliyor..."
            result=$(curl -sf --max-time 5 "$base_url/health" 2>&1) || result="BAĞLANTI HATASI"
            echo -e "  Sonuç: ${GREEN}$result${NC}"
            ;;
        4)
            local token
            token=$(generate_token "$(( $(date +%s) + 300 ))")
            log_info "/scan endpoint test ediliyor..."
            result=$(curl -sf --max-time 15 "$base_url/scan?token=$token" 2>&1 | python3 -c 'import json,sys; d=json.load(sys.stdin); print("Toplam dosya:", d.get("count", 0))' 2>/dev/null) || result="HATA - servis çalışmıyor olabilir"
            echo -e "  Sonuç: ${GREEN}$result${NC}"
            ;;
        5)
            local token
            token=$(generate_token "$(( $(date +%s) + 300 ))")
            log_info "/disks endpoint test ediliyor..."
            result=$(curl -sf --max-time 5 "$base_url/disks?token=$token" 2>&1 | python3 -c '
import json, sys
d = json.load(sys.stdin)
s = d.get("summary", {})
t = s.get("total_bytes", 0) // (1024*1024*1024)
f = s.get("free_bytes", 0) // (1024*1024*1024)
p = s.get("usage_percent", 0)
print("Toplam:", t, "GB | Boş:", f, "GB | Doluluk: %", p)
' 2>/dev/null) || result="HATA"
            echo -e "  Sonuç: ${GREEN}$result${NC}"
            ;;
        6)
            read -p "Decode edilecek token'ı girin: " RAW_TOKEN
            payload_b64=$(echo "$RAW_TOKEN" | cut -d'.' -f1)
            decoded=$(echo "$payload_b64" | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null) || decoded="Decode hatası"
            echo ""
            log_info "Token içeriği:"
            echo -e "${CYAN}$decoded${NC}"
            ;;
        7)
            test_quota_webhook
            ;;
        0) return ;;
        *) log_error "Geçersiz seçim!" ;;
    esac
}

disk_usage_graph() {
    show_dashboard
    log_step "Depolama Havuzu Doluluk Grafiği"

    local disks_csv=$(get_env_val "STORAGE_DISKS")
    if [ -z "$disks_csv" ]; then
        log_warn "Havuzda tanımlı disk bulunamadı!"
        return
    fi

    local quota_csv=$(get_env_val "STORAGE_QUOTAS")
    local labels_csv=$(get_env_val "STORAGE_LABELS")

    local total_pool_bytes=0 free_pool_bytes=0

    IFS=',' read -ra DISK_ARRAY <<< "$disks_csv"
    for disk_path in "${DISK_ARRAY[@]}"; do
        disk_path=$(echo "$disk_path" | tr -d ' ')
        [ -d "$disk_path" ] || continue

        local label=""
        if [ -n "$labels_csv" ]; then
            IFS=',' read -ra LBL_PAIRS <<< "$labels_csv"
            for pair in "${LBL_PAIRS[@]}"; do
                p=$(echo "$pair" | tr -d ' ')
                p_path=$(echo "$p" | cut -d: -f1)
                p_lbl=$(echo "$p" | cut -d: -f2)
                [ "$p_path" = "$disk_path" ] && label="[$p_lbl] " && break
            done
        fi

        local df_out total_kb used_kb avail_kb pct
        df_out=$(df -k "$disk_path" | tail -n1)
        total_kb=$(echo "$df_out" | awk '{print $2}')
        used_kb=$(echo "$df_out" | awk '{print $3}')
        avail_kb=$(echo "$df_out" | awk '{print $4}')
        pct=$(echo "$df_out" | awk '{print $5}' | tr -d '%')

        total_pool_bytes=$(( total_pool_bytes + total_kb * 1024 ))
        free_pool_bytes=$(( free_pool_bytes + avail_kb * 1024 ))

        local quota_gb=0 quota_str=""
        if [ -n "$quota_csv" ]; then
            IFS=',' read -ra QT_PAIRS <<< "$quota_csv"
            for pair in "${QT_PAIRS[@]}"; do
                p=$(echo "$pair" | tr -d ' ')
                p_path=$(echo "$p" | cut -d: -f1)
                p_gb=$(echo "$p" | cut -d: -f2)
                if [ "$p_path" = "$disk_path" ]; then
                    quota_gb=$p_gb
                    local quota_kb=$(( quota_gb * 1024 * 1024 ))
                    if [ $used_kb -gt $quota_kb ]; then
                        pct=100
                    else
                        pct=$(( used_kb * 100 / quota_kb ))
                    fi
                    quota_str=" ${YELLOW}[Kota: ${quota_gb}GB]${NC}"
                    break
                fi
            done
        fi

        local bar_color=$GREEN
        [ "$pct" -ge 70 ] && bar_color=$YELLOW
        [ "$pct" -ge 85 ] && bar_color=$RED

        local filled=$(( pct * 40 / 100 ))
        local empty=$(( 40 - filled ))
        local bar=""
        for ((i=0; i<filled; i++)); do bar+="█"; done
        for ((i=0; i<empty;  i++)); do bar+="░"; done

        human_size() { local kb=$1; echo "$(echo "scale=1; $kb/1024/1024" | bc)G" 2>/dev/null || echo "${kb}K"; }
        local sz_total sz_used sz_avail
        sz_total=$(human_size $total_kb)
        sz_used=$(human_size $used_kb)
        sz_avail=$(human_size $avail_kb)

        echo -e " ${BOLD}${label}${disk_path}${NC}$quota_str"
        echo -e "  ${bar_color}[${bar}]${NC} %${pct}  (${sz_used} / ${sz_total} | Boş: ${sz_avail})"
        echo ""
    done

    local pool_used=$(( (total_pool_bytes - free_pool_bytes) / 1024 / 1024 ))
    local pool_total=$(( total_pool_bytes / 1024 / 1024 ))
    local pool_free=$(( free_pool_bytes / 1024 / 1024 ))
    local pool_pct=0
    [ $pool_total -gt 0 ] && pool_pct=$(( pool_used * 100 / pool_total ))
    local pfilled=$(( pool_pct * 40 / 100 ))
    local pempty=$(( 40 - pfilled ))
    local pbar=""
    for ((i=0; i<pfilled; i++)); do pbar+="█"; done
    for ((i=0; i<pempty;  i++)); do pbar+="░"; done
    local pc=$GREEN
    [ $pool_pct -ge 70 ] && pc=$YELLOW
    [ $pool_pct -ge 85 ] && pc=$RED
    echo -e "${YELLOW}────────────────────────────────────────────────────${NC}"
    echo -e " ${BOLD}HAVUZ TOPLAMI${NC}"
    echo -e "  ${pc}[${pbar}]${NC} %${pool_pct}  (${pool_used}M kullanılan / ${pool_total}M toplam | Boş: ${pool_free}M)"
    echo ""
}

disk_file_stats() {
    show_dashboard
    log_step "Depolama Havuzu Dosya İstatistikleri"
    local disks_csv=$(get_env_val "STORAGE_DISKS")
    if [ -z "$disks_csv" ]; then
        log_warn "Havuzda tanımlı disk bulunamadı!"; return
    fi

    local labels_csv=$(get_env_val "STORAGE_LABELS")
    local grand_total=0

    IFS=',' read -ra DISK_ARRAY <<< "$disks_csv"
    for disk_path in "${DISK_ARRAY[@]}"; do
        disk_path=$(echo "$disk_path" | tr -d ' ')
        [ -d "$disk_path" ] || { log_warn "$disk_path erişilemiyor, atlanıyor."; continue; }

        local label=""
        if [ -n "$labels_csv" ]; then
            IFS=',' read -ra LBL_PAIRS <<< "$labels_csv"
            for pair in "${LBL_PAIRS[@]}"; do
                p=$(echo "$pair" | tr -d ' ')
                [ "$(echo "$p"|cut -d: -f1)" = "$disk_path" ] && label=" [$(echo "$p"|cut -d: -f2)]" && break
            done
        fi

        log_info "Taranıyor: ${disk_path}${label} ..."
        local total_files dir_count ext_stats top10
        total_files=$(find "$disk_path" -type f 2>/dev/null | wc -l)
        dir_count=$(find  "$disk_path" -type d 2>/dev/null | wc -l)
        ext_stats=$(find  "$disk_path" -type f 2>/dev/null | sed 's/.*\.//' | tr '[:upper:]' '[:lower:]' | sort | uniq -c | sort -rn | head -10)
        top10=$(find "$disk_path" -type f -printf '%s %p\n' 2>/dev/null | sort -rn | head -10 | awk '{printf "  %9.0f MB  %s\n", $1/1024/1024, $2}')

        grand_total=$(( grand_total + total_files ))

        echo -e "${YELLOW}── $disk_path$label ──────────────────────────────${NC}"
        printf "  %-20s %s\n" "Toplam Dosya:"     "$total_files"
        printf "  %-20s %s\n" "Toplam Klasör:"    "$dir_count"
        echo ""
        echo -e "  ${BOLD}Uzantı Dağılımı (İlk 10):${NC}"
        echo "$ext_stats" | awk '{printf "    %-10s %s dosya\n", $2, $1}'
        echo ""
        echo -e "  ${BOLD}En Büyük 10 Dosya:${NC}"
        echo "$top10"
        echo ""
    done

    echo -e "${YELLOW}────────────────────────────────────────────────────${NC}"
    echo -e " ${BOLD}HAVUZ TOPLAMI: ${grand_total} dosya${NC}"
    echo ""
}

connectivity_test() {
    show_dashboard
    log_step "Bağlantı ve Erişilebilirlik Testi"

    local domain=$(get_env_val "STORAGE_DOMAIN")
    local port=$(get_env_val "PORT"); port=${port:-8080}
    local secret=$(get_env_val "STORAGE_SECRET_KEY")

    echo -e "${YELLOW}[1] Yerel Gateway Servisi (127.0.0.1:$port)${NC}"
    if curl -sf --max-time 5 "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
        log_success "Yerel servis yanıt veriyor."
    else
        log_error "Yerel servis yanıt vermiyor! (systemctl restart $SERVICE_NAME)"
    fi

    echo -e "${YELLOW}[2] Nginx Durumu${NC}"
    if systemctl is-active --quiet nginx; then
        log_success "Nginx çalışıyor."
    else
        log_error "Nginx çalışmıyor!"
    fi

    if [ -n "$domain" ]; then
        echo -e "${YELLOW}[3] HTTP Erişim (http://$domain/health)${NC}"
        http_code=$(curl -o /dev/null -s -w "%{http_code}" --max-time 10 "http://$domain/health" 2>/dev/null || echo "000")
        if [ "$http_code" = "200" ]; then
            log_success "HTTP erişimi başarılı (HTTP $http_code)"
        else
            log_error "HTTP erişimi başarısız (HTTP $http_code)"
        fi

        echo -e "${YELLOW}[4] HTTPS Erişim (https://$domain/health)${NC}"
        https_code=$(curl -o /dev/null -s -w "%{http_code}" --max-time 10 "https://$domain/health" 2>/dev/null || echo "000")
        if [ "$https_code" = "200" ]; then
            log_success "HTTPS erişimi başarılı (HTTP $https_code)"
        else
            log_warn "HTTPS erişimi başarısız (HTTP $https_code) - SSL henüz aktif olmayabilir."
        fi
    fi

    echo -e "${YELLOW}[5] Port $port Durumu${NC}"
    if ss -tlnp 2>/dev/null | grep -q ":$port " || netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        log_success "Port $port dinlemede."
    else
        log_error "Port $port kapalı!"
    fi

    echo ""
}

quota_label_management() {
    show_dashboard
    log_step "Disk Kota ve Etiket Yönetimi"

    local disks_csv=$(get_env_val "STORAGE_DISKS")
    local quotas_csv=$(get_env_val "STORAGE_QUOTAS")
    local labels_csv=$(get_env_val "STORAGE_LABELS")

    if [ -z "$disks_csv" ]; then
        log_warn "Havuzda tanımlı disk bulunamadı!"; return
    fi

    echo -e "  [${CYAN}1${NC}] Disk etiketlerini görüntüle / düzenle"
    echo -e "  [${CYAN}2${NC}] Disk kotalarını görüntüle / düzenle (GB)"
    echo -e "  [${CYAN}0${NC}] Geri"
    echo ""
    read -p "Seçiminiz: " QL_CHOICE

    IFS=',' read -ra DISK_ARRAY <<< "$disks_csv"

    case $QL_CHOICE in
        1)
            echo ""
            echo -e "${YELLOW}Mevcut Etiketler:${NC}"
            local idx=1
            for dp in "${DISK_ARRAY[@]}"; do
                dp=$(echo "$dp" | tr -d ' ')
                local cur_lbl="(yok)"
                if [ -n "$labels_csv" ]; then
                    IFS=',' read -ra LP <<< "$labels_csv"
                    for p in "${LP[@]}"; do
                        pp=$(echo "$p" | tr -d ' ')
                        [ "$(echo "$pp"|cut -d: -f1)" = "$dp" ] && cur_lbl=$(echo "$pp"|cut -d: -f2) && break
                    done
                fi
                echo -e "  [${CYAN}$idx${NC}] $dp → ${GREEN}$cur_lbl${NC}"
                ((idx++))
            done
            echo ""
            read -p "Etiket eklenecek/değiştirilecek disk numarası (0=çık): " DISK_N
            [[ "$DISK_N" =~ ^[0-9]+$ ]] && [ "$DISK_N" -ge 1 ] && [ "$DISK_N" -le ${#DISK_ARRAY[@]} ] || return
            local sel_dp=$(echo "${DISK_ARRAY[$((DISK_N-1))]}"|tr -d ' ')
            read -p "Yeni etiket (boş bırakmak için ENTER): " NEW_LBL
            [ -z "$NEW_LBL" ] && return
            local new_labels=""
            if [ -n "$labels_csv" ]; then
                IFS=',' read -ra LP <<< "$labels_csv"
                for p in "${LP[@]}"; do
                    pp=$(echo "$p"|tr -d ' ')
                    [ "$(echo "$pp"|cut -d: -f1)" != "$sel_dp" ] && { [ -n "$new_labels" ] && new_labels+=","; new_labels+="$pp"; }
                done
            fi
            [ -n "$new_labels" ] && new_labels+=","
            new_labels+="${sel_dp}:${NEW_LBL}"
            set_env_val "STORAGE_LABELS" "$new_labels"
            log_success "Etiket ayarlandı: $sel_dp → $NEW_LBL"
            ;;
        2)
            echo ""
            echo -e "${YELLOW}Mevcut Kotalar:${NC}"
            local idx=1
            for dp in "${DISK_ARRAY[@]}"; do
                dp=$(echo "$dp" | tr -d ' ')
                local cur_qt="Sınırsız"
                if [ -n "$quotas_csv" ]; then
                    IFS=',' read -ra QP <<< "$quotas_csv"
                    for p in "${QP[@]}"; do
                        pp=$(echo "$p"|tr -d ' ')
                        [ "$(echo "$pp"|cut -d: -f1)" = "$dp" ] && cur_qt="$(echo "$pp"|cut -d: -f2)GB" && break
                    done
                fi
                local disk_total
                disk_total=$(df -BG "$dp" 2>/dev/null | tail -n1 | awk '{print $2}' | tr -d G)
                echo -e "  [${CYAN}$idx${NC}] $dp → Kota: ${GREEN}$cur_qt${NC} (Fiziksel: ${disk_total:-?}GB)"
                ((idx++))
            done
            echo ""
            read -p "Kota eklenecek disk numarası (0=çık): " DISK_N
            [[ "$DISK_N" =~ ^[0-9]+$ ]] && [ "$DISK_N" -ge 1 ] && [ "$DISK_N" -le ${#DISK_ARRAY[@]} ] || return
            local sel_dp=$(echo "${DISK_ARRAY[$((DISK_N-1))]}"|tr -d ' ')
            read -p "Maksimum kota (GB olarak, 0=sınırsız): " NEW_QT
            [[ "$NEW_QT" =~ ^[0-9]+$ ]] || { log_error "Geçersiz değer!"; return; }
            local new_quotas=""
            if [ -n "$quotas_csv" ]; then
                IFS=',' read -ra QP <<< "$quotas_csv"
                for p in "${QP[@]}"; do
                    pp=$(echo "$p"|tr -d ' ')
                    [ "$(echo "$pp"|cut -d: -f1)" != "$sel_dp" ] && { [ -n "$new_quotas" ] && new_quotas+=","; new_quotas+="$pp"; }
                done
            fi
            if [ "$NEW_QT" -gt 0 ]; then
                [ -n "$new_quotas" ] && new_quotas+=","
                new_quotas+="${sel_dp}:${NEW_QT}"
            fi
            set_env_val "STORAGE_QUOTAS" "$new_quotas"
            [ "$NEW_QT" -gt 0 ] && log_success "Kota ayarlandı: $sel_dp → ${NEW_QT}GB" || log_success "Kota kaldırıldı: $sel_dp"
            ;;
        0) return ;;
        *) log_error "Geçersiz seçim!" ;;
    esac
}

notification_settings() {
    show_dashboard
    log_step "Bildirim Ayarları - Webhook / Telegram"

    local cur_webhook=$(get_env_val "WEBHOOK_URL")
    local cur_laravel_url=$(get_env_val "LARAVEL_WEBHOOK_URL")
    local cur_tg_token=$(get_env_val "TELEGRAM_BOT_TOKEN")
    local cur_tg_chat=$(get_env_val "TELEGRAM_CHAT_ID")
    local cur_disk_thr=$(get_env_val "ALERT_DISK_PERCENT"); cur_disk_thr=${cur_disk_thr:-85}

    local wh_disp="${cur_webhook:-tanımlanmamış}"
    local laravel_disp="${cur_laravel_url:-otomatik alınıyor}"
    local tg_tok_disp="${cur_tg_token:-tanımlanmamış}"
    local tg_chat_disp="${cur_tg_chat:-tanımlanmamış}"

    echo -e " Mevcut Sistem Webhook URL : ${CYAN}${wh_disp}${NC}"
    echo -e " Mevcut Laravel Webhook URL: ${CYAN}${laravel_disp}${NC}"
    echo -e " Telegram Bot Token        : ${CYAN}${tg_tok_disp}${NC}"
    echo -e " Telegram Chat ID          : ${CYAN}${tg_chat_disp}${NC}"
    echo -e " Disk Doluluk Eşiği        : ${CYAN}%${cur_disk_thr}${NC}"
    echo ""
    echo -e "  [${CYAN}1${NC}] Sistem Webhook URL ayarla - Discord / Slack / özel"
    echo -e "  [${CYAN}2${NC}] Telegram ayarla - Bot Token + Chat ID"
    echo -e "  [${CYAN}3${NC}] Disk doluluk uyarı eşiğini değiştir - şu an: %${cur_disk_thr}"
    echo -e "  [${CYAN}4${NC}] Test bildirimi gönder"
    echo -e "  [${CYAN}5${NC}] 🎯 Laravel Kota Webhook URL Manuel Ayarla"
    echo -e "  [${CYAN}6${NC}] Tüm bildirimleri devre dışı bırak"
    echo -e "  [${CYAN}0${NC}] Geri"
    echo ""
    read -p "Seçiminiz: " N_CHOICE

    send_notification() {
        local msg="$1"
        local sent=0
        local wh=$(get_env_val "WEBHOOK_URL")
        local tg_tok=$(get_env_val "TELEGRAM_BOT_TOKEN")
        local tg_chat=$(get_env_val "TELEGRAM_CHAT_ID")
        if [ -n "$wh" ]; then
            curl -sf -X POST -H 'Content-Type: application/json' \
                -d "{\"text\":\"$msg\",\"content\":\"$msg\"}" "$wh" >/dev/null 2>&1 && sent=1
        fi
        if [ -n "$tg_tok" ] && [ -n "$tg_chat" ]; then
            curl -sf "https://api.telegram.org/bot${tg_tok}/sendMessage" \
                -d "chat_id=${tg_chat}&text=${msg}&parse_mode=HTML" >/dev/null 2>&1 && sent=1
        fi
        return $(( 1 - sent ))
    }

    case $N_CHOICE in
        1)
            read -p "System Webhook URL girin: " W_URL
            [ -z "$W_URL" ] && return
            set_env_val "WEBHOOK_URL" "$W_URL"
            log_success "Sistem Webhook URL kaydedildi."
            ;;
        2)
            read -p "Telegram Bot Token: " TG_TOK
            read -p "Telegram Chat ID  : " TG_CHAT
            [ -z "$TG_TOK" ] || [ -z "$TG_CHAT" ] && { log_error "Her iki alan da dolu olmalı!"; return; }
            set_env_val "TELEGRAM_BOT_TOKEN" "$TG_TOK"
            set_env_val "TELEGRAM_CHAT_ID"   "$TG_CHAT"
            log_success "Telegram ayarları kaydedildi."
            ;;
        3)
            read -p "Yeni uyarı eşiği - örn: 80: " NEW_THR
            [[ "$NEW_THR" =~ ^[0-9]+$ ]] || { log_error "Geçersiz değer!"; return; }
            set_env_val "ALERT_DISK_PERCENT" "$NEW_THR"
            log_success "Doluluk uyarı eşiği: %$NEW_THR"
            ;;
        4)
            local hostname_str
            hostname_str=$(hostname 2>/dev/null || echo "sunucu")
            local dt_str
            dt_str=$(date '+%d.%m.%Y %H:%M')
            if send_notification "🔔 [Storage Gateway] Test bildirimi - $hostname_str - $dt_str"; then
                log_success "Test bildirimi gönderildi!"
            else
                log_error "Bildirim gönderilemedi. Ayarları kontrol edin."
            fi
            ;;
        5)
            read -p "Laravel Base URL girin - Örn: https://movie.fatihates.com.tr: " L_URL
            [ -z "$L_URL" ] && return
            L_URL=$(echo "$L_URL" | sed 's|/*$||')
            set_env_val "LARAVEL_WEBHOOK_URL" "$L_URL"
            systemctl restart "$SERVICE_NAME" 2>/dev/null || true
            log_success "LARAVEL_WEBHOOK_URL kaydedildi ve servis yenilendi: $L_URL"
            ;;
        6)
            set_env_val "WEBHOOK_URL" ""
            set_env_val "TELEGRAM_BOT_TOKEN" ""
            set_env_val "TELEGRAM_CHAT_ID" ""
            set_env_val "LARAVEL_WEBHOOK_URL" ""
            log_success "Tüm bildirimler ve özel Laravel Webhook URL sıfırlandı."
            ;;
        0) return ;;
        *) log_error "Geçersiz seçim!" ;;
    esac
}

cron_health_management() {
    show_dashboard
    log_step "Cron Sağlık Kontrolü Yönetimi"

    local cron_script="/opt/storage-gateway/healthcheck.sh"
    local cron_tag="# storage-gateway-healthcheck"

    echo -e "  [${CYAN}1${NC}] Cron sağlık kontrolünü etkinleştir"
    echo -e "  [${CYAN}2${NC}] Cron sağlık kontrolünü devre dışı bırak"
    echo -e "  [${CYAN}3${NC}] Şu anki sağlık kontrolü loglarını göster"
    echo -e "  [${CYAN}4${NC}] Manuel sağlık kontrolü çalıştır (şimdi)"
    echo -e "  [${CYAN}0${NC}] Geri"
    echo ""

    local cron_active=0
    crontab -l 2>/dev/null | grep -q "$cron_tag" && cron_active=1
    if [ $cron_active -eq 1 ]; then
        echo -e " Cron Durumu: ${GREEN}AKTİF${NC}"
    else
        echo -e " Cron Durumu: ${RED}DEVRE DIŞI${NC}"
    fi
    echo ""
    read -p "Seçiminiz: " C_CHOICE

    write_healthcheck_script() {
        cat << 'HC_EOF' > "$cron_script"
#!/bin/bash
INSTALL_DIR="/opt/storage-gateway"
ENV_FILE="$INSTALL_DIR/.env"
SERVICE_NAME="storage-gateway"
LOG_FILE="/var/log/storage-gateway-health.log"
TS=$(date '+%Y-%m-%d %H:%M:%S')

get_val() { grep "^$1=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | sed -e 's/"//g' -e "s/'//g"; }

send_alert() {
    local msg="$1"
    local wh=$(get_val WEBHOOK_URL)
    local tg_tok=$(get_val TELEGRAM_BOT_TOKEN)
    local tg_chat=$(get_val TELEGRAM_CHAT_ID)
    [ -n "$wh" ] && curl -sf -X POST -H 'Content-Type: application/json' \
        -d "{\"text\":\"$msg\",\"content\":\"$msg\"}" "$wh" >/dev/null 2>&1
    [ -n "$tg_tok" ] && [ -n "$tg_chat" ] && curl -sf \
        "https://api.telegram.org/bot${tg_tok}/sendMessage" \
        -d "chat_id=${tg_chat}&text=${msg}" >/dev/null 2>&1
}

HOST=$(hostname)

if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "[$TS] HATA: Servis çalışmıyor, yeniden başlatılıyor..." >> "$LOG_FILE"
    systemctl restart "$SERVICE_NAME"
    sleep 3
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo "[$TS] BAŞARILI: Servis yeniden başlatıldı." >> "$LOG_FILE"
        send_alert "✅ [$HOST] Storage Gateway yeniden başlatıldı."
    else
        echo "[$TS] KRİTİK: Servis başlatılamadı!" >> "$LOG_FILE"
        send_alert "🚨 [$HOST] KRİTİK: Storage Gateway başlatılamadı!"
    fi
fi

THR=$(get_val ALERT_DISK_PERCENT); THR=${THR:-85}
DISKS=$(get_val STORAGE_DISKS)
IFS=',' read -ra DARR <<< "$DISKS"
for dp in "${DARR[@]}"; do
    dp=$(echo "$dp" | tr -d ' ')
    [ -d "$dp" ] || continue
    PCT=$(df "$dp" | tail -n1 | awk '{print $5}' | tr -d '%')
    if [ -n "$PCT" ] && [ "$PCT" -ge "$THR" ]; then
        echo "[$TS] UYARI: $dp doluluk %$PCT - $THR esigi asildi" >> "$LOG_FILE"
        send_alert "⚠️ [$HOST] Disk Uyarısı: $dp → %$PCT dolu!"
    fi
done

DOMAIN=$(get_val STORAGE_DOMAIN)
CERT="/etc/letsencrypt/live/$DOMAIN/cert.pem"
if [ -f "$CERT" ]; then
    EXP=$(openssl x509 -enddate -noout -in "$CERT" 2>/dev/null | cut -d= -f2)
    EXP_EPOCH=$(date -d "$EXP" +%s 2>/dev/null || echo 0)
    NOW=$(date +%s)
    DIFF_SEC=$(( EXP_EPOCH - NOW ))
    DAYS=$(( DIFF_SEC / 86400 ))
    if [ "$DAYS" -le 14 ]; then
        echo "[$TS] UYARI: SSL sertifikası $DAYS gün sonra bitiyor!" >> "$LOG_FILE"
        send_alert "🔒 [$HOST] SSL Uyarısı: Sertifika $DAYS gün sonra bitiyor!"
        certbot renew --quiet 2>/dev/null && systemctl reload nginx 2>/dev/null
    fi
fi

LINES=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
if [ "$LINES" -gt 10000 ]; then
    tail -n 5000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
HC_EOF
        chmod +x "$cron_script"
    }

    case $C_CHOICE in
        1)
            write_healthcheck_script
            { crontab -l 2>/dev/null | grep -v "$cron_tag" || true; echo "*/5 * * * * bash $cron_script $cron_tag"; } | crontab -
            log_success "Cron sağlık kontrolü etkinleştirildi - her 5 dakikada çalışır."
            log_info "Log dosyası: /var/log/storage-gateway-health.log"
            ;;
        2)
            crontab -l 2>/dev/null | grep -v "$cron_tag" | crontab -
            log_success "Cron sağlık kontrolü devre dışı bırakıldı."
            ;;
        3)
            local log_f="/var/log/storage-gateway-health.log"
            if [ -f "$log_f" ]; then
                echo -e "${YELLOW}Son 30 satır - $log_f:${NC}"
                tail -n 30 "$log_f"
            else
                log_warn "Henüz log dosyası oluşturulmamış."
            fi
            ;;
        4)
            write_healthcheck_script
            log_info "Sağlık kontrolü çalıştırılıyor..."
            bash "$cron_script"
            log_success "Tamamlandı."
            ;;
        0) return ;;
        *) log_error "Geçersiz seçim!" ;;
    esac
}

write_gateway_files() {
    mkdir -p "$INSTALL_DIR"
    cat << 'PKG_EOF' > "$INSTALL_DIR/package.json"
{
  "name": "storage-gateway",
  "version": "3.2.0",
  "description": "Enterprise Multi-Disk Virtual Storage Gateway Daemon",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  }
}
PKG_EOF

    if [ ! -d "$INSTALL_DIR/node_modules/express" ]; then
        log_info "Node.js paketleri kuruluyor: express, dotenv, busboy..."
        cd "$INSTALL_DIR" && npm install express dotenv busboy --silent >/dev/null 2>&1
    fi

    cat << 'JS_EOF' > "$INSTALL_DIR/server.js"
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const Busboy = require('busboy');
const { Transform } = require('stream');

const app = express();

function getActiveSocketCountForFile(userId, mediaFileId) {
    if (!userId || !mediaFileId) return 1;
    const strUserId = String(userId);
    const strFileId = String(mediaFileId);
    if (activeUserStreamsMap.has(strUserId)) {
        const userFiles = activeUserStreamsMap.get(strUserId);
        if (userFiles.has(strFileId)) {
            return Math.max(1, userFiles.get(strFileId).size);
        }
    }
    return 1;
}

function createThrottleStream(totalBytesPerSec, userId, mediaFileId) {
    let startTime = Date.now();
    let totalSent = 0;

    return new Transform({
        transform(chunk, encoding, callback) {
            totalSent += chunk.length;
            const activeSockets = getActiveSocketCountForFile(userId, mediaFileId);
            const currentStreamBytesPerSec = Math.max(8192, Math.floor(totalBytesPerSec / activeSockets));
            const expectedMs = (totalSent / currentStreamBytesPerSec) * 1000;
            const actualMs = Date.now() - startTime;
            const waitMs = expectedMs - actualMs;

            if (waitMs > 10) {
                setTimeout(() => {
                    this.push(chunk);
                    callback();
                }, waitMs);
            } else {
                this.push(chunk);
                callback();
            }
        }
    });
}

function getEnvConfig() {
    const envPath = path.join(__dirname, '.env');
    const config = {};
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
            if (match) {
                let val = match[2].trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                config[match[1]] = val;
            }
        }
    }
    return config;
}

const activeUserStreamsMap = new Map();

function registerUserStream(userId, mediaFileId, res) {
    if (!userId || !mediaFileId) return;
    const strUserId = String(userId);
    const strFileId = String(mediaFileId);

    if (!activeUserStreamsMap.has(strUserId)) {
        activeUserStreamsMap.set(strUserId, new Map());
    }
    const userFiles = activeUserStreamsMap.get(strUserId);
    if (!userFiles.has(strFileId)) {
        userFiles.set(strFileId, new Set());
    }
    userFiles.get(strFileId).add(res);
}

function unregisterUserStream(userId, mediaFileId, res) {
    if (!userId || !mediaFileId) return;
    const strUserId = String(userId);
    const strFileId = String(mediaFileId);

    if (activeUserStreamsMap.has(strUserId)) {
        const userFiles = activeUserStreamsMap.get(strUserId);
        if (userFiles.has(strFileId)) {
            const sockets = userFiles.get(strFileId);
            sockets.delete(res);
            if (sockets.size === 0) {
                userFiles.delete(strFileId);
            }
        }
        if (userFiles.size === 0) {
            activeUserStreamsMap.delete(strUserId);
        }
    }
}

function getActiveUserFileCount(userId, excludeMediaFileId = null) {
    const strUserId = String(userId);
    if (!activeUserStreamsMap.has(strUserId)) return 0;
    const userFiles = activeUserStreamsMap.get(strUserId);
    let count = 0;
    for (const fileId of userFiles.keys()) {
        if (excludeMediaFileId === null || String(fileId) !== String(excludeMediaFileId)) {
            if (userFiles.get(fileId).size > 0) {
                count++;
            }
        }
    }
    return count;
}

function reportBytesToLaravel(downloadInfo, bytesSent, isClosed = false) {
    if (!downloadInfo || !downloadInfo.ticket_token) {
        return;
    }

    let appUrl = getEnvConfig().LARAVEL_WEBHOOK_URL;
    if (!appUrl && downloadInfo.app_url) {
        if (!downloadInfo.app_url.includes('127.0.0.1') && !downloadInfo.app_url.includes('localhost')) {
            appUrl = downloadInfo.app_url;
        }
    }

    if (!appUrl) {
        return;
    }

    try {
        const targetUrl = new URL('/api/internal/downloads/log-bytes', appUrl);
        const postData = JSON.stringify({
            token: downloadInfo.ticket_token,
            bytes_sent: bytesSent,
            closed: isClosed,
            finished: isClosed
        });

        const transport = targetUrl.protocol === 'https:' ? https : http;
        const req = transport.request(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 5000
        });

        req.on('error', (err) => {
            console.error('Laravel log-bytes webhook hatasi:', err.message);
        });

        req.write(postData);
        req.end();
    } catch (e) {
        console.error('reportBytesToLaravel hatasi:', e.message);
    }
}

const VIDEO_EXTENSIONS = new Set(['mkv', 'mp4', 'avi', 'mov', 'wmv', 'webm', 'flv', 'm4v', 'ts', 'm2ts', 'iso']);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function getActiveStorageDisks() {
    const cfg = getEnvConfig();
    const rawDisks = cfg.STORAGE_DISKS || '/var/storage';
    const envDisks = rawDisks.split(',').map(d => path.resolve(d.trim())).filter(Boolean);

    return Array.from(new Set(envDisks)).filter(diskPath => {
        try {
            if (!fs.existsSync(diskPath)) {
                fs.mkdirSync(diskPath, { recursive: true });
            }
            return fs.existsSync(diskPath) && fs.statSync(diskPath).isDirectory();
        } catch (e) {
            return false;
        }
    });
}

function verifyToken(req, res, next) {
    const cfg = getEnvConfig();
    const SECRET_KEY = cfg.STORAGE_SECRET_KEY;
    const token = req.query.token || req.headers['x-storage-token'];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Token bulunamadi.' });
    }

    try {
        const [payloadBase64, signature] = token.split('.');
        if (!payloadBase64 || !signature) {
            return res.status(403).json({ success: false, error: 'Gecersiz token formati.' });
        }

        const expectedSignature = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(payloadBase64)
            .digest('hex');

        if (signature.length !== expectedSignature.length ||
            !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            return res.status(403).json({ success: false, error: 'Imza dogrulanamadi.' });
        }

        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));

        if (payload.expires && payload.expires < Math.floor(Date.now() / 1000)) {
            return res.status(410).json({ success: false, error: 'Baglantinin suresi dolmus.' });
        }

        req.downloadInfo = payload;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, error: 'Token dogrulama hatasi: ' + err.message });
    }
}

function getBestTargetDisk() {
    const activeDisks = getActiveStorageDisks();
    let bestDisk = activeDisks[0] || '/var/storage';
    let maxFree = -1;

    for (const diskPath of activeDisks) {
        try {
            if (fs.statfsSync) {
                const sf = fs.statfsSync(diskPath);
                const freeBytes = sf.bsize * sf.bavail;
                if (freeBytes > maxFree) {
                    maxFree = freeBytes;
                    bestDisk = diskPath;
                }
            }
        } catch (e) {}
    }
    return bestDisk;
}

app.get('/health', (req, res) => {
    res.json({ success: true, status: 'online', message: 'Servis saglikli ve calisiyor' });
});

app.get('/active-streams', verifyToken, (req, res) => {
    const summary = {};
    for (const [uId, filesMap] of activeUserStreamsMap.entries()) {
        const fileList = [];
        for (const [fId, sockets] of filesMap.entries()) {
            fileList.push({ media_file_id: fId, active_sockets: sockets.size });
        }
        summary[uId] = {
            active_files_count: filesMap.size,
            files: fileList
        };
    }
    res.json({ success: true, active_users_count: Object.keys(summary).length, users: summary });
});

app.get('/disks', verifyToken, (req, res) => {
    try {
        const activeDisks = getActiveStorageDisks();
        let totalPoolBytes = 0;
        let freePoolBytes = 0;

        const disksDetail = activeDisks.map((diskPath, index) => {
            let total = 0, free = 0, used = 0;
            try {
                if (fs.statfsSync) {
                    const sf = fs.statfsSync(diskPath);
                    total = sf.bsize * sf.blocks;
                    free = sf.bsize * sf.bavail;
                    used = total - free;
                }
            } catch (e) {}

            totalPoolBytes += total;
            freePoolBytes += free;

            return {
                disk_index: index,
                path: diskPath,
                total_bytes: total,
                free_bytes: free,
                used_bytes: used,
                total_mb: Math.round(total / (1024 * 1024)),
                used_mb: Math.round(used / (1024 * 1024)),
                free_mb: Math.round(free / (1024 * 1024))
            };
        });

        const usedPoolBytes = totalPoolBytes - freePoolBytes;
        const usagePercent = totalPoolBytes > 0 ? ((usedPoolBytes / totalPoolBytes) * 100).toFixed(2) : 0;

        res.json({
            success: true,
            mode: 'enterprise_pool',
            summary: {
                total_bytes: totalPoolBytes,
                free_bytes: freePoolBytes,
                used_bytes: usedPoolBytes,
                usage_percent: usagePercent,
                total_mb: Math.round(totalPoolBytes / (1024 * 1024)),
                used_mb: Math.round(usedPoolBytes / (1024 * 1024)),
                free_mb: Math.round(freePoolBytes / (1024 * 1024))
            },
            physical_disks: disksDetail
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


function scanDirectory(dirPath, relativeDir, fileListMap, visited = new Set()) {
    try {
        if (!fs.existsSync(dirPath)) return;

        const realPath = fs.realpathSync(dirPath);
        if (visited.has(realPath)) return;
        visited.add(realPath);

        const items = fs.readdirSync(dirPath);
        for (const itemName of items) {
            try {
                const fullPath = path.join(dirPath, itemName);
                const relPath = path.join(relativeDir, itemName).replace(/\\/g, '/');
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    scanDirectory(fullPath, relPath, fileListMap, visited);
                } else if (stat.isFile()) {
                    const ext = path.extname(itemName).toLowerCase().replace('.', '');
                    if (VIDEO_EXTENSIONS.has(ext)) {
                        const normalizedRelPath = '/' + relPath.replace(/^\//, '');

                        if (!fileListMap.has(normalizedRelPath)) {
                            fileListMap.set(normalizedRelPath, {
                                filename: itemName,
                                path: normalizedRelPath,
                                directory: '/' + path.dirname(relPath).replace(/^\.$/, '').replace(/^\//, ''),
                                extension: ext,
                                size_bytes: stat.size,
                                modified_at: stat.mtime.toISOString()
                            });
                        }
                    }
                }
            } catch (err) {}
        }
    } catch (err) {}
}

app.get('/scan', verifyToken, (req, res) => {
    try {
        const activeDisks = getActiveStorageDisks();
        const fileListMap = new Map();

        activeDisks.forEach((diskRoot) => {
            scanDirectory(diskRoot, '/', fileListMap);
        });

        const files = Array.from(fileListMap.values());
        res.json({ success: true, count: files.length, files: files });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Tarama hatasi: ' + err.message });
    }
});

function checkActiveWithLaravel(downloadInfo, callback) {
    if (!downloadInfo || !downloadInfo.ticket_token) {
        return callback(null, true);
    }

    let appUrl = getEnvConfig().LARAVEL_WEBHOOK_URL;
    if (!appUrl && downloadInfo.app_url) {
        if (!downloadInfo.app_url.includes('127.0.0.1') && !downloadInfo.app_url.includes('localhost')) {
            appUrl = downloadInfo.app_url;
        }
    }

    if (!appUrl) {
        return callback(null, true);
    }

    try {
        const targetUrl = new URL('/api/internal/downloads/check-active', appUrl);
        const postData = JSON.stringify({
            token: downloadInfo.ticket_token,
            user_id: downloadInfo.user_id,
            media_file_id: downloadInfo.media_file_id,
            max_parallel_downloads: downloadInfo.max_parallel_downloads
        });

        const transport = targetUrl.protocol === 'https:' ? https : http;
        const req = transport.request(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 3000
        });

        req.on('error', () => callback(null, true));
        req.on('timeout', () => {
            try { req.destroy(); } catch(e) {}
            callback(null, true);
        });

        req.on('response', (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data && data.allowed === false) {
                        return callback(null, false, data);
                    }
                    callback(null, true);
                } catch (e) {
                    callback(null, true);
                }
            });
        });

        req.write(postData);
        req.end();
    } catch (e) {
        callback(null, true);
    }
}

app.get('/download', verifyToken, (req, res) => {
    const userId = req.downloadInfo.user_id;
    const mediaFileId = req.downloadInfo.media_file_id;
    const maxParallel = parseInt(req.downloadInfo.max_parallel_downloads || 0, 10);

    if (userId && maxParallel > 0) {
        const activeFilesCount = getActiveUserFileCount(userId, mediaFileId);
        if (activeFilesCount >= maxParallel) {
            return res.status(429).json({
                success: false,
                code: 'PARALLEL_LIMIT_EXCEEDED',
                error: `Paketiniz ayni anda en fazla ${maxParallel} farkli dosya indirmenize izin vermektedir. (Su an aktif: ${activeFilesCount} dosya). Lutfen devam eden indirmelerinizin bitmesini veya durdurulmasini bekleyin.`,
                max_parallel_downloads: maxParallel,
                active_parallel_downloads: activeFilesCount
            });
        }
    }

    checkActiveWithLaravel(req.downloadInfo, (err, allowed, reasonData) => {
        if (allowed === false) {
            return res.status(429).json({
                success: false,
                code: reasonData ? reasonData.code : 'PARALLEL_LIMIT_EXCEEDED',
                error: reasonData ? reasonData.message : `Paketiniz ayni anda en fazla ${maxParallel} farkli dosya indirmenize izin vermektedir.`,
                max_parallel_downloads: maxParallel
            });
        }

        const relativePath = req.downloadInfo.file_path || req.query.file_path;

    if (!relativePath) {
        return res.status(400).json({ success: false, error: 'file_path eksik.' });
    }

    const activeDisks = getActiveStorageDisks();
    let fullPath = null;

    for (const diskRoot of activeDisks) {
        const resolved = path.resolve(diskRoot, relativePath.replace(/^\/+/, ''));
        if (resolved.startsWith(diskRoot) && fs.existsSync(resolved)) {
            fullPath = resolved;
            break;
        }
    }

    if (!fullPath || !fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, error: 'Dosya bulunamadi.' });
    }

    const stat = fs.statSync(fullPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    let bytesSent = 0;
    let reported = false;

    registerUserStream(userId, mediaFileId, res);

    function triggerReport() {
        unregisterUserStream(userId, mediaFileId, res);
        if (!reported) {
            reported = true;
            reportBytesToLaravel(req.downloadInfo, bytesSent, true);
        }
    }

    if (res.socket && typeof res.socket.setNoDelay === 'function') {
        try { res.socket.setNoDelay(true); } catch(e) {}
    }

    res.on('close', triggerReport);
    res.on('finish', triggerReport);

    const speedLimitMbps = parseInt(req.downloadInfo.speed_limit_mbps || 0, 10);
    const speedLimitBytesPerSec = speedLimitMbps > 0 ? (speedLimitMbps * 125000) : 0;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
            res.status(416).send('Requested range not satisfiable');
            return;
        }

        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(fullPath, { start, end, highWaterMark: 256 * 1024 });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(path.basename(fullPath))}"`,
        };
        if (speedLimitBytesPerSec > 0) {
            const activeSockets = getActiveSocketCountForFile(userId, mediaFileId);
            const perSocketRate = Math.max(8192, Math.floor(speedLimitBytesPerSec / activeSockets));
            head['X-Accel-Limit-Rate'] = perSocketRate.toString();
        }

        res.writeHead(206, head);
        file.on('data', (chunk) => {
            bytesSent += chunk.length;
        });

        if (speedLimitBytesPerSec > 0) {
            const throttle = createThrottleStream(speedLimitBytesPerSec, userId, mediaFileId);
            file.pipe(throttle).pipe(res);
        } else {
            file.pipe(res);
        }
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(path.basename(fullPath))}"`,
        };
        if (speedLimitBytesPerSec > 0) {
            const activeSockets = getActiveSocketCountForFile(userId, mediaFileId);
            const perSocketRate = Math.max(8192, Math.floor(speedLimitBytesPerSec / activeSockets));
            head['X-Accel-Limit-Rate'] = perSocketRate.toString();
        }
        res.writeHead(200, head);
        const stream = fs.createReadStream(fullPath, { highWaterMark: 256 * 1024 });
        stream.on('data', (chunk) => {
            bytesSent += chunk.length;
        });

        if (speedLimitBytesPerSec > 0) {
            const throttle = createThrottleStream(speedLimitBytesPerSec, userId, mediaFileId);
            stream.pipe(throttle).pipe(res);
        } else {
            stream.pipe(res);
        }
    }
    });
});

app.post('/upload', verifyToken, (req, res) => {
    try {
        const targetPathRel = req.query.file_path || (req.downloadInfo && req.downloadInfo.file_path) || req.headers['x-file-path'];

        if (!targetPathRel) {
            return res.status(400).json({ success: false, error: 'file_path eksik.' });
        }

        const targetDisk = getBestTargetDisk();
        const fullPath = path.resolve(targetDisk, targetPathRel.replace(/^\/+/, ''));

        if (!fullPath.startsWith(targetDisk)) {
            return res.status(403).json({ success: false, error: 'Izinsiz dizin erisimi.' });
        }

        fs.mkdirSync(path.dirname(fullPath), { recursive: true });

        const contentType = req.headers['content-type'] || '';

        if (contentType.includes('multipart/form-data')) {
            const busboy = Busboy({ headers: req.headers });
            let uploadedFilePath = fullPath;

            busboy.on('file', (fieldname, file, info) => {
                const { filename } = info;
                let finalPath = fullPath;

                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                    finalPath = path.join(fullPath, filename);
                } else if (fullPath.endsWith('/') || fullPath.endsWith('\\')) {
                    finalPath = path.join(fullPath, filename);
                }

                uploadedFilePath = finalPath;
                fs.mkdirSync(path.dirname(finalPath), { recursive: true });
                const writeStream = fs.createWriteStream(finalPath);
                file.pipe(writeStream);
            });

            busboy.on('finish', () => {
                const stat = fs.existsSync(uploadedFilePath) ? fs.statSync(uploadedFilePath) : { size: 0 };
                res.json({
                    success: true,
                    message: 'Dosya yukleme tamamlandi.',
                    file_path: targetPathRel,
                    allocated_disk: targetDisk,
                    full_path: uploadedFilePath,
                    size_bytes: stat.size
                });
            });

            busboy.on('error', (err) => {
                res.status(500).json({ success: false, error: 'Yukleme hatasi: ' + err.message });
            });

            req.pipe(busboy);
        } else {
            const writeStream = fs.createWriteStream(fullPath);
            req.pipe(writeStream);

            writeStream.on('finish', () => {
                const stat = fs.statSync(fullPath);
                res.json({
                    success: true,
                    message: 'Dosya (raw stream) yukleme tamamlandi.',
                    file_path: targetPathRel,
                    allocated_disk: targetDisk,
                    full_path: fullPath,
                    size_bytes: stat.size
                });
            });

            writeStream.on('error', (err) => {
                res.status(500).json({ success: false, error: 'Stream hatasi: ' + err.message });
            });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: 'Yukleme hatasi: ' + err.message });
    }
});

app.delete('/delete', verifyToken, (req, res) => {
    try {
        const relativePath = req.query.file_path || (req.downloadInfo && req.downloadInfo.file_path);
        if (!relativePath) {
            return res.status(400).json({ success: false, error: 'file_path parametresi eksik.' });
        }

        const activeDisks = getActiveStorageDisks();

        for (const diskRoot of activeDisks) {
            const resolved = path.resolve(diskRoot, relativePath.replace(/^\/+/, ''));
            if (resolved.startsWith(diskRoot) && fs.existsSync(resolved)) {
                fs.unlinkSync(resolved);
                return res.json({ success: true, message: 'Dosya silindi.', path: relativePath });
            }
        }

        res.status(404).json({ success: false, error: 'Silinecek dosya bulunamadi.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const cfg = getEnvConfig();
const PORT = cfg.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Storage Gateway Daemon aktif! Port: ${PORT}`);
});
JS_EOF
}

quick_update() {
    clear
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "${BOLD}${BLUE}   STORAGE GATEWAY HIZLI KOD GÜNCELLEME                             ${NC}"
    echo -e "${CYAN}====================================================================${NC}"

    if [ ! -d "$INSTALL_DIR" ]; then
        log_error "Kurulu Gateway bulunamadı - $INSTALL_DIR. Önce tam kurulum yapın."
        return 1
    fi

    log_step "Server.js ve Gateway Daemon Kodu Yenileniyor..."
    write_gateway_files

    log_info "Ağ ve TCP İşletim Sistemi Tamponları Optimize Ediliyor..."
    sysctl -w net.core.rmem_max=16777216 >/dev/null 2>&1 || true
    sysctl -w net.core.wmem_max=16777216 >/dev/null 2>&1 || true
    sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216" >/dev/null 2>&1 || true
    sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216" >/dev/null 2>&1 || true

    log_info "Gateway servisi yeniden başlatılıyor..."
    systemctl restart "$SERVICE_NAME"

    log_success "Gateway Daemon kodu 1 SANİYEDE güncellendi ve servis yeniden başlatıldı!"
    echo -e "   ${GREEN}✔ Ağ, SSL, Nginx ve Disk Yapılandırmanıza Dokunulmadı.${NC}"
    sleep 2
}

install_gateway() {
    clear
    echo -e "${CYAN}====================================================================${NC}"
    echo -e "${BOLD}${BLUE}   STORAGE GATEWAY KURULUM & RE-INSTALL WIZARD                      ${NC}"
    echo -e "${CYAN}====================================================================${NC}"

    local exist_domain=$(get_env_val "STORAGE_DOMAIN")
    local exist_secret=$(get_env_val "STORAGE_SECRET_KEY")
    local exist_port=$(get_env_val "PORT")

    read -p "1. Depolama Subdomain Adresi [Varsayılan: ${exist_domain:-storage.siteniz.com}]: " DOMAIN
    DOMAIN=${DOMAIN:-$exist_domain}
    while [ -z "$DOMAIN" ]; do
        log_error "Domain adresi boş bırakılamaz!"
        read -p "1. Depolama Subdomain Adresi: " DOMAIN
    done

    DEFAULT_SECRET=$(openssl rand -hex 24 2>/dev/null || echo "SecretKey_$(date +%s)_$RANDOM")
    read -p "2. Laravel İletişim Secret Key [Varsayılan: ${exist_secret:-Rastgele}]: " SECRET_KEY
    SECRET_KEY=${SECRET_KEY:-$exist_secret}
    SECRET_KEY=${SECRET_KEY:-$DEFAULT_SECRET}

    read -p "3. Gateway Portu [Varsayılan: ${exist_port:-8080}]: " PORT
    PORT=${PORT:-$exist_port}
    PORT=${PORT:-8080}

    echo ""
    log_info "Sunucudaki kullanılabilir fiziksel diskler taranıyor..."
    echo -e "${YELLOW}--------------------------------------------------------------------${NC}"

    INST_DEVS=()
    INST_TARGETS=()
    INST_FS=()
    INST_MPS=()
    depo_counter=1
    index=1

    while IFS='|' read -r dev size fs mp model; do
        [[ "$mp" == "/boot"* || "$mp" == "/snap"* ]] && continue

        INST_DEVS+=("$dev")
        INST_FS+=("$fs")
        INST_MPS+=("$mp")

        target_dir="/mnt/depo$depo_counter"
        while [[ " ${INST_TARGETS[*]} " =~ " $target_dir " ]]; do
            ((depo_counter++))
            target_dir="/mnt/depo$depo_counter"
        done
        INST_TARGETS+=("$target_dir")
        ((depo_counter++))

        if [ -n "$mp" ]; then
            avail=$(df -h "$mp" 2>/dev/null | tail -n1 | awk '{print $4}')
            mp_info="Mevcut Mount: $mp | Boş: $avail"
            fs_label="${fs:-?}"
        else
            if [ -z "$fs" ]; then
                mp_info="${RED}Mount YOK / Dosya sistemi YOK → Formatlanacak${NC}"
                fs_label="none"
            else
                mp_info="${YELLOW}Mount YOK → Otomatik mount edilecek${NC}"
                fs_label="$fs"
            fi
        fi

        model_str=""
        [ -n "$model" ] && model_str=" - Model: $model"

        echo -e "  [${CYAN}$index${NC}] ${BOLD}$dev${NC}$model_str | Boyut: $size | FS: $fs_label"
        echo -e "       Hedef Depo Yolu: ${CYAN}$target_dir${NC} | $mp_info"
        echo ""
        ((index++))
    done < <(scan_all_block_devices)

    echo -e "${YELLOW}--------------------------------------------------------------------${NC}"
    echo ""

    SELECTED_DISKS=()

    if [ ${#INST_TARGETS[@]} -gt 0 ]; then
        echo -e "${YELLOW}Havuza eklenecek disk numaralarını virgülle ayırarak girin - Örn: 1,2 -:${NC}"
        read -p "Seçiminiz: " DISK_CHOICES

        while [ -z "$DISK_CHOICES" ]; do
            log_error "Lütfen en az bir disk numarası seçin!"
            read -p "Seçiminiz: " DISK_CHOICES
        done

        IFS=',' read -ra ADDR <<< "$DISK_CHOICES"
        for i in "${ADDR[@]}"; do
            clean_i=$(echo "$i" | tr -d ' ')
            if [[ "$clean_i" =~ ^[0-9]+$ ]] && [ "$clean_i" -ge 1 ] && [ "$clean_i" -le ${#INST_TARGETS[@]} ]; then
                target_dir="${INST_TARGETS[$((clean_i-1))]}"
                inst_dev="${INST_DEVS[$((clean_i-1))]}"
                inst_fs="${INST_FS[$((clean_i-1))]}"
                inst_mp="${INST_MPS[$((clean_i-1))]}"

                ensure_depo_mount "$inst_dev" "$inst_mp" "$target_dir" "$inst_fs" || continue

                SELECTED_DISKS+=("$target_dir")
            fi
        done
    else
        SELECTED_DISKS+=("/mnt/depo1")
        mkdir -p "/mnt/depo1"
    fi

    DISKS_CSV=$(IFS=,; echo "${SELECTED_DISKS[*]}")

    log_step "Paketler ve Bağımlılıklar Güncelleniyor..."
    if ! command -v nginx >/dev/null 2>&1 || ! command -v certbot >/dev/null 2>&1 || ! command -v node >/dev/null 2>&1; then
        apt-get update -y >/dev/null 2>&1 || true
        apt-get install -y ca-certificates curl gnupg lsb-release build-essential git nginx certbot python3-certbot-nginx >/dev/null 2>&1

        if ! command -v node >/dev/null 2>&1; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
            apt-get install -y nodejs >/dev/null 2>&1
        fi
    else
        log_info "Temel bağımlılıklar - Nginx, Certbot, Node.js - zaten kurulu, paket güncellemesi atlandı."
    fi

    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"

    for disk in "${SELECTED_DISKS[@]}"; do
        mkdir -p "$disk"
        chmod 755 "$disk"
    done

    write_gateway_files

    cat << ENV_EOF > "$ENV_FILE"
PORT=$PORT
STORAGE_DOMAIN=$DOMAIN
STORAGE_DISKS=$DISKS_CSV
STORAGE_SECRET_KEY=$SECRET_KEY
ENV_EOF

    cat << SVC_EOF > /etc/systemd/system/$SERVICE_NAME.service
[Unit]
Description=Enterprise Virtual Storage Gateway Daemon
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SVC_EOF

    systemctl daemon-reload
    systemctl enable $SERVICE_NAME >/dev/null 2>&1
    systemctl restart $SERVICE_NAME

    cat << NGINX_EOF > /etc/nginx/sites-available/storage.conf
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 0;
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection '';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_max_temp_file_size 0;
        sendfile_max_chunk 2m;
    }
}
NGINX_EOF

    ln -sf /etc/nginx/sites-available/storage.conf /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t >/dev/null 2>&1
    systemctl reload nginx

    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email >/dev/null 2>&1 || true

    log_success "Kurulum başarıyla tamamlandı!"
    sleep 2
}

main_menu() {
    while true; do
        show_dashboard
        echo -e "${BOLD}YÖNETİM İŞLEMLERİ:${NC}"
        echo -e "  [${CYAN}1${NC}]  Aktif Disk Durumu ve Doluluk Analizi"
        echo -e "  [${CYAN}2${NC}]  Yeni Disk Ekle"
        echo -e "  [${CYAN}3${NC}]  Havuzdan Disk Çıkar"
        echo -e "  [${CYAN}4${NC}]  Gateway Servis Loglarını Canlı İzle"
        echo -e "  [${CYAN}5${NC}]  Gateway Servisini Yeniden Başlat"
        echo -e "  [${CYAN}6${NC}]  ⚡ Hızlı Kod Güncelle - Sadece Server.js - 1 Saniye -"
        echo -e "  [${CYAN}7${NC}]  🔄 Sıfırdan / Tam Yeniden Kurulum Sihirbazı"
        echo -e "${YELLOW}────────────────────────────────────────────────────${NC}"
        echo -e "  [${CYAN}8${NC}]  🔑 Token Yönetimi - Üret / Test / Decode -"
        echo -e "  [${CYAN}9${NC}]  📊 Disk Doluluk Grafiği - ASCII -"
        echo -e "  [${CYAN}10${NC}] 📁 Dosya İstatistikleri"
        echo -e "  [${CYAN}11${NC}] 🌐 Bağlantı ve Erişilebilirlik Testi"
        echo -e "  [${CYAN}12${NC}] 💾 Disk Kota ve Etiket Yönetimi"
        echo -e "  [${CYAN}13${NC}] 📧 Bildirim Ayarları - Webhook / Telegram -"
        echo -e "  [${CYAN}14${NC}] 🔁 Cron Sağlık Kontrolü Yönetimi"
        echo -e "${CYAN}====================================================================${NC}"
        echo -e "  [${CYAN}0${NC}]  Çıkış"
        echo -e "${CYAN}====================================================================${NC}"
        read -p "Seçiminiz: " MENU_CHOICE

        case $MENU_CHOICE in
            1)  list_active_disks; read -p "Devam etmek için ENTER'a basın..." ;;
            2)  add_disk_interactive; read -p "Devam etmek için ENTER'a basın..." ;;
            3)  remove_disk_interactive; read -p "Devam etmek için ENTER'a basın..." ;;
            4)  view_logs ;;
            5)  systemctl restart "$SERVICE_NAME"; log_success "Servis yeniden başlatıldı."; sleep 1 ;;
            6)  quick_update ;;
            7)  install_gateway ;;
            8)  token_management; read -p "Devam etmek için ENTER'a basın..." ;;
            9)  disk_usage_graph; read -p "Devam etmek için ENTER'a basın..." ;;
            10) disk_file_stats; read -p "Devam etmek için ENTER'a basın..." ;;
            11) connectivity_test; read -p "Devam etmek için ENTER'a basın..." ;;
            12) quota_label_management; read -p "Devam etmek için ENTER'a basın..." ;;
            13) notification_settings; read -p "Devam etmek için ENTER'a basın..." ;;
            14) cron_health_management; read -p "Devam etmek için ENTER'a basın..." ;;
            0)  echo -e "${GREEN}Çıkış yapıldı.${NC}"; exit 0 ;;
            *)  log_error "Geçersiz seçim!"; sleep 1 ;;
        esac
    done
}

case "$1" in
    status)
        show_dashboard
        ;;
    list-disks)
        list_active_disks
        ;;
    add-disk)
        if [ -n "$2" ]; then
            new_target="$2"
            mkdir -p "$new_target"
            chmod 755 "$new_target"
            current_disks=$(get_env_val "STORAGE_DISKS")
            updated_disks="${current_disks},${new_target}"
            set_env_val "STORAGE_DISKS" "$updated_disks"
            systemctl restart "$SERVICE_NAME"
            log_success "Disk eklendi: $new_target"
        else
            add_disk_interactive
        fi
        ;;
    remove-disk)
        remove_disk_interactive
        ;;
    logs)
        view_logs
        ;;
    restart)
        systemctl restart "$SERVICE_NAME"
        log_success "Servis yeniden başlatıldı."
        ;;
    update|quick-update|code-update)
        quick_update
        ;;
    webhook-test|test-webhook|quota-test)
        test_quota_webhook
        ;;
    token)
        token_management
        ;;
    disk-graph)
        disk_usage_graph
        ;;
    file-stats)
        disk_file_stats
        ;;
    connectivity)
        connectivity_test
        ;;
    healthcheck)
        bash /opt/storage-gateway/healthcheck.sh
        ;;
    install|reinstall)
        install_gateway
        ;;
    *)
        if is_installed; then
            main_menu
        else
            log_info "Sunucuda kurulu Gateway bulunamadı. İlk Kurulum Sihirbazı başlatılıyor..."
            sleep 1
            install_gateway
            main_menu
        fi
        ;;
esac
