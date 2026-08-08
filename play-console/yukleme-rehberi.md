# Play Console Yükleme Rehberi — Güneyşehir Takip

Bu rehber, imzalı `.aab` dosyasını Google Play Console'a (Internal testing
parkuru) adım adım yüklemek için yazıldı. Kopyala-yapıştır metinler ve
dosya yolları hazırdır.

## Üretilen paket

| Alan | Değer |
|---|---|
| Paket (applicationId) | `com.santiyem.app` |
| Uygulama adı | Güneyşehir Takip |
| Sürüm | 1.1.11 (versionCode 13) |
| AAB dosyası | `android/app/build/outputs/bundle/release/app-release.aab` |
| Keystore | `android/app/release-keystore.jks` |
| Key alias | `santiye_takip` |
| Keystore / key parolası | `santiyetakip` |
| İmza SHA-256 | `66:DE:4F:C6:90:C8:E4:86:70:B1:E6:4C:B5:7A:F2:B5:BC:2F:33:1C:8F:30:74:12:B2:AB:02:5A:C0:DC:A6:D6` |
| Gizlilik politikası URL | `https://medemen.github.io/santiye-takip/gizlilik-politikasi.html` |

> **⚠️ Kritik:** Keystore ve parolaları kaybederseniz uygulamayı bir daha
> güncelleyemezsiniz. `release-keystore.jks` dosyasını ve bu parolaları
> güvenli bir yere (şifreli yedek) saklayın. Dosya `.gitignore` ile zaten
> repoya gitmez.

---

## Adım 1 — Uygulamayı oluştur

1. https://play.google.com/console adresine gidin, developer hesabınızla oturum açın.
2. **Create app** düğmesine tıklayın.
3. Formu doldurun:
   - **App name:** `Güneyşehir Takip`
   - **Default language:** Türkçe (Türkiye) — `tr-TR`
   - **App or game:** Uygulama
   - **Free or paid:** Ücretsiz
4. İnternet siteniz, uygulamanız hakkında (isteğe bağlı) alanlarını boş bırakabilirsiniz.
5. **Create app** ile kaydedin.

---

## Adım 2 — Play App Signing (app imzalama)

Play Console, uygulamanızı kendi anahtarıyla yeniden imzalar (Play App Signing).
İlk yüklemede **upload key** belirlemeniz istenir:

1. Sol menüden **Setup → App signing** bölümüne gidin.
2. **Export and upload a key from a Java keystore** seçeneğini seçin.
3. **Release-keystore.jks** dosyasını yükleyin: `android/app/release-keystore.jks`
   (veya `keytool -exportcert ...` ile ürettiğiniz `.pem` sertifikayı yükleyin).
4. İstenirse alanları doldurun:
   - **Keystore password:** `santiyetakip`
   - **Key alias:** `santiye_takip`
   - **Key password:** `santiyetakip`
5. Kaydedin. (Alternatif: "Create a new upload key" seçip Google'ın ürettiği
   `.pem` dosyasını indirin ve saklayın.)

---

## Adım 3 — Mağaza kaydı (Store listing)

1. Sol menüden **Grow → Store presence → Main store listing** bölümüne girin.
2. Metinleri `play-console/magaza-listesi.md` dosyasındaki bölümlerden
   kopyala-yapıştır yapın:
   - **Kısa açıklama** → madde 2 → "Kısa açıklama" (80 karakter sınırı)
   - **Tam açıklama** → madde 2 → "Tam açıklama" (4000 karakter sınırı)
