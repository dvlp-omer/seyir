# PLAN — Takım Asistanı v1

> Not: Bu ilk plan, proje "Seyir" adını almadan önce yazıldı; tarihsel kayıt
> olarak eski adıyla bırakıldı.

Öğrenci takımları (ör. ROTA İSAS) için Türkçe, tarayıcıda çalışan bir takım asistanı.
Düz HTML + CSS + JavaScript. Framework yok, derleme adımı yok.

## Hedef

Bitmiş ve çalışan bir v1: takım/üyeler, görev panosu, son tarih takibi,
toplantı tutanağı (yazdırılabilir), WhatsApp duyuru metni.

v2'ye bırakılanlar: faaliyet raporu, yoklama.

## Dosya yapısı

```
index.html              Tek sayfa; bütün ekranlar buraya çizilir
css/stil.css            Tasarım + mobil + yazdırma kuralları
js/veri.js              VERİ KATMANI (tek dosya): listele/oku/ekle/guncelle/sil
                        - yerelDepoOlustur  -> localStorage
                        - supabaseDepoOlustur -> Supabase (aynı arayüz)
js/mantik.js            Saf fonksiyonlar: tarih hesabı, tutanak, duyuru şablonları
js/arayuz.js            Ortak arayüz parçaları: form penceresi, bildirim
js/ekranlar/*.js        Her ekran kendi dosyasında
js/uygulama.js          Başlatma, ekranlar arası geçiş
testler/*.test.js       Node'un kendi test aracıyla (node --test) çalışan testler
supabase/sema.sql       Supabase tabloları
.env.example            Supabase anahtarları için yer tutucu
```

## Aşamalar (her biri ayrı commit)

1. Plan + depo kurulumu
2. Veri katmanı (localStorage) + saf mantık + testler
3. Arayüz iskeleti, tasarım, takım ve üyeler ekranı
4. Görev panosu (Yapılacak / Yapılıyor / Bitti)
5. Son tarihler + özet ekranı
6. Toplantı tutanağı + karardan görev + yazdırma
7. Duyuru şablonu
8. Supabase sürümü (aynı arayüz) + .env.example + şema
9. README (TR + EN), son kontroller

## Temel kararlar (kısaca)

- **Veri katmanı asenkron (Promise döner).** localStorage aslında anında cevap
  verir ama Supabase ağ üzerinden çalışır. İkisi aynı arayüzü paylaşsın diye
  hepsi `async`. Böylece ekran kodu hangi deponun kullanıldığını bilmez.
- **Alan adları veritabanı sütunlarıyla aynı** (`takim_id`, `bitis_tarihi`).
  Arada çeviri katmanı gerekmez, kod kısa kalır.
- **Klasik `<script>` etiketleri** (ES modülü değil): `index.html` çift
  tıklanınca da (file://) çalışsın diye.
- **Supabase'e kütüphanesiz, `fetch` ile** bağlanılır (REST API). Bağımlılık yok.
- **Kişisel veri:** sadece ad ve rol.

Ayrıntılı gerekçeler PROGRESS.md'de, varsayımlar QUESTIONS.md'de.
