-- ============================================================================
-- Seyir (takım asistanı) — Supabase şeması (tablolar + satır düzeyinde güvenlik)
-- ============================================================================
-- Kullanım: Supabase paneli > SQL Editor > New query > bu dosyanın TAMAMINI
-- yapıştır > Run. Adım adım anlatım: SUPABASE_KURULUM.md
-- Dosya tekrar çalıştırılabilir; var olan veriyi silmez.
--
-- TEMEL FİKİR
--   "Kullanıcı yalnızca kendi takımının verisini görsün."
--   Bunu uygulama kodu DEĞİL, veritabanı sağlar (Row Level Security, RLS).
--   Tarayıcıdaki kod değiştirilse bile başka takımın satırları dönmez.
--
--   Kim hangi takımda?  ->  takim_uyelikleri tablosu (hesap <-> takım)
--   Her tabloda kural   ->  "bu satırın takim_id'si benim üye olduğum bir takım mı?"
--
-- İKİ FARKLI "ÜYE" KAVRAMI (karıştırma!)
--   uyeler           : takımın kadrosu. Sadece ad + rol. Hesabı olmayabilir.
--   takim_uyelikleri : uygulamaya GİRİŞ YAPAN hesaplar ve erişebildikleri takımlar.
--
-- KİŞİSEL VERİ
--   kisiler tablosunda TELEFON NUMARASI vardır. Bu yüzden:
--     * giriş yapmamış ziyaretçi (anon) hiçbir tabloyu göremez (bölüm 3),
--     * giriş yapan da yalnızca üyesi olduğu takımın satırlarını görür (bölüm 4),
--     * herkes hesap açamaz: yalnızca davet listesindeki e-postalar (bölüm 5).
--   Giriş e-postası Supabase'in auth.users tablosunda durur; davet listesi ve
--   profil tablosunda da e-posta vardır, onları yalnızca yöneticiler görür.
--
-- Sütun adları uygulamadaki alan adlarıyla birebir aynıdır (js/yedek.js >
-- YEDEK_SEMASI); bu yüzden js/veri.js içinde ad çevirisi yapılmaz.
--   * id'leri uygulama üretir (crypto.randomUUID), o yüzden tür "text".
--   * Tarihler "YYYY-AA-GG" metnidir; boş bırakılabilen alanlarda "" olur.
--   * Listeler (gündem, kararlar, katılımcılar) jsonb sütunlarındadır.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) TABLOLAR
-- ---------------------------------------------------------------------------

create table if not exists takimlar (
  id           text primary key,
  ad           text not null check (char_length(ad) between 1 and 200),
  -- Takımı oluşturan hesap. İstemci göndermez; veritabanı kendisi doldurur.
  -- (Bilerek yabancı anahtar değil: hesap silinse de takım diğer üyelerde kalsın.)
  olusturan_id uuid not null default auth.uid(),
  -- Başkalarının takıma katılması için paylaşılan kod (rastgele, 12 karakter).
  davet_kodu   text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  -- Kurum ayarları: tür (takim / sirket), logo, ana renk, tutanak bilgileri, kapalı sekmeler.
  -- Uygulama her okumada temizler (js/kurum.js > kurumAyarlari); boyut sınırı kaydı şişirmesin diye.
  ayarlar      jsonb not null default '{}'::jsonb check (jsonb_typeof(ayarlar) = 'object' and pg_column_size(ayarlar) < 150000),
  olusturma    timestamptz not null default now()
);

-- Hangi hesap hangi takıma erişebilir?
create table if not exists takim_uyelikleri (
  takim_id     text not null references takimlar (id) on delete cascade,
  kullanici_id uuid not null references auth.users (id) on delete cascade,
  olusturma    timestamptz not null default now(),
  primary key (takim_id, kullanici_id)
);

create table if not exists uyeler (
  id         text primary key,
  takim_id   text not null references takimlar (id) on delete cascade,
  ad         text not null check (char_length(ad) between 1 and 200),
  rol        text not null default 'uye' check (rol in ('kaptan', 'uye')),
  olusturma  timestamptz not null default now()
);

create table if not exists gorevler (
  id            text primary key,
  takim_id      text not null references takimlar (id) on delete cascade,
  baslik        text not null check (char_length(baslik) between 1 and 200),
  aciklama      text not null default '',
  durum         text not null default 'yapilacak' check (durum in ('yapilacak', 'yapiliyor', 'bitti')),
  sorumlu_id    text not null default '',
  bitis_tarihi  text not null default '',
  toplanti_id   text not null default '',
  olusturma     timestamptz not null default now()
);

create table if not exists son_tarihler (
  id          text primary key,
  takim_id    text not null references takimlar (id) on delete cascade,
  baslik      text not null check (char_length(baslik) between 1 and 200),
  tur         text not null default 'diger' check (tur in ('rapor', 'izin', 'etkinlik', 'diger')),
  tarih       text not null,
  aciklama    text not null default '',
  tamamlandi  boolean not null default false,
  olusturma   timestamptz not null default now()
);

create table if not exists toplantilar (
  id               text primary key,
  takim_id         text not null references takimlar (id) on delete cascade,
  baslik           text not null check (char_length(baslik) between 1 and 200),
  tarih            text not null,
  saat             text not null default '',
  yer              text not null default '',
  katilimci_idler  jsonb not null default '[]',
  yazan_id         text not null default '',
  gundem           jsonb not null default '[]',
  kararlar         jsonb not null default '[]',
  notlar           text not null default '',
  olusturma        timestamptz not null default now()
);

