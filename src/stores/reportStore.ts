import type { Rapor } from '../types';
import { getSupabase, isSupabaseReady } from '../lib/supabase';
import { getSiteConfig } from '../config/site';
import { idbGet, idbSet } from '../lib/db';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toastGoster } from './toastStore';
import { getCurrentUser, supabaseOturumAktif, sefAdadaYetkiliMi } from './authStore';
import { yeniRaporBildirimleriniKuyrugaEkle } from './notificationStore';
import { getKullaniciAdaAtamasi } from './atamaStore';
import { getKullanicilar } from './kullanicilarStore';
import { tumKayitlariGetir } from '../lib/listeGetir';

const STORAGE_KEY = `${getSiteConfig().marka.localStoragePrefix}_raporlar`;
// Son basarili tam senkronizasyonda sunucuda gorulen rapor id'leri. Tam
// senkronizasyonda yerelde var olup sunucuda olmayan satir iki durumdan
// biri olabilir: (a) bu cihazda olusturulup hiz yuklenmemis (bekleyen) ya
// da (b) sunucudan silinmis (baska kisi/script). (b) yeniden yuklenirse
// sunucudaki silme "dirilir"; bu ozet ayristirmayi saglar.
const BILINEN_SUNUCU_KEY = `${STORAGE_KEY}_bilinen_sunucu_idleri`;

type Listener = () => void;
const _raporListeners = new Set<Listener>();
let _version = 0;

// modul seviyesi cache: JSON.parse sadece ilk okumada yapilir
let _raporCache: Rapor[] | null = null;
// "ada|blokNo|isKalemi" -> en son rapor (tek parse'ta kurulur)
let _sonRaporHaritasi = new Map<string, Rapor>();

export function subscribeRaporChanges(listener: Listener): () => void {
  _raporListeners.add(listener);
  return () => { _raporListeners.delete(listener); };
}

export function getRaporVersion(): number {
  return _version;
}

function notifyRaporListeners(): void {
  _version++;
  _raporListeners.forEach(fn => fn());
}

function sonRaporHaritasiniKur(liste: Rapor[]): Map<string, Rapor> {
  const harita = new Map<string, Rapor>();
  for (const r of liste) {
    const anahtar = `${r.ada}|${r.blok_no}|${r.is_kalemi}`;
    const mevcut = harita.get(anahtar);
    if (!mevcut || new Date(r.olusturma_tarihi).getTime() > new Date(mevcut.olusturma_tarihi).getTime()) {
      harita.set(anahtar, r);
    }
  }
  return harita;
}

let _persistZamanlayici: ReturnType<typeof setTimeout> | null = null;
let _bekleyenVeri: Rapor[] | null = null;
let _persistDinleyiciBaglandi = false;
let _idbHydrasyonPromise: Promise<void> | null = null;

function raporlariYaz(liste: Rapor[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
  } catch {
    /* localStorage dolu/engelli olabilir */
  }
  void idbSet('raporlar', 'raporlar', liste);
}

function raporlariPersistEt(liste: Rapor[]): void {
  _bekleyenVeri = liste;
  if (_persistZamanlayici) clearTimeout(_persistZamanlayici);
  _persistZamanlayici = setTimeout(() => {
    _persistZamanlayici = null;
    if (_bekleyenVeri) {
      raporlariYaz(_bekleyenVeri);
      _bekleyenVeri = null;
    }
  }, 300);
  if (!_persistDinleyiciBaglandi) {
    _persistDinleyiciBaglandi = true;
    const bosalt = () => {
      if (_persistZamanlayici) clearTimeout(_persistZamanlayici);
      _persistZamanlayici = null;
      if (_bekleyenVeri) {
        raporlariYaz(_bekleyenVeri);
        _bekleyenVeri = null;
      }
    };
    window.addEventListener('pagehide', bosalt);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') bosalt();
    });
  }
}

function idbHydrasyonuBaslat(): Promise<void> {
  if (!_idbHydrasyonPromise) {
    _idbHydrasyonPromise = idbGet<Rapor[]>('raporlar', 'raporlar').then((veri) => {
      if (veri && veri.length > 0) {
        setRaporlar(veri);
      }
    });
  }
  return _idbHydrasyonPromise;
}

function setRaporlar(next: Rapor[]): void {
  _raporCache = next;
  _sonRaporHaritasi = sonRaporHaritasiniKur(next);
  raporlariPersistEt(next);
  notifyRaporListeners();
}

export function getRaporlar(): Rapor[] {
  if (!_raporCache) {
    let okunan: Rapor[] = [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      okunan = data ? JSON.parse(data) : [];
    } catch {
      /* bozuk veri olabilir */
    }
    _raporCache = okunan;
    _sonRaporHaritasi = sonRaporHaritasiniKur(okunan);
    void idbHydrasyonuBaslat();
  }
  return _raporCache;
}

