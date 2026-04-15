import React from 'react';
import { Lock, KeyRound, Unlock } from 'lucide-react';
import Swal from 'sweetalert2';
import packageJson from '../../../../../package.json';

interface LoginScreenProps {
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  loginInput: string;
  setLoginInput: (val: string) => void;
  savedPassword: string;
  setIsLoggedIn: (val: boolean) => void;
  storeName: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  isLoggedIn,
  isAuthLoading,
  loginInput,
  setLoginInput,
  savedPassword,
  setIsLoggedIn,
  storeName,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  if (isLoggedIn || isAuthLoading) return null;

  const handleLogin = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isSubmitting || !loginInput.trim()) return;

    setIsSubmitting(true);

    if (loginInput === savedPassword) {
      setIsLoggedIn(true);
      Swal.fire({
        title: 'Berhasil!',
        text: 'Selamat Datang Kembali.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
      setIsSubmitting(false);
    } else {
      setLoginInput(''); // Clear immediately for focus
      await Swal.fire({
        title: 'PIN Salah!',
        text: 'Silakan periksa kembali PIN Anda.',
        icon: 'error',
        confirmButtonText: 'Coba Lagi',
        confirmButtonColor: '#f43f5e',
        allowOutsideClick: false,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark transition-colors relative overflow-hidden">
      {/* Animated Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500/10 rounded-full blur-[120px] animate-pulse delay-700" />

      <div className="glass-card w-full max-w-[420px] p-10 flex flex-col items-center gap-8 animate-fade-in relative z-10 border border-white/20 dark:border-white/5">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-rose-600 rounded-3xl flex items-center justify-center shadow-xl shadow-primary/20">
          <Lock size={36} className="text-white" />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold title-gradient">{storeName}</h1>
          <p className="text-slate-500 dark:text-text-muted mt-2 font-medium">Sistem Keuangan Terkunci</p>
        </div>

        <div className="w-full space-y-4">
          <div className="relative group">
            <KeyRound
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="password"
              className="form-input pl-12 py-4 text-center tracking-[0.5em] text-xl font-bold"
              placeholder="••••••"
              autoFocus
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin(e);
              }}
            />
          </div>

          <button
            className={`btn btn-primary w-full py-4 rounded-2xl text-lg font-bold shadow-xl flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            onClick={(e) => handleLogin(e)}
            disabled={isSubmitting}
          >
            <Unlock size={20} /> {isSubmitting ? 'Memverifikasi...' : 'Buka Laporan'}
          </button>
          <span className="block text-center text-xs text-muted dark:text-muted italic capitalize mt-2">
            Default PIN adalah 0000
          </span>
        </div>

        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest opacity-50">
          Harmony Security v{packageJson.version}
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
