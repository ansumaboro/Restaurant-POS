import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowLeft, 
  History, 
  AlertTriangle, 
  Utensils, 
  Wine, 
  CupSoda, 
  LayoutGrid
} from 'lucide-react';
import type { MenuItem, Category, RestaurantTable, CartItem } from '../types';
import { formatCurrency } from '../utils/formatters';

interface MenuCatalogViewProps {
  menuItems: MenuItem[];
  categories: Category[];
  selectedTable: RestaurantTable | null;
  activePendingInvoiceId: string | null;
  onBackToTables: () => void;
  onOpenHistory: () => void;
  onAddItem: (item: MenuItem) => void;
  cartItems: CartItem[];
  isLoading?: boolean;
}

type DepartmentFilter = 'ALL' | 'food' | 'alcohol' | 'beverage';
type DietaryFilter = 'ALL' | 'VEG' | 'NON_VEG';

export const MenuCatalogView: React.FC<MenuCatalogViewProps> = ({
  menuItems,
  categories,
  selectedTable,
  activePendingInvoiceId,
  onBackToTables,
  onOpenHistory,
  onAddItem,
  cartItems,
  isLoading = false,
}) => {
  const [department, setDepartment] = useState<DepartmentFilter>('ALL');
  const [dietary, setDietary] = useState<DietaryFilter>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reset subcategory when department changes
  const handleDepartmentChange = (dept: DepartmentFilter) => {
    setDepartment(dept);
    setSelectedCategoryId('ALL');
    // If switching to alcohol or beverage, reset dietary to ALL
    if (dept === 'alcohol' || dept === 'beverage') {
      setDietary('ALL');
    }
  };

  // Subcategories available under the selected department
  const visibleCategories = useMemo(() => {
    if (department === 'ALL') return categories;
    return categories.filter((c) => c.type === department);
  }, [categories, department]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // 1. Department Filter
      const itemDept = item.category?.type;
      const matchesDept = department === 'ALL' || itemDept === department;
      if (!matchesDept) return false;

      // 2. Subcategory Filter
      const matchesCategory =
        selectedCategoryId === 'ALL' || item.category_id === selectedCategoryId;
      if (!matchesCategory) return false;

      // 3. Dietary Filter (Applies to food items, or when ALL is selected)
      if (dietary === 'VEG') {
        if (item.is_veg !== true) return false;
      } else if (dietary === 'NON_VEG') {
        if (item.is_veg !== false) return false;
      }

      // 4. Text Search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCat = (item.category?.name || '').toLowerCase().includes(query);
        const matchesSub = (item.sub_category || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCat && !matchesSub) return false;
      }

      return true;
    });
  }, [menuItems, department, selectedCategoryId, dietary, searchQuery]);

  return (
    <div className="flex-1 flex flex-col border-r border-stone-200 h-full overflow-hidden bg-[#f7f5f0] select-none font-mono">
      {/* =========================================================================
          FIXED TOP CONTROL BAR: NEVER SCROLLS (shrink-0)
          Holds Header, Department Tabs, Dietary Switcher, Subcategory Pills, Search
          ========================================================================= */}
      <div className="bg-[#fffefb] border-b border-stone-200/90 shadow-2xs shrink-0 z-10 space-y-2 p-3">
        {/* Top Header Row: Back Button + Table Info + Search + Bills Button */}
        <div className="flex items-center gap-2.5">
          {/* Back to Floor Plan Button */}
          <button
            type="button"
            onClick={onBackToTables}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-bold transition-colors shadow-2xs shrink-0"
            title="Return to Tables Floor Plan"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tables</span>
          </button>

          {/* Table Badge */}
          <div className="flex items-center gap-2 min-w-0 pr-1">
            <span className="text-xs font-bold text-stone-900 tracking-tight truncate">
              {selectedTable ? (
                <>
                  <span className="text-stone-900 font-extrabold">{selectedTable.table_number}</span>
                  <span className="text-stone-500 font-medium ml-1">({selectedTable.section})</span>
                </>
              ) : (
                'Walk-in Counter (Takeaway)'
              )}
            </span>

            {selectedTable && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                  activePendingInvoiceId
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {activePendingInvoiceId ? 'Active Tab' : 'New Order'}
              </span>
            )}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes or drinks... (e.g. Paneer, Beer, Naan)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-50/90 border border-stone-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-500 font-mono"
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

          {/* Shift Sales History Button */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 text-xs font-semibold transition-colors shrink-0 font-mono"
            title="View recent invoices"
          >
            <History className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden md:inline">Bills</span>
          </button>
        </div>

        {/* Row 1: Top-Level Department Tabs */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => handleDepartmentChange('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                department === 'ALL'
                  ? 'bg-stone-900 text-stone-100 shadow-xs'
                  : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700 font-medium'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Menu</span>
            </button>

            <button
              type="button"
              onClick={() => handleDepartmentChange('food')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                department === 'food'
                  ? 'bg-amber-900 text-amber-50 shadow-xs'
                  : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700 font-medium'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 text-amber-500" />
              <span>Food</span>
            </button>

            <button
              type="button"
              onClick={() => handleDepartmentChange('alcohol')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                department === 'alcohol'
                  ? 'bg-amber-900 text-amber-50 shadow-xs'
                  : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700 font-medium'
              }`}
            >
              <Wine className="w-3.5 h-3.5 text-amber-400" />
              <span>Alcohol / Bar</span>
            </button>

            <button
              type="button"
              onClick={() => handleDepartmentChange('beverage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                department === 'beverage'
                  ? 'bg-stone-900 text-stone-100 shadow-xs'
                  : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700 font-medium'
              }`}
            >
              <CupSoda className="w-3.5 h-3.5 text-blue-400" />
              <span>Beverages</span>
            </button>
          </div>

          <span className="text-[11px] text-stone-400 font-medium hidden sm:inline shrink-0">
            {filteredItems.length} items
          </span>
        </div>

        {/* Row 2: Separate Dietary Toggle (All/Veg/Non-Veg) + Dynamic Subcategory Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100">
          {/* Dietary Selector: Only shown when viewing Food or All (Hidden on Bar & Beverages) */}
          {(department === 'food' || department === 'ALL') && (
            <div className="flex items-center p-0.5 rounded-lg bg-stone-200/80 border border-stone-300 shrink-0">
              <button
                type="button"
                onClick={() => setDietary('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  dietary === 'ALL'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Show all food dishes"
              >
                All Food
              </button>

              <button
                type="button"
                onClick={() => setDietary('VEG')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                  dietary === 'VEG'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
                title="Filter Vegetarian dishes only"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Veg</span>
              </button>

              <button
                type="button"
                onClick={() => setDietary('NON_VEG')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                  dietary === 'NON_VEG'
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'text-rose-800 hover:bg-rose-50'
                }`}
                title="Filter Non-Vegetarian dishes only"
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Non-Veg</span>
              </button>
            </div>
          )}

          {/* Dynamic Subcategory Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                selectedCategoryId === 'ALL'
                  ? 'bg-stone-800 text-stone-100 shadow-xs'
                  : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700'
              }`}
            >
              All {department === 'food' ? 'Food Categories' : department === 'alcohol' ? 'Alcohol Categories' : department === 'beverage' ? 'Beverage Categories' : 'Categories'}
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-stone-800 text-stone-100 shadow-xs'
                    : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCROLLABLE MENU ITEMS CONTAINER:
          Bounded height with overflow-y-auto so ONLY items scroll, leaving categories intact!
          ========================================================================= */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 max-h-[calc(100vh-14.5rem)] scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-stone-100">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-xs text-stone-400">
            Loading menu items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500">
            <Utensils className="w-8 h-8 text-stone-300 mb-2" />
            <p className="text-sm font-bold text-stone-700">No items match your filter</p>
            <p className="text-xs text-stone-400 mt-1">
              Try switching dietary option or selecting a different category.
            </p>
            {(dietary !== 'ALL' || selectedCategoryId !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setDietary('ALL');
                  setSelectedCategoryId('ALL');
                  setSearchQuery('');
                }}
                className="mt-3 px-3 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors"
              >
                Reset Filters
              </button>
            )}
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
                  onClick={() => onAddItem(item)}
                  className="p-3.5 rounded-xl bg-white hover:bg-stone-50/70 active:bg-stone-100 border border-stone-200/90 hover:border-stone-400 text-left flex flex-col justify-between transition-all group relative overflow-hidden shadow-2xs"
                >
                  {/* Top: Veg/Non-Veg Badge & Cart Quantity */}
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      {/* Dietary Symbol (Authentic Indian FSSAI Square Icon) */}
                      {item.is_veg === true ? (
                        <span
                          className="w-3.5 h-3.5 rounded-xs border-2 border-emerald-600 flex items-center justify-center shrink-0 mt-0.5"
                          title="Vegetarian"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        </span>
                      ) : item.is_veg === false ? (
                        <span
                          className="w-3.5 h-3.5 rounded-xs border-2 border-rose-700 flex items-center justify-center shrink-0 mt-0.5"
                          title="Non-Vegetarian"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-700" />
                        </span>
                      ) : (
                        /* Alcohol / Beverage - no veg badge */
                        <span className="w-1" />
                      )}

                      {inCart && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-900 text-stone-100">
                          {inCart.quantity}x
                        </span>
                      )}
                    </div>

                    {/* Dish / Drink Name */}
                    <span className="text-xs font-bold text-stone-900 group-hover:text-stone-950 line-clamp-2 mt-1 block">
                      {item.name}
                    </span>

                    {/* Category Label */}
                    <span className="text-[10px] text-stone-500 block mt-0.5 font-medium truncate">
                      {item.category?.name || 'Item'}
                    </span>
                  </div>

                  {/* Price & Stock Indicator */}
                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-stone-900">
                      {formatCurrency(item.price)}
                    </span>

                    {hasLinkedInventory && (
                      <span
                        className={`text-[10px] flex items-center gap-1 font-medium ${
                          isLowStock ? 'text-rose-700 font-bold' : 'text-stone-400'
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
  );
};
