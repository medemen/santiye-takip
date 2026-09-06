import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getSiteConfig } from '../config/site';
import { getHedefler } from './hedefStore';
import { getRaporlar, getSonRapor } from './reportStore';
import { hedefKalanGun } from '../data/plan';
import { todayISO } from '../utils/helpers';

const GUNLUK_OZET_ID = 9001;
const UYARI_ID = 9002;
const TEST_ID = 9003;

const onEk = getSiteConfig().marka.localStoragePrefix + '_bildirim';

interface BildirimAyarlari {
  uyariAcik: boolean;
  gunlukOzet: boolean;
  gunlukSaat: string;
  yeniRapor: boolean;
}

export function bildirimAyarlariGetir(): BildirimAyarlari {
  try {
    const data = localStorage.getItem(onEk + '_ayarlar');
    if (data) return { uyariAcik: true, gunlukOzet: true, gunlukSaat: '08:00', yeniRapor: true, ...JSON.parse(data) };
  } catch { /* yok say */ }
  return { uyariAcik: true, gunlukOzet: true, gunlukSaat: '08:00', yeniRapor: true };
}

export function bildirimAyarlariKaydet(ayarlar: BildirimAyarlari): void {
  localStorage.setItem(onEk + '_ayarlar', JSON.stringify(ayarlar));
}

export function nativeBildirimVarMi(): boolean {
  return Capacitor.isNativePlatform();
}

type IzinDurumu = 'granted' | 'denied' | 'prompt' | 'unsupported';

function normIzni(izin: string): IzinDurumu {
  if (izin === 'granted') return 'granted';
  if (izin === 'denied') return 'denied';
  return 'prompt';
}

export async function bildirimIzniDurumu(): Promise<IzinDurumu> {
  try {
    if (nativeBildirimVarMi()) {
      const durum = await LocalNotifications.checkPermissions();
      return normIzni(durum.display);
    }
    if (typeof Notification !== 'undefined') return normIzni(Notification.permission);
    return 'unsupported';
  } catch {
    return 'unsupported';
  }
}

export async function bildirimIzniIste(): Promise<IzinDurumu> {
  try {
    if (nativeBildirimVarMi()) {
      const durum = await LocalNotifications.requestPermissions();
      return normIzni(durum.display);
    }
    if (typeof Notification !== 'undefined') {
      const sonuc = await Notification.requestPermission();
      return normIzni(sonuc);
    }
    return 'unsupported';
  } catch {
    return 'unsupported';
  }
}

interface AcilItem {
  ada: string;
  blok_no: number;
  is_kalemi: string;
  hedef_tarih?: string;
  kalanGun: number;
  raporYok: boolean;
}

let _acilCache: { zaman: number; sonuc: AcilItem[] } | null = null;
const ACIL_CACHE_MS = 5 * 60 * 1000;

function acilIsler(): AcilItem[] {
  const simdi = Date.now();
  if (_acilCache && simdi - _acilCache.zaman < ACIL_CACHE_MS) {
    return _acilCache.sonuc;
  }
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  const gecikenRaporlar = getRaporlar()
    .filter((r) => r.durum === 'gecikme' && r.raporlayan !== 'DURUM TESPİT')
    .map((r): AcilItem => ({ ada: r.ada, blok_no: r.blok_no, is_kalemi: r.is_kalemi, kalanGun: -1, raporYok: false }));

  const hedefAcil = getHedefler()
    .filter((h) => getSonRapor(h.ada, h.blok_no, h.is_kalemi)?.durum !== 'tamamlandi')
    .map((h): AcilItem => ({ ada: h.ada, blok_no: h.blok_no, is_kalemi: h.is_kalemi, hedef_tarih: h.hedef_tarih, kalanGun: hedefKalanGun(h.hedef_tarih), raporYok: true }))
    .filter((h) => h.kalanGun <= 0);

  const goruldu = new Set<string>();
  const sonuc = [...gecikenRaporlar, ...hedefAcil].filter((h) => {
    const anahtar = `${h.ada}|${h.blok_no}|${h.is_kalemi}`;
    if (goruldu.has(anahtar)) return false;
    goruldu.add(anahtar);
    return true;
  });
  _acilCache = { zaman: simdi, sonuc };
  return sonuc;
}