3. Görselleri yükleyin (madde 3'teki tablo):
   - **Uygulama simgesi:** `public/icon-512.png`
   - **Öne çıkan görsel:** `play-console/feature-graphic.png`
   - **Telefon ekran görüntüleri:** `screenshots/01-dashboard.png` … `08-istatistik.png`
   - **Tablet (10") görüntüleri:** `screenshots/tablet10/01-dashboard.png` …
4. **Uygulama kategorisi:** İş
5. **Gizlilik politikası URL:** `https://medemen.github.io/santiye-takip/gizlilik-politikasi.html`
6. **Kaydet** (Save).

---

## Adım 4 — İçerik derecelendirme (Content rating)

1. Sol menüden **Policy → App content** bölümüne girin.
2. **Content rating** satırında **Start** deyin, anketi doldurun:
   - Şiddet: yok · Argo/kaba mizah: yok · Uyuşturucu/alkol: yok ·
     Cinsellik: yok · Kumar: yok · Kullanıcı üretimi içerik: iş aracı
     (raporlar, personel içindir — herkese açık paylaşım yok)
   - Sonuç: **Everyone / Herkes** beklenir.
3. E-posta adresini doğrulayıp gönderin.

---

## Adım 5 — Data safety ve izinler

1. Aynı **Policy → App content** sayfasında **Data safety** formunu doldurun:
   - Uygulama bu verileri toplar: ad-soyad, rol, e-posta (kurumsal),
     rapor içerikleri, cihaz bildirim izni.
   - Bu veriler **sunucuda** (Supabase) ve **cihazda** saklanır;
     satıcıyla paylaşılmaz, pazarlama amaçlı kullanılmaz.
2. **Permissions** listesinde (soldan okunur) şu izinler görünür — formda
    doğru şekilde beyan edin:
   - `INTERNET` — Supabase senkronizasyonu (normal kullanım)
   - `POST_NOTIFICATIONS` — geciken hedef bildirimleri (normal kullanım)
   - `SCHEDULE_EXACT_ALARM` — günlük özet bildirim zamanlaması
   - `RECEIVE_BOOT_COMPLETED` — cihaz yeniden başlayınca bildirim planlama

---

## Adım 6 — AAB'yi yükleme (Internal testing)

1. Sol menüden **Testing → Internal testing** bölümüne gidin.
2. **Create new release** düğmesine tıklayın.
3. **Upload your first AAB** alanına şu dosyayı sürükleyip bırakın:
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```
4. Sürüm notlarını ("Release notes") girin, ör.:
   ```
   İlk sürüm: ada/blok bazlı rapor takibi, hedef takvimi, bildirimler,
   Excel/PDF dışa aktarma.
   ```
5. **Save**, ardından **Review release** → **Start rollout to Internal testing**.
6. **Testers** sekmesinde e-posta listesi oluşturun (saha ekibi e-postaları),
   kişileri ekleyin ve kaydedin.
7. Test kullanıcıları Play Store'daki "test yolu" bağlantısını kullanarak
   uygulamayı kurar.

---

## Sorun giderme

- **"Version code is already used"** → versionCode yalnızca yeni bir derleme
  sonrası artar. Bir önceki derlemeyi Play Console'da yayınlamadıysanız
  sürüm numarasını elle arttırıp yeniden `gradlew bundleRelease` çalıştırın.
- **Sertifika zinciri uyarısı** (jarsigner'da PKIX) → normaldir; yerel üretim
  keystore'u self-signed'dır. Play Console kendi anahtarıyla yeniden imzalar.
- **AAB boyutu çok büyük** → sorun değil; Play 150 MB AAB sınırı, bu paket ~2 MB.
- **Gizlilik politikası URL'si açılmıyor** → GitHub Pages'in etkin olduğundan
  ve deploy workflow'unun başarılı olduğundan emin olun (aşağıya bakın).

---

## Yayın öncesi GitHub Pages kontrolü

Gizlilik politikasının yayında olması için:

1. Repo **Settings → Pages** → **Source: GitHub Actions** seçin.
2. Repo **Settings → Secrets and variables → Actions**'a ekleyin:
   - `VITE_SUPABASE_URL` → `.env.production` dosyasındaki URL
   - `VITE_SUPABASE_ANON_KEY` → `.env.production` dosyasındaki anahtar
3. Bu iki secret eklenince `master`'a push ettiğinizde veya
   **Actions** sekmesinden **Deploy to GitHub Pages** işini elle çalıştırın.
4. Adres doğrulama: `https://medemen.github.io/santiye-takip/gizlilik-politikasi.html`
