import { create } from 'zustand';
import type { InventoryItem, StockLog, TransactionType } from '../types';
import { inventoryService } from '../services/inventoryService';

interface InventoryState {
  items: InventoryItem[];
  selectedItem: InventoryItem | null;
  recentLogs: StockLog[];
  isLoading: boolean;
  error: string | null;

  fetchItems: () => Promise<void>;
  fetchLogs: (filter?: TransactionType) => Promise<void>;
  selectItem: (item: InventoryItem | null) => void;
  selectItemById: (id: string) => void;
  updateItemStock: (id: string, updatedStock: number) => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  selectedItem: null,
  recentLogs: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await inventoryService.getInventoryItems();
      set({ items, isLoading: false });

      // If an item was selected, sync its stock from the freshly fetched items
      const currentSelected = get().selectedItem;
      if (currentSelected) {
        const found = items.find((i) => i.id === currentSelected.id);
        if (found) {
          set({ selectedItem: found });
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to load inventory', isLoading: false });
    }
  },

  fetchLogs: async (filter?: TransactionType) => {
    try {
      const logs = await inventoryService.getStockLogs(35, filter);
      set({ recentLogs: logs });
    } catch (err: any) {
      console.error('Failed to fetch stock logs:', err);
    }
  },

  selectItem: (item: InventoryItem | null) => {
    set({ selectedItem: item });
  },

  selectItemById: (id: string) => {
    const item = get().items.find((i) => i.id === id) || null;
    set({ selectedItem: item });
  },

  updateItemStock: (id: string, updatedStock: number) => {
    set({
      items: get().items.map((i) =>
        i.id === id ? { ...i, current_stock: updatedStock } : i
      ),
      selectedItem:
        get().selectedItem?.id === id
          ? { ...get().selectedItem!, current_stock: updatedStock }
          : get().selectedItem,
    });
  },
}));
