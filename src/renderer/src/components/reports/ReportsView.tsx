import React, { useMemo } from 'react';
import { Send, FileText, FileSpreadsheet, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import * as XLSX from 'xlsx';
import Timeline from '../transactions/Timeline';
import { months, getYearOptions } from '../../utils/dateUtils';
import { formatIDR } from '../../utils/formatters';

interface ReportsViewProps {
  filterMonth: number;
  filterYear: number;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  applyMonthFilter: (m: number, y: number) => void;
  sendToOwner: () => void;
  transactions: any[];
  walletEntries?: any[];
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  handleEditClick: (t: any) => void;
  handleDeleteTransaction: (id: number) => void;
}

const ReportsView: React.FC<ReportsViewProps> = ({
  filterMonth,
  filterYear,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  applyMonthFilter,
  sendToOwner,
  transactions,
  walletEntries = [],
  currentPage,
  setCurrentPage,
  handleEditClick,
  handleDeleteTransaction,
}) => {
  const yearOptions = getYearOptions();

  // ── P&L Summary ──────────────────────────────────────────────────
  const plSummary = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const qris = walletEntries
      .filter(w => w.status === 'received' || w.type === 'saving')
      .reduce((s, w) => s + (Number(w.amount) || 0), 0);
    const totalIncome = income + qris;
    const net = totalIncome - expense;
    const margin = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : '0.0';
    return { income, qris, totalIncome, expense, net, margin };
  }, [transactions, walletEntries]);


  // ── Export Excel ──────────────────────────────────────────────────
  const handleExportExcel = () => {
    // Gabungkan transaksi manual + QRIS wallet entries
    const manualRows = transactions.map(t => ({
      Tanggal: t.date ? String(t.date).split('T')[0] : '',
      Keterangan: t.description || '',
      Kategori: t.category || 'Manual',
      Tipe: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      Sumber: 'Manual',
      Nominal: Number(t.amount) || 0,
    }));

    const qrisRows = walletEntries.map(w => ({
      Tanggal: w.date ? String(w.date).split('T')[0] : '',
      Keterangan: w.description || 'Penerimaan QRIS/DANA',
      Kategori: w.type === 'saving' ? 'Tabungan' : 'QRIS/Digital',
      Tipe: 'Pemasukan',
      Sumber: 'QRIS/Wallet',
      Nominal: Number(w.amount) || 0,
    }));

    const rows = [...manualRows, ...qrisRows]
      .sort((a, b) => a.Tanggal.localeCompare(b.Tanggal));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 14 }, // Tanggal
      { wch: 40 }, // Keterangan
      { wch: 20 }, // Kategori
      { wch: 14 }, // Tipe
      { wch: 16 }, // Sumber
      { wch: 18 }, // Nominal
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${months[filterMonth]} ${filterYear}`);
    XLSX.writeFile(wb, `laporan_${months[filterMonth].toLowerCase()}_${filterYear}.xlsx`);
  };


  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-20">

      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <FileText className="text-primary" size={32} /> Laporan Keuangan
          </h1>
          <p className="text-muted dark:text-muted mt-1 text-sm italic">
            Analitik, ekspor, dan kirim laporan per periode.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            className="btn px-5 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold"
            onClick={handleExportExcel}
            title="Download file Excel (.xlsx)"
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>
          <button className="btn btn-primary px-5 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold" onClick={sendToOwner}>
            <Send size={18} /> Kirim Laporan ke Owner
          </button>
        </div>
      </header>

      {/* ── Filter Periode ── */}
      <div className="glass-card flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block mb-2 text-xs font-bold uppercase tracking-widest text-muted">Filter Cepat (Bulan)</label>
            <select
              className="form-input"
              value={filterMonth}
              onChange={(e) => applyMonthFilter(parseInt(e.target.value), filterYear)}
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block mb-2 text-xs font-bold uppercase tracking-widest text-muted">Tahun</label>
            <select
              className="form-input"
              value={filterYear}
              onChange={(e) => applyMonthFilter(filterMonth, parseInt(e.target.value))}
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-6 items-end border-t border-dashed border-slate-200 dark:border-border pt-6">
          <div className="flex-1">
            <label className="block mb-2 text-xs font-bold uppercase tracking-widest text-muted">Dari (Kustom)</label>
            <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block mb-2 text-xs font-bold uppercase tracking-widest text-muted">Sampai (Kustom)</label>
            <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── P&L Summary Cards ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted mb-4 px-1">
          Ringkasan Laba-Rugi — {months[filterMonth]} {filterYear}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Pemasukan */}
          <div className="glass-card !p-5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted block mb-2">Total Masuk</span>
            <p className="text-xl font-bold text-success leading-tight">Rp {formatIDR(plSummary.totalIncome)}</p>
            <p className="text-[9px] text-muted mt-1.5 font-bold uppercase opacity-60">
              Transaksi + QRIS
            </p>
          </div>

          {/* Total Pengeluaran */}
          <div className="glass-card !p-5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted block mb-2">Total Keluar</span>
            <p className="text-xl font-bold text-warning leading-tight">Rp {formatIDR(plSummary.expense)}</p>
            <p className="text-[9px] text-muted mt-1.5 font-bold uppercase opacity-60">
              Pengeluaran Manual
            </p>
          </div>

          {/* Laba Bersih */}
          <div className={`glass-card !p-5 ${plSummary.net >= 0 ? 'border-l-4 border-l-success' : 'border-l-4 border-l-danger'}`}>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted block mb-2">Laba Bersih</span>
            <p className={`text-xl font-bold leading-tight flex items-center gap-1.5 ${plSummary.net >= 0 ? 'text-success' : 'text-danger'}`}>
              {plSummary.net >= 0
                ? <TrendingUp size={16} className="shrink-0" />
                : <TrendingDown size={16} className="shrink-0" />}
              Rp {formatIDR(Math.abs(plSummary.net))}
            </p>
            <p className="text-[9px] text-muted mt-1.5 font-bold uppercase opacity-60">
              {plSummary.net >= 0 ? 'Untung' : 'Rugi'} Periode Ini
            </p>
          </div>

          {/* Margin */}
          <div className="glass-card !p-5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted block mb-2">Margin</span>
            <div className="flex items-end gap-2">
              <p className={`text-xl font-bold leading-tight ${Number(plSummary.margin) >= 0 ? 'text-primary' : 'text-danger'}`}>
                {plSummary.margin}%
              </p>
              <Minus size={14} className="text-muted mb-0.5 opacity-40" />
            </div>
            <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, Number(plSummary.margin)))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Transaction Timeline ── */}
      <Timeline
        transactions={transactions}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        handleEditClick={handleEditClick}
        handleDeleteTransaction={handleDeleteTransaction}
      />
    </div>
  );
};

export default ReportsView;
