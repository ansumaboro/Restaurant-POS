-- ============================================================================
-- Samsara Bar and Restaurant — Production POS & Inventory Schema
-- Single Unified Pass (All tables, foreign keys, triggers & reference data)
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Users with PIN-based quick authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    pin_code VARCHAR(10) UNIQUE NOT NULL,
    role_id INT REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Inventory Items (Raw Stock Ingredients & Packaged Goods)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_stock_threshold DECIMAL(10,2) DEFAULT 0
);

-- 4. Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('food', 'beverage', 'alcohol', 'other'))
);

-- 5. Menu Items (Linked to Category & Raw Inventory Ingredient)
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    is_veg BOOLEAN DEFAULT NULL,
    sub_category VARCHAR(50),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL
);

-- 6. Stock Logs (Purchases and Audit Corrections)
CREATE TABLE IF NOT EXISTS stock_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    change_quantity DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'audit_correction')),
    notes TEXT,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Restaurant Tables (Floor Plan for Dine-In & Open Tabs)
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number VARCHAR(50) UNIQUE NOT NULL,
    section VARCHAR(50) DEFAULT 'Main Dining',
    seating_capacity INT DEFAULT 4,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Invoices (Settled Bills & Active Table Tabs)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Invoice Items (Order Lines)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

-- 10. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card')),
    amount_paid DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100),
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Automated Stock Trigger
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory_items
    SET current_stock = current_stock + NEW.change_quantity
    WHERE id = NEW.inventory_item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_stock ON stock_logs;
CREATE TRIGGER trg_update_stock
AFTER INSERT ON stock_logs
FOR EACH ROW
EXECUTE FUNCTION update_inventory_stock();

-- 12. Enable Row Level Security (RLS) & Permissive Prototype Policies
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Enable all access for prototype on roles" ON roles;
    CREATE POLICY "Enable all access for prototype on roles" ON roles FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on users" ON users;
    CREATE POLICY "Enable all access for prototype on users" ON users FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on inventory_items" ON inventory_items;
    CREATE POLICY "Enable all access for prototype on inventory_items" ON inventory_items FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on categories" ON categories;
    CREATE POLICY "Enable all access for prototype on categories" ON categories FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on menu_items" ON menu_items;
    CREATE POLICY "Enable all access for prototype on menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on stock_logs" ON stock_logs;
    CREATE POLICY "Enable all access for prototype on stock_logs" ON stock_logs FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on restaurant_tables" ON restaurant_tables;
    CREATE POLICY "Enable all access for prototype on restaurant_tables" ON restaurant_tables FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on invoices" ON invoices;
    CREATE POLICY "Enable all access for prototype on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on invoice_items" ON invoice_items;
    CREATE POLICY "Enable all access for prototype on invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on payments" ON payments;
    CREATE POLICY "Enable all access for prototype on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 13. Seed Reference Data

-- Roles
INSERT INTO roles (name) VALUES 
('Manager'),
('Cashier'),
('Bartender'),
('Storekeeper')
ON CONFLICT (name) DO NOTHING;

-- Seed Users (Default PINs for quick testing: 1234, 5678, 9999, 0000)
INSERT INTO users (name, pin_code, role_id, is_active)
SELECT 'Alexander Wright (Manager)', '1234', id, true FROM roles WHERE name = 'Manager'
ON CONFLICT (pin_code) DO NOTHING;

INSERT INTO users (name, pin_code, role_id, is_active)
SELECT 'Sarah Miller (Cashier)', '5678', id, true FROM roles WHERE name = 'Cashier'
ON CONFLICT (pin_code) DO NOTHING;

INSERT INTO users (name, pin_code, role_id, is_active)
SELECT 'Marcus Vance (Bartender)', '9999', id, true FROM roles WHERE name = 'Bartender'
ON CONFLICT (pin_code) DO NOTHING;

INSERT INTO users (name, pin_code, role_id, is_active)
SELECT 'Elena Rostova (Storekeeper)', '0000', id, true FROM roles WHERE name = 'Storekeeper'
ON CONFLICT (pin_code) DO NOTHING;

-- Seed Restaurant Tables (Samsara Bar & Restaurant Floor Plan)
INSERT INTO restaurant_tables (table_number, section, seating_capacity, status) VALUES
('T-01', 'Indoor Dining', 2, 'available'),
('T-02', 'Indoor Dining', 4, 'available'),
('T-03', 'Indoor Dining', 4, 'available'),
('T-04', 'Indoor Dining', 6, 'available'),
('T-05', 'Indoor Dining', 8, 'available'),
('BAR-01', 'Bar Counter', 2, 'available'),
('BAR-02', 'Bar Counter', 2, 'available'),
('BAR-03', 'Bar Counter', 2, 'available'),
('OUT-01', 'Outdoor Terrace', 4, 'available'),
('OUT-02', 'Outdoor Terrace', 4, 'available'),
('OUT-03', 'Outdoor Terrace', 6, 'available')
ON CONFLICT (table_number) DO NOTHING;

