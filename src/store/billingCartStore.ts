import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, MenuItem, PaymentMethod, Invoice, RestaurantTable } from '../types';

interface BillingCartState {
  items: CartItem[];
  taxRate: number; // e.g. 0.05 for 5%
  discountAmount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  cashTendered: number;
  lastCompletedInvoice: Invoice | null;

  // Active Table State
  selectedTable: RestaurantTable | null;
  activePendingInvoiceId: string | null;

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
  setSelectedTable: (table: RestaurantTable | null) => void;
  setActivePendingInvoiceId: (id: string | null) => void;
  setCartItems: (items: CartItem[]) => void;
  loadTableOrder: (table: RestaurantTable | null, catalog: MenuItem[]) => void;
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
      selectedTable: null,
      activePendingInvoiceId: null,

      setSelectedTable: (table: RestaurantTable | null) => {
        set({ selectedTable: table });
      },

      setActivePendingInvoiceId: (id: string | null) => {
        set({ activePendingInvoiceId: id });
      },

      setCartItems: (items: CartItem[]) => {
        set({ items });
      },

      loadTableOrder: (table: RestaurantTable | null, catalog: MenuItem[]) => {
        if (!table) {
          // Direct counter walk-in
          set({
            selectedTable: null,
            activePendingInvoiceId: null,
            items: [],
            discountAmount: 0,
            referenceNumber: '',
            cashTendered: 0,
          });
          return;
        }

        if (table.activeInvoice) {
          // Table is occupied: load existing items from the pending invoice
          const loadedCartItems: CartItem[] = (table.activeInvoice.items || []).map((it) => {
            const foundMenuItem = catalog.find((m) => m.id === it.menu_item_id);
            const menuItem: MenuItem = foundMenuItem || {
              id: it.menu_item_id || it.id,
              category_id: null,
              name: it.item_name,
              price: it.unit_price,
              is_available: true,
              inventory_item_id: null,
            };
            return {
              menuItem,
              quantity: it.quantity,
            };
          });

          set({
            selectedTable: table,
            activePendingInvoiceId: table.activeInvoice.id,
            items: loadedCartItems,
            discountAmount: table.activeInvoice.discount_amount || 0,
            cashTendered: 0,
            referenceNumber: '',
          });
        } else {
          // Table is empty / available: start a fresh order
          set({
            selectedTable: table,
            activePendingInvoiceId: null,
            items: [],
            discountAmount: 0,
            cashTendered: 0,
            referenceNumber: '',
          });
        }
      },

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
        const taxable = Math.max(0, subtotal - get().discountAmount);
        return Math.round(taxable * get().taxRate * 100) / 100;
      },

      getTotalAmount: () => {
        const subtotal = get().getSubtotal();
        const tax = get().getTaxAmount();
        const discounted = subtotal - get().discountAmount;
        return Math.max(0, Math.round((discounted + tax) * 100) / 100);
      },

      getChangeDue: () => {
        const total = get().getTotalAmount();
        const tendered = get().cashTendered;
        if (tendered <= 0 || tendered < total) return 0;
        return Math.round((tendered - total) * 100) / 100;
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'samsara-pos-cart',
      partialize: (state) => ({
        items: state.items,
        discountAmount: state.discountAmount,
        paymentMethod: state.paymentMethod,
        taxRate: state.taxRate,
        selectedTable: state.selectedTable,
        activePendingInvoiceId: state.activePendingInvoiceId,
      }),
    }
  )
);
