import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  RefreshCw, 
  Scale, 
  CheckCircle2, 
  AlertCircle,
  History,
  TrendingUp,
  TrendingDown,
  Equal
} from 'lucide-react';
import type { InventoryItem } from '../types';
import { inventoryService } from '../services/inventoryService';
import { useInventoryStore } from '../store/inventoryStore';
import { useAuthStore } from '../store/authStore';
import { formatDateTime, formatVariance } from '../utils/formatters';

export const StockAudit: React.FC = () => {
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
  const [physicalCount, setPhysicalCount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load items and audit logs on mount
  useEffect(() => {
    fetchItems();
    fetchLogs('audit_correction');
  }, [fetchItems, fetchLogs]);

  // Filtered inventory items
  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unit.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  // When an item is selected, reset input and feedback
  const handleSelectItem = (item: InventoryItem) => {
    selectItem(item);
    setPhysicalCount('');
    setNotes('');
    setFeedback(null);
  };

  // Compute variance = Physical Count - System Stock
  const varianceComputation = useMemo(() => {
    if (!selectedItem || physicalCount === '') return null;
    const physical = parseFloat(physicalCount);
    if (isNaN(physical) || physical < 0) return null;

    const systemStock = selectedItem.current_stock;
    const variance = Math.round((physical - systemStock) * 100) / 100;

    return {
      physical,
      systemStock,
      variance,
      isMatch: variance === 0,
      isSurplus: variance > 0,
      isDeficit: variance < 0,
    };
  }, [selectedItem, physicalCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      setFeedback({ type: 'error', message: 'Please select an inventory item to audit.' });
      return;
    }

    if (!varianceComputation) {
      setFeedback({ type: 'error', message: 'Enter a valid physical count (>= 0).' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await inventoryService.recordAuditAdjustment({
        inventoryItemId: selectedItem.id,
        varianceQuantity: varianceComputation.variance,
        notes: notes.trim() || undefined,
        performedBy: user?.id,
      });

      if (result.success && result.updatedItem) {
        // Sync new current_stock updated by database trigger
        updateItemStock(result.updatedItem.id, result.updatedItem.current_stock);

        // Refresh recent audit logs
        fetchLogs('audit_correction');

        setFeedback({
          type: 'success',
          message: `Audit Reconciled: Physical count (${varianceComputation.physical} ${selectedItem.unit}) matched. Variance: ${varianceComputation.variance > 0 ? '+' : ''}${varianceComputation.variance} logged.`,
        });

        // Reset inputs
        setPhysicalCount('');
        setNotes('');
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to post audit adjustment.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Audit exception occurred.',
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
              <Scale className="w-3.5 h-3.5 text-stone-600" />
              <span>Select Item to Audit ({items.length})</span>
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
              placeholder="Search item to audit..."
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
              No inventory items found.
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
                    <span className="text-[10px] text-stone-400 font-mono font-medium">
                      System Stock
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CENTER & RIGHT COLUMN: Audit Reconciliation Form & Recent Audit Logs */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto lg:overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-stone-200 lg:flex-row">
        {/* CENTER PANE: Audit Count & Variance Calculation */}
        <div className="w-full lg:w-[480px] p-6 flex flex-col justify-between bg-white overflow-y-auto shadow-xs">
          <div>
            <div className="pb-4 border-b border-stone-200 mb-6">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-stone-800" />
                <h1 className="text-sm font-bold text-stone-900 uppercase tracking-wider font-mono">
                  Stock Audit &amp; Reconciliation
                </h1>
              </div>
              <p className="text-xs text-stone-500 font-mono mt-1 font-medium">
                Transaction Type: <span className="text-stone-800 font-bold">AUDIT_CORRECTION</span> (Variance Auto-Adjusts Stock)
              </p>
            </div>

            {selectedItem ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Current System Stock Reference Card */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 font-mono space-y-2">
                  <div className="text-xs text-stone-500 uppercase tracking-wider font-bold">
                    Reconciliation Target
                  </div>
                  <div className="text-base font-bold text-stone-900">
                    {selectedItem.name}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs">
                    <span className="text-stone-500">Current System Stock:</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {selectedItem.current_stock} {selectedItem.unit}
                    </span>
                  </div>
                </div>

                {/* Actual Physical Count Input */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider font-mono mb-1.5">
                    Actual Physical Count ({selectedItem.unit}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder={`Enter actual on-hand count`}
                      value={physicalCount}
                      onChange={(e) => setPhysicalCount(e.target.value)}
                      className="w-full bg-stone-50/80 border border-stone-300 rounded-xl px-4 py-3 text-lg font-mono font-bold text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-500 transition-colors"
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-stone-500">
                      {selectedItem.unit}
                    </span>
                  </div>
                </div>

                {/* Live Computed Variance Indicator Card */}
                {varianceComputation ? (
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 font-mono space-y-2 shadow-xs">
                    <div className="text-xs text-stone-500 uppercase tracking-wider font-bold flex items-center justify-between">
                      <span>Computed Variance</span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        (Physical Count &minus; System Stock)
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        {varianceComputation.isMatch ? (
                          <Equal className="w-5 h-5 text-stone-500" />
                        ) : varianceComputation.isSurplus ? (
                          <TrendingUp className="w-5 h-5 text-emerald-700" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-rose-700" />
                        )}
                        <span className="text-xs font-bold uppercase text-stone-800">
                          {varianceComputation.isMatch
                            ? 'Exact Count (No Variance)'
                            : varianceComputation.isSurplus
                            ? 'Surplus Found'
                            : 'Shortage / Shrinkage'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-base font-bold ${
                            varianceComputation.isMatch
                              ? 'text-stone-700'
                              : varianceComputation.isSurplus
                              ? 'text-emerald-800'
                              : 'text-rose-700'
                          }`}
                        >
                          {varianceComputation.variance > 0 ? '+' : ''}
                          {varianceComputation.variance} {selectedItem.unit}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-600 pt-2 border-t border-stone-200 flex justify-between">
                      <span>Target Current Stock after reconciliation:</span>
                      <span className="text-stone-900 font-bold">
                        {varianceComputation.physical} {selectedItem.unit}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500 font-mono text-center">
                    Enter physical count above to compute variance automatically.
                  </div>
                )}

                {/* Discrepancy Reason / Notes */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider font-mono mb-1.5">
                    Audit Notes &amp; Discrepancy Justification
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. End of day bar count, 1 bottle dropped & broken, or miscount correction"
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
                  disabled={isSubmitting || !varianceComputation}
                  className="w-full py-3.5 rounded-xl bg-[#1b4332] hover:bg-[#143628] active:bg-[#0f281e] text-stone-100 font-semibold text-sm tracking-wide uppercase disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-2 font-mono"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Reconciling Stock...</span>
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4 text-emerald-200" />
                      <span>Post Audit Adjustment &amp; Reconcile</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-stone-200 rounded-xl">
                <Scale className="w-10 h-10 text-stone-300 mb-2" />
                <p className="text-xs font-bold text-stone-700 font-mono">
                  No Inventory Item Selected
                </p>
                <p className="text-[11px] text-stone-500 mt-1 max-w-xs font-mono font-medium">
                  Select an item on the left to review system stock, enter physical counts, and reconcile variances.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200 text-[11px] text-stone-500 font-mono flex items-center justify-between font-medium">
            <span>Staff: {user?.name || 'Auditor'}</span>
            <span>Formula: Physical &minus; System = Variance</span>
          </div>
        </div>

        {/* RIGHT PANE: Recent Audit Correction Logs Table */}
        <div className="flex-1 bg-stone-50 flex flex-col h-full overflow-hidden">
          <div className="p-3.5 border-b border-stone-200 bg-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-stone-700" />
              <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono">
                Recent Audit Adjustments (Reconciliations)
              </h2>
            </div>
            <button
              onClick={() => fetchLogs('audit_correction')}
              className="text-xs text-stone-600 hover:text-stone-900 font-mono flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {recentLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-stone-400 text-xs font-mono font-medium">
                No audit correction logs recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-stone-100 border-b border-stone-200 text-[11px] text-stone-600 uppercase font-mono font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-right">Variance Applied</th>
                    <th className="py-2.5 px-3">Auditor</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/60 font-mono">
                  {recentLogs.map((log) => {
                    const varianceInfo = formatVariance(
                      log.change_quantity,
                      log.inventory_item?.unit
                    );
                    return (
                      <tr key={log.id} className="hover:bg-white text-stone-700">
                        <td className="py-2.5 px-3 text-stone-500 text-[11px]">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-stone-900 truncate max-w-[160px]">
                          {log.inventory_item?.name || 'Inventory Item'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={varianceInfo.colorClass}>
                            {varianceInfo.text}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-600 text-[11px] font-medium">
                          {log.performer?.name || 'System'}
                        </td>
                        <td className="py-2.5 px-3 text-stone-500 text-[11px] truncate max-w-[200px]">
                          {log.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
