import React from 'react';
import { createPortal } from 'react-dom';
import { Package, Send, Trash2, X, Plus, AlertCircle, Archive, CheckCircle2 } from 'lucide-react';

interface StockManagerProps {
  stockItems: any[];
  newStockItem: string;
  setNewStockItem: (val: string) => void;
  showStockModal: boolean;
  setShowStockModal: (val: boolean) => void;
  handleAddStockItem: (e?: React.FormEvent, shouldClose?: boolean) => void;
  handleDeleteStockItem: (id: number) => void;
  handleMarkBoughtItem?: (id: number) => void;
  sendStockToOwner: () => void;
  isStockUrgent: boolean;
  setIsStockUrgent: (val: boolean) => void;
}

const StockManager: React.FC<StockManagerProps> = ({
  stockItems,
  newStockItem,
  setNewStockItem,
  showStockModal,
  setShowStockModal,
  handleAddStockItem,
  handleDeleteStockItem,
  handleMarkBoughtItem,
  sendStockToOwner,
  isStockUrgent,
  setIsStockUrgent,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddStockItem(undefined, false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Archive className="text-primary" size={32} /> Stock Hub
          </h1>
          <p className="text-muted dark:text-muted mt-1 uppercase tracking-widest Font_bold text-[10px] opacity-60">Pencatatan Barang Habis & Opname</p>
        </div>
        <div className="flex gap-4">
          <button className="btn bg-white dark:bg-white/5 border-slate-200 dark:border-white/10" onClick={sendStockToOwner}>
            <Send size={18} /> Kirim ke Owner
          </button>
          <button className="btn btn-primary" onClick={() => { setIsStockUrgent(false); setShowStockModal(true); }}>
            <Package size={18} /> + Tambah Manual
          </button>
        </div>
      </header>

      {/* Excel Style Grid Container */}
      <div className="glass-card p-0 overflow-hidden border-none shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className="px-6 py-4 text-left text-[10px] Font_bold uppercase tracking-[0.2em] text-muted opacity-60 w-16">No.</th>
                <th className="px-6 py-4 text-left text-[10px] Font_bold uppercase tracking-[0.2em] text-muted opacity-60">Nama Barang</th>
                <th className="px-6 py-4 text-left text-[10px] Font_bold uppercase tracking-[0.2em] text-muted opacity-60 w-32">Status</th>
                <th className="px-6 py-4 text-left text-[10px] Font_bold uppercase tracking-[0.2em] text-muted opacity-60 w-48">Tanggal Dicatat</th>
                <th className="px-6 py-4 text-center text-[10px] Font_bold uppercase tracking-[0.2em] text-muted opacity-60 w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {/* Quick Add Row (Excel Mode) */}
              <tr className={`${isStockUrgent ? 'bg-rose-500/5 dark:bg-rose-500/10' : 'bg-primary/5 dark:bg-primary/10'} transition-colors group`}>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => setIsStockUrgent(!isStockUrgent)}
                    className={`w-8 h-8 rounded-xl transition-all flex items-center justify-center ${
                      isStockUrgent 
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-110' 
                        : 'bg-primary/20 text-primary hover:bg-primary/30'
                    }`}
                    title={isStockUrgent ? "Status: MENDESAK" : "Klik untuk tandai MENDESAK"}
                  >
                    {isStockUrgent ? <AlertCircle size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                  </button>
                </td>
                <td className="px-4 py-2" colSpan={2}>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      className="w-full bg-transparent border-none outline-none py-3 px-2 font-bold text-lg placeholder:text-primary/30 placeholder:font-normal"
                      placeholder={isStockUrgent ? "Ketik BARANG MENDESAK..." : "Ketik nama barang + tekan ENTER..."}
                      value={newStockItem}
                      onChange={(e) => setNewStockItem(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    {isStockUrgent && (
                      <span className="flex items-center gap-1 px-3 py-1 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse whitespace-nowrap">
                        🚨 MENDESAK
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                   <span className={`text-[9px] Font_bold uppercase tracking-tighter ${isStockUrgent ? 'text-rose-500' : 'text-primary opacity-40'}`}>
                     {isStockUrgent ? 'URGENT MODE' : 'ENTER MODE'}
                   </span>
                </td>
              </tr>

              {/* Data Rows */}
              {stockItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center opacity-30">
                    <div className="flex flex-col items-center gap-4">
                      <Package size={48} strokeWidth={1} />
                      <p className="font-bold text-xs uppercase tracking-[0.3em]">Belum ada data barang</p>
                    </div>
                  </td>
                </tr>
              ) : (
                [...stockItems].reverse().map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group ${
                      item.isUrgent ? 'bg-rose-500/[0.03] dark:bg-rose-500/[0.06]' : ''
                    }`}
                  >
                    <td className="px-6 py-5 text-sm font-mono opacity-40 text-center">
                      {item.isUrgent ? (
                        <div className="w-6 h-6 bg-rose-500/20 text-rose-500 rounded-lg flex items-center justify-center mx-auto shadow-sm shadow-rose-500/10">
                          <AlertCircle size={14} strokeWidth={3} />
                        </div>
                      ) : (
                        stockItems.length - index
                      )}
                    </td>
                  <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-lg uppercase tracking-tight transition-colors italic ${
                          item.status === 'bought' ? 'line-through opacity-40' : item.isUrgent ? 'text-rose-600 dark:text-rose-400' : 'group-hover:text-primary'
                        }`}>
                          {item.name}
                        </span>
                        {item.isUrgent && item.status !== 'bought' && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[9px] font-black rounded-lg border border-rose-200 dark:border-rose-500/30">
                             PENANGANAN CEPAT
                          </div>
                        )}
                        {item.source === 'mobile' && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded-lg border border-blue-200 dark:border-blue-500/30">
                            📱 Mobile
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {item.status === 'bought' ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded-xl w-fit">
                          <CheckCircle2 size={12} /> Sudah Dibeli
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-xl w-fit ${
                          item.isUrgent
                            ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        }`}>
                          {item.isUrgent ? '🚨 Mendesak' : '📦 Habis'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold opacity-80 uppercase tracking-wider">{new Date(item.dateAdded).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <span className="text-[10px] opacity-40 font-mono italic">{new Date(item.dateAdded).toLocaleTimeString('id-ID')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.status !== 'bought' && handleMarkBoughtItem && (
                          <button
                            className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-500 hover:text-white"
                            title="Tandai Sudah Dibeli"
                            onClick={() => handleMarkBoughtItem(item.id)}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button
                          className="p-2.5 rounded-xl bg-danger/10 text-danger opacity-0 group-hover:opacity-100 transition-all hover:bg-danger hover:text-white"
                          onClick={() => handleDeleteStockItem(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showStockModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-[110] px-4 overflow-y-auto">
          <div className="w-full flex justify-center items-center">
            <div className="glass-card w-full max-w-lg relative p-8 animate-scale-up my-auto">
              <button
                className="btn absolute top-6 right-6 p-2 shadow-none bg-transparent hover:bg-slate-200 dark:hover:bg-white/10"
                onClick={() => setShowStockModal(false)}
              >
                <X size={18} />
              </button>

              <div className="mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-2xl text-primary"><Package size={24} /></div>
                  Tambah Barang Manual
                </h2>
              </div>

              <form onSubmit={handleAddStockItem} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-[10px] Font_bold uppercase tracking-widest text-muted opacity-80">Nama Barang</label>
                    <input
                      type="text"
                      className="form-input py-4 text-lg font-normal"
                      placeholder="Contoh: Kertas A4, Tinta Printer..."
                      autoFocus
                      required
                      value={newStockItem}
                      onChange={(e) => setNewStockItem(e.target.value)}
                    />
                  </div>

                  <div 
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                      isStockUrgent 
                      ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30' 
                      : 'bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10'
                    }`}
                    onClick={() => setIsStockUrgent(!isStockUrgent)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isStockUrgent ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-muted'
                    }`}>
                      <AlertCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Tandai MENDESAK</p>
                      <p className="text-[10px] text-muted italic">Prioritas tinggi untuk segera dibeli.</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isStockUrgent ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 dark:border-white/20'
                    }`}>
                      {isStockUrgent && <CheckCircle2 size={14} strokeWidth={3} />}
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full justify-center py-5 rounded-2x font-bold text-md shadow-lg shadow-primary/20">
                  Simpan ke Daftar
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StockManager;
