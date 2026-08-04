import type { Oturum } from '../types';
import { isSantiyeSefi, isProjeMuduru, getSefAdalar } from '../data/personelData';
import { blokData } from '../data/blokData';
import { getSupabase, isSupabaseReady } from '../lib/supabase';

const STORAGE_KEY = 'santiye_oturum';

const TURKCE_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
  â: 'a', î: 'i', û: 'u',
};

export function epostaOlustur(ad_soyad: string): string {
  const slug = ad_soyad
    .toLowerCase()
    .split('')
    .map((ch) => TURKCE_MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9.]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${slug}@santiye.com`;
}

const varsayilanSifre = (): string => import.meta.env.VITE_DEFAULT_PASSWORD || 'Santiye2026';

type AuthListener = () => void;
const _authListeners = new Set<AuthListener>();

export function subscribeAuthChanges(listener: AuthListener): () => void {
  _authListeners.add(listener);
  return () => { _authListeners.delete(listener); };
}

function notifyAuthListeners(): void {
  _authListeners.forEach(fn => fn());
}

function statikOturum(ad_soyad: string, rol: string): Oturum {
  const pm = isProjeMuduru(ad_soyad);
  const admin = isSantiyeSefi(ad_soyad) || pm;
  const yetkiliAdalar = pm
    ? blokData.adalar.map((a) => a.ada)
    : (admin ? getSefAdalar(ad_soyad) : []);
  return {
    user_id: null,
    ad_soyad,
    rol,
    admin,
    proje_muduru: pm,
    yetkili_adalar: yetkiliAdalar,
    giris_tarihi: new Date().toISOString(),
  };
}

function oturumuKaydet(oturum: Oturum): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(oturum));
  notifyAuthListeners();
}

export async function girisYap(ad_soyad: string, rol: string): Promise<Oturum> {
  // Gerçek oturum: Supabase Auth ile signInWithPassword.
  if (isSupabaseReady()) {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: epostaOlustur(ad_soyad),
      password: varsayilanSifre(),
    });
    if (!error && data.user) {
      const { data: profil } = await getSupabase()
        .from('kullanicilar')
        .select('ad_soyad, rol, admin, yetkili_adalar, proje_muduru')
        .eq('id', data.user.id)
        .single();
      const oturum: Oturum = {
        user_id: data.user.id,
        ad_soyad: profil?.ad_soyad ?? ad_soyad,
        rol: profil?.rol ?? rol,
        admin: profil?.admin ?? (isSantiyeSefi(ad_soyad) || isProjeMuduru(ad_soyad)),
        proje_muduru: profil?.proje_muduru ?? isProjeMuduru(ad_soyad),
        yetkili_adalar:
          profil?.yetkili_adalar && profil.yetkili_adalar.length > 0
            ? profil.yetkili_adalar
            : statikOturum(ad_soyad, rol).yetkili_adalar,
        giris_tarihi: new Date().toISOString(),
      };
      oturumuKaydet(oturum);
      return oturum;
    }
    // Ağ hatası veya kullanıcı bulunamadı: offline fallback (statik veri).
    console.warn('Supabase girişi başarısız, statik oturuma düşülüyor.', error?.message);
  }

  const oturum = statikOturum(ad_soyad, rol);
  oturumuKaydet(oturum);
  return oturum;
}

export function cikisYap(): void {
  localStorage.removeItem(STORAGE_KEY);
  if (isSupabaseReady()) {
    getSupabase().auth.signOut();
  }
  notifyAuthListeners();
}

export function getCurrentUser(): Oturum | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

export function isAdmin(): boolean {
  return getCurrentUser()?.admin ?? false;
}

export function isProjeMuduruSession(): boolean {
  return getCurrentUser()?.proje_muduru ?? false;
}

export function isSahaPersoneli(rol: string): boolean {
  return rol === 'Saha Mühendisi' || rol === 'Saha Mimarı';
}

export async function supabaseAuthInit(): Promise<void> {
  if (!isSupabaseReady()) return;
  const { data: { session } } = await getSupabase().auth.getSession();
  if (session?.user) {
    const { data: profil } = await getSupabase()
      .from('kullanicilar')
      .select('ad_soyad, rol, admin, yetkili_adalar, proje_muduru')
      .eq('id', session.user.id)
      .single();
    if (profil && !getCurrentUser()) {
      const oturum: Oturum = {
        user_id: session.user.id,
        ad_soyad: profil.ad_soyad,
        rol: profil.rol,
        admin: profil.admin ?? false,
        proje_muduru: profil.proje_muduru ?? false,
        yetkili_adalar: profil.yetkili_adalar ?? [],
        giris_tarihi: new Date().toISOString(),
      };
      oturumuKaydet(oturum);
    }
  }

  getSupabase().auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const { data: profil } = await getSupabase()
        .from('kullanicilar')
        .select('ad_soyad, rol, admin, yetkili_adalar, proje_muduru')
        .eq('id', session.user.id)
        .single();
      if (profil) {
        const oturum: Oturum = {
          user_id: session.user.id,
          ad_soyad: profil.ad_soyad,
          rol: profil.rol,
          admin: profil.admin ?? false,
          proje_muduru: profil.proje_muduru ?? false,
          yetkili_adalar: profil.yetkili_adalar ?? [],
          giris_tarihi: new Date().toISOString(),
        };
        oturumuKaydet(oturum);
      }
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem(STORAGE_KEY);
    }
  });
}