create table if not exists etkinlikler (
  id               text primary key,
  takim_id         text not null references takimlar (id) on delete cascade,
  ad               text not null check (char_length(ad) between 1 and 200),
  tarih            text not null,
  yer              text not null default '',
  katilimci_sayisi integer not null default 0 check (katilimci_sayisi >= 0),
  katilimci_idler  jsonb not null default '[]',
  aciklama         text not null default '',
  olusturma        timestamptz not null default now()
);

-- Resmî toplantı tutanağı (js/tutanak.js)
create table if not exists tutanaklar (
  id               text primary key,
  takim_id         text not null references takimlar (id) on delete cascade,
  kurum            text not null default '',
  alt_baslik       text not null default '',
  numara           text not null default '',
  toplanti_tarihi  text not null,
  tutanak_tarihi   text not null default '',
  sonraki_toplanti text not null default '',
  ek_etiket        text not null default '',
  ek_deger         text not null default '',
  katilimcilar     jsonb not null default '[]',   -- ["Ad Soyad", ...]
  devreden_giris   text not null default '',
  devreden         jsonb not null default '[]',   -- [{ "metin": "...", "atif": "..." }]
  kararlar         jsonb not null default '[]',
  gorevler         jsonb not null default '[]',
  alt_bilgi        text not null default '',
  sayfa_altligi    text not null default '',
  olusturma        timestamptz not null default now()
);

-- Kişi rehberi (js/kisiler.js). TELEFON KİŞİSEL VERİDİR: bu tabloyu yalnızca
-- takım üyeleri görür (aşağıdaki RLS kuralı), giriş yapmamış kimse göremez.
create table if not exists kisiler (
  id        text primary key,
  takim_id  text not null references takimlar (id) on delete cascade,
  ad        text not null,
  ilk_ad    text not null default '',
  telefon   text not null check (telefon ~ '^90[0-9]{10}$'),   -- 905XXXXXXXXX
  etiket    text not null default '',
  aciklama  text not null default '',
  olusturma timestamptz not null default now()
);

-- WhatsApp mesaj şablonları
create table if not exists sablonlar (
  id        text primary key,
  takim_id  text not null references takimlar (id) on delete cascade,
  ad        text not null,
  tur       text not null default 'duyuru' check (tur in ('duyuru', 'kabul', 'davet', 'hatirlatma')),
  metin     text not null,
  olusturma timestamptz not null default now()
);

-- Gönderim listeleri: alıcılar o anki hâlleriyle kopyalanır, kim gönderildi işaretlenir
create table if not exists kampanyalar (
  id        text primary key,
  takim_id  text not null references takimlar (id) on delete cascade,
  ad        text not null,
  sablon_id text not null default '',
  mesaj     text not null,
  alicilar  jsonb not null default '[]',  -- [{ kisi_id, ad, ilk_ad, telefon, gonderildi, zaman }]
  olusturma timestamptz not null default now()
);

-- Listeler hep "takim_id'ye göre" çekilir; bu dizinler o sorguları hızlandırır.
create index if not exists uyeler_takim       on uyeler (takim_id);
create index if not exists gorevler_takim     on gorevler (takim_id);
create index if not exists son_tarihler_takim on son_tarihler (takim_id);
create index if not exists toplantilar_takim  on toplantilar (takim_id);
create index if not exists etkinlikler_takim  on etkinlikler (takim_id);
create index if not exists tutanaklar_takim   on tutanaklar (takim_id);
create index if not exists kisiler_takim      on kisiler (takim_id);
create index if not exists sablonlar_takim    on sablonlar (takim_id);
create index if not exists kampanyalar_takim  on kampanyalar (takim_id);
create index if not exists uyelikler_kullanici on takim_uyelikleri (kullanici_id);


-- ---------------------------------------------------------------------------
-- 2) YARDIMCI FONKSİYONLAR
-- ---------------------------------------------------------------------------

-- "İstek atan hesap bu takımın üyesi mi?" Bütün kurallar bunu kullanır.
-- security definer: fonksiyon, üyelik tablosunu KENDİ yetkisiyle okur. Böyle
-- olmasa üyelik tablosunun kendi kuralı devreye girer ve kurallar birbirini
-- çağırıp sonsuz döngüye girerdi.
create or replace function uye_mi(hedef_takim text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from takim_uyelikleri
    where takim_id = hedef_takim and kullanici_id = auth.uid()
  );
$$;

