import React from 'react';
import { LayoutGrid, RefreshCw, Zap } from 'lucide-react';
import type { RestaurantTable } from '../types';
import { formatCurrency } from '../utils/formatters';

interface TableSelectorBarProps {
  tables: RestaurantTable[];
  selectedTable: RestaurantTable | null;
  onSelectTable: (table: RestaurantTable | null) => void;
  onOpenFloorPlan: () => void;
  onRefreshTables: () => void;
  isLoading?: boolean;
}

export const TableSelectorBar: React.FC<TableSelectorBarProps> = ({
  tables,
  selectedTable,
  onSelectTable,
  onOpenFloorPlan,
  onRefreshTables,
  isLoading = false,
}) => {
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;

  return (
    <div className="bg-[#fffefb] border-b border-stone-200/90 px-3 py-2 flex items-center justify-between gap-3 shrink-0 shadow-2xs select-none font-mono">
      {/* LEFT: Quick Table Scrollable Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0">
        {/* Direct Walk-In Counter Option */}
        <button
          type="button"
          onClick={() => onSelectTable(null)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 border transition-all ${
            selectedTable === null
              ? 'bg-stone-900 text-stone-100 border-stone-900 shadow-xs ring-1 ring-stone-700'
              : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
          }`}
          title="Direct walk-in counter sale (No Table)"
        >
          <Zap className="w-3 h-3 text-amber-500" />
          <span>Walk-in Counter</span>
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-stone-200 shrink-0 mx-1" />

        {/* Individual Tables List */}
        {tables.map((table) => {
          const isSelected = selectedTable?.id === table.id;
          const isOccupied = table.status === 'occupied';
          const itemsCount = table.itemsCount || 0;
          const runningTotal = table.runningTotal || 0;

          return (
            <button
              key={table.id}
              type="button"
              onClick={() => onSelectTable(table)}
              className={`px-2.5 py-1.5 rounded-lg text-xs shrink-0 flex items-center gap-1.5 border transition-all ${
                isSelected
                  ? 'bg-stone-900 text-stone-100 border-stone-900 shadow-xs ring-2 ring-stone-900 font-bold'
                  : isOccupied
                  ? 'bg-amber-50/90 hover:bg-amber-100/80 text-amber-950 border-amber-300 font-semibold'
                  : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200 font-medium'
              }`}
              title={`${table.table_number} (${table.section}) - ${
                isOccupied
                  ? `Occupied: ${itemsCount} items (${formatCurrency(runningTotal)})`
                  : 'Available'
              }`}
            >
              {/* Status Indicator Dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isSelected
                    ? 'bg-amber-300'
                    : isOccupied
                    ? 'bg-amber-600 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />

              {/* Table Number */}
              <span>{table.table_number}</span>

              {/* Badge for occupied item count */}
              {isOccupied && (
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                    isSelected
                      ? 'bg-amber-400/20 text-amber-200'
                      : 'bg-amber-200/70 text-amber-900'
                  }`}
                >
                  {itemsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* RIGHT: Active Floor Plan Trigger & Refresh Buttons */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-stone-200">
        <button
          type="button"
          onClick={onOpenFloorPlan}
          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          title="Open interactive floor plan"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-stone-600" />
          <span className="hidden sm:inline">Floor Plan</span>
          {occupiedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
              {occupiedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onRefreshTables}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200 transition-colors shadow-2xs"
          title="Refresh table statuses"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
