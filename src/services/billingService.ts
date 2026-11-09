import { supabase } from './supabaseClient';
import type { Category, MenuItem, CartItem, PaymentMethod, Invoice, RestaurantTable } from '../types';

export interface CompleteSalePayload {
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  processedBy?: string;
  tableId?: string | null;
  pendingInvoiceId?: string | null;
}

export interface SaveTableTabPayload {
  tableId: string;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  existingInvoiceId?: string | null;
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
      // First attempt to select with is_veg & sub_category
      let { data, error } = await supabase
        .from('menu_items')
        .select(`
          id,
          category_id,
          name,
          price,
          is_available,
          inventory_item_id,
          is_veg,
          sub_category,
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

      // Graceful fallback if is_veg column hasn't been migrated in Supabase yet
      if (error && error.message?.includes('is_veg')) {
        const fallback = await supabase
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

        data = fallback.data as any;
        error = fallback.error;
      }

      if (error) {
        console.error('Error fetching menu items:', error);
        return [];
      }

      return (data || []).map((m: any) => {
        const cat = Array.isArray(m.category) ? m.category[0] : m.category;
        const catType = cat?.type;

        let isVeg: boolean | null = null;
        if (m.is_veg !== undefined && m.is_veg !== null) {
          isVeg = Boolean(m.is_veg);
        } else if (catType === 'alcohol' || catType === 'beverage') {
          isVeg = null;
        } else {
          // Sensible fallback based on standard Indian restaurant dish names
          const lowerName = m.name.toLowerCase();
          const lowerCat = (cat?.name || '').toLowerCase();
          if (
            lowerName.includes('chicken') ||
            lowerName.includes('mutton') ||
            lowerName.includes('fish') ||
            lowerName.includes('prawn') ||
            lowerName.includes('egg') ||
            lowerName.includes('kalmi') ||
            lowerName.includes('keema') ||
            lowerCat.includes('non-veg')
          ) {
            isVeg = false;
          } else {
            isVeg = true;
          }
        }

        return {
          id: m.id,
          category_id: m.category_id,
          name: m.name,
          price: parseFloat(m.price),
          is_available: m.is_available ?? true,
          inventory_item_id: m.inventory_item_id,
          is_veg: isVeg,
          sub_category: m.sub_category || null,
          category: cat,
          inventory_item: Array.isArray(m.inventory_item) ? m.inventory_item[0] : m.inventory_item,
        };
      });
    } catch (err) {
      console.error('Failed to get menu items:', err);
      return [];
    }
  },

  /**
   * Fetches all tables with their active open tabs (pending invoices)
   */
  async getTables(): Promise<RestaurantTable[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select(`
          id,
          table_number,
          section,
          seating_capacity,
          status,
          is_active,
          created_at,
          invoices (
            id,
            table_id,
            subtotal,
            tax_amount,
            discount_amount,
            total_amount,
            payment_status,
            created_at,
            items:invoice_items (
              id,
              menu_item_id,
              item_name,
              quantity,
              unit_price
            )
          )
        `)
        .eq('is_active', true)
        .order('section')
        .order('table_number');

      if (error) {
        console.error('Failed to fetch restaurant tables:', error);
        return [];
      }

      return (data || []).map((t: any) => {
        const pendingInvoice = (t.invoices || []).find(
          (inv: any) => inv.payment_status === 'pending'
        );
        const items = pendingInvoice?.items || [];
        const itemsCount = items.reduce(
          (sum: number, it: any) => sum + (it.quantity || 0),
          0
        );
        const runningTotal = pendingInvoice
          ? parseFloat(pendingInvoice.total_amount)
          : 0;

        return {
          id: t.id,
          table_number: t.table_number,
          section: t.section,
          seating_capacity: t.seating_capacity,
          status: pendingInvoice ? 'occupied' : t.status,
          is_active: t.is_active,
          created_at: t.created_at,
          activeInvoice: pendingInvoice
            ? {
                id: pendingInvoice.id,
                table_id: pendingInvoice.table_id,
                subtotal: parseFloat(pendingInvoice.subtotal),
                tax_amount: parseFloat(pendingInvoice.tax_amount),
                discount_amount: parseFloat(pendingInvoice.discount_amount || 0),
                total_amount: runningTotal,
                payment_status: 'pending',
                created_at: pendingInvoice.created_at,
                items: items.map((it: any) => ({
                  id: it.id,
                  invoice_id: pendingInvoice.id,
                  menu_item_id: it.menu_item_id,
                  item_name: it.item_name,
                  quantity: it.quantity,
                  unit_price: parseFloat(it.unit_price),
                })),
              }
            : null,
          itemsCount,
          runningTotal,
        };
      });
    } catch (err) {
      console.error('Error in getTables:', err);
      return [];
    }
  },

  /**
   * Saves or updates an active open tab on a table
   */
  async saveTableTab(payload: SaveTableTabPayload): Promise<{
    success: boolean;
    invoiceId?: string;
    error?: string;
  }> {
    try {
      if (!payload.items || payload.items.length === 0) {
        // If empty and there was an existing pending invoice, void/cancel it
        if (payload.existingInvoiceId) {
          await supabase.from('invoices').delete().eq('id', payload.existingInvoiceId);
          await supabase.from('restaurant_tables').update({ status: 'available' }).eq('id', payload.tableId);
        }
        return { success: true };
      }

      let invoiceId = payload.existingInvoiceId;

      if (invoiceId) {
        // Update existing pending invoice totals
        const { error: invErr } = await supabase
          .from('invoices')
          .update({
            subtotal: payload.subtotal,
            tax_amount: payload.taxAmount,
            discount_amount: payload.discountAmount,
            total_amount: payload.totalAmount,
            payment_status: 'pending',
          })
          .eq('id', invoiceId);

        if (invErr) throw invErr;

        // Delete old items and insert fresh snapshot
        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
      } else {
        // Create new pending invoice for this table
        const { data: newInv, error: invErr } = await supabase
          .from('invoices')
          .insert({
            table_id: payload.tableId,
            subtotal: payload.subtotal,
            tax_amount: payload.taxAmount,
            discount_amount: payload.discountAmount,
            total_amount: payload.totalAmount,
            payment_status: 'pending',
          })
          .select()
          .single();

        if (invErr || !newInv) throw invErr || new Error('Failed to create table tab');
        invoiceId = newInv.id;
      }

      // Insert line items
      const itemsPayload = payload.items.map((item) => ({
        invoice_id: invoiceId,
        menu_item_id: item.menuItem.id,
        item_name: item.menuItem.name,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
      }));

      const { error: itemsErr } = await supabase
        .from('invoice_items')
        .insert(itemsPayload);

      if (itemsErr) throw itemsErr;

      // Mark table as occupied
      await supabase
        .from('restaurant_tables')
        .update({ status: 'occupied' })
        .eq('id', payload.tableId);

      return { success: true, invoiceId: invoiceId || undefined };
    } catch (err: any) {
      console.error('Failed to save table tab:', err);
      return { success: false, error: err.message || 'Failed to save table order' };
    }
  },

  /**
   * Voids/clears an open tab on a table (e.g. guests walk out or cancel)
   */
  async voidTableTab(tableId: string, invoiceId: string): Promise<boolean> {
    try {
      await supabase.from('invoices').delete().eq('id', invoiceId);
      await supabase.from('restaurant_tables').update({ status: 'available' }).eq('id', tableId);
      return true;
    } catch (err) {
      console.error('Failed to void table tab:', err);
      return false;
    }
  },

  /**
   * Completes a sale transaction (Direct Counter or Table Settlement):
   * 1. Updates or inserts invoice with payment_status = 'paid'
   * 2. Inserts line items
   * 3. Inserts payment record
   * 4. Releases table to 'available'
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

      let invoiceData: any = null;
      let invoiceId: string;

      if (payload.pendingInvoiceId) {
        // Settle existing table pending tab
        const { data, error: updateErr } = await supabase
          .from('invoices')
          .update({
            subtotal: payload.subtotal,
            tax_amount: payload.taxAmount,
            discount_amount: payload.discountAmount,
            total_amount: payload.totalAmount,
            payment_status: 'paid',
            table_id: payload.tableId || null,
          })
          .eq('id', payload.pendingInvoiceId)
          .select(`
            *,
            table:restaurant_tables (
              id,
              table_number,
              section
            )
          `)
          .single();

        if (updateErr || !data) {
          console.error('Failed to settle invoice tab:', updateErr);
          return { success: false, error: updateErr?.message || 'Failed to settle invoice tab.' };
        }

        invoiceData = data;
        invoiceId = data.id;

        // Refresh line items for final settlement snapshot
        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
      } else {
        // Direct checkout or new immediate sale
        const { data, error: insertErr } = await supabase
          .from('invoices')
          .insert({
            table_id: payload.tableId || null,
            subtotal: payload.subtotal,
            tax_amount: payload.taxAmount,
            discount_amount: payload.discountAmount,
            total_amount: payload.totalAmount,
            payment_status: 'paid',
          })
          .select(`
            *,
            table:restaurant_tables (
              id,
              table_number,
              section
            )
          `)
          .single();

        if (insertErr || !data) {
          console.error('Failed to insert invoice:', insertErr);
          return { success: false, error: insertErr?.message || 'Failed to generate invoice.' };
        }

        invoiceData = data;
        invoiceId = data.id;
      }

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

      // Step 4: Release table back to available
      if (payload.tableId) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'available' })
          .eq('id', payload.tableId);
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
          table_id,
          subtotal,
          tax_amount,
          discount_amount,
          total_amount,
          payment_status,
          created_at,
          table:restaurant_tables (
            id,
            table_number,
            section
          ),
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
        table_id: inv.table_id,
        table: Array.isArray(inv.table) ? inv.table[0] : inv.table,
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
