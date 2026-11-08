-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Users with PIN-based authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    pin_code VARCHAR(10) UNIQUE NOT NULL,
    role_id INT REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Inventory Items
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

-- 5. Menu Items (Linked to Category & Inventory Item)
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
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

-- 7. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

-- 9. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card')),
    amount_paid DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100),
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Automated Stock Trigger
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

-- 11. Enable Row Level Security (RLS) & Permissive Prototype Policies
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
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

    DROP POLICY IF EXISTS "Enable all access for prototype on invoices" ON invoices;
    CREATE POLICY "Enable all access for prototype on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on invoice_items" ON invoice_items;
    CREATE POLICY "Enable all access for prototype on invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Enable all access for prototype on payments" ON payments;
    CREATE POLICY "Enable all access for prototype on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 12. Seed Reference Data
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

-- Seed Categories
INSERT INTO categories (id, name, type) VALUES
(1, 'Cocktails & Spirits', 'alcohol'),
(2, 'Draft & Bottled Beers', 'alcohol'),
(3, 'Wines', 'alcohol'),
(4, 'Appetizers & Starters', 'food'),
(5, 'Mains & Grill', 'food'),
(6, 'Non-Alcoholic Beverages', 'beverage')
ON CONFLICT (id) DO NOTHING;

-- Seed Inventory Items
INSERT INTO inventory_items (id, name, unit, current_stock, min_stock_threshold) VALUES
('a0000000-0000-0000-0000-000000000001', 'Grey Goose Vodka 750ml', 'Bottles', 24.00, 5.00),
('a0000000-0000-0000-0000-000000000002', 'Bombay Sapphire Gin 750ml', 'Bottles', 18.00, 4.00),
('a0000000-0000-0000-0000-000000000003', 'Craft IPA Keg 50L', 'Kegs', 6.00, 2.00),
('a0000000-0000-0000-0000-000000000004', 'Cabernet Sauvignon 750ml', 'Bottles', 32.00, 6.00),
('a0000000-0000-0000-0000-000000000005', 'Tonic Water Cans 250ml', 'Cans', 120.00, 24.00),
('a0000000-0000-0000-0000-000000000006', 'Angus Beef Patties', 'Units', 85.00, 20.00),
('a0000000-0000-0000-0000-000000000007', 'Brioche Buns', 'Units', 90.00, 20.00),
('a0000000-0000-0000-0000-000000000008', 'Chicken Wings (Raw)', 'Kg', 35.50, 10.00),
('a0000000-0000-0000-0000-000000000009', 'Truffle Fries (Frozen)', 'Kg', 42.00, 10.00),
('a0000000-0000-0000-0000-000000000010', 'Espresso Beans Roast', 'Kg', 15.00, 3.00)
ON CONFLICT (id) DO NOTHING;

-- Seed Menu Items
INSERT INTO menu_items (id, category_id, name, price, is_available, inventory_item_id) VALUES
('b0000000-0000-0000-0000-000000000001', 1, 'Classic Martini', 14.50, true, 'a0000000-0000-0000-0000-000000000001'),
('b0000000-0000-0000-0000-000000000002', 1, 'Sapphire Gin & Tonic', 12.00, true, 'a0000000-0000-0000-0000-000000000002'),
('b0000000-0000-0000-0000-000000000003', 1, 'Double Vodka Neat', 16.00, true, 'a0000000-0000-0000-0000-000000000001'),
('b0000000-0000-0000-0000-000000000004', 2, 'Craft IPA Pint', 8.50, true, 'a0000000-0000-0000-0000-000000000003'),
('b0000000-0000-0000-0000-000000000005', 3, 'Cabernet Sauvignon (Glass)', 11.00, true, 'a0000000-0000-0000-0000-000000000004'),
('b0000000-0000-0000-0000-000000000006', 3, 'Cabernet Sauvignon (Bottle)', 48.00, true, 'a0000000-0000-0000-0000-000000000004'),
('b0000000-0000-0000-0000-000000000007', 4, 'Crispy Buffalo Wings (8pcs)', 13.50, true, 'a0000000-0000-0000-0000-000000000008'),
('b0000000-0000-0000-0000-000000000008', 4, 'Parmesan Truffle Fries', 9.50, true, 'a0000000-0000-0000-0000-000000000009'),
('b0000000-0000-0000-0000-000000000009', 5, 'Prime Angus Smash Burger', 17.50, true, 'a0000000-0000-0000-0000-000000000006'),
('b0000000-0000-0000-0000-000000000010', 5, 'Double Bacon Cheeseburger', 21.00, true, 'a0000000-0000-0000-0000-000000000006'),
('b0000000-0000-0000-0000-000000000011', 6, 'Double Shot Espresso', 4.00, true, 'a0000000-0000-0000-0000-000000000010'),
('b0000000-0000-0000-0000-000000000012', 6, 'Artisanal Cold Brew', 5.50, true, 'a0000000-0000-0000-0000-000000000010')
ON CONFLICT (id) DO NOTHING;
