import { card } from '../../utils/styles';
import { isoDate } from './aylar';
import type { HedefTakvimGorunumu } from './types';

function ayHucreleri(yil: number, ay: number): (string | null)[] {
  const ilk = new Date(yil, ay, 1);
  const offset = (ilk.getDay() + 6) % 7;
  const gunSayisi = new Date(yil, ay + 1, 0).getDate();
  const hucreler: (string | null)[] = [];
  for (let i = 0; i < offset; i++) hucreler.push(null);
  for (let d = 1; d <= gunSayisi; d++) hucreler.push(`${yil}-${String(ay + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  while (hucreler.length % 7 !== 0) hucreler.push(null);
  return hucreler;
}

interface Props {
  gorunenAy: Date;
  tarihHedefleri: Map<string, HedefTakvimGorunumu[]>;
  seciliAda: string;
  onHedefTikla: (ada: string, blokNo: number) => void;
}

function chipRenk(durum: { label: string; renk: string }, tamam: boolean): string {
  if (tamam) return '#22c55e';
  return durum.renk;
}

export default function TakvimIzgarasi({ gorunenAy, tarihHedefleri, seciliAda, onHedefTikla }: Props) {
  const bugunAnahtari = isoDate(new Date());

  return (
    <div style={{ ...card, marginBottom: 16, padding: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 4 }}>
        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((g) => (
          <div key={g} style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', padding: '2px 0' }}>{g}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {ayHucreleri(gorunenAy.getFullYear(), gorunenAy.getMonth()).map((tarih, i) => {
          if (!tarih) return <div key={`bos-${i}`} style={{ minHeight: 46 }} />;
          const gun = new Date(tarih);
          const gunHedefleri = tarihHedefleri.get(tarih) ?? [];
          const bugunMu = tarih === bugunAnahtari;
          const digerAydan = gun.getMonth() !== gorunenAy.getMonth();
          return (
            <div
              key={tarih}
              style={{
                minHeight: 46,
                backgroundColor: bugunMu ? '#fffbeb' : '#fff',
                border: bugunMu ? '1px solid #f59e0b' : '1px solid #f3f4f6',
                borderRadius: 6,
                padding: 2,
                opacity: digerAydan ? 0.4 : 1,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: bugunMu ? 700 : 500,
                  color: bugunMu ? '#f59e0b' : '#6b7280',
                  textAlign: 'center',
                  padding: '1px 0',
                }}
              >
                {gun.getDate()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {gunHedefleri.slice(0, 3).map((h) => (
                  <button
                    key={`${h.ada}-${h.blok_no}-${h.is_kalemi}`}
                    onClick={() => onHedefTikla(h.ada, h.blok_no)}
                    style={{
                      fontSize: 7,
                      lineHeight: 1.2,
                      padding: '1px 2px',
                      borderRadius: 3,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: chipRenk(h.durum, h.rapor?.durum === 'tamamlandi'),
                      color: '#fff',
                      textAlign: 'left',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {seciliAda ? `${h.blok_no === 0 ? 'Ada' : `B${h.blok_no}`}·${h.is_kalemi}` : `${h.ada}·${h.blok_no === 0 ? 'Ada' : `B${h.blok_no}`}`}
                  </button>
                ))}
                {gunHedefleri.length > 3 && (
                  <div style={{ fontSize: 7, color: '#9ca3af', paddingLeft: 2 }}>+{gunHedefleri.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#6b7280' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#ef4444', display: 'inline-block' }} /> Geçmiş
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#6b7280' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#f59e0b', display: 'inline-block' }} /> Bugün / ≤7 gün
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#6b7280' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#3b82f6', display: 'inline-block' }} /> Yakında
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#6b7280' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#22c55e', display: 'inline-block' }} /> Tamamlandı
        </span>
      </div>
    </div>
  );
}
