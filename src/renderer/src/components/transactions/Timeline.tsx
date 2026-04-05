import React from 'react';
import { Edit2, Trash2, ShoppingBag, CreditCard, Wallet, Banknote, History } from 'lucide-react';
import { formatIDR } from '../../utils/formatters';

interface TimelineProps {
  transactions: any[];
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  handleEditClick: (t: any) => void;
  handleDeleteTransaction: (id: number) => void;
  isViewOnly?: boolean;
}

const Timeline: React.FC<TimelineProps> = ({
  transactions,
  currentPage,
  setCurrentPage,
  handleEditClick,
  handleDeleteTransaction,
  isViewOnly = false
}) => {
  const paged = transactions.slice((currentPage - 1) * 10, currentPage * 10);
  const groups: Record<string, any[]> = {};

  paged.forEach((t) => {
    const d = new Date(t.date).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!groups[d]) groups[d] = [];
    groups[d].push(t);
  });

  if (paged.length === 0) {
    return <div className="glass-card text-center py-10 opacity-50">Tidak ada transaksi ditemukan.</div>;
  }

  const totalPages = Math.ceil(transactions.length / 10) || 1;

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'preorder': return <ShoppingBag size={12} className="text-blue-500" />;
      case 'debt': return <CreditCard size={12} className="text-amber-500" />;
      case 'wallet': return <Wallet size={12} className="text-emerald-500" />;
      case 'capital': return <Banknote size={12} className="text-purple-500" />;
      default: return <History size={12} className="text-slate-400" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'preorder': return 'PREORDER';
      case 'debt': return 'PIUTANG';
      case 'wallet': return 'QRIS';
      case 'capital': return 'MODAL';
      default: return 'MANUAL';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-xl font-bold">Log Aktivitas ({transactions.length})</h3>
        <div className="text-[10px] text-muted dark:text-muted font-bold bg-blue-100 dark:bg-white/5 px-2 py-1 rounded-md uppercase tracking-widest border border-blue-200 dark:border-white/10">
          Universal Audit Trail
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(groups).map(([date, items]) => (
          <div key={date} className="flex flex-col gap-2">
            <div className="sticky top-0 z-10 py-2 bg-bg-light/95 dark:bg-bg-dark/95 backdrop-blur-sm border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
              <span className="text-xs font-bold text-muted dark:text-muted uppercase tracking-wider">
                {date}
              </span>
            </div>

            <div className="flex flex-col gap-2 pl-5 border-l-2 border-slate-100 dark:border-white/5 ml-1">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="glass-card group hover:scale-[1.01] transition-all duration-200 py-3.5 px-5 flex items-center justify-between border-l-4"
                  style={{ borderLeftColor: t.type === 'income' ? '#22c55e' : '#f43f5e' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                      {getSourceIcon(t.source)}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {t.description || (t.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 text-[9px] font-black tracking-tighter text-slate-500 dark:text-text-muted rounded border border-slate-200 dark:border-white/10">
                          {getSourceLabel(t.source)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted dark:text-muted font-medium uppercase tracking-widest opacity-70">
                        {t.category || (t.type === 'income' ? 'Penjualan' : 'Operasional')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className={`text-sm font-extrabold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.type === 'income' ? '+' : '-'} Rp {formatIDR(t.amount)}
                    </span>
                    {!isViewOnly && t.source === 'manual' && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="btn p-1.5 hover:bg-slate-100 dark:hover:bg-white/10"
                          onClick={() => handleEditClick(t)}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-danger p-1.5"
                          onClick={() => handleDeleteTransaction(t.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
        <span className="text-xs text-slate-500 dark:text-text-muted font-black tracking-widest uppercase opacity-60">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            className="btn px-4 py-2 text-xs font-bold uppercase tracking-widest border border-slate-200 dark:border-white/10"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </button>
          <button
            className="btn btn-primary px-4 py-2 text-xs font-bold uppercase tracking-widest"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
