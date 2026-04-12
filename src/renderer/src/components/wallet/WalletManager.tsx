import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Plus, Trash2, Pencil, QrCode, X, Send, TrendingUp, PiggyBank, ArrowUpRight, CheckCircle2, Clock, Info, ChevronLeft, ChevronRight } from 'lucide-react';
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
  activeSubTab: 'saving' | 'qris';
  setActiveSubTab: (tab: 'saving' | 'qris') => void;
}

const WalletManager: React.FC<WalletManagerProps> = ({ entries, loadData, api, storeName, theme, activeSubTab, setActiveSubTab }) => {

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [walletStep, setWalletStep] = useState<'config' | 'input'>('config');
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
    if (editingId) {
      await api.updateWalletEntry({ ...payload, id: editingId });
    } else {
      await api.addWalletEntry(payload);
    }

    setShowModal(false);
    setEditingId(null);
    setFormData({ amount: '', description: '', date: new Date().toISOString().split('T')[0], status: activeSubTab === 'qris' ? 'pending' : 'received' });
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <QrCode className="text-primary" size={32} /> Wallet & QRIS
          </h1>
          <p className="text-muted dark:text-muted mt-1 italic text-sm opacity-60">Pantau saldo digital dan transaksi QR code.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={sendWalletReport} className="btn bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 flex items-center gap-2 px-6 py-3.5 rounded-xl shadow-sm hover:scale-105 transition-transform font-bold text-[10px] uppercase tracking-widest text-slate-700 dark:text-slate-300">
            <Send size={16} /> Kirim ke Owner
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
        <div className={`glass-card p-5 flex flex-col justify-between border-l-4 group transition-all duration-300 relative overflow-hidden h-[180px] ${activeSubTab === 'saving'
          ? 'border-amber-500 ring-2 ring-amber-500/10 bg-gradient-to-br from-amber-500/[0.08] to-transparent shadow-lg shadow-amber-500/5'
          : 'border-slate-300 opacity-40 grayscale hover:grayscale-0 hover:opacity-60'
          }`}>
          {/* Aksen hiasan background */}
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-125 transition-transform duration-700 text-amber-500">
            <PiggyBank size={100} />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${activeSubTab === 'saving' ? 'bg-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10' : 'bg-slate-500/10 text-slate-500'}`}>
                <PiggyBank size={22} />
              </div>
              <span className="text-[10px] font-black text-muted tracking-widest uppercase opacity-60">TABUNGAN AKTIF</span>
            </div>
            <div>
              <div className="text-[10px] text-muted font-bold uppercase mb-0.5 opacity-50 tracking-tight">Total Saldo:</div>
              <h3 className="text-2xl font-black italic tracking-tighter text-slate-800 dark:text-white leading-none">Rp {formatIDR(totalSaving)}</h3>
            </div>
            <div className="flex gap-2 mt-2 pt-3 border-t border-slate-200/50 dark:border-white/5">
              {activeSubTab === 'saving' ? (
                <>
                  <button onClick={() => quickAddSaving(10000)} className="btn px-3 py-1.5 text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/20 font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-sm">+10K</button>
                  <button onClick={() => quickAddSaving(20000)} className="btn px-3 py-1.5 text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/20 font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-sm">+20K</button>
                </>
              ) : (
                <div className="h-[25px]"></div>
              )}
            </div>
          </div>
        </div>

        <div className={`glass-card p-5 flex flex-col justify-between border-l-4 group transition-all duration-300 relative overflow-hidden h-[180px] ${activeSubTab === 'qris'
          ? 'border-blue-500 ring-2 ring-blue-500/10 bg-gradient-to-br from-blue-500/[0.08] to-transparent shadow-lg shadow-blue-500/5'
          : 'border-slate-300 opacity-40 grayscale hover:grayscale-0 hover:opacity-60'
          }`}>
          {/* Aksen hiasan background */}
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-125 transition-transform duration-700 text-blue-500">
            <QrCode size={100} />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${activeSubTab === 'qris' ? 'bg-blue-500/20 text-blue-500 shadow-lg shadow-blue-500/10 shadow-inner' : 'bg-slate-500/10 text-slate-500'}`}>
                <QrCode size={22} />
              </div>
              <span className="text-[10px] font-black text-muted tracking-widest uppercase opacity-60">TOTAL MONITOR QRIS</span>
            </div>
            <div>
              <div className="text-[10px] text-muted font-bold uppercase mb-0.5 opacity-50 tracking-tight">Total Dana Masuk:</div>
              <h3 className="text-2xl font-black italic tracking-tighter text-blue-600 dark:text-blue-400 leading-none">Rp {formatIDR(totalQRIS)}</h3>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-200/50 dark:border-white/5">
              <Clock size={10} className="text-muted opacity-50" />
              <p className="text-[10px] text-muted italic font-medium opacity-50 leading-tight">Segera campur ke kas utama laci.</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 border-none flex flex-col justify-center relative overflow-hidden group h-[180px]">
          <div className="absolute -right-2 -top-2 opacity-[0.03] group-hover:scale-150 transition-transform duration-700">
            <Plus size={100} />
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary w-full py-5 rounded-2xl flex flex-col items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.03] transition-all relative z-10 border-none">
            <div className="p-1.5 bg-white/20 rounded-lg"><Plus size={20} /></div>
            <div className="flex flex-col items-center">
              <span className="font-black uppercase tracking-[0.15em] text-[10px] mb-0.5">Tambah Data</span>
              <span className="text-[10px] opacity-70 font-medium tracking-tight">Klik untuk mencatat saldo</span>
            </div>
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

                      {/* Bagian Tengah: Badge Status */}
                      <div className="flex justify-center">
                        {activeSubTab === 'qris' && (
                          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all duration-500 ${entry.status === 'received'
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
                  ))}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8 py-4 border-t border-slate-200 dark:border-white/5">
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
            })()
          )}
        </div>
      </div>

      {/* MODAL FORM WALLET - MULTI STEP DYNAMIC */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] px-4 underline-offset-0">
          <div className={`glass-card w-full ${walletStep === 'config' ? 'max-w-[480px]' : 'max-w-[780px]'} relative p-8 animate-scale-up transition-all duration-500 ease-in-out border-t-8 ${activeSubTab === 'saving' ? 'border-t-primary' : 'border-t-blue-500'}`}>

            <button
              type="button"
              className="btn absolute top-6 right-6 p-2 z-20 shadow-none bg-transparent hover:bg-slate-200 dark:hover:bg-white/10"
              onClick={() => { setShowModal(false); setWalletStep('config'); }}
            >
              <X size={18} />
            </button>

            <h2 className="text-2xl mb-8 flex items-center gap-3">
              {activeSubTab === 'saving' ? <PiggyBank className="text-primary" /> : <QrCode className="text-blue-500" />}
              {walletStep === 'config' ? `Konfigurasi ${activeSubTab === 'saving' ? 'Tabungan' : 'Log QRIS'}` : 'Input Detail Saldo'}
            </h2>

            {walletStep === 'config' ? (
              /* --- STEP 1: CONFIGURATION (PORTRAIT) --- */
              <div className="space-y-6 animate-fade-in">
                <div className={`p-4 rounded-2xl border flex gap-3 ${activeSubTab === 'saving' ? 'bg-primary/5 border-primary/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                  <Info className={activeSubTab === 'saving' ? 'text-primary' : 'text-blue-500'} size={20} />
                  <p className="text-xs text-muted leading-relaxed">
                    {activeSubTab === 'saving'
                      ? 'Catat tabungan Bapak untuk memisahkan hasil jualan dari modal operasional harian.'
                      : 'Monitor dana QRIS/Transfer yang masuk. Tandai jika sudah Bapak ambil dari laci (Cash Mix).'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted block mb-2 ml-1">Keterangan / Tujuan:</label>
                    <textarea
                      className="form-input text-sm py-4 px-4 h-28 resize-none leading-relaxed placeholder:opacity-20"
                      placeholder={activeSubTab === 'saving' ? 'Contoh: Tabungan dana cadangan, Tabungan beli motor...' : 'Contoh: Pembayaran DANA dari Bpk Jono, Transfer BRI Galon...'}
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  className={`btn w-full justify-center py-4 rounded-2xl font-bold mt-4 shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 ${activeSubTab === 'saving' ? 'bg-primary text-white shadow-primary/20' : 'bg-blue-500 text-white shadow-blue-500/20'
                    }`}
                  onClick={() => setWalletStep('input')}
                >
                  Lanjutkan Ke Input Nominal <TrendingUp size={18} />
                </button>
              </div>
            ) : (
              /* --- STEP 2: INPUT DETAILS (LANDSCAPE) --- */
              <div className="space-y-6 animate-fade-in">
                {/* STATUS BAR TOP */}
                <div className={`flex justify-between items-center bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner`}>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted">Konteks Catatan:</span>
                    <span className="text-sm font-bold text-primary italic truncate max-w-[300px]">
                      {formData.description || 'Pencatatan Saldo'}
                    </span>
                  </div>
                  <div className={`text-[10px] font-black px-4 py-2 rounded-full shadow-sm border ${activeSubTab === 'saving' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                    JENIS: {activeSubTab === 'saving' ? 'TABUNGAN' : 'LOG QRIS MONITOR'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block mb-2 text-sm font-medium ml-1">Nominal Rupiah (Rp)</label>
                      <input
                        type="text"
                        className={`form-input text-3xl font-black text-center py-6 rounded-2xl focus:ring-4 placeholder:opacity-20 ${activeSubTab === 'saving' ? 'text-primary focus:ring-primary/20' : 'text-blue-500 focus:ring-blue-500/20'
                          }`}
                        placeholder="Rp 0"
                        autoFocus
                        value={formatIDR(formData.amount)}
                        onChange={e => setFormData({ ...formData, amount: unformatIDR(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-medium ml-1">Tanggal Eksekusi:</label>
                      <input
                        type="date"
                        className="form-input py-3.5 px-4 font-black text-sm"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col justify-center gap-6">
                    {activeSubTab === 'qris' ? (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted block mb-2 px-1">Konfirmasi Dana Masuk:</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, status: 'received' })}
                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${formData.status === 'received' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105' : 'bg-slate-100 dark:bg-white/5 border-transparent opacity-60'}`}
                          >
                            <CheckCircle2 size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Diterima</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, status: 'pending' })}
                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${formData.status === 'pending' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20 scale-105' : 'bg-slate-100 dark:bg-white/5 border-transparent opacity-60'}`}
                          >
                            <Clock size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-muted italic px-1 opacity-60">* Pilih 'Diterima' jika dana sudah Bapak cairkan / campur ke kas utama laci.</p>
                      </div>
                    ) : (
                      <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={16} className="text-primary" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Potensi Pertumbuhan</span>
                        </div>
                        <p className="text-[11px] text-muted leading-relaxed">
                          Dana yang Bapak tabungkan ini akan menambah saldo 'Tabungan Aktif' dan memisahkan uang laba dari uang belanja stok.
                        </p>
                        <div className="text-[10px] font-bold text-primary italic italic ml-1">#DisiplinMencatat</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex gap-4 pt-6 border-t border-slate-200 dark:border-white/5">
                  <button
                    type="button"
                    className="btn flex-1 justify-center py-4 rounded-2xl font-bold transition-all hover:bg-slate-200 dark:hover:bg-white/10"
                    onClick={() => setWalletStep('config')}
                  >
                    Kembali Ke Keterangan
                  </button>
                  <button
                    type="button"
                    className={`btn flex-1 justify-center py-4 rounded-2xl font-bold shadow-lg transition-transform hover:scale-[1.05] active:scale-95 ${activeSubTab === 'saving' ? 'bg-primary text-white shadow-primary/20' : 'bg-blue-500 text-white shadow-blue-500/20'
                      }`}
                    onClick={() => handleAddEntry()}
                  >
                    Simpan {editingId ? 'Perubahan' : 'Catatan Baru'}
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

export default WalletManager;
