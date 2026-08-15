#!/usr/bin/env node
/**
 * Kalem->hakedis grubu esleme tablosunu uretir ve pursantaj/hakedis verilerini dogrular.
 *
 * Urettigi dosya:
 *   data/kalem_grup_eslesme.json  (uygulama is kalemi adi -> hakedis grup id)
 *
 * Esleme stratejisi (kullanicinin onayladigi grup eslemesi, kalem bazinda):
 *   KABA ISLER -> Kazi/Betonarme/Doseme; DUVAR-YALITIM -> Duvar/Kazi/Dis Cephe/Cati/Altyapi;
 *   IC SIVA -> Duvar+Dis Cephe; DOSEME -> Doseme+Cati; SERAMIK -> Doseme+Duvar;
 *   DOGRAMALAR -> Pencere+Kapi+Tavan; MOBILYA-KAPI -> Kapi-Ahsap;
 *   MERMER/KORKULUK/BINA GIRIS -> Merdivenler-Giris Holu; DIS CEPHE -> Dis Cephe;
 *   MEKANIK -> Sihhi/Dogalgaz/Kalorifer/Havalandirma; ELEKTRIK -> Linye/Kolon/Pano/Topraklama/Cevre Aydinlatma;
 *   ASANSOR -> Asansor; ALTYAPI -> Altyapi; PEYZAJ -> Cevre Duzenleme+Cocuk Oyun; ZAYIF AKIM -> Diyafon.
 *   YARDIMCI & GENEL ISLER ve YANGIN GUVENLIGI agirliksizdir (eslenmez).
 *
 * Kullanim: node scripts/hakedis-analiz.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataDir = join(root, 'data');

const config = JSON.parse(readFileSync(join(dataDir, 'santiye.config.json'), 'utf8'));
const pursantaj = JSON.parse(readFileSync(join(dataDir, 'pursantaj.json'), 'utf8'));
const hakedis = JSON.parse(readFileSync(join(dataDir, 'hakedis.json'), 'utf8'));

const KALEM_ESLEME = {
  'Hafriyat': 'ins-kazi',
  'Betonarme Kalıp': 'ins-betonarme',
  'Betonarme Demir': 'ins-betonarme',
  'Beton Dökümü': 'ins-betonarme',
  'Perde Duvar': 'ins-betonarme',
  'Asmolen Döşeme': 'ins-doseme',
  'Subasman': 'ins-kazi',

  'Geri Dolgu': 'ins-kazi',
  'Koruma Duvarı': 'ins-duvar',
  'XPS (PERDE)': 'ins-dis-cephe',
  'Sürme Yalıtım (PERDE)': 'ins-dis-cephe',
  'Yapı Duvarı': 'ins-duvar',
  'Asansör önü duvar': 'ins-duvar',
  'Bina giriş markiz duvar': 'ins-duvar',
  'Su deposu üstü izolasyon': 'ins-dis-cephe',
  'Bodrum wc izolasyon': 'ins-dis-cephe',
  'Merdiven betonu': 'ins-betonarme',
  'Çatı baca betonu/bims': 'ins-cati',
  'Ahşap kapamalar': 'ins-cati',
  'Drenaj': 'ins-altyapi',
  'Elektrik odası kaide': 'ins-kazi',
  'Su deposu kaide': 'ins-kazi',
  'Balkon Parapet': 'ins-duvar',
  'Kuranglez': 'ins-altyapi',

  'Kaba Alçı': 'ins-duvar',
  'Karışık Alçı': 'ins-duvar',
  'Saten Alçı': 'ins-duvar',
  'Seramik Altı Kaba Sıva': 'ins-duvar',
  '(balkon) Hazır Sıva': 'ins-duvar',
  'Duvar Boyası (SON KAT HARİÇ)': 'ins-duvar',
  'Duvar boyası SONLAMA': 'ins-duvar',
  'Tavan Boyası': 'ins-tavan',
  'Kat Holü Alçı': 'ins-merdiven',
  'Merdiven alçı': 'ins-merdiven',
  'Merdiven altı sıvası': 'ins-merdiven',
  'Çatı kule sıvası': 'ins-cati',
  'Mahya harçlama': 'ins-cati',
  'Su deposu kara sıva': 'ins-duvar',
  'Asansör önü kara sıva': 'ins-duvar',
  'Gırgır cephesi parapet sıvası': 'ins-dis-cephe',
  'Stropiyer': 'ins-tavan',
  'Yangın merdiveni grenli boya': 'ins-dis-cephe',
  'BODRUM MANTOLAMA+SIVA': 'ins-dis-cephe',
  'Asansör ALÇI': 'ins-duvar',
  'Bodrum boya': 'ins-duvar',

  'Şap': 'ins-doseme',
  'Islak Hacim Sürme Yalıtım': 'ins-doseme',
  'Laminant': 'ins-doseme',
  'Laminant süpürgelik': 'ins-doseme',
  'Çatı altı cam yünü': 'ins-cati',
  'Ahşap Parke': 'ins-doseme',
  'PVC/Vinyil Döşeme': 'ins-doseme',
  'Kaymaz Bant': 'ins-doseme',

  'Gırgır cephesi seramik': 'ins-dis-cephe',
  'Duvar seramik': 'ins-duvar',
  'Taban seramik': 'ins-doseme',
  'Seramik süpürgelik': 'ins-doseme',
  'Terazzo Karo': 'ins-doseme',
  'Terazzo Karo süpürgelik': 'ins-doseme',
  'Tezgah Arası': 'ins-doseme',
  'Asansör duvar seramik (60*120)': 'ins-duvar',

  'PVC Asma Tavan': 'ins-tavan',
  'Kör Kasa': 'ins-pencere',
  'Şaft kapağı körkasa': 'ins-kapi',
  'PVC Pencere': 'ins-pencere',
  'PVC Kapı': 'ins-kapi',
  'PVC Cam': 'ins-pencere',
  'Çelik Kapı (Pervaz-kasa-kanat)': 'ins-kapi',
  'Yangın Kapısı': 'ins-kapi',
  'Bodrum kapıları': 'ins-kapi',
  'Çatı Baca Şapka': 'ins-cati',
  'Şaft Kapakları': 'ins-kapi',
  'Menfezler': 'ins-kapi',
  'Yangın merdiven menfez': 'ins-kapi',
  'Alüminyum panjur pencere': 'ins-pencere',

  'Mutfak Dolabı ve hilton': 'ins-kapi',
  'Mutfak Dolap Kapakları': 'ins-kapi',
  'İç Oda Kapı Kasası': 'ins-kapi',
  'İç Oda Kapı Kanadı': 'ins-kapi',
  'İç Oda Kapı Pervazı': 'ins-kapi',
  'Vestiyer ve çamaşır dolabı': 'ins-kapi',
  'Korniş': 'ins-kapi',
  'Posta kutusu': 'ins-kapi',
  'Bodrum mutfak nişi': 'ins-kapi',

  'Basamak': 'ins-merdiven',
  'Mermer Süpürgelik': 'ins-merdiven',
  'Denizlik': 'ins-pencere',
  'Balkon Parapet Mermer': 'ins-merdiven',
  'Tezgah': 'ins-doseme',
  'Daire bartış': 'ins-merdiven',
  'Balkon Bartış': 'ins-merdiven',
  'Gırgır cephesi balkon Bartış': 'ins-dis-cephe',
  'Markiz üstü küpeşte': 'ins-merdiven',

  'DIŞ CEPHE İSKELE': 'ins-dis-cephe',
  'ÇATI AHŞAP': 'ins-cati',
  'ÇATI KİREMİT': 'ins-cati',
  'Kaba Sıva': 'ins-dis-cephe',
  'Taşyünü Kaplama': 'ins-dis-cephe',
  'Isı Yalıtım Sıvası': 'ins-dis-cephe',
  'Mantolama Sıvası': 'ins-dis-cephe',
  'Cephe Boya': 'ins-dis-cephe',
  'Gırgır cephesi sıva': 'ins-dis-cephe',
  'Gırgır cephesi grenli boya': 'ins-dis-cephe',

  'Balkon Korkuluğu': 'ins-merdiven',
  'Merdiven Korkuluğu': 'ins-merdiven',

  '60*120 SERAMİK': 'ins-merdiven',
  'Markiz üstü izolasyon ve şap': 'ins-merdiven',
  'Bina giriş mermer basım': 'ins-merdiven',
  'Bazalt': 'ins-merdiven',
  'Ön Giriş Almn. Doğrama': 'ins-merdiven',
  'Ön Giriş Engelli Rampası': 'ins-merdiven',
  'Ön Giriş Tretuar': 'ins-cevre',

  'Radye temel': 'ins-betonarme',
  'Rezervasyon İşlemleri': 'mek-sihhi',
  'Pis su kolon (wc+mutfak+balkon)': 'mek-sihhi',
  'Pis su daire alt toplama tesisatı': 'mek-sihhi',
  'Pis su bodrum toplama tesisatı': 'mek-sihhi',
  'Pis su rögar bağlantısı': 'mek-sihhi',
  'Pis su yağmur ve balkon inişi': 'mek-sihhi',
  'Yağmur suyu rögar bağlantısı': 'mek-sihhi',
  'Hela taşı + Süzgeç Montajları': 'mek-sihhi',
  'Temiz su Ppr-c (Daire)': 'mek-sihhi',
  'Temiz su Ppr-c (Bodrum)': 'mek-sihhi',
  'Galveniz kolon tesisatı': 'mek-sihhi',
  'Galveniz anahat (Hidrofor Odası)': 'mek-sihhi',
  'Daire içi pex tesisatı': 'mek-sihhi',
  'Daire içi Kollektör Montajı': 'mek-sihhi',
  'Su sayaçları montajı': 'mek-sihhi',
  'Vitrifiye Montajı': 'mek-sihhi',
  'Armatür Montajı': 'mek-sihhi',
  'Radyatör ve Havlupan Montajı': 'mek-kalorifer',
  'DOĞALGAZ İÇ TESİSAT': 'mek-dogalgaz',
  'SU DEPOSU MONTAJ': 'mek-sihhi',
  'Aspiratör': 'mek-havalandirma',
  'Şönt Baca': 'mek-havalandirma',

  'Temel Topraklama': 'elk-topraklama',
  'Borulama': 'elk-linye',
  'Daire içi kablolama': 'elk-linye',
  'Desant': 'elk-pano',
  'Kablo Tavası': 'elk-linye',
  'Merdiven Tavalar (Şaft İçi)': 'elk-linye',
  'Zayıf Akım Kolon Kabloları': 'elk-kolon',
  'Kuvvetli Akım Kolon Kabloları': 'elk-kolon',
  'Sigorta Kutusu (Daire İçi)': 'elk-pano',
  'Anahtar Priz Montajı': 'elk-linye',
  'Aydınlatma Armatür Montajı': 'elk-linye',

  'Ray & Kabin Montajı': 'elk-asansor',
  'Asansör Kapıları': 'elk-asansor',
  'Makine Dairesi Ekipmanı': 'elk-asansor',
  'Test & Devreye Alma': 'elk-asansor',

  'Data Altyapısı': 'elk-diyafon',
  'TV & Kablo Altyapısı': 'elk-diyafon',
  'İnterkom': 'elk-diyafon',
  'CCTV': 'elk-diyafon',
  'Anten': 'elk-diyafon',

  'Yangın Algılama & Dedektör': 'mek-yangin',
  'Acil Aydınlatma': 'mek-yangin',
  'Yönlendirme Levhaları': 'mek-yangin',

  'Yol & Kilit Parke': 'ins-cevre',
  'Bordür': 'ins-altyapi',
  'Kanalizasyon Hattı': 'ins-altyapi',
  'Yağmur Suyu Hattı': 'ins-altyapi',
  'İçme Suyu Hattı': 'ins-altyapi',
  'Rögar & Baca': 'ins-altyapi',
  'Trafo & Elektrik Dağıtım Hattı': 'elk-kolon',
  'İstinat Duvarı': 'ins-cevre',
  'Çevre Drenajı': 'ins-altyapi',

  'Çimlendirme & Ağaçlandırma': 'ins-cevre',
  'Otomatik Sulama': 'ins-cevre',
  'Yaya Yolu': 'ins-cevre',
  'Oyun Alanı': 'ins-cocuk',
  'Kent Mobilyaları': 'ins-cevre',
  'Çevre Çiti': 'ins-cevre',
  'Aydınlatma Direkleri': 'elk-cevre-ayd',
  'Otopark': 'ins-cevre',
};

// ---- 1) kalem_grup_eslesme.json uret ----
const eslesme = {};
const eslenmeyen = [];
for (const gr of config.isKalemleri.gruplar) {
  for (const kalem of gr.kalemler) {
    const gid = KALEM_ESLEME[kalem];
    if (!gid) {
      eslenmeyen.push(kalem);
      continue;
    }
    if (eslesme[kalem] && eslesme[kalem] !== gid) {
      console.error(`CATISMA: "${kalem}" zaten ${eslesme[kalem]} -> ${gid}`);
      process.exit(1);
    }
    eslesme[kalem] = gid;
  }
}
// kalem->grup ters indeks: grup id -> kalem listesi (kalem kalem duzenleme ekrani icin)
const grupKalemleri = {};
for (const [kalem, gid] of Object.entries(eslesme)) {
  (grupKalemleri[gid] ??= []).push(kalem);
}

writeFileSync(
  join(dataDir, 'kalem_grup_eslesme.json'),
  JSON.stringify({ eslesme, grupKalemleri }, null, 2) + '\n',
  'utf8'
);

// ---- 2) dogrulamalar ----
const hata = [];
const eslenen = Object.keys(eslesme).length;
console.log(`Eslenen kalem: ${eslenen}, eslenmeyen: ${eslenmeyen.length}`);
if (eslenmeyen.length) console.log('  eslenmeyen:', eslenmeyen.join('; '));

const adi = pursantaj.gruplar;

// pursantaj toplamlari: her grupta en az bir kalem, tersi de gecerli
const gruptaKalemYok = Object.keys(adi).filter((gid) => !grupKalemleri[gid] || grupKalemleri[gid].length === 0);
if (gruptaKalemYok.length) {
  console.log(`UYARI: eşlenecek kalemi olmayan hakedis grubu (uygulamada karsiligi yok): ${gruptaKalemYok.join(', ')}`);
}

// her ada pursantaj toplami ILERLEME ICMALI kumToplam ile tutarli olmali (kumulatif toplam <= pursantaj)
for (const ada of Object.keys(pursantaj.adalar)) {
  const pur = pursantaj.adalar[ada].genel;
  const kumT = hakedis.ilerlemeIcmal.adalar[ada]?.İNŞ?.kumToplam;
  if (kumT !== null && kumT !== undefined && kumT > pur + 0.0001) {
    hata.push(`${ada}: ILERLEME ICMALI kumToplam %${kumT} > pursantaj %${pur}`);
  }
}

// disiplin pursantaj toplamlari vs ILERLEME ICMALI disiplin kumulatif
for (const ada of Object.keys(pursantaj.adalar)) {
  for (const dis of ['İNŞ', 'MEK', 'ELK']) {
    const disPur = Object.entries(pursantaj.adalar[ada].gruplar)
      .filter(([gid]) => adi[gid] && adi[gid].disiplin === dis)
      .reduce((s, [, v]) => s + v, 0);
    const disKum = hakedis.ilerlemeIcmal.adalar[ada]?.[dis]?.kum;
    if (disKum !== null && disKum !== undefined && disKum > disPur + 0.0001) {
      hata.push(`${ada} ${dis}: kumulatif %${disKum} > pursantaj %${disPur.toFixed(4)}`);
    }
  }
}

// grup pursantaj toplami %100 (yangin grubu sadece ADA-5'te)
if (Math.abs(pursantaj.toplam - 100) > 0.0001) {
  hata.push(`Pursantaj genel toplam %100 degil: %${pursantaj.toplam.toFixed(4)}`);
}

if (hata.length) {
  console.error('HATA:');
  hata.forEach((h) => console.error('  - ' + h));
  process.exit(1);
}
console.log('OK: dogrulama gecti, data/kalem_grup_eslesme.json yazildi.');
