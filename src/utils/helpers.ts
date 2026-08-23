export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
