#!/usr/bin/env bash
# =============================================================================
#  S3 Yönetim Scripti
#  Çalıştırma: bash s3_manager.sh
#  - Birden fazla S3 sunucusu kaydeder (hafızada tutar, tekrar sormaz)
#  - Tekli / toplu link yükleme (diske indirmeden, doğrudan stream)
#  - Belirli bir S3'e veya rastgele S3'lere dağıtarak yükleme
#  - Gerekli paketleri otomatik kurar
# =============================================================================

set -uo pipefail

DATA_DIR="${S3M_HOME:-$HOME/.s3_manager}"
DB="$DATA_DIR/servers.db"          # name|endpoint|region|bucket|prefix|access_key|secret_key
DEFAULT_LINK_FILE="linkler.txt"
USER_AGENT="Mozilla/5.0 (X11; Linux x86_64)"

mkdir -p "$DATA_DIR"; chmod 700 "$DATA_DIR"
touch "$DB"; chmod 600 "$DB"

# ---------- Renkler ----------
if [[ -t 1 ]]; then
  R=$'\e[31m'; G=$'\e[32m'; Y=$'\e[33m'; B=$'\e[34m'; C=$'\e[36m'; W=$'\e[1m'; N=$'\e[0m'
else
  R=""; G=""; Y=""; B=""; C=""; W=""; N=""
fi
info()  { echo "${C}$*${N}"; }
ok()    { echo "${G}$*${N}"; }
warn()  { echo "${Y}$*${N}"; }
err()   { echo "${R}$*${N}" >&2; }
pause() { echo; read -r -p "Devam etmek için Enter'a basın..." _ || true; }
clear_screen() {
  [[ -t 1 ]] || return 0
  clear 2>/dev/null || printf '\033[2J\033[H'
  printf '\033[3J' 2>/dev/null || true   # kaydırma geçmişini de temizle
}

