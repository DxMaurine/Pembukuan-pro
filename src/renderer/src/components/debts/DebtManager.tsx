import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Trash2, Pencil, Users, Send, CreditCard, CheckCircle, AlertCircle, X, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatIDR, unformatIDR } from '../../utils/formatters';
import { generateDebtPDF } from '../../utils/pdf';
import Swal from 'sweetalert2';

interface Debt {
  id: number;
  type: 'receivable' | 'payable';
  name: string;
  amount: number;
  description: string;
  date: string;
  status: 'pending' | 'paid';
}

interface DebtManagerProps {
  debts: Debt[];
  loadData: () => void;
  api: any;
  storeName: string;
  theme: 'light' | 'dark';
}

const DebtManager: React.FC<DebtManagerProps> = ({ debts, loadData, api, storeName, theme }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'receivable' | 'payable'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [debtStep, setDebtStep] = useState<'config' | 'input'>('config');
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;
  const [formData, setFormData] = useState({
    type: 'receivable' as 'receivable' | 'payable',
    name: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const sendDebtReport = async () => {
    try {
      const pdfBase64 = await generateDebtPDF(storeName, debts, theme);
      await api.sendReport({
        pdfData: pdfBase64,
        filename: `laporan_hutang_${new Date().getTime()}.pdf`,
        caption: `📋 *LAPORAN DAFTAR HUTANG PIUTANG*`
      });
      Swal.fire({ title: 'Terkirim!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', 'Gagal kirim report: ' + err.message, 'error');
    }
  };

  const filteredDebts = debts.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || d.type === filterType;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;

    const payload = {
      ...formData,
      amount: parseFloat(unformatIDR(formData.amount))
    };

    if (editingId) {
      // Find the original debt to preserve its status
      const original = debts.find(d => d.id === editingId);
      await api.updateDebt({ ...payload, id: editingId, status: original?.status || 'pending' });
    } else {
      await api.addDebt({ ...payload, status: 'pending' });
    }

    setShowModal(false);
    setEditingId(null);
    setFormData({
      type: 'receivable',
      name: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    loadData();
    Swal.fire({ title: 'Berhasil!', text: 'Catatan hutang disimpan.', icon: 'success', timer: 1500, showConfirmButton: false });
  };

  const handleEditClick = (debt: Debt) => {
    setEditingId(debt.id);
    setFormData({
      type: debt.type,
      name: debt.name,
      amount: debt.amount.toString(),
      description: debt.description,
      date: debt.date.split('T')[0]
    });
    setShowModal(true);
  };

  const toggleStatus = async (debt: Debt) => {
    const newStatus = debt.status === 'pending' ? 'paid' : 'pending';
    await api.updateDebt({ ...debt, status: newStatus });
    loadData();
  };

  const handleDelete = async (id: number) => {
    const res = await Swal.fire({
      title: 'Hapus Catatan?',
      text: 'Data ini akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus'
    });
    if (res.isConfirmed) {
      await api.deleteDebt(id);
      loadData();
    }
  };

  const totalReceivable = debts.filter(d => d.type === 'receivable' && d.status === 'pending').reduce((s, d) => s + d.amount, 0);
  const totalPayable = debts.filter(d => d.type === 'payable' && d.status === 'pending').reduce((s, d) => s + d.amount, 0);

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Users className="text-primary" size={32} /> Hutang Piutang
          </h1>
          <p className="text-muted dark:text-muted mt-1 italic opacity-60 text-sm">Kelola data pinjaman dan penagihan pelanggan.</p>
        </div>
        <div className="flex gap-4">
          <button className="btn btn-secondary border-slate-300 dark:border-white/10" onClick={sendDebtReport}>
            <Send size={18} /> Kirim ke Owner
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Tambah Catatan
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card flex items-center gap-6 p-6 border-l-4 border-emerald-500">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Plus size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted dark:text-muted uppercase tracking-widest mb-1">Total Piutang (Pelanggan)</p>
            <h3 className="text-2xl font-black text-emerald-500">Rp {formatIDR(totalReceivable)}</h3>
          </div>
        </div>
        <div className="glass-card flex items-center gap-6 p-6 border-l-4 border-rose-500">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <CreditCard size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted dark:text-muted uppercase tracking-widest mb-1">Total Hutang (Toko)</p>
            <h3 className="text-2xl font-black text-rose-500">Rp {formatIDR(totalPayable)}</h3>
          </div>
        </div>
      </div>

      <div className="glass-card flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 w-full relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            className="form-input !pl-12 py-3.5"
            placeholder="Cari nama atau deskripsi..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex bg-slate-100 dark:bg-bg-dark/40 p-1.5 rounded-xl border border-slate-200/50 dark:border-border/50">
          {['all', 'receivable', 'payable'].map((t: any) => (
            <button
              key={t}
              onClick={() => {
                setFilterType(t);
                setCurrentPage(1);
              }}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${filterType === t ? 'bg-white dark:bg-primary shadow-md' : 'text-muted'}`}
            >
              {t === 'all' ? 'SEMUA' : t === 'receivable' ? 'PIUTANG' : 'HUTANG'}
            </button>
          ))}
        </div>
        <div className="flex bg-slate-100 dark:bg-bg-dark/40 p-1.5 rounded-xl border border-slate-200/50 dark:border-border/50">
          {['all', 'pending', 'paid'].map((s: any) => (
            <button
              key={s}
              onClick={() => {
                setFilterStatus(s);
                setCurrentPage(1);
              }}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? 'bg-white dark:bg-primary shadow-md' : 'text-muted'}`}
            >
              {s === 'all' ? 'SEMUA STATUS' : s === 'pending' ? 'BELUM LUNAS' : 'LUNAS'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {(() => {
          const totalPages = Math.ceil(filteredDebts.length / entriesPerPage) || 1;
          const currentEntries = filteredDebts.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

          if (filteredDebts.length === 0) {
            return <div className="glass-card text-center py-20 opacity-50">Tidak ada catatan hutang ditemukan.</div>;
          }

          return (
            <>
              {currentEntries.map(debt => (
                <div key={debt.id} className={`glass-card group flex items-center justify-between p-5 border-l-4 transition-all hover:scale-[1.01] ${debt.status === 'paid' ? 'opacity-60 border-slate-400' : debt.type === 'receivable' ? 'border-emerald-500' : 'border-rose-500'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${debt.status === 'paid' ? 'bg-slate-100 text-slate-400' : debt.type === 'receivable' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {debt.status === 'paid' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-tight">{debt.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted font-medium">
                        <span>{new Date(debt.date).toLocaleDateString('id-ID')}</span>
                        <span>•</span>
                        <span className={`uppercase ${debt.type === 'receivable' ? 'text-emerald-600' : 'text-rose-600'}`}>{debt.type}</span>
                        {debt.description && <span>• {debt.description}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <span className={`text-lg font-black ${debt.status === 'paid' ? 'text-slate-400 line-through' : debt.type === 'receivable' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      Rp {formatIDR(debt.amount)}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleStatus(debt)}
                        className={`btn p-2.5 ${debt.status === 'paid' ? 'bg-slate-200 dark:bg-white/10' : 'btn-success'}`}
                        title={debt.status === 'paid' ? 'Set Belum Lunas' : 'Set Lunas'}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => handleEditClick(debt)}
                        className="btn p-2.5 bg-slate-200 dark:bg-white/10 shadow-none hover:bg-primary/20 hover:text-primary transition-colors border-none"
                      >
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(debt.id)} className="btn btn-danger p-2.5">
                        <Trash2 size={16} />
                      </button>
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

      {/* Modal Tambah Catatan - Multi Step Dynamic */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] px-4 underline-offset-0">
          <div className={`glass-card w-full ${debtStep === 'config' ? 'max-w-[480px]' : 'max-w-[780px]'} relative p-8 animate-scale-up transition-all duration-500 ease-in-out border-t-8`}
            style={{ borderTopColor: formData.type === 'receivable' ? '#10b981' : '#f43f5e' }}>

            <button
              type="button"
              className="btn absolute top-6 right-6 p-2 z-20 shadow-none bg-transparent hover:bg-slate-200 dark:hover:bg-white/10"
              onClick={() => { setShowModal(false); setDebtStep('config'); }}
            >
              <X size={18} />
            </button>

            <h2 className="text-2xl mb-8 flex items-center gap-3">
              {formData.type === 'receivable' ? <Plus className="text-emerald-500" /> : <CreditCard className="text-rose-500" />}
              {debtStep === 'config' ? 'Konfigurasi Catatan' : 'Input Detail Nominal'}
            </h2>

            {debtStep === 'config' ? (
              /* --- STEP 1: CONFIGURATION (PORTRAIT) --- */
              <div className="space-y-6 animate-fade-in">
                <div className={`p-4 rounded-2xl border flex gap-3 ${formData.type === 'receivable' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                  <Info className={formData.type === 'receivable' ? 'text-emerald-500' : 'text-rose-500'} size={20} />
                  <p className="text-xs text-muted leading-relaxed">
                    {formData.type === 'receivable'
                      ? 'Input data pelanggan yang memiliki hutang ke toko Anda (Piutang).'
                      : 'Input data hutang toko Anda ke pihak supplier atau pihak lain (Hutang).'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex bg-slate-100 dark:bg-bg-dark/40 p-1.5 rounded-xl border border-slate-200/50 dark:border-border/50">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'receivable' })}
                      className={`flex-1 py-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'receivable' ? 'bg-white text-emerald-600 shadow-md scale-[1.02]' : 'text-muted'}`}
                    >
                      PIUTANG (Pelanggan)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'payable' })}
                      className={`flex-1 py-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'payable' ? 'bg-white text-rose-600 shadow-md scale-[1.02]' : 'text-muted'}`}
                    >
                      HUTANG (Supplier)
                    </button>
                  </div>

                  <div className="group">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-2 ml-1">Nama Pihak / Pelanggan:</label>
                    <input
                      required
                      className="form-input py-4 px-5 text-sm font-bold placeholder:opacity-20"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Pak Haji Slamet, Suplier Beras, dll..."
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  className={`btn w-full justify-center py-4 rounded-2xl font-bold mt-4 shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 ${formData.type === 'receivable' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'
                    }`}
                  onClick={() => formData.name && setDebtStep('input')}
                >
                  Lanjutkan Ke Input Nominal <Search size={18} />
                </button>
              </div>
            ) : (
              /* --- STEP 2: DETAILS (LANDSCAPE) --- */
              <div className="space-y-6 animate-fade-in">
                {/* STATUS BAR TOP */}
                <div className={`flex justify-between items-center p-4 rounded-2xl border shadow-inner ${formData.type === 'receivable' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'
                  }`}>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted">Mencatat Data Untuk:</span>
                    <span className={`text-sm font-black italic ${formData.type === 'receivable' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formData.name.toUpperCase()}
                    </span>
                  </div>
                  <div className={`text-[10px] font-black px-4 py-2 rounded-full shadow-sm border ${formData.type === 'receivable' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                    JENIS: {formData.type === 'receivable' ? 'PIUTANG (Plg Hutang)' : 'HUTANG (Toko Hutang)'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block mb-2 text-sm font-medium ml-1">Nominal Rupiah (Rp)</label>
                      <input
                        type="text"
                        className={`form-input text-3xl font-black text-center py-6 rounded-2xl focus:ring-4 placeholder:opacity-20 ${formData.type === 'receivable' ? 'text-emerald-600 focus:ring-emerald-500/20' : 'text-rose-600 focus:ring-rose-500/20'
                          }`}
                        placeholder="Rp 0"
                        autoFocus
                        value={formatIDR(formData.amount)}
                        onChange={e => setFormData({ ...formData, amount: unformatIDR(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-medium ml-1">Tanggal Transaksi:</label>
                      <input
                        type="date"
                        className="form-input py-3.5 px-4 font-bold text-sm"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-2 flex flex-col">
                    <label className="block text-sm font-medium ml-1">Keterangan / Catatan Tambahan:</label>
                    <textarea
                      className="form-input flex-1 text-sm py-4 px-4 h-full min-h-[140px] resize-none leading-relaxed placeholder:opacity-20"
                      placeholder="Contoh: Belanja beras 2 karung belum dibayar oleh Pak Haji..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-4 pt-6 border-t border-slate-200 dark:border-white/5">
                  <button
                    type="button"
                    className="btn flex-1 justify-center py-4 rounded-2xl font-bold transition-all hover:bg-slate-200 dark:hover:bg-white/10"
                    onClick={() => setDebtStep('config')}
                  >
                    Kembali Ke Nama
                  </button>
                  <button
                    type="button"
                    className={`btn flex-1 justify-center py-4 rounded-2xl font-bold shadow-lg transition-transform hover:scale-[1.05] active:scale-95 ${formData.type === 'receivable' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}
                    onClick={handleAddDebt}
                  >
                    Simpan {editingId ? 'Perubahan' : (formData.type === 'receivable' ? 'Piutang' : 'Hutang')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DebtManager;
