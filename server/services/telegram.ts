import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { syncQRISToFirebase, updateFirebaseQRISStatus } from './firebase';
import fs from 'fs';
import path from 'path';
import { sendInternalMessage } from './whatsapp';
import { readDb } from '../database';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('[TELEGRAM] >> Bot aktif di Server!');

export async function notifyQRISInternal(entry: any, autoConfirm: boolean = false) {
  try {
    const statusText = autoConfirm ? '✅ *STATUS: TERVERIFIKASI (AUTO)*' : '👤 *Status: MENUNGGU VERIFIKASI*\nSilahkan konfirmasi jika dana sudah masuk.';
    const message = `🔔 *NOTIFIKASI QRIS MASUK*\n\n📝 Deskripsi: ${entry.description}\n💰 Nominal: Rp ${entry.amount.toLocaleString('id-ID')}\n📅 Tanggal: ${entry.date}\n\n${statusText}`;

    const options: any = {
      parse_mode: 'Markdown'
    };

    if (!autoConfirm) {
      options.reply_markup = {
        inline_keyboard: [
          [
            { text: '✅ DITERIMA', callback_data: `qris_received:${entry.id}` }
          ]
        ]
      };
    }

    syncQRISToFirebase({ ...entry, status: 'pending' }).catch((e: any) =>
      console.warn('[FIREBASE] Sync gagal:', e?.message)
    );

    await bot.sendMessage(CHAT_ID, message, options as any);
    return { success: true };
  } catch (error: any) {
    console.error('[TELEGRAM] Notify Error:', error.message);
    return { success: false };
  }
}

export async function notifyPreorderInternal(entry: any) {
  try {
    let itemsDetail = '';
    if (entry.items && entry.items.length > 0) {
      itemsDetail = '\n📦 *DETAIL ITEM:*\n' + entry.items.map((item: any, idx: number) => {
        const sizeInfo = item.isBanner ? ` (${item.p}x${item.l}m)` : '';
        const materialInfo = item.bahan ? ` [${item.bahan}]` : '';
        const notesInfo = item.notes ? `\n   └ 📝 _Catatan: ${item.notes}_` : '';
        return `${idx + 1}. *${item.name}*${materialInfo}${sizeInfo} x${item.qty}${notesInfo}`;
      }).join('\n') + '\n';
    }

    const message = `📋 *PESANAN PREORDER BARU*\n\n👤 Pelanggan: ${entry.customerName}\n🛠️ Layanan: ${entry.serviceName}\n${itemsDetail}\n💰 Total: Rp ${entry.totalAmount.toLocaleString('id-ID')}\n💳 DP: Rp ${entry.downPayment.toLocaleString('id-ID')}\n💸 Sisa: Rp ${entry.remainingAmount.toLocaleString('id-ID')}\n📅 Deadline: ${entry.dueDate}\n\n👤 *Status: TERCATAT DI SISTEM*\nMohon segera diproses, terima kasih!`;

    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    return { success: true };
  } catch (error: any) {
    console.error('[TELEGRAM] Preorder Notify Error:', error.message);
    return { success: false };
  }
}

export async function sendReportInternal(data: { pdfData: string; filename: string; caption: string }) {
  try {
    const { pdfData, filename, caption } = data;
    // Convert base64 to Buffer
    const buffer = Buffer.from(pdfData.split(',')[1] || pdfData, 'base64');
    
    await bot.sendDocument(CHAT_ID, buffer, { caption }, { filename, contentType: 'application/pdf' });
    console.log('[TELEGRAM] Report terkirim:', filename);
    return { success: true };
  } catch (error: any) {
    console.error('[TELEGRAM] Send Report Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Handler untuk callback query (konfirmasi DITERIMA)
bot.on('callback_query', async (query) => {
  const data = query.data;
  if (data?.startsWith('qris_received:')) {
    const entryId = parseInt(data.split(':')[1]);

    await updateFirebaseQRISStatus(entryId.toString(), 'received');
    
    processConfirmation(entryId, query);
  }
});

let onStatusUpdate: ((id: number, status: string) => void) | null = null;
export function setStatusUpdateCallback(cb: (id: number, status: string) => void) {
  onStatusUpdate = cb;
}

async function processConfirmation(entryId: number, query: TelegramBot.CallbackQuery) {
  if (onStatusUpdate) onStatusUpdate(entryId, 'received');

  if (query.message) {
    await bot.editMessageText(
      `${query.message.text}\n\n✅ *STATUS: DITERIMA OLEH OWNER*`,
      {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      }
    );

    // Kirim notifikasi WA ke kasir jika diperlukan
    try {
      const data = readDb();
      const entry = data.wallet.find(w => w.id === entryId);
      if (entry) {
        const waMsg = `✅ *PEMBAYARAN QRIS TERVERIFIKASI*\n\n💰 Nominal: Rp ${entry.amount.toLocaleString('id-ID')}\n📝 Keterangan: ${entry.description}\n\nDana sudah dikonfirmasi masuk oleh Owner.`;
        sendInternalMessage(waMsg);
      }
    } catch (e) {
      console.error('[TELEGRAM] Error sending WA to cashier:', e);
    }
    
    bot.answerCallbackQuery(query.id, { text: 'Konfirmasi QRIS Berhasil!' });
  }
}
