import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
// Trigger re-compile
import fs from 'fs';
import path from 'path';

import { readDb, saveDb, addWalletEntryInternal, updateWalletStatusLocal, clearTransactions } from './database';
import { listenToFirebaseUpdates, listenDanaIncoming, syncQRISToFirebase, updateFirebaseQRISStatus, syncDashboardToFirebase, listenToMobileInput, syncStoreMetadata, listenToSyncRequests, listenToMobileStockActions, updateHeartbeat } from './services/firebase';
import { notifyQRISInternal, notifyPreorderInternal, sendReportInternal, setStatusUpdateCallback } from './services/telegram';
import { initWhatsApp, getWhatsAppStatus, logoutWhatsApp, sendInternalMessage, setWhatsAppCallbacks } from './services/whatsapp';

// --- SYNC MONTH DATA ---
function syncMonthData(month: number, year: number) {
  const data = readDb();
  const monthStr = String(month + 1).padStart(2, '0');
  const yearStr = String(year);
  const prefix = `${yearStr}-${monthStr}`;

  // Filter Transactions & Wallet Entries
  const filteredTransactions = data.transactions.filter(t => String(t.date).includes(prefix));
  const filteredWallet = (data.wallet || []).filter(w => String(w.date).includes(prefix));

  // Calculate Totals using robust numeric conversion
  const transIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const transExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  
  // Wallet entries: QRIS income (received) or Savings
  const walletIncome = filteredWallet.filter(w => w.status === 'received' || w.type === 'saving').reduce((s, w) => s + (Number(w.amount) || 0), 0);

  const transBalance = transIncome - transExpense;
  const walletBalance = walletIncome;

  const totalIncome = transIncome + walletIncome;
  const totalExpense = transExpense;
  
  // Create Unified History (Audit Trail)
  const unifiedHistory = [
    ...filteredTransactions.map(t => ({ ...t, source: 'manual' })),
    ...filteredWallet.map(w => ({ ...w, source: 'wallet' }))
  ].sort((a, b) => b.id - a.id).slice(0, 50);

  const lowStockItems = [...data.stock].sort((a, b) => b.id - a.id);

  sendUnifiedSync({
    totalIncome,
    totalExpense,
    balance: transBalance + walletBalance,
    transBalance,
    walletBalance,
    unifiedHistory,
    isFiltered: true,
    filterLabel: `${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month))}`
  });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// API Endpoints
app.post('/api/reset-data', (req, res) => {
  const { range, modules, startDate, endDate } = req.body;
  const success = clearTransactions(range as any, modules, startDate, endDate);
  
  recalculateAndSync();
  res.json({ success });
});

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

// --- UNIFIED SYNC HELPER ---
function sendUnifiedSync(overrides: any = {}) {
  const data = readDb();
  
  // Base running totals (Always included)
  const totalTransIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalTransExpense = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalWalletBalance = (data.wallet || []).filter(w => w.status === 'received' || w.type === 'saving').reduce((s, w) => s + (Number(w.amount) || 0), 0);
  
  const mutWalletToCash = (data.mutations || []).filter(m => m.type === 'wallet_to_cash').reduce((s, m) => s + Number(m.amount), 0);
  const mutCashToWallet = (data.mutations || []).filter(m => m.type === 'cash_to_wallet').reduce((s, m) => s + Number(m.amount), 0);
  const mutCashToOwner = (data.mutations || []).filter(m => m.type === 'cash_to_owner').reduce((s, m) => s + Number(m.amount), 0);
  const mutWalletToOwner = (data.mutations || []).filter(m => m.type === 'wallet_to_owner').reduce((s, m) => s + Number(m.amount), 0);

  const transBalanceRunning = totalTransIncome - totalTransExpense + mutWalletToCash - mutCashToOwner - mutCashToWallet;
  const walletBalanceRunning = totalWalletBalance - mutWalletToCash - mutWalletToOwner + mutCashToWallet;

  const lowStockItems = [...data.stock].sort((a, b) => b.id - a.id);

  const summary = {
    // Default values if not overridden
    totalIncome: 0,
    totalExpense: 0,
    balance: transBalanceRunning + walletBalanceRunning,
    transBalance: transBalanceRunning,
    walletBalance: walletBalanceRunning,
    stockLowCount: lowStockItems.length,
    lowStockItems,
    preorders: data.preorders || [],
    financeSources: data.financeSources || [],
    settings: data.settings || {},
    lastSync: new Date().toISOString(),
    // Merge with specific data (like monthly filter)
    ...overrides
  };

  syncDashboardToFirebase(summary);
  syncStoreMetadata(data.settings || {});
  return summary;
}

function recalculateAndSync() {
  const data = readDb();
  const today = new Date().toLocaleDateString('en-CA'); 
  const filteredTransactions = data.transactions.filter(t => String(t.date).startsWith(today));
  const filteredWallet = (data.wallet || []).filter(w => String(w.date).startsWith(today));
  const filteredMutations = (data.mutations || []).filter(m => String(m.date).startsWith(today));
  
  const transIncomeToday = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const transExpenseToday = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const walletIncomeToday = filteredWallet.filter(w => w.status === 'received' || w.type === 'saving').reduce((s, w) => s + (Number(w.amount) || 0), 0);

  const mutWalletToCashToday = filteredMutations.filter(m => m.type === 'wallet_to_cash').reduce((s, m) => s + Number(m.amount), 0);
  const mutCashToWalletToday = filteredMutations.filter(m => m.type === 'cash_to_wallet').reduce((s, m) => s + Number(m.amount), 0);
  const mutCashToOwnerToday = filteredMutations.filter(m => m.type === 'cash_to_owner').reduce((s, m) => s + Number(m.amount), 0);

  return sendUnifiedSync({
    totalIncome: transIncomeToday + walletIncomeToday + mutWalletToCashToday,
    totalExpense: transExpenseToday + mutCashToOwnerToday + mutCashToWalletToday,
    unifiedHistory: [
      ...data.transactions.map(t => ({ ...t, source: 'manual' })),
      ...(data.wallet || []).map(w => ({ ...w, source: 'wallet' }))
    ].sort((a, b) => b.id - a.id).slice(0, 50),
    isFiltered: false,
    filterLabel: `Hari Ini (${new Date().toLocaleDateString('id-ID')})`
  });
}

// Watch db.json for changes from Electron UI
const dbPath = path.resolve('f:/PEMBUKUAN APP/server/db.json');

if (fs.existsSync(dbPath)) {
  let watchTimeout: NodeJS.Timeout | null = null;
  fs.watch(dbPath, (event) => {
    if (event === 'change') {
      if (watchTimeout) clearTimeout(watchTimeout);
      watchTimeout = setTimeout(() => {
        console.log('[SERVER] DB change detected, syncing metadata...');
        recalculateAndSync();
      }, 500); // 500ms debounce
    }
  });
} else {
  console.warn('[SERVER] Warning: db.json not found, real-time sync watchers disabled.');
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
  recalculateAndSync();
  res.json(newTransaction);
});

