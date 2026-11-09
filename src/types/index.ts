export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: string;
  name: string;
  pin_code: string;
  role_id: number;
  is_active: boolean;
  created_at?: string;
  role?: Role | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_threshold: number;
}

export type CategoryType = 'food' | 'beverage' | 'alcohol' | 'other';

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
}

export interface MenuItem {
  id: string;
  category_id: number | null;
  name: string;
  price: number;
  is_available: boolean;
  inventory_item_id: string | null;
  category?: Category | null;
  inventory_item?: InventoryItem | null;
  is_veg?: boolean | null; // true = Veg, false = Non-Veg, null = Drinks/Alcohol/Other
  sub_category?: string | null;
}

export type TransactionType = 'purchase' | 'audit_correction';

export interface StockLog {
  id: string;
  inventory_item_id: string;
  change_quantity: number;
  transaction_type: TransactionType;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
  inventory_item?: InventoryItem | null;
  performer?: {
    id: string;
    name: string;
  } | null;
}

export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface RestaurantTable {
  id: string;
  table_number: string;
  section: string;
  seating_capacity: number;
  status: TableStatus;
  is_active: boolean;
  created_at?: string;
  activeInvoice?: Invoice | null;
  itemsCount?: number;
  runningTotal?: number;
}

export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface Invoice {
  id: string;
  table_id?: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  created_at: string;
  table?: RestaurantTable | null;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'card';

export interface Payment {
  id: string;
  invoice_id: string;
  payment_method: PaymentMethod;
  amount_paid: number;
  reference_number: string | null;
  processed_by: string | null;
  created_at: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}