-- Takım oluşturulunca, oluşturan hesabı o takımın üyesi yap.
create or replace function takim_kurucusunu_ekle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into takim_uyelikleri (takim_id, kullanici_id)
  values (new.id, new.olusturan_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists takim_kurucusu on takimlar;
create trigger takim_kurucusu
  after insert on takimlar
  for each row execute function takim_kurucusunu_ekle();

-- Davet koduyla takıma katılma. Uygulama bunu /rest/v1/rpc/takima_katil
-- adresinden çağırır (js/oturum.js). Kod doğruysa istek atan hesap üye yapılır
-- ve takımın kimliği döner. Üyelik tablosuna doğrudan yazma izni YOKTUR;
-- tek yol bu fonksiyondur, o da kodu bilmeyi gerektirir.
create or replace function takima_katil(kod text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  hedef text;
begin
  if auth.uid() is null then
    raise exception 'Giriş yapmalısın';
  end if;

  select id into hedef from takimlar where davet_kodu = kod;
  if hedef is null then
    raise exception 'Davet kodu geçersiz';
  end if;

  insert into takim_uyelikleri (takim_id, kullanici_id)
  values (hedef, auth.uid())
  on conflict do nothing;

  return hedef;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3) YETKİLER (hangi rol hangi tabloya dokunabilir)
-- ---------------------------------------------------------------------------
-- anon          : giriş yapmamış ziyaretçi -> HİÇBİR ŞEY
-- authenticated : giriş yapmış hesap       -> aşağıdaki kurallar kadar

revoke all on takimlar, takim_uyelikleri, uyeler, gorevler, son_tarihler, toplantilar, etkinlikler, tutanaklar,
  kisiler, sablonlar, kampanyalar from anon;

grant select, insert, update, delete on uyeler, gorevler, son_tarihler, toplantilar, etkinlikler, tutanaklar,
  kisiler, sablonlar, kampanyalar to authenticated;

-- Takımda yalnızca AD değiştirilebilir. olusturan_id ve davet_kodu
-- sütunlarını istemci değiştiremez (sütun düzeyinde yetki).
revoke all on takimlar from authenticated;
grant select, insert, delete on takimlar to authenticated;
grant update (ad) on takimlar to authenticated;

-- Üyelik tablosu: kendi üyeliklerini gör, takımdan ayrıl. Ekleme yok
-- (ekleme yalnızca yukarıdaki iki fonksiyonla olur).
revoke all on takim_uyelikleri from authenticated;
grant select, delete on takim_uyelikleri to authenticated;

revoke all on function uye_mi(text) from public, anon;
revoke all on function takima_katil(text) from public, anon;
revoke all on function takim_kurucusunu_ekle() from public, anon, authenticated;
grant execute on function uye_mi(text) to authenticated;
grant execute on function takima_katil(text) to authenticated;


-- ---------------------------------------------------------------------------
-- 4) SATIR DÜZEYİNDE GÜVENLİK (RLS)
-- ---------------------------------------------------------------------------
-- RLS açıkken, bir kural izin vermedikçe HİÇBİR satır görünmez/değişmez.
--   using      : hangi var olan satırlara dokunabilirim (oku, güncelle, sil)
--   with check : yazdığım yeni satır hangi koşulu sağlamalı (ekle, güncelle)

alter table takimlar         enable row level security;
alter table takim_uyelikleri enable row level security;
alter table uyeler           enable row level security;
alter table gorevler         enable row level security;
alter table son_tarihler     enable row level security;
alter table toplantilar      enable row level security;
alter table etkinlikler      enable row level security;
alter table tutanaklar       enable row level security;
alter table kisiler          enable row level security;
alter table sablonlar        enable row level security;
alter table kampanyalar      enable row level security;

-- v1'in "herkese açık" kuralları kaldırılır (eski şemayı çalıştırmış olanlar için).
drop policy if exists "v1: herkese acik" on takimlar;
drop policy if exists "v1: herkese acik" on uyeler;
drop policy if exists "v1: herkese acik" on gorevler;
drop policy if exists "v1: herkese acik" on son_tarihler;
drop policy if exists "v1: herkese acik" on toplantilar;

-- ---- takimlar ----
-- Okuma kuralındaki "olusturan_id = auth.uid()" kısmı şunun için var: takım
-- EKLENDİĞİ anda üyelik satırı henüz yazılmamıştır (tetikleyici satırdan
-- sonra çalışır). Bu koşul olmasa, eklenen takım istemciye geri dönemezdi.
drop policy if exists takim_oku on takimlar;
create policy takim_oku on takimlar for select to authenticated
  using (olusturan_id = auth.uid() or uye_mi(id));

drop policy if exists takim_ekle on takimlar;
create policy takim_ekle on takimlar for insert to authenticated
  with check (olusturan_id = auth.uid());

-- Takımı güncelleme ve silme kuralları 8. bölümde (yalnızca takım yöneticisi).

-- ---- takim_uyelikleri ----
drop policy if exists uyelik_oku on takim_uyelikleri;
create policy uyelik_oku on takim_uyelikleri for select to authenticated
  using (kullanici_id = auth.uid());

drop policy if exists uyelik_ayril on takim_uyelikleri;
create policy uyelik_ayril on takim_uyelikleri for delete to authenticated
  using (kullanici_id = auth.uid());

-- ---- takıma bağlı tablolar ----
-- Kurallar 8. bölümde: okumak için sekmede en az "görür", yazmak için "düzenler" yetkisi.
-- with check sayesinde kimse başka takımın kimliğiyle satır ekleyemez ya da bir satırı başka takıma taşıyamaz.


-- ---------------------------------------------------------------------------
-- 5) KAYIT YALNIZCA DAVETLE (herkes hesap açamasın)
-- ---------------------------------------------------------------------------
-- Sorun: Supabase'de kayıt varsayılan olarak herkese açıktır. Rehberde telefon
-- numaraları olduğu için "isteyen hesap açsın" kabul edilemez.
-- Çözüm:
--   * İLK hesap kendiliğinden YÖNETİCİ olur (kurulumu yapan kişi).
--   * Sonrakiler yalnızca davet listesindeki (izinli_epostalar) e-postayla
--     hesap açabilir. Listeye yalnızca yöneticiler ekler (Ayarlar > Erişim).
--   * Davette takım da seçildiyse hesap açılınca o takıma kendiliğinden üye olur.
-- Kontrol veritabanında, auth.users tablosuna eklenen tetikleyiciyle yapılır:
-- uygulamanın kodu değiştirilse ya da doğrudan Supabase'e istek atılsa bile
-- listede olmayan e-posta için hesap OLUŞMAZ.

-- Uygulama hesapları: rol burada tutulur (yonetici / uye)
create table if not exists profiller (
  kullanici_id uuid primary key references auth.users (id) on delete cascade,
  eposta       text not null,
  rol          text not null default 'uye' check (rol in ('yonetici', 'uye')),
  olusturma    timestamptz not null default now()
);