# ---------- Yardımcılar ----------
urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
trim() { printf '%s' "$1" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'; }

normalize_endpoint() {
  local e; e="$(trim "$1")"
  if [[ -n "$e" && ! "$e" =~ ^https?:// ]]; then e="https://$e"; fi
  printf '%s' "${e%/}"
}
normalize_prefix() {
  local p; p="$(trim "$1")"; p="${p#/}"
  if [[ -n "$p" && "$p" != */ ]]; then p="$p/"; fi
  printf '%s' "$p"
}

SERVERS=()
load_servers() {
  SERVERS=()
  local l
  while IFS= read -r l || [[ -n "$l" ]]; do
    [[ -z "$l" || "$l" == \#* ]] && continue
    SERVERS+=("$l")
  done < "$DB"
}

# ---------- Paket kurulumu ----------
check_deps() {
  local missing=()
  for c in curl aws unzip shuf; do command -v "$c" >/dev/null 2>&1 || missing+=("$c"); done
  printf '%s\n' "${missing[@]:-}" | grep -q . && echo "${missing[*]}" || true
}

install_packages() {
  info "== Paket kurulumu =="
  local SUDO=""
  if [[ $EUID -ne 0 ]]; then
    if command -v sudo >/dev/null 2>&1; then SUDO="sudo"; else err "root değilsiniz ve sudo yok."; return 1; fi
  fi

  if ! command -v apt-get >/dev/null 2>&1; then err "apt-get bulunamadı. Bu script Ubuntu/Debian içindir."; return 1; fi

  info "Temel paketler kuruluyor (curl, unzip, nano, pv, ca-certificates, coreutils)..."
  $SUDO apt-get update -y && $SUDO apt-get install -y curl unzip nano pv ca-certificates coreutils || { err "apt kurulumu başarısız."; return 1; }

  if command -v aws >/dev/null 2>&1; then
    ok "AWS CLI zaten kurulu: $(aws --version 2>&1)"
  else
    info "AWS CLI kuruluyor (resmi paket)..."
    local arch; arch="$(uname -m)"
    local tmp; tmp="$(mktemp -d)"
    if curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${arch}.zip" -o "$tmp/awscliv2.zip" \
       && unzip -q -o "$tmp/awscliv2.zip" -d "$tmp" \
       && $SUDO "$tmp/aws/install" --update; then
      ok "AWS CLI kuruldu."
    else
      warn "Resmi kurulum başarısız, snap deneniyor..."
      if command -v snap >/dev/null 2>&1 && $SUDO snap install aws-cli --classic; then
        ok "AWS CLI snap ile kuruldu."
      else
        err "AWS CLI kurulamadı. Elle kurun: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        rm -rf "$tmp"; return 1
      fi
    fi
    rm -rf "$tmp"
  fi
  hash -r
  ok "Tüm paketler hazır."
}

ensure_deps() {
  local m; m="$(check_deps)"
  if [[ -n "$m" ]]; then
    warn "Eksik paketler: $m"
    read -r -p "Şimdi kurulsun mu? (e/h): " a
    if [[ "$a" =~ ^[eEyY]$ ]]; then install_packages || return 1; else return 1; fi
  fi
  return 0
}

# ---------- Sunucu yönetimi ----------
save_server() { # name endpoint region bucket prefix ak sk
  local name="$1"
  awk -F'|' -v n="$name" '$1!=n' "$DB" > "$DB.tmp" && mv "$DB.tmp" "$DB"
  printf '%s|%s|%s|%s|%s|%s|%s\n' "$1" "$2" "$3" "$4" "$5" "$6" "$7" >> "$DB"
  chmod 600 "$DB"
}

add_server() {
  info "== Yeni S3 sunucusu ekle =="
  local name endpoint region bucket prefix ak sk
  read -r -p "Sunucu adı (ör: depo1): " name; name="$(trim "$name")"
  [[ -z "$name" || "$name" == *"|"* ]] && { err "Geçersiz ad."; return; }
  read -r -p "Endpoint (AWS ise boş bırakın, ör: https://s3.ornek.com): " endpoint
  read -r -p "Bölge [us-east-1]: " region; region="$(trim "$region")"; region="${region:-us-east-1}"
  read -r -p "Bucket adı: " bucket; bucket="$(trim "$bucket")"
  [[ -z "$bucket" ]] && { err "Bucket boş olamaz."; return; }
  read -r -p "Klasör/prefix (boş olabilir, ör: uploads/): " prefix
  read -r -p "Access Key: " ak; ak="$(trim "$ak")"
  read -r -s -p "Secret Key (görünmez): " sk; echo; sk="$(trim "$sk")"
  [[ -z "$ak" || -z "$sk" ]] && { err "Access/Secret key boş olamaz."; return; }

  save_server "$name" "$(normalize_endpoint "$endpoint")" "$region" "$bucket" "$(normalize_prefix "$prefix")" "$ak" "$sk"
  ok "'$name' kaydedildi."
  read -r -p "Bağlantı test edilsin mi? (e/h): " t
  if [[ "$t" =~ ^[eEyY]$ ]]; then
    ensure_deps || return
    load_servers
    for s in "${SERVERS[@]}"; do [[ "${s%%|*}" == "$name" ]] && test_server "$s"; done
  fi
}

bulk_add_servers() {
  info "== Toplu S3 sunucusu ekle =="
  cat <<TXT
Her satır şu formatta olmalı (| ile ayrılmış):
  ad|endpoint|bölge|bucket|prefix|access_key|secret_key
Örnek:
  depo1|https://s3.ornek.com|us-east-1|videolar|filmler/|AKIA123|gizliSecret
  depo2||eu-central-1|bucket2||AKIA456|gizliSecret2      (endpoint/prefix boş = AWS / klasör yok)

  1) Dosyadan oku
  2) Buraya yapıştır (bitirmek için boş satır + Enter)
TXT
  read -r -p "Seçim: " m
  local lines=() l
  if [[ "$m" == "1" ]]; then
    read -r -p "Dosya yolu: " f
    [[ -f "$f" ]] || { err "Dosya bulunamadı."; return; }
    while IFS= read -r l || [[ -n "$l" ]]; do lines+=("$l"); done < "$f"
  elif [[ "$m" == "2" ]]; then
    echo "Satırları yapıştırın:"
    while IFS= read -r l; do [[ -z "$(trim "$l")" ]] && break; lines+=("$l"); done
  else
    err "Geçersiz seçim."; return
  fi

  local added=0 skipped=0
  for l in "${lines[@]}"; do
    l="$(trim "$l")"
    [[ -z "$l" || "$l" == \#* ]] && continue
    local name endpoint region bucket prefix ak sk extra
    IFS='|' read -r name endpoint region bucket prefix ak sk extra <<< "$l"
    name="$(trim "${name:-}")"; bucket="$(trim "${bucket:-}")"; ak="$(trim "${ak:-}")"; sk="$(trim "${sk:-}")"
    if [[ -z "$name" || -z "$bucket" || -z "$ak" || -z "$sk" ]]; then
      warn "Atlandı (eksik alan): ${l:0:40}..."; skipped=$((skipped+1)); continue
    fi
    region="$(trim "${region:-}")"; region="${region:-us-east-1}"
    save_server "$name" "$(normalize_endpoint "${endpoint:-}")" "$region" "$bucket" "$(normalize_prefix "${prefix:-}")" "$ak" "$sk"
    ok "Eklendi: $name"; added=$((added+1))
  done
  echo; ok "Toplam eklenen: $added, atlanan: $skipped"
}

list_servers() {
  load_servers
  if (( ${#SERVERS[@]} == 0 )); then warn "Kayıtlı S3 sunucusu yok."; return 1; fi
  printf "${W}%-3s %-14s %-32s %-14s %-12s %s${N}\n" "No" "Ad" "Endpoint" "Bucket" "Prefix" "Access Key"
  local i=1 s name endpoint region bucket prefix ak sk
  for s in "${SERVERS[@]}"; do
    IFS='|' read -r name endpoint region bucket prefix ak sk <<< "$s"
    printf "%-3s %-14s %-32s %-14s %-12s %s\n" "$i" "$name" "${endpoint:-AWS ($region)}" "$bucket" "${prefix:--}" "${ak:0:4}****"
    i=$((i+1))
  done
  return 0
}

delete_server() {
  info "== S3 sunucusu sil =="
  list_servers || return
  echo
  read -r -p "Silinecek numara(lar) (boşlukla ayırın, 'hepsi' = tümü, boş = iptal): " sel
  [[ -z "$sel" ]] && return
  if [[ "$sel" == "hepsi" ]]; then
    read -r -p "TÜM sunucular silinsin mi? (evet yazın): " c
    [[ "$c" == "evet" ]] && : > "$DB" && ok "Tümü silindi."
    return
  fi
  local n names=()
  for n in $sel; do
    if [[ "$n" =~ ^[0-9]+$ ]] && (( n>=1 && n<=${#SERVERS[@]} )); then
      names+=("${SERVERS[$((n-1))]%%|*}")
    fi
  done
  local x
  for x in "${names[@]:-}"; do
    [[ -z "$x" ]] && continue
    awk -F'|' -v n="$x" '$1!=n' "$DB" > "$DB.tmp" && mv "$DB.tmp" "$DB"
    ok "Silindi: $x"
  done
  chmod 600 "$DB"
}

run_aws() { # server_line  aws-args...
  local line="$1"; shift
  local name endpoint region bucket prefix ak sk
  IFS='|' read -r name endpoint region bucket prefix ak sk <<< "$line"
  local ep=(); [[ -n "$endpoint" ]] && ep=(--endpoint-url "$endpoint")
  AWS_ACCESS_KEY_ID="$ak" AWS_SECRET_ACCESS_KEY="$sk" AWS_DEFAULT_REGION="$region" \
    aws "$@" "${ep[@]}"
}

test_server() {
  local line="$1" name endpoint region bucket prefix ak sk
  IFS='|' read -r name endpoint region bucket prefix ak sk <<< "$line"
  echo -n "Test: $name ... "
  local err_out
  err_out="$(run_aws "$line" s3 ls "s3://${bucket}" 2>&1)"
  if [[ $? -eq 0 ]]; then
    ok "BAŞARILI"; return 0
  else
    # Eğer s3 ls yetkisi yoksa s3api head-bucket dene
    local err_out2
    err_out2="$(run_aws "$line" s3api head-bucket --bucket "$bucket" 2>&1)"
    if [[ $? -eq 0 ]]; then
      ok "BAŞARILI"; return 0
    else
      err "BAŞARISIZ"
      echo "  ${Y}Hata Detayı:${N} ${err_out:-$err_out2}"
      return 1
    fi
  fi
}

test_servers_menu() {
  info "== Bağlantı testi =="
  list_servers || return
  echo
  read -r -p "Test edilecek numara (boş = hepsi): " n
  ensure_deps || return
  if [[ -z "$n" ]]; then
    local s; for s in "${SERVERS[@]}"; do test_server "$s"; done
  elif [[ "$n" =~ ^[0-9]+$ ]] && (( n>=1 && n<=${#SERVERS[@]} )); then
    test_server "${SERVERS[$((n-1))]}"
  else
    err "Geçersiz numara."
  fi
}

# ---------- Yükleme ----------
# Hedef seçimi: TARGET_MODE = "random" | "fixed" ; TARGET_LINE = sabit sunucu satırı
TARGET_MODE=""; TARGET_LINE=""
choose_target() {
  load_servers
  if (( ${#SERVERS[@]} == 0 )); then err "Önce en az bir S3 sunucusu ekleyin."; return 1; fi
  echo
  echo "Hedef seçimi:"
  echo "  1) Belirli bir S3 sunucusu"
  echo "  2) Rastgele (her dosya sistemdeki S3'lerden rastgele birine yüklenir)"
  read -r -p "Seçim [1-2]: " m
  case "$m" in
    1)
      list_servers >/dev/null
      list_servers
      read -r -p "Sunucu numarası: " n
      if [[ "$n" =~ ^[0-9]+$ ]] && (( n>=1 && n<=${#SERVERS[@]} )); then
        TARGET_MODE="fixed"; TARGET_LINE="${SERVERS[$((n-1))]}"
      else err "Geçersiz numara."; return 1; fi ;;
    2)
      TARGET_MODE="random"
      info "Rastgele mod: ${#SERVERS[@]} sunucu arasından seçilecek." ;;
    *) err "Geçersiz seçim."; return 1 ;;
  esac
  return 0
}

pick_server_line() {
  if [[ "$TARGET_MODE" == "fixed" ]]; then printf '%s' "$TARGET_LINE"
  else printf '%s' "${SERVERS[$((RANDOM % ${#SERVERS[@]}))]}"; fi
}

# Linkten veriyi stdout'a akıtır; ilerleme (yüzde, hız, ETA) terminale yazılır.
# pv kuruluysa onu, değilse curl'ün kendi ilerleme çubuğunu kullanır.
stream_download() { # url [boyut]
  if command -v pv >/dev/null 2>&1; then
    local pa=(-pterb -i 1)
    [[ -n "${2:-}" ]] && pa+=(-s "$2")
    curl -fsSL --location-trusted -A "$USER_AGENT" "$1" | pv "${pa[@]}"
  else
    curl -fSL --location-trusted --progress-bar -A "$USER_AGENT" "$1"
  fi
}

# Başarıda son yükleme bilgisini LAST_INFO'ya yazar
LAST_INFO=""
upload_one() { # url
  local URL="$1"
  local line; line="$(pick_server_line)"
  local sname endpoint region bucket prefix ak sk
  IFS='|' read -r sname endpoint region bucket prefix ak sk <<< "$line"

  echo "  [1/3] Link taranıyor..."
  local CURL_AUTH=()
  if [[ "$URL" =~ ^[a-zA-Z0-9]+://([^/@]+)@ ]]; then
    CURL_AUTH=(-u "${BASH_REMATCH[1]}")
  fi

  local HEADERS
  HEADERS="$(curl "${CURL_AUTH[@]}" -sIL --location-trusted --max-time 30 -A "$USER_AGENT" \
    -w '\n__EFFECTIVE_URL__%{url_effective}\n' "$URL" 2>/dev/null | tr -d '\r' || true)"

  local EFF CD CL CT
  EFF="$(printf '%s\n' "$HEADERS" | sed -n 's/^__EFFECTIVE_URL__//p' | tail -1)"; EFF="${EFF:-$URL}"

  # Eğer orijinal URL kullanıcı bilgisi (user:pass@) içeriyorsa ve EFF'de bu bilgi kaybolduysa geri ekle
  if [[ "$URL" =~ ^([a-zA-Z0-9]+://)([^/@]+@)(.*)$ ]]; then
    local AUTH_PART="${BASH_REMATCH[2]}"
    if [[ ! "$EFF" =~ ^[a-zA-Z0-9]+://[^/@]+@ ]]; then
      EFF="$(echo "$EFF" | sed -E "s|^([a-zA-Z0-9]+://)|\1${AUTH_PART}|")"
    fi
  fi
  CD="$(printf '%s\n' "$HEADERS" | grep -i '^content-disposition:' | tail -1 || true)"
  CL="$(printf '%s\n' "$HEADERS" | grep -i '^content-length:' | tail -1 | awk '{print $2}' || true)"
  [[ -z "$CL" ]] && CL="$(printf '%s\n' "$HEADERS" | grep -E '^[0-9]{3}[[:space:]]+[0-9]+' | tail -1 | awk '{print $2}' || true)"

  # Eğer HEAD ile Content-Length alınamadıysa (örneğin 405 veya sunucu desteklemiyorsa), Range header ile 0-0 dene
  if [[ -z "$CL" || "$CL" == "0" ]]; then
    local RANGE_HEADERS
    RANGE_HEADERS="$(curl "${CURL_AUTH[@]}" -sIL --location-trusted --max-time 15 -r 0-0 -A "$USER_AGENT" "$EFF" 2>/dev/null | tr -d '\r' || true)"
    local R_CL
    R_CL="$(printf '%s\n' "$RANGE_HEADERS" | sed -n 's/.*bytes [0-9]*-*.*[\/]\([0-9]*\).*/\1/Ip' | tail -1 || true)"
    [[ -n "$R_CL" && "$R_CL" != "0" ]] && CL="$R_CL"
  fi
  CT="$(printf '%s\n' "$HEADERS" | grep -i '^content-type:' | tail -1 | cut -d' ' -f2- | sed 's/;.*//' || true)"

  local FN=""
  if [[ -n "$CD" ]]; then
    FN="$(printf '%s' "$CD" | sed -n "s/.*filename\*=[^']*''\([^;]*\).*/\1/Ip")"
    [[ -z "$FN" ]] && FN="$(printf '%s' "$CD" | sed -n 's/.*filename="\?\([^";]*\)"\?.*/\1/Ip')"
  fi
  
  # Eğer header'dan isim gelmediyse URL'den al
  if [[ -z "$FN" ]]; then
    local P="${EFF%%\?*}"; P="${P%%#*}"; FN="$(basename "$P")"
  fi
  
  FN="$(urldecode "$FN")"; FN="${FN##*/}"; FN="$(printf '%s' "$FN" | tr -d '\000-\037')"
  if [[ -z "$FN" || "$FN" == "." || "$FN" == ".." ]]; then FN="download_$(date +%Y%m%d_%H%M%S)"; fi

  local S3_URI="s3://${bucket}/${prefix}${FN}"
  local S3_KEY="${prefix}${FN}"

  echo "        Dosya adı : $FN"
  echo "        Boyut     : ${CL:-bilinmiyor} bayt"
  echo "        Sunucu    : $sname"
  echo "        Hedef     : $S3_URI"

  # --- S3 KONTROLÜ (Aynı isim ve boyutta dosya var mı?) ---
  local remote_size=""
  local remote_ls
  remote_ls="$(run_aws "$line" s3 ls "s3://${bucket}/${S3_KEY}" 2>/dev/null || true)"
  if [[ -n "$remote_ls" ]]; then
    remote_size="$(printf '%s' "$remote_ls" | awk '{print $3}' | grep -E '^[0-9]+$' | head -1 || true)"
  fi

  if [[ -z "$remote_size" ]]; then
    local remote_meta
    remote_meta="$(run_aws "$line" s3api head-object --bucket "$bucket" --key "$S3_KEY" 2>/dev/null || true)"
    if [[ -n "$remote_meta" ]]; then
      if command -v python3 >/dev/null 2>&1; then
        remote_size="$(printf '%s' "$remote_meta" | python3 -c 'import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get("ContentLength", ""))
except Exception:
    print("")' 2>/dev/null || true)"
      fi
      if [[ -z "$remote_size" ]]; then
        remote_size="$(printf '%s' "$remote_meta" | grep -i 'Content-Length' | head -1 | tr -cd '0-9')"
      fi
    fi
  fi

  if [[ -n "$remote_size" ]]; then
    if [[ -n "$CL" && "$remote_size" == "$CL" ]]; then
      ok "  [2/3] S3'te aynı isim ve boyutta mevcut ($remote_size bayt). Atlanıyor."
      LAST_INFO="$FN -> $sname (Atlandı - Zaten Var)"
      return 0
    elif [[ -n "$CL" ]]; then
      warn "  [2/3] S3'te dosya var ama boyut farklı (S3: ${remote_size}b, Link: ${CL}b). Üzerine yazılıyor..."
    else
      warn "  [2/3] S3'te dosya mevcut (${remote_size}b). Link boyutu bilinmiyor, üzerine yazılıyor..."
    fi
  fi
  # --------------------------------------------------------

  local ARGS=(s3 cp - "$S3_URI")
  [[ -n "$CL" ]] && ARGS+=(--expected-size "$CL")
  [[ -n "$CT" ]] && ARGS+=(--content-type "$CT")

  echo "  [2/3] Doğrudan S3'e aktarılıyor (diske yazılmıyor)..."
  if stream_download "$EFF" "$CL" | run_aws "$line" "${ARGS[@]}"; then
    echo "  [3/3] ${G}Tamamlandı${N}: $S3_URI"
    LAST_INFO="$FN -> $sname"
    return 0
  else
    err "  [3/3] HATA: yükleme başarısız."
    LAST_INFO="$FN -> $sname"
    return 1
  fi
}

# ---------- Link listesi (linkler.txt) ----------
link_file_count() {
  local c; c="$(grep -cvE '^[[:space:]]*(#|$)' "$1" 2>/dev/null)"
  echo "${c:-0}"
}

create_link_file() {
  local f="$DEFAULT_LINK_FILE" mode="w"
  info "== $f oluştur / düzenle =="
  echo "Dosya yolu: $(realpath -m "$f")"
  if [[ -s "$f" ]]; then
    warn "'$f' zaten var ($(link_file_count "$f") link içeriyor)."
    echo "  1) Üzerine yaz (eski içerik silinir)"
    echo "  2) Sonuna ekle"
    echo "  3) İptal"
    read -r -p "Seçim [1-3]: " m
    case "$m" in 1) mode="w" ;; 2) mode="a" ;; *) warn "İptal edildi."; return ;; esac
  fi

  echo
  echo "Linkleri nasıl gireceksiniz?"
  echo "  1) Editörde aç (nano) - yapıştır, Ctrl+O + Enter ile kaydet, Ctrl+X ile çık"
  echo "  2) Terminale yapıştır - bitirmek için yeni satırda Ctrl+D"
  read -r -p "Seçim [1-2]: " e

  if [[ "$e" == "1" ]] && ! command -v nano >/dev/null 2>&1; then
    warn "nano kurulu değil (10 numaralı seçenekle kurabilirsiniz). Yapıştırma moduna geçiliyor."
    e="2"
  fi

  if [[ "$e" == "1" ]]; then
    [[ "$mode" == "w" ]] && : > "$f"
    nano "$f"
  else
    [[ "$mode" == "a" && -s "$f" && -n "$(tail -c1 "$f")" ]] && echo >> "$f"
    echo "Linkleri yapıştırın, sonra Ctrl+D'ye basın:"
    if [[ "$mode" == "w" ]]; then cat > "$f"; else cat >> "$f"; fi
    echo
  fi

  [[ -f "$f" ]] && sed -i 's/\r$//' "$f"
  if [[ -f "$f" ]]; then ok "'$f' kaydedildi: $(link_file_count "$f") link."; else warn "Dosya oluşturulmadı."; fi
}

delete_link_file() {
  local f="$DEFAULT_LINK_FILE"
  info "== $f sil =="
  if [[ ! -f "$f" ]]; then warn "'$f' zaten yok."; return; fi
  echo "Dosya: $(realpath "$f") ($(link_file_count "$f") link)"
  read -r -p "Silinsin mi? (e/h): " c
  if [[ "$c" =~ ^[eEyY]$ ]]; then rm -f "$f" && ok "Silindi."; else warn "İptal edildi."; fi
}

upload_single() {
  info "== Tekli link yükleme =="
  ensure_deps || return
  choose_target || return
  echo
  read -r -p "Link: " url; url="$(trim "$url")"
  [[ "$url" =~ ^(https?|ftps?|sftp):// ]] || { err "Geçerli bir link (http, https, ftp, ftps, sftp) girin."; return; }
  echo
  upload_one "$url"
}

upload_bulk() {
  info "== Toplu link yükleme =="
  ensure_deps || return
  choose_target || return
  echo
  read -r -p "Link dosyası [$DEFAULT_LINK_FILE]: " f; f="$(trim "${f:-$DEFAULT_LINK_FILE}")"
  [[ -f "$f" ]] || { err "'$f' bulunamadı."; return; }

  local LINKS=() line
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "$line")"
    [[ -z "$line" || "$line" == \#* ]] && continue
    LINKS+=("$line")
  done < "$f"
  local TOTAL=${#LINKS[@]}
  (( TOTAL == 0 )) && { err "Dosyada link yok."; return; }
  info "$TOTAL link bulundu."

  local OKC=0 FAILC=0 FAILED=() REPORT=() i n
  for i in "${!LINKS[@]}"; do
    n=$((i+1))
    echo; echo "${W}=== [$n/$TOTAL] ${LINKS[$i]}${N}"
    if upload_one "${LINKS[$i]}"; then
      OKC=$((OKC+1)); REPORT+=("OK    $LAST_INFO")
    else
      FAILC=$((FAILC+1)); FAILED+=("${LINKS[$i]}"); REPORT+=("HATA  $LAST_INFO")
    fi
  done

  echo; echo "${W}==== ÖZET: $OKC başarılı, $FAILC başarısız (toplam $TOTAL) ====${N}"
  printf '  %s\n' "${REPORT[@]}"
  if (( FAILC > 0 )); then
    local out="$DATA_DIR/basarisiz_$(date +%Y%m%d_%H%M%S).txt"
    printf '%s\n' "${FAILED[@]}" > "$out"
    warn "Başarısız linkler kaydedildi: $out (tekrar denemek için bu dosyayı kullanabilirsiniz)"
  fi
}

# ---------- Ana menü ----------
show_menu() {
  clear_screen
  load_servers
  local dep; dep="$(check_deps)"
  echo
  echo "${W}${B}╔══════════════════════════════════════════════╗${N}"
  echo "${W}${B}║            S3 YÖNETİM EKRANI                 ║${N}"
  echo "${W}${B}╚══════════════════════════════════════════════╝${N}"
  echo " Kayıtlı S3 sunucusu: ${W}${#SERVERS[@]}${N}"
  if [[ -f "$DEFAULT_LINK_FILE" ]]; then echo " $DEFAULT_LINK_FILE: ${W}$(link_file_count "$DEFAULT_LINK_FILE")${N} link"; else echo " $DEFAULT_LINK_FILE: yok"; fi
  [[ -n "$dep" ]] && echo " ${Y}Eksik paket: $dep  (10 numaralı seçenekle kurun)${N}"
  echo
  echo "  ${W}-- S3 Sunucuları --${N}"
  echo "   1) S3 sunucusu ekle"
  echo "   2) Toplu S3 sunucusu ekle"
  echo "   3) S3 sunucularını listele"
  echo "   4) S3 sunucusu sil"
  echo "   5) Bağlantı testi"
  echo "  ${W}-- Yükleme --${N}"
  echo "   6) Tekli link yükle"
  echo "   7) Toplu link yükle (linkler.txt)"
  echo "  ${W}-- Link Listesi ($DEFAULT_LINK_FILE) --${N}"
  echo "   8) $DEFAULT_LINK_FILE oluştur / düzenle (toplu link yapıştır)"
  echo "   9) $DEFAULT_LINK_FILE sil"
  echo "  ${W}-- Sistem --${N}"
  echo "  10) Gerekli paketleri kur"
  echo "   0) Çıkış"
  echo
}

main() {
  while true; do
    show_menu
    read -r -p "Seçiminiz: " c || { echo; exit 0; }
    echo
    case "$c" in
      1) add_server; pause ;;
      2) bulk_add_servers; pause ;;
      3) list_servers; pause ;;
      4) delete_server; pause ;;
      5) test_servers_menu; pause ;;
      6) upload_single; pause ;;
      7) upload_bulk; pause ;;
      8) create_link_file; pause ;;
      9) delete_link_file; pause ;;
      10) install_packages; pause ;;
      0) echo "Çıkılıyor."; exit 0 ;;
      *) err "Geçersiz seçim."; sleep 1 ;;
    esac
  done
}

main