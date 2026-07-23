import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { TYPE_META } from "./typeMeta.js";
import { Field, NumberInput, SelectInput, PrimaryButton, SecondaryButton, DangerButton } from "./formkit.jsx";

// ประเภทที่แก้ไขจำนวน/เวลาได้ตรงๆ (มีฟิลด์ quantity + endsAt เดี่ยว) ต่างจากออเดอร์ที่เป็นรายการหลายไอเทม
const EDITABLE_TYPES = ["crop", "animal", "production", "event_production"];
const ORDER_TYPES = ["boat_truck_order", "town_order"];

// เลือกหน่วยเวลาให้อ่านง่ายจากเวลาที่เหลือจริง: น้อยกว่า 2 ชม. โชว์เป็นนาที ไม่งั้นโชว์เป็นชั่วโมง (ทศนิยม 1 ตำแหน่ง)
function msToDurationField(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  if (totalMinutes < 120) return { value: String(totalMinutes), unit: "minutes" };
  return { value: String(Math.round((totalMinutes / 60) * 10) / 10), unit: "hours" };
}

// ============================================================================
// EditActivityModal.jsx — เปิดจากการแตะรายการกิจกรรมในแดชบอร์ด ให้แก้ไข "จำนวน"/"เวลาที่เหลือ"
// ที่กรอกผิดตอนเพิ่มได้ (เช่นใส่หน่วยเวลาผิด), ลบกิจกรรมทิ้ง, หรือเก็บเลย/ทำเครื่องหมายว่าส่งแล้ว
// รองรับ 2 กลุ่ม: กิจกรรมเดี่ยว (พืชผล/สัตว์เลี้ยง/โรงงาน/โรงงานอีเวนต์) แก้ได้เต็มที่ ส่วนออเดอร์
// (เรือ/รถ/เมือง) ยังแก้รายการไอเทมไม่ได้ในหน้านี้ — ทำได้แค่ลบทิ้งหรือทำเครื่องหมายว่าส่งแล้ว
// ============================================================================
export default function EditActivityModal({ open, item, onClose, onSave, onDelete, onCollect, onFulfill }) {
  const [quantity, setQuantity] = useState("1");
  const [durationValue, setDurationValue] = useState("0");
  const [durationUnit, setDurationUnit] = useState("minutes");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!item) return;
    setConfirmDelete(false);
    setBusy(false);
    if (item.quantity != null) setQuantity(String(item.quantity));
    const d = msToDurationField(item.end - Date.now());
    setDurationValue(d.value);
    setDurationUnit(d.unit);
  }, [item]);

  if (!open || !item) return null;

  const isEditable = EDITABLE_TYPES.includes(item.type);
  const isOrder = ORDER_TYPES.includes(item.type);
  const isReady = item.end - Date.now() <= 0;
  const meta = TYPE_META[item.type];

  function durationSec() {
    const v = Number.parseFloat(durationValue) || 0;
    return Math.round(durationUnit === "hours" ? v * 3600 : v * 60);
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(item, { quantity: Number.parseInt(quantity, 10) || 1, durationSec: durationSec() });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await onDelete(item);
    } finally {
      setBusy(false);
    }
  }

  async function handleCollectOrFulfill() {
    setBusy(true);
    try {
      if (isOrder) await onFulfill(item);
      else await onCollect(item);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isOrder ? "จัดการออเดอร์" : "แก้ไขกิจกรรม"}
      accentColor={meta?.color}
      footer={
        <>
          <DangerButton type="button" onClick={handleDelete} disabled={busy}>
            {confirmDelete ? "ยืนยันลบ?" : "ลบ"}
          </DangerButton>
          <SecondaryButton type="button" onClick={onClose} disabled={busy}>
            ปิด
          </SecondaryButton>
          {isOrder ? (
            <PrimaryButton type="button" onClick={handleCollectOrFulfill} disabled={busy}>
              {busy ? "กำลังบันทึก..." : "ทำเครื่องหมายว่าส่งแล้ว"}
            </PrimaryButton>
          ) : (
            <PrimaryButton type="submit" form="edit-activity-form" disabled={busy}>
              {busy ? "กำลังบันทึก..." : "บันทึก"}
            </PrimaryButton>
          )}
        </>
      }
    >
      <p className="mb-1 text-[13.5px] font-medium text-[#4A3B66]">{item.name}</p>
      <p className="mb-4 text-[11.5px] text-[#4A3B66]/45">{meta?.label}</p>

      {isReady && (
        <button
          type="button"
          onClick={handleCollectOrFulfill}
          disabled={busy}
          className="mb-4 flex w-full items-center justify-center rounded-xl py-2.5 text-[13px] font-bold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "linear-gradient(90deg,#F0A9C8,#D9A8EA)", color: "#7A2E5C", fontFamily: "'Baloo 2', sans-serif" }}
        >
          🎉 {isOrder ? "ครบตามที่ต้องส่งแล้ว — ทำเครื่องหมายว่าส่งแล้ว" : "เก็บได้แล้ว — เก็บเลย"}
        </button>
      )}

      {isEditable ? (
        <form id="edit-activity-form" onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="จำนวน">
              <NumberInput min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </Field>
            <Field label="เวลาที่เหลือ">
              <div className="flex gap-1.5">
                <NumberInput min={0} value={durationValue} onChange={(e) => setDurationValue(e.target.value)} className="min-w-0 flex-1" />
                <SelectInput value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className="w-24 shrink-0">
                  <option value="minutes">นาที</option>
                  <option value="hours">ชั่วโมง</option>
                </SelectInput>
              </div>
            </Field>
          </div>
        </form>
      ) : (
        <p className="text-[12.5px] text-[#4A3B66]/60">
          ออเดอร์นี้ยังแก้ไขรายการไอเทมจากหน้านี้ไม่ได้ — ถ้ากรอกผิด ลบทิ้งแล้วสร้างใหม่ได้เลย
        </p>
      )}
    </Modal>
  );
}
