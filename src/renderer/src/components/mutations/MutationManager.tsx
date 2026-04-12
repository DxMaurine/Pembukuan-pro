import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, TrendingUp, Building, User, Wallet, History, Plus, Trash2, Send, X, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';
import { Mutation, Summary } from '../../types';
import { formatIDR, unformatIDR } from '../../utils/formatters';
import { generateMutationPDF } from '../../utils/pdf';

interface MutationManagerProps {
  mutations: Mutation[];
  summary: Summary;
  loadData: () => Promise<void>;
  api: any;
  walletEntries: any[];
  storeName: string;
  theme: 'light' | 'dark';
  setActiveTab: (tab: any) => void;
  setWalletSubTab: (tab: 'saving' | 'qris') => void;
}

export default function MutationManager({ mutations, summary, loadData, api, walletEntries, storeName, theme, setActiveTab, setWalletSubTab }: MutationManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [mutationStep, setMutationStep] = useState<'config' | 'input'>('config');
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const getFirstDayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;

  const [qrisStart, setQrisStart] = useState(getFirstDayStr());
  const [qrisEnd, setQrisEnd] = useState(getTodayStr());

  const [formData, setFormData] = useState({
    type: 'wallet_to_cash',
    amount: '',
    description: '',
    date: getTodayStr()
  });

  const handleCalculateQRIS = () => {
    const qrisIncome = walletEntries
      .filter((e: any) => e.type === 'qris' && e.date >= qrisStart && e.date <= qrisEnd)
      .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

    const qrisWithdrawn = mutations
      .filter((m: any) => (m.type === 'wallet_to_cash' || m.type === 'wallet_to_owner') && m.date >= qrisStart && m.date <= qrisEnd)
      .reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);

    const available = Math.max(0, qrisIncome - qrisWithdrawn);
    setFormData(prev => ({ ...prev, amount: available.toString() }));
  };

  const getMutationDetails = (type: string) => {
    switch (type) {
      case 'wallet_to_owner': return { label: 'QRIS ke Owner', icon: TrendingUp, color: 'text-purple-500' };
      case 'non_sales_to_owner': return { label: 'Non-Sales ke Owner', icon: User, color: 'text-emerald-500' };
      case 'donation_to_owner': return { label: 'Donasi ke Owner', icon: Building, color: 'text-pink-500' };
      default: return { label: 'Mutasi', icon: ArrowLeftRight, color: 'text-slate-500' };
    }

  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.amount || !formData.description) return;

    try {
      await api.addMutation({
        ...formData,
        amount: parseFloat(unformatIDR(formData.amount)) || 0
      });
      setShowModal(false);
      setFormData({ type: 'wallet_to_cash', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      loadData();
      Swal.fire({ title: 'Berhasil!', text: 'Mutasi telah dicatat.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal menyimpan mutasi', 'error');
    }
  };

  const handleNextStep = () => {
    if (formData.type === 'wallet_to_cash' || formData.type === 'wallet_to_owner') {
      handleCalculateQRIS();
    }
    setMutationStep('input');
  };

  const handleDelete = async (id: number) => {
    const res = await Swal.fire({
      title: 'Hapus Mutasi?',
      text: 'Riwayat saldo akan dikembalikan seperti sebelum mutasi ini.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus'
    });
    if (res.isConfirmed) {
      await api.deleteMutation(id);
      loadData();
    }
  };

  const sendMutationReport = async () => {
    try {
      const filteredMutations = mutations.filter(m => m.description?.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const pdfBase64 = await generateMutationPDF(storeName, filteredMutations, theme);
      await api.sendReport({
        pdfData: pdfBase64,
        filename: `laporan_mutasi.pdf`,
        caption: `🔄 *LAPORAN MUTASI KAS & BANK*`
      });
      Swal.fire({ title: 'Terkirim!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', 'Gagal kirim report: ' + err.message, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <ArrowLeftRight className="text-primary" size={32} /> Mutasi Kas
          </h1>
          <p className="text-muted mt-1 italic text-sm opacity-60">Pindahkan saldo antar keranjang / setoran ke Owner.</p>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={sendMutationReport} className="btn bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 flex items-center gap-2 px-6 py-3.5 rounded-xl shadow-sm hover:scale-105 transition-transform font-bold text-[10px] uppercase tracking-widest text-slate-700 dark:text-slate-300">
            <Send size={16} /> Kirim ke Owner
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary px-8 py-3.5 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-3 hover:scale-105 transition-transform font-bold text-[10px] uppercase tracking-widest"
          >
            <Plus size={16} /> Buat Mutasi Baru
          </button>
        </div>
      </header>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card flex items-center gap-6 group">
          <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl group-hover:scale-110 transition-transform">
            <Building size={32} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-1">Saldo Kas Utama (Tunai)</span>
            <div className="text-3xl font-bold dark:text-white tracking-tight italic text-emerald-600 dark:text-emerald-400">Rp {formatIDR(summary.transBalance || 0)}</div>
          </div>
        </div>
        <div className="glass-card flex items-center gap-6 group">
          <div className="p-4 bg-sky-500/10 text-sky-500 rounded-2xl group-hover:scale-110 transition-transform">
            <Wallet size={32} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-1">Saldo QRIS / Bank</span>
            <div className="text-3xl font-bold dark:text-white tracking-tight italic text-sky-600 dark:text-sky-400">Rp {formatIDR(summary.walletBalance || 0)}</div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="glass-card overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 px-2">
          <div className="flex items-center gap-3">
            <History size={18} className="text-primary" />
            <h3 className="font-bold uppercase tracking-widest text-xs opacity-70">Riwayat Mutasi Saldo</h3>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 w-full md:w-auto">
            <input
              type="text"
              placeholder="Cari keterangan mutasi..."
              className="bg-transparent border-none outline-none text-xs font-semibold placeholder:text-muted dark:placeholder:text-muted w-full md:w-64"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted dark:text-muted bg-slate-50 dark:bg-white/5">
                <th className="p-4">Tanggal</th>
                <th className="p-4">Tipe Mutasi</th>
                <th className="p-4">Nominal</th>
                <th className="p-4">Keterangan</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = mutations
                  .filter(m => m.description?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                const currentEntries = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

                if (filtered.length === 0) {
                  return <tr><td colSpan={5} className="p-8 text-center text-muted italic text-sm">Tak ada data mutasi yang cocok dengan pencarian.</td></tr>;
                }

                return (
                  <>
                    {currentEntries.map(m => {
                      const details = getMutationDetails(m.type);
                      const Icon = details.icon;
                      return (
                        <tr key={m.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                          <td className="p-4 text-xs font-semibold">{m.date.split('T')[0]}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Icon size={14} className={details.color} />
                              <span className="text-xs font-bold uppercase tracking-wider">{details.label}</span>
                            </div>
                          </td>
                          <td className="p-4 font-bold italic text-slate-800 dark:text-slate-200">Rp {formatIDR(m.amount)}</td>
                          <td className="p-4 text-xs dark:text-slate-400">{m.description}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {(() => {
          const filtered = mutations.filter(m => m.description?.toLowerCase().includes(searchTerm.toLowerCase()));
          const totalPages = Math.ceil(filtered.length / entriesPerPage) || 1;

          if (totalPages <= 1) return null;

          return (
            <div className="flex justify-center items-center gap-2 mt-4 mb-4 py-4 border-t border-slate-200 dark:border-white/5">
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
          );
        })()}
      </div>

      {/* MODAL FORM MUTASI */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] px-4 underline-offset-0">
          <div className={`glass-card w-full ${mutationStep === 'config' ? 'max-w-[480px]' : 'max-w-[780px]'} relative p-8 animate-scale-up transition-all duration-500 ease-in-out`}>
            <button
              className="btn absolute top-6 right-6 p-2 shadow-none bg-transparent hover:bg-slate-200 dark:hover:bg-white/10"
              onClick={() => { setShowModal(false); setMutationStep('config'); }}
            >
              <X size={18} />
            </button>

            <h2 className="text-2xl mb-8 flex items-center gap-3">
              <ArrowLeftRight className="text-primary" />
              {mutationStep === 'config' ? 'Konfigurasi Mutasi' : 'Input Detail Mutasi'}
            </h2>

            {mutationStep === 'config' ? (
              /* --- STEP 1: CONFIGURATION (PORTRAIT) --- */
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3">
                  <Info className="text-primary shrink-0" size={20} />
                  <p className="text-xs text-muted dark:text-muted leading-relaxed">
                    Pilih jenis perpindahan saldo dan tentukan periode data QRIS yang ingin Bapak proses.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-2 ml-1">Jenis Mutasi:</label>
                    <select
                      className="form-input w-full py-4 px-5 text-sm font-bold"
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="wallet_to_cash">QRIS / Bank ➡️ Saldo Kasir</option>
                      <option value="cash_to_wallet">Setoran Kasir ➡️ QRIS / Bank</option>
                      <option value="cash_to_owner">Setoran Kasir ➡️ OWNER</option>
                      <option value="wallet_to_owner">QRIS / Bank ➡️ OWNER</option>
                      <option value="non_sales_to_owner">Pemasukan Non-Sales ➡️ OWNER</option>
                      <option value="donation_to_owner">Saldo Donasi ➡️ OWNER / PENYALURAN</option>
                    </select>

                  </div>

                  <div className="p-5 bg-slate-100 dark:bg-white/5 rounded-3xl border border-slate-200/50 dark:border-white/10 space-y-4 shadow-inner">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-1">Periode Hitung QRIS:</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-muted uppercase font-bold opacity-60">Dari Tanggal:</span>
                        <input
                          type="date"
                          className="form-input px-4 py-3 font-bold"
                          value={qrisStart}
                          onChange={(e) => setQrisStart(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-muted uppercase font-bold opacity-60">Hingga Tanggal:</span>
                        <input
                          type="date"
                          className="form-input px-4 py-3 font-bold"
                          value={qrisEnd}
                          onChange={(e) => setQrisEnd(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary w-full justify-center py-4 rounded-2xl font-bold mt-4 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 flex items-center gap-2"
                  onClick={handleNextStep}
                >
                  Mulai Proses Mutasi <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              /* --- STEP 2: INPUT DETAILS (LANDSCAPE) --- */
              <div className="space-y-6 animate-fade-in">
                {/* STATUS BAR TOP */}
                <div className="flex justify-between items-center bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted">Aksi Terpilih:</span>
                    <span className="text-sm font-bold text-primary italic">
                      {formData.type === 'wallet_to_cash' ? 'Cairkan QRIS ke Kasir' :
                        formData.type === 'cash_to_wallet' ? 'Mutasi Kasir ke Bank' :
                          formData.type === 'cash_to_owner' ? 'Setoran Kasir ke Owner' :
                            formData.type === 'wallet_to_owner' ? 'Transfer QRIS ke Owner' :
                              formData.type === 'non_sales_to_owner' ? 'Setoran Non-Sales ke Owner' : 'Penyaluran Donasi'}
                    </span>

                  </div>
                  <div className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-full shadow-sm">
                    PERIODE DATA: {qrisStart} s/d {qrisEnd}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                  {/* Left Column: Nominal */}
                  <div className="space-y-6">
                    <div>
                      <label className="block mb-2 text-sm font-medium ml-1">Total Nominal Mutasi (Rp)</label>
                      <input
                        type="text"
                        className="form-input text-3xl font-black text-primary text-center py-6 rounded-2xl focus:ring-4 focus:ring-primary/20"
                        autoFocus
                        value={formatIDR(formData.amount)}
                        onChange={e => setFormData({ ...formData, amount: unformatIDR(e.target.value) })}
                      />
                    </div>

                    <div className="p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Wallet size={16} className="text-blue-500" />
                        <span className="text-[10px] uppercase font-black text-blue-500 tracking-widest">Sisa QRIS Terhitung:</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted">Saldo Belum Ditarik:</span>
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-slate-700 dark:text-white">Rp {formatIDR(formData.amount)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowModal(false);
                              setMutationStep('config');
                              setWalletSubTab('qris');
                              setActiveTab('wallet');
                            }}
                            className="text-[9px] font-bold text-blue-500 hover:underline mt-1 uppercase tracking-wider"
                          >
                            Lihat Full History QRIS →
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted italic mt-2 opacity-60">* Nominal di atas sudah dikurangi dengan mutasi yang pernah dilakukan pada periode ini.</p>
                    </div>
                  </div>

                  {/* Right Column: Details */}
                  <div className="space-y-5 flex flex-col justify-center">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium ml-1">Keterangan / Pesan Berita:</label>
                      <textarea
                        className="form-input text-sm  placeholder:text-muted/50 placeholder:italic bg-slate-100 dark:bg-white/5 py-4 px-4 h-24 resize-none leading-relaxed"
                        placeholder="Contoh: Pencairan DANA hasil jualan seminggu ke owner..."
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium ml-1">Tanggal Eksekusi Mutasi:</label>
                      <input
                        type="date"
                        className="form-input text-sm py-3.5 px-4 font-bold"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-4 pt-6 border-t border-slate-200 dark:border-white/5">
                  <button
                    className="btn flex-1 justify-center py-4 rounded-2xl font-bold transition-all hover:bg-slate-200 dark:hover:bg-white/10"
                    onClick={() => setMutationStep('config')}
                  >
                    Kembali Ke Konfigurasi
                  </button>
                  <button
                    className="btn btn-primary flex-1 justify-center py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-transform"
                    onClick={handleSubmit}
                  >
                    Simpan & Update Saldo
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
}
