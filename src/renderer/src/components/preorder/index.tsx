import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingBag,
  Plus,
  Search,
  Calendar,
  User,
  Wrench,
  Trash2,
  Edit2,
  Eye,
  Clock,
  Info,
  CheckCircle2,
  X,
  MessageSquare,
  Package,
  Calculator,
  FileText,
  Send,
  ChevronLeft,
  ChevronRight,
  Printer,
  Palette,
  CheckCheck,
  RotateCcw
} from 'lucide-react';
import Swal from 'sweetalert2';
import { formatIDR, unformatIDR } from '../../utils/formatters';
import { generatePreorderInvoicePDF } from '../../utils/pdf';

interface OrderItem {
  id: string;
  name: string;
  bahan: string;
  p: number;
  l: number;
  qty: number;
  price: number;
  total: number;
  isBanner: boolean;
  notes?: string;
}

interface Preorder {
  id: number;
  customerName: string;
  serviceName: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  dueDate: string;
  notes: string;
  status: 'pending' | 'designing' | 'printing' | 'completed' | 'canceled';
  createdAt: string;
  items?: OrderItem[];
}

interface PreorderManagerProps {
  preorders: Preorder[];
  loadData: () => void;
  api: any;
  storeName: string;
}

const PreorderManager: React.FC<PreorderManagerProps> = ({ preorders, loadData, api, storeName }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPreorder, setSelectedPreorder] = useState<Preorder | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [preorderStep, setPreorderStep] = useState<'config' | 'input'>('config');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;

  const [formData, setFormData] = useState({
    customerName: '',
    serviceName: '',
    totalAmount: '0',
    downPayment: '0',
    dueDate: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'pending' as any
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { id: Math.random().toString(36).substr(2, 9), name: '', bahan: '', p: 1, l: 1, qty: 1, price: 0, total: 0, isBanner: false, notes: '' }
  ]);

  useEffect(() => {
    if (orderItems.length > 0) {
      const mainService = orderItems[0].name || 'Pesanan';
      const count = orderItems.length;
      const combined = count > 1 ? `${mainService} + ${count - 1} lainnya` : mainService;
      setFormData(prev => ({ ...prev, serviceName: combined }));
    }
  }, [orderItems]);

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      id: Math.random().toString(36).substr(2, 9),
      name: '', bahan: '', p: 1, l: 1, qty: 1, price: 0, total: 0, isBanner: false, notes: ''
    }]);
  };

  const removeOrderItem = (id: string) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter(item => item.id !== id));
    }
  };

  const updateOrderItem = (id: string, field: keyof OrderItem, value: any) => {
    setOrderItems(orderItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (updatedItem.isBanner) {
          updatedItem.total = Math.round((updatedItem.p || 0) * (updatedItem.l || 0) * (updatedItem.qty || 0) * (updatedItem.price || 0));
        } else {
          updatedItem.total = Math.round((updatedItem.qty || 0) * (updatedItem.price || 0));
        }
        return updatedItem;
      }
      return item;
    }));
  };

  useEffect(() => {
    const total = Math.round(orderItems.reduce((sum, item) => sum + item.total, 0));
    setFormData(prev => ({ ...prev, totalAmount: total.toString() }));
  }, [orderItems]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">Pending</span>;
      case 'designing': return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-600 border border-blue-200 animate-pulse">Designing</span>;
      case 'printing': return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-600 border border-amber-200">Printing</span>;
      case 'completed': return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-600 border border-emerald-200">Selesai</span>;
      case 'canceled': return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-600 border border-rose-200">Batal</span>;
      default: return null;
    }
  };

  // Validasi bersama sebelum save
  const validateForm = () => {
    const total = parseFloat(unformatIDR(formData.totalAmount)) || 0;
    const dp = parseFloat(unformatIDR(formData.downPayment)) || 0;
    if (orderItems.some(item => !item.name.trim())) {
      Swal.fire('Peringatan', 'Nama barang belum diisi Pak!', 'warning');
      return null;
    }
    return { ...formData, totalAmount: total, downPayment: dp, remainingAmount: total - dp, items: orderItems };
  };

  // CATAT saja — simpan ke DB, tidak kirim Telegram
  const handleSaveSilent = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) return;
    try {
      if (editingId) {
        await api.updatePreorder({ ...payload, id: editingId });
      } else {
        await api.addPreorderSilent(payload);
      }
      setShowModal(false); setEditingId(null); setPreorderStep('config'); resetForm(); loadData();
      Swal.fire({ title: 'Tersimpan!', text: 'Pesanan dicatat tanpa notifikasi.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan data.', 'error');
    }
  };

  // KIRIM SPK — simpan ke DB + kirim laporan ke Telegram owner
  const handleSaveAndSendSPK = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) return;
    try {
      if (editingId) {
        await api.updatePreorder({ ...payload, id: editingId });
        // Kirim notifikasi manual untuk edit
        await api.notifyPreorder({ ...payload, id: editingId });
      } else {
        await api.addPreorder(payload); // otomatis trigger Telegram di server
      }
      setShowModal(false); setEditingId(null); setPreorderStep('config'); resetForm(); loadData();
      Swal.fire({ title: 'SPK Terkirim!', text: 'Pesanan disimpan & laporan dikirim ke Telegram.', icon: 'success', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan atau mengirim SPK.', 'error');
    }
  };


  const resetForm = () => {
    setFormData({
      customerName: '',
      serviceName: '',
      totalAmount: '0',
      downPayment: '0',
      dueDate: new Date().toISOString().split('T')[0],
      notes: '',
      status: 'pending'
    });
    setOrderItems([{ id: Math.random().toString(36).substr(2, 9), name: '', bahan: '', p: 1, l: 1, qty: 1, price: 0, total: 0, isBanner: false }]);
  };

  const handleEdit = (p: Preorder) => {
    setEditingId(p.id);
    setFormData({ customerName: p.customerName, serviceName: p.serviceName, totalAmount: p.totalAmount.toString(), downPayment: p.downPayment.toString(), dueDate: p.dueDate, notes: p.notes, status: p.status });
    if (p.items && p.items.length > 0) {
      setOrderItems(p.items);
    } else {
      setOrderItems([{ id: Math.random().toString(36).substr(2, 9), name: p.serviceName, bahan: '', p: 1, l: 1, qty: 1, price: p.totalAmount, total: p.totalAmount, isBanner: false }]);
    }
    setPreorderStep('input');
    setShowModal(true);
  };

  const handleUpdatePreorderStatus = async (preorder: Preorder, newStatus: Preorder['status']) => {
    try {
      await api.updatePreorder({ ...preorder, status: newStatus });
      loadData();
      // Update selectedPreorder so the modal UI reflects the change
      setSelectedPreorder(prev => prev ? { ...prev, status: newStatus } : null);
      
      const statusText = newStatus === 'completed' ? 'Selesai' : (newStatus === 'canceled' ? 'Dibatalkan' : newStatus);
      Swal.fire({ 
        title: 'Status Diperbarui!', 
        text: `Pesanan telah ditandai sebagai ${statusText}.`, 
        icon: 'success', 
        timer: 1500, 
        showConfirmButton: false 
      });
    } catch (err) {
      Swal.fire('Error', 'Gagal memperbarui status.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({ title: 'Hapus?', text: "Data pesanan akan dihapus permanen!", icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus' });
    if (result.isConfirmed) {
      await api.deletePreorder(id);
      loadData();
      Swal.fire({ title: 'Terhapus!', icon: 'success', timer: 1500, showConfirmButton: false });
    }
  };

  const filteredPreorders = preorders.filter(p => p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || p.serviceName.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalUnpaid = preorders.reduce((sum, p) => p.status !== 'completed' && p.status !== 'canceled' ? sum + p.remainingAmount : sum, 0);

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <ShoppingBag className="text-primary" size={32} /> Manajemen Pesanan
          </h1>
          <p className="text-muted dark:text-muted mt-1 italic text-sm opacity-60">Pencatatan antrian cetak & jasa percetakan.</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setPreorderStep('config'); resetForm(); setShowModal(true); }}
          className="btn btn-primary px-8 py-3.5 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-3 hover:scale-103 transition-transform font-bold text-[10px] uppercase tracking-widest"
        >
          <Plus size={18} /> Tambah Proyek
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-5 border-l-4 border-primary">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted dark:text-muted">Antrian</span>
            <Clock className="text-primary" size={16} />
          </div>
          <div className="text-2xl font-bold">{preorders.filter(p => p.status !== 'completed' && p.status !== 'canceled').length}</div>
          <p className="text-[9px] text-muted dark:text-muted uppercase font-bold opacity-60">On Process</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-amber-500">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted dark:text-muted">Piutang</span>
            <Calculator className="text-amber-500" size={16} />
          </div>
          <div className="text-2xl font-bold text-amber-500">Rp {formatIDR(totalUnpaid)}</div>
          <p className="text-[9px] text-muted dark:text-muted uppercase font-bold opacity-60">Pending Payment</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-emerald-500">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted dark:text-muted">Done</span>
            <CheckCircle2 className="text-emerald-500" size={16} />
          </div>
          <div className="text-2xl font-bold text-emerald-500">{preorders.filter(p => p.status === 'completed').length}</div>
          <p className="text-[9px] text-muted dark:text-muted uppercase font-bold opacity-60">Completed</p>
        </div>
      </div>

      <div className="glass-card flex items-center gap-4 px-6 py-3.5">
        <Search className="text-muted shrink-0" size={18} />
        <input
          type="text"
          placeholder="Cari pesanan..."
          className="bg-transparent border-none outline-none w-full font-bold text-xs uppercase"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(() => {
          const totalPages = Math.ceil(filteredPreorders.length / entriesPerPage) || 1;
          const currentEntries = filteredPreorders.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

          if (filteredPreorders.length === 0) {
            return (
              <div className="glass-card py-16 flex flex-col items-center justify-center opacity-30">
                <ShoppingBag size={48} className="mb-4 stroke-[1px]" />
                <p className="font-bold text-xs uppercase tracking-[0.3em]">Antrian Kosong</p>
              </div>
            );
          }

          return (
            <>
              {currentEntries.map((p) => (
                <div key={p.id} className="glass-card p-4 group hover:border-primary/20 transition-all duration-300 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-5 items-center">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                      <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-md font-bold truncate uppercase tracking-tight italic">{p.customerName}</h3>
                        {getStatusBadge(p.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[10px] text-muted dark:text-muted font-bold uppercase opacity-60">
                        <span className="flex items-center gap-1.5"><Wrench size={12} className="text-primary" /> {p.serviceName}</span>
                        <span className="flex items-center gap-1.5"><Calendar size={12} className="text-primary" /> {p.dueDate}</span>
                        {p.notes && <span className="flex items-center gap-1.5 font-normal"><MessageSquare size={12} /> {p.notes}</span>}
                      </div>
                    </div>
                    <div className="flex gap-8 items-center shrink-0">
                      <div className="text-right">
                        <div className="text-[9px] font-bold uppercase text-muted dark:text-muted tracking-widest mb-0.5">Kontrak</div>
                        <div className="text-md font-bold italic">Rp {formatIDR(p.totalAmount)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-bold uppercase text-muted dark:text-muted tracking-widest mb-0.5">Sisa</div>
                        {p.remainingAmount > 0 ? (
                          <div className="text-[9px] font-bold text-rose-500 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">Rp {formatIDR(p.remainingAmount)}</div>
                        ) : (
                          <div className="text-[9px] font-bold text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">LUNAS</div>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { setSelectedPreorder(p); setShowDetailModal(true); }}
                          className="p-2.5 rounded-lg bg-primary/5 hover:bg-primary hover:text-white transition-all text-primary border border-primary/20"
                          title="Lihat Detail"
                        >
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleEdit(p)} className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-white transition-all text-muted"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white transition-all text-muted"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4 py-4 border-t border-slate-200 dark:border-white/5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn p-3 bg-slate-100 dark:bg-white/5 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-slate-200 dark:hover:bg-white/10 shadow-sm"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex items-center gap-1.5 px-4">
                    <span className="text-sm font-black text-primary">{currentPage}</span>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-tighter opacity-40">dari</span>
                    <span className="text-sm font-black text-muted">{totalPages}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn p-3 bg-slate-100 dark:bg-white/5 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-slate-200 dark:hover:bg-white/10 shadow-sm"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {showModal ? createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[110] px-4 py-4 overflow-hidden">
          <div className="w-full flex justify-center items-center">
            <div className={`w-full ${preorderStep === 'config' ? 'max-w-[480px]' : 'max-w-5xl'} max-h-[95vh] relative flex flex-col animate-scale-up bg-bg-light dark:bg-bg-dark border border-slate-200 dark:border-border rounded-[1.8rem] overflow-hidden shadow-2xl transition-all duration-500 ease-in-out`}>

              <div className="px-8 py-5 bg-slate-900 dark:bg-black text-white flex justify-between items-center shrink-0 border-b border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-full bg-primary/10 -skew-x-12 transform translate-x-32" />
                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-rose-600 flex items-center justify-center text-white shadow-xl shadow-primary/20">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight italic">Formulir Pesanan {editingId ? `Edit #${editingId}` : 'Baru'}</h2>
                    <p className="text-white/40 text-[9px] font-bold tracking-[0.4em] uppercase">v3.1.6-Lite Harmony System</p>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all opacity-60 hover:opacity-100 group" onClick={() => { setShowModal(false); setPreorderStep('config'); }}>
                  <X size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin scrollbar-thumb-primary/20">
                {preorderStep === 'config' ? (
                  /* --- STEP 1: CONFIGURATION (PORTRAIT) --- */
                  <div className="space-y-8 animate-fade-in py-4">
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Info size={20} />
                      </div>
                      <p className="text-xs text-muted leading-relaxed italic">Input Nama Pelanggan dan Status Antrian terlebih dahulu sebelum memasukkan detail barang cetakan.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2 ml-1">
                          <User size={12} /> Nama Pelanggan / Instansi
                        </label>
                        <input
                          autoFocus
                          required
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-primary px-5 py-4 rounded-2xl outline-none font-semibold text-sm shadow-sm transition-all dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 italic"
                          placeholder="Input nama pemesan..."
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted dark:text-muted flex items-center gap-2 ml-1">
                            <Clock size={12} /> Status Antrian
                          </label>
                          <select
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-primary px-5 py-4 rounded-2xl outline-none font-semibold text-sm shadow-sm transition-all dark:text-white cursor-pointer uppercase tracking-tighter italic appearance-none"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          >
                            <option value="pending" className="bg-white dark:bg-bg-dark text-slate-900 dark:text-white">PENDING (ANTRIAN)</option>
                            <option value="designing" className="bg-white dark:bg-bg-dark text-slate-900 dark:text-white">DESIGNING (PROSES)</option>
                            <option value="printing" className="bg-white dark:bg-bg-dark text-slate-900 dark:text-white">PRINTING (CETAK)</option>
                            <option value="completed" className="bg-white dark:bg-bg-dark text-slate-900 dark:text-white">COMPLETED (SIAP)</option>
                            <option value="canceled" className="bg-white dark:bg-bg-dark text-slate-900 dark:text-white">CANCELED (BATAL)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted dark:text-muted flex items-center gap-2 ml-1">
                            <Calendar size={12} /> Estimasi Selesai
                          </label>
                          <input
                            type="date"
                            required
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-primary px-5 py-4 rounded-2xl outline-none font-semibold text-sm shadow-sm transition-all dark:text-white cursor-pointer italic"
                            value={formData.dueDate}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2 ml-1">
                            <MessageSquare size={12} /> Catatan Utama / Instruksi Khusus
                          </label>
                          <textarea
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-primary px-5 py-4 rounded-2xl outline-none font-semibold text-xs shadow-sm transition-all dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 italic min-h-[80px] resize-none"
                            placeholder="Tulis instruksi umum (misal: pengerjaan express, diambil jam 4 sore, dsb)..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!formData.customerName}
                      onClick={() => setPreorderStep('input')}
                      className="w-full bg-primary hover:bg-primary-hover text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-primary/20 transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-xs"
                    >
                      Lanjutkan Detail Item <ChevronRight size={18} />
                    </button>
                  </div>
                ) : (
                  /* --- STEP 2: DETAILS (LANDSCAPE) --- */
                  <div className="animate-fade-in space-y-10">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
                      <div className="flex gap-8">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted opacity-60 mb-1">Pelanggan</p>
                          <p className="text-sm font-bold uppercase italic">{formData.customerName}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted opacity-60 mb-1">Deadline</p>
                          <p className="text-sm font-bold italic">{formData.dueDate}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreorderStep('config')}
                        className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter"
                      >
                         Ubah Data Dasar ✎
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-center px-1">
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-800 dark:text-white italic flex items-center gap-3">
                            Daftar Spesifikasi Produk
                            <span className="px-2 py-0.5 rounded bg-primary text-white text-[9px] not-italic font-bold">{orderItems.length} ITEM</span>
                          </h3>
                          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1 opacity-60">Rincian dimensi, qty, dan harga</p>
                        </div>
                        <button
                          type="button"
                          onClick={addOrderItem}
                          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-2xl text-[10px] font-bold tracking-widest flex items-center gap-3 shadow-lg shadow-primary/20 hover:scale-105 transition-all uppercase"
                        >
                          <Plus size={16} /> Tambah Barang
                        </button>
                      </div>

                      <div className="space-y-6">
                        {orderItems.map((item, idx) => (
                          <div key={item.id} className="relative animate-slide-up group" style={{ animationDelay: `${idx * 0.1}s` }}>
                            <div className={`p-6 rounded-[2rem] border transition-all duration-300 ${item.isBanner ? 'bg-primary/5 border-primary/20 shadow-primary/5' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 shadow-sm'}`}>
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                {/* Primary Info */}
                                <div className="lg:col-span-12 xl:col-span-7 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted opacity-60 px-1">Nama Barang / Jasa Cetak</label>
                                      <input
                                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-5 py-3.5 rounded-2xl outline-none font-semibold text-sm italic focus:border-primary transition-all dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20"
                                        placeholder="Spanduk, Kartu Nama, Jasa Design..."
                                        value={item.name}
                                        onChange={(e) => updateOrderItem(item.id, 'name', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted opacity-60 px-1">Material / Bahan</label>
                                      <input
                                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-5 py-3.5 rounded-2xl outline-none font-semibold text-sm italic focus:border-primary transition-all dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20"
                                        placeholder="Flexi 340, Art Carton 260, dll"
                                        value={item.bahan}
                                        onChange={(e) => updateOrderItem(item.id, 'bahan', e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted opacity-60 px-1 flex items-center gap-2">
                                      <MessageSquare size={12} className="text-primary" /> Catatan Produksi / Finishing
                                    </label>
                                    <textarea
                                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none font-semibold text-xs italic focus:border-primary transition-all min-h-[60px] resize-none dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20"
                                      placeholder="Contoh: Mata ayam di setiap pojok, laminasi doff, potong rapi..."
                                      value={item.notes}
                                      onChange={(e) => updateOrderItem(item.id, 'notes', e.target.value)}
                                    />
                                  </div>
                                </div>

                                {/* Controls & Math */}
                                <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => updateOrderItem(item.id, 'isBanner', false)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all ${!item.isBanner ? 'bg-primary text-white shadow-lg' : 'text-muted hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                      >
                                        SATUAN
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateOrderItem(item.id, 'isBanner', true)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all ${item.isBanner ? 'bg-primary text-white shadow-lg' : 'text-muted hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                      >
                                        BANNER
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeOrderItem(item.id)}
                                      className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                                      title="Hapus Item"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-12 gap-3 items-end">
                                    {item.isBanner && (
                                      <>
                                        <div className="col-span-3 space-y-1">
                                          <label className="text-[9px] font-bold uppercase text-muted text-center block tracking-widest">L (m)</label>
                                          <input type="number" step="0.1" className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-white/10 p-2.5 rounded-xl outline-none font-bold text-sm text-center dark:text-white" value={item.p} onChange={(e) => updateOrderItem(item.id, 'p', parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className="col-span-1 pb-3 text-center text-muted font-bold">×</div>
                                        <div className="col-span-3 space-y-1">
                                          <label className="text-[9px] font-bold uppercase text-muted text-center block tracking-widest">T (m)</label>
                                          <input type="number" step="0.1" className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-white/10 p-2.5 rounded-xl outline-none font-bold text-sm text-center dark:text-white" value={item.l} onChange={(e) => updateOrderItem(item.id, 'l', parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className="col-span-5 space-y-1">
                                          <label className="text-[9px] font-bold uppercase text-muted text-center block tracking-widest">Quantity</label>
                                          <input type="number" className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-white/10 p-2.5 rounded-xl outline-none font-bold text-sm text-center dark:text-white" value={item.qty} onChange={(e) => updateOrderItem(item.id, 'qty', parseInt(e.target.value) || 0)} />
                                        </div>
                                      </>
                                    )}
                                    {!item.isBanner && (
                                      <div className="col-span-12 space-y-1">
                                        <label className="text-[9px] font-bold uppercase text-muted text-center block tracking-widest">Jumlah (Qty)</label>
                                        <input type="number" className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none font-bold text-sm text-center dark:text-white" value={item.qty} onChange={(e) => updateOrderItem(item.id, 'qty', parseInt(e.target.value) || 0)} />
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold uppercase text-muted tracking-widest ml-1">{item.isBanner ? 'Harga /m²' : 'Harga Satuan'}</label>
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary/40 italic">Rp</span>
                                        <input className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-white/10 focus:border-primary p-3 pl-8 rounded-xl outline-none font-bold text-sm text-right text-primary" value={formatIDR(item.price.toString())} onChange={(e) => updateOrderItem(item.id, 'price', parseFloat(unformatIDR(e.target.value)) || 0)} />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold uppercase text-primary tracking-widest ml-1">Subtotal Item</label>
                                      <div className="w-full bg-slate-900 border border-white/5 p-3 rounded-xl flex justify-between items-center shadow-lg shadow-black/20">
                                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter italic">Total</span>
                                        <span className="text-sm font-bold text-primary italic">Rp {formatIDR(item.total)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {item.isBanner && (
                              <div className="absolute -left-1 top-6 bottom-6 w-1 bg-primary rounded-full shadow-lg shadow-primary/30" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER SUMMARY SECTION (Hanya tampil di Step 2) */}
              {preorderStep === 'input' && (
                <div className="px-10 py-8 bg-white dark:bg-black/40 border-t border-slate-200 dark:border-white/5 flex flex-col xl:flex-row justify-between items-center gap-10 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] animate-slide-up">
                  <div className="flex flex-wrap gap-12 items-center w-full xl:w-auto">
                    <div className="space-y-3 flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-success block">Uang Muka (DP)</label>
                      </div>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-success font-bold text-lg italic">Rp</div>
                        <input className="w-full xl:w-64 bg-slate-100 dark:bg-white/5 border-2 border-success/10 focus:border-success px-12 py-4 rounded-3xl outline-none font-bold text-2xl text-success text-right shadow-sm transition-all" value={formatIDR(formData.downPayment)} onChange={(e) => setFormData({ ...formData, downPayment: unformatIDR(e.target.value) })} />
                      </div>
                      <p className="text-[9px] text-muted font-bold uppercase tracking-widest pl-2">Sistem mencatat sebagai pemasukan</p>
                    </div>

                    <div className="bg-gradient-to-br from-primary to-rose-600 text-white p-7 rounded-[2.5rem] shadow-2xl shadow-primary/30 relative overflow-hidden flex-1 min-w-[280px]">
                      <div className="relative z-10 flex justify-between items-end">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 block mb-1">Sisa Pelunasan</span>
                          <div className="text-3xl font-bold italic tracking-tighter">Rp {formatIDR(Math.max(0, (parseFloat(formData.totalAmount) || 0) - (parseFloat(formData.downPayment) || 0)))}</div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 block mb-1">Status</span>
                          <span className="text-[11px] font-bold italic bg-white/20 px-3 py-1 rounded-full border border-white/20">{(parseFloat(formData.totalAmount) || 0) - (parseFloat(formData.downPayment) || 0) <= 0 ? 'LUNAS' : 'PENDING'}</span>
                        </div>
                      </div>
                      <Calculator className="absolute -right-6 -bottom-6 text-white/10" size={120} />
                    </div>
                  </div>

                   <div className="flex flex-col gap-4 w-full xl:w-auto xl:min-w-[300px]">
                    <div className="flex justify-between items-end px-3">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted opacity-60">Grand Total Bruto: </span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white italic tracking-tight leading-none">Rp {formatIDR(formData.totalAmount)}</span>
                    </div>
                    {/* Dua tombol terpisah */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleSaveSilent}
                        className="flex-1 bg-slate-700 dark:bg-white/10 hover:bg-slate-600 dark:hover:bg-white/20 text-white py-5 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all group border border-white/10"
                        title="Simpan pesanan ke database tanpa kirim notifikasi"
                      >
                        <FileText size={18} className="opacity-70" />
                        Catat
                      </button>
                      <button
                        type="submit"
                        onClick={handleSaveAndSendSPK}
                        className="flex-[2] bg-primary hover:bg-primary-hover text-white py-5 rounded-2xl font-bold text-sm shadow-2xl shadow-primary/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all group"
                        title="Simpan pesanan & kirim laporan SPK ke Telegram owner"
                      >
                        Kirim SPK
                        <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                    <p className="text-[9px] text-muted font-bold uppercase tracking-widest text-center opacity-40">Catat = simpan saja · Kirim SPK = simpan + notif Telegram</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {showDetailModal && selectedPreorder ? createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[120] px-4 py-4 overflow-hidden">
          <div className="w-full flex justify-center items-center h-full">
            <div className="w-full max-w-4xl max-h-[90vh] relative flex flex-col animate-scale-up bg-bg-light dark:bg-bg-dark border border-slate-200 dark:border-border rounded-[2.5rem] overflow-hidden shadow-2xl">              <div className="px-8 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-full bg-primary/10 -skew-x-12 transform translate-x-32" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-xl shadow-primary/10">
                  <ShoppingBag size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-tight italic">Detail Order #{selectedPreorder.id}</h2>
                  <p className="text-white/40 text-[9px] font-bold tracking-[0.4em] uppercase">Multi-Order Tracking System</p>
                </div>
              </div>
              <button className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all opacity-60 hover:opacity-100 group" onClick={() => setShowDetailModal(false)}>
                <X size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-thin">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 bg-slate-50 dark:bg-white/5 p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-inner">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted tracking-[0.2em] block opacity-60 ml-0.5">Nama Pelanggan</span>
                    <div className="font-bold text-sm italic dark:text-white uppercase tracking-tight">{selectedPreorder.customerName}</div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted tracking-[0.2em] block opacity-60 ml-0.5">Estimasi Selesai</span>
                    <div className="font-bold text-sm italic dark:text-white flex items-center gap-2">
                      <Calendar size={14} className="text-primary" /> {selectedPreorder.dueDate}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted tracking-[0.2em] block opacity-60 ml-0.5 text-center">Status Produksi</span>
                    <div className="flex justify-center">{getStatusBadge(selectedPreorder.status)}</div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <span className="text-[10px] font-bold uppercase text-muted tracking-[0.2em] block opacity-60 mr-0.5">Nomor Invoice</span>
                    <div className="font-bold text-sm italic text-primary tracking-widest">INV-{selectedPreorder.id.toString().padStart(4, '0')}</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 px-1 border-b border-slate-100 dark:border-white/5 pb-4">
                    <Search size={16} className="text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-800 dark:text-white italic">Daftar Barang (Itemized List)</h3>
                  </div>
                  <div className="space-y-4">
                    {selectedPreorder.items?.map((item, idx) => (
                      <div key={item.id} className="flex flex-col sm:flex-row gap-6 p-6 rounded-[1.8rem] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm items-center hover:border-primary/20 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 dark:bg-white/10 group-hover:bg-primary transition-colors" />
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-muted dark:text-primary/40 border border-slate-200 dark:border-white/5 shrink-0">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-md uppercase italic dark:text-white leading-tight mb-1">{item.name}</div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-muted uppercase tracking-widest opacity-60">
                            <span className="flex items-center gap-1.5"><Package size={12} className="text-primary/60" /> {item.bahan || 'Reguler'}</span>
                            {item.notes && <span className="flex items-center gap-1.5 text-primary italic lowercase font-medium">— {item.notes}</span>}
                          </div>
                        </div>
                        <div className="text-center px-4 shrink-0 border-x border-slate-100 dark:border-white/5 hidden sm:block">
                          <div className="text-[9px] font-bold text-muted uppercase tracking-tighter opacity-40 mb-1">Dimensi / Qty</div>
                          <div className="font-bold text-xs italic dark:text-primary leading-none">
                            {item.isBanner ? `${item.p}x${item.l}m` : 'PCS'} <span className="text-muted mx-1">×</span> {item.qty}
                          </div>
                        </div>
                        <div className="text-right min-w-[140px] shrink-0">
                          <div className="text-[9px] font-bold text-muted uppercase tracking-tighter opacity-40 mb-1">Subtotal Bruto</div>
                          <div className="font-bold text-lg text-slate-900 dark:text-white italic leading-none group-hover:text-primary transition-colors">Rp {formatIDR(item.total)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── FOOTER UNIFIED ── */}
              <div className="shrink-0 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/40">

                {/* Row 1 – Tracking Pipeline */}
                <div className="px-8 pt-5 pb-4 border-b border-slate-100 dark:border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted opacity-50 block mb-3">Tracking Progres Produksi</span>
                  {selectedPreorder.status === 'canceled' ? (
                    <div className="flex items-center gap-2 py-2 px-4 bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-500 text-[10px] font-bold uppercase tracking-widest w-fit">
                      <X size={13} strokeWidth={2.5} /> Pesanan Telah Dibatalkan
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 w-full">
                      {(() => {
                        type StepDef = { key: Preorder['status']; label: string; sub: string; Icon: React.ElementType; color: string; ring: string; bg: string; text: string; border: string };
                        const steps: StepDef[] = [
                          { key: 'pending',   label: 'Antrian',  sub: 'Menunggu',  Icon: Clock,       color: 'slate',   ring: 'ring-slate-400',   bg: 'bg-slate-500',   text: 'text-slate-600 dark:text-slate-300',   border: 'border-slate-300 dark:border-slate-600' },
                          { key: 'designing', label: 'Desain',   sub: 'Proses',    Icon: Palette,     color: 'blue',    ring: 'ring-blue-400',    bg: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-300',    border: 'border-blue-300 dark:border-blue-600'   },
                          { key: 'printing',  label: 'Cetak',    sub: 'Produksi',  Icon: Printer,     color: 'amber',   ring: 'ring-amber-400',   bg: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-300',   border: 'border-amber-300 dark:border-amber-600' },
                          { key: 'completed', label: 'Selesai',  sub: 'Done',      Icon: CheckCheck,  color: 'emerald', ring: 'ring-emerald-400', bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-600' },
                        ];
                        const currentIdx = steps.findIndex(s => s.key === selectedPreorder.status);
                        return (
                          <div className="flex items-center w-full gap-1.5">
                            {steps.map((step, idx) => {
                              const isDone    = idx < currentIdx;
                              const isCurrent = idx === currentIdx;
                              const isNext    = idx === currentIdx + 1;
                              const StepIcon  = step.Icon;
                              return (
                                <React.Fragment key={step.key}>
                                  <button
                                    disabled={!isNext && !isDone}
                                    onClick={async () => {
                                      if (isNext) {
                                        handleUpdatePreorderStatus(selectedPreorder, step.key);
                                      } else if (isDone) {
                                        const result = await Swal.fire({
                                          title: 'Kembalikan Status?',
                                          html: `Status akan diubah kembali ke <b>${step.label}</b>.<br/><small style="opacity:0.6">Gunakan jika terjadi kesalahan input.</small>`,
                                          icon: 'warning',
                                          showCancelButton: true,
                                          confirmButtonText: 'Ya, Kembalikan',
                                          cancelButtonText: 'Batal',
                                          confirmButtonColor: '#e11d48',
                                        });
                                        if (result.isConfirmed) handleUpdatePreorderStatus(selectedPreorder, step.key);
                                      }
                                    }}
                                    title={isDone ? `Kembali ke: ${step.label}` : isNext ? `Lanjutkan ke: ${step.label}` : step.label}
                                    className={`group flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 relative overflow-hidden
                                      ${ isDone    ? `${step.bg} border-transparent cursor-pointer hover:brightness-90 hover:scale-[0.98] opacity-75 hover:opacity-100` : '' }
                                      ${ isCurrent ? `${step.bg} border-transparent shadow-lg ${step.ring} ring-2 ring-offset-1 ring-offset-slate-50 dark:ring-offset-black/40 scale-[1.02]` : '' }
                                      ${ isNext    ? `bg-white dark:bg-white/5 ${step.border} border-dashed cursor-pointer hover:border-solid hover:${step.bg.replace('bg-', 'bg-').replace('500', '50')} dark:hover:bg-white/10 hover:scale-[1.02]` : '' }
                                      ${ !isDone && !isCurrent && !isNext ? 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 opacity-40 cursor-default' : '' }
                                    `}
                                  >
                                    {/* Icon container */}
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all
                                      ${ isDone || isCurrent ? 'bg-white/20 text-white' : '' }
                                      ${ isNext ? `${step.text} bg-slate-100 dark:bg-white/10` : '' }
                                      ${ !isDone && !isCurrent && !isNext ? 'text-slate-300 dark:text-white/20 bg-slate-50 dark:bg-white/5' : '' }
                                    `}>
                                      { isDone
                                        ? <RotateCcw size={15} strokeWidth={2.5} className="opacity-80 group-hover:rotate-[-180deg] transition-transform duration-500" />
                                        : <StepIcon size={15} strokeWidth={2} />
                                      }
                                    </div>
                                    {/* Label */}
                                    <div className="flex flex-col min-w-0">
                                      <span className={`text-[10px] font-bold uppercase tracking-widest leading-none truncate
                                        ${ isDone || isCurrent ? 'text-white' : '' }
                                        ${ isNext ? step.text : '' }
                                        ${ !isDone && !isCurrent && !isNext ? 'text-slate-400 dark:text-white/30' : '' }
                                      `}>{step.label}</span>
                                      <span className={`text-[8px] uppercase tracking-tighter mt-0.5 font-medium
                                        ${ isDone ? 'text-white/60' : '' }
                                        ${ isCurrent ? 'text-white/70' : '' }
                                        ${ isNext ? 'text-slate-400 dark:text-white/30' : '' }
                                        ${ !isDone && !isCurrent && !isNext ? 'text-slate-300 dark:text-white/20' : '' }
                                      `}>
                                        { isDone ? '← Undo' : isNext ? 'Tap maju' : step.sub }
                                      </span>
                                    </div>
                                    {/* Current pulse dot */}
                                    { isCurrent && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" /> }
                                  </button>
                                  {idx < steps.length - 1 && (
                                    <div className={`w-4 h-px rounded-full shrink-0 transition-all duration-500
                                      ${ idx < currentIdx ? `${step.bg} opacity-50` : 'bg-slate-200 dark:bg-white/10' }
                                    `} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Row 2 – Financials + Actions */}
                <div className="px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Left: Financial summary */}
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase text-muted tracking-widest opacity-50">Total Kontrak</span>
                      <span className="text-base font-bold dark:text-white leading-tight">Rp {formatIDR(selectedPreorder.totalAmount)}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-white/10 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase text-success tracking-widest opacity-80">Uang Muka</span>
                      <span className="text-base font-bold text-success leading-tight">Rp {formatIDR(selectedPreorder.downPayment)}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-white/10 shrink-0" />
                    <div className="flex flex-col bg-primary/5 dark:bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                      <span className="text-[9px] font-bold uppercase text-primary tracking-widest">Sisa Bayar</span>
                      <span className="text-base font-bold text-primary leading-tight">Rp {formatIDR(selectedPreorder.remainingAmount)}</span>
                    </div>
                  </div>

                  {/* Right: Action buttons — all in one row, balanced */}
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedPreorder.status !== 'canceled' && selectedPreorder.status !== 'completed' && (
                      <button
                        onClick={() => handleUpdatePreorderStatus(selectedPreorder, 'canceled')}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest"
                      >
                        <X size={12} strokeWidth={2.5} /> Batalkan
                      </button>
                    )}
                    <button
                      className="px-6 py-2.5 rounded-xl font-bold text-muted border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-[10px] tracking-widest uppercase"
                      onClick={() => setShowDetailModal(false)}
                    >
                      Tutup
                    </button>
                    <button
                      disabled={selectedPreorder.status !== 'completed'}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all group ${
                        selectedPreorder.status === 'completed'
                          ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95'
                          : 'bg-slate-200 dark:bg-white/5 text-muted cursor-not-allowed opacity-40'
                      }`}
                      onClick={() => generatePreorderInvoicePDF(storeName, selectedPreorder, 'light')}
                      title={selectedPreorder.status !== 'completed' ? 'Selesaikan pesanan untuk cetak nota' : 'Cetak Nota'}
                    >
                      <FileText size={14} className={selectedPreorder.status === 'completed' ? 'group-hover:-translate-y-0.5 transition-transform' : ''} />
                      {selectedPreorder.status === 'completed' ? 'Cetak Nota' : 'Nota Terkunci'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
};

export default PreorderManager;
