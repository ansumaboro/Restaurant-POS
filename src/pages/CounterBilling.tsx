import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  QrCode, 
  History, 
  RotateCcw, 
  Check, 
  AlertTriangle,
  ReceiptText,
  IndianRupee
} from 'lucide-react';
import type { MenuItem, Category } from '../types';
import { billingService } from '../services/billingService';
import { useBillingCartStore } from '../store/billingCartStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/formatters';
import { ReceiptModal } from '../components/ReceiptModal';
import { RecentBillsModal } from '../components/RecentBillsModal';

export const CounterBilling: React.FC = () => {
  const { user } = useAuthStore();
  const {
    items: cartItems,
    discountAmount,
    paymentMethod,
    referenceNumber,
    cashTendered,
    lastCompletedInvoice,
    addItem,
    removeItem,
    incrementQuantity,
    decrementQuantity,
    setDiscountAmount,
    setPaymentMethod,
    setReferenceNumber,
    setCashTendered,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getTotalAmount,
    getChangeDue,
    setLastCompletedInvoice,
  } = useBillingCartStore();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Modals
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Fetch Menu Items & Categories on mount
  useEffect(() => {
    let isMounted = true;
    const loadCatalog = async () => {
      setIsLoading(true);
      try {
        const [itemsData, categoriesData] = await Promise.all([
          billingService.getMenuItems(),
          billingService.getCategories(),
        ]);
        if (isMounted) {
          setMenuItems(itemsData);
          setCategories(categoriesData);
        }
      } catch (err) {
        console.error('Failed to load menu catalog:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Menu Items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategoryId === 'ALL' || item.category_id === selectedCategoryId;
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  const subtotal = getSubtotal();
  const tax = getTaxAmount();
  const total = getTotalAmount();
  const changeDue = getChangeDue();

  // Complete Sale & Generate Bill / Print Receipt
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
      };

      const result = await billingService.completeSale(payload);

      if (result.success && result.invoice) {
        setLastCompletedInvoice(result.invoice);
        setIsReceiptOpen(true);
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
    setLastCompletedInvoice(null);
  };

  const setCashPreset = (amount: number) => {
    setCashTendered(amount);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f5f4ef] select-none">
      {/* LEFT PANE: Menu Items Catalog (Artisanal warm parchment feel) */}
      <div className="flex-1 flex flex-col border-r border-stone-200 h-full overflow-hidden bg-[#f7f5f0]">
        {/* Catalog Control Bar: Search & Category Pills */}
        <div className="p-3 bg-[#fffefb] border-b border-stone-200/90 space-y-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search menu catalog by name... (e.g. Martini, Burger)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50/80 border border-stone-300 rounded-lg pl-9 pr-4 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-400/40 transition-colors font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Shift Sales History Button */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 text-xs font-semibold transition-colors"
              title="View recent invoices"
            >
              <History className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Recent Bills</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                selectedCategoryId === 'ALL'
                  ? 'bg-stone-800 text-stone-100 shadow-xs'
                  : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700 font-medium'
              }`}
            >
              All Items ({menuItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-stone-800 text-stone-100 shadow-xs'
                    : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700 font-medium'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Items Grid */}
        <div className="flex-1 min-h-0 max-h-[470px] p-4 border-b overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-stone-400 font-mono">
              Loading menu catalog...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <p className="text-stone-700 text-sm font-bold">No menu items found</p>
              <p className="text-stone-500 text-xs mt-1">Try another search term or select another category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const inCart = cartItems.find((ci) => ci.menuItem.id === item.id);
                const hasLinkedInventory = !!item.inventory_item;
                const isLowStock =
                  hasLinkedInventory &&
                  (item.inventory_item?.current_stock ?? 0) <=
                    (item.inventory_item?.min_stock_threshold ?? 0);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addItem(item)}
                    className="p-3.5 rounded-xl bg-white hover:bg-stone-50/70 active:bg-stone-100 border border-stone-200/90 hover:border-stone-300 text-left flex flex-col justify-between transition-all group relative overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                  >
                    {/* Item Name & Category */}
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-stone-800 group-hover:text-stone-900 line-clamp-2">
                          {item.name}
                        </span>
                        {inCart && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-800 text-stone-100">
                            {inCart.quantity}x
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1 font-medium">
                        {item.category?.name || 'Item'}
                      </span>
                    </div>

                    {/* Price & Stock Indicator */}
                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-stone-900">
                        {formatCurrency(item.price)}
                      </span>

                      {hasLinkedInventory && (
                        <span
                          className={`text-[10px] font-mono flex items-center gap-1 font-medium ${
                            isLowStock ? 'text-rose-700 font-bold' : 'text-stone-500'
                          }`}
                          title={`Current stock: ${item.inventory_item?.current_stock} ${item.inventory_item?.unit}`}
                        >
                          {isLowStock && <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />}
                          {item.inventory_item?.current_stock} {item.inventory_item?.unit}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Active Cart & Manual Checkout Desk (Soft Ivory Panel) */}
      <div className="w-full lg:w-[420px] xl:w-[460px] bg-stone-50 flex flex-col justify-between border-l border-stone-200 h-full max-h-full overflow-hidden shadow-xs">
        {/* Cart Header */}
        <div className="p-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-100/70 shrink-0">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-stone-600" />
            <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-mono">
              Active Counter Cart
            </h2>
            <span className="text-[11px] font-mono text-stone-500 font-semibold">
              ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} items)
            </span>
          </div>

          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] text-stone-500 hover:text-rose-700 font-mono flex items-center gap-1 transition-colors font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Cart Items List - Controlled Scrollable Container */}
        <div className="flex-1 min-h-0 max-h-[220px] md:max-h-[250px] lg:max-h-[260px] xl:max-h-[320px] p-3 overflow-y-auto divide-y divide-stone-200/50">
          {cartItems.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-6 text-stone-400">
              <IndianRupee className="w-8 h-8 text-stone-300 mb-2" />
              <p className="text-xs font-bold text-stone-700">Cart is currently empty</p>
              <p className="text-[11px] text-stone-500 mt-1 font-medium">Select items on the left to start a sale</p>
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
                      title="Remove line"
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
              Select Payment Method
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                  paymentMethod === 'cash'
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
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                  paymentMethod === 'upi'
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
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                  paymentMethod === 'card'
                    ? 'bg-stone-800 text-stone-50 border-stone-800 shadow-xs'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300/80'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-indigo-700" />
                <span>CARD</span>
              </button>
            </div>
          </div>

          {/* Cash Tender & Change Due or Card/UPI Reference */}
          {paymentMethod === 'cash' ? (
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

              {/* Quick Cash Presets */}
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
          )}

          {submitError && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-sans font-medium">
              {submitError}
            </div>
          )}

          {/* Primary Action Button (Grounded Heritage Forest Green) */}
          <button
            type="button"
            onClick={handleCompleteSale}
            disabled={cartItems.length === 0 || isSubmitting}
            className="w-full py-3.5 rounded-xl bg-[#1b4332] hover:bg-[#143628] active:bg-[#0f281e] text-stone-100 font-semibold text-sm tracking-wide uppercase disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-2 font-mono"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Processing Sale...</span>
            ) : (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>COMPLETE SALE &amp; PRINT RECEIPT ({formatCurrency(total)})</span>
              </>
            )}
          </button>
        </div>
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
      />

      {/* Shift Bills History Modal */}
      <RecentBillsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};
