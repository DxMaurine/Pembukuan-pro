import React from 'react';
import { createPortal } from 'react-dom';
import { Package, Send, Trash2, X, Plus } from 'lucide-react';

interface StockManagerProps {
  stockItems: any[];
  newStockItem: string;
  setNewStockItem: (val: string) => void;
  showStockModal: boolean;
  setShowStockModal: (val: boolean) => void;
  handleAddStockItem: (e?: React.FormEvent, shouldClose?: boolean) => void;
  handleDeleteStockItem: (id: number) => void;
  sendStockToOwner: () => void;
}

const StockManager: React.FC<StockManagerProps> = ({
  stockItems,
  newStockItem,
  setNewStockItem,
  showStockModal,
  setShowStockModal,
  handleAddStockItem,
  handleDeleteStockItem,
  sendStockToOwner,
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
          <h1 className="text-3xl font-semibold">Stock Hub</h1>
          <p className="text-muted dark:text-muted mt-1 uppercase tracking-widest font-black text-[10px] opacity-60">Pencatatan Barang Habis & Opname</p>
        </div>
        <div className="flex gap-4">
          <button className="btn bg-white dark:bg-white/5 border-slate-200 dark:border-white/10" onClick={sendStockToOwner}>
            <Send size={18} /> Kirim ke Owner
          </button>
          <button className="btn btn-primary" onClick={() => setShowStockModal(true)}>
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
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-60 w-16">No.</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-60">Nama Barang</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-60 w-48">Tanggal Dicatat</th>
                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-60 w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {/* Quick Add Row (Excel Mode) */}
              <tr className="bg-primary/5 dark:bg-primary/10 group">
                <td className="px-6 py-4 text-center">
                  <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                    <Plus size={14} strokeWidth={3} />
                  </div>
                </td>
                <td className="px-4 py-2" colSpan={2}>
                  <input
                    type="text"
                    className="w-full bg-transparent border-none outline-none py-3 px-2 font-bold text-lg placeholder:text-primary/30 placeholder:font-normal"
                    placeholder="Ketik nama barang + tekan ENTER untuk tambah cepat..."
                    value={newStockItem}
                    onChange={(e) => setNewStockItem(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </td>
                <td className="px-6 py-4 text-center">
                   <span className="text-[9px] font-black text-primary uppercase tracking-tighter animate-pulse">ENTER MODE</span>
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
                stockItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-5 text-sm font-mono opacity-40">{index + 1}</td>
                    <td className="px-6 py-5">
                      <span className="font-bold text-lg uppercase tracking-tight group-hover:text-primary transition-colors italic">{item.name}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold opacity-80 uppercase tracking-wider">{new Date(item.dateAdded).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <span className="text-[10px] opacity-40 font-mono italic">{new Date(item.dateAdded).toLocaleTimeString('id-ID')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button
                        className="p-2.5 rounded-xl bg-danger/10 text-danger opacity-0 group-hover:opacity-100 transition-all hover:bg-danger hover:text-white"
                        onClick={() => handleDeleteStockItem(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
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
                <div>
                  <label className="block mb-2 text-[10px] font-black uppercase tracking-widest text-muted opacity-80">Nama Barang</label>
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
