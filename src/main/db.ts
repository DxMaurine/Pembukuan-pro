import { app, ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

type Transaction = {
  id: number
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  category: string
  items?: Array<{ name: string, amount: number }>
}

type StockItem = {
  id: number
  name: string
  quantity: number
  price: number
  unit: string
}

type Debt = {
  id: number
  type: 'receivable' | 'payable'
  name: string
  amount: number
  description: string
  date: string
  status: 'pending' | 'paid'
}

type WalletEntry = {
  id: number
  type: 'saving' | 'qris'
  amount: number
  description: string
  date: string
  status?: 'pending' | 'received'
}

type Capital = {
  id: number
  amount: number
  month: number
  year: number
  date: string
}

export type Preorder = {
  id: number;
  customerName: string;
  serviceName: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  dueDate: string;
  notes: string;
  status: 'pending' | 'designing' | 'printing' | 'completed' | 'canceled';
  createdAt: string;
}

type Data = {
  transactions: Transaction[]
  stock: StockItem[]
  debts: Debt[]
  wallet: WalletEntry[]
  capital: Capital[]
  preorders: Preorder[]
  settings: Record<string, string>
}

const defaultData: Data = { 
  transactions: [], 
  stock: [], 
  debts: [], 
  wallet: [], 
  capital: [], 
  preorders: [],
  settings: { password: '0000', storeName: 'DM FOTOCOPY' } 
}
const dbPath = join(app.getPath('userData'), 'db.json')

function readDb(): Data {
  if (!existsSync(dbPath)) {
    saveDb(defaultData)
    return defaultData
  }
  try {
    const raw = readFileSync(dbPath, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading DB:', e)
    return defaultData
  }
}

function saveDb(data: Data) {
  try {
    writeFileSync(dbPath, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('Error saving DB:', e)
  }
}

export function addWalletEntryInternal(entry: Omit<WalletEntry, 'id'>, mainWindow?: BrowserWindow) {
  const data = readDb()
  const newEntry = { ...entry, id: Date.now() }
  data.wallet.push(newEntry)
  saveDb(data)
  
  // Notify renderer to refresh
  if (mainWindow) {
    mainWindow.webContents.send('db:wallet-status-updated', { type: 'wallet' })
  }
  return newEntry
}

export function updateWalletStatusLocal(id: number, status: 'pending' | 'received') {
  const data = readDb()
  const index = data.wallet.findIndex((w) => w.id === id)
  if (index !== -1) {
    data.wallet[index] = { ...data.wallet[index], status }
    saveDb(data)
    return true
  }
  return false
}

// Initialize Tables
export async function initDb() {
  if (!existsSync(dbPath)) {
    saveDb(defaultData)
  }
}

// IPC Handlers
export function setupDbHandlers() {
  ipcMain.handle('db:get-transactions', async (_, filters) => {
    const data = readDb()
    let list = data.transactions
    if (filters?.type) {
      list = list.filter((t) => t.type === filters.type)
    }
    if (filters?.startDate) {
      const start = filters.startDate // Expected YYYY-MM-DD
      list = list.filter((t) => t.date.split('T')[0] >= start)
    }
    if (filters?.endDate) {
      const end = filters.endDate // Expected YYYY-MM-DD
      list = list.filter((t) => t.date.split('T')[0] <= end)
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  ipcMain.handle('db:add-transaction', async (_, transactionData) => {
    const data = readDb()
    const newTransaction = {
      ...transactionData,
      id: Date.now(),
      date: transactionData.date || new Date().toISOString()
    }
    data.transactions.push(newTransaction)
    saveDb(data)
    return newTransaction
  })

  ipcMain.handle('db:add-batch-transactions', async (_, transactionsArray) => {
    const data = readDb()
    const newTransactions = transactionsArray.map((t: any, idx: number) => ({
      ...t,
      id: Date.now() + idx, // Ensure unique IDs
      date: t.date || new Date().toISOString()
    }))
    data.transactions.push(...newTransactions)
    saveDb(data)
    return { success: true, count: newTransactions.length }
  })

  ipcMain.handle('db:delete-transaction', async (_, id) => {
    const data = readDb()
    data.transactions = data.transactions.filter((t) => t.id !== id)
    saveDb(data)
    return { success: true }
  })

  ipcMain.handle('db:update-transaction', async (_, transactionData) => {
    const data = readDb()
    const { id, ...rest } = transactionData
    const index = data.transactions.findIndex((t) => t.id === id)
    if (index !== -1) {
      data.transactions[index] = { ...data.transactions[index], ...rest }
      saveDb(data)
      return { success: true }
    }
    return { success: false, error: 'Transaction not found' }
  })

  ipcMain.handle('db:get-stock', async () => {
    const data = readDb()
    return data.stock
  })

  ipcMain.handle('db:update-stock', async (_, stockData) => {
    const data = readDb()
    const { id, ...rest } = stockData
    if (id) {
      const index = data.stock.findIndex((s) => s.id === id)
      if (index !== -1) data.stock[index] = { ...data.stock[index], ...rest }
    } else {
      data.stock.push({ ...rest, id: Date.now() })
    }
    saveDb(data)
    return { success: true }
  })

  ipcMain.handle('db:delete-stock', async (_, id) => {
    const data = readDb()
    data.stock = data.stock.filter((s) => s.id !== id)
    saveDb(data)
    return { success: true }
  })

  ipcMain.handle('db:get-summary', async (_, filters) => {
    const data = readDb()
    let list = data.transactions

    if (filters?.startDate) {
      const start = filters.startDate
      list = list.filter((t) => t.date.split('T')[0] >= start)
    }
    if (filters?.endDate) {
      const end = filters.endDate
      list = list.filter((t) => t.date.split('T')[0] <= end)
    }

    const income = list
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    const expense = list
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense
    }
  })

  ipcMain.handle('db:get-settings', async () => {
    const data = readDb()
    return { password: '0000', storeName: 'DM FOTOCOPY', ...data.settings }
  })

  ipcMain.handle('db:save-settings', async (_, settings) => {
    const data = readDb()
    data.settings = { ...data.settings, ...settings }
    saveDb(data)
    return { success: true }
  })

  // Debt Handlers
  ipcMain.handle('db:get-debts', async () => {
    const data = readDb()
    return data.debts || []
  })

  ipcMain.handle('db:add-debt', async (_, debtData) => {
    const data = readDb()
    if (!data.debts) data.debts = []
    const newDebt = { ...debtData, id: Date.now() }
    data.debts.push(newDebt)
    saveDb(data)
    return newDebt
  })

  ipcMain.handle('db:update-debt', async (_, debtData) => {
    const data = readDb()
    const index = data.debts.findIndex((d) => d.id === debtData.id)
    if (index !== -1) {
      data.debts[index] = { ...data.debts[index], ...debtData }
      saveDb(data)
      return { success: true }
    }
    return { success: false }
  })

  ipcMain.handle('db:delete-debt', async (_, id) => {
    const data = readDb()
    data.debts = data.debts.filter((d) => d.id !== id)
    saveDb(data)
    return { success: true }
  })

  // Wallet Handlers
  ipcMain.handle('db:get-wallet', async () => {
    const data = readDb()
    return data.wallet || []
  })

  ipcMain.handle('db:add-wallet-entry', async (_, entryData) => {
    const data = readDb()
    if (!data.wallet) data.wallet = []
    const newEntry = { ...entryData, id: Date.now() }
    data.wallet.push(newEntry)
    saveDb(data)
    return newEntry
  })

  ipcMain.handle('db:delete-wallet-entry', async (_, id) => {
    const data = readDb()
    data.wallet = data.wallet.filter((w) => w.id !== id)
    saveDb(data)
    return { success: true }
  })

  ipcMain.handle('db:update-wallet-entry', async (_, entryData) => {
    const data = readDb()
    const { id, ...rest } = entryData
    const index = data.wallet.findIndex((w) => w.id === id)
    if (index !== -1) {
      data.wallet[index] = { ...data.wallet[index], ...rest }
      saveDb(data)
      return { success: true }
    }
    return { success: false, error: 'Entry not found' }
  })

  // Capital Handlers
  ipcMain.handle('db:get-capital', async () => {
    const data = readDb()
    return data.capital || []
  })

  ipcMain.handle('db:save-capital', async (_, capitalData) => {
    const data = readDb()
    if (!data.capital) data.capital = []
    // Check if capital for this month/year already exists
    const index = data.capital.findIndex(c => c.month === capitalData.month && c.year === capitalData.year)
    if (index !== -1) {
      data.capital[index] = { ...data.capital[index], ...capitalData }
    } else {
      data.capital.push({ ...capitalData, id: Date.now() })
    }
    saveDb(data)
    return { success: true }
  })

  // Preorder Handlers
  ipcMain.handle('db:get-preorders', async () => {
    const data = readDb()
    return data.preorders || []
  })

  ipcMain.handle('db:add-preorder', async (_, preorderData) => {
    const data = readDb()
    if (!data.preorders) data.preorders = []
    const newPreorder = { 
      ...preorderData, 
      id: Date.now(),
      createdAt: new Date().toISOString()
    }
    data.preorders.push(newPreorder)
    saveDb(data)
    return newPreorder
  })

  ipcMain.handle('db:update-preorder', async (_, preorderData) => {
    const data = readDb()
    const index = data.preorders.findIndex((p) => p.id === preorderData.id)
    if (index !== -1) {
      data.preorders[index] = { ...data.preorders[index], ...preorderData }
      saveDb(data)
      return { success: true }
    }
    return { success: false }
  })

  ipcMain.handle('db:delete-preorder', async (_, id) => {
    const data = readDb()
    data.preorders = data.preorders.filter((p) => p.id !== id)
    saveDb(data)
    return { success: true }
  })
}