-- Davet listesi: bu e-postalar hesap açabilir
create table if not exists izinli_epostalar (
  eposta     text primary key check (eposta = lower(eposta) and eposta like '%_@_%'),
  takim_id   text references takimlar (id) on delete set null,   -- isteğe bağlı: hesap açınca bu takıma üye yap
  ekleyen    uuid default auth.uid(),
  kullanildi boolean not null default false,                       -- bu e-postayla hesap açıldı mı
  olusturma  timestamptz not null default now()
);

-- "İstek atan hesap yönetici mi?" (uye_mi ile aynı mantık: security definer)
create or replace function yonetici_mi()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiller where kullanici_id = auth.uid() and rol = 'yonetici');
$$;

-- Uygulama giriş yapan hesabın rolünü buradan öğrenir (Ayarlar > Erişim)
create or replace function rolum()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select rol from profiller where kullanici_id = auth.uid()), 'uye');
$$;

-- Kayıt kapısı: hesap OLUŞMADAN ÖNCE çalışır. İzin yoksa hata verir ve
-- Supabase hesabı oluşturmaz (uygulama "davet listesinde yok" mesajı gösterir).
create or replace function kayit_kapisi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Henüz hiç hesap yoksa bu ilk hesaptır: izin ver (yönetici olacak)
  if not exists (select 1 from profiller) then
    return new;
  end if;
  if exists (select 1 from izinli_epostalar where eposta = lower(new.email)) then
    return new;
  end if;
  raise exception 'KAYIT_DAVETLI_DEGIL';
end;
$$;

drop trigger if exists kayit_kapisi on auth.users;
create trigger kayit_kapisi
  before insert on auth.users
  for each row execute function kayit_kapisi();

-- Hesap oluştuktan SONRA: profili yaz; ilk hesap yönetici; davette takım varsa üye yap
create or replace function yeni_hesap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  davet izinli_epostalar%rowtype;
begin
  insert into profiller (kullanici_id, eposta, rol)
  values (new.id, lower(new.email),
          case when exists (select 1 from profiller) then 'uye' else 'yonetici' end)
  on conflict (kullanici_id) do nothing;

  select * into davet from izinli_epostalar where eposta = lower(new.email);
  if found then
    update izinli_epostalar set kullanildi = true where eposta = davet.eposta;
    if davet.takim_id is not null then
      insert into takim_uyelikleri (takim_id, kullanici_id)
      values (davet.takim_id, new.id)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists yeni_hesap on auth.users;
create trigger yeni_hesap
  after insert on auth.users
  for each row execute function yeni_hesap();

-- Bu şema, hesapları zaten olan bir projede çalıştırılırsa: var olan hesaplara
-- profil aç; hiç yönetici yoksa EN ESKİ hesabı yönetici yap. (Tekrar çalışınca bir şey değişmez.)
insert into profiller (kullanici_id, eposta, rol)
select id, lower(coalesce(email, '')), 'uye' from auth.users
on conflict (kullanici_id) do nothing;

update profiller set rol = 'yonetici'
where kullanici_id = (select id from auth.users order by created_at limit 1)
  and not exists (select 1 from profiller where rol = 'yonetici');

-- Yetkiler: ziyaretçi hiçbir şey; hesap kendi profilini, yönetici hepsini görür.
revoke all on profiller, izinli_epostalar from anon;
revoke all on profiller, izinli_epostalar from authenticated;
grant select on profiller to authenticated;                         -- rol değişikliği yalnızca SQL Editor'dan
grant select, insert, delete on izinli_epostalar to authenticated;

alter table profiller        enable row level security;
alter table izinli_epostalar enable row level security;

drop policy if exists profil_oku on profiller;
create policy profil_oku on profiller for select to authenticated
  using (kullanici_id = auth.uid() or yonetici_mi());

drop policy if exists davet_yonetici on izinli_epostalar;
create policy davet_yonetici on izinli_epostalar for all to authenticated
  using (yonetici_mi()) with check (yonetici_mi());

revoke all on function yonetici_mi() from public, anon;
revoke all on function rolum() from public, anon;
grant execute on function rolum() to authenticated;
revoke all on function kayit_kapisi() from public, anon, authenticated;
revoke all on function yeni_hesap() from public, anon, authenticated;
grant execute on function yonetici_mi() to authenticated;

-- Bundan sonra eklenecek tablo ve fonksiyonlar da ziyaretçiye KAPALI başlasın
-- (Supabase varsayılanı açıktır; unutulan bir tablo sızıntı olmasın).
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon, public;


-- ---------------------------------------------------------------------------
-- 6) AYNI ANDA DÜZENLEME: SÜRÜM NUMARASI
-- ---------------------------------------------------------------------------
-- İki kişi aynı kaydı aynı anda düzenlerse sonradan kaydeden, öbürünün
-- değişikliğini fark etmeden silmesin diye her satırda bir "surum" vardır.
-- Satır her güncellendiğinde veritabanı bunu 1 artırır (aşağıdaki tetikleyici;
-- tarayıcı bu sayıyı değiştiremez). Uygulama güncellerken "sürüm hâlâ benim
-- gördüğüm sayı mı?" koşulunu ekler (js/veri.js > guncelle):
--   PATCH /rest/v1/gorevler?id=eq.abc&surum=eq.3
-- Arada başka biri kaydettiyse sürüm 4 olmuştur, koşul tutmaz, hiçbir satır
-- değişmez; uygulama kullanıcıyı uyarır. Koşul ve güncelleme tek komut
-- olduğu için iki kişi aynı anda kaydetse bile ikisi birden geçemez.
-- Var olan bir projede tek başına çalıştırmak için: supabase/guncelleme-surum.sql
create or replace function surum_artir()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.surum := coalesce(old.surum, 0) + 1;
  return new;
