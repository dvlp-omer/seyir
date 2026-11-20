// Sık sorulan sorular. Yerli <details>/<summary> kullanılır: klavye ve ekran okuyucu
// desteği tarayıcıdan gelir, JavaScript gerekmez. Cevaplar uygulamanın gerçek
// davranışına göre yazıldı; uygulama değişirse burayı da (iki dilde) güncelle.
import { Plus } from "lucide-react";
import { Belir, BolumBasligi, ORNEK, KAYNAK_KOD, LISANS } from "./ortak.jsx";
import { t } from "./dil.js";

const SORULAR = [
  {
    soru: t("Seyir ücretli mi?", "Does Seyir cost anything?"),
    cevap: t(
      <>Hayır. Takımlar için tamamen ücretsiz; ücretsiz katmanlarda çalışan servislerle yayında (Vercel ve Supabase). Kart bilgisi istenmez, reklam yok.</>,
      <>No. It's completely free for teams, hosted on the free tiers of Vercel and Supabase. No credit card, no ads.</>),
  },
  {
    soru: t("Hesap açmadan deneyebilir miyim?", "Can I try it without an account?"),
    cevap: t(
      <>Evet. <a href={ORNEK}>Örnek takımla dene</a> düğmesi uydurma bir takımla dolu bir uygulama açar. Her şeyi kurcalayabilirsin; veriler yalnızca o sekmede durur, sekmeyi kapatınca silinir.</>,
      <>Yes. <a href={ORNEK}>Try a sample team</a> opens the app filled with a made-up team. Click around freely; the data lives only in that tab and is deleted when you close it. Note that the app's interface is in Turkish for now.</>),
  },
  {
    soru: t("Takımımızın verileri nerede duruyor, kim görebilir?", "Where is our team's data stored, and who can see it?"),
    cevap: t(
      <>Ortak kullanımda veriler Supabase veritabanında durur. Giriş zorunludur, hesap açmak yalnızca davetle olur ve veritabanı kuralları her kaydı yalnızca kendi takımının üyelerine gösterir. Kişiler için yalnızca ad, rol ve rehberde telefon tutulur.</>,
      <>In shared use the data lives in a Supabase database. Signing in is required, accounts are invite-only, and database rules show each record only to members of its own team. For people, only name, role and (in the contacts list) phone number are stored.</>),
  },
  {
    soru: t("Takım arkadaşlarım nasıl katılır?", "How do my teammates join?"),
    cevap: t(
      <>Takım yöneticisi arkadaşlarının e-posta adreslerini davet listesine ekler; onlar da aynı adresle hesap açar ve doğrudan takıma girer. Uygulamayı ilk kuran kişi yönetici olur.</>,
      <>The team admin adds their email addresses to the invite list; they sign up with the same address and land straight in the team. Whoever sets the app up first becomes the admin.</>),
  },
  {
    soru: t("İnternet yokken çalışır mı?", "Does it work without internet?"),
    cevap: t(
      <>Uygulama internet yokken de açılır. Takımca ortak kullanımda kayıtların gelip gitmesi için bağlantı gerekir. Tek cihazda, verileri tarayıcıda tutan kurulumda ise her şey çevrimdışı çalışır.</>,
      <>The app opens without internet. In shared team use, records need a connection to sync. In the single-device setup, where data stays in the browser, everything works offline.</>),
  },
  {
    soru: t("Telefona nasıl yüklerim?", "How do I install it on my phone?"),
    cevap: t(
      <>Mağazadan indirmen gerekmez. Android'de Chrome menüsünden (⋮) <b>Ana ekrana ekle</b>, iPhone'da Safari'de <b>Paylaş → Ana Ekrana Ekle</b>. Simgesiyle ayrı bir uygulama gibi açılır.</>,
      <>No app store needed. On Android, use Chrome's menu (⋮) → <b>Add to Home screen</b>; on iPhone, Safari → <b>Share → Add to Home Screen</b>. It then opens like its own app.</>),
  },
  {
    soru: t("WhatsApp mesajlarını kendisi mi gönderiyor?", "Does it send WhatsApp messages by itself?"),
    cevap: t(
      <>Hayır. Şablondan her kişi için mesaj hazırlanır ve WhatsApp'ta hazır açılır; <b>Gönder</b>'e sen basarsın. WhatsApp otomatik toplu gönderimi resmî olarak desteklemediği için bilerek eklenmedi; numaranın engellenme riski de olmaz.</>,
      <>No. A message is prepared from a template for each person and opens ready in WhatsApp; you press <b>Send</b>. Automatic bulk sending was left out on purpose because WhatsApp doesn't officially support it, so your number isn't at risk of being banned.</>),
  },
  {
    soru: t("Eski Word tutanaklarımızı aktarabilir miyim?", "Can we import our old Word minutes?"),
    cevap: t(
      <>Evet. .docx ya da .txt dosyasını yükle veya sürükleyip bırak; başlıksız serbest notlar bile cümlelerine bakılarak forma yerleşir. Tutanağı A4, imzaya hazır PDF ya da Word olarak geri alırsın.</>,
      <>Yes. Upload or drag in a .docx or .txt file; even free-form notes without headings are placed into the form by reading their sentences (Turkish notes). You get the minutes back as an A4, ready-to-sign PDF or Word file.</>),
  },
  {
    soru: t("Kendi kulübüm için ayrı kurabilir miyim?", "Can I set up my own copy for my club?"),
    cevap: t(
      <>Ticari olmayan kullanım için evet: öğrenci kulüpleri, okullar ve gönüllü kuruluşlar kendi kopyasını ücretsiz kurabilir (koşullar <a href={LISANS}>lisansta</a>). Ticari kullanım ya da kurumunuz için özel bir kurulum isterseniz GitHub üzerinden iletişime geçin.</>,
      <>For noncommercial use, yes: student clubs, schools and nonprofits can run their own copy for free (terms in the <a href={LISANS}>license</a>). For commercial use or a custom setup for your organization, get in touch via GitHub.</>),
  },
];

export function Sss() {
  return (
    <section id="sss" className="relative mx-auto grid max-w-6xl scroll-mt-24 gap-12 px-5 py-28 sm:py-36 lg:grid-cols-[2fr_3fr]">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <BolumBasligi etiket={t("Sık sorulanlar", "FAQ")} baslik={t("Aklına takılan var mı?", "Got questions?")} ortali={false}
          aciklama={t("Kısa ve dürüst cevaplar. Burada olmayan bir şey sormak istersen GitHub'da yazabilirsin.", "Short, honest answers. If your question isn't here, ask on GitHub.")} />
        <Belir gecikme={0.2} className="mt-6">
          <a href={KAYNAK_KOD + "/issues"} className="text-sm font-medium text-su-300 underline-offset-4 hover:underline">
            {t("Soru sor (GitHub) →", "Ask a question (GitHub) →")}
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
