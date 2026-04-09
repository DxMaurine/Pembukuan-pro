# 📱 Panduan Build APK - DM POS Mobile

Dokumen ini berisi instruksi cara membangun (build) aplikasi mobile untuk HP Android Bapak.

## 🚀 1. Cara Otomatis (GitHub Actions) - DIREKOMENDASIKAN
Mulai sekarang, Bapak cukup mengirimkan kode ke GitHub, dan server GitHub akan otomatis membuatkan APK-nya secara **Gratis**.

**Langkah-langkah:**
1. Pastikan Bapak sudah menyimpan rahasia (Secrets) di GitHub (Hanya perlu sekali).
2. Di terminal (folder root atau mobile), jalankan:
   ```bash
   git add .
   git commit -m "Update UI atau perbaikan fitur"
   git push origin main
   ```
3. Buka GitHub Bapak di browser, pilih tab **Actions**.
4. Lihat proses **Android Build**. Tunggu sampai warna Hijau.
5. Klik build tersebut, scroll ke bawah, download file **app-release** (zip berisi APK).

---

## 🛠 2. Cara Manual (EAS Build) - JIKA GITHUB ERROR
Jika GitHub sedang gangguan atau Bapak ingin build resmi lewat Expo (memakai kuota EAS):

**Langkah-langkah:**
1. Masuk ke folder `mobile`:
   ```bash
   cd mobile
   ```
2. Jalankan build dengan membersihkan cache (agar tidak error 429):
   ```bash
   npx -y eas-cli build --platform android --profile production --clear-cache
   ```
3. Tunggu sampai muncul link APK dari Expo.

---

## ⚠️ PENTING (Keamanan)
- **File Kunci**: File `.jks` atau `.bak` (keystore) sudah otomatis diabaikan oleh `.gitignore`. **JANGAN PERNAH** menghapus baris tersebut agar kunci Bapak tidak bocor ke publik.
- **Base64**: Jika Bapak kehilangan data di GitHub Secrets, Bapak perlu mengubah file kunci ke Base64 lagi menggunakan:
  `base64 nama_file_kunci.jks > keystore_base64.txt` (di Git Bash).

---
*DM POS Lite - v3.1.6*
