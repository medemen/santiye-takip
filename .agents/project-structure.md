# Santiye Takip - Proje Yapısı

Kısa mimari özet için bkz. [`AGENTS.md`](../AGENTS.md). Bu dosya dosya-dosya
eksiksiz döküm içindir.

**Stack:** React 19 + TypeScript 6 + Vite 8 + Supabase + Capacitor 8
**Router:** react-router-dom v7
**State:** Kütüphanesiz — `src/stores/` modül seviyesi durum + `useSyncExternalStore`
**Charts:** Recharts
**Export:** jsPDF, xlsx, html2canvas
**Lint:** Oxlint
**Platform:** Web + Android (Capacitor)

---

## Kök Dizin

| Dosya/Dizin | Açıklama |
|---|---|
| `index.html` | Vite giriş HTML'i |
| `package.json` | Bağımlılıklar ve script'ler |
| `vite.config.ts` | Vite yapılandırması |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | TS yapılandırmaları |
| `capacitor.config.ts` | Capacitor yapılandırması (appId/appName `data/santiye.config.json`'dan okunur) |
| `.env` / `.env.example` / `.env.production` | Ortam değişkenleri |
| `.oxlintrc.json` | Oxlint yapılandırması |
| `opencode.json` | opencode yapılandırması (Supabase MCP sunucusu) |
| `start-and-ngrok.ps1` | Yerel geliştirme/ngrok script'i |
| `baslat.bat` | Dev sunucusunu tek tıkla başlatan Windows script'i |
| `komutlar.bat` | Sık kullanılan npm komutlarını menüden çalıştıran Windows script'i |
| `README.md` | Proje README'si (kurulum, komutlar, mimari özet) |
| `AGENTS.md` | Ajanlar için mimari/konvansiyon rehberi (opencode/genel amaçlı) |
| `CLAUDE.md` | Claude Code giriş noktası, `AGENTS.md`'yi import eder |
| `skills-lock.json` | Kurulu agent skill'lerinin sürüm kilidi |

---

## `src/` — Ana Kaynak Kodu

### `src/main.tsx`
Uygulama giriş noktası (React root render).

### `src/App.tsx`
Ana uygulama. Router (`BrowserRouter`/`HashRouter` — native'de Hash), `ProtectedRoute`/
`AdminRoute`/`PmRoute` yetki koruması, `Toast`, `ErrorBoundary`, sayfa `lazy()` yüklemesi.
Supabase auth init'i, rapor/atama/hedef/kullanıcı senkronizasyonu ve realtime aboneliklerini
başlatıp kapatır. Bildirim kontrolünü (`notificationStore`) başlatır.

Route'lar: bkz. [`AGENTS.md`](../AGENTS.md#route-haritası-srcapptsx).

### `src/types.ts`
Domain tipleri: `Personel`, `SantiyeSefi`, `PersonelData`, `Blok`, `AdaBlok`, `BlokData`,
`Oturum`, `BlokAtamasi`, `KullaniciAtamalari`, `IsDurumu`, `Rapor`, `BlokProgress`,
`IsKalemiHedefi`.

### `src/index.css`
Global stiller.

---

### `src/components/`

| Dosya | Açıklama |
|---|---|
| `AdaCard.tsx` | Ada kartı |
| `BarChart.tsx` | Bar chart (Recharts) |
| `BlokCard.tsx` | Blok kartı |
| `DonutChart.tsx` | Donut chart (Recharts) |
| `ErrorBoundary.tsx` | React hata sınırı |
| `KullaniciYonetim.tsx` | Kullanıcı yönetim paneli (ekle/düzenle/rol ata) |
| `Layout.tsx` | Ana layout (sidebar + içerik) |
| `ProgressBar.tsx` | İlerleme çubuğu |
| `ReportCard.tsx` | Rapor kartı |
| `StatusBadge.tsx` | Durum rozeti |
| `Toast.tsx` | Toast bildirimi |

### `src/components/config/`

Şantiye config'ini (`SantiyeConfig`) düzenlemek için formlar; `Settings` ve
`NewSantiyeWizard` sayfalarında kullanılır.

| Dosya | Açıklama |
|---|---|
| `AdaBlokEditor.tsx` | Ada/blok yapısını (adalar, blok sayıları, tipleri) düzenler |
| `KalemGrupEditor.tsx` | İmalat grubu / iş kalemi listesini düzenler |
| `SablonEditor.tsx` | Rapor şablonlarını (durum/iş kalemi eşlemeleri) düzenler |

---

### `src/pages/`

| Dosya | Route | Açıklama |
|---|---|---|
| `Login.tsx` | `/login` | Giriş |
| `Dashboard.tsx` | `/` | Genel durum özeti |
| `HedefTakvim.tsx` | `/hedef-takvim` | Hedef tarihleri takvimi |
| `AdaList.tsx` | `/adalar` | Ada listesi |
| `AdaDetail.tsx` | `/ada/:ada` | Ada detay (blok listesi) |
| `BlokDetail.tsx` | `/ada/:ada/blok/:blokNo` | Blok detay (iş kalemi ilerlemeleri) |
| `ReportAdd.tsx` | `/rapor-ekle` | Tekil ilerleme raporu ekleme |
| `ReportList.tsx` | `/raporlar` | Rapor listesi/geçmişi |
| `BulkReport.tsx` | `/toplu-rapor` | Toplu rapor girişi (admin) |
| `Personnel.tsx` | `/personel` | Personel/kullanıcı listesi |
| `Profile.tsx` | `/profil` | Kullanıcı profili |
| `Statistics.tsx` | `/istatistik` | İstatistik ve grafikler |
| `Settings.tsx` | `/ayarlar` | Şantiye config editörü (proje müdürü) |
| `NewSantiyeWizard.tsx` | `/yeni-santiye` | Yeni şantiye/marka kurulum sihirbazı (proje müdürü) |

---

### `src/stores/`

Modül seviyesi durum yönetimi: localStorage önbellek + Supabase CRUD + Realtime abonelik +
version-counter tabanlı değişiklik bildirimi. Bkz. [`AGENTS.md`](../AGENTS.md#mimari-desenler).

| Dosya | Açıklama |
|---|---|
| `authStore.ts` | Oturum durumu, giriş/çıkış, `isAdmin`/`isProjeMuduruSession` |
| `reportStore.ts` | Rapor durumu (Supabase CRUD + realtime + cache) |
| `atamaStore.ts` | Ada/blok atama durumu (Supabase CRUD + realtime) |
| `hedefStore.ts` | İş kalemi hedef tarihleri (Supabase CRUD + realtime) |
| `kullanicilarStore.ts` | Personel/kullanıcı listesi, rol tespiti (`isSantiyeSefi`, `isProjeMuduru`) |
| `kullaniciYonetimStore.ts` | Kullanıcı oluşturma/düzenleme (admin paneli) |
| `notificationStore.ts` | Yerel bildirimler (Capacitor `LocalNotifications`) — günlük özet/uyarı |
| `toastStore.ts` | Toast bildirim durumu |

### `src/hooks/`

`useSyncExternalStore` ile yukarıdaki store'ları React'e bağlayan ince hook'lar.

| Dosya | Açıklama |
|---|---|
| `useRaporlar.ts` | `reportStore`'a abone olur |
| `useHedefler.ts` | `hedefStore`'a abone olur |
| `useSiteConfig.ts` | `config/site.ts`'e abone olur, açılışta DB override'ini yükler |

### `src/config/`

Şantiye config'inin tipi, varsayılan değeri ve okuma/yazma yardımcıları.

| Dosya | Açıklama |
|---|---|
| `types.ts` | `SantiyeConfig` ve alt tipleri (`GenelBilgi`, `MarkaBilgi`, `RolBilgi`, `YapiBilgi`, `BlokYapisi`, `AdaBlok`, `IsKalemleriBilgi`, `ImalatGrubu`, `Sablon`, `DurumTespitBilgi`, `TahminKural`, `BlokDurum`, `RaporKaydi`, ...) |
| `defaultConfig.ts` | `data/santiye.config.json`'ı `SantiyeConfig` olarak dışa aktarır; durum renkleri/etiketleri |
| `site.ts` | Runtime config erişim katmanı: bundle → localStorage → Supabase `santiye_config` önceliği, `subscribeSiteConfig` |
| `editor.ts` | Config editör formları için boş kayıt üretme / yeniden üretme yardımcıları |
| `helpers.ts` | Config içinden ada/blok/iş kalemi sorgulama yardımcıları |

### `src/lib/`

| Dosya | Açıklama |
|---|---|
| `supabase.ts` | Supabase client factory; env yoksa `null` (`isSupabaseReady()` ile kontrol edilir) |

### `src/data/`

| Dosya | Açıklama |
|---|---|
| `plan.ts` | Hedef tarihine kalan gün, ilerleme durumu ve hedef özeti hesaplamaları |

### `src/utils/`

| Dosya | Açıklama |
|---|---|
| `exportPdf.ts` | PDF dışa aktarma (jsPDF + html2canvas) |
| `exportXlsx.ts` | Excel dışa aktarma (xlsx) |
| `helpers.ts` | Genel yardımcı fonksiyonlar |
| `styles.ts` | Paylaşılan stil/sınıf yardımcıları |

---

## `supabase/`

| Dosya/Dizin | Açıklama |
|---|---|
| `schema.sql` | Güncel veritabanı şeması + RLS politikaları (referans anlık görüntü) |
| `seed.sql` | Örnek/başlangıç verileri |
| `config.toml` | Supabase CLI yerel proje yapılandırması |
| `migrations/` | Kronolojik SQL migrasyonları — şemanın tek doğru kaynağı; yeni değişiklikler her zaman yeni bir migrasyon dosyası olarak eklenir |

## `data/`

Bundle'a gömülü, en düşük öncelikli varsayılan veri katmanı (bkz. `src/config/site.ts`).

| Dosya | Açıklama |
|---|---|
| `santiye.config.json` | `npm run build:config` ile üretilen, uygulamanın okuduğu birleşik config |
| `config-basics.json` | Config'in temel/manuel girilen bölümü (build-config girdi) |
| `adalar_bloklar.json` / `.json.yedek` | Ada/blok yapısı verisi ve yedeği |
| `personel.json` | Personel/kullanıcı verisi (bootstrap/offline kaynağı) |
| `durum_tespit.json` | Başlangıç durum tespiti / referans ilerleme verisi |

## `scripts/`

| Dosya | Açıklama |
|---|---|
| `build-config.mjs` | `config-basics.json` + diğer parçalardan `data/santiye.config.json` üretir |
| `validate-config.mjs` | `data/santiye.config.json`'ı şemaya karşı doğrular |
| `new-santiye.mjs` | Yeni bir şantiye/marka için veri dosyası şablonları oluşturur |
| `bootstrap-admin.mjs` | İlk admin kullanıcıyı oluşturur/günceller (idempotent) |
| `seed-users.mjs` | Demo kullanıcıları `auth.users` + `kullanicilar`'a yazar (idempotent) |
| `seed-config.mjs` | Config'i Supabase `santiye_config` tablosuna yazar |
| `seed-migration.mjs` | Kullanıcı/config seed'ini SQL migrasyonu olarak üretir |
| `durum_aktar.mjs` | Başlangıç durum tespiti verisini Supabase'e aktarır |
| `tahmin_ilerleme.mjs` | Tahmini ilerleme hesaplayıp Supabase'e yazar |
| `demo_saha_ilerlemesi.sql` | Demo/test amaçlı saha ilerleme verisi (SQL) |
| `take-screenshots.mjs` | Playwright ile telefon boyutunda uygulama ekran görüntüleri alır |
| `take-screenshots-tablet.mjs` / `take-screenshots-tablet10.mjs` | Aynı işi 7"/10" tablet boyutlarında yapar |
| `generate-icons.py` | Uygulama ikonunu (kule vinç silueti) üretir: `public/icon-512.png` + Android `mipmap-*` setleri |
| `generate-feature-graphic.py` | Play Store feature graphic görselini üretir: `public/feature-graphic.png` |

## `public/`

Statik varlıklar: `icon-512.png`, `feature-graphic.png` (yukarıdaki script'lerle üretilir).

## `screenshots/`

Store listeleme için üretilmiş ekran görüntüleri: kök dizin telefon boyutu,
`tablet7/`/`tablet10/` alt dizinleri tablet varyantları.

## `android/`

Capacitor'ın ürettiği native Android projesi (Gradle). Elle düzenlenmez; web build'i
değiştikten sonra `npm run cap:sync` ile güncellenir. İkonlar `generate-icons.py` ile,
`capacitor.config.ts` içindeki appId/appName `data/santiye.config.json`'daki marka
bölümünden okunur.

## `.github/workflows/`

| Dosya | Açıklama |
|---|---|
| `deploy.yml` | `main`/`master`'a push → build → GitHub Pages'e otomatik deploy |

## `.agents/`

| Dosya/Dizin | Açıklama |
|---|---|
| `project-structure.md` | **Bu dosya** — dosya-dosya eksiksiz döküm |
| `skills/supabase/SKILL.md` | Supabase skill (opencode/Claude skill'i) |
| `skills/supabase-postgres-best-practices/SKILL.md` | Postgres best practices skill |

## `.claude/`

| Dosya | Açıklama |
|---|---|
| `launch.json` | Claude Code Browser pane için dev sunucusu başlatma yapılandırması (`npm run dev`) |

---

## Güncelleme Geçmişi

| Tarih | Değişiklik |
|---|---|
| 2026-07-30 | İlk oluşturma |
| 2026-08-08 | Tamamen güncellendi: `src/store/` → `src/stores/` düzeltmesi, `src/hooks/`, `src/config/`, `components/config/` eklendi; tüm sayfalar/script'ler/scripts güncellendi; kök `AGENTS.md`/`CLAUDE.md`/`README.md` eklendi |
