import TelegramBot from 'node-telegram-bot-api';
import { ipcMain } from 'electron';
import { updateFirebaseQRISStatus, syncQRISToFirebase } from './firebase';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { sendInternalMessage } from './whatsapp';

const BOT_TOKEN = '8398912567:AAG8AjzEemIHzna9jEq4nEPV-3Kx6pEpTJs';
const CHAT_ID = '7978582093';

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

function startBotPolling() {
  bot.startPolling({ restart: true })
    .then(() => console.log('[TELEGRAM] >> Bot polling aktif!'))
    .catch((err) => console.error('[TELEGRAM] Polling start error:', err));
}

// Mulai polling setelah delay singkat agar proses lama sempat mati
setTimeout(startBotPolling, 3000);

// Jika terjadi konflik 409, tunggu 35 detik (timeout Telegram) lalu restart
bot.on('polling_error', (error: any) => {
  if (error.message && error.message.includes('409')) {
    console.log('[TELEGRAM] ⚠️ Konflik 409, menunggu 35 detik lalu restart...');
    bot.stopPolling().catch(() => {});
    setTimeout(startBotPolling, 35000);
  } else {
    console.error('[TELEGRAM] Polling error:', error.message);
  }
});

export async function notifyQRISInternal(entry: any) {
  try {
    const message = `🔔 *NOTIFIKASI QRIS BARU*\n\n📝 Deskripsi: ${entry.description}\n💰 Nominal: Rp ${entry.amount.toLocaleString('id-ID')}\n📅 Tanggal: ${entry.date}\n\nSilahkan konfirmasi jika dana sudah masuk.`;

    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ DITERIMA', callback_data: `qris_received:${entry.id}` }
          ]
        ]
      }
    };

    // Firebase sync di background - TIDAK menunggu supaya tidak blokir Telegram
    syncQRISToFirebase({ ...entry, status: 'pending' }).catch((e: any) =>
      console.warn('[FIREBASE] Sync gagal (diabaikan):', e?.message)
    );

    // Langsung kirim notifikasi Telegram (max 10 detik)
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Telegram timeout 10s')), 10000)
    );
    await Promise.race([
      bot.sendMessage(CHAT_ID, message, options as any),
      timeout
    ]);
    return { success: true };
  } catch (error: any) {
    console.error('Telegram Notify Error:', error.message);
    return { success: false };
  }
}

