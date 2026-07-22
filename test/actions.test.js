import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA } from '../storage/schema.js';
import { createMemoryAdapter } from '../storage/adapters/memoryAdapter.js';
import { createRepository } from '../storage/repository.js';
import { createAccountAction, addActivityAction } from '../src/actions.js';

function setup() {
  return createRepository(createMemoryAdapter(SCHEMA));
}

test('createAccountAction (payload จาก AddAccountModal) สร้างบัญชีจริงผ่าน repo', async () => {
  const repo = setup();
  const accountId = await createAccountAction(repo, { name: 'ไร่ทดสอบ', level: 25, avatarColor: '#5566C4', avatarBg: '#D3D8F5' });
  assert.ok(accountId != null);

  const accounts = await repo.listAccounts();
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].name, 'ไร่ทดสอบ');
  assert.equal(accounts[0].level, 25);
  assert.equal(accounts[0].avatarColor, '#5566C4');
});

test('createAccountAction คืน null ถ้าไม่กรอกชื่อ', async () => {
  const repo = setup();
  const accountId = await createAccountAction(repo, { name: '  ', level: 1 });
  assert.equal(accountId, null);
  assert.equal((await repo.listAccounts()).length, 0);
});

test('addActivityAction: พืชผล/สัตว์เลี้ยง/โรงงาน (payload แบบง่าย) เริ่มกิจกรรมจริงและขึ้นในฟีด', async () => {
  const repo = setup();
  await repo.seedDefaultItemCategories();
  const accountId = await repo.createAccount({ name: 'ไร่ลุงตู่', level: 78 });

  const activityId = await addActivityAction(repo, accountId, {
    type: 'crop', name: 'ข้าวสาลี แปลง 3', quantity: 6, durationSec: 120,
  });
  assert.ok(activityId != null);

  const feed = await repo.getDashboardFeed();
  assert.equal(feed.length, 1);
  assert.equal(feed[0].category, 'crop');
  assert.equal(feed[0].label, 'ข้าวสาลี แปลง 3');

  // ส่งชื่อเดิมซ้ำ ต้องไม่สร้างไอเทมแคตตาล็อกซ้ำ
  await addActivityAction(repo, accountId, { type: 'crop', name: 'ข้าวสาลี แปลง 3', quantity: 6, durationSec: 300 });
  const items = await repo.listItems();
  assert.equal(items.filter((i) => i.name === 'ข้าวสาลี แปลง 3').length, 1);
});

test('addActivityAction: โรงงานอีเวนต์ สร้าง event ใหม่พร้อมวันจบที่ผู้ใช้เลือกเอง (ไม่ fix 7 วันแล้ว)', async () => {
  const repo = setup();
  await repo.seedDefaultItemCategories();
  const accountId = await repo.createAccount({ name: 'ไร่ลุงตู่' });

  const customEndsAt = new Date('2026-12-31T23:59:59.000Z').toISOString();
  const id = await addActivityAction(repo, accountId, {
    type: 'event_production',
    eventName: 'เทศกาลอีสเตอร์',
    eventEndsAt: customEndsAt,
    machineName: 'เครื่องทำไข่ช็อกโกแลต',
    itemName: 'ไข่ช็อกโกแลต',
    quantity: 3,
    durationSec: 600,
  });
  assert.ok(id != null);

  const events = await repo.listEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].name, 'เทศกาลอีสเตอร์');
  assert.equal(events[0].endsAt, customEndsAt, 'ต้องใช้วันจบที่ผู้ใช้เลือกในฟอร์ม ไม่ใช่ค่า fix 7 วันอีกต่อไป');

  const feed = await repo.getDashboardFeed();
  assert.equal(feed.length, 1);
  assert.equal(feed[0].category, 'event_production');
  assert.equal(feed[0].label, 'เครื่องทำไข่ช็อกโกแลต');

  // สร้างโรงงานอีเวนต์อีกอันในอีเวนต์เดิม แม้ส่งวันจบมาไม่ตรงกัน ต้องไม่สร้าง event ซ้ำ
  // และต้องคงวันจบเดิมไว้ (ไม่ overwrite ทับ)
  const differentEndsAt = new Date('2099-01-01T00:00:00.000Z').toISOString();
  await addActivityAction(repo, accountId, {
    type: 'event_production',
    eventName: 'เทศกาลอีสเตอร์',
    eventEndsAt: differentEndsAt,
    machineName: 'เครื่องทำลูกโป่ง',
    itemName: 'ลูกโป่ง',
    quantity: 2,
    durationSec: 300,
  });
  const eventsAfter = await repo.listEvents();
  assert.equal(eventsAfter.length, 1, 'ต้องไม่สร้าง event ซ้ำแม้วันจบที่ส่งมาไม่ตรงกัน');
  assert.equal(eventsAfter[0].endsAt, customEndsAt, 'วันจบเดิมต้องไม่ถูกเปลี่ยน');
});

test('addActivityAction: ออเดอร์เรือ/รถ สร้างออเดอร์พร้อมหลายรายการได้ (dynamic item rows)', async () => {
  const repo = setup();
  await repo.seedDefaultItemCategories();
  const accountId = await repo.createAccount({ name: 'ไร่ลุงตู่' });

  const orderId = await addActivityAction(repo, accountId, {
    type: 'boat_truck_order',
    orderKind: 'truck',
    deadlineSec: 7200,
    items: [
      { name: 'ข้าวสาลี', qtyRequired: 5 },
      { name: 'นม', qtyRequired: 2 },
    ],
  });
  assert.ok(orderId != null);

  const feed = await repo.getDashboardFeed();
  assert.equal(feed.length, 1);
  assert.equal(feed[0].category, 'boat_truck_order');
  assert.equal(feed[0].label, 'truck');
  assert.equal(feed[0].itemCount, 2);
});

test('addActivityAction: ออเดอร์เมือง แยกจากเรือ/รถ (คนละ category ในฟีด)', async () => {
  const repo = setup();
  await repo.seedDefaultItemCategories();
  const accountId = await repo.createAccount({ name: 'ไร่ลุงตู่' });

  await addActivityAction(repo, accountId, {
    type: 'town_order',
    boardSlot: 2,
    deadlineSec: 3600,
    items: [{ name: 'แครอท', qtyRequired: 4 }],
  });

  const feed = await repo.getDashboardFeed();
  assert.equal(feed[0].category, 'town_order');
  assert.equal(feed[0].itemCount, 1);
});

test('addActivityAction คืน null ถ้า type ไม่รู้จัก', async () => {
  const repo = setup();
  const accountId = await repo.createAccount({ name: 'x' });
  const result = await addActivityAction(repo, accountId, { type: 'ผีเสื้อ' });
  assert.equal(result, null);
});
