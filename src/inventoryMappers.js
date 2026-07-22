// ============================================================================
// inventoryMappers.js — รวมแคตตาล็อกไอเทมทั้งหมด (repo.listItems()) เข้ากับสต็อกจริง
// ต่อบัญชี (repo.getInventory(accountId)) ให้เป็นรายการเดียวสำหรับหน้า Inventory
//
// จุดสำคัญ: แสดง "ทุกไอเทมในแคตตาล็อก" แม้ไอเทมนั้นยังไม่เคยมีการตั้งสต็อก/เกณฑ์มาก่อน
// (แสดงจำนวน 0 และเกณฑ์ "ไม่ตั้ง") เพื่อให้ผู้ใช้ตั้งค่าไอเทมไหนก็ได้จากหน้านี้ ไม่ต้องรอให้
// มีการผลิต/ตัดสต็อกเกิดขึ้นก่อนถึงจะตั้งเกณฑ์แจ้งเตือนได้
// ============================================================================

export function mapInventoryForAccount(catalogItems, categories, inventoryRows) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const invByItemId = new Map(inventoryRows.map((r) => [r.itemId, r]));

  return catalogItems
    .map((item) => {
      const inv = invByItemId.get(item.id);
      const category = categoryById.get(item.categoryId);
      const quantity = inv ? inv.quantity : 0;
      const lowStockThreshold = inv && inv.lowStockThreshold != null ? inv.lowStockThreshold : null;
      return {
        itemId: item.id,
        name: item.nameTh || item.name,
        categoryId: item.categoryId,
        categoryLabel: category ? category.labelTh : item.categoryId || "ไม่ระบุหมวด",
        categoryColor: category ? category.color : "#4A3B66",
        quantity,
        lowStockThreshold,
        isLow: lowStockThreshold != null && quantity < lowStockThreshold,
      };
    })
    .sort((a, b) => {
      const byCategory = a.categoryLabel.localeCompare(b.categoryLabel, "th");
      if (byCategory !== 0) return byCategory;
      return a.name.localeCompare(b.name, "th");
    });
}

// ============================================================================
// mapInventoryMatrix — เวอร์ชัน "ดูทุกบัญชีพร้อมกัน" ของหน้า Inventory
// รวมแคตตาล็อกไอเทมทั้งหมดเข้ากับสต็อกของ "ทุกบัญชี" พร้อมกัน เพื่อให้เทียบข้ามบัญชีได้ในตารางเดียว
//
// รับ inventoryRowsByAccountId เป็น Map<accountId, inventoryRows[]> (โหลดมาจาก repo.getInventory(accountId)
// ของทุกบัญชีล่วงหน้า) แล้วคืนแถวต่อไอเทม โดยแต่ละแถวมี cells[] เรียงตามลำดับเดียวกับ accounts ที่ส่งเข้ามา
// แต่ละ cell มี {accountId, quantity, lowStockThreshold, isLow} — ไอเทม/บัญชีคู่ไหนไม่เคยตั้งสต็อกมาก่อน
// จะได้ quantity: 0, lowStockThreshold: null, isLow: false เหมือน mapInventoryForAccount
// ============================================================================
export function mapInventoryMatrix(catalogItems, categories, accounts, inventoryRowsByAccountId) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return catalogItems
    .map((item) => {
      const category = categoryById.get(item.categoryId);
      const cells = accounts.map((acc) => {
        const rows = inventoryRowsByAccountId.get(acc.id) || [];
        const row = rows.find((r) => r.itemId === item.id);
        const quantity = row ? row.quantity : 0;
        const lowStockThreshold = row && row.lowStockThreshold != null ? row.lowStockThreshold : null;
        return {
          accountId: acc.id,
          quantity,
          lowStockThreshold,
          isLow: lowStockThreshold != null && quantity < lowStockThreshold,
        };
      });
      return {
        itemId: item.id,
        name: item.nameTh || item.name,
        categoryId: item.categoryId,
        categoryLabel: category ? category.labelTh : item.categoryId || "ไม่ระบุหมวด",
        categoryColor: category ? category.color : "#4A3B66",
        cells,
      };
    })
    .sort((a, b) => {
      const byCategory = a.categoryLabel.localeCompare(b.categoryLabel, "th");
      if (byCategory !== 0) return byCategory;
      return a.name.localeCompare(b.name, "th");
    });
}