function raporToSupabase(r: Rapor, includeUserId = true) {
  return {
    id: r.id,
    tarih: r.tarih,
    raporlayan: r.raporlayan,
    ada: r.ada,
    blok_no: r.blok_no,
    is_kalemi: r.is_kalemi,
    durum: r.durum,
    ilerleme_yuzde: r.ilerleme_yuzde,
    aciklama: r.aciklama || '',
    olusturma_tarihi: r.olusturma_tarihi,
    onay_durumu: r.onay_durumu || 'onaylandi',
    revizyon_notu: r.revizyon_notu || '',
    fotograflar: r.fotograflar || [],
    ...(includeUserId ? { user_id: getCurrentUser()?.user_id ?? null } : {}),
  };
}

// Fire-and-forget zincirlerde reject yakalanmazsa hata sessizce kaybolur;
// veri yerelde gorunur ama sunucuya gitmemis olur.
function agHatasiYakala(islem: string): (err: unknown) => void {
  return (err: unknown) => {
    const mesaj = err instanceof Error ? err.message : String(err);
    console.warn('Sunucu istegi basarisiz (' + islem + '):', mesaj);
    toastGoster('Sunucuya ulaşılamadı — değişiklik cihazda saklandı, bağlantı gelince gönderilecek', 'error');
  };
}

function yeniRaporId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

let _raporChannel: RealtimeChannel | null = null;

export function aboneOlRaporGuncellemeleri(onChannelStatus?: (status: string) => void): void {
  if (!supabaseOturumAktif() || _raporChannel) return;
  _raporChannel = getSupabase()
    .channel('raporlar-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'raporlar' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const yeni = payload.new as Rapor;
          if (!getRaporlar().find(r => r.id === yeni.id)) {
            setRaporlar([...getRaporlar(), yeni]);
          }
          const mevcutKullanici = getCurrentUser();
          if (mevcutKullanici && yeni.raporlayan !== mevcutKullanici.ad_soyad) {
            // Toplu girislerde spam olmamasi icin kuyrukta biriktirilir
            yeniRaporBildirimleriniKuyrugaEkle(yeni.raporlayan, yeni.ada, yeni.blok_no);
          }
        } else if (payload.eventType === 'UPDATE') {
          const guncel = payload.new as Rapor;
          setRaporlar(getRaporlar().map((r) => r.id === guncel.id ? guncel : r));
        } else if (payload.eventType === 'DELETE') {
          setRaporlar(getRaporlar().filter(r => r.id !== payload.old.id));
        }
      }
    )
    .subscribe((status) => onChannelStatus?.(status));
}

export function realtimeRaporAboneliktenCik(): void {
  if (_raporChannel) {
    getSupabase().removeChannel(_raporChannel);
    _raporChannel = null;
  }
}

// Konsola PII (kisi adi) yazilmaz; teshis icin rapor id listesi yeterli.
// Kullaniciya gosterilen toast'ta isim/ada bilgisi kalabilir.
function upsertHataIdleri(basarisiz: Rapor[]): string {
  return basarisiz.map((r) => r.id).join(', ');
}

let _yuklemeHataBildirildi = false;

let _bilinenSunucuIds: Set<string> | null = null;
function bilinenSunucuIds(): Set<string> {
  if (!_bilinenSunucuIds) {
    try {
      const data = localStorage.getItem(BILINEN_SUNUCU_KEY);
      _bilinenSunucuIds = new Set(data ? (JSON.parse(data) as string[]) : []);
    } catch {
      _bilinenSunucuIds = new Set();
    }
  }
  return _bilinenSunucuIds;
}
function bilinenSunucuIdsniGuncelle(sunucuIdleri: Set<string>): void {
  _bilinenSunucuIds = sunucuIdleri;
  try {
    localStorage.setItem(BILINEN_SUNUCU_KEY, JSON.stringify([...sunucuIdleri]));
  } catch {
    /* localStorage dolu/engelli olabilir */
  }
}

// Saf fonksiyon — dirilme engeli. Sunucuda hic gorulmemis yerel satir =
// bu cihazda olusturulup henuz yuklenmemis (bekleyen) kabul edilir ve
// yuklenir; daha once gorulup artik sunucuda olmayan satir = sunucudan
// silinmis — birlestirilmis listeye girmez (yeniden yuklenince dirilmez).
export function sunucuRaporlariniBirlestir(
  yerel: Rapor[],
  sunucu: Rapor[],
  bilinenSunucu: ReadonlySet<string>
): { birlestirilmis: Rapor[]; bekleyen: Rapor[] } {
  const sunucuIdleri = new Set(sunucu.map((r) => r.id));
  const bekleyen = yerel.filter((r) => !sunucuIdleri.has(r.id) && !bilinenSunucu.has(r.id));
  return { birlestirilmis: [...sunucu, ...bekleyen], bekleyen };
}

