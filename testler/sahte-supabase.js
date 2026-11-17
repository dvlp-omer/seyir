// Testler için sahte Supabase REST sunucusu (fetch'in yerine geçer).
// supabase.test.js ve cakisma.test.js kullanır. Dosya adı .test.js ile
// bitmediği için test olarak çalıştırılmaz.

// Bellekte tablo tutan, "?alan=eq.deger" süzgecini anlayan sahte fetch.
// Gerçek veritabanı gibi "surum" sütununu yönetir: eklenen satır 1, her
// güncellemede +1 (schema.sql > surum_artir). surumsuz: true -> sütunu
// olmayan eski bir veritabanı gibi davranır.
function sahteSupabase({ surumsuz = false } = {}) {
  const tablolar = {};
  const istekler = [];

  async function sahteFetch(adres, secenekler) {
    istekler.push({ adres, ...secenekler });
    const url = new URL(adres);
    const tablo = url.pathname.replace("/rest/v1/", "");
    const satirlar = (tablolar[tablo] = tablolar[tablo] || []);

    // select ve order dışındaki parametreler süzgeçtir: id=eq.abc
    const suzgecler = [...url.searchParams].filter(([ad]) => ad !== "select" && ad !== "order");
    const uyar = (satir) => suzgecler.every(([ad, deger]) => String(satir[ad]) === deger.replace(/^eq\./, ""));

    const cevap = (durum, govde) => ({
      ok: durum < 400, status: durum,
      json: async () => govde, text: async () => JSON.stringify(govde),
    });

    if (secenekler.method === "GET") return cevap(200, satirlar.filter(uyar));
    if (secenekler.method === "POST") {
      const satir = JSON.parse(secenekler.body);
      if (!surumsuz) satir.surum = 1;
      satirlar.push(satir);
      return cevap(201, [satir]);
    }
    if (secenekler.method === "PATCH") {
      const degisenler = satirlar.filter(uyar);
      degisenler.forEach((satir) => {
        Object.assign(satir, JSON.parse(secenekler.body));
        if (!surumsuz) satir.surum += 1;
      });
      return cevap(200, degisenler);
    }
    if (secenekler.method === "DELETE") {
      tablolar[tablo] = satirlar.filter((satir) => !uyar(satir));
      return cevap(204, null);
    }
    return cevap(405, { message: "desteklenmiyor" });
  }

  return { sahteFetch, istekler, tablolar };
}

module.exports = { sahteSupabase };
