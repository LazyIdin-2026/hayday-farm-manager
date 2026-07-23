import { useEffect, useState, useCallback } from "react";
import FarmDashboard from "./FarmDashboard.jsx";
import InventoryPage from "./InventoryPage.jsx";
import NavTabs from "./NavTabs.jsx";
import AddAccountModal from "./AddAccountModal.jsx";
import AddActivityModal from "./AddActivityModal.jsx";
import { mapAccountsForDashboard } from "./mappers.js";
import { mapInventoryForAccount, mapInventoryMatrix } from "./inventoryMappers.js";
import EditActivityModal from "./EditActivityModal.jsx";
import {
  createAccountAction,
  addActivityAction,
  updateActivityItemAction,
  deleteActivityItemAction,
  collectActivityItemAction,
  fulfillOrderItemAction,
} from "./actions.js";
import { SCHEMA } from "../storage/schema.js";
import { createRepository } from "../storage/repository.js";

// เลือก adapter ตามสภาพแวดล้อมที่รัน: ในเบราว์เซอร์จริงใช้ native IndexedDB (persist ถาวร),
// ถ้าไม่มี indexedDB (เช่นตอน SSR/พรีวิวในสภาพแวดล้อมที่ไม่ใช่เบราว์เซอร์) fallback เป็น memory
// เพื่อให้หน้าเว็บยังเรนเดอร์ได้ ไม่ล่ม — เมื่อ deploy จริงในเบราว์เซอร์จะได้ indexedDBAdapter เสมอ
async function createDefaultRepo() {
  if (typeof indexedDB !== "undefined") {
    const { openIndexedDB, createIndexedDBAdapter } = await import("../storage/adapters/indexedDBAdapter.js");
    const db = await openIndexedDB(SCHEMA, "haydayFarmDB", 1);
    return createRepository(createIndexedDBAdapter(db));
  }
  const { createMemoryAdapter } = await import("../storage/adapters/memoryAdapter.js");
  return createRepository(createMemoryAdapter(SCHEMA));
}