export async function supabaseRaporlariYukle(): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    await idbHydrasyonuBaslat();
    const sunucu = await tumKayitlariGetir<Rapor>(async (bastan, kadar) =>
      await getSupabase()
        .from('raporlar')
        .select('id, tarih, raporlayan, ada, blok_no, is_kalemi, durum, ilerleme_yuzde, aciklama, olusturma_tarihi, user_id, onay_durumu, revizyon_notu, fotograflar')
        .order('olusturma_tarihi', { ascending: false })
        .range(bastan, kadar)
    );
    const yerel = getRaporlar();
    const { birlestirilmis, bekleyen } = sunucuRaporlariniBirlestir(yerel, sunucu, bilinenSunucuIds());
    setRaporlar(birlestirilmis);
    bilinenSunucuIdsniGuncelle(new Set(sunucu.map((r) => r.id)));
    // Tek tek upsert: tek bir yetkisiz/uyumsuz rapor kalan tum raporlarin
    // yuklenmesini bloke etmesin. RLS INSERT politikasinin client aynasi:
    // PM sinirsiz; sef ada-scope'lu (bos dizi = sinirsiz); sahip yalnizca
    // atanmis oldugu adaya yazabilir.
    const oturum = getCurrentUser();
    const adaylar = bekleyen.filter((r) => {
      if (!oturum || !supabaseOturumAktif()) return false;
      if (oturum.proje_muduru) return true;
      if (oturum.admin) return sefAdadaYetkiliMi(oturum.yetkili_adalar, r.ada);
      return r.raporlayan === oturum.ad_soyad && sahibiAdayaAtanmisMi(oturum.ad_soyad, r.ada);
    });
    // Parça parça toplu upsert: uzun çevrimdışı dönemde birikmiş yüzlerce
    // rapor için tek tek istek atmak dakikalar sürebilir. Bir parça tamamen
    // başarısız olursa içindeki suçlu kaydı izole etmek için tek tek denenir.
    const basarisiz: Rapor[] = [];
    const PARCA_BOYUTU = 50;
    for (let i = 0; i < adaylar.length; i += PARCA_BOYUTU) {
      const parca = adaylar.slice(i, i + PARCA_BOYUTU);
      const { error: parcaError } = await getSupabase()
        .from('raporlar')
        .upsert(parca.map((r) => raporToSupabase(r)), { onConflict: 'id' });
      if (!parcaError) continue;
      for (const r of parca) {
        const { error: upsertError } = await getSupabase()
          .from('raporlar')
          .upsert(raporToSupabase(r), { onConflict: 'id' });
        if (upsertError) basarisiz.push(r);
      }
    }
    if (basarisiz.length > 0) {
      const ilk = basarisiz[0];
      console.warn('Supabase yerel rapor yukleme hatasi,', basarisiz.length, 'rapor:', upsertHataIdleri(basarisiz));
      // Oturum basina tek bildirim: her yukleme denemesinde toast yiginini
      // engelle (kalici reddedilen kayitlarin durum isareti Faz 3'te).
      if (!_yuklemeHataBildirildi) {
        _yuklemeHataBildirildi = true;
        toastGoster(
          basarisiz.length + ' rapor sunucuya yuklenemedi (' + ilk.raporlayan + ', ' + ilk.ada +
          (basarisiz.length > 1 ? ' ve ' + (basarisiz.length - 1) + ' daha' : '') +
          '). Atama/rol izninizi kontrol edin.',
          'error'
        );
      }
    } else if (adaylar.length > 0) {
      _yuklemeHataBildirildi = false;
    }
  } catch {
    /* supabase offline, keep local data */
  }
}

export function saveRapor(rapor: Omit<Rapor, 'id' | 'olusturma_tarihi' | 'user_id' | 'onay_durumu' | 'revizyon_notu' | 'fotograflar'>): Rapor {
  const yeni: Rapor = {
    ...rapor,
    id: yeniRaporId(),
    olusturma_tarihi: new Date().toISOString(),
    user_id: getCurrentUser()?.user_id ?? null,
    onay_durumu: 'beklemede',
    revizyon_notu: '',
    fotograflar: [],
  };
  setRaporlar([...getRaporlar(), yeni]);
  if (supabaseOturumAktif()) {
    getSupabase().from('raporlar').insert(raporToSupabase(yeni)).then(({ error }) => {
      if (error) {
        console.warn('Supabase rapor kaydetme hatası:', error.message);
        toastGoster('Rapor sunucuya kaydedilemedi', 'error');
      }
    }, agHatasiYakala('rapor kaydet'));
  }
  return yeni;
}

