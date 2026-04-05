import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Plus, Trash2, Pencil, QrCode, X, Send, TrendingUp, PiggyBank, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { formatIDR, unformatIDR } from '../../utils/formatters';
import { generateWalletPDF } from '../../utils/pdf';
import Swal from 'sweetalert2';

interface WalletEntry {
  id: number;
  type: 'saving' | 'qris';
  amount: number;
  description: string;
  date: string;
  status?: 'pending' | 'received'; // Specifically for QRIS
}

interface WalletManagerProps {
  entries: WalletEntry[];
  loadData: () => void;
  api: any;
  storeName: string;
  theme: 'light' | 'dark';
}

const WalletManager: React.FC<WalletManagerProps> = ({ entries, loadData, api, storeName, theme }) => {
  const [activeSubTab, setActiveSubTab] = useState<'saving' | 'qris'>('saving');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;
  
  const handleTabChange = (tab: 'saving' | 'qris') => {
    setActiveSubTab(tab);
    setCurrentPage(1);
  };

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'received'
  });

  const sendWalletReport = async () => {
    try {
      const pdfBase64 = await generateWalletPDF(storeName, entries, theme);
      await api.sendReport({
        pdfData: pdfBase64,
        filename: `laporan_wallet_${new Date().getTime()}.pdf`,
        caption: `💰 *LAPORAN TABUNGAN & MONITOR QRIS*`
      });
      Swal.fire({ title: 'Terkirim!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', 'Gagal kirim report: ' + err.message, 'error');
    }
  };

  const filteredEntries = entries.filter(e => e.type === activeSubTab);
  const totalSaving = entries.filter(e => e.type === 'saving').reduce((s, e) => s + e.amount, 0);
  const totalQRIS = entries.filter(e => e.type === 'qris').reduce((s, e) => s + e.amount, 0);

  const handleAddEntry = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.amount) return;

    const payload = {
      ...formData,
      type: activeSubTab,
      amount: parseFloat(unformatIDR(formData.amount))
    };

    let newEntry;
    if (editingId) {
      await api.updateWalletEntry({ ...payload, id: editingId });
    } else {
      newEntry = await api.addWalletEntry(payload);
      
      // Jika QRIS dan statusnya pending, kirim notifikasi ke Owner
      if (activeSubTab === 'qris' && payload.status === 'pending') {
        api.notifyQRIS({
          ...newEntry,
          amount: payload.amount // Pastikan nominal terformat/angka benar
        });
      }
    }

    setShowModal(false);
    setEditingId(null);
    setFormData({ amount: '', description: '', date: new Date().toISOString().split('T')[0], status: 'pending' });
    loadData();
    Swal.fire({ title: 'Berhasil!', text: 'Data tersimpan.', icon: 'success', timer: 1500, showConfirmButton: false });
  };

  const handleEditClick = (entry: WalletEntry) => {
    setEditingId(entry.id);
    setFormData({
      amount: entry.amount.toString(),
      description: entry.description,
      date: entry.date.split('T')[0],
      status: entry.status || 'received'
    });
    setActiveSubTab(entry.type);
    setShowModal(true);
  };

  const quickAddSaving = async (amount: number) => {
    await api.addWalletEntry({
      type: 'saving',
      amount: amount,
      description: `Tabungan otomatis ${formatIDR(amount)}`,
      date: new Date().toISOString().split('T')[0]
    });
    loadData();
    Swal.fire({ title: 'Tersimpan!', icon: 'success', timer: 1000, showConfirmButton: false });
  };

  const handleDelete = async (id: number) => {
    const res = await Swal.fire({
      title: 'Hapus data?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus'
    });
    if (res.isConfirmed) {
      await api.deleteWalletEntry(id);
      loadData();
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <QrCode className="text-primary" size={32} /> Wallet & QRIS
          </h1>
          <p className="text-muted dark:text-muted mt-1">Pantau saldo digital dan transaksi QR code.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={sendWalletReport} className="btn bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 flex items-center gap-2">
            <Send size={18} /> Kirim ke Owner
          </button>
          <div className="flex bg-slate-100 dark:bg-bg-dark/40 p-1.5 rounded-2xl border border-slate-200/50 dark:border-border/50">
            <button 
              onClick={() => handleTabChange('saving')}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-black transition-all ${activeSubTab === 'saving' ? 'bg-white dark:bg-primary shadow-xl scale-105' : 'text-muted'}`}
            >
              <Wallet size={18} /> TABUNGAN
            </button>
            <button 
              onClick={() => handleTabChange('qris')}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-black transition-all ${activeSubTab === 'qris' ? 'bg-white dark:bg-primary shadow-xl scale-105' : 'text-muted'}`}
            >
              <QrCode size={18} /> QRIS MONITOR
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`glass-card p-6 flex flex-col justify-between border-l-4 ${activeSubTab === 'saving' ? 'border-primary' : 'border-slate-300 opacity-60'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl"><PiggyBank /></div>
            <span className="text-[10px] font-black text-muted tracking-widest">TABUNGAN AKTIF</span>
          </div>
          <h3 className="text-2xl font-black">Rp {formatIDR(totalSaving)}</h3>
          {activeSubTab === 'saving' && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => quickAddSaving(10000)} className="btn px-3 py-2 text-[10px] font-black">+10K</button>
              <button onClick={() => quickAddSaving(20000)} className="btn px-3 py-2 text-[10px] font-black">+20K</button>
            </div>
          )}
        </div>

        <div className={`glass-card p-6 flex flex-col justify-between border-l-4 ${activeSubTab === 'qris' ? 'border-blue-500' : 'border-slate-300 opacity-60'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><QrCode /></div>
            <span className="text-[10px] font-black text-muted tracking-widest">TOTAL QRIS</span>
          </div>
          <h3 className="text-2xl font-black">Rp {formatIDR(totalQRIS)}</h3>
          <p className="text-[10px] text-muted italic mt-2">*Segera campur ke cash drawer setelah dicatat.</p>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent border-none flex flex-col justify-center">
           <button onClick={() => setShowModal(true)} className="btn btn-primary w-full py-6 rounded-3xl flex flex-col items-center gap-2 shadow-lg shadow-primary/20">
             <Plus size={24} />
             <span className="font-bold uppercase tracking-widest text-xs">Tambah {activeSubTab === 'saving' ? 'Tabungan' : 'Log QRIS'}</span>
           </button>
        </div>
      </div>

      <div className="glass-card flex flex-col gap-4">
        <div className="flex justify-between items-center mb-2 px-2">
          <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" /> Histori {activeSubTab === 'saving' ? 'Tabungan' : 'QRIS'}
          </h3>
          <span className="text-xs font-bold text-muted uppercase">Bulan Ini</span>
        </div>

        <div className="flex flex-col gap-3">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-20 opacity-30 text-sm">Belum ada catatan di bagian ini.</div>
          ) : (
            (() => {
              const sortedEntries = filteredEntries.slice().reverse();
              const totalPages = Math.ceil(sortedEntries.length / entriesPerPage);
              const currentEntries = sortedEntries.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

              return (
                <>
                  {currentEntries.map(entry => (
              <div key={entry.id} className="grid grid-cols-[1.5fr_1fr_1.2fr] items-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:scale-[1.01] transition-all duration-300 group shadow-sm hover:shadow-md">
                {/* Bagian Kiri: Icon & Info */}
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`p-3 rounded-2xl shrink-0 ${activeSubTab === 'saving' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500 shadow-inner'}`}>
                    {activeSubTab === 'saving' ? <ArrowUpRight size={20} /> : <QrCode size={20} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{entry.description || (activeSubTab === 'saving' ? 'Tabungan Harian' : 'Transaksi QRIS')}</div>
                    <div className="text-[10px] text-muted font-bold uppercase tracking-tighter">{new Date(entry.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Bagian Tengah: Badge Status (Rapi & Stabil) */}
                <div className="flex justify-center">
                  {activeSubTab === 'qris' && (
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all duration-500 ${
                      entry.status === 'received' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                    }`}>
                      {entry.status === 'received' ? <CheckCircle2 size={12} className="shrink-0" /> : <Clock size={12} className="shrink-0" />}
                      <span>{entry.status === 'received' ? 'Diterima' : 'Belum'}</span>
                    </div>
                  )}
                </div>

                {/* Bagian Kanan: Amount & Action */}
                <div className="flex items-center justify-end gap-6 group-hover:gap-4 transition-all">
                  <span className="text-lg font-black tracking-tight whitespace-nowrap">Rp {formatIDR(entry.amount)}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button onClick={() => handleEditClick(entry)} className="btn p-2.5 bg-slate-200 dark:bg-white/10 shadow-none hover:bg-primary/20 hover:text-primary border-none rounded-xl">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(entry.id)} className="btn btn-danger p-2.5 border-none rounded-xl">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
                  }
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="btn px-4 py-2 bg-slate-200 dark:bg-white/5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                      >
                        Prev
                      </button>
                      <span className="text-sm font-bold text-muted">
                        Halaman {currentPage} dari {totalPages}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="btn px-4 py-2 bg-slate-200 dark:bg-white/5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-[110] px-4 overflow-y-auto">
          <div className="w-full flex justify-center items-center">
            <form onSubmit={handleAddEntry} className="glass-card w-full max-w-lg relative p-8 animate-scale-up space-y-6">
              <button
                type="button"
                className="btn absolute top-6 right-6 p-2 z-20 shadow-none bg-transparent hover:bg-slate-200 dark:hover:bg-white/10"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>

              <div className="mb-2">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  {activeSubTab === 'saving' ? <PiggyBank className="text-primary" /> : <QrCode className="text-blue-500" />}
                  {editingId ? 'Edit' : 'Tambah'} {activeSubTab === 'saving' ? 'Tabungan' : 'Log QRIS'}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted opacity-80 block mb-2">Nominal (Rp):</label>
                  <input required autoFocus className="form-input text-2xl font-black py-4 text-center" value={formatIDR(formData.amount)} onChange={e => setFormData({...formData, amount: unformatIDR(e.target.value)})} placeholder="Rp 0" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted opacity-80 block mb-2">Keterangan:</label>
                  <input className="form-input py-3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder={activeSubTab === 'saving' ? 'Contoh: Tabungan Lemari' : 'Contoh: Pembayaran Foto Copy'} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted opacity-80 block mb-2">Tanggal:</label>
                  <input type="date" className="form-input py-3" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                {activeSubTab === 'qris' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted opacity-80 block mb-2">Status Pembayaran:</label>
                    <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, status: 'received'})}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${formData.status === 'received' ? 'bg-white dark:bg-emerald-500 text-emerald-600 dark:text-white shadow-md' : 'text-muted opacity-50'}`}
                      >
                        Diterima Kasir
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, status: 'pending'})}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${formData.status === 'pending' ? 'bg-white dark:bg-amber-500 text-amber-600 dark:text-white shadow-md' : 'text-muted opacity-50'}`}
                      >
                        Belum Diterima
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn flex-1 justify-center py-3 rounded-2xl font-bold">Batal</button>
                <button type="submit" className="btn btn-primary flex-1 justify-center py-3 rounded-2xl font-bold shadow-lg shadow-primary/20">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WalletManager;
