# Kurum özelleştirme, roller ve yeni sekmeler — tasarım

Tarih: 24 Kasım 2026 · Durum: Ömer "sen başla, ileride değiştiririz" dedi; aşağıdaki kararların bir kısmı Claude'un önerisidir (işaretli).

## Neden

Seyir bugün tek bir takıma (ROTA İSAS) göre ayarlı: tutanak varsayılanlarında kulübün adı ve numara kalıbı koda gömülü, menü herkes için aynı, herkes her şeyi görüp değiştirebiliyor. Ömer uygulamanın hem öğrenci takımlarına/kulüplere hem şirketlere uyarlanabilmesini, daha profesyonel görünmesini, daha dolu sekmeleri olmasını ve takım kaptanının/yöneticinin "kim neyi görür, kim neyi değiştirir" ayarlayabildiği büyük bir kontrol paneli istiyor.

## Hedefler

- Her kurum kendi adını, logosunu, ana rengini, tutanak başlığını, alt bilgisini ve numara kalıbını girer. Kodda kuruma özel sabit kalmaz.
- Kurum türü seçilir: **Öğrenci takımı / kulüp** ya da **Şirket / ekip**. Seçime göre sözcükler (Takım ↔ Ekip, Üye ↔ Çalışan, Kaptan ↔ Yönetici), varsayılan sekmeler ve hazır roller değişir.
- Yönetim paneli: Kurum · Kişiler ve roller · Yetkiler · Sekmeler.
- Roller yönetici tarafından oluşturulur, ad verilir, kişilere atanır. Her rol her sekme için **Gizli / Görür / Düzenler** seviyesinden birini alır. Bir kişinin birden çok rolü olabilir; en geniş yetki geçerlidir.
- Yetkiler veritabanında uygulanır (Supabase satır düzeyi güvenlik). "Gizli" sekmenin verisi okunamaz, "Görür" olan kaydedemez.
- Yeni sekmeler (sponsor, bütçe, malzeme, projeler, müşteriler…) bu altyapının üstüne, yetkiye bağlı olarak eklenir.

## Hedef olmayanlar

- İki ayrı uygulama ya da kod kopyası (bakım yükü ikiye katlanır; seçilmedi).
- Ücretli servis, ödeme, abonelik.
- Gerçek kişi verisiyle örnek/test (her zamanki kural).

## Başarısızlık sayılacaklar

- Var olan ROTA İSAS kurulumunun verisi ya da tutanak numaralandırması bozulursa.
- Bir sekme yalnızca menüden gizlenip verisi hâlâ okunabiliyorsa (sahte güvenlik).
- Yetki ayarı karmaşık olup yöneticiyi kilitlerse (yönetici her zaman her şeyi görür, düzenler; kendini dışarıda bırakamaz).

## Kısıtlar

- Düz HTML/CSS/JS, paket yok; Supabase ücretsiz katman; yerel (localStorage) depo da çalışmaya devam eder.
- Şema değişiklikleri hem `supabase/schema.sql`'e hem bir defalık güncelleme dosyasına yazılır; Ömer güncellemeyi Supabase SQL düzenleyicisinde bir kez çalıştırır.
- Uygulama dosyası değişince `sw.js` önbellek sürümü artar.
- Renkler yalnızca CSS değişken bloğunda; kullanıcı rengi için yazı rengi kontrasta göre seçilir.

## Yaklaşımlar

1. **İki ayrı uygulama** (kod kopyası): hızlı başlar, ama her düzeltme iki kez yapılır. Elendi.
2. **Tek uygulama, kurum türüne göre paket** — **seçilen**. Dışarıdan iki ürün gibi görünür, arkada tek kod.
3. **Yalnızca ayrı tanıtım sayfası**: ucuz, ama uygulamanın içi "takım/Teknofest" kokmaya devam eder. Elendi.