export function saveRaporlar(
  raporlar: Array<Omit<Rapor, 'id' | 'olusturma_tarihi' | 'user_id' | 'onay_durumu' | 'revizyon_notu' | 'fotograflar'>>
): Rapor[] {
  const uid = getCurrentUser()?.user_id ?? null;
  const yeniler: Rapor[] = raporlar.map((r) => ({
    ...r,
    id: yeniRaporId(),
    olusturma_tarihi: new Date().toISOString(),
    user_id: uid,
    onay_durumu: 'beklemede',
    revizyon_notu: '',
    fotograflar: [],
  }));
  setRaporlar([...getRaporlar(), ...yeniler]);
  if (supabaseOturumAktif()) {
    getSupabase()
      .from('raporlar')
      .insert(yeniler.map((r) => raporToSupabase(r)))
      .then(({ error }) => {
        if (error) {
          console.warn('Supabase toplu rapor kaydetme hatası:', error.message);
          toastGoster('Raporlar sunucuya kaydedilemedi', 'error');
        }
      }, agHatasiYakala('toplu rapor kaydet'));
  }
  return yeniler;
}

export type RaporGuncelleme = Partial<Omit<Rapor, 'id' | 'olusturma_tarihi'>>;

const ICERIK_ALANLARI = ['tarih', 'ada', 'blok_no', 'is_kalemi', 'durum', 'ilerleme_yuzde', 'aciklama', 'fotograflar'] as const;

// Icerik degisince onceki onay hukumsuz kalir: yeniden degerlendirme icin
// beklemeye alinir (aksi halde onayli veri sessizce degisirdi). Sunucu
// tarafinda rapor_onay_korumasi trigger'i ayni kurali zorlar.
export function onaySifirlamaUygula(
  eski: Pick<Rapor, 'onay_durumu' | 'revizyon_notu'>,
  guncelleme: RaporGuncelleme
): Pick<Rapor, 'onay_durumu' | 'revizyon_notu'> {
  const anahtarlar = Object.keys(guncelleme);
  const icerikDegisti = anahtarlar.some((k) => (ICERIK_ALANLARI as readonly string[]).includes(k));
  if (icerikDegisti && eski.onay_durumu !== 'beklemede') {
    return { onay_durumu: 'beklemede', revizyon_notu: '' };
  }
  return { onay_durumu: eski.onay_durumu, revizyon_notu: eski.revizyon_notu };
}

export function updateRapor(id: string, guncelleme: RaporGuncelleme): boolean {
  const raporlar = getRaporlar();
  const idx = raporlar.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  // RLS ile ayni kural client tarafinda da uygulanir: yalnizca sahibi veya
  // admin/PM guncelleyebilir. UI atlatilursa sunucu zaten reddeder.
  if (!raporDuzenleyebilir(raporlar[idx])) {
    toastGoster('Bu raporu düzenleme yetkiniz yok.', 'error');
    return false;
  }
  // Ada/atama kapsami kontrolu yalnizca sunucuya yazilacakken uygulanir;
  // tam offline modda yerel duzenleme serbesttir (offline-first).
  if (supabaseOturumAktif() && !sunucudaDuzenlemeIzniVar(raporlar[idx])) {
    toastGoster('Bu raporu düzenleme yetkiniz yok (ada/atama kapsamı dışında).', 'error');
    return false;
  }
  // Onay alanlari yalnizca onay akisindan (raporOnayGuncelle) degisir;
  // icerik guncellemeleri bu alanlari tasiyamaz (self-onay engeli).
  const { onay_durumu: _o, revizyon_notu: _r, user_id: _u, ...icerik } = guncelleme;
  const sifirlama = onaySifirlamaUygula(raporlar[idx], icerik);
  const guncel = { ...raporlar[idx], ...icerik, ...sifirlama };
  const yeniListe = [...raporlar];
  yeniListe[idx] = guncel;
  setRaporlar(yeniListe);
  if (supabaseOturumAktif()) {
    // user_id yalnizca eski kayitta bos VE duzenleyen isim-eslesen yazarsa
    // doldurulur; admin baskasinin satirini duzenlerken yazar bilgisi
    // korunur (sahiplik calinmaz).
    const duzenleyen = getCurrentUser();
    const userIdDahil =
      raporlar[idx].user_id == null &&
      duzenleyen != null &&
      !duzenleyen.admin && !duzenleyen.proje_muduru &&
      duzenleyen.ad_soyad === raporlar[idx].raporlayan;
    getSupabase().from('raporlar').update(raporToSupabase(guncel, userIdDahil)).eq('id', id).then(({ error }) => {
      if (error) {
        console.warn('Supabase rapor güncelleme hatası:', error.message);
        toastGoster('Rapor sunucuya güncellenemedi', 'error');
      }
    }, agHatasiYakala('rapor guncelle'));
  }
  return true;
}