end;
$$;

revoke all on function surum_artir() from public, anon, authenticated;

do $$
declare
  tablo text;
begin
  foreach tablo in array array['takimlar', 'uyeler', 'gorevler', 'son_tarihler', 'toplantilar',
                               'etkinlikler', 'tutanaklar', 'kisiler', 'sablonlar', 'kampanyalar']
  loop
    execute format('alter table %I add column if not exists surum integer not null default 1', tablo);
    execute format('drop trigger if exists surum_artir on %I', tablo);
    execute format('create trigger surum_artir before update on %I for each row execute function surum_artir()', tablo);
  end loop;
end
$$;


-- ---------------------------------------------------------------------------
-- 7) BİLİNEN SINIRLAR (bilerek basit bırakıldı)
-- ---------------------------------------------------------------------------
-- * Roller kurulmamış takımda her üye her şeyi yapabilir (silme dahil). Roller
--   kurulunca yetkiler sekme sekme uygulanır (8. bölüm). Takım ekranındaki
--   "Kaptan" etiketi yalnızca kadroda görünür; yetki hesaptaki roldür.
-- * Davet kodu değiştirilemez. Kod sızarsa: yeni takım oluşturup veriyi
--   yedekten oraya taşımak gerekir.
-- * Kuralların doğruluğunu sınamak için: SUPABASE_KURULUM.md > "Güvenliği dene".
-- * Kurulum yöneticisi davet listesini yönetir ve ÜYESİ olduğu takımlarda
--   takım yöneticisi sayılır; üyesi olmadığı takımları göremez.
-- * Rol değiştirmek (birini yönetici yapmak) yalnızca SQL Editor'dan:
--     update profiller set rol = 'yonetici' where eposta = 'ornek@ornek.com';
-- * Davet listesinden silmek, açılmış hesabı silmez; hesap Supabase panelinden
--   (Authentication > Users) silinir.


-- ---------------------------------------------------------------------------
-- 8) ROLLER VE YETKİLER
-- ---------------------------------------------------------------------------
-- Var olan bir projede tek başına çalıştırmak için: supabase/guncelleme-roller.sql
-- (Aşağısı o dosyayla AYNIDIR; testler/guvenlik.test.js denetler.)
-- ROLLER-BLOGU-BASI
-- ---- Tablolar ----
alter table takim_uyelikleri add column if not exists yonetici boolean not null default false;
alter table takim_uyelikleri add column if not exists rol_idleri text[] not null default '{}';

create table if not exists takim_rolleri (
  id        text primary key,
  takim_id  text not null references takimlar (id) on delete cascade,
  ad        text not null check (char_length(ad) between 1 and 60),
  temel     boolean not null default false,   -- herkesin aldığı rol; takımda en fazla bir tane
  yetkiler  jsonb not null default '{}'::jsonb check (jsonb_typeof(yetkiler) = 'object' and pg_column_size(yetkiler) < 4000),
  olusturma timestamptz not null default now(),
  surum     integer not null default 1
);
create unique index if not exists takim_rolleri_tek_temel on takim_rolleri (takim_id) where temel;
create index if not exists takim_rolleri_takim on takim_rolleri (takim_id);

drop trigger if exists surum_artir on takim_rolleri;
create trigger surum_artir before update on takim_rolleri for each row execute function surum_artir();

-- ---- Yardımcı fonksiyonlar ----
-- Takım yöneticisi mi? (üye olmak şart; kurucu, kurulum yöneticisi ya da yönetici yapılmış)
create or replace function takim_yoneticisi_mi(hedef_takim text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from takim_uyelikleri u
    where u.takim_id = hedef_takim and u.kullanici_id = auth.uid()
      and (u.yonetici
           or exists (select 1 from takimlar t where t.id = hedef_takim and t.olusturan_id = auth.uid())
           or exists (select 1 from profiller p where p.kullanici_id = auth.uid() and p.rol = 'yonetici'))
  );
$$;

