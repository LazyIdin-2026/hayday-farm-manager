// ============================================================================
// typeMeta.js — นิยาม 6 หมวดกิจกรรมตามประเภทจริงใน schema (ไม่พับรวมกันแล้ว)
// ไล่โทนสีตาม gradient ของหัวข้อหลัก "แดชบอร์ดฟาร์มทั้งหมด" ที่ตกลงดีไซน์กันไว้
// (#D9527F → #C94A78 → #7A67CC → #3F86C4 : ชมพู → พิงก์เข้ม → ม่วง → ฟ้า)
// ยกเว้น "พืชผล" ที่ใช้เขียวตามที่ brief ระบุไว้ชัดเจนว่าเป็นข้อยกเว้นเดียว
// ============================================================================
import { Sprout, Egg, Factory, Sparkles, Ship, TrainFront } from "lucide-react";

export const TYPE_META = {
  crop: { label: "พืชผล", icon: Sprout, color: "#3D8A5C", bg: "#C8ECD2" },
  animal: { label: "สัตว์เลี้ยง", icon: Egg, color: "#C9527F", bg: "#F7D2E4" },
  production: { label: "โรงงาน", icon: Factory, color: "#C94A78", bg: "#F5CBDD" },
  event_production: { label: "โรงงานอีเวนต์", icon: Sparkles, color: "#7A67CC", bg: "#DDD6F7" },
  boat_truck_order: { label: "ออเดอร์เรือ/รถ", icon: Ship, color: "#5566C4", bg: "#D3D8F5" },
  town_order: { label: "ออเดอร์เมือง", icon: TrainFront, color: "#3F86C4", bg: "#CFE3F5" },
};

// ลำดับที่ต้องการให้แสดงใน legend / type picker (ให้ไล่โทนสวยๆ ตามลำดับ)
export const ACTIVITY_TYPE_ORDER = [
  "crop",
  "animal",
  "production",
  "event_production",
  "boat_truck_order",
  "town_order",
];
