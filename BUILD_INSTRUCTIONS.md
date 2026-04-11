# 📱 Panduan Build & Update - DM ADMIN PRO

Dokumen ini berisi instruksi cara membangun (build) dan memperbarui aplikasi DM POS (Desktop & Mobile).

## 🖥 1. Aplikasi Desktop (Windows) - AUTOMATED
Build Desktop sekarang sudah otomatis dilakukan oleh GitHub setiap kali Bapak melakukan `git push`.

**Langkah-langkah Update:**
1. Di aplikasi Bapak, buka menu **Pengaturan > Tentang**.
2. Klik tombol **Cek Pembaruan Sistem**.
3. Jika ada versi baru, aplikasi akan mengunduh dan meminta **Restart** secara otomatis.
4. **Konfigurasi Bot**: Untuk Telegram, bapak tidak perlu lagi edit file `.env`. Cukup isi Token dan Chat ID di menu **Pengaturan > Otomasi**.

---

## 🚀 2. Aplikasi Mobile (Android) - GITHUB ACTIONS
Sama seperti desktop, APK Android akan dibangun otomatis oleh GitHub jika ada perubahan di folder `mobile/`.

**Langkah-langkah:**
1. Jalankan `git push origin main`.
2. Buka repo GitHub di browser, pilih tab **Actions**.
3. Lihat proses **Android Build**. Tunggu sampai warna Hijau.
4. Klik build tersebut, scroll ke bawah, download file **app-release** (zip berisi APK).

---

## 🛠 3. Build Manual (Hanya jika GitHub Error)
- **Desktop**: Jalankan `npm run build:win` di terminal root.
- **Mobile**: Jalankan `npx eas-cli build --platform android --profile production` di folder `mobile`.

---

## ⚠️ PENTING (Keamanan)
- **File .env**: File `.env` sekarang diabaikan oleh installer untuk melindungi data bapak agar tidak tertimpa saat update.
- **Database**: Database bapak (`db.json`) tersimpan aman di folder `AppData` dan tidak akan terhapus meskipun aplikasi diinstall ulang.

---
*DM ADMIN PRO - v3.1.8-Lite*
