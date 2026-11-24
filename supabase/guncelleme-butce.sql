-- ============================================================================
-- Seyir — veritabanı güncellemesi: Bütçe (butce_kalemleri tablosu)
-- ============================================================================
-- Ne zaman gerekir? schema.sql'i bu özellik eklenmeden ÖNCE çalıştırdıysan.
-- (Yeni kurulumda gerekmez: schema.sql bu bloğu aynen içerir, 10. bölüm; testli.)
-- ÖNCE guncelleme-roller.sql çalıştırılmış olmalı (yetki_seviyesi fonksiyonu).
-- Kullanım: Supabase paneli > SQL Editor > New query > bu dosyayı yapıştır > Run.
-- Tekrar çalıştırılabilir; veri silmez.
-- Kurallar: okumak için "Bütçe" sekmesinde en az görür, yazmak için düzenler.
-- Uygulamada js/butce.js. paydas_id: kalem bir sponsordan geldiyse onun kimliği.
-- ============================================================================

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
