# Play Console Mağaza Kaydı — Güneyşehir Takip

Bu dosya, Play Console'daki "Mağaza kaydı" (Store listing) formuna
kopyala-yapıştır yapılacak metinleri ve teslim edilecek görselleri
tek yerde toplar. Uygulama `data/santiye.config.json` üzerinden
markalandığı için (bkz. `marka.appName`), bu metinler o anda aktif
olan **Güneyşehir Takip / com.santiyem.app** dağıtımı içindir. Başka
bir şantiye için yayınlanırsa (`npm run new:santiye`), bu dosya o
şantiyenin `genel`/`marka` bilgilerine göre güncellenmelidir.

---

## 1. Uygulama kimliği

| Alan | Değer |
|---|---|
| Paket adı (applicationId) | `com.santiyem.app` |
| Uygulama adı | Güneyşehir Takip |
| Sürüm | `android/app/version.properties`'ten okunur — her `assemble*`/`bundle*` (apk/aab) görevinde otomatik artar, elle güncellenmez |
| Kategori | İş (Business) — alternatif: Üretkenlik |
| Uygulama türü | Uygulama (Game değil) |
| Ücretsiz / Ücretli | Ücretsiz |
| Reklam içeriyor mu | Hayır |
| Uygulama içi satın alma | Hayır |

---

## 2. Metin alanları

### Kısa açıklama (max 80 karakter)
```
Şahinbey Güneyşehir şantiyesi saha rapor ve ilerleme takip uygulaması
```
*(70 karakter — sınırın altında)*

### Tam açıklama (max 4000 karakter)
```
Güneyşehir Takip, Şahinbey Belediyesi Güneyşehir Toplu Konutları Yapım
İşi kapsamında saha ekibinin günlük ilerleme raporlarını kaydettiği ve
proje yönetiminin şantiye genelinde ilerlemeyi tek ekrandan takip
ettiği bir saha yönetim uygulamasıdır.

ÖZELLİKLER

• Ada / Blok / İş Kalemi bazlı ilerleme takibi
  Her adadaki her blok için iş kalemi bazında durum (planlandı, devam
  ediyor, tamamlandı, gecikme) ve yüzde ilerleme kaydedilir. Ada geneli
  raporlama ile tek kayıtla tüm bloklar güncellenebilir.

• Hedef Takvimi
  İş kalemlerine hedef tarih atanır, takvim görünümünde gecikmeler ve
  yaklaşan hedefler tek bakışta görülür.

• Rol bazlı yetkilendirme
  Saha personeli yalnızca kendi atandığı ada/bloklara rapor girer;
  şantiye şefleri kendi adalarını, proje müdürü tüm şantiyeyi yönetir.

• Gerçek zamanlı senkronizasyon
  Saha personeli, şantiye şefleri ve proje müdürü aynı verileri anlık
  olarak görür; çevrimdışı girilen raporlar bağlantı gelince sunucuya
  aktarılır.

• Raporlama ve dışa aktarma
  Rapor listesi filtrelenebilir, Excel ve PDF olarak dışa aktarılabilir.

• Bildirimler
  Geciken veya bugün teslim tarihi gelen iş kalemleri için anlık ve
  günlük özet bildirimleri.

• Toplu rapor girişi
  Birden fazla blok için tek seferde aynı iş kalemi raporu girilebilir.

Bu uygulama Şahinbey Belediyesi Güneyşehir Toplu Konutları Yapım İşi
saha ekibi ve proje yönetimi için geliştirilmiştir.
```
*(≈1450 karakter — sınırın oldukça altında, istersen genişletilebilir)*

### Sürüm notları / "Yeniliklerin neler olduğu" (ilk sürüm için opsiyonel)
```
İlk sürüm: ada/blok bazlı rapor takibi, hedef takvimi, bildirimler,
Excel/PDF dışa aktarma.
```

---

## 3. Grafik varlıklar

