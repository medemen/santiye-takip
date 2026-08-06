-- ============================================================
-- DEMO: Saha personeli atamaları + %80 şantiye ilerlemesi
-- Kaynak: santiye_config (durumTespit satirlari) + scale 2.38
-- İdempotent degildir: calistirmadan once demo verisi silinmelidir
-- (asagidaki TEMIZLIK bolumune bakin).
-- Id'ler 'demo-' / 'demo-b-' prefixi tasir -> tek sorguyla silinir.
-- ============================================================

-- ------------------------------------------------------------
-- 0) TEMIZLIK (gerekirse demo verisini kaldirir)
--    DELETE FROM raporlar WHERE id LIKE 'demo-%';
--    DELETE FROM kullanici_ada_atamalari;
--    DELETE FROM kullanici_blok_atamalari;
--    UPDATE kullanicilar SET atanan_ada = NULL, yetkili_adalar = '{}'::text[]
--    WHERE id IN (SELECT user_id FROM kullanici_ada_atamalari);
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 1) ATAMALAR: 32 saha personelini 6 adaya dagit (blok orantili)
--    ADA-1:13 blok/4 kisi, ADA-2:18/5, ADA-3:20/5, ADA-4:31/6,
--    ADA-5:33/7, ADA-6:21/5  (toplam 32)
-- ------------------------------------------------------------
WITH ataplan AS (
  SELECT * FROM (VALUES ('ADA-1',13,4),('ADA-2',18,5),('ADA-3',20,5),('ADA-4',31,6),('ADA-5',33,7),('ADA-6',21,5)) AS v(ada, blok_sayisi, kisi)
), kum AS (
  SELECT ada, blok_sayisi, kisi,
         COALESCE(SUM(kisi) OVER (ORDER BY ada ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS bas,
         SUM(kisi) OVER (ORDER BY ada) AS son
  FROM ataplan
), saha AS (
  SELECT id, ad_soyad, row_number() OVER (ORDER BY ad_soyad) - 1 AS rn
  FROM kullanicilar
  WHERE NOT admin AND NOT proje_muduru
)
INSERT INTO kullanici_ada_atamalari (ad_soyad, ada, user_id, updated_at)
SELECT sa.ad_soyad, k.ada, sa.id, now()
FROM kum k
JOIN saha sa ON sa.rn >= k.bas AND sa.rn < k.son
ON CONFLICT (ad_soyad) DO UPDATE SET ada = EXCLUDED.ada, user_id = EXCLUDED.user_id, updated_at = now();

-- Blok araliklari (sorumlu bloklar)
WITH ataplan AS (
  SELECT * FROM (VALUES ('ADA-1',13,4),('ADA-2',18,5),('ADA-3',20,5),('ADA-4',31,6),('ADA-5',33,7),('ADA-6',21,5)) AS v(ada, blok_sayisi, kisi)
), kum AS (
  SELECT ada, blok_sayisi, kisi,
         COALESCE(SUM(kisi) OVER (ORDER BY ada ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS bas
  FROM ataplan
), saha AS (
  SELECT id, ad_soyad, row_number() OVER (ORDER BY ad_soyad) - 1 AS rn
  FROM kullanicilar
  WHERE NOT admin AND NOT proje_muduru
)
INSERT INTO kullanici_blok_atamalari (ad_soyad, ada, blok_nos, user_id, updated_at)
SELECT sa.ad_soyad, k.ada,
       ARRAY(SELECT g::int FROM generate_series(
         floor((sa.rn - k.bas)::numeric * k.blok_sayisi / k.kisi)::int + 1,
         floor(((sa.rn - k.bas + 1)::numeric) * k.blok_sayisi / k.kisi)::int
       ) g) AS blok_nos,
       sa.id, now()
FROM kum k
JOIN saha sa ON sa.rn >= k.bas AND sa.rn < k.bas + k.kisi
ON CONFLICT (ad_soyad, ada) DO UPDATE SET blok_nos = EXCLUDED.blok_nos, user_id = EXCLUDED.user_id, updated_at = now();

-- kullanicilar.atanan_ada + yetkili_adalar
UPDATE kullanicilar k
SET atanan_ada = a.ada,
    yetkili_adalar = ARRAY(SELECT DISTINCT x FROM unnest(k.yetkili_adalar || ARRAY[a.ada]) AS x ORDER BY x)
FROM kullanici_ada_atamalari a
WHERE a.user_id = k.id;

-- ------------------------------------------------------------
-- 2) RAPORLAR: ada geneli (blok_no=0) 1080 rapor
--    yuzde = durumTespit satiri (yoksa sablon varsayilani 70) * 2.38, clamp 100
--    raporlayan = adanin atanmis personeline round-robin
--    durum: >=100 tamamlandi, <=5 planlandi, ALTYAPI/PEYZAJ gecikme, diger devam
-- ------------------------------------------------------------
WITH kalemler AS (
  SELECT DISTINCT k AS kalem, g->>'ad' AS grup
  FROM santiye_config, jsonb_array_elements(config->'isKalemleri'->'gruplar') g, jsonb_array_elements_text(g->'kalemler') k
),
dt AS (
  SELECT s->>1 AS kalem, i AS ada_idx, (s->3->i->>0)::numeric AS yuzde
  FROM santiye_config, jsonb_array_elements(config->'durumTespit'->'satirlar') s, generate_series(0,5) i
),
adalar AS (
  SELECT ada, row_number() OVER () - 1 AS ada_idx
  FROM (VALUES ('ADA-1'),('ADA-2'),('ADA-3'),('ADA-4'),('ADA-5'),('ADA-6')) v(ada)
),
kart AS (
  SELECT k.kalem, k.grup, a.ada, COALESCE(d.yuzde, 70) AS y
  FROM kalemler k
  CROSS JOIN adalar a
  LEFT JOIN dt d ON d.kalem = k.kalem AND d.ada_idx = a.ada_idx
),
hesap AS (
  SELECT kalem, grup, ada, LEAST(100, ROUND(y * 2.38)) AS ilerleme
  FROM kart
),
durumlu AS (
  SELECT h.*,
         CASE
           WHEN h.ilerleme >= 100 THEN 'tamamlandi'
           WHEN h.ilerleme <= 5 THEN 'planlandi'
           WHEN h.grup IN ('ALTYAPI','PEYZAJ & ÇEVRE DÜZENLEME') THEN 'gecikme'
           ELSE 'devam_ediyor'
         END AS durum
  FROM hesap h
),
personel AS (
  SELECT ada, ad_soyad, user_id,
         row_number() OVER (PARTITION BY ada ORDER BY ad_soyad) - 1 AS pidx,
         count(*) OVER (PARTITION BY ada) AS pcount
  FROM kullanici_ada_atamalari
),
sirali AS (
  SELECT d.*, (row_number() OVER (PARTITION BY d.ada ORDER BY d.kalem) - 1) % p.pcount AS kidx
  FROM durumlu d
  JOIN (SELECT DISTINCT ada, pcount FROM personel) p ON p.ada = d.ada
),
son AS (
  SELECT s.*, pe.ad_soyad AS raporlayan, pe.user_id,
         (row_number() OVER (PARTITION BY s.ada, s.durum ORDER BY s.kalem) - 1) AS dran
  FROM sirali s
  JOIN personel pe ON pe.ada = s.ada AND pe.pidx = s.kidx
)
INSERT INTO raporlar (id, tarih, raporlayan, ada, blok_no, is_kalemi, durum, ilerleme_yuzde, aciklama, user_id, olusturma_tarihi)
SELECT
  'demo-' || ada || '|' || kalem AS id,
  (date '2026-07-26' + (CASE durum WHEN 'tamamlandi' THEN dran % 9 WHEN 'planlandi' THEN 11 ELSE 8 + dran % 3 END)::int) AS tarih,
  raporlayan,
  ada,
  0 AS blok_no,
  kalem AS is_kalemi,
  durum,
  ilerleme AS ilerleme_yuzde,
  CASE durum
    WHEN 'tamamlandi' THEN 'İmalat tamamlandı, kontrollere hazır.'
    WHEN 'planlandi' THEN 'İmalat planlandı, sahaya giriş bekleniyor.'
    WHEN 'gecikme' THEN 'Bağımlılık gecikmesi — ilerleme beklenenin altında.'
    ELSE 'Günlük saha takibi: imalat devam ediyor.'
  END AS aciklama,
  user_id,
  ((date '2026-07-26' + (CASE durum WHEN 'tamamlandi' THEN dran % 9 WHEN 'planlandi' THEN 11 ELSE 8 + dran % 3 END)::int) + time '08:00' + make_interval(mins => (dran % 480)::int)) AS olusturma_tarihi
FROM son;

-- ------------------------------------------------------------
-- 3) GECIKME: her adada 'İstinat Duvarı' gecikme (gercekci dagilim)
-- ------------------------------------------------------------
UPDATE raporlar r
SET durum = 'gecikme',
    ilerleme_yuzde = v.p,
    aciklama = 'Bağımlılık gecikmesi — istinat duvarı imalatı planın gerisinde.'
FROM (VALUES ('ADA-1',65),('ADA-2',70),('ADA-3',60),('ADA-4',70),('ADA-5',55),('ADA-6',65)) AS v(ada, p)
WHERE r.id LIKE 'demo-%' AND r.blok_no = 0 AND r.is_kalemi = 'İstinat Duvarı' AND r.ada = v.ada;

-- ------------------------------------------------------------
-- 4) BLOK BAZLI: blok 1-3'te beton grubu tamamlandi (54 rapor)
-- ------------------------------------------------------------
WITH adalar AS (SELECT ada FROM (VALUES ('ADA-1'),('ADA-2'),('ADA-3'),('ADA-4'),('ADA-5'),('ADA-6')) v(ada)),
bloklar AS (SELECT a.ada, g AS blok_no FROM adalar a, generate_series(1,3) g),
kalemler AS (VALUES ('Beton Dökümü'),('Betonarme Kalıp'),('Betonarme Demir')),
kayit AS (
  SELECT b.ada, b.blok_no, k.column1 AS is_kalemi, a.ad_soyad AS raporlayan, a.user_id
  FROM bloklar b
  CROSS JOIN kalemler k
  JOIN kullanici_blok_atamalari a ON a.ada = b.ada AND a.blok_nos @> ARRAY[b.blok_no]::int[]
)
INSERT INTO raporlar (id, tarih, raporlayan, ada, blok_no, is_kalemi, durum, ilerleme_yuzde, aciklama, user_id, olusturma_tarihi)
SELECT 'demo-b-' || ada || '|' || blok_no || '|' || is_kalemi,
       date '2026-08-05',
       raporlayan, ada, blok_no, is_kalemi, 'tamamlandi', 100,
       'İmalat tamamlandı — blok bazlı kontrol.',
       user_id,
       (date '2026-08-05' + time '09:00' + make_interval(mins => (blok_no * 60 + (row_number() OVER (ORDER BY ada, blok_no) % 30))::int)) AS olusturma_tarihi
FROM kayit;
