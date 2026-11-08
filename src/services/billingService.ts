import { supabase } from './supabaseClient';
import type { Category, MenuItem, CartItem, PaymentMethod, Invoice } from '../types';

export interface CompleteSalePayload {
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  processedBy?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeUUID(val?: string | null): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export const billingService = {
  /**
   * Fetches all categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('id');

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Failed to get categories:', err);
      return [];
    }
  },

  /**
   * Fetches active menu items with category and inventory details
   */
  async getMenuItems(): Promise<MenuItem[]> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          id,
          category_id,
          name,
          price,
          is_available,
          inventory_item_id,
          category:categories (
            id,
            name,
            type
          ),
          inventory_item:inventory_items (
            id,
            name,
            unit,
            current_stock,
            min_stock_threshold
          )
        `)
        .order('name');

      if (error) {
        console.error('Error fetching menu items:', error);
        return [];
      }

      return (data || []).map((m: any) => ({
        id: m.id,
        category_id: m.category_id,
        name: m.name,
        price: parseFloat(m.price),
        is_available: m.is_available ?? true,
        inventory_item_id: m.inventory_item_id,
        category: Array.isArray(m.category) ? m.category[0] : m.category,
        inventory_item: Array.isArray(m.inventory_item) ? m.inventory_item[0] : m.inventory_item,
      }));
    } catch (err) {
      console.error('Failed to get menu items:', err);
      return [];
    }
  },

  /**
   * Completes a sale transaction:
   * 1. Inserts into invoices
   * 2. Inserts into invoice_items
   * 3. Inserts into payments (with foreign key protection on processed_by)
   */
  async completeSale(payload: CompleteSalePayload): Promise<{
    success: boolean;
    invoiceId?: string;
    invoice?: Invoice;
    error?: string;
  }> {
    try {
      if (!payload.items || payload.items.length === 0) {
        return { success: false, error: 'Cannot complete a sale with an empty cart.' };
      }

      // Step 1: Insert into invoices
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          subtotal: payload.subtotal,
          tax_amount: payload.taxAmount,
          discount_amount: payload.discountAmount,
          total_amount: payload.totalAmount,
          payment_status: 'paid',
        })
        .select()
        .single();

      if (invoiceError || !invoiceData) {
        console.error('Failed to insert invoice:', invoiceError);
        return { success: false, error: invoiceError?.message || 'Failed to generate invoice.' };
      }

      const invoiceId = invoiceData.id;

      // Step 2: Insert into invoice_items
      const invoiceItemsPayload = payload.items.map((item) => ({
        invoice_id: invoiceId,
        menu_item_id: item.menuItem.id,
        item_name: item.menuItem.name,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItemsPayload);

      if (itemsError) {
        console.error('Failed to insert invoice items:', itemsError);
        return { success: false, error: itemsError.message || 'Failed to record line items.' };
      }

      // Step 3: Insert into payments with foreign key protection
      const processedByClean = sanitizeUUID(payload.processedBy);

      let { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          payment_method: payload.paymentMethod,
          amount_paid: payload.totalAmount,
          reference_number: payload.referenceNumber?.trim() || null,
          processed_by: processedByClean,
        });

      if (paymentError && (paymentError.code === '23503' || paymentError.message?.includes('processed_by_fkey'))) {
        console.warn('processed_by user reference invalid in DB, falling back to null');
        const fallback = await supabase
          .from('payments')
          .insert({
            invoice_id: invoiceId,
            payment_method: payload.paymentMethod,
            amount_paid: payload.totalAmount,
            reference_number: payload.referenceNumber?.trim() || null,
            processed_by: null,
          });
        paymentError = fallback.error;
      }

      if (paymentError) {
        console.error('Failed to insert payment record:', paymentError);
        return { success: false, error: paymentError.message || 'Failed to record payment.' };
      }

      return {
        success: true,
        invoiceId,
        invoice: invoiceData as Invoice,
      };
    } catch (err: any) {
      console.error('Exception during completeSale:', err);
      return { success: false, error: err.message || 'Unexpected billing transaction error.' };
    }
  },

  /**
   * Retrieves recent sales/invoices for history & auditing
   */
  async getRecentInvoices(limit = 20): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          subtotal,
          tax_amount,
          discount_amount,
          total_amount,
          payment_status,
          created_at,
          items:invoice_items (
            id,
            invoice_id,
            menu_item_id,
            item_name,
            quantity,
            unit_price
          ),
          payments (
            id,
            invoice_id,
            payment_method,
            amount_paid,
            reference_number,
            processed_by,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent invoices:', error);
        return [];
      }

      return (data || []).map((inv: any) => ({
        id: inv.id,
        subtotal: parseFloat(inv.subtotal),
        tax_amount: parseFloat(inv.tax_amount),
        discount_amount: parseFloat(inv.discount_amount || 0),
        total_amount: parseFloat(inv.total_amount),
        payment_status: inv.payment_status,
        created_at: inv.created_at,
        items: inv.items || [],
        payments: inv.payments || [],
      }));
    } catch (err) {
      console.error('Failed to get recent invoices:', err);
      return [];
    }
  },
};
