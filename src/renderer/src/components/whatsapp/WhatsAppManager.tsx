import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  MessageCircle,
  Smartphone,
  ShieldCheck,
  Send,
  AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';

interface WhatsAppManagerProps {
  api: any;
}

const WhatsAppManager: React.FC<WhatsAppManagerProps> = ({ api }) => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [pushName, setPushName] = useState<string | null>(null);
  const [cashierNumber, setCashierNumber] = useState('');
  const [ownerNumber, setOwnerNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.waGetStatus();
      setStatus(res.status);
      setPushName(res.pushName);
      if (res.qr) {
        const url = await QRCode.toDataURL(res.qr);
        setQrImage(url);
      } else {
        setQrImage(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSettings = async () => {
    const settings = await api.getSettings();
    if (settings.cashierNumber) setCashierNumber(settings.cashierNumber);
    if (settings.ownerNumber) setOwnerNumber(settings.ownerNumber);
  };

  useEffect(() => {
    fetchStatus();
    loadSettings();

    const unsubsQr = api.onWaQrUpdate(async (data: { qr: string }) => {
      const url = await QRCode.toDataURL(data.qr);
      setQrImage(url);
    });

    const unsubsStatus = api.onWaStatusUpdate((data: { status: any, pushName?: string }) => {
      setStatus(data.status);
      if (data.pushName) setPushName(data.pushName);
      if (data.status === 'connected') {
        setQrImage(null);
      }
    });

    return () => {
      unsubsQr();
      unsubsStatus();
    };
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Putus Koneksi WhatsApp?',
      text: 'Anda perlu scan ulang setelah logout.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Logout',
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      await api.waLogout();
      await fetchStatus();
      setIsLoading(false);
      Swal.fire('Terputus', 'Silahkan scan ulang jika ingin menghubungkan kembali.', 'info');
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    await api.saveSettings({ cashierNumber, ownerNumber });
    setIsLoading(false);
    Swal.fire({
      title: 'Berhasil!',
      text: 'Nomor WhatsApp Kasir telah disimpan.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <MessageCircle size={24} />
            </div>
            WhatsApp Manager
          </h1>
          <p className="text-muted mt-2 font-medium">Hubungkan WhatsApp Anda untuk mengirim notifikasi otomatis ke Kasir.</p>
        </div>
        
        <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border font-bold text-xs uppercase tracking-widest ${
          status === 'connected' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
            : status === 'connecting' 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            status === 'connected' ? 'bg-emerald-500 animate-pulse' : status === 'connecting' ? 'bg-amber-500 animate-spin' : 'bg-rose-500'
          }`} />
          {status === 'connected' ? 'TERHUBUNG' : status === 'connecting' ? 'MENGHUBUNGKAN...' : 'TERPUTUS'}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Connection */}
        <div className="space-y-6">
          <div className="glass-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <QrCode size={120} />
            </div>

            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
              <Smartphone size={20} className="text-primary" />
              Koneksi Perangkat
            </h2>

            {status === 'connected' ? (
              <div className="space-y-6">
                <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{pushName || 'WhatsApp User'}</h3>
                    <p className="text-sm text-muted">Perangkat Anda sudah tertaut dan siap mengirim notifikasi.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 text-center">
                      <p className="text-[10px] font-black uppercase text-muted mb-1">Status Sesi</p>
                      <p className="text-sm font-bold text-emerald-500">Aktif</p>
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 text-center">
                      <p className="text-[10px] font-black uppercase text-muted mb-1">Enkripsi</p>
                      <p className="text-sm font-bold text-blue-500 flex items-center justify-center gap-1">
                        <ShieldCheck size={14} /> End-to-End
                      </p>
                   </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="w-full py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
                >
                  <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
                  Logout / Putus Koneksi
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                {qrImage ? (
                  <div className="p-6 bg-white rounded-3xl shadow-xl space-y-4 text-center border-4 border-slate-100">
                    <img src={qrImage} alt="WhatsApp QR Code" className="w-[200px] h-[200px]" />
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Scan QR Code</p>
                      <p className="text-[10px] text-slate-300">Gunakan WhatsApp di HP Anda</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] bg-slate-100 dark:bg-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-white/10">
                    <RefreshCw size={40} className="text-primary animate-spin mb-4" />
                    <p className="text-xs font-bold text-muted">Sedang menyiapkan QR Code...</p>
                  </div>
                )}

                <div className="mt-8 space-y-4 w-full">
                  <div className="flex items-start gap-3 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-600 dark:text-amber-400">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">Buka WhatsApp &gt; Perangkat Tertaut &gt; Tautkan Perangkat, lalu arahkan kamera ke kode QR di atas.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-6">
          <div className="glass-card">
            <h2 className="text-xl font-black mb-1 flex items-center gap-2">
              <Send size={20} className="text-primary" />
              Konfigurasi Notifikasi
            </h2>
            <p className="text-xs text-muted mb-6">Tentukan ke mana notifikasi otomatis akan dikirim.</p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Nomor WhatsApp Kasir:</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    className="form-input text-lg font-black pl-4 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-200 focus:border-primary transition-all"
                    placeholder="Contoh: 08123456789"
                    value={cashierNumber}
                    onChange={(e) => setCashierNumber(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-muted/70 italic ml-1">*Gunankan format angka saja (628... atau 08...).</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Nomor WhatsApp Owner (HP Bapak):</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    className="form-input text-lg font-black pl-4 py-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 focus:border-amber-500 transition-all"
                    placeholder="Contoh: 08123456789"
                    value={ownerNumber}
                    onChange={(e) => setOwnerNumber(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-amber-500/70 italic ml-1">*PENTING: Robot hanya akan membaca notifikasi otomatis dari nomor ini.</p>
              </div>

              <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-primary" />
                  Pratinjau Pesan:
                </h3>
                <div className="p-4 bg-white dark:bg-bg-dark rounded-2xl border border-slate-200 dark:border-white/5 text-xs font-medium leading-relaxed font-mono whitespace-pre-line">
                  ✅ *KONFIRMASI PEMBAYARAN*
                  {"\n\n"}
                  📝 Deskripsi: [Contoh Deskripsi]
                  {"\n"}💰 Nominal: Rp 50.000
                  {"\n"}📅 Tanggal: {new Date().toLocaleDateString('id-ID')}
                  {"\n\n"}
                  👤 *Status: TELAH DIVERIFIKASI OWNER*
                  {"\n"}Silahkan diproses, terima kasih!
                </div>
              </div>

              <button 
                onClick={handleSaveSettings}
                disabled={isLoading}
                className="btn btn-primary w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                Simpan Konfigurasi
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-2xl relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 opacity-10">
                <ShieldCheck size={120} />
             </div>
             <h3 className="text-lg font-black mb-2 italic">Aman & Privat</h3>
             <p className="text-xs text-slate-400 font-medium leading-relaxed">
               Aplikasi ini menggunakan koneksi langsung ke server WhatsApp. Data sesi Anda disimpan secara lokal di komputer ini dan tidak dikirim ke server manapun.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppManager;
