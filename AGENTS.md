# Şantiye Takip — Ajan/Geliştirici Rehberi

Bu dosya, projeyi ilk kez gören bir AI ajanının (Claude Code, opencode, vb.) veya
geliştiricinin hızla yön bulması için yazıldı. Dosya bazlı tam döküm için
[`.agents/project-structure.md`](.agents/project-structure.md) dosyasına bakın.

## Projenin ne olduğu

İnşaat şantiyelerinde ada/blok bazlı iş kalemi ilerlemesini takip eden bir React SPA.
Saha personeli günlük rapor girer (ör. "A ada, 3 no'lu blok, sıva işi %60"), proje
yöneticileri hedef takvimi ve istatistikleri izler. Tek kod tabanı `data/santiye.config.json`
üzerinden farklı şantiyeler/markalar için yeniden yapılandırılabilir (bkz. `npm run new:santiye`).

## Stack

React 19 + TypeScript + Vite 8 · Supabase (Postgres + RLS + Realtime + Storage) ·
Capacitor 8 (Android paketleme) · react-router-dom v7 · Recharts · jsPDF/xlsx (dışa aktarma) ·
Oxlint. Global state kütüphanesi yok — bkz. "Mimari" altında store deseni.

## Hızlı komutlar

```bash
npm install
cp .env.example .env      # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev                # http://localhost:5173 (predev: porttaki yabanci vite'i kapatir)
npm run build               # tsc -b && vite build -> dist/
npm run lint                 # oxlint
npm run test:browser         # headless Chrome smoke testi (dev server ayaktayken; --auto-start ile kendisi baslatir)
```

Not: `npm run dev` öncesi `scripts/ensure-dev-port.mjs` çalışır; 5173'ü yanlış projeden
alan eski/devam eden vite prosesini kapatıp temiz başlatır (bkz. `vite.config.ts` `strictPort`).

