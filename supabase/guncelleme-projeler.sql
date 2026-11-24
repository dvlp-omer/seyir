-- ============================================================================
-- Seyir — veritabanı güncellemesi: Projeler (projeler tablosu, görevlerde proje_id)
-- ============================================================================
-- Ne zaman gerekir? schema.sql'i bu özellik eklenmeden ÖNCE çalıştırdıysan.
-- (Yeni kurulumda gerekmez: schema.sql bu bloğu aynen içerir, 12. bölüm; testli.)
-- ÖNCE guncelleme-roller.sql çalıştırılmış olmalı (yetki_seviyesi fonksiyonu).
-- Kullanım: Supabase paneli > SQL Editor > New query > bu dosyayı yapıştır > Run.
-- Tekrar çalıştırılabilir; veri silmez.
-- Kurallar: okumak için "Projeler" sekmesinde en az görür, yazmak için düzenler.
-- Görevin hangi projeye ait olduğu görevin kendisinde (gorevler.proje_id) durur;
-- onu değiştirmek görev yetkisiyle olur. İlerleme biten görevlerden hesaplanır (js/proje.js).
-- ============================================================================

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
