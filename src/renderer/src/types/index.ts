export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string;
  date: string;
  items?: ExpenseItem[];
}

export interface ExpenseItem {
  name: string;
  amount: string;
}

export interface Debt {
  id: number;
  type: 'receivable' | 'payable'; // receivable: pelangan hutang ke toko, payable: toko hutang ke suplier
  name: string;
  amount: number;
  description: string;
  date: string;
  status: 'pending' | 'paid';
}

export interface WalletEntry {
  id: number;
  type: 'saving' | 'qris';
  amount: number;
  description: string;
  date: string;
}

export interface Capital {
  id: number;
  amount: number;
  month: number;
  year: number;
  date: string;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transBalance?: number;
  walletBalance?: number;
}

export interface StockItem {
  id: number;
  name: string;
  dateAdded: string;
}

export interface Settings {
  storeName?: string;
  password?: string;
  cashierNumber?: string;
  ownerNumber?: string;
  autoConfirm?: boolean;
}

export interface Mutation {
  id: number;
  type: 'wallet_to_cash' | 'cash_to_wallet' | 'cash_to_owner' | 'wallet_to_owner';
  amount: number;
  description: string;
  date: string;
}
