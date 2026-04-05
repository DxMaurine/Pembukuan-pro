import React from 'react';
import { Send } from 'lucide-react';
import Timeline from '../transactions/Timeline';
import { months, getYearOptions } from '../../utils/dateUtils';

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
  currentPage,
  setCurrentPage,
  handleEditClick,
  handleDeleteTransaction,
}) => {
  const yearOptions = getYearOptions();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">Laporan Keuangan</h1>
          <p className="text-slate-500 dark:text-text-muted mt-1">Review data per periode dan ekspor laporan.</p>
        </div>
        <button className="btn btn-primary" onClick={sendToOwner}>
          <Send size={18} /> Kirim Laporan ke Owner
        </button>
      </header>

      <div className="glass-card flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block mb-2 text-sm font-medium">Filter Cepat (Bulan)</label>
            <select
              className="form-input dark:text-muted"
              value={filterMonth}
              onChange={(e) => applyMonthFilter(parseInt(e.target.value), filterYear)}
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block mb-2 text-sm font-medium">Tahun</label>
            <select
              className="form-input dark:text-muted"
              value={filterYear}
              onChange={(e) => applyMonthFilter(filterMonth, parseInt(e.target.value))}
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-6 items-end border-t border-dashed border-slate-200 dark:border-white/10 pt-6">
          <div className="flex-1">
            <label className="block mb-2 text-sm font-medium">Dari (Kustom)</label>
            <input
              type="date"
              className="form-input dark:text-muted"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block mb-2 text-sm font-medium">Sampai (Kustom)</label>
            <input
              type="date"
              className="form-input dark:text-muted"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

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
