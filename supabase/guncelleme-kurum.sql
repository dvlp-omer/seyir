-- ============================================================================
-- Seyir — veritabanı güncellemesi: kurum ayarları (tür, logo, renk, tutanak, sekmeler)
-- ============================================================================
-- Ne zaman gerekir? schema.sql'i bu özellik eklenmeden ÖNCE çalıştırdıysan.
-- (Yeni kurulumda gerekmez: schema.sql bunu zaten içerir.)
-- Kullanım: Supabase paneli > SQL Editor > New query > bu dosyayı yapıştır > Run.
-- Tekrar çalıştırılabilir; veri silmez. Var olan takımların ayarı boş ({}) başlar,
-- uygulama boş ayarı varsayılanlarla doldurur (js/kurum.js > kurumAyarlari).
-- Bu dosya çalıştırılmadan Ayarlar > Kurum bölümünde kaydetme hata verir;
-- uygulamanın geri kalanı çalışmaya devam eder.
-- Açıklama: schema.sql > takimlar tablosu, docs/superpowers/specs/2026-11-24-kurum-ozellestirme-design.md
-- ============================================================================

alter table takimlar add column if not exists ayarlar jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'takimlar_ayarlar_check') then
    alter table takimlar add constraint takimlar_ayarlar_check
      check (jsonb_typeof(ayarlar) = 'object' and pg_column_size(ayarlar) < 150000);
  end if;
end
$$;
