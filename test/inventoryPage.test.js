// ============================================================================
// inventoryPage.test.js — เดินสายข้อมูลเต็มระบบสำหรับหน้า Inventory ใหม่ (เฟส 4):
//   storage/repository.js -> src/inventoryMappers.js -> src/InventoryPage.jsx
// เรนเดอร์จริงผ่าน react-dom/server เพื่อยืนยันว่าไม่มี error และข้อมูลจริงขึ้นถูกต้อง
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SCHEMA } from '../storage/schema.js';
import { createMemoryAdapter } from '../storage/adapters/memoryAdapter.js';
import { createRepository } from '../storage/repository.js';
import { mapInventoryForAccount, mapInventoryMatrix } from '../src/inventoryMappers.js';
import InventoryPage from '../src/InventoryPage.jsx';

test('InventoryPage แสดงข้อความ "ยังไม่มีบัญชี" เมื่อไม่มีบัญชีเลย ไม่ throw', () => {
  const html = renderToStaticMarkup(
    React.createElement(InventoryPage, {
      accounts: [],
      selectedAccountId: null,
      onSelectAccount: () => {},
      items: [],
      onUpdateQuantity: () => {},
      onUpdateThreshold: () => {},
    })
  );
  assert.match(html, /คลังสินค้า/);
  assert.match(html, /ยังไม่มีบัญชีฟาร์ม/);
});

test('InventoryPage เรนเดอร์ข้อมูลจริงเต็มสาย (repository -> inventoryMappers -> component)', async () => {
  const repo = createRepository(createMemoryAdapter(SCHEMA));
  await repo.seedDefaultItemCategories();
  const accountId = await repo.createAccount({ name: 'ไร่ลุงตู่', avatarColor: '#C9527F', avatarBg: '#F7D2E4' });
  const wheatId = await repo.upsertItem({ name: 'wheat', nameTh: 'ข้าวสาลี', categoryId: 'crop' });
  const sugarId = await repo.upsertItem({ name: 'sugar', nameTh: 'น้ำตาล', categoryId: 'material' });

  await repo.setInventoryQuantity(accountId, wheatId, 50);
  await repo.setLowStockThreshold(accountId, wheatId, 10);
  // น้ำตาลไม่เคยตั้งสต็อกมาก่อนเลย แต่ต้องยังโผล่ในลิสต์ (แสดง 0)
  await repo.setInventoryQuantity(accountId, sugarId, 3);
  await repo.setLowStockThreshold(accountId, sugarId, 10); // ต่ำกว่าเกณฑ์ -> ต้องไฮไลต์

  const [catalogItems, categories, inventoryRows, accounts] = await Promise.all([
    repo.listItems(),
    repo.listItemCategories(),
    repo.getInventory(accountId),
    repo.listAccounts(),
  ]);
  const mapped = mapInventoryForAccount(catalogItems, categories, inventoryRows);

  const accountsForPage = accounts.map((a) => ({ id: a.id, name: a.name, color: a.avatarColor, bg: a.avatarBg }));

  const html = renderToStaticMarkup(
    React.createElement(InventoryPage, {
      accounts: accountsForPage,
      selectedAccountId: accountId,
      onSelectAccount: () => {},
      items: mapped,
      onUpdateQuantity: () => {},
      onUpdateThreshold: () => {},
    })
  );

  assert.match(html, /ไร่ลุงตู่/, 'ต้องแสดงชื่อบัญชีในตัวเลือกบัญชี');
  assert.match(html, /ข้าวสาลี/, 'ต้องแสดงไอเทมที่มีสต็อกจริง');
  assert.match(html, /น้ำตาล/, 'ต้องแสดงไอเทมที่ต่ำกว่าเกณฑ์ด้วย');
  assert.match(html, /value="50"/, 'ต้องแสดงจำนวนคงเหลือของข้าวสาลีถูกต้อง');
  assert.match(html, /value="3"/, 'ต้องแสดงจำนวนคงเหลือของน้ำตาล (ต่ำกว่าเกณฑ์) ถูกต้อง');
});

test('InventoryPage กรองด้วย search ได้ (ค้นหาจากชื่อไอเทมหรือชื่อหมวด) — ทดสอบผ่าน mapper ก่อนส่งเข้า component', () => {
  // การกรองจริงเกิดใน local state ของ component (พิมพ์ในกล่องค้นหา) ซึ่งต้องมีการโต้ตอบใน DOM จริง
  // จึงทดสอบที่ระดับข้อมูลแทน: ยืนยันว่าข้อมูลที่ป้อนเข้า component มี field name/categoryLabel
  // ที่ใช้กรองได้ถูกต้องตามที่ InventoryPage คาดหวัง
  const items = mapInventoryForAccount(
    [{ id: 1, name: 'wheat', nameTh: 'ข้าวสาลี', categoryId: 'crop' }],
    [{ id: 'crop', labelTh: 'พืชผล', color: '#3D8A5C' }],
    []
  );
  assert.equal(items[0].name, 'ข้าวสาลี');
  assert.equal(items[0].categoryLabel, 'พืชผล');
});

