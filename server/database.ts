import fs from 'fs';
import path from 'path';

export type Transaction = {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category: string;
  items?: Array<{ name: string, amount: number }>;
}

export type StockItem = {
  id: number;
  name: string;
  quantity?: number;
  price?: number;
  unit?: string;
  isUrgent?: boolean;
  status?: 'pending' | 'bought';
  dateAdded?: string;
  boughtAt?: string;
  source?: 'desktop' | 'mobile';
}

export type Debt = {
  id: number;
  type: 'receivable' | 'payable';
  name: string;
  amount: number;
  description: string;
  date: string;
  status: 'pending' | 'paid';
}

export type WalletEntry = {
  id: number;
  type: 'saving' | 'qris';
  amount: number;
  description: string;
  date: string;
  status?: 'pending' | 'received';
}

export type FinanceSource = {
  id: string;
  name: string;
  type: 'Bank' | 'E-Wallet';
  balance: number;
  icon: string;
  color?: string;
  accountNumber?: string;
}

export type Capital = {
  id: number;
  amount: number;
  month: number;
  year: number;
  date: string;
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

export type Data = {
  transactions: Transaction[];
  stock: StockItem[];
  debts: Debt[];
  wallet: WalletEntry[];
  capital: Capital[];
  preorders: Preorder[];
  financeSources: FinanceSource[];
  settings: Record<string, any>;
}

const defaultData: Data = { 
  transactions: [], 
  stock: [], 
  debts: [], 
  wallet: [], 
  capital: [], 
  preorders: [],
  financeSources: [],
  settings: { password: '0000', storeName: 'DM FOTOCOPY', autoConfirm: false } 
};

const dbPath = path.resolve('f:/PEMBUKUAN APP/server/db.json');

export function readDb(): Data {
  if (!fs.existsSync(dbPath)) {
    saveDb(defaultData);
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    const data = JSON.parse(raw);
    // Masukkan default data jika ada key yang hilang (penting untuk migrasi versi)
    return { ...defaultData, ...data };
  } catch (e) {
    console.error('Error reading DB:', e);
    return defaultData;
  }
}

export function saveDb(data: Data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving DB:', e);
  }
}

export function addWalletEntryInternal(entry: Omit<WalletEntry, 'id'>) {
  const data = readDb();
  const newEntry = { ...entry, id: Date.now() };
  data.wallet.push(newEntry);
  saveDb(data);
  return newEntry;
}

export function updateWalletStatusLocal(id: number, status: 'pending' | 'received') {
    const data = readDb();
    const index = data.wallet.findIndex((w) => w.id === id);
    if (index !== -1) {
        data.wallet[index] = { ...data.wallet[index], status };
        saveDb(data);
        return true;
    }
    return false;
}

export async function initDb() {
    if (!fs.existsSync(dbPath)) {
        saveDb(defaultData);
    }
}

export function clearTransactions(range: 'day' | 'month' | 'year' | 'all') {
    const data = readDb();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7); // YYYY-MM
    const thisYear = today.substring(0, 4);   // YYYY

    if (range === 'all') {
        data.transactions = [];
        data.debts = [];
        data.wallet = [];
        data.preorders = [];
        data.stock = [];
    } else {
        data.transactions = data.transactions.filter(t => {
            const tDate = t.date.split('T')[0];
            if (range === 'day') return tDate !== today;
            if (range === 'month') return tDate.substring(0, 7) !== thisMonth;
            if (range === 'year') return tDate.substring(0, 4) !== thisYear;
            return true;
        });
    }
    
    saveDb(data);
    return true;
}
