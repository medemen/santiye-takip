import type { IsKalemiHedefi } from '../types';
import { getSupabase, isSupabaseReady } from '../lib/supabase';
import { getSiteConfig } from '../config/site';
import { tumKayitlariGetir } from '../lib/listeGetir';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toastGoster } from './toastStore';
import { getCurrentUser, supabaseOturumAktif } from './authStore';

const STORAGE_KEY = `${getSiteConfig().marka.localStoragePrefix}_hedefler`;
// Offline mutabakat: sunucuya ulasilmayan silme/ekleme-guncelleme islemleri
// kuyrukta bekletilir; bir sonraki basarili yuklemede uygulanir. Kuyruk
// olmasaydi sunucu listesi yerel degisikligi ezer (silinen hedef "dirilir").
const SILME_KUYRUK_KEY = `${getSiteConfig().marka.localStoragePrefix}_hedef_bekleyen_silmeler`;
const KAYIT_KUYRUK_KEY = `${getSiteConfig().marka.localStoragePrefix}_hedef_bekleyen_kayitlar`;

export interface HedefAnahtari {
  ada: string;
  blok_no: number;
  is_kalemi: string;
}

export interface BekleyenKayit extends HedefAnahtari {
  hedef_tarih: string;
}

function kuyrukOku<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T[]) : [];
  } catch {
    return [];
  }
}

function kuyrukYaz<T>(key: string, liste: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(liste));
  } catch {
    /* localStorage dolu/engelli olabilir */
  }
}

function anahtarMetni(k: HedefAnahtari): string {
  return `${k.ada}|${k.blok_no}|${k.is_kalemi}`;
}

// Fire-and-forget isteklerde reject yakalanmazsa hata sessizce kaybolur.
function agHatasiYakala(islem: string): (err: unknown) => void {
  return (err: unknown) => {
    const mesaj = err instanceof Error ? err.message : String(err);
    console.warn('Sunucu istegi basarisiz (' + islem + '):', mesaj);
    toastGoster('Sunucuya ulaşılamadı — hedef cihazda saklandı', 'error');
  };
}

type Listener = () => void;
const _hedefListeners = new Set<Listener>();
let _version = 0;

export function subscribeHedefChanges(listener: Listener): () => void {
  _hedefListeners.add(listener);
  return () => { _hedefListeners.delete(listener); };
}

export function getHedefVersion(): number {
  return _version;
}

function notifyHedefListeners(): void {
  _version++;
  _hedefListeners.forEach(fn => fn());
}

let _hedefChannel: RealtimeChannel | null = null;

export function aboneOlHedefGuncellemeleri(onChannelStatus?: (status: string) => void): void {
  if (!supabaseOturumAktif() || _hedefChannel) return;
  _hedefChannel = getSupabase()
    .channel('hedef-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'is_kalemi_hedefleri' },
      () => {
        supabaseHedefleriYukle();
        notifyHedefListeners();
      }
    )
    .subscribe((status) => onChannelStatus?.(status));
}

export function realtimeHedefAboneliktenCik(): void {
  if (_hedefChannel) {
    getSupabase().removeChannel(_hedefChannel);
    _hedefChannel = null;
  }
}

// modul seviyesi cache: JSON.parse yalnizca ilk okumada yapilir
let _hedefCache: IsKalemiHedefi[] | null = null;

export function getHedefler(): IsKalemiHedefi[] {
  if (!_hedefCache) {
    let okunan: IsKalemiHedefi[] = [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      okunan = data ? JSON.parse(data) : [];
    } catch {
      /* bozuk veri olabilir */
    }
    _hedefCache = okunan;
  }
  return _hedefCache;
}

