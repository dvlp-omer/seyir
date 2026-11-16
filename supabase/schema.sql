-- ============================================================================
-- Takım Asistanı — Supabase şeması (tablolar + satır düzeyinde güvenlik)
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
--   Uygulama tablolarında yalnızca ad ve rol vardır. Giriş için kullanılan
--   e-posta Supabase'in kendi auth.users tablosunda durur; bu şemaya girmez.
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

-- Listeler hep "takim_id'ye göre" çekilir; bu dizinler o sorguları hızlandırır.
create index if not exists uyeler_takim       on uyeler (takim_id);
create index if not exists gorevler_takim     on gorevler (takim_id);
create index if not exists son_tarihler_takim on son_tarihler (takim_id);
create index if not exists toplantilar_takim  on toplantilar (takim_id);
create index if not exists etkinlikler_takim  on etkinlikler (takim_id);
create index if not exists tutanaklar_takim   on tutanaklar (takim_id);
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

revoke all on takimlar, takim_uyelikleri, uyeler, gorevler, son_tarihler, toplantilar, etkinlikler, tutanaklar from anon;

grant select, insert, update, delete on uyeler, gorevler, son_tarihler, toplantilar, etkinlikler, tutanaklar to authenticated;

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

drop policy if exists takim_guncelle on takimlar;
create policy takim_guncelle on takimlar for update to authenticated
  using (uye_mi(id)) with check (uye_mi(id));

drop policy if exists takim_sil on takimlar;
create policy takim_sil on takimlar for delete to authenticated
  using (uye_mi(id));

-- ---- takim_uyelikleri ----
drop policy if exists uyelik_oku on takim_uyelikleri;
create policy uyelik_oku on takim_uyelikleri for select to authenticated
  using (kullanici_id = auth.uid());

drop policy if exists uyelik_ayril on takim_uyelikleri;
create policy uyelik_ayril on takim_uyelikleri for delete to authenticated
  using (kullanici_id = auth.uid());

-- ---- takıma bağlı tablolar: hepsinde aynı kural ----
-- "Satırın takımı, üyesi olduğum bir takım olmalı" — hem okurken hem yazarken.
-- with check sayesinde kimse başka takımın kimliğiyle satır ekleyemez ya da
-- bir satırı başka takıma taşıyamaz.
drop policy if exists uyeler_takim_uyesi on uyeler;
create policy uyeler_takim_uyesi on uyeler for all to authenticated
  using (uye_mi(takim_id)) with check (uye_mi(takim_id));

drop policy if exists gorevler_takim_uyesi on gorevler;
create policy gorevler_takim_uyesi on gorevler for all to authenticated
  using (uye_mi(takim_id)) with check (uye_mi(takim_id));

drop policy if exists son_tarihler_takim_uyesi on son_tarihler;
create policy son_tarihler_takim_uyesi on son_tarihler for all to authenticated
  using (uye_mi(takim_id)) with check (uye_mi(takim_id));

drop policy if exists toplantilar_takim_uyesi on toplantilar;
create policy toplantilar_takim_uyesi on toplantilar for all to authenticated
  using (uye_mi(takim_id)) with check (uye_mi(takim_id));

drop policy if exists etkinlikler_takim_uyesi on etkinlikler;
create policy etkinlikler_takim_uyesi on etkinlikler for all to authenticated
  using (uye_mi(takim_id)) with check (uye_mi(takim_id));

drop policy if exists tutanaklar_takim_uyesi on tutanaklar;
create policy tutanaklar_takim_uyesi on tutanaklar for all to authenticated
  using (uye_mi(takim_id)) with check (uye_mi(takim_id));


-- ---------------------------------------------------------------------------
-- 5) BİLİNEN SINIRLAR (bilerek basit bırakıldı)
-- ---------------------------------------------------------------------------
-- * Takımın her üyesi o takımda her şeyi yapabilir (silme dahil). "Kaptan"
--   rolü yalnızca kadroda görünen bir etikettir, veritabanında yetki değildir.
-- * Davet kodu değiştirilemez. Kod sızarsa: yeni takım oluşturup veriyi
--   yedekten oraya taşımak gerekir.
-- * Kuralların doğruluğunu sınamak için: SUPABASE_KURULUM.md > "Güvenliği dene".