app.put('/api/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readDb();
  const index = data.transactions.findIndex((t) => t.id === id);
  if (index !== -1) {
    data.transactions[index] = { ...data.transactions[index], ...req.body };
    saveDb(data);
    recalculateAndSync();
    res.json(data.transactions[index]);
  } else {
    res.status(404).json({ error: 'Transaction not found' });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readDb();
  data.transactions = data.transactions.filter((t) => t.id !== id);
  saveDb(data);
  recalculateAndSync();
  res.json({ success: true });
});

app.post('/api/transactions/batch', (req, res) => {
  const data = readDb();
  const newBatch = req.body.map((t: any) => ({ ...t, id: Date.now() + Math.random() }));
  data.transactions.push(...newBatch);
  saveDb(data);
  recalculateAndSync();
  res.json({ success: true, count: newBatch.length });
});

app.get('/api/summary', (req, res) => {
  const { startDate, endDate } = req.query;
  const data = readDb();
  let filtered = data.transactions;
  let filteredMutations = data.mutations || [];
  
  if (startDate) {
    filtered = filtered.filter(t => t.date >= (startDate as string));
    filteredMutations = filteredMutations.filter(m => m.date >= (startDate as string));
  }
  if (endDate) {
    filtered = filtered.filter(t => t.date <= (endDate as string));
    filteredMutations = filteredMutations.filter(m => m.date <= (endDate as string));
  }
  
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  
  const mutWalletToCash = filteredMutations.filter(m => m.type === 'wallet_to_cash').reduce((s, m) => s + Number(m.amount), 0);
  const mutCashToWallet = filteredMutations.filter(m => m.type === 'cash_to_wallet').reduce((s, m) => s + Number(m.amount), 0);
  const mutCashToOwner = filteredMutations.filter(m => m.type === 'cash_to_owner').reduce((s, m) => s + Number(m.amount), 0);

  const finalIncome = totalIncome + mutWalletToCash;
  const finalExpense = totalExpense + mutCashToOwner + mutCashToWallet;

  // Calculate absolute running balances for Dashboard and Mutation forms
  const allTransIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const allTransExpense = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const allWalletBalance = (data.wallet || []).filter(w => w.status === 'received' || w.type === 'saving').reduce((s, w) => s + (Number(w.amount) || 0), 0);
  
  const allMutWalletToCash = (data.mutations || []).filter(m => m.type === 'wallet_to_cash').reduce((s, m) => s + Number(m.amount), 0);
  const allMutCashToWallet = (data.mutations || []).filter(m => m.type === 'cash_to_wallet').reduce((s, m) => s + Number(m.amount), 0);
  const allMutCashToOwner = (data.mutations || []).filter(m => m.type === 'cash_to_owner').reduce((s, m) => s + Number(m.amount), 0);
  const allMutWalletToOwner = (data.mutations || []).filter(m => m.type === 'wallet_to_owner').reduce((s, m) => s + Number(m.amount), 0);

  const transBalanceRunning = allTransIncome - allTransExpense + allMutWalletToCash - allMutCashToOwner - allMutCashToWallet;
  const walletBalanceRunning = allWalletBalance - allMutWalletToCash - allMutWalletToOwner + allMutCashToWallet;

  res.json({
    totalIncome: finalIncome,
    totalExpense: finalExpense,
    balance: finalIncome - finalExpense,
    transBalance: transBalanceRunning,
    walletBalance: walletBalanceRunning
  });
});

