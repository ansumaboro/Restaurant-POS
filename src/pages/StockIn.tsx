import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  RefreshCw,
  Box,
  Truck
} from 'lucide-react';
import type { InventoryItem } from '../types';
import { inventoryService } from '../services/inventoryService';
import { useInventoryStore } from '../store/inventoryStore';
import { useAuthStore } from '../store/authStore';
import { formatDateTime } from '../utils/formatters';

export const StockIn: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    items, 
    selectedItem, 
    recentLogs, 
    isLoading, 
    fetchItems, 
    fetchLogs, 
    selectItem, 
    updateItemStock 
  } = useInventoryStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load items and purchase logs on mount
  useEffect(() => {
    fetchItems();
    fetchLogs('purchase');
  }, [fetchItems, fetchLogs]);

  // Filtered inventory list
  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unit.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const handleSelectItem = (item: InventoryItem) => {
    selectItem(item);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      setFeedback({ type: 'error', message: 'Please select an inventory item first.' });
      return;
    }

    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setFeedback({ type: 'error', message: 'Enter a valid positive arrival quantity (> 0).' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await inventoryService.recordStockIn({
        inventoryItemId: selectedItem.id,
        quantity: numQty,
        notes: notes.trim() || undefined,
        performedBy: user?.id,
      });

      if (result.success && result.updatedItem) {
        // Sync new current_stock computed by database trigger
        updateItemStock(result.updatedItem.id, result.updatedItem.current_stock);
        
        // Refresh recent logs
        fetchLogs('purchase');

        setFeedback({
          type: 'success',
          message: `Stock updated: Added +${numQty} ${selectedItem.unit}. New Stock: ${result.updatedItem.current_stock} ${result.updatedItem.unit}`,
        });

        // Reset inputs
        setQuantity('');
        setNotes('');
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to record stock-in.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f5f4ef] select-none">
      {/* LEFT COLUMN: Inventory Item Selector */}
      <div className="w-full lg:w-96 bg-white border-r border-stone-200 flex flex-col h-full overflow-hidden shadow-xs">
        {/* Search Bar */}
        <div className="p-3 border-b border-stone-200 bg-stone-50/80">
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-stone-600" />
              <span>Select Item ({items.length})</span>
            </span>
            <button
              onClick={() => fetchItems()}
              className="text-stone-500 hover:text-stone-900 transition-colors"
              title="Refresh inventory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by name or unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-lg px-8 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
          {items.length === 0 && isLoading ? (
            <div className="p-6 text-center text-xs text-stone-400 font-mono">
              Loading inventory items...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400 font-mono">
              No matching items found.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isLow = item.current_stock <= item.min_stock_threshold;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left p-3 transition-colors flex items-center justify-between group ${
                    isSelected
                      ? 'bg-stone-100 text-stone-900 font-bold border-l-4 border-stone-900'
                      : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="pr-2 min-w-0">
                    <div className="text-xs font-bold truncate text-stone-900">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono font-medium">
                      Unit: {item.unit}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-mono font-bold block ${
                        isLow ? 'text-rose-700 font-bold' : 'text-stone-900'
                      }`}
                    >
                      {item.current_stock}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Min: {item.min_stock_threshold}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CENTER & RIGHT COLUMN: Stock-In Action Form & Recent Shipments Table */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto lg:overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-stone-200 lg:flex-row">
        {/* CENTER PANE: Stock-In Entry Form */}
        <div className="w-full lg:w-[480px] p-6 flex flex-col justify-between bg-white overflow-y-auto shadow-xs">
          <div>
            <div className="pb-4 border-b border-stone-200 mb-6">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-stone-800" />
                <h1 className="text-sm font-bold text-stone-900 uppercase tracking-wider font-mono">
                  Record Supplier Shipment (Stock-In)
                </h1>
              </div>
              <p className="text-xs text-stone-500 font-mono mt-1 font-medium">
                Transaction Type: <span className="text-emerald-800 font-bold">PURCHASE</span> (Database Trigger Increments Stock)
              </p>
            </div>

            {selectedItem ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Selected Item Summary Card */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 font-mono space-y-2">
                  <div className="text-xs text-stone-500 uppercase tracking-wider font-bold">
                    Target Inventory Item
                  </div>
                  <div className="text-base font-bold text-stone-900">
                    {selectedItem.name}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 text-xs">
                    <div>
                      <span className="text-stone-500">Current Stock: </span>
                      <span className="font-bold text-stone-900">
                        {selectedItem.current_stock} {selectedItem.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500">Min Threshold: </span>
                      <span className="text-stone-700 font-semibold">
                        {selectedItem.min_stock_threshold} {selectedItem.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Received Quantity Input */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider font-mono mb-1.5">
                    Received Quantity ({selectedItem.unit}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder={`e.g. 10 or 24.5`}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-stone-50/80 border border-stone-300 rounded-xl px-4 py-3 text-lg font-mono font-bold text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500 transition-colors"
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-stone-500">
                      {selectedItem.unit}
                    </span>
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    {[6, 12, 24, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantity(preset.toString())}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-mono text-stone-700 font-semibold"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shipment Notes */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider font-mono mb-1.5">
                    Supplier Invoice / Shipment Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Supplier PO #4928 - Fresh Draft IPA Delivery"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-stone-50/80 border border-stone-300 rounded-xl p-3 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500 font-mono resize-none font-medium"
                  />
                </div>

                {/* Feedback Alerts */}
                {feedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
                    )}
                    <span className="font-semibold">{feedback.message}</span>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !quantity || parseFloat(quantity) <= 0}
                  className="w-full py-3.5 rounded-xl bg-[#1b4332] hover:bg-[#143628] active:bg-[#0f281e] text-stone-100 font-semibold text-sm tracking-wide uppercase disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-2 font-mono"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Recording Stock-In...</span>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4 text-emerald-200" />
                      <span>Submit Stock-In Arrival</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-stone-200 rounded-xl">
                <Box className="w-10 h-10 text-stone-300 mb-2" />
                <p className="text-xs font-bold text-stone-700 font-mono">
                  No Inventory Item Selected
                </p>
                <p className="text-[11px] text-stone-500 mt-1 max-w-xs font-mono font-medium">
                  Please pick an item from the left catalog to log received units and update current inventory.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200 text-[11px] text-stone-500 font-mono flex items-center justify-between font-medium">
            <span>Staff: {user?.name || 'Authorized Staff'}</span>
            <span>Trigger: trg_update_stock active</span>
          </div>
        </div>

        {/* RIGHT PANE: Recent Stock-In Purchase Logs Table */}
        <div className="flex-1 bg-stone-50 flex flex-col h-full overflow-hidden">
          <div className="p-3.5 border-b border-stone-200 bg-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-stone-700" />
              <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono">
                Recent Stock-In Logs (Purchases)
              </h2>
            </div>
            <button
              onClick={() => fetchLogs('purchase')}
              className="text-xs text-stone-600 hover:text-stone-900 font-mono flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {recentLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-stone-400 text-xs font-mono">
                No recent stock-in logs recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-stone-100 border-b border-stone-200 text-[11px] text-stone-600 uppercase font-mono font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-right">Added Qty</th>
                    <th className="py-2.5 px-3">Staff / Performer</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/60 font-mono">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white text-stone-700">
                      <td className="py-2.5 px-3 text-stone-500 text-[11px]">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-stone-900 truncate max-w-[160px]">
                        {log.inventory_item?.name || 'Inventory Item'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                        +{log.change_quantity} {log.inventory_item?.unit || ''}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 text-[11px] font-medium">
                        {log.performer?.name || 'System'}
                      </td>
                      <td className="py-2.5 px-3 text-stone-500 text-[11px] truncate max-w-[200px]">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