Diğer script'ler (`seed:*`, `bootstrap:admin`, `new:santiye`, `cap:*`) için
[README.md](README.md#scriptler) ve `package.json`'a bakın.

## Dizin haritası

| Yol | İçerik |
|---|---|
| `src/pages/` | Route başına bir sayfa bileşeni (aşağıdaki tabloya bakın) |
| `src/components/` | Paylaşılan UI bileşenleri; `components/config/` şantiye config editör formları |
| `src/stores/` | Modül seviyesi durum + Supabase CRUD/Realtime + localStorage önbellek (klasik store kütüphanesi yok) |
| `src/hooks/` | `useSyncExternalStore` ile store'ları React'e bağlayan ince hook'lar |
| `src/config/` | `SantiyeConfig` tipi, varsayılan config, config okuma/yazma yardımcıları |
| `src/lib/supabase.ts` | Supabase client (env yoksa `null`, `isSupabaseReady()` ile kontrol edilir) |
| `src/data/plan.ts` | Hedef tarihi/ilerleme hesaplama yardımcıları |
| `src/utils/` | PDF/Excel dışa aktarma, genel yardımcılar |
| `src/types.ts` | Domain tipleri (Rapor, Personel, Blok, Oturum, ...) |
| `data/*.json` | Bundle'a gömülü varsayılan veri (config, personel, ada/blok yapısı) — çalışma zamanı önceliği en düşük katman |
| `supabase/` | `schema.sql`, `seed.sql`, `migrations/` (kronolojik SQL migrasyonları — DB şemasının tek doğru kaynağı) |
| `scripts/` | Node/Python CLI script'leri: seed, bootstrap, config derleme/doğrulama, ikon/ekran görüntüsü üretimi |
| `android/` | Capacitor'ın ürettiği native Android projesi (elle düzenlenmez, `npm run cap:sync` ile senkronlanır) |
| `screenshots/` | Store listeleme için üretilmiş ekran görüntüleri (telefon + tablet varyantları) |
| `.github/workflows/deploy.yml` | `main`/`master`'a push → GitHub Pages'e otomatik build+deploy |
| `.agents/skills/` | Supabase ve Postgres best-practice referans dosyaları (opencode/Claude skill'leri) |

## Mimari desenler

**Config önceliği (bkz. `src/config/site.ts`):** bundle'daki `data/santiye.config.json`
(varsayılan) → `localStorage` override (admin panelinden düzenleme, offline) →
Supabase `santiye_config` tablosu (tüm cihazlara yayılır). `useSiteConfig()` hook'u
bu katmanları tek bir reaktif config nesnesi olarak sunar.

**Store deseni (bkz. `src/stores/reportStore.ts`, `hedefStore.ts`, `atamaStore.ts`):**
Redux/Zustand gibi bir kütüphane yok. Her store bir modül; veriyi `localStorage`'da
önbellekler, Supabase'den yükler, `RealtimeChannel` ile canlı günceller ve bir
`_version` sayaç + listener seti üzerinden değişikliği duyurur. `src/hooks/use*.ts`
bu store'ları `useSyncExternalStore` ile React bileşenlerine bağlar. Yeni bir store
eklerken bu üçlüyü (cache + realtime + version-counter) tekrarlayın.

**Roller ve yetki (bkz. `src/stores/kullanicilarStore.ts`, `src/App.tsx`):**
- `admin` alanı `true` olan kullanıcı = "şantiye şefi" (`isSantiyeSefi`); `yetkili_adalar`
  ile hangi adalara yetkili olduğu sınırlanabilir.
- `proje_muduru` alanı `true` olan kullanıcı = proje müdürü; `/ayarlar` ve
  `/yeni-santiye` route'larına (`PmRoute`) erişebilir.
- Diğer herkes sıradan saha personeli.
- Sunucu tarafında aynı kurallar Supabase RLS politikalarıyla (`supabase/migrations/`)
  tekrar uygulanır — client tarafı kontrolleri sadece UX içindir, güvenlik sınırı DB'dedir.

**Offline-first:** Supabase erişilemezse (`isSupabaseReady() === false`) uygulama
`localStorage`'daki son bilinen veriyle ve bundle'daki `data/*.json` ile çalışmaya
devam eder. Yeni bir özellik eklerken bu düşüşü (fallback) kırmamaya dikkat edin.

## Route haritası (`src/App.tsx`)

| Path | Sayfa | Koruma |
|---|---|---|
| `/login` | `Login` | — |
| `/` | `Dashboard` | Giriş gerekli |
| `/hedef-takvim` | `HedefTakvim` | Giriş gerekli |
| `/adalar`, `/ada/:ada`, `/ada/:ada/blok/:blokNo` | `AdaList`, `AdaDetail`, `BlokDetail` | Giriş gerekli |
| `/rapor-ekle`, `/raporlar` | `ReportAdd`, `ReportList` | Giriş gerekli |
| `/toplu-rapor` | `BulkReport` | Admin |
| `/personel`, `/profil`, `/istatistik` | `Personnel`, `Profile`, `Statistics` | Giriş gerekli |
| `/ayarlar` | `Settings` | Proje müdürü |
| `/yeni-santiye` | `NewSantiyeWizard` | Proje müdürü |

Native (Capacitor/Android) derlemede `HashRouter`, web'de `BrowserRouter` kullanılır
(`isNative` kontrolü `src/App.tsx` içinde).

## Konvansiyonlar

- Domain terimleri Türkçe (ada, blok, is_kalemi, hedef, rapor, atama...) — değişken/tip
  adlarını da bu dile sadık tutun, yarı-İngilizce karışım yapmayın.
- Yorum eklemeyin, yalnızca WHY açık olmayan gizli bir kısıtlama varsa kısa bir satır ekleyin.
- DB alan adları `snake_case` (Supabase/Postgres konvansiyonu), bu isimler doğrudan
  TS arayüzlerine (`src/types.ts`, `src/config/types.ts`) taşınır — dönüştürme yapılmaz.
- Şema değişiklikleri her zaman yeni bir `supabase/migrations/*.sql` dosyasıyla yapılır,
  var olan migrasyonlar düzenlenmez.
- `SUPABASE_SERVICE_ROLE_KEY` yalnızca yerel `scripts/*.mjs` seed script'lerinde kullanılır,
  asla client koduna (`src/`) veya `.env` dışında bir yere sızdırılmaz.
