import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatIDR } from './formatters';
import { months } from './dateUtils';

export const generateProfessionalPDF = async (
  storeName: string,
  filterMonth: number,
  filterYear: number,
  transactions: any[],
  walletEntries: any[],
  theme: 'light' | 'dark',
  reportType: 'all' | 'manual' | 'qris' = 'all'
) => {
  const doc = new jsPDF();
  const accentColor = theme === 'dark' ? [0, 162, 255] : [244, 63, 94];

  // Group logic for Manual Transactions
  const groupedManual = new Map<string, { income: number; expense: number; incomeDetails: string[]; expenseDetails: string[] }>();
  const monthStr = String(filterMonth + 1).padStart(2, '0');
  const prefix = `${filterYear}-${monthStr}`;
  let runningBalanceManual = 0;
  let totalIncomeManual = 0;
  let totalExpenseManual = 0;

  const manualEvents = [...transactions]
    .filter(t => t.date && String(t.date).startsWith(prefix))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  manualEvents.forEach(t => {
    if (!t.date) return;
    const dateStr = new Date(t.date).toLocaleDateString('id-ID');
    if (!groupedManual.has(dateStr)) {
      groupedManual.set(dateStr, { income: 0, expense: 0, incomeDetails: [], expenseDetails: [] });
    }
    const dayData = groupedManual.get(dateStr)!;
    if (t.type === 'income') {
      dayData.income += Number(t.amount) || 0;
      dayData.incomeDetails.push(`${t.description || 'Pemasukan'} (${formatIDR(t.amount || 0)})`);
    } else {
      dayData.expense += Number(t.amount) || 0;
      if (t.items && t.items.length > 0) {
        t.items.forEach((it: any) => {
          dayData.expenseDetails.push(`${it.name} (${formatIDR(it.amount)})`);
        });
      } else {
        dayData.expenseDetails.push(`${t.description || 'Pengeluaran'} (${formatIDR(t.amount)})`);
      }
    }
  });

  const tableDataManual: any[][] = [];
  groupedManual.forEach((dayData, dateStr) => {
    runningBalanceManual += (dayData.income - dayData.expense);
    totalIncomeManual += dayData.income;
    totalExpenseManual += dayData.expense;

    let expenseStr = '-';
    if (dayData.expense > 0 || dayData.expenseDetails.length > 0) {
      expenseStr = dayData.expenseDetails.join('\n');
      if (dayData.expense > 0) {
        expenseStr += `\n----------\nTotal: ${formatIDR(dayData.expense)}`;
      }
    }

    let incomeStr = '-';
    if (dayData.income > 0 || dayData.incomeDetails.length > 0) {
      incomeStr = dayData.incomeDetails.join('\n');
      if (dayData.income > 0) {
        incomeStr += `\n----------\nTotal: ${formatIDR(dayData.income)}`;
      }
    }

    tableDataManual.push([
      dateStr,
      incomeStr,
      expenseStr,
      `Rp ${formatIDR(runningBalanceManual)}`
    ]);
  });

  // Group logic for QRIS Transactions
  const qrisEvents = [...walletEntries]
    .filter(w => (w.type === 'qris' || w.type === 'saving') && w.date && String(w.date).startsWith(prefix))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let totalIncomeQRIS = 0;
  const tableDataQRIS: any[][] = [];
  qrisEvents.forEach((w) => {
    totalIncomeQRIS += Number(w.amount) || 0;
    const dateStr = new Date(w.date).toLocaleDateString('id-ID');
    const typeLabel = w.type === 'saving' ? 'Tabungan' : 'QRIS';
    const statusLabel = w.status === 'received' ? 'Diterima' : 'Pending';
    tableDataQRIS.push([
      dateStr,
      w.description || 'Penerimaan Digital',
      typeLabel,
      statusLabel,
      `Rp ${formatIDR(w.amount)}`
    ]);
  });

  // Store Name (Top Left)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), 14, 20);

  // Subtitle (Below Store Name)
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let subtitle = "LAPORAN RINCIAN KEUANGAN - DIGITAL PRO";
  if (reportType === 'manual') subtitle = "LAPORAN RINCIAN KEUANGAN MANUAL (TUNAI)";
  if (reportType === 'qris') subtitle = "LAPORAN MONITOR QRIS & DIGITAL";
  doc.text(subtitle, 14, 28);

  // Metadata (Top Right)
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Periode: ${months[filterMonth]} ${filterYear}`, 196, 20, { align: 'right' });
  doc.text(`Tgl Cetak: ${new Date().toLocaleString('id-ID')}`, 196, 26, { align: 'right' });

  // Divider Line
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  let finalY = 32;

  // Render Table 1: Manual Transactions (if reportType is 'all' or 'manual')
  if (reportType === 'all' || reportType === 'manual') {
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const tableHeader = reportType === 'all'
      ? "TABEL 1: RINCIAN TRANSAKSI MANUAL (KAS TUNAI)"
      : "RINCIAN TRANSAKSI MANUAL (KAS TUNAI)";
    doc.text(tableHeader, 14, 39);

    // @ts-ignore
    doc.autoTable({
      startY: 42,
      head: [['Tanggal', 'Masuk (Detail)', 'Keluar (Detail)', 'Sub Total']],
      body: tableDataManual,
      styles: { fontSize: 9, cellPadding: 4, textColor: [40, 40, 40], overflow: 'linebreak' },
      headStyles: {
        textColor: [255, 255, 255],
        fillColor: theme === 'dark' ? [0, 162, 255] : [244, 63, 94],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 65 },
        3: { halign: 'right', fontStyle: 'bold' }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY || 80;
  }

  // Render Table 2: QRIS / Digital Transactions (if reportType is 'all' or 'qris')
  if (reportType === 'all' || reportType === 'qris') {
    doc.setTextColor(0, 102, 204); // Blue accent for digital
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const tableHeader = reportType === 'all'
      ? "TABEL 2: RINCIAN PENERIMAAN QRIS & DIGITAL"
      : "RINCIAN PENERIMAAN QRIS & DIGITAL";
    const startYCoord = reportType === 'all' ? finalY + 11 : 39;
    doc.text(tableHeader, 14, startYCoord);

    // @ts-ignore
    doc.autoTable({
      startY: startYCoord + 3,
      head: [['Tanggal', 'Keterangan / Sumber', 'Tipe', 'Status', 'Nominal']],
      body: tableDataQRIS.length > 0 ? tableDataQRIS : [['-', 'Tidak ada transaksi QRIS untuk periode ini.', '-', '-', '-']],
      styles: { fontSize: 9, cellPadding: 4, textColor: [40, 40, 40], overflow: 'linebreak' },
      headStyles: {
        textColor: [255, 255, 255],
        fillColor: [0, 102, 204],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { cellWidth: 80 },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right', fontStyle: 'bold' }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY || 150;
  }

  // Summary Box
  if (reportType === 'all') {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, finalY + 10, 182, 45, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(theme === 'dark' ? 0 : 244, theme === 'dark' ? 162 : 63, theme === 'dark' ? 255 : 94);
    doc.text("RINGKASAN AKHIR PERIODIK", 20, finalY + 18);

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Pemasukan Manual (Tunai):`, 20, finalY + 26);
    doc.text(`Total Pemasukan QRIS (Digital):`, 20, finalY + 32);
    doc.text(`Total Pengeluaran Manual:`, 20, finalY + 38);
    doc.text(`Saldo Akhir Bersih (Gabungan):`, 20, finalY + 44);

    doc.setFont("helvetica", "bold");
    doc.text(`Rp ${formatIDR(totalIncomeManual)}`, 190, finalY + 26, { align: 'right' });
    doc.text(`Rp ${formatIDR(totalIncomeQRIS)}`, 190, finalY + 32, { align: 'right' });
    doc.text(`Rp ${formatIDR(totalExpenseManual)}`, 190, finalY + 38, { align: 'right' });

    const grandTotalIncome = totalIncomeManual + totalIncomeQRIS;
    const grandNet = grandTotalIncome - totalExpenseManual;
    doc.text(`Rp ${formatIDR(grandNet)}`, 190, finalY + 44, { align: 'right' });
  } else if (reportType === 'manual') {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, finalY + 10, 182, 35, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(theme === 'dark' ? 0 : 244, theme === 'dark' ? 162 : 63, theme === 'dark' ? 255 : 94);
    doc.text("RINGKASAN AKHIR KAS TUNAI", 20, finalY + 18);

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Pemasukan Manual (Tunai):`, 20, finalY + 26);
    doc.text(`Total Pengeluaran Manual:`, 20, finalY + 32);
    doc.text(`Saldo Akhir Kas Tunai:`, 20, finalY + 38);

    doc.setFont("helvetica", "bold");
    doc.text(`Rp ${formatIDR(totalIncomeManual)}`, 190, finalY + 26, { align: 'right' });
    doc.text(`Rp ${formatIDR(totalExpenseManual)}`, 190, finalY + 32, { align: 'right' });
    doc.text(`Rp ${formatIDR(totalIncomeManual - totalExpenseManual)}`, 190, finalY + 38, { align: 'right' });
  } else if (reportType === 'qris') {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, finalY + 10, 182, 26, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 102, 204);
    doc.text("RINGKASAN AKHIR QRIS & DIGITAL", 20, finalY + 18);

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Pemasukan QRIS (Digital):`, 20, finalY + 26);

    doc.setFont("helvetica", "bold");
    doc.text(`Rp ${formatIDR(totalIncomeQRIS)}`, 190, finalY + 26, { align: 'right' });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Laporan ini diterbitkan secara otomatis oleh Sistem Pembukuan Digital ${storeName} - Halaman ${i} dari ${pageCount}`, 105, 285, { align: 'center' });
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 105, 290, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
};

export const generateStockPDF = async (
  storeName: string,
  stockItems: any[],
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();

  const accentColor = theme === 'dark' ? [0, 162, 255] : [244, 63, 94];

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(storeName.toUpperCase(), 14, 20);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("DAFTAR PERSEDIAAN / BARANG HABIS", 14, 28);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Tgl Cetak: ${new Date().toLocaleDateString('id-ID')}`, 196, 20, { align: 'right' });

  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  const tableData = stockItems.map((item, idx) => [
    { content: idx + 1, styles: { halign: 'center' } },
    item.name,
    { content: new Date(item.dateAdded).toLocaleDateString('id-ID'), styles: { halign: 'center' } }
  ]);

  // @ts-ignore
  doc.autoTable({
    startY: 40,
    head: [['No', 'Nama Barang', 'Tanggal Dicatat']],
    body: tableData,
    headStyles: { fillColor: theme === 'dark' ? [0, 162, 255] : [244, 63, 94] }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Laporan ini diterbitkan secara otomatis oleh Sistem Pembukuan Digital ${storeName} - Halaman ${i} dari ${pageCount}`, 105, 285, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
};

export const generateDebtPDF = async (
  storeName: string,
  debts: any[],
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();

  const accentColor = theme === 'dark' ? [0, 162, 255] : [244, 63, 94];

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), 14, 20);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("LAPORAN DAFTAR HUTANG PIUTANG", 14, 28);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Tgl Laporan: ${new Date().toLocaleDateString('id-ID')}`, 196, 20, { align: 'right' });

  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

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
    startY: 40,
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

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Laporan ini diterbitkan secara otomatis oleh Sistem Pembukuan Digital ${storeName} - Halaman ${i} dari ${pageCount}`, 105, 285, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
};

export const generateWalletPDF = async (
  storeName: string,
  entries: any[],
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();

  const accentColor = theme === 'dark' ? [0, 162, 255] : [244, 63, 94];

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), 14, 20);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("LAPORAN TABUNGAN & QRIS MONITOR", 14, 28);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Tgl Laporan: ${new Date().toLocaleDateString('id-ID')}`, 196, 20, { align: 'right' });

  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  const tableData = entries.map((e, idx) => [
    idx + 1,
    e.type === 'saving' ? 'Tabungan' : 'QRIS',
    e.description || '-',
    `Rp ${formatIDR(e.amount)}`,
    new Date(e.date).toLocaleDateString('id-ID')
  ]);

  // @ts-ignore
  doc.autoTable({
    startY: 40,
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

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Laporan ini diterbitkan secara otomatis oleh Sistem Pembukuan Digital ${storeName} - Halaman ${i} dari ${pageCount}`, 105, 285, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
};

export const generatePreorderInvoicePDF = async (
  storeName: string,
  preorder: any,
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();
  const primaryColor = theme === 'dark' ? [0, 162, 255] : [244, 63, 94];
  const successColor = [16, 185, 129]; // Emerald-500

  // 1. Clean Minimalist Header
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("NOTA PESANAN", 14, 22);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(storeName.toUpperCase(), 14, 30);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("INVOICE OFFICIAL - PREORDER SYSTEM", 14, 35);

  // Horizontal line divider
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 42, 196, 42);

  // Invoice Details (Right Side)
  doc.setFont("helvetica", "bold");
  doc.text(`INV-${preorder.id}`, 196, 22, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Tgl Pesan: ${new Date(preorder.createdAt).toLocaleDateString('id-ID')}`, 196, 30, { align: 'right' });
  doc.text(`Deadline: ${preorder.dueDate}`, 196, 35, { align: 'right' });
  doc.text(`Tgl Cetak: ${new Date().toLocaleString('id-ID')}`, 196, 40, { align: 'right' });

  doc.text(preorder.customerName.toUpperCase(), 14, 68);

  // 3. Items Table
  const tableData = (preorder.items || []).map((item: any, idx: number) => {
    const dimension = item.isBanner ? `${item.p}x${item.l}m` : 'Unit/Pcs';
    const itemName = item.notes ? `${item.name}\n(Catatan: ${item.notes})` : item.name;

    return [
      idx + 1,
      { content: itemName, styles: { fontStyle: item.notes ? 'italic' : 'normal' } },
      item.bahan || '-',
      dimension,
      `Rp ${formatIDR(item.price)}`,
      item.qty,
      `Rp ${formatIDR(item.total)}`
    ];
  });

  // @ts-ignore
  doc.autoTable({
    startY: 75,
    head: [['No', 'Item / Pekerjaan', 'Bahan', 'Ukuran', 'Harga', 'Qty', 'Total']],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // 4. Financial Summary Right
  const summaryX = 130;
  doc.setFontSize(10);

  // Total
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Total Biaya:", summaryX, finalY + 15);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.text(`Rp ${formatIDR(preorder.totalAmount)}`, 196, finalY + 15, { align: 'right' });

  // DP
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Down Payment (DP):", summaryX, finalY + 22);
  doc.setTextColor(successColor[0], successColor[1], successColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(`Rp ${formatIDR(preorder.downPayment)}`, 196, finalY + 22, { align: 'right' });

  // Balance (Highlight box)
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(summaryX - 5, finalY + 28, 71, 15, 2, 2, 'F');

  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("SISA PELUNASAN:", summaryX, finalY + 38);
  doc.setFontSize(12);
  doc.text(`Rp ${formatIDR(preorder.remainingAmount)}`, 196, finalY + 38, { align: 'right' });

  // 5. Signature / Terms (Left Side)
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("* Barang yang sudah dicetak tidak dapat ditukar/dikembalikan.", 14, finalY + 15);
  doc.text("* Mohon simpan nota ini sebagai bukti pengambilan barang.", 14, finalY + 20);

  doc.setFont("helvetica", "normal");
  doc.text("Hormat Kami,", 35, finalY + 35, { align: 'center' });
  doc.text("( _________________ )", 35, finalY + 55, { align: 'center' });
  doc.text("Kasir / Admin", 35, finalY + 60, { align: 'center' });

  // 6. Footer (Global)
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Invoice ini diterbitkan secara otomatis oleh Sistem Pembukuan Digital ${storeName} - Halaman ${i} dari ${pageCount}`, 105, 285, { align: 'center' });
  }

  const pdfData = doc.output('datauristring').split(',')[1];
  const link = document.createElement('a');
  link.href = `data:application/pdf;base64,${pdfData}`;
  link.download = `Invoice_${preorder.customerName}_${preorder.id}.pdf`;
  link.click();

  return pdfData;
};

export const generateMutationPDF = async (
  storeName: string,
  mutations: any[],
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();

  const accentColor = theme === 'dark' ? [0, 162, 255] : [244, 63, 94];

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), 14, 20);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("LAPORAN MUTASI KAS & BANK", 14, 28);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Tgl Laporan: ${new Date().toLocaleDateString('id-ID')}`, 196, 20, { align: 'right' });

  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  const getMutationDetails = (type: string) => {
    switch (type) {
      case 'wallet_to_cash': return 'QRIS -> Kas';
      case 'cash_to_wallet': return 'Kas -> QRIS';
      case 'cash_to_owner': return 'Kas -> Owner';
      case 'wallet_to_owner': return 'QRIS -> Owner';
      default: return type;
    }
  };

  const tableData = mutations.map((m, idx) => [
    idx + 1,
    new Date(m.date).toLocaleDateString('id-ID'),
    getMutationDetails(m.type),
    `Rp ${formatIDR(m.amount)}`,
    m.description || '-'
  ]);

  // @ts-ignore
  doc.autoTable({
    startY: 40,
    head: [['No', 'Tanggal', 'Tipe Mutasi', 'Nominal', 'Keterangan']],
    body: tableData,
    headStyles: { fillColor: theme === 'dark' ? [0, 162, 255] : [244, 63, 94] },
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const totalQRISToCash = mutations.filter(m => m.type === 'wallet_to_cash').reduce((s, m) => s + Number(m.amount), 0);
  const totalCashToOwner = mutations.filter(m => m.type === 'cash_to_owner').reduce((s, m) => s + Number(m.amount), 0);

  const finalY = (doc as any).lastAutoTable.finalY || 100;

  // Summary Table (Minimalist)
  doc.setDrawColor(200, 200, 200);
  doc.line(14, finalY + 10, 196, finalY + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Total Pencairan QRIS -> Kas:`, 14, finalY + 18);
  doc.text(`Rp ${formatIDR(totalQRISToCash)}`, 196, finalY + 18, { align: 'right' });

  doc.text(`Total Setoran Kas -> Owner:`, 14, finalY + 25);
  doc.text(`Rp ${formatIDR(totalCashToOwner)}`, 196, finalY + 25, { align: 'right' });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Laporan ini diterbitkan secara otomatis oleh Sistem Pembukuan Digital ${storeName} - Halaman ${i} dari ${pageCount}`, 105, 285, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
};

export const generateDonationPDF = async (
  storeName: string,
  donations: any[],
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();
  const accentColor = theme === 'dark' ? [0, 162, 255] : [16, 185, 129]; // Emerald for donations

  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), 14, 20);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("LAPORAN SALURAN DONASI & SOSIAL", 14, 28);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Tgl Laporan: ${new Date().toLocaleDateString('id-ID')}`, 196, 20, { align: 'right' });

  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  const tableData = donations.map((d, idx) => [
    idx + 1,
    new Date(d.date).toLocaleDateString('id-ID'),
    d.donator || '-',
    `Rp ${formatIDR(d.amount)}`,
    d.description || '-'
  ]);

  // @ts-ignore
  doc.autoTable({
    startY: 40,
    head: [['No', 'Tanggal', 'Donatur', 'Nominal', 'Keterangan/Peruntukan']],
    body: tableData,
    headStyles: { fillColor: accentColor },
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const totalDonation = donations.reduce((s, d) => s + Number(d.amount), 0);
  const finalY = (doc as any).lastAutoTable.finalY || 100;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, finalY + 10, 182, 20, 3, 3, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text(`TOTAL SALDO DONASI TERKUMPUL:`, 20, finalY + 23);
  doc.text(`Rp ${formatIDR(totalDonation)}`, 190, finalY + 23, { align: 'right' });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Laporan ini diterbitkan secara otomatis oleh Sistem Pembukuan Digital ${storeName} - Halaman ${i} dari ${pageCount}`, 105, 285, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
};

