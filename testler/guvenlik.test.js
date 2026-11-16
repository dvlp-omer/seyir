// Güvenlik ve kişisel veri denetimleri.  npm test
//
// 1) supabase/schema.sql METİN olarak okunur ve kurallar denetlenir. Gerçek bir
//    veritabanında çalıştırmak değildir (bunun için SUPABASE_KURULUM.md >
//    "Güvenliği dene"), ama en sık yapılan hatayı yakalar: yeni bir tablo
//    eklenip RLS'in ya da ziyaretçi yasağının unutulması.
// 2) Depodaki dosyalarda gerçek görünen bir telefon numarası var mı?
//    Demo ve testlerde yalnızca kullanılmayan "0500 000 00 xx" aralığı serbest.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const KOK = path.join(__dirname, "..");
const sema = fs.readFileSync(path.join(KOK, "supabase/schema.sql"), "utf8")
  .replace(/--.*$/gm, ""); // yorumları at: yalnızca gerçek komutlar sayılsın
const { KOLEKSIYONLAR } = require("../js/veri.js");
Object.assign(global, require("../js/mantik.js"));
const { YEDEK_SEMASI } = require("../js/yedek.js");

const tablolar = [...sema.matchAll(/create table if not exists (\w+)\s*\(([\s\S]*?)\n\);/g)]
  .map((e) => ({ ad: e[1], govde: e[2] }));

test("şema: uygulamanın her koleksiyonu için tablo var ve sütunlar yedek şemasıyla aynı", () => {
  for (const koleksiyon of KOLEKSIYONLAR) {
    const tablo = tablolar.find((t) => t.ad === koleksiyon);
    assert.ok(tablo, koleksiyon + " tablosu yok");
    for (const alan of Object.keys(YEDEK_SEMASI[koleksiyon])) {
      assert.match(tablo.govde, new RegExp("^\\s*" + alan + "\\s", "m"), koleksiyon + "." + alan + " sütunu yok");
    }
  }
});

test("şema: HER tabloda RLS açık, en az bir kural var, ziyaretçiye (anon) kapalı", () => {
  assert.ok(tablolar.length >= 13, "tablo sayısı beklenenden az: " + tablolar.length);
  // "revoke all on a, b, c from anon" komutlarındaki tablo adları
  const anonaKapali = new Set([...sema.matchAll(/revoke all on ([\w,\s]+?) from anon/g)]
    .flatMap((e) => e[1].split(",").map((ad) => ad.trim())));
  for (const { ad } of tablolar) {
    assert.match(sema, new RegExp("alter table " + ad + "\\s+enable row level security"), ad + ": RLS açılmamış");
    assert.match(sema, new RegExp("create policy \\w+ on " + ad + "\\s"), ad + ": hiç kural yok (RLS açık + kural yok = kimse göremez; büyük olasılıkla unutuldu)");
    assert.ok(anonaKapali.has(ad), ad + ": ziyaretçiden (anon) yetki geri alınmamış");
  }
});

test("şema: hiçbir kural ve yetki ziyaretçiye (anon / public) verilmez", () => {
  assert.doesNotMatch(sema, /create policy[^;]*\bto\s+(anon|public)\b/i);
  assert.doesNotMatch(sema, /grant[^;]*\bto\s+(anon|public)\b/i);
  // Yeni eklenecek tablolar da kapalı başlasın
  assert.match(sema, /alter default privileges in schema public revoke all on tables from anon/);
});

