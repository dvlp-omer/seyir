-- ============================================================================
-- Seyir — veritabanı güncellemesi: roller ve yetkiler
-- ============================================================================
-- Ne zaman gerekir? schema.sql'i bu özellik eklenmeden ÖNCE çalıştırdıysan.
-- (Yeni kurulumda gerekmez: schema.sql bu bloğu aynen içerir, 8. bölüm; testli.)
-- Kullanım: Supabase paneli > SQL Editor > New query > bu dosyayı yapıştır > Run.
-- Tekrar çalıştırılabilir; veri silmez.
--
-- NE DEĞİŞİR?
--   * Her takımın rolleri olur (takim_rolleri). Her rol, her sekme için bir
--     seviye taşır: gizli / gorur / duzenler. "temel" rol herkesindir (Üye);
--     kişiye atanan roller (takim_uyelikleri.rol_idleri) üstüne eklenir; en
--     geniş yetki geçerlidir.
--   * Takım yöneticisi her şeyi düzenler: takımı kuran hesap, kurulum
--     yöneticisi (profiller.rol = 'yonetici') ve yönetici yapılan hesaplar.
--   * Takımın rolleri HENÜZ KURULMADIYSA (temel rol yoksa) herkes eskisi gibi
--     her şeyi düzenler. Yani bu dosya çalıştırılınca kimsenin yetkisi
--     değişmez; yönetici uygulamada rolleri kurunca değişir.
--   * Takım adı ve kurum ayarlarını yalnızca yönetici değiştirir, takımı
--     yalnızca yönetici siler.
-- Kurallar uygulamada js/yetki.js ile aynıdır (testli). Tasarım:
-- docs/superpowers/specs/2026-11-24-kurum-ozellestirme-design.md
-- ============================================================================

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

-- Uygulamanın ekranı için: { "yonetici": true/false, "uyelik": { "yonetici": .., "rol_idleri": [..] } }
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