export function deleteRapor(id: string): boolean {
  const raporlar = getRaporlar();
  const rapor = raporlar.find((r) => r.id === id);
  if (!rapor) return false;
  // DB politikasiyla uyumlu: silme yetkisi yalnizca sef/PM'dedir.
  const oturum = getCurrentUser();
  if (!oturum || !(oturum.admin || oturum.proje_muduru)) {
    toastGoster('Rapor silme yetkiniz yok.', 'error');
    return false;
  }
  if (supabaseOturumAktif() && !sunucudaSilmeIzniVar(rapor)) {
    toastGoster('Bu adadaki raporu silme yetkiniz yok.', 'error');
    return false;
  }
  setRaporlar(raporlar.filter((r) => r.id !== id));
  if (supabaseOturumAktif()) {
    getSupabase().from('raporlar').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.warn('Supabase rapor silme hatası:', error.message);
        toastGoster('Rapor sunucudan silinemedi', 'error');
        return;
      }
      // Satir silindi: ekli fotograflar yetim kalmasin (best-effort)
      const yollar = (rapor.fotograflar || [])
        .map((u) => fotoYoluCikar(u))
        .filter((y): y is string => y !== null);
      if (yollar.length > 0) {
        getSupabase().storage.from('rapor-fotolari').remove(yollar).then(
          ({ error: dosyaError }) => {
            if (dosyaError) console.warn('Silinen raporun fotograflari kaldi:', dosyaError.message);
          },
          (err: unknown) => console.warn('Silinen raporun fotograflari kaldi:', err instanceof Error ? err.message : err)
        );
      }
    }, agHatasiYakala('rapor sil'));
  }
  return true;
}

function raporDuzenleyebilir(rapor: Rapor): boolean {
  const oturum = getCurrentUser();
  if (!oturum) return false;
  if (oturum.admin || oturum.proje_muduru) return true;
  return rapor.user_id != null && rapor.user_id === oturum.user_id;
}

// Sahip dali icin RLS atama kosulu: kullanici_ada_atamalari veya
// kullanicilar.atanan_ada bu adayi kapsiyor olmali.
function sahibiAdayaAtanmisMi(ad_soyad: string, ada: string): boolean {
  if (getKullaniciAdaAtamasi(ad_soyad) === ada) return true;
  const profil = getKullanicilar().find((k) => k.ad_soyad === ad_soyad);
  return profil?.atanan_ada === ada;
}

function sunucudaDuzenlemeIzniVar(rapor: Rapor): boolean {
  const oturum = getCurrentUser();
  if (!oturum) return false;
  if (oturum.proje_muduru) return true;
  if (oturum.admin) return sefAdadaYetkiliMi(oturum.yetkili_adalar, rapor.ada);
  return rapor.user_id != null && rapor.user_id === oturum.user_id && sahibiAdayaAtanmisMi(oturum.ad_soyad, rapor.ada);
}

function sunucudaSilmeIzniVar(rapor: Rapor): boolean {
  const oturum = getCurrentUser();
  if (!oturum) return false;
  if (oturum.proje_muduru) return true;
  return oturum.admin && sefAdadaYetkiliMi(oturum.yetkili_adalar, rapor.ada);
}

export function getRaporById(id: string): Rapor | undefined {
  return getRaporlar().find((r) => r.id === id);
}

export function getPersonelRaporlari(adSoyad: string): Rapor[] {
  return getRaporlar().filter((r) => r.raporlayan === adSoyad);
}

export function getSonRapor(ada: string, blokNo: number, isKalemi: string): Rapor | null {
  getRaporlar();
  return _sonRaporHaritasi.get(`${ada}|${blokNo}|${isKalemi}`) ?? null;
}

// Sayfalar kendi "son rapor" haritalarini kurmasin; tek kaynak burasi.
// Anahtar bicimi: "ada|blok_no|is_kalemi".
export function getSonRaporHaritasi(): ReadonlyMap<string, Rapor> {
  getRaporlar();
  return _sonRaporHaritasi;
}

// Tam anahtarla arar; ada-geneli devri YOKTUR (o icin getBlokProgress).
export function getTamAnahtarSonRapor(ada: string, blokNo: number, isKalemi: string): Rapor | null {
  getRaporlar();
  return _sonRaporHaritasi.get(`${ada}|${blokNo}|${isKalemi}`) ?? null;
}

