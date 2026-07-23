// ============================================================================
// repository.js — business logic ทั้งหมด เขียนครั้งเดียวใช้ได้กับทั้ง memoryAdapter
// (เทส/dev) และ indexedDBAdapter (เบราว์เซอร์จริง) เพราะทั้งคู่มี API เดียวกัน
//
// จุดสำคัญ: ทุกฟังก์ชันที่ต้องแก้หลายตารางพร้อมกัน (เช่น เริ่มผลิต = ตัดสต็อก + สร้าง
// activity + log transaction) ใช้ adapter.transaction(...) ครอบไว้เสมอ ถ้าเช็คสต็อก
// ไม่พอแล้ว throw กลางทาง จะ "rollback ทั้งหมด" ไม่มีทางตัดสต็อกไปครึ่งเดียว
// (พฤติกรรมเดียวกับ SQLite transaction ใน schema.sql)
// ============================================================================

import { SCHEMA, DEFAULT_ITEM_CATEGORIES } from './schema.js';

export function createRepository(adapter) {
  const nowISO = () => new Date().toISOString();

  async function getInventoryRow(tx, accountId, itemId) {
    const rows = await tx.getByIndex('inventory', 'accountId', accountId);
    return rows.find((r) => r.itemId === itemId);
  }

  async function adjustInventory(tx, { accountId, itemId, changeQty, reason, relatedTable = null, relatedId = null, allowNegative = false }) {
    const row = await getInventoryRow(tx, accountId, itemId);
    const currentQty = row ? row.quantity : 0;
    const newQty = currentQty + changeQty;
    if (!allowNegative && newQty < 0) {
      throw new Error(
        `สต็อกไม่พอ: account=${accountId} item=${itemId} (มีอยู่ ${currentQty}, ต้องการ ${-changeQty})`
      );
    }
    if (row) {
      await tx.put('inventory', { ...row, quantity: newQty, updatedAt: nowISO() });
    } else {
      await tx.add('inventory', { accountId, itemId, quantity: newQty, lowStockThreshold: null, updatedAt: nowISO() });
    }
    await tx.add('inventoryTransactions', {
      accountId, itemId, changeQty, reason, relatedTable, relatedId, createdAt: nowISO(),
    });
  }

  // -------------------- Accounts --------------------
  async function createAccount({ name, level = 1, avatarColor = '#5566C4', avatarBg = '#D3D8F5', townUnlocked = false, notes = null }) {
    if (!name || !name.trim()) throw new Error('ต้องระบุชื่อบัญชี');
    const createdAt = nowISO();
    return adapter.add('accounts', {
      name, level, avatarColor, avatarBg, townUnlocked: !!townUnlocked, notes,
      createdAt, updatedAt: createdAt,
    });
  }
  async function listAccounts() {
    return adapter.getAll('accounts');
  }
  async function updateAccount(id, patch) {
    const acc = await adapter.get('accounts', id);
    if (!acc) throw new Error(`ไม่พบบัญชี id=${id}`);
    return adapter.put('accounts', { ...acc, ...patch, id, updatedAt: nowISO() });
  }
  async function deleteAccount(id) {
    const cascadeTables = [
      'activities', 'eventProduction', 'boatTruckOrders', 'boatTruckOrderItems',
      'townOrders', 'townOrderItems', 'roadsideShopListings', 'inventory', 'inventoryTransactions',
    ];
    return adapter.transaction(['accounts', ...cascadeTables], async (tx) => {
      // ลบ order items ก่อนโดยหา orderId ที่เป็นของบัญชีนี้
      const boatOrders = await tx.getByIndex('boatTruckOrders', 'accountId', id);
      for (const o of boatOrders) {
        const items = await tx.getByIndex('boatTruckOrderItems', 'orderId', o.id);
        for (const it of items) await tx.delete('boatTruckOrderItems', it.id);
      }
      const townOrders = await tx.getByIndex('townOrders', 'accountId', id);
      for (const o of townOrders) {
        const items = await tx.getByIndex('townOrderItems', 'townOrderId', o.id);
        for (const it of items) await tx.delete('townOrderItems', it.id);
      }
      for (const table of ['activities', 'eventProduction', 'boatTruckOrders', 'townOrders', 'roadsideShopListings', 'inventory', 'inventoryTransactions']) {
        const rows = await tx.getByIndex(table, 'accountId', id);
        for (const r of rows) await tx.delete(table, r.id);
      }
      await tx.delete('accounts', id);
    });
  }

  // -------------------- Catalog: categories / items / buildings / recipes --------------------
  async function seedDefaultItemCategories() {
    for (const cat of DEFAULT_ITEM_CATEGORIES) {
      await adapter.put('itemCategories', cat);
    }
  }
  async function upsertItemCategory(cat) {
    return adapter.put('itemCategories', cat);
  }
  async function listItemCategories() {
    return adapter.getAll('itemCategories');
  }
  async function upsertItem(item) {
    return item.id ? adapter.put('items', item) : adapter.add('items', item);
  }
  async function listItems() {
    return adapter.getAll('items');
  }
  async function upsertProductionBuilding(building) {
    return building.id ? adapter.put('productionBuildings', building) : adapter.add('productionBuildings', building);
  }
  async function createRecipe({ outputItemId, buildingId = null, productionTimeSec, ingredients }) {
    return adapter.transaction(['recipes', 'recipeIngredients'], async (tx) => {
      const recipeId = await tx.add('recipes', { outputItemId, buildingId, productionTimeSec });
      for (const ing of ingredients) {
        await tx.add('recipeIngredients', { recipeId, itemId: ing.itemId, qtyNeeded: ing.qtyNeeded });
      }
      return recipeId;
    });
  }
  async function getRecipeIngredients(recipeId) {
    return adapter.getByIndex('recipeIngredients', 'recipeId', recipeId);
  }

  // -------------------- Inventory --------------------
  async function setLowStockThreshold(accountId, itemId, threshold) {
    return adapter.transaction(['inventory'], async (tx) => {
      const row = await getInventoryRow(tx, accountId, itemId);
      if (!row) return tx.add('inventory', { accountId, itemId, quantity: 0, lowStockThreshold: threshold, updatedAt: nowISO() });
      return tx.put('inventory', { ...row, lowStockThreshold: threshold, updatedAt: nowISO() });
    });
  }
  async function setInventoryQuantity(accountId, itemId, quantity) {
    return adapter.transaction(['inventory'], async (tx) => {
      const row = await getInventoryRow(tx, accountId, itemId);
      if (!row) return tx.add('inventory', { accountId, itemId, quantity, lowStockThreshold: null, updatedAt: nowISO() });
      return tx.put('inventory', { ...row, quantity, updatedAt: nowISO() });
    });
  }
  async function getInventory(accountId) {
    return adapter.getByIndex('inventory', 'accountId', accountId);
  }
  // เทียบเท่า v_low_stock_alerts
  async function getLowStockAlerts(accountId = null) {
    const [all, items] = await Promise.all([adapter.getAll('inventory'), adapter.getAll('items')]);
    const itemById = new Map(items.map((i) => [i.id, i]));
    return all
      .filter((r) => r.lowStockThreshold != null && r.quantity < r.lowStockThreshold)
      .filter((r) => accountId == null || r.accountId === accountId)
      .map((r) => ({ ...r, itemNameTh: itemById.get(r.itemId)?.nameTh }));
  }

  // -------------------- Activities (crop / animal / production) --------------------
  async function startActivity({ accountId, activityType, itemId, recipeId = null, slotLabel = null, quantity = 1, durationSec }) {
    if (!['crop', 'animal', 'production'].includes(activityType)) {
      throw new Error(`activityType ไม่ถูกต้อง: ${activityType}`);
    }
    return adapter.transaction(['activities', 'recipeIngredients', 'inventory', 'inventoryTransactions'], async (tx) => {
      if (recipeId) {
        const ingredients = await tx.getByIndex('recipeIngredients', 'recipeId', recipeId);
        // เช็คให้ครบทุกวัตถุดิบก่อน ค่อยตัดจริง — กันไม่ให้ตัดไปครึ่งเดียวแล้วพบว่าอีกตัวไม่พอ
        for (const ing of ingredients) {
          const need = ing.qtyNeeded * quantity;
          const row = await getInventoryRow(tx, accountId, ing.itemId);
          if (!row || row.quantity < need) {
            throw new Error(`สต็อกไม่พอสำหรับเริ่มผลิต: item ${ing.itemId} ต้องการ ${need} มี ${row ? row.quantity : 0}`);
          }
        }
        for (const ing of ingredients) {
          const need = ing.qtyNeeded * quantity;
          await adjustInventory(tx, { accountId, itemId: ing.itemId, changeQty: -need, reason: 'production_start', relatedTable: 'activities' });
        }
      }
      const startedAt = nowISO();
      const endsAt = new Date(Date.now() + durationSec * 1000).toISOString();
      return tx.add('activities', {
        accountId, activityType, itemId, recipeId, slotLabel, quantity,
        startedAt, endsAt, status: 'in_progress', createdAt: startedAt,
      });
    });
  }
  async function collectActivity(activityId) {
    return adapter.transaction(['activities', 'inventory', 'inventoryTransactions'], async (tx) => {
      const act = await tx.get('activities', activityId);
      if (!act) throw new Error(`ไม่พบกิจกรรม id=${activityId}`);
      if (act.status === 'collected') throw new Error('กิจกรรมนี้เก็บไปแล้ว');
      await tx.put('activities', { ...act, status: 'collected' });
      await adjustInventory(tx, {
        accountId: act.accountId, itemId: act.itemId, changeQty: act.quantity,
        reason: 'production_collect', relatedTable: 'activities', relatedId: activityId,
      });
      return true;
    });
  }
  async function listActivities(accountId) {
    return adapter.getByIndex('activities', 'accountId', accountId);
  }
  // แก้ไขกิจกรรมที่ยังไม่เก็บ (กันเผลอกรอกจำนวน/เวลาผิดตอนเพิ่ม เช่นใส่หน่วยเวลาผิด) — แก้ได้แค่ quantity/เวลาที่เหลือ
  // (นับเวลาที่เหลือใหม่จาก "ตอนนี้" ไม่ใช่แก้ startedAt เดิม เพื่อให้ตรงกับที่ผู้ใช้ตั้งใจแก้ "เวลาที่เหลือ")
  async function updateActivity(activityId, { quantity, durationSec } = {}) {
    return adapter.transaction(['activities'], async (tx) => {
      const act = await tx.get('activities', activityId);
      if (!act) throw new Error(`ไม่พบกิจกรรม id=${activityId}`);
      if (act.status === 'collected') throw new Error('กิจกรรมนี้เก็บไปแล้ว แก้ไขไม่ได้');
      const updated = { ...act };
      if (quantity != null) updated.quantity = quantity;
      if (durationSec != null) updated.endsAt = new Date(Date.now() + durationSec * 1000).toISOString();
      await tx.put('activities', updated);
      return true;
    });
  }
  async function deleteActivity(activityId) {
    return adapter.transaction(['activities'], async (tx) => {
      await tx.delete('activities', activityId);
      return true;
    });
  }

  // -------------------- Events --------------------
  async function listEvents() {
    return adapter.getAll('events');
  }
  async function createEvent({ name, eventType = 'task_event', startsAt = nowISO(), endsAt, description = null }) {
    return adapter.add('events', { name, eventType, startsAt, endsAt, description });
  }

  // -------------------- Event production --------------------
  async function startEventProduction({ accountId, eventId, machineName, itemId, quantity = 1, durationSec }) {
    const startedAt = nowISO();
    const endsAt = new Date(Date.now() + durationSec * 1000).toISOString();
    return adapter.add('eventProduction', {
      accountId, eventId, machineName, itemId, quantity, startedAt, endsAt,
      status: 'in_progress', createdAt: startedAt,
    });
  }
  async function collectEventProduction(id) {
    return adapter.transaction(['eventProduction', 'inventory', 'inventoryTransactions'], async (tx) => {
      const ep = await tx.get('eventProduction', id);
      if (!ep) throw new Error(`ไม่พบโรงงานอีเวนต์ id=${id}`);
      if (ep.status === 'collected') throw new Error('เก็บไปแล้ว');
      await tx.put('eventProduction', { ...ep, status: 'collected' });
      await adjustInventory(tx, {
        accountId: ep.accountId, itemId: ep.itemId, changeQty: ep.quantity,
        reason: 'event_production_collect', relatedTable: 'eventProduction', relatedId: id,
      });
    });
  }
  // เหมือน updateActivity/deleteActivity แต่สำหรับโรงงานอีเวนต์ (ตารางแยกกัน)
  async function updateEventProduction(id, { quantity, durationSec } = {}) {
    return adapter.transaction(['eventProduction'], async (tx) => {
      const ep = await tx.get('eventProduction', id);
      if (!ep) throw new Error(`ไม่พบโรงงานอีเวนต์ id=${id}`);
      if (ep.status === 'collected') throw new Error('เก็บไปแล้ว แก้ไขไม่ได้');
      const updated = { ...ep };
      if (quantity != null) updated.quantity = quantity;
      if (durationSec != null) updated.endsAt = new Date(Date.now() + durationSec * 1000).toISOString();
      await tx.put('eventProduction', updated);
      return true;
    });
  }
  async function deleteEventProduction(id) {
    return adapter.transaction(['eventProduction'], async (tx) => {
      await tx.delete('eventProduction', id);
      return true;
    });
  }

  // -------------------- Boat / Truck orders --------------------
  async function createBoatTruckOrder({ accountId, orderType, items, rewardCoins = null, rewardXp = null, deadline = null }) {
    if (!['boat', 'truck'].includes(orderType)) throw new Error(`orderType ไม่ถูกต้อง: ${orderType}`);
    return adapter.transaction(['boatTruckOrders', 'boatTruckOrderItems'], async (tx) => {
      const orderId = await tx.add('boatTruckOrders', {
        accountId, orderType, rewardCoins, rewardXp, createdAt: nowISO(), deadline, status: 'open',
      });
      for (const it of items) {
        await tx.add('boatTruckOrderItems', { orderId, itemId: it.itemId, qtyRequired: it.qtyRequired, qtyFulfilled: 0 });
      }
      return orderId;
    });
  }
  async function fulfillBoatTruckOrder(orderId) {
    return adapter.transaction(['boatTruckOrders', 'boatTruckOrderItems', 'inventory', 'inventoryTransactions'], async (tx) => {
      const order = await tx.get('boatTruckOrders', orderId);
      if (!order || order.status !== 'open') throw new Error('ออเดอร์นี้ไม่เปิดรับส่งของแล้ว');
      const items = await tx.getByIndex('boatTruckOrderItems', 'orderId', orderId);
      for (const it of items) {
        const need = it.qtyRequired - it.qtyFulfilled;
        if (need <= 0) continue;
        const row = await getInventoryRow(tx, order.accountId, it.itemId);
        if (!row || row.quantity < need) throw new Error(`สต็อกไม่พอสำหรับส่งออเดอร์: item ${it.itemId}`);
      }
      for (const it of items) {
        const need = it.qtyRequired - it.qtyFulfilled;
        if (need <= 0) continue;
        await adjustInventory(tx, { accountId: order.accountId, itemId: it.itemId, changeQty: -need, reason: 'order_fulfill', relatedTable: 'boatTruckOrders', relatedId: orderId });
        await tx.put('boatTruckOrderItems', { ...it, qtyFulfilled: it.qtyRequired });
      }
      await tx.put('boatTruckOrders', { ...order, status: 'fulfilled' });
      return true;
    });
  }
  // ลบออเดอร์ทิ้ง (เช่นสร้างผิด/ยกเลิกไม่ทำแล้ว) ลบรายการไอเทมของออเดอร์นี้ทิ้งไปด้วย
  async function deleteBoatTruckOrder(orderId) {
    return adapter.transaction(['boatTruckOrders', 'boatTruckOrderItems'], async (tx) => {
      const items = await tx.getByIndex('boatTruckOrderItems', 'orderId', orderId);
      for (const it of items) await tx.delete('boatTruckOrderItems', it.id);
      await tx.delete('boatTruckOrders', orderId);
      return true;
    });
  }

  // -------------------- Town orders (แยกจากเรือ/รถ ตามที่ brief ระบุ) --------------------
  async function createTownOrder({ accountId, boardSlot = null, items, rewardCoins = null, rewardXp = null, deadline = null }) {
    return adapter.transaction(['townOrders', 'townOrderItems'], async (tx) => {
      const orderId = await tx.add('townOrders', {
        accountId, boardSlot, rewardCoins, rewardXp, createdAt: nowISO(), deadline, status: 'open',
      });
      for (const it of items) {
        await tx.add('townOrderItems', { townOrderId: orderId, itemId: it.itemId, qtyRequired: it.qtyRequired, qtyFulfilled: 0 });
      }
      return orderId;
    });
  }
  async function fulfillTownOrder(orderId) {
    return adapter.transaction(['townOrders', 'townOrderItems', 'inventory', 'inventoryTransactions'], async (tx) => {
      const order = await tx.get('townOrders', orderId);
      if (!order || order.status !== 'open') throw new Error('ออเดอร์เมืองนี้ไม่เปิดรับแล้ว');
      const items = await tx.getByIndex('townOrderItems', 'townOrderId', orderId);
      for (const it of items) {
        const need = it.qtyRequired - it.qtyFulfilled;
        if (need <= 0) continue;
        const row = await getInventoryRow(tx, order.accountId, it.itemId);
        if (!row || row.quantity < need) throw new Error(`สต็อกไม่พอสำหรับส่งออเดอร์เมือง: item ${it.itemId}`);
      }
      for (const it of items) {
        const need = it.qtyRequired - it.qtyFulfilled;
        if (need <= 0) continue;
        await adjustInventory(tx, { accountId: order.accountId, itemId: it.itemId, changeQty: -need, reason: 'order_fulfill', relatedTable: 'townOrders', relatedId: orderId });
        await tx.put('townOrderItems', { ...it, qtyFulfilled: it.qtyRequired });
      }
      await tx.put('townOrders', { ...order, status: 'fulfilled' });
      return true;
    });
  }
  async function deleteTownOrder(orderId) {
    return adapter.transaction(['townOrders', 'townOrderItems'], async (tx) => {
      const items = await tx.getByIndex('townOrderItems', 'townOrderId', orderId);
      for (const it of items) await tx.delete('townOrderItems', it.id);
      await tx.delete('townOrders', orderId);
      return true;
    });
  }

  // -------------------- Roadside shop --------------------
  async function buyFromRoadsideShop({ accountId, listingId, coinItemId }) {
    return adapter.transaction(['roadsideShopListings', 'inventory', 'inventoryTransactions'], async (tx) => {
      const listing = await tx.get('roadsideShopListings', listingId);
      if (!listing || listing.qtyAvailable <= 0) throw new Error('ของในร้านหมดแล้ว');
      const coinRow = await getInventoryRow(tx, accountId, coinItemId);
      if (!coinRow || coinRow.quantity < listing.priceCoins) throw new Error('เหรียญไม่พอ');
      await adjustInventory(tx, { accountId, itemId: coinItemId, changeQty: -listing.priceCoins, reason: 'roadside_buy', relatedTable: 'roadsideShopListings', relatedId: listingId });
      await adjustInventory(tx, { accountId, itemId: listing.itemId, changeQty: 1, reason: 'roadside_buy', relatedTable: 'roadsideShopListings', relatedId: listingId });
      await tx.put('roadsideShopListings', { ...listing, qtyAvailable: listing.qtyAvailable - 1 });
    });
  }

  // -------------------- Dashboard feed (เทียบเท่า v_dashboard_feed ใน schema.sql) --------------------
  async function getDashboardFeed() {
    const [activities, eventProduction, boatTruckOrders, townOrders, boatTruckOrderItems, townOrderItems] = await Promise.all([
      adapter.getAll('activities'),
      adapter.getAll('eventProduction'),
      adapter.getAll('boatTruckOrders'),
      adapter.getAll('townOrders'),
      adapter.getAll('boatTruckOrderItems'),
      adapter.getAll('townOrderItems'),
    ]);
    const boatTruckItemCount = new Map();
    for (const it of boatTruckOrderItems) boatTruckItemCount.set(it.orderId, (boatTruckItemCount.get(it.orderId) || 0) + 1);
    const townItemCount = new Map();
    for (const it of townOrderItems) townItemCount.set(it.townOrderId, (townItemCount.get(it.townOrderId) || 0) + 1);

    const feed = [];
    for (const a of activities) {
      if (a.status === 'collected') continue;
      feed.push({ accountId: a.accountId, category: a.activityType, sourceId: a.id, label: a.slotLabel, quantity: a.quantity, endsAt: a.endsAt, itemCount: null });
    }
    for (const ep of eventProduction) {
      if (ep.status === 'collected') continue;
      feed.push({ accountId: ep.accountId, category: 'event_production', sourceId: ep.id, label: ep.machineName, quantity: ep.quantity, endsAt: ep.endsAt, itemCount: null });
    }
    for (const o of boatTruckOrders) {
      if (o.status !== 'open') continue;
      feed.push({ accountId: o.accountId, category: 'boat_truck_order', sourceId: o.id, label: o.orderType, quantity: null, endsAt: o.deadline, itemCount: boatTruckItemCount.get(o.id) || 0 });
    }
    for (const t of townOrders) {
      if (t.status !== 'open') continue;
      feed.push({ accountId: t.accountId, category: 'town_order', sourceId: t.id, label: 'ออเดอร์เมือง', quantity: null, endsAt: t.deadline, itemCount: townItemCount.get(t.id) || 0 });
    }
    feed.sort((a, b) => new Date(a.endsAt || 0) - new Date(b.endsAt || 0));
    return feed;
  }

  // -------------------- Backup / restore (สำรองข้อมูลเป็น JSON — สำคัญมากสำหรับ IndexedDB) --------------------
  async function exportAllData() {
    const out = {};
    for (const table of Object.keys(SCHEMA)) out[table] = await adapter.getAll(table);
    return out;
  }
  async function importAllData(data) {
    return adapter.transaction(Object.keys(SCHEMA), async (tx) => {
      for (const table of Object.keys(SCHEMA)) {
        const existing = await tx.getAll(table);
        for (const row of existing) await tx.delete(table, row.id);
        for (const row of data[table] || []) await tx.put(table, row);
      }
    });
  }

  return {
    createAccount, listAccounts, updateAccount, deleteAccount,
    seedDefaultItemCategories, upsertItemCategory, listItemCategories,
    upsertItem, listItems, upsertProductionBuilding, createRecipe, getRecipeIngredients,
    setLowStockThreshold, setInventoryQuantity, getInventory, getLowStockAlerts,
    startActivity, collectActivity, listActivities, updateActivity, deleteActivity,
    listEvents, createEvent,
    startEventProduction, collectEventProduction, updateEventProduction, deleteEventProduction,
    createBoatTruckOrder, fulfillBoatTruckOrder, deleteBoatTruckOrder,
    createTownOrder, fulfillTownOrder, deleteTownOrder,
    buyFromRoadsideShop,
    getDashboardFeed,
    exportAllData, importAllData,
  };
}