-- İstek atan hesabın bu takımda bu sekmedeki seviyesi: 0 gizli, 1 görür, 2 düzenler
create or replace function yetki_seviyesi(hedef_takim text, sekme text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  roller text[];
  seviye integer;
begin
  select rol_idleri into roller from takim_uyelikleri
  where takim_id = hedef_takim and kullanici_id = auth.uid();
  if not found then return 0; end if;
  if takim_yoneticisi_mi(hedef_takim) then return 2; end if;
  -- Roller kurulmamış takım: herkes her şeyi düzenler (eski davranış)
  if not exists (select 1 from takim_rolleri where takim_id = hedef_takim and temel) then return 2; end if;
  select coalesce(max(case yetkiler ->> sekme when 'duzenler' then 2 when 'gorur' then 1 else 0 end), 0)
    into seviye
  from takim_rolleri
  where takim_id = hedef_takim and (temel or id = any (roller));
  return seviye;
end;
$$;

-- Uygulamanın ekranı için: { "yonetici": true/false, "rol_idleri": ["rol-kimliği", ...] }
-- Seviyeleri uygulama, rollerle birlikte js/yetki.js > yetkilerimiHesapla ile hesaplar.
create or replace function yetkilerim(hedef_takim text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'yonetici', takim_yoneticisi_mi(hedef_takim),
    'rol_idleri', coalesce((select to_jsonb(rol_idleri) from takim_uyelikleri
                            where takim_id = hedef_takim and kullanici_id = auth.uid()), '[]'::jsonb)
  );
$$;

-- Yönetim paneli: takımdaki hesaplar (e-posta, yönetici mi, rolleri). Yalnızca yönetici.
create or replace function takim_hesaplari(hedef_takim text)
returns table (kullanici_id uuid, eposta text, yonetici boolean, kurucu boolean, rol_idleri text[])
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not takim_yoneticisi_mi(hedef_takim) then
    raise exception 'YETKI_YOK';
  end if;
  return query
    select u.kullanici_id, coalesce(p.eposta, ''),
           (u.yonetici or t.olusturan_id = u.kullanici_id or coalesce(p.rol, '') = 'yonetici'),
           t.olusturan_id = u.kullanici_id, u.rol_idleri
    from takim_uyelikleri u
    join takimlar t on t.id = u.takim_id
    left join profiller p on p.kullanici_id = u.kullanici_id
    where u.takim_id = hedef_takim
    order by p.eposta;
end;
$$;

-- Yönetim paneli: bir hesabın yöneticiliğini ve rollerini değiştirir. Yalnızca yönetici.
-- Takımda olmayan rol kimlikleri atılır. Kurucunun yöneticiliği kaldırılamaz (zaten kurucu).
create or replace function uyelik_guncelle(hedef_takim text, hedef_kullanici uuid, yeni_yonetici boolean, yeni_roller text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not takim_yoneticisi_mi(hedef_takim) then
    raise exception 'YETKI_YOK';
  end if;
  update takim_uyelikleri
  set yonetici = coalesce(yeni_yonetici, false),
      rol_idleri = coalesce((select array_agg(r.id) from takim_rolleri r
                             where r.takim_id = hedef_takim and not r.temel and r.id = any (coalesce(yeni_roller, '{}'))), '{}')
  where takim_id = hedef_takim and kullanici_id = hedef_kullanici;
end;
$$;

-- Yönetim paneli: bir hesabı takımdan çıkarır. Yalnızca yönetici; kurucu ve kendisi çıkarılamaz.
create or replace function uyeligi_kaldir(hedef_takim text, hedef_kullanici uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not takim_yoneticisi_mi(hedef_takim) then
    raise exception 'YETKI_YOK';
  end if;
  if hedef_kullanici = auth.uid() or exists (select 1 from takimlar where id = hedef_takim and olusturan_id = hedef_kullanici) then
    raise exception 'KURUCU_YA_DA_KENDIN';
  end if;
  delete from takim_uyelikleri where takim_id = hedef_takim and kullanici_id = hedef_kullanici;
end;
$$;

-- ---- Yetkiler (GRANT) ----
revoke all on takim_rolleri from anon;
grant select, insert, update, delete on takim_rolleri to authenticated;
-- Takımda ad ve kurum ayarları değiştirilebilir (kural: yalnızca yönetici, aşağıda)
grant update (ad, ayarlar) on takimlar to authenticated;

revoke all on function takim_yoneticisi_mi(text) from public, anon;
revoke all on function yetki_seviyesi(text, text) from public, anon;
revoke all on function yetkilerim(text) from public, anon;
revoke all on function takim_hesaplari(text) from public, anon;
revoke all on function uyelik_guncelle(text, uuid, boolean, text[]) from public, anon;
revoke all on function uyeligi_kaldir(text, uuid) from public, anon;
grant execute on function takim_yoneticisi_mi(text) to authenticated;
grant execute on function yetki_seviyesi(text, text) to authenticated;
grant execute on function yetkilerim(text) to authenticated;
grant execute on function takim_hesaplari(text) to authenticated;
grant execute on function uyelik_guncelle(text, uuid, boolean, text[]) to authenticated;
grant execute on function uyeligi_kaldir(text, uuid) to authenticated;

-- ---- Satır kuralları (RLS) ----
alter table takim_rolleri enable row level security;

drop policy if exists roller_oku on takim_rolleri;
create policy roller_oku on takim_rolleri for select to authenticated
  using (uye_mi(takim_id));
drop policy if exists roller_yonet on takim_rolleri;
create policy roller_yonet on takim_rolleri for all to authenticated
  using (takim_yoneticisi_mi(takim_id)) with check (takim_yoneticisi_mi(takim_id));

-- Takım: adı ve ayarları yalnızca yönetici değiştirir, takımı yalnızca yönetici siler
drop policy if exists takim_guncelle on takimlar;
create policy takim_guncelle on takimlar for update to authenticated
  using (takim_yoneticisi_mi(id)) with check (takim_yoneticisi_mi(id));
drop policy if exists takim_sil on takimlar;
create policy takim_sil on takimlar for delete to authenticated
  using (takim_yoneticisi_mi(id));

-- Takıma bağlı tablolar: okumak için en az "görür", yazmak için "düzenler".
-- Eşleme (tablo, sekme) js/yetki.js > TABLO_SEKMESI ile aynıdır (testli).
-- İstisna: üye listesini (uyeler) takımın her üyesi okur; görevlerde sorumlu adı gerekir.
do $$
declare
  esleme record;
begin
  for esleme in
    select * from (values
      ('uyeler', 'takim'), ('gorevler', 'gorevler'), ('son_tarihler', 'tarihler'), ('toplantilar', 'toplantilar'),
      ('etkinlikler', 'etkinlikler'), ('tutanaklar', 'tutanaklar'), ('kisiler', 'kisiler'),
      ('sablonlar', 'mesajlar'), ('kampanyalar', 'mesajlar')
    ) as v (tablo, sekme)
  loop
    execute format('drop policy if exists %I on %I', esleme.tablo || '_takim_uyesi', esleme.tablo);
    execute format('drop policy if exists %I on %I', esleme.tablo || '_oku', esleme.tablo);
    execute format('drop policy if exists %I on %I', esleme.tablo || '_ekle', esleme.tablo);
    execute format('drop policy if exists %I on %I', esleme.tablo || '_guncelle', esleme.tablo);
    execute format('drop policy if exists %I on %I', esleme.tablo || '_sil', esleme.tablo);
    if esleme.tablo = 'uyeler' then
      execute format('create policy %I on %I for select to authenticated using (uye_mi(takim_id))',
        esleme.tablo || '_oku', esleme.tablo);
    else
      execute format('create policy %I on %I for select to authenticated using (yetki_seviyesi(takim_id, %L) >= 1)',
        esleme.tablo || '_oku', esleme.tablo, esleme.sekme);
    end if;
    execute format('create policy %I on %I for insert to authenticated with check (yetki_seviyesi(takim_id, %L) >= 2)',
      esleme.tablo || '_ekle', esleme.tablo, esleme.sekme);
    execute format('create policy %I on %I for update to authenticated using (yetki_seviyesi(takim_id, %L) >= 2) with check (yetki_seviyesi(takim_id, %L) >= 2)',
      esleme.tablo || '_guncelle', esleme.tablo, esleme.sekme, esleme.sekme);
    execute format('create policy %I on %I for delete to authenticated using (yetki_seviyesi(takim_id, %L) >= 2)',
      esleme.tablo || '_sil', esleme.tablo, esleme.sekme);
  end loop;
end
$$;
-- ROLLER-BLOGU-SONU


-- ---------------------------------------------------------------------------
-- 9) SPONSORLAR / MÜŞTERİLER
-- ---------------------------------------------------------------------------
-- Var olan bir projede tek başına çalıştırmak için: supabase/guncelleme-paydaslar.sql
-- (Aşağısı o dosyayla AYNIDIR; testler/guvenlik.test.js denetler.)
-- PAYDASLAR-BLOGU-BASI
-- ---- Tablo ----
create table if not exists paydaslar (
  id            text primary key,
  takim_id      text not null references takimlar (id) on delete cascade,
  ad            text not null check (char_length(ad) between 1 and 200),   -- kurum / firma adı
  ilgili        text not null default '',                                   -- görüşülen kişi
  iletisim      text not null default '',                                   -- e-posta ya da telefon (isteğe bağlı)
  asama         text not null default 'aday' check (asama in ('aday', 'iletisimde', 'gorusme', 'anlasildi', 'olmadi')),
  tutar         bigint not null default 0 check (tutar between 0 and 1000000000),
  sonraki_adim  text not null default '',
  sonraki_tarih text not null default '',
  notlar        text not null default '',
  olusturma     timestamptz not null default now(),
  surum         integer not null default 1
);
create index if not exists paydaslar_takim on paydaslar (takim_id);

drop trigger if exists surum_artir on paydaslar;
create trigger surum_artir before update on paydaslar for each row execute function surum_artir();

-- ---- Yetkiler ----
revoke all on paydaslar from anon;
grant select, insert, update, delete on paydaslar to authenticated;
alter table paydaslar enable row level security;

drop policy if exists paydaslar_oku on paydaslar;
create policy paydaslar_oku on paydaslar for select to authenticated
  using (yetki_seviyesi(takim_id, 'paydaslar') >= 1);
drop policy if exists paydaslar_ekle on paydaslar;
create policy paydaslar_ekle on paydaslar for insert to authenticated
  with check (yetki_seviyesi(takim_id, 'paydaslar') >= 2);
drop policy if exists paydaslar_guncelle on paydaslar;
create policy paydaslar_guncelle on paydaslar for update to authenticated
  using (yetki_seviyesi(takim_id, 'paydaslar') >= 2) with check (yetki_seviyesi(takim_id, 'paydaslar') >= 2);
drop policy if exists paydaslar_sil on paydaslar;
create policy paydaslar_sil on paydaslar for delete to authenticated
  using (yetki_seviyesi(takim_id, 'paydaslar') >= 2);
-- PAYDASLAR-BLOGU-SONU


-- ---------------------------------------------------------------------------
-- 10) BÜTÇE
-- ---------------------------------------------------------------------------
-- Var olan bir projede tek başına çalıştırmak için: supabase/guncelleme-butce.sql
-- (Aşağısı o dosyayla AYNIDIR; testler/guvenlik.test.js denetler.)
-- BUTCE-BLOGU-BASI
-- ---- Tablo ----
create table if not exists butce_kalemleri (
  id         text primary key,
  takim_id   text not null references takimlar (id) on delete cascade,
  tur        text not null default 'gider' check (tur in ('gelir', 'gider')),
  baslik     text not null check (char_length(baslik) between 1 and 200),
  tutar      bigint not null default 0 check (tutar between 0 and 1000000000),
  kategori   text not null default 'Diğer' check (char_length(kategori) <= 60),
  tarih      text not null default '',
  odeyen     text not null default '',   -- kim ödedi / fiş kimde (isteğe bağlı)
  aciklama   text not null default '',
  paydas_id  text not null default '',
  olusturma  timestamptz not null default now(),
  surum      integer not null default 1
);
create index if not exists butce_kalemleri_takim on butce_kalemleri (takim_id);

drop trigger if exists surum_artir on butce_kalemleri;
create trigger surum_artir before update on butce_kalemleri for each row execute function surum_artir();

-- ---- Yetkiler ----
revoke all on butce_kalemleri from anon;
grant select, insert, update, delete on butce_kalemleri to authenticated;
alter table butce_kalemleri enable row level security;

drop policy if exists butce_kalemleri_oku on butce_kalemleri;
create policy butce_kalemleri_oku on butce_kalemleri for select to authenticated
  using (yetki_seviyesi(takim_id, 'butce') >= 1);
drop policy if exists butce_kalemleri_ekle on butce_kalemleri;
create policy butce_kalemleri_ekle on butce_kalemleri for insert to authenticated
  with check (yetki_seviyesi(takim_id, 'butce') >= 2);
drop policy if exists butce_kalemleri_guncelle on butce_kalemleri;
create policy butce_kalemleri_guncelle on butce_kalemleri for update to authenticated
  using (yetki_seviyesi(takim_id, 'butce') >= 2) with check (yetki_seviyesi(takim_id, 'butce') >= 2);
drop policy if exists butce_kalemleri_sil on butce_kalemleri;
create policy butce_kalemleri_sil on butce_kalemleri for delete to authenticated
  using (yetki_seviyesi(takim_id, 'butce') >= 2);
-- BUTCE-BLOGU-SONU


-- ---------------------------------------------------------------------------
-- 11) MALZEME / ENVANTER
-- ---------------------------------------------------------------------------
-- Var olan bir projede tek başına çalıştırmak için: supabase/guncelleme-malzeme.sql
-- (Aşağısı o dosyayla AYNIDIR; testler/guvenlik.test.js denetler.)
-- MALZEME-BLOGU-BASI
-- ---- Tablo ----
create table if not exists malzemeler (
  id             text primary key,
  takim_id       text not null references takimlar (id) on delete cascade,
  ad             text not null check (char_length(ad) between 1 and 200),
  adet           integer not null default 1 check (adet between 0 and 100000),
  birim_fiyat    bigint not null default 0 check (birim_fiyat between 0 and 1000000000),
  durum          text not null default 'lazim' check (durum in ('lazim', 'siparis', 'yolda', 'geldi', 'kullanimda', 'arizali')),
  tedarikci      text not null default '',
  sorumlu_id     text not null default '',   -- kimde (uyeler.id) ya da boş
  konum          text not null default '',   -- nerede duruyor
  siparis_tarihi text not null default '',
  beklenen_tarih text not null default '',
  aciklama       text not null default '',
  olusturma      timestamptz not null default now(),
  surum          integer not null default 1
);
create index if not exists malzemeler_takim on malzemeler (takim_id);

