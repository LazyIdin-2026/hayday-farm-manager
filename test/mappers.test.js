import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA } from '../storage/schema.js';
import { createMemoryAdapter } from '../storage/adapters/memoryAdapter.js';
import { createRepository } from '../storage/repository.js';
import { mapAccountsForDashboard } from '../src/mappers.js';

test('mapAccountsForDashboard แปลงข้อมูล repo จริงให้ตรง shape ที่ FarmDashboard.jsx ต้องการ', async () => {
  const repo = createRepository(createMemoryAdapter(SCHEMA));
  await repo.seedDefaultItemCategories();

  const accountId = await repo.createAccount({ name: 'ไร่ลุงตู่', level: 78, avatarColor: '#C9527F', avatarBg: '#F7D2E4' });
  const wheatId = await repo.upsertItem({ name: 'wheat', nameTh: 'ข้าวสาลี', categoryId: 'crop' });

  await repo.startActivity({
    accountId, activityType: 'crop', itemId: wheatId, recipeId: null,
    slotLabel: 'ข้าวสาลี แปลง 3', quantity: 6, durationSec: 120,
  });
  await repo.createBoatTruckOrder({
    accountId, orderType: 'boat',
    items: [{ itemId: wheatId, qtyRequired: 3 }],
    deadline: new Date(Date.now() + 7200000).toISOString(),
  });

  const accounts = await repo.listAccounts();
  const feed = await repo.getDashboardFeed();
  const mapped = mapAccountsForDashboard(accounts, feed);

  assert.equal(mapped.length, 1);
  const acc = mapped[0];
  assert.equal(acc.name, 'ไร่ลุงตู่');
  assert.equal(acc.color, '#C9527F');
  assert.equal(acc.bg, '#F7D2E4');
  assert.equal(acc.items.length, 2);

  const cropItem = acc.items.find((i) => i.type === 'crop');
  assert.ok(cropItem, 'ต้อง map activityType=crop -> dashboard type=crop');
  assert.equal(cropItem.qty, 'x6');
  assert.equal(cropItem.name, 'ข้าวสาลี แปลง 3');
  assert.ok(typeof cropItem.end === 'number' && cropItem.end > Date.now());

  const orderItem = acc.items.find((i) => i.type === 'boat_truck_order');
  assert.ok(orderItem, 'boat_truck_order ต้อง map ตรงตัว ไม่พับรวมกับ town_order อีกต่อไป (6 สีแยกกันแล้ว)');
  assert.equal(orderItem.qty, '1 รายการ');
});

test('mapAccountsForDashboard แยก 6 ประเภทกิจกรรมตรงตัว ไม่พับรวมกันอีกต่อไป', async () => {
  const repo = createRepository(createMemoryAdapter(SCHEMA));
  await repo.seedDefaultItemCategories();
  const accountId = await repo.createAccount({ name: 'ฟาร์มทดสอบ' });
  const itemId = await repo.upsertItem({ name: 'x', nameTh: 'x', categoryId: 'material' });

  await repo.startActivity({ accountId, activityType: 'animal', itemId, recipeId: null, slotLabel: 'a', quantity: 1, durationSec: 60 });
  const eventId = await repo.createEvent({ name: 'อีเวนต์ x', endsAt: new Date(Date.now() + 86400000).toISOString() });
  await repo.startEventProduction({ accountId, eventId, machineName: 'เครื่อง x', itemId, quantity: 1, durationSec: 60 });
  await repo.createTownOrder({ accountId, items: [{ itemId, qtyRequired: 1 }] });

  const accounts = await repo.listAccounts();
  const feed = await repo.getDashboardFeed();
  const mapped = mapAccountsForDashboard(accounts, feed);
  const types = mapped[0].items.map((i) => i.type).sort();
  assert.deepEqual(types, ['animal', 'event_production', 'town_order']);
});

test('mapAccountsForDashboard รับ accounts ว่างได้โดยไม่ throw', () => {
  const mapped = mapAccountsForDashboard([], []);
  assert.deepEqual(mapped, []);
});
