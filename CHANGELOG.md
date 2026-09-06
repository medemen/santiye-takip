# Değişiklik Notları

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