drop trigger if exists surum_artir on malzemeler;
create trigger surum_artir before update on malzemeler for each row execute function surum_artir();

alter table butce_kalemleri add column if not exists malzeme_id text not null default '';

-- ---- Yetkiler ----
revoke all on malzemeler from anon;
grant select, insert, update, delete on malzemeler to authenticated;
alter table malzemeler enable row level security;

drop policy if exists malzemeler_oku on malzemeler;
create policy malzemeler_oku on malzemeler for select to authenticated
  using (yetki_seviyesi(takim_id, 'malzemeler') >= 1);
drop policy if exists malzemeler_ekle on malzemeler;
create policy malzemeler_ekle on malzemeler for insert to authenticated
  with check (yetki_seviyesi(takim_id, 'malzemeler') >= 2);
drop policy if exists malzemeler_guncelle on malzemeler;
create policy malzemeler_guncelle on malzemeler for update to authenticated
  using (yetki_seviyesi(takim_id, 'malzemeler') >= 2) with check (yetki_seviyesi(takim_id, 'malzemeler') >= 2);
drop policy if exists malzemeler_sil on malzemeler;
create policy malzemeler_sil on malzemeler for delete to authenticated
  using (yetki_seviyesi(takim_id, 'malzemeler') >= 2);
-- MALZEME-BLOGU-SONU


