// ============================================================================
// Single source of truth ของโครงสร้างตาราง (mirror จาก schema.sql)
// ใช้ร่วมกันทั้ง memoryAdapter (สำหรับเทส/dev) และ indexedDBAdapter (สำหรับ browser จริง)
// ============================================================================

export const SCHEMA = {
  accounts: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'name' }],
  },
  itemCategories: {
    // ใช้ id เป็น string (เช่น 'crop','animal_product') ไม่ auto-increment
    keyPath: 'id',
    autoIncrement: false,
    indexes: [],
  },
  items: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'name', unique: true }, { name: 'categoryId' }],
  },
  productionBuildings: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'name', unique: true }],
  },
  recipes: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'outputItemId' }, { name: 'buildingId' }],
  },
  recipeIngredients: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'recipeId' }, { name: 'itemId' }],
  },
  activities: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'accountId' }, { name: 'status' }, { name: 'endsAt' }],
  },
  events: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'eventType' }],
  },
  eventProduction: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'accountId' }, { name: 'eventId' }, { name: 'status' }],
  },
  boatTruckOrders: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'accountId' }, { name: 'status' }],
  },
  boatTruckOrderItems: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'orderId' }],
  },
  townOrders: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'accountId' }, { name: 'status' }],
  },
  townOrderItems: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'townOrderId' }],
  },
  roadsideShopListings: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'accountId' }],
  },
  inventory: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'accountId' }, { name: 'itemId' }],
  },
  inventoryTransactions: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [{ name: 'accountId' }, { name: 'itemId' }],
  },
};

// หมวดไอเทมเริ่มต้น (mirror จาก schema.sql seed) — เรียก repository.upsertItemCategory ทีละอันตอน seed ครั้งแรก
export const DEFAULT_ITEM_CATEGORIES = [
  { id: 'crop', labelTh: 'พืชผล', color: '#3D8A5C', icon: 'Sprout' },
  { id: 'animal_product', labelTh: 'สัตว์เลี้ยง', color: '#C9527F', icon: 'Egg' },
  { id: 'factory_product', labelTh: 'โรงงาน', color: '#C94A78', icon: 'Factory' },
  { id: 'event_product', labelTh: 'โรงงานอีเวนต์', color: '#B23A6A', icon: 'Sparkles' },
  { id: 'material', labelTh: 'วัตถุดิบ', color: '#7A67CC', icon: 'Package' },
  { id: 'tool', labelTh: 'เครื่องมือ', color: '#5566C4', icon: 'Axe' },
  { id: 'currency', labelTh: 'เหรียญ/เงิน', color: '#D4A93B', icon: 'Coins' },
];
