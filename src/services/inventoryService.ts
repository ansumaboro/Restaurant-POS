import { supabase } from './supabaseClient';
import type { InventoryItem, StockLog, TransactionType } from '../types';

export interface StockInPayload {
  inventoryItemId: string;
  quantity: number;
  notes?: string;
  performedBy?: string;
}

export interface AuditAdjustmentPayload {
  inventoryItemId: string;
  varianceQuantity: number;
  notes?: string;
  performedBy?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeUUID(val?: string | null): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export const inventoryService = {
  /**
   * Fetches all inventory items with current stock and threshold
   */
  async getInventoryItems(): Promise<InventoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching inventory items:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        current_stock: parseFloat(item.current_stock),
        min_stock_threshold: parseFloat(item.min_stock_threshold),
      }));
    } catch (err) {
      console.error('Failed to get inventory items:', err);
      return [];
    }
  },

  /**
   * Fetches a single inventory item by ID to get real-time stock
   */
  async getInventoryItemById(id: string): Promise<InventoryItem | null> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        unit: data.unit,
        current_stock: parseFloat(data.current_stock),
        min_stock_threshold: parseFloat(data.min_stock_threshold),
      };
    } catch {
      return null;
    }
  },

  /**
   * Records a Stock-In arrival (transaction_type = 'purchase')
   * Automatically increments current_stock via the trg_update_stock DB trigger.
   * Defends against stale/invalid user foreign key constraints.
   */
  async recordStockIn(payload: StockInPayload): Promise<{
    success: boolean;
    log?: StockLog;
    updatedItem?: InventoryItem;
    error?: string;
  }> {
    try {
      if (!payload.inventoryItemId) {
        return { success: false, error: 'Please select an inventory item.' };
      }
      if (isNaN(payload.quantity) || payload.quantity <= 0) {
        return { success: false, error: 'Stock-In quantity must be a positive number greater than 0.' };
      }

      const performedByClean = sanitizeUUID(payload.performedBy);

      // Attempt insert with sanitized performed_by
      let { data, error } = await supabase
        .from('stock_logs')
        .insert({
          inventory_item_id: payload.inventoryItemId,
          change_quantity: payload.quantity,
          transaction_type: 'purchase',
          notes: payload.notes?.trim() || null,
          performed_by: performedByClean,
        })
        .select()
        .single();

      // Gracefully recover if user ID does not exist in users table (code 23503 / fkey violation)
      if (error && (error.code === '23503' || error.message?.includes('performed_by_fkey'))) {
        console.warn('performed_by user reference invalid in DB, falling back to null');
        const fallback = await supabase
          .from('stock_logs')
          .insert({
            inventory_item_id: payload.inventoryItemId,
            change_quantity: payload.quantity,
            transaction_type: 'purchase',
            notes: payload.notes?.trim() || null,
            performed_by: null,
          })
          .select()
          .single();

        data = fallback.data;
        error = fallback.error;
      }

      if (error || !data) {
        console.error('Error recording stock-in log:', error);
        return { success: false, error: error?.message || 'Failed to record stock-in.' };
      }

      // Fetch the updated item with new current_stock computed by the trigger
      const updatedItem = await this.getInventoryItemById(payload.inventoryItemId);

      return {
        success: true,
        log: data as StockLog,
        updatedItem: updatedItem || undefined,
      };
    } catch (err: any) {
      console.error('Exception during stock-in:', err);
      return { success: false, error: err.message || 'Stock-in transaction failed.' };
    }
  },

  /**
   * Records a physical Stock Audit adjustment (transaction_type = 'audit_correction')
   * Variance = Physical Count - System Stock
   * Automatically updates current_stock via the trg_update_stock DB trigger.
   * Defends against stale/invalid user foreign key constraints.
   */
  async recordAuditAdjustment(payload: AuditAdjustmentPayload): Promise<{
    success: boolean;
    log?: StockLog;
    updatedItem?: InventoryItem;
    error?: string;
  }> {
    try {
      if (!payload.inventoryItemId) {
        return { success: false, error: 'Please select an inventory item for audit.' };
      }

      const performedByClean = sanitizeUUID(payload.performedBy);

      // Attempt insert with sanitized performed_by
      let { data, error } = await supabase
        .from('stock_logs')
        .insert({
          inventory_item_id: payload.inventoryItemId,
          change_quantity: payload.varianceQuantity,
          transaction_type: 'audit_correction',
          notes: payload.notes?.trim() || null,
          performed_by: performedByClean,
        })
        .select()
        .single();

      // Gracefully recover if user ID does not exist in users table (code 23503 / fkey violation)
      if (error && (error.code === '23503' || error.message?.includes('performed_by_fkey'))) {
        console.warn('performed_by user reference invalid in DB, falling back to null');
        const fallback = await supabase
          .from('stock_logs')
          .insert({
            inventory_item_id: payload.inventoryItemId,
            change_quantity: payload.varianceQuantity,
            transaction_type: 'audit_correction',
            notes: payload.notes?.trim() || null,
            performed_by: null,
          })
          .select()
          .single();

        data = fallback.data;
        error = fallback.error;
      }

      if (error || !data) {
        console.error('Error recording audit adjustment:', error);
        return { success: false, error: error?.message || 'Failed to record audit adjustment.' };
      }

      // Fetch the updated item with current_stock reflecting the reconciled physical count
      const updatedItem = await this.getInventoryItemById(payload.inventoryItemId);

      return {
        success: true,
        log: data as StockLog,
        updatedItem: updatedItem || undefined,
      };
    } catch (err: any) {
      console.error('Exception during audit adjustment:', err);
      return { success: false, error: err.message || 'Audit adjustment failed.' };
    }
  },

  /**
   * Fetches recent stock logs for either purchases, audit corrections, or all
   */
  async getStockLogs(limit = 30, filterType?: TransactionType): Promise<StockLog[]> {
    try {
      let query = supabase
        .from('stock_logs')
        .select(`
          id,
          inventory_item_id,
          change_quantity,
          transaction_type,
          notes,
          performed_by,
          created_at,
          inventory_item:inventory_items (
            id,
            name,
            unit
          ),
          performer:users (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filterType) {
        query = query.eq('transaction_type', filterType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching stock logs:', error);
        return [];
      }

      return (data || []).map((log: any) => ({
        id: log.id,
        inventory_item_id: log.inventory_item_id,
        change_quantity: parseFloat(log.change_quantity),
        transaction_type: log.transaction_type,
        notes: log.notes,
        performed_by: log.performed_by,
        created_at: log.created_at,
        inventory_item: Array.isArray(log.inventory_item) ? log.inventory_item[0] : log.inventory_item,
        performer: Array.isArray(log.performer) ? log.performer[0] : log.performer,
      }));
    } catch (err) {
      console.error('Failed to get stock logs:', err);
      return [];
    }
  },
};