export function getBlokProgress(
  ada: string,
  blokNo: number,
  isKalemleri: readonly string[]
): Record<string, Rapor | null> {
  getRaporlar();
  // blok_no=0 ada geneli raporlar devralma; blok özel raporu varsa o kazanır
  const blokAnahtari = `${ada}|${blokNo}|`;
  const adaGenelAnahtari = `${ada}|0|`;
  const progress: Record<string, Rapor | null> = {};
  for (const ik of isKalemleri) {
    const blokRapor = _sonRaporHaritasi.get(blokAnahtari + ik);
    const adaGenelRapor = blokNo !== 0 ? _sonRaporHaritasi.get(adaGenelAnahtari + ik) ?? null : null;
    progress[ik] = blokRapor ?? adaGenelRapor;
  }
  return progress;
}

// Yuvarlanmamis blok ilerlemesi: ada/proje ortalamalari ham degerle
// hesaplanir; yoksa blok->ada->proje zincirinde yuvarlama hatasi birikir.
function getBlokGenelIlerlemeHam(
  ada: string,
  blokNo: number,
  isKalemleri: readonly string[]
): number {
  const progress = getBlokProgress(ada, blokNo, isKalemleri);
  const values = Object.values(progress);
  if (values.length === 0) return 0;
  const toplam = values.reduce((sum, r) => sum + raporEtkinYuzde(r), 0);
  return toplam / values.length;
}

export function getBlokGenelIlerleme(
  ada: string,
  blokNo: number,
  isKalemleri: readonly string[]
): number {
  return Math.round(getBlokGenelIlerlemeHam(ada, blokNo, isKalemleri));
}

// Etkin ilerleme: ortalamalara katilan deger. 'tamamlandi' -> 100,
// 'planlandi' -> 0 (eski kayitlardan kopyalanan yuzde ortalamayi
// sisirmesin), diger -> kayitli yuzde. Tum ekran ve export'lar bu
// fonksiyonu kullanmak zorunda; aksi halde ayni veri farkli gorunur.
export function raporEtkinYuzde(r: Rapor | null | undefined): number {
  if (!r) return 0;
  if (r.durum === 'tamamlandi') return 100;
  if (r.durum === 'planlandi') return 0;
  return Number.isFinite(r.ilerleme_yuzde) ? r.ilerleme_yuzde : 0;
}

function raporYuzde(r: Rapor | null | undefined): number | null {
  if (!r) return null;
  // 'planlandi' henuz baslamamis is demektir; eski kayitlardan kopyalanan
  // ilerleme_yuzde degeri ortalamalari sisirmesin, 0 ile katilsin.
  return raporEtkinYuzde(r);
}

export function getKalemAdaIlerleme(
  ada: string,
  blokList: { blok_no: number }[],
  kalem: string
): number | null {
  getRaporlar();
  const adaGenel = _sonRaporHaritasi.get(`${ada}|0|${kalem}`);
  const genelYuzde = raporYuzde(adaGenel);
  if (genelYuzde !== null) return genelYuzde;
  const blokYuzdeleri: number[] = [];
  for (const b of blokList) {
    const v = raporYuzde(_sonRaporHaritasi.get(`${ada}|${b.blok_no}|${kalem}`));
    if (v !== null) blokYuzdeleri.push(v);
  }
  if (blokYuzdeleri.length === 0) return null;
  return blokYuzdeleri.reduce((s, v) => s + v, 0) / blokYuzdeleri.length;
}

// Grup ilerlemesi hakedis imalat_yuzde hesabiyla ayni: gruptaki tum
// kalemler paydas olur, raporu olmayan kalem 0 (is yapilmamis) sayilir.
export function getGrupUygulamaIlerleme(
  ada: string,
  blokList: { blok_no: number }[],
  grupId: string
): number | null {
  const hk = getSiteConfig().hakedis;
  if (!hk) return null;
  const kalemler = Object.keys(hk.kalemEslesme).filter((k) => hk.kalemEslesme[k] === grupId);
  if (kalemler.length === 0) return null;
  const yuzdeler: number[] = [];
  for (const kalem of kalemler) {
    const v = getKalemAdaIlerleme(ada, blokList, kalem);
    yuzdeler.push(v === null ? 0 : v);
  }
  return yuzdeler.reduce((s, v) => s + v, 0) / yuzdeler.length;
}

// Ada ilerlemesi hakedisle ayni formul: tum gruplar paydada (tam
// pursantaj), raporu olmayan grup imalat eksik oldugu icin 0 sayilir.
// Boylece saha oranlari hakedis oranlariyla karsilastirilabilir olur.
export function getGrupAgirlikliAdaIlerleme(
  ada: string,
  blokList: { blok_no: number }[]
): number | null {
  const hk = getSiteConfig().hakedis;
  const adaPur = hk?.adalar?.[ada];
  if (!hk || !adaPur) return null;
  let agirlikliToplam = 0;
  let pursantajToplam = 0;
  for (const [grupId, pur] of Object.entries(adaPur.gruplar)) {
    const uygulama = getGrupUygulamaIlerleme(ada, blokList, grupId);
    agirlikliToplam += pur * (uygulama ?? 0);
    pursantajToplam += pur;
  }
  if (pursantajToplam === 0) return null;
  return agirlikliToplam / pursantajToplam;
}

