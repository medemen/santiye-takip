# Santiye Takip - Proje Yapısı

**Stack:** React 19 + TypeScript 6 + Vite 8 + Supabase + Capacitor 8  
**Router:** react-router-dom v7  
**State:** Zustand (örtük, store/ altında)  
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
| `tsconfig.json` | TS ana yapılandırma |
| `tsconfig.app.json` | TS uygulama yapılandırması |
| `tsconfig.node.json` | TS Node yapılandırması |
| `capacitor.config.ts` | Capacitor yapılandırması |
| `.env` | Ortam değişkenleri (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) |
| `.env.example` | Örnek ortam değişkenleri |
| `.gitignore` | Git ignore kuralları |
| `.oxlintrc.json` | Oxlint yapılandırması |
| `opencode.json` | Opencode yapılandırması |
| `start-and-ngrok.ps1` | Yerel geliştirme/ngrok script'i |
| `README.md` | Proje README'si |

---

## `src/` — Ana Kaynak Kodu

### `src/main.tsx`
Uygulama giriş noktası.

### `src/App.tsx`
Ana uygulama. Router, ProtectedRoute, Toast, ErrorBoundary içerir. Supabase auth, rapor/atama senkronizasyonu ve realtime abonelikleri yönetir.

Route'lar:
- `/login` — Login
- Korumalı: `/` — Dashboard, `/adalar` — Ada listesi, `/ada/:ada` — Ada detay, `/ada/:ada/blok/:blokNo` — Blok detay, `/rapor-ekle` — Rapor ekle, `/raporlar` — Rapor listesi, `/personel` — Personel, `/toplu-rapor` — Toplu rapor, `/profil` — Profil, `/istatistik` — İstatistik

### `src/types.ts`
Tipler: `Personel`, `SantiyeSefi`, `PersonelData`, `Blok`, `AdaBlok`, `BlokData`, `Oturum`, `BlokAtamasi`, `KullaniciAtamalari`, `IsDurumu`, `Rapor`, `BlokProgress`

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
| `ErrorBoundary.tsx` | Hata sınırı |
| `Layout.tsx` | Ana layout (sidebar + içerik) |
| `ProgressBar.tsx` | İlerleme çubuğu |
| `ReportCard.tsx` | Rapor kartı |
| `StatusBadge.tsx` | Durum rozeti |
| `Toast.tsx` | Toast bildirimi |

---

### `src/pages/`

| Dosya | Açıklama |
|---|---|
| `AdaDetail.tsx` | Ada detay |
| `AdaList.tsx` | Ada listesi |
| `BlokDetail.tsx` | Blok detay |
| `BulkReport.tsx` | Toplu rapor |
| `Dashboard.tsx` | Dashboard |
| `Login.tsx` | Giriş |
| `Personnel.tsx` | Personel yönetimi |
| `Profile.tsx` | Profil |
| `ReportAdd.tsx` | Rapor ekle |
| `ReportList.tsx` | Rapor listesi |
| `Statistics.tsx` | İstatistikler |

---

### `src/store/`

| Dosya | Açıklama |
|---|---|
| `authStore.ts` | Auth durumu |
| `reportStore.ts` | Rapor durumu (Supabase CRUD + realtime) |
| `atamaStore.ts` | Atama durumu (Supabase CRUD + realtime) |
| `toastStore.ts` | Toast bildirim durumu |

---

### `src/lib/`

| Dosya | Açıklama |
|---|---|
| `supabase.ts` | Supabase client |

---

### `src/data/`

| Dosya | Açıklama |
|---|---|
| `blokData.ts` | Blok verileri |
| `isKalemleri.ts` | İş kalemleri |
| `personelData.ts` | Personel verileri |
| `plan.ts` | Plan verileri |
| `sablonlar.ts` | Rapor şablonları |

---

### `src/utils/`

| Dosya | Açıklama |
|---|---|
| `exportPdf.ts` | PDF dışa aktarma |
| `exportXlsx.ts` | Excel dışa aktarma |
| `helpers.ts` | Genel yardımcılar |

---

## `supabase/`

| Dosya | Açıklama |
|---|---|
| `schema.sql` | Veritabanı şeması + RLS |
| `seed.sql` | Örnek veriler |

---

## `data/`

| Dosya | Açıklama |
|---|---|
| `adalar_bloklar.json` | Ada/blok yapılandırması |
| `adalar_bloklar.json.yedek` | Yedek |
| `personel.json` | Personel verileri |

---

## `android/`

Capacitor Android native projesi.

---

## `.github/workflows/`

| Dosya | Açıklama |
|---|---|
| `deploy.yml` | GitHub Pages CI/CD |

---

## `.agents/`

| Dosya/Dizin | Açıklama |
|---|---|
| `skills/supabase/SKILL.md` | Supabase skill |
| `skills/supabase-postgres-best-practices/SKILL.md` | Postgres best practices |
| `project-structure.md` | **Bu dosya** |

---

## Güncelleme Geçmişi

| Tarih | Değişiklik |
|---|---|
| 2026-07-30 | İlk oluşturma |