-- Seed Inventory Items
INSERT INTO inventory_items (id, name, unit, current_stock, min_stock_threshold) VALUES
('a0000000-0000-0000-0000-000000000020', 'Fresh Malai Paneer', 'Kg', 25.00, 5.00),
('a0000000-0000-0000-0000-000000000021', 'Raw Chicken Tikka Portions', 'Kg', 45.00, 10.00),
('a0000000-0000-0000-0000-000000000022', 'Minced Chicken Keema', 'Kg', 20.00, 5.00),
('a0000000-0000-0000-0000-000000000023', 'Basmati Rice Premium', 'Kg', 60.00, 15.00),
('a0000000-0000-0000-0000-000000000024', 'Tandoori Atta / Dough', 'Kg', 80.00, 20.00),
('a0000000-0000-0000-0000-000000000025', 'Peanuts & Masala Mix', 'Kg', 30.00, 8.00),
('a0000000-0000-0000-0000-000000000026', 'Potatoes (Aloo)', 'Kg', 75.00, 15.00),
('a0000000-0000-0000-0000-000000000027', 'Fresh Baby Corn & Veggies', 'Kg', 25.00, 5.00),
('a0000000-0000-0000-0000-000000000028', 'Domestic Premium Beer (330ml)', 'Bottles', 72.00, 12.00),
('a0000000-0000-0000-0000-000000000029', 'London Dry Gin 750ml', 'Bottles', 18.00, 4.00),
('a0000000-0000-0000-0000-000000000030', 'Gold Tequila 750ml', 'Bottles', 14.00, 3.00),
('a0000000-0000-0000-0000-000000000031', 'Fresh Dahi (Curd) for Raita', 'Kg', 16.00, 4.00),
('a0000000-0000-0000-0000-000000000032', 'Papadum & Chutneys Kit', 'Packs', 50.00, 10.00),
('a0000000-0000-0000-0000-000000000033', 'Artisan Gyoza Sheets', 'Packs', 40.00, 8.00)
ON CONFLICT (id) DO NOTHING;

-- Seed Categories
INSERT INTO categories (id, name, type) VALUES
(1, 'Chakhna / Bar Bites', 'food'),
(2, 'Snacks & Chaat', 'food'),
(3, 'Accompaniments', 'food'),
(4, 'Veg Starters', 'food'),
(5, 'Veg Starters (Tandoor)', 'food'),
(6, 'Non-Veg Starters', 'food'),
(7, 'Non-Veg Starters (Tandoor)', 'food'),
(8, 'Fusion / Dumplings', 'food'),
(9, 'Non-Veg Main Course', 'food'),
(10, 'Continental / Fusion Main', 'food'),
(11, 'Combo Meals', 'food'),
(12, 'Indo-Chinese Main Course', 'food'),
(13, 'Tandoori Breads', 'food'),
(14, 'Tandoori Breads / Heavy', 'food'),
(15, 'Rice Dishes', 'food'),
(16, 'Indo-Chinese Rice', 'food'),
(17, 'Bar Selection', 'alcohol'),
(18, 'Cocktails', 'alcohol'),
(19, 'Signature Cocktails', 'alcohol'),
(20, 'Refreshments / Sides', 'beverage')
ON CONFLICT (id) DO NOTHING;

