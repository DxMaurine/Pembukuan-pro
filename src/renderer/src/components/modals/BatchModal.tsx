import React from 'react';
import { X, History, Info, Plus, Coffee, Minus } from 'lucide-react';
import { months, getYearOptions } from '../../utils/dateUtils';
import { formatIDR, unformatIDR } from '../../utils/formatters';

interface BatchModalProps {
  showBatchModal: boolean;
  setShowBatchModal: (val: boolean) => void;
  batchStep: 'config' | 'input';
  setBatchStep: (val: 'config' | 'input') => void;
  batchConfig: { month: number; year: number; totalDays: number; startDay: number; limitDay: number };
  setBatchConfig: (val: any) => void;
  currentDay: number;
  setCurrentDay: (val: number | ((v: number) => number)) => void;
  batchData: Record<number, any>;
  setBatchData: (val: any) => void;
  submitBatch: () => void;
}

const BatchModal: React.FC<BatchModalProps> = ({
  showBatchModal,
  setShowBatchModal,
  batchStep,
  setBatchStep,
  batchConfig,
  setBatchConfig,
  currentDay,
  setCurrentDay,
  batchData,
  setBatchData,
  submitBatch,
}) => {
  if (!showBatchModal) return null;

  const yearOptions = getYearOptions();

  const addBatchExpenseItem = () => {
    const current = batchData[currentDay] || { income: '', expenseItems: [] };
    const items = current.expenseItems || [];
    setBatchData({
      ...batchData,
      [currentDay]: { ...current, expenseItems: [...items, { name: '', amount: '' }] }
    });
  };

  const updateBatchExpenseItem = (idx: number, field: string, val: string) => {
    const current = batchData[currentDay] || { income: '', expenseItems: [] };
    const items = [...(current.expenseItems || [])];
    (items[idx] as any)[field] = val;
    setBatchData({
      ...batchData,
      [currentDay]: { ...current, expenseItems: items }
    });
  };

  const removeBatchExpenseItem = (idx: number) => {
    const current = batchData[currentDay] || { income: '', expenseItems: [] };
    const items = (current.expenseItems || []).filter((_: any, i: number) => i !== idx);
    setBatchData({
      ...batchData,
      [currentDay]: { ...current, expenseItems: items }
    });
  };

  const totalDayExpense = (batchData[currentDay]?.expenseItems || []).reduce(
    (sum: number, it: any) => sum + (parseFloat(unformatIDR(it.amount)) || 0), 0
  );

  const toggleLibur = () => {
    if (isCurrentDayLibur) {
      // Batalkan libur: reset ke state kosong
      setBatchData({
        ...batchData,
        [currentDay]: { income: '', expenseItems: [], isLibur: false }
      });
    } else {
      // Set hari libur
      setBatchData({
        ...batchData,
        [currentDay]: { 
          income: '0', 
          expenseItems: [{ name: 'LIBUR / TOKO TUTUP', amount: '0' }],
          isLibur: true 
        }
      });
    }
  };

  const isCurrentDayLibur = batchData[currentDay]?.isLibur === true;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] px-4">
      <div className={`glass-card w-full ${batchStep === 'config' ? 'max-w-[600px]' : 'max-w-[900px]'} relative py-10 px-8 animate-scale-up transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden`}>
        <button
          className="btn absolute top-6 right-6 p-2 shadow-none bg-transparent hover:bg-slate-200 dark:hover:bg-white/10"
          onClick={() => setShowBatchModal(false)}
        >
          <X size={18} />
        </button>

        <h2 className="text-2xl mb-6 flex items-center gap-3">
          <History className="text-primary" /> Input Batch Bulanan
        </h2>

        {batchStep === 'config' ? (
          <div className="space-y-6">
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3">
              <Info className="text-primary shrink-0" size={20} />
              <p className="text-xs text-muted dark:text-muted leading-relaxed">
                Fitur ini memudahkan Anda untuk menginput data harian secara berurutan dalam satu bulan sekaligus.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-2 px-1">Pilih Bulan:</label>
                <select
                  className="form-input"
                  value={batchConfig.month}
                  onChange={(e) => {
                    const m = parseInt(e.target.value);
                    const days = new Date(batchConfig.year, m + 1, 0).getDate();
                    setBatchConfig({ ...batchConfig, month: m, totalDays: days, startDay: 1, limitDay: days });
                  }}
                >
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-2 px-1">Pilih Tahun:</label>
                <select
                  className="form-input"
                  value={batchConfig.year}
                  onChange={(e) => {
                    const y = parseInt(e.target.value);
                    const days = new Date(y, batchConfig.month + 1, 0).getDate();
                    setBatchConfig({ ...batchConfig, year: y, totalDays: days, startDay: 1, limitDay: days });
                  }}
                >
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-1">Rentang Tanggal Input:</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-muted uppercase font-bold">Mulai Dari:</span>
                  <input
                    type="number"
                    min="1"
                    max={batchConfig.limitDay}
                    className="form-input px-4 py-3 text-center font-bold text-xl"
                    value={batchConfig.startDay}
                    onChange={(e) => setBatchConfig({ ...batchConfig, startDay: Math.min(parseInt(e.target.value) || 1, batchConfig.limitDay) })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-muted uppercase font-bold">Hingga Tanggal:</span>
                  <input
                    type="number"
                    min={batchConfig.startDay}
                    max={batchConfig.totalDays}
                    className="form-input px-4 py-3 text-center font-bold text-xl"
                    value={batchConfig.limitDay}
                    onChange={(e) => setBatchConfig({ ...batchConfig, limitDay: Math.max(parseInt(e.target.value) || 1, batchConfig.startDay) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <button 
                  className="btn py-2 text-[10px] font-bold uppercase"
                  onClick={() => setBatchConfig({ ...batchConfig, startDay: 1, limitDay: 15 })}
                >
                  Paruh 1 (1-15)
                </button>
                <button 
                  className="btn py-2 text-[10px] font-bold uppercase"
                  onClick={() => setBatchConfig({ ...batchConfig, startDay: 16, limitDay: batchConfig.totalDays })}
                >
                  Paruh 2 (16-Akhir)
                </button>
                <button 
                  className="btn py-2 text-[10px] font-bold uppercase"
                  onClick={() => setBatchConfig({ ...batchConfig, startDay: 1, limitDay: batchConfig.totalDays })}
                >
                  Full Bulan
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary w-full justify-center py-4 rounded-2xl font-bold mt-4 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
              onClick={() => {
                setCurrentDay(batchConfig.startDay);
                setBatchStep('input');
              }}
            >
              Mulai Input Sekarang
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8 min-h-0 flex-1 overflow-hidden">
            <div className="flex justify-between items-center bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted">Sedang Input:</span>
                <span className="text-sm font-bold text-black dark:text-white">{currentDay} {months[batchConfig.month]} {batchConfig.year}</span>
              </div>
              <div className="flex items-center gap-3">
                {isCurrentDayLibur && (
                  <div
                    title="Klik tombol Libur lagi untuk membatalkan"
                    className="text-[10px] font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg shadow-sm animate-bounce cursor-default"
                  >
                    HARI LIBUR
                  </div>
                )}
                <div className="text-xs font-bold text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                  Hari {currentDay} dari {batchConfig.limitDay}
                </div>
                <button
                  type="button"
                  onClick={toggleLibur}
                  title={isCurrentDayLibur ? 'Klik untuk batalkan libur' : 'Tandai sebagai hari libur'}
                  className={`btn flex items-center gap-2 py-2 px-4 text-xs font-bold transition-all ${
                    isCurrentDayLibur 
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-105 hover:bg-red-500 hover:border-red-500' 
                      : 'bg-slate-200 dark:bg-white/10 hover:bg-amber-500 hover:text-white border-transparent hover:scale-105'
                  }`}
                >
                  <Coffee size={14} /> {isCurrentDayLibur ? 'Batal Libur' : 'Libur'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 min-h-0 flex-1">
              {/* Left Column: Income */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-2 px-1">Total Pemasukan (Rp)</label>
                    <input
                      type="text"
                      className="form-input text-3xl font-bold text-emerald-500 text-center py-6 rounded-2xl"
                    placeholder="Rp 0"
                    autoFocus
                    value={formatIDR(batchData[currentDay]?.income || '')}
                    onChange={(e) => setBatchData({
                      ...batchData,
                      [currentDay]: { ...batchData[currentDay], income: unformatIDR(e.target.value) }
                    })}
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-muted block mb-2">Ringkasan Hari Ini:</span>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span>Pemasukan:</span>
                    <span className="text-success font-bold">Rp {formatIDR(batchData[currentDay]?.income || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Pengeluaran:</span>
                    <span className="text-danger font-bold">Rp {formatIDR(totalDayExpense)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Detailed Expenses */}
              <div className="flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Rincian Pengeluaran Hari Ini:</label>
                  <button
                    type="button"
                    className="btn btn-primary py-2 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                    onClick={addBatchExpenseItem}
                  >
                    <Plus size={14} /> Tambah Item
                  </button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar" style={{maxHeight: 'calc(90vh - 340px)'}}>
                  {(batchData[currentDay]?.expenseItems || []).length === 0 ? (
                    <div className="text-center py-10 opacity-30 text-xs text-muted dark:text-muted border-2 border-dashed rounded-2xl border-slate-300">
                      Belum ada rincian belanja.
                    </div>
                  ) : (
                    (batchData[currentDay]?.expenseItems || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-3 items-center animate-fade-in group">
                        <div className="flex-grow min-w-0">
                          <input
                            className="form-input text-sm py-2.5 px-4"
                            placeholder="Deskripsi..."
                            autoFocus={idx !== 0} // Auto focus on new items
                            value={item.name}
                            onChange={(e) => updateBatchExpenseItem(idx, 'name', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addBatchExpenseItem();
                              }
                            }}
                          />
                        </div>
                        <div className="w-[110px] shrink-0">
                          <input
                            className="form-input text-sm py-2.5 px-4 text-right font-medium"
                            placeholder="Rp 0"
                            value={formatIDR(item.amount)}
                            onChange={(e) => updateBatchExpenseItem(idx, 'amount', unformatIDR(e.target.value))}
                          />
                        </div>
                        <button
                          className="btn btn-danger p-2.5 shrink-0 rounded-xl transition-all"
                          onClick={() => removeBatchExpenseItem(idx)}
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2 pt-8 border-t border-slate-200 dark:border-white/5">
              {/* 1. Kembali ke pilih periode */}
              <button
                className="btn flex-1 justify-center py-3 rounded-2xl font-semibold text-sm transition-all hover:bg-slate-200 dark:hover:bg-white/10"
                onClick={() => setBatchStep('config')}
                title="Kembali ke pilih periode"
              >
                Kembali
              </button>

              {/* 2. Simpan & Selesai */}
              <button
                className="btn flex-1 justify-center py-3 rounded-2xl font-semibold text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                onClick={submitBatch}
                title="Simpan semua data yang sudah diinput dan tutup"
              >
                Simpan & Selesai
              </button>

              {/* 3. Hari Sebelumnya */}
              <button
                className="btn flex-1 justify-center py-3 rounded-2xl font-semibold text-sm transition-all hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={currentDay <= batchConfig.startDay}
                onClick={() => setCurrentDay((d: number) => d - 1)}
              >
                ← Hari Sebelumnya
              </button>

              {/* 4. Hari Berikutnya / Simpan Semua */}
              {currentDay < batchConfig.limitDay ? (
                <button
                  className="btn btn-primary flex-1 justify-center py-3 rounded-2xl font-semibold text-sm"
                  onClick={() => setCurrentDay((d: number) => d + 1)}
                >
                  Hari Berikutnya →
                </button>
              ) : (
                <button
                  className="btn flex-1 justify-center py-3 rounded-2xl font-semibold text-sm bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 transition-all"
                  onClick={submitBatch}
                >
                  ✓ Simpan Semua Data
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default BatchModal;
