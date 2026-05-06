import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import axios from 'axios'
import { io } from 'socket.io-client'

// Default Backend URL - Silahkan ganti IP Windows Bapak di sini
// Jika di dalam satu WiFi, ganti localhost dengan IP (misal: 192.168.1.5)
const BACKEND_URL = 'http://localhost:3000' 

const socket = io(BACKEND_URL)

// Helper to make code cleaner
const rest = {
  get: async (url: string, params?: any) => (await axios.get(`${BACKEND_URL}${url}`, { params })).data,
  post: async (url: string, data?: any) => (await axios.post(`${BACKEND_URL}${url}`, data)).data,
  put: async (url: string, data?: any) => (await axios.put(`${BACKEND_URL}${url}`, data)).data,
  patch: async (url: string, data?: any) => (await axios.patch(`${BACKEND_URL}${url}`, data)).data,
  delete: async (url: string) => (await axios.delete(`${BACKEND_URL}${url}`)).data,
}

// Custom APIs for renderer
const api = {
  // Database operations via REST
  getTransactions: (filters: any) => rest.get('/api/transactions', filters),
  addTransaction: (data: any) => rest.post('/api/transactions', data),
  addBatchTransactions: (transactions: any[]) => rest.post('/api/transactions/batch', transactions),
  updateTransaction: (data: any) => rest.put(`/api/transactions/${data.id}`, data),
  deleteTransaction: (id: number) => rest.delete(`/api/transactions/${id}`),
  
  getStock: () => rest.get('/api/stock'),
  updateStock: (data: any) => rest.post('/api/stock', data),
  deleteStock: (id: number) => rest.delete(`/api/stock/${id}`),
  patchStock: (id: number, data: any) => rest.patch(`/api/stock/${id}`, data),
  
  getSummary: (filters?: any) => rest.get('/api/summary', filters),
  
  // Settings operations
  getSettings: () => rest.get('/api/settings'),
  saveSettings: (settings: any) => rest.post('/api/settings', settings),
  
  // Debt Management
  getDebts: () => rest.get('/api/debts'),
  addDebt: (data: any) => rest.post('/api/debts', data),
  updateDebt: (data: any) => rest.put(`/api/debts/${data.id}`, data),
  deleteDebt: (id: number) => rest.delete(`/api/debts/${id}`),

  // Wallet & QRIS
  getWallet: () => rest.get('/api/wallet'),
  addWalletEntry: (data: any) => rest.post('/api/wallet', data),
  updateWalletEntry: (data: any) => rest.put(`/api/wallet/${data.id}`, data),
  deleteWalletEntry: (id: number) => rest.delete(`/api/wallet/${id}`),

  // Capital
  getCapital: () => rest.get('/api/capital'),
  saveCapital: (data: any) => rest.post('/api/capital', data),

  // Preorder Management
  getPreorders: () => rest.get('/api/preorders'),
  addPreorder: (data: any) => rest.post('/api/preorders', data),           // Simpan + Kirim Telegram
  addPreorderSilent: (data: any) => rest.post('/api/preorders/silent', data), // Simpan saja, tanpa Telegram
  updatePreorder: (data: any) => rest.put(`/api/preorders/${data.id}`, data),
  deletePreorder: (id: number) => rest.delete(`/api/preorders/${id}`),

  // Mutations
  getMutations: () => rest.get('/api/mutations'),
  addMutation: (data: any) => rest.post('/api/mutations', data),
  deleteMutation: (id: number) => rest.delete(`/api/mutations/${id}`),

  // Donations
  getDonations: () => rest.get('/api/donations'),
  addDonation: (data: any) => rest.post('/api/donations', data),
  updateDonation: (data: any) => rest.put(`/api/donations/${data.id}`, data),
  deleteDonation: (id: number) => rest.delete(`/api/donations/${id}`),
  
  // Customers
  getCustomers: () => rest.get('/api/customers'),
  addCustomer: (data: any) => rest.post('/api/customers', data),
  updateCustomer: (data: any) => rest.put(`/api/customers/${data.id}`, data),
  deleteCustomer: (id: number) => rest.delete(`/api/customers/${id}`),

  // Prices
  getPrices: () => rest.get('/api/prices'),
  addPrice: (data: any) => rest.post('/api/prices', data),
  updatePrice: (data: any) => rest.put(`/api/prices/${data.id}`, data),
  deletePrice: (id: number) => rest.delete(`/api/prices/${id}`),


  // Services
  sendReport: (data: any) => rest.post('/api/service/send-report', data),
  notifyQRIS: (data: any) => rest.post('/api/service/notify-qris', data),
  notifyPreorder: (data: any) => rest.post('/api/service/notify-preorder', data),
  notifyPrice: (data: any) => rest.post('/api/service/notify-price', data),

  // WhatsApp Operations
  waGetStatus: () => rest.get('/api/wa/status'),
  waReconnect: () => rest.post('/api/wa/reconnect'),
  waLogout: () => rest.post('/api/wa/logout'),
  waSendMessage: (data: { to: string, message: string }) => rest.post('/api/wa/send', data),

  // Data Management
  resetData: (params: any) => rest.post('/api/reset-data', params),

  // --- Real-time Listeners via Socket.io ---
  onWalletStatusUpdated: (callback: (data: any) => void) => {
    socket.on('db:wallet-status-updated', callback)
    return () => socket.off('db:wallet-status-updated', callback)
  },
  onMobileInput: (callback: (data: any) => void) => {
    socket.on('server:mobile-input', callback)
    return () => socket.off('server:mobile-input', callback)
  },
  onWaQrUpdate: (callback: (data: { qr: string }) => void) => {
    socket.on('wa:qr-update', callback)
    return () => socket.off('wa:qr-update', callback)
  },
  onWaStatusUpdate: (callback: (data: { status: string, pushName?: string }) => void) => {
    socket.on('wa:status-update', callback)
    return () => socket.off('wa:status-update', callback)
  },
  onStockUpdated: (callback: (data: any) => void) => {
    socket.on('db:stock-updated', callback)
    return () => socket.off('db:stock-updated', callback)
  },
  onStockDeleted: (callback: (data: any) => void) => {
    socket.on('db:stock-deleted', callback)
    return () => socket.off('db:stock-deleted', callback)
  },
  
  // --- Server Control IPC ---
  serverManualStart: () => ipcRenderer.send('server:manual-start'),
  onServerLog: (callback: (data: string) => void) => {
    const listener = (_event: any, data: string) => callback(data)
    ipcRenderer.on('server:log', listener)
    return () => ipcRenderer.removeListener('server:log', listener)
  },

  // --- Update Operations ---
  checkForUpdates: () => ipcRenderer.send('app:check-for-updates'),
  quitAndInstall: () => ipcRenderer.send('app:quit-and-install'),
  onUpdateMessage: (callback: (message: string) => void) => {
    const listener = (_event: any, message: string) => callback(message)
    ipcRenderer.on('app:update-message', listener)
    return () => ipcRenderer.removeListener('app:update-message', listener)
  },
  onUpdateAvailable: (callback: (info: any) => void) => {
    const listener = (_event: any, info: any) => callback(info)
    ipcRenderer.on('app:update-available', listener)
    return () => ipcRenderer.removeListener('app:update-available', listener)
  },
  onDownloadProgress: (callback: (percent: number) => void) => {
    const listener = (_event: any, percent: number) => callback(percent)
    ipcRenderer.on('app:download-progress', listener)
    return () => ipcRenderer.removeListener('app:download-progress', listener)
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const listener = (_event: any, info: any) => callback(info)
    ipcRenderer.on('app:update-downloaded', listener)
    return () => ipcRenderer.removeListener('app:update-downloaded', listener)
  },
  
  // --- Database Management ---
  importDatabase: () => ipcRenderer.invoke('database:import'),
  getDbPath: () => ipcRenderer.invoke('database:get-path'),
  relaunchApp: () => ipcRenderer.send('app:relaunch')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI
  // @ts-ignore (define in d.ts)
  window.api = api
}
