import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';

import { readDb, saveDb, addWalletEntryInternal, updateWalletStatusLocal } from './database';
import { listenToFirebaseUpdates, listenDanaIncoming, syncQRISToFirebase, updateFirebaseQRISStatus } from './services/firebase';
import { notifyQRISInternal, notifyPreorderInternal, sendReportInternal, setStatusUpdateCallback } from './services/telegram';
import { initWhatsApp, getWhatsAppStatus, logoutWhatsApp, sendInternalMessage, setWhatsAppCallbacks } from './services/whatsapp';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const PORT = 3000;

// --- DANA LOG (in-memory, emitted to UI clients) ---
interface DanaLog {
  id: number;
  timestamp: string;
  source: 'firebase';
  rawContent: string;
  parsed: number | null;
  status: 'success' | 'failed' | 'pending' | 'duplicate';
  docId?: string;
}

const danaLogs: DanaLog[] = [];
const MAX_LOGS = 100;

function addDanaLog(log: Omit<DanaLog, 'id'>) {
  const entry: DanaLog = { id: Date.now(), ...log };
  danaLogs.unshift(entry);
  if (danaLogs.length > MAX_LOGS) danaLogs.pop();
  io.emit('server:dana-log', entry);
  return entry;
}

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);

  // Send initial data to newly connected clients
  socket.emit('wa:status-update', getWhatsAppStatus());
  socket.emit('server:dana-logs-history', danaLogs);
  socket.emit('server:status', { online: true, port: PORT, mode: 'firebase' });

  socket.on('disconnect', () => {
    console.log('[SOCKET] Client disconnected');
  });
});

// Setup WhatsApp Callbacks to emit to socket
setWhatsAppCallbacks(
  (data) => io.emit('wa:status-update', data),
  (qr) => io.emit('wa:qr-update', { qr })
);

// Setup Telegram Callback to update DB and UI
setStatusUpdateCallback((id, status) => {
  const success = updateWalletStatusLocal(id, status as any);
  if (success) {
    io.emit('db:wallet-status-updated', { id, status });
  }
});

// --- REST API ENDPOINTS ---

// Server status
app.get('/api/status', (req, res) => {
  res.json({ online: true, port: PORT, mode: 'firebase', logsCount: danaLogs.length, timestamp: new Date().toISOString() });
});

// Dana logs
app.get('/api/server/dana-logs', (req, res) => {
  res.json(danaLogs);
});

// Transactions
app.get('/api/transactions', (req, res) => {
  const filters = req.query;
  const data = readDb();
  let list = data.transactions;
  if (filters.type) list = list.filter((t) => t.type === filters.type);
  if (filters.startDate) list = list.filter((t) => t.date.split('T')[0] >= (filters.startDate as string));
  if (filters.endDate) list = list.filter((t) => t.date.split('T')[0] <= (filters.endDate as string));
  res.json(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
});

app.post('/api/transactions', (req, res) => {
  const data = readDb();
  const newTransaction = { ...req.body, id: Date.now(), date: req.body.date || new Date().toISOString() };
  data.transactions.push(newTransaction);
  saveDb(data);
  res.json(newTransaction);
});

app.put('/api/transactions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  const index = data.transactions.findIndex((t) => t.id === id);
  if (index !== -1) {
    data.transactions[index] = { ...data.transactions[index], ...req.body };
    saveDb(data);
    res.json(data.transactions[index]);
  } else {
    res.status(404).json({ error: 'Transaction not found' });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  data.transactions = data.transactions.filter((t) => t.id !== id);
  saveDb(data);
  res.json({ success: true });
});

app.post('/api/transactions/batch', (req, res) => {
  const data = readDb();
  const newBatch = req.body.map((t: any) => ({ ...t, id: Date.now() + Math.random() }));
  data.transactions.push(...newBatch);
  saveDb(data);
  res.json({ success: true, count: newBatch.length });
});

app.get('/api/summary', (req, res) => {
  const { startDate, endDate } = req.query;
  const data = readDb();
  let filtered = data.transactions;
  if (startDate) filtered = filtered.filter(t => t.date >= (startDate as string));
  if (endDate) filtered = filtered.filter(t => t.date <= (endDate as string));
  
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  
  res.json({
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense
  });
});

// Wallet entries
app.get('/api/wallet', (req, res) => {
  const data = readDb();
  res.json(data.wallet);
});

app.post('/api/wallet', (req, res) => {
  const data = readDb();
  const newEntry = { ...req.body, id: Date.now(), date: req.body.date || new Date().toISOString() };
  data.wallet.push(newEntry);
  saveDb(data);
  res.json(newEntry);
});

app.put('/api/wallet/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  const index = data.wallet.findIndex((t) => t.id === id);
  if (index !== -1) {
    data.wallet[index] = { ...data.wallet[index], ...req.body };
    saveDb(data);
    res.json(data.wallet[index]);
  } else {
    res.status(404).json({ error: 'Wallet entry not found' });
  }
});

app.delete('/api/wallet/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  data.wallet = data.wallet.filter((t) => t.id !== id);
  saveDb(data);
  res.json({ success: true });
});

// Stock
app.get('/api/stock', (req, res) => {
  const data = readDb();
  res.json(data.stock);
});

app.post('/api/stock', (req, res) => {
  const data = readDb();
  const newStock = { ...req.body, id: Date.now() };
  data.stock.push(newStock);
  saveDb(data);
  res.json(newStock);
});

app.delete('/api/stock/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  data.stock = data.stock.filter((s) => s.id !== id);
  saveDb(data);
  res.json({ success: true });
});

// Alias for old endpoints if any
app.get('/api/stocks', (req, res) => {
  const data = readDb();
  res.json(data.stock);
});

// Preorders
app.get('/api/preorders', (req, res) => {
  const data = readDb();
  res.json(data.preorders);
});

app.post('/api/preorders', (req, res) => {
  const data = readDb();
  const newPreorder = { ...req.body, id: Date.now(), createdAt: new Date().toISOString() };
  data.preorders.push(newPreorder);
  saveDb(data);
  
  // Notify Telegram about new preorder
  notifyPreorderInternal(newPreorder);
  
  res.json(newPreorder);
});

app.put('/api/preorders/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  const index = data.preorders.findIndex((p) => p.id === id);
  if (index !== -1) {
    data.preorders[index] = { ...data.preorders[index], ...req.body };
    saveDb(data);
    res.json(data.preorders[index]);
  } else {
    res.status(404).json({ error: 'Preorder not found' });
  }
});

app.delete('/api/preorders/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  data.preorders = data.preorders.filter((p) => p.id !== id);
  saveDb(data);
  res.json({ success: true });
});

// Debts
app.get('/api/debts', (req, res) => {
  const data = readDb();
  res.json(data.debts);
});

app.post('/api/debts', (req, res) => {
  const data = readDb();
  const newDebt = { ...req.body, id: Date.now(), createdAt: new Date().toISOString() };
  data.debts.push(newDebt);
  saveDb(data);
  res.json(newDebt);
});

app.put('/api/debts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  const index = data.debts.findIndex((d) => d.id === id);
  if (index !== -1) {
    data.debts[index] = { ...data.debts[index], ...req.body };
    saveDb(data);
    res.json(data.debts[index]);
  } else {
    res.status(404).json({ error: 'Debt not found' });
  }
});

app.delete('/api/debts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  data.debts = data.debts.filter((d) => d.id !== id);
  saveDb(data);
  res.json({ success: true });
});

// WhatsApp API
app.get('/api/wa/status', (req, res) => {
  res.json(getWhatsAppStatus());
});

app.post('/api/wa/logout', async (req, res) => {
  await logoutWhatsApp();
  res.json({ success: true });
});

// Report Export
app.post('/api/service/send-report', async (req, res) => {
  const { pdfData, filename, caption } = req.body;
  const result = await sendReportInternal({ pdfData, filename, caption });
  res.json(result);
});

// Settings
app.get('/api/settings', (req, res) => {
  const data = readDb();
  res.json(data.settings || { storeName: 'Pembukuan Toko', password: '0000' });
});

app.post('/api/settings', (req, res) => {
  const data = readDb();
  data.settings = { ...(data.settings || {}), ...req.body };
  saveDb(data);
  res.json(data.settings);
});

// Capital
app.get('/api/capital', (req, res) => {
    const data = readDb();
    res.json(data.capital || []);
});

app.post('/api/capital', (req, res) => {
    const data = readDb();
    const newCapital = { ...req.body, id: Date.now() };
    if (!data.capital) data.capital = [];
    data.capital.push(newCapital);
    saveDb(data);
    res.json(newCapital);
});

// WhatsApp Additional
app.post('/api/wa/reconnect', async (req, res) => {
    await initWhatsApp();
    res.json({ success: true });
});

app.post('/api/wa/send', async (req, res) => {
    const { to, message } = req.body;
    await sendInternalMessage(message, to);
    res.json({ success: true });
});

// --- HELPER FUNCTIONS ---

async function processDanaText(text: string, docId?: string) {
  const cleanText = text.replace(/[\r\n\t]/g, ' ').trim();
  console.log(`[FIREBASE-INTAKE] Processing text: "${cleanText}"`);

  // Detect amounts
  const keywordsMatch = [...cleanText.matchAll(/(?:Rp|IDR|sebesar|sejumlah|nominal)[:\. ]*(\d[\d\.,]*)/gi)];
  const amounts: number[] = [];
  for (const m of keywordsMatch) {
    const val = parseFloat(m[1].replace(/[\.,]/g, ''));
    if (val >= 1 && val < 500000000) {
      if (!amounts.includes(val)) amounts.push(val);
    }
  }

  // Regex lebih spesifik agar tidak mengambil kata "berhasil..." sebagai nama pengirim
  const senderMatch = [...cleanText.matchAll(/dari\s+([a-zA-Z0-9\s]+?)(?=\s+(?:berhasil|telah|sebesar|sejumlah|$))/gi)];
  let sender = senderMatch.length > 0 ? senderMatch[0][1].trim() : 'DANA';
  
  // Jika pengirim terlalu panjang atau mengandung kata "Bisnis", bersihkan
  if (sender.toUpperCase().includes('DANA BISNIS')) {
      sender = sender.toUpperCase().replace('BERHASIL DITERIMA DANA BISNIS', '').trim();
  }

  // --- DEDUPLICATION CHECK (10 Seconds Window) ---
  const now = new Date();
  const isDuplicate = amounts.length > 0 && danaLogs.some(log => {
      const logTime = new Date(log.timestamp);
      const diffSeconds = (now.getTime() - logTime.getTime()) / 1000;
      return (log.status === 'success' || log.status === 'pending') && 
             log.parsed === amounts[0] && 
             diffSeconds < 10;
  });

  const logEntry = addDanaLog({
    timestamp: new Date().toISOString(),
    source: 'firebase',
    rawContent: cleanText, 
    parsed: amounts.length > 0 ? amounts[0] : null,
    status: isDuplicate ? 'duplicate' : (amounts.length > 0 ? 'success' : 'failed'),
    docId,
  });

  if (amounts.length === 0) {
    console.log(`[FIREBASE-WARN] Gagal mendeteksi nominal di teks: "${cleanText}"`);
  }

  if (isDuplicate) {
    console.log(`[DEDUPLICATE] Skipping duplicate transaction for Rp ${amounts[0]}`);
    io.emit('server:dana-log-update', { id: logEntry.id, status: 'duplicate' });
    return false;
  }

  if (amounts.length > 0) {
    const dbData = readDb();
    const isAutoConf = dbData.settings?.autoConfirm === true;

    const dateStr = new Date().toISOString().split('T')[0];
    for (const amount of amounts) {
      const newEntry = addWalletEntryInternal({
        type: 'qris',
        amount: amount,
        description: `[AUTO-${sender.toUpperCase()}] ${new Date().toLocaleTimeString('id-ID')}`,
        date: dateStr,
        status: isAutoConf ? 'received' : 'pending'
      });

      io.emit('db:wallet-status-updated', { type: 'wallet' });
      await notifyQRISInternal(newEntry, isAutoConf);

      // Kirim Notifikasi WA ke Kasir jika Auto-Pilot Aktif
      if (isAutoConf && dbData.settings?.cashierNumber) {
        const waMsg = `🔔 *NOTIFIKASI AUTO-PILOT*\n\n✅ Dana Masuk: Rp ${amount.toLocaleString('id-ID')}\n📝 Keterangan: ${newEntry.description}\n\n👤 *Status: TERVERIFIKASI OTOMATIS*\n_Aplikasi DM PRO v3.0.1_`;
        await sendInternalMessage(waMsg, dbData.settings.cashierNumber);
      }
    }
    const idx = danaLogs.findIndex(l => l.id === logEntry.id);
    if (idx !== -1) danaLogs[idx].status = 'success';
    io.emit('server:dana-log-update', { id: logEntry.id, status: 'success' });
    return true;
  }

  const idx = danaLogs.findIndex(l => l.id === logEntry.id);
  if (idx !== -1) danaLogs[idx].status = 'failed';
  io.emit('server:dana-log-update', { id: logEntry.id, status: 'failed' });
  return false;
}

// --- START EVERYTHING ---
server.listen(PORT, () => {
  console.log(`[SERVER] Backend running at http://localhost:${PORT}`);
  console.log(`[SERVER] Mode: Firebase-only (ngrok removed)`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${PORT} sudah dipakai! Pastikan tidak ada terminal dev atau aplikasi lain yang sedang berjalan.`);
    process.exit(1); 
  } else {
    console.error('[SERVER-ERROR]', err);
  }
});

// Initialization of services
initWhatsApp();

// Firebase QRIS status listener
listenToFirebaseUpdates((id, status) => {
  const numericId = parseInt(id);
  if (!isNaN(numericId)) {
    const success = updateWalletStatusLocal(numericId, status as any);
    if (success) io.emit('db:wallet-status-updated', { id: numericId, status });
  }
});

// Firebase DANA incoming listener
listenDanaIncoming(async (text, docId) => {
  console.log('[FIREBASE-WATCH] Data Baru Terdeteksi dari HP!', docId);
  await processDanaText(text || '', docId);
});
console.log('[FIREBASE] Listener Dana/Gopay Aktif (Menunggu Notifikasi)');
