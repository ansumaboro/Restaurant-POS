import React from 'react';
import { 
  X, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  UtensilsCrossed, 
  Wine, 
  SunMedium, 
  Zap,
  ShoppingBag
} from 'lucide-react';
import type { RestaurantTable } from '../types';
import { formatCurrency } from '../utils/formatters';

interface TableFloorPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: RestaurantTable[];
  selectedTableId: string | null;
  onSelectTable: (table: RestaurantTable | null) => void;
}

export const TableFloorPlanModal: React.FC<TableFloorPlanModalProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTableId,
  onSelectTable,
}) => {
  if (!isOpen) return null;

  // Group tables by section
  const sections = Array.from(new Set(tables.map((t) => t.section || 'Main Dining')));

  const totalOccupied = tables.filter((t) => t.status === 'occupied').length;
  const totalAvailable = tables.filter((t) => t.status === 'available').length;
  const totalRunningRevenue = tables.reduce((acc, t) => acc + (t.runningTotal || 0), 0);

  const getSectionIcon = (section: string) => {
    const s = section.toLowerCase();
    if (s.includes('bar')) return <Wine className="w-4 h-4 text-amber-700" />;
    if (s.includes('outdoor') || s.includes('terrace')) return <SunMedium className="w-4 h-4 text-emerald-700" />;
    return <UtensilsCrossed className="w-4 h-4 text-stone-700" />;
  };

  const handlePickTable = (table: RestaurantTable | null) => {
    onSelectTable(table);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs select-none">
      <div className="bg-[#f7f5f0] border border-stone-200 rounded-2xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-white shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <h2 className="text-sm sm:text-base font-bold text-stone-900 tracking-wider font-mono uppercase">
                Samsara Tables Floor Plan
              </h2>
            </div>
            <p className="text-xs text-stone-500 font-mono mt-0.5 font-medium">
              Select an occupied table to review &amp; settle its open tab, or select an empty table to start a new order.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Overview KPI Strip */}
        <div className="px-4 py-2.5 bg-stone-100/90 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-stone-600">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Available: <strong>{totalAvailable}</strong></span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-stone-600">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span>Occupied: <strong>{totalOccupied}</strong></span>
            </span>
            <span className="hidden sm:inline text-stone-400">&bull;</span>
            <span className="hidden sm:inline font-semibold text-stone-800">
              Running Tabs: <strong className="text-stone-900 font-bold">{formatCurrency(totalRunningRevenue)}</strong>
            </span>
          </div>

          {/* Quick Counter / Takeaway option */}
          <button
            type="button"
            onClick={() => handlePickTable(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 border transition-all ${
              selectedTableId === null
                ? 'bg-stone-900 text-stone-50 border-stone-900 shadow-xs'
                : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300 shadow-2xs'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Direct Counter (Takeaway)</span>
          </button>
        </div>

        {/* Floor Plan Sections Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {sections.map((sectionName) => {
            const sectionTables = tables.filter((t) => t.section === sectionName);
            return (
              <div key={sectionName} className="space-y-3">
                {/* Section Header */}
                <div className="flex items-center gap-2 pb-1.5 border-b border-stone-200">
                  {getSectionIcon(sectionName)}
                  <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-mono">
                    {sectionName}
                  </h3>
                  <span className="text-[11px] font-mono text-stone-400 font-medium">
                    ({sectionTables.length} tables)
                  </span>
                </div>

                {/* Tables Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {sectionTables.map((table) => {
                    const isOccupied = table.status === 'occupied';
                    const isSelected = selectedTableId === table.id;
                    const itemsCount = table.itemsCount || 0;
                    const runningTotal = table.runningTotal || 0;

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => handlePickTable(table)}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all group relative ${
                          isSelected
                            ? 'ring-2 ring-stone-900 border-stone-900 bg-white shadow-md'
                            : isOccupied
                            ? 'bg-amber-50/70 hover:bg-amber-50 border-amber-300 shadow-2xs'
                            : 'bg-white hover:bg-stone-50/80 border-stone-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                        }`}
                      >
                        {/* Table Number & Status Pill */}
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-mono text-base font-bold text-stone-900 block leading-tight">
                              {table.table_number}
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3 text-stone-400" />
                              <span>{table.seating_capacity} Seats</span>
                            </span>
                          </div>

                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                              isOccupied
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isOccupied ? 'Occupied' : 'Open'}
                          </span>
                        </div>

                        {/* Order Summary / Action Hint */}
                        <div className="mt-3 pt-2 border-t border-stone-200/80 font-mono">
                          {isOccupied ? (
                            <div>
                              <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                                <span className="flex items-center gap-1 text-[11px] text-stone-600 font-normal">
                                  <ShoppingBag className="w-3 h-3 text-amber-800" />
                                  <span>{itemsCount} items</span>
                                </span>
                                <span>{formatCurrency(runningTotal)}</span>
                              </div>
                              <span className="text-[10px] text-amber-800 block mt-0.5 font-medium">
                                Click to load bill &bull;
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-[11px] text-stone-500">
                              <span className="flex items-center gap-1 font-medium">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Available</span>
                              </span>
                              <span className="text-[10px] font-semibold text-stone-400 group-hover:text-stone-700 transition-colors">
                                + New Order
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-stone-200 flex items-center justify-between text-xs font-mono text-stone-500">
          <span>Clicking an occupied table loads all previously ordered items for instant checkout.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold border border-stone-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
