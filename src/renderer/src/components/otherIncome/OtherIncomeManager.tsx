import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { PlusCircle, Heart, History, TrendingUp, Search, Info, PieChart, FileText, Trash2, X, Plus, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { formatIDR, unformatIDR } from '../../utils/formatters';
import { generateDonationPDF } from '../../utils/pdf';
import Swal from 'sweetalert2';

interface OtherIncomeManagerProps {
   transactions: any[];
   donations: any[];
   loadData: () => Promise<void>;
   api: any;
   storeName: string;
   theme: 'light' | 'dark';
   onOpenMainModal?: () => void;
}

export default function OtherIncomeManager({ transactions, donations, loadData, api, storeName, theme, onOpenMainModal }: OtherIncomeManagerProps) {
   const [activeSubTab, setActiveSubTab] = useState<'general' | 'donation'>('general');
   const [showModal, setShowModal] = useState(false);
   const [donStep, setDonStep] = useState<'config' | 'input'>('config');
   const [isClosing, setIsClosing] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [currentPage, setCurrentPage] = useState(1);
   const [editingId, setEditingId] = useState<number | null>(null);
   const entriesPerPage = 10;

   const [formData, setFormData] = useState({
      donator: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
   });

   const handleOpenModal = () => {
      setDonStep('config');
      setIsClosing(false);
      setShowModal(true);
   };

   const handleCloseModal = () => {
      setIsClosing(true);
      setTimeout(() => {
         setShowModal(false);
         setIsClosing(false);
         setDonStep('config');
         setFormData({ donator: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      }, 300);
   };

   const handleEditClick = (entry: any) => {
      setEditingId(entry.id);
      setFormData({
         donator: entry.donator,
         amount: entry.amount.toString(),
         description: entry.description || '',
         date: entry.date.split('T')[0]
      });
      setDonStep('input');
      setIsClosing(false);
      setShowModal(true);
   };

   const handleAddDonation = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.donator || !formData.amount) return;

      try {
         const payload = {
            donator: formData.donator,
            amount: parseFloat(unformatIDR(formData.amount)) || 0,
            description: formData.description,
            date: formData.date
         };

         if (editingId) {
            await api.updateDonation({ ...payload, id: editingId });
         } else {
            await api.addDonation(payload);
         }
         handleCloseModal();
         setEditingId(null);
         loadData();
         Swal.fire({ title: 'Berhasil!', text: editingId ? 'Perubahan disimpan.' : 'Catatan donasi disimpan.', icon: 'success', timer: 1500, showConfirmButton: false });
      } catch (err: any) {
         Swal.fire('Error', err.message || 'Gagal menyimpan donasi', 'error');
      }
   };

   // Filter General Other Income (from transactions table with category 'Lain-lain')
   const generalOtherIncome = useMemo(() => {
      return transactions
         .filter(t => t.category === 'Lain-lain' && t.type === 'income')
         .filter(t => t.description?.toLowerCase().includes(searchTerm.toLowerCase()))
         .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   }, [transactions, searchTerm]);

   // Filter Donations
   const filteredDonations = useMemo(() => {
      return donations
         .filter(d =>
            d.donator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.description?.toLowerCase().includes(searchTerm.toLowerCase())
         )
         .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   }, [donations, searchTerm]);

   const totalGeneral = generalOtherIncome.reduce((s, t) => s + (Number(t.amount) || 0), 0);
   const totalDonation = donations.reduce((s, d) => s + (Number(d.amount) || 0), 0);

   const handleDeleteDonation = async (id: number) => {
      const res = await Swal.fire({
         title: 'Hapus Donasi?',
         text: 'Data ini tidak bisa dikembalikan.',
         icon: 'warning',
         showCancelButton: true,
         confirmButtonText: 'Ya, Hapus'
      });
      if (res.isConfirmed) {
         await api.deleteDonation(id);
         loadData();
      }
   };

   const handlePrintDonationReport = async () => {
      try {
         const pdfBase64 = await generateDonationPDF(storeName, donations, theme);
         await api.sendReport({
            pdfData: pdfBase64,
            filename: `laporan_donasi.pdf`,
            caption: `📦 *LAPORAN SALURAN DONASI & SOSIAL*`
         });
         Swal.fire({ title: 'Terkirim ke Owner!', icon: 'success', timer: 1500, showConfirmButton: false });
      } catch (err: any) {
         Swal.fire('Error', 'Gagal kirim report: ' + err.message, 'error');
      }
   };

   const currentList = activeSubTab === 'general' ? generalOtherIncome : filteredDonations;
   const totalPages = Math.ceil(currentList.length / entriesPerPage) || 1;
   const paginatedList = currentList.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

   return (
      <div className="flex flex-col gap-8 animate-fade-in pb-20">
         <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
               <h1 className="text-3xl font-semibold flex items-center gap-3">
                  <PlusCircle className="text-primary" size={32} /> Pemasukan ( non-sales )
               </h1>
               <p className="text-sm text-muted mt-1 italic opacity-60">Kelola pendapatan di luar jualan & saluran donasi sosial.</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
               {activeSubTab === 'donation' && (
                  <button
                     onClick={handlePrintDonationReport}
                     className="btn bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 flex items-center gap-2 px-6 py-3.5 rounded-xl shadow-sm hover:scale-105 transition-transform font-bold text-[10px] uppercase tracking-widest text-slate-700 dark:text-slate-300"
                  >
                     <FileText size={16} /> Kirim ke Owner
                  </button>
               )}
               <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200/50 dark:border-white/10">
                  <button
                     onClick={() => { setActiveSubTab('general'); setCurrentPage(1); }}
                     className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'general' ? 'bg-white dark:bg-primary text-slate-900 dark:text-white shadow-xl scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                     <TrendingUp size={18} /> UMUM &amp; LAINNYA
                  </button>
                  <button
                     onClick={() => { setActiveSubTab('donation'); setCurrentPage(1); }}
                     className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'donation' ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-white shadow-xl scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                     <Heart size={18} /> SALURAN DONASI
                  </button>
               </div>
            </div>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`glass-card p-5 flex flex-col justify-between border-l-4 group transition-all duration-300 relative overflow-hidden h-[180px] ${activeSubTab === 'general'
               ? 'border-primary ring-2 ring-primary/10 bg-gradient-to-br from-primary/[0.08] to-transparent shadow-lg shadow-primary/5'
               : 'border-slate-300 opacity-40 grayscale hover:grayscale-0 hover:opacity-60'}`}
               onClick={() => { setActiveSubTab('general'); setCurrentPage(1); }}
            >
               <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-125 transition-transform duration-700 text-primary">
                  <TrendingUp size={100} />
               </div>
               <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${activeSubTab === 'general' ? 'bg-primary/20 text-primary shadow-lg shadow-primary/10' : 'bg-slate-500/10 text-slate-500'}`}>
                        <TrendingUp size={22} />
                     </div>
                     <span className="text-[10px] font-bold text-muted tracking-widest uppercase opacity-60">PEMASUKAN UMUM</span>
                  </div>
                  <div>
                     <div className="text-[10px] text-muted font-bold uppercase mb-0.5 opacity-50 tracking-tight">Total Pemasukan Non-Sales:</div>
                     <h3 className="text-2xl font-bold italic tracking-tighter text-slate-800 dark:text-white leading-none">Rp {formatIDR(totalGeneral)}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-200/50 dark:border-white/5">
                     <TrendingUp size={10} className="text-muted opacity-50" />
                     <p className="text-[10px] text-muted italic font-medium opacity-50 leading-tight">Digabungkan ke Saldo Toko Utama.</p>
                  </div>
               </div>
            </div>

            <div className={`glass-card p-5 flex flex-col justify-between border-l-4 group transition-all duration-300 relative overflow-hidden h-[180px] ${activeSubTab === 'donation'
               ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-gradient-to-br from-emerald-500/[0.08] to-transparent shadow-lg shadow-emerald-500/5'
               : 'border-slate-300 opacity-40 grayscale hover:grayscale-0 hover:opacity-60'}`}
               onClick={() => { setActiveSubTab('donation'); setCurrentPage(1); }}
            >
               <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-125 transition-transform duration-700 text-emerald-500">
                  <Heart size={100} />
               </div>
               <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${activeSubTab === 'donation' ? 'bg-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-slate-500/10 text-slate-500'}`}>
                        <Heart size={22} />
                     </div>
                     <span className="text-[10px] font-bold text-muted tracking-widest uppercase opacity-60">SALURAN DONASI</span>
                  </div>
                  <div>
                     <div className="text-[10px] text-muted font-bold uppercase mb-0.5 opacity-50 tracking-tight">Total Saldo Donasi Sosial:</div>
                     <h3 className="text-2xl font-bold italic tracking-tighter text-emerald-600 dark:text-emerald-400 leading-none">Rp {formatIDR(totalDonation)}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-200/50 dark:border-white/5">
                     <Info size={10} className="text-muted opacity-50" />
                     <p className="text-[10px] text-muted italic font-medium opacity-50 leading-tight">Tidak tergabung ke saldo toko.</p>
                  </div>
               </div>
            </div>

            <div className={`glass-card p-5 bg-gradient-to-br border-none flex flex-col justify-center relative overflow-hidden group h-[180px] ${activeSubTab === 'general' ? 'from-primary/10 via-transparent to-primary/5' : 'from-emerald-500/10 via-transparent to-emerald-500/5'}`}>
               <div className="absolute -right-2 -top-2 opacity-[0.03] group-hover:scale-150 transition-transform duration-700">
                  <Plus size={100} />
               </div>
               <button
                  onClick={() => {
                     if (activeSubTab === 'donation') handleOpenModal();
                     else if (onOpenMainModal) onOpenMainModal();
                  }}
                  className={`btn w-full py-5 rounded-2xl flex flex-col items-center gap-2 shadow-lg hover:scale-[1.03] transition-all relative z-10 border-none ${activeSubTab === 'general' ? 'btn-primary shadow-primary/20' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'}`}
               >
                  <div className="p-1.5 bg-white/20 rounded-lg"><Plus size={20} /></div>
                  <div className="flex flex-col items-center">
                     <span className="font-bold uppercase tracking-[0.15em] text-[10px] mb-0.5">Tambah Data</span>
                     <span className="text-[10px] opacity-70 font-medium tracking-tight">Klik untuk mencatat saldo</span>
                  </div>
               </button>
            </div>
         </div>

         <div className="glass-card flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
               <div className="flex items-center justify-between w-full md:w-auto gap-4">
                  <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                     <TrendingUp size={20} className={activeSubTab === 'general' ? 'text-primary' : 'text-emerald-500'} /> Histori {activeSubTab === 'general' ? 'Pemasukan Umum' : 'Saluran Donasi'}
                  </h3>
               </div>

               <div className="relative w-full md:w-80 group">
                  <div className="absolute inset-0 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 group-focus-within:ring-2 group-focus-within:ring-primary/20 transition-all pointer-events-none" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/50 group-focus-within:text-primary transition-colors" size={16} />
                  <input
                     type="text"
                     placeholder={activeSubTab === 'general' ? "Cari keterangan..." : "Cari donatur / tujuan..."}
                     className="relative w-full pl-12 pr-6 py-3.5 text-sm bg-transparent border-none focus:ring-0 placeholder:opacity-40 placeholder:italic"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>
            <div className="overflow-x-auto min-h-[300px]">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-slate-200 dark:border-white/5 text-[11px] font-bold text-muted uppercase bg-slate-100 dark:bg-white/5">
                        <th className="p-4">Tanggal</th>
                        <th className="p-4">{activeSubTab === 'general' ? 'Pemasukan / Dari' : 'Donatur'}</th>
                        <th className="p-4">Nominal</th>
                        <th className="p-4">Keterangan</th>
                        {activeSubTab === 'donation' && <th className="p-4 text-right">Aksi</th>}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                     {paginatedList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                           <td className="p-4 text-sm font-semibold">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                           <td className="p-4">
                              <div className="flex items-center gap-3">
                                 {activeSubTab === 'general' ? (
                                    <div className="p-2 bg-primary/10 text-primary rounded-lg"><PieChart size={14} /></div>
                                 ) : (
                                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Heart size={14} /></div>
                                 )}
                                 <span className="text-base font-bold">{activeSubTab === 'general' ? item.description?.split('-')[0] : item.donator}</span>
                              </div>
                           </td>
                           <td className="p-4 font-bold italic text-slate-800 dark:text-slate-200 pb-4 text-base">Rp {formatIDR(item.amount)}</td>
                           <td className="p-4 text-sm opacity-70 max-w-xs truncate">{item.description}</td>
                           {activeSubTab === 'donation' && (
                              <td className="p-4 text-right flex justify-end gap-2 items-center">
                                 <button
                                    onClick={() => handleEditClick(item)}
                                    className="p-2 text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    title="Edit Data"
                                 >
                                    <Pencil size={16} />
                                 </button>
                                 <button
                                    onClick={() => handleDeleteDonation(item.id)}
                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    title="Hapus Data"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </td>
                           )}
                        </tr>
                     ))}
                     {paginatedList.length === 0 && (
                        <tr>
                           <td colSpan={5} className="p-20 text-center">
                              <div className="flex flex-col items-center gap-3 opacity-30">
                                 <History size={48} />
                                 <p className="text-sm  dark:text-muted/90 text-muted/90 ">Belum ada data tercatat</p>
                              </div>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
            {totalPages > 1 && (
               <div className="flex justify-center items-center gap-6 mt-8 py-4 border-t border-slate-200 dark:border-white/5">
                  <button
                     disabled={currentPage === 1}
                     onClick={() => setCurrentPage(p => p - 1)}
                     className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 disabled:opacity-20 hover:scale-110 transition-transform"
                  >
                     <ChevronLeft />
                  </button>
                  <span className="text-sm font-bold italic">Halaman {currentPage} dari {totalPages}</span>
                  <button
                     disabled={currentPage === totalPages}
                     onClick={() => setCurrentPage(p => p + 1)}
                     className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 disabled:opacity-20 hover:scale-110 transition-transform"
                  >
                     <ChevronRight />
                  </button>
               </div>
            )}
         </div>
         {showModal && createPortal(
            <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] px-4 overflow-y-auto py-10 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-fade-in'}`}>
               <div className={`glass-card w-full ${donStep === 'config' ? 'max-w-[480px]' : 'max-w-[780px]'} relative p-10 my-auto border-t-8 border-emerald-500 transition-all duration-500 ease-in-out shadow-[0_20px_50px_-12px_rgba(16,185,129,0.3)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ${isClosing ? 'scale-95 opacity-0 translate-y-10' : 'animate-scale-up'}`}>
                  <button
                     type="button"
                     className="btn absolute top-6 right-6 p-2 z-20 shadow-none bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center transition-transform hover:rotate-90"
                     onClick={handleCloseModal}
                  >
                     <X size={20} />
                  </button>
                  <div className="mb-8">
                     <div className="flex items-center gap-5">
                        <div className="p-4 bg-emerald-500 text-white rounded-[2rem] shadow-lg shadow-emerald-500/20 rotate-[-5deg]">
                           <Heart size={28} />
                        </div>
                        <div className="flex flex-col">
                           <h2 className="text-3xl font-bold italic text-slate-800 dark:text-white leading-none">
                              {donStep === 'config' ? 'Konfigurasi Donasi' : 'Input Detail Nominal'}
                           </h2>
                           <p className="text-[13px] font-bold italic text-emerald-500 mt-2">Amanah Penyaluran & Sosial</p>
                        </div>
                     </div>
                  </div>
                  {donStep === 'config' ? (
                     <div className="space-y-8 animate-fade-in">
                        <div className="p-4 rounded-3xl border bg-emerald-500/[0.03] border-emerald-500/10 flex gap-4">
                           <Info className="text-emerald-500 mt-1 shrink-0" size={20} />
                           <p className="text-xs text-muted leading-relaxed font-medium">
                              Silakan masukkan nama donatur atau sumber dana sosial terlebih dahulu sebelum memasukkan nominal.
                           </p>
                        </div>
                        <div className="group">
                           <label className="block mb-3 text-xs font-bold text-muted ml-2 opacity-60">Nama Donatur / Sumber Dana:</label>
                           <input
                              required
                              type="text"
                              className="form-input py-4 px-6 text-sm font-bold bg-slate-50 dark:bg-black/20 border-transparent shadow-sm rounded-2xl focus:bg-white dark:focus:bg-black/40 transition-all placeholder:opacity-20"
                              placeholder="Hamba Allah / Kas Sosial / Donatur..."
                              autoFocus
                              value={formData.donator}
                              onChange={e => setFormData({ ...formData, donator: e.target.value })}
                           />
                        </div>
                        <button
                           className="btn bg-emerald-500 text-white w-full py-5 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                           onClick={() => formData.donator && setDonStep('input')}
                        >
                           Lanjutkan Isi Data <Search size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                     </div>
                  ) : (
                     <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center p-5 rounded-3xl border bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] border-emerald-500/10 shadow-inner">
                           <div className="flex flex-col">
                              <span className="text-sm font-bold text-muted opacity-50">Mencatat Dana Dari:</span>
                              <span className="text-base font-bold italic text-emerald-600 dark:text-emerald-400">
                                 {formData.donator}
                              </span>
                           </div>
                           <div className="text-sm font-bold px-5 py-2.5 rounded-2xl shadow-sm border bg-slate-50 dark:bg-black/20 text-emerald-500 border-emerald-500/10 leading-none flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Terpercaya
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="space-y-8 pt-2">
                              <div className="group relative">
                                 <label className="block mb-3 text-sm font-bold text-muted ml-2 opacity-60">Nominal Penyaluran (Rp):</label>
                                 <div className="relative">
                                    <input
                                       type="text"
                                       className="form-input text-4xl font-bold text-center py-8 rounded-[2rem] focus:ring-8 text-emerald-500 focus:ring-emerald-500/5 bg-slate-50 dark:bg-black/30 border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] transition-all"
                                       placeholder="Rp 0"
                                       autoFocus
                                       value={formatIDR(formData.amount)}
                                       onChange={e => setFormData({ ...formData, amount: unformatIDR(e.target.value) })}
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500/20 font-bold text-xl italic pointer-events-none">IDR</div>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <label className="text-sm font-bold text-muted ml-2 opacity-60">Tanggal Diterima:</label>
                                 <input
                                    type="date"
                                    className="form-input py-4 px-6 font-bold text-sm bg-slate-50 dark:bg-black/20 border-transparent shadow-sm rounded-2xl focus:bg-white dark:focus:bg-black/40 transition-all"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                 />
                              </div>
                           </div>
                           <div className="flex flex-col space-y-3">
                              <label className="text-sm font-bold text-muted ml-2 opacity-60">Keterangan / Detail Amanah:</label>
                              <textarea
                                 className="form-input flex-1 text-sm py-6 px-7 min-h-[160px] resize-none leading-relaxed bg-slate-50 dark:bg-black/20 border-transparent shadow-sm rounded-[2rem] focus:bg-white dark:focus:bg-black/40 transition-all placeholder:opacity-10"
                                 placeholder="Tulis amanah detail di sini..."
                                 value={formData.description}
                                 onChange={e => setFormData({ ...formData, description: e.target.value })}
                              />
                           </div>
                        </div>
                        <div className="mt-8 flex gap-5 pt-8 border-t border-slate-200 dark:border-white/5">
                           <button
                              type="button"
                              className="btn flex-1 justify-center py-5 rounded-2xl font-bold bg-slate-100 dark:bg-white/5 text-muted hover:bg-slate-200 dark:hover:bg-white/10 transition-all hover:scale-[0.98]"
                              onClick={() => setDonStep('config')}
                           >
                              Kembali Ke Nama
                           </button>
                           <button
                              type="button"
                              className="btn bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex-[1.5] justify-center py-5 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-3 group"
                              onClick={handleAddDonation}
                           >
                              <span>Simpan Data Donasi</span>
                              <Plus size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>,
            document.body
         )}

         {/* FOOTER INFO */}
         <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-start gap-4">
            <Info className="text-blue-500 shrink-0" size={24} />
            <div>
               <h4 className="text-base font-bold text-blue-700 dark:text-blue-400 mb-1">Informasi Saluran Sosial</h4>
               <p className="text-sm text-muted dark:text-muted leading-relaxed italic">
                  Tab **Saluran Donasi** merupakan pencatatan khusus yang tidak mempengaruhi Saldo Utama Toko.
                  Gunakan fitur ini untuk transparansi dana titipan atau sumbangan dari pihak luar tanpa mengganggu akurasi pembukuan operasional.
               </p>
            </div>
         </div>
      </div>
   );
}

