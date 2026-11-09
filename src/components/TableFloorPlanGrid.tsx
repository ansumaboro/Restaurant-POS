import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Wine, 
  SunMedium, 
  UtensilsCrossed, 
  RefreshCw, 
  Zap, 
  ShoppingBag,
  CheckCircle2,
  Search,
  Sparkles
} from 'lucide-react';
import type { RestaurantTable } from '../types';
import { formatCurrency } from '../utils/formatters';

interface TableFloorPlanGridProps {
  tables: RestaurantTable[];
  selectedTableId: string | null;
  onSelectTable: (table: RestaurantTable | null) => void;
  onRefreshTables: () => void;
  isLoading?: boolean;
}

export const TableFloorPlanGrid: React.FC<TableFloorPlanGridProps> = ({
  tables,
  selectedTableId,
  onSelectTable,
  onRefreshTables,
  isLoading = false,
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [tableSearch, setTableSearch] = useState<string>('');

  const sections = useMemo(() => {
    return Array.from(new Set(tables.map((t) => t.section || 'Indoor Dining')));
  }, [tables]);

  const totalOccupied = tables.filter((t) => t.status === 'occupied').length;
  const totalAvailable = tables.filter((t) => t.status === 'available').length;
  const totalRevenue = tables.reduce((acc, t) => acc + (t.runningTotal || 0), 0);

  const getSectionIcon = (section: string) => {
    const s = section.toLowerCase();
    if (s.includes('bar')) return <Wine className="w-4 h-4 text-amber-700" />;
    if (s.includes('outdoor') || s.includes('terrace')) return <SunMedium className="w-4 h-4 text-emerald-700" />;
    return <UtensilsCrossed className="w-4 h-4 text-stone-700" />;
  };

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchSection = selectedSection === 'ALL' || t.section === selectedSection;
      const matchSearch =
        tableSearch === '' ||
        t.table_number.toLowerCase().includes(tableSearch.toLowerCase()) ||
        (t.section && t.section.toLowerCase().includes(tableSearch.toLowerCase()));
      return matchSection && matchSearch;
    });
  }, [tables, selectedSection, tableSearch]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f7f5f0] select-none font-mono">
      {/* Floor Plan Header & Control Bar */}
      <div className="p-3.5 bg-[#fffefb] border-b border-stone-200/90 space-y-3 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Title & Floor Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-stone-900 tracking-wider uppercase">
                Restaurant Floor Plan
              </h1>
              <p className="text-[11px] text-stone-500 font-medium">
                Click an occupied table to view order details &amp; bill, or an open table to start a new order
              </p>
            </div>
          </div>

          {/* Quick Stats & Refresh Button */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-700">
              <span className="flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{totalAvailable} Open</span>
              </span>
              <span className="text-stone-300">|</span>
              <span className="flex items-center gap-1 font-semibold text-amber-900">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{totalOccupied} Occupied</span>
              </span>
              {totalRevenue > 0 && (
                <>
                  <span className="text-stone-300">|</span>
                  <span className="font-bold text-stone-900">
                    Tabs: {formatCurrency(totalRevenue)}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onRefreshTables}
              disabled={isLoading}
              className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-colors shadow-2xs"
              title="Refresh tables"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100">
          {/* Section Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedSection('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                selectedSection === 'ALL'
                  ? 'bg-stone-900 text-stone-100 shadow-xs'
                  : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700 font-medium'
              }`}
            >
              All Tables ({tables.length})
            </button>
            {sections.map((sec) => {
              const count = tables.filter((t) => t.section === sec).length;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedSection === sec
                      ? 'bg-stone-900 text-stone-100 shadow-xs'
                      : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700 font-medium'
                  }`}
                >
                  {getSectionIcon(sec)}
                  <span>{sec}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Quick Table Search */}
          <div className="relative w-44 sm:w-52">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter table #..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Main Floor Tables Viewport */}
      <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-14.5rem)] space-y-6">
        {/* Walk-in Counter Quick Banner */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-300/60 text-amber-800 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-stone-900 tracking-wide uppercase">
                  Walk-in / Takeaway Counter
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Direct Sale
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                For takeaway or instant counter orders without assigning a table
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTable(null)}
            className="px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Walk-in Menu &amp; Cart</span>
          </button>
        </div>

        {/* Display tables by section */}
        {sections.map((sectionName) => {
          const sectionTables = filteredTables.filter((t) => t.section === sectionName);
          if (sectionTables.length === 0) return null;

          return (
            <div key={sectionName} className="space-y-3">
              {/* Section Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  {getSectionIcon(sectionName)}
                  <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    {sectionName}
                  </h2>
                  <span className="text-[11px] text-stone-400 font-semibold">
                    ({sectionTables.length} tables)
                  </span>
                </div>

                <div className="text-[11px] text-stone-500 flex items-center gap-3">
                  <span>
                    Open: <strong className="text-emerald-700">{sectionTables.filter((t) => t.status === 'available').length}</strong>
                  </span>
                  <span>
                    Occupied: <strong className="text-amber-800">{sectionTables.filter((t) => t.status === 'occupied').length}</strong>
                  </span>
                </div>
              </div>

              {/* Grid of Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {sectionTables.map((table) => {
                  const isOccupied = table.status === 'occupied';
                  const isSelected = selectedTableId === table.id;
                  const itemsCount = table.itemsCount || 0;
                  const runningTotal = table.runningTotal || 0;

                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => onSelectTable(table)}
                      className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden ${
                        isSelected
                          ? 'ring-1 ring-stone-900 border-stone-900 bg-white shadow-md'
                          : isOccupied
                          ? 'bg-amber-50/70 hover:bg-amber-50/95 border-amber-300 hover:border-amber-400 shadow-2xs'
                          : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-stone-400 shadow-2xs'
                      }`}
                    >
                      {/* Top Bar: Table Number & Status Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                              {table.table_number}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-stone-500">
                                [Active]
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 font-medium">
                            <Users className="w-3 h-3 text-stone-400" />
                            <span>{table.seating_capacity} Seats</span>
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                            isOccupied
                              ? 'bg-amber-200/80 text-amber-950 border border-amber-400'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOccupied ? 'bg-amber-700 animate-pulse' : 'bg-emerald-600'
                            }`}
                          />
                          <span>{isOccupied ? 'Occupied' : 'Available'}</span>
                        </span>
                      </div>

                      {/* Bottom Info: Order Items & Running Total or New Order Prompt */}
                      <div className="mt-4 pt-2.5 border-t border-stone-200/80">
                        {isOccupied ? (
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                              <span className="flex items-center gap-1 text-[11px] text-stone-700 font-semibold">
                                <ShoppingBag className="w-3.5 h-3.5 text-amber-800" />
                                <span>{itemsCount} items</span>
                              </span>
                              <span className="text-sm text-stone-900 font-extrabold">
                                {formatCurrency(runningTotal)}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] font-bold text-amber-800 flex items-center justify-between">
                              <span>Click to view bill &amp; order</span>
                              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] text-stone-500">
                            <span className="flex items-center gap-1 font-medium text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Ready for guests</span>
                            </span>
                            <span className="font-bold text-stone-600 group-hover:text-stone-900 transition-colors">
                              + Start Order &rarr;
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

        {filteredTables.length === 0 && (
          <div className="p-8 text-center text-stone-400 text-xs">
            No tables match the current filter or search query.
          </div>
        )}
      </div>
    </div>
  );
};