export function setupTelegramHandlers(updateLocalStatus: (id: number, status: string) => void) {
  // Handler untuk kirim laporan (eksisting)
  ipcMain.handle('service:send-report', async (_, { pdfData, caption, filename }) => {
    try {
      const buffer = Buffer.from(pdfData, 'base64');
      await bot.sendDocument(CHAT_ID, buffer, { caption: caption }, { filename: filename || 'laporan.pdf' });
      return { success: true };
    } catch (error: any) {
      console.error('Telegram Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Handler untuk notifikasi QRIS baru dengan tombol "TERIMA"
  ipcMain.handle('service:notify-qris', async (_, entry) => {
    return await notifyQRISInternal(entry);
  });

  ipcMain.handle('service:notify-preorder', async (_, entry) => {
    try {
      const message = `📋 *PESANAN PREORDER BARU*\n\n👤 Pelanggan: ${entry.customerName}\n🛠️ Layanan: ${entry.serviceName}\n💰 Total: Rp ${entry.totalAmount.toLocaleString('id-ID')}\n💳 DP: Rp ${entry.downPayment.toLocaleString('id-ID')}\n💸 Sisa: Rp ${entry.remainingAmount.toLocaleString('id-ID')}\n📅 Deadline: ${entry.dueDate}\n\n📝 Catatan: ${entry.notes || '-'}`;

      await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      return { success: true };
    } catch (error: any) {
      console.error('Telegram Preorder Notify Error:', error.message);
      return { success: false };
    }
  });

  // Handler manual untuk kirim WA
  ipcMain.handle('service:send-whatsapp', async (_, { to, message }) => {
    return await sendInternalMessage(to, message);
  });

  // Menangani klik pada tombol Inline Keyboard
  bot.on('callback_query', async (query) => {
    const data = query.data;
    if (data?.startsWith('qris_received:')) {
      const entryId = parseInt(data.split(':')[1]);

      await updateFirebaseQRISStatus(entryId.toString(), 'received');
      updateLocalStatus(entryId, 'received');

      if (query.message) {
        await bot.editMessageText(
          `${query.message.text}\n\n✅ *STATUS: DITERIMA OLEH OWNER*`,
          {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
          }
        );

        const text = query.message.text || '';
        const deskripsiMatch = text.match(/Deskripsi: (.*)/);
        const nominalMatch = text.match(/Nominal: (.*)/);
        const tanggalMatch = text.match(/Tanggal: (.*)/);

        const deskripsi = deskripsiMatch ? deskripsiMatch[1].trim() : '-';
        const nominal = nominalMatch ? nominalMatch[1].trim() : '-';
        const tanggal = tanggalMatch ? tanggalMatch[1].trim() : '-';

        try {
          const dbPath = join(app.getPath('userData'), 'db.json');
          if (existsSync(dbPath)) {
            const data = JSON.parse(readFileSync(dbPath, 'utf-8'));
            const cashierNumber = data.settings?.cashierNumber;

            console.log('--- DEBUG WA SEND ---');
            console.log('Nomor Kasir dari DB:', cashierNumber);
            console.log('Data Pesan:', { deskripsi, nominal, tanggal });

            if (cashierNumber && cashierNumber.trim() !== '') {
              const waMessage = `✅ *KONFIRMASI PEMBAYARAN*\n\n📝 Deskripsi: ${deskripsi}\n💰 Nominal: ${nominal}\n📅 Tanggal: ${tanggal}\n\n👤 *Status: TELAH DIVERIFIKASI OWNER*\nSilahkan diproses, terima kasih!`;
              const res = await sendInternalMessage(cashierNumber, waMessage);
              console.log('Hasil Kirim WA:', res);
            } else {
              console.log('WhatsApp Gagal: Nomor WA Kasir kosong di Pengaturan.');
            }
          }
        } catch (e) {
          console.error('Error sending WA to cashier:', e);
        }

        await bot.answerCallbackQuery(query.id, { text: 'Konfirmasi QRIS Berhasil!' });
      }
    }
  });

  // --- FITUR AUTO-DETECTION VIA TELEGRAM ---
  bot.on('message', async (msg) => {
    console.log(`[TELEGRAM DEBUG] Pesan masuk dari ChatID: ${msg.chat.id}, Nama: ${msg.from?.first_name}, Teks: "${msg.text || ''}"`);

    // Hanya proses pesan teks dari Chat ID yang diotorisasi
    if (!msg.text || msg.chat.id.toString() !== CHAT_ID) {
      if (msg.text) console.log(`[TELEGRAM INFO] Chat ID ${msg.chat.id} tidak diotorisasi.`);
      return;
    }

    const text = msg.text;

    // Abaikan URL
    if (text.startsWith('http://') || text.startsWith('https://')) {
      console.log('[TELEGRAM INFO] Pesan diabaikan karena berupa URL.');
      return;
    }

    const lowerText = text.toLowerCase();
    const isPayment = lowerText.includes('pembayaran') ||
                      lowerText.includes('berhasil') ||
                      lowerText.includes('qris') ||
                      lowerText.includes('dana') ||
                      lowerText.includes('menerima') ||
                      lowerText.includes('[auto-dana]');

    if (isPayment) {
      console.log('--- TELEGRAM DETEKSI DANA MASUK ---');

      const cleanText = text.replace('[AUTO-DANA]', '').replace('{notification}', '').trim();

      const rpMatches = [...cleanText.matchAll(/Rp[:\. ]*(\d[\d\.,]*)/gi)];
      let amountFound: number | null = null;

      for (const m of rpMatches) {
        const val = parseFloat(m[1].replace(/[\.,]/g, ''));
        if (val > 0 && val < 500000000) {
          amountFound = val;
          break;
        }
      }

      // Fallback: cari angka umum
      if (amountFound === null) {
        const numMatches = [...cleanText.matchAll(/(\d[\d\.,]{1,})/g)];
        for (const m of numMatches) {
          const val = parseFloat(m[1].replace(/[\.,]/g, ''));
          if (val >= 100 && val < 500000000) {
            amountFound = val;
            break;
          }
        }
      }

      if (amountFound !== null) {
        try {
          console.log('Deteksi Nominal (Telegram):', amountFound);

          const { addWalletEntryInternal } = await import('../db');
          const { BrowserWindow } = await import('electron');
          const mainWindow = BrowserWindow.getAllWindows()[0];

          // Gunakan Tanggal Lokal (Bukan UTC) agar filter "Hari Ini" di frontend pas
          const localDate = new Date();
          const year = localDate.getFullYear();
          const month = String(localDate.getMonth() + 1).padStart(2, '0');
          const day = String(localDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          const newEntry = addWalletEntryInternal({
            type: 'qris',
            amount: amountFound,
            description: `[OTOMATIS] DANA - ${localDate.toLocaleTimeString('id-ID')}`,
            date: dateStr,
            status: 'pending'
          }, mainWindow);

          await notifyQRISInternal(newEntry);
          console.log('Auto-Detection via Telegram: SUCCESS');
        } catch (err) {
          console.error('Error processing telegram auto-dana:', err);
        }
      } else {
        console.log('[TELEGRAM] Nominal tidak ditemukan di teks:', cleanText);
      }
    }
  });
}

export default bot;