test("şema: kayıt yalnızca davetle — auth.users tetikleyicileri ve ilk hesabın yönetici olması", () => {
  assert.match(sema, /create trigger kayit_kapisi\s+before insert on auth\.users/);
  assert.match(sema, /create trigger yeni_hesap\s+after insert on auth\.users/);
  // kayıt kapısı: hiç profil yoksa geçir, davet listesindeyse geçir, değilse hata
  const kapi = sema.match(/function kayit_kapisi\(\)[\s\S]*?\$\$;/)[0];
  assert.match(kapi, /not exists \(select 1 from profiller\)/);
  assert.match(kapi, /from izinli_epostalar where eposta = lower\(new\.email\)/);
  assert.match(kapi, /raise exception/);
  assert.match(sema, /case when exists \(select 1 from profiller\) then 'uye' else 'yonetici' end/);
  // davet listesini yalnızca yönetici görür/yazar
  assert.match(sema, /create policy davet_yonetici on izinli_epostalar for all to authenticated\s+using \(yonetici_mi\(\)\) with check \(yonetici_mi\(\)\)/);
  // tetikleyici fonksiyonları dışarıdan çağrılamaz
  assert.match(sema, /revoke all on function kayit_kapisi\(\) from public, anon, authenticated/);
  assert.match(sema, /revoke all on function yeni_hesap\(\) from public, anon, authenticated/);
});

test("şema: takıma bağlı her tablonun kuralı 'yalnızca kendi takımım' (uye_mi)", () => {
  for (const { ad, govde } of tablolar) {
    // takim_uyelikleri hariç: onun kuralı "yalnızca kendi üyeliğim" (kullanici_id = auth.uid())
    if (ad === "takim_uyelikleri") continue;
    if (!/^\s*takim_id\s+text not null/m.test(govde)) continue;
    assert.match(sema, new RegExp("create policy \\w+ on " + ad + " for all to authenticated\\s+using \\(uye_mi\\(takim_id\\)\\) with check \\(uye_mi\\(takim_id\\)\\)"), ad);
  }
});

/* ---------- Kişisel veri ---------- */

// Depodaki metin dosyaları (referans/, .git, çıktılar ve resimler hariç)
function metinDosyalari(klasor = KOK) {
  const atla = new Set([".git", "node_modules", "referans", "cikti", ".claude"]);
  const sonuc = [];
  for (const oge of fs.readdirSync(klasor, { withFileTypes: true })) {
    if (atla.has(oge.name)) continue;
    const yol = path.join(klasor, oge.name);
    if (oge.isDirectory()) sonuc.push(...metinDosyalari(yol));
    else if (/\.(js|html|css|md|sql|json|toml|txt|example)$/.test(oge.name) || oge.name.startsWith(".env")) sonuc.push(yol);
  }
  return sonuc;
}

test("kişisel veri: depoda gerçek görünen cep telefonu numarası yok (yalnızca 0500 000 00 xx)", () => {
  // 5XX XXX XX XX biçiminde, önünde 0 / 90 / +90 olabilen numaralar
  const desen = /(?<![\d])(?:\+?90|0)?[\s(]*5\d{2}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?![\d])/g;
  const bulunan = [];
  for (const dosya of metinDosyalari()) {
    for (const eslesme of fs.readFileSync(dosya, "utf8").matchAll(desen)) {
      const rakam = eslesme[0].replace(/\D/g, "").replace(/^(90|0)/, "");
      if (!rakam.startsWith("500000")) bulunan.push(path.relative(KOK, dosya) + ": " + eslesme[0]);
    }
  }
  assert.deepEqual(bulunan, []);
});

test("kişisel veri: referans dosyasındaki adlar ve numaralar depoya girmemiş (dosya varsa)", (t) => {
  const referans = path.join(KOK, "referans/ROTA__SAS_Akademi___Kabul_Mesajlar_.html");
  if (!fs.existsSync(referans)) return t.skip("referans dosyası bu bilgisayarda yok");
  const { htmlKisiDizisiOku } = require("../js/kisiler.js");
  const kisiler = htmlKisiDizisiOku(fs.readFileSync(referans, "utf8"));
  const bulunan = [];
  for (const dosya of metinDosyalari()) {
    const metin = fs.readFileSync(dosya, "utf8");
    for (const k of kisiler) {
      if (metin.includes(k.telefon) || metin.includes(k.telefon.slice(2)) || metin.includes(k.ad)) {
        bulunan.push(path.relative(KOK, dosya) + " (" + k.ad.length + " harflik bir ad / numara)"); // adı yazdırmıyoruz
      }
    }
  }
  assert.deepEqual(bulunan, []);
});
