import React, { useState } from 'react';
import { Plus, History, TrendingDown, ShoppingBag, X, Info, Zap, HelpCircle, Minus } from 'lucide-react';
import { createPortal } from 'react-dom';

interface FloatingActionsProps {
  onQuickSale: () => void;
  onQuickExpense: () => void;
  onQuickPreorder: () => void;
  openBatchModal: () => void;
}

const GUIDES = [
  {
    id: 'sale',
    title: 'Tambah Penjualan',
    usage: 'Catat setiap transaksi jasa (fotocopy, jilid) atau barang yang langsung dibayar lunas.',
    impact: 'Saldo KAS TOKO otomatis bertambah saat itu juga sesuai nominal.',
    color: 'bg-emerald-500',
    icon: <Plus size={24} />
  },
  {
    id: 'expense',
    title: 'Catat Belanja',
    usage: 'Catat uang keluar untuk operasional (kertas, tinta, listrik) atau belanja stok barang.',
    impact: 'Saldo KAS TOKO otomatis berkurang. Pastikan saldo cukup sebelum belanja.',
    color: 'bg-rose-500',
    icon: <TrendingDown size={24} />
  },
  {
    id: 'preorder',
    title: 'Pesanan Baru',
    usage: 'Gunakan saat pelanggan memesan barang yang belum jadi/stok kosong dan butuh tanda jadi (DP).',
    impact: 'Mencatat Uang Muka, status proses produksi (Desain/Cetak), dan sisa hutang pelanggan.',
    color: 'bg-blue-500',
    icon: <ShoppingBag size={24} />
  },
  {
    id: 'batch',
    title: 'Input Bulanan',
    usage: 'Opsi tercepat untuk merekap data fisik dari buku manual ke sistem dalam hitungan menit.',
    impact: 'Memproses data rekap 30 hari sekaligus untuk memfinalisasi laporan laba-rugi bulanan.',
    color: 'bg-amber-500',
    icon: <History size={24} />
  }
];

const FloatingActions: React.FC<FloatingActionsProps> = ({
  onQuickSale,
  onQuickExpense,
  onQuickPreorder,
  openBatchModal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState<typeof GUIDES[0] | null>(null);


  const actions = [
    { ...GUIDES[0], onClick: onQuickSale },
    { ...GUIDES[1], onClick: onQuickExpense },
    { ...GUIDES[2], onClick: onQuickPreorder },
    { ...GUIDES[3], onClick: openBatchModal },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-3 pointer-events-none">
      {/* Background Dimmer when Open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in pointer-events-auto"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action Menu Items */}
      <div className={`flex flex-col items-end gap-3 transition-all duration-300 relative z-[101] ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        {actions.map((action, i) => (
          <div key={i} className="flex items-center gap-3 group">
            {/* Label with Info Icon */}
            <div className="flex items-center gap-2 bg-white dark:bg-bg-card px-3 py-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 whitespace-nowrap group-hover:scale-105 transition-transform">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                {action.title}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveGuide(action); }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-primary transition-colors"
                title="Lihat Panduan"
              >
                <Info size={12} className="stroke-[3px]" />
              </button>
            </div>

            {/* Action Button */}
            <button
              onClick={() => { action.onClick(); setIsOpen(false); }}
              className={`w-12 h-12 rounded-2xl ${action.color} text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-90 transition-all`}
            >
              {action.icon}
            </button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[2rem] bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center transition-all duration-500 relative z-[101] pointer-events-auto ${isOpen ? 'rotate-180 bg-slate-800 dark:bg-white text-white dark:text-slate-800 rounded-2xl' : 'hover:scale-105 active:scale-90 hover:shadow-primary/60'}`}
      >
        {isOpen ? <X size={32} /> : <Plus size={32} />}
      </button>

      {/* GUIDE MODAL */}
      {activeGuide && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[300] px-4 animate-fade-in">
          <div className="glass-card w-full max-w-[420px] p-8 animate-scale-up relative overflow-hidden group">
            {/* Abstract Background Decoration */}
            <div className={`absolute -top-10 -right-10 w-40 h-40 ${activeGuide.color} opacity-10 rounded-full blur-3xl`} />
            <div className={`absolute -bottom-10 -left-10 w-40 h-40 ${activeGuide.color} opacity-10 rounded-full blur-3xl`} />

            <button
              onClick={() => setActiveGuide(null)}
              className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-muted"
            >
              <Minus size={20} />
            </button>

            <div className="flex flex-col items-center text-center gap-6 relative z-10">
              <div className={`p-4 rounded-3xl ${activeGuide.color} text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform duration-500`}>
                {activeGuide.icon}
              </div>

              <div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-1">
                  PANDUAN: {activeGuide.title}
                </h2>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full opacity-30" />
              </div>

              <div className="space-y-6 text-left w-full">
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <Zap size={14} className="fill-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cara Pakai (Dunia Nyata)</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed opacity-80">{activeGuide.usage}</p>
                </div>

                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-amber-500">
                    <HelpCircle size={14} className="fill-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Efek Ke Sistem</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed opacity-80">{activeGuide.impact}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveGuide(null)}
                className="btn-success w-1/2 flex items-center justify-center py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all text-sm uppercase tracking-widest mt-2"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FloatingActions;
