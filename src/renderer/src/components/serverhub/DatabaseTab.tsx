import React, { useState, useEffect } from 'react';
import { Database, FolderOpen, RefreshCw, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import Swal from 'sweetalert2';

interface DatabaseTabProps {
  api: any;
}

const DatabaseTab: React.FC<DatabaseTabProps> = ({ api }) => {
  const [dbPath, setDbPath] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchPath = async () => {
      try {
        const path = await api.getDbPath();
        setDbPath(path);
      } catch (e) {
        console.error('Failed to get DB path', e);
      }
    };
    fetchPath();
  }, [api]);

  const handleImport = async () => {
    const result = await Swal.fire({
      title: 'Impor Database Lama?',
      text: "Data yang ada saat ini akan dibackup (sebagai db.json.bak) dan diganti dengan file yang Bapak pilih.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#f43f5e',
      confirmButtonText: 'Ya, Pilih File!',
      cancelButtonText: 'Batal',
      background: '#1e1e1e',
      color: '#fff'
    });

    if (result.isConfirmed) {
      setIsImporting(true);
      try {
        const res = await api.importDatabase();
        if (res.success) {
          await Swal.fire({
            title: 'Berhasil di-Impor!',
            text: 'Aplikasi akan restart otomatis dalam 3 detik untuk memuat data baru.',
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
            background: '#1e1e1e',
            color: '#fff'
          });
          api.relaunchApp();
        } else if (res.error !== 'Dibatalkan') {
          Swal.fire({
            title: 'Gagal Impor',
            text: res.error,
            icon: 'error',
            background: '#1e1e1e',
            color: '#fff'
          });
        }
      } catch (e: any) {
        Swal.fire({
          title: 'Error',
          text: e.message,
          icon: 'error',
          background: '#1e1e1e',
          color: '#fff'
        });
      } finally {
        setIsImporting(false);
      }
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl pb-20">
      <div className="glass-card p-8 border-indigo-500/10 bg-gradient-to-br from-indigo-500/5 to-transparent relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5">
          <Database size={200} />
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-text-main flex items-center gap-4 mb-2">
            <Database className="text-indigo-500" size={32} />
            Database Management
          </h2>
          <p className="text-text-muted font-bold tracking-widest uppercase text-xs opacity-60 mb-12">
            Migrasi & Portabilitas Data Lokal
          </p>

          <div className="space-y-8">
            {/* Current Path Info */}
            <div className="p-6 rounded-3xl bg-bg-card border border-border/50 shadow-inner">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                  <FolderOpen size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Lokasi Database Saat Ini</h4>
                  <code className="text-sm text-indigo-400 font-mono block p-3 bg-bg-surface rounded-xl break-all border border-border/30">
                    {dbPath || 'Loading path...'}
                  </code>
                  <p className="mt-3 text-[10px] text-text-muted italic opacity-60">
                    *Ini adalah folder "AppData" tempat aplikasi menyimpan data secara aman.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-8 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all group cursor-pointer" onClick={handleImport}>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mb-6 group-hover:scale-110 transition-transform">
                  {isImporting ? <RefreshCw size={28} className="animate-spin" /> : <Database size={28} />}
                </div>
                <h3 className="text-xl font-bold text-text-main mb-2">Impor Database Lama</h3>
                <p className="text-xs text-text-muted leading-relaxed mb-6 font-medium">
                  Ambil data dari komputer lama atau folder development (db.json) dan pindahkan ke sistem baru secara otomatis.
                </p>
                <button 
                  disabled={isImporting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all"
                >
                  {isImporting ? 'Memproses...' : 'Pilih File Database'}
                </button>
              </div>

              <div className="glass-card p-8 border-emerald-500/20 bg-emerald-500/5 opacity-60 cursor-not-allowed">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white mb-6">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-xl font-bold text-text-main mb-2">Backup Rutin</h3>
                <p className="text-xs text-text-muted leading-relaxed mb-6 font-medium">
                  Sistem otomatis membackup data Bapak setiap minggu ke folder backup. (Coming Soon)
                </p>
                <div className="w-full py-3 bg-emerald-600/20 text-emerald-500 rounded-xl font-bold uppercase tracking-widest text-[10px] text-center">
                  Automatic
                </div>
              </div>
            </div>

            {/* Warning Note */}
            <div className="p-6 bg-amber-500/10 rounded-3xl border border-amber-500/20 flex items-start gap-5">
              <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-xl shadow-amber-500/20">
                <Zap size={24} />
              </div>
              <div>
                <h5 className="font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest text-sm mb-2">Penting!</h5>
                <p className="text-xs text-text-muted leading-relaxed font-bold opacity-80">
                  Pastikan file yang Bapak impor adalah file <span className="text-amber-500">db.json</span> yang asli. Aplikasi akan melakukan validasi struktur data sebelum menggantinya untuk mencegah kerusakan sistem.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTab;
