-- Takım Asistanı — Supabase tabloları
-- Supabase panelinde: SQL Editor > New query > bu dosyayı yapıştır > Run
--
-- Sütun adları uygulamadaki alan adlarıyla birebir aynıdır; bu yüzden
-- js/veri.js içinde ad çevirisi yapmaya gerek kalmaz.
--
-- Notlar:
--  * id'leri uygulama üretir (crypto.randomUUID), o yüzden tür "text".
--  * Tarihler "YYYY-AA-GG" metni olarak tutulur; boş bırakılabilen alanlarda
--    "" değeri sorun çıkarmaz ve metin sırası tarih sırasıyla aynıdır.
--  * Listeler (gündem, kararlar, katılımcılar) jsonb sütunlarında saklanır.

create table if not exists takimlar (
  id         text primary key,
  ad         text not null,
  olusturma  timestamptz not null default now()
);

create table if not exists uyeler (
  id         text primary key,
  takim_id   text not null references takimlar (id) on delete cascade,
  ad         text not null,
  rol        text not null default 'uye' check (rol in ('kaptan', 'uye')),
  olusturma  timestamptz not null default now()
);

create table if not exists gorevler (
  id            text primary key,
  takim_id      text not null references takimlar (id) on delete cascade,
  baslik        text not null,
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
  baslik      text not null,
  tur         text not null default 'diger',
  tarih       text not null,
  aciklama    text not null default '',
  tamamlandi  boolean not null default false,
  olusturma   timestamptz not null default now()
);

create table if not exists toplantilar (
  id               text primary key,
  takim_id         text not null references takimlar (id) on delete cascade,
  baslik           text not null,
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

create index if not exists uyeler_takim on uyeler (takim_id);
create index if not exists gorevler_takim on gorevler (takim_id);
create index if not exists son_tarihler_takim on son_tarihler (takim_id);
create index if not exists toplantilar_takim on toplantilar (takim_id);

-- ---------------------------------------------------------------------------
-- ERİŞİM KURALLARI (Row Level Security)
--
-- !!! DİKKAT: v1'de giriş (kullanıcı hesabı) YOK. Aşağıdaki kurallar, anon
-- anahtarına sahip HERKESE okuma ve yazma izni verir. Yani site adresini
-- bilen biri bütün veriyi görebilir ve değiştirebilir.
-- Küçük, kapalı bir ekip ve "sadece ad + rol" verisi için kabul edilebilir;
-- herkese açık bir yayın için DEĞİL. Kalıcı çözüm: Supabase Auth ile giriş
-- ekleyip kuralları "sadece kendi takımının üyesi" şeklinde daraltmak (v2).
-- ---------------------------------------------------------------------------
alter table takimlar     enable row level security;
alter table uyeler       enable row level security;
alter table gorevler     enable row level security;
alter table son_tarihler enable row level security;
alter table toplantilar  enable row level security;

create policy "v1: herkese acik" on takimlar     for all to anon using (true) with check (true);
create policy "v1: herkese acik" on uyeler       for all to anon using (true) with check (true);
create policy "v1: herkese acik" on gorevler     for all to anon using (true) with check (true);
create policy "v1: herkese acik" on son_tarihler for all to anon using (true) with check (true);
create policy "v1: herkese acik" on toplantilar  for all to anon using (true) with check (true);
