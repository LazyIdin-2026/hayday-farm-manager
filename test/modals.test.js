import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AddAccountModal from '../src/AddAccountModal.jsx';
import AddActivityModal from '../src/AddActivityModal.jsx';
import FarmDashboard from '../src/FarmDashboard.jsx';
import { TYPE_META, ACTIVITY_TYPE_ORDER } from '../src/typeMeta.js';

test('AddAccountModal ไม่เรนเดอร์อะไรเลยตอน open=false', () => {
  const html = renderToStaticMarkup(
    React.createElement(AddAccountModal, { open: false, onClose: () => {}, onSubmit: () => {} })
  );
  assert.equal(html, '');
});

test('AddAccountModal เรนเดอร์ฟอร์มกระจก (glassmorphism) พร้อมสีให้เลือกตอน open=true', () => {
  const html = renderToStaticMarkup(
    React.createElement(AddAccountModal, { open: true, onClose: () => {}, onSubmit: () => {} })
  );
  assert.match(html, /เพิ่มบัญชีฟาร์ม/);
  assert.match(html, /ชื่อบัญชีฟาร์ม/);
  assert.match(html, /เลเวลปัจจุบัน/);
  assert.match(html, /สีประจำบัญชี/);
  assert.match(html, /backdrop-filter/); // ยืนยันว่าใช้สไตล์ glass จริง ไม่ใช่ modal ธรรมดา
});

test('AddActivityModal แสดงตัวเลือกครบทั้ง 6 ประเภทกิจกรรม พร้อม label ภาษาไทยที่ถูกต้อง', () => {
  const html = renderToStaticMarkup(
    React.createElement(AddActivityModal, { open: true, onClose: () => {}, onSubmit: () => {} })
  );
  assert.equal(ACTIVITY_TYPE_ORDER.length, 6, 'ต้องมี 6 ประเภทกิจกรรมจริงตาม schema');
  for (const key of ACTIVITY_TYPE_ORDER) {
    assert.match(html, new RegExp(TYPE_META[key].label), `ต้องมีปุ่มเลือกประเภท "${TYPE_META[key].label}" (${key})`);
  }
  // ค่าเริ่มต้นคือ crop -> ต้องเห็นฟอร์มแบบง่าย (ชื่อกิจกรรม/ผลผลิต)
  assert.match(html, /ชื่อกิจกรรม\/ผลผลิต/);
});

test('AddActivityModal (โรงงานอีเวนต์) มีช่องกรอกวันจบอีเวนต์ให้เลือกเอง พร้อมค่าเริ่มต้นที่แก้ไขได้', () => {
  const html = renderToStaticMarkup(
    React.createElement(AddActivityModal, { open: true, onClose: () => {}, onSubmit: () => {}, initialType: 'event_production' })
  );
  assert.match(html, /วันจบอีเวนต์/, 'ต้องมี label ช่องกรอกวันจบอีเวนต์');
  assert.match(html, /type="date"/, 'ต้องเป็น input แบบเลือกวันที่ (type=date) ไม่ใช่ text ธรรมดา');
  // ค่าเริ่มต้น (prefill) ต้องเป็นวันที่ในรูปแบบ YYYY-MM-DD ที่แก้ไขได้ ไม่ fix 7 วันแบบก่อนหน้า
  assert.match(html, /value="\d{4}-\d{2}-\d{2}"/);
});

test('FarmDashboard legend แสดงครบ 6 สีตาม TYPE_META ใหม่ (ไม่ใช่ 4 หมวดเดิมแล้ว)', () => {
  const html = renderToStaticMarkup(
    React.createElement(FarmDashboard, { accounts: [], lowStockAlerts: [], onAddAccount: () => {}, onAddActivity: () => {} })
  );
  for (const key of ACTIVITY_TYPE_ORDER) {
    assert.match(html, new RegExp(TYPE_META[key].label), `legend ต้องมีหมวด "${TYPE_META[key].label}"`);
  }
});

test('TYPE_META ใช้ hex สีที่ถูกต้อง และทั้ง 6 ประเภทมีสีไม่ซ้ำกันเลย', () => {
  for (const key of ACTIVITY_TYPE_ORDER) {
    const { color } = TYPE_META[key];
    assert.match(color, /^#[0-9A-Fa-f]{6}$/, `สีของ ${key} ต้องเป็น hex ที่ถูกต้อง`);
  }
  // เช็คว่า 6 สีไม่ซ้ำกันเลย (แต่ละประเภทต้องแยกสีชัดเจนตามที่ขอ)
  const colors = ACTIVITY_TYPE_ORDER.map((k) => TYPE_META[k].color);
  assert.equal(new Set(colors).size, 6, 'ทั้ง 6 ประเภทต้องมีสีไม่ซ้ำกันเลย');
});