// Bekleyen yerel islemleri sunucu verisinin uzerine uygular:
// silme kuyrugundeki satirlar dusurulur, kayit kuyrugu ezerek/ekleyerek
// birlestirilir. Saf fonksiyon — test edilebilir.
export function sunucuHedefleriBirlestir(
  sunucu: IsKalemiHedefi[],
  bekleyenSilmeler: HedefAnahtari[],
  bekleyenKayitlar: BekleyenKayit[]
): IsKalemiHedefi[] {
  const silmeSeti = new Set(bekleyenSilmeler.map(anahtarMetni));
  const birlesik = sunucu.filter((h) => !silmeSeti.has(anahtarMetni(h)));
  for (const bk of bekleyenKayitlar) {
    const idx = birlesik.findIndex((h) => anahtarMetni(h) === anahtarMetni(bk));
    if (idx >= 0) {
      birlesik[idx] = { ...birlesik[idx], hedef_tarih: bk.hedef_tarih };
    } else {
      birlesik.push({ id: 0, ...bk });
    }
  }
  return birlesik;
}

export async function supabaseHedefleriYukle(): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    const sunucu = await tumKayitlariGetir<IsKalemiHedefi>(async (bastan, kadar) =>
      await getSupabase()
        .from('is_kalemi_hedefleri')
        .select('id, ada, blok_no, is_kalemi, hedef_tarih')
        .range(bastan, kadar)
    );

    const birlesik = sunucuHedefleriBirlestir(
      sunucu,
      kuyrukOku<HedefAnahtari>(SILME_KUYRUK_KEY),
      kuyrukOku<BekleyenKayit>(KAYIT_KUYRUK_KEY)
    );
    _hedefCache = birlesik;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(birlesik));
    notifyHedefListeners();

    // Kuyruklari sunucuya bosaltmayi dene (online ise)
    if (!supabaseOturumAktif()) return;

    const silmeler = kuyrukOku<HedefAnahtari>(SILME_KUYRUK_KEY);
    for (const s of silmeler) {
      const { error: silmeError } = await getSupabase()
        .from('is_kalemi_hedefleri')
        .delete()
        .eq('ada', s.ada)
        .eq('blok_no', s.blok_no)
        .eq('is_kalemi', s.is_kalemi);
      if (!silmeError) {
        kuyrukYaz(SILME_KUYRUK_KEY, kuyrukOku<HedefAnahtari>(SILME_KUYRUK_KEY).filter((x) => anahtarMetni(x) !== anahtarMetni(s)));
      }
    }

    const kayitlar = kuyrukOku<BekleyenKayit>(KAYIT_KUYRUK_KEY);
    for (const k of kayitlar) {
      const { error: kayitError } = await getSupabase()
        .from('is_kalemi_hedefleri')
        .upsert(
          { ada: k.ada, blok_no: k.blok_no, is_kalemi: k.is_kalemi, hedef_tarih: k.hedef_tarih },
          { onConflict: 'ada, blok_no, is_kalemi' }
        );
      if (!kayitError) {
        kuyrukYaz(KAYIT_KUYRUK_KEY, kuyrukOku<BekleyenKayit>(KAYIT_KUYRUK_KEY).filter((x) => anahtarMetni(x) !== anahtarMetni(k)));
      }
    }
  } catch {
    /* supabase offline, cache devam */
  }
}

export function getBlokHedefleri(ada: string, blokNo: number): IsKalemiHedefi[] {
  return getHedefler().filter((h) => h.ada === ada && h.blok_no === blokNo);
}

export function getAdaHedefleri(ada: string): IsKalemiHedefi[] {
  return getHedefler().filter((h) => h.ada === ada);
}

export function getHedef(ada: string, blokNo: number, isKalemi: string): IsKalemiHedefi | undefined {
  return getHedefler().find((h) => h.ada === ada && h.blok_no === blokNo && h.is_kalemi === isKalemi);
}

export function hedefDuzetmeYetkisiVarMi(): boolean {
  const user = getCurrentUser();
  return !!user && (user.admin || user.proje_muduru);
}

