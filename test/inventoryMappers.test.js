import test from 'node:test';
import assert from 'node:assert/strict';
import { mapInventoryForAccount, mapInventoryMatrix } from '../src/inventoryMappers.js';

const categories = [
  { id: 'crop', labelTh: 'พืชผล', color: '#3D8A5C' },
  { id: 'material', labelTh: 'วัตถุดิบ', color: '#7A67CC' },
];

test('mapInventoryForAccount รวมแคตตาล็อกเข้ากับสต็อกจริง และใส่ค่า default ให้ไอเทมที่ยังไม่เคยตั้งสต็อก', () => {
  const items = [
    { id: 1, name: 'wheat', nameTh: 'ข้าวสาลี', categoryId: 'crop' },
    { id: 2, name: 'sugar', nameTh: 'น้ำตาล', categoryId: 'material' },
  ];
  const inventoryRows = [{ id: 10, accountId: 1, itemId: 1, quantity: 20, lowStockThreshold: 5 }];

  const result = mapInventoryForAccount(items, categories, inventoryRows);
  assert.equal(result.length, 2);

  const wheat = result.find((r) => r.itemId === 1);
  assert.equal(wheat.quantity, 20);
  assert.equal(wheat.lowStockThreshold, 5);
  assert.equal(wheat.isLow, false);
  assert.equal(wheat.categoryLabel, 'พืชผล');

  const sugar = result.find((r) => r.itemId === 2);
  assert.equal(sugar.quantity, 0, 'ไอเทมที่ยังไม่เคยตั้งสต็อกต้องแสดงจำนวน 0 ไม่ใช่ undefined');
  assert.equal(sugar.lowStockThreshold, null, 'ไอเทมที่ยังไม่เคยตั้งเกณฑ์ต้องเป็น null (แสดง "ไม่ตั้ง")');
  assert.equal(sugar.isLow, false, 'ไม่มีเกณฑ์ตั้งไว้ ต้องไม่ถือว่าต่ำกว่าเกณฑ์');
});

test('mapInventoryForAccount คำนวณ isLow ถูกต้องเมื่อสต็อกต่ำกว่าเกณฑ์', () => {
  const items = [{ id: 1, name: 'sugar', nameTh: 'น้ำตาล', categoryId: 'material' }];
  const inventoryRows = [{ id: 10, accountId: 1, itemId: 1, quantity: 3, lowStockThreshold: 10 }];
  const result = mapInventoryForAccount(items, categories, inventoryRows);
  assert.equal(result[0].isLow, true);
});

test('mapInventoryForAccount เรียงตามหมวดแล้วตามชื่อ (ภาษาไทย)', () => {
  const items = [
    { id: 1, name: 'b', nameTh: 'ข้าวโพด', categoryId: 'crop' },
    { id: 2, name: 'a', nameTh: 'น้ำตาล', categoryId: 'material' },
    { id: 3, name: 'c', nameTh: 'ข้าวสาลี', categoryId: 'crop' },
  ];
  const result = mapInventoryForAccount(items, categories, []);
  assert.deepEqual(result.map((r) => r.name), ['ข้าวโพด', 'ข้าวสาลี', 'น้ำตาล']);
});

test('mapInventoryForAccount รับ items ว่างได้โดยไม่ throw', () => {
  assert.deepEqual(mapInventoryForAccount([], categories, []), []);
});

// ============================================================================
// mapInventoryMatrix — เวอร์ชันเทียบข้ามบัญชี (โหมด "ดูทุกบัญชีพร้อมกัน")
// ============================================================================

test('mapInventoryMatrix สร้างแถวต่อไอเทม โดยแต่ละแถวมี cells เรียงตามลำดับ accounts ที่ส่งเข้ามา', () => {
  const items = [{ id: 1, name: 'wheat', nameTh: 'ข้าวสาลี', categoryId: 'crop' }];
  const accounts = [
    { id: 'A', name: 'ไร่เอ' },
    { id: 'B', name: 'ไร่บี' },
  ];
  const rowsByAccountId = new Map([
    ['A', [{ accountId: 'A', itemId: 1, quantity: 20, lowStockThreshold: 5 }]],
    ['B', [{ accountId: 'B', itemId: 1, quantity: 2, lowStockThreshold: 10 }]],
  ]);

  const result = mapInventoryMatrix(items, categories, accounts, rowsByAccountId);
  assert.equal(result.length, 1);
  const row = result[0];
  assert.equal(row.itemId, 1);
  assert.equal(row.name, 'ข้าวสาลี');
  assert.equal(row.cells.length, 2, 'ต้องมี cell เท่าจำนวนบัญชีที่ส่งเข้ามา');

  assert.equal(row.cells[0].accountId, 'A');
  assert.equal(row.cells[0].quantity, 20);
  assert.equal(row.cells[0].isLow, false);

  assert.equal(row.cells[1].accountId, 'B');
  assert.equal(row.cells[1].quantity, 2);
  assert.equal(row.cells[1].isLow, true, 'บัญชี B สต็อก 2 ต่ำกว่าเกณฑ์ 10 ต้องถือว่า isLow');
});

test('mapInventoryMatrix ใส่ค่า default (quantity 0, threshold null, isLow false) ให้บัญชีที่ไม่เคยตั้งสต็อกไอเทมนั้นเลย', () => {
  const items = [{ id: 1, name: 'sugar', nameTh: 'น้ำตาล', categoryId: 'material' }];
  const accounts = [{ id: 'A', name: 'ไร่เอ' }, { id: 'B', name: 'ไร่บี' }];
  // บัญชี A ไม่มี inventory rows เลย, บัญชี B ไม่อยู่ใน Map เลยด้วยซ้ำ
  const rowsByAccountId = new Map([['A', []]]);

  const result = mapInventoryMatrix(items, categories, accounts, rowsByAccountId);
  const [cellA, cellB] = result[0].cells;
  assert.deepEqual(cellA, { accountId: 'A', quantity: 0, lowStockThreshold: null, isLow: false });
  assert.deepEqual(cellB, { accountId: 'B', quantity: 0, lowStockThreshold: null, isLow: false });
});

test('mapInventoryMatrix เรียงตามหมวดแล้วตามชื่อ (ภาษาไทย) เหมือน mapInventoryForAccount', () => {
  const items = [
    { id: 1, name: 'b', nameTh: 'ข้าวโพด', categoryId: 'crop' },
    { id: 2, name: 'a', nameTh: 'น้ำตาล', categoryId: 'material' },
    { id: 3, name: 'c', nameTh: 'ข้าวสาลี', categoryId: 'crop' },
  ];
  const accounts = [{ id: 'A', name: 'ไร่เอ' }];
  const result = mapInventoryMatrix(items, categories, accounts, new Map());
  assert.deepEqual(result.map((r) => r.name), ['ข้าวโพด', 'ข้าวสาลี', 'น้ำตาล']);
});

test('mapInventoryMatrix รับ accounts ว่างได้ (cells เป็น array ว่างต่อไอเทม) โดยไม่ throw', () => {
  const items = [{ id: 1, name: 'wheat', nameTh: 'ข้าวสาลี', categoryId: 'crop' }];
  const result = mapInventoryMatrix(items, categories, [], new Map());
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].cells, []);
});
