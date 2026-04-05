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
  quantity: number;
  price: number;
  unit: string;
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
  settings: Record<string, any>;
}

const defaultData: Data = { 
  transactions: [], 
  stock: [], 
  debts: [], 
  wallet: [], 
  capital: [], 
  preorders: [],
  settings: { password: '0000', storeName: 'DM FOTOCOPY', autoConfirm: false } 
};

const dbPath = process.env.DB_PATH || path.join(__dirname, 'db.json');

export function readDb(): Data {
  if (!fs.existsSync(dbPath)) {
    saveDb(defaultData);
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(raw);
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
