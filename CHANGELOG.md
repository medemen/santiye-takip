# Değişiklik Notları

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
