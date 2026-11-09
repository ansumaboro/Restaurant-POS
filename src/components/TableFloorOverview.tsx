import React from 'react';
import { 
  History, 
  RefreshCw, 
  Zap, 
  ShoppingBag, 
  Clock, 
  ChevronRight,
  ReceiptText,
  Utensils
} from 'lucide-react';
import type { RestaurantTable } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface TableFloorOverviewProps {
  tables: RestaurantTable[];
  onSelectTable: (table: RestaurantTable | null) => void;
  onOpenHistory: () => void;
  onRefreshTables: () => void;
  isLoading?: boolean;
}

export const TableFloorOverview: React.FC<TableFloorOverviewProps> = ({
  tables,
  onSelectTable,
  onOpenHistory,
  onRefreshTables,
  isLoading = false,
}) => {
  const occupiedTables = tables.filter((t) => t.status === 'occupied');
  const availableCount = tables.filter((t) => t.status === 'available').length;
  const totalOccupied = occupiedTables.length;
  const totalRunningRevenue = occupiedTables.reduce((acc, t) => acc + (t.runningTotal || 0), 0);

  return (
    <div className="w-full lg:w-[420px] xl:w-[460px] bg-stone-50 flex flex-col justify-between border-l border-stone-200 h-full max-h-full overflow-hidden shadow-xs select-none font-mono">
      {/* Header Bar */}
      <div className="p-3.5 border-b border-stone-200 bg-stone-100/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ReceiptText className="w-4 h-4 text-stone-700" />
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            Floor Billing Desk
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold transition-colors shadow-2xs"
            title="View recent invoices"
          >
            <History className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Bills</span>
          </button>
          <button
            type="button"
            onClick={onRefreshTables}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors shadow-2xs"
            title="Refresh tables"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs text-center">
            <span className="text-[10px] text-stone-500 uppercase font-semibold block">Available</span>
            <span className="text-lg font-bold text-emerald-700 block mt-0.5">{availableCount}</span>
            <span className="text-[10px] text-stone-400">Tables</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs text-center">
            <span className="text-[10px] text-stone-500 uppercase font-semibold block">Occupied</span>
            <span className="text-lg font-bold text-amber-800 block mt-0.5">{totalOccupied}</span>
            <span className="text-[10px] text-stone-400">Open Tabs</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs text-center">
            <span className="text-[10px] text-stone-500 uppercase font-semibold block">Total Due</span>
            <span className="text-xs sm:text-sm font-bold text-stone-900 block mt-1 truncate">
              {formatCurrency(totalRunningRevenue)}
            </span>
            <span className="text-[10px] text-stone-400">Unsettled</span>
          </div>
        </div>

        {/* Quick Action: Takeaway Counter */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-300/80 flex items-center justify-between gap-3 shadow-2xs">
          <div>
            <span className="text-xs font-bold text-amber-950 block">Quick Walk-in Counter</span>
            <span className="text-[11px] text-stone-600 block mt-0.5">
              Direct checkout for takeaway or bar counter cash sales
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectTable(null)}
            className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Open &rarr;</span>
          </button>
        </div>

        {/* Active Open Tabs Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-800 border-b border-stone-200 pb-1.5">
            <span className="uppercase tracking-wider">Active Open Tabs</span>
            <span className="text-stone-500 font-semibold">{totalOccupied} active</span>
          </div>

          {occupiedTables.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-white border border-stone-200/90 text-stone-400 space-y-1.5 shadow-2xs">
              <Utensils className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-bold text-stone-700">No Open Tabs at the Moment</p>
              <p className="text-[11px] text-stone-500 font-medium">
                Click any available table on the floor layout to start taking orders
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {occupiedTables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => onSelectTable(table)}
                  className="w-full p-3 rounded-xl bg-white hover:bg-amber-50/70 border border-amber-300/90 hover:border-amber-400 text-left flex items-center justify-between gap-3 transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-950 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-300">
                      {table.table_number}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-900 truncate">
                        {table.section || 'Dining Table'}
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                        <ShoppingBag className="w-3 h-3 text-amber-800" />
                        <span>{table.itemsCount || 0} items</span>
                        {table.activeInvoice?.created_at && (
                          <>
                            <span>&bull;</span>
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{formatDateTime(table.activeInvoice.created_at).split(',')[1]}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-stone-900">
                      {formatCurrency(table.runningTotal || 0)}
                    </div>
                    <span className="text-[10px] text-amber-800 font-bold group-hover:text-stone-900 flex items-center gap-0.5 justify-end mt-0.5">
                      <span>Review Bill</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Desk Helper */}
      <div className="p-3 bg-white border-t border-stone-200 text-[11px] text-stone-500 text-center font-medium">
        Select a table on the left to review its order details, add items, or settle the bill.
      </div>
    </div>
  );
};