export function getProjeAgirlikliIlerleme(
  blokYapilari: { ada: string; bloklar: { blok_no: number }[] }[]
): number | null {
  const hk = getSiteConfig().hakedis;
  if (!hk) return null;
  let agirlikliToplam = 0;
  let pursantajToplam = 0;
  for (const a of blokYapilari) {
    const adaPur = hk.adalar[a.ada];
    const adaIlerleme = adaPur ? getGrupAgirlikliAdaIlerleme(a.ada, a.bloklar) : null;
    if (adaIlerleme === null || !adaPur) continue;
    agirlikliToplam += adaIlerleme * adaPur.genel;
    pursantajToplam += adaPur.genel;
  }
  if (pursantajToplam === 0) return null;
  return agirlikliToplam / pursantajToplam;
}

function getAdaGenelIlerlemeHam(
  ada: string,
  blokList: { blok_no: number }[],
  isKalemleri: readonly string[]
): number {
  if (blokList.length === 0) return 0;
  const toplam = blokList.reduce((sum, b) => {
    return sum + getBlokGenelIlerlemeHam(ada, b.blok_no, isKalemleri);
  }, 0);
  return toplam / blokList.length;
}

export function getAdaGenelIlerleme(
  ada: string,
  blokList: { blok_no: number }[],
  isKalemleri: readonly string[]
): number {
  return Math.round(getAdaGenelIlerlemeHam(ada, blokList, isKalemleri));
}

// Ekranlarda gorunen "saha ilerleme" orani: hakedis pur yapisi varsa
// hakedisle ayni agirlikli hesap, yoksa eski rapor ortalamasi.
export function getSahaAdaIlerleme(
  ada: string,
  blokList: { blok_no: number }[],
  isKalemleri: readonly string[]
): number {
  const pur = getGrupAgirlikliAdaIlerleme(ada, blokList);
  if (pur !== null) return Math.round(pur);
  return getAdaGenelIlerleme(ada, blokList, isKalemleri);
}

// Proje geneli: ada ortalamalarinin ortalamasi. Yuvarlama yalnizca
// gosterimde ve en sonda yapilir (cift/basamakli yuvarlama yok).
export function getGenelIlerleme(
  adaList: { ada: string; bloklar: { blok_no: number }[] }[],
  isKalemleri: readonly string[]
): number {
  if (adaList.length === 0) return 0;
  const toplam = adaList.reduce((sum, a) => {
    return sum + getAdaGenelIlerlemeHam(a.ada, a.bloklar, isKalemleri);
  }, 0);
  return Math.round(toplam / adaList.length);
}

export function getIstatistikler(raporlar: Rapor[]) {
  let tamamlananIsler = 0;
  let devamEdenIsler = 0;
  let planlananIsler = 0;
  let gecikenIsler = 0;
  for (const r of raporlar) {
    if (r.durum === 'tamamlandi') tamamlananIsler++;
    else if (r.durum === 'devam_ediyor') devamEdenIsler++;
    else if (r.durum === 'planlandi') planlananIsler++;
    else if (r.durum === 'gecikme') gecikenIsler++;
  }

  return {
    tamamlananIsler,
    devamEdenIsler,
    planlananIsler,
    gecikenIsler,
    toplamRapor: raporlar.length,
  };
}

// Baglanti geri geldiginde bekleyen yerel verileri sunucuya gonder
export function raporOnayla(id: string): boolean {
  return raporOnayGuncelle(id, 'onaylandi', '');
}

export function raporReddet(id: string, revizyonNotu: string): boolean {
  return raporOnayGuncelle(id, 'reddedildi', revizyonNotu);
}

