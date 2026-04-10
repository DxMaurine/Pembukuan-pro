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
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();
  let runningBalance = 0;
  
  // Group logic
  const grouped = new Map<string, { income: number; expense: number; incomeDetails: string[]; expenseDetails: string[] }>();
  
  const allEvents = [
    ...transactions.map(t => ({ ...t })),
    ...walletEntries.map(w => ({
      date: w.date,
      type: 'income',
      amount: Number(w.amount) || 0,
      description: `QRIS: ${w.description || 'Penerimaan Digital'}`
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  allEvents.forEach(t => {
    if (!t.date) return;
    const dateStr = new Date(t.date).toLocaleDateString('id-ID');
    if (!grouped.has(dateStr)) {
      grouped.set(dateStr, { income: 0, expense: 0, incomeDetails: [], expenseDetails: [] });
    }
    const dayData = grouped.get(dateStr)!;
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

    let incomeStr = '-';
    if (dayData.income > 0 || dayData.incomeDetails.length > 0) {
      incomeStr = dayData.incomeDetails.join('\n');
      if (dayData.income > 0) {
        incomeStr += `\n----------\nTotal: ${formatIDR(dayData.income)}`;
      }
    }

    tableData.push([
      dateStr,
      incomeStr,
      expenseStr,
      `Rp ${formatIDR(runningBalance)}`
    ]);
  });

  // @ts-ignore
  doc.autoTable({
    startY: 70,
    head: [['Tanggal', 'Masuk (Detail)', 'Keluar (Detail)', 'Sub Total']],
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
      1: { cellWidth: 60 },
      2: { cellWidth: 65 },
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

export const generatePreorderInvoicePDF = async (
  storeName: string,
  preorder: any,
  theme: 'light' | 'dark'
) => {
  const doc = new jsPDF();
  const primaryColor = theme === 'dark' ? [0, 162, 255] : [244, 63, 94];
  const successColor = [16, 185, 129]; // Emerald-500

  // 1. Header Block
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("NOTA PESANAN", 14, 22);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(storeName.toUpperCase(), 14, 32);
  doc.text("INVOICE OFFICIAL - PREORDER SYSTEM", 14, 37);

  // Invoice Details (Right Side)
  doc.setFont("helvetica", "bold");
  doc.text(`INV-${preorder.id}`, 196, 22, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Tgl Pesan: ${new Date(preorder.createdAt).toLocaleDateString('id-ID')}`, 196, 30, { align: 'right' });
  doc.text(`Deadline: ${preorder.dueDate}`, 196, 35, { align: 'right' });
  doc.text(`Tgl Cetak: ${new Date().toLocaleString('id-ID')}`, 196, 40, { align: 'right' });

  // 2. Customer Section
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DITUJUKAN KEPADA:", 14, 60);
  
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(preorder.customerName.toUpperCase(), 14, 68);
  
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 72, 100, 72);

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
    startY: 80,
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
  
  doc.setFillColor(theme === 'dark' ? 0 : 244, theme === 'dark' ? 162 : 63, theme === 'dark' ? 255 : 94);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(storeName.toUpperCase(), 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("LAPORAN MUTASI KAS & BANK", 14, 30);

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
    startY: 50,
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total Pencairan QRIS -> Kas: Rp ${formatIDR(totalQRISToCash)}`, 14, finalY + 15);
  doc.text(`Total Setoran Kas -> Owner: Rp ${formatIDR(totalCashToOwner)}`, 14, finalY + 22);

  return doc.output('datauristring').split(',')[1];
};
