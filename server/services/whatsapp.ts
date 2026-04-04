import { webcrypto } from 'node:crypto';
import path from 'path';
import pino from 'pino';
import { existsSync, mkdirSync, rmSync } from 'fs';

// Polyfill crypto for Baileys
try {
  if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = webcrypto;
  }
} catch (e) {
  console.error('[WHATSAPP] Failed to polyfill crypto:', e);
}

const logger = pino({ level: 'silent' });
const AUTH_PATH = process.env.WA_AUTH_PATH || path.join(__dirname, '..', 'wa-auth');

let sock: any = null;
let qrCode: string | null = null;
let connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

let onStatusChange: ((data: any) => void) | null = null;
let onQrUpdate: ((qr: string) => void) | null = null;

export function setWhatsAppCallbacks(statusCb: (data: any) => void, qrCb: (qr: string) => void) {
  onStatusChange = statusCb;
  onQrUpdate = qrCb;
}

export async function sendInternalMessage(to: string, message: string) {
  if (connectionStatus !== 'connected' || !sock) {
    return { success: false, error: 'WhatsApp not connected' };
  }

  try {
    let jid = to.replace(/\D/g, '');
    if (jid.startsWith('0')) jid = '62' + jid.slice(1);
    if (!jid.endsWith('@s.whatsapp.net')) jid += '@s.whatsapp.net';

    await sock.sendMessage(jid, { text: message });
    console.log('[WHATSAPP] >> Pesan terkirim ke', jid);
    return { success: true };
  } catch (error: any) {
    console.error('[WHATSAPP] Send error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function initWhatsApp() {
  const baileys = await import('@whiskeysockets/baileys');
  const makeWASocket = baileys.default;
  const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys;

  async function connectToWhatsApp() {
    if (!existsSync(AUTH_PATH)) {
      mkdirSync(AUTH_PATH, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
    const { version } = await fetchLatestBaileysVersion();

    connectionStatus = 'connecting';
    if (onStatusChange) onStatusChange({ status: connectionStatus });

    sock = makeWASocket({
      version,
      printQRInTerminal: true, // Also print to terminal for debugging
      auth: state,
      logger,
      browser: ['DM Pembukuan Pro', 'Chrome', '114.0.5735.199'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
    });

    sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = qr;
        console.log('[WHATSAPP] >> New QR Code generated');
        if (onQrUpdate) onQrUpdate(qr);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'Unknown reason';
        console.log(`[WHATSAPP] >> Connection closed. Reason: ${reason} (${statusCode})`);
        
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        connectionStatus = 'disconnected';
        qrCode = null;
        if (onStatusChange) onStatusChange({ status: connectionStatus });

        if (shouldReconnect) {
          console.log('[WHATSAPP] >> Reconnecting...');
          setTimeout(connectToWhatsApp, 3000);
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        qrCode = null;
        console.log('[WHATSAPP] >> TERKONEKSI SEBAGAI:', sock?.user?.id || 'Unknown');
        if (onStatusChange) onStatusChange({ 
          status: connectionStatus,
          pushName: sock?.user?.name || sock?.user?.id
        });
      }
    });

    sock.ev.on('creds.update', saveCreds);
  }

  connectToWhatsApp();
}

export async function logoutWhatsApp() {
  if (sock) {
    try {
      await sock.logout();
      sock.end(undefined);
    } catch (e) {
      console.error('[WHATSAPP] Logout error:', e);
    }
  }
  
  sock = null;
  qrCode = null;
  connectionStatus = 'disconnected';

  setTimeout(() => {
    if (existsSync(AUTH_PATH)) {
      try { rmSync(AUTH_PATH, { recursive: true, force: true }); } catch (e) {}
    }
    initWhatsApp();
  }, 1000);
}

export function getWhatsAppStatus() {
  return { 
    status: connectionStatus, 
    qr: qrCode,
    pushName: sock?.user?.name || null
  };
}
