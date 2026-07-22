import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import PageBackground from "./PageBackground.jsx";
import EditableNumberCell from "./EditableNumberCell.jsx";

// ============================================================================
// InventoryPage.jsx — หน้าคลังสินค้าแยกต่างหาก ดูสต็อกทุกไอเทมต่อบัญชี
// ตั้งเกณฑ์แจ้งเตือนสต็อกต่ำเองได้ (inline edit) ดีไซน์เข้าชุดกับหน้าแดชบอร์ดเป๊ะ
// (ใช้ PageBackground เดียวกัน, การ์ด glassmorphism แบบเดียวกัน, ฟอนต์เดียวกัน)
//
// รองรับ 2 โหมดมุมมอง สลับกันได้ในหน้าเดียว:
//   - "single": ดูทีละบัญชี (แบบ pill เลือกบัญชี) — ตารางไอเทม + คงเหลือ + เกณฑ์แจ้งเตือน ของบัญชีที่เลือก
//   - "all"   : ดูทุกบัญชีพร้อมกัน — ตารางรวม ไอเทม x บัญชี เทียบจำนวนคงเหลือข้ามบัญชีได้ในตารางเดียว
// การบันทึกยังเป็นแบบอัตโนมัติ (auto-save on blur) เหมือนเดิมทั้ง 2 โหมด ไม่มีปุ่มยืนยัน
// ============================================================================

const VIEW_MODES = [
  { key: "single", label: "ดูทีละบัญชี" },
  { key: "all", label: "ดูทุกบัญชีพร้อมกัน" },
];

function ViewModeToggle({ viewMode, onChangeViewMode }) {
  return (
    <div className="mb-6 flex gap-2">
      {VIEW_MODES.map((m) => {
        const active = viewMode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChangeViewMode(m.key)}
            className="rounded-full px-4 py-2 text-[12.5px] font-bold transition-all"
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              background: active ? "linear-gradient(90deg,#7A67CC,#3F86C4)" : "rgba(255,255,255,0.55)",
              color: active ? "#ffffff" : "#4A3B6699",
              boxShadow: active ? "0 6px 16px rgba(120,110,200,0.28)" : "none",
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

export default function InventoryPage({
  nav,
  accounts = [],
  selectedAccountId,
  onSelectAccount,
  items = [],
  matrixItems = [],
  viewMode = "single",
  onChangeViewMode,
  onUpdateQuantity,
  onUpdateThreshold,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.categoryLabel.toLowerCase().includes(q)
    );
  }, [items, search]);

  const filteredMatrix = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return matrixItems;
    return matrixItems.filter(
      (i) => i.name.toLowerCase().includes(q) || i.categoryLabel.toLowerCase().includes(q)
    );
  }, [matrixItems, search]);

  const lowCount = items.filter((i) => i.isLow).length;
  const totalLowCells = matrixItems.reduce((sum, i) => sum + i.cells.filter((c) => c.isLow).length, 0);
  const gridTemplateColumns = `minmax(160px,1fr) repeat(${Math.max(accounts.length, 1)}, 96px)`;

  return (
    <PageBackground>
      <div className="relative mx-auto max-w-5xl">
        {nav}

        {/* Header */}
        <div className="mb-8 flex flex-col gap-1.5">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ fontFamily: "'Baloo 2', sans-serif", color: "#9A3D72" }}
          >
            Multi-Farm Control
          </p>
          <h1
            className="text-[30px] sm:text-[36px]"
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800,
              backgroundImage: "linear-gradient(90deg,#D9527F,#C94A78,#7A67CC,#3F86C4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            คลังสินค้า
          </h1>
          <p className="text-[13.5px] text-[#4A3B66]/60">
            ดูสต็อกทุกไอเทมต่อบัญชี ตั้งเกณฑ์แจ้งเตือนสต็อกต่ำได้เอง
          </p>
        </div>

        <ViewModeToggle viewMode={viewMode} onChangeViewMode={onChangeViewMode} />

        {accounts.length === 0 ? (
          <div className="rounded-[18px] bg-white/70 px-5 py-8 text-center text-[13.5px] text-[#4A3B66]/60 backdrop-blur-sm">
            ยังไม่มีบัญชีฟาร์ม เพิ่มบัญชีในหน้าแดชบอร์ดก่อน แล้วค่อยกลับมาดูคลังสินค้า
          </div>
        ) : viewMode === "single" ? (
          <>
            {/* Account selector */}
            <div className="mb-6 flex flex-wrap gap-2">
              {accounts.map((acc) => {
                const active = acc.id === selectedAccountId;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => onSelectAccount(acc.id)}
                    className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[12.5px] font-semibold transition-all"
                    style={{
                      background: active ? acc.bg : "rgba(255,255,255,0.55)",
                      color: acc.color,
                      boxShadow: active ? `0 0 0 2px ${acc.color}55` : "none",
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: acc.color, fontFamily: "'Baloo 2', sans-serif" }}
                    >
                      {acc.name.slice(0, 1)}
                    </span>
                    {acc.name}
                  </button>
                );
              })}
            </div>

            {/* Summary strip */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] bg-white/70 px-4 py-3.5 backdrop-blur-sm shadow-[0_6px_18px_rgba(150,120,200,0.10)]">
                <p className="text-[11px] text-[#4A3B66]/50">ไอเทมในแคตตาล็อก</p>
                <p className="text-[24px] font-extrabold text-[#4A3B66]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                  {items.length}
                </p>
              </div>
              <div
                className="rounded-[18px] px-4 py-3.5 backdrop-blur-sm shadow-[0_6px_18px_rgba(216,105,140,0.18)]"
                style={{ background: lowCount ? "linear-gradient(135deg,#FBD9A8,#F5CBDD)" : "rgba(255,255,255,0.7)" }}
              >
                <p className="text-[11px] text-[#4A3B66]/50">ต่ำกว่าเกณฑ์</p>
                <p
                  className="text-[24px] font-extrabold"
                  style={{ fontFamily: "'Baloo 2', sans-serif", color: lowCount ? "#9A5D2E" : "#4A3B66" }}
                >
                  {lowCount}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาไอเทมหรือหมวด..."
                className="w-full rounded-xl border border-white/70 bg-white/60 px-3.5 py-2.5 text-[14px] text-[#4A3B66] outline-none transition-shadow placeholder:text-[#4A3B66]/35 focus:border-[#C9A8EA] focus:ring-2 focus:ring-[#E4D3F7]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              />
            </div>

            {/* Item table */}
            <div
              className="overflow-hidden rounded-[22px] backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.72)", boxShadow: "0 10px 28px rgba(150,120,200,0.14)" }}
            >
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-white/50 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-[#4A3B66]/45">
                <span>ไอเทม</span>
                <span className="text-right">คงเหลือ</span>
                <span className="text-right">เกณฑ์แจ้งเตือน</span>
              </div>
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-[#4A3B66]/50">ไม่พบไอเทมที่ค้นหา</div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item.itemId}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5"
                    style={{
                      background: item.isLow ? "linear-gradient(90deg,rgba(251,217,168,0.35),rgba(245,203,221,0.35))" : "transparent",
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.categoryColor }} />
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-[#4A3B66]">{item.name}</p>
                        <p className="text-[10.5px] text-[#4A3B66]/45">{item.categoryLabel}</p>
                      </div>
                      {item.isLow && <AlertTriangle size={13} className="shrink-0 text-[#9A5D2E]" />}
                    </div>
                    <EditableNumberCell
                      value={item.quantity}
                      onCommit={(v) => onUpdateQuantity(selectedAccountId, item.itemId, v ?? 0)}
                    />
                    <EditableNumberCell
                      value={item.lowStockThreshold}
                      placeholder="ไม่ตั้ง"
                      allowClear
                      onCommit={(v) => onUpdateThreshold(selectedAccountId, item.itemId, v)}
                    />
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Summary strip (all accounts) */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] bg-white/70 px-4 py-3.5 backdrop-blur-sm shadow-[0_6px_18px_rgba(150,120,200,0.10)]">
                <p className="text-[11px] text-[#4A3B66]/50">ไอเทมในแคตตาล็อก</p>
                <p className="text-[24px] font-extrabold text-[#4A3B66]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                  {matrixItems.length}
                </p>
              </div>
              <div
                className="rounded-[18px] px-4 py-3.5 backdrop-blur-sm shadow-[0_6px_18px_rgba(216,105,140,0.18)]"
                style={{ background: totalLowCells ? "linear-gradient(135deg,#FBD9A8,#F5CBDD)" : "rgba(255,255,255,0.7)" }}
              >
                <p className="text-[11px] text-[#4A3B66]/50">จุดต่ำกว่าเกณฑ์ (รวมทุกบัญชี)</p>
                <p
                  className="text-[24px] font-extrabold"
                  style={{ fontFamily: "'Baloo 2', sans-serif", color: totalLowCells ? "#9A5D2E" : "#4A3B66" }}
                >
                  {totalLowCells}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาไอเทมหรือหมวด..."
                className="w-full rounded-xl border border-white/70 bg-white/60 px-3.5 py-2.5 text-[14px] text-[#4A3B66] outline-none transition-shadow placeholder:text-[#4A3B66]/35 focus:border-[#C9A8EA] focus:ring-2 focus:ring-[#E4D3F7]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              />
            </div>

            {/* Comparison matrix: item x account */}
            <div
              className="overflow-x-auto rounded-[22px] backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.72)", boxShadow: "0 10px 28px rgba(150,120,200,0.14)" }}
            >
              <div style={{ minWidth: `${160 + accounts.length * 96}px` }}>
                <div
                  className="grid items-center gap-3 border-b border-white/50 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-[#4A3B66]/45"
                  style={{ gridTemplateColumns }}
                >
                  <span>ไอเทม</span>
                  {accounts.map((acc) => (
                    <span key={acc.id} className="flex items-center justify-end gap-1.5 truncate text-right normal-case">
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ background: acc.color, fontFamily: "'Baloo 2', sans-serif" }}
                      >
                        {acc.name.slice(0, 1)}
                      </span>
                      <span className="truncate">{acc.name}</span>
                    </span>
                  ))}
                </div>
                {filteredMatrix.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-[#4A3B66]/50">ไม่พบไอเทมที่ค้นหา</div>
                ) : (
                  filteredMatrix.map((item) => (
                    <div
                      key={item.itemId}
                      className="grid items-center gap-3 px-4 py-2.5"
                      style={{ gridTemplateColumns }}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.categoryColor }} />
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium text-[#4A3B66]">{item.name}</p>
                          <p className="text-[10.5px] text-[#4A3B66]/45">{item.categoryLabel}</p>
                        </div>
                      </div>
                      {item.cells.map((cell) => (
                        <div
                          key={cell.accountId}
                          className="flex items-center justify-end gap-1 rounded-lg px-1 py-1"
                          style={{
                            background: cell.isLow
                              ? "linear-gradient(90deg,rgba(251,217,168,0.35),rgba(245,203,221,0.35))"
                              : "transparent",
                          }}
                        >
                          {cell.isLow && <AlertTriangle size={11} className="shrink-0 text-[#9A5D2E]" />}
                          <EditableNumberCell
                            value={cell.quantity}
                            onCommit={(v) => onUpdateQuantity(cell.accountId, item.itemId, v ?? 0)}
                          />
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageBackground>
  );
}
