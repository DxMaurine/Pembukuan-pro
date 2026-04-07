import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList, Switch, KeyboardAvoidingView, Platform, Animated, PanResponder, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { db } from './firebaseConfig';
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { TrendingUp, TrendingDown, Wallet, Plus, X, RefreshCw, Archive, LayoutDashboard, History, ShoppingBag, Settings, Moon, Sun, Info, User, Package, CheckCircle, Trash2, Edit3, AlertCircle, ChevronLeft, CreditCard, Landmark, Coins, ChevronRight } from 'lucide-react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'finance' | 'history' | 'settings'>('dashboard');
  const [financeSubTab, setFinanceSubTab] = useState<'main' | 'add' | 'input'>('main');
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [newBalance, setNewBalance] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [storeName, setStoreName] = useState('DM POS Mobile');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  // Stock input states
  const [stockName, setStockName] = useState('');
  const [stockUrgent, setStockUrgent] = useState(false);
  const [submittingStock, setSubmittingStock] = useState(false);

  // Date Filtering
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [accentColor, setAccentColor] = useState('#f43f5e');

  const colorPresets = [
    { name: 'Rose', color: '#f43f5e' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Violet', color: '#8b5cf6' },
    { name: 'Sky', color: '#0ea5e9' },
  ];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // Theme configuration
  const theme = {
    primary: accentColor,
    success: '#22c55e',
    danger: '#ef4444',
    bg: isDarkMode ? '#1e1e1e' : '#f5f5f2',
    card: isDarkMode ? '#2d2d2d' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#1e1e1e',
    subText: isDarkMode ? '#8c8c8c' : '#64748b',
    navBg: isDarkMode ? '#1a1a1a' : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    inputBg: isDarkMode ? '#1a1a1a' : '#f1f5f9',
  };

  useEffect(() => {
    if (!db) return;
    try {
      // Listener 1: Dashboard Data
      const docRef = doc(db, 'mobile_sync', 'dashboard');
      const unsubDashboard = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) setSummary(docSnap.data());
        setLoading(false);
      });

      // Listener 2: Shop Metadata
      const metaRef = doc(db, 'metadata', 'shop_info');
      const unsubMeta = onSnapshot(metaRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.storeName) setStoreName(data.storeName);
        }
      });

      // Listener 3: Mobile Prefs (Accent Color)
      const prefsRef = doc(db, 'metadata', 'mobile_prefs');
      const unsubPrefs = onSnapshot(prefsRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.accentColor) setAccentColor(data.accentColor);
        }
      });

      return () => {
        unsubDashboard();
        unsubMeta();
        unsubPrefs();
      };
    } catch (err) {
      console.error("Firestore initialization error:", err);
      setLoading(false);
    }
  }, []);

  const handleAddExpense = async () => {
    // Clean formatting before saving
    const numericAmount = amount.replace(/\D/g, '');
    if (!numericAmount || !desc) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'mobile_input'), {
        type: 'expense',
        amount: parseInt(numericAmount),
        description: desc,
        category: 'Mobile Input',
        processed: false,
        timestamp: serverTimestamp()
      });
      setModalVisible(false);
      setAmount('');
      setDesc('');
    } catch (e) {
      console.error(e);
      alert('Gagal mengirim data!');
    }
    setSubmitting(false);
  };

  const handleAddStock = async () => {
    if (!stockName.trim()) return;
    setSubmittingStock(true);
    try {
      await addDoc(collection(db, 'mobile_stock_actions'), {
        action: 'add',
        name: stockName.trim(),
        isUrgent: stockUrgent,
        dateAdded: new Date().toISOString(),
        processed: false,
        timestamp: serverTimestamp()
      });
      setStockModalVisible(false);
      setStockName('');
      setStockUrgent(false);
      alert('✅ Barang berhasil dicatat!');
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan barang!');
    }
    setSubmittingStock(false);
  };

  const handleStockDone = (item: any) => {
    Alert.alert('Tandai Sudah Dibeli?', `"${item.name}" akan ditandai sudah dibeli.`, [
      { text: 'Batal', style: 'cancel' },
      { text: '✅ Ya, Sudah Dibeli', onPress: async () => {
        await addDoc(collection(db, 'mobile_stock_actions'), {
          action: 'done', id: item.id, processed: false, timestamp: serverTimestamp()
        });
      }}
    ]);
  };

  const handleStockDelete = (item: any) => {
    Alert.alert('Hapus Catatan?', `"${item.name}" akan dihapus permanen.`, [
      { text: 'Batal', style: 'cancel' },
      { text: '🗑️ Hapus', style: 'destructive', onPress: async () => {
        await addDoc(collection(db, 'mobile_stock_actions'), {
          action: 'delete', id: item.id, processed: false, timestamp: serverTimestamp()
        });
      }}
    ]);
  };

  const handleAddFinanceSource = async () => {
    if (!selectedMethod || !newBalance) return;
    
    // Clean
    const amount = parseInt(newBalance.replace(/\D/g, '')) || 0;
    
    try {
      setLoading(true);
      await addDoc(collection(db, 'mobile_stock_actions'), {
        action: 'add_finance',
        data: {
          ...selectedMethod,
          balance: Number(amount),
          id: selectedMethod.id || Date.now().toString()
        },
        processed: false,
        timestamp: serverTimestamp()
      });
      setFinanceSubTab('main');
      setNewBalance('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFinanceDelete = async (source: any) => {
    try {
      setLoading(true);
      await addDoc(collection(db, 'mobile_stock_actions'), {
        action: 'delete_finance',
        data: { id: source.id, name: source.name },
        processed: false,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFinanceEdit = (source: any) => {
    setSelectedMethod(source);
    setNewBalance('Rp ' + source.balance.toLocaleString('id-ID'));
    setFinanceSubTab('input');
  };

  const handleAccentChange = async (color: string) => {
    setAccentColor(color);
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'metadata', 'mobile_prefs'), { accentColor: color }, { merge: true });
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers, then format with thousand separators
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setAmount(formatted);
  };

  const requestSync = async (m: number, y: number) => {
    try {
      await addDoc(collection(db, 'mobile_sync'), {
        month: m,
        year: y,
        requestedAt: new Date().toISOString()
      });
      // Also update the singleton request doc for the server listener
      const { setDoc } = require('firebase/firestore');
      await setDoc(doc(db, 'mobile_sync', 'request'), {
        month: m,
        year: y,
        requestedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Sync Request Error:", e);
    }
  };

  const handleMonthChange = (m: number) => {
    setFilterMonth(m);
    requestSync(m, filterYear);
  };

  const formatIDR = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Menghubungkan ke Toko...</Text>
      </View>
    );
  }

  const renderDashboard = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Main Balance Card */}
      <View style={[styles.mainCard, { backgroundColor: theme.primary }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardLabel}>Saldo Kas Toko Berjalan</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{summary?.filterLabel?.toUpperCase() || 'HARI INI'}</Text>
          </View>
        </View>
        <Text style={styles.cardValue}>{formatIDR(summary?.balance)}</Text>
        
        {/* Breakdown Row */}
        <View style={styles.breakdownRow}>
           <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Kas Tunai</Text>
              <Text style={styles.breakdownValue}>{formatIDR(summary?.transBalance)}</Text>
           </View>
           <View style={[styles.breakdownItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.breakdownLabel}>Dompet / QRIS</Text>
              <Text style={styles.breakdownValue}>{formatIDR(summary?.walletBalance)}</Text>
           </View>
        </View>

        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.syncInfo}>
            <RefreshCw size={12} color="rgba(255,255,255,0.6)" />
            <Text style={styles.syncText}> Terakhir Sinkron: {summary?.lastSync ? new Date(summary.lastSync).toLocaleTimeString('id-ID') : '--:--'}</Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.card, marginRight: 8 }]}>
          <TrendingUp color={theme.success} size={24} style={{ marginBottom: 8 }} />
          <Text style={[styles.statLabel, { color: theme.subText }]}>Total Masuk</Text>
          <Text style={[styles.statValue, { color: theme.success }]}>{formatIDR(summary?.totalIncome)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, marginLeft: 8 }]}>
          <TrendingDown color={theme.danger} size={24} style={{ marginBottom: 8 }} />
          <Text style={[styles.statLabel, { color: theme.subText }]}>Total Belanja</Text>
          <Text style={[styles.statValue, { color: theme.danger }]}>{formatIDR(summary?.totalExpense)}</Text>
        </View>
      </View>

      {/* Audit Trail Shortcut Card */}
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.card }]} 
        onPress={() => setActiveTab('history')}
      >
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
            <History color={theme.primary} size={24} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Audit Trail Semesta</Text>
            <Text style={[styles.cardDesc, { color: theme.subText }]}>Pantau {summary?.unifiedHistory?.length || 0} riwayat mutasi (Kas & QRIS).</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Stock Summary Card */}
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.card }]} 
        onPress={() => setActiveTab('stock')}
      >
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
            <ShoppingBag color={theme.danger} size={24} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Stok Barang Hub</Text>
            <Text style={[styles.cardDesc, { color: theme.subText }]}>Ada {summary?.stockLowCount || 0} catatan belanja barang.</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Quick Access List */}
      <View style={{ marginTop: 20 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Statistik Cepat</Text>
        <View style={[styles.card, { backgroundColor: theme.card, paddingVertical: 12 }]}>
          <View style={styles.listRow}>
            <Info size={18} color={theme.primary} />
            <Text style={[styles.listRowText, { color: theme.text }]}>Total Catatan Belanja: {summary?.stockLowCount}</Text>
          </View>
          <View style={styles.listRow}>
            <User size={18} color={theme.primary} />
            <Text style={[styles.listRowText, { color: theme.text }]}>Akun Toko: {storeName}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderStock = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabHeading, { color: theme.text }]}>Catatan Barang Habis</Text>
      <FlatList
        data={summary?.lowStockItems || []}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => {
          const translateX = new Animated.Value(0);
          const panResponder = PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
            onPanResponderMove: (_, g) => {
              if (g.dx < 0) translateX.setValue(Math.max(g.dx, -110));
            },
            onPanResponderRelease: (_, g) => {
              if (g.dx < -55) {
                Animated.spring(translateX, { toValue: -110, useNativeDriver: true }).start();
              } else {
                Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
              }
            }
          });
          const isBought = item.status === 'bought';
          return (
            <View style={{ marginHorizontal: 16, marginVertical: 4, borderRadius: 22, overflow: 'hidden', backgroundColor: theme.card }}>
              {/* Action buttons behind (In-Frame) */}
              <View style={[styles.swipeActions, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  style={[styles.swipeBtn, { backgroundColor: '#22c55e' }]}
                  onPress={() => handleStockDone(item)}
                >
                  <CheckCircle color="#fff" size={18} />
                  <Text style={styles.swipeBtnText}>Dibeli</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.swipeBtn, { backgroundColor: '#ef4444' }]}
                  onPress={() => handleStockDelete(item)}
                >
                  <Trash2 color="#fff" size={18} />
                  <Text style={styles.swipeBtnText}>Hapus</Text>
                </TouchableOpacity>
              </View>
              {/* Item row */}
              <Animated.View
                style={[styles.listItem, { backgroundColor: theme.card, transform: [{ translateX }], marginHorizontal: 0, marginVertical: 0, elevation: 0 }]}
                {...panResponder.panHandlers}
              >
                <View style={[styles.listItemIcon, { backgroundColor: isBought ? 'rgba(34,197,94,0.1)' : (item.isUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)') }]}>
                  {isBought ? <CheckCircle color="#22c55e" size={20} /> : item.isUrgent ? <AlertCircle color="#ef4444" size={20} /> : <Package color="#f59e0b" size={20} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listItemTitle, { color: isBought ? theme.subText : theme.text, textDecorationLine: isBought ? 'line-through' : 'none' }]}>{item.name}</Text>
                  <Text style={[styles.listItemSubtitle, { color: theme.subText }]}>
                    {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString('id-ID') : 'Catatan Manual'}
                    {item.source === 'mobile' ? ' • 📱 Mobile' : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.urgentBadge, { backgroundColor: isBought ? 'rgba(34,197,94,0.1)' : item.isUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }]}>
                    <Text style={[styles.urgentText, { color: isBought ? '#22c55e' : item.isUrgent ? theme.danger : '#f59e0b' }]}>
                      {isBought ? '✅ Dibeli' : item.isUrgent ? 'Darurat!' : 'Habis'}
                    </Text>
                  </View>
                  <Text style={[styles.swipeHint, { color: theme.subText }]}>← geser</Text>
                </View>
              </Animated.View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package color={theme.subText} size={48} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>Belum ada catatan barang habis.</Text>
            <Text style={[styles.emptyText, { color: theme.subText, fontSize: 12, marginTop: 4 }]}>Tap tombol + untuk tambah dari HP!</Text>
          </View>
        }
      />
    </View>
  );

  const renderHistory = () => (
    <View style={styles.tabContent}>
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>
          {months.map((m, idx) => (
            <TouchableOpacity 
              key={m} 
              onPress={() => handleMonthChange(idx)}
              style={[styles.monthTab, filterMonth === idx && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              <Text style={[styles.monthTabText, { color: filterMonth === idx ? '#fff' : theme.subText }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.yearRow}>
           <TouchableOpacity onPress={() => { const y = filterYear - 1; setFilterYear(y); requestSync(filterMonth, y); }}>
             <Text style={[styles.yearNav, { color: theme.primary }]}>◀</Text>
           </TouchableOpacity>
           <Text style={[styles.yearText, { color: theme.text }]}>{filterYear}</Text>
           <TouchableOpacity onPress={() => { const y = filterYear + 1; setFilterYear(y); requestSync(filterMonth, y); }}>
             <Text style={[styles.yearNav, { color: theme.primary }]}>▶</Text>
           </TouchableOpacity>
           
           <TouchableOpacity 
            style={[styles.miniSyncBtn, { backgroundColor: theme.card }]} 
            onPress={() => requestSync(filterMonth, filterYear)}
           >
             <RefreshCw size={14} color={theme.primary} />
           </TouchableOpacity>
        </View>
      </View>

      <View style={styles.historyHeader}>
        <Text style={[styles.tabHeading, { color: theme.text, marginBottom: 0 }]}>
           Audit Trail (Kas & Dompet)
        </Text>
      </View>

      <FlatList
        data={summary?.unifiedHistory || []}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 150 }}
        renderItem={({ item }) => (
          <View style={[styles.listItem, { backgroundColor: theme.card, marginBottom: 12 }]}>
            <View style={[styles.listItemIcon, { backgroundColor: item.source === 'manual' ? (item.type === 'income' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)') : 'rgba(99,102,241,0.1)' }]}>
               {item.source === 'wallet' ? (
                 <Wallet color={theme.primary} size={20} />
               ) : (
                 item.type === 'income' ? <TrendingUp color={theme.success} size={20} /> : <TrendingDown color={theme.danger} size={20} />
               )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                 <View style={[styles.sourceBadge, { backgroundColor: item.source === 'wallet' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)' }]}>
                    <Text style={[styles.sourceText, { color: item.source === 'wallet' ? theme.success : theme.primary }]}>
                       {item.source === 'wallet' ? 'QRIS' : 'KAS'}
                    </Text>
                 </View>
                 <Text style={[styles.listItemTitle, { color: theme.text, marginLeft: 6 }]} numberOfLines={1}>
                    {item.description || (item.source === 'wallet' ? 'QRIS Income' : 'Transaksi')}
                 </Text>
              </View>
              <Text style={[styles.listItemSubtitle, { color: theme.subText }]}>{new Date(item.date).toLocaleDateString('id-ID')} • {item.category || '-'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.listItemValue, { color: (item.source === 'wallet' || item.type === 'income') ? theme.success : theme.danger }]}>
                {(item.source === 'wallet' || item.type === 'income') ? '+' : '-'} {formatIDR(item.amount)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <History color={theme.subText} size={48} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>Audit Trail Kosong.</Text>
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: theme.primary, marginTop: 20, paddingHorizontal: 30 }]}
              onPress={() => requestSync(filterMonth, filterYear)}
            >
              <Text style={styles.btnText}>Tarik Data Ulang</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );

  const renderFinance = () => {
    if (financeSubTab === 'add') return renderAddFinanceMethod();
    if (financeSubTab === 'input') return renderInputFinanceBalance();

    return (
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={[styles.tabHeading, { color: theme.text, marginBottom: 0 }]}>Keuangan</Text>
          <TouchableOpacity 
            onPress={() => setFinanceSubTab('add')}
            style={{ backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
          >
            <Plus size={16} color={theme.success} />
            <Text style={{ color: theme.success, fontWeight: 'bold', marginLeft: 4 }}>Tambah</Text>
          </TouchableOpacity>
        </View>

        {/* Section 1: Sumber Dana (Real Data) */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 16, marginBottom: 12 }]}>Sumber dana</Text>
        
        <View style={styles.stackedContainer}>
          {(summary?.financeSources || []).length === 0 ? (
            <View style={[styles.financeEmptyState, { backgroundColor: theme.card, padding: 30 }]}>
               <Info color={theme.subText} size={32} />
               <Text style={{ color: theme.subText, marginTop: 10, textAlign: 'center' }}>Belum ada sumber dana. Klik Tambah untuk mencatat saldo Bank/Dompet Bapak.</Text>
            </View>
          ) : (
            summary.financeSources.map((source: any, idx: number) => {
              const translateX = new Animated.Value(0);
              const panResponder = PanResponder.create({
                onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
                onPanResponderMove: (_, g) => {
                  if (g.dx < 0) translateX.setValue(Math.max(g.dx, -130));
                },
                onPanResponderRelease: (_, g) => {
                  if (g.dx < -65) {
                    Animated.spring(translateX, { toValue: -130, useNativeDriver: true }).start();
                  } else {
                    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
                  }
                }
              });

              return (
                <View key={source.id} style={{ borderRadius: idx === 0 ? 22 : (idx === summary.financeSources.length - 1 ? 22 : 0), overflow: 'hidden', marginBottom: 2 }}>
                  {/* Action buttons behind */}
                  <View style={[styles.swipeActions, { backgroundColor: theme.card, borderRadius: 0 }]}>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      style={[styles.swipeBtn, { backgroundColor: theme.primary }]}
                      onPress={() => handleFinanceEdit(source)}
                    >
                      <Edit3 color="#fff" size={18} />
                      <Text style={styles.swipeBtnText}>Ubah</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.swipeBtn, { backgroundColor: '#ef4444' }]}
                      onPress={() => handleFinanceDelete(source)}
                    >
                      <Trash2 color="#fff" size={18} />
                      <Text style={styles.swipeBtnText}>Hapus</Text>
                    </TouchableOpacity>
                  </View>

                  <Animated.View
                    style={[
                      styles.stackedItem,
                      { backgroundColor: theme.card, transform: [{ translateX }], marginHorizontal: 0 }
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: source.color || theme.primary }]}>
                      {source.name === 'BRI' || source.name === 'BNI' || source.name === 'MANDIRI' ? <Landmark color="#fff" size={20} /> : <Wallet color="#fff" size={20} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.itemLabel, { color: theme.text }]}>{source.name}</Text>
                      <Text style={[styles.itemValue, { color: theme.subText, fontSize: 13 }]}>{formatIDR(source.balance)}</Text>
                    </View>
                    <ChevronRight color={theme.subText} size={20} />
                  </Animated.View>
                </View>
              );
            })
          )}
        </View>

        {/* Section 2: Kas Toko (Built-in) */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 16, marginTop: 24, marginBottom: 12 }]}>Saldo Toko (Sistem)</Text>
        <View style={styles.stackedContainer}>
           <TouchableOpacity style={[styles.stackedItem, styles.stackedAlone, { backgroundColor: theme.card }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#22c55e' }]}>
                 <Wallet color="#fff" size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>Saldo QRIS / Digital</Text>
                <Text style={[styles.itemValue, { color: theme.subText, fontSize: 13 }]}>{formatIDR(summary?.walletBalance)}</Text>
              </View>
           </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderAddFinanceMethod = () => (
    <View style={styles.tabContent}>
      <View style={styles.modalHeader}>
         <TouchableOpacity onPress={() => setFinanceSubTab('main')}>
            <ChevronLeft color={theme.text} size={28} />
         </TouchableOpacity>
         <Text style={[styles.modalTitle, { color: theme.text, marginLeft: 10 }]}>Tambah Metode</Text>
      </View>
      
      <ScrollView>
        <Text style={[styles.sectionTitle, { color: theme.subText, fontSize: 14, marginBottom: 15 }]}>Pilih Bank atau E-Wallet rujukan Bapak</Text>
        
        <View style={styles.stackedContainer}>
          {[
            { name: 'BRI', type: 'Bank', color: '#00529C', icon: 'Landmark' },
            { name: 'MANDIRI', type: 'Bank', color: '#FDB813', icon: 'Landmark' },
            { name: 'BNI', type: 'Bank', color: '#F15A24', icon: 'Landmark' },
            { name: 'DANA', type: 'E-Wallet', color: '#118EEA', icon: 'Wallet' },
            { name: 'GOPAY', type: 'E-Wallet', color: '#00AED6', icon: 'Wallet' }
          ].map((item, idx, arr) => (
            <TouchableOpacity 
              key={item.name}
              style={[
                styles.stackedItem,
                idx === 0 && styles.stackedTop,
                idx === arr.length - 1 && styles.stackedBottom,
                { backgroundColor: theme.card }
              ]}
              onPress={() => {
                setSelectedMethod(item);
                setFinanceSubTab('input');
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                {item.icon === 'Landmark' ? <Landmark color="#fff" size={20} /> : <Wallet color="#fff" size={20} />}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>{item.name}</Text>
                <Text style={{ color: theme.subText, fontSize: 12 }}>{item.type}</Text>
              </View>
              <Plus color={theme.success} size={20} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderInputFinanceBalance = () => (
    <View style={styles.tabContent}>
      <View style={styles.modalHeader}>
         <TouchableOpacity onPress={() => setFinanceSubTab('add')}>
            <ChevronLeft color={theme.text} size={28} />
         </TouchableOpacity>
         <Text style={[styles.modalTitle, { color: theme.text, marginLeft: 10 }]}>Input Saldo {selectedMethod?.name}</Text>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={[styles.settingGroup, { backgroundColor: theme.card, padding: 20 }]}>
           <Text style={[styles.inputLabel, { color: theme.subText }]}>Nominal Saldo Saat Ini (Rp)</Text>
           <TextInput
             style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, height: 60, fontSize: 24, fontWeight: 'bold' }]}
             keyboardType="numeric"
             placeholder="0"
             placeholderTextColor={theme.subText}
             value={newBalance}
             onChangeText={(t) => {
                const cleaned = t.replace(/\D/g, '');
                setNewBalance(cleaned ? 'Rp ' + parseInt(cleaned).toLocaleString('id-ID') : '');
             }}
             autoFocus
           />
           
           <TouchableOpacity 
             onPress={handleAddFinanceSource}
             style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 30, height: 55 }]}
           >
             <Text style={styles.actionBtnText}>Simpan Catatan Saldo</Text>
           </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabHeading, { color: theme.text }]}>Pengaturan Aplikasi</Text>
      
      {/* Profile Section */}
      <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
        <View style={[styles.profileIcon, { backgroundColor: theme.primary }]}>
          <User color="#fff" size={32} />
        </View>
        <Text style={[styles.profileName, { color: theme.text }]}>{storeName || 'DM FOTOCOPY'}</Text>
        <Text style={[styles.profileRole, { color: theme.subText }]}>Owner Dashboard Pro</Text>
      </View>

      {/* Theme Settings */}
      <View style={[styles.settingGroup, { backgroundColor: theme.card }]}>
        <View style={styles.settingItem}>
          <View style={styles.row}>
            {isDarkMode ? <Moon color={theme.primary} size={20} /> : <Sun color={theme.primary} size={20} />}
            <Text style={[styles.settingLabel, { color: theme.text }]}>Mode Gelap</Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor={'#fff'}
            onValueChange={() => setIsDarkMode(!isDarkMode)}
            value={isDarkMode}
          />
        </View>

        {/* Accent Selector (Below Theme) */}
        <View style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 4, paddingTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.row}>
              <LayoutDashboard color={theme.primary} size={20} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Pilihan Aksen</Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
              {colorPresets.map((preset) => (
                <TouchableOpacity
                  key={preset.color}
                  onPress={() => handleAccentChange(preset.color)}
                  style={[
                    styles.accentCircle,
                    { backgroundColor: preset.color },
                    accentColor === preset.color && { borderWidth: 3, borderColor: theme.text }
                  ]}
                >
                  {accentColor === preset.color && <CheckCircle color="#fff" size={14} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Server Info */}
      <View style={{ marginTop: 20 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Informasi Sistem</Text>
        <View style={[styles.settingGroup, { backgroundColor: theme.card, padding: 20 }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.subText }]}>Status Server</Text>
            <View style={styles.row}>
              <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.infoValue, { color: theme.success }]}>Online (Socket)</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.subText }]}>Nama Toko</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{storeName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.subText }]}>No. Kasir</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{summary?.settings?.cashierNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.subText }]}>Versi Aplikasi</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>v3.1.6-Lite</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{storeName}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subText }]}>COMPANION DASHBOARD</Text>
        </View>
        <TouchableOpacity style={[styles.statusBadge, { backgroundColor: isDarkMode ? 'rgba(34,197,94,0.1)' : '#dcfce7' }]}>
          <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.statusText, { color: theme.success }]}>Live</Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <View style={{ flex: 1 }}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'stock' && renderStock()}
        {activeTab === 'finance' && renderFinance()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'settings' && renderSettings()}
      </View>

      {/* FAB (Only Dashboard) */}
      {/* FAB (Only Dashboard) */}
      {activeTab === 'dashboard' && (
        <View style={styles.fabContainer}>
          {showFabMenu && (
            <>
              <View style={styles.fabMenuOverlay}>
                <TouchableOpacity style={[styles.fabMenuItem, { backgroundColor: theme.primary }]} onPress={() => { setShowFabMenu(false); setModalVisible(true); }}>
                  <TrendingDown color="#fff" size={20} />
                  <Text style={styles.fabMenuText}>Pengeluaran</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.fabMenuItem, { backgroundColor: '#f59e0b' }]} onPress={() => { setShowFabMenu(false); setStockModalVisible(true); }}>
                  <Package color="#fff" size={20} />
                  <Text style={styles.fabMenuText}>Barang Habis</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.fabOverlayBg} onPress={() => setShowFabMenu(false)} />
            </>
          )}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: showFabMenu ? '#64748b' : theme.primary, shadowColor: theme.primary }]}
            onPress={() => setShowFabMenu(!showFabMenu)}
          >
            {showFabMenu ? <X color="#fff" size={28} /> : <Plus color="#fff" size={32} />}
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { backgroundColor: theme.navBg, borderTopColor: theme.border, height: 75 }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('dashboard')}>
          <LayoutDashboard color={activeTab === 'dashboard' ? theme.primary : theme.subText} size={24} />
          <Text style={[styles.navText, { color: activeTab === 'dashboard' ? theme.primary : theme.subText }]}>Beranda</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('stock')}>
          <ShoppingBag color={activeTab === 'stock' ? theme.primary : theme.subText} size={24} />
          <Text style={[styles.navText, { color: activeTab === 'stock' ? theme.primary : theme.subText }]}>Stok</Text>
        </TouchableOpacity>

        {/* Center Wallet Button */}
        <TouchableOpacity 
          style={[styles.centerNavItem, { backgroundColor: activeTab === 'finance' ? theme.primary : '#333' }]} 
          onPress={() => setActiveTab('finance')}
        >
          <Wallet color="#fff" size={28} />
          <View style={styles.centerBadge}>
             <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold' }}>PRO</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('history')}>
          <History color={activeTab === 'history' ? theme.primary : theme.subText} size={24} />
          <Text style={[styles.navText, { color: activeTab === 'history' ? theme.primary : theme.subText }]}>Riwayat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('settings')}>
          <Settings color={activeTab === 'settings' ? theme.primary : theme.subText} size={24} />
          <Text style={[styles.navText, { color: activeTab === 'settings' ? theme.primary : theme.subText }]}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Quick Expense */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBg}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Input Pengeluaran Cepat</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={theme.subText} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.subText }]}>Nominal (Rp)</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} 
                  keyboardType="numeric" 
                  value={amount} 
                  onChangeText={handleAmountChange} 
                  placeholder="0"
                  placeholderTextColor={theme.subText}
                  autoFocus
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.subText }]}>Keterangan</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} 
                  value={desc} onChangeText={setDesc}
                />
              </View>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={handleAddExpense}>
                <Text style={styles.btnText}>📲 Simpan ke Server Toko</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Input Barang Habis */}
      <Modal animationType="slide" transparent={true} visible={stockModalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>📦 Catat Barang Habis</Text>
              <TouchableOpacity onPress={() => { setStockModalVisible(false); setStockName(''); setStockUrgent(false); }}>
                <X color={theme.subText} size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.subText }]}>Nama Barang *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
                value={stockName}
                onChangeText={setStockName}
                placeholder="Contoh: Kertas A4, Tinta Printer..."
                placeholderTextColor={theme.subText}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.urgentToggle, { backgroundColor: stockUrgent ? 'rgba(239,68,68,0.1)' : theme.inputBg, borderColor: stockUrgent ? '#ef4444' : theme.border }]}
              onPress={() => setStockUrgent(!stockUrgent)}
            >
              <AlertCircle color={stockUrgent ? '#ef4444' : theme.subText} size={20} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.inputLabel, { color: stockUrgent ? '#ef4444' : theme.text, marginBottom: 0 }]}>Tandai MENDESAK 🚨</Text>
                <Text style={[styles.inputLabel, { color: theme.subText, fontSize: 11, fontWeight: '400' }]}>Prioritas tinggi untuk segera dibeli</Text>
              </View>
              <View style={[styles.checkbox, { backgroundColor: stockUrgent ? '#ef4444' : 'transparent', borderColor: stockUrgent ? '#ef4444' : theme.subText }]}>
                {stockUrgent && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#f59e0b', marginTop: 20 }]}
              onPress={handleAddStock}
              disabled={submittingStock}
            >
              {submittingStock ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>📦 Simpan Catatan Barang</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  headerSubtitle: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 150 },
  tabContent: { flex: 1, paddingHorizontal: 20 },
  tabHeading: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  mainCard: { borderRadius: 30, padding: 24, marginBottom: 20, elevation: 5 },
  cardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  cardValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginVertical: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  breakdownItem: { flex: 1 },
  breakdownLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  breakdownValue: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 2 },
  divider: { height: 1.5, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 16 },
  syncInfo: { flexDirection: 'row', alignItems: 'center' },
  syncText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 24, padding: 20, elevation: 2 },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '800' },
  card: { borderRadius: 24, padding: 20, marginBottom: 16, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardDesc: { fontSize: 12, marginTop: 4 },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  listRowText: { marginLeft: 12, fontSize: 13, fontWeight: '600' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 22 },
  listItemIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  listItemTitle: { fontSize: 14, fontWeight: '700' },
  listItemSubtitle: { fontSize: 11, marginTop: 2 },
  listItemValue: { fontSize: 13, fontWeight: '900', marginTop: 16 },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sourceText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  urgentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  urgentText: { fontSize: 10, fontWeight: '900' },
  historyHeader: { marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#6366f1', paddingLeft: 12 },
  // Swipe Actions
  swipeActions: { position: 'absolute', right: 0, left: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' },
  swipeBtn: { width: 60, height: '100%', justifyContent: 'center', alignItems: 'center' },
  swipeBtnText: { color: '#fff', fontSize: 10, fontWeight: '800', marginTop: 3 },
  swipeHint: { fontSize: 9, fontWeight: '600', marginTop: 4, opacity: 0.5 },
  // FAB Menu
  fabContainer: { position: 'absolute', bottom: 100, right: 20, alignItems: 'flex-end', zIndex: 999 },
  fabMenuOverlay: { marginBottom: 12, gap: 10, alignItems: 'flex-end' },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, gap: 10, elevation: 5, minWidth: 140, justifyContent: 'flex-end' },
  fabMenuText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  fabOverlayBg: { position: 'absolute', top: -2000, bottom: -100, left: -1000, right: -100, zIndex: -1 },
  // Stock Modal extras
  urgentToggle: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1.5, marginTop: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },

  emptyText: { fontSize: 14, marginTop: 12, fontWeight: '600' },
  fab: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  bottomNav: { flexDirection: 'row', paddingBottom: 30, paddingTop: 12, borderTopWidth: 1 },
  navItem: { flex: 1, alignItems: 'center' },
  navText: { fontSize: 10, marginTop: 4, fontWeight: '700' },
  // Settings Tab
  profileCard: { padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 20 },
  profileIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 20, fontWeight: '900' },
  profileRole: { fontSize: 12, marginTop: 2 },
  settingGroup: { borderRadius: 24, overflow: 'hidden' },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  settingLabel: { marginLeft: 12, fontSize: 15, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '800' },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input: { borderRadius: 16, padding: 16, fontSize: 18, fontWeight: '700' },
  btn: { padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  // Filter History
  filterSection: { marginBottom: 20 },
  monthScroll: { paddingVertical: 10 },
  monthTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)', marginRight: 8 },
  monthTabText: { fontSize: 12, fontWeight: '800' },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 15 },
  yearNav: { fontSize: 20, fontWeight: '900' },
  yearText: { fontSize: 18, fontWeight: '900', minWidth: 60, textAlign: 'center' },
  miniSyncBtn: { padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)' },
  accentCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  
  // Finance UI Styles
  stackedContainer: { borderRadius: 24, overflow: 'hidden' },
  stackedItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  stackedTop: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  stackedMiddle: { borderBottomWidth: 1 },
  stackedBottom: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderBottomWidth: 0 },
  stackedAlone: { borderRadius: 24, borderBottomWidth: 0 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  itemLabel: { fontSize: 15, fontWeight: '600' },
  itemValue: { marginTop: 2 },
  
  // Bottom Nav Center Button
  centerNavItem: {
    width: 65,
    height: 65,
    borderRadius: 33,
    marginTop: -30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#1e1e1e'
  },
  centerBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  emptyState: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  financeEmptyState: { 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  actionBtn: {
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
