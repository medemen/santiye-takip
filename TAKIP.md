# Geliştirme Takibi

Bu dosya projedeki değişikliklerin ve geliştirme durumunun canlı kaydıdır.

**Her ajan oturumunda:**
1. En üstteki **Mevcut Durum** ve **Açık İşler** bölümlerini oku.
2. Bir iş tamamlandığında **Değişiklik Günlüğü**'ne giriş ekle ve Mevcut Durum'u güncelle.
3. Sürüm değiştiyse `CHANGELOG.md`'yi de güncelle (bkz. "Kararlar & Notlar").

Böylece Claude Code → opencode → Codex → Cursor gibi uygulamalar arasında geçişte
geliştirme kaldığı yerden devam eder. Kalıcı mimari kurallar ve dizin haritası
[AGENTS.md](AGENTS.md) içindedir; bu dosyaya tekrarlanmaz.

---

## 1. Mevcut Durum

- **Güncelleme:** 2026-10-08
- **Dal:** `master` (origin/master ile eşit, working tree temiz)
- **Sürümler:** UI `package.json` → **1.1.54** · Android `version.properties` → **1.1.54 (versionCode 54)** — hizalı
- **Dağıtım:** `master` push → GitHub Pages otomatik deploy · **APK** `android/app/build/outputs/apk/release/app-release.apk` (1.51 MB, code 54) + **AAB** `android/app/build/outputs/bundle/release/app-release.aab` (1.96 MB, code 53) — ikisi de imzalı release, telefonda/Publish'de bekliyor
- **Test:** birim 92/92 (vitest) · browser smoke **17/17** (`npm run test:browser -- --auto-start`)
- **Lint:** oxlint temiz (0 uyarı) · `tsc -b` temiz
- **Son iş:** Şifresiz giriş (sessiz ortak şifre), Ayarlar'da çıkış üste, kullanıcı yönetiminde şifre kalkması, rapor düğmesi alt çubuğun ortası, AAB 1.1.53 derlemesi.

## 2. Açık İşler

- **Şifreli giriş geri alınacak (geçici):** UI'da şifre alanı yok (giriş + kullanıcı yönetimi dahil); ortak `VITE_DEFAULT_PASSWORD` bundle'a gömülü — paketi okuyan herkes girebilir. Normal güvenlik düzenine dönülecekse `Login.tsx` + `authStore.girisYap` + `kullaniciYonetimStore.santiyeKullaniciOlustur`'a şifre alanları geri getirilecek (bkz. AGENTS.md "Giriş").
- **Dashboard yatay taşma (951px) — tespit edildi, düzeltilecek:** `BlokMatrisi`'ndeki `width: 'max-content'` grid, kartın CSS grid track'ini şişiriyor (`min-width: auto`); hem masaüstünde hem mobilde tüm sayfa yatay kayıyor. Çözüm: matris sarmalayıcı kartına `minWidth: 0` (+ gerekirse `overflow: hidden`). Karar bekliyor.
- **OfflineBanner 401 gürültüsü — kök neden bulundu:** `src/components/OfflineBanner.tsx:20` `GET ${SUPABASE_URL}/rest/v1/` çağrısı `apikey` header'ı olmadan yapılıyor → PostgREST 401 dönüyor (erişilebilir=true mantığı doğru çalışıyor, sadece 15 sn'de bir console.error). Çözüm: `apikey` anon key header'ı eklemek. Karar bekliyor.
- **Raporlar tablosu büyüklüğü:** `raporlar` sorgusu ~4500+ kayda ulaştı, açılışta 5 sayfalık (offset 0→4000) ardışık çekim yapılıyor. Öneri: periyot filtresi / önbellek önceliği / sunucu tarafı toplulaştırma.
- **Konsol 401'leri:** → yukarıdaki "OfflineBanner" maddesine taşındı (kök neden biliniyor).
- **Telefon kurulumu bekliyor:** 1.1.54 release APK derlendi (`app-release.apk`, code 54) — cihaza USB/kurye ile kurulacak; şifresiz giriş + ortalanmış rapor düğmesi bu pakette. (Eski APK'da giriş hâlâ şifreli.)
- **Farklı şifreli hesaplar hizalanmalı:** eski "Geçici Şifre" ile açılmış hesaplar ortak şifreyle eşleşmeyebilir → sessiz giriş onlarda yerel oturuma düşer. `npm run seed:users` tüm hesapların şifresini ortak değere hizalar (dikkat: mevcut şifreleri değiştirir).
- **Konsol 401'leri:** (kapatıldı — OfflineBanner kök nedeni yukarıda).
- Play Console'da yayınlanan sürüm kontrol edilmeli — depo notları 1.1.12 (code 14) diyor, sonraki yükleme kaydı yok; **1.1.53/53 imzalı AAB hazır** (`play-console/yukleme-rehberi.md`'deki adımlarla yüklenebilir; sonraki derleme code 55 olur).
- Yeni hakediş periyodu geldiğinde: `scripts/hakedis-oku.mjs` → `npm run build:config` → `validate-config.mjs` akışını işle.
- fikir/geri bildirim geldikçe buraya ekle; biten işi günlüğe taşıyıp buradan sil.

