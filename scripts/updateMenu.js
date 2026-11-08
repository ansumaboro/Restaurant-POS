// scripts/updateMenu.js
const url = 'https://wzhiaqicasixmbuhxysz.supabase.co/rest/v1';
const key = 'sb_publishable_yPOYJSfMO8jGMkUax2bFGA_DIp2Ih9Q';

const headers = {
  apikey: key,
  Authorization: 'Bearer ' + key,
  'Content-Type': 'application/json',
  Prefer: 'return=representation, resolution=merge-duplicates'
};

async function migrateMenu() {
  console.log('=== Step 1: Remove all existing previous menu items ===');
  // First fetch existing menu item IDs
  const existingItemsRes = await fetch(`${url}/menu_items?select=id`, { headers });
  const existingItems = await existingItemsRes.json();
  console.log(`Found ${existingItems.length} old menu items to remove.`);

  for (const item of existingItems) {
    const delRes = await fetch(`${url}/menu_items?id=eq.${item.id}`, {
      method: 'DELETE',
      headers
    });
    if (!delRes.ok) {
      console.error(`Failed to delete item ${item.id}:`, await delRes.text());
    }
  }
  console.log('Old menu items cleared successfully.');

  console.log('\n=== Step 2: Seed new inventory ingredients ===');
  const inventoryItems = [
    { id: 'a0000000-0000-0000-0000-000000000020', name: 'Fresh Malai Paneer', unit: 'Kg', current_stock: 25.0, min_stock_threshold: 5.0 },
    { id: 'a0000000-0000-0000-0000-000000000021', name: 'Raw Chicken Tikka Portions', unit: 'Kg', current_stock: 45.0, min_stock_threshold: 10.0 },
    { id: 'a0000000-0000-0000-0000-000000000022', name: 'Minced Chicken Keema', unit: 'Kg', current_stock: 20.0, min_stock_threshold: 5.0 },
    { id: 'a0000000-0000-0000-0000-000000000023', name: 'Basmati Rice Premium', unit: 'Kg', current_stock: 60.0, min_stock_threshold: 15.0 },
    { id: 'a0000000-0000-0000-0000-000000000024', name: 'Tandoori Atta / Dough', unit: 'Kg', current_stock: 80.0, min_stock_threshold: 20.0 },
    { id: 'a0000000-0000-0000-0000-000000000025', name: 'Peanuts & Masala Mix', unit: 'Kg', current_stock: 30.0, min_stock_threshold: 8.0 },
    { id: 'a0000000-0000-0000-0000-000000000026', name: 'Potatoes (Aloo)', unit: 'Kg', current_stock: 75.0, min_stock_threshold: 15.0 },
    { id: 'a0000000-0000-0000-0000-000000000027', name: 'Fresh Baby Corn & Veggies', unit: 'Kg', current_stock: 25.0, min_stock_threshold: 5.0 },
    { id: 'a0000000-0000-0000-0000-000000000028', name: 'Domestic Premium Beer (330ml)', unit: 'Bottles', current_stock: 72.0, min_stock_threshold: 12.0 },
    { id: 'a0000000-0000-0000-0000-000000000029', name: 'London Dry Gin 750ml', unit: 'Bottles', current_stock: 18.0, min_stock_threshold: 4.0 },
    { id: 'a0000000-0000-0000-0000-000000000030', name: 'Gold Tequila 750ml', unit: 'Bottles', current_stock: 14.0, min_stock_threshold: 3.0 },
    { id: 'a0000000-0000-0000-0000-000000000031', name: 'Fresh Dahi (Curd) for Raita', unit: 'Kg', current_stock: 16.0, min_stock_threshold: 4.0 },
    { id: 'a0000000-0000-0000-0000-000000000032', name: 'Papadum & Chutneys Kit', unit: 'Packs', current_stock: 50.0, min_stock_threshold: 10.0 },
    { id: 'a0000000-0000-0000-0000-000000000033', name: 'Artisan Gyoza Sheets', unit: 'Packs', current_stock: 40.0, min_stock_threshold: 8.0 }
  ];

  for (const inv of inventoryItems) {
    const invRes = await fetch(`${url}/inventory_items`, {
      method: 'POST',
      headers,
      body: JSON.stringify(inv)
    });
    if (!invRes.ok) {
      console.log(`Inventory note for ${inv.name}: ${invRes.status}`);
    }
  }
  console.log('Inventory items populated.');

  console.log('\n=== Step 3: Populate New Menu Categories ===');
  const categories = [
    { id: 1, name: 'Chakhna / Bar Bites', type: 'food' },
    { id: 2, name: 'Snacks & Chaat', type: 'food' },
    { id: 3, name: 'Accompaniments', type: 'food' },
    { id: 4, name: 'Veg Starters', type: 'food' },
    { id: 5, name: 'Veg Starters (Tandoor)', type: 'food' },
    { id: 6, name: 'Non-Veg Starters', type: 'food' },
    { id: 7, name: 'Non-Veg Starters (Tandoor)', type: 'food' },
    { id: 8, name: 'Fusion / Dumplings', type: 'food' },
    { id: 9, name: 'Non-Veg Main Course', type: 'food' },
    { id: 10, name: 'Continental / Fusion Main', type: 'food' },
    { id: 11, name: 'Combo Meals', type: 'food' },
    { id: 12, name: 'Indo-Chinese Main Course', type: 'food' },
    { id: 13, name: 'Tandoori Breads', type: 'food' },
    { id: 14, name: 'Tandoori Breads / Heavy', type: 'food' },
    { id: 15, name: 'Rice Dishes', type: 'food' },
    { id: 16, name: 'Indo-Chinese Rice', type: 'food' },
    { id: 17, name: 'Bar Selection', type: 'alcohol' },
    { id: 18, name: 'Cocktails', type: 'alcohol' },
    { id: 19, name: 'Signature Cocktails', type: 'alcohol' },
    { id: 20, name: 'Refreshments / Sides', type: 'beverage' }
  ];

  for (const cat of categories) {
    const catRes = await fetch(`${url}/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify(cat)
    });
    if (!catRes.ok) {
      // If category exists, update it
      await fetch(`${url}/categories?id=eq.${cat.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: cat.name, type: cat.type })
      });
    }
  }
  console.log(`Configured ${categories.length} categories.`);

  console.log('\n=== Step 4: Insert All New Menu Items ===');
  const newMenuItems = [
    // 🍢 Chakhna & Bar Bites (Finger Foods)
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      category_id: 1,
      name: 'Masala Peanuts',
      price: 120.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000025'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      category_id: 1,
      name: 'Papadum Platter (with Chutneys)',
      price: 90.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000032'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      category_id: 2,
      name: 'Veg Cutlet',
      price: 285.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000026'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      category_id: 3,
      name: 'Kachumber Salad',
      price: 130.00,
      is_available: true,
      inventory_item_id: null
    },

    // 🍗 Vegetarian Starters
    {
      id: 'c0000000-0000-0000-0000-000000000005',
      category_id: 4,
      name: 'Honey Chilli Potato',
      price: 280.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000026'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000006',
      category_id: 4,
      name: 'Crispy Chilli Baby Corn',
      price: 330.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000027'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000007',
      category_id: 5,
      name: 'Paneer Tikka',
      price: 430.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000020'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000008',
      category_id: 5,
      name: 'Tandoori Bharwan Aloo',
      price: 430.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000026'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000009',
      category_id: 8,
      name: 'Veg Gyoza (6 Pcs)',
      price: 220.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000033'
    },

    // 🥩 Non-Vegetarian Starters
    {
      id: 'c0000000-0000-0000-0000-000000000010',
      category_id: 6,
      name: 'Chicken Masala Tikka',
      price: 390.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000021'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000011',
      category_id: 7,
      name: 'Tandoori Chicken',
      price: 345.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000021'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000012',
      category_id: 6,
      name: 'Kalmi Kebab',
      price: 470.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000021'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000013',
      category_id: 6,
      name: 'Fried Chicken',
      price: 476.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000021'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000014',
      category_id: 8,
      name: 'Chicken Gyoza (6 Pcs)',
      price: 275.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000033'
    },

    // 🍛 Main Course (Curries & Combos)
    {
      id: 'c0000000-0000-0000-0000-000000000015',
      category_id: 9,
      name: 'Chicken Tikka Takatak',
      price: 540.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000021'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000016',
      category_id: 10,
      name: 'Chicken Stroganoff',
      price: 572.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000021'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000017',
      category_id: 11,
      name: 'Chilli Chicken with Curry Combo',
      price: 460.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000021'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000018',
      category_id: 12,
      name: 'Cheese Chilli with Gravy',
      price: 505.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000020'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000019',
      category_id: 12,
      name: 'Mushroom Chilli with Gravy',
      price: 555.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000027'
    },

    // 🫓 Breads & Rice
    {
      id: 'c0000000-0000-0000-0000-000000000020',
      category_id: 13,
      name: 'Rumali Roti',
      price: 20.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000024'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000021',
      category_id: 13,
      name: 'Tandoori Roti',
      price: 80.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000024'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000022',
      category_id: 13,
      name: 'Kandhari Naan',
      price: 130.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000024'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000023',
      category_id: 14,
      name: 'Chicken Keema Naan',
      price: 475.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000022'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000024',
      category_id: 15,
      name: 'Veg Pulao',
      price: 300.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000023'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000025',
      category_id: 16,
      name: 'Chicken Fried Rice',
      price: 312.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000023'
    },

    // 🍹 Drinks & Beverages (Standard Bar Estimates)
    {
      id: 'c0000000-0000-0000-0000-000000000026',
      category_id: 17,
      name: 'Domestic Premium Beer (330ml pint)',
      price: 220.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000028'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000027',
      category_id: 18,
      name: 'Classic Gin & Tonic',
      price: 390.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000029'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000028',
      category_id: 19,
      name: 'Tamarind Margarita',
      price: 450.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000030'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000029',
      category_id: 20,
      name: 'Boondi Raita',
      price: 220.00,
      is_available: true,
      inventory_item_id: 'a0000000-0000-0000-0000-000000000031'
    }
  ];

  const mRes = await fetch(`${url}/menu_items`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newMenuItems)
  });

  if (!mRes.ok) {
    console.error('Failed to insert menu items:', await mRes.text());
  } else {
    const data = await mRes.json();
    console.log(`Successfully added ${data.length} new Indian restaurant & bar menu items!`);
  }

  console.log('\n=== Menu Migration Finished Successfully ===');
}

migrateMenu().catch(console.error);
