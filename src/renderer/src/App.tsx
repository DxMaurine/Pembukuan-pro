import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { Eye, EyeOff, Plus, History, Settings2, Store, Shield, Zap, Palette, Trash2, Info, Filter, FileText, Wallet, Handshake, ShoppingBag, Package, RefreshCw, CheckCircle2, Download } from 'lucide-react';

// Types
import { Transaction, StockItem, Summary, Settings, Mutation } from './types';

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
import MutationManager from './components/mutations/MutationManager';
// WhatsAppManager will be imported inside ServerHub
import ServerHub from './components/serverhub/ServerHub';

const { api } = window as any;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'preorder' | 'transactions' | 'debt' | 'wallet' | 'mutasi' | 'capital' | 'stock' | 'reports' | 'settings' | 'serverhub'>('dashboard');
  const [walletSubTab, setWalletSubTab] = useState<'saving' | 'qris'>('saving');
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
  const [isStockUrgent, setIsStockUrgent] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [serverOffline, setServerOffline] = useState(false);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [savedPassword, setSavedPassword] = useState('');
  const [loginInput, setLoginInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPIN, setShowPIN] = useState(false);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'identity' | 'security' | 'automation' | 'visual' | 'maintenance' | 'about'>('identity');
  const [resetStart, setResetStart] = useState(getLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [resetEnd, setResetEnd] = useState(getLocalDate(new Date()));
  const [selectedModules, setSelectedModules] = useState(['transactions', 'wallet', 'debts', 'preorders', 'stock']);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  // Update System State
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [updateDownloaded, setUpdateDownloaded] = useState<boolean>(false);

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
  const [moduleFilter, setModuleFilter] = useState<'all' | 'preorder' | 'debt' | 'wallet' | 'capital' | 'manual'>('all');

  const colorPresets = [
    { name: 'Rose', primary: '#f43f5e', active: '#e11d48' },
    { name: 'Blue', primary: '#3b82f6', active: '#2563eb' },
    { name: 'Emerald', primary: '#10b981', active: '#059669' },
    { name: 'Amber', primary: '#f59e0b', active: '#d97706' },
    { name: 'Violet', primary: '#8b5cf6', active: '#7c3aed' },
    { name: 'Sky', primary: '#0ea5e9', active: '#0284c7' },
  ];

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('accentColor') || '#f43f5e';
  });

  useEffect(() => {
    const preset = colorPresets.find(p => p.primary === accentColor) || colorPresets[0];
    document.documentElement.style.setProperty('--primary', preset.primary);
    document.documentElement.style.setProperty('--primary-active', preset.active);
    localStorage.setItem('accentColor', preset.primary);
  }, [accentColor]);

  // --- Update System Listeners ---
  useEffect(() => {
    if (!api.onUpdateMessage) return; // Prevent crash in dev if not set up

    const removeMsg = api.onUpdateMessage((msg: string) => {
      setUpdateStatus(msg);
      // If error or not available, clear after a while
      if (msg.includes('Error') || msg.includes('yang terbaru')) {
        setTimeout(() => setUpdateStatus(''), 5000);
      }
    });

    const removeAvailable = api.onUpdateAvailable((info: any) => {
      setUpdateStatus(`Versi baru tersedia: ${info.version}`);
      Swal.fire({
        title: 'Pembaruan Tersedia',
        text: `Versi ${info.version} sudah dirilis. Unduh sekarang?`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Unduh Sekarang'
      }).then((result) => {
        if (result.isConfirmed) {
          // autoUpdater already starts downloading usually if configured
        }
      });
    });

    const removeProgress = api.onDownloadProgress((percent: number) => {
      setDownloadProgress(Math.floor(percent));
    });

    const removeDownloaded = api.onUpdateDownloaded((info: any) => {
      setUpdateDownloaded(true);
      setUpdateStatus(`Pembaruan ${info.version} siap dipasang.`);
      Swal.fire({
        title: 'Pembaruan Siap!',
        text: 'Instalasi sudah selesai diunduh. Restart aplikasi sekarang?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Restart Sekarang'
      }).then((result) => {
        if (result.isConfirmed) {
          api.quitAndInstall();
        }
      });
    });

    return () => {
      removeMsg();
      removeAvailable();
      removeProgress();
      removeDownloaded();
    };
  }, []);

  const handleManualCheckUpdate = () => {
    setUpdateStatus('Mengecek...');
    setDownloadProgress(0);
    api.checkForUpdates();
  };

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
      const [s, t, st, set, dbDebts, dbWallet, dbCapital, dbPreorders, dbMutations] = await Promise.all([
        api.getSummary({ startDate, endDate }),
        api.getTransactions({ startDate, endDate }),
        api.getStock(),
        api.getSettings(),
        api.getDebts(),
        api.getWallet(),
        api.getCapital(),
        api.getPreorders(),
        api.getMutations(),
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
      setCapitalData(dbCapital || []);
      setPreorders(dbPreorders || []);
      setMutations(dbMutations || []);
      setReportPage(1);
      setTransacPage(1);
      setStockItems(st);
      if (set.storeName) setStoreName(set.storeName);
      if (set.autoConfirm !== undefined) setAutoConfirm(set.autoConfirm);
      if (set.telegramToken) setTelegramToken(set.telegramToken);
      if (set.telegramChatId) setTelegramChatId(set.telegramChatId);
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
        const removeWallet = api.onWalletStatusUpdated(() => {
          console.log('[APP] Mendeteksi update data, me-refresh...');
          loadData();
        });

        const removeMobile = api.onMobileInput ? api.onMobileInput((data: any) => {
          console.log('[APP] Mendeteksi input mobile baru!');
          Swal.fire({
            title: '📲 Input dari HP!',
            html: `<div style="text-align: left;"><b>Nominal:</b> Rp ${(data.amount || 0).toLocaleString('id-ID')}<br/><b>Ket:</b> ${data.description.replace('[MOBILE] ', '')}</div>`,
            icon: 'success',
            toast: true,
            position: 'top-end',
            timer: 5000,
            showConfirmButton: false,
            timerProgressBar: true,
            iconColor: '#f43f5e',
            customClass: {
              popup: '!bg-white dark:!bg-bg-card !text-slate-800 dark:!text-slate-200 !border !border-slate-200 dark:!border-white/10 !shadow-xl'
            }
          });
          loadData();
        }) : () => { };

        const removeStockUpdate = api.onStockUpdated ? api.onStockUpdated(() => {
          console.log('[APP] Mendeteksi update stok dari mobile...');
          loadData();
        }) : () => { };

        const removeStockDelete = api.onStockDeleted ? api.onStockDeleted(() => {
          console.log('[APP] Mendeteksi penghapusan stok dari mobile...');
          loadData();
        }) : () => { };

        return () => {
          removeWallet();
          removeMobile();
          removeStockUpdate();
          removeStockDelete();
          clearInterval(retryInterval);
        };
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
        if (set.autoConfirm !== undefined) setAutoConfirm(set.autoConfirm);
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
    return () => { };
  }, [isLoggedIn, startDate, endDate]);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { date: string; income: number; expense: number; mutation: number }>();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const label = current.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      dataMap.set(dateStr, { date: label, income: 0, expense: 0, mutation: 0 });
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
    mutations.forEach((m: any) => {
      if (m.type === 'wallet_to_cash') {
        const dateStr = String(m.date).split('T')[0];
        if (dataMap.has(dateStr)) {
          dataMap.get(dateStr)!.mutation += Number(m.amount);
        }
      }
    });
    return Array.from(dataMap.values());
  }, [transactions, mutations, startDate, endDate]);

  // Unified System-Wide Activities
  const unifiedActivities = useMemo(() => {
    const list: any[] = [];

    // 1. Manual Transactions
    transactions.forEach(t => list.push({ ...t, source: 'manual' }));

    // 2. Preorders (Income events)
    preorders.forEach(p => {
      // DP Activity
      if (p.downPayment > 0) {
        list.push({
          id: `pre-dp-${p.id}`,
          type: 'income',
          amount: p.downPayment,
          description: `DP Preorder: ${p.customerName} (#${p.id})`,
          category: 'Preorder',
          date: p.createdAt,
          source: 'preorder'
        });
      }
      // If completed, add balance payment activity (simulated based on status)
      if (p.status === 'completed' && p.remainingAmount > 0) {
        list.push({
          id: `pre-done-${p.id}`,
          type: 'income',
          amount: p.remainingAmount,
          description: `Pelunasan Preorder: ${p.customerName} (#${p.id})`,
          category: 'Preorder',
          date: p.dueDate, // Assume paid on due date if completed
          source: 'preorder'
        });
      }
    });

    // 3. Debts (Piutang)
    debts.forEach(d => {
      list.push({
        id: `debt-${d.id}`,
        type: d.type === 'receivable' ? 'income' : 'expense',
        amount: d.amount,
        description: `${d.type === 'receivable' ? 'Piutang' : 'Hutang'}: ${d.name} (${d.status})`,
        category: 'Piutang',
        date: d.date,
        source: 'debt'
      });
    });

    // 4. Wallet & QRIS
    walletEntries.forEach(w => {
      list.push({
        id: `wallet-${w.id}`,
        type: 'income',
        amount: w.amount,
        description: `QRIS/DANA: ${w.description || 'Penerimaan Digital'}`,
        category: 'QRIS',
        date: w.date,
        source: 'wallet'
      });
    });

    // 5. Capital (Modal)
    capitalData.forEach(c => {
      list.push({
        id: `cap-${c.id}`,
        type: c.type === 'injection' ? 'income' : 'expense',
        amount: c.amount,
        description: `${c.type === 'injection' ? 'Injeksi' : 'Tarik'} Modal: ${c.description}`,
        category: 'Modal Toko',
        date: c.date,
        source: 'capital'
      });
    });

    // Filter Logic
    return list.filter(a => {
      const matchSearch = (a.description.toLowerCase().includes(searchTerm.toLowerCase()) || a.category?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchType = (transacFilterType === 'all' || a.type === transacFilterType);
      const matchModule = (moduleFilter === 'all' || a.source === moduleFilter);
      return matchSearch && matchType && matchModule;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, preorders, debts, walletEntries, capitalData, searchTerm, transacFilterType, moduleFilter]);

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

  const handleAddStockItem = async (e?: React.FormEvent, shouldClose: boolean = true) => {
    if (e) e.preventDefault();
    if (!newStockItem.trim()) return;
    await api.updateStock({ name: newStockItem.trim(), dateAdded: new Date().toISOString(), isUrgent: isStockUrgent });
    setNewStockItem('');
    setIsStockUrgent(false);
    if (shouldClose) setShowStockModal(false);
    loadData();
  };

  const handleDeleteStockItem = async (id: number) => {
    const result = await Swal.fire({ title: 'Hapus Item?', icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Hapus' });
    if (result.isConfirmed) { await api.deleteStock(id); loadData(); }
  };

  const handleMarkBoughtItem = async (id: number) => {
    await api.patchStock(id, { status: 'bought', boughtAt: new Date().toISOString() });
    loadData();
  };

  const sendToOwner = async () => {
    try {
      const pdfBase64 = await generateProfessionalPDF(storeName, filterMonth, filterYear, transactions, walletEntries, theme);
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
            setActiveTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'wallet') setWalletSubTab('saving');
            }}
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
                  preorders={preorders}
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
                  storeName={storeName}
                />
              )}

              {activeTab === 'transactions' && (
                <div className="flex flex-col gap-8">
                  <header className="flex justify-between items-center">
                    <div>
                      <h1 className="text-3xl font-semibold flex items-center gap-3">
                        <History className="text-primary" size={32} /> Semua Transaksi
                      </h1>
                      <p className="text-sm text-muted dark:text-muted mt-1 italic">Cari dan kelola histori keuangan Anda.</p>
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

                    <div className="flex flex-wrap gap-3">
                      <div className="flex bg-slate-100 dark:bg-bg-dark/40 p-1 rounded-xl border border-slate-200/50 dark:border-border/50">
                        {['all', 'income', 'expense'].map((type: any) => (
                          <button
                            key={type}
                            onClick={() => setTransacFilterType(type)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${transacFilterType === type
                              ? 'bg-primary text-white shadow-md'
                              : 'text-slate-500 hover:text-slate-700 dark:text-muted'
                              }`}
                          >
                            {type.toUpperCase()}
                          </button>
                        ))}
                      </div>

                      <select
                        className="bg-slate-100 dark:bg-bg-dark/40 px-4 py-2 rounded-xl border border-slate-200/50 dark:border-border/50 text-xs font-bold outline-none cursor-pointer"
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value as any)}
                      >
                        <option value="all">SEMUA MODUL</option>
                        <option value="manual">TRANSAKSI MANUAL</option>
                        <option value="preorder">PREORDER</option>
                        <option value="debt">HUTANG PIUTANG</option>
                        <option value="wallet">WALLET / QRIS</option>
                        <option value="capital">MODAL TOKO</option>
                      </select>
                    </div>
                  </div>

                  <Timeline
                    transactions={unifiedActivities}
                    currentPage={transacPage}
                    setCurrentPage={setTransacPage}
                    handleEditClick={handleEditClick}
                    handleDeleteTransaction={handleDeleteTransaction}
                    isViewOnly={false}
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
                  activeSubTab={walletSubTab}
                  setActiveSubTab={setWalletSubTab}
                />
              )}

              {activeTab === 'mutasi' && (
                <MutationManager
                  mutations={mutations}
                  walletEntries={walletEntries}
                  summary={summary}
                  loadData={loadData}
                  api={api}
                  storeName={storeName}
                  theme={theme}
                  setActiveTab={setActiveTab}
                  setWalletSubTab={setWalletSubTab}
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
                  handleMarkBoughtItem={handleMarkBoughtItem}
                  sendStockToOwner={sendStockToOwner}
                  isStockUrgent={isStockUrgent}
                  setIsStockUrgent={setIsStockUrgent}
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
                  walletEntries={walletEntries}
                  currentPage={reportPage}
                  setCurrentPage={setReportPage}
                  handleEditClick={handleEditClick}
                  handleDeleteTransaction={handleDeleteTransaction}
                />
              )}

              {activeTab === 'settings' && (
                <div className="flex flex-col gap-8 animate-fade-in pb-20">
                  <header>
                    <h1 className="text-3xl font-semibold flex items-center gap-3">
                      <Settings2 className="text-primary" size={32} /> Pengaturan Sistem
                    </h1>
                    <p className="text-sm text-muted mt-1 italic opacity-60">Konfigurasi Harmony Interface System</p>
                  </header>

                  {/* Horizontal Tab Navigation */}
                  <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 self-start">
                    {[
                      { id: 'identity', label: 'Identitas', icon: Store },
                      { id: 'security', label: 'Keamanan', icon: Shield },
                      { id: 'automation', label: 'Otomasi', icon: Zap },
                      { id: 'visual', label: 'Visual', icon: Palette },
                      { id: 'maintenance', label: 'Pemeliharaan', icon: Trash2 },
                      { id: 'about', label: 'Tentang', icon: Info },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSettingsTab(cat.id as any)}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${settingsTab === cat.id
                          ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                          : 'text-slate-500 hover:text-slate-800 dark:text-muted dark:hover:text-white hover:bg-white dark:hover:bg-white/5'
                          }`}
                      >
                        <cat.icon size={16} />
                        {cat.label.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Settings Content Area */}
                  <div className="mt-2 animate-scale-up">
                    {settingsTab === 'identity' && (
                      <div className="glass-card max-w-3xl">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                            <Store size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">Profil & Identitas</h3>
                            <p className="text-xs text-muted font-bold uppercase tracking-wider opacity-60 italic">Detail visual unit bisnis Anda</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">Nama Toko / Bisnis:</label>
                            <div className="flex gap-3">
                              <input
                                type="text"
                                className="form-input text-lg font-bold flex-1"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                              />
                              <button
                                className="btn btn-primary px-6 py-3 font-bold uppercase tracking-widest text-[10px]"
                                onClick={async () => {
                                  await api.saveSettings({ storeName });
                                  Swal.fire({ title: 'Berhasil!', text: 'Identitas toko diperbarui.', icon: 'success', timer: 1500, showConfirmButton: false });
                                }}
                              >
                                Simpan
                              </button>
                            </div>
                            <p className="text-[11px] text-muted italic ml-1 opacity-50">Nama ini akan tercetak pada laporan PDF dan header aplikasi.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsTab === 'security' && (
                      <div className="glass-card max-w-md">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                            <Shield size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">Keamanan Sistem</h3>
                            <p className="text-xs text-muted font-bold uppercase tracking-wider opacity-60 italic">Proteksi akses data sensitif</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">PIN Keamanan Baru:</label>
                            <div className="relative">
                              <input
                                type={showPIN ? 'text' : 'password'}
                                className="form-input w-full pr-12 py-3.5 text-center tracking-[0.5em] text-xl font-mono font-bold"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="****"
                                maxLength={4}
                              />
                              <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                onClick={() => setShowPIN(!showPIN)}
                              >
                                {showPIN ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>

                          <button
                            className="btn btn-primary w-full py-4 rounded-2xl font-bold uppercase tracking-[0.15em] shadow-lg shadow-primary/20"
                            onClick={async () => {
                              if (newPassword.length < 4) {
                                Swal.fire('Error', 'PIN harus 4 digit.', 'error');
                                return;
                              }
                              await api.saveSettings({ password: newPassword });
                              setSavedPassword(newPassword);
                              localStorage.setItem('cachedPin', newPassword);
                              setNewPassword('');
                              Swal.fire('Berhasil!', 'PIN Keamanan diperbarui.', 'success');
                            }}
                          >
                            Update PIN Kemanan
                          </button>
                        </div>
                      </div>
                    )}

                    {settingsTab === 'automation' && (
                      <div className="glass-card max-w-3xl border-primary/20 dark:bg-primary/5">
                        <div className="flex justify-between items-start mb-8">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                              <Zap size={24} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold">Otomasi Mode</h3>
                              <p className="text-xs text-muted font-bold uppercase tracking-wider opacity-60 italic">Status: {autoConfirm ? 'AUTO-PILOT' : 'MANUAL CONTROL'}</p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              const newVal = !autoConfirm;
                              setAutoConfirm(newVal);
                              await api.saveSettings({ autoConfirm: newVal });
                              Swal.fire({
                                title: newVal ? 'Auto-Pilot AKTIF' : 'Mode Manual AKTIF',
                                icon: 'info',
                                timer: 2000,
                                showConfirmButton: false
                              });
                            }}
                            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoConfirm ? 'bg-primary' : 'bg-slate-300 dark:bg-white/10'}`}
                          >
                            <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoConfirm ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`p-5 rounded-3xl border transition-all ${autoConfirm ? 'bg-emerald-500/10 border-emerald-500/20' : 'opacity-40 border-dashed border-slate-300 dark:border-white/10'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              {autoConfirm ? <Zap className="text-emerald-500" size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Mode Auto-Pilot</h4>
                            </div>
                            <p className="text-[11px] leading-relaxed font-medium text-muted">
                              Sistem akan menyetujui setiap uang masuk tanpa konfirmasi manual. Cocok saat transaksi sedang ramai.
                            </p>
                          </div>

                          <div className={`p-5 rounded-3xl border transition-all ${!autoConfirm ? 'bg-amber-500/10 border-amber-500/20' : 'opacity-40 border-dashed border-slate-300 dark:border-white/10'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              {!autoConfirm ? <Shield className="text-amber-500" size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                              <h4 className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Mode Manual</h4>
                            </div>
                            <p className="text-[11px] leading-relaxed font-medium text-muted">
                              Sistem mencatat sebagai 'Pending'. Wajib diverifikasi via Telegram dengan menekan tombol 'DITERIMA'.
                            </p>
                          </div>
                        </div>

                        {/* Telegram Configuration Section */}
                        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10">
                          <div className="flex items-center gap-3 mb-6 font-bold">
                            <Shield size={20} className="text-primary" />
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary italic">Konfigurasi Bot Telegram</h4>
                          </div>

                          <div className="space-y-4 max-w-xl">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-0.5">Token Bot Telegram (API KEY):</label>
                              <input
                                type="password"
                                className="form-input w-full font-mono text-xs font-bold"
                                placeholder="123456789:ABCDEF..."
                                value={telegramToken}
                                onChange={(e) => setTelegramToken(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-0.5">ID Chat Admin/Group:</label>
                              <input
                                type="text"
                                className="form-input w-full font-mono text-xs font-bold"
                                placeholder="-100123456789"
                                value={telegramChatId}
                                onChange={(e) => setTelegramChatId(e.target.value)}
                              />
                            </div>
                            <button
                              onClick={async () => {
                                await api.saveSettings({ telegramToken, telegramChatId });
                                Swal.fire({ title: 'Tersimpan!', text: 'Kredensial Telegram diperbarui. Restart aplikasi untuk menerapkan.', icon: 'success', timer: 2000, showConfirmButton: false });
                              }}
                              className="btn btn-primary px-8 py-3.5 rounded-2xl font-bold uppercase tracking-widest text-[10px] mt-2 shadow-lg shadow-primary/20"
                            >
                              Simpan Pengaturan Bot
                            </button>
                            <p className="text-[10px] text-muted italic mt-3 opacity-60">
                              *Kredensial disimpan aman di database aplikasi. Pastikan Restart aplikasi agar bot mulai berjalan kembali.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsTab === 'visual' && (
                      <div className="glass-card max-w-3xl">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-500">
                            <Palette size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">Tema & Visual</h3>
                            <p className="text-xs text-muted font-bold uppercase tracking-wider opacity-60">Personalisasi warna aplikasi</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">Warna Aksen Aplikasi:</label>
                            <div className="flex flex-wrap gap-4">
                              {colorPresets.map((preset) => (
                                <button
                                  key={preset.name}
                                  onClick={() => setAccentColor(preset.primary)}
                                  className={`group relative w-14 h-14 rounded-2xl transition-all duration-300 border-4 flex items-center justify-center ${accentColor === preset.primary
                                    ? 'border-primary scale-110 shadow-lg shadow-primary/20'
                                    : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105 bg-slate-100 dark:bg-white/5'
                                    }`}
                                  style={{ backgroundColor: preset.primary }}
                                >
                                  {accentColor === preset.primary && <div className="w-2 h-2 rounded-full bg-white animate-ping" />}
                                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase">{preset.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="pt-8">
                            <p className="text-[11px] text-muted font-medium italic opacity-50">*Perubahan warna akan langsung diterapkan ke seluruh elemen UI.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsTab === 'maintenance' && (
                      <div className="flex flex-col gap-8 animate-fade-in pb-20">
                        {/* Filtered Reset Section */}
                        <div className="glass-card border-amber-500/20 bg-amber-500/5">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                                <Filter size={24} />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400">🛡️ Filter Pembersihan Data</h3>
                                <p className="text-xs text-muted font-bold uppercase tracking-wider opacity-60 italic">Reset Periode Khusus dengan Checklist</p>
                              </div>
                            </div>

                            {/* Guarded Global Reset */}
                            <button
                              onClick={async () => {
                                const { value: pin } = await Swal.fire({
                                  title: 'Verifikasi Keamanan',
                                  text: 'Masukkan PIN untuk Reset Total Seluruh Sistem',
                                  input: 'password',
                                  inputAttributes: {
                                    autocapitalize: 'off',
                                    autocorrect: 'off'
                                  },
                                  inputPlaceholder: '****',
                                  showCancelButton: true,
                                  confirmButtonColor: '#f43f5e',
                                  confirmButtonText: 'Verifikasi PIN'
                                });

                                if (pin === savedPassword) {
                                  const res = await Swal.fire({
                                    title: 'TOTAL WIPE-OUT?',
                                    text: 'SEMUA DATA (Stok, Transaksi, Hutang, Hub) AKAN HILANG PERMANEN!',
                                    icon: 'error',
                                    showCancelButton: true,
                                    confirmButtonColor: '#f43f5e',
                                    confirmButtonText: 'YA, RESET TOTAL!'
                                  });
                                  if (res.isConfirmed) {
                                    await api.resetData({ range: 'all' });
                                    loadData();
                                    Swal.fire('Data Bersih!', 'Sistem kembali ke kondisi awal.', 'success');
                                  }
                                } else if (pin) {
                                  Swal.fire('Gagal', 'PIN yang Anda masukkan salah.', 'error');
                                }
                              }}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all border border-rose-500/20 group"
                            >
                              <Trash2 size={14} className="group-hover:animate-bounce" /> 🔥 Reset Total
                            </button>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left: Date Selection */}
                            <div className="space-y-4 p-5 bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-primary">1. Tentukan Periode</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-0.5">Dari Tanggal:</label>
                                  <input type="date" className="form-input w-full font-bold text-xs" value={resetStart} onChange={(e) => setResetStart(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-0.5">Sampai Tanggal:</label>
                                  <input type="date" className="form-input w-full font-bold text-xs" value={resetEnd} onChange={(e) => setResetEnd(e.target.value)} />
                                </div>
                              </div>
                              <p className="text-[10px] text-muted italic opacity-60 mt-2">*Hanya data di dalam rentang ini yang akan diproses.</p>
                            </div>

                            {/* Right: Modules Checklist */}
                            <div className="space-y-4 p-5 bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">2. Pilih Modul Data</h4>
                                <button
                                  onClick={() => setSelectedModules(['transactions', 'wallet', 'debts', 'preorders', 'stock'])}
                                  className="text-[9px] font-bold uppercase text-primary hover:underline"
                                >
                                  Pilih Semua
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  { id: 'transactions', label: 'Transaksi Manual', icon: FileText },
                                  { id: 'wallet', label: 'Wallet & QRIS', icon: Wallet },
                                  { id: 'debts', label: 'Hutang/Piutang', icon: Handshake },
                                  { id: 'preorders', label: 'Riwayat Pesanan', icon: ShoppingBag },
                                  { id: 'stock', label: 'Riwayat Stok', icon: Package },
                                ].map((mod) => (
                                  <label key={mod.id} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${selectedModules.includes(mod.id) ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-slate-50 dark:bg-white/5 border-transparent opacity-60 hover:opacity-100 hover:border-slate-200 dark:hover:border-white/10'}`}>
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                                      checked={selectedModules.includes(mod.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedModules([...selectedModules, mod.id]);
                                        else setSelectedModules(selectedModules.filter(m => m !== mod.id));
                                      }}
                                    />
                                    <span className="text-[10px] font-bold uppercase tracking-tight flex items-center gap-2">
                                      <mod.icon size={14} className="opacity-70" />
                                      {mod.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-10 flex justify-center">
                            <button
                              onClick={async () => {
                                if (selectedModules.length === 0) {
                                  Swal.fire('Opps!', 'Pilih minimal satu jenis data yang ingin dihapus.', 'info');
                                  return;
                                }
                                const res = await Swal.fire({
                                  title: 'Konfirmasi Pembersihan',
                                  html: `
                                    <div class="text-left p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                                      <p class="text-sm mb-4">Apakah Bapak yakin ingin menghapus data dengan kriteria berikut?</p>
                                      <div class="space-y-3">
                                        <div class="flex justify-between border-b border-dashed border-slate-200 pb-2">
                                          <span class="text-xs font-bold text-muted">PERIODE:</span>
                                          <span class="text-xs font-bold text-rose-500">${resetStart} s/d ${resetEnd}</span>
                                        </div>
                                        <div class="flex justify-between">
                                          <span class="text-xs font-bold text-muted">MODUL TERPILIH:</span>
                                          <span class="text-xs font-bold text-amber-600">${selectedModules.length} Modul</span>
                                        </div>
                                      </div>
                                    </div>
                                    <p class="text-[10px] text-rose-500 font-bold uppercase mt-4 italic">⚠️ DATA TIDAK DAPAT DIKEMBALIKAN!</p>
                                  `,
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonColor: '#f59e0b',
                                  confirmButtonText: 'Iya, Hapus Data!',
                                  cancelButtonText: 'Batal'
                                });

                                if (res.isConfirmed) {
                                  const result = await api.resetData({ range: 'custom', modules: selectedModules, startDate: resetStart, endDate: resetEnd });
                                  if (result.success) {
                                    loadData();
                                    Swal.fire({ title: 'Dibersihkan!', text: 'Data periode terpilih berhasil dihapus.', icon: 'success', timer: 2000, showConfirmButton: false });
                                  } else {
                                    Swal.fire('Gagal!', 'Terjadi kesalahan sistem.', 'error');
                                  }
                                }
                              }}
                              className="btn bg-amber-500 hover:bg-amber-600 text-white px-12 py-4 rounded-2xl font-bold uppercase tracking-[0.15em] shadow-xl shadow-amber-500/20 flex items-center gap-3 transition-all active:scale-95 group"
                            >
                              <Trash2 size={20} className="group-hover:rotate-12 transition-transform" />
                              Bersihkan Data Terpilih
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsTab === 'about' && (
                      <div className="glass-card max-w-4xl flex flex-col items-center text-center py-12">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 animate-pulse">
                          <Settings2 size={48} />
                        </div>
                        <h2 className="title-gradient text-3xl font-black mb-2">DM POS LITE</h2>
                        <p className="text-[11px] font-bold uppercase tracking-[0.4em] opacity-40 mb-8">Harmony Interface System</p>

                        <div className="space-y-2 mb-10">
                          <div className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold uppercase tracking-widest">
                            Version 3.1.6-Lite Stable
                          </div>
                          <p className="text-xs text-muted font-medium italic">"Elevating bookkeeping to an art form."</p>
                        </div>

                        <div className="grid grid-cols-2 gap-8 w-full max-w-sm">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Platform</p>
                            <p className="text-sm font-bold">Windows Desktop</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Database</p>
                            <p className="text-sm font-bold">SQLite JSON Storage</p>
                          </div>
                        </div>

                        <div className="space-y-6 w-full max-w-sm mt-8">
                          {updateStatus && (
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 animate-fade-in">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center justify-center gap-2">
                                {downloadProgress > 0 && downloadProgress < 100 ? <RefreshCw className="animate-spin" size={12} /> : <CheckCircle2 size={12} />}
                                {updateStatus}
                              </p>
                              {downloadProgress > 0 && downloadProgress < 100 && (
                                <div className="w-full h-2 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${downloadProgress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {updateDownloaded ? (
                            <button
                              onClick={() => api.quitAndInstall()}
                              className="btn btn-primary w-full py-4 rounded-2xl font-bold uppercase tracking-[0.15em] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                              <RefreshCw size={18} /> Restart & Update
                            </button>
                          ) : (
                            <button
                              onClick={handleManualCheckUpdate}
                              disabled={updateStatus === 'Mengecek...'}
                              className="btn bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 w-full py-4 rounded-2xl font-bold uppercase tracking-[0.15em] hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                              <Download size={18} className={updateStatus === 'Mengecek...' ? 'animate-spin' : ''} />
                              Cek Pembaruan Sistem
                            </button>
                          )}
                        </div>

                        <div className="mt-12 pt-8 border-t border-border/10 w-full">
                          <p className="text-sm text-muted opacity-30">© 2026 DM ADMIN PRO• All Rights Reserved</p>
                        </div>
                      </div>
                    )}
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
