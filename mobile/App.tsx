import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { db } from './firebaseConfig';
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { TrendingUp, TrendingDown, Wallet, Plus, X, RefreshCw, Archive, LayoutDashboard, History, ShoppingBag, Settings, Moon, Sun, Info, User } from 'lucide-react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'history' | 'settings'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [storeName, setStoreName] = useState('DM POS Mobile');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Date Filtering
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // Theme configuration
  const theme = {
    primary: '#6366f1',
    success: '#22c55e',
    danger: '#ef4444',
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#1e293b',
    subText: isDarkMode ? '#94a3b8' : '#64748b',
    navBg: isDarkMode ? '#111827' : '#ffffff',
    border: isDarkMode ? '#1f2937' : '#e2e8f0',
    inputBg: isDarkMode ? '#0f172a' : '#f1f5f9',
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

      return () => {
        unsubDashboard();
        unsubMeta();
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
        <Text style={styles.cardLabel}>Saldo Kas Toko Berjalan</Text>
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
      <Text style={[styles.tabHeading, { color: theme.text }]}>Persediaan Barang (Stok Menipis)</Text>
      <FlatList
        data={summary?.lowStockItems || []}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={[styles.listItem, { backgroundColor: theme.card }]}>
            <View style={[styles.listItemIcon, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
              <ShoppingBag color={theme.primary} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.listItemTitle, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.listItemSubtitle, { color: theme.subText }]}>{item.dateAdded ? new Date(item.dateAdded).toLocaleDateString('id-ID') : 'Catatan Manual'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={[styles.urgentBadge, { backgroundColor: item.isUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }]}>
                <Text style={[styles.urgentText, { color: item.isUrgent ? theme.danger : '#f59e0b' }]}>
                  {item.isUrgent ? 'Darurat!' : 'Habis'}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Archive color={theme.subText} size={48} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>Tidak ada catatan barang habis.</Text>
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
          <View style={[styles.listItem, { backgroundColor: theme.card }]}>
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
            <Text style={[styles.infoValue, { color: theme.text }]}>v1.2.0-PRO</Text>
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
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'settings' && renderSettings()}
      </View>

      {/* FAB (Only Dashboard) */}
      {activeTab === 'dashboard' && (
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} 
          onPress={() => setModalVisible(true)}
        >
          <Plus color="#fff" size={32} />
        </TouchableOpacity>
      )}

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { backgroundColor: theme.navBg, borderTopColor: theme.border }]}>
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Beranda' },
          { id: 'stock', icon: ShoppingBag, label: 'Stok' },
          { id: 'history', icon: History, label: 'Riwayat' },
          { id: 'settings', icon: Settings, label: 'Pengaturan' }
        ].map((item) => (
          <TouchableOpacity 
            key={item.id}
            style={styles.navItem} 
            onPress={() => setActiveTab(item.id as any)}
          >
            <item.icon color={activeTab === item.id ? theme.primary : theme.subText} size={24} />
            <Text style={[styles.navText, { color: activeTab === item.id ? theme.primary : theme.subText }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
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
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 22, marginBottom: 12 },
  listItemIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  listItemTitle: { fontSize: 14, fontWeight: '700' },
  listItemSubtitle: { fontSize: 11, marginTop: 2 },
  listItemValue: { fontSize: 13, fontWeight: '900', marginTop: 16 },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sourceText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  urgentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  urgentText: { fontSize: 10, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 150 },
  emptyText: { fontSize: 14, marginTop: 12, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 110, right: 20, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8 },
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
  historyHeader: { marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#6366f1', paddingLeft: 12 }
});
