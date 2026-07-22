// ============================================================================
// NavTabs.jsx — แถบสลับหน้า "แดชบอร์ด" / "คลังสินค้า" ใช้สไตล์ pill เดียวกับ TypePill
// (gradient ตอน active, ขาวโปร่งแสงตอนไม่ active) วางไว้บนสุดของทั้งสองหน้า
// ============================================================================
const TABS = [
  { key: "dashboard", label: "แดชบอร์ด" },
  { key: "inventory", label: "คลังสินค้า" },
];

export default function NavTabs({ active, onNavigate }) {
  return (
    <div className="mb-6 flex gap-2">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onNavigate(tab.key)}
            className="rounded-full px-4 py-2 text-[13px] font-bold transition-all"
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              background: isActive ? "linear-gradient(90deg,#D9527F,#C94A78,#7A67CC)" : "rgba(255,255,255,0.6)",
              color: isActive ? "#ffffff" : "#4A3B6699",
              boxShadow: isActive ? "0 6px 16px rgba(150,90,170,0.28)" : "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
