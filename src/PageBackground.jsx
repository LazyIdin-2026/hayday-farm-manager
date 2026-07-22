// ============================================================================
// PageBackground.jsx — พื้นหลัง gradient ม่วงพาสเทล + จุดเบลอ (bokeh) + font import
// ดึงออกมาจาก FarmDashboard.jsx เดิม (ของเดิมเป๊ะ ไม่เปลี่ยนค่าอะไรเลย) เพื่อให้ทุกหน้า
// ในแอพ (แดชบอร์ด, คลังสินค้า, ในอนาคตอาจมีหน้าอื่นอีก) ใช้พื้นหลังชุดเดียวกันได้
// ============================================================================
function Bokeh({ top, left, size, color, blur = 40, opacity = 0.5 }) {
  return (
    <div
      className="pointer-events-none absolute rounded-full"
      style={{
        top,
        left,
        width: size,
        height: size,
        background: color,
        filter: `blur(${blur}px)`,
        opacity,
      }}
    />
  );
}

export default function PageBackground({ children }) {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden px-5 py-8 sm:px-10"
      style={{
        background: "radial-gradient(circle at 20% 0%, #F1E4FB 0%, #E7D6F5 45%, #DCC7EF 100%)",
        fontFamily: "'Nunito', 'Noto Sans Thai', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@400;600;700&display=swap');
      `}</style>

      <Bokeh top="-40px" left="8%" size="180px" color="#E4C6F2" opacity={0.45} />
      <Bokeh top="120px" left="82%" size="140px" color="#C9AAEA" opacity={0.4} />
      <Bokeh top="60%" left="-40px" size="220px" color="#D8BEF0" opacity={0.4} />
      <Bokeh top="75%" left="88%" size="160px" color="#B99AE0" opacity={0.35} />

      {children}
    </div>
  );
}
