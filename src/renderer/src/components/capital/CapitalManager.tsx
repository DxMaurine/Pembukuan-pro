import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Coins, Plus, Calendar, TrendingUp, History, Info, X, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatIDR, unformatIDR } from '../../utils/formatters';
import { months, getYearOptions } from '../../utils/dateUtils';
import Swal from 'sweetalert2';

interface Capital {
  id: number;
  amount: number;
  month: number;
  year: number;
  date: string;
}

interface CapitalManagerProps {
  capitalData: Capital[];
  loadData: () => void;
  api: any;
}

const CapitalManager: React.FC<CapitalManagerProps> = ({ capitalData, loadData, api }) => {
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;
  const today = new Date();
  const [formData, setFormData] = useState({
    amount: '',
    month: today.getMonth(),
    year: today.getFullYear(),
    date: today.toISOString().split('T')[0]
  });

  const currentMonthCapital = capitalData.find(c => c.month === today.getMonth() && c.year === today.getFullYear());
  const yearOptions = getYearOptions();

  const handleSaveCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    await api.saveCapital({
      ...formData,
      amount: parseFloat(unformatIDR(formData.amount))
    });

    setShowModal(false);
    loadData();
    Swal.fire({ title: 'Berhasil!', text: 'Modal toko disimpan.', icon: 'success', timer: 1500, showConfirmButton: false });
  };

  const handleEditClick = (cap: Capital) => {
    setFormData({
      amount: cap.amount.toString(),
      month: cap.month,
      year: cap.year,
      date: cap.date.split('T')[0]
    });
    setShowModal(true);
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Coins className="text-primary" size={32} /> Modal Toko
          </h1>
          <p className="text-muted dark:text-muted mt-1">Kelola saldo awal operasional setiap bulan.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Set Modal Baru
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card md:col-span-2 p-8 flex items-center gap-8 bg-gradient-to-br from-primary/20 to-transparent border-primary/20 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Coins size={150} />
          </div>
          <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
            <TrendingUp size={40} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-primary mb-2">Modal Operasional {months[today.getMonth()]} {today.getFullYear()}</p>
            <h3 className="text-4xl font-black text-black dark:text-white">
              Rp {currentMonthCapital ? formatIDR(currentMonthCapital.amount) : '0'}
            </h3>
            <p className="text-xs text-muted mt-2">Saldo ini digunakan sebagai dasar perhitungan keuntungan bersih.</p>
          </div>
        </div>

        <div className="glass-card p-8 flex flex-col justify-center gap-4 bg-slate-50 dark:bg-white/5 border-dashed border-2">
            <div className="flex items-center gap-3 text-muted">
                <Info size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">Penting:</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">Pastikan modal awal dicatat setiap awal bulan sebelum transaksi pertama masuk.</p>
        </div>
      </div>

      <div className="glass-card">
        <div className="flex items-center gap-3 mb-6">
          <History className="text-primary" size={20} />
          <h3 className="text-lg font-bold">Riwayat Modal Tahunan</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted">Bulan & Tahun</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted">Tanggal Input</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted text-right">Modal Awal</th>
                <th className="pb-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {capitalData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted text-sm opacity-50 italic">Belum ada riwayat modal yang tercatat.</td>
                </tr>
              ) : (
                (() => {
                  const sortedData = capitalData.slice().sort((a, b) => b.id - a.id);
                  const currentEntries = sortedData.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

                  return (
                    <>
                      {currentEntries.map(cap => (
                        <tr key={cap.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg text-muted group-hover:text-primary transition-colors">
                                <Calendar size={14} />
                              </div>
                              <span className="text-sm font-bold">{months[cap.month]} {cap.year}</span>
                            </div>
                          </td>
                          <td className="py-4 text-xs text-muted font-medium">
                            {new Date(cap.date).toLocaleDateString('id-ID')}
                          </td>
                          <td className="py-4 text-sm font-black text-right">
                            Rp {formatIDR(cap.amount)}
                          </td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => handleEditClick(cap)} 
                              className="btn p-2 bg-slate-200 dark:bg-white/10 shadow-none hover:bg-primary/20 hover:text-primary transition-colors border-none opacity-0 group-hover:opacity-100"
                            >
                              <Pencil size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {(() => {
          const totalPages = Math.ceil(capitalData.length / entriesPerPage) || 1;
          if (totalPages <= 1) return null;

          return (
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
          );
        })()}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-[110] px-4 overflow-y-auto">
          <div className="w-full flex justify-center items-center">
            <form onSubmit={handleSaveCapital} className="glass-card w-full max-w-lg relative p-8 animate-scale-up space-y-6">
              <button
                type="button"
                className="btn absolute top-6 right-6 p-2 z-20 shadow-none bg-transparent hover:bg-slate-200 dark:hover:bg-white/10"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>

              <div className="mb-2">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Coins className="text-primary" /> Set Modal Toko
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted opacity-80 block mb-2">Pilih Periode:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <select className="form-input text-sm py-3" value={formData.month} onChange={e => setFormData({...formData, month: parseInt(e.target.value)})}>
                      {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select className="form-input text-sm py-3" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}>
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted opacity-80 block mb-2">Nominal Modal (Rp):</label>
                  <input required autoFocus className="form-input text-2xl font-black py-4 text-center text-primary" value={formatIDR(formData.amount)} onChange={e => setFormData({...formData, amount: unformatIDR(e.target.value)})} placeholder="Rp 0" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted opacity-80 block mb-2">Tanggal Berlaku:</label>
                  <input type="date" className="form-input py-3" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn flex-1 justify-center py-3 rounded-2xl font-bold transition-all hover:bg-slate-100 dark:hover:bg-white/10">Batal</button>
                <button type="submit" className="btn btn-primary flex-1 justify-center py-3 rounded-2xl font-bold shadow-lg shadow-primary/20">Simpan Modal</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CapitalManager;
