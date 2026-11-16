/* ==========================================================================
   EKRAN: Ayarlar
   - Görünüm: açık / koyu / cihaza uy (js/tema.js)
   - Yedekleme: bütün veriyi JSON dosyasına indir, dosyadan geri yükle (js/yedek.js)
   - Veri deposu: verinin nerede durduğu; Supabase kullanılıyorsa hesap ve çıkış
   ========================================================================== */

const YEDEK_DOSYA_SINIRI = 5 * 1024 * 1024; // 5 MB

// İçeriği dosya olarak indirir: bellekte bir dosya (Blob) oluşturur ve
// görünmez bir bağlantıya tıklar. Sunucu gerekmez.
// icerik: metin ya da bayt dizisi (Word dosyası için). tur: dosyanın türü (MIME).
function dosyaIndir(dosyaAdi, icerik, tur = "application/json") {
  const adres = URL.createObjectURL(new Blob([icerik], { type: tur }));
  const baglanti = document.createElement("a");
  baglanti.href = adres;
  baglanti.download = dosyaAdi;
  document.body.appendChild(baglanti);
  baglanti.click();
  baglanti.remove();
  URL.revokeObjectURL(adres);
}

async function yedekIndir() {
  const yedek = await yedekOlustur(durum.depo);
  const adet = KOLEKSIYONLAR.reduce((toplam, k) => toplam + yedek.veriler[k].length, 0);
  dosyaIndir("takim-asistani-yedek-" + bugun() + ".json", JSON.stringify(yedek, null, 2));
  bildir("Yedek indirildi (" + adet + " kayıt)");
}

// Seçilen dosyayı okur, denetler, onay alır ve depoya ekler.
async function yedektenYukle(dosya) {
  if (dosya.size > YEDEK_DOSYA_SINIRI) throw new Error("Dosya çok büyük (en çok 5 MB).");

  const sonuc = yedekCoz(await dosya.text());
  if (!sonuc.gecerli) throw new Error(sonuc.hata);
  if (sonuc.toplam === 0) throw new Error("Dosyada hiç kayıt yok.");

  const onay = confirm(
    "Dosyada " + sonuc.sayilar.takimlar + " takım ve toplam " + sonuc.toplam + " kayıt var.\n\n" +
    "İçe aktarılsın mı? Var olan kayıtların hiçbiri değiştirilmez ya da silinmez; yalnızca eksik olanlar eklenir.");
  if (!onay) return;

  const { eklenen, atlanan } = await yedekYukle(durum.depo, sonuc.veriler);
  await takimlariYukle();
  await yenile();
  bildir(eklenen + " kayıt eklendi" + (atlanan ? ", " + atlanan + " kayıt zaten vardı" : ""));
}

async function ayarlarEkraniCiz(kok) {
  const supabase = durum.depo.tur === "supabase";
  const kullanici = durum.oturum ? durum.oturum.kullanici() : null;

  const temaSecenekleri = TEMA_SECENEKLERI.map((s) =>
    '<label><input type="radio" name="tema" value="' + s.deger + '"' +
    (s.deger === temaTercihi() ? " checked" : "") + "> " + s.etiket + "</label>").join("");

  kok.innerHTML =
    '<div class="kartlar">' +

    '<section class="kart"><h3>Görünüm</h3>' +
    '<fieldset class="alan"><legend>Tema</legend><div class="secenekler" id="tema-secenekleri">' + temaSecenekleri + "</div></fieldset>" +
    '<p class="soluk kucuk-yazi">“Cihaza uy” seçiliyken telefonun ya da bilgisayarın gece modu açılınca uygulama da kararır.</p>' +
    "</section>" +

    '<section class="kart"><h3>Yedekleme</h3>' +
    "<p>Bütün takımların verisini tek bir dosyaya indir; başka bir cihaza taşımak ya da saklamak için.</p>" +
    '<p><button class="dugme ana" data-eylem="disa-aktar"' + (durum.takimlar.length ? "" : " disabled") + ">Yedeği indir (.json)</button></p>" +
    '<p style="margin-top:16px">Daha önce indirdiğin bir yedeği geri yükle. Var olan kayıtlara dokunulmaz.</p>' +
    '<p><button class="dugme" data-eylem="ice-aktar">Yedekten yükle…</button>' +
    // Dosya seçici gizlidir; düğme onu tetikler (düğmeyi biçimlendirmek daha kolay)
    '<input type="file" id="yedek-dosyasi" accept="application/json,.json" hidden></p>' +
    (supabase ? "" : '<p class="soluk kucuk-yazi">Veriler yalnızca bu tarayıcıda durduğu için arada bir yedek almak iyi olur.</p>') +
    "</section>" +

    '<section class="kart"><h3>Veri deposu</h3>' +
    (supabase
      ? "<p><b>Supabase</b> — veriler bulutta; takımdaki herkes aynı veriyi görür.</p>" +
        (kullanici
          ? "<p>Giriş yapan: <b>" + htmlKacis(kullanici.email) + "</b></p>" +
            '<p><button class="dugme" data-eylem="cikis">Çıkış yap</button></p>'
          : "")
      : "<p><b>Bu tarayıcı (localStorage)</b> — veriler yalnızca bu cihazda ve bu tarayıcıda durur. " +
        "Tarayıcı verisi silinirse kaybolur.</p>" +
        '<p class="soluk kucuk-yazi">Ekip olarak ortak kullanmak için Supabase kurulabilir: SUPABASE_KURULUM.md</p>') +
    "</section>" +

    '<section class="kart"><h3>Uygulama</h3>' +
    "<p>Takım Asistanı — sürüm 2</p>" +
    '<p class="soluk kucuk-yazi">Telefonda tarayıcı menüsünden “Ana ekrana ekle” ile uygulama gibi kullanılabilir. ' +
    "Bir kez açıldıktan sonra internet yokken de açılır.</p>" +
    "</section>" +

    "</div>";

  sec("#tema-secenekleri").onchange = (olay) => {
    temaSec(olay.target.value);
    bildir("Tema değiştirildi");
  };

  const dosyaSecici = sec("#yedek-dosyasi");
  dosyaSecici.onchange = async () => {
    const dosya = dosyaSecici.files[0];
    dosyaSecici.value = ""; // aynı dosya tekrar seçilebilsin
    if (!dosya) return;
    try {
      await yedektenYukle(dosya);
    } catch (hata) {
      console.error(hata);
      alert("Yedek yüklenemedi.\n\n" + hata.message); // kalıcı mesaj: kullanıcı okumadan kaybolmasın
    }
  };

  eylemleriBagla(kok, {
    "disa-aktar": yedekIndir,
    "ice-aktar": () => dosyaSecici.click(),
    cikis: async () => {
      await durum.oturum.cikisYap();
      durum.takimlar = [];
      durum.takim = null;
      takimSeciciCiz();
      await yenile();
    },
  });
}

ekranKaydet("ayarlar", {
  baslik: "Ayarlar",
  kisaAd: "Ayarlar",
  simge: "M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6",
  ciz: ayarlarEkraniCiz,
});
