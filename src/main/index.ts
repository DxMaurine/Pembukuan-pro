import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { fork, ChildProcess, execSync } from 'child_process'
import fs from 'fs'

let serverProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null

function killPort(port: number): void {
  try {
    const cmd = process.platform === 'win32' 
      ? `npx kill-port ${port}` 
      : `lsof -ti:${port} | xargs kill -9`
    execSync(cmd)
    console.log(`[MAIN] Port ${port} cleaned up.`)
  } catch (e) {
    // Silently ignore if port is not in use
  }
}

function startServer(): void {
  // In production, the server is a bundled file in resources/server/dist/index.js
  if (!is.dev) {
    const serverDir = join(process.resourcesPath, 'server')
    const serverPath = join(serverDir, 'dist', 'index.js')
    const userDataPath = app.getPath('userData')
    const dbPath = join(userDataPath, 'db.json')
    const waAuthPath = join(userDataPath, 'wa-auth')
    const logsDir = join(userDataPath, 'logs')
    const logPath = join(logsDir, 'server.log')

    // Ensure AppData and Logs directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    // Create log stream
    const logStream = fs.createWriteStream(logPath, { flags: 'a' })
    logStream.write(`\n--- [${new Date().toISOString()}] Starting server ---\n`)
    logStream.write(`[MAIN] Server path: ${serverPath}\n`)
    logStream.write(`[MAIN] Server CWD: ${serverDir}\n`)

    console.log('[MAIN] Starting server at:', serverPath)
    console.log('[MAIN] Database path:', dbPath)

    try {
      serverProcess = fork(serverPath, [], {
        cwd: serverDir, // Set CWD to server directory
        stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
        env: { 
          ...process.env, 
          DB_PATH: dbPath,
          WA_AUTH_PATH: waAuthPath,
          PORT: '3000'
        }
      })

      if (serverProcess.stdout) {
        serverProcess.stdout.pipe(logStream, { end: false })
        serverProcess.stdout.on('data', (data) => {
          const str = data.toString()
          console.log(`[SERVER] ${str}`)
          if (mainWindow) mainWindow.webContents.send('server:log', str)
        })
      }
      if (serverProcess.stderr) {
        serverProcess.stderr.pipe(logStream, { end: false })
        serverProcess.stderr.on('data', (data) => {
          const str = data.toString()
          console.error(`[SERVER-ERROR] ${str}`)
          if (mainWindow) mainWindow.webContents.send('server:log', `[ERROR] ${str}`)
        })
      }

      serverProcess.on('error', (err) => {
        if (!logStream.destroyed) {
          logStream.write(`[MAIN-ERROR] Server error: ${err}\n`)
        }
        console.error('[MAIN] Server error:', err)
      })

      serverProcess.on('exit', (code) => {
        if (!logStream.destroyed) {
          logStream.write(`[MAIN] Server exited with code ${code}\n`)
          logStream.end() // Sekarang kita tutup manual setelah pesan terakhir
        }
        console.log(`[MAIN] Server exited with code ${code}`)
      })
    } catch (error) {
      if (!logStream.destroyed) {
        logStream.write(`[MAIN-FATAL] Failed to start server: ${error}\n`)
      }
      console.error('[MAIN] Failed to start server:', error)
    }
  }
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
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
    if (mainWindow) {
      mainWindow.maximize()
      mainWindow.show()
    }
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
  // Clean up port 3000 before starting to avoid zombie processes
  if (!is.dev) killPort(3000)

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

  ipcMain.on('server:manual-start', () => {
    console.log('[MAIN] Manual server start requested')
    if (serverProcess) {
      serverProcess.kill()
    }
    startServer()
  })

  createWindow()

  // Check for updates on startup
  if (!is.dev) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  // --- Manual Update IPC Listeners ---
  ipcMain.on('app:check-for-updates', () => {
    if (is.dev) {
      if (mainWindow) mainWindow.webContents.send('app:update-message', 'Update tidak tersedia di mode development.')
      return
    }
    autoUpdater.checkForUpdates()
  })

  ipcMain.on('app:quit-and-install', () => {
    autoUpdater.quitAndInstall()
  })

  // autoUpdater listeners
  autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('app:update-message', 'Mengecek pembaruan...')
  })
  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('app:update-available', info)
  })
  autoUpdater.on('update-not-available', () => {
    if (mainWindow) mainWindow.webContents.send('app:update-message', 'Versi aplikasi sudah yang terbaru.')
  })
  autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('app:update-message', `Error: ${err.message}`)
  })
  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) mainWindow.webContents.send('app:download-progress', progressObj.percent)
  })
  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('app:update-downloaded', info)
  })

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