// Mutations API
app.get('/api/mutations', (req, res) => {
  const data = readDb();
  res.json(data.mutations || []);
});

app.post('/api/mutations', (req, res) => {
  const data = readDb();
  if (!data.mutations) data.mutations = [];
  const newMut = { ...req.body, id: Date.now(), date: req.body.date || new Date().toISOString() };
  data.mutations.push(newMut);
  saveDb(data);
  recalculateAndSync();
  res.json(newMut);
});

app.delete('/api/mutations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  if (data.mutations) {
    data.mutations = data.mutations.filter((m: any) => m.id !== id);
    saveDb(data);
    recalculateAndSync();
  }
  res.json({ success: true });
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
  
  // TRIGGER NOTIFIKASI HANYA JIKA TYPE QRIS & STATUS PENDING (INPUT DESKTOP)
  if (newEntry.type === 'qris' && newEntry.status === 'pending') {
    notifyQRISInternal(newEntry, false).catch(e => console.error('[SERVER] Desktop Notify Error:', e));
  }

  recalculateAndSync();
  res.json(newEntry);
});

app.put('/api/wallet/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  const index = data.wallet.findIndex((t) => t.id === id);
  if (index !== -1) {
    data.wallet[index] = { ...data.wallet[index], ...req.body };
    saveDb(data);
    recalculateAndSync();
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
  recalculateAndSync();
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
  recalculateAndSync();
  res.json(newStock);
});

app.delete('/api/stock/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  data.stock = data.stock.filter((s) => s.id !== id);
  saveDb(data);
  recalculateAndSync();
  res.json({ success: true });
});

