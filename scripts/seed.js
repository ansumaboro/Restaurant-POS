// scripts/seed.js
const url = 'https://wzhiaqicasixmbuhxysz.supabase.co/rest/v1';
const key = 'sb_publishable_yPOYJSfMO8jGMkUax2bFGA_DIp2Ih9Q';

const headers = {
  apikey: key,
  Authorization: 'Bearer ' + key,
  'Content-Type': 'application/json',
  Prefer: 'return=representation, resolution=ignore-duplicates'
};

async function seed() {
  console.log('--- Starting Database Seeding ---');

  // 1. Users
  const users = [
    { name: 'Alexander Wright (Manager)', pin_code: '1234', role_id: 1, is_active: true },
    { name: 'Sarah Miller (Cashier)', pin_code: '5678', role_id: 2, is_active: true },
    { name: 'Marcus Vance (Bartender)', pin_code: '9999', role_id: 3, is_active: true },
    { name: 'Elena Rostova (Storekeeper)', pin_code: '0000', role_id: 4, is_active: true },
  ];

  const uRes = await fetch(`${url}/users`, { method: 'POST', headers, body: JSON.stringify(users) });
  console.log('Users seeded:', uRes.status);

  // 2. Categories
  const categories = [
    { id: 1, name: 'Cocktails & Spirits', type: 'alcohol' },
    { id: 2, name: 'Draft & Bottled Beers', type: 'alcohol' },
    { id: 3, name: 'Wines & Champagne', type: 'alcohol' },
    { id: 4, name: 'Appetizers & Starters', type: 'food' },
    { id: 5, name: 'Mains & Grill', type: 'food' },
    { id: 6, name: 'Non-Alcoholic Beverages', type: 'beverage' }
  ];
  const cRes = await fetch(`${url}/categories`, { method: 'POST', headers, body: JSON.stringify(categories) });
  console.log('Categories seeded:', cRes.status);

  // 3. Inventory Items
  const inventory = [
    { id: 'a0000000-0000-0000-0000-000000000001', name: 'Grey Goose Vodka 750ml', unit: 'Bottles', current_stock: 24.0, min_stock_threshold: 5.0 },
    { id: 'a0000000-0000-0000-0000-000000000002', name: 'Bombay Sapphire Gin 750ml', unit: 'Bottles', current_stock: 18.0, min_stock_threshold: 4.0 },
    { id: 'a0000000-0000-0000-0000-000000000003', name: 'Craft IPA Keg 50L', unit: 'Kegs', current_stock: 6.0, min_stock_threshold: 2.0 },
    { id: 'a0000000-0000-0000-0000-000000000004', name: 'Cabernet Sauvignon 750ml', unit: 'Bottles', current_stock: 32.0, min_stock_threshold: 6.0 },
    { id: 'a0000000-0000-0000-0000-000000000005', name: 'Tonic Water Cans 250ml', unit: 'Cans', current_stock: 120.0, min_stock_threshold: 24.0 },
    { id: 'a0000000-0000-0000-0000-000000000006', name: 'Angus Beef Patties', unit: 'Units', current_stock: 85.0, min_stock_threshold: 20.0 },
    { id: 'a0000000-0000-0000-0000-000000000007', name: 'Brioche Burger Buns', unit: 'Units', current_stock: 90.0, min_stock_threshold: 20.0 },
    { id: 'a0000000-0000-0000-0000-000000000008', name: 'Fresh Chicken Wings', unit: 'Kg', current_stock: 35.5, min_stock_threshold: 10.0 },
    { id: 'a0000000-0000-0000-0000-000000000009', name: 'Truffle Fries (Frozen)', unit: 'Kg', current_stock: 42.0, min_stock_threshold: 10.0 },
    { id: 'a0000000-0000-0000-0000-000000000010', name: 'Signature Espresso Beans', unit: 'Kg', current_stock: 15.0, min_stock_threshold: 3.0 }
  ];
  const iRes = await fetch(`${url}/inventory_items`, { method: 'POST', headers, body: JSON.stringify(inventory) });
  console.log('Inventory seeded:', iRes.status);

  // 4. Menu Items
  const menuItems = [
    { id: 'b0000000-0000-0000-0000-000000000001', category_id: 1, name: 'Classic Dry Martini', price: 14.50, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000001' },
    { id: 'b0000000-0000-0000-0000-000000000002', category_id: 1, name: 'Bombay Sapphire Tonic', price: 12.00, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000002' },
    { id: 'b0000000-0000-0000-0000-000000000003', category_id: 1, name: 'Vodka Rocks / Neat', price: 11.00, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000001' },
    { id: 'b0000000-0000-0000-0000-000000000004', category_id: 2, name: 'Craft IPA Pint (500ml)', price: 8.50, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000003' },
    { id: 'b0000000-0000-0000-0000-000000000005', category_id: 3, name: 'Cabernet Sauvignon Glass', price: 11.50, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000004' },
    { id: 'b0000000-0000-0000-0000-000000000006', category_id: 3, name: 'Cabernet Sauvignon Bottle', price: 48.00, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000004' },
    { id: 'b0000000-0000-0000-0000-000000000007', category_id: 4, name: 'Crispy Buffalo Wings (8pcs)', price: 13.50, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000008' },
    { id: 'b0000000-0000-0000-0000-000000000008', category_id: 4, name: 'Truffle Parmesan Fries', price: 9.50, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000009' },
    { id: 'b0000000-0000-0000-0000-000000000009', category_id: 5, name: 'Prime Angus Burger', price: 17.50, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000006' },
    { id: 'b0000000-0000-0000-0000-000000000010', category_id: 5, name: 'Double Bacon Cheeseburger', price: 21.00, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000006' },
    { id: 'b0000000-0000-0000-0000-000000000011', category_id: 6, name: 'Espresso Double Shot', price: 4.00, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000010' },
    { id: 'b0000000-0000-0000-0000-000000000012', category_id: 6, name: 'Nitro Cold Brew Coffee', price: 5.50, is_available: true, inventory_item_id: 'a0000000-0000-0000-0000-000000000010' }
  ];
  const mRes = await fetch(`${url}/menu_items`, { method: 'POST', headers, body: JSON.stringify(menuItems) });
  console.log('Menu Items seeded:', mRes.status);

  console.log('--- Seeding Completed Successfully! ---');
}

seed().catch(console.error);
