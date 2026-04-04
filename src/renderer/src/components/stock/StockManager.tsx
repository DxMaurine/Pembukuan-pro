import React from 'react';
import { createPortal } from 'react-dom';
import { Package, Send, Trash2, X } from 'lucide-react';

interface StockManagerProps {
  stockItems: any[];
  newStockItem: string;
  setNewStockItem: (val: string) => void;
  showStockModal: boolean;
  setShowStockModal: (val: boolean) => void;
  handleAddStockItem: (e?: React.FormEvent) => void;
  handleDeleteStockItem: (id: number) => void;
  sendStockToTelegram: () => void;
}

const StockManager: React.FC<StockManagerProps> = ({
  stockItems,
  newStockItem,
  setNewStockItem,
  showStockModal,
  setShowStockModal,
  handleAddStockItem,
  handleDeleteStockItem,
  sendStockToTelegram,
}) => {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">Barang Habis</h1>
          <p className="text-muted dark:text-muted mt-1">Daftar barang yang harus segera dibeli/restok.</p>
        </div>
        <div className="flex gap-4">
          <button className="btn bg-white dark:bg-white/5 border-slate-200 dark:border-white/10" onClick={sendStockToTelegram}>
            <Send size={18} /> Kirim ke Telegram
          </button>
          <button className="btn btn-primary" onClick={() => setShowStockModal(true)}>
            <Package size={18} /> + Tambah Barang
          </button>
        </div>
      </header>

      <div className="glass-card flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stockItems.length === 0 ? (
            <div className="col-span-full py-12 text-center opacity-50 flex flex-col items-center gap-3">
              <Package size={48} />
              <p className="font-bold text-sm tracking-tight text-muted uppercase">Belum ada daftar barang habis.</p>
            </div>
          ) : (
            stockItems.map((item) => (
              <div key={item.id} className="glass-card flex justify-between items-center group hover:scale-[1.02] transition-transform p-5 border-l-4 border-primary">
                <div className="flex flex-col">
                  <span className="font-black text-black dark:text-white uppercase tracking-tight">{item.name}</span>
                  <span className="text-[10px] text-muted dark:text-muted uppercase font-bold tracking-widest mt-1 opacity-70">
                    Dicatat: {new Date(item.dateAdded).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <button
                  className="btn btn-danger p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteStockItem(item.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
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
                  Tambah Barang
                </h2>
              </div>

              <form onSubmit={handleAddStockItem} className="space-y-6">
                <div>
                  <label className="block mb-2 text-[10px] font-black uppercase tracking-widest text-muted opacity-80">Nama Barang</label>
                  <input
                    type="text"
                    className="form-input py-4 text-lg font-black"
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
