import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import ngrok from '@ngrok/ngrok';

import * as db from './db';
import { listenToFirebaseUpdates, listenDanaIncoming, syncQRISToFirebase, updateFirebaseQRISStatus } from './services/firebase';
import { notifyQRISInternal, notifyPreorderInternal, setStatusUpdateCallback } from './services/telegram';
import { initWhatsApp, getWhatsAppStatus, logoutWhatsApp, sendInternalMessage, setWhatsAppCallbacks } from './services/whatsapp';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const PORT = 3000;
const DANA_PORT = 7878;

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);
  
  // Send initial WA status
  socket.emit('wa:status-update', getWhatsAppStatus());

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
  const success = db.updateWalletStatusLocal(id, status as any);
  if (success) {
    io.emit('db:wallet-status-updated', { id, status });
  }
});

// --- REST API ENDPOINTS (Corresponding to original IPC Handlers) ---

// Transactions
app.get('/api/transactions', (req, res) => {
  const filters = req.query;
  const data = db.readDb();
  let list = data.transactions;
  if (filters.type) list = list.filter((t) => t.type === filters.type);
  if (filters.startDate) list = list.filter((t) => t.date.split('T')[0] >= (filters.startDate as string));
  if (filters.endDate) list = list.filter((t) => t.date.split('T')[0] <= (filters.endDate as string));
  res.json(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
});

app.post('/api/transactions', (req, res) => {
  const data = db.readDb();
  const newTransaction = { ...req.body, id: Date.now(), date: req.body.date || new Date().toISOString() };
  data.transactions.push(newTransaction);
  db.saveDb(data);
  res.json(newTransaction);
});

app.post('/api/transactions/batch', (req, res) => {
  const data = db.readDb();
  const newTransactions = req.body.map((t: any, idx: number) => ({
    ...t, id: Date.now() + idx, date: t.date || new Date().toISOString()
  }));
  data.transactions.push(...newTransactions);
  db.saveDb(data);
  res.json({ success: true, count: newTransactions.length });
});

app.put('/api/transactions/:id', (req, res) => {
  const data = db.readDb();
  const id = parseInt(req.params.id);
  const index = data.transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    data.transactions[index] = { ...data.transactions[index], ...req.body };
    db.saveDb(data);
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, error: 'Not found' });
});

app.delete('/api/transactions/:id', (req, res) => {
  const data = db.readDb();
  const id = parseInt(req.params.id);
  data.transactions = data.transactions.filter(t => t.id !== id);
  db.saveDb(data);
  res.json({ success: true });
});

// Stock
app.get('/api/stock', (req, res) => res.json(db.readDb().stock));
app.post('/api/stock', (req, res) => {
  const data = db.readDb();
  const { id, ...rest } = req.body;
  if (id) {
    const index = data.stock.findIndex(s => s.id === id);
    if (index !== -1) data.stock[index] = { ...data.stock[index], ...rest };
  } else {
    data.stock.push({ ...rest, id: Date.now() });
  }
  db.saveDb(data);
  res.json({ success: true });
});
app.delete('/api/stock/:id', (req, res) => {
  const data = db.readDb();
  const id = parseInt(req.params.id);
  data.stock = data.stock.filter(s => s.id !== id);
  db.saveDb(data);
  res.json({ success: true });
});

// Summary
app.get('/api/summary', (req, res) => {
  const { startDate, endDate } = req.query;
  const data = db.readDb();
  let list = data.transactions;
  if (startDate) list = list.filter(t => t.date.split('T')[0] >= (startDate as string));
  if (endDate) list = list.filter(t => t.date.split('T')[0] <= (endDate as string));
  const income = list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  res.json({ totalIncome: income, totalExpense: expense, balance: income - expense });
});

// Settings, Debt, Wallet, Capital, Preorders... (Simplified for now)
app.get('/api/settings', (req, res) => res.json({ password: '0000', storeName: 'DM FOTOCOPY', ...db.readDb().settings }));
app.post('/api/settings', (req, res) => {
  const data = db.readDb();
  data.settings = { ...data.settings, ...req.body };
  db.saveDb(data);
  res.json({ success: true });
});

