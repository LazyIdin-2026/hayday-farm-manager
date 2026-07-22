// ============================================================================
// indexedDBAdapter — adapter จริงสำหรับใช้ในเบราว์เซอร์ (native IndexedDB, ไม่มี dependency ภายนอก)
// มี API หน้าตาเดียวกับ memoryAdapter.js เป๊ะๆ (getAll/get/getByIndex/add/put/delete/transaction)
// เพื่อให้ repository.js เขียนครั้งเดียวใช้ได้ทั้งสองฝั่ง
//
// หมายเหตุ: ไฟล์นี้รันได้เฉพาะในเบราว์เซอร์ (ต้องมี global `indexedDB`) — ไม่ได้ถูกรันจริงในแซนด์บ็อกซ์นี้
// เพราะไม่มีเบราว์เซอร์/ไม่สามารถติดตั้ง polyfill ผ่าน npm ได้ (network ของ session นี้บล็อก npm registry)
// แต่โครงสร้างเป็น native IndexedDB มาตรฐาน + ใช้ API เดียวกับ memoryAdapter ที่เทสผ่านจริงแล้วในทุก
// business-logic ผ่าน repository.js — ความเสี่ยงที่เหลือคือรายละเอียดปลีกย่อยของ IndexedDB event ล้วนๆ
// แนะนำให้ลองรันเปิดแอพจริงในเบราว์เซอร์ครั้งแรกแล้วเช็ค console อีกที
// ============================================================================

export function openIndexedDB(schema, dbName = 'haydayFarmDB', version = 1) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, version);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [table, def] of Object.entries(schema)) {
        if (db.objectStoreNames.contains(table)) continue;
        const store = db.createObjectStore(table, {
          keyPath: def.keyPath,
          autoIncrement: def.autoIncrement,
        });
        for (const idx of def.indexes || []) {
          store.createIndex(idx.name, idx.name, { unique: !!idx.unique });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createIndexedDBAdapter(db) {
  function buildApi(existingTx) {
    function storeFor(table, mode) {
      const t = existingTx || db.transaction(table, mode);
      return t.objectStore(table);
    }
    return {
      async getAll(table) {
        return new Promise((resolve, reject) => {
          const req = storeFor(table, 'readonly').getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      },
      async get(table, id) {
        return new Promise((resolve, reject) => {
          const req = storeFor(table, 'readonly').get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      },
      async getByIndex(table, field, value) {
        return new Promise((resolve, reject) => {
          const req = storeFor(table, 'readonly').index(field).getAll(value);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      },
      async add(table, record) {
        return new Promise((resolve, reject) => {
          const req = storeFor(table, 'readwrite').add(record);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      },
      async put(table, record) {
        return new Promise((resolve, reject) => {
          const req = storeFor(table, 'readwrite').put(record);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      },
      async delete(table, id) {
        return new Promise((resolve, reject) => {
          const req = storeFor(table, 'readwrite').delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      },
      async transaction(tables, cb) {
        if (existingTx) {
          // ซ้อน transaction เดิม (ใช้ native transaction เดียวกันต่อ)
          return cb(buildApi(existingTx));
        }
        return new Promise((resolve, reject) => {
          const nativeTx = db.transaction(tables, 'readwrite');
          let settled = false;
          const api = buildApi(nativeTx);
          let result;
          Promise.resolve()
            .then(() => cb(api))
            .then((r) => { result = r; })
            .catch((err) => {
              settled = true;
              try { nativeTx.abort(); } catch (_e) { /* ignore */ }
              reject(err);
            });
          nativeTx.oncomplete = () => { if (!settled) resolve(result); };
          nativeTx.onerror = () => { if (!settled) reject(nativeTx.error); };
          nativeTx.onabort = () => {
            if (!settled) reject(nativeTx.error || new Error('IndexedDB transaction aborted'));
          };
        });
      },
    };
  }
  return buildApi(null);
}
