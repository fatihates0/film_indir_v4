#!/bin/bash

# ==============================================================================
# HİBRİT FTP & WEBDAV DAĞITICI PANEL - KURULUM VE YÖNETİM MERKEZİ (v2.1.0)
# Otomatik PM2 Kurulumu, Arka Plan Servis Yönetimi & Ultra Hızlı Dağıtım
# ==============================================================================

set -e

PROJECT_DIR="ftp-webdav-distributor"
PM2_APP_NAME="dagitici-panel"

# ANSI Renk Tanımları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

check_node_and_npm() {
    echo -e "${BLUE}🔍 Node.js ve npm bağımlılıkları denetleniyor...${NC}"
    INSTALL_NODE=false

    if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Node.js veya npm kurulu değil!${NC}"
        INSTALL_NODE=true
    else
        CURRENT_NODE_VER=$(node -v | cut -d'.' -f1 | tr -d 'v')
        if [ "$CURRENT_NODE_VER" -lt 18 ]; then
            echo -e "${YELLOW}⚠️  Mevcut Node.js sürümü (v$CURRENT_NODE_VER) v18'den düşük. Güncellenecek...${NC}"
            INSTALL_NODE=true
        else
            echo -e "${GREEN}✅ Node.js ($(node -v)) ve npm ($(npm -v)) hazır.${NC}"
        fi
    fi

    if [ "$INSTALL_NODE" = true ]; then
        echo -e "${BLUE}📦 Node.js v22 (LTS) kurulumu başlatılıyor...${NC}"
        if ! command -v curl >/dev/null 2>&1; then
            echo -e "${YELLOW}📥 'curl' paketi kuruluyor...${NC}"
            if [ "$EUID" -ne 0 ]; then
                sudo apt-get update -y && sudo apt-get install -y curl
            else
                apt-get update -y && apt-get install -y curl
            fi
        fi

        echo -e "${BLUE}🌐 NodeSource v22 deposu ekleniyor...${NC}"
        if [ "$EUID" -ne 0 ]; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
            sudo apt-get install -y nodejs
        else
            curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
            apt-get install -y nodejs
        fi

        echo -e "${GREEN}✅ Node.js başarıyla kuruldu: $(node -v) (npm: $(npm -v))${NC}"
    fi
}

check_and_install_pm2() {
    if ! command -v pm2 >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  PM2 arka plan servis yöneticisi kurulu değil!${NC}"
        echo -e "${BLUE}📦 PM2 küresel olarak kuruluyor (npm install -g pm2)...${NC}"
        if [ "$EUID" -ne 0 ]; then
            sudo npm install -g pm2
        else
            npm install -g pm2
        fi
        echo -e "${GREEN}✅ PM2 başarıyla kuruldu: $(pm2 -v)${NC}"
    else
        echo -e "${GREEN}✅ PM2 servis yöneticisi kurulu ($(pm2 -v)).${NC}"
    fi
}

install_server() {
    echo -e "${CYAN}${BOLD}=============================================================="
    echo -e "🚀 FTP & WebDAV Dağıtıcı Panel (v2.1.0) Kurulumu Başlatılıyor"
    echo -e "==============================================================${NC}"

    check_node_and_npm
    check_and_install_pm2

    if [ -d "$PROJECT_DIR" ]; then
        echo -e "${YELLOW}ℹ️  '$PROJECT_DIR' klasörü mevcut. Dosyalar güncellenecek...${NC}"
    else
        mkdir -p "$PROJECT_DIR"
        echo -e "${GREEN}📁 Klasör oluşturuldu: $PROJECT_DIR${NC}"
    fi

    cd "$PROJECT_DIR"
    mkdir -p public tmp_downloads

    echo -e "${BLUE}📄 package.json oluşturuluyor...${NC}"
    cat << 'EOF' > package.json
{
  "name": "ftp-webdav-distributor-panel",
  "version": "2.1.0",
  "description": "FTP & WebDAV Ultra Hızlı Dosya Dağıtıcısı Yönetim Paneli",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "axios": "^1.6.8",
    "basic-ftp": "^5.0.5",
    "express": "^4.19.2",
    "socket.io": "^4.7.5",
    "webdav": "^5.6.0"
  }
}
EOF

    if [ -f storage.json ]; then
        echo -e "${YELLOW}ℹ️  storage.json korundu.${NC}"
    else
        echo -e "${BLUE}📄 storage.json oluşturuluyor...${NC}"
        cat << 'EOF' > storage.json
{
  "links": [],
  "concurrencyLimit": 3,
  "targetDir": "/Filmler5",
  "endpoints": []
}
EOF
    fi

    if [ -f status.json ]; then
        echo -e "${YELLOW}ℹ️  status.json korundu.${NC}"
    else
        echo -e "${BLUE}📄 status.json oluşturuluyor...${NC}"
        cat << 'EOF' > status.json
{
  "completed": [],
  "failed": []
}
EOF
    fi

    echo -e "${BLUE}⚡ server.js (Ultra Performans Motoru) oluşturuluyor...${NC}"
    cat << 'EOF' > server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ftp = require('basic-ftp');
const { createClient } = require('webdav');
const { Transform } = require('stream');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 10000,
  pingTimeout: 5000
});

const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'storage.json');
const STATUS_FILE = path.join(__dirname, 'status.json');
const DOWNLOAD_DIR = path.join(__dirname, 'tmp_downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// In-Memory Cached State with Non-Blocking Debounced Writes
let storageData = null;
let statusData = null;
let saveStorageTimer = null;
let saveStatusTimer = null;

function normalizePath(p) {
  if (!p || typeof p !== 'string') return '/';
  let clean = p.trim().replace(/\\/g, '/');
  if (!clean.startsWith('/')) clean = '/' + clean;
  if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
  return clean || '/';
}

function loadStorage() {
  if (!storageData) {
    if (fs.existsSync(STORAGE_FILE)) {
      try {
        storageData = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
      } catch (e) {
        storageData = {};
      }
    } else {
      storageData = {};
    }
    if (!storageData.concurrencyLimit) storageData.concurrencyLimit = 3;
    if (!storageData.targetDir) storageData.targetDir = '/Filmler5';
    storageData.targetDir = normalizePath(storageData.targetDir);
    if (!storageData.endpoints && storageData.ftps) {
      storageData.endpoints = storageData.ftps.map(f => ({ type: 'ftp', ...f }));
      delete storageData.ftps;
    }
    if (!storageData.endpoints) storageData.endpoints = [];
    if (!storageData.links) storageData.links = [];
  }
  return storageData;
}

function saveStorage(data, immediate = false) {
  storageData = data;
  broadcastState();
  if (immediate) {
    try { fs.writeFileSync(STORAGE_FILE, JSON.stringify(storageData, null, 2)); } catch(e){}
  } else {
    if (saveStorageTimer) clearTimeout(saveStorageTimer);
    saveStorageTimer = setTimeout(() => {
      fs.writeFile(STORAGE_FILE, JSON.stringify(storageData, null, 2), () => {});
    }, 1000);
  }
}

function loadStatus() {
  if (!statusData) {
    if (fs.existsSync(STATUS_FILE)) {
      try {
        statusData = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      } catch (e) {
        statusData = { completed: [], failed: [] };
      }
    } else {
      statusData = { completed: [], failed: [] };
    }
    if (!statusData.completed) statusData.completed = [];
    if (!statusData.failed) statusData.failed = [];
  }
  return statusData;
}

function saveStatus(data, immediate = false) {
  statusData = data;
  broadcastState();
  if (immediate) {
    try { fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2)); } catch(e){}
  } else {
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
    saveStatusTimer = setTimeout(() => {
      fs.writeFile(STATUS_FILE, JSON.stringify(statusData, null, 2), () => {});
    }, 1000);
  }
}

// Runtime State Variables
let activeWorkers = 0;
let isProcessing = false;
let isPaused = false;
const activeTasks = new Map();
const activeControllers = new Map();

let runtimeQueue = [];
let batchTotal = 0;
let batchProcessed = 0;

function getBatchProgress() {
  const currentStorage = loadStorage();
  const currentQueue = isProcessing ? runtimeQueue : currentStorage.links;
  
  let totalSpeed = 0;
  for (const task of activeTasks.values()) {
    if (task.speed) totalSpeed += task.speed;
  }

  return {
    isProcessing,
    isPaused,
    total: batchTotal,
    processed: batchProcessed,
    remaining: currentQueue.length,
    activeWorkers,
    totalSpeed,
    queueList: currentQueue
  };
}

function broadcastState() {
  io.emit('state-updated', {
    storage: loadStorage(),
    status: loadStatus(),
    batchProgress: getBatchProgress()
  });
}

let lastEmit = 0;
function emitTasks(force = false) {
  const now = Date.now();
  if (!force && now - lastEmit < 250) return;
  lastEmit = now;
  io.emit('task-update', Array.from(activeTasks.entries()));
}