## 3. Değişiklik Günlüğü

### 2026-10-08 (5) — Uygulama test turu

- Birim **92/92** · lint **0** · `tsc -b` 0 · smoke test **34/34** (şef + PM, iki tam tur, exit 0).
- Sayfa turları (şef + PM): Dashboard, hedef-takvim, adalar, ada/blok detay, rapor-ekle, raporlar, istatistik, hakediş, personel, profil, ayarlar — gerçek hata metni yok, diğer sayfalarda yatay taşma 0.
- Doğrulamalar: giriş 0 şifre alanı + "Şifre gerekmez" notu · Yeni Kullanıcı formu 0 şifre alanı, "Şifre Sıfırla" yok · Ayarlar'da Oturum kartı en üstte (PM) · `/ayarlar` şef için `/`'e yönlendiriyor · mobil alt çubukta Rapor düğmesi ortada, örtüşme yok.
- **Bulgu 1:** Dashboard'da 951px yatay taşma — `BlokMatrisi` `width: max-content` (Açık İşler'de).
- **Bulgu 2 (401'ler):** `OfflineBanner.tsx:20` apikey'siz `GET /rest/v1/` → 401, 15 sn'de bir console.error — kaynağı buydu (Açık İşler'de).
- **Bulgu 3:** `raporlar` ~4500+ kayıt / 5 sayfalık açılış çekimi (Açık İşler'de).
- Lighthouse (personel sayfası): Best Practices **100**, Accessibility **94** (düşük kontrast metin), SEO **60** (meta description + robots.txt yok — iç kullanım için öncelik düşük).

### 2026-10-08 (4) — Release APK (1.1.54 / code 54)

- `gradlew assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk` (**1.51 MB**, imzalı).
- Otomatik artış: `version.properties` → **1.1.54 / versionCode 54**; hizalama için `package.json` → 1.1.54, CHANGELOG'a `[1.1.54]` başlığı açıldı (10-08 maddeleri oraya taşındı).
- AAB (code 53) ile APK (code 54) farklı versionCode taşıyor — Play'e yüklenecek olan AAB, telefona kurulacak olan APK.

### 2026-10-08 (3) — Push + AAB 1.1.53

- `64b9731..d4065da` `origin/master`'a push edildi (GitHub Pages deploy dahil).
- İmzalı **release AAB** derlendi: `vite build --base=/` → `cap sync` → `gradlew bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab` (1.96 MB, BUILD SUCCESSFUL 1m29s).
- `version.properties` otomatik arttı: **1.1.53 / versionCode 53** — `d4065da` ile commit edip push edildi (AGENTS kuralı).

### 2026-10-08 (2) — Rapor düğmesi alt çubuğa alındı

- `Layout.tsx` (mobil): yüzen FAB (`bottom: safe+86px`) kaldırıldı; "➕ Rapor" artık alt çubuğun tam ortasındaki sabit bir hap düğme. Diğer öğeler iki yana (`flex:1` + `space-around`) dağıtıldı — 5 öğede 2/3, PM'de (Ayarlar görünür) 3/3.
- İçerik alt boşluğu `safe + 160px` → `safe + 96px` (çubuk yüksekliği 62px, 34px boşluk kalıyor).
- Doğrulama: lint 0 · `tsc -b` · birim 92/92 · browser smoke exit 0 · canlı ölçümlerle örtüşme yok, pill merkezi ekran merkeziyle hizalı (350 vs 353px), `/rapor-ekle` navigasyonu çalışıyor.

### 2026-10-08 — Kullanıcı yönetiminde şifre tamamen kaldırıldı

- `KullaniciYonetim.tsx`: "Geçici Şifre" alanı ve "🔑 Şifre Sıfırla" butonu kaldırıldı; form artık şifre sormuyor, yerine bilgi notu konuldu.
- `kullaniciYonetimStore.santiyeKullaniciOlustur`: `p_sifre` artık arka planda ortak `VITE_DEFAULT_PASSWORD`'ten geliyor (RPC en az 6 karakter istiyor, ortak şifre 11 karakter — doğrulandı). Eski düzenle farklı şifreyle açılan hesaplar sessiz girişte yerel oturuma düşüyordu — bu hata da kapandı.
- Doğrulama: lint 0 · `tsc -b` 0 · birim 92/92 · browser smoke exit 0.
- Canlı site de kontrol edildi: `medemen.github.io/santiye-takip/login` → şifre alanı 0 (üretimde şifresiz giriş yayında).

### 2026-10-07 — Şifresiz giriş + navigasyon düzeltmeleri

- **Girişten şifre alanı kaldırıldı** (`src/pages/Login.tsx`, `src/stores/authStore.ts`): seçilen kişiyle ortak `VITE_DEFAULT_PASSWORD` arka planda sessiz `signInWithPassword` ile kullanılıyor — gerçek Supabase oturumu açılıyor (doğrulandı: user_id + profil geldi), RLS yazmaları çalışıyor. Supabase erişilemezse yerel oturuma düşer. Şifre bundle'da görünür — **geçici, geri alınacak** (açık işler).
- **Ayarlar'da "Oturum / Çıkış Yap" kartı en üste taşındı** (`src/pages/Settings.tsx`).
- **Alt nav + yüzen FAB örtüşmesi:** mobil içerik alt boşluğu `80px` → `calc(env(safe-area-inset-bottom) + 160px)` yapıldı (`src/components/Layout.tsx`) — sayfa sonundaki butonların merkezi nav/FAB altında kalmıyordu.
- **Smoke test onarımı** (`scripts/browser-test.mjs`): "Çıkış yap" adımı artık `/profil`'e gidip sayfa sonuna kaydırarak çalışıyor (Ayarlar'daki çıkış yalnızca PM'e açık; şifre alanı kalkınca giriş adımı da alandan bağımsızlaştı).
- Doğrulama: lint 0 · `tsc -b` 0 · birim 92/92 · **browser smoke 17/17**.
- Sürüm `1.1.53`'e alındı, CHANGELOG'a `[1.1.53]` başlığı eklendi.

### 2026-10-07 — Bakım turu (CHANGELOG + sürüm hizalama + takip yapısı)

- `08ee9e9` docs: CHANGELOG'a 1.1.42–1.1.52 sürüm notları eklendi — 4 başlık, `git log -p -- android/app/version.properties` ile bölündü.
- `11ee53a` chore: `package.json` 1.1.22 → 1.1.52 (Profile sayfası bu değeri gösteriyor), `scripts/build-config.mjs` unused-variable lint uyarısı temizlendi.
- (bu commit) docs: `TAKIP.md` oluşturuldu, `AGENTS.md`'ye takip talimatı eklendi.
- Doğrulama: `npm run lint` 0 uyarı · `npm run test` 92/92.

### 2026-09-07 → 2026-09-08 — 1.1.48 → 1.1.52 (önceki oturumlar, günlüksüz)

- Tema seçimi Ayarlara taşındı, alt navigasyon FAB'ı yüzen pill olarak ortalandı.
- Güneyşehir 10. hakediş verisi + WhatsApp sohbetinden rapor üretimi (`scripts/chat-rapor.mjs`).
- Saha ilerlemesi hakediş pursantaj ağırlıklarına bağlandı; ada pursantaj toplamı %100 doğrulanıp normalize ediliyor.
- Sunucudan silinen raporların offline cihazda dirilmesi engellendi (`reportStore` tam senkronizasyon ayrıştırması + test).
- Detaylı döküm: [CHANGELOG.md](CHANGELOG.md) 1.1.42 / 1.1.48 / 1.1.51 / 1.1.52 başlıkları.

## 4. Kararlar & Notlar

- **İki sürüm kaynağı hizalı tutulur:** Android `android/app/version.properties` (Gradle her `assemble*`/`bundle*`'de artırır), UI `package.json` `version` (Profile sayfası bunu gösterir). Birini değiştirirken diğerini de güncelle.
- **CHANGELOG sürüm aralıkları** `git log -p -- android/app/version.properties` geçmişinden türetilir; ara sürümler (1.1.42, 1.1.48, 1.1.51...) bu dosyadaki bump commit'lerine denk gelir.
- **Commit mesajları Türkçe** ve conventional prefix ile (`feat:`/`fix:`/`chore:`/`docs:`/`android:`).
- **Test/lint kapıyı geçmeden commit atma:** `npm run lint` 0 uyarı, `npm run test` 92/92 beklenir.
- Mimari kararlar (store deseni, config önceliği, offline-first, roller) [AGENTS.md](AGENTS.md) "Mimari desenler" bölümünde — buraya kopyalama.
