-- ============================================================================
-- Seyir — veritabanı güncellemesi: aynı anda düzenleme uyarısı (sürüm numarası)
-- ============================================================================
-- Ne zaman gerekir? schema.sql'i bu özellik eklenmeden ÖNCE çalıştırdıysan.
-- (Yeni kurulumda gerekmez: schema.sql bunu zaten içerir.)
-- Kullanım: Supabase paneli > SQL Editor > New query > bu dosyayı yapıştır > Run.
-- Tekrar çalıştırılabilir; veri silmez. Var olan satırlar sürüm 1'den başlar.
-- Bu dosya çalıştırılmasa da uygulama çalışır, yalnızca çakışma uyarısı çıkmaz.
-- Açıklama: schema.sql > bölüm 6.
-- ============================================================================

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
