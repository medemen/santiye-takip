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

- **Güncelleme:** 2026-10-07
- **Dal:** `master` (origin/master ile eşit, working tree temiz)
- **Sürümler:** UI `package.json` → **1.1.53** · Android `version.properties` → **1.1.52** (versionCode 52; bir sonraki APK derlemesi bunu 1.1.53/53'e çıkarır ve hizalanır)
- **Test:** birim 92/92 (vitest) · browser smoke **17/17** (`npm run test:browser -- --auto-start`)
- **Lint:** oxlint temiz (0 uyarı) · `tsc -b` temiz
- **Son iş:** Şifresiz giriş (sessiz ortak şifre), Ayarlar'da çıkış üste, alt nav/FAB boşluğu, smoke test onarımı.

## 2. Açık İşler

- **Şifreli giriş geri alınacak (geçici):** UI'da şifre alanı yok; ortak `VITE_DEFAULT_PASSWORD` bundle'a gömülü — paketi okuyan herkes girebilir. Normal güvenlik düzenine dönülecekse `Login.tsx` + `authStore.girisYap`'a şifre alanı geri getirilecek (yapı hazır, bkz. AGENTS.md "Giriş").
- **Konsol 401'leri:** smoke testte 2-4 adet `401` konsol hatası görünüyor; görevleri etkilemiyor (giriş dahil her adım geçiyor), kaynağı araştırılacak.
- Play Console'da yayınlanan sürüm kontrol edilmeli — depo notları 1.1.12 (code 14) diyor, sonraki yükleme kaydı yok (bkz. `play-console/yukleme-rehberi.md`).
- Yeni hakediş periyodu geldiğinde: `scripts/hakedis-oku.mjs` → `npm run build:config` → `validate-config.mjs` akışını işle.
- fikir/geri bildirim geldikçe buraya ekle; biten işi günlüğe taşıyıp buradan sil.

## 3. Değişiklik Günlüğü

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