export default function App({ repo: injectedRepo }) {
  const [repo, setRepo] = useState(injectedRepo || null);
  const [view, setView] = useState("dashboard");
  const [accounts, setAccounts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [activityModalAccountId, setActivityModalAccountId] = useState(null);
  const [editActivityItem, setEditActivityItem] = useState(null);

  // -------- Inventory page state --------
  const [selectedInventoryAccountId, setSelectedInventoryAccountId] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryViewMode, setInventoryViewMode] = useState("single"); // "single" | "all"
  const [inventoryMatrix, setInventoryMatrix] = useState([]);

  // โหลดสต็อกของ "ทุกบัญชี" พร้อมกัน แล้วแปลงเป็นตารางเทียบข้ามบัญชี (สำหรับโหมด "ดูทุกบัญชีพร้อมกัน")
  // รับ mappedAccounts เป็นลิสต์รูปแบบเดียวกับ state accounts (มี id/name/color/bg) เพื่อให้ลำดับคอลัมน์
  // ในตารางตรงกับลำดับ pill บัญชีเป๊ะ ๆ เสมอ
  const reloadInventoryMatrix = useCallback(
    async (mappedAccounts, r) => {
      const activeRepo = r || repo;
      if (!activeRepo || !mappedAccounts || mappedAccounts.length === 0) {
        setInventoryMatrix([]);
        return;
      }
      const [catalogItems, categories] = await Promise.all([
        activeRepo.listItems(),
        activeRepo.listItemCategories(),
      ]);
      const rowsByAccountId = new Map();
      await Promise.all(
        mappedAccounts.map(async (acc) => {
          const rows = await activeRepo.getInventory(acc.id);
          rowsByAccountId.set(acc.id, rows);
        })
      );
      setInventoryMatrix(mapInventoryMatrix(catalogItems, categories, mappedAccounts, rowsByAccountId));
    },
    [repo]
  );

  const reload = useCallback(
    async (r) => {
      const activeRepo = r || repo;
      if (!activeRepo) return;
      const [rawAccounts, feed, alerts] = await Promise.all([
        activeRepo.listAccounts(),
        activeRepo.getDashboardFeed(),
        activeRepo.getLowStockAlerts(),
      ]);
      const mappedAccounts = mapAccountsForDashboard(rawAccounts, feed);
      setAccounts(mappedAccounts);
      setLowStockAlerts(alerts);
      await reloadInventoryMatrix(mappedAccounts, activeRepo);
      return rawAccounts;
    },
    [repo, reloadInventoryMatrix]
  );

  const reloadInventory = useCallback(
    async (accountId, r) => {
      const activeRepo = r || repo;
      if (!activeRepo || accountId == null) {
        setInventoryItems([]);
        return;
      }
      const [catalogItems, categories, inventoryRows] = await Promise.all([
        activeRepo.listItems(),
        activeRepo.listItemCategories(),
        activeRepo.getInventory(accountId),
      ]);
      setInventoryItems(mapInventoryForAccount(catalogItems, categories, inventoryRows));
    },
    [repo]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const activeRepo = injectedRepo || (await createDefaultRepo());
      if (cancelled) return;
      await activeRepo.seedDefaultItemCategories();
      setRepo(activeRepo);
      const rawAccounts = await reload(activeRepo);
      if (cancelled) return;
      if (rawAccounts && rawAccounts.length > 0) {
        setSelectedInventoryAccountId(rawAccounts[0].id);
        await reloadInventory(rawAccounts[0].id, activeRepo);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateAccount = useCallback(
    async (formData) => {
      if (!repo) return;
      const newAccountId = await createAccountAction(repo, formData);
      const rawAccounts = await reload(repo);
      // ถ้ายังไม่เคยเลือกบัญชีไหนในหน้าคลังสินค้า (เช่นบัญชีแรกของแอพ) ให้เลือกบัญชีที่เพิ่งสร้างให้เลย
      if (selectedInventoryAccountId == null && newAccountId != null) {
        setSelectedInventoryAccountId(newAccountId);
        await reloadInventory(newAccountId, repo);
      }
      setShowAddAccount(false);
    },
    [repo, reload, reloadInventory, selectedInventoryAccountId]
  );

  const handleCreateActivity = useCallback(
    async (payload) => {
      if (!repo || activityModalAccountId == null) return;
      await addActivityAction(repo, activityModalAccountId, payload);
      await reload(repo);
      if (activityModalAccountId === selectedInventoryAccountId) {
        await reloadInventory(selectedInventoryAccountId, repo);
      }
      setActivityModalAccountId(null);
    },
    [repo, activityModalAccountId, reload, reloadInventory, selectedInventoryAccountId]
  );

  const handleSelectInventoryAccount = useCallback(
    async (accountId) => {
      setSelectedInventoryAccountId(accountId);
      await reloadInventory(accountId, repo);
    },
    [repo, reloadInventory]
  );

  // รับ accountId ตรงๆ (ไม่ใช้ selectedInventoryAccountId แบบ implicit อีกต่อไป) เพื่อให้ใช้ได้ทั้ง
  // โหมด "ดูทีละบัญชี" (แก้ค่าของบัญชีที่เลือกอยู่) และโหมด "ดูทุกบัญชีพร้อมกัน" (แก้ค่าของ cell ไหนก็ได้
  // ในตารางเทียบ โดยแต่ละ cell รู้ accountId ของตัวเองอยู่แล้วจาก mapInventoryMatrix)
  const handleUpdateQuantity = useCallback(
    async (accountId, itemId, quantity) => {
      if (!repo || accountId == null) return;
      await repo.setInventoryQuantity(accountId, itemId, quantity);
      const tasks = [reload(repo)];
      if (accountId === selectedInventoryAccountId) {
        tasks.push(reloadInventory(selectedInventoryAccountId, repo));
      }
      await Promise.all(tasks);
    },
    [repo, selectedInventoryAccountId, reloadInventory, reload]
  );

  const handleUpdateThreshold = useCallback(
    async (accountId, itemId, threshold) => {
      if (!repo || accountId == null) return;
      await repo.setLowStockThreshold(accountId, itemId, threshold);
      const tasks = [reload(repo)];
      if (accountId === selectedInventoryAccountId) {
        tasks.push(reloadInventory(selectedInventoryAccountId, repo));
      }
      await Promise.all(tasks);
    },
    [repo, selectedInventoryAccountId, reloadInventory, reload]
  );

  // เปิด modal แก้ไข/ลบกิจกรรม — แนบ accountId ของบัญชีที่กิจกรรมนั้นอยู่ติดไปกับ item เลย (item เดิม
  // จาก mapAccountsForDashboard ไม่มี accountId ในตัวเอง เพราะถูก group ไว้ใต้ account.items แล้ว)
  const handleOpenEditActivity = useCallback((item, accountId) => {
    setEditActivityItem({ ...item, accountId });
  }, []);

  const handleSaveActivityItem = useCallback(
    async (item, patch) => {
      if (!repo) return;
      try {
        await updateActivityItemAction(repo, item, patch);
      } catch (err) {
        window.alert(err.message);
        return;
      }
      await reload(repo);
      setEditActivityItem(null);
    },
    [repo, reload]
  );

  const handleDeleteActivityItem = useCallback(
    async (item) => {
      if (!repo) return;
      try {
        await deleteActivityItemAction(repo, item);
      } catch (err) {
        window.alert(err.message);
        return;
      }
      await reload(repo);
      if (item.accountId === selectedInventoryAccountId) {
        await reloadInventory(selectedInventoryAccountId, repo);
      }
      setEditActivityItem(null);
    },
    [repo, reload, reloadInventory, selectedInventoryAccountId]
  );

  const handleCollectActivityItem = useCallback(
    async (item) => {
      if (!repo) return;
      try {
        await collectActivityItemAction(repo, item);
      } catch (err) {
        window.alert(err.message);
        return;
      }
      await reload(repo);
      if (item.accountId === selectedInventoryAccountId) {
        await reloadInventory(selectedInventoryAccountId, repo);
      }
      setEditActivityItem(null);
    },
    [repo, reload, reloadInventory, selectedInventoryAccountId]
  );

  const handleFulfillOrderItem = useCallback(
    async (item) => {
      if (!repo) return;
      try {
        await fulfillOrderItemAction(repo, item);
      } catch (err) {
        window.alert(err.message);
        return;
      }
      await reload(repo);
      if (item.accountId === selectedInventoryAccountId) {
        await reloadInventory(selectedInventoryAccountId, repo);
      }
      setEditActivityItem(null);
    },
    [repo, reload, reloadInventory, selectedInventoryAccountId]
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Nunito', sans-serif",
          color: "#4A3B66",
        }}
      >
        กำลังโหลดข้อมูลฟาร์ม...
      </div>
    );
  }

  const nav = <NavTabs active={view} onNavigate={setView} />;

  return (
    <>
      {view === "dashboard" ? (
        <FarmDashboard
          nav={nav}
          accounts={accounts}
          lowStockAlerts={lowStockAlerts}
          onAddAccount={() => setShowAddAccount(true)}
          onAddActivity={(accountId) => setActivityModalAccountId(accountId)}
          onEditActivity={handleOpenEditActivity}
        />
      ) : (
        <InventoryPage
          nav={nav}
          accounts={accounts}
          selectedAccountId={selectedInventoryAccountId}
          onSelectAccount={handleSelectInventoryAccount}
          items={inventoryItems}
          matrixItems={inventoryMatrix}
          viewMode={inventoryViewMode}
          onChangeViewMode={setInventoryViewMode}
          onUpdateQuantity={handleUpdateQuantity}
          onUpdateThreshold={handleUpdateThreshold}
        />
      )}
      <AddAccountModal open={showAddAccount} onClose={() => setShowAddAccount(false)} onSubmit={handleCreateAccount} />
      <AddActivityModal
        open={activityModalAccountId != null}
        onClose={() => setActivityModalAccountId(null)}
        onSubmit={handleCreateActivity}
      />
      <EditActivityModal
        open={editActivityItem != null}
        item={editActivityItem}
        onClose={() => setEditActivityItem(null)}
        onSave={handleSaveActivityItem}
        onDelete={handleDeleteActivityItem}
        onCollect={handleCollectActivityItem}
        onFulfill={handleFulfillOrderItem}
      />
    </>
  );
}
