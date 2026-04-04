import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatIDR } from './formatters';
import { months } from './dateUtils';
import { Transaction } from '../types';

export const generateProfessionalPDF = async (
  storeName: string,
  filterMonth: number,
  filterYear: number,
  transactions: Transaction[],
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();
  let runningBalance = 0;
  
  // Group logic (Same as before but cleaner)
  const grouped = new Map<string, { income: number; expense: number; expenseDetails: string[] }>();
  
  transactions.slice().reverse().forEach(t => {
    const dateStr = new Date(t.date).toLocaleDateString('id-ID');
    if (!grouped.has(dateStr)) {
      grouped.set(dateStr, { income: 0, expense: 0, expenseDetails: [] });
    }
    const dayData = grouped.get(dateStr)!;
    if (t.type === 'income') {
      dayData.income += t.amount;
    } else {
      dayData.expense += t.amount;
      if (t.items && t.items.length > 0) {
        t.items.forEach((it: any) => {
          dayData.expenseDetails.push(`${it.name} (${formatIDR(it.amount)})`);
        });
      } else {
        dayData.expenseDetails.push(`${t.description || 'Pengeluaran'} (${formatIDR(t.amount)})`);
      }
    }
  });

  // Professional Header
  doc.setFillColor(theme === 'dark' ? 0 : 244, theme === 'dark' ? 162 : 63, theme === 'dark' ? 255 : 94);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("ADMIN DASHBOARD PRO SYSTEM", 14, 30);
  doc.text(`Periode: ${months[filterMonth]} ${filterYear}`, 160, 30, { align: 'right' });

  // Body Section Title
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN RINCIAN KEUANGAN", 14, 50);

  doc.setDrawColor(theme === 'dark' ? 0 : 244, theme === 'dark' ? 162 : 63, theme === 'dark' ? 255 : 94);
  doc.setLineWidth(1);
  doc.line(14, 52, 100, 52); 

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 60);

  const tableData: any[][] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  grouped.forEach((dayData, dateStr) => {
    runningBalance += (dayData.income - dayData.expense);
    totalIncome += dayData.income;
    totalExpense += dayData.expense;

    let expenseStr = '-';
    if (dayData.expense > 0 || dayData.expenseDetails.length > 0) {
      expenseStr = dayData.expenseDetails.join('\n');
      if (dayData.expense > 0) {
        expenseStr += `\n----------\nTotal: ${formatIDR(dayData.expense)}`;
      }
    }

    tableData.push([
      dateStr,
      dayData.income > 0 ? `Rp ${formatIDR(dayData.income)}` : '-',
      expenseStr,
      `Rp ${formatIDR(runningBalance)}`
    ]);
  });

  // @ts-ignore
  doc.autoTable({
    startY: 70,
    head: [['Tanggal', 'Masuk', 'Keluar (Detail)', 'Sub Total']],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 4, textColor: [40, 40, 40], overflow: 'linebreak' },
    headStyles: {
      textColor: [255, 255, 255],
      fillColor: theme === 'dark' ? [0, 162, 255] : [244, 63, 94],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'right' },
      2: { cellWidth: 80 },
      3: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Summary Box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, finalY + 10, 182, 35, 3, 3, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(theme === 'dark' ? 0 : 244, theme === 'dark' ? 162 : 63, theme === 'dark' ? 255 : 94);
  doc.text("RINGKASAN AKHIR PERIODIK", 20, finalY + 18);

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Pemasukan:`, 20, finalY + 26);
  doc.text(`Total Pengeluaran:`, 20, finalY + 32);
  doc.text(`Saldo Akhir:`, 20, finalY + 38);

  doc.setFont("helvetica", "bold");
  doc.text(`Rp ${formatIDR(totalIncome)}`, 190, finalY + 26, { align: 'right' });
  doc.text(`Rp ${formatIDR(totalExpense)}`, 190, finalY + 32, { align: 'right' });
  doc.text(`Rp ${formatIDR(totalIncome - totalExpense)}`, 190, finalY + 38, { align: 'right' });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Laporan ini diekspor secara otomatis dari Sistem Pembukuan Digital Pro - Halaman ${i} dari ${pageCount}`, 105, 285, { align: 'center' });
    doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 105, 290, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
};

