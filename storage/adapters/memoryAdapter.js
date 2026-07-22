// ============================================================================
// memoryAdapter — เก็บข้อมูลใน memory (Map) ใช้สำหรับเทส/dev เท่านั้น
// มี API หน้าตาเดียวกับ indexedDBAdapter.js เป๊ะๆ เพื่อให้ repository.js
// ใช้โค้ดชุดเดียวกันได้ทั้งสองฝั่ง (สลับ adapter ได้โดยไม่ต้องแก้ business logic)
//
// จำลอง "transaction แบบ atomic": ก่อนรัน callback จะ clone state ทั้งหมดที่เกี่ยวข้อง
// ถ้า callback throw ระหว่างทาง -> clone ถูกทิ้งไป ของเดิมไม่เปลี่ยนแปลงเลย (rollback)
// ถ้า callback จบโดยไม่ throw -> ค่อย commit clone กลับเข้า state จริงทีเดียว
// ============================================================================

export function createMemoryAdapter(schema) {
  const state = {};
  const counters = {};
  for (const table of Object.keys(schema)) {
    state[table] = new Map();
    counters[table] = 1;
  }

  function cloneState() {
    const s = {};
    for (const table of Object.keys(schema)) s[table] = new Map(state[table]);
    return s;
  }

  function buildApi(targetState, targetCounters, insideTx) {
    return {
      async getAll(table) {
        return Array.from(targetState[table].values()).map((r) => ({ ...r }));
      },
      async get(table, id) {
        const r = targetState[table].get(id);
        return r ? { ...r } : undefined;
      },
      async getByIndex(table, field, value) {
        return Array.from(targetState[table].values())
          .filter((r) => r[field] === value)
          .map((r) => ({ ...r }));
      },
      async add(table, record) {
        const id = record.id ?? targetCounters[table]++;
        if (targetState[table].has(id)) {
          throw new Error(`Duplicate key ${String(id)} in table "${table}"`);
        }
        targetState[table].set(id, { ...record, id });
        return id;
      },
      async put(table, record) {
        if (record.id == null) throw new Error(`put() ต้องมี id (table: ${table})`);
        targetState[table].set(record.id, { ...record });
        return record.id;
      },
      async delete(table, id) {
        targetState[table].delete(id);
      },
      async transaction(_tables, cb) {
        if (insideTx) {
          // เรียกซ้อนภายใน transaction เดิม — ใช้ scope เดียวกัน ไม่ clone ซ้ำ
          return cb(buildApi(targetState, targetCounters, true));
        }
        const clone = cloneState();
        const cloneCounters = { ...counters };
        // ถ้า cb throw ตรงนี้ จะไม่ไปถึงโค้ด commit ด้านล่าง -> clone ถูกทิ้ง (rollback)
        const result = await cb(buildApi(clone, cloneCounters, true));
        // commit: เขียนทับ Map เดิมด้วยของใน clone (mutate in place ไม่ reassign ตัวแปร)
        for (const table of Object.keys(schema)) {
          targetState[table].clear();
          for (const [k, v] of clone[table]) targetState[table].set(k, v);
        }
        Object.assign(targetCounters, cloneCounters);
        return result;
      },
    };
  }

  return buildApi(state, counters, false);
}