-- Seed Samsara Menu Items (with is_veg: TRUE for Veg, FALSE for Non-Veg, NULL for Alcohol/Beverages)
INSERT INTO menu_items (id, category_id, name, price, is_available, is_veg, sub_category, inventory_item_id) VALUES
('c0000000-0000-0000-0000-000000000001', 1, 'Masala Peanuts', 120.00, true, true, 'Bar Bites', 'a0000000-0000-0000-0000-000000000025'),
('c0000000-0000-0000-0000-000000000002', 1, 'Papadum Platter (with Chutneys)', 90.00, true, true, 'Bar Bites', 'a0000000-0000-0000-0000-000000000032'),
('c0000000-0000-0000-0000-000000000003', 2, 'Veg Cutlet', 285.00, true, true, 'Snacks', 'a0000000-0000-0000-0000-000000000026'),
('c0000000-0000-0000-0000-000000000004', 3, 'Kachumber Salad', 130.00, true, true, 'Sides', NULL),
('c0000000-0000-0000-0000-000000000005', 4, 'Honey Chilli Potato', 280.00, true, true, 'Starters', 'a0000000-0000-0000-0000-000000000026'),
('c0000000-0000-0000-0000-000000000006', 4, 'Crispy Chilli Baby Corn', 330.00, true, true, 'Starters', 'a0000000-0000-0000-0000-000000000027'),
('c0000000-0000-0000-0000-000000000007', 5, 'Paneer Tikka', 430.00, true, true, 'Tandoor', 'a0000000-0000-0000-0000-000000000020'),
('c0000000-0000-0000-0000-000000000008', 5, 'Tandoori Bharwan Aloo', 430.00, true, true, 'Tandoor', 'a0000000-0000-0000-0000-000000000026'),
('c0000000-0000-0000-0000-000000000009', 8, 'Veg Gyoza (6 Pcs)', 220.00, true, true, 'Dumplings', 'a0000000-0000-0000-0000-000000000033'),
('c0000000-0000-0000-0000-000000000010', 6, 'Chicken Masala Tikka', 390.00, true, false, 'Starters', 'a0000000-0000-0000-0000-000000000021'),
('c0000000-0000-0000-0000-000000000011', 7, 'Tandoori Chicken', 345.00, true, false, 'Tandoor', 'a0000000-0000-0000-0000-000000000021'),
('c0000000-0000-0000-0000-000000000012', 6, 'Kalmi Kebab', 470.00, true, false, 'Starters', 'a0000000-0000-0000-0000-000000000021'),
('c0000000-0000-0000-0000-000000000013', 6, 'Fried Chicken', 476.00, true, false, 'Starters', 'a0000000-0000-0000-0000-000000000021'),
('c0000000-0000-0000-0000-000000000014', 8, 'Chicken Gyoza (6 Pcs)', 275.00, true, false, 'Dumplings', 'a0000000-0000-0000-0000-000000000033'),
('c0000000-0000-0000-0000-000000000015', 9, 'Chicken Tikka Takatak', 540.00, true, false, 'Main Course', 'a0000000-0000-0000-0000-000000000021'),
('c0000000-0000-0000-0000-000000000016', 10, 'Chicken Stroganoff', 572.00, true, false, 'Continental', 'a0000000-0000-0000-0000-000000000021'),
('c0000000-0000-0000-0000-000000000017', 11, 'Chilli Chicken with Curry Combo', 460.00, true, false, 'Combo', 'a0000000-0000-0000-0000-000000000021'),
('c0000000-0000-0000-0000-000000000018', 12, 'Cheese Chilli with Gravy', 505.00, true, true, 'Indo-Chinese', 'a0000000-0000-0000-0000-000000000020'),
('c0000000-0000-0000-0000-000000000019', 12, 'Mushroom Chilli with Gravy', 555.00, true, true, 'Indo-Chinese', 'a0000000-0000-0000-0000-000000000027'),
('c0000000-0000-0000-0000-000000000020', 13, 'Rumali Roti', 20.00, true, true, 'Breads', 'a0000000-0000-0000-0000-000000000024'),
('c0000000-0000-0000-0000-000000000021', 13, 'Tandoori Roti', 80.00, true, true, 'Breads', 'a0000000-0000-0000-0000-000000000024'),
('c0000000-0000-0000-0000-000000000022', 13, 'Kandhari Naan', 130.00, true, true, 'Breads', 'a0000000-0000-0000-0000-000000000024'),
('c0000000-0000-0000-0000-000000000023', 14, 'Chicken Keema Naan', 475.00, true, false, 'Breads', 'a0000000-0000-0000-0000-000000000022'),
('c0000000-0000-0000-0000-000000000024', 15, 'Veg Pulao', 300.00, true, true, 'Rice', 'a0000000-0000-0000-0000-000000000023'),
('c0000000-0000-0000-0000-000000000025', 16, 'Chicken Fried Rice', 312.00, true, false, 'Rice', 'a0000000-0000-0000-0000-000000000023'),
('c0000000-0000-0000-0000-000000000026', 17, 'Domestic Premium Beer (330ml pint)', 220.00, true, NULL, 'Beer', 'a0000000-0000-0000-0000-000000000028'),
('c0000000-0000-0000-0000-000000000027', 18, 'Classic Gin & Tonic', 390.00, true, NULL, 'Cocktails', 'a0000000-0000-0000-0000-000000000029'),
('c0000000-0000-0000-0000-000000000028', 19, 'Tamarind Margarita', 450.00, true, NULL, 'Cocktails', 'a0000000-0000-0000-0000-000000000030'),
('c0000000-0000-0000-0000-000000000029', 20, 'Boondi Raita', 220.00, true, true, 'Sides', 'a0000000-0000-0000-0000-000000000031')
ON CONFLICT (id) DO NOTHING;
