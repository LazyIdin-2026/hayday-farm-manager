// ============================================================================
// actions.js — orchestration logic เบื้องหลัง modal ทั้งสอง (AddAccountModal, AddActivityModal)
// รับ structured payload จากฟอร์มโดยตรง (ไม่ใช้ prompt() แล้ว) แยกออกจาก App.jsx เพื่อให้
// เทสได้ตรงๆ โดยไม่ต้องพึ่ง DOM/browser
// ============================================================================

const DASHBOARD_TYPE_TO_CATEGORY = {
  crop: "crop",
  animal: "animal_product",
  production: "factory_product",
};

async function findOrCreateItemByName(repo, name, categoryId) {
  const items = await repo.listItems();
  const existing = items.find((i) => i.name === name || i.nameTh === name);
  if (existing) return existing.id;
  return repo.upsertItem({ name, nameTh: name, categoryId });
}

async function findOrCreateEventByName(repo, name, endsAt) {
  const events = await repo.listEvents();
  const existing = events.find((e) => e.name === name);
  // ถ้าเคยสร้างอีเวนต์ชื่อนี้ไว้แล้ว ใช้วันจบเดิมที่ตั้งไว้ตอนสร้างครั้งแรก (ไม่ overwrite ทับ
  // แม้ผู้ใช้จะเลือกวันจบใหม่มาในฟอร์มรอบนี้ก็ตาม — กันเผลอเลื่อนวันจบอีเวนต์เดิมโดยไม่ตั้งใจ)
  if (existing) return existing.id;
  return repo.createEvent({ name, eventType: "task_event", endsAt });
}

/**
 * ปุ่ม "เพิ่มบัญชีฟาร์ม" — รับข้อมูลจาก AddAccountModal โดยตรง
 * @returns {Promise<number|null>} accountId ที่สร้าง หรือ null ถ้าข้อมูลไม่ครบ
 */
export async function createAccountAction(repo, formData) {
  const { name, level, avatarColor, avatarBg } = formData || {};
  if (!name || !name.trim()) return null;
  return repo.createAccount({ name: name.trim(), level: level || 1, avatarColor, avatarBg });
}

/**
 * ปุ่ม "เพิ่มกิจกรรม" — รับ payload จาก AddActivityModal ซึ่งมี shape ต่างกันตาม payload.type:
 *   - crop/animal/production        -> { type, name, quantity, durationSec }
 *   - event_production              -> { type, eventName, eventEndsAt, machineName, itemName, quantity, durationSec }
 *   - boat_truck_order/town_order   -> { type, orderKind?, boardSlot?, deadlineSec, items:[{name, qtyRequired}] }
 * @returns {Promise<number|null>} id ของ record ที่สร้าง (activity/eventProduction/order) หรือ null ถ้า type ไม่รู้จัก
 */
export async function addActivityAction(repo, accountId, payload) {
  const { type } = payload || {};

  if (["crop", "animal", "production"].includes(type)) {
    const itemId = await findOrCreateItemByName(repo, payload.name, DASHBOARD_TYPE_TO_CATEGORY[type]);
    return repo.startActivity({
      accountId,
      activityType: type,
      itemId,
      recipeId: null,
      slotLabel: payload.name,
      quantity: payload.quantity ?? 1,
      durationSec: payload.durationSec,
    });
  }

  if (type === "event_production") {
    const eventId = await findOrCreateEventByName(repo, payload.eventName, payload.eventEndsAt);
    const itemId = await findOrCreateItemByName(repo, payload.itemName, "event_product");
    return repo.startEventProduction({
      accountId,
      eventId,
      machineName: payload.machineName,
      itemId,
      quantity: payload.quantity ?? 1,
      durationSec: payload.durationSec,
    });
  }

  if (type === "boat_truck_order" || type === "town_order") {
    const items = [];
    for (const row of payload.items) {
      const itemId = await findOrCreateItemByName(repo, row.name, "material");
      items.push({ itemId, qtyRequired: row.qtyRequired });
    }
    const deadline = payload.deadlineSec ? new Date(Date.now() + payload.deadlineSec * 1000).toISOString() : null;

    if (type === "boat_truck_order") {
      return repo.createBoatTruckOrder({ accountId, orderType: payload.orderKind || "boat", items, deadline });
    }
    return repo.createTownOrder({ accountId, boardSlot: payload.boardSlot ?? null, items, deadline });
  }

  return null;
}

// ============================================================================
// การกระทำจาก EditActivityModal (แตะรายการกิจกรรมในแดชบอร์ด) — รับ `item` ที่มาจาก
// mapAccountsForDashboard โดยตรง (มี item.type และ item.sourceId ติดมาแล้ว) แล้ว dispatch
// ไปที่ repo function ที่ถูกต้องตามประเภท ไม่ต้องแตะสตริง id เอง
// ============================================================================

/** แก้ไขจำนวน/เวลาที่เหลือของกิจกรรมเดี่ยว (พืชผล/สัตว์เลี้ยง/โรงงาน/โรงงานอีเวนต์) — ออเดอร์ยังไม่รองรับ */
export async function updateActivityItemAction(repo, item, { quantity, durationSec }) {
  if (["crop", "animal", "production"].includes(item.type)) {
    return repo.updateActivity(item.sourceId, { quantity, durationSec });
  }
  if (item.type === "event_production") {
    return repo.updateEventProduction(item.sourceId, { quantity, durationSec });
  }
  throw new Error(`ไม่รองรับการแก้ไขกิจกรรมประเภทนี้: ${item.type}`);
}

/** ลบกิจกรรม/ออเดอร์ทิ้ง รองรับทั้ง 6 ประเภท (ออเดอร์ลบรายการไอเทมของตัวเองไปด้วยอัตโนมัติ) */
export async function deleteActivityItemAction(repo, item) {
  if (["crop", "animal", "production"].includes(item.type)) return repo.deleteActivity(item.sourceId);
  if (item.type === "event_production") return repo.deleteEventProduction(item.sourceId);
  if (item.type === "boat_truck_order") return repo.deleteBoatTruckOrder(item.sourceId);
  if (item.type === "town_order") return repo.deleteTownOrder(item.sourceId);
  throw new Error(`ไม่รองรับการลบประเภทนี้: ${item.type}`);
}

/** เก็บกิจกรรมเดี่ยวที่พร้อมเก็บแล้ว (ตัดเข้าคลังสินค้าจริงผ่าน repo) */
export async function collectActivityItemAction(repo, item) {
  if (["crop", "animal", "production"].includes(item.type)) return repo.collectActivity(item.sourceId);
  if (item.type === "event_production") return repo.collectEventProduction(item.sourceId);
  throw new Error(`ไม่รองรับการเก็บประเภทนี้: ${item.type}`);
}

/** ทำเครื่องหมายว่าส่งออเดอร์แล้ว (ตัดสต็อกจริงตามที่ต้องส่ง — อาจ throw ถ้าสต็อกไม่พอ) */
export async function fulfillOrderItemAction(repo, item) {
  if (item.type === "boat_truck_order") return repo.fulfillBoatTruckOrder(item.sourceId);
  if (item.type === "town_order") return repo.fulfillTownOrder(item.sourceId);
  throw new Error(`ไม่รองรับการส่งออเดอร์ประเภทนี้: ${item.type}`);
}
