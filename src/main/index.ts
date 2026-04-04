import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { fork, ChildProcess } from 'child_process'
import fs from 'fs'

let serverProcess: ChildProcess | null = null

function startServer(): void {
  // In production, the server is in resources/server/dist/index.js
  // In dev, the server is run separately by concurrently
  if (!is.dev) {
    const serverPath = join(process.resourcesPath, 'server', 'dist', 'index.js')
    const userDataPath = app.getPath('userData')
    const dbPath = join(userDataPath, 'db.json')

    // Ensure AppData directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    console.log('[MAIN] Starting server at:', serverPath)
    console.log('[MAIN] Database path:', dbPath)

    try {
      serverProcess = fork(serverPath, [], {
        env: { 
          ...process.env, 
          DB_PATH: dbPath,
          PORT: '3000'
        }
      })

      serverProcess.on('error', (err) => {
        console.error('[MAIN] Server error:', err)
      })

      serverProcess.on('exit', (code) => {
        console.log(`[MAIN] Server exited with code ${code}`)
      })
    } catch (error) {
      console.error('[MAIN] Failed to start server:', error)
    }
  }
}

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
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Spawn the backend server first
  startServer()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

