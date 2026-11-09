import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  RotateCcw,
  Check,
  ReceiptText,
  IndianRupee,
  BookmarkCheck,
  Ban,
  Utensils,
  LayoutGrid
} from 'lucide-react';
import type { MenuItem, Category, RestaurantTable } from '../types';
import { billingService } from '../services/billingService';
import { useBillingCartStore } from '../store/billingCartStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/formatters';
import { ReceiptModal } from '../components/ReceiptModal';
import { RecentBillsModal } from '../components/RecentBillsModal';
import { TableFloorPlanGrid } from '../components/TableFloorPlanGrid';
import { TableFloorOverview } from '../components/TableFloorOverview';
import { MenuCatalogView } from '../components/MenuCatalogView';

export const CounterBilling: React.FC = () => {
  const { user } = useAuthStore();
  const {
    items: cartItems,
    discountAmount,
    paymentMethod,
    referenceNumber,
    cashTendered,
    lastCompletedInvoice,
    selectedTable,
    activePendingInvoiceId,
    addItem,
    removeItem,
    incrementQuantity,
    decrementQuantity,
    setDiscountAmount,
    setPaymentMethod,
    // setReferenceNumber,
    // setCashTendered,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getTotalAmount,
    getChangeDue,
    setLastCompletedInvoice,
    setSelectedTable,
    setActivePendingInvoiceId,
    loadTableOrder,
  } = useBillingCartStore();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTablesLoading, setIsTablesLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingTab, setIsSavingTab] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tableFeedback, setTableFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Active View: 'tables' (Floor Plan layout) vs. 'order' (Menu catalog & cart)
  const [activeView, setActiveView] = useState<'tables' | 'order'>('tables');

  // Modals
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Fetch Tables with their live pending invoices
  const loadTables = useCallback(async () => {
    setIsTablesLoading(true);
    try {
      const data = await billingService.getTables();
      setTables(data);
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setIsTablesLoading(false);
    }
  }, []);

  // Fetch Menu Items, Categories & Tables on mount
  useEffect(() => {
    let isMounted = true;
    const loadCatalogAndTables = async () => {
      setIsLoading(true);
      try {
        const [itemsData, categoriesData, tablesData] = await Promise.all([
          billingService.getMenuItems(),
          billingService.getCategories(),
          billingService.getTables(),
        ]);
        if (isMounted) {
          setMenuItems(itemsData);
          setCategories(categoriesData);
          setTables(tablesData);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadCatalogAndTables();
    return () => {
      isMounted = false;
    };
  }, []);

  // When cashier selects a table (from top bar or floor plan)
  const handleSelectTable = (table: RestaurantTable | null) => {
    setSubmitError(null);
    setTableFeedback(null);

    if (!table) {
      // Direct Walk-In Counter Sale
      loadTableOrder(null, menuItems);
      setActiveView('order');
      setTableFeedback({
        type: 'info',
        message: 'Walk-in Counter mode active (Immediate takeaway sale)',
      });
      return;
    }

    // Load table items or start fresh order
    loadTableOrder(table, menuItems);
    setActiveView('order');

    if (table.activeInvoice) {
      setTableFeedback({
        type: 'success',
        message: `Loaded active order for ${table.table_number}: ${table.itemsCount || 0} items (${formatCurrency(table.runningTotal || 0)})`,
      });
    } else {
      setTableFeedback({
        type: 'info',
        message: `New order started for ${table.table_number} (${table.section})`,
      });
    }
  };

  const subtotal = getSubtotal();
  const tax = getTaxAmount();
  const total = getTotalAmount();
  const changeDue = getChangeDue();

  // Save / Update Table Open Tab (Incremental ordering)
  const handleSaveTableTab = async () => {
    if (!selectedTable) return;
    if (cartItems.length === 0) {
      setSubmitError('Add items to cart before saving to table.');
      return;
    }

    setIsSavingTab(true);
    setSubmitError(null);

    try {
      const result = await billingService.saveTableTab({
        tableId: selectedTable.id,
        items: cartItems,
        subtotal,
        taxAmount: tax,
        discountAmount,
        totalAmount: total,
        existingInvoiceId: activePendingInvoiceId,
      });

      if (result.success) {
        if (result.invoiceId) {
          setActivePendingInvoiceId(result.invoiceId);
        }
        // Refresh tables to reflect new occupied status & running totals
        await loadTables();
        setTableFeedback({
          type: 'success',
          message: `Tab saved to ${selectedTable.table_number}! (${cartItems.reduce((a, b) => a + b.quantity, 0)} items • ${formatCurrency(total)})`,
        });
      } else {
        setSubmitError(result.error || 'Failed to save table order.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Error occurred while saving table tab.');
    } finally {
      setIsSavingTab(false);
    }
  };

  // Void / Cancel an open table tab
  const handleVoidTableTab = async () => {
    if (!selectedTable || !activePendingInvoiceId) return;

    const confirmed = window.confirm(
      `Are you sure you want to void and clear the open tab for Table ${selectedTable.table_number}? This will cancel all pending items.`
    );
    if (!confirmed) return;

    setIsSavingTab(true);
    try {
      const ok = await billingService.voidTableTab(selectedTable.id, activePendingInvoiceId);
      if (ok) {
        clearCart();
        setSelectedTable(null);
        await loadTables();
        setActiveView('tables');
        setTableFeedback({
          type: 'info',
          message: `Table ${selectedTable.table_number} has been cleared and is now available.`,
        });
      } else {
        setSubmitError('Failed to void table tab.');
      }
    } finally {
      setIsSavingTab(false);
    }
  };

  // Complete Sale & Settle Bill / Print Receipt
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        items: cartItems,
        subtotal,
        taxAmount: tax,
        discountAmount,
        totalAmount: total,
        paymentMethod,
        referenceNumber: referenceNumber || undefined,
        processedBy: user?.id,
        tableId: selectedTable?.id || null,
        pendingInvoiceId: activePendingInvoiceId,
      };

      const result = await billingService.completeSale(payload);

      if (result.success && result.invoice) {
        setLastCompletedInvoice(result.invoice);
        setIsReceiptOpen(true);
        // Refresh tables since table has now been freed back to available
        await loadTables();
      } else {
        setSubmitError(result.error || 'Failed to complete transaction.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Billing error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close receipt and reset cart for next sale
  const handleCloseReceipt = () => {
    setIsReceiptOpen(false);
    clearCart();
    setSelectedTable(null);
    setLastCompletedInvoice(null);
    setTableFeedback(null);
    setActiveView('tables');
  };

  // const setCashPreset = (amount: number) => {
  //   setCashTendered(amount);
  // };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f5f4ef] select-none">
      {/* MAIN TWO-PANE COUNTER WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT PANE: Floor Plan Layout (when activeView === 'tables') OR Menu Catalog (when activeView === 'order') */}
        {activeView === 'tables' ? (
          <TableFloorPlanGrid
            tables={tables}
            selectedTableId={selectedTable?.id || null}
            onSelectTable={handleSelectTable}
            onRefreshTables={loadTables}
            isLoading={isTablesLoading}
          />
        ) : (
          <MenuCatalogView
            menuItems={menuItems}
            categories={categories}
            selectedTable={selectedTable}
            activePendingInvoiceId={activePendingInvoiceId}
            onBackToTables={() => setActiveView('tables')}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onAddItem={addItem}
            cartItems={cartItems}
            isLoading={isLoading}
          />
        )}

        {/* RIGHT PANE: Floor Overview (when activeView === 'tables') OR Active Table Cart (when activeView === 'order') */}
        {activeView === 'tables' ? (
          <TableFloorOverview
            tables={tables}
            onSelectTable={handleSelectTable}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onRefreshTables={loadTables}
            isLoading={isTablesLoading}
          />
        ) : (
          <div className="w-full lg:w-[420px] xl:w-[460px] bg-stone-50 flex flex-col justify-between border-l border-stone-200 h-full border-2 overflow-hidden shadow-xs">
            {/* Cart Header with Table Status Badge */}
            <div className="p-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-100/70 shrink-0 font-mono">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <ReceiptText className="w-4 h-4 text-stone-600 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider truncate">
                      {selectedTable ? `Table ${selectedTable.table_number}` : 'Walk-in Counter'}
                    </h2>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase shrink-0 ${selectedTable
                          ? activePendingInvoiceId
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-stone-200 text-stone-800'
                        }`}
                    >
                      {selectedTable
                        ? activePendingInvoiceId
                          ? 'Open Tab'
                          : 'New Order'
                        : 'Takeaway'}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-500 truncate">
                    {selectedTable ? selectedTable.section : 'Direct sale without table'} &bull;{' '}
                    <span className="font-semibold text-stone-700">
                      {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Return to Floor Plan & Reset */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveView('tables')}
                  className="text-[11px] text-stone-700 hover:text-stone-900 font-mono flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-stone-200/70 border border-stone-200 transition-colors font-bold shadow-2xs"
                  title="Return to Tables Floor Plan"
                >
                  <LayoutGrid className="w-3 h-3 text-stone-500" />
                  <span>Floor</span>
                </button>

                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] text-stone-500 hover:text-rose-700 font-mono flex items-center gap-1 transition-colors font-semibold px-2 py-1 rounded hover:bg-stone-200/50"
                    title="Clear items in active cart"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Feedback Alert for Table Action */}
            {tableFeedback && (
              <div
                className={`px-3 py-1.5 text-xs font-mono flex items-center justify-between border-b shrink-0 ${tableFeedback.type === 'success'
                    ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200'
                    : 'bg-stone-100 text-stone-800 border-stone-200'
                  }`}
              >
                <span className="truncate pr-2 font-medium">{tableFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setTableFeedback(null)}
                  className="text-stone-400 hover:text-stone-700 text-xs shrink-0"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Cart Items List - Controlled Scrollable Container */}
            <div className="flex-1 min-h-[150px] max-h-[220px] md:max-h-[250px] lg:max-h-[260px] xl:max-h-[320px] p-3 overflow-y-auto divide-y divide-stone-200/50">
              {cartItems.length === 0 ? (
                <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-6 text-stone-400">
                  {selectedTable ? (
                    <Utensils className="w-8 h-8 text-stone-300 mb-2" />
                  ) : (
                    <IndianRupee className="w-8 h-8 text-stone-300 mb-2" />
                  )}
                  <p className="text-xs font-bold text-stone-700">
                    {selectedTable ? `Table ${selectedTable.table_number} cart is empty` : 'Counter cart is currently empty'}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1 font-medium">
                    Select dishes or drinks on the left to add items to this order
                  </p>
                </div>
              ) : (
                cartItems.map((ci) => {
                  const itemTotal = ci.menuItem.price * ci.quantity;
                  return (
                    <div key={ci.menuItem.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-xs font-bold text-stone-800 truncate">
                          {ci.menuItem.name}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {formatCurrency(ci.menuItem.price)} each
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-stone-300 rounded-lg bg-white shrink-0 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => decrementQuantity(ci.menuItem.id)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-l-lg transition-colors"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-mono font-bold text-stone-800">
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => incrementQuantity(ci.menuItem.id)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-r-lg transition-colors"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Total & Remove */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-stone-900 min-w-[60px] text-right">
                          {formatCurrency(itemTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(ci.menuItem.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
                          title="Cancel item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Financial Calculations & Payment Desk - Pinned and Intact */}
            <div className="bg-stone-100/80 p-4 border-t border-stone-200 space-y-3 font-mono shrink-0">
              {/* Subtotal, Discount & Tax */}
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-stone-800 font-bold">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span>Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={discountAmount || ''}
                    placeholder="0.00"
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-white border border-stone-300 rounded px-2 py-0.5 text-right text-xs font-bold text-emerald-800 focus:outline-none focus:border-stone-500"
                  />
                </div>

                <div className="flex justify-between">
                  <span>Tax (5% GST):</span>
                  <span className="text-stone-800 font-bold">{formatCurrency(tax)}</span>
                </div>

                <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                  <span className="font-sans">TOTAL DUE:</span>
                  <span className="text-stone-900 font-bold text-lg">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="pt-2 border-t border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block mb-1.5">
                  Select Settlement Method
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${paymentMethod === 'cash'
                        ? 'bg-stone-800 text-stone-50 border-stone-800 shadow-xs'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300/80'
                      }`}
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                    <span>CASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${paymentMethod === 'upi'
                        ? 'bg-stone-800 text-stone-50 border-stone-800 shadow-xs'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300/80'
                      }`}
                  >
                    <QrCode className="w-3.5 h-3.5 text-sky-700" />
                    <span>UPI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${paymentMethod === 'card'
                        ? 'bg-stone-800 text-stone-50 border-stone-800 shadow-xs'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300/80'
                      }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-indigo-700" />
                    <span>CARD</span>
                  </button>
                </div>
              </div>

              {/* {paymentMethod === 'cash' ? (
              <div className="p-2.5 rounded-xl bg-white border border-stone-200 space-y-2 text-xs shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-600 font-semibold">Cash Received:</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={cashTendered || ''}
                    placeholder={total.toFixed(2)}
                    onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-stone-50 border border-stone-300 rounded px-2 py-1 text-right text-xs font-bold text-stone-900 focus:outline-none focus:border-stone-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setCashPreset(total)}
                    className="px-2 py-0.5 rounded bg-stone-100 text-[10px] text-stone-700 hover:bg-stone-200 border border-stone-200 font-semibold"
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashPreset(Math.ceil(total / 10) * 10)}
                    className="px-2 py-0.5 rounded bg-stone-100 text-[10px] text-stone-700 hover:bg-stone-200 border border-stone-200 font-semibold"
                  >
                    ₹{Math.ceil(total / 10) * 10}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashPreset(50)}
                    className="px-2 py-0.5 rounded bg-stone-100 text-[10px] text-stone-700 hover:bg-stone-200 border border-stone-200 font-semibold"
                  >
                    ₹50
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashPreset(100)}
                    className="px-2 py-0.5 rounded bg-stone-100 text-[10px] text-stone-700 hover:bg-stone-200 border border-stone-200 font-semibold"
                  >
                    ₹100
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashPreset(500)}
                    className="px-2 py-0.5 rounded bg-stone-100 text-[10px] text-stone-700 hover:bg-stone-200 border border-stone-200 font-semibold"
                  >
                    ₹500
                  </button>
                </div>

                {cashTendered > 0 && (
                  <div className="flex justify-between items-center pt-1.5 border-t border-stone-100 font-bold">
                    <span className="text-stone-600">Change Return:</span>
                    <span className="text-emerald-800 text-sm">{formatCurrency(changeDue)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
                  {paymentMethod === 'upi' ? 'UPI Transaction / UTR Ref' : 'Card Auth / Slip Ref (Optional)'}
                </span>
                <input
                  type="text"
                  placeholder={paymentMethod === 'upi' ? 'e.g. UPI-9832049281' : 'e.g. AUTH-4491'}
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500 font-mono font-medium"
                />
              </div>
            )} */}

              {submitError && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-sans font-medium">
                  {submitError}
                </div>
              )}

              {/* ACTION BUTTONS: DUAL MODE (SAVE TO TABLE TAB vs. COMPLETE BILL) */}
              <div className="space-y-2">
                {/* If a physical table is selected, show "Save to Table Tab" button */}
                <div className="flex gap-2">
                  {selectedTable && (
                    <button
                      type="button"
                      onClick={handleSaveTableTab}
                      disabled={cartItems.length === 0 || isSavingTab || isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-amber-50 font-semibold text-xs tracking-wide uppercase disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all flex flex-1 items-center justify-center gap-2 font-mono"
                      title="Saves ordered items to this table without settling the bill"
                    >
                      {isSavingTab ? (
                        <span className="animate-pulse">Saving to {selectedTable.table_number}...</span>
                      ) : (
                        <>
                          <BookmarkCheck className="w-4 h-4 text-amber-200" />
                          <span>
                            {activePendingInvoiceId
                              ? `Update Tab (${selectedTable.table_number})`
                              : `Save Order (${selectedTable.table_number})`}
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Primary Action Button (Grounded Heritage Forest Green) */}
                  <button
                    type="button"
                    onClick={handleCompleteSale}
                    disabled={cartItems.length === 0 || isSubmitting || isSavingTab}
                    className="w-full py-3.5 rounded-xl bg-[#1b4332] hover:bg-[#143628] active:bg-[#0f281e] text-stone-100 font-semibold text-sm tracking-wide uppercase disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex flex-1 items-center justify-center gap-2 font-mono"
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">Generating Final Bill...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-emerald-200" />
                        <span>
                          {selectedTable
                            ? `SETTLE BILL`
                            : `COMPLETE SALE`}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Subtle Void Option if Table has an open tab */}
                {selectedTable && activePendingInvoiceId && (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={handleVoidTableTab}
                      className="text-[11px] text-stone-400 hover:text-rose-700 transition-colors flex items-center gap-1"
                    >
                      <Ban className="w-3 h-3" />
                      <span>Void Entire Table Order</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={handleCloseReceipt}
        invoice={lastCompletedInvoice}
        items={cartItems}
        paymentMethod={paymentMethod}
        referenceNumber={referenceNumber}
        cashTendered={cashTendered}
        changeDue={changeDue}
        cashierName={user?.name}
        tableName={selectedTable ? `${selectedTable.table_number} (${selectedTable.section})` : undefined}
      />

      {/* Shift Bills History Modal */}
      <RecentBillsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};
