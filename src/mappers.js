// ============================================================================
// mappers.js — แปลงข้อมูลจาก repository (storage/repository.js) ให้เป็น shape
// ที่ FarmDashboard.jsx ต้องการพอดี โดยไม่ต้องแก้โครงสร้างของ dashboard เลย
//
// อัปเดต: ตอนนี้ TYPE_META (src/typeMeta.js) มี 6 หมวดสีตรงกับ 6 ประเภทกิจกรรมจริง
// ใน schema แล้ว (ไม่พับรวมกันอีกต่อไปเหมือนรอบก่อน) ดังนั้น row.category จาก
// repo.getDashboardFeed() จึง map 1:1 กับ item.type ที่ FarmDashboard.jsx ใช้ได้ตรงๆ
// ============================================================================

function toEpochMs(isoStringOrNull) {
  if (!isoStringOrNull) return Date.now(); // ไม่มี deadline -> ถือว่า "พร้อมอยู่แล้ว" ไม่บล็อก UI
  const t = new Date(isoStringOrNull).getTime();
  return Number.isNaN(t) ? Date.now() : t;
}

function formatQty(feedRow) {
  if (feedRow.category === "boat_truck_order" || feedRow.category === "town_order") {
    return `${feedRow.itemCount ?? 0} รายการ`;
  }
  return `x${feedRow.quantity ?? 1}`;
}

/**
 * @param {Array} accounts        - จาก repo.listAccounts()
 * @param {Array} dashboardFeed    - จาก repo.getDashboardFeed() (มี itemCount ติดมาด้วยสำหรับออเดอร์)
 * @returns {Array} accounts ในรูปแบบที่ FarmDashboard.jsx ต้องการ
 */
export function mapAccountsForDashboard(accounts, dashboardFeed) {
  const feedByAccount = new Map();
  for (const row of dashboardFeed) {
    if (!feedByAccount.has(row.accountId)) feedByAccount.set(row.accountId, []);
    feedByAccount.get(row.accountId).push(row);
  }

  return accounts.map((acc) => ({
    id: acc.id,
    name: acc.name,
    level: acc.level,
    color: acc.avatarColor,
    bg: acc.avatarBg,
    items: (feedByAccount.get(acc.id) || []).map((row) => ({
      id: `${row.category}-${row.sourceId}`,
      type: row.category,
      name: row.label || "(ไม่มีชื่อ)",
      qty: formatQty(row),
      end: toEpochMs(row.endsAt),
    })),
  }));
}
