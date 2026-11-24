-- ============================================================================
-- Seyir — veritabanı güncellemesi: Malzeme / Envanter (malzemeler tablosu)
-- ============================================================================
-- Ne zaman gerekir? schema.sql'i bu özellik eklenmeden ÖNCE çalıştırdıysan.
-- (Yeni kurulumda gerekmez: schema.sql bu bloğu aynen içerir, 11. bölüm; testli.)
-- ÖNCE guncelleme-roller.sql ve guncelleme-butce.sql çalıştırılmış olmalı.
-- Kullanım: Supabase paneli > SQL Editor > New query > bu dosyayı yapıştır > Run.
-- Tekrar çalıştırılabilir; veri silmez.
-- Kurallar: okumak için "Malzeme" sekmesinde en az görür, yazmak için düzenler.
-- Uygulamada js/malzeme.js. Bütçe kalemine malzeme_id eklenir: alınan malzeme
-- bütçeye gider olarak eklenince hangi malzemeden geldiği bilinsin (iki kez eklenmesin).
-- ============================================================================

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
