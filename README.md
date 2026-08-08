# Şantiye Takip

İnşaat şantiyelerinde ada/blok bazlı iş kalemi ilerlemesini takip eden bir web + Android
uygulaması. Saha personeli günlük ilerleme raporu girer, proje yöneticileri hedef takvimi,
dashboard ve istatistiklerden durumu izler. Tek kod tabanı, `data/santiye.config.json`
üzerinden farklı şantiyeler/markalar için yeniden yapılandırılabilir.

Ajanlar (Claude Code, opencode, vb.) veya derinlemesine mimari bilgi için
[`AGENTS.md`](AGENTS.md) ve dosya-dosya döküm için [`.agents/project-structure.md`](.agents/project-structure.md)
dosyalarına bakın.

## Stack

React 19 · TypeScript · Vite 8 · Supabase (Postgres + RLS + Realtime + Storage) ·
Capacitor 8 (Android) · react-router-dom v7 · Recharts · jsPDF / xlsx · Oxlint

## Hızlı başlangıç

Gereksinimler: Node.js 20+, npm. Supabase kullanmak için bir Supabase projesi (opsiyonel —
Supabase yapılandırılmazsa uygulama bundle'daki `data/*.json` ve `localStorage` ile
sınırlı/offline modda çalışır).

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY doldurun
npm run dev            # http://localhost:5173
```

Windows'ta `komutlar.bat` sık kullanılan komutları menüden çalıştırır;
`baslat.bat` dev sunucusunu tek tıkla başlatır.

## Script'ler

| Komut | Açıklama |
|---|---|
| `npm run dev` | Vite geliştirme sunucusu |
| `npm run build` | Tip kontrolü (`tsc -b`) + prod build → `dist/` |
| `npm run preview` | Build'i yerelde önizle |
| `npm run lint` | Oxlint |
| `npm run seed:users` | Supabase'e demo kullanıcı/personel seed'i (`SUPABASE_SERVICE_ROLE_KEY` gerekir) |
| `npm run seed:config` | `data/santiye.config.json`'ı Supabase `santiye_config` tablosuna yazar |
| `npm run seed:migration` | Eski JSON verilerini yeni şemaya taşıyan SQL migrasyonu üretir |
| `npm run bootstrap:admin` | İlk admin kullanıcıyı oluşturur/günceller |
| `npm run new:santiye` | Yeni bir şantiye/marka için config dosyaları sihirbazı |
| `npm run build:config` | `data/santiye.config.json`'ı derler ve doğrular |
| `npm run cap:sync` | Web build'ini Capacitor Android projesine senkronlar |
| `npm run cap:build` | Build + `cap sync` |
| `npm run cap:build:apk` | APK için build (kök base path ile) + `cap sync` |
| `npm run cap:open:android` | Android Studio'da native projeyi açar |

## Ortam değişkenleri (`.env`)

| Değişken | Açıklama |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Uygulamanın çalışma zamanında kullandığı Supabase bağlantısı |
| `VITE_DEFAULT_PASSWORD` | Seed script'lerinin oluşturduğu kullanıcılar için varsayılan şifre |
| `SUPABASE_SERVICE_ROLE_KEY` | Yalnızca yerel `scripts/*.mjs` seed script'leri için — uygulama runtime'ında kullanılmaz, asla client'a sızdırılmaz |

Tam liste ve örnek değerler için `.env.example`.

## Mimari (özet)

- **Config-driven:** Marka adı, roller, ada/blok yapısı, iş kalemleri `data/santiye.config.json`'dan
  gelir. Öncelik sırası: bundle varsayılanı → `localStorage` override → Supabase `santiye_config`
  tablosu.
- **State:** Redux/Zustand gibi bir kütüphane yok; `src/stores/*` modül seviyesinde durumu tutar
  (Supabase CRUD + Realtime abonelik + localStorage önbellek), `src/hooks/*` bunları
  `useSyncExternalStore` ile React'e bağlar.
- **Roller:** `admin` (şantiye şefi, ada bazlı yetkilendirilebilir), `proje_muduru`
  (ayarlar + yeni şantiye sihirbazı), sıradan personel. Aynı kurallar Supabase RLS ile
  sunucu tarafında da uygulanır (`supabase/migrations/`).
- **Offline-first:** Supabase erişilemezse uygulama `localStorage` + bundle verisiyle çalışmaya
  devam eder.

Detaylar için [`AGENTS.md`](AGENTS.md#mimari-desenler).

## Dağıtım

`main`/`master` dalına push, GitHub Actions ile otomatik build alıp GitHub Pages'e yayınlar
(`.github/workflows/deploy.yml`). Android için `npm run cap:build:apk` sonrası
`npx cap open android` ile Android Studio'dan imzalanıp derlenir.

## Proje yapısı

Üst düzey dizinler:

| Dizin | İçerik |
|---|---|
| `src/` | Uygulama kaynak kodu (sayfalar, bileşenler, store'lar, config) |
| `supabase/` | DB şeması, RLS politikaları, migrasyonlar, seed verisi |
| `data/` | Bundle'a gömülü varsayılan config/personel/ada-blok verisi |
| `scripts/` | Seed, bootstrap, config derleme/doğrulama, ikon/ekran görüntüsü CLI araçları |
| `android/` | Capacitor'ın ürettiği native Android projesi |
| `screenshots/` | Store listeleme ekran görüntüleri |

Tam dosya-dosya döküm: [`.agents/project-structure.md`](.agents/project-structure.md).