app.patch('/api/stock/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  const idx = data.stock.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.stock[idx] = { ...data.stock[idx], ...req.body };
  saveDb(data);
  recalculateAndSync();
  res.json(data.stock[idx]);
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

app.post('/api/preorders/silent', (req, res) => {
  const data = readDb();
  const newPreorder = { ...req.body, id: Date.now(), createdAt: new Date().toISOString() };
  data.preorders.push(newPreorder);
  saveDb(data);
  recalculateAndSync();
  // Tidak mengirim Telegram — hanya simpan ke database
  res.json(newPreorder);
});

app.post('/api/preorders', (req, res) => {
  const data = readDb();
  const newPreorder = { ...req.body, id: Date.now(), createdAt: new Date().toISOString() };
  data.preorders.push(newPreorder);
  saveDb(data);
  recalculateAndSync();
  
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
    recalculateAndSync();
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
  recalculateAndSync();
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
  recalculateAndSync();
  res.json(newDebt);
});

app.put('/api/debts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  const index = data.debts.findIndex((d) => d.id === id);
  if (index !== -1) {
    data.debts[index] = { ...data.debts[index], ...req.body };
    saveDb(data);
    recalculateAndSync();
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
  recalculateAndSync();
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

app.post('/api/service/notify-preorder', async (req, res) => {
  await notifyPreorderInternal(req.body);
  res.json({ success: true });
});

app.post('/api/service/notify-qris', async (req, res) => {
  const { entry, auto } = req.body;
  await notifyQRISInternal(entry, auto);
  res.json({ success: true });
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
  recalculateAndSync();
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
    recalculateAndSync(); // KRUSIAL: Update HP saat input modal!
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

// Donations
app.get('/api/donations', (req, res) => {
  const data = readDb();
  res.json(data.donations || []);
});

app.post('/api/donations', (req, res) => {
  const data = readDb();
  if (!data.donations) data.donations = [];
  const newDonation = { ...req.body, id: Date.now(), date: req.body.date || new Date().toISOString() };
  data.donations.push(newDonation);
  saveDb(data);
  recalculateAndSync();
  res.json(newDonation);
});

app.put('/api/donations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  if (data.donations) {
    const index = data.donations.findIndex((d: any) => d.id === id);
    if (index !== -1) {
      data.donations[index] = { ...data.donations[index], ...req.body };
      saveDb(data);
      recalculateAndSync();
      return res.json(data.donations[index]);
    }
  }
  res.status(404).json({ error: 'Donation not found' });
});

app.delete('/api/donations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  if (data.donations) {
    data.donations = data.donations.filter((d: any) => d.id !== id);
    saveDb(data);
    recalculateAndSync();
  }
  res.json({ success: true });
});

// Customers
app.get('/api/customers', (req, res) => {
  const data = readDb();
  res.json(data.customers || []);
});

app.post('/api/customers', (req, res) => {
  const data = readDb();
  if (!data.customers) data.customers = [];
  const newCustomer = { ...req.body, id: Date.now() };
  data.customers.push(newCustomer);
  saveDb(data);
  res.json(newCustomer);
});

app.put('/api/customers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  if (data.customers) {
    const index = data.customers.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      data.customers[index] = { ...data.customers[index], ...req.body };
      saveDb(data);
      return res.json(data.customers[index]);
    }
  }
  res.status(404).json({ error: 'Customer not found' });
});

app.delete('/api/customers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  if (data.customers) {
    data.customers = data.customers.filter((c: any) => c.id !== id);
    saveDb(data);
  }
  res.json({ success: true });
});

// Prices
app.get('/api/prices', (req, res) => {
  const data = readDb();
  res.json(data.prices || []);
});

app.post('/api/prices', async (req, res) => {
  const data = readDb();
  if (!data.prices) data.prices = [];
  
  const oldPrice = Number(req.body.oldPrice) || 0;
  const newPrice = Number(req.body.newPrice) || 0;
  const diff = newPrice - oldPrice;
  const diffPercent = oldPrice !== 0 ? (diff / oldPrice) * 100 : 0;

  const newPriceItem = { 
    ...req.body, 
    id: Date.now(), 
    diffPercent,
    updatedAt: new Date().toISOString() 
  };
  
  data.prices.push(newPriceItem);
  saveDb(data);

  res.json(newPriceItem);
});

