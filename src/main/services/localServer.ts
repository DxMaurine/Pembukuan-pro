import http from 'http';
import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';


let serverInstance: http.Server | null = null;

import ngrok from '@ngrok/ngrok';

async function startNgrok(port: number) {
  try {
    console.log('[TUNNEL] Memulai Ngrok (Domain Permanen)...');
    
    // Set authtoken bapak agar URL tidak ganti-ganti
    await ngrok.authtoken("3BohzXQtGshNCeN9NIBqTK1oHo7_XFewrFDtxLuLkyyZb7eE");
    
    const listener = await ngrok.forward({
      addr: port,
      proto: 'http',
      domain: 'apogeal-kenny-preactively.ngrok-free.dev'
    });

    console.log(`[TUNNEL] >> URL PUBLIK TETAP: ${listener.url()}`);
    console.log(`[TUNNEL] >> MacroDroid URL: ${listener.url()}/auto-dana?text={notification}`);
    console.log(`[TUNNEL] >> PENTING: Tambahkan Header 'ngrok-skip-browser-warning' = '1' di MacroDroid!`);

  } catch (err: any) {
    console.error('[TUNNEL] Ngrok Error:', err.message);
  }
}


export async function processDanaText(text: string, mainWindow: BrowserWindow | null): Promise<boolean> {
  // Bersihkan teks dari karakter aneh
  const cleanText = text.replace(/[\r\n\t]/g, ' ').trim();
  
  // Logging tambahan ke file agar bisa diaudit Bapak
  writeToLog(`--- [DETEKSI DANA] ---`);
  writeToLog(`ISI PESAN: "${cleanText}"`);

  // Hapus pemblokiran {notification} demi kenyamanan uji coba
  if (['{notification}', '[not_text]', '{not_title}'].includes(cleanText)) {
      writeToLog(`[INFO] Menerima format text kosongan / nama variabel dari MacroDroid (biasanya karena klik Test Action).`);
      console.log(`[INFO] Menerima tulisan mentah: "${cleanText}". Lanjut memproses (meski kemungkinan gagal karena tidak ada angka Rp).`);
  }

  // Mencari SEMUA angka setelah kata kunci (Rp, IDR, sebesar, sejumlah, nominal)
  const keywordsMatch = [...cleanText.matchAll(/(?:Rp|IDR|sebesar|sejumlah|nominal)[:\. ]*(\d[\d\.,]*)/gi)];
  
  // Mencari SEMUA pengirim (misal: "dari Gopay")
  const senderMatch = [...cleanText.matchAll(/dari ([a-zA-Z0-9 ]+)/gi)];
  const sender = senderMatch.length > 0 ? senderMatch[0][1].trim() : 'DANA';

  const amounts: number[] = [];
  for (const m of keywordsMatch) {
    const val = parseFloat(m[1].replace(/[\.,]/g, ''));
    if (val >= 1 && val < 500000000) {
      if (!amounts.includes(val)) amounts.push(val); // Hindari duplikat di satu pesan
    }
  }

  // Jika belum ketemu di keyword, cari angka umum
  if (amounts.length === 0) {
    const genericMatches = [...cleanText.matchAll(/(\d[\d\.,]*)/g)];
    for (const m of genericMatches) {
      const val = parseFloat(m[1].replace(/[\.,]/g, ''));
      if (val >= 1) { // Bebaskan limitnya menjadi mulai dari 1 Rupiah
        if (!amounts.includes(val)) amounts.push(val);
      }
    }
  }

  if (amounts.length > 0) {
    let successCount = 0;
    try {
      const { addWalletEntryInternal } = await import('../db');
      const { notifyQRISInternal } = await import('./telegram');
      const win = mainWindow || BrowserWindow.getAllWindows()[0];

      const localDate = new Date();
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      for (const amount of amounts) {
          const newEntry = addWalletEntryInternal({
            type: 'qris',
            amount: amount,
            description: `[AUTO-${sender.toUpperCase()}] ${localDate.toLocaleTimeString('id-ID')}`,
            date: dateStr,
            status: 'pending'
          }, win);

          await notifyQRISInternal(newEntry);
          writeToLog(`[SUCCESS] ✅ Rp ${amount} dari ${sender} dicatat.`);
          console.log(`[DANA PROCESS] BERHASIL: Rp ${amount.toLocaleString('id-ID')} (${sender}) telah dicatat.`);
          successCount++;
      }
      return successCount > 0;
    } catch (err: any) {
      writeToLog(`[ERROR] ❌ DB/Telegram: ${err.message}`);
      console.error('[DANA PROCESS] DB/Telegram Error:', err.message);
      return false;
    }
  }

  writeToLog(`[FAIL] ⚠️ Nominal tidak ditemukan di: "${cleanText}"`);
  console.log('[DANA PROCESS] GAGAL: Tidak menemukan nominal harga dalam pesan tersebut.');
  return false;
}

