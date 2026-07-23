import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "./Modal.jsx";
import { TYPE_META, ACTIVITY_TYPE_ORDER } from "./typeMeta.js";
import { Field, TextInput, NumberInput, DateInput, SelectInput, PrimaryButton, SecondaryButton, TypePill, DurationPresetRow } from "./formkit.jsx";

const SIMPLE_TYPES = ["crop", "animal", "production"];
const ORDER_TYPES = ["boat_truck_order", "town_order"];

function emptyItemRow() {
  return { name: "", qty: "1" };
}

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultEventEndDate() {
  return toDateInputValue(new Date(Date.now() + 7 * 24 * 3600 * 1000));
}

// ============================================================================
// AddActivityModal.jsx — เลือกได้ทั้ง 6 ประเภทกิจกรรมจริง (ไม่ใช่แค่ 3 แบบเดิม)
// ฟอร์มด้านล่างเปลี่ยนตามประเภทที่เลือก เพราะแต่ละประเภทต้องการข้อมูลไม่เหมือนกัน:
//   - พืชผล/สัตว์เลี้ยง/โรงงาน  -> ชื่อ + จำนวน + เวลาที่ใช้
//   - โรงงานอีเวนต์             -> ชื่ออีเวนต์ + ชื่อเครื่อง + ผลผลิต + จำนวน + เวลา
//   - ออเดอร์เรือ/รถ, ออเดอร์เมือง -> รายการไอเทมที่ต้องส่ง (เพิ่ม/ลบแถวได้) + เดดไลน์
// ============================================================================
export default function AddActivityModal({ open, onClose, onSubmit, initialType = "crop" }) {
  const [type, setType] = useState(initialType);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [durationValue, setDurationValue] = useState("30");
  const [durationUnit, setDurationUnit] = useState("minutes");
  const [eventName, setEventName] = useState("");
  const [eventEndDate, setEventEndDate] = useState(defaultEventEndDate);
  const [machineName, setMachineName] = useState("");
  const [boatTruckKind, setBoatTruckKind] = useState("boat");
  const [boardSlot, setBoardSlot] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("2");
  const [itemRows, setItemRows] = useState([emptyItemRow()]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setType(initialType);
    setName("");
    setQuantity("1");
    setDurationValue("30");
    setDurationUnit("minutes");
    setEventName("");
    setEventEndDate(defaultEventEndDate());
    setMachineName("");
    setBoatTruckKind("boat");
    setBoardSlot("");
    setDeadlineHours("2");
    setItemRows([emptyItemRow()]);
  }

  function updateItemRow(idx, patch) {
    setItemRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addItemRow() {
    setItemRows((rows) => [...rows, emptyItemRow()]);
  }
  function removeItemRow(idx) {
    setItemRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows));
  }

  const isSimple = SIMPLE_TYPES.includes(type);
  const isEvent = type === "event_production";
  const isOrder = ORDER_TYPES.includes(type);

  function durationSec() {
    const v = Number.parseFloat(durationValue) || 0;
    return Math.round(durationUnit === "hours" ? v * 3600 : v * 60);
  }

  function isValid() {
    if (isSimple) return name.trim().length > 0 && Number.parseFloat(durationValue) >= 0;
    if (isEvent) {
      return (
        eventName.trim().length > 0 &&
        eventEndDate.trim().length > 0 &&
        !Number.isNaN(new Date(eventEndDate).getTime()) &&
        machineName.trim().length > 0 &&
        name.trim().length > 0
      );
    }
    if (isOrder) return itemRows.every((r) => r.name.trim().length > 0 && Number.parseInt(r.qty, 10) > 0);
    return false;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid()) return;
    setSubmitting(true);
    try {
      let payload;
      if (isSimple) {
        payload = { type, name: name.trim(), quantity: Number.parseInt(quantity, 10) || 1, durationSec: durationSec() };
      } else if (isEvent) {
        // เดดไลน์ของอีเวนต์นับถึงสิ้นวันที่เลือก (23:59:59 ตามเวลาเครื่องผู้ใช้)
        const eventEndsAt = new Date(`${eventEndDate}T23:59:59`).toISOString();
        payload = {
          type,
          eventName: eventName.trim(),
          eventEndsAt,
          machineName: machineName.trim(),
          itemName: name.trim(),
          quantity: Number.parseInt(quantity, 10) || 1,
          durationSec: durationSec(),
        };
      } else {
        payload = {
          type,
          orderKind: type === "boat_truck_order" ? boatTruckKind : undefined,
          boardSlot: type === "town_order" && boardSlot ? Number.parseInt(boardSlot, 10) : null,
          deadlineSec: Math.round((Number.parseFloat(deadlineHours) || 0) * 3600),
          items: itemRows.map((r) => ({ name: r.name.trim(), qtyRequired: Number.parseInt(r.qty, 10) || 1 })),
        };
      }
      await onSubmit(payload);
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="เพิ่มกิจกรรม"
      accentColor={TYPE_META[type].color}
      footer={
        <>
          <SecondaryButton type="button" onClick={onClose}>
            ยกเลิก
          </SecondaryButton>
          <PrimaryButton type="submit" form="add-activity-form" disabled={submitting || !isValid()}>
            {submitting ? "กำลังบันทึก..." : "เพิ่มกิจกรรม"}
          </PrimaryButton>
        </>
      }
    >
      <form id="add-activity-form" onSubmit={handleSubmit}>
        <Field label="ประเภทกิจกรรม">
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TYPE_ORDER.map((key) => {
              const meta = TYPE_META[key];
              return (
                <TypePill
                  key={key}
                  active={type === key}
                  color={meta.color}
                  bg={meta.bg}
                  icon={meta.icon}
                  label={meta.label}
                  onClick={() => setType(key)}
                />
              );
            })}
          </div>
        </Field>

        {isSimple && (
          <>
            <Field label="ชื่อกิจกรรม/ผลผลิต" hint='เช่น "ข้าวสาลี แปลง 3"'>
              <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="จำนวน">
                <NumberInput min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </Field>
              <Field label="เวลาที่ใช้">
                <div className="flex gap-1.5">
                  <NumberInput min={0} value={durationValue} onChange={(e) => setDurationValue(e.target.value)} className="min-w-0 flex-1" />
                  <SelectInput value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className="w-24 shrink-0">
                    <option value="minutes">นาที</option>
                    <option value="hours">ชั่วโมง</option>
                  </SelectInput>
                </div>
                <DurationPresetRow
                  value={durationValue}
                  unit={durationUnit}
                  onPick={(v, u) => {
                    setDurationValue(v);
                    setDurationUnit(u);
                  }}
                />
              </Field>
            </div>
          </>
        )}

        {isEvent && (
          <>
            <Field label="ชื่ออีเวนต์" hint='เช่น "เทศกาลอีสเตอร์"'>
              <TextInput autoFocus value={eventName} onChange={(e) => setEventName(e.target.value)} />
            </Field>
            <Field label="วันจบอีเวนต์" hint="ถ้าใช้ชื่ออีเวนต์ที่เคยเพิ่มไว้แล้ว จะใช้วันจบเดิมที่ตั้งไว้ตอนสร้างครั้งแรก">
              <DateInput value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} />
            </Field>
            <Field label="ชื่อเครื่องอีเวนต์" hint='เช่น "เครื่องทำไข่ช็อกโกแลต"'>
              <TextInput value={machineName} onChange={(e) => setMachineName(e.target.value)} />
            </Field>
            <Field label="ผลผลิตที่จะได้">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ไข่ช็อกโกแลต" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="จำนวน">
                <NumberInput min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </Field>
              <Field label="เวลาที่ใช้">
                <div className="flex gap-1.5">
                  <NumberInput min={0} value={durationValue} onChange={(e) => setDurationValue(e.target.value)} className="min-w-0 flex-1" />
                  <SelectInput value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className="w-24 shrink-0">
                    <option value="minutes">นาที</option>
                    <option value="hours">ชั่วโมง</option>
                  </SelectInput>
                </div>
                <DurationPresetRow
                  value={durationValue}
                  unit={durationUnit}
                  onPick={(v, u) => {
                    setDurationValue(v);
                    setDurationUnit(u);
                  }}
                />
              </Field>
            </div>
          </>
        )}

        {isOrder && (
          <>
            {type === "boat_truck_order" && (
              <Field label="ประเภทออเดอร์">
                <div className="flex gap-2">
                  <TypePill
                    active={boatTruckKind === "boat"}
                    color={TYPE_META.boat_truck_order.color}
                    bg={TYPE_META.boat_truck_order.bg}
                    icon={TYPE_META.boat_truck_order.icon}
                    label="เรือ"
                    onClick={() => setBoatTruckKind("boat")}
                  />
                  <TypePill
                    active={boatTruckKind === "truck"}
                    color={TYPE_META.boat_truck_order.color}
                    bg={TYPE_META.boat_truck_order.bg}
                    icon={TYPE_META.boat_truck_order.icon}
                    label="รถบรรทุก"
                    onClick={() => setBoatTruckKind("truck")}
                  />
                </div>
              </Field>
            )}
            {type === "town_order" && (
              <Field label="ช่องบน order board (ไม่บังคับ)">
                <NumberInput min={1} value={boardSlot} onChange={(e) => setBoardSlot(e.target.value)} placeholder="เช่น 1" />
              </Field>
            )}
            <Field label="รายการที่ต้องส่ง">
              <div className="flex flex-col gap-2">
                {itemRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <TextInput
                      value={row.name}
                      onChange={(e) => updateItemRow(idx, { name: e.target.value })}
                      placeholder="ชื่อไอเทม เช่น ข้าวสาลี"
                      className="flex-1"
                    />
                    <NumberInput min={1} value={row.qty} onChange={(e) => updateItemRow(idx, { qty: e.target.value })} className="w-20" />
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#4A3B66]/40 transition-colors hover:bg-[#4A3B66]/10 hover:text-[#9A3D72]"
                      aria-label="ลบรายการนี้"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addItemRow}
                  className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-medium text-[#4A3B66]/50 transition-colors hover:bg-white/60 hover:text-[#4A3B66]/80"
                >
                  <Plus size={13} /> เพิ่มรายการ
                </button>
              </div>
            </Field>
            <Field label="เดดไลน์ (ชั่วโมง)">
              <NumberInput min={0} value={deadlineHours} onChange={(e) => setDeadlineHours(e.target.value)} />
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}