function raporOnayGuncelle(id: string, durum: import('../types').OnayDurumu, not: string): boolean {
  const raporlar = getRaporlar();
  const idx = raporlar.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  const oturum = getCurrentUser();
  if (!oturum || !(oturum.admin || oturum.proje_muduru)) {
    toastGoster('Bu işlem için yetkiniz yok.', 'error');
    return false;
  }
  // RLS ile ayni ada-scope: sef yalnizca yetkili adalarda onaylar
  // (bos dizi = sinirsiz); PM sinirsiz. Offline modda yerel serbest.
  if (supabaseOturumAktif() && oturum.admin && !oturum.proje_muduru) {
    if (!sefAdadaYetkiliMi(oturum.yetkili_adalar, raporlar[idx].ada)) {
      toastGoster('Bu adadaki raporları onaylama yetkiniz yok.', 'error');
      return false;
    }
  }
  const onceki = raporlar[idx];
  const guncel = { ...onceki, onay_durumu: durum, revizyon_notu: not };
  const yeniListe = [...raporlar];
  yeniListe[idx] = guncel;
  setRaporlar(yeniListe);
  if (supabaseOturumAktif()) {
    getSupabase().from('raporlar').update({ onay_durumu: durum, revizyon_notu: not }).eq('id', id).then(({ error }) => {
      if (error) {
        console.warn('Supabase onay guncelleme hatasi:', error.message);
        toastGoster('Onay durumu güncellenemedi', 'error');
        // Sunucu reddettiyse iyimser yerel yazimi geri al (ayrisma kalmasin)
        setRaporlar(getRaporlar().map((r) => (r.id === id ? onceki : r)));
      }
    }, agHatasiYakala('onay guncelle'));
  }
  return true;
}

export async function fotografYukle(raporId: string, dosya: File): Promise<string | null> {
  try {
    const dosyaYolu = `raporlar/${raporId}/${Date.now()}_${dosya.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await getSupabase().storage.from('rapor-fotolari').upload(dosyaYolu, dosya, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = getSupabase().storage.from('rapor-fotolari').getPublicUrl(dosyaYolu);
    return urlData.publicUrl;
  } catch (err) {
    const mesaj = err instanceof Error ? err.message : String(err);
    console.warn('Fotograf yukleme hatasi:', mesaj);
    toastGoster('Fotoğraf yüklenemedi', 'error');
    return null;
  }
}

export function raporFotografEkle(id: string, fotografUrl: string): boolean {
  const raporlar = getRaporlar();
  const idx = raporlar.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  if (!raporDuzenleyebilir(raporlar[idx])) {
    toastGoster('Bu rapora fotoğraf ekleme yetkiniz yok.', 'error');
    return false;
  }
  const mevcut = raporlar[idx];
  // Fotograf icerik degisikligidir: onayli rapora eklenirse onay duser
  const guncel = {
    ...mevcut,
    fotograflar: [...(mevcut.fotograflar || []), fotografUrl],
    ...(mevcut.onay_durumu !== 'beklemede'
      ? { onay_durumu: 'beklemede' as const, revizyon_notu: '' }
      : {}),
  };
  const yeniListe = [...raporlar];
  yeniListe[idx] = guncel;
  setRaporlar(yeniListe);
  if (supabaseOturumAktif()) {
    getSupabase().from('raporlar').update({ fotograflar: guncel.fotograflar, onay_durumu: guncel.onay_durumu, revizyon_notu: guncel.revizyon_notu }).eq('id', id).then(({ error }) => {
      if (error) console.warn('Supabase fotograf guncelleme hatasi:', error.message);
    }, agHatasiYakala('fotograf guncelle'));
  }
  return true;
}

// Public URL'den bucket-ici yol cikar; harici URL'lerde null doner.
function fotoYoluCikar(url: string): string | null {
  const isaret = '/rapor-fotolari/';
  const i = url.indexOf(isaret);
  if (i < 0) return null;
  const yol = url.slice(i + isaret.length).split('?')[0].replace(/^\/+/, '');
  return yol || null;
}

export async function fotografSil(raporId: string, url: string): Promise<boolean> {
  const raporlar = getRaporlar();
  const idx = raporlar.findIndex((r) => r.id === raporId);
  if (idx === -1) return false;
  if (!raporDuzenleyebilir(raporlar[idx])) {
    toastGoster('Bu fotoğrafı silme yetkiniz yok.', 'error');
    return false;
  }
  const guncel = {
    ...raporlar[idx],
    fotograflar: (raporlar[idx].fotograflar || []).filter((u) => u !== url),
  };
  const yeniListe = [...raporlar];
  yeniListe[idx] = guncel;
  setRaporlar(yeniListe);
  if (supabaseOturumAktif()) {
    try {
      // Once satir (dogru kaynak), sonra dosya (best-effort)
      const { error: satirError } = await getSupabase()
        .from('raporlar')
        .update({ fotograflar: guncel.fotograflar })
        .eq('id', raporId);
      if (satirError) throw satirError;
      const yol = fotoYoluCikar(url);
      if (yol) {
        const { error: dosyaError } = await getSupabase().storage
          .from('rapor-fotolari')
          .remove([yol]);
        if (dosyaError) console.warn('Fotograf dosyasi silinemedi:', dosyaError.message);
      }
    } catch (err) {
      console.warn('Supabase fotograf silme hatasi:', err instanceof Error ? err.message : err);
      toastGoster('Fotoğraf sunucudan silinemedi', 'error');
      return false;
    }
  }
  return true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void supabaseRaporlariYukle();
  });
}
