-- ============================================================================
-- Seyir — veritabanı güncellemesi: Sponsorlar / Müşteriler (paydaslar tablosu)
-- ============================================================================
-- Ne zaman gerekir? schema.sql'i bu özellik eklenmeden ÖNCE çalıştırdıysan.
-- (Yeni kurulumda gerekmez: schema.sql bu bloğu aynen içerir, 9. bölüm; testli.)
-- ÖNCE guncelleme-roller.sql çalıştırılmış olmalı (yetki_seviyesi fonksiyonu).
-- Kullanım: Supabase paneli > SQL Editor > New query > bu dosyayı yapıştır > Run.
-- Tekrar çalıştırılabilir; veri silmez.
-- Kurallar: okumak için "Sponsorlar" sekmesinde en az görür, yazmak için düzenler
-- (yönetici ve roller kurulmamış takımda herkes düzenler). Uygulamada js/paydas.js.
-- ============================================================================

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