// Fungsi pembantu untuk mencatat log ke file
function writeToLog(message: string) {
  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'dana_debug.log');
  const timestamp = new Date().toLocaleString('id-ID');
  const logEntry = `[${timestamp}] ${message}\n`;

  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {
    console.error('[LOGGER] Gagal menulis log:', err);
  }
}

export function startLocalServer(mainWindow: BrowserWindow | null): void {
  if (serverInstance) return;

  const server = http.createServer(async (req, res) => {
    const timestamp = new Date().toLocaleString('id-ID');
    const logHeader = `\n[${timestamp}] === REQUEST MASUK ===\n`;
    const logDetails = `METHOD: ${req.method}\nURL: ${req.url}\nHEADERS: ${JSON.stringify(req.headers, null, 2)}\n`;
    
    // CATAT SEMUA KE LOG FILE - APAPUN YANG MASUK
    fs.appendFileSync(path.join(process.cwd(), 'logs', 'dana_debug.log'), logHeader + logDetails);

    console.log(`[LOCAL SERVER] ${req.method} ${req.url}`);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost`);

    if (url.pathname === '/auto-dana') {
      let text = '';

      if (req.method === 'POST') {
        // Ambil data dari Body JSON
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            fs.appendFileSync(path.join(process.cwd(), 'logs', 'dana_debug.log'), `RAW BODY: ${body}\n`);
            const data = JSON.parse(body);
            text = data.text || '';
            
            const ok = await processDanaText(text, mainWindow);
            res.writeHead(ok ? 200 : 422, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: ok, mode: 'POST' }));
          } catch (err: any) {
            writeToLog(`[HTTP POST ERROR] JSON tidak valid: ${body}`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'JSON tidak valid' }));
          }
        });
        return;
      } else {
        // Ambil data dari Query (GET)
        text = decodeURIComponent(url.searchParams.get('text') || '');
        
        try {
          const ok = await processDanaText(text, mainWindow);
          res.writeHead(ok ? 200 : 422, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: ok, mode: 'GET' }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Internal Error' }));
        }
      }
    } else if (url.pathname === '/') {
      // Dashboad Koneksi Real-time untuk Bapak cek di HP
      const logFile = path.join(process.cwd(), 'logs', 'dana_debug.log');
      let lastLogs = 'Belum ada data masuk';
      if (fs.existsSync(logFile)) {
        const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(l => l.trim());
        lastLogs = lines.slice(-10).reverse().join('<br>');
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <body style="font-family: sans-serif; padding: 20px; line-height: 1.6; max-width: 600px; margin: auto; background: #f0fdf4;">
          <div style="background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #bbf7d0;">
            <h1 style="color: #16a34a; margin-top: 0; display: flex; align-items: center; gap: 10px;">
              <span style="background:#22c55e; width:15px; height:15px; border-radius:50%; display:inline-block; animation: pulse 2s infinite;"></span>
              KONEKSI AKTIF ✅
            </h1>
            <p>Selamat Pak! Jika Bapak melihat halaman ini, berarti <b>HP Bapak sudah tersambung</b> ke Komputer.</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <h3 style="margin-top:0; color: #475569;">📡 Antrean Data Terakhir:</h3>
              <div style="font-family: monospace; font-size: 11px; color: #334155; max-height: 200px; overflow-y: auto; background: #fff; padding: 10px; border-radius: 8px; border: 1px inset #eee;">
                ${lastLogs}
              </div>
            </div>

            <div style="background: #fffbeb; padding: 20px; border-radius: 12px; border-left: 5px solid #f59e0b; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #b45309;">⚠️ TIPS TERAKHIR BIAR GOL:</h3>
              <p style="margin-bottom: 10px;">Bapak buka MacroDroid, di tab <b>Parameter Header</b>, tambahkan satu lagi agar Ngrok tidak rewel:</p>
              <ul style="list-style: none; padding-left: 0;">
                <li>🔹 <b>Key:</b> <code style="background:#fef3c7; padding:2px 5px; border-radius:4px;">User-Agent</code></li>
                <li>🔹 <b>Value:</b> <code style="background:#fef3c7; padding:2px 5px; border-radius:4px;">MacroDroid</code></li>
              </ul>
            </div>
            
            <button onclick="window.location.reload()" style="background: #16a34a; color: white; border: none; padding: 12px 25px; border-radius: 10px; font-weight: bold; cursor: pointer; width: 100%;">Refresh Status</button>
            
            <style>
              @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
              }
            </style>
          </div>
        </body>
      `);
    } else if (url.pathname === '/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', app: 'Pembukuan DM FC' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  const PORT = 7878;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[LOCAL SERVER] Berjalan di port ${PORT}!`);
    // Otomatis buat tunnel internet agar bisa diakses dari luar WiFi
    startNgrok(PORT);
  });

  server.on('error', (err) => {
    console.error('[LOCAL SERVER] Error:', err);
  });

  serverInstance = server;
}

export function stopLocalServer(): void {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
  }
}
