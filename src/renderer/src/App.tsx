import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { Eye, EyeOff, Plus } from 'lucide-react';

// Types
import { Transaction, StockItem, Summary, Settings } from './types';

// Utils
import { unformatIDR } from './utils/formatters';
import { getLocalDate, months } from './utils/dateUtils';
import { generateProfessionalPDF, generateStockPDF } from './utils/pdf';

// Components
import Sidebar from './components/layout/Sidebar';
import LoginScreen from './components/auth/LoginScreen';
import Overview from './components/dashboard/Overview';
import StockManager from './components/stock/StockManager';
import Timeline from './components/transactions/Timeline';
import ReportsView from './components/reports/ReportsView';
import TransactionModal from './components/modals/TransactionModal';
import BatchModal from './components/modals/BatchModal';
import DebtManager from './components/debts/DebtManager';
import WalletManager from './components/wallet/WalletManager';
import CapitalManager from './components/capital/CapitalManager';
import PreorderManager from './components/preorder';
// WhatsAppManager will be imported inside ServerHub
import ServerHub from './components/serverhub/ServerHub';

const { api } = window as any;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'preorder' | 'transactions' | 'debt' | 'wallet' | 'capital' | 'stock' | 'reports' | 'settings' | 'serverhub'>('dashboard');
  const [storeName, setStoreName] = useState('Pembukuan Toko');
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [prevSummary, setPrevSummary] = useState<Summary>({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [walletEntries, setWalletEntries] = useState<any[]>([]);
  const [capitalData, setCapitalData] = useState<any[]>([]);
  const [preorders, setPreorders] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [newStockItem, setNewStockItem] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);
  const [serverOffline, setServerOffline] = useState(false);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [savedPassword, setSavedPassword] = useState('');
  const [loginInput, setLoginInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPIN, setShowPIN] = useState(false);

  // Theme support
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        setEditingId(null);
        setFormData({
          type: 'income',
          amount: '',
          description: '',
          category: '',
          date: getLocalDate(),
          items: []
        });
        setShowModal(true);
      }
      if ((e.key === 's' || e.key === '/') && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('main-search')?.focus();
      }
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowBatchModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Date Filtering
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return getLocalDate(lastDay);
  });
  const [reportPage, setReportPage] = useState(1);
  const [transacPage, setTransacPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [transacFilterType, setTransacFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    description: '',
    category: '',
    date: getLocalDate(),
    items: [] as any[]
  });

  // Batch Mode States
  // Batch Mode States
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchStep, setBatchStep] = useState<'config' | 'input'>('config');
  const [batchConfig, setBatchConfig] = useState({ month: new Date().getMonth(), year: new Date().getFullYear(), totalDays: 0, startDay: 1, limitDay: 0 });
  const [currentDay, setCurrentDay] = useState(1);
  const [batchData, setBatchData] = useState<Record<number, any>>({});

  const openBatchModal = () => {
    setBatchStep('config');
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    setBatchConfig({
      month: today.getMonth(),
      year: today.getFullYear(),
      totalDays: daysInMonth,
      startDay: 1,
      limitDay: daysInMonth
    });
    setCurrentDay(1);
    setBatchData({});
    setShowBatchModal(true);
  };

  const resetFormData = () => {
    setFormData({
      type: 'income',
      amount: '',
      description: '',
      category: '',
      date: getLocalDate(),
      items: [] as any[]
    });
    setEditingId(null);
  };

  const applyMonthFilter = (m: number, y: number) => {
    setFilterMonth(m);
    setFilterYear(y);
    const lastDay = new Date(y, m + 1, 0);
    setStartDate(`${y}-${String(m + 1).padStart(2, '0')}-01`);
    setEndDate(`${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`);
  };

  const closeModal = () => {
    setShowModal(false);
    resetFormData();
  };

  const closeBatchModal = () => {
    setShowBatchModal(false);
    setBatchStep('config');
    setBatchData({});
    setCurrentDay(1);
  };

  const loadData = async () => {
    if (typeof api === 'undefined') {
      // Mock Data for Browser Testing
      setSummary({ totalIncome: 5000000, totalExpense: 1500000, balance: 3500000 });
      setTransactions([{
        id: Date.now(),
        type: 'income',
        amount: 5000000,
        description: `Pemasukan Contoh Bulan ${months[filterMonth]}`,
        category: 'Penjualan',
        date: getLocalDate()
      }]);
      setIsAuthLoading(false);
      return;
    }

    try {
      const [s, t, st, set, dbDebts, dbWallet, dbCapital, dbPreorders] = await Promise.all([
        api.getSummary({ startDate, endDate }),
        api.getTransactions({ startDate, endDate }),
        api.getStock(),
        api.getSettings(),
        api.getDebts(),
        api.getWallet(),
        api.getCapital(),
        api.getPreorders(),
      ]);

      // Fetch Previous Month Comparison
      const currentStart = new Date(startDate);
      const prevMonthStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
      const prevMonthEnd = new Date(currentStart.getFullYear(), currentStart.getMonth(), 0);
      const prevS = await api.getSummary({
        startDate: getLocalDate(prevMonthStart),
        endDate: getLocalDate(prevMonthEnd)
      });

      setSummary(s);
      setPrevSummary(prevS);
      setTransactions(t);
      setDebts(dbDebts);
      setWalletEntries(dbWallet);
      setCapitalData(dbCapital);
      setPreorders(dbPreorders);
      setReportPage(1);
      setTransacPage(1);
      setStockItems(st);
      if (set.storeName) setStoreName(set.storeName);
      const pin = set.password || '0000';
      setSavedPassword(pin);
      localStorage.setItem('cachedPin', pin);
      if (set.storeName) localStorage.setItem('cachedStoreName', set.storeName);
      setServerOffline(false); // Server kembali online
    } catch (err: any) {
      console.error('[APP] loadData gagal — server mungkin offline:', err?.message);
      setServerOffline(true);
    }
    setIsAuthLoading(false);
  };


  useEffect(() => { 
    if (isLoggedIn) {
      loadData(); 

      // Auto-retry setiap 15 detik saat server offline
      const retryInterval = setInterval(() => {
        if (serverOffline) {
          console.log('[APP] Mencoba reconnect ke server...');
          loadData();
        }
      }, 15000);

      // Listener global untuk refresh data saat ada dana masuk otomatis
      if (api.onWalletStatusUpdated) {
        const removeListener = api.onWalletStatusUpdated(() => {
          console.log('[APP] Mendeteksi update data, me-refresh...');
          loadData();
        });
        return () => { removeListener(); clearInterval(retryInterval); };
      }
      return () => clearInterval(retryInterval);
    } else {
      // Safety check for non-electron environments
      if (typeof api === 'undefined') {
        setSavedPassword('0000');
        setIsAuthLoading(false);
        return;
      }
      // Small fetch just for settings to get store name and PIN
      api.getSettings().then((set: Settings) => {
        if (set.storeName) setStoreName(set.storeName);
        const pin = set.password || '0000';
        setSavedPassword(pin);
        // Cache PIN locally so login still works when server is offline
        localStorage.setItem('cachedPin', pin);
        if (set.storeName) localStorage.setItem('cachedStoreName', set.storeName);
        setIsAuthLoading(false);
      }).catch(() => {
        // Server offline — use cached PIN from localStorage
        const cachedPin = localStorage.getItem('cachedPin') || '0000';
        const cachedName = localStorage.getItem('cachedStoreName');
        setSavedPassword(cachedPin);
        if (cachedName) setStoreName(cachedName);
        setIsAuthLoading(false);
      });
    }
    return () => {};
  }, [isLoggedIn, startDate, endDate]);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { date: string; income: number; expense: number }>();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const label = current.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      dataMap.set(dateStr, { date: label, income: 0, expense: 0 });
      current.setDate(current.getDate() + 1);
    }
    transactions.forEach(t => {
      const dateStr = t.date.split('T')[0];
      if (dataMap.has(dateStr)) {
        const d = dataMap.get(dateStr)!;
        if (t.type === 'income') d.income += t.amount;
        else d.expense += t.amount;
      }
    });
    return Array.from(dataMap.values());
  }, [transactions, startDate, endDate]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount) || (formData.items.reduce((s: number, it: any) => s + (parseFloat(it.amount) || 0), 0))
    };
    try {
      if (editingId) {
        await api.updateTransaction({ ...payload, id: editingId });
      } else {
        await api.addTransaction(payload);
      }
      closeModal();
      loadData();
      Swal.fire({ title: 'Berhasil!', text: 'Catatan telah disimpan.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch { Swal.fire('Error', 'Gagal menyimpan data.', 'error'); }
  };

  const handleEditClick = (t: any) => {
    setEditingId(t.id);
    setFormData({
      type: t.type,
      amount: t.amount.toString(),
      description: t.description,
      category: t.category,
      date: t.date.split('T')[0],
      items: t.items?.map((it: any) => ({ ...it, amount: it.amount.toString() })) || []
    });
    setShowModal(true);
  };

  const handleDeleteTransaction = async (id: number) => {
    const result = await Swal.fire({ title: 'Hapus Catatan?', text: "Data ini tidak bisa dikembalikan!", icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus' });
    if (result.isConfirmed) {
      await api.deleteTransaction(id);
      loadData();
      Swal.fire({ title: 'Terhapus!', icon: 'success', timer: 1500, showConfirmButton: false });
    }
  };

  const handleAddStockItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newStockItem.trim()) return;
    await api.updateStock({ name: newStockItem.trim(), dateAdded: new Date().toISOString() });
    setNewStockItem('');
    setShowStockModal(false);
    loadData();
  };

  const handleDeleteStockItem = async (id: number) => {
    const result = await Swal.fire({ title: 'Hapus Item?', icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Hapus' });
    if (result.isConfirmed) { await api.deleteStock(id); loadData(); }
  };

  const sendToOwner = async () => {
    try {
      const pdfBase64 = await generateProfessionalPDF(storeName, filterMonth, filterYear, transactions, theme);
      await api.sendReport({
        pdfData: pdfBase64,
        summary: summary,
        filename: `laporan_${filterMonth + 1}_${filterYear}.pdf`,
        caption: `📑 *LAPORAN BULANAN ${months[filterMonth].toUpperCase()} ${filterYear}*`
      });
      Swal.fire({ title: 'Terkirim!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', 'Gagal membuat PDF: ' + err.message, 'error');
    }
  };

  const sendStockToOwner = async () => {
    try {
      if (stockItems.length === 0) {
        Swal.fire({ title: 'Info', text: 'Daftar barang habis kosong.', icon: 'info', timer: 2000, showConfirmButton: false });
        return;
      }
      const pdfBase64 = await generateStockPDF(storeName, stockItems, theme);
      await api.sendReport({
        pdfData: pdfBase64,
        summary: {},
        caption: `📦 *LAPORAN BARANG HABIS / OPNAME*`,
        filename: 'barang_habis.pdf'
      });
      Swal.fire({ title: 'Terkirim!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', 'Gagal membuat PDF: ' + err.message, 'error');
    }
  };

  if (isAuthLoading) return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-bg-light dark:bg-bg-dark gap-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-[0.2em]">Memuat Sistem...</p>
    </div>
  );

  return (
    <>
      <LoginScreen
        isLoggedIn={isLoggedIn}
        isAuthLoading={isAuthLoading}
        loginInput={loginInput}
        setLoginInput={setLoginInput}
        savedPassword={savedPassword}
        setIsLoggedIn={setIsLoggedIn}
        storeName={storeName}
      />

      {isLoggedIn && (
        <div className="flex w-full h-screen text-slate-800 dark:text-slate-200">
          <Sidebar
            storeName={storeName}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            theme={theme}
            setTheme={setTheme}
            setIsLoggedIn={setIsLoggedIn}
            setLoginInput={setLoginInput}
          />

          <main className="flex-1 overflow-y-auto bg-transparent relative animate-fade-in z-0 flex flex-col">
            {/* Server Offline Banner */}
            {serverOffline && (
              <div className="flex items-center gap-3 px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs font-semibold text-amber-400 shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span>Server backend offline — data tidak dapat dimuat. Jalankan <code className="font-mono bg-black/20 px-1 py-0.5 rounded">npm run server:dev</code></span>
                <button onClick={() => loadData()} className="ml-auto text-amber-400 hover:text-amber-300 underline underline-offset-2">Coba Lagi</button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'dashboard' && (
              <Overview
                summary={summary}
                prevSummary={prevSummary}
                chartData={chartData}
                theme={theme}
                openBatchModal={openBatchModal}
                filterMonth={filterMonth}
                filterYear={filterYear}
                applyMonthFilter={applyMonthFilter}
              />
            )}

            {activeTab === 'preorder' && (
              <PreorderManager
                preorders={preorders}
                loadData={loadData}
                api={api}
              />
            )}

            {activeTab === 'transactions' && (
              <div className="flex flex-col gap-8">
                <header className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-semibold">Semua Transaksi</h1>
                    <p className="text-muted dark:text-muted mt-1">Cari dan kelola histori keuangan Anda.</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      className="btn btn-primary px-8 py-3 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2" 
                      onClick={() => { resetFormData(); setFormData(prev => ({ ...prev, type: 'income', date: getLocalDate() })); setShowModal(true); }}
                    >
                      <Plus size={18} /> Tambah Catatan Transaksi
                    </button>
                  </div>
                </header>

                <div className="glass-card flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex-1 w-full group">
                    <div className="flex items-center gap-3 px-4 bg-white dark:bg-bg-dark/20 border border-slate-300 dark:border-border rounded-xl">
                      <input id="main-search" type="text" className="bg-transparent border-none outline-none py-3.5 w-full font-medium text-muted dark:text-muted placeholder-muted dark:placeholder-text-muted" placeholder="Cari deskripsi atau kategori..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-bg-dark/40 p-1.5 rounded-xl border border-slate-200/50 dark:border-border/50">
                    {['all', 'income', 'expense'].map((type: any) => (
                      <button 
                        key={type} 
                        onClick={() => setTransacFilterType(type)} 
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                          transacFilterType === type 
                            ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-md scale-105' 
                            : 'text-slate-500 hover:text-slate-700 dark:text-text-muted'
                        }`}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <Timeline
                  transactions={transactions.filter(t => (t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category?.toLowerCase().includes(searchTerm.toLowerCase())) && (transacFilterType === 'all' || t.type === transacFilterType))}
                  currentPage={transacPage}
                  setCurrentPage={setTransacPage}
                  handleEditClick={handleEditClick}
                  handleDeleteTransaction={handleDeleteTransaction}
                />
              </div>
            )}

            {activeTab === 'debt' && (
              <DebtManager
                debts={debts}
                loadData={loadData}
                api={api}
                storeName={storeName}
                theme={theme}
              />
            )}

            {activeTab === 'wallet' && (
              <WalletManager
                entries={walletEntries}
                loadData={loadData}
                api={api}
                storeName={storeName}
                theme={theme}
              />
            )}

            {activeTab === 'capital' && (
              <CapitalManager
                capitalData={capitalData}
                loadData={loadData}
                api={api}
              />
            )}

            {activeTab === 'stock' && (
              <StockManager
                stockItems={stockItems}
                newStockItem={newStockItem}
                setNewStockItem={setNewStockItem}
                showStockModal={showStockModal}
                setShowStockModal={setShowStockModal}
                handleAddStockItem={handleAddStockItem}
                handleDeleteStockItem={handleDeleteStockItem}
                sendStockToOwner={sendStockToOwner}
              />
            )}



            {activeTab === 'serverhub' && (
              <ServerHub api={api} />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                filterMonth={filterMonth}
                filterYear={filterYear}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                applyMonthFilter={applyMonthFilter}
                sendToOwner={sendToOwner}
                transactions={transactions}
                currentPage={reportPage}
                setCurrentPage={setReportPage}
                handleEditClick={handleEditClick}
                handleDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {activeTab === 'settings' && (
              <div className="flex flex-col gap-8 max-w-[500px]">
                <header><h1 className="text-3xl font-semibold">Pengaturan</h1></header>
                <div className="glass-card">
                  <h3 className="text-lg font-bold mb-1">Informasi Toko</h3>
                  <p className="text-xs text-muted dark:text-muted/50 mb-4 italic">Nama ini akan muncul di header aplikasi dan laporan PDF Anda.</p>
                  <input type="text" className="form-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                  <button className="btn btn-primary w-full mt-4" onClick={async () => { await api.saveSettings({ storeName }); Swal.fire('Berhasil!', '', 'success'); }}>Simpan</button>
                </div>
                <div className="glass-card">
                  <h3 className="text-lg font-bold mb-1">Security PIN</h3>
                  <p className="text-xs text-muted dark:text-muted/50 mb-4 italic">Gunakan PIN untuk membatasi akses masuk ke data pembukuan Anda.</p>
                  
                  <div className="relative group">
                    <input 
                      type={showPIN ? 'text' : 'password'} 
                      className="form-input pr-12" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="PIN Baru" 
                    />
                    <button 
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                      onClick={() => setShowPIN(!showPIN)}
                    >
                      {showPIN ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <button className="btn btn-primary w-full mt-4" onClick={async () => { await api.saveSettings({ password: newPassword }); setSavedPassword(newPassword); localStorage.setItem('cachedPin', newPassword); setNewPassword(''); Swal.fire('Berhasil!', '', 'success'); }}>Update PIN</button>
                </div>
              </div>
            )}
            </div>
          </main>
        </div>
      )}

      <TransactionModal
        showModal={showModal}
        closeModal={closeModal}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        handleAddTransaction={handleAddTransaction}
        addExpenseItem={() => setFormData({ ...formData, items: [...formData.items, { name: '', amount: '' }] })}
        updateExpenseItem={(idx, field, val) => {
          const items = [...formData.items]; items[idx][field] = val;
          const total = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
          setFormData({ ...formData, items, amount: total > 0 ? total.toString() : formData.amount });
        }}
        removeExpenseItem={(idx) => {
          const items = formData.items.filter((_: any, i: number) => i !== idx);
          const total = items.reduce((s: number, it: any) => s + (parseFloat(it.amount) || 0), 0);
          setFormData({ ...formData, items, amount: items.length > 0 ? total.toString() : formData.amount });
        }}
      />

      <BatchModal
        showBatchModal={showBatchModal}
        setShowBatchModal={closeBatchModal}
        batchStep={batchStep}
        setBatchStep={setBatchStep}
        batchConfig={batchConfig}
        setBatchConfig={setBatchConfig}
        currentDay={currentDay}
        setCurrentDay={setCurrentDay}
        batchData={batchData}
        setBatchData={setBatchData}
        submitBatch={async () => {
          const transactionsToSave: any[] = [];
          Object.keys(batchData).forEach(day => {
            const dayNum = parseInt(day);
            const data = batchData[dayNum];
            const dateStr = `${batchConfig.year}-${String(batchConfig.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

            if (data.isLibur) {
              transactionsToSave.push({
                type: 'expense', amount: 0,
                items: [{ name: 'LIBUR / TOKO TUTUP', amount: 0 }],
                description: `LIBUR tgl ${dayNum}`, category: 'Libur', date: dateStr
              });
              return;
            }

            if (data.income && parseFloat(data.income) > 0) {
              transactionsToSave.push({
                type: 'income', amount: parseFloat(data.income),
                description: `Pemasukan tgl ${dayNum}`, category: 'Penjualan', date: dateStr
              });
            }

            if (data.expenseItems && data.expenseItems.length > 0) {
              const items = data.expenseItems
                .filter((it: any) => it.name.trim() !== '' && parseFloat(unformatIDR(it.amount)) > 0)
                .map((it: any) => ({ name: it.name, amount: parseFloat(unformatIDR(it.amount)) }));

              if (items.length > 0) {
                const totalExpense = items.reduce((s: number, it: any) => s + it.amount, 0);
                transactionsToSave.push({
                  type: 'expense', amount: totalExpense,
                  items: items,
                  description: `Pengeluaran tgl ${dayNum}`, category: 'Operasional', date: dateStr
                });
              }
            }
          });

          if (transactionsToSave.length === 0) {
            Swal.fire({ title: 'Info', text: 'Tidak ada data untuk disimpan.', icon: 'info', timer: 2000, showConfirmButton: false });
            return;
          }

          const res = await api.addBatchTransactions(transactionsToSave);
          if (res.success) {
            closeBatchModal();
            loadData();
            Swal.fire({ title: 'Berhasil!', text: `Tersimpan ${res.count} transaksi.`, icon: 'success', timer: 2000, showConfirmButton: false });
          }
        }}
      />
    </>
  );
};

export default App;
