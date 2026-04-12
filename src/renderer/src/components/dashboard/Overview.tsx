import React, { useMemo } from 'react';
import { History, TrendingUp, TrendingDown, ShoppingBag } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatIDR } from '../../utils/formatters';
import { getYearOptions } from '../../utils/dateUtils';

interface OverviewProps {
  summary: { totalIncome: number; totalExpense: number; balance: number };
  prevSummary: { totalIncome: number; totalExpense: number; balance: number };
  chartData: any[];
  preorders: any[];
  theme: 'light' | 'dark';
  openBatchModal: () => void;
  filterMonth: number;
  filterYear: number;
  applyMonthFilter: (m: number, y: number) => void;
}

const Overview: React.FC<OverviewProps> = ({
  summary,
  prevSummary,
  chartData,
  preorders,
  theme,
  openBatchModal,
  filterMonth,
  filterYear,
  applyMonthFilter,
}) => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const yearOptions = getYearOptions();

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
  const tickColor = theme === 'dark' ? '#8c8c8c' : '#64748b';

  const renderTrend = (current: number, previous: number, isExpense = false) => {
    const diff = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    let color = 'text-rose-500';
    if (diff > 0) color = isExpense ? 'text-rose-500' : 'text-emerald-500';
    if (diff < 0) color = isExpense ? 'text-emerald-500' : 'text-rose-500';
    if (diff === 0) color = 'text-muted dark:text-muted';

    return (
      <div className={`text-xs font-bold flex items-center gap-1 mt-1 ${color}`}>
        {diff > 0 ? (
          <TrendingUp size={12} className="stroke-[3px]" />
        ) : (
          <TrendingDown size={12} className="stroke-[3px]" />
        )}
        <span>{Math.abs(diff).toFixed(1)}% vs bln lalu</span>
      </div>
    );
  };

  // ── Preorder Status Bar Data ───────────────────────────────────
  const preorderStatusData = useMemo(() => [
    {
      label: 'Antrian',
      count: preorders.filter(p => p.status === 'pending').length,
      color: '#8c8c8c',
    },
    {
      label: 'Desain',
      count: preorders.filter(p => p.status === 'designing').length,
      color: '#3b82f6',
    },
    {
      label: 'Cetak',
      count: preorders.filter(p => p.status === 'printing').length,
      color: '#f59e0b',
    },
    {
      label: 'Selesai',
      count: preorders.filter(p => p.status === 'completed').length,
      color: '#10b981',
    },
    {
      label: 'Batal',
      count: preorders.filter(p => p.status === 'canceled').length,
      color: '#ef4444',
    },
  ], [preorders]);

  const totalActive = preorders.filter(p => p.status !== 'completed' && p.status !== 'canceled').length;

  // ── Preorder Status Tooltip ────────────────────────────────────
  const StatusTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-bg-light dark:bg-bg-card border border-slate-200 dark:border-border p-4 rounded-2xl shadow-2xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{label}</p>
        <p className="text-sm font-bold dark:text-[#d4d4d4]">
          {payload[0].value} <span className="text-xs text-muted font-medium">pesanan</span>
        </p>
      </div>
    );
  };

  // ── Area Tooltip ───────────────────────────────────────────────
  const AreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-bg-light dark:bg-bg-card border border-slate-200 dark:border-border p-4 rounded-2xl shadow-2xl animate-fade-in">
        <p className="text-xs font-bold mb-3 text-muted uppercase tracking-widest">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3 mb-2 last:mb-0">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-xs font-medium text-muted">
              {entry.name === 'income' ? 'Masuk' : entry.name === 'expense' ? 'Keluar' : 'Mutasi'}:
            </span>
            <span className="text-xs font-bold dark:text-[#d4d4d4]">
              Rp {formatIDR(entry.value as number)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800 dark:text-white">
            <TrendingUp className="text-primary" size={32} /> Ringkasan Bisnis
          </h1>
          <p className="text-muted dark:text-muted mt-1 font-bold text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/10 inline-block shadow-inner mt-2">
            {months[filterMonth]} {filterYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl shadow-sm text-muted dark:text-muted">
            <select
              className="bg-transparent border-none outline-none text-xs font-bold px-3 py-2 cursor-pointer hover:text-primary transition-colors text-inherit"
              value={filterMonth}
              onChange={(e) => applyMonthFilter(parseInt(e.target.value), filterYear)}
            >
              {months.map((m, i) => <option key={i} value={i} className="bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-slate-200">{m}</option>)}
            </select>
            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1"></div>
            <select
              className="bg-transparent border-none outline-none text-xs font-bold px-3 py-2 cursor-pointer hover:text-primary transition-colors text-inherit"
              value={filterYear}
              onChange={(e) => applyMonthFilter(filterMonth, parseInt(e.target.value))}
            >
              {yearOptions.map(y => <option key={y} value={y} className="bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-slate-200">{y}</option>)}
            </select>
          </div>

          <button className="btn btn-primary px-6 py-3.5 text-sm font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-[1.02] transition-transform active:scale-95" onClick={openBatchModal}>
            <History size={18} /> Input Bulanan
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card">
          <span className="text-muted dark:text-muted font-medium text-sm">Total Saldo</span>
          <h2 className="text-3xl mt-1 font-bold">Rp {formatIDR(summary.balance)}</h2>
          {renderTrend(summary.balance, prevSummary.balance)}
        </div>

        <div className="glass-card border-l-4 border-l-success">
          <span className="text-muted dark:text-muted font-medium text-sm text-success">Pemasukan</span>
          <h2 className="text-3xl mt-1 font-bold text-success">Rp {formatIDR(summary.totalIncome)}</h2>
          {renderTrend(summary.totalIncome, prevSummary.totalIncome)}
        </div>

        <div className="glass-card border-l-4 border-l-warning/40">
          <span className="text-muted dark:text-muted font-medium text-sm text-warning">Pengeluaran</span>
          <h2 className="text-3xl mt-1 font-bold text-warning">Rp {formatIDR(summary.totalExpense)}</h2>
          {renderTrend(summary.totalExpense, prevSummary.totalExpense, true)}
        </div>
      </div>

      {/* ── Area Chart Arus Kas ── */}
      <div className="glass-card">
        <h3 className="mb-6 text-xl flex items-center gap-2">
          Grafik Arus Kas & Mutasi Masuk
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMutation" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <Tooltip content={<AreaTooltip />} />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" animationDuration={1500} />
              <Area type="monotone" dataKey="expense" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorExpense)" animationDuration={1500} />
              <Area type="monotone" dataKey="mutation" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorMutation)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bar Chart Status Preorder ── */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} className="text-primary" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest">
                Snapshot Antrian Produksi
              </h3>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-60 italic">
                Total aktif: <span className="text-primary">{totalActive} pesanan</span>
              </p>
            </div>
          </div>
          {/* Status legend pills */}
          <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
            {preorderStatusData.map(s => (
              <span key={s.label} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={preorderStatusData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11, fontWeight: 700 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<StatusTooltip />} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', radius: 8 }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={56} animationDuration={900}>
                {preorderStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Overview;
