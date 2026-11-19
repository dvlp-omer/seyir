// Seyir tanıtım sayfası — Vite ayarları.
// Çıktı ../tanitim/ klasörüne yazılır ve sitede /tanitim/ adresinden sunulur.
// Her şey (JS, CSS, yazı tipi, görseller) tek tek dosya olarak paketlenir:
// sitenin CSP kuralı yalnızca kendi dosyalarımıza izin verir (satır içi betik yok,
// dışarıdan yükleme yok). assetsInlineLimit: 0 -> yazı tipi "data:" olarak gömülmez.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/tanitim/",
  plugins: [react()],
  build: {
    outDir: "../tanitim",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
