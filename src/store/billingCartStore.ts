import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, MenuItem, PaymentMethod, Invoice } from '../types';

interface BillingCartState {
  items: CartItem[];
  taxRate: number; // e.g. 0.05 for 5%
  discountAmount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  cashTendered: number;
  lastCompletedInvoice: Invoice | null;

  // Actions
  addItem: (menuItem: MenuItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  incrementQuantity: (menuItemId: string) => void;
  decrementQuantity: (menuItemId: string) => void;
  setTaxRate: (rate: number) => void;
  setDiscountAmount: (amount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setReferenceNumber: (ref: string) => void;
  setCashTendered: (amount: number) => void;
  setLastCompletedInvoice: (invoice: Invoice | null) => void;
  clearCart: () => void;

  // Calculations
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getTotalAmount: () => number;
  getChangeDue: () => number;
  getItemCount: () => number;
}

export const useBillingCartStore = create<BillingCartState>()(
  persist(
    (set, get) => ({
      items: [],
      taxRate: 0.05, // 5% default standard tax
      discountAmount: 0,
      paymentMethod: 'cash',
      referenceNumber: '',
      cashTendered: 0,
      lastCompletedInvoice: null,

      addItem: (menuItem: MenuItem) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex(
          (ci) => ci.menuItem.id === menuItem.id
        );

        if (existingIndex > -1) {
          const updated = [...currentItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + 1,
          };
          set({ items: updated });
        } else {
          set({
            items: [...currentItems, { menuItem, quantity: 1 }],
          });
        }
      },

      removeItem: (menuItemId: string) => {
        set({
          items: get().items.filter((ci) => ci.menuItem.id !== menuItemId),
        });
      },

      updateQuantity: (menuItemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          items: get().items.map((ci) =>
            ci.menuItem.id === menuItemId ? { ...ci, quantity } : ci
          ),
        });
      },

      incrementQuantity: (menuItemId: string) => {
        set({
          items: get().items.map((ci) =>
            ci.menuItem.id === menuItemId
              ? { ...ci, quantity: ci.quantity + 1 }
              : ci
          ),
        });
      },

      decrementQuantity: (menuItemId: string) => {
        const item = get().items.find((ci) => ci.menuItem.id === menuItemId);
        if (!item) return;
        if (item.quantity <= 1) {
          get().removeItem(menuItemId);
        } else {
          set({
            items: get().items.map((ci) =>
              ci.menuItem.id === menuItemId
                ? { ...ci, quantity: ci.quantity - 1 }
                : ci
            ),
          });
        }
      },

      setTaxRate: (rate: number) => {
        set({ taxRate: Math.max(0, rate) });
      },

      setDiscountAmount: (amount: number) => {
        set({ discountAmount: Math.max(0, amount) });
      },

      setPaymentMethod: (method: PaymentMethod) => {
        set({ paymentMethod: method });
      },

      setReferenceNumber: (ref: string) => {
        set({ referenceNumber: ref });
      },

      setCashTendered: (amount: number) => {
        set({ cashTendered: Math.max(0, amount) });
      },

      setLastCompletedInvoice: (invoice: Invoice | null) => {
        set({ lastCompletedInvoice: invoice });
      },

      clearCart: () => {
        set({
          items: [],
          discountAmount: 0,
          paymentMethod: 'cash',
          referenceNumber: '',
          cashTendered: 0,
        });
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          return sum + item.menuItem.price * item.quantity;
        }, 0);
      },

      getTaxAmount: () => {
        const subtotal = get().getSubtotal();
        const discount = get().discountAmount;
        const taxable = Math.max(0, subtotal - discount);
        return Math.round(taxable * get().taxRate * 100) / 100;
      },

      getTotalAmount: () => {
        const subtotal = get().getSubtotal();
        const discount = get().discountAmount;
        const tax = get().getTaxAmount();
        const total = Math.max(0, subtotal - discount) + tax;
        return Math.round(total * 100) / 100;
      },

      getChangeDue: () => {
        const total = get().getTotalAmount();
        const tendered = get().cashTendered;
        if (get().paymentMethod !== 'cash' || tendered <= 0) return 0;
        return Math.max(0, Math.round((tendered - total) * 100) / 100);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'pos_billing_cart',
      partialize: (state) => ({
        items: state.items,
        taxRate: state.taxRate,
        discountAmount: state.discountAmount,
        paymentMethod: state.paymentMethod,
        referenceNumber: state.referenceNumber,
        cashTendered: state.cashTendered,
      }),
    }
  )
);
