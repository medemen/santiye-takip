# Değişiklik Notları

## [1.1.55] - Yayınlanmadı (geliştirme dalında)

### İyileştirmeler

- **Dashboard yatay taşma sıfırlandı**: grid track'lere `minWidth: 0`, `BlokMatrisi` dış sarmalayıcı `maxWidth: 100%` — masaüstü ve 480px mobil ölçümlerinde taşma 0.
- **401 konsol gürültüsü bitti**: offline yoklaması `GET /rest/v1/` yerine `GET /auth/v1/health` + `apikey` kullanıyor; gizliyken 60 sn'de bir ölçer.
- **Raporlar delta senkron**: açılışta yalnızca `created_at` üstü yeni kayıtlar çekilir (4500+ kayıtlık tek-çekim yükü kalktı); tam senkron 6 saatte bir ve "🔄 Yenile" düğmesiyle yapılır.
- **Erişilebilirlik (Lighthouse a11y 1.0)**: kontrast token'ları (`--text-danger/info/success/brand`, koyu `--on-accent`), erişilebilir `StatusBadge` renkleri, `BlokMatrisi` hücre metinleri tema-bağımsız, Dashboard bölüm başlıkları `h3→h2`, mobil içerik `<main>` çatısına alındı. Açık + koyu temada 0 başarısız denetim.
- **Login kişi listbox'ı**: arama kutulu, `role="option"` listbox; seçim ✓ işaretiyle gösterilir.
- **İskelet yükleme + SEO**: `SkeletonKart` (Dashboard/ReportList), `public/robots.txt`, `index.html` meta description.

### Testler

- Birim 92/92 · lint 0 · `tsc -b` 0 · browser smoke **17/17** şef + **17/17** PM · Lighthouse a11y/best-practices/SEO **1.0**.

## [1.1.54] - 2026-10-08

### İyileştirmeler

- Kullanıcı oluşturmadaki **"Geçici Şifre" alanı ve "Şifre Sıfırla" kaldırıldı**: hesaplar ortak giriş şifresiyle otomatik açılır; farklı şifreyle açılan hesap sessiz girişte takılıyordu.
- Mobil alt çubuktaki **"Rapor" düğmesi yüzen FAB yerine çubuğun ortasına alındı** — artık kaydırırken yazının üstünü kapatmıyor; içerik alt boşluğu 160px → 96px'e düştü.

### Android

- Release paketleri imzalı olarak derlendi: **APK** `app-release.apk` (1.51 MB, versionCode 54) ve **AAB** `app-release.aab` (1.96 MB, versionCode 53).

## [1.1.53] - 2026-10-07

### İyileştirmeler

- Girişte **şifre alanı kaldırıldı**: seçilen hesapla ortak şifre arka planda sessiz oturum açar (geçici düzen — `VITE_DEFAULT_PASSWORD` pakete gömülür, bkz. `TAKIP.md`).
- Ayarlar sayfasında "Oturum / Çıkış Yap" kartı en üste taşındı.
- Alt navigasyon ve yüzen "Rapor" FAB'ının altında kalan içerik için alt boşluk artırıldı — sayfa sonundaki butonlar artık örtüşmüyor.

### Testler

- Browser smoke testi: çıkış adımı Profil sayfası üzerinden yürütülüyor (Ayarlar'daki çıkış yalnızca PM'e açık) — 17/17 adım geçiyor.

## [1.1.52] - 2026-09-08

### İyileştirmeler

- Saha ilerlemesi hakediş pursantaj ağırlıklarına bağlandı; her adanın pursantaj toplamı %100 doğrulanıp gerekirse normalize ediliyor (`scripts/build-config.mjs`, yeni `scripts/validate-config.mjs`).
- Dashboard, ada kartı, ada detay ve istatistik ekranlarındaki ilerleme yüzdeleri bu hesaba göre güncellendi.

## [1.1.51] - 2026-09-08

### Yeni özellikler

