# Samsara Bar and Restaurant — Commercial POS Terminal

An enterprise-grade, ultra-streamlined, three-screen Point of Sale (POS) and inventory management application designed for bars, counters, and restaurants. Built strictly for zero-friction speed and daily operational agility.

---

## 🚀 Technology Stack
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (commercial slate theme with zero visual fluff)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with localStorage persistence
- **Routing & Guards**: [React Router DOM](https://reactrouter.com/)
- **Database & RLS**: [Supabase](https://supabase.com/) (PostgreSQL with automated stock triggers)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🏛️ Architecture & Modularity

The application maintains strict separation of concerns between presentation and backend data layers:

```
/src
  ├── assets/            # Static media and brand assets
  ├── components/        # Reusable UI primitives (PinPad, NavigationHeader, ReceiptModal, RecentBillsModal)
  ├── layouts/           # MasterLayout with persistent top bar & lock controls
  ├── pages/             # 4 Core Screens:
  │   ├── Login.tsx          # PIN-based quick login with hardware rate limiting
  │   ├── CounterBilling.tsx # High-speed counter checkout with active cart & tender desk
  │   ├── StockIn.tsx        # Supplier arrival entry with automatic stock increment trigger
  │   └── StockAudit.tsx     # Physical reconciliation with live variance math & adjustments
  ├── router/            # React Router setup with ProtectedRoute authentication guards
  ├── services/          # Supabase API abstraction layer:
  │   ├── supabaseClient.ts  # Supabase client singleton
  │   ├── authService.ts     # PIN verification against users table joined with roles
  │   ├── billingService.ts  # Catalog queries, invoice/item/payment transactions, sales logs
  │   └── inventoryService.ts# Inventory fetch, stock-in arrival, audit variance corrections
  ├── store/             # Zustand state stores:
  │   ├── authStore.ts       # PIN rate limiting (30s lock on 3 failures) & user session
  │   ├── billingCartStore.ts# Cart line items, discounts, taxes, tender & change calculations
  │   └── inventoryStore.ts  # Real-time inventory sync & audit logs
  ├── types/             # TypeScript definitions matching Supabase PostgreSQL schema
  └── utils/             # Formatters for currency ($), timestamps, and audit variances
```

---

## 🔐 1. Authentication & PIN-Based Quick Login (`/login`)
- **Minimal Masked Input**: Numeric input displaying clean masked PIN dots (`• • • •`). No profile dropdowns or cumbersome email/password forms.
- **Hybrid Input Support**: Custom touch-optimized 3×3 keypad (`1–9`, `0`, `CLR`, `DEL`) coupled with a global physical keyboard listener (`keydown`) for barcode scanners, physical 10-key numpads, and desktop keyboards.
- **Hardware Rate Limiting**: If 3 consecutive incorrect PIN attempts occur, the PIN pad automatically locks for **30 seconds** with an active live countdown timer.
- **Session Persistence**: Backed by Zustand persisted in `localStorage`. Page refreshes or navigation never wipe an active session.

### Default Staff PINs for Evaluation:
| Role | Staff Member | PIN | Permissions |
| :--- | :--- | :--- | :--- |
| **Manager** | Alexander Wright | `1234` | Full access across billing, stock-in, and audits |
| **Cashier** | Sarah Miller | `5678` | Counter billing, sales, tender |
| **Bartender** | Marcus Vance | `9999` | Bar sales & counter billing |
| **Storekeeper** | Elena Rostova | `0000` | Stock arrivals & inventory audits |

---

## 🖥️ 2. The Three Core Screens & Workflows

### Screen 1: Counter Billing Screen (`/billing`)
- **Fast Catalog Selection**: Search filter by name or instant category pills (`Cocktails & Spirits`, `Draft & Bottled Beers`, `Wines`, `Appetizers`, `Mains & Grill`, `Non-Alcoholic`).
- **Live Cart Operations**: Instant quantity steppers (`+` / `-`), line item deletion, subtotal calculation, 5% standard tax calculation, and optional discount adjustments.
- **Multi-Tender Desk**:
  - **CASH**: Numeric tender input with quick-cash presets (`Exact`, `+$10`, `$50`, `$100`) and live automatic **Change Due** calculation.
  - **UPI**: Instant reference/UTR tracking input.
  - **CARD**: Slip / Authorization code reference.
- **Transaction Generation**: Atomic insert into `invoices`, `invoice_items`, and `payments`.
- **Receipt & Printing**: Modal preview with printable thermal-ready bill layout (`window.print()`).
- **Audit Sales Drawer**: Click "Recent Bills" to inspect or reprint completed tickets from the current shift.

### Screen 2: Stock-In Screen (`/stock-in`)
- **Supplier Shipments**: Staff choose an item from `inventory_items` (with search and live stock counts).
- **Positive Quantity Arrival**: Enter received quantity with quick presets (`+6`, `+12`, `+24`, `+50`, `+100`).
- **Trigger-Driven Stock**: Inserts record into `stock_logs` with `transaction_type = 'purchase'`. The PostgreSQL database trigger `trg_update_stock` immediately increments `current_stock`.
- **Live Logs Table**: Displays chronological logs of recent shipments with performer and shipment notes.

### Screen 3: Stock Audit & Adjustment Screen (`/audit`)
- **Reconciliation Counts**: Select an inventory item; system displays current recorded stock.
- **Physical Count Entry**: Enter actual counted quantity on hand.
- **Live Variance Computation**:
  $$\text{Variance} = \text{Physical Count} - \text{System Stock}$$
  - **Surplus (+)**: Highlighted in emerald.
  - **Shortage (-)**: Highlighted in rose.
  - **Exact Match**: Highlighted in neutral slate.
- **Audit Adjustment**: Inserts record into `stock_logs` with `transaction_type = 'audit_correction'` and `change_quantity = variance`. The database trigger immediately adjusts `current_stock` to match physical count.
- **Audit Log History**: Real-time table of discrepancy logs with notes and auditor attribution.

---

## 🗄️ Database Schema & SQL Scripts

The complete database schema, trigger function, RLS policies, and seed data are stored in:
`supabase/schema.sql`

```sql
-- Automated Stock Trigger
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$ BEGIN UPDATE inventory_items SET current_stock = current_stock + NEW.change_quantity WHERE id = NEW.inventory_item_id; RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock
AFTER INSERT ON stock_logs
FOR EACH ROW
EXECUTE FUNCTION update_inventory_stock();
```

---

## ⚙️ Environment Configuration

In `.env`:
```env
VITE_SUPABASE_URL=https://wzhiaqicasixmbuhxysz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_yPOYJSfMO8jGMkUax2bFGA_DIp2Ih9Q
VITE_SUPABASE_ANON_KEY=sb_publishable_yPOYJSfMO8jGMkUax2bFGA_DIp2Ih9Q
```

---

## 🛠️ Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```