// Wallet
app.get('/api/wallet', (req, res) => res.json(db.readDb().wallet));
app.post('/api/wallet', (req, res) => {
  const entry = db.addWalletEntryInternal(req.body);
  io.emit('db:wallet-status-updated', { type: 'wallet' });
  res.json(entry);
});
app.delete('/api/wallet/:id', (req, res) => {
  const data = db.readDb();
  data.wallet = data.wallet.filter(w => w.id !== parseInt(req.params.id));
  db.saveDb(data);
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

// --- DANA PROCESS LOGIC (Adapted from localServer.ts) ---

async function processDanaText(text: string): Promise<boolean> {
  const cleanText = text.replace(/[\r\n\t]/g, ' ').trim();
  const keywordsMatch = [...cleanText.matchAll(/(?:Rp|IDR|sebesar|sejumlah|nominal)[:\. ]*(\d[\d\.,]*)/gi)];
  const senderMatch = [...cleanText.matchAll(/dari ([a-zA-Z0-9 ]+)/gi)];
  const sender = senderMatch.length > 0 ? senderMatch[0][1].trim() : 'DANA';

  const amounts: number[] = [];
  for (const m of keywordsMatch) {
    const val = parseFloat(m[1].replace(/[\.,]/g, ''));
    if (val >= 1 && val < 500000000) if (!amounts.includes(val)) amounts.push(val);
  }

  if (amounts.length > 0) {
    const dateStr = new Date().toISOString().split('T')[0];
    for (const amount of amounts) {
      const newEntry = db.addWalletEntryInternal({
        type: 'qris',
        amount: amount,
        description: `[AUTO-${sender.toUpperCase()}] ${new Date().toLocaleTimeString('id-ID')}`,
        date: dateStr,
        status: 'pending'
      });
      io.emit('db:wallet-status-updated', { type: 'wallet' });
      await notifyQRISInternal(newEntry);
    }
    return true;
  }
  return false;
}

// Separate listener for MacroDroid (Keep it simple)
const danaServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url || '/', `http://localhost`);
  if (url.pathname === '/auto-dana') {
    let text = url.searchParams.get('text') || '';
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const ok = await processDanaText(data.text || '');
          res.end(JSON.stringify({ success: ok }));
        } catch { res.end(JSON.stringify({ success: false })); }
      });
    } else {
      const ok = await processDanaText(text);
      res.end(JSON.stringify({ success: ok }));
    }
  } else {
    res.end('Server Active');
  }
});

// START EVERYTHING
server.listen(PORT, () => {
  console.log(`[SERVER] Backend running at http://localhost:${PORT}`);
  db.initDb();
  initWhatsApp();
  
  // Firebase listener
  listenToFirebaseUpdates((id, status) => {
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      const success = db.updateWalletStatusLocal(numericId, status as any);
      if (success) io.emit('db:wallet-status-updated', { id: numericId, status });
    }
  });

  listenDanaIncoming(async (text) => {
    console.log('[FIREBASE] Dana incoming:', text);
    await processDanaText(text);
  });
});

danaServer.listen(DANA_PORT, '0.0.0.0', () => {
  console.log(`[DANA SERVER] Listening for MacroDroid at port ${DANA_PORT}`);
  startNgrok(DANA_PORT);
});

async function startNgrok(port: number) {
  try {
    await ngrok.authtoken("3BohzXQtGshNCeN9NIBqTK1oHo7_XFewrFDtxLuLkyyZb7eE");
    const listener = await ngrok.forward({
      addr: port, proto: 'http', domain: 'apogeal-kenny-preactively.ngrok-free.dev'
    });
    console.log(`[TUNNEL] >> URL PUBLIK: ${listener.url()}`);
  } catch (err: any) {
    console.error('[TUNNEL] Ngrok Error:', err.message);
  }
}