function makeMeter() {
  let lastTime = Date.now();
  let lastBytes = 0;
  let speed = 0;
  return (bytes) => {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    if (dt >= 0.4) {
      const inst = (bytes - lastBytes) / dt;
      speed = speed ? speed * 0.6 + inst * 0.4 : inst;
      lastTime = now;
      lastBytes = bytes;
    }
    return speed;
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/data', (req, res) => {
  res.json({
    storage: loadStorage(),
    status: loadStatus(),
    batchProgress: getBatchProgress()
  });
});

app.post('/api/config/concurrency', (req, res) => {
  const { limit } = req.body;
  const storage = loadStorage();
  storage.concurrencyLimit = Math.max(1, Math.min(20, parseInt(limit) || 1));
  saveStorage(storage, true);
  if (isProcessing) {
    ensureWorkersRunning();
  }
  res.json({ success: true, limit: storage.concurrencyLimit });
});

app.post('/api/config/target-dir', (req, res) => {
  const { targetDir } = req.body;
  const storage = loadStorage();
  storage.targetDir = normalizePath(targetDir);
  saveStorage(storage, true);
  io.emit('log', { type: 'info', text: `Hedef yükleme klasörü güncellendi: ${storage.targetDir}` });
  res.json({ success: true, targetDir: storage.targetDir });
});

app.post('/api/endpoints', (req, res) => {
  const storage = loadStorage();
  const newEndpoint = {
    id: Date.now(),
    type: req.body.type || 'ftp',
    host: (req.body.host || '').trim(),
    user: (req.body.user || '').trim(),
    pass: req.body.pass || '',
    port: parseInt(req.body.port) || (req.body.type === 'webdav' ? 443 : 21)
  };
  storage.endpoints.push(newEndpoint);
  saveStorage(storage, true);
  res.json({ success: true, endpoints: storage.endpoints });
});

app.delete('/api/endpoints/:id', (req, res) => {
  const storage = loadStorage();
  storage.endpoints = storage.endpoints.filter(e => e.id != req.params.id);
  saveStorage(storage, true);
  res.json({ success: true, endpoints: storage.endpoints });
});

app.post('/api/tasks/cancel/:id', (req, res) => {
  const taskId = req.params.id;
  const ctrl = activeControllers.get(taskId);
  if (ctrl) {
    ctrl.cancelled = true;
    if (ctrl.abortController) {
      try { ctrl.abortController.abort(); } catch(e){}
    }
    if (ctrl.cleanup) {
      try { ctrl.cleanup(); } catch (e) {}
    }
    if (ctrl.localFilePath && fs.existsSync(ctrl.localFilePath)) {
      try { fs.unlinkSync(ctrl.localFilePath); } catch(e){}
    }
    activeTasks.delete(taskId);
    activeControllers.delete(taskId);
    emitTasks(true);
    io.emit('log', { type: 'warn', text: `🛑 İşlem manuel olarak iptal edildi: [${taskId}]` });
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: 'Aktif görev bulunamadı.' });
});

app.post('/api/links', (req, res) => {
  const storage = loadStorage();
  const rawLinks = req.body.links || [];
  const cleanLinks = rawLinks
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && (l.startsWith('http://') || l.startsWith('https://') || l.startsWith('ftp://')));

  const status = loadStatus();
  const validCandidates = cleanLinks.filter(l => !status.completed.includes(l));

  if (validCandidates.length === 0) {
    return res.json({ success: false, message: 'Eklenen geçerli yeni link bulunamadı.' });
  }

  if (isProcessing) {
    const addedLinks = [];
    validCandidates.forEach(link => {
      if (!runtimeQueue.includes(link)) {
        runtimeQueue.push(link);
        addedLinks.push(link);
      }
    });

    batchTotal += addedLinks.length;
    storage.links = [...runtimeQueue];
    saveStorage(storage);
    ensureWorkersRunning();
    io.emit('log', { type: 'info', text: `⚡ Kuyruk çalışırken ${addedLinks.length} yeni link sıraya eklendi.` });
  } else {
    storage.links = [...new Set([...storage.links, ...validCandidates])];
    saveStorage(storage, true);
  }

  broadcastState();
  res.json({ success: true, links: isProcessing ? runtimeQueue : storage.links });
});

app.delete('/api/links/item', (req, res) => {
  const { link } = req.body;
  const storage = loadStorage();
  if (isProcessing) {
    runtimeQueue = runtimeQueue.filter(l => l !== link);
    storage.links = [...runtimeQueue];
    saveStorage(storage);
  } else {
    storage.links = storage.links.filter(l => l !== link);
    saveStorage(storage, true);
  }
  broadcastState();
  res.json({ success: true });
});

app.post('/api/links/clear', (req, res) => {
  const storage = loadStorage();
  if (isProcessing) {
    runtimeQueue = [];
    batchTotal = batchProcessed + activeWorkers;
    storage.links = [];
    saveStorage(storage, true);
    io.emit('log', { type: 'warn', text: 'Bekleyen kuyruk temizlendi. Devam eden indirmeler tamamlanınca duracak.' });
  } else {
    storage.links = [];
    saveStorage(storage, true);
  }
  broadcastState();
  res.json({ success: true, links: [] });
});

app.post('/api/history/clear', (req, res) => {
  saveStatus({ completed: [], failed: [] }, true);
  res.json({ success: true });
});

app.post('/api/process/pause', (req, res) => {
  isPaused = !isPaused;
  io.emit('log', { type: 'warn', text: isPaused ? '⏸ Kuyruk duraklatıldı.' : '▶️ Kuyruk devam ettiriliyor.' });
  broadcastState();
  res.json({ success: true, isPaused });
});

app.get('/api/endpoints/check/:id', async (req, res) => {
  const storage = loadStorage();
  const ep = storage.endpoints.find(e => e.id == req.params.id);
  if (!ep) return res.status(404).json({ error: 'Sunucu bulunamadı' });

  const activeTargetDir = storage.targetDir || '/';
  const startTime = Date.now();

  if (ep.type === 'webdav') {
    let url = ep.host.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const client = createClient(url, {
      username: ep.user,
      password: ep.pass
    });

    try {
      if (!(await client.exists(activeTargetDir))) {
        await client.createDirectory(activeTargetDir, { recursive: true });
      }

      const latency = Date.now() - startTime;
      const quota = await client.getQuota();
      let details = `Hedef Klasör (${activeTargetDir}) Hazır (${latency}ms)`;
      if (quota && typeof quota.quota === 'number') {
        const freeGB = ((quota.quota - (quota.used || 0)) / 1073741824).toFixed(2);
        const totalGB = (quota.quota / 1073741824).toFixed(2);
        details = `Boş Alan: ${freeGB} GB / ${totalGB} GB [Dizin: ${activeTargetDir}] (${latency}ms)`;
      }
      res.json({ success: true, status: "Erişilebilir", details, latency });
    } catch (err) {
      res.json({ success: false, status: "Hata", details: err.message });
    }
  } else {
    const client = new ftp.Client(10000);
    try {
      await client.access({
        host: ep.host,
        port: parseInt(ep.port) || 21,
        user: ep.user,
        password: ep.pass,
        secure: false
      });

      await client.ensureDir(activeTargetDir);
      const latency = Date.now() - startTime;
      let diskInfo = null;
      try {
        const quota = await client.send("SITE QUOTA");
        const msg = quota.message.trim();
        diskInfo = msg.includes("202") ? `Kota Sınırsız [${activeTargetDir}] (${latency}ms)` : `${msg} [${activeTargetDir}] (${latency}ms)`;
      } catch {
        const list = await client.list();
        diskInfo = `Bağlantı Başarılı (${list.length} öğe, ${activeTargetDir}) (${latency}ms)`;
      }

      client.close();
      res.json({ success: true, status: "Erişilebilir", details: diskInfo, latency });
    } catch (err) {
      client.close();
      res.json({ success: false, status: "Hata", details: err.message });
    }
  }
});

// ULTRA-FAST DUPLICATE CHECK: Checks target Directory directly instead of scanning entire remote root
async function checkIfFileExistsInTarget(endpoints, targetDir, filename, targetSize) {
  for (const ep of endpoints) {
    if (ep.type === 'webdav') {
      try {
        let url = ep.host.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }
        const client = createClient(url, { username: ep.user, password: ep.pass });
        const targetPath = path.posix.join(targetDir, filename);
        if (await client.exists(targetPath)) {
          const stat = await client.stat(targetPath);
          const sizeMatch = typeof stat.size === 'number' ? stat.size === targetSize : true;
          if (sizeMatch) {
            return { found: true, endpoint: ep, matchedPath: targetPath, size: stat.size || targetSize };
          }
        }
      } catch (err) {}
    } else {
      const client = new ftp.Client(10000);
      try {
        await client.access({
          host: ep.host,
          port: parseInt(ep.port) || 21,
          user: ep.user,
          password: ep.pass,
          secure: false
        });
        await client.ensureDir(targetDir);
        const items = await client.list();
        const match = items.find(item => item.name === filename && (!targetSize || item.size === targetSize));
        client.close();
        if (match) {
          return { found: true, endpoint: ep, matchedPath: path.posix.join(targetDir, filename), size: match.size };
        }
      } catch (err) {
        client.close();
      }
    }
  }
  return { found: false };
}

