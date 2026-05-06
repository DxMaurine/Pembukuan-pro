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

export type Donation = {
  id: number;
  donator: string;
  amount: number;
  description: string;
  date: string;
  category?: string;
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

export type Mutation = {
  id: number;
  type: 'wallet_to_cash' | 'cash_to_wallet' | 'cash_to_owner' | 'wallet_to_owner' | 'non_sales_to_owner' | 'donation_to_owner';
  amount: number;
  description: string;
  date: string;
}

export type Customer = {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  type: 'umum' | 'pelanggan';
}

export type PriceItem = {
  id: number;
  itemName: string;
  scope: 'global' | 'pelanggan' | 'umum';
  customerId?: number;
  customerName?: string;
  oldPrice: number;
  newPrice: number;
  diffPercent: number;
  updatedAt: string;
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
  mutations: Mutation[];
  donations: Donation[];
  customers: Customer[];
  prices: PriceItem[];
}


const defaultData: Data = { 
  transactions: [], 
  stock: [], 
  debts: [], 
  wallet: [], 
  capital: [], 
  preorders: [],
  financeSources: [],
  settings: { password: '0000', storeName: 'DM FOTOCOPY', autoConfirm: false },
  mutations: [],
  donations: [],
  customers: [],
  prices: []
};


export const dbPath = process.env.DB_PATH || path.join(__dirname, 'db.json');

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

export function clearTransactions(range: 'day' | 'month' | 'year' | 'all' | 'custom', modules: string[] = ['transactions'], startDate?: string, endDate?: string) {
    const data = readDb();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7); // YYYY-MM
    const thisYear = today.substring(0, 4);   // YYYY

    const isResetTarget = (itemDate: string) => {
        if (!itemDate) return false;
        const d = itemDate.split('T')[0];
        if (range === 'day') return d === today;
        if (range === 'month') return d.substring(0, 7) === thisMonth;
        if (range === 'year') return d.substring(0, 4) === thisYear;
        if (range === 'custom' && startDate && endDate) return d >= startDate && d <= endDate;
        return false;
    };

    if (range === 'all') {
        data.transactions = [];
        data.debts = [];
        data.wallet = [];
        data.preorders = [];
        data.stock = [];
        data.mutations = [];
    } else {
        if (modules.includes('transactions')) data.transactions = data.transactions.filter(t => !isResetTarget(t.date));
        if (modules.includes('wallet')) data.wallet = data.wallet.filter(w => !isResetTarget(w.date));
        if (modules.includes('debts')) data.debts = data.debts.filter(d => !isResetTarget(d.date));
        if (modules.includes('preorders')) data.preorders = data.preorders.filter(p => !isResetTarget(p.createdAt));
        if (modules.includes('stock')) data.stock = data.stock.filter(s => !isResetTarget(s.dateAdded || ''));
    }
    
    saveDb(data);
    return true;
}
