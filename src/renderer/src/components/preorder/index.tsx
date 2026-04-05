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
  CheckCircle2,
  X,
  MessageSquare,
  Minus,
  Calculator,
  FileText,
  Settings2
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
}

const PreorderManager: React.FC<PreorderManagerProps> = ({ preorders, loadData, api }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPreorder, setSelectedPreorder] = useState<Preorder | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
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
          updatedItem.total = (updatedItem.p || 0) * (updatedItem.l || 0) * (updatedItem.qty || 0) * (updatedItem.price || 0);
        } else {
          updatedItem.total = (updatedItem.qty || 0) * (updatedItem.price || 0);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  useEffect(() => {
    const total = orderItems.reduce((sum, item) => sum + item.total, 0);
    setFormData(prev => ({ ...prev, totalAmount: total.toString() }));
  }, [orderItems]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 rounded-full text-[10px] Font_bold uppercase bg-slate-100 text-slate-500 border border-slate-200">Pending</span>;
      case 'designing': return <span className="px-3 py-1 rounded-full text-[10px] Font_bold uppercase bg-blue-100 text-blue-600 border border-blue-200 animate-pulse">Designing</span>;
      case 'printing': return <span className="px-3 py-1 rounded-full text-[10px] Font_bold uppercase bg-amber-100 text-amber-600 border border-amber-200">Printing</span>;
      case 'completed': return <span className="px-3 py-1 rounded-full text-[10px] Font_bold uppercase bg-emerald-100 text-emerald-600 border border-emerald-200">Selesai</span>;
      case 'canceled': return <span className="px-3 py-1 rounded-full text-[10px] Font_bold uppercase bg-rose-100 text-rose-600 border border-rose-200">Batal</span>;
      default: return null;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(unformatIDR(formData.totalAmount)) || 0;
    const dp = parseFloat(unformatIDR(formData.downPayment)) || 0;
    
    if (orderItems.some(item => !item.name.trim())) {
      Swal.fire('Peringatan', 'Nama barang belum diisi Pak!', 'warning');
      return;
    }

    const payload = { ...formData, totalAmount: total, downPayment: dp, remainingAmount: total - dp, items: orderItems };

    try {
      if (editingId) {
        await api.updatePreorder({ ...payload, id: editingId });
      } else {
        await api.addPreorder(payload);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      loadData();
      Swal.fire({ title: 'Berhasil!', text: 'Pesanan telah disimpan.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan data.', 'error');
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
    setShowModal(true);
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
          onClick={() => { setEditingId(null); resetForm(); setShowModal(true); }}
          className="btn btn-primary px-8 py-3.5 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-3 hover:scale-103 transition-transform Font_bold text-[10px] uppercase tracking-widest"
        >
          <Plus size={18} /> Tambah Proyek
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-5 border-l-4 border-primary">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] Font_bold uppercase tracking-[0.2em] text-muted dark:text-muted">Antrian</span>
            <Clock className="text-primary" size={16} />
          </div>
          <div className="text-2xl font-black">{preorders.filter(p => p.status !== 'completed' && p.status !== 'canceled').length}</div>
          <p className="text-[9px] text-muted dark:text-muted uppercase Font_bold opacity-60">On Process</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-amber-500">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] Font_bold uppercase tracking-[0.2em] text-muted dark:text-muted">Piutang</span>
            <Calculator className="text-amber-500" size={16} />
          </div>
          <div className="text-2xl font-black text-amber-500">Rp {formatIDR(totalUnpaid)}</div>
          <p className="text-[9px] text-muted dark:text-muted uppercase Font_bold opacity-60">Pending Payment</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-emerald-500">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] Font_bold uppercase tracking-[0.2em] text-muted dark:text-muted">Done</span>
            <CheckCircle2 className="text-emerald-500" size={16} />
          </div>
          <div className="text-2xl font-black text-emerald-500">{preorders.filter(p => p.status === 'completed').length}</div>
          <p className="text-[9px] text-muted dark:text-muted uppercase Font_bold opacity-60">Completed</p>
        </div>
      </div>

      <div className="glass-card flex items-center gap-4 px-6 py-3.5">
        <Search className="text-muted shrink-0" size={18} />
        <input type="text" placeholder="Cari pesanan..." className="bg-transparent border-none outline-none w-full Font_bold text-xs uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredPreorders.length === 0 ? (
          <div className="glass-card py-16 flex flex-col items-center justify-center opacity-30">
            <ShoppingBag size={48} className="mb-4 stroke-[1px]" />
            <p className="Font_bold text-xs uppercase tracking-[0.3em]">Antrian Kosong</p>
          </div>
        ) : (
          filteredPreorders.map((p) => (
            <div key={p.id} className="glass-card p-4 group hover:border-primary/20 transition-all duration-300 relative overflow-hidden">
              <div className="flex flex-col md:flex-row gap-5 items-center">
                <div className="w-10 h-10 rounded-xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-md font-black truncate uppercase tracking-tight italic">{p.customerName}</h3>
                    {getStatusBadge(p.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[10px] text-muted dark:text-muted Font_bold uppercase opacity-60">
                    <span className="flex items-center gap-1.5"><Wrench size={12} className="text-primary" /> {p.serviceName}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={12} className="text-primary" /> {p.dueDate}</span>
                    {p.notes && <span className="flex items-center gap-1.5 font-normal"><MessageSquare size={12} /> {p.notes}</span>}
                  </div>
                </div>
                <div className="flex gap-8 items-center shrink-0">
                  <div className="text-right">
                    <div className="text-[9px] Font_bold uppercase text-muted dark:text-muted tracking-widest mb-0.5">Kontrak</div>
                    <div className="text-md font-black italic">Rp {formatIDR(p.totalAmount)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] Font_bold uppercase text-muted dark:text-muted tracking-widest mb-0.5">Sisa</div>
                    {p.remainingAmount > 0 ? (
                      <div className="text-[9px] font-black text-rose-500 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">Rp {formatIDR(p.remainingAmount)}</div>
                    ) : (
                      <div className="text-[9px] font-black text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">LUNAS</div>
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
          ))
        )}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[110] px-4 py-4 overflow-hidden">
          <div className="w-full flex justify-center items-center">
            <div className="w-full max-w-5xl max-h-[95vh] relative flex flex-col animate-scale-up bg-bg-light dark:bg-bg-dark border border-slate-200 dark:border-border rounded-[1.8rem] overflow-hidden shadow-2xl">
              
              <div className="px-6 py-4 bg-slate-900 dark:bg-black text-white flex justify-between items-center shrink-0 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight italic">Formulir Pesanan Kios {editingId ? `#${editingId}` : 'Percetakan'}</h2>
                    <p className="text-white/40 text-[8px] Font_bold tracking-[0.3em] uppercase">Multi-Order System v3.1.5</p>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-all opacity-60" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-7 space-y-8 scrollbar-thin">
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white dark:bg-bg-card p-5 rounded-2xl border border-slate-100 dark:border-border shadow-sm">
                    <div className="md:col-span-12 lg:col-span-6 space-y-1.5">
                       <label className="text-xs Font_bold uppercase tracking-widest text-muted dark:text-muted flex items-center gap-2 ml-1">Nama Customer</label>
                       <input 
                         required
                         className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border focus:border-primary px-4 py-3 rounded-xl outline-none font-bold text-sm shadow-inner dark:text-white"
                         placeholder="Ketik Nama..."
                         value={formData.customerName}
                         onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                       />
                    </div>
                    <div className="md:col-span-6 lg:col-span-3 space-y-1.5">
                       <label className="text-xs Font_bold uppercase tracking-widest text-muted dark:text-muted flex items-center gap-2 ml-1">Status Antrian</label>
                       <select 
                         className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border focus:border-primary px-4 py-3 rounded-xl outline-none font-bold text-sm shadow-inner dark:text-white cursor-pointer uppercase tracking-tighter italic"
                         value={formData.status}
                         onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                       >
                         <option value="pending">PENDING (ANTRIAN)</option>
                         <option value="designing">DESIGNING (PROSES)</option>
                         <option value="printing">PRINTING (CETAK)</option>
                         <option value="completed">COMPLETED (SIAP)</option>
                         <option value="canceled">CANCELED (BATAL)</option>
                       </select>
                    </div>
                    <div className="md:col-span-6 lg:col-span-3 space-y-1.5">
                       <label className="text-xs Font_bold uppercase tracking-widest text-muted dark:text-muted flex items-center gap-2 ml-1">Tanggal Deadline</label>
                       <div className="flex flex-col gap-2">
                         <input 
                           type="date" 
                           required 
                           className="form-input dark:text-muted cursor-pointer font-bold" 
                           value={formData.dueDate} 
                           onClick={(e) => (e.target as any).showPicker?.()}
                           onChange={(e) => setFormData({...formData, dueDate: e.target.value})} 
                         />
                       </div>
                    </div>
                 </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <h3 className="text-[13px] Font_bold uppercase tracking-widest text-primary italic flex items-center gap-2 underline decoration-primary/20 underline-offset-8">Daftar Barang Pesanan</h3>
                      <button type="button" onClick={addOrderItem} className="btn-primary px-5 py-2.5 rounded-xl text-[10px] Font_bold tracking-widest flex items-center gap-2 shadow-lg hover:scale-103 transition-transform uppercase"> <Plus size={14} /> Tambah Item </button>
                   </div>

                   <div className="space-y-6 mt-4">
                      {orderItems.map((item, idx) => (
                        <div key={item.id} className="relative group animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                           <div className="border-2 border-dashed border-slate-200 dark:border-border p-5 rounded-3xl bg-white dark:bg-bg-card hover:border-primary/40 transition-colors flex gap-4 items-center shadow-sm">
                              <div className="flex-1 space-y-4">
                                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-7 space-y-1.5">
                                       <span className="text-[11px] Font_bold uppercase text-muted dark:text-muted tracking-widest px-1">Nama Item</span>
                                       <input className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 px-4 py-3 rounded-xl outline-none font-black text-sm italic focus:bg-primary/10 dark:focus:bg-primary/20 transition-all shadow-sm dark:text-white" placeholder="Ketik Jasa/Barang..." value={item.name} onChange={(e) => updateOrderItem(item.id, 'name', e.target.value)} />
                                    </div>
                                    <div className="md:col-span-4 space-y-1.5">
                                       <span className="text-[11px] Font_bold uppercase text-muted dark:text-muted tracking-widest px-1">Bahan</span>
                                       <input className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 px-4 py-3 rounded-xl outline-none font-black text-sm italic focus:bg-primary/10 dark:focus:bg-primary/20 transition-all shadow-sm dark:text-white" placeholder="Art Paper, Flexi, dll" value={item.bahan} onChange={(e) => updateOrderItem(item.id, 'bahan', e.target.value)} />
                                    </div>
                                    <div className="md:col-span-1 flex flex-col items-center justify-center pt-5">
                                       <button type="button" onClick={() => updateOrderItem(item.id, 'isBanner', !item.isBanner)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md ${item.isBanner ? 'bg-primary text-white scale-110 shadow-primary/30' : 'bg-slate-100 dark:bg-bg-dark text-muted dark:text-text-muted hover:bg-primary/20'}`} title={item.isBanner ? "Mode Banner Aktif" : "Mode Satuan"} > <Settings2 size={18} /> </button>
                                       <span className="text-[9px] Font_bold mt-1 uppercase text-primary/60">{item.isBanner ? 'BANNER' : 'UNIT'}</span>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                                    {item.isBanner && (
                                       <>
                                          <div className="md:col-span-1.5 space-y-1.5">
                                             <span className="text-[10px] Font_bold uppercase text-muted dark:text-muted flex justify-center">L (m)</span>
                                             <input type="number" className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border p-2.5 rounded-lg outline-none font-black text-sm text-center shadow-inner dark:text-white" value={item.p} onChange={(e) => updateOrderItem(item.id, 'p', parseFloat(e.target.value) || 0)} />
                                          </div>
                                          <div className="md:col-span-0.5 pb-3 text-center text-muted dark:text-muted font-black text-xs">x</div>
                                          <div className="md:col-span-1.5 space-y-1.5">
                                             <span className="text-[10px] Font_bold uppercase text-muted dark:text-muted flex justify-center">T (m)</span>
                                             <input type="number" className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border p-2.5 rounded-lg outline-none font-black text-sm text-center shadow-inner dark:text-white" value={item.l} onChange={(e) => updateOrderItem(item.id, 'l', parseFloat(e.target.value) || 0)} />
                                          </div>
                                       </>
                                    )}
                                    <div className={`${item.isBanner ? 'md:col-span-1.5' : 'md:col-span-2'} space-y-1.5`}>
                                       <span className="text-[10px] Font_bold uppercase text-muted dark:text-muted flex justify-center">Qty</span>
                                       <input type="number" className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-border p-2.5 rounded-lg outline-none font-black text-sm text-center shadow-inner dark:text-white" value={item.qty} onChange={(e) => updateOrderItem(item.id, 'qty', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div className={`${item.isBanner ? 'md:col-span-3' : 'md:col-span-4'} space-y-1.5`}>
                                       <span className="text-[10px] Font_bold uppercase text-muted dark:text-muted flex justify-center">Harga Jasa</span>
                                       <div className="relative">
                                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-primary opacity-50 italic">Rp</div>
                                          <input className="w-full bg-white dark:bg-bg-dark border-2 border-primary/5 focus:border-primary p-2.5 px-8 rounded-lg outline-none font-black text-sm text-right text-primary shadow-sm" value={formatIDR(item.price.toString())} onChange={(e) => updateOrderItem(item.id, 'price', parseFloat(unformatIDR(e.target.value)) || 0)} />
                                       </div>
                                    </div>
                                    <div className={`${item.isBanner ? 'md:col-span-4' : 'md:col-span-6'} space-y-1.5`}>
                                       <span className="text-[10px] Font_bold uppercase text-muted dark:text-muted flex justify-center">Subtotal Bruto</span>
                                       <div className="w-full bg-slate-900 dark:bg-black p-3 rounded-xl border border-white/5 shadow-md flex justify-between items-center group-hover:border-primary/40 transition-colors">
                                          <span className="text-[9px] font-black text-white/20 italic">Total</span>
                                          <span className="text-sm font-black text-primary italic">Rp {formatIDR(item.total)}</span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="space-y-1.5 pt-2">
                                    <div className="flex items-center gap-2 px-1">
                                       <MessageSquare size={12} className="text-primary/60" />
                                       <span className="text-[10px] Font_bold uppercase text-muted dark:text-muted tracking-widest">Catatan Khusus / finishing (Misal: Mata ayam pojok, laminasi, dll)</span>
                                    </div>
                                    <textarea className="w-full bg-slate-50/50 dark:bg-bg-dark/50 border border-slate-200 dark:border-border p-3 px-4 rounded-xl outline-none font-black text-[12px] italic focus:border-primary transition-all min-h-[50px] resize-none dark:text-white shadow-inner" placeholder="Ketik instruksi pengerjaan barang ini..." value={item.notes} onChange={(e) => updateOrderItem(item.id, 'notes', e.target.value)} />
                                 </div>
                              </div>

                              <div className="shrink-0 flex items-center justify-center">
                                 <button type="button" onClick={() => removeOrderItem(item.id)} className="w-10 h-10 bg-danger hover:brightness-110 text-white rounded-xl shadow-lg flex items-center justify-center transition-all hover:scale-110" > <Minus size={20} className="stroke-[3px]" /> </button>
                              </div>
                           </div>
                           {item.isBanner && (
                              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-full shadow-lg shadow-primary/30 animate-pulse" />
                           )}
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 dark:bg-bg-dark/50 border-t border-slate-200 dark:border-border flex flex-col md:flex-row justify-between items-center gap-8 shrink-0">
                 <div className="flex gap-10 items-center">
                    <div className="space-y-4">
                       <label className="text-[9px] Font_bold uppercase tracking-widest text-success block px-1">Pembayaran DP</label>
                       <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-success font-black text-sm italic">Rp</div>
                          <input className="w-64 bg-white dark:bg-bg-dark border-2 border-success/20 focus:border-success px-10 py-3.5 rounded-2xl outline-none font-black text-2xl text-success text-right shadow-md" value={formatIDR(formData.downPayment)} onChange={(e) => setFormData({...formData, downPayment: unformatIDR(e.target.value)})} />
                       </div>
                    </div>
                    <div className="bg-primary text-white p-6 rounded-[2rem] shadow-xl shadow-primary/20 relative overflow-hidden min-w-[300px]">
                       <div className="relative z-10">
                          <span className="text-[10px] Font_bold uppercase tracking-[0.4em] text-white/30 block mb-1">Sisa Pelunasan</span>
                          <div className="text-3xl font-black italic tracking-tighter">Rp {formatIDR(Math.max(0, (parseFloat(formData.totalAmount) || 0) - (parseFloat(formData.downPayment) || 0)))}</div>
                       </div>
                       <Calculator className="absolute -right-4 -bottom-4 text-white/5" size={100} />
                    </div>
                 </div>
                 <div className="flex flex-col gap-3 w-full md:w-auto min-w-[240px]">
                    <div className="text-center md:text-right px-2">
                       <span className="text-[10px] Font_bold uppercase tracking-widest text-muted dark:text-muted opacity-60">Grand Total: </span>
                       <span className="text-xl font-black text-slate-800 dark:text-white italic ml-2 leading-none">Rp {formatIDR(formData.totalAmount)}</span>
                    </div>
                    <button type="submit" onClick={handleSave} className="btn-primary w-full py-5 rounded-[1.8rem] font-black italic text-lg shadow-2xl flex items-center justify-center gap-3 hover:scale-103 transition-transform" > TERBITKAN NOTA <CheckCircle2 size={24} /> </button>
                 </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {showDetailModal && selectedPreorder && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-[120] px-4 py-4 overflow-hidden">
          <div className="w-full flex justify-center items-center h-full">
            <div className="w-full max-w-4xl max-h-[90vh] relative flex flex-col animate-scale-up bg-bg-light dark:bg-bg-dark border border-slate-200 dark:border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight italic">Detail Order #{selectedPreorder.id}</h2>
                    <p className="text-white/40 text-[10px] Font_bold tracking-[0.3em] uppercase">Informasi Lengkap Barang Pesanan</p>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all" onClick={() => setShowDetailModal(false)}><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/50 dark:bg-black/20 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                   <div className="space-y-1">
                      <span className="text-[10px] Font_bold uppercase text-muted dark:text-text-muted tracking-widest block opacity-60">Pelanggan</span>
                      <div className="font-black text-sm italic dark:text-white uppercase">{selectedPreorder.customerName}</div>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] Font_bold uppercase text-muted dark:text-text-muted tracking-widest block opacity-60">Deadline</span>
                      <div className="font-black text-sm italic dark:text-white">{selectedPreorder.dueDate}</div>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] Font_bold uppercase text-muted dark:text-text-muted tracking-widest block opacity-60">Status Admin</span>
                      <div className="flex">{getStatusBadge(selectedPreorder.status)}</div>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] Font_bold uppercase text-muted dark:text-text-muted tracking-widest block opacity-60">Nota Manual</span>
                      <div className="font-black text-sm italic text-primary">INV-{selectedPreorder.id}</div>
                   </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary italic border-b-2 border-primary/10 pb-2 flex items-center gap-2"> <Search size={14} /> Daftar Barang (Itemized)</h3>
                  <div className="space-y-3">
                    {selectedPreorder.items?.map((item, idx) => (
                      <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-bg-card border border-slate-100 dark:border-border shadow-sm items-center group hover:border-primary/30 transition-all">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-bg-dark flex items-center justify-center text-[10px] font-black text-muted dark:text-primary/60 border border-slate-200 dark:border-white/5">{idx + 1}</div>
                        <div className="flex-1">
                          <div className="font-black text-sm uppercase italic dark:text-white">{item.name}</div>
                          <div className="text-[10px] Font_bold text-muted dark:text-text-muted uppercase tracking-widest opacity-60">
                             {item.bahan || 'Tanpa Bahan'}
                             {item.notes && <span className="ml-2 text-primary font-black">— {item.notes}</span>}
                          </div>
                        </div>
                        <div className="text-center px-4">
                          <div className="text-[9px] Font_bold text-muted dark:text-text-muted uppercase tracking-tighter opacity-60">Dimensi / Qty</div>
                          <div className="font-black text-xs italic dark:text-primary">
                            {item.isBanner ? `${item.p}x${item.l}m` : 'SATUAN'} × {item.qty}
                          </div>
                        </div>
                        <div className="text-right min-w-[120px]">
                          <div className="text-[9px] Font_bold text-muted dark:text-text-muted uppercase tracking-tighter opacity-60">Subtotal</div>
                          <div className="font-black text-sm text-primary italic">Rp {formatIDR(item.total)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 dark:bg-bg-dark/50 border-t border-slate-200 dark:border-border flex flex-col md:flex-row justify-between items-center shrink-0 gap-6">
                <div className="flex flex-wrap gap-8">
                  <div>
                     <span className="text-[9px] Font_bold uppercase text-muted dark:text-text-muted tracking-widest block opacity-60">Total Order</span>
                     <div className="text-xl font-black italic dark:text-white">Rp {formatIDR(selectedPreorder.totalAmount)}</div>
                  </div>
                  <div>
                     <span className="text-[9px] Font_bold uppercase text-muted dark:text-text-muted tracking-widest block opacity-60">Uang Muka / DP</span>
                     <div className="text-xl font-black text-success italic">Rp {formatIDR(selectedPreorder.downPayment)}</div>
                  </div>
                  <div className="bg-primary/5 dark:bg-primary/10 px-6 py-2 rounded-2xl border border-primary/20">
                     <span className="text-[9px] Font_bold uppercase text-primary tracking-widest block">Sisa Pelunasan</span>
                     <div className="text-xl font-black text-primary italic">Rp {formatIDR(selectedPreorder.remainingAmount)}</div>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                   <button className="flex-1 md:flex-none px-6 py-3.5 rounded-2xl font-black text-muted border border-slate-200 hover:bg-slate-100 transition-all text-xs" onClick={() => setShowDetailModal(false)}> TUTUP </button>
                   <button className="flex-1 md:flex-none btn btn-primary px-8 py-3.5 rounded-2xl font-black italic text-sm shadow-xl flex items-center gap-2" 
                     onClick={() => generatePreorderInvoicePDF('Kios Percetakan', selectedPreorder, 'light')}
                   > 
                     <FileText size={18} /> CETAK NOTA 
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PreorderManager;
