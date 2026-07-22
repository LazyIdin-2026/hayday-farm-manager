import { useState, useEffect, useMemo } from "react";
import { Clock, Plus, AlertTriangle } from "lucide-react";
import { TYPE_META } from "./typeMeta.js";
import PageBackground from "./PageBackground.jsx";

// ---- เดิมเป็น mock data ทั้งหมด ตอนนี้ FarmDashboard เป็น presentational component ล้วน ----
// รับข้อมูลจริงผ่าน props (accounts, lowStockAlerts) ที่ App.jsx โหลดมาจาก storage/repository.js
// ดีไซน์/สไตล์การ์ด/เลย์เอาต์เหมือนไฟล์ต้นฉบับ farm-dashboard.jsx เป๊ะ การเปลี่ยนแปลงสะสมจนถึงตอนนี้:
// TYPE_META ย้ายไป typeMeta.js (ขยายเป็น 6 หมวดสี), พื้นหลัง gradient+bokeh ย้ายไป PageBackground.jsx
// (ใช้ร่วมกับหน้า Inventory ใหม่) และรับ prop `nav` เป็นช่องว่างให้ App.jsx ใส่แถบสลับหน้าเข้ามา

function fmtCountdown(ms) {
  if (ms <= 0) return "เก็บได้แล้ว!";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}ชม ${m}น`;
  if (m > 0) return `${m}น ${s}วิ`;
  return `${s}วิ`;
}

function ItemRow({ item, tick }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  const remaining = item.end - tick;
  const ready = remaining <= 0;

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: ready ? "linear-gradient(90deg,#E8C2EE,#F5CBDD)" : "rgba(255,255,255,0.55)" }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: meta.bg }}
      >
        <Icon size={15} style={{ color: meta.color }} strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-[#4A3B66]">{item.name}</p>
        <p className="text-[11px] text-[#4A3B66]/50">{item.qty}</p>
      </div>
      <div
        className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
        style={{
          fontFamily: "'Baloo 2', sans-serif",
          color: ready ? "#9A3D72" : "#4A3B66",
          background: ready ? "#F0A9C8" : "#EDE6FA",
        }}
      >
        {fmtCountdown(remaining)}
      </div>
    </div>
  );
}

function AccountCard({ account, tick, onAddActivity }) {
  const sorted = useMemo(
    () => [...account.items].sort((a, b) => a.end - b.end),
    [account.items]
  );
  const readyCount = sorted.filter((i) => i.end - tick <= 0).length;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[22px] backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.72)", boxShadow: "0 10px 28px rgba(150,120,200,0.14)" }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold"
            style={{ background: account.bg, color: account.color, fontFamily: "'Baloo 2', sans-serif" }}
          >
            {account.name.slice(0, 1)}
          </div>
          <div>
            <p className="text-[15.5px] font-bold text-[#4A3B66]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              {account.name}
            </p>
            <p className="text-[11px] text-[#4A3B66]/50">เลเวล {account.level}</p>
          </div>
        </div>
        {readyCount > 0 && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: "linear-gradient(90deg,#F0A9C8,#D9A8EA)", color: "#9A4570", fontFamily: "'Baloo 2', sans-serif" }}
          >
            พร้อมเก็บ {readyCount}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
        {sorted.map((item) => (
          <ItemRow key={item.id} item={item} tick={tick} />
        ))}
        <button
          onClick={() => onAddActivity(account.id)}
          className="mt-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-medium text-[#4A3B66]/40 transition-colors hover:bg-white/60 hover:text-[#4A3B66]/70"
        >
          <Plus size={13} /> เพิ่มกิจกรรม
        </button>
      </div>
    </div>
  );
}

export default function FarmDashboard({ accounts = [], lowStockAlerts = [], onAddAccount, onAddActivity, nav }) {
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const allItems = accounts.flatMap((acc) =>
    acc.items.map((i) => ({ ...i, accountName: acc.name }))
  );
  const readyNow = allItems.filter((i) => i.end - tick <= 0);
  const totalActive = allItems.length;

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
            แดชบอร์ดฟาร์มทั้งหมด
          </h1>
          <p className="text-[13.5px] text-[#4A3B66]/60">
            ดูภาพรวมทุกบัญชี ใครกำลังทำอะไรอยู่ จะได้ไม่วางแผนซ้ำกัน
          </p>
        </div>

        {/* Low stock banner — เพิ่มใหม่ตามที่ brief ขอ "แจ้งเตือนบนแดชบอร์ด" ใช้สไตล์เดียวกับ ready-now rail */}
        {lowStockAlerts.length > 0 && (
          <div
            className="mb-6 flex items-center gap-3 overflow-x-auto rounded-[18px] px-4 py-3"
            style={{ background: "linear-gradient(90deg,#FBD9A8,#F5CBDD)" }}
          >
            <AlertTriangle size={15} className="shrink-0 text-[#9A5D2E]" />
            {lowStockAlerts.map((a) => (
              <span
                key={`${a.accountId}-${a.itemId}`}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium text-[#4A3B66]/85"
                style={{ background: "linear-gradient(90deg,#FCE6C6,#F5D7EC)" }}
              >
                {a.itemNameTh} เหลือ {a.quantity} (ต่ำกว่าเกณฑ์ {a.lowStockThreshold})
              </span>
            ))}
          </div>
        )}

        {/* Summary strip */}
        <div className="mb-7 grid grid-cols-3 gap-3">
          <div className="rounded-[18px] bg-white/70 px-4 py-3.5 backdrop-blur-sm shadow-[0_6px_18px_rgba(150,120,200,0.10)]">
            <p className="text-[11px] text-[#4A3B66]/50">บัญชีทั้งหมด</p>
            <p className="text-[24px] font-extrabold text-[#4A3B66]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              {accounts.length}
            </p>
          </div>
          <div className="rounded-[18px] bg-white/70 px-4 py-3.5 backdrop-blur-sm shadow-[0_6px_18px_rgba(150,120,200,0.10)]">
            <p className="text-[11px] text-[#4A3B66]/50">กิจกรรมกำลังทำ</p>
            <p className="text-[24px] font-extrabold text-[#4A3B66]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              {totalActive}
            </p>
          </div>
          <div
            className="rounded-[18px] px-4 py-3.5 backdrop-blur-sm shadow-[0_6px_18px_rgba(216,105,140,0.18)]"
            style={{ background: readyNow.length ? "linear-gradient(135deg,#E8C2EE,#F5CBDD)" : "rgba(255,255,255,0.7)" }}
          >
            <p className="text-[11px] text-[#4A3B66]/50">พร้อมเก็บตอนนี้</p>
            <p
              className="text-[24px] font-extrabold"
              style={{ fontFamily: "'Baloo 2', sans-serif", color: readyNow.length ? "#9A3D72" : "#4A3B66" }}
            >
              {readyNow.length}
            </p>
          </div>
        </div>

        {/* Ready-now rail */}
        {readyNow.length > 0 && (
          <div
            className="mb-8 flex items-center gap-3 overflow-x-auto rounded-[18px] px-4 py-3"
            style={{ background: "linear-gradient(90deg,#E8C2EE,#F5CBDD)" }}
          >
            <Clock size={15} className="shrink-0 text-[#9A3D72]" />
            {readyNow.map((i) => (
              <span
                key={i.id}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium text-[#4A3B66]/85"
                style={{ background: "linear-gradient(90deg,#F5D7EC,#E4D9F7)" }}
              >
                {i.accountName} · {i.name}
              </span>
            ))}
          </div>
        )}

        {/* Account cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <AccountCard key={acc.id} account={acc} tick={tick} onAddActivity={onAddActivity} />
          ))}
          <button
            onClick={onAddAccount}
            className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-[#D9C8F5] text-[#4A3B66]/40 transition-colors hover:border-[#B79AE8] hover:text-[#4A3B66]/70"
          >
            <Plus size={20} />
            <span className="text-[13.5px] font-medium">เพิ่มบัญชีฟาร์ม</span>
          </button>
        </div>

        {/* Legend */}
        <div className="mt-9 flex flex-wrap gap-2.5">
          {Object.entries(TYPE_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <div
                key={key}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold"
                style={{ background: meta.bg, color: meta.color }}
              >
                <Icon size={12} />
                {meta.label}
              </div>
            );
          })}
        </div>
      </div>
    </PageBackground>
  );
}