app.put('/api/prices/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  if (data.prices) {
    const index = data.prices.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      const oldPrice = Number(req.body.oldPrice) || 0;
      const newPrice = Number(req.body.newPrice) || 0;
      const diff = newPrice - oldPrice;
      const diffPercent = oldPrice !== 0 ? (diff / oldPrice) * 100 : 0;

      data.prices[index] = { 
        ...data.prices[index], 
        ...req.body, 
        diffPercent,
        updatedAt: new Date().toISOString() 
      };
      saveDb(data);

      return res.json(data.prices[index]);
    }
  }
  res.status(404).json({ error: 'Price item not found' });
});

app.delete('/api/prices/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readDb();
  if (data.prices) {
    data.prices = data.prices.filter((p: any) => p.id !== id);
    saveDb(data);
  }
  res.json({ success: true });
});

app.post('/api/service/notify-price', async (req, res) => {
  const { priceId } = req.body;
  const data = readDb();
  const priceItem = data.prices?.find((p: any) => p.id === priceId);
  
  if (!priceItem) return res.status(404).json({ error: 'Price item not found' });
  if (!data.settings?.cashierNumber) return res.status(400).json({ error: 'Cashier number not set' });

  try {
    const p = priceItem as any;
    const diff = p.newPrice - p.oldPrice;
    const scopeLabel = p.scope === 'pelanggan' ? `Pelanggan: ${p.customerName || 'N/A'}` : p.scope.toUpperCase();
    const trendIcon = diff > 0 ? '📈' : (diff < 0 ? '📉' : '➖');
    const waMsg = `📢 *UPDATE HARGA BARANG*\n\n📦 *Info Barang:* ${p.itemName}\n🌐 *Scope:* ${scopeLabel}\n\n💰 *Harga Lama:* Rp ${p.oldPrice.toLocaleString('id-ID')}\n💰 *Harga Baru:* Rp ${p.newPrice.toLocaleString('id-ID')}\n\n${trendIcon} *Selisih:* ${p.diffPercent.toFixed(1)}%\n\n_Mohon sesuaikan saat transaksi. Terima kasih._`;
    
    await sendInternalMessage(waMsg, data.settings.cashierNumber);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send WhatsApp notification' });
  }
});

// --- HELPER FUNCTIONS ---


async function processDanaText(text: string, docId?: string) {
  const cleanText = text.replace(/[\r\n\t]/g, ' ').trim();

  // --- FILTER ANTI-PROMO & GARBAGE ---
  // Menjaring notifikasi yang bukan transaksi (iklan, feedback, token, dll)
  const garbageKeywords = /\b(promo|voucher|emas|cashback|diskon|hadiah|kaget|token|klaim|hangus|pengalamanmu|review|pengalaman|survey|selamat|pemenang|investasi)\b/i;
  
  if (garbageKeywords.test(cleanText)) {
    console.log(`[BLOKIR] Notifikasi diabaikan (Sampah/Promo): "${cleanText}"`);
    return false;
  }

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
        const waMsg = `🔔 *NOTIFIKASI AUTO-PILOT*\n\n✅ Dana Masuk: Rp ${amount.toLocaleString('id-ID')}\n📝 Keterangan: ${newEntry.description}\n\n👤 *Status: TERVERIFIKASI OTOMATIS*\n_Aplikasi DM PRO v3.1.6-Lite_`;
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
    if (success) {
      recalculateAndSync(); // KRUSIAL: Update HP saat status QRIS berubah!
      io.emit('db:wallet-status-updated', { id: numericId, status });
    }
  }
});

// Firebase DANA incoming listener
listenDanaIncoming(async (text, docId) => {
  console.log('[FIREBASE-WATCH] Data Baru Terdeteksi dari HP!', docId);
  const success = await processDanaText(text || '', docId);
  if (success) recalculateAndSync();
});
console.log('[FIREBASE] Listener Dana/Gopay Aktif (Menunggu Notifikasi)');

