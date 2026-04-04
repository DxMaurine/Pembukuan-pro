import React, { useState } from 'react';
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
  Clock,
  CheckCircle2,
  X,
  MessageSquare
} from 'lucide-react';
import Swal from 'sweetalert2';
import { formatIDR, unformatIDR } from '../../utils/formatters';

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
}

interface PreorderManagerProps {
  preorders: Preorder[];
  loadData: () => void;
  api: any;
}

const PreorderManager: React.FC<PreorderManagerProps> = ({ preorders, loadData, api }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    serviceName: '',
    totalAmount: '',
    downPayment: '',
    dueDate: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'pending' as any
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">Pending</span>;
      case 'designing': return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-600 border border-blue-200 animate-pulse">Designing</span>;
      case 'printing': return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-600 border border-amber-200">Printing</span>;
      case 'completed': return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-600 border border-emerald-200">Selesai</span>;
      case 'canceled': return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-600 border border-rose-200">Batal</span>;
      default: return null;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(unformatIDR(formData.totalAmount)) || 0;
    const dp = parseFloat(unformatIDR(formData.downPayment)) || 0;
    
    const payload = {
      ...formData,
      totalAmount: total,
      downPayment: dp,
      remainingAmount: total - dp
    };

    try {
      if (editingId) {
        await api.updatePreorder({ ...payload, id: editingId });
      } else {
        const newOrder = await api.addPreorder(payload);
        // Kirim notifikasi ke Owner untuk pesanan baru
        await api.notifyPreorder({
          ...newOrder,
          totalAmount: total,
          downPayment: dp,
          remainingAmount: total - dp
        });
      }
      
      setShowModal(false);
      setEditingId(null);
      setFormData({
        customerName: '',
        serviceName: '',
        totalAmount: '',
        downPayment: '',
        dueDate: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'pending'
      });
      loadData();
      Swal.fire({ title: 'Berhasil!', text: 'Pesanan telah disimpan.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan data.', 'error');
    }
  };

  const handleEdit = (p: Preorder) => {
    setEditingId(p.id);
    setFormData({
      customerName: p.customerName,
      serviceName: p.serviceName,
      totalAmount: p.totalAmount.toString(),
      downPayment: p.downPayment.toString(),
      dueDate: p.dueDate,
      notes: p.notes,
      status: p.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Hapus Pesanan?',
      text: "Data pesanan ini akan dihapus permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
      await api.deletePreorder(id);
      loadData();
      Swal.fire({ title: 'Terhapus!', icon: 'success', timer: 1500, showConfirmButton: false });
    }
  };

  const filteredPreorders = preorders.filter(p => 
    p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.serviceName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalUnpaid = preorders.reduce((sum, p) => p.status !== 'completed' && p.status !== 'canceled' ? sum + p.remainingAmount : sum, 0);

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
             <ShoppingBag className="text-primary" size={32} /> Management Preorder
          </h1>
          <p className="text-muted dark:text-muted mt-1 italic text-sm">Catat dan pantau pesanan desain, cetak, dan jasa lainnya.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({
              customerName: '',
              serviceName: '',
              totalAmount: '',
              downPayment: '',
              dueDate: new Date().toISOString().split('T')[0],
              notes: '',
              status: 'pending'
            });
            setShowModal(true);
          }}
          className="btn btn-primary px-8 py-4 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-3 hover:scale-105 transition-transform font-bold"
        >
          <Plus size={20} /> Tambah Pesanan Baru
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-primary">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Total Antrian</span>
            <Clock className="text-primary" size={18} />
          </div>
          <div className="text-3xl font-black">{preorders.filter(p => p.status !== 'completed' && p.status !== 'canceled').length}</div>
          <p className="text-[10px] text-muted mt-1 uppercase font-bold">Pesanan Sedang Diproses</p>
        </div>
        
        <div className="glass-card p-6 border-l-4 border-amber-500">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Sisa Tagihan Pelanggan</span>
            <MessageSquare className="text-amber-500" size={18} />
          </div>
          <div className="text-3xl font-black text-amber-500">Rp {formatIDR(totalUnpaid)}</div>
          <p className="text-[10px] text-muted mt-1 uppercase font-bold text-amber-500/70">Total Piutang Belum Lunas</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-emerald-500">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Total Selesai</span>
            <CheckCircle2 className="text-emerald-500" size={18} />
          </div>
          <div className="text-3xl font-black text-emerald-500">{preorders.filter(p => p.status === 'completed').length}</div>
          <p className="text-[10px] text-muted mt-1 uppercase font-bold text-emerald-500/70">Pesanan Berhasil Diselesaikan</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="glass-card flex items-center gap-4 px-6 py-4">
        <Search className="text-muted shrink-0" size={20} />
        <input 
          type="text" 
          placeholder="Cari nama pelanggan atau jenis jasa..." 
          className="bg-transparent border-none outline-none w-full font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Preorder List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPreorders.length === 0 ? (
          <div className="glass-card py-20 flex flex-col items-center justify-center opacity-40">
            <ShoppingBag size={64} className="mb-4 stroke-[1px]" />
            <p className="font-bold text-lg">Belum Ada Daftar Preorder</p>
            <p className="text-sm">Klik tombol di atas untuk menambah pesanan pertama Anda.</p>
          </div>
        ) : (
          filteredPreorders.map((p) => (
            <div key={p.id} className="glass-card p-5 group hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                  <User size={24} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold truncate">{p.customerName}</h3>
                    {getStatusBadge(p.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted font-medium">
                    <span className="flex items-center gap-1.5"><Wrench size={14} className="text-primary/60" /> {p.serviceName}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary/60" /> Deadline: {p.dueDate}</span>
                    {p.notes && <span className="flex items-center gap-1.5 italic opacity-60"><MessageSquare size={14} /> {p.notes}</span>}
                  </div>
                </div>

                <div className="flex gap-8 items-center shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase text-muted tracking-widest mb-1">Total Biaya</div>
                    <div className="text-lg font-black">Rp {formatIDR(p.totalAmount)}</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase text-muted tracking-widest mb-1">Status Bayar</div>
                    {p.remainingAmount > 0 ? (
                      <div className="text-sm font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                        Sisa: Rp {formatIDR(p.remainingAmount)}
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                        LUNAS
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button 
                      onClick={() => handleEdit(p)}
                      className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-white transition-all text-muted"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white transition-all text-muted"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal (Full Screen Backdrop Pattern) */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/40 backdrop-blur-2xl flex flex-col items-center justify-center z-[110] px-4 py-6 overflow-y-auto">
          <div className="w-full flex justify-center items-center">
            <div className="glass-card w-full max-w-[600px] relative p-6 animate-scale-up border-t-8 border-primary transition-all shadow-2xl">
              <button
                className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white transition-all opacity-40 hover:opacity-100"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>

              <div className="mb-6 pr-10">
                <h2 className="text-xl font-black flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
                    {editingId ? <Edit2 size={16} /> : <Plus size={20} />}
                  </div>
                  {editingId ? 'Edit Pesanan' : 'Tambah Pesanan Baru'}
                </h2>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pelanggan */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted ml-0.5">Nama Pelanggan:</label>
                    <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/5 px-4 rounded-xl border border-slate-200 dark:border-white/10 group focus-within:border-primary/50 transition-all">
                      <User size={14} className="text-muted group-focus-within:text-primary transition-colors" />
                      <input 
                        required
                        className="bg-transparent border-none outline-none py-3 w-full font-bold text-xs"
                        placeholder="Contoh: Budi Santoso"
                        value={formData.customerName}
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Layanan */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted ml-0.5">Jenis Jasa / Produk:</label>
                    <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/5 px-4 rounded-xl border border-slate-200 dark:border-white/10 group focus-within:border-primary/50 transition-all">
                      <Wrench size={14} className="text-muted group-focus-within:text-primary transition-colors" />
                      <input 
                        required
                        className="bg-transparent border-none outline-none py-3 w-full font-bold text-xs"
                        placeholder="Contoh: Banner 3x1m / Edit Foto"
                        value={formData.serviceName}
                        onChange={(e) => setFormData({...formData, serviceName: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Total Biaya */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted ml-0.5">Biaya Total (Rp):</label>
                    <input 
                      required
                      className="form-input text-lg font-black py-3 text-center rounded-xl bg-slate-50 dark:bg-white/5"
                      placeholder="Rp 0"
                      value={formatIDR(formData.totalAmount)}
                      onChange={(e) => setFormData({...formData, totalAmount: unformatIDR(e.target.value)})}
                    />
                  </div>

                  {/* DP */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted ml-0.5">Uang Muka / DP (Rp):</label>
                    <input 
                      required
                      className="form-input text-lg font-black py-3 text-center text-emerald-500 rounded-xl bg-slate-50 dark:bg-white/5"
                      placeholder="Rp 0"
                      value={formatIDR(formData.downPayment)}
                      onChange={(e) => setFormData({...formData, downPayment: unformatIDR(e.target.value)})}
                    />
                  </div>

                  {/* Deadline */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted ml-0.5">Tenggat Waktu (Deadline):</label>
                    <input 
                      type="date"
                      required
                      className="form-input py-3 font-bold text-xs rounded-xl bg-slate-50 dark:bg-white/5"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted ml-0.5">Status Progress:</label>
                    <select 
                      className="form-input py-3 font-bold text-xs rounded-xl bg-slate-50 dark:bg-white/5 cursor-pointer"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="pending">PENDING (MENUNGGU)</option>
                      <option value="designing">DESIGNING (PROSES DESAIN)</option>
                      <option value="printing">PRINTING (PROSES CETAK)</option>
                      <option value="completed">COMPLETED (SELESAI)</option>
                      <option value="canceled">CANCELED (BATAL)</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted ml-0.5">Catatan Tambahan:</label>
                  <textarea 
                    className="form-input py-3 min-h-[70px] text-xs resize-none rounded-xl bg-slate-50 dark:bg-white/5 shadow-inner"
                    placeholder="Instruksi khusus, ukuran detail, dll..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>

                {/* Sisa Pembayaran Info */}
                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 flex justify-between items-center shadow-inner">
                  <span className="text-[10px] font-black opacity-60 uppercase tracking-widest text-muted">Sisa Pembayaran:</span>
                  <span className={`text-xl font-black ${
                    (parseFloat(unformatIDR(formData.totalAmount)) - parseFloat(unformatIDR(formData.downPayment))) > 0 
                      ? 'text-amber-500 underline decoration-amber-500/30' 
                      : 'text-emerald-500'
                  }`}>
                    Rp {formatIDR(Math.max(0, (parseFloat(unformatIDR(formData.totalAmount)) || 0) - (parseFloat(unformatIDR(formData.downPayment)) || 0)))}
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 py-3.5 rounded-xl font-black flex-1 text-[10px] uppercase tracking-widest transition-all text-muted"
                    onClick={() => setShowModal(false)}
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary py-3.5 rounded-xl font-black flex-[1.4] shadow-lg shadow-primary/20 text-[10px] uppercase tracking-widest"
                  >
                    {editingId ? 'Update Perubahan' : 'Simpan & Kirim Notif'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PreorderManager;
