import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { fork, ChildProcess } from 'child_process'
import fs from 'fs'

let serverProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null

function startServer(): void {
  // In production, the server is in resources/server/dist/index.js
  // In dev, the server is run separately by concurrently
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