| Varlık | Gereksinim | Durum |
|---|---|---|
| Uygulama simgesi | 512×512 PNG, 32-bit, şeffaflık yok | ✅ `public/icon-512.png` |
| Öne çıkan görsel (feature graphic) | 1024×500 JPG/PNG | ✅ `play-console/feature-graphic.png` |
| Telefon ekran görüntüleri | 2–8 adet, 16:9 veya 9:16 | ✅ `screenshots/` (tam 8 görsel — giriş ekranı `screenshots/ekstra/09-giris.png`'e taşındı) |
| 10" tablet ekran görüntüleri | 2–8 adet | ✅ `screenshots/tablet10/` (8 görsel) |
| 7" tablet ekran görüntüleri | Play artık zorunlu tutmuyor | — atlanabilir |

`play-console/feature-graphic.png`, `scripts/generate-feature-graphic.py`
ile `scripts/generate-icons.py` içindeki vinç görselini ve marka
renklerini yeniden kullanarak üretildi; `data/santiye.config.json`
içindeki `marka.appName` değerini otomatik okur (başka bir şantiye
için yeniden markalanırsa script'i tekrar çalıştırmak yeterli:
`python scripts/generate-feature-graphic.py`).

---

## 4. Gizlilik politikası

Metin hazır: [`public/gizlilik-politikasi.html`](../public/gizlilik-politikasi.html)
— toplanan veriler (ad-soyad/rol, otomatik oluşturulan kurumsal
e-posta, rapor içerikleri, bildirim izni), saklama (cihaz + Supabase,
RLS ile sınırlı erişim), KVKK kapsamında haklar ve iletişim
bölümlerini içeriyor.

**Yapılması gereken tek şey:** sayfa `public/` altında olduğu için
uygulama bir alan adına deploy edildiğinde otomatik olarak
`https://<alan-adiniz>/gizlilik-politikasi.html` adresinden erişilebilir
olacak. Deploy edilmeden Play Console'a URL girilemez — bu nedenle:

- [ ] Uygulamayı bir alan adına/hosting'e deploy et (ör. Vercel/Netlify
      veya mevcut `start-and-ngrok.ps1` yerine kalıcı bir barındırma)
- [ ] Sayfadaki iki yer tutucuyu doldur: veri silme talepleri için
      iletişim e-postası, genel iletişim e-postası
- [ ] Ortaya çıkan URL'yi Play Console mağaza kaydı formundaki
      "Gizlilik Politikası" alanına yapıştır

## 5. İçerik derecelendirmesi (Content rating) anket notları

Uygulama şiddet, kullanıcı üretimi genel içerik paylaşımı, reklam
veya gerçek para işlemi içermiyor → anket "Herkes / Everyone" ile
sonuçlanmalı. Anketi Play Console üzerinden doldurmak gerekiyor
(bu dosyadan otomatik doldurulamaz).

## 6. Dağıtım kapsamı önerisi

Bu, halka açık bir tüketici uygulaması değil; Şahinbey Belediyesi
Güneyşehir şantiyesi saha ekibine özel bir iç araç. Play Console'da
**Production (herkese açık)** yerine **Closed testing / Internal
testing** parkurunu ve e-posta listesiyle kısıtlı erişim seçmek daha
uygun olabilir — bu, listelemenin Play Store aramasında görünmesini
de engeller.

---

## Sonraki adımlar (kontrol listesi)

- [x] Feature graphic (1024×500) oluştur → `play-console/feature-graphic.png`
- [x] Telefon ekran görüntülerini 8'e indir → `screenshots/`
- [x] Gizlilik politikası metnini yaz → `public/gizlilik-politikasi.html`
- [x] Gizlilik politikasındaki iletişim e-postası yer tutucularını doldur (medemen@gmail.com)
- [ ] Gizlilik politikası sayfasını deploy et (GitHub Pages — remote/Pages etkinleştirme), URL'yi Play Console'a ekle
- [ ] Play Console'da içerik derecelendirme anketini doldur (bu dosyadan otomatik doldurulamaz)
- [ ] Dağıtım track'ini seç (Internal / Closed / Production)
- [x] İmzalı **release** paketini derle → `android/app/build/outputs/bundle/release/app-release.aab`
      (Play Console artık `.apk` değil `.aab` — Android App Bundle — bekliyor; bu dosya doğrudan yüklenebilir)
- [x] Son kodla (perf optimizasyonları dahil) release paketini yeniden derle → v1.1.11 / code 13 (09.08.2026)