-- ---------------------------------------------------------------------------
-- 12) PROJELER
-- ---------------------------------------------------------------------------
-- Var olan bir projede tek başına çalıştırmak için: supabase/guncelleme-projeler.sql
-- (Aşağısı o dosyayla AYNIDIR; testler/guvenlik.test.js denetler.)
-- PROJELER-BLOGU-BASI
-- ---- Tablo ----
create table if not exists projeler (
  id         text primary key,
  takim_id   text not null references takimlar (id) on delete cascade,
  ad         text not null check (char_length(ad) between 1 and 200),
  paydas_id  text not null default '',   -- müşteri / sponsor (paydaslar.id) ya da boş
  durum      text not null default 'planlama' check (durum in ('planlama', 'devam', 'beklemede', 'tamamlandi', 'iptal')),
  baslangic  text not null default '',
  bitis      text not null default '',   -- teslim tarihi
  aciklama   text not null default '',
  olusturma  timestamptz not null default now(),
  surum      integer not null default 1
);
create index if not exists projeler_takim on projeler (takim_id);

drop trigger if exists surum_artir on projeler;
create trigger surum_artir before update on projeler for each row execute function surum_artir();

alter table gorevler add column if not exists proje_id text not null default '';

-- ---- Yetkiler ----
revoke all on projeler from anon;
grant select, insert, update, delete on projeler to authenticated;
alter table projeler enable row level security;

drop policy if exists projeler_oku on projeler;
create policy projeler_oku on projeler for select to authenticated
  using (yetki_seviyesi(takim_id, 'projeler') >= 1);
drop policy if exists projeler_ekle on projeler;
create policy projeler_ekle on projeler for insert to authenticated
  with check (yetki_seviyesi(takim_id, 'projeler') >= 2);
drop policy if exists projeler_guncelle on projeler;
create policy projeler_guncelle on projeler for update to authenticated
  using (yetki_seviyesi(takim_id, 'projeler') >= 2) with check (yetki_seviyesi(takim_id, 'projeler') >= 2);
drop policy if exists projeler_sil on projeler;
create policy projeler_sil on projeler for delete to authenticated
  using (yetki_seviyesi(takim_id, 'projeler') >= 2);
-- PROJELER-BLOGU-SONU
