// Seyir tanıtım sayfası — giriş noktası
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import "./stil.css";
import { uygulamayaYonlendir } from "./yonlendir.js";
import { UstMenu, Hero, KayanBant, Bento } from "./ust-bolumler.jsx";
import { NotDemosu, Vitrin, Sayilar, Adimlar, Guvenlik, Kapanis, AltBilgi } from "./alt-bolumler.jsx";
import { Sss } from "./sss.jsx";

function Uygulama() {
  return (
    // reducedMotion="user": cihazda "hareket azaltma" açıksa Framer animasyonları kısalır
    <MotionConfig reducedMotion="user">
      <a href="#ozellikler" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-obsidyen">İçeriğe geç</a>
      <UstMenu />
      <main>
        <Hero />
        <KayanBant />
        <Bento />
        <NotDemosu />
        <Vitrin />
        <Sayilar />
        <Adimlar />
        <Guvenlik />
        <Sss />
        <Kapanis />
      </main>
      <AltBilgi />
    </MotionConfig>
  );
}

// Uygulamayı arayan ziyaretçi (eski bağlantı, e-posta, ana ekran simgesi) önce oraya gider
if (!uygulamayaYonlendir()) {
  createRoot(document.getElementById("kok")).render(<StrictMode><Uygulama /></StrictMode>);
}
