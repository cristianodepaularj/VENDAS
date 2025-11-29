export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  category: string;
  unit: string;
  stock: number;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  due_date: string;
  pay_date: string | null;
  status: 'pending' | 'paid';
  payment_method: string | null; // 'pix', 'money', 'credit', 'debit'
  installment_number: number;
  total_installments: number;
  sale?: Sale;
}

export interface Sale {
  id: string;
  client_id: string;
  user_id: string;
  total_amount: number;
  sale_type: 'vista' | 'parcelado' | 'prazo';
  created_at: string;
  client?: Client;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface CartItem extends Product {
  quantity: number;
}
