import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Database operations
  getTransactions: (filters: any) => ipcRenderer.invoke('db:get-transactions', filters),
  addTransaction: (data: any) => ipcRenderer.invoke('db:add-transaction', data),
  addBatchTransactions: (transactions: any[]) => ipcRenderer.invoke('db:add-batch-transactions', transactions),
  updateTransaction: (data: any) => ipcRenderer.invoke('db:update-transaction', data),
  deleteTransaction: (id: number) => ipcRenderer.invoke('db:delete-transaction', id),
  
  getStock: () => ipcRenderer.invoke('db:get-stock'),
  updateStock: (data: any) => ipcRenderer.invoke('db:update-stock', data),
  deleteStock: (id: number) => ipcRenderer.invoke('db:delete-stock', id),
  
  getSummary: (filters?: any) => ipcRenderer.invoke('db:get-summary', filters),
  
  // Settings operations
  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('db:save-settings', settings),
  
  // Debt Management
  getDebts: () => ipcRenderer.invoke('db:get-debts'),
  addDebt: (data: any) => ipcRenderer.invoke('db:add-debt', data),
  updateDebt: (data: any) => ipcRenderer.invoke('db:update-debt', data),
  deleteDebt: (id: number) => ipcRenderer.invoke('db:delete-debt', id),

  // Wallet & QRIS
  getWallet: () => ipcRenderer.invoke('db:get-wallet'),
  addWalletEntry: (data: any) => ipcRenderer.invoke('db:add-wallet-entry', data),
  updateWalletEntry: (data: any) => ipcRenderer.invoke('db:update-wallet-entry', data),
  deleteWalletEntry: (id: number) => ipcRenderer.invoke('db:delete-wallet-entry', id),

  // Capital
  getCapital: () => ipcRenderer.invoke('db:get-capital'),
  saveCapital: (data: any) => ipcRenderer.invoke('db:save-capital', data),

  // Telegram & PDF
  sendReport: (data: any) => ipcRenderer.invoke('service:send-report', data),
  notifyQRIS: (data: any) => ipcRenderer.invoke('service:notify-qris', data),
  notifyPreorder: (data: any) => ipcRenderer.invoke('service:notify-preorder', data),

  // Preorder Management
  getPreorders: () => ipcRenderer.invoke('db:get-preorders'),
  addPreorder: (data: any) => ipcRenderer.invoke('db:add-preorder', data),
  updatePreorder: (data: any) => ipcRenderer.invoke('db:update-preorder', data),
  deletePreorder: (id: number) => ipcRenderer.invoke('db:delete-preorder', id),

  // Listeners
  onWalletStatusUpdated: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('db:wallet-status-updated', listener)
    return () => ipcRenderer.removeListener('db:wallet-status-updated', listener)
  },

  // WhatsApp Operations
  waGetStatus: () => ipcRenderer.invoke('wa:get-status'),
  waReconnect: () => ipcRenderer.invoke('wa:reconnect'),
  waLogout: () => ipcRenderer.invoke('wa:logout'),
  waSendMessage: (data: { to: string, message: string }) => ipcRenderer.invoke('wa:send-message', data),

  // WhatsApp Listeners
  onWaQrUpdate: (callback: (data: { qr: string }) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('wa:qr-update', listener)
    return () => ipcRenderer.removeListener('wa:qr-update', listener)
  },
  onWaStatusUpdate: (callback: (data: { status: string, pushName?: string }) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('wa:status-update', listener)
    return () => ipcRenderer.removeListener('wa:status-update', listener)
  }
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
