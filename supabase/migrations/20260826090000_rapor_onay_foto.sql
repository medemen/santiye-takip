-- Rapor onay akisi, revizyon notu ve fotograf ekleme
-- onay_durumu: beklemede (yeni rapor), onaylandi (varsayilan), reddedildi

ALTER TABLE raporlar
  ADD COLUMN IF NOT EXISTS onay_durumu text NOT NULL DEFAULT 'onaylandi',
  ADD COLUMN IF NOT EXISTS revizyon_notu text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fotograflar text[] DEFAULT '{}';

ALTER TABLE raporlar
  DROP CONSTRAINT IF EXISTS raporlar_onay_durumu_check;

ALTER TABLE raporlar
  ADD CONSTRAINT raporlar_onay_durumu_check
  CHECK (onay_durumu IN ('beklemede', 'onaylandi', 'reddedildi'));

CREATE INDEX IF NOT EXISTS idx_raporlar_onay_durumu ON raporlar (onay_durumu) WHERE onay_durumu = 'beklemede';

-- Mevcut tum raporlari onaylandi olarak isle (backfill)
UPDATE raporlar SET onay_durumu = 'onaylandi' WHERE onay_durumu IS NULL OR onay_durumu = '';

-- Fotograflar icin storage bucket (eger yoksa)
INSERT INTO storage.buckets (id, name, public) VALUES ('rapor-fotolari', 'rapor-fotolari', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: herkes okuyabilir (public bucket)
DROP POLICY IF EXISTS "Fotograf okuma" ON storage.objects;
CREATE POLICY "Fotograf okuma" ON storage.objects
  FOR SELECT USING (bucket_id = 'rapor-fotolari');

-- RLS: giris yapanlar yukleyebilir
DROP POLICY IF EXISTS "Fotograf yukleme" ON storage.objects;
CREATE POLICY "Fotograf yukleme" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'rapor-fotolari' AND auth.role() = 'authenticated');

-- RLS: sahipleri silebilir
DROP POLICY IF EXISTS "Fotograf silme" ON storage.objects;
CREATE POLICY "Fotograf silme" ON storage.objects
  FOR DELETE USING (bucket_id = 'rapor-fotolari' AND auth.role() = 'authenticated');
