// ============================================================================
// ssr-smoke.test.js — เทสสำคัญที่สุดของรอบนี้: "รวมไฟล์ dashboard กับ storage แล้วรันดูว่า error ไหม"
// เรนเดอร์จริงผ่าน react-dom/server (SSR, ไม่ต้องมีเบราว์เซอร์) โดยเดินสายข้อมูลเต็มสาย:
//   storage/repository.js -> src/mappers.js -> src/FarmDashboard.jsx
// ถ้าไฟล์ไหน import ผิด path, ชื่อฟิลด์ไม่ตรงกัน, หรือ component throw ระหว่างเรนเดอร์
// เทสนี้จะ fail ทันที (ไม่ใช่แค่เดาว่าน่าจะรัน).
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SCHEMA } from '../storage/schema.js';
import { createMemoryAdapter } from '../storage/adapters/memoryAdapter.js';
import { createRepository } from '../storage/repository.js';
import { mapAccountsForDashboard } from '../src/mappers.js';
import FarmDashboard from '../src/FarmDashboard.jsx';
import App from '../src/App.jsx';

test('FarmDashboard เรนเดอร์ได้โดยไม่ throw เมื่อไม่มีบัญชีเลย (empty state)', () => {
  const html = renderToStaticMarkup(
    React.createElement(FarmDashboard, { accounts: [], lowStockAlerts: [], onAddAccount: () => {}, onAddActivity: () => {} })
  );
  assert.match(html, /แดชบอร์ดฟาร์มทั้งหมด/);
  assert.match(html, /เพิ่มบัญชีฟาร์ม/);
});

test('FarmDashboard เรนเดอร์ข้อมูลจริงจาก storage เต็มสาย (repository -> mapper -> component)', async () => {
  const repo = createRepository(createMemoryAdapter(SCHEMA));
  await repo.seedDefaultItemCategories();

  const a1 = await repo.createAccount({ name: 'ไร่ลุงตู่', level: 78, avatarColor: '#C9527F', avatarBg: '#F7D2E4' });
  const wheatId = await repo.upsertItem({ name: 'wheat', nameTh: 'ข้าวสาลี', categoryId: 'crop' });
  const milkId = await repo.upsertItem({ name: 'milk', nameTh: 'นม', categoryId: 'animal_product' });
  const buildingId = await repo.upsertProductionBuilding({ name: 'dairy', nameTh: 'โรงรีดนม' });
  const recipeId = await repo.createRecipe({ outputItemId: milkId, buildingId, productionTimeSec: 600, ingredients: [] });

  await repo.setInventoryQuantity(a1, wheatId, 20);
  await repo.setLowStockThreshold(a1, wheatId, 5);

  await repo.startActivity({ accountId: a1, activityType: 'crop', itemId: wheatId, recipeId: null, slotLabel: 'ข้าวสาลี แปลง 3', quantity: 6, durationSec: 120 });
  await repo.startActivity({ accountId: a1, activityType: 'animal', itemId: milkId, recipeId, slotLabel: 'โรงรีดนม', quantity: 4, durationSec: 840 });
  await repo.createBoatTruckOrder({ accountId: a1, orderType: 'boat', items: [{ itemId: wheatId, qtyRequired: 3 }], deadline: new Date(Date.now() + 7320000).toISOString() });

  // ทำให้สต็อกต่ำกว่าเกณฑ์ เพื่อเทสแบนเนอร์แจ้งเตือนด้วย
  await repo.setInventoryQuantity(a1, wheatId, 3);

  const accounts = await repo.listAccounts();
  const feed = await repo.getDashboardFeed();
  const lowStockAlerts = await repo.getLowStockAlerts();
  const mapped = mapAccountsForDashboard(accounts, feed);

  const html = renderToStaticMarkup(
    React.createElement(FarmDashboard, { accounts: mapped, lowStockAlerts, onAddAccount: () => {}, onAddActivity: () => {} })
  );

  assert.match(html, /ไร่ลุงตู่/, 'ต้องแสดงชื่อบัญชีจาก storage จริง');
  assert.match(html, /ข้าวสาลี แปลง 3/, 'ต้องแสดงกิจกรรมพืชผลจาก activities จริง');
  assert.match(html, /โรงรีดนม/, 'ต้องแสดงกิจกรรมสัตว์/โรงงานจาก activities จริง');
  assert.match(html, /รายการ/, 'ออเดอร์เรือต้องแสดงเป็น "N รายการ"');
  assert.match(html, /เลเวล 78/);
  assert.match(html, /ข้าวสาลี เหลือ 3/, 'แบนเนอร์แจ้งเตือนสต็อกต่ำต้องขึ้นจริงเมื่อสต็อกต่ำกว่าเกณฑ์');
});

test('App.jsx (ที่ผูก storage เข้ากับ dashboard จริง) เรนเดอร์ได้โดยไม่ throw เมื่อฉีด repo ที่เทสไว้ล่วงหน้า', async () => {
  const repo = createRepository(createMemoryAdapter(SCHEMA));
  await repo.seedDefaultItemCategories();
  await repo.createAccount({ name: 'สวนป้าแดง', level: 63 });

  // renderToStaticMarkup เป็น synchronous — useEffect ของ App จะยังไม่ทันรันภายในคอลนี้
  // (นี่คือพฤติกรรมมาตรฐานของ React SSR) แต่เพียงพอสำหรับเช็คว่าไฟล์ import/ประกอบกันถูกต้อง
  // ไม่มี syntax error หรือ path พังตอน parse + เรนเดอร์ครั้งแรก (สถานะ "กำลังโหลด...")
  const html = renderToStaticMarkup(React.createElement(App, { repo }));
  assert.match(html, /กำลังโหลดข้อมูลฟาร์ม/);
});
