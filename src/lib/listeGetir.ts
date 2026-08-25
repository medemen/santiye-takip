// PostgREST varsayilan max-rows=1000 ile fazlasini SESSIZCE keser; buyuk
// tablolar (raporlar) range sorgulariyla sayfa sayfa cekilmezse istatistikler
// yanlis olur ve sunucuda silinmis kayitlar yerel kopyadan geri canlanir.
const VARSAYILAN_SAYFA_BOYUTU = 1000;
const VARSAYILAN_MAKS_SAYFA = 200;

export interface SayfaSonucu<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export async function tumKayitlariGetir<T>(
  sayfaCek: (bastan: number, kadar: number) => Promise<SayfaSonucu<T>>,
  secenekler: { sayfaBoyutu?: number; maksSayfa?: number } = {},
): Promise<T[]> {
  const sayfaBoyutu = secenekler.sayfaBoyutu ?? VARSAYILAN_SAYFA_BOYUTU;
  const maksSayfa = secenekler.maksSayfa ?? VARSAYILAN_MAKS_SAYFA;
  const hepsi: T[] = [];
  for (let sayfa = 0; sayfa < maksSayfa; sayfa++) {
    const bastan = sayfa * sayfaBoyutu;
    const { data, error } = await sayfaCek(bastan, bastan + sayfaBoyutu - 1);
    if (error) throw error;
    hepsi.push(...(data ?? []));
    if ((data?.length ?? 0) < sayfaBoyutu) return hepsi;
  }
  return hepsi;
}
