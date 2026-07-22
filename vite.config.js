import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base ต้องตรงกับชื่อ GitHub repo เพราะ GitHub Pages จะโฮสต์ที่ https://<user>.github.io/<repo>/
// ถ้าเปลี่ยนชื่อ repo ทีหลัง ต้องแก้ค่านี้ให้ตรงกันด้วย
export default defineConfig({
  plugins: [react()],
  base: "/hayday-farm-manager/",
});