export function setHedef(
  ada: string,
  blokNo: number,
  isKalemi: string,
  hedefTarih: string | null
): boolean {
  if (!hedefDuzetmeYetkisiVarMi()) return false;

  const hedefler = getHedefler();
  const idx = hedefler.findIndex((h) => h.ada === ada && h.blok_no === blokNo && h.is_kalemi === isKalemi);

  if (hedefTarih === null || hedefTarih === '') {
    if (idx !== -1) hedefler.splice(idx, 1);
  } else if (idx !== -1) {
    hedefler[idx] = { ...hedefler[idx], hedef_tarih: hedefTarih };
  } else {
    hedefler.push({
      id: 0,
      ada,
      blok_no: blokNo,
      is_kalemi: isKalemi,
      hedef_tarih: hedefTarih,
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hedefler));
  notifyHedefListeners();

  const buHedef: HedefAnahtari = { ada, blok_no: blokNo, is_kalemi: isKalemi };

  if (hedefTarih === null || hedefTarih === '') {
    // Silme: sunucuya kanitlanana dek kuyrukta tut (dirilme engeli)
    const silmeler = kuyrukOku<HedefAnahtari>(SILME_KUYRUK_KEY);
    if (!silmeler.some((s) => anahtarMetni(s) === anahtarMetni(buHedef))) {
      silmeler.push(buHedef);
      kuyrukYaz(SILME_KUYRUK_KEY, silmeler);
    }
    // Varsa bekleyen kaydi da dus
    kuyrukYaz(KAYIT_KUYRUK_KEY, kuyrukOku<BekleyenKayit>(KAYIT_KUYRUK_KEY).filter((x) => anahtarMetni(x) !== anahtarMetni(buHedef)));
  } else {
    // Kayit/guncelleme: ayni mantikla kuyrukta; silme kuyrugundan cikar
    const kayitlar = kuyrukOku<BekleyenKayit>(KAYIT_KUYRUK_KEY);
    const yeni: BekleyenKayit = { ada, blok_no: blokNo, is_kalemi: isKalemi, hedef_tarih: hedefTarih };
    const kayitIdx = kayitlar.findIndex((x) => anahtarMetni(x) === anahtarMetni(yeni));
    if (kayitIdx >= 0) kayitlar[kayitIdx] = yeni;
    else kayitlar.push(yeni);
    kuyrukYaz(KAYIT_KUYRUK_KEY, kayitlar);
    kuyrukYaz(SILME_KUYRUK_KEY, kuyrukOku<HedefAnahtari>(SILME_KUYRUK_KEY).filter((x) => anahtarMetni(x) !== anahtarMetni(yeni)));
  }

  if (supabaseOturumAktif()) {
    if (hedefTarih === null || hedefTarih === '') {
      getSupabase()
        .from('is_kalemi_hedefleri')
        .delete()
        .eq('ada', ada)
        .eq('blok_no', blokNo)
        .eq('is_kalemi', isKalemi)
        .then(({ error }) => {
          if (!error) {
            kuyrukYaz(SILME_KUYRUK_KEY, kuyrukOku<HedefAnahtari>(SILME_KUYRUK_KEY).filter((x) => anahtarMetni(x) !== anahtarMetni(buHedef)));
          } else {
            console.warn('Supabase hedef silme hatası:', error.message);
            toastGoster('Hedef sunucudan silinemedi — bağlantı gelince tekrar denenecek', 'error');
          }
        }, agHatasiYakala('hedef sil'));
    } else {
      getSupabase()
        .from('is_kalemi_hedefleri')
        .upsert(
          { ada, blok_no: blokNo, is_kalemi: isKalemi, hedef_tarih: hedefTarih },
          { onConflict: 'ada, blok_no, is_kalemi' }
        )
        .then(({ error }) => {
          if (!error) {
            kuyrukYaz(KAYIT_KUYRUK_KEY, kuyrukOku<BekleyenKayit>(KAYIT_KUYRUK_KEY).filter((x) => anahtarMetni(x) !== anahtarMetni(buHedef)));
          } else {
            console.warn('Supabase hedef kaydetme hatası:', error.message);
            toastGoster('Hedef sunucuya kaydedilemedi — bağlantı gelince tekrar denenecek', 'error');
          }
        }, agHatasiYakala('hedef kaydet'));
    }
  }
  return true;
}
