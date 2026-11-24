/* ==========================================================================
   YÖNETİM PANELİ (Ayarlar > Roller ve yetkiler) — yalnızca takım yöneticisi, Supabase
   - Roller yoksa: "Hazır rollerle başla" (pakete göre, js/yetki.js > hazirRoller)
   - Rol × sekme tablosu: her hücre Gizli / Görür / Düzenler
   - Kişiler: takımdaki hesaplar; yönetici yap, rol ata, takımdan çıkar
   ASIL DENETİM VERİTABANINDADIR (schema.sql > 8. bölüm): yönetici olmayan biri bu
   kartı bir yolla açsa da veritabanı yazmayı reddeder (YETKI_YOK / satır kuralı).
   Yerel kullanımda (tek cihaz) gösterilmez: orada tek kullanıcı zaten her şeyi yönetir.
   ========================================================================== */

const ilkHarfBuyuk = (metin) => metin.charAt(0).toLocaleUpperCase("tr") + metin.slice(1);

function yonetimGosterilsinMi() {
  return Boolean(durum.takim && durum.depo.tur === "supabase" && durum.oturum && durum.yetki && durum.yetki.yonetici);
}

function yonetimKartiHtml() {
  return '<section class="kart yonetim-karti" id="yonetim-karti"><h3>Roller ve yetkiler</h3>' +
    '<div class="yonetim-icerik"><p class="soluk">Yükleniyor…</p></div></section>';
}

const seviyeSecimi = (sekme, seviye) =>
  '<select data-sekme="' + sekme + '" aria-label="' + htmlKacis(ekranMetni(sekme, "kisaAd")) + '">' +
  YETKI_DUZEYLERI.map((d) => '<option value="' + d + '"' + (d === seviye ? " selected" : "") + ">" + YETKI_ETIKETLERI[d] + "</option>").join("") +
  "</select>";

