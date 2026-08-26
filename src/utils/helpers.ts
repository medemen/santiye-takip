export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Sabit format: tarayici/OS bagimsiz DD.MM.YYYY HH:MM (Excel export icin)
export function formatDateTimeSabit(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const g = String(d.getDate()).padStart(2, '0');
  const a = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  const s = String(d.getHours()).padStart(2, '0');
  const dk = String(d.getMinutes()).padStart(2, '0');
  return `${g}.${a}.${y} ${s}:${dk}`;
}

// toISOString UTC dondurur; yerel saat 00:00-03:00 arasinda onceki gunu
// verir. Yerel tarih parçalarindan ISO uret.
export function todayISO(): string {
  const d = new Date();
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  const gun = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${ay}-${gun}`;
}

// 'YYYY-MM-DD' metnini UTC yerine YEREL gece yarisi olarak kurar;
// new Date('YYYY-MM-DD') spec geregi UTC parse eder ve negatif offsetli
// saat dilimlerinde tarih bir gun kayar.
export function yerelTarih(metin: string): Date {
  const [y, a, g] = metin.split('-').map(Number);
  return new Date(y || 1970, (a || 1) - 1, g || 1);
}

// Rapor yapilan isi belgeler; gelecek tarihli kayit trend ve hedef
// karsilastirmalarini bozar. ISO metin karsilastirmasi kronolojik siraladir.
export function gelecektekiTarihMi(tarih: string): boolean {
  return !!tarih && tarih > todayISO();
}