// Mobile Input Listener
listenToMobileInput((data, docId) => {
  const dbData = readDb();
  const newTransaction = {
    id: Date.now(),
    type: data.type || 'expense',
    amount: data.amount,
    description: `[MOBILE] ${data.description}`,
    category: data.category || 'Mobile Input',
    date: new Date().toISOString()
  };
  dbData.transactions.push(newTransaction);
  saveDb(dbData);
  recalculateAndSync();
  io.emit('server:mobile-input', newTransaction);
  console.log('[MOBILE-REMOTE] Transaksi Berhasil Disimpan!');
});

// Sync Request Listener (Month/Year Filter)
listenToSyncRequests((month, year) => {
  console.log(`[FIREBASE-SYNC] HP Minta Data Periode: ${month + 1}/${year}`);
  syncMonthData(month, year);
});

// Mobile Stock Actions Listener
listenToMobileStockActions((action, data, docId) => {
  console.log(`[FIREBASE-ACTION] Menerima aksi: ${action} untuk ID: ${data.id || 'N/A'}`);
  const dbData = readDb();
  if (action === 'add') {
    const newItem = {
      id: Date.now(),
      name: data.name,
      isUrgent: data.isUrgent || false,
      status: 'pending' as const,
      dateAdded: data.dateAdded || new Date().toISOString(),
      source: 'mobile' as const,
    };
    dbData.stock.push(newItem);
    saveDb(dbData);
    recalculateAndSync();
    io.emit('db:stock-updated', newItem);
    console.log(`[MOBILE-STOCK] Barang baru: ${newItem.name}`);
  } else if (action === 'add_finance') {
    if (!dbData.financeSources) dbData.financeSources = [];
    
    // AMBIL DATA INTI - Perbaikan: data.data berisi rincian bank/saldo
    const financeData = data.data || data; 
    const newSource = { ...financeData, id: financeData.id || Date.now().toString() };
    
    // Bersihkan data sampah teknis jika ada
    dbData.financeSources = dbData.financeSources.filter(s => s.name && s.balance !== undefined);

    // Check if duplicate ID or Name (to update instead of push)
    const idx = dbData.financeSources.findIndex(s => s.id === newSource.id || s.name === newSource.name);
    if (idx !== -1) {
      dbData.financeSources[idx] = newSource;
    } else {
      dbData.financeSources.push(newSource);
    }
    
    saveDb(dbData);
    recalculateAndSync();
    console.log(`[MOBILE-FINANCE] Sumber dana diperbarui: ${newSource.name} - Rp ${newSource.balance}`);
  } else if (action === 'delete_finance') {
    if (dbData.financeSources) {
      dbData.financeSources = dbData.financeSources.filter(s => s.id !== data.id && s.name !== data.name);
      saveDb(dbData);
      recalculateAndSync();
      console.log(`[MOBILE-FINANCE] Sumber dana dihapus: ${data.name}`);
    }
  } else if (action === 'done') {
    const idx = dbData.stock.findIndex((s) => s.id === Number(data.id));
    if (idx !== -1) {
      dbData.stock[idx].status = 'bought';
      dbData.stock[idx].boughtAt = new Date().toISOString();
      saveDb(dbData);
      recalculateAndSync();
      io.emit('db:stock-updated', dbData.stock[idx]);
      console.log(`[MOBILE-STOCK] Barang ditandai dibeli: ${dbData.stock[idx].name}`);
    }
  } else if (action === 'delete') {
    const item = dbData.stock.find((s) => s.id === Number(data.id));
    dbData.stock = dbData.stock.filter((s) => s.id !== Number(data.id));
    saveDb(dbData);
    recalculateAndSync();
    io.emit('db:stock-deleted', { id: Number(data.id) });
    console.log(`[MOBILE-STOCK] Barang dihapus: ${item?.name}`);
  }
});

// --- HEARTBEAT SYSTEM (10s) ---
// Notifikasi ke HP bahwa server "Live"
setInterval(() => {
  updateHeartbeat();
}, 10000); // Kirim tiap 10 detik
updateHeartbeat(); // Jalankan sekali saat start
console.log('[FIREBASE] Listener Mobile Stock Actions Aktif');

// Initial Sync
recalculateAndSync();
