import { getSupabase, isSupabaseReady } from '../lib/supabase';
import { supabaseKullanicilariYukle } from './kullanicilarStore';
import { epostaOlustur } from './authStore';

export interface YeniKullaniciInput {
  ad_soyad: string;
  rol: string;
  sifre: string;
  admin?: boolean;
  proje_muduru?: boolean;
  yetkili_adalar?: string[];
  atanan_ada?: string | null;
}

function baslat(hataMesaji: string): void {
  if (!isSupabaseReady()) throw new Error(hataMesaji);
}

export async function santiyeKullaniciOlustur(
  input: YeniKullaniciInput
): Promise<{ id: string; email: string }> {
  baslat('Sunucu bağlantısı yok');
  const { data, error } = await getSupabase().rpc('santiye_kullanici_olustur', {
    p_ad_soyad: input.ad_soyad.trim(),
    p_rol: input.rol,
    p_sifre: input.sifre,
    p_admin: input.admin ?? false,
    p_proje_muduru: input.proje_muduru ?? false,
    p_yetkili_adalar: input.yetkili_adalar ?? [],
    p_atanan_ada: input.atanan_ada ?? null,
  });
  if (error) throw new Error(error.message);
  await supabaseKullanicilariYukle();
  return data as { id: string; email: string };
}

export async function santiyeKullaniciSifreSifirla(userId: string, yeniSifre: string): Promise<void> {
  baslat('Sunucu bağlantısı yok');
  const { error } = await getSupabase().rpc('santiye_kullanici_sifre_sifirla', {
    p_user_id: userId,
    p_yeni_sifre: yeniSifre,
  });
  if (error) throw new Error(error.message);
}

export async function santiyeKullaniciSil(userId: string): Promise<void> {
  baslat('Sunucu bağlantısı yok');
  const { error } = await getSupabase().rpc('santiye_kullanici_sil', { p_user_id: userId });
  if (error) throw new Error(error.message);
  await supabaseKullanicilariYukle();
}

export async function santiyeKullaniciGuncelle(
  userId: string,
  alanlar: {
    rol?: string;
    admin?: boolean;
    proje_muduru?: boolean;
    yetkili_adalar?: string[];
    atanan_ada?: string | null;
  }
): Promise<void> {
  baslat('Sunucu bağlantısı yok');
  const { error } = await getSupabase().from('kullanicilar').update(alanlar).eq('id', userId);
  if (error) throw new Error(error.message);
  await supabaseKullanicilariYukle();
}

export function kullaniciEpostasi(ad_soyad: string): string {
  return epostaOlustur(ad_soyad);
}
