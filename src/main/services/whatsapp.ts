import { webcrypto } from 'node:crypto';

// Forcefully polyfill globalThis.crypto for Baileys compatibility in Electron Main Process
try {
  if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = webcrypto;
  }
  // Some environments need explicit subtle property
  if (globalThis.crypto && !globalThis.crypto.subtle && webcrypto.subtle) {
    // @ts-ignore
    globalThis.crypto.subtle = webcrypto.subtle;
  }
} catch (e) {
  console.error('Failed to polyfill crypto:', e);
}

import { app, ipcMain, BrowserWindow } from 'electron';
import { join } from 'path';
import pino from 'pino';
import { existsSync, mkdirSync, rmSync } from 'fs';

const logger = pino({ level: 'silent' });
const AUTH_PATH = join(app.getPath('userData'), 'wa-auth');

let sock: any = null;
let qrCode: string | null = null;
let connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
let DisconnectReason: any = null;

export async function sendInternalMessage(to: string, message: string) {
  if (connectionStatus !== 'connected' || !sock) {
    return { success: false, error: 'WhatsApp not connected' };
  }

  try {
    let jid = to.replace(/\D/g, '');
    if (jid.startsWith('0')) jid = '62' + jid.slice(1);
    if (!jid.endsWith('@s.whatsapp.net')) jid += '@s.whatsapp.net';

    console.log('--- WHATSAPP SEND ATTEMPT ---');
    console.log('SENDER (Akun QR):', sock.user.id);
    console.log('RECIPIENT (Kasir):', jid);

    await sock.sendMessage(jid, { text: message });
    console.log('--- WHATSAPP SEND SUCCESS ---');
    return { success: true };
  } catch (error: any) {
    console.error('--- WHATSAPP SEND ERROR ---', error);
    return { success: false, error: error.message };
  }
}

export async function initWhatsApp(mainWindow: BrowserWindow) {
  // 1. Register IPC handlers IMMEDIATELY to avoid race conditions with renderer
  ipcMain.handle('wa:get-status', () => ({ 
    status: connectionStatus, 
    qr: qrCode,
    pushName: sock?.user?.name || null
  }));

  ipcMain.handle('wa:reconnect', () => {
    if (connectionStatus === 'disconnected') {
      connectToWhatsApp();
    }
    return { success: true };
  });

  ipcMain.handle('wa:logout', async () => {
    console.log('--- WHATSAPP LOGOUT TRIGGERED ---');
    if (sock) {
      try {
        // Force logout from server
        await sock.logout();
        sock.end(undefined);
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    
    // Clear and Wait a bit to ensure files are not locked
    sock = null;
    qrCode = null;
    connectionStatus = 'disconnected';

    setTimeout(() => {
      if (existsSync(AUTH_PATH)) {
        try {
          rmSync(AUTH_PATH, { recursive: true, force: true });
          mkdirSync(AUTH_PATH);
          console.log('--- WHATSAPP SESSION CLEARED ---');
        } catch (e) {
          console.error('Failed to clear session folder:', e);
        }
      }
      
      // Restart to show new QR
      connectToWhatsApp();
    }, 1000);

    return { success: true };
  });

  ipcMain.handle('wa:send-message', async (_, { to, message }) => {
    return await sendInternalMessage(to, message);
  });

  // 2. Dynamic import for ESM module in CJS
  const baileys = await import('@whiskeysockets/baileys');
  const makeWASocket = baileys.default;
  const { useMultiFileAuthState, fetchLatestBaileysVersion } = baileys;
  DisconnectReason = baileys.DisconnectReason;

  async function connectToWhatsApp() {
    if (!existsSync(AUTH_PATH)) {
      mkdirSync(AUTH_PATH, { recursive: true });
    }

    // Refresh auth state before connecting
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
    const { version } = await fetchLatestBaileysVersion();

    connectionStatus = 'connecting';
    mainWindow.webContents.send('wa:status-update', { status: connectionStatus });

    sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger,
      browser: ['DM Pembukuan Pro', 'Chrome', '1.0.0'],
    });

    sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = qr;
        mainWindow.webContents.send('wa:qr-update', { qr });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log('--- WHATSAPP CONNECTION CLOSED ---', { statusCode, shouldReconnect });
        
        connectionStatus = 'disconnected';
        qrCode = null;
        mainWindow.webContents.send('wa:status-update', { status: connectionStatus });

        if (shouldReconnect) {
          connectToWhatsApp();
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        qrCode = null;
        console.log('--- WHATSAPP CONNECTED AS:', sock.user.id);
        mainWindow.webContents.send('wa:status-update', { 
          status: connectionStatus,
          pushName: sock.user.name || sock.user.id
        });
      }
    });

    sock.ev.on('creds.update', saveCreds);
  }

  // Start initial connection
  connectToWhatsApp();
}
