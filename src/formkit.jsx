// ============================================================================
// formkit.jsx — ชิ้นส่วน UI เล็กๆ ที่ใช้ซ้ำในทุก modal form ให้หน้าตาตรงกัน
// โทนเดียวกับการ์ด glassmorphism ของ FarmDashboard.jsx: พื้นขาวโปร่งแสง, ตัวอักษร
// #4A3B66, หัวข้อ/ปุ่มใช้ Baloo 2, เนื้อหาใช้ Nunito
// ============================================================================

// ตั้งใจใช้ <div> แทน <label> ครอบ — เดิมใช้ <label> ซึ่งใช้ได้ดีตอนมี input เดียวข้างใน
// (เช่นช่อง "จำนวน") แต่พังกับช่องที่มี "หลายฟอร์มคอนโทรลอยู่ในป้ายเดียวกัน" (เช่นช่อง "เวลาที่ใช้"
// ที่มีทั้ง NumberInput + SelectInput เลือกหน่วยอยู่ข้างใน <label> เดียวกัน) — เบราว์เซอร์มือถือ
// บางตัว (โดยเฉพาะ WebView) จะสับสนว่าจะโฟกัส/ส่ง synthetic click ไปที่คอนโทรลไหนเมื่อแตะ ทำให้
// แตะแล้วโฟกัสหลุด/พิมพ์ไม่เข้าอย่างไม่คงเส้นคงวา ย้ายมาใช้ <div> ธรรมดาตัดปัญหานี้ทั้งหมด
// (แลกกับการที่แตะข้อความป้ายชื่อฟิลด์แล้วไม่โฟกัส input ให้อัตโนมัติอีกต่อไป แต่ผลกระทบเล็กน้อยมาก)
export function Field({ label, children, hint }) {
  return (
    <div className="mb-3.5 block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-[#4A3B66]/70" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] text-[#4A3B66]/45" style={{ fontFamily: "'Nunito', sans-serif" }}>
          {hint}
        </span>
      )}
    </div>
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

// ปุ่มเล็กๆ สำหรับ "ค่าลัด" ที่แตะเลือกได้ทันทีโดยไม่ต้องพิมพ์ (เช่นเวลาที่ใช้ยอดฮิต) — เผื่อไว้เป็นทาง
// เลือกสำรองกรณีคีย์บอร์ดตัวเลขของอุปกรณ์บางรุ่นมีปัญหา ไม่ต้องพึ่งการพิมพ์เลยก็ใช้งานต่อได้
export function ChipButton({ children, active, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors active:scale-95 ${className}`}
      style={{
        background: active ? "linear-gradient(90deg,#E8C2EE,#F5CBDD)" : "rgba(255,255,255,0.6)",
        color: active ? "#7A2E5C" : "#4A3B6699",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {children}
    </button>
  );
}

// ค่าลัดเวลาที่ใช้บ่อย — แตะเลือกได้ทันทีโดยไม่ต้องพิมพ์ (ทางเลือกสำรองกรณีพิมพ์ในช่องตัวเลขไม่ได้
// บนอุปกรณ์บางรุ่น) ใช้ร่วมกันทั้ง AddActivityModal (เวลาที่ใช้ตอนเพิ่ม) และ EditActivityModal (เวลาที่เหลือตอนแก้)
export const DURATION_PRESETS = [
  { label: "5 น.", value: "5", unit: "minutes" },
  { label: "10 น.", value: "10", unit: "minutes" },
  { label: "15 น.", value: "15", unit: "minutes" },
  { label: "30 น.", value: "30", unit: "minutes" },
  { label: "1 ชม.", value: "1", unit: "hours" },
  { label: "2 ชม.", value: "2", unit: "hours" },
  { label: "4 ชม.", value: "4", unit: "hours" },
  { label: "8 ชม.", value: "8", unit: "hours" },
];

export function DurationPresetRow({ value, unit, onPick }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {DURATION_PRESETS.map((p) => (
        <ChipButton key={p.label} active={value === p.value && unit === p.unit} onClick={() => onPick(p.value, p.unit)}>
          {p.label}
        </ChipButton>
      ))}
    </div>
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
