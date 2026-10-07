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
- **Sürümler:** Web/UI `package.json` → **1.1.52** · Android `version.properties` → **1.1.52** (versionCode 52)
- **Test:** 92/92 geçiyor (vitest, 11 dosya)
- **Lint:** oxlint temiz (0 uyarı, 0 hata)
- **Son iş:** Bakım turu — CHANGELOG 1.1.42–1.1.52 tamamlandı, sürümler hizalandı, bu takip dosyası kuruldu.

## 2. Açık İşler

- Play Console'da yayınlanan sürüm kontrol edilmeli — depo 1.1.52, mağazadaki sürüm bilinmiyor (aradaki 12 sürüm APK/AAB olarak yerelde üretilmiş olabilir).
- `npm run test:browser` smoke testi bu turda çalıştırılmadı (dev server gerektirir; uygun olunca `--auto-start` ile bir kez koşturulmalı).
- Yeni hakediş periyodu geldiğinde: `scripts/hakedis-oku.mjs` → `npm run build:config` → `validate-config.mjs` akışını işle.
- fikir/geri bildirim geldikçe buraya ekle; biten işi günlüğe taşıyıp buradan sil.

## 3. Değişiklik Günlüğü

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