- **WhatsApp saha sohbetinden rapor üretimi**: yeni `scripts/chat-rapor.mjs`, sohbetlerdeki ada/blok/imalat/durum bilgisini saha raporlarına çevirir ve mevcut veriyle birleştirir.
- `scripts/hakedis-oku.mjs`: hakedisNo/kaynak dosya adından türetiliyor; 10. hakediş `pursantaj.json` + `hakedis.json` olarak üretildi.

### Veri

- Güneyşehir 10. hakediş verisi config'e işlendi; `kalem_grup_eslesme` güncellendi.
- `data/saha_raporlari.json` chat verisiyle güncellendi (1558 → 2947 rapor).

## [1.1.48] - 2026-09-07

### İyileştirmeler

- Tema seçimi Ayarlar sayfasına taşındı, çıkış da Ayarlar'a alındı (`TemaSecici` bileşeni).
- Alt navigasyon FAB'ı bar üzerinde ortalanmış "yüzen pill" olarak düzenlendi, çakışım giderildi.
- Rapor listesi buton düzenlemeleri.

## [1.1.42] - 2026-09-06

### Yeni özellikler

- Saha yazışmalarından üretilen gerçekçi rapor seti (`data/saha_raporlari.json`) ve aktarım script'leri (`scripts/saha-aktar.mjs`, `scripts/saha-dogrula.mjs`).

### İyileştirmeler

- `scripts/durum_aktar.mjs` açıklama metni tarih bağımsız hale getirildi.

### Hata düzeltmeleri

- Sunucudan silinen raporlar offline cihazda yeniden "diriliyordu"; tam senkronizasyonda bekleyen (yüklenecek) ve daha önce sunucuda görüp silinmiş raporlar artık ayrıştırılıyor, son başarılı senkronizasyondaki sunucu id özeti localStorage'da saklanıyor.

## [1.1.40] - 2026-09-06

### Yeni özellikler

- Yeni **Hakediş** sayfası: uygulama ilerlemesi ile resmi pursantaj karşılaştırması ve kalem düzenleme.
- Raporlara **fotoğraf ekleme** (Supabase Storage, thumbnail önizlemeli).
- Rapor **onay/red akışı**: revizyon notu, onay durumu filtreleri ve sayfalama.
- Toplu rapor girişinde bildirimler 15 sn kuyrukta birleşir, tek özet bildirim gönderilir.

### İyileştirmeler

- Recharts kaldırıldı; grafikler el yapımı SVG bileşenlere (`BarChart`, `DonutChart`, `TrendChart`, `GroupedBarChart`) taşındı — daha hızlı ve küçük boyut.
- Rapor şablonu: açıklama zorunluluğu ve varsayılan açıklama metni ayarları.

### Hata düzeltmeleri

- Rapor düzenlemede blok/ada-geneli seçimi doldurulmuyordu — "Güncelle" butonu kilitli kalıyordu.
- Android geri tuşu yalnızca uygulamadan çıkıyordu; artık SPA içinde geri, ana sayfada çıkış yapıyor.
- Çevrimdışı durum bandı Android WebView'da gösterilmiyordu; aktif sunucu yoklamasıyla düzeltildi.
- Bildirim izni yokken `LocalNotifications` hataları sessizce yutuluyor.

## [1.1.34] - 2026-09-03

### Altyapı

- Android Gradle eklentisi 8.13.0'dan 9.0.1'e yükseltildi (Play Console uyarısı için).
- Gradle Wrapper 8.14.3'ten 9.1.0'a yükseltildi (AGP 9'un zorunlu minimumu).
- R8 optimize kaynak küçültme etkinleştirildi
  (`android.r8.optimizedResourceShrinking=true`); kullanılmayan kaynaklar
  daha agresif kaldırılıyor, uygulama boyutu küçüldü.
- `bundleRelease` ile doğrulandı; ek workaround gerekmedi
  (Capacitor 8 plugin'leri zaten `proguard-android-optimize.txt` kullanıyor).

### Kullanıcıya yansıyan

- Uygulama boyutu küçültüldü, açılış performansı iyileştirildi.
- Kararlılık iyileştirmeleri.