async function getRemoteFilename(url) {
  try {
    const response = await axios.head(url, { timeout: 5000, maxRedirects: 5 });
    const disposition = response.headers['content-disposition'];
    if (disposition) {
      const match = disposition.match(/filename\*?=['"]?(?:UTF-8'')?([^";\r\n]+)['"]?/i);
      if (match && match[1]) {
        let fn = decodeURIComponent(match[1]).replace(/%20/g, '_');
        return fn.replace(/[/\\:*?"<>|]/g, '_');
      }
    }
  } catch (e) {}

  try {
    const parsed = new URL(url);
    let baseName = path.basename(decodeURIComponent(parsed.pathname));
    if (!baseName || baseName === '/' || baseName.length < 3) {
      baseName = `download_${Date.now()}_${Math.floor(Math.random()*1000)}.bin`;
    }
    return baseName.replace(/%20/g, '_').replace(/[/\\:*?"<>|]/g, '_');
  } catch (e) {
    return `download_${Date.now()}_${Math.floor(Math.random()*1000)}.bin`;
  }
}

async function uploadToEndpoint(ep, localFilePath, filename, taskId, link, targetDir) {
  const ctrl = activeControllers.get(taskId);
  if (ctrl && ctrl.cancelled) throw new Error('İşlem iptal edildi.');

  const fileSize = fs.statSync(localFilePath).size;
  const uploadMeter = makeMeter();
  const finalDir = targetDir || '/';

  if (ep.type === 'webdav') {
    let url = ep.host.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const client = createClient(url, { username: ep.user, password: ep.pass });

    try {
      if (!(await client.exists(finalDir))) {
        await client.createDirectory(finalDir, { recursive: true });
      }
    } catch {}

    const remotePath = path.posix.join(finalDir, filename);
    let sentBytes = 0;
    const progressStream = new Transform({
      transform(chunk, encoding, callback) {
        sentBytes += chunk.length;
        const progress = fileSize ? Math.min(100, Math.round((sentBytes / fileSize) * 100)) : 0;
        const speed = uploadMeter(sentBytes);
        const eta = speed > 0 ? Math.round((fileSize - sentBytes) / speed) : 0;
        
        activeTasks.set(taskId, {
          link, filename, type: 'upload', action: `WebDAV [${ep.host}:${finalDir}]`,
          progress, bytes: sentBytes, total: fileSize, speed, eta
        });
        emitTasks();
        callback(null, chunk);
      }
    });

    const readStream = fs.createReadStream(localFilePath);
    await new Promise((resolve, reject) => {
      const ws = client.createWriteStream(remotePath);
      if (ctrl) {
        ctrl.cleanup = () => {
          try { readStream.destroy(); } catch(e){}
          try { ws.destroy(); } catch(e){}
          reject(new Error('İşlem iptal edildi.'));
        };
      }
      ws.on('finish', resolve);
      ws.on('error', reject);
      readStream.on('error', reject);
      readStream.pipe(progressStream).pipe(ws);
    });
  } else {
    const client = new ftp.Client(60000);
    if (ctrl) {
      ctrl.cleanup = () => {
        try { client.close(); } catch (e) {}
      };
    }
    try {
      await client.access({
        host: ep.host,
        port: parseInt(ep.port) || 21,
        user: ep.user,
        password: ep.pass,
        secure: false
      });

      await client.ensureDir(finalDir);

      client.trackProgress(info => {
        const progress = fileSize ? Math.min(100, Math.round((info.bytes / fileSize) * 100)) : 0;
        const speed = uploadMeter(info.bytes);
        const eta = speed > 0 ? Math.round((fileSize - info.bytes) / speed) : 0;

        activeTasks.set(taskId, {
          link, filename, type: 'upload', action: `FTP [${ep.host}:${finalDir}]`,
          progress, bytes: info.bytes, total: fileSize, speed, eta
        });
        emitTasks();
      });

      const remotePath = path.posix.join(finalDir, filename);
      await client.uploadFrom(localFilePath, remotePath);
      client.trackProgress();
      client.close();
    } catch (e) {
      client.close();
      throw e;
    }
  }
}

async function processSingleLink(link) {
  const statusData = loadStatus();

  if (statusData.completed.includes(link)) {
    io.emit('log', { type: 'info', text: `Atlanıyor (Zaten tamamlandı): ${link}` });
    batchProcessed++;
    broadcastState();
    return;
  }

  const taskId = Math.random().toString(36).substring(2, 9);
  const abortCtrl = new AbortController();

  const filename = await getRemoteFilename(link);
  const localFilePath = path.join(DOWNLOAD_DIR, `${taskId}_${filename}`);

  activeControllers.set(taskId, {
    abortController: abortCtrl,
    cancelled: false,
    cleanup: null,
    localFilePath
  });

  activeTasks.set(taskId, { link, filename, type: 'download', action: 'İndiriliyor', progress: 0, bytes: 0, total: 0, speed: 0, eta: 0 });
  emitTasks(true);

  let downloadSuccess = false;
  try {
    io.emit('log', { type: 'info', text: `İndirme Başladı: ${filename}` });

    const writer = fs.createWriteStream(localFilePath);
    const ctrl = activeControllers.get(taskId);
    if (ctrl) {
      ctrl.cleanup = () => {
        try { writer.destroy(); } catch(e){}
      };
    }

    const response = await axios({
      url: link,
      method: 'GET',
      responseType: 'stream',
      signal: abortCtrl.signal,
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const totalLength = parseInt(response.headers['content-length']) || 0;
    let downloadedBytes = 0;
    const downloadMeter = makeMeter();

    response.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const progress = totalLength ? Math.round((downloadedBytes / totalLength) * 100) : 0;
      const speed = downloadMeter(downloadedBytes);
      const eta = speed > 0 && totalLength ? Math.round((totalLength - downloadedBytes) / speed) : 0;

      activeTasks.set(taskId, {
        link, filename, type: 'download', action: 'İndiriliyor',
        progress, bytes: downloadedBytes, total: totalLength, speed, eta
      });
      emitTasks();
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
      response.data.on('error', reject);
    });

    downloadSuccess = true;
    io.emit('log', { type: 'success', text: `İndirme Tamamlandı: ${filename}` });
  } catch (err) {
    const isCancelled = activeControllers.get(taskId)?.cancelled;
    const reasonMsg = isCancelled ? 'Kullanıcı tarafından iptal edildi' : `İndirme Hatası: ${err.message}`;

    io.emit('log', { type: isCancelled ? 'warn' : 'error', text: `${reasonMsg} [${link}]` });
    const failStatus = loadStatus();
    failStatus.failed.push({ link, reason: reasonMsg, date: new Date().toISOString() });
    saveStatus(failStatus);

    if (fs.existsSync(localFilePath)) {
      try { fs.unlinkSync(localFilePath); } catch(e){}
    }
    activeTasks.delete(taskId);
    activeControllers.delete(taskId);
    emitTasks(true);
    batchProcessed++;
    broadcastState();
    return;
  }

  if (downloadSuccess) {
    const ctrl = activeControllers.get(taskId);
    if (ctrl && ctrl.cancelled) {
      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch(e){}
      }
      const failStatus = loadStatus();
      failStatus.failed.push({ link, reason: 'Kullanıcı tarafından iptal edildi', date: new Date().toISOString() });
      saveStatus(failStatus);
      activeTasks.delete(taskId);
      activeControllers.delete(taskId);
      emitTasks(true);
      batchProcessed++;
      broadcastState();
      return;
    }

    const freshStorage = loadStorage();
    const endpoints = freshStorage.endpoints;
    const targetDir = freshStorage.targetDir || '/';
    const localSize = fs.statSync(localFilePath).size;

    if (endpoints.length === 0) {
      io.emit('log', { type: 'error', text: 'Tanımlı FTP/WebDAV hedefi bulunamadı!' });
      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch(e){}
      }
      activeTasks.delete(taskId);
      activeControllers.delete(taskId);
      emitTasks(true);
      batchProcessed++;
      broadcastState();
      return;
    }

    activeTasks.set(taskId, {
      link, filename, type: 'upload', action: 'Hedef depoda mükerrer dosya kontrol ediliyor...',
      progress: 0, bytes: 0, total: localSize, speed: 0, eta: 0
    });
    emitTasks(true);

    const duplicateCheck = await checkIfFileExistsInTarget(endpoints, targetDir, filename, localSize);
    if (duplicateCheck.found) {
      const msg = `Bu dosya zaten [${duplicateCheck.endpoint.type.toUpperCase()} - ${duplicateCheck.endpoint.host}:${duplicateCheck.matchedPath}] konumunda var. Pas geçildi.`;
      io.emit('log', { type: 'warn', text: `⚠️ ${msg}` });

      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch(e){}
      }

      const freshStatus = loadStatus();
      if (!freshStatus.completed.includes(link)) {
        freshStatus.completed.push(link);
        saveStatus(freshStatus);
      }
      activeTasks.delete(taskId);
      activeControllers.delete(taskId);
      emitTasks(true);
      batchProcessed++;
      broadcastState();
      return;
    }

    const startIndex = Math.floor(Math.random() * endpoints.length);
    let uploaded = false;

    for (let i = 0; i < endpoints.length; i++) {
      if (activeControllers.get(taskId)?.cancelled) break;

      const currIdx = (startIndex + i) % endpoints.length;
      const targetEp = endpoints[currIdx];

      activeTasks.set(taskId, {
        link, filename, type: 'upload', action: `${targetEp.type.toUpperCase()} [${targetEp.host}:${targetDir}]`,
        progress: 0, bytes: 0, total: localSize, speed: 0, eta: 0
      });
      emitTasks(true);

      try {
        await uploadToEndpoint(targetEp, localFilePath, filename, taskId, link, targetDir);
        io.emit('log', { type: 'success', text: `✓ ${filename} -> [${targetEp.type.toUpperCase()}] ${targetEp.host}:${targetDir} konumuna yüklendi.` });
        uploaded = true;
        break;
      } catch (uploadErr) {
        if (activeControllers.get(taskId)?.cancelled) break;
        io.emit('log', { type: 'warn', text: `⚠️ [${targetEp.type.toUpperCase()}] ${targetEp.host} başarısız: ${uploadErr.message}. Sıradaki deneniyor...` });
      }
    }

    if (fs.existsSync(localFilePath)) {
      try { fs.unlinkSync(localFilePath); } catch(e){}
    }

    const isCancelled = activeControllers.get(taskId)?.cancelled;
    const freshStatus = loadStatus();
    if (isCancelled) {
      freshStatus.failed.push({ link, reason: 'Kullanıcı tarafından iptal edildi', date: new Date().toISOString() });
      saveStatus(failStatus);
    } else if (uploaded) {
      freshStatus.completed.push(link);
      saveStatus(freshStatus);
    } else {
      io.emit('log', { type: 'error', text: `✗ Tüm hedefler başarısız oldu: ${filename}` });
      freshStatus.failed.push({ link, reason: 'Tüm hedefler başarısız oldu', date: new Date().toISOString() });
      saveStatus(failStatus);
    }
  }

  activeTasks.delete(taskId);
  activeControllers.delete(taskId);
  emitTasks(true);
  batchProcessed++;
  broadcastState();
}

function ensureWorkersRunning() {
  const storage = loadStorage();
  const concurrency = storage.concurrencyLimit || 3;
  const neededWorkers = concurrency - activeWorkers;

  if (neededWorkers > 0 && runtimeQueue.length > 0 && isProcessing && !isPaused) {
    for (let i = 0; i < neededWorkers; i++) {
      runWorkerLoop();
    }
  }
}

async function runWorkerLoop() {
  activeWorkers++;
  broadcastState();

  try {
    while (runtimeQueue.length > 0 && isProcessing) {
      if (isPaused) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      const link = runtimeQueue.shift();
      if (!link) break;
      
      const st = loadStorage();
      st.links = [...runtimeQueue];
      saveStorage(st);

      try {
        await processSingleLink(link);
      } catch (e) {
        console.error("Task Exception:", e);
      }
    }
  } finally {
    activeWorkers--;
    broadcastState();

    if (activeWorkers === 0 && runtimeQueue.length === 0) {
      isProcessing = false;
      const finalStorage = loadStorage();
      finalStorage.links = [];
      saveStorage(finalStorage, true);
      io.emit('process-finished');
      broadcastState();
    }
  }
}

async function processQueue() {
  if (isProcessing) {
    if (isPaused) {
      isPaused = false;
      io.emit('log', { type: 'info', text: '▶️ Kuyruk işlemi devam ettiriliyor.' });
      ensureWorkersRunning();
      broadcastState();
    }
    return;
  }

  const storage = loadStorage();
  const queue = [...storage.links];
  const pendingQueue = queue.filter(link => !loadStatus().completed.includes(link));

  if (pendingQueue.length === 0) {
    io.emit('log', { type: 'warn', text: 'Kuyrukta işlenecek yeni link bulunamadı.' });
    return;
  }

  runtimeQueue = [...pendingQueue];
  batchTotal = runtimeQueue.length;
  batchProcessed = 0;

  isProcessing = true;
  isPaused = false;
  io.emit('process-started');
  broadcastState();

  ensureWorkersRunning();
}

io.on('connection', (socket) => {
  socket.emit('init-state', {
    storage: loadStorage(),
    status: loadStatus(),
    batchProgress: getBatchProgress(),
    activeTasks: Array.from(activeTasks.entries())
  });

  socket.on('start-processing', () => processQueue());
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` 🚀 Dağıtıcı Panel Aktif: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
EOF

    echo -e "${BLUE}📄 public/index.html (Süper Hızlı Modern Arayüz) oluşturuluyor...${NC}"
    cat << 'EOF' > public/index.html
<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SyncStation Ultra | FTP & WebDAV Dağıtım Paneli</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="/socket.io/socket.io.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Plus Jakarta Sans', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace']
          },
          colors: {
            brand: {
              50: '#eff6ff',
              100: '#dbeafe',
              400: '#60a5fa',
              500: '#3b82f6',
              600: '#2563eb',
              700: '#1d4ed8',
              900: '#1e3a8a'
            }
          }
        }
      }
    }
  </script>
  <style>
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); }
    ::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 0.8); border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 1); }
    .glass-card { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .toast-anim { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideIn { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen selection:bg-brand-500 selection:text-white antialiased">

  <!-- Toast Bildirim Kabı -->
  <div id="toastContainer" class="fixed top-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none"></div>

  <!-- Header -->
  <header class="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40 shadow-xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex flex-wrap items-center justify-between gap-3">
      
      <!-- Logo & Başlık -->
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-brand-500/25 ring-1 ring-white/20">
          <i class="fa-solid fa-bolt text-white text-lg animate-pulse"></i>
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">SyncStation</span>
            <span class="text-[10px] px-2 py-0.5 font-mono font-bold rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">v2.1 PM2</span>
          </div>
          <p class="text-xs text-slate-400">Yüksek Hızlı FTP & WebDAV Dosya Dağıtıcı</p>
        </div>
      </div>

      <!-- Sağ Kontroller -->
      <div class="flex items-center flex-wrap gap-2.5">
        
        <button onclick="toggleEndpointModal(true)" 
                class="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-semibold transition shadow-sm active:scale-95">
          <i class="fa-solid fa-server text-brand-400 text-xs"></i>
          <span>Hedef Depolar</span>
          <span id="navEndpointBadge" class="ml-1 bg-brand-500/20 text-brand-400 border border-brand-500/30 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">0</span>
        </button>

        <div class="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 space-x-2 shadow-inner">
          <i class="fa-regular fa-folder-open text-amber-400 text-xs"></i>
          <span class="text-xs text-slate-400 hidden sm:inline font-medium">Hedef:</span>
          <input id="globalTargetDir" type="text" value="/Filmler5" onchange="updateTargetDir(this.value)" placeholder="/HedefDizin"
                 class="w-28 sm:w-36 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono font-semibold text-amber-300 focus:ring-1 focus:ring-amber-400 focus:outline-none px-2 py-1" />
        </div>

        <div class="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 space-x-2 shadow-inner">
          <i class="fa-solid fa-sliders text-indigo-400 text-xs"></i>
          <span class="text-xs text-slate-400 hidden sm:inline font-medium">Eşzamanlı:</span>
          <input id="concurrencyInput" type="number" min="1" max="20" value="3" onchange="updateConcurrency(this.value)" 
                 class="w-12 bg-slate-950 border border-slate-700/80 rounded-lg text-center text-xs font-mono font-bold text-brand-400 focus:ring-1 focus:ring-brand-400 focus:outline-none py-1" />
        </div>

        <button id="btnPause" onclick="togglePauseQueue()" 
                class="hidden inline-flex items-center space-x-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-xl font-semibold text-xs transition active:scale-95">
          <i id="btnPauseIcon" class="fa-solid fa-pause text-xs"></i>
          <span id="btnPauseText">Duraklat</span>
        </button>

        <button id="btnStart" onclick="startProcess()" 
                class="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/30 border border-emerald-400/20 transition-all duration-150">
          <i class="fa-solid fa-play text-xs"></i>
          <span id="btnStartText">Kuyruğu Başlat</span>
        </button>
      </div>

    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

    <!-- KPI Sayaç Kartları -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-card rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Kuyrukta Bekleyen</span>
          <span id="kpiQueue" class="text-2xl font-extrabold text-amber-400 mt-0.5 block font-mono">0</span>
        </div>
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <i class="fa-solid fa-hourglass-half text-base"></i>
        </div>
      </div>

      <div class="glass-card rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Aktif İşlemler</span>
          <span id="kpiActive" class="text-2xl font-extrabold text-brand-400 mt-0.5 block font-mono">0</span>
        </div>
        <div class="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
          <i class="fa-solid fa-arrows-rotate text-base animate-spin" style="animation-duration: 4s;"></i>
        </div>
      </div>

      <div class="glass-card rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tamamlanan</span>
          <span id="kpiCompleted" class="text-2xl font-extrabold text-emerald-400 mt-0.5 block font-mono">0</span>
        </div>
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <i class="fa-solid fa-check text-base"></i>
        </div>
      </div>

      <div class="glass-card rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Hatalı İşlemler</span>
          <span id="kpiFailed" class="text-2xl font-extrabold text-rose-400 mt-0.5 block font-mono">0</span>
        </div>
        <div class="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <i class="fa-solid fa-triangle-exclamation text-base"></i>
        </div>
      </div>
    </div>

    <!-- GENEL KUYRUK İLERLEME ÇUBUĞU -->
    <section id="batchProgressCard" class="glass-card rounded-2xl p-5 shadow-lg space-y-3">
      <div class="flex flex-wrap items-center justify-between text-xs gap-2">
        <div class="flex items-center space-x-2">
          <i class="fa-solid fa-bars-progress text-indigo-400 text-sm"></i>
          <span class="font-bold text-white text-sm">Genel Kuyruk İlerlemesi</span>
          <span id="batchPercentText" class="font-mono text-indigo-400 font-extrabold text-sm ml-1">0%</span>
        </div>
        <div class="font-mono text-slate-300 flex items-center space-x-4 text-xs bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
          <span>Toplam: <b id="batchTotalNum" class="text-white">0</b></span>
          <span>İşlenen: <b id="batchProcessedNum" class="text-emerald-400">0</b></span>
          <span>Sırada: <b id="batchRemainingNum" class="text-amber-400">0</b></span>
          <span class="border-l border-slate-800 pl-3 text-cyan-400 font-bold"><i class="fa-solid fa-gauge-high mr-1"></i><span id="totalSpeedText">0 MB/s</span></span>
        </div>
      </div>
      <div class="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/80 p-0.5">
        <div id="batchProgressBar" class="bg-gradient-to-r from-brand-600 via-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
      </div>
    </section>

    <!-- İndirme Linkleri Kuyruğu & Yönetimi -->
    <section class="glass-card rounded-2xl p-5 shadow-lg space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div class="flex items-center space-x-2">
          <i class="fa-solid fa-link text-indigo-400 text-sm"></i>
          <h2 class="text-sm font-bold text-white">İndirme Kuyruğu & Link Ekleme</h2>
        </div>
        <button onclick="clearLinks()" class="text-xs text-slate-400 hover:text-rose-400 transition flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
          <i class="fa-solid fa-trash-can text-xs"></i>
          <span>Kuyruğu Boşalt</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <form onsubmit="addLinks(event)" class="md:col-span-6 space-y-2.5">
          <textarea id="linkInput" rows="3" placeholder="Her satıra direkt dosya linki ekleyin (http://, https://, ftp://)... Kuyruk çalışırken de anlık ekleme yapabilirsiniz." 
                    class="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none font-mono transition shadow-inner"></textarea>
          <button type="submit" class="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-white py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 border border-slate-700/60 shadow-sm">
            <i class="fa-solid fa-plus text-xs text-brand-400"></i>
            <span>Listeye Ekle (Canlı)</span>
          </button>
        </form>

        <div class="md:col-span-6 flex flex-col justify-between space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400 font-semibold">Sırada Bekleyenler:</span>
            <span id="queueCounterBadge" class="text-xs font-mono bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded-full border border-slate-800 font-bold">0 link</span>
          </div>
          <div id="linkList" class="flex-1 space-y-1.5 max-h-32 overflow-y-auto text-xs font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 shadow-inner"></div>
        </div>
      </div>
    </section>

    <!-- Canlı Transfer Akışı -->
    <section class="glass-card rounded-2xl p-5 shadow-lg space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div class="flex items-center space-x-2.5">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
          </span>
          <h2 class="text-sm font-bold text-white">Canlı Transfer Akışı</h2>
        </div>
        <span class="text-xs text-brand-400 font-mono font-semibold" id="liveWorkerIndicator">0 İş Parçacığı Aktif</span>
      </div>

      <div id="activeTasksContainer" class="space-y-3 min-h-[100px] max-h-96 overflow-y-auto pr-1">
        <div class="h-24 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800/80 rounded-2xl">
          <i class="fa-solid fa-network-wired text-xl mb-2 opacity-40"></i>
          <span class="text-xs">Şu anda çalışan aktif bir dosya transferi yok.</span>
        </div>
      </div>
    </section>

    <!-- Sistem & Transfer Konsolu -->
    <section class="glass-card rounded-2xl p-5 shadow-lg space-y-3">
      <div class="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div class="flex items-center space-x-2">
          <i class="fa-solid fa-terminal text-emerald-400 text-xs"></i>
          <h2 class="text-sm font-bold text-white">Sistem Konsolu & Kayıtlar</h2>
        </div>
        <button onclick="clearConsole()" class="text-xs text-slate-400 hover:text-white transition flex items-center space-x-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
          <i class="fa-solid fa-eraser text-xs"></i>
          <span>Temizle</span>
        </button>
      </div>

      <div id="consoleLog" class="bg-slate-950 rounded-xl p-4 text-xs font-mono h-60 overflow-y-auto space-y-1.5 text-slate-300 border border-slate-800/80 leading-relaxed shadow-inner">
        <div class="text-slate-500">[Sistem] Arayüz hazır. FTP & WebDAV ultra hızlı işlem motoru dinleniyor...</div>
      </div>
    </section>

    <!-- Tamamlanma & Hata Kayıtları -->
    <section class="glass-card rounded-2xl p-5 shadow-lg space-y-4">
      <div class="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
        <div class="flex items-center space-x-3">
          <i class="fa-solid fa-clock-rotate-left text-slate-400 text-xs"></i>
          <h2 class="text-sm font-bold text-white">Tamamlanma & Hata Kayıtları</h2>
          <div class="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
            <button onclick="setHistoryFilter('all')" id="histTabAll" class="px-2.5 py-0.5 rounded-lg bg-slate-800 text-white">Tümü</button>
            <button onclick="setHistoryFilter('completed')" id="histTabCompleted" class="px-2.5 py-0.5 rounded-lg text-slate-400 hover:text-white">Tamamlanan</button>
            <button onclick="setHistoryFilter('failed')" id="histTabFailed" class="px-2.5 py-0.5 rounded-lg text-slate-400 hover:text-white">Hatalı</button>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button onclick="copyAllFailedLinks()" class="text-xs text-amber-400 hover:text-amber-300 transition flex items-center space-x-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            <i class="fa-regular fa-copy text-xs"></i>
            <span>Tüm Hatalı Linkleri Kopyala</span>
          </button>
          <button onclick="clearHistory()" class="text-xs text-slate-400 hover:text-rose-400 transition flex items-center space-x-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            <i class="fa-solid fa-trash text-xs"></i>
            <span>Sil</span>
          </button>
        </div>
      </div>

      <div id="historyList" class="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs"></div>
    </section>

  </main>

  <!-- HEDEF DEPOLAR MODALI -->
  <div id="endpointModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md hidden">
    <div class="glass-card border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
      
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
        <div class="flex items-center space-x-2.5">
          <i class="fa-solid fa-server text-brand-400 text-base"></i>
          <h3 class="text-sm font-bold text-white">Hedef Depo & Sunucu Yönetimi</h3>
        </div>
        <button onclick="toggleEndpointModal(false)" class="text-slate-400 hover:text-white transition text-sm">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="p-6 space-y-5 overflow-y-auto">
        <form onsubmit="addEndpoint(event)" class="space-y-3 bg-slate-950/90 p-4 rounded-2xl border border-slate-800 shadow-inner">
          <span class="text-xs font-bold text-slate-200 block mb-1">Yeni Sunucu Bağlantısı Ekle</span>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-bold text-slate-400 block mb-1">Protokol</label>
              <div class="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
                <button type="button" onclick="selectProtocol('ftp')" id="protoFtpBtn" class="flex-1 py-1 rounded-lg text-xs font-bold text-white bg-slate-800 shadow-sm transition">FTP</button>
                <button type="button" onclick="selectProtocol('webdav')" id="protoWebdavBtn" class="flex-1 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition">WebDAV</button>
              </div>
              <input type="hidden" id="epType" value="ftp" />
            </div>
            <div>
              <label class="text-[10px] font-bold text-slate-400 block mb-1">Port</label>
              <input id="epPort" type="number" value="21" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none font-mono" />
            </div>
          </div>

          <div>
            <label class="text-[10px] font-bold text-slate-400 block mb-1">Host / Sunucu Adresi</label>
            <input id="epHost" type="text" placeholder="u680492.your-storagebox.de" required 
                   class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none font-mono" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-bold text-slate-400 block mb-1">Kullanıcı Adı</label>
              <input id="epUser" type="text" placeholder="Kullanıcı Adı" required 
                     class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none font-mono" />
            </div>
            <div>
              <label class="text-[10px] font-bold text-slate-400 block mb-1">Şifre</label>
              <input id="epPass" type="password" placeholder="••••••••" required 
                     class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none font-mono" />
            </div>
          </div>

          <button type="submit" class="w-full bg-brand-600 hover:bg-brand-500 active:scale-95 text-white py-2 rounded-xl text-xs font-bold transition shadow-md">
            <i class="fa-solid fa-plus mr-1"></i> Depoyu Ekle
          </button>
        </form>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-300">Kayıtlı Sunucular</span>
            <span id="endpointBadgeCount" class="text-[10px] text-slate-400 font-mono">0 Depo</span>
          </div>
          <div id="endpointList" class="space-y-2.5 max-h-60 overflow-y-auto pr-1"></div>
        </div>
      </div>

      <div class="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
        <button onclick="toggleEndpointModal(false)" class="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition">
          Kapat
        </button>
      </div>

    </div>
  </div>

  <script>
    const socket = io();
    let currentHistoryFilter = 'all';
    let globalState = null;

    function showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      
      let border = 'border-brand-500/40 text-brand-300';
      let icon = 'fa-circle-info text-brand-400';
      if (type === 'success') { border = 'border-emerald-500/40 text-emerald-300'; icon = 'fa-circle-check text-emerald-400'; }
      if (type === 'warn') { border = 'border-amber-500/40 text-amber-300'; icon = 'fa-triangle-exclamation text-amber-400'; }
      if (type === 'error') { border = 'border-rose-500/40 text-rose-300'; icon = 'fa-circle-xmark text-rose-400'; }

      toast.className = `glass-card border ${border} px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-2xl pointer-events-auto toast-anim`;
      toast.innerHTML = `<i class="fa-solid ${icon} text-sm"></i> <span>${message}</span>`;
      
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    function toggleEndpointModal(show) {
      const modal = document.getElementById('endpointModal');
      if (show) modal.classList.remove('hidden');
      else modal.classList.add('hidden');
    }

    function selectProtocol(type) {
      const typeInput = document.getElementById('epType');
      const portInput = document.getElementById('epPort');
      const hostInput = document.getElementById('epHost');
      const ftpBtn = document.getElementById('protoFtpBtn');
      const webdavBtn = document.getElementById('protoWebdavBtn');

      typeInput.value = type;
      if (type === 'webdav') {
        portInput.value = '443';
        hostInput.placeholder = 'https://u680492.your-storagebox.de';
        webdavBtn.className = 'flex-1 py-1 rounded-lg text-xs font-bold text-white bg-slate-800 shadow-sm transition';
        ftpBtn.className = 'flex-1 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition';
      } else {
        portInput.value = '21';
        hostInput.placeholder = 'u680492.your-storagebox.de';
        ftpBtn.className = 'flex-1 py-1 rounded-lg text-xs font-bold text-white bg-slate-800 shadow-sm transition';
        webdavBtn.className = 'flex-1 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition';
      }
    }

    async function cancelTask(taskId) {
      if (!confirm('Bu indirme/yükleme işlemini iptal etmek istediğinize emin misiniz?')) return;
      try {
        await fetch(`/api/tasks/cancel/${taskId}`, { method: 'POST' });
        showToast('İşlem iptal edildi', 'warn');
      } catch (e) {
        console.error('İptal isteği başarısız oldu', e);
      }
    }

    function copyToClipboard(text, btnElement) {
      navigator.clipboard.writeText(text).then(() => {
        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> Kopyalandı';
        btnElement.classList.add('text-emerald-400');
        showToast('Panoya kopyalandı', 'success');
        setTimeout(() => {
          btnElement.innerHTML = originalHtml;
          btnElement.classList.remove('text-emerald-400');
        }, 2000);
      }).catch(err => {
        alert('Panoya kopyalanamadı!');
      });
    }

    function copyAllFailedLinks() {
      if (!globalState || !globalState.status || !globalState.status.failed || globalState.status.failed.length === 0) {
        showToast('Kopyalanacak hatalı link bulunmuyor', 'warn');
        return;
      }
      const links = globalState.status.failed.map(f => f.link).join('\n');
      navigator.clipboard.writeText(links).then(() => {
        showToast(`${globalState.status.failed.length} adet hatalı link panoya kopyalandı!`, 'success');
      });
    }

    async function retryFailedLink(link) {
      await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: [link] })
      });
      showToast('Link tekrar kuyruğa eklendi!', 'info');
    }

    async function removeQueueItem(link) {
      await fetch('/api/links/item', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link })
      });
      showToast('Link kuyruktan çıkarıldı', 'info');
    }

    socket.on('init-state', data => {
      globalState = data;
      updateUI(data);
      if (data.activeTasks) renderTasks(data.activeTasks);
      toggleProcessingState(data.batchProgress ? data.batchProgress.isProcessing : false, data.batchProgress?.isPaused);
    });

    socket.on('state-updated', data => {
      globalState = data;
      updateUI(data);
      if (data.batchProgress) {
        toggleProcessingState(data.batchProgress.isProcessing, data.batchProgress.isPaused);
      }
    });

    socket.on('task-update', tasks => {
      renderTasks(tasks);
    });

    socket.on('log', msg => {
      const logDiv = document.getElementById('consoleLog');
      const time = new Date().toLocaleTimeString();
      let colorClass = 'text-slate-300';
      let icon = 'fa-info-circle text-slate-400';

      if (msg.type === 'success') {
        colorClass = 'text-emerald-400';
        icon = 'fa-check text-emerald-400';
      } else if (msg.type === 'warn') {
        colorClass = 'text-amber-400';
        icon = 'fa-triangle-exclamation text-amber-400';
      } else if (msg.type === 'error') {
        colorClass = 'text-rose-400';
        icon = 'fa-xmark text-rose-400';
      }

      logDiv.innerHTML += `
        <div class="flex items-start space-x-2 py-0.5 border-b border-slate-900/60 last:border-0 ${colorClass}">
          <span class="text-slate-500 select-none">[${time}]</span>
          <i class="fa-solid ${icon} mt-0.5 text-[10px]"></i>
          <span class="flex-1 break-all">${msg.text}</span>
        </div>`;
      logDiv.scrollTop = logDiv.scrollHeight;
    });

    socket.on('process-started', () => toggleProcessingState(true, false));
    socket.on('process-finished', () => toggleProcessingState(false, false));

    function toggleProcessingState(isBusy, isPaused) {
      const btn = document.getElementById('btnStart');
      const text = document.getElementById('btnStartText');
      const pauseBtn = document.getElementById('btnPause');
      const pauseText = document.getElementById('btnPauseText');
      const pauseIcon = document.getElementById('btnPauseIcon');

      if (isBusy) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        text.innerText = isPaused ? 'Duraklatıldı' : 'İşleniyor...';
        pauseBtn.classList.remove('hidden');

        if (isPaused) {
          pauseText.innerText = 'Devam Et';
          pauseIcon.className = 'fa-solid fa-play text-xs';
        } else {
          pauseText.innerText = 'Duraklat';
          pauseIcon.className = 'fa-solid fa-pause text-xs';
        }
      } else {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
        text.innerText = 'Kuyruğu Başlat';
        pauseBtn.classList.add('hidden');
      }
    }

    async function togglePauseQueue() {
      await fetch('/api/process/pause', { method: 'POST' });
    }

    function fmtMB(b) {
      return ((b || 0) / 1048576).toFixed(2) + ' MB';
    }

    function fmtSpeed(s) {
      if (!s) return '0.00 MB/s';
      if (s >= 1048576) return (s / 1048576).toFixed(2) + ' MB/s';
      return (s / 1024).toFixed(1) + ' KB/s';
    }

    function fmtEta(sec) {
      if (!sec || sec <= 0 || !isFinite(sec)) return '--:--';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    }

    function renderTasks(tasks) {
      const container = document.getElementById('activeTasksContainer');
      const indicator = document.getElementById('liveWorkerIndicator');
      const count = tasks ? tasks.length : 0;
      indicator.innerText = `${count} İş Parçacığı Aktif`;
      document.getElementById('kpiActive').innerText = count;

      let totalSpeed = 0;
      if (tasks) {
        tasks.forEach(([id, t]) => { if (t.speed) totalSpeed += t.speed; });
      }
      document.getElementById('totalSpeedText').innerText = fmtSpeed(totalSpeed);

      if (!tasks || tasks.length === 0) {
        container.innerHTML = `
          <div class="h-24 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800/80 rounded-2xl">
            <i class="fa-solid fa-network-wired text-xl mb-2 opacity-40"></i>
            <span class="text-xs">Şu anda çalışan aktif bir dosya transferi yok.</span>
          </div>`;
        return;
      }

      container.innerHTML = tasks.map(([id, task]) => {
        const isUpload = task.type === 'upload';
        const badgeColor = isUpload 
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
          : 'bg-sky-500/10 text-sky-400 border-sky-500/30';
        const progressColor = isUpload ? 'bg-amber-500' : 'bg-sky-400';
        const icon = isUpload ? 'fa-arrow-up' : 'fa-arrow-down';
        const totalSize = task.total ? fmtMB(task.total) : 'Bilinmiyor';

        return `
          <div class="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 space-y-2.5 shadow-md relative group">
            <div class="flex items-center justify-between gap-3">
              <span class="text-xs font-bold text-white truncate max-w-[450px] sm:max-w-[550px]" title="${task.filename}">${task.filename}</span>
              <div class="flex items-center space-x-3">
                <span class="text-xs font-mono font-bold ${isUpload ? 'text-amber-400' : 'text-sky-400'}">${task.progress}%</span>
                <button onclick="cancelTask('${id}')" title="İşlemi İptal Et" 
                        class="text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 hover:border-rose-500/40 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1">
                  <i class="fa-solid fa-xmark text-rose-500"></i>
                  <span>İptal</span>
                </button>
              </div>
            </div>

            <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div class="${progressColor} h-2 rounded-full transition-all duration-300" style="width: ${task.progress}%"></div>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-0.5">
              <span class="inline-flex items-center space-x-2">
                <span class="px-2 py-0.5 rounded-md border text-[9px] uppercase font-bold ${badgeColor}">
                  <i class="fa-solid ${icon} mr-1"></i>${task.type}
                </span>
                <span>${fmtMB(task.bytes)} / ${totalSize}</span>
              </span>
              <div class="flex items-center space-x-3">
                <span class="text-slate-300 font-bold"><i class="fa-solid fa-gauge-high mr-1 text-[10px] text-slate-500"></i>${fmtSpeed(task.speed)}</span>
                <span class="text-slate-400"><i class="fa-regular fa-clock mr-1 text-[10px]"></i>Kalan: ${fmtEta(task.eta)}</span>
              </div>
            </div>

            <div class="text-[10px] text-slate-500 truncate flex items-center space-x-1 pt-0.5">
              <i class="fa-solid fa-circle-nodes text-[9px]"></i>
              <span>${task.action}</span>
            </div>
          </div>`;
      }).join('');
    }

    function setHistoryFilter(filter) {
      currentHistoryFilter = filter;
      document.getElementById('histTabAll').className = filter === 'all' ? 'px-2.5 py-0.5 rounded-lg bg-slate-800 text-white' : 'px-2.5 py-0.5 rounded-lg text-slate-400 hover:text-white';
      document.getElementById('histTabCompleted').className = filter === 'completed' ? 'px-2.5 py-0.5 rounded-lg bg-slate-800 text-white' : 'px-2.5 py-0.5 rounded-lg text-slate-400 hover:text-white';
      document.getElementById('histTabFailed').className = filter === 'failed' ? 'px-2.5 py-0.5 rounded-lg bg-slate-800 text-white' : 'px-2.5 py-0.5 rounded-lg text-slate-400 hover:text-white';
      if (globalState) updateUI(globalState);
    }

    function updateUI(data) {
      if (!data) return;

      const bp = data.batchProgress || { isProcessing: false, total: 0, processed: 0, remaining: 0, queueList: [] };

      document.getElementById('kpiQueue').innerText = bp.remaining;
      document.getElementById('queueCounterBadge').innerText = `${bp.remaining} link kaldı`;

      document.getElementById('kpiCompleted').innerText = data.status?.completed?.length || 0;
      document.getElementById('kpiFailed').innerText = data.status?.failed?.length || 0;

      let pct = 0;
      if (bp.total > 0) {
        pct = Math.min(100, Math.round((bp.processed / bp.total) * 100));
      }
      document.getElementById('batchPercentText').innerText = `${pct}%`;
      document.getElementById('batchProgressBar').style.width = `${pct}%`;
      document.getElementById('batchTotalNum').innerText = bp.total;
      document.getElementById('batchProcessedNum').innerText = bp.processed;
      document.getElementById('batchRemainingNum').innerText = bp.remaining;
      
      const epCount = data.storage?.endpoints?.length || 0;
      document.getElementById('navEndpointBadge').innerText = epCount;
      document.getElementById('endpointBadgeCount').innerText = `${epCount} Depo Tanımlı`;

      if (data.storage?.concurrencyLimit && document.activeElement !== document.getElementById('concurrencyInput')) {
        document.getElementById('concurrencyInput').value = data.storage.concurrencyLimit;
      }

      if (data.storage?.targetDir && document.activeElement !== document.getElementById('globalTargetDir')) {
        document.getElementById('globalTargetDir').value = data.storage.targetDir;
      }

      const currentTargetDir = data.storage?.targetDir || '/';
      const epList = document.getElementById('endpointList');
      epList.innerHTML = (data.storage?.endpoints || []).map(ep => {
        const isWebdav = ep.type === 'webdav';
        const badge = isWebdav
          ? `<span class="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-md text-[9px] font-bold">WEBDAV</span>`
          : `<span class="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded-md text-[9px] font-bold">FTP</span>`;

        return `
          <div class="bg-slate-900 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col justify-between space-y-2.5 shadow-sm">
            <div class="flex items-start justify-between">
              <div class="space-y-1 max-w-[80%]">
                <div class="flex items-center space-x-2">
                  ${badge}
                  <span class="text-xs font-bold text-white truncate max-w-[280px]" title="${ep.host}">${ep.host}</span>
                </div>
                <div class="text-[11px] text-slate-400 font-mono flex items-center space-x-2">
                  <span><i class="fa-regular fa-user mr-1 text-[10px]"></i>${ep.user}</span>
                  <span>•</span>
                  <span><i class="fa-regular fa-folder-closed mr-1 text-[10px] text-amber-400"></i>${currentTargetDir}</span>
                </div>
              </div>
              <button onclick="deleteEndpoint(${ep.id})" class="text-slate-500 hover:text-rose-400 transition p-1">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>

            <div class="flex items-center justify-between text-[10px] pt-2 border-t border-slate-800/80 font-mono">
              <span id="epStatus-${ep.id}" class="text-slate-500">Durum: Henüz sorgulanmadı</span>
              <button onclick="checkEndpoint(${ep.id})" class="text-brand-400 hover:text-brand-300 font-sans font-semibold flex items-center space-x-1">
                <i class="fa-solid fa-bolt text-[9px]"></i>
                <span>Test Et</span>
              </button>
            </div>
          </div>`;
      }).join('') || '<div class="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded-2xl">Kayıtlı depo bulunamadı.</div>';

      const linkList = document.getElementById('linkList');
      const activeQueueLinks = bp.queueList || [];
      linkList.innerHTML = activeQueueLinks.map(l => {
        const safeLink = l.replace(/'/g, "\\'");
        return `
          <div class="flex items-center justify-between text-slate-300 truncate hover:text-white transition py-0.5 px-1 rounded hover:bg-slate-900">
            <div class="flex items-center space-x-2 truncate">
              <i class="fa-solid fa-angle-right text-[10px] text-slate-600"></i>
              <span class="truncate">${l}</span>
            </div>
            <button onclick="removeQueueItem('${safeLink}')" title="Kuyruktan Çıkar" class="text-slate-500 hover:text-rose-400 ml-2 px-1">
              <i class="fa-solid fa-xmark text-[10px]"></i>
            </button>
          </div>`;
      }).join('') || '<div class="text-slate-500 text-center py-2">Sırada bekleyen link bulunmuyor.</div>';

      const historyList = document.getElementById('historyList');
      let items = [];

      if (currentHistoryFilter === 'all' || currentHistoryFilter === 'completed') {
        (data.status?.completed || []).forEach(l => {
          items.push(`
            <div class="bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-xl flex items-center justify-between">
              <span class="text-emerald-400 truncate max-w-[85%] font-mono">${l}</span>
              <span class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-bold">Tamamlandı</span>
            </div>`);
        });
      }

      if (currentHistoryFilter === 'all' || currentHistoryFilter === 'failed') {
        (data.status?.failed || []).forEach(f => {
          const safeLink = f.link.replace(/'/g, "\\'");
          items.push(`
            <div class="bg-rose-950/20 border border-rose-900/30 p-3 rounded-xl space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-rose-300 truncate font-mono text-[11px] flex-1 font-semibold">${f.link}</span>
                <div class="flex items-center space-x-1.5 shrink-0">
                  <button onclick="retryFailedLink('${safeLink}')" 
                          class="text-[10px] bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 px-2 py-0.5 rounded-md border border-brand-500/30 transition flex items-center space-x-1 font-bold">
                    <i class="fa-solid fa-arrow-rotate-right text-[9px]"></i>
                    <span>Tekrar Dene</span>
                  </button>
                  <button onclick="copyToClipboard('${safeLink}', this)" 
                          class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 transition flex items-center space-x-1 font-semibold">
                    <i class="fa-regular fa-copy text-[9px]"></i>
                    <span>Kopyala</span>
                  </button>
                  <span class="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-md font-bold border border-rose-500/20">Başarısız</span>
                </div>
              </div>
              <div class="text-[10px] text-rose-300/70 font-mono">${f.reason}</div>
            </div>`);
        });
      }

      historyList.innerHTML = items.join('') || '<div class="text-slate-500 text-center py-4">Kayıt bulunamadı.</div>';
    }

    async function updateConcurrency(val) {
      await fetch('/api/config/concurrency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: val })
      });
      showToast(`Eşzamanlılık sınırı ${val} olarak güncellendi`, 'info');
    }

    async function updateTargetDir(val) {
      await fetch('/api/config/target-dir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDir: val })
      });
      showToast(`Hedef klasör: ${val}`, 'info');
    }

    async function addEndpoint(e) {
      e.preventDefault();
      const body = {
        type: document.getElementById('epType').value,
        host: document.getElementById('epHost').value,
        user: document.getElementById('epUser').value,
        pass: document.getElementById('epPass').value,
        port: document.getElementById('epPort').value
      };
      await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      document.getElementById('epHost').value = '';
      document.getElementById('epUser').value = '';
      document.getElementById('epPass').value = '';
      showToast('Yeni depo eklendi', 'success');
    }

    async function deleteEndpoint(id) {
      if (!confirm('Bu depoyu silmek istediğinize emin misiniz?')) return;
      await fetch(`/api/endpoints/${id}`, { method: 'DELETE' });
      showToast('Depo silindi', 'info');
    }

    async function checkEndpoint(id) {
      const el = document.getElementById(`epStatus-${id}`);
      el.innerText = "Bağlantı test ediliyor...";
      el.className = "text-amber-400";
      const res = await fetch(`/api/endpoints/check/${id}`).then(r => r.json());
      if (res.success) {
        el.className = "text-emerald-400 font-bold";
        el.innerText = res.details;
        showToast(`Depo erişilebilir! (${res.latency}ms)`, 'success');
      } else {
        el.className = "text-rose-400 font-bold";
        el.innerText = `Hata: ${res.details}`;
        showToast('Depo bağlantı hatası!', 'error');
      }
    }

    async function addLinks(e) {
      e.preventDefault();
      const text = document.getElementById('linkInput').value;
      const links = text.split('\n');
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links })
      }).then(r => r.json());
      
      if (res.success) {
        document.getElementById('linkInput').value = '';
        showToast('Linkler başarıyla kuyruğa eklendi', 'success');
      } else {
        showToast(res.message || 'Link eklenemedi', 'warn');
      }
    }

    async function clearLinks() {
      if (!confirm('Tüm bekleyen indirme kuyruğunu boşaltmak istiyor musunuz?')) return;
      await fetch('/api/links/clear', { method: 'POST' });
      showToast('Kuyruk temizlendi', 'warn');
    }

    async function clearHistory() {
      if (!confirm('Tüm tamamlanmış ve hatalı geçmiş kayıtlarını silmek istiyor musunuz?')) return;
      await fetch('/api/history/clear', { method: 'POST' });
      showToast('Geçmiş kayıtları silindi', 'info');
    }

    function startProcess() {
      socket.emit('start-processing');
    }

    function clearConsole() {
      document.getElementById('consoleLog').innerHTML = '';
      showToast('Konsol temizlendi', 'info');
    }
  </script>
</body>
</html>
EOF

    echo -e "${BLUE}📦 Gerekli paketler yükleniyor...${NC}"
    npm install

    echo -e "${CYAN}${BOLD}=============================================================="
    echo -e "✅ KURULUM VE GÜNCELLEME TAMAMLANDI!"
    echo -e "==============================================================${NC}"
    
    cd ..
    start_server
}

start_server() {
    check_and_install_pm2
    if [ ! -d "$PROJECT_DIR" ]; then
        echo -e "${RED}❌ '$PROJECT_DIR' klasörü bulunamadı! Önce kurulum [1] yapın.${NC}"
        return 1
    fi

    cd "$PROJECT_DIR"
    echo -e "${BLUE}🚀 Dağıtıcı Panel PM2 ile başlatılıyor...${NC}"
    
    if pm2 list | grep -q "$PM2_APP_NAME"; then
        echo -e "${YELLOW}ℹ️  Servis zaten tanımlı. Yeniden başlatılıyor...${NC}"
        pm2 restart "$PM2_APP_NAME"
    else
        pm2 start server.js --name "$PM2_APP_NAME"
    fi

    pm2 save >/dev/null 2>&1 || true
    echo -e "${GREEN}✅ Dağıtıcı Panel PM2 üzerinde başarıyla aktif edildi!${NC}"
    echo -e "${CYAN}📌 Tarayıcıdan erişim adresi: http://localhost:3000${NC}"
    cd ..
}

stop_server() {
    check_and_install_pm2
    echo -e "${YELLOW}⏹️  Dağıtıcı Panel PM2 servisi durduruluyor...${NC}"
    if pm2 list | grep -q "$PM2_APP_NAME"; then
        pm2 stop "$PM2_APP_NAME"
        echo -e "${GREEN}✅ Servis durduruldu.${NC}"
    else
        echo -e "${YELLOW}ℹ️  Çalışan '$PM2_APP_NAME' servisi bulunamadı.${NC}"
    fi
}

restart_server() {
    check_and_install_pm2
    echo -e "${BLUE}🔄 Dağıtıcı Panel yeniden başlatılıyor...${NC}"
    if pm2 list | grep -q "$PM2_APP_NAME"; then
        pm2 restart "$PM2_APP_NAME"
        echo -e "${GREEN}✅ Servis yeniden başlatıldı.${NC}"
    else
        echo -e "${YELLOW}⚠️ Servis henüz çalışmıyor. Başlatılıyor...${NC}"
        start_server
    fi
}

status_server() {
    check_and_install_pm2
    echo -e "${CYAN}${BOLD}📊 PM2 Servis Durumu:${NC}"
    pm2 status "$PM2_APP_NAME" || pm2 list
}

logs_server() {
    check_and_install_pm2
    echo -e "${CYAN}${BOLD}📜 Canlı PM2 Logları (Çıkmak için CTRL+C):${NC}"
    pm2 logs "$PM2_APP_NAME"
}

show_menu() {
    while true; do
        echo -e ""
        echo -e "${CYAN}${BOLD}=============================================================="
        echo -e "🚀 FTP & WebDAV DAĞITICI PANEL - YÖNETİM MERKEZİ (v2.1)"
        echo -e "==============================================================${NC}"
        echo -e "  ${GREEN}${BOLD}[1]${NC} 📦 Paneli Kur / Güncelle (Full Setup)"
        echo -e "  ${GREEN}${BOLD}[2]${NC} ▶️  Paneli Başlat (PM2 ile Arka Planda)"
        echo -e "  ${GREEN}${BOLD}[3]${NC} ⏹️  Paneli Durdur (PM2)"
        echo -e "  ${GREEN}${BOLD}[4]${NC} 🔄 Paneli Yeniden Başlat (PM2 Restart)"
        echo -e "  ${GREEN}${BOLD}[5]${NC} 📊 Panel Durumunu Göster (PM2 Status)"
        echo -e "  ${GREEN}${BOLD}[6]${NC} 📜 Canlı Logları İzle (PM2 Logs)"
        echo -e "  ${RED}${BOLD}[0]${NC} 🚪 Çıkış"
        echo -e "${CYAN}==============================================================${NC}"
        read -p "Lütfen bir işlem seçin [0-6]: " choice
        echo -e ""

        case "$choice" in
            1)
                install_server
                ;;
            2)
                start_server
                ;;
            3)
                stop_server
                ;;
            4)
                restart_server
                ;;
            5)
                status_server
                ;;
            6)
                logs_server
                ;;
            0)
                echo -e "${GREEN}👋 Görüşmek üzere!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}⚠️ Geçersiz bir seçim yaptınız. Lütfen 0-6 arasında bir değer girin.${NC}"
                ;;
        esac
    done
}

case "${1:-}" in
    setup|install|kur)
        install_server
        ;;
    start|baslat)
        start_server
        ;;
    stop|durdur)
        stop_server
        ;;
    restart|yeniden-baslat)
        restart_server
        ;;
    status|durum)
        status_server
        ;;
    logs|log)
        logs_server
        ;;
    "")
        show_menu
        ;;
    *)
        echo -e "${RED}Bilinmeyen parametre: $1${NC}"
        echo "Kullanım: $0 {setup|start|stop|restart|status|logs}"
        echo "Veya doğrudan parametresiz çalıştırarak interaktif menüyü açabilirsiniz: $0"
        exit 1
        ;;
esac