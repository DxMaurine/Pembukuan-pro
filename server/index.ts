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
  res.json({ online: true, port: PORT, mode: 'firebase', logsCount: danaLogs.length });
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

app.post('/api/transactions/batch', (req, res) => {
  const data = readDb();
  const newTransactions = req.body.map((t: any, idx: number) => ({
    ...t, id: Date.now() + idx, date: t.date || new Date().toISOString()
  }));
  data.transactions.push(...newTransactions);
  saveDb(data);
  res.json({ success: true, count: newTransactions.length });
});

app.put('/api/transactions/:id', (req, res) => {
  const data = readDb();
  const id = parseInt(req.params.id);
  const index = data.transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    data.transactions[index] = { ...data.transactions[index], ...req.body };
    saveDb(data);
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, error: 'Not found' });
});

app.delete('/api/transactions/:id', (req, res) => {
  const data = readDb();
  const id = parseInt(req.params.id);
  data.transactions = data.transactions.filter(t => t.id !== id);
  saveDb(data);
  res.json({ success: true });
});

// Stock
app.get('/api/stock', (req, res) => res.json(readDb().stock));
app.post('/api/stock', (req, res) => {
  const data = readDb();
  const { id, ...rest } = req.body;
  if (id) {
    const index = data.stock.findIndex(s => s.id === id);
    if (index !== -1) data.stock[index] = { ...data.stock[index], ...rest };
  } else {
    data.stock.push({ ...rest, id: Date.now() });
  }
  saveDb(data);
  res.json({ success: true });
});
app.delete('/api/stock/:id', (req, res) => {
  const data = readDb();
  const id = parseInt(req.params.id);
  data.stock = data.stock.filter(s => s.id !== id);
  saveDb(data);
  res.json({ success: true });
});

// Summary
app.get('/api/summary', (req, res) => {
  const { startDate, endDate } = req.query;
  const data = readDb();
  let list = data.transactions;
  if (startDate) list = list.filter(t => t.date.split('T')[0] >= (startDate as string));
  if (endDate) list = list.filter(t => t.date.split('T')[0] <= (endDate as string));
  const income = list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  res.json({ totalIncome: income, totalExpense: expense, balance: income - expense });
});

// Settings
app.get('/api/settings', (req, res) => res.json({ password: '0000', storeName: 'DM FOTOCOPY', ...readDb().settings }));
app.post('/api/settings', (req, res) => {
  const data = readDb();
  data.settings = { ...data.settings, ...req.body };
  saveDb(data);
  res.json({ success: true });
});

// Wallet (GET + PUT missing)
app.get('/api/wallet', (req, res) => res.json(readDb().wallet));
app.post('/api/wallet', (req, res) => {
  const entry = addWalletEntryInternal(req.body);
  io.emit('db:wallet-status-updated', { type: 'wallet' });
  res.json(entry);
});
app.put('/api/wallet/:id', (req, res) => {
  const data = readDb();
  const id = parseInt(req.params.id);
  const index = data.wallet.findIndex(w => w.id === id);
  if (index !== -1) {
    data.wallet[index] = { ...data.wallet[index], ...req.body };
    saveDb(data);
    return res.json({ success: true });
  }
  res.status(404).json({ success: false });
});
app.delete('/api/wallet/:id', (req, res) => {
  const data = readDb();
  data.wallet = data.wallet.filter(w => w.id !== parseInt(req.params.id));
  saveDb(data);
  res.json({ success: true });
});

// Debts
app.get('/api/debts', (req, res) => res.json(readDb().debts));
app.post('/api/debts', (req, res) => {
  const data = readDb();
  const entry = { ...req.body, id: Date.now() };
  data.debts.push(entry);
  saveDb(data);
  res.json(entry);
});
app.put('/api/debts/:id', (req, res) => {
  const data = readDb();
  const id = parseInt(req.params.id);
  const index = data.debts.findIndex(d => d.id === id);
  if (index !== -1) { data.debts[index] = { ...data.debts[index], ...req.body }; saveDb(data); return res.json({ success: true }); }
  res.status(404).json({ success: false });
});
app.delete('/api/debts/:id', (req, res) => {
  const data = readDb();
  data.debts = data.debts.filter(d => d.id !== parseInt(req.params.id));
  saveDb(data);
  res.json({ success: true });
});

// Capital
app.get('/api/capital', (req, res) => res.json(readDb().capital));
app.post('/api/capital', (req, res) => {
  const data = readDb();
  const entry = { ...req.body, id: Date.now() };
  data.capital.push(entry);
  saveDb(data);
  res.json(entry);
});

// Preorders
app.get('/api/preorders', (req, res) => res.json(readDb().preorders));
app.post('/api/preorders', (req, res) => {
  const data = readDb();
  const entry = { ...req.body, id: Date.now(), createdAt: new Date().toISOString() };
  data.preorders.push(entry);
  saveDb(data);
  res.json(entry);
});
app.put('/api/preorders/:id', (req, res) => {
  const data = readDb();
  const id = parseInt(req.params.id);
  const index = data.preorders.findIndex(p => p.id === id);
  if (index !== -1) { data.preorders[index] = { ...data.preorders[index], ...req.body }; saveDb(data); return res.json({ success: true }); }
  res.status(404).json({ success: false });
});
app.delete('/api/preorders/:id', (req, res) => {
  const data = readDb();
  data.preorders = data.preorders.filter(p => p.id !== parseInt(req.params.id));
  saveDb(data);
  res.json({ success: true });
});

// WhatsApp control
app.get('/api/wa/status', (req, res) => res.json(getWhatsAppStatus()));
app.post('/api/wa/reconnect', (req, res) => { initWhatsApp(); res.json({ success: true }); });
app.post('/api/wa/logout', async (req, res) => { await logoutWhatsApp(); res.json({ success: true }); });
app.post('/api/wa/send', async (req, res) => {
  const { to, message } = req.body;
  const result = await sendInternalMessage(to, message);
  res.json(result);
});

// Telegram/Service
app.post('/api/service/notify-qris', async (req, res) => {
  const result = await notifyQRISInternal(req.body);
  res.json(result);
});
app.post('/api/service/notify-preorder', async (req, res) => {
  const result = await notifyPreorderInternal(req.body);
  res.json(result);
});
app.post('/api/service/send-report', async (req, res) => {
  const result = await sendReportInternal(req.body);
  res.json(result);
});

// --- DANA PROCESSING LOGIC ---

async function processDanaText(text: string, docId?: string): Promise<boolean> {
  const cleanText = text.replace(/[\r\n\t]/g, ' ').trim();
  const keywordsMatch = [...cleanText.matchAll(/(?:Rp|IDR|sebesar|sejumlah|nominal)[:\. ]*(\d[\d\.,]*)/gi)];
  const senderMatch = [...cleanText.matchAll(/dari ([a-zA-Z0-9 ]+)/gi)];
  const sender = senderMatch.length > 0 ? senderMatch[0][1].trim() : 'DANA';

  const amounts: number[] = [];
  for (const m of keywordsMatch) {
    const val = parseFloat(m[1].replace(/[\.,]/g, ''));
    if (val >= 100 && val < 500000000) {
      if (!amounts.includes(val)) amounts.push(val);
    }
  }

  if (amounts.length === 0) {
    const fallbackMatch = [...cleanText.matchAll(/(\d[\d\.,]{3,})/g)];
    for (const f of fallbackMatch) {
      const val = parseFloat(f[1].replace(/[\.,]/g, ''));
      if (val >= 100 && val < 5000000) amounts.push(val);
    }
  }

  // --- DEDUPLICATION CHECK (10 Seconds Window) ---
  const now = new Date();
  const isDuplicate = amounts.length > 0 && danaLogs.some(log => {
    const logTime = new Date(log.timestamp);
    const diffSeconds = (now.getTime() - logTime.getTime()) / 1000;
    // Cek apakah sudah ada nominal yang sama dalam status success ATAU pending
    return (log.status === 'success' || log.status === 'pending') &&
      log.parsed === amounts[0] &&
      diffSeconds < 10;
  });

  const logEntry = addDanaLog({
    timestamp: now.toISOString(),
    source: 'firebase',
    rawContent: cleanText, // Tampilkan teks lengkap agar kita bisa analisa
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
    const dateStr = new Date().toISOString().split('T')[0];
    for (const amount of amounts) {
      const newEntry = addWalletEntryInternal({
        type: 'qris',
        amount: amount,
        description: `[AUTO-${sender.toUpperCase()}] ${new Date().toLocaleTimeString('id-ID')}`,
        date: dateStr,
        status: 'pending'
      });
      io.emit('db:wallet-status-updated', { type: 'wallet' });
      await notifyQRISInternal(newEntry);
    }
    // Update log status to success
    const idx = danaLogs.findIndex(l => l.id === logEntry.id);
    if (idx !== -1) danaLogs[idx].status = 'success';
    io.emit('server:dana-log-update', { id: logEntry.id, status: 'success' });
    return true;
  }

  // Update log status to failed
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

// Handle server errors
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${PORT} sudah dipakai! Pastikan tidak ada terminal dev atau aplikasi lain yang sedang berjalan.`);
  } else {
    console.error('[SERVER-ERROR]', err);
  }
});

  initWhatsApp();

  // Firebase QRIS status listener
  listenToFirebaseUpdates((id, status) => {
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      const success = updateWalletStatusLocal(numericId, status as any);
      if (success) io.emit('db:wallet-status-updated', { id: numericId, status });
    }
  });

  // Firebase DANA incoming listener (replaces ngrok tunnel completely)
  listenDanaIncoming(async (text, docId) => {
    console.log('[FIREBASE] Dana incoming:', text ? text.substring(0, 80) : 'EMPTY');
    await processDanaText(text || '', docId);
  });
