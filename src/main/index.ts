import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDb, setupDbHandlers, updateWalletStatusLocal } from './db'
import { setupTelegramHandlers } from './services/telegram'
import { listenToFirebaseUpdates, listenDanaIncoming } from './services/firebase'
import { initWhatsApp } from './services/whatsapp'
import { startLocalServer, processDanaText } from './services/localServer'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Initialize Database & Services
  initDb()
  setupDbHandlers()
  
  // Setup Telegram dengan callback untuk update lokal & UI
  setupTelegramHandlers((id, status) => {
    const success = updateWalletStatusLocal(id, status as any)
    const win = BrowserWindow.getAllWindows()[0]
    if (success && win) {
      win.webContents.send('db:wallet-status-updated', { id, status })
    }
  })

  // Listen to Firebase Updates (Internal Bridge)
  listenToFirebaseUpdates((id, status) => {
    const numericId = parseInt(id)
    if (!isNaN(numericId)) {
      const success = updateWalletStatusLocal(numericId, status as any)
      const win = BrowserWindow.getAllWindows()[0]
      if (success && win) {
        win.webContents.send('db:wallet-status-updated', { id: numericId, status })
      }
    }
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    initWhatsApp(win)
    startLocalServer(win) // Mulai HTTP server lokal untuk menerima dari HP via WiFi

    // Dengarkan notif DANA dari Firestore (bisa dari mana saja, termasuk internet)
    listenDanaIncoming(async (text) => {
      console.log('[FIREBASE] Dana masuk:', text);
      await processDanaText(text, win);
    });
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