function acilMesaji(): { baslik: string; govde: string; adet: number } | null {
  const acil = acilIsler();
  if (acil.length === 0) return null;
  const baslik = `⛔ ${acil.length} geciken / bugünkü iş var`;
  const satirlar = acil
    .slice(0, 4)
    .map((a) => {
      const yer = `${a.ada} - ${a.blok_no === 0 ? 'Ada Geneli' : `Blok ${a.blok_no}`}`;
      const suresi = a.hedef_tarih ? (a.kalanGun < 0 ? `${-a.kalanGun} gün gecikti` : 'bugün') : 'gecikme durumunda';
      return `${yer}: ${a.is_kalemi} (${suresi})`;
    });
  const govde = satirlar.join('\n');
  return { baslik, govde, adet: acil.length };
}

function bugunGorulduMu(anahtarlar: string[]): boolean {
  try {
    const bugun = todayISO();
    const kayit = JSON.parse(localStorage.getItem(onEk + '_goruldu') || '{}') as Record<string, string[]>;
    const gorulenler = kayit[bugun] ?? [];
    return anahtarlar.every((k) => gorulenler.includes(k));
  } catch {
    return false;
  }
}

function bugunGorulduIsaretle(anahtarlar: string[]): void {
  try {
    const bugun = todayISO();
    const kayit = JSON.parse(localStorage.getItem(onEk + '_goruldu') || '{}') as Record<string, string[]>;
    const gorulenler = new Set(kayit[bugun] ?? []);
    anahtarlar.forEach((k) => gorulenler.add(k));
    kayit[bugun] = [...gorulenler];
    localStorage.setItem(onEk + '_goruldu', JSON.stringify(kayit));
  } catch { /* yok say */ }
}

export async function hedefUyarilariniGoster(): Promise<boolean> {
  const ayarlar = bildirimAyarlariGetir();
  if (!ayarlar.uyariAcik) return false;

  const mesaj = acilMesaji();
  if (!mesaj) return false;

  const anahtarlar = acilIsler().map((a) => `${a.ada}|${a.blok_no}|${a.is_kalemi}`);
  if (bugunGorulduMu(anahtarlar)) return false;

  try {
    if (nativeBildirimVarMi()) {
      await LocalNotifications.schedule({
        notifications: [{
          id: UYARI_ID,
          title: mesaj.baslik,
          body: mesaj.govde,
          schedule: { at: new Date() },
        }],
      });
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(mesaj.baslik, { body: mesaj.govde, tag: 'hedef-uyari' });
    }
    bugunGorulduIsaretle(anahtarlar);
    return true;
  } catch {
    return false;
  }
}

export async function gunlukOzetPlanla(): Promise<boolean> {
  if (!nativeBildirimVarMi()) return false;
  const ayarlar = bildirimAyarlariGetir();
  if (!ayarlar.gunlukOzet) return false;

  const [saat, dakika] = ayarlar.gunlukSaat.split(':').map((n) => parseInt(n, 10) || 0);

  try {
    await LocalNotifications.cancel({ notifications: [{ id: GUNLUK_OZET_ID }] });
    const mesaj = acilMesaji();
    const baslik = mesaj ? mesaj.baslik : 'Hedef özeti hazır';
    const govde = mesaj
      ? mesaj.govde
      : 'Geciken veya bugünkü iş yok. 🎉';
    await LocalNotifications.schedule({
      notifications: [{
        id: GUNLUK_OZET_ID,
        title: baslik,
        body: govde,
        schedule: { every: 'day', on: { hour: saat, minute: dakika } },
      }],
    });
    return true;
  } catch {
    return false;
  }
}

export async function gunlukOzetIptal(): Promise<void> {
  if (!nativeBildirimVarMi()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: GUNLUK_OZET_ID }] });
  } catch { /* yok say */ }
}

