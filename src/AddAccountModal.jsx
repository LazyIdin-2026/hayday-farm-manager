import { useState } from "react";
import Modal from "./Modal.jsx";
import { Field, TextInput, NumberInput, PrimaryButton, SecondaryButton } from "./formkit.jsx";

// สีสำหรับให้เลือกตอนสร้างบัญชี — หยิบมาจากโทนม่วง/ฟ้า/ชมพูที่ใช้ทั้งแอพ (ไม่ใช้ส้ม/ทอง)
const COLOR_PRESETS = [
  { color: "#C9527F", bg: "#F7D2E4" },
  { color: "#3D8A5C", bg: "#C8ECD2" },
  { color: "#5566C4", bg: "#D3D8F5" },
  { color: "#7A67CC", bg: "#DDD6F7" },
  { color: "#3F86C4", bg: "#CFE3F5" },
  { color: "#C94A78", bg: "#F5CBDD" },
];

export default function AddAccountModal({ open, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("1");
  const [colorIdx, setColorIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setLevel("1");
    setColorIdx(0);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        level: Number.parseInt(level, 10) || 1,
        avatarColor: COLOR_PRESETS[colorIdx].color,
        avatarBg: COLOR_PRESETS[colorIdx].bg,
      });
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="เพิ่มบัญชีฟาร์ม"
      accentColor={COLOR_PRESETS[colorIdx].color}
      footer={
        <>
          <SecondaryButton type="button" onClick={onClose}>
            ยกเลิก
          </SecondaryButton>
          <PrimaryButton type="submit" form="add-account-form" disabled={submitting || !name.trim()}>
            {submitting ? "กำลังบันทึก..." : "เพิ่มบัญชี"}
          </PrimaryButton>
        </>
      }
    >
      <form id="add-account-form" onSubmit={handleSubmit}>
        <Field label="ชื่อบัญชีฟาร์ม">
          <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ไร่ลุงตู่" />
        </Field>
        <Field label="เลเวลปัจจุบัน">
          <NumberInput min={1} value={level} onChange={(e) => setLevel(e.target.value)} />
        </Field>
        <Field label="สีประจำบัญชี">
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setColorIdx(i)}
                aria-label={`เลือกสี ${i + 1}`}
                className="h-8 w-8 rounded-full transition-transform"
                style={{
                  background: p.color,
                  boxShadow: colorIdx === i ? `0 0 0 3px white, 0 0 0 5px ${p.color}` : "none",
                  transform: colorIdx === i ? "scale(1.08)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
