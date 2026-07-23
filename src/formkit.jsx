// ============================================================================
// formkit.jsx — ชิ้นส่วน UI เล็กๆ ที่ใช้ซ้ำในทุก modal form ให้หน้าตาตรงกัน
// โทนเดียวกับการ์ด glassmorphism ของ FarmDashboard.jsx: พื้นขาวโปร่งแสง, ตัวอักษร
// #4A3B66, หัวข้อ/ปุ่มใช้ Baloo 2, เนื้อหาใช้ Nunito
// ============================================================================

export function Field({ label, children, hint }) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-[#4A3B66]/70" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] text-[#4A3B66]/45" style={{ fontFamily: "'Nunito', sans-serif" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-white/70 bg-white/60 px-3.5 py-2.5 text-[14px] text-[#4A3B66] outline-none transition-shadow placeholder:text-[#4A3B66]/35 focus:border-[#C9A8EA] focus:ring-2 focus:ring-[#E4D3F7]";

export function TextInput({ className = "", style, ...props }) {
  return <input {...props} className={`${inputBase} ${className}`} style={{ fontFamily: "'Nunito', sans-serif", ...style }} />;
}

// ตั้งใจใช้ type="text" + inputMode="decimal" แทน type="number" ตรงๆ — เบราว์เซอร์มือถือ
// บางรุ่น/บางล็อกเกล (เช่น Android ที่ตั้งค่าเป็นภาษาไทย) มีบั๊กที่ type="number" ปฏิเสธการพิมพ์
// ตัวเลขเงียบๆ (คีย์บอร์ดตัวเลขขึ้นให้ปกติ แต่กดแล้วไม่มีอะไรขึ้นในช่อง) เพราะตีความ decimal
// separator/locale ผิด — inputMode="decimal" ยังเรียกคีย์บอร์ดตัวเลขขึ้นมาเหมือนเดิม แต่พิมพ์ได้แน่นอนกว่า
export function NumberInput({ className = "", style, ...props }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      {...props}
      className={`${inputBase} ${className}`}
      style={{ fontFamily: "'Nunito', sans-serif", ...style }}
    />
  );
}

export function DateInput({ className = "", style, ...props }) {
  return <input type="date" {...props} className={`${inputBase} ${className}`} style={{ fontFamily: "'Nunito', sans-serif", ...style }} />;
}

export function SelectInput({ className = "", style, children, ...props }) {
  return (
    <select {...props} className={`${inputBase} ${className}`} style={{ fontFamily: "'Nunito', sans-serif", ...style }}>
      {children}
    </select>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-full px-5 py-2.5 text-[13.5px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ fontFamily: "'Baloo 2', sans-serif", background: "linear-gradient(90deg,#D9527F,#C94A78,#7A67CC)" }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-[#4A3B66]/70 transition-colors hover:bg-[#4A3B66]/10 ${className}`}
      style={{ fontFamily: "'Baloo 2', sans-serif" }}
    >
      {children}
    </button>
  );
}

// ปุ่มสำหรับการกระทำที่ทำลายข้อมูล (ลบ) — โทนแดง-พิงก์อุ่นแยกจาก PrimaryButton (ม่วง-ชมพู) ให้เห็นชัดว่าต่างกัน
// แต่ยังคงเป็น pill gradient เข้าชุดกับดีไซน์เดิม ไม่ใช่สีแดงจัดแบบ error ทั่วไป
export function DangerButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-full px-5 py-2.5 text-[13.5px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ fontFamily: "'Baloo 2', sans-serif", background: "linear-gradient(90deg,#E8677A,#D9527F)" }}
    >
      {children}
    </button>
  );
}

export function TypePill({ active, color, bg, icon: Icon, label, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all"
      style={{
        background: active ? bg : "rgba(255,255,255,0.55)",
        color: active ? color : "#4A3B6699",
        boxShadow: active ? `0 0 0 2px ${color}55` : "none",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}