export async function testBildirimGonder(): Promise<boolean> {
  try {
    if (nativeBildirimVarMi()) {
      await LocalNotifications.schedule({
        notifications: [{ id: TEST_ID, title: '✅ Bildirim çalışıyor', body: 'Bu bir test bildirimi.', schedule: { at: new Date() } }],
      });
      return true;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('✅ Bildirim çalışıyor', { body: 'Bu bir test bildirimi.' });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function yeniRaporBildirimiGonder(raporlayan: string, ada: string, blokNo: number): void {
  const ayarlar = bildirimAyarlariGetir();
  if (!ayarlar.yeniRapor) return;

  const yer = blokNo === 0 ? `${ada} Ada Geneli` : `${ada} Blok ${blokNo}`;
  const baslik = '📋 Yeni Rapor';
  const govde = `${raporlayan} — ${yer}`;

  try {
    if (nativeBildirimVarMi()) {
      void LocalNotifications.schedule({
        notifications: [{
          id: Date.now() % 100000,
          title: baslik,
          body: govde,
          schedule: { at: new Date() },
        }],
      }).catch(() => { /* izin yoksa/schedu hata: sessiz gec */ });
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(baslik, { body: govde, tag: `yeni-rapor-${raporlayan}-${ada}` });
    }
  } catch { /* yok say */ }
}

// Toplu rapor girisinde N blok = N realtime INSERT = N bildirim spam'i
// olur. Kuyruk 15 sn pencerede birikir, tek ozet bildirim gonderilir.
interface KuyrukRapor {
  raporlayan: string;
  ada: string;
  blokNo: number;
}

let raporKuyrugu: KuyrukRapor[] = [];
let kuyrukZamanlayici: ReturnType<typeof setTimeout> | null = null;
const OZET_BILDIRIM_ID = 9001;

function bildirimKuyrugunuBosalt(): void {
  kuyrukZamanlayici = null;
  const liste = raporKuyrugu;
  raporKuyrugu = [];
  if (liste.length === 0) return;

  const baslik = liste.length === 1 ? '📋 Yeni Rapor' : `📋 ${liste.length} Yeni Rapor`;
  const govde =
    liste.length === 1
      ? `${liste[0].raporlayan} — ${liste[0].blokNo === 0 ? `${liste[0].ada} Ada Geneli` : `${liste[0].ada} Blok ${liste[0].blokNo}`}`
      : liste
          .slice(0, 3)
          .map((r) => `${r.raporlayan} (${r.ada})`)
          .join(', ') + (liste.length > 3 ? ` ve ${liste.length - 3} diğer` : '');

  try {
    if (nativeBildirimVarMi()) {
      void LocalNotifications.schedule({
        notifications: [{ id: OZET_BILDIRIM_ID, title: baslik, body: govde, schedule: { at: new Date() } }],
      }).catch(() => { /* izin yoksa/schedu hata: sessiz gec */ });
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(baslik, { body: govde, tag: 'yeni-rapor-ozet' });
    }
  } catch { /* yok say */ }
}

export function yeniRaporBildirimleriniKuyrugaEkle(raporlayan: string, ada: string, blokNo: number): void {
  if (!bildirimAyarlariGetir().yeniRapor) return;
  raporKuyrugu.push({ raporlayan, ada, blokNo });
  if (!kuyrukZamanlayici) {
    kuyrukZamanlayici = setTimeout(bildirimKuyrugunuBosalt, 15000);
  }
}

let kontrolZamani: ReturnType<typeof setInterval> | null = null;

export function bildirimKontrolunuBaslat(): void {
  if (kontrolZamani !== null) return;
  hedefUyarilariniGoster();
  if (nativeBildirimVarMi()) gunlukOzetPlanla();
  kontrolZamani = setInterval(() => {
    hedefUyarilariniGoster();
  }, 30 * 60 * 1000);
}

export function bildirimKontrolunuDurdur(): void {
  if (kontrolZamani !== null) {
    clearInterval(kontrolZamani);
    kontrolZamani = null;
  }
}
