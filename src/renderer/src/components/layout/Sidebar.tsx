import React from 'react';
import {
  LayoutDashboard,
  History,
  Package,
  FileText,
  CreditCard,
  Wallet,
  Coins,
  Settings,
  ShoppingBag,
  Sun,
  Moon,
  LogOut,
  MessageCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

interface SidebarProps {
  storeName: string;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  setIsLoggedIn: (val: boolean) => void;
  setLoginInput: (val: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  storeName,
  activeTab,
  setActiveTab,
  theme,
  setTheme,
  setIsLoggedIn,
  setLoginInput,
}) => {
  const navGroups = [
    {
      title: 'Main Menu',
      items: [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'preorder', icon: ShoppingBag, label: 'Preorder' },
        { id: 'transactions', icon: History, label: 'Riwayat Transaksi' },
      ]
    },
    {
      title: 'Financial',
      items: [
        { id: 'debt', icon: CreditCard, label: 'Hutang Piutang' },
        { id: 'wallet', icon: Wallet, label: 'Wallet & QRIS' },
        { id: 'capital', icon: Coins, label: 'Modal Toko' },
      ]
    },
    {
      title: 'Inventory',
      items: [
        { id: 'stock', icon: Package, label: 'Stok Barang Habis' },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp Manager' },
        { id: 'reports', icon: FileText, label: 'Laporan PDF' },
        { id: 'settings', icon: Settings, label: 'Pengaturan App' },
      ]
    }
  ];

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginInput('');
    Swal.fire({
      title: 'Sistem Terkunci',
      text: 'Selesai bertugas, sesi Anda telah diakhiri.',
      icon: 'info',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  return (
    <aside className="w-[280px] bg-white dark:bg-bg-dark border-r border-slate-200 dark:border-white/5 flex flex-col shrink-0 z-20 overflow-hidden">
      <div className="p-8 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h2 className="text-xl Font-bold tracking-tight text-muted/90 leading-none uppercase">{storeName}</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] Font-bold uppercase tracking-widest text-muted opacity-60">Admin Pro v1.0</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-8 pb-10">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-4 pt-1">
            <h3 className="px-4 text-[10px] Font-bold uppercase tracking-[0.2em] text-muted opacity-40 mb-2">{group.title}</h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 overflow-hidden ${isActive
                      ? 'text-primary bg-primary/5 dark:bg-primary/10'
                      : 'text-muted hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                  >
                    {/* Active Accent Bar */}
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-primary transition-all duration-500 ${isActive ? 'h-6' : 'h-0'}`}></div>

                    <item.icon size={20} className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary' : 'opacity-70 group-hover:opacity-100'}`} />
                    <span className="relative z-10">{item.label}</span>

                    {isActive && (
                      <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary shadow-lg shadow-primary/50 animate-pulse"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-6 mt-auto border-t border-slate-200 dark:border-white/5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all group"
            title="Ganti Tema"
          >
            {theme === 'dark' ? (
              <Moon size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
            ) : (
              <Sun size={20} className="text-orange-500 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-[9px] Font-bold uppercase tracking-widest text-muted">Theme</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-rose-500/30 transition-all group"
            title="Keluar"
          >
            <LogOut size={20} className="text-rose-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] Font-bold uppercase tracking-widest text-muted">Logout</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-[9px] text-muted opacity-40 Font-bold uppercase tracking-[0.3em]">
            Harmony Interface v1.0.0
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