async function yonetimKartiniDoldur(kart) {
  const icerik = kart.querySelector(".yonetim-icerik");
  const ayar = kurumAyarlari(durum.takim);
  let roller, hesaplar;
  try {
    [roller, hesaplar] = await Promise.all([
      durum.depo.listele("takim_rolleri", { takim_id: durum.takim.id }),
      durum.oturum.takimHesaplari(durum.takim.id),
    ]);
  } catch (hata) {
    icerik.innerHTML = '<p class="form-hata">Roller okunamadı: ' + htmlKacis(hata.message) + "</p>" +
      '<p class="soluk kucuk-yazi">Supabase\'de supabase/guncelleme-roller.sql dosyası çalıştırılmamış olabilir.</p>';
    return;
  }
  roller.sort((a, b) => (b.temel ? 1 : 0) - (a.temel ? 1 : 0) || a.olusturma.localeCompare(b.olusturma));
  const sekmeler = YETKI_SEKMELERI.filter((s) => EKRANLAR[s] && sekmeAcikMi(ayar, s));
  const yeniden = () => yonetimKartiniDoldur(kart);
  const hataKutusu = () => icerik.querySelector("#yonetim-hata");
  const hataYaz = (mesaj) => { const k = hataKutusu(); if (k) { k.textContent = mesaj; k.hidden = !mesaj; } };
  const hataCevir = (hata) => yetkiHatasiMi(hata.message) ? "Bunun için takım yöneticisi olmalısın." : hata.message;

  if (!roller.some((r) => r.temel)) {
    // Roller kurulmamış: herkes her şeyi düzenliyor (eski davranış)
    icerik.innerHTML =
      "<p>Şu an <b>" + htmlKacis(soz(ayar, "takimdaki")) + " herkes her şeyi görüp değiştirebiliyor.</b></p>" +
      '<p class="soluk">Rolleri kurunca her sekme için kimin <b>göreceğini</b>, kimin <b>düzenleyeceğini</b> sen seçersin. ' +
      "Hazır roller: herkes görür (kişi rehberi ve mesajlar gizli), sorumluluk rolleri kendi sekmelerini düzenler. Sonra hepsini değiştirebilirsin.</p>" +
      '<p class="bilgi-kutusu"><b>Dikkat:</b> Rolleri kurduktan sonra, rol atamadığın kişiler yalnızca görebilir. ' +
      "Kurduktan hemen sonra aşağıdaki listeden herkese görevine uygun rolü ver.</p>" +
      '<p class="form-hata" id="yonetim-hata" role="alert" hidden></p>' +
      '<p><button type="button" class="dugme ana" data-yonetim="kur">Hazır rollerle başla</button></p>';
    icerik.querySelector('[data-yonetim="kur"]').onclick = async () => {
      try {
        // Önce sorumluluk rolleri, en son temel rol: temel rol yazılınca yetkiler devreye girer
        const hazir = hazirRoller(ayar.tur);
        for (const rol of [...hazir.filter((r) => !r.temel), ...hazir.filter((r) => r.temel)]) {
          await durum.depo.ekle("takim_rolleri", { takim_id: durum.takim.id, ...rol });
        }
        await yetkileriYukle();
        bildir("Roller kuruldu. Şimdi kişilere rol ver.");
        await yeniden();
      } catch (hata) { hataYaz(hataCevir(hata)); }
    };
    return;
  }

  const rolSatiri = (rol) => {
    const yetki = yetkileriTemizle(rol.yetkiler);
    return '<tr data-rol="' + htmlKacis(rol.id) + '"><th scope="row">' +
      '<input type="text" data-rol-ad maxlength="60" value="' + htmlKacis(rol.ad) + '" aria-label="Rol adı">' +
      (rol.temel ? '<small class="soluk">herkes</small>' : "") + "</th>" +
      sekmeler.map((s) => "<td>" + seviyeSecimi(s, yetki[s] || "gizli") + "</td>").join("") +
      "<td>" + (rol.temel ? "" : '<button type="button" class="dugme kucuk tehlike" data-rol-sil aria-label="' + htmlKacis(rol.ad) + ' rolünü sil">Sil</button>') + "</td></tr>";
  };
  const atananlar = roller.filter((r) => !r.temel);
  const hesapSatiri = (h) => '<tr data-hesap="' + htmlKacis(h.kullanici_id) + '"><th scope="row">' + htmlKacis(h.eposta || "(e-posta yok)") +
    (h.kurucu ? ' <small class="soluk">kurucu</small>' : "") + "</th>" +
    '<td><label class="satir-secim"><input type="checkbox" data-yonetici' + (h.yonetici ? " checked" : "") + (h.kurucu ? " disabled" : "") + "> Yönetici</label></td>" +
    "<td>" + (atananlar.length
      ? atananlar.map((r) => '<label class="satir-secim"><input type="checkbox" data-hesap-rol="' + htmlKacis(r.id) + '"' +
          ((h.rol_idleri || []).includes(r.id) ? " checked" : "") + "> " + htmlKacis(r.ad) + "</label>").join("")
      : '<span class="soluk kucuk-yazi">Atanacak rol yok</span>') + "</td>" +
    '<td class="yonetim-dugmeler"><button type="button" class="dugme kucuk" data-hesap-kaydet>Kaydet</button>' +
    (h.kurucu || h.eposta === ((durum.oturum.kullanici() || {}).email || "").toLowerCase() ? "" : '<button type="button" class="dugme kucuk tehlike" data-hesap-cikar>Çıkar</button>') +
    "</td></tr>";

  icerik.innerHTML =
    '<p class="soluk">Her sekme için seviye seç: <b>Gizli</b> (görmez), <b>Görür</b> (okur, değiştiremez), <b>Düzenler</b>. ' +
    "<b>" + htmlKacis(roller.find((r) => r.temel).ad) + "</b> rolü herkesindir; kişiye verilen roller onun üstüne eklenir, en geniş yetki geçerlidir. " +
    "Yöneticiler her şeyi düzenler.</p>" +
    '<div class="tablo-sarici"><table class="tablo yetki-tablosu"><thead><tr><th scope="col">Rol</th>' +
    sekmeler.map((s) => '<th scope="col">' + htmlKacis(ekranMetni(s, "kisaAd")) + "</th>").join("") + "<th></th></tr></thead>" +
    "<tbody>" + roller.map(rolSatiri).join("") + "</tbody></table></div>" +
    '<div class="arac-cubugu" style="margin:12px 0 0"><button type="button" class="dugme ana" data-yonetim="kaydet">Yetkileri kaydet</button>' +
    '<button type="button" class="dugme" data-yonetim="rol-ekle">+ Rol ekle</button>' +
    '<span class="bosluk"></span><button type="button" class="dugme tehlike" data-yonetim="kaldir">Rolleri kaldır</button></div>' +
    '<p class="form-hata" id="yonetim-hata" role="alert" hidden></p>' +

    '<h3 style="margin-top:22px">Kişiler ve roller</h3>' +
    '<p class="soluk kucuk-yazi">' + htmlKacis(ilkHarfBuyuk(soz(ayar, "takima"))) + " hesabıyla katılmış kişiler. Yeni kişiyi Erişim kartından davet et; " +
    "hesabını açınca burada görünür.</p>" +
    '<div class="tablo-sarici"><table class="tablo"><thead><tr><th scope="col">Hesap</th><th scope="col">Yönetici</th><th scope="col">Roller</th><th></th></tr></thead>' +
    "<tbody>" + hesaplar.map(hesapSatiri).join("") + "</tbody></table></div>";

  icerik.onclick = async (olay) => {
    const hedef = olay.target;
    try {
      if (hedef.closest('[data-yonetim="kaydet"]')) {
        for (const satir of icerik.querySelectorAll("tr[data-rol]")) {
          const rol = roller.find((r) => r.id === satir.dataset.rol);
          const yetkiler = {};
          for (const secim of satir.querySelectorAll("select[data-sekme]")) yetkiler[secim.dataset.sekme] = secim.value;
          const ad = satir.querySelector("[data-rol-ad]").value.trim() || rol.ad;
          // Kapalı sekmelerin yetkisi korunur (sekme yeniden açılınca eski ayar geri gelir)
          const birlesik = yetkileriTemizle({ ...rol.yetkiler, ...yetkiler });
          if (ad !== rol.ad || JSON.stringify(birlesik) !== JSON.stringify(yetkileriTemizle(rol.yetkiler))) {
            await durum.depo.guncelle("takim_rolleri", rol.id, { ad, yetkiler: birlesik });
          }
        }
        await yetkileriYukle();
        bildir("Yetkiler kaydedildi");
        return yeniden();
      }
      if (hedef.closest('[data-yonetim="rol-ekle"]')) {
        await durum.depo.ekle("takim_rolleri", { takim_id: durum.takim.id, ad: "Yeni rol", temel: false, yetkiler: {} });
        return yeniden();
      }
      if (hedef.closest('[data-yonetim="kaldir"]')) {
        if (!confirm("Bütün roller silinsin mi?\nBundan sonra " + soz(ayar, "takimdaki") + " herkes her şeyi görüp değiştirebilir.")) return;
        // Önce temel rol: o silinince herkes her şeyi düzenler; sonra diğerleri
        for (const rol of [...roller.filter((r) => r.temel), ...roller.filter((r) => !r.temel)]) await durum.depo.sil("takim_rolleri", rol.id);
        await yetkileriYukle();
        bildir("Roller kaldırıldı");
        return yeniden();
      }
      const rolSil = hedef.closest("[data-rol-sil]");
      if (rolSil) {
        const rol = roller.find((r) => r.id === rolSil.closest("tr").dataset.rol);
        if (!confirm('"' + rol.ad + '" rolü silinsin mi? Bu role sahip kişiler rolün verdiği yetkileri kaybeder.')) return;
        await durum.depo.sil("takim_rolleri", rol.id);
        return yeniden();
      }
      const satir = hedef.closest("tr[data-hesap]");
      if (satir && hedef.closest("[data-hesap-kaydet]")) {
        const rolIdleri = [...satir.querySelectorAll("[data-hesap-rol]:checked")].map((k) => k.dataset.hesapRol);
        await durum.oturum.uyelikGuncelle(durum.takim.id, satir.dataset.hesap, satir.querySelector("[data-yonetici]").checked, rolIdleri);
        await yetkileriYukle();
        bildir("Kişinin rolleri kaydedildi");
        return yeniden();
      }
      if (satir && hedef.closest("[data-hesap-cikar]")) {
        const eposta = satir.querySelector("th").textContent;
        if (!confirm(eposta + " " + soz(ayar, "takim_kucuk") + " listesinden çıkarılsın mı?\nHesabı silinmez; davet koduyla yeniden katılabilir.")) return;
        await durum.oturum.uyeligiKaldir(durum.takim.id, satir.dataset.hesap);
        bildir("Kişi çıkarıldı");
        return yeniden();
      }
    } catch (hata) {
      console.error(hata);
      hataYaz(hataCevir(hata));
    }
  };
}
