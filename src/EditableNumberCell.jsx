import { useEffect, useState } from "react";

// ============================================================================
// EditableNumberCell.jsx — ช่องตัวเลขแบบแก้ไข inline บันทึกอัตโนมัติตอน blur
// (ไม่มีปุ่มยืนยัน) ใช้ร่วมกันทั้งตาราง "ดูทีละบัญชี" และตารางเทียบ "ทุกบัญชีพร้อมกัน"
// ============================================================================

const cellInputClass =
  "w-20 rounded-lg border border-white/70 bg-white/60 px-2 py-1.5 text-right text-[13px] text-[#4A3B66] outline-none transition-shadow focus:border-[#C9A8EA] focus:ring-2 focus:ring-[#E4D3F7]";

export default function EditableNumberCell({ value, placeholder, onCommit, min = 0, allowClear = false }) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (allowClear && value != null) onCommit(null);
      else setDraft(value == null ? "" : String(value)); // ไม่ให้เคลียร์ค่าจำนวนคงเหลือเป็นค่าว่าง
      return;
    }
    const num = Number.parseInt(trimmed, 10);
    if (Number.isNaN(num)) {
      setDraft(value == null ? "" : String(value));
      return;
    }
    if (num !== value) onCommit(num);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      min={min}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      className={cellInputClass}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    />
  );
}
