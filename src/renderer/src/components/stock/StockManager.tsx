import React from 'react';
import { createPortal } from 'react-dom';
import { Package, Send, Trash2, X, Plus, AlertCircle, Archive, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = React.useState(1);
  const entriesPerPage = 10;

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
          <p className="text-muted dark:text-muted mt-1 uppercase tracking-widest font-bold text-[10px] opacity-60">Pencatatan Barang Habis & Opname v3.1.6-Lite</p>
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
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted opacity-60 w-16">No.</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted opacity-60">Nama Barang</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted opacity-60 w-32 px-1">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted opacity-60 w-48">Tanggal</th>
                <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted opacity-60 w-32">Aksi</th>
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
                <td className="px-4 py-2" colSpan={4}>
                  <div className="flex items-center justify-between gap-4">
                    <input
                      type="text"
                      className="flex-1 bg-transparent border-none outline-none py-4 px-2 font-bold text-xl placeholder:text-primary/30 dark:placeholder:text-primary/10 placeholder:font-normal placeholder:italic"
                      placeholder={isStockUrgent ? "Ketik BARANG MENDESAK..." : "Ketik nama barang + tekan ENTER..."}
                      value={newStockItem}
                      onChange={(e) => setNewStockItem(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <div className="flex items-center gap-3 shrink-0 mr-10">
                      {isStockUrgent && (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-500 text-white text-[10px] font-black rounded-xl animate-pulse whitespace-nowrap shadow-lg shadow-rose-500/20">
                          🚨 MENDESAK
                        </span>
                      )}
                      <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg border ${isStockUrgent ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' : 'text-primary border-primary/20 bg-primary/5 opacity-60'}`}>
                        {isStockUrgent ? 'URGENT MODE' : 'ENTER MODE'}
                      </span>
                    </div>
                  </div>
                </td>
                {/* No sixth column needed because of colSpan={4} */}
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
                (() => {
                  const sortedItems = [...stockItems].reverse();
                  const currentEntries = sortedItems.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

                  return (
                    <>
                      {currentEntries.map((item, index) => {
                        // Original index for the "No." column: sortedItems.length - (actual index in total list)
                        const originalIndex = sortedItems.length - ((currentPage - 1) * entriesPerPage + index);
                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group ${item.isUrgent ? 'bg-rose-500/[0.03] dark:bg-rose-500/[0.06]' : ''}`}
                          >
                            <td className="px-6 py-5 text-sm font-mono opacity-40 text-center">
                              {item.isUrgent ? (
                                <div className="w-6 h-6 bg-rose-500/20 text-rose-500 rounded-lg flex items-center justify-center mx-auto shadow-sm shadow-rose-500/10">
                                  <AlertCircle size={14} strokeWidth={3} />
                                </div>
                              ) : (
                                originalIndex
                              )}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <span className={`font-bold text-lg uppercase tracking-tight transition-colors ${item.status === 'bought' ? 'line-through opacity-40' : item.isUrgent ? 'text-rose-600 dark:text-rose-400' : 'group-hover:text-primary'}`}>
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
                                <span className="flex items-center gap-2 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full w-fit shadow-sm border border-emerald-200 dark:border-emerald-500/30 whitespace-nowrap">
                                  <CheckCircle2 size={12} /> SUDAH DIBELI
                                </span>
                              ) : (
                                <span className={`flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold rounded-full w-fit shadow-sm uppercase italic border whitespace-nowrap ${item.isUrgent ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'}`}>
                                  {item.isUrgent ? '🚨 MENDESAK' : '📦 STOK HABIS'}
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
                        );
                      })}
                    </>
                  );
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {(() => {
          const totalPages = Math.ceil(stockItems.length / entriesPerPage) || 1;
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
                    <label className="block mb-2 text-[10px] font-bold uppercase tracking-widest text-muted opacity-80">Nama Barang</label>
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
