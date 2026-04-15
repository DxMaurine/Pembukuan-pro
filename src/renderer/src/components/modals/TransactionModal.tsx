import React from 'react';
import { X, Package, FilePlus, CreditCard, Plus, Info, Minus } from 'lucide-react';
import { formatIDR, unformatIDR } from '../../utils/formatters';

interface TransactionModalProps {
  showModal: boolean;
  closeModal: () => void;
  editingId: number | null;
  formData: any;
  setFormData: (data: any) => void;
  handleAddTransaction: (e: React.FormEvent) => void;
  addExpenseItem: () => void;
  updateExpenseItem: (idx: number, field: string, val: string) => void;
  removeExpenseItem: (idx: number) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  showModal,
  closeModal,
  editingId,
  formData,
  setFormData,
  handleAddTransaction,
  addExpenseItem,
  updateExpenseItem,
  removeExpenseItem,
}) => {
  if (!showModal) return null;

  const isIncome = formData.type === 'income';

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] px-4 overflow-y-auto">
      <div className="glass-card w-full max-w-[800px] relative p-6 animate-scale-up my-auto transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isIncome ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
              {isIncome ? <FilePlus size={20} /> : <CreditCard size={20} />}
            </div>
            {editingId ? 'Edit Catatan' : 'Tambah Catatan Baru'}
          </h2>
          <button
            className="btn p-2 shadow-none bg-transparent hover:bg-slate-200 dark:hover:bg-white/10"
            onClick={closeModal}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAddTransaction} className="space-y-4">
          {/* Top Info Bar: Date & Type */}
          <div className="flex flex-col md:flex-row gap-4 bg-slate-100 dark:bg-white/5 p-3 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-inner">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-muted opacity-60">Tanggal Transaksi:</span>
              <input
                type="date"
                className="form-input bg-white dark:bg-black/20 border-transparent shadow-sm py-1.5 text-sm"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-muted opacity-60">Arus Kas (Tipe):</span>
              <select
                className={`form-input bg-white dark:bg-black/20 border-transparent shadow-sm py-1.5 text-sm font-bold ${isIncome ? 'text-success' : 'text-primary'}`}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="income">💰 PENJUALAN / PEMASUKAN (+)</option>
                <option value="expense">💸 BELANJA / PENGELUARAN (-)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Main Amount & General Info */}
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">Total Jumlah (Rp)</label>
                <input
                  type="text"
                  className={`form-input text-2xl font-bold text-center py-3 shadow-lg shadow-black/5 bg-slate-50 dark:bg-white/5 border-2 ${
                    isIncome ? 'text-success border-success/20' : 'text-primary border-primary/20'
                  } ${formData.items.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  required
                  disabled={formData.items.length > 0}
                  value={formatIDR(formData.amount)}
                  onChange={(e) => setFormData({ ...formData, amount: unformatIDR(e.target.value) })}
                  placeholder="0"
                />
                {formData.items.length > 0 && (
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted dark:text-muted font-bold italic opacity-60">
                    <Info size={10} /> Terhitung otomatis dari rincian detail
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">Keterangan Utama</label>
                  <input
                    className="form-input py-2.5 text-sm font-medium"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Judul transaksi..."
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">Kategori</label>
                  <input
                    className="form-input py-2.5 text-sm font-medium"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Contoh: Operasional, Penjualan"
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    <option value="Penjualan" />
                    <option value="Operasional" />
                    <option value="Lain-lain" />
                    <option value="Pribadi / Jajan" />
                    <option value="Modal Toko" />
                    <option value="Listrik / Air" />
                    <option value="Sewa Tempat" />
                  </datalist>

                </div>
              </div>

              {/* Day Summary Style */}
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <span className="text-[9px] uppercase font-bold tracking-widest text-muted block mb-2">Ringkasan Hari Ini:</span>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium opacity-70">Pemasukan:</span>
                  <span className="text-success font-bold">Rp {formatIDR(isIncome ? formData.amount : 0)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium opacity-70">Pengeluaran:</span>
                  <span className="text-primary font-bold">Rp {formatIDR(isIncome ? 0 : formData.amount)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Items */}
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-3">
                <div className="flex flex-col">
                  <label className="text-xs font-bold uppercase tracking-wide">Rincian Detail</label>
                  <span className="text-[8px] text-muted font-bold uppercase tracking-[0.2em] opacity-50">Sub-Items Breakdown</span>
                </div>
                  <button
                    type="button"
                    className={`btn py-2 px-4 text-[10px] font-bold uppercase tracking-widest border-none shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${
                      isIncome ? 'btn-success shadow-success/20' : 'btn-primary shadow-primary/20'
                    }`}
                    onClick={addExpenseItem}
                  >
                    <Plus size={14} /> Tambah Item
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-2 min-h-[220px] max-h-[280px]">
                {formData.items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 py-8 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl group hover:border-primary/30 transition-colors">
                    <Package size={32} className="mb-2 text-muted" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted text-center leading-relaxed">
                      Belum ada rincian belanja.
                    </p>
                  </div>
                ) : (
                  formData.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center animate-fade-in group">
                      <div className="flex-grow min-w-0">
                        <input
                          className="form-input py-2 px-3 text-[11px] font-bold"
                          placeholder="Deskripsi Item..."
                          value={item.name}
                          autoFocus={idx > 0}
                          onChange={(e) => updateExpenseItem(idx, 'name', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExpenseItem(); } }}
                        />
                      </div>
                      <div className="w-[100px] shrink-0">
                        <input
                          className="form-input py-2 px-3 text-[11px] text-right font-bold"
                          placeholder="0"
                          value={formatIDR(item.amount)}
                          onChange={(e) => updateExpenseItem(idx, 'amount', unformatIDR(e.target.value))}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger p-2.5 shrink-0 rounded-xl transition-all shadow-lg shadow-rose-500/20"
                        onClick={() => removeExpenseItem(idx)}
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
            <button
              type="button"
              className="btn flex-1 justify-center py-3.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-white/10"
              onClick={closeModal}
            >
              Kembali
            </button>
            <button
              type="submit"
              className={`btn flex-2 justify-center py-3.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95 ${
                isIncome ? 'btn-success shadow-success/20' : 'btn-primary shadow-primary/20'
              }`}
            >
              {editingId ? 'Simpan Perubahan' : 'Proses Simpan Catatan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
