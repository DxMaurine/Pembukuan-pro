import React, { useState, useEffect } from 'react';
import {
  QrCode,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Smartphone,
  ShieldCheck,
  Send,
  AlertCircle,
  ChevronDown
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
  const [showPreview, setShowPreview] = useState(false);

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
    <div className="flex flex-col gap-6 animate-fade-in pb-10 text-text-main">
      {/* Redundant header removed as it is now inside Server Hub tabs */}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
        {/* Left Column: Connection */}
        <div className="space-y-6 flex flex-col">
          <div className="glass-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <QrCode size={120} />
            </div>

            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-tight text-text-main">
              <Smartphone size={20} className="text-primary" />
              Koneksi Perangkat
            </h2>

            {status === 'connected' ? (
              <div className="space-y-4">
                <div className="p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex items-center gap-4 transition-all hover:bg-emerald-500/10">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight text-emerald-600 dark:text-emerald-400">{pushName || 'WhatsApp User'}</h3>
                    <p className="text-[11px] text-text-muted font-bold">Perangkat tertaut & aktif</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-bg-surface rounded-2xl border border-border text-center">
                    <p className="text-[9px] font-bold uppercase text-text-muted mb-0.5 tracking-widest">Sesi</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Aktif</p>
                  </div>
                  <div className="p-3 bg-bg-surface rounded-2xl border border-border text-center">
                    <p className="text-[9px] font-bold uppercase text-text-muted mb-0.5 tracking-widest">Privasi</p>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-500 flex items-center justify-center gap-1 uppercase">
                      <ShieldCheck size={12} /> E2EE
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-500 hover:text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
                >
                  <LogOut size={16} />
                  Logout Perangkat
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                {qrImage ? (
                  <div className="p-6 bg-bg-surface rounded-3xl shadow-xl space-y-4 text-center border border-border">
                    <img src={qrImage} alt="WhatsApp QR Code" className="w-[200px] h-[200px]" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Scan QR Code</p>
                      <p className="text-[14px] text-text-muted">Gunakan WhatsApp di HP Anda</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] bg-bg-surface rounded-3xl flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border">
                    <RefreshCw size={40} className="text-primary animate-spin mb-4" />
                    <p className="text-xs font-bold text-text-muted">Mempersiapkan QR...</p>
                  </div>
                )}

                <div className="mt-8 space-y-4 w-full">
                  <div className="flex items-start gap-3 p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-600 dark:text-amber-400">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-relaxed">Buka WhatsApp &gt; Perangkat Tertaut &gt; Tautkan Perangkat, lalu arahkan kamera ke kode QR.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 glass-card border-emerald-500/20 bg-bg-surface relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform duration-700">
              <ShieldCheck size={80} className="text-emerald-400" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Security Certified</h3>
                <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                  Sistem telah terverifikasi aman dan stabil untuk penggunaan jangka panjang.
                  Telah melalui berbagai pengujian ketat oleh tim berpengalaman dan profesional di bidangnya.
                  Keamanan, keandalan, dan efisiensi menjadi prioritas utama dalam setiap prosesnya.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 glass-card border-border bg-bg-surface relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-main">Sesi Aman & Privat</h3>
                <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                  Robot Agent menggunakan koneksi langsung ke server WhatsApp. Sesi ini disimpan di lokal komputer & tidak dikirim ke server manapun.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2 uppercase tracking-tight text-text-main">
              <Send size={20} className="text-primary" />
              Notifikasi
            </h2>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-6 opacity-60">Alamat Pengiriman Pesan Otomatis</p>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted ml-1">WhatsApp Kasir:</label>
                <div className="relative group">
                  <input
                    type="text"
                    className="form-input w-full text-base font-bold pl-4 py-3 rounded-2xl bg-bg-surface border-border focus:border-primary transition-all text-text-main"
                    placeholder="Contoh: 08123456789"
                    value={cashierNumber}
                    onChange={(e) => setCashierNumber(e.target.value)}
                  />
                </div>
                <p className="text-[12px] text-text-muted italic ml-1 opacity-50">*Gunakan format angka saja (628 atau 08...)</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted ml-1">WhatsApp Owner (HP Anda):</label>
                <div className="relative group">
                  <input
                    type="text"
                    className="form-input w-full text-base font-bold pl-4 py-3 rounded-2xl bg-bg-surface border-border focus:border-amber-500 transition-all text-amber-600 dark:text-amber-500"
                    placeholder="Contoh: 08123456789"
                    value={ownerNumber}
                    onChange={(e) => setOwnerNumber(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-amber-500/60 font-bold ml-1 uppercase tracking-tighter">Anda WA dari nomor ini & Robot akan memprosesnya.</p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center justify-between w-full p-4 rounded-2xl bg-bg-surface border border-border hover:bg-blue-500/20 transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-main">Pratinjau Pesan</span>
                  </div>
                  <ChevronDown size={16} className={`text-text-muted transition-transform duration-500 ${showPreview ? 'rotate-180 text-primary' : ''}`} />
                </button>

                {showPreview && (
                  <div className="p-5 bg-bg-card active:bg-bg-surface rounded-2xl border border-border text-xs font-bold leading-relaxed font-mono whitespace-pre-line animate-fade-in text-text-muted shadow-inner">
                    ✅ *KONFIRMASI PEMBAYARAN*
                    {"\n\n"}
                    📝 Deskripsi: [Contoh Deskripsi]
                    {"\n"}💰 Nominal: Rp 50.000
                    {"\n"}📅 Tanggal: {new Date().toLocaleDateString('id-ID')}
                    {"\n\n"}
                    👤 *Status: DIVERIFIKASI OWNER*
                    {"\n"}Silahkan diproses, terima kasih!
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={isLoading}
                className="btn btn-primary w-full py-4 rounded-2xl font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 text-xs mt-2 transition-all hover:scale-[1.02] active:scale-95"
              >
                {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                SIMPAN KONFIGURASI
              </button>
            </div>
          </div>

          <div className="p-4 glass-card border-border bg-bg-surface relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-main">Privasi Terjamin</h3>
                <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                  Data sesi Anda terenkripsi dan disimpan lokal tanpa pihak ketiga.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppManager;
