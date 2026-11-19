// Yenilikler: son eklenen özellikler, tarihe göre. Kaynak git geçmişi; yalnızca kullanıcının
// göreceği değişiklikler yazılır (altyapı, test, belge değişiklikleri yazılmaz).
// Yeni bir özellik eklenince listenin BAŞINA ekle; en fazla 3 tarih göster.
import { Belir, BolumBasligi, IsikliKart } from "./ortak.jsx";

const SURUMLER = [
  {
    tarih: "19 Kasım 2026",
    maddeler: [
      ["Yeni", "Hesap açmadan dene: tek tıkla uydurma bir takımla dolu uygulama, sekmeyi kapatınca silinir."],
      ["Yeni", "Yeni logo ve tanıtım sayfası."],
      ["İyileşti", "Özet ekranı: ilerleme çubuğu, \"Kimde ne var\" ve \"Sıradaki buluşmalar\"."],
      ["İyileşti", "Telefonda alt çubukta dört ana ekran; menü gruplara ayrıldı."],
    ],
  },
  {
    tarih: "18 Kasım 2026",
    maddeler: [
      ["Yeni", "Görev panosunda kartları sürükleyip başka sütuna bırak."],
      ["Yeni", "Ctrl+K ile her yerde arama; Ctrl+S kaydet, ? kısayol listesi."],
      ["Yeni", "Takvimi .ics dosyasıyla Google Takvim'e ya da telefona aktar."],
      ["Yeni", "Tutanak kararından tek tıkla görev; sorumlu metindeki addan seçilir."],
      ["İyileşti", "Başlıksız notlar da forma yerleşiyor; Word dosyası sürükleyip bırakılabiliyor."],
      ["İyileşti", "Yarım kalan formlar kaybolmuyor, açınca geri geliyor."],
    ],
  },
  {
    tarih: "17 Kasım 2026",
    maddeler: [
      ["Yeni", "Şifremi unuttum, beni hatırla ve şifre değiştirme."],
      ["Güvenlik", "İki kişi aynı kaydı aynı anda düzenlerse uyarı; kimsenin yazdığı ezilmez."],
    ],
  },
];

const ROZET = {
  Yeni: "border-su-300/30 bg-su-300/10 text-su-300",
  "İyileşti": "border-violet-300/30 bg-violet-300/10 text-violet-200",
  "Güvenlik": "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
};

export function Yenilikler() {
  return (
    <section id="yenilikler" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-28 sm:py-36">
      <BolumBasligi etiket="Yenilikler" baslik="Durmadan gelişiyor."
        aciklama="Takımdan gelen her geri bildirim bir sonraki sürüme dönüşüyor. Son eklenenler:" />
      <div className="mx-auto mt-14 max-w-3xl space-y-5">
        {SURUMLER.map((s, i) => (
          <IsikliKart key={s.tarih} gecikme={i * 0.08} className="rounded-3xl p-6 sm:p-8">
            <h3 className="font-mono text-sm tracking-wide text-slate-400">{s.tarih}</h3>
            <ul className="mt-4 space-y-3">
              {s.maddeler.map(([tur, metin]) => (
                <li key={metin} className="flex items-start gap-3">
                  <span className={"mt-0.5 flex-none rounded-full border px-2 py-0.5 text-[11px] font-medium " + ROZET[tur]}>{tur}</span>
                  <span className="leading-relaxed text-slate-300">{metin}</span>
                </li>
              ))}
            </ul>
          </IsikliKart>
        ))}
        <Belir gecikme={0.2} as="p" className="pt-2 text-center text-sm text-slate-500">
          Bütün değişiklikler GitHub'daki geçmişte.
        </Belir>
      </div>
    </section>
  );
}
