import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp,
  Users,
  Plus,
  Search,
  Trash2,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  Tag,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Send,
  Pencil
} from 'lucide-react';
import Swal from 'sweetalert2';
import { formatIDR, unformatIDR } from '../../utils/formatters';

interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  type: 'umum' | 'pelanggan';
}

interface PriceItem {
  id: number;
  itemName: string;
  scope: 'global' | 'pelanggan' | 'umum';
  customerId?: number;
  customerName?: string;
  oldPrice: number;
  newPrice: number;
  diffPercent: number;
  updatedAt: string;
}

interface PriceManagerProps {
  prices: PriceItem[];
  customers: Customer[];
  loadData: () => void;
  api: any;
}

const PriceManager: React.FC<PriceManagerProps> = ({ prices, customers, loadData, api }) => {
  const [activeSubTab, setActiveSubTab] = useState<'prices' | 'customers'>('prices');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal States
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Price Form
  const [priceForm, setPriceForm] = useState({
    itemName: '',
    oldPrice: '0',
    newPrice: '0',
    scope: 'global' as 'global' | 'pelanggan' | 'umum',
    customerId: undefined as number | undefined
  });
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);

  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    type: 'pelanggan' as 'umum' | 'pelanggan'
  });
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);

  const filteredPrices = useMemo(() => {
    return prices
      .filter(p => p.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [prices, searchTerm]);

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, searchTerm]);

  const totalPrices = prices.length;
  const totalCustomers = customers.length;

  const handleAddPrice = async (shouldNotify: boolean = false) => {
    if (!priceForm.itemName.trim()) return;

    try {
      const payload = {
        ...priceForm,
        oldPrice: parseFloat(unformatIDR(priceForm.oldPrice)),
        newPrice: parseFloat(unformatIDR(priceForm.newPrice)),
        customerName: priceForm.scope === 'pelanggan' ? customers.find(c => c.id === priceForm.customerId)?.name : undefined
      };
      
      let newPrice;
      if (editingPriceId) {
        newPrice = await api.updatePrice({ ...payload, id: editingPriceId });
      } else {
        newPrice = await api.addPrice(payload);
      }

      if (shouldNotify && newPrice.id) {
        await api.notifyPrice({ priceId: newPrice.id });
      }

      setShowPriceModal(false);
      setEditingPriceId(null);
      setPriceForm({ itemName: '', oldPrice: '0', newPrice: '0', scope: 'global', customerId: undefined });
      loadData();

      Swal.fire({
        title: 'Tersimpan!',
        text: shouldNotify ? 'Update harga dicatat dan dikirim ke Kasir.' : 'Update harga telah dicatat.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch {
      Swal.fire('Error', editingPriceId ? 'Gagal memperbarui harga.' : 'Gagal menyimpan harga.', 'error');
    }
  };

  const handleEditPrice = (item: PriceItem) => {
    setEditingPriceId(item.id);
    setPriceForm({
      itemName: item.itemName,
      oldPrice: item.oldPrice.toString(),
      newPrice: item.newPrice.toString(),
      scope: item.scope,
      customerId: item.customerId
    });
    setShowPriceModal(true);
  };

  const handleManualNotify = async (priceId: number) => {
    try {
      await api.notifyPrice({ priceId });
      Swal.fire({ title: 'Terkirim!', text: 'Notifikasi WA telah dikirim ke Kasir.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', 'Gagal mengirim WA: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleEditCustomer = (c: Customer) => {
    setEditingCustomerId(c.id);
    setCustomerForm({
      name: c.name,
      phone: c.phone || '',
      address: c.address || '',
      type: c.type
    });
    setShowCustomerModal(true);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomerId) {
        await api.updateCustomer({ ...customerForm, id: editingCustomerId });
      } else {
        await api.addCustomer(customerForm);
      }
      setShowCustomerModal(false);
      setEditingCustomerId(null);
      setCustomerForm({ name: '', phone: '', address: '', type: 'pelanggan' });
      loadData();
      Swal.fire({ title: 'Berhasil!', text: editingCustomerId ? 'Data pelanggan diperbarui.' : 'Pelanggan baru ditambahkan.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire('Error', editingCustomerId ? 'Gagal memperbarui pelanggan.' : 'Gagal menambah pelanggan.', 'error');
    }
  };

  const handleDeletePrice = async (id: number) => {
    const result = await Swal.fire({ title: 'Hapus data?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus' });
    if (result.isConfirmed) {
      await api.deletePrice(id);
      loadData();
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    const result = await Swal.fire({ title: 'Hapus pelanggan?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus' });
    if (result.isConfirmed) {
      await api.deleteCustomer(id);
      loadData();
    }
  };

  const getDiffDisplay = (percent: number) => {
    if (percent > 0) return <span className="text-rose-500 flex items-center gap-1 font-bold"><ArrowUpRight size={14} /> +{percent.toFixed(1)}%</span>;
    if (percent < 0) return <span className="text-emerald-500 flex items-center gap-1 font-bold"><ArrowDownRight size={14} /> {percent.toFixed(1)}%</span>;
    return <span className="text-muted opacity-40 flex items-center gap-1"><Minus size={14} /> 0%</span>;
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-10">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <TrendingUp className="text-primary" size={32} /> Harga & Pelanggan
          </h1>
          <p className="text-muted dark:text-muted mt-1 italic text-sm opacity-60">Pusat data harga barang & manajemen registry pelanggan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200/50 dark:border-white/10">
            <button
              onClick={() => { setActiveSubTab('prices'); setCurrentPage(1); }}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'prices' ? 'bg-white dark:bg-primary text-slate-900 dark:text-white shadow-xl scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <TrendingUp size={18} /> UPDATE HARGA
            </button>
            <button
              onClick={() => { setActiveSubTab('customers'); setCurrentPage(1); }}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'customers' ? 'bg-white dark:bg-primary text-slate-900 dark:text-white shadow-xl scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <Users size={18} /> PELANGGAN
            </button>
          </div>
        </div>
      </header>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`glass-card p-5 flex flex-col justify-between border-l-4 group transition-all duration-300 h-[170px] ${activeSubTab === 'prices' ? 'border-primary ring-2 ring-primary/10 bg-gradient-to-br from-primary/[0.05]' : 'border-slate-300 opacity-40 grayscale'}`}>
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-primary/20 text-primary"><Tag size={22} /></div>
            <span className="text-[10px] font-bold text-muted tracking-widest uppercase opacity-60">TOTAL UPDATE HARGA</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold italic tracking-tighter text-slate-800 dark:text-white leading-none">{totalPrices} Entri</h3>
            <p className="text-[10px] text-muted font-bold mt-1 uppercase tracking-tight">Tersimpan di database</p>
          </div>
        </div>

        <div className={`glass-card p-5 flex flex-col justify-between border-l-4 group transition-all duration-300 h-[170px] ${activeSubTab === 'customers' ? 'border-amber-500 ring-2 ring-amber-500/10 bg-gradient-to-br from-amber-500/[0.05]' : 'border-slate-300 opacity-40 grayscale'}`}>
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-500"><Users size={22} /></div>
            <span className="text-[10px] font-bold text-muted tracking-widest uppercase opacity-60">REGISTRY PELANGGAN</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold italic tracking-tighter text-amber-600 dark:text-amber-400 leading-none">{totalCustomers} Pelanggan</h3>
            <p className="text-[10px] text-muted font-bold mt-1 uppercase tracking-tight">Klien terdaftar</p>
          </div>
        </div>

        <div className="glass-card p-5 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 border-none flex flex-col justify-center h-[170px]">
          <button
            onClick={() => activeSubTab === 'prices' ? setShowPriceModal(true) : setShowCustomerModal(true)}
            className="btn btn-primary w-full py-5 rounded-2xl flex flex-col items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.03] transition-all border-none"
          >
            <Plus size={20} />
            <div className="flex flex-col items-center">
              <span className="font-bold uppercase tracking-[0.15em] text-[10px] mb-0.5">Tambah {activeSubTab === 'prices' ? 'Update Harga' : 'Pelanggan Baru'}</span>
              <span className="text-[10px] opacity-70 font-medium tracking-tight">Klik untuk mencatat data</span>
            </div>
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="glass-card p-4 flex items-center gap-4">
        <Search className="text-muted opacity-40" size={18} />
        <input
          type="text"
          placeholder={activeSubTab === 'prices' ? "Cari barang..." : "Cari nama pelanggan..."}
          className="bg-transparent border-none outline-none w-full text-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* HISTORY LIST */}
      <div className="glass-card flex flex-col gap-4">
        <div className="flex justify-between items-center mb-2 px-2">
          <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
            {activeSubTab === 'prices' ? <TrendingUp size={20} className="text-primary" /> : <Users size={20} className="text-amber-500" />}
            Histori {activeSubTab === 'prices' ? 'Update Harga' : 'Data Pelanggan'}
          </h3>
          <span className="text-xs font-bold text-muted uppercase tracking-widest">{activeSubTab === 'prices' ? 'Riwayat Terakhir' : 'Registry A-Z'}</span>
        </div>

        <div className="flex flex-col gap-3">
          {activeSubTab === 'prices' ? (
            filteredPrices.length === 0 ? (
              <div className="text-center py-20 opacity-30 text-sm italic">Belum ada histori update harga.</div>
            ) : (
              (() => {
                const totalPages = Math.ceil(filteredPrices.length / itemsPerPage);
                const currentItems = filteredPrices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                return (
                  <>
                    <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr] items-center px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-[0.2em] opacity-50 bg-slate-100/50 dark:bg-white/5 rounded-xl mb-1">
                      <span>Item / Barang</span>
                      <span>Update Nominal</span>
                      <span className="text-right">Selisih / Aksi</span>
                    </div>
                    {currentItems.map(item => (
                      <div key={item.id} className="grid grid-cols-[1.5fr_1.5fr_1.2fr] items-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:scale-[1.01] transition-all group shadow-sm">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`p-3 rounded-2xl shrink-0 bg-primary/10 text-primary`}>
                            {item.diffPercent >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold uppercase truncate tracking-tight">{item.itemName}</div>
                            <div className="text-[10px] text-muted font-bold uppercase tracking-widest">{new Date(item.updatedAt).toLocaleDateString('id-ID')}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex flex-col text-right pr-4 border-r border-slate-200 dark:border-white/10 min-w-[100px]">
                            <span className="text-[10px] font-bold text-muted uppercase opacity-40">Lama:</span>
                            <span className="text-xs font-bold opacity-60">Rp {formatIDR(item.oldPrice)}</span>
                          </div>
                          <div className="flex flex-col min-w-[100px]">
                            <span className="text-[10px] font-bold text-primary uppercase">Baru:</span>
                            <span className="text-sm font-bold text-primary italic">Rp {formatIDR(item.newPrice)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-4">
                          {getDiffDisplay(item.diffPercent)}
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            <button onClick={() => handleEditPrice(item)} className="btn p-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white border-none rounded-xl" title="Edit Harga">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleManualNotify(item.id)} className="btn p-2.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border-none rounded-xl" title="Kirim WA ke Kasir">
                              <Send size={14} />
                            </button>
                            <button onClick={() => handleDeletePrice(item.id)} className="btn btn-danger p-2.5 border-none rounded-xl">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Pagination totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
                  </>
                );
              })()
            )
          ) : (
            filteredCustomers.length === 0 ? (
              <div className="text-center py-20 opacity-30 text-sm italic">Belum ada pelanggan terdaftar.</div>
            ) : (
              (() => {
                const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
                const currentItems = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                return (
                  <>
                    <div className="grid grid-cols-[1.5fr_1fr_1.2fr] items-center px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-[0.2em] opacity-50 bg-slate-100/50 dark:bg-white/5 rounded-xl mb-1">
                      <span>Nama Pelanggan</span>
                      <span className="text-center">Tipe / Level</span>
                      <span className="text-right">Alamat / ID</span>
                    </div>
                    {currentItems.map(c => (
                      <div key={c.id} className="grid grid-cols-[1.5fr_1fr_1.2fr] items-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:scale-[1.01] transition-all group shadow-sm">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500"><Users size={20} /></div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold uppercase truncate tracking-tight">{c.name}</div>
                            <div className="text-[10px] text-muted font-bold uppercase tracking-widest">{c.phone || '-'}</div>
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${c.type === 'pelanggan' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                            {c.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-6 group-hover:gap-4 transition-all">
                          <span className="text-[14px] text-muted max-w-[150px] truncate">{c.address || 'Tanpa alamat'}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            <button onClick={() => handleEditCustomer(c)} className="btn p-2.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border-none rounded-xl" title="Edit Pelanggan">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDeleteCustomer(c.id)} className="btn btn-danger p-2.5 border-none rounded-xl">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Pagination totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
                  </>
                );
              })()
            )
          )}
        </div>
      </div>

      {/* PRICE MODAL */}
      {showPriceModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] px-4">
          <div className="glass-card w-full max-w-[600px] p-8 animate-scale-up border-t-8 border-t-primary relative">
            <button
              onClick={() => {
                setShowPriceModal(false);
                setEditingPriceId(null);
                setPriceForm({ itemName: '', oldPrice: '0', newPrice: '0', scope: 'global', customerId: undefined });
              }}
              className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold italic mb-8 flex items-center gap-3">
              {editingPriceId ? <Pencil size={28} className="text-primary" /> : <TrendingUp size={28} className="text-primary" />} {editingPriceId ? 'EDIT UPDATE HARGA' : 'CATAT UPDATE HARGA'}
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="label-style">Nama Barang / Produk:</label>
                  <input
                    type="text" required autoFocus className="form-input text-lg font-bold"
                    placeholder="Masukkan nama barang..."
                    value={priceForm.itemName}
                    onChange={e => setPriceForm({ ...priceForm, itemName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-style">Harga Lama (Beli/HPP):</label>
                  <input
                    type="text" className="form-input font-mono text-xl"
                    value={formatIDR(priceForm.oldPrice)}
                    onChange={e => setPriceForm({ ...priceForm, oldPrice: unformatIDR(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label-style">Harga Baru (Update):</label>
                  <input
                    type="text" className="form-input font-mono text-xl text-primary"
                    value={formatIDR(priceForm.newPrice)}
                    onChange={e => setPriceForm({ ...priceForm, newPrice: unformatIDR(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-style">Scope Pelanggan:</label>
                    <select
                      className="form-input font-bold"
                      value={priceForm.scope}
                      onChange={e => setPriceForm({ ...priceForm, scope: e.target.value as any })}
                    >
                      <option value="global">GLOBAL (Semua)</option>
                      <option value="pelanggan">KHUSUS PELANGGAN</option>
                      <option value="umum">UMUM (Retail)</option>
                    </select>
                  </div>
                  {priceForm.scope === 'pelanggan' && (
                    <div>
                      <label className="label-style">Pilih Pelanggan:</label>
                      <select
                        className="form-input"
                        value={priceForm.customerId}
                        onChange={e => setPriceForm({ ...priceForm, customerId: Number(e.target.value) })}
                      >
                        <option value="">-- Pilih --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex flex-col md:flex-row gap-4">
                <button type="button" onClick={() => setShowPriceModal(false)} className="btn flex-1 justify-center py-4 bg-slate-100 dark:bg-white/5 order-3 md:order-1">Batal</button>
                <button type="button" onClick={() => handleAddPrice(false)} className="btn flex-1 border-slate-200 dark:border-white/10 justify-center py-4 font-bold order-2 md:order-2">Simpan Saja</button>
                <button type="button" onClick={() => handleAddPrice(true)} className="btn btn-primary flex-1 justify-center py-4 shadow-lg shadow-primary/20 order-1 md:order-3">Simpan & Kirim WA</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showCustomerModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] px-4">
          <div className="glass-card w-full max-w-[480px] p-8 animate-scale-up border-t-8 border-t-amber-500 relative">
            <button
              onClick={() => {
                setShowCustomerModal(false);
                setEditingCustomerId(null);
                setCustomerForm({ name: '', phone: '', address: '', type: 'pelanggan' });
              }}
              className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold italic mb-8 flex items-center gap-3 text-amber-500">
              {editingCustomerId ? <Pencil size={28} /> : <UserPlus size={28} />} {editingCustomerId ? 'EDIT DATA PELANGGAN' : 'REGISTRY PELANGGAN'}
            </h2>

            <form onSubmit={handleAddCustomer} className="space-y-6">
              <div>
                <label className="label-style text-amber-500/60">Nama Lengkap:</label>
                <input
                  type="text" required className="form-input border-amber-500/20 focus:ring-amber-500/20"
                  value={customerForm.name}
                  onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-style text-amber-500/60">No. HP (WA):</label>
                  <input
                    type="text" className="form-input border-amber-500/20 focus:ring-amber-500/20"
                    value={customerForm.phone}
                    onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-style text-amber-500/60">Tipe:</label>
                  <select
                    className="form-input border-amber-500/20 focus:ring-amber-500/20 font-bold"
                    value={customerForm.type}
                    onChange={e => setCustomerForm({ ...customerForm, type: e.target.value as any })}
                  >
                    <option value="pelanggan">PELANGGAN TETAP</option>
                    <option value="umum">UMUM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-style text-amber-500/60">Alamat / Info Tambahan:</label>
                <textarea
                  className="form-input h-24 resize-none border-amber-500/20 focus:ring-amber-500/20"
                  value={customerForm.address}
                  onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                />
              </div>
              <button type="submit" className="btn bg-amber-500 hover:bg-amber-600 text-white w-full py-4 shadow-lg shadow-amber-500/20">{editingCustomerId ? 'Simpan Perubahan' : 'Simpan Pelanggan'}</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* HELPER COMPONENTS */}
      <style>{`
        .label-style {
          @apply text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-2 block ml-1 opacity-70;
        }
      `}</style>
    </div>
  );
};

const Pagination: React.FC<{ totalPages: number, currentPage: number, setCurrentPage: (p: number) => void }> = ({ totalPages, currentPage, setCurrentPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center gap-2 mt-8 py-4 border-t border-slate-200 dark:border-white/5">
      <button
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="btn p-3 bg-slate-100 dark:bg-white/5 rounded-xl disabled:opacity-20"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="flex items-center gap-2 px-4">
        <span className="text-sm font-bold text-primary">{currentPage}</span>
        <span className="text-[10px] font-bold text-muted uppercase opacity-40">dari</span>
        <span className="text-sm font-bold text-muted">{totalPages}</span>
      </div>
      <button
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="btn p-3 bg-slate-100 dark:bg-white/5 rounded-xl disabled:opacity-20"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default PriceManager;