export const generateStockPDF = async (
  storeName: string,
  stockItems: any[],
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();
  
  doc.setFillColor(theme === 'dark' ? 0 : 244, theme === 'dark' ? 162 : 63, theme === 'dark' ? 255 : 94);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(storeName.toUpperCase(), 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("DAFTAR PERSEDIAAN / BARANG HABIS (OPNAME)", 14, 30);

  const tableData = stockItems.map((item, idx) => [
    { content: idx + 1, styles: { halign: 'center' } },
    item.name,
    { content: new Date(item.dateAdded).toLocaleDateString('id-ID'), styles: { halign: 'center' } }
  ]);

  // @ts-ignore
  doc.autoTable({
    startY: 50,
    head: [['No', 'Nama Barang', 'Tanggal Dicatat']],
    body: tableData,
    headStyles: { fillColor: theme === 'dark' ? [0, 162, 255] : [244, 63, 94] }
  });

  return doc.output('datauristring').split(',')[1];
};

export const generateDebtPDF = async (
  storeName: string,
  debts: any[],
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();
  
  doc.setFillColor(theme === 'dark' ? 0 : 244, theme === 'dark' ? 162 : 63, theme === 'dark' ? 255 : 94);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("LAPORAN DAFTAR HUTANG PIUTANG", 14, 30);

  const tableData = debts.map((d, idx) => [
    idx + 1,
    d.name,
    d.type === 'receivable' ? 'Piutang (Plg)' : 'Hutang (Toko)',
    `Rp ${formatIDR(d.amount)}`,
    d.status.toUpperCase(),
    new Date(d.date).toLocaleDateString('id-ID')
  ]);

  // @ts-ignore
  doc.autoTable({
    startY: 50,
    head: [['No', 'Pihak', 'Tipe', 'Nominal', 'Status', 'Tanggal']],
    body: tableData,
    headStyles: { fillColor: theme === 'dark' ? [0, 162, 255] : [244, 63, 94] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'center' }
    }
  });

  const totalReceivable = debts.filter(d => d.type === 'receivable' && d.status === 'pending').reduce((s, d) => s + d.amount, 0);
  const totalPayable = debts.filter(d => d.type === 'payable' && d.status === 'pending').reduce((s, d) => s + d.amount, 0);

  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total Piutang Berjalan: Rp ${formatIDR(totalReceivable)}`, 14, finalY + 15);
  doc.text(`Total Hutang Berjalan: Rp ${formatIDR(totalPayable)}`, 14, finalY + 22);

  return doc.output('datauristring').split(',')[1];
};

export const generateWalletPDF = async (
  storeName: string,
  entries: any[],
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();
  
  doc.setFillColor(theme === 'dark' ? 0 : 244, theme === 'dark' ? 162 : 63, theme === 'dark' ? 255 : 94);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("LAPORAN TABUNGAN & QRIS MONITOR", 14, 30);

  const tableData = entries.map((e, idx) => [
    idx + 1,
    e.type === 'saving' ? 'Tabungan' : 'QRIS',
    e.description || '-',
    `Rp ${formatIDR(e.amount)}`,
    new Date(e.date).toLocaleDateString('id-ID')
  ]);

  // @ts-ignore
  doc.autoTable({
    startY: 50,
    head: [['No', 'Tipe', 'Keterangan', 'Nominal', 'Tanggal']],
    body: tableData,
    headStyles: { fillColor: theme === 'dark' ? [0, 162, 255] : [244, 63, 94] },
    columnStyles: {
      3: { halign: 'right' }
    }
  });

  const totalSaving = entries.filter(e => e.type === 'saving').reduce((s, e) => s + e.amount, 0);
  const totalQRIS = entries.filter(e => e.type === 'qris').reduce((s, e) => s + e.amount, 0);

  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total Saldo Tabungan: Rp ${formatIDR(totalSaving)}`, 14, finalY + 15);
  doc.text(`Total QRIS (Belum Cair): Rp ${formatIDR(totalQRIS)}`, 14, finalY + 22);

  return doc.output('datauristring').split(',')[1];
};