Yetkiler için: (a) yalnızca menüden gizleme — sahte güvenlik, elendi; (b) **roller + sekme başına seviye, veritabanında da uygulanır** — seçilen; (c) kişi başına tek tek yetki — panelde karmaşık, roller üstüne gerekirse sonra.

## Üç proje, bu sırayla

### Proje 1 — Kurum ayarları ve paketler

- `takimlar` kaydına `ayarlar` (jsonb) alanı: `tur` ("takim" | "sirket"), `logo` (küçültülmüş PNG, data URL, ≤ 60 KB), `renk` ("#rrggbb"), `tutanak` ({kurum, alt_baslik, numara_kalibi, alt_bilgi, sayfa_altligi, ek_etiket}), `kapali_sekmeler` ([ekran adları]).
- Saf mantık `js/kurum.js` (testli): varsayılanlar, doğrulama ve birleştirme, sözcük paketi, paket varsayılan sekmeleri, renk → yazı rengi (kontrast).
- `TUTANAK_VARSAYILAN`'daki ROTA/Sabahattin Zaim sabitleri kalkar; ilk tutanağın varsayılanları kurum ayarlarından gelir (sonraki tutanaklar bugünkü gibi bir öncekinden kopyalanır, ROTA'nın numaralandırması etkilenmez). *(Claude'un kararı)*
- Ayarlar'da "Kurum" bölümü (ilk adımda; Proje 2'de Yönetim paneline taşınır). Logo yan menünün üstünde, ana renk `--vurgu` değişkenine uygulanır.
- Sözcükler ekranlarda paket sözlüğünden okunur. Sekmeleri açıp kapatma: kapalı sekme menüde ve "Daha fazla"da görünmez; Özet ve Ayarlar kapatılamaz.
- Şirket paketinin varsayılan kapalı sekmeleri: Etkinlik. Takım paketinde hepsi açık. *(Claude'un kararı)*

### Proje 2 — Roller ve yetkiler

- Bugün iki ayrı rol kavramı var: hesaplarda kurulum geneli `profiller.rol` (yonetici/uye) ve takım ekranındaki isim listesinde `uyeler.rol` (kaptan/uye, hesapla bağı yok). Yeni model hesap ↔ takım üzerinden kurulur:
  - `takim_rolleri` (id, takim_id, ad, yetkiler jsonb: {ekran: "gizli"|"gorur"|"duzenler"}).
  - `takim_uyelikleri`'ne `yonetici` (bool) ve `rol_idleri` (text[]).
  - Takımı kuran hesap o takımın yöneticisidir; kurulum yöneticisi (`profiller.rol = 'yonetici'`) de her takımda yöneticidir.
- Veritabanı: `yetki(takim, ekran)` fonksiyonu; her tablonun kuralı ilgili ekranın yetkisine bağlanır (okuma: gorur/duzenler, yazma: duzenler). Tablo ↔ ekran eşlemesi şemada sabit.
- Hazır roller paketle gelir (takım: Görev sorumlusu, Tutanak sorumlusu, İletişim sorumlusu; şirkette karşılıkları). Rolü olmayan üye: her şey "Görür", Mesajlar ve Kişiler "Gizli" (telefon numaraları). *(Claude'un kararı)*
- Yönetim paneli: Kurum · Kişiler ve roller · Yetkiler (rol × sekme tablosu) · Sekmeler.
- Yerel (tek cihaz) depoda yetki yoktur; tek kullanıcı her şeyi yönetir.

### Proje 3 — Yeni sekmeler

Altyapının üstüne birer birer, her biri kendi tablosu, testleri ve yetki eşlemesiyle. Takım paketi: Sponsorlar, Bütçe, Malzeme. Şirket paketi: Projeler, Müşteriler. Sıra ve içerik her sekmeden önce kısaca konuşulur.

## Kurucuya bırakılanlar

Ekran yerleşimi ve metinlerin ayrıntısı, testlerin bölünmesi, güncelleme SQL'inin adı. Her adım ayrı commit; adımlar arasında Ömer'in "Devam"ı beklenir.
