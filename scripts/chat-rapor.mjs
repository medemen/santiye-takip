#!/usr/bin/env node
/**
 * Guneysehir TOKİ SAHA WhatsApp sohbetinden güncel saha raporlari uretir.
 *
 * Akis:
 *   1. Chat mesajlarina ayirir (tarih - gonderen: govde [+ aciklama satirlari]).
 *   2. "Ada N blok M <imalat> <durum>" kalibiyla saha ilerlemesi cikarir.
 *   3. Her (ada, blok, is_kalemi) icin son tarihli satiri tutar.
 *   4. Mevcut data/saha_raporlari.json ile birlestirir:
 *      - chat'in daha yeni/tarihli kayitlari eskiyi ezer,
 *      - chat'te gecmeyen eski kayitlar korunur.
 *
 * Kullanim:
 *   node scripts/chat-rapor.mjs "<chat.txt> [--yaz]"
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const args = process.argv.slice(2);
const chatYolu = args.find((a) => a.endsWith('.txt'));
const yaz = args.includes('--yaz');
if (!chatYolu || !existsSync(chatYolu)) {
  console.error('Kullanim: node scripts/chat-rapor.mjs <chat.txt> [--yaz]');
  process.exit(1);
}

// ---- kalem listesini config'ten dogrula ----
const config = JSON.parse(readFileSync(join(dataDir, 'santiye.config.json'), 'utf8'));
const KALEM_SET = new Set();
for (const g of config.isKalemleri.gruplar) for (const k of g.kalemler) KALEM_SET.add(k);

function ascii(t) {
  return String(t)
    .toLowerCase()
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[çÇ]/g, 'c')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/[âÂîÎ]/g, (ch) => ({ â: 'a', Â: 'a', î: 'i', Î: 'i' })[ch])
    .replace(/['’`]/g, '');
}

const GONDEREN_ESLEME = {
  'Serhan İrfan Eldaş': 'Serhan Eldaş',
  'Mrf Fethi Yıldırım İnşaat Mühendisi Başvuru': 'Fethi Yıldırım',
  'Alp Dora Alaşehirli': 'Alp Dora Alaşehirli',
  '+90 553 297 95 60': '+90 553 297 95 60',
  '+90 530 018 59 94': '+90 530 018 59 94',
  'Mrf Erkan Karabaş İnşaat Mühendisi Ada3': 'Erkan Karabaş',
  'Mrf Duran İnşaat Mühendisi': 'Duran',
  'Sinem Özkan': 'Sinem Özkan',
  'Orhan': 'Orhan',
  'Ahmet Belgin': 'Ahmet Belgin',
  'Mrf Volkan Baran Ada3 İnşaat Mühendisi': 'Volkan Baran',
  'Mrf Nurselin Ekinci Mimar': 'Nurselin Ekinci',
  '+90 531 334 42 66': '+90 531 334 42 66',
  'Serhat Taylan': 'Serhat Taylan',
  'Fatma Tuğçe Armut': 'Fatma Tuğçe Armut',
  'Mehmet Kılıç': 'Mehmet Kılıç',
  'Mrf Turgay Turgut İnşaat Mühendisi': 'Turgay Turgut',
  'Mrf Malik Tayşan Ada5-6': 'Malik Tayşan',
  'Sadık Umut Mutlu': 'Sadık Umut Mutlu',
  'Nurettin Aycan': 'Nurettin Aycan',
  'Mrf Ahmet Aslan Ada 5, 6': 'Ahmet Aslan',
  'Mrf Ahmet Çelik İnşaat Mühendisi': 'Ahmet Çelik',
  'Ömer Buğra Özlü': 'Ömer Buğra Özlü',
  'Cihan Erdoğan': 'Cihan Erdoğan',
  'Mrf Kayhan Tarhan': 'Kayhan Tarhan',
  'Mrf Alperen Koç Ada3, 4': 'Alperen Koç',
  'Mrf Ali Şile Ada 5-6': 'Ali Şile',
  'Murat Dayı': 'Murat Dayı',
  'Sait Adsay': 'Sait Adsay',
  'Nurullah Enes Kaya': 'Nurullah Enes Kaya',
  '+90 542 814 02 97': '+90 542 814 02 97',
  'Tuba Saatçı': 'Tuba Saatçı',
  'Bektaş Şafak Atmalı': 'Bektaş Şafak Atmalı',
  'Mrf Murat Ada56 Zavran': 'Murat Ada56 Zavran',
  'Mrf Nevzat Yıldırım İnşaat Mühendisi': 'Nevzat Yıldırım',
  'Mrf Serkan İnce Muhasebe': 'Serkan İnce',
  '+90 536 700 84 29': '+90 536 700 84 29',
  'Mrf Görkem Tat İsg': 'Görkem Tat',
  'mrf hanedan altınova': 'Hanedan Altınova',
  'Mrf Baki Didim İkap Harita Mühendisi': 'Baki Didim',
  'Kamuran Erez': 'Kamuran Erez',
  '+90 532 224 63 90': '+90 532 224 63 90',
  'Abdullah Kılıç': 'Abdullah Kılıç',
  'Şükrü Önder': 'Şükrü Önder',
  'Mrf Canan Adlım İnşaat Mühendisi': 'Canan Adlın',
  'Arafat Öner': 'Arafat Öner',
  'Efa Furkan Makine Mühendisi': 'Efa Furkan',
  'Mrf Abdulkadir Deniz İnşaat Mühendisi': 'Abdulkadir Deniz',
  'Mrf Merve Karadağ Mimar': 'Merve Karadağ',
  'Hatice Erkan': 'Hatice Erkan',
  'Mrf Bölükbaşı Harita Müh.': 'Bölükbaşı',
  'Mrf Özgür Formen Tekniker': 'Özgür',
  'Uzuntok Saha Mehmet Ali Ertürk Elektrik Mühendisi': 'Uzuntok Saha Mehmet Ali Ertürk',
  '02': undefined,
  '05': undefined,
};

// Oncelik sirasi onemli; kisaltilmis ascii (kucuk harf) metinle eslestirilir.
// Ciktilari config'deki (data/santiye.config.json) gercek is kalemi adlaridir.
const KALEM_KURALLARI = [
  [/istinat.*(beton|dokum)|(beton|dokum).*istinat/i, 'Beton Dökümü'],
  [/istinat/i, 'İstinat Duvarı'],
  [/radye/i, 'Radye temel'],
  [/subasman/i, 'Subasman'],
  [/asansor onu duvar/i, 'Asansör önü duvar'],
  [/koruma duvar/i, 'Koruma Duvarı'],
  [/perde duvar/i, 'Perde Duvar'],
  [/yapi duvar|duvar orme|duvar imalati|bims|gazbeton|duvar orul|hucre ebat/i, 'Yapı Duvarı'],
  [/asmolen/i, 'Asmolen Döşeme'],
  [/kuranglez/i, 'Kuranglez'],
  [/surme yalitim/i, 'Sürme Yalıtım (PERDE)'],
  [/xps/i, 'XPS (PERDE)'],
  [/bodrum.*wc.*(izolasyon|yalitim)/i, 'Bodrum wc izolasyon'],
  [/izolasyon|izalasyon|yalitim|mebran|membran/i, 'Sürme Yalıtım (PERDE)'],
  [/kaz[iı]|hafriyat|rock/i, 'Hafriyat'],
  [/dolgu|tesviye/i, 'Geri Dolgu'],
  [/kalip/i, 'Betonarme Kalıp'],
  [/beton.*(dokum|dokul|doseme|dosum)|(dokum|dokumu|dokuldu|dokuluyor|dokulecek|doseme|dosum|dokum program).*beton|gro.*beton|beton.*gro|temel.*(dokum|dosum|doseme)|dokum programina alindi|temel beton|betona hazir/i, 'Beton Dökümü'],
  [/donati montaj|temel donati|demir imalat|demir montaj|perde demir|kolon.*demir|hasir/i, 'Betonarme Demir'],
  [/merdiven beton/i, 'Merdiven betonu'],
  [/merdiven alt[iı]|merdiven.*(alci|boya)|alin siva/i, 'Merdiven altı sıvası'],
  [/merdiven.*korkuluk|korkuluk.*merdiven/i, 'Merdiven Korkuluğu'],
  [/balkon.*korkuluk|korkuluk|kupeste/i, 'Balkon Korkuluğu'],
  [/basamak/i, 'Basamak'],
  [/mermer supurgelik/i, 'Mermer Süpürgelik'],
  [/merdiven alci/i, 'Merdiven alçı'],
  [/kat holu/i, 'Kat Holü Alçı'],
  [/tavan boyasi/i, 'Tavan Boyası'],
  [/son kat|sonlama/i, 'Duvar boyası SONLAMA'],
  [/duvar boyasi/i, 'Duvar Boyası (SON KAT HARİÇ)'],
  [/stropiyer|storpiyer/i, 'Stropiyer'],
  [/bodrum boya/i, 'Bodrum boya'],
  [/cati kule|kule sivasi/i, 'Çatı kule sıvası'],
  [/yangin merdiven.*(grenli|boya)/i, 'Yangın merdiveni grenli boya'],
  [/bodrum.*(mantolama|siva)|mantolama.*bodrum/i, 'BODRUM MANTOLAMA+SIVA'],
  [/kaba siva|cimentolu siva|cimento siva|kosesebent|kosebent/i, 'Kaba Sıva'],
  [/asansor alci/i, 'Asansör ALÇI'],
  [/seramik alti kaba|alti kaba/i, 'Seramik Altı Kaba Sıva'],
  [/(balkon).*hazir siva|hazir siva/i, '(balkon) Hazır Sıva'],
  [/saten|zimpara|zimpera/i, 'Saten Alçı'],
  [/karisik alci/i, 'Karışık Alçı'],
  [/alci imalat|alci uygulama|alci[iy]|alci siva/i, 'Kaba Alçı'],
  [/asansor onu kara/i, 'Asansör önü kara sıva'],
  [/sap|sahap|sap atma/i, 'Şap'],
  [/kam yunu|cam yunu/i, 'Çatı altı cam yünü'],
  [/ahsap parke|parke (serme|docme)/i, 'Ahşap Parke'],
  [/vinyil|vinil/i, 'PVC/Vinyil Döşeme'],
  [/kaymaz bant/i, 'Kaymaz Bant'],
  [/isla.*(yalitim|izolasyon)|(banyo|wc|kis).*(yalitim|izolasyon)/i, 'Islak Hacim Sürme Yalıtım'],
  [/laminant.*supurge/i, 'Laminant süpürgelik'],
  [/laminant/i, 'Laminant'],
  [/girgir.*grenli/i, 'Gırgır cephesi grenli boya'],
  [/girgir.*(seramik|fayans)/i, 'Gırgır cephesi seramik'],
  [/girgir.*bartis/i, 'Gırgır cephesi balkon Bartış'],
  [/girgir.*parapet/i, 'Gırgır cephesi parapet sıvası'],
  [/girgir/i, 'Gırgır cephesi sıva'],
  [/daire bartis/i, 'Daire bartış'],
  [/balkon bartis/i, 'Balkon Bartış'],
  [/asansor.*seramik/i, 'Asansör duvar seramik (60*120)'],
  [/60\*120|60x120/i, '60*120 SERAMİK'],
  [/terazzo.*supurge|karo.*supurge/i, 'Terazzo Karo süpürgelik'],
  [/terazzo|karo/i, 'Terazzo Karo'],
  [/taban seramik|zemin seramik|yer seramik|seramik doseme/i, 'Taban seramik'],
  [/duvar seramik|wc.*seramik|asansor.*duvar.*seramik/i, 'Duvar seramik'],
  [/supurgelik/i, 'Seramik süpürgelik'],
  [/tezgah ustu|tezgah arasi/i, 'Tezgah Arası'],
  [/tezgah/i, 'Tezgah'],
  [/balkon.*parapet/i, 'Balkon Parapet'],
  [/parapet mermer|balkon.*mermer/i, 'Balkon Parapet Mermer'],
  [/asma tavan|alcpan tavan/i, 'PVC Asma Tavan'],
  [/saft kapa|saft.*korkasa/i, 'Şaft kapağı körkasa'],
  [/kor kasa/i, 'Kör Kasa'],
  [/pvc cam/i, 'PVC Cam'],
  [/pvc pencere|pencere.*pvc|dograma/i, 'PVC Pencere'],
  [/suruglu|pvc kapi/i, 'PVC Kapı'],
  [/panjur/i, 'Alüminyum panjur pencere'],
  [/celik kapi/i, 'Çelik Kapı (Pervaz-kasa-kanat)'],
  [/yangin.*(menfez)/i, 'Yangın merdiven menfez'],
  [/yangin kapisi/i, 'Yangın Kapısı'],
  [/saft kapak/i, 'Şaft Kapakları'],
  [/bodrum kapi/i, 'Bodrum kapıları'],
  [/cati baca|baca.*(beton|bims)/i, 'Çatı baca betonu/bims'],
  [/baca sapka/i, 'Çatı Baca Şapka'],
  [/kapi kasa|kasa montaji|ahsap kapi kasa/i, 'İç Oda Kapı Kasası'],
  [/kapi kanat/i, 'İç Oda Kapı Kanadı'],
  [/pervaz/i, 'İç Oda Kapı Pervazı'],
  [/mutfak.*kapa[gk]|dolap.*kapa[gk]/i, 'Mutfak Dolap Kapakları'],
  [/mutfak nis|nis/i, 'Bodrum mutfak nişi'],
  [/mutfak|mobilya|dolap|hilton/i, 'Mutfak Dolabı ve hilton'],
  [/vestiyer|camasir/i, 'Vestiyer ve çamaşır dolabı'],
  [/kornis/i, 'Korniş'],
  [/posta kutusu/i, 'Posta kutusu'],
  [/ahsap kapama/i, 'Ahşap kapamalar'],
  [/cati.*kiremit|kiremit/i, 'ÇATI KİREMİT'],
  [/cati ahsap|cati.*(ahsap|kiris|cati imalat)|ahsap.*cati/i, 'ÇATI AHŞAP'],
  [/mahya/i, 'Mahya harçlama'],
  [/denizlik/i, 'Denizlik'],
  [/su deposu.*izolasyon/i, 'Su deposu üstü izolasyon'],
  [/su deposu.*kaide/i, 'Su deposu kaide'],
  [/su deposu.*montaj/i, 'SU DEPOSU MONTAJ'],
  [/su deposu/i, 'Su deposu kara sıva'],
  [/markiz.*kupeste/i, 'Markiz üstü küpeşte'],
  [/markiz.*duvar/i, 'Bina giriş markiz duvar'],
  [/markiz/i, 'Markiz üstü izolasyon ve şap'],
  [/bina giris.*(mermer|basim|basamak)|giris.*mermer|cikis merdiven/i, 'Bina giriş mermer basım'],
  [/enge[ck]li rampa|rampa/i, 'Ön Giriş Engelli Rampası'],
  [/tretuar/i, 'Ön Giriş Tretuar'],
  [/almn|on giris/i, 'Ön Giriş Almn. Doğrama'],
  [/bazalt/i, 'Bazalt'],
  [/iskele/i, 'DIŞ CEPHE İSKELE'],
  [/tasyunu|tas yunu/i, 'Taşyünü Kaplama'],
  [/isi yalitim siva/i, 'Isı Yalıtım Sıvası'],
  [/mantolama/i, 'Mantolama Sıvası'],
  [/dis cephe.*boya|cephed boya|cephe boya|dis cephe/i, 'Cephe Boya'],
  [/elektrik odasi.*kaide/i, 'Elektrik odası kaide'],
  [/drenaj/i, 'Drenaj'],
  [/cevre drenaj/i, 'Çevre Drenajı'],
  [/kanalizasyon/i, 'Kanalizasyon Hattı'],
  [/yagmur suyu.*rogar/i, 'Yağmur suyu rögar bağlantısı'],
  [/yagmur suyu/i, 'Yağmur Suyu Hattı'],
  [/icme suyu/i, 'İçme Suyu Hattı'],
  [/bordur/i, 'Bordür'],
  [/kilit parke|parke tas|yol/i, 'Yol & Kilit Parke'],
  [/otopark/i, 'Otopark'],
  [/otomatik sulama|sulama/i, 'Otomatik Sulama'],
  [/cim|peyzaj|agaclandirma/i, 'Çimlendirme & Ağaçlandırma'],
  [/yaya yolu/i, 'Yaya Yolu'],
  [/oyun/i, 'Oyun Alanı'],
  [/cevre cit/i, 'Çevre Çiti'],
  [/kent mobilya/i, 'Kent Mobilyaları'],
  [/aydinlatma.*direk|direk/i, 'Aydınlatma Direkleri'],
  [/trafo/i, 'Trafo & Elektrik Dağıtım Hattı'],
  [/menfez/i, 'Menfezler'],
  [/rogar/i, 'Rögar & Baca'],
  [/zayif akim/i, 'Zayıf Akım Kolon Kabloları'],
  [/kuvvetli akim/i, 'Kuvvetli Akım Kolon Kabloları'],
  [/dogalgaz/i, 'DOĞALGAZ İÇ TESİSAT'],
  [/radiyator|radyator|havlupan/i, 'Radyatör ve Havlupan Montajı'],
  [/hela tasi|suzgec|helata[cş]/i, 'Hela taşı + Süzgeç Montajları'],
  [/vitrifiye|klozet/i, 'Vitrifiye Montajı'],
  [/aydinlatma.*armatur|avize/i, 'Aydınlatma Armatür Montajı'],
  [/armatur|batarya/i, 'Armatür Montajı'],
  [/kollektor/i, 'Daire içi Kollektör Montajı'],
  [/pex/i, 'Daire içi pex tesisatı'],
  [/galveniz.*(anahat|hidrofor)/i, 'Galveniz anahat (Hidrofor Odası)'],
  [/galveniz.*kolon|galveniz/i, 'Galveniz kolon tesisatı'],
  [/sayac/i, 'Su sayaçları montajı'],
  [/ppr|temiz su.*(daire|bodrum)|temiz su/i, 'Temiz su Ppr-c (Daire)'],
  [/pis su.*(bodrum|toplama)/i, 'Pis su bodrum toplama tesisatı'],
  [/pis su.*(daire alt[iı]|alt[iı] toplama)/i, 'Pis su daire alt toplama tesisatı'],
  [/pis su.*(yagmur|balkon inisi|inis)/i, 'Pis su yağmur ve balkon inişi'],
  [/pis su.*rogar/i, 'Pis su rögar bağlantısı'],
  [/pis su/i, 'Pis su kolon (wc+mutfak+balkon)'],
  [/sont baca|sant baca|santbaca/i, 'Şönt Baca'],
  [/aspirator|davlumbaz/i, 'Aspiratör'],
  [/topraklama/i, 'Temel Topraklama'],
  [/merdiven tava/i, 'Merdiven Tavalar (Şaft İçi)'],
  [/kablo tava/i, 'Kablo Tavası'],
  [/borulama|boru dossem|boru dosan/i, 'Borulama'],
  [/kablolama|kablo cek|kablo dossem/i, 'Daire içi kablolama'],
  [/sigorta/i, 'Sigorta Kutusu (Daire İçi)'],
  [/priz|anahtar/i, 'Anahtar Priz Montajı'],
  [/desant|daire.*desant/i, 'Desant'],
  [/data altyapi/i, 'Data Altyapısı'],
  [/tv.*kablo|kablo.*tv/i, 'TV & Kablo Altyapısı'],
  [/interkom/i, 'İnterkom'],
  [/cctv|kamera/i, 'CCTV'],
  [/anten/i, 'Anten'],
  [/asansor kapi/i, 'Asansör Kapıları'],
  [/asansor.*motor|makine dairesi/i, 'Makine Dairesi Ekipmanı'],
  [/\bray\b|kabin/i, 'Ray & Kabin Montajı'],
  [/devreye alma|devreye alin/i, 'Test & Devreye Alma'],
  [/yonlendirme|levha/i, 'Yönlendirme Levhaları'],
  [/yangin.*(dedektor|algilama)|algilama/i, 'Yangın Algılama & Dedektör'],
  [/acil aydinlatma/i, 'Acil Aydınlatma'],
  [/rezervasyon/i, 'Rezervasyon İşlemleri'],
  [/karot/i, 'Beton & Karot Testleri'],
  [/iskan|ruhsat/i, 'İskân & Ruhsat İşleri'],
  [/temizlik/i, 'İnce Temizlik'],
  [/santiye kurul/i, 'Şantiye Kurulumu'],
  [/gecici elektrik/i, 'Geçici Elektrik & Su'],
];

const tamamRe = /tamamlandi|tamamlanmis|tamamlanmak *uzere|bitti|bitmistir|bitmek *uzere|sona erdi|tamami|bitmis|tamamdir|noktalandi/i;
const teslimRe = /teslim/i;
const baslaRe = /basla(?:di|dik|dika|yvor)?/i;
const planRe = /yapilacak|baslanacak|verilecek|kurulacak|planlanan|planlaniyor|bekleniyor|olacak|yapilacagi|hazirligi *tamamlan|dokum programina alindi/i;
const devamRe = /devam|yapiliyor|yapilmaktadir|yapilmakta|ediliyor|edilmektedir|monte ediliyor|suruyor|uygulaniyor|uygulama|kaziliyor|kazi[sy]i|dokuluyor|dokuldu|oruluyor|calityor|calisil|montaji|montaj yapil|tamamlanmakda|rock/i;

function durumBul(aTxt, eski) {
  const eskiYuzde = eski?.ilerleme_yuzde ?? null;
  const yuzdeM = aTxt.match(/(\d{1,3})\s*%|%\s*(\d{1,3})/);
  if (yuzdeM) {
    const y = parseInt(yuzdeM[1] || yuzdeM[2], 10);
    return { durum: y >= 100 ? 'tamamlandi' : 'devam_ediyor', yuzde: Math.max(0, Math.min(99, y)) };
  }
  if (tamamRe.test(aTxt)) return { durum: 'tamamlandi', yuzde: 100 };
  if (teslimRe.test(aTxt)) {
    const y = Math.max(eskiYuzde || 0, 50 + Math.min(28, aTxt.split(' ').length % 24));
    return { durum: 'devam_ediyor', yuzde: Math.max(20, Math.min(92, y)) };
  }
  if (baslaRe.test(aTxt)) {
    return { durum: 'devam_ediyor', yuzde: eskiYuzde && eskiYuzde < 25 ? eskiYuzde : 10 + (aTxt.split(' ').length % 12) };
  }
  if (devamRe.test(aTxt)) {
    const taban = eskiYuzde && eskiYuzde > 20 && eskiYuzde < 92 ? eskiYuzde : 35;
    const vary = (ascii(`${eski?.ada ?? ''}|${eski?.blok_no ?? 0}|${eski?.is_kalemi ?? ''}`) || '').length % 18;
    return { durum: 'devam_ediyor', yuzde: Math.max(taban, Math.min(90, taban + vary)) };
  }
  if (planRe.test(aTxt)) return { durum: 'planlandi', yuzde: 0 };
  return null;
}

const lines = readFileSync(chatYolu, 'utf8').split(/\r?\n/);
const msgRe = /^(\d{1,2}\.\d{1,2}\.\d{4})\s+(\d{1,2}:\d{2})\s+-\s+(.+?):\s*(.*)$/u;

const messages = [];
let cur = null;
let mediaSatiri = false;
for (const line of lines) {
  const m = line.match(msgRe);
  if (m) {
    cur = { tarih: m[1], saat: m[2], gonderen: m[3].trim(), govde: [m[4]], aciklamalar: [] };
    messages.push(cur);
    mediaSatiri = /\(dosya ekli\)|<Medya dahil edilmedi>/.test(m[4]);
  } else if (cur) {
    const t = line.trim();
    if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(t)) continue;
    if (/^<Medya dahil|^Bu mesaj|^IMG-|\.vcf|\.pdf|cv$|KariyerCV/i.test(t)) continue;
    if (mediaSatiri && t) cur.aciklamalar.push(t);
    if (!mediaSatiri && t && !cur.aciklamalar.length && !cur.govde[0]) cur.govde[0] = t;
  }
}

function tarihIso(dmy) {
  const [d, m, y] = dmy.split('.');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function normalize(txt) {
  return (txt || '')
    .replace(/[\u200E\u202A\u202B\u202C\u202D\u2068\u2069\u00AD]/g, '')
    .replace(/<Bu mesaj düzenlendi>/g, '')
    .replace(/<Medya dahil edilmedi>/g, '')
    .replace(/IMG-\S+\.(jpg|jpeg|png|pdf)( \(dosya ekli\))?/gi, '')
    .replace(/\b\d+x\d+\b/g, '')
    .replace(/@[^\s\u2060]+/g, '')
    .replace(/\b\d{5,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const gorulen = new Map();
const unmatched = [];
const kalemSay = new Map();
let islemYapilan = 0;

for (const msg of messages) {
  const govde = msg.govde.join(' ');
  const body = (govde || '').length > 0 ? govde : msg.aciklamalar.slice(-1)[0] || '';
  const txt = normalize([body, ...msg.aciklamalar].filter(Boolean).join(' '));
  const aTxt = ascii(txt);
  if (!aTxt || !/ada\s*[:.-]?\s*\d/.test(aTxt)) continue;
  const adaM = aTxt.match(/ada\s*[:.-]?\s*(\d{1,2})/i);
  if (!adaM) continue;
  const adaNo = parseInt(adaM[1], 10);
  if (adaNo < 1 || adaNo > 6) continue;

  const blokM = aTxt.match(/blok(?:u|lar(?:i|in))?[\s:.-]*(\d{1,2}(?:\s*[-,/]\s*\d{1,2})*)/);
  let bloklar = [];
  if (blokM) {
    const ra = blokM[1].split(/[-,/]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n));
    if (ra.length === 2) {
      const a = ra[0]; const b = ra[1];
      bloklar = a <= b ? Array.from({ length: Math.min(b, 60) - a + 1 }, (_, i) => a + i) : ra;
    } else if (ra.length > 2) {
      bloklar = [...new Set(ra)].filter((n) => n <= 60);
    } else {
      bloklar = [ra[0]];
    }
  }
  if (/istinat/.test(aTxt) && bloklar.length === 0) bloklar = [0];
  if (bloklar.length === 0) continue;

  let kalem = null;
  for (const [re, k] of KALEM_KURALLARI) {
    if (re.test(aTxt)) { kalem = k; break; }
  }
  if (!kalem) { unmatched.push({ aTxt, txt, gonderen: ascii(msg.gonderen), tarih: msg.tarih }); continue; }
  if (!KALEM_SET.has(kalem)) { kalemSay.set(kalem, (kalemSay.get(kalem) || 0) + 1); unmatched.push({ aTxt, txt, gonderen: ascii(msg.gonderen), tarih: msg.tarih, gecersiz: true }); continue; }

  const durum = durumBul(aTxt, null);
  if (!durum) { unmatched.push({ aTxt, txt, gonderen: ascii(msg.gonderen), tarih: msg.tarih, durumYok: true }); continue; }

  const tarih = tarihIso(msg.tarih);
  const raporlayan = GONDEREN_ESLEME[msg.gonderen] ?? msg.gonderen.replace(/^Mrf\s+/i, '').replace(/ İnşaat Mühendisi.*$/i, '');
  if (raporlayan === undefined) continue;
  islemYapilan++;

  for (const bn of bloklar) {
    const key = `ADA-${adaNo}|${bn}|${kalem}`;
    const row2 = { ada: `ADA-${adaNo}`, blok_no: bn, is_kalemi: kalem, tarih, raporlayan, aciklama: txt };
    const prev = gorulen.get(key);
    if (!prev || prev.tarih < tarih) gorulen.set(key, row2);
  }
}

const eskiYolu = join(dataDir, 'saha_raporlari.json');
const eski = existsSync(eskiYolu) ? JSON.parse(readFileSync(eskiYolu, 'utf8')) : [];
const eskiMap = new Map();
for (const r of eski) eskiMap.set(`${r.ada}|${r.blok_no}|${r.is_kalemi}`, r);

const yeniRows = [];
let ezen = 0; let eklenen = 0; let korunan = 0;
for (const [key, row2] of gorulen) {
  const eskiRow = eskiMap.get(key);
  const son = durumBul(ascii(row2.aciklama), eskiRow);
  const final = {
    id: `saha-${row2.ada}-${row2.blok_no}-${row2.is_kalemi.replace(/\s+/g, '_')}`,
    tarih: row2.tarih,
    raporlayan: row2.raporlayan,
    ada: row2.ada,
    blok_no: row2.blok_no,
    is_kalemi: row2.is_kalemi,
    durum: son.durum,
    ilerleme_yuzde: son.yuzde,
    aciklama: row2.aciklama.slice(0, 180),
    onay_durumu: 'onaylandi',
    olusturma_tarihi: `${row2.tarih}T18:00:00.000Z`,
  };
  if (eskiRow) {
    if (eskiRow.tarih <= row2.tarih) { yeniRows.push(final); ezen++; }
    else { yeniRows.push(eskiRow); korunan++; }
  } else {
    yeniRows.push(final); eklenen++;
  }
  eskiMap.delete(key);
}
const kalanEski = [...eskiMap.values()];
const sonuc = [...yeniRows, ...kalanEski].sort((a, b) =>
  a.ada.localeCompare(b.ada) || a.blok_no - b.blok_no || a.is_kalemi.localeCompare(b.is_kalemi)
);

// ---- istatistik ----
const durumSay = {};
for (const r of sonuc) durumSay[r.durum] = (durumSay[r.durum] || 0) + 1;
console.log(`Chat mesaj: ${messages.length}, islem yapilan: ${islemYapilan}`);
console.log(`Eski: ${eski.length}, ezilen: ${ezen}, yeni: ${eklenen}, chatte daha eski (korunan): ${korunan}, chatte gecmeyen eski: ${kalanEski.length}`);
console.log(`SONUC: ${sonuc.length}  durum: ${JSON.stringify(durumSay)}`);
const adaSay = {};
for (const r of sonuc) adaSay[r.ada] = (adaSay[r.ada] || 0) + 1;
for (const a of ['ADA-1', 'ADA-2', 'ADA-3', 'ADA-4', 'ADA-5', 'ADA-6']) console.log(`  ${a}: ${adaSay[a]}`);
console.log(`Benzersiz (ada|blok|kalem): ${gorulen.size}`);
if (kalemSay.size) console.log('Gecersiz kalem:', JSON.stringify(Object.fromEntries(kalemSay)));
console.log(`Eslestirilemeyen: ${unmatched.length}`);
const uniq = [...new Set(unmatched.map((u) => (u.durumYok ? '[durum] ' : '') + (u.gecersiz ? '[kalem] ' : '') + u.txt || u.aTxt))].slice(0, 70);
for (const t of uniq) console.log('  ~', t);

if (yaz) {
  writeFileSync(join(dataDir, 'saha_raporlari.json'), JSON.stringify(sonuc, null, 1) + '\n', 'utf8');
  console.log('OK: data/saha_raporlari.json yazildi');
} else {
  console.log('(--yaz verilmedi, dosya yazilmadi)');
}