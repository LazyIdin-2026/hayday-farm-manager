import { useEffect } from "react";
import { X } from "lucide-react";

// ============================================================================
// Modal.jsx — shell กลางสำหรับทุก modal form ในแอพ ดีไซน์ glassmorphism ม่วงพาสเทล
// ให้เข้าชุดกับการ์ดในหน้า dashboard (พื้นขาวโปร่งแสง + backdrop blur + เงานุ่มโทนม่วง)
// ============================================================================
export default function Modal({ open, onClose, title, accentColor = "#9A3D72", children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background: "rgba(74,59,102,0.35)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[24px]"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 20px 60px rgba(120,90,170,0.35)",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full"
          style={{ background: accentColor, opacity: 0.18, filter: "blur(30px)" }}
        />
        <div className="relative flex items-center justify-between px-6 pb-3 pt-5">
          <h2 className="text-[19px] font-bold text-[#4A3B66]" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#4A3B66]/50 transition-colors hover:bg-[#4A3B66]/10 hover:text-[#4A3B66]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="relative max-h-[65vh] overflow-y-auto px-6 pb-2">{children}</div>
        {footer && <div className="relative flex items-center justify-end gap-2 px-6 pb-5 pt-4">{footer}</div>}
      </div>
    </div>
  );
}