// ============================================================================
// ปุ่มสลับมุมมอง "ดูทีละบัญชี" / "ดูทุกบัญชีพร้อมกัน" (เฟส 5)
// ============================================================================

test('InventoryPage แสดงปุ่มสลับมุมมองทั้ง 2 โหมดเสมอ ไม่ว่าจะอยู่โหมดไหน', () => {
  const html = renderToStaticMarkup(
    React.createElement(InventoryPage, {
      accounts: [{ id: 1, name: 'ไร่ลุงตู่', color: '#C9527F', bg: '#F7D2E4' }],
      selectedAccountId: 1,
      onSelectAccount: () => {},
      items: [],
      matrixItems: [],
      viewMode: 'single',
      onChangeViewMode: () => {},
      onUpdateQuantity: () => {},
      onUpdateThreshold: () => {},
    })
  );
  assert.match(html, /ดูทีละบัญชี/);
  assert.match(html, /ดูทุกบัญชีพร้อมกัน/);
});

test('InventoryPage โหมด "ดูทุกบัญชีพร้อมกัน" เรนเดอร์ตารางเทียบข้ามบัญชีเต็มสาย (repository -> mapInventoryMatrix -> component) โดยไม่ throw', async () => {
  const repo = createRepository(createMemoryAdapter(SCHEMA));
  await repo.seedDefaultItemCategories();
  const accountAId = await repo.createAccount({ name: 'ไร่เอ', avatarColor: '#C9527F', avatarBg: '#F7D2E4' });
  const accountBId = await repo.createAccount({ name: 'ไร่บี', avatarColor: '#3F86C4', avatarBg: '#D6E7F7' });
  const wheatId = await repo.upsertItem({ name: 'wheat', nameTh: 'ข้าวสาลี', categoryId: 'crop' });

  await repo.setInventoryQuantity(accountAId, wheatId, 40);
  await repo.setLowStockThreshold(accountAId, wheatId, 10);
  await repo.setInventoryQuantity(accountBId, wheatId, 2);
  await repo.setLowStockThreshold(accountBId, wheatId, 10); // ต่ำกว่าเกณฑ์เฉพาะบัญชีบี

  const [catalogItems, categories, rowsA, rowsB, rawAccounts] = await Promise.all([
    repo.listItems(),
    repo.listItemCategories(),
    repo.getInventory(accountAId),
    repo.getInventory(accountBId),
    repo.listAccounts(),
  ]);
  const accountsForPage = rawAccounts.map((a) => ({ id: a.id, name: a.name, color: a.avatarColor, bg: a.avatarBg }));
  const rowsByAccountId = new Map([
    [accountAId, rowsA],
    [accountBId, rowsB],
  ]);
  const matrix = mapInventoryMatrix(catalogItems, categories, accountsForPage, rowsByAccountId);

  const html = renderToStaticMarkup(
    React.createElement(InventoryPage, {
      accounts: accountsForPage,
      selectedAccountId: accountAId,
      onSelectAccount: () => {},
      items: [],
      matrixItems: matrix,
      viewMode: 'all',
      onChangeViewMode: () => {},
      onUpdateQuantity: () => {},
      onUpdateThreshold: () => {},
    })
  );

  assert.match(html, /ไร่เอ/, 'ต้องแสดงชื่อบัญชีเอในหัวตาราง');
  assert.match(html, /ไร่บี/, 'ต้องแสดงชื่อบัญชีบีในหัวตาราง');
  assert.match(html, /ข้าวสาลี/, 'ต้องแสดงชื่อไอเทมในตารางเทียบ');
  assert.match(html, /value="40"/, 'ต้องแสดงจำนวนคงเหลือของบัญชีเอถูกต้อง');
  assert.match(html, /value="2"/, 'ต้องแสดงจำนวนคงเหลือของบัญชีบีถูกต้อง');
});

test('InventoryPage โหมด "ดูทุกบัญชีพร้อมกัน" ไม่ throw แม้ยังไม่มีบัญชีเลย (ตกไปที่ empty state เดียวกัน)', () => {
  const html = renderToStaticMarkup(
    React.createElement(InventoryPage, {
      accounts: [],
      selectedAccountId: null,
      onSelectAccount: () => {},
      items: [],
      matrixItems: [],
      viewMode: 'all',
      onChangeViewMode: () => {},
      onUpdateQuantity: () => {},
      onUpdateThreshold: () => {},
    })
  );
  assert.match(html, /ยังไม่มีบัญชีฟาร์ม/);
});
