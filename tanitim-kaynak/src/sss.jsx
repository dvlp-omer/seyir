// Sık sorulan sorular. Yerli <details>/<summary> kullanılır: klavye ve ekran okuyucu
// desteği tarayıcıdan gelir, JavaScript gerekmez. Cevaplar uygulamanın gerçek
// davranışına göre yazıldı; uygulama değişirse burayı da güncelle.
import { Plus } from "lucide-react";
import { Belir, BolumBasligi, ORNEK, KAYNAK_KOD } from "./ortak.jsx";

const SORULAR = [
  {
    soru: "Seyir ücretli mi?",
    cevap: <>Hayır. Tamamen ücretsiz ve açık kaynak. Ücretsiz katmanlarda çalışan servislerle yayında (Vercel ve Supabase); kart bilgisi istenmez, reklam yok.</>,
  },
  {
    soru: "Hesap açmadan deneyebilir miyim?",
    cevap: <>Evet. <a href={ORNEK}>Örnek takımla dene</a> düğmesi uydurma bir takımla dolu bir uygulama açar. Her şeyi kurcalayabilirsin; veriler yalnızca o sekmede durur, sekmeyi kapatınca silinir.</>,
  },
  {
    soru: "Takımımızın verileri nerede duruyor, kim görebilir?",
    cevap: <>Ortak kullanımda veriler Supabase veritabanında durur. Giriş zorunludur, hesap açmak yalnızca davetle olur ve veritabanı kuralları her kaydı yalnızca kendi takımının üyelerine gösterir. Kişiler için yalnızca ad, rol ve rehberde telefon tutulur.</>,
  },
  {
    soru: "Takım arkadaşlarım nasıl katılır?",
    cevap: <>Takım yöneticisi arkadaşlarının e-posta adreslerini davet listesine ekler; onlar da aynı adresle hesap açar ve doğrudan takıma girer. Uygulamayı ilk kuran kişi yönetici olur.</>,
  },
  {
    soru: "İnternet yokken çalışır mı?",
    cevap: <>Uygulama internet yokken de açılır. Takımca ortak kullanımda kayıtların gelip gitmesi için bağlantı gerekir. Tek cihazda, verileri tarayıcıda tutan kurulumda ise her şey çevrimdışı çalışır.</>,
  },
  {
    soru: "Telefona nasıl yüklerim?",
    cevap: <>Mağazadan indirmen gerekmez. Android'de Chrome menüsünden (⋮) <b>Ana ekrana ekle</b>, iPhone'da Safari'de <b>Paylaş → Ana Ekrana Ekle</b>. Simgesiyle ayrı bir uygulama gibi açılır.</>,
  },
  {
    soru: "WhatsApp mesajlarını kendisi mi gönderiyor?",
    cevap: <>Hayır. Şablondan her kişi için mesaj hazırlanır ve WhatsApp'ta hazır açılır; <b>Gönder</b>'e sen basarsın. WhatsApp otomatik toplu gönderimi resmî olarak desteklemediği için bilerek eklenmedi; numaranın engellenme riski de olmaz.</>,
  },
  {
    soru: "Eski Word tutanaklarımızı aktarabilir miyim?",
    cevap: <>Evet. .docx ya da .txt dosyasını yükle veya sürükleyip bırak; başlıksız serbest notlar bile cümlelerine bakılarak forma yerleşir. Tutanağı A4, imzaya hazır PDF ya da Word olarak geri alırsın.</>,
  },
  {
    soru: "Kendi kulübüm için ayrı kurabilir miyim?",
    cevap: <>Evet. Kod açık; GitHub'daki kurulum rehberi ücretsiz bir Supabase projesi ve Vercel ile kendi kopyanı nasıl yayınlayacağını adım adım anlatır.</>,
  },
];

export function Sss() {
  return (
    <section id="sss" className="relative mx-auto grid max-w-6xl scroll-mt-24 gap-12 px-5 py-28 sm:py-36 lg:grid-cols-[2fr_3fr]">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <BolumBasligi etiket="Sık sorulanlar" baslik="Aklına takılan var mı?" ortali={false}
          aciklama="Kısa ve dürüst cevaplar. Burada olmayan bir şey sormak istersen GitHub'da yazabilirsin." />
        <Belir gecikme={0.2} className="mt-6">
          <a href={KAYNAK_KOD + "/issues"} className="text-sm font-medium text-su-300 underline-offset-4 hover:underline">
            Soru sor (GitHub) →
          </a>
        </Belir>
      </div>
      <Belir gecikme={0.1} className="border-t border-white/10">
        {SORULAR.map(({ soru, cevap }) => (
          <details key={soru} className="sss-oge group border-b border-white/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-medium text-slate-100 transition hover:text-white sm:text-lg">
              {soru}
              <Plus size={20} aria-hidden="true" className="flex-none text-slate-500 transition-transform duration-300 group-open:rotate-45 group-open:text-su-300" />
            </summary>
            <div className="sss-cevap pb-6 pr-10 leading-relaxed text-slate-400">{cevap}</div>
          </details>
        ))}
      </Belir>
    </section>
  );
}
