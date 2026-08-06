import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHedefler } from '../hooks/useHedefler';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAdaList } from '../config/helpers';
import { getSonRapor } from '../stores/reportStore';
import { getIlerlemeDurumu, hedefKalanGun } from '../data/plan';
import { hedeflerXlsxExport } from '../utils/exportXlsx';
import { elementPdfExport } from '../utils/exportPdf';
import { toastGoster } from '../stores/toastStore';
import { card } from '../utils/styles';

const AY_ADLARI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

export default function HedefTakvim() {
  const navigate = useNavigate();
  const config = useSiteConfig();
  const hedefler = useHedefler();

  const bugun = new Date();
  const [gorunenAy, setGorunenAy] = useState(() => new Date(bugun.getFullYear(), bugun.getMonth(), 1));
  const [seciliAda, setSeciliAda] = useState<string>('');
  const pdfRef = useRef<HTMLDivElement>(null);

  const adalar = getAdaList(config);

  const gorunenHedefler = hedefler
    .filter((h) => !seciliAda || h.ada === seciliAda)
    .map((h) => ({
      ...h,
      rapor: getSonRapor(h.ada, h.blok_no, h.is_kalemi),
      durum: getIlerlemeDurumu(getSonRapor(h.ada, h.blok_no, h.is_kalemi), h.hedef_tarih),
    }));

  const ayAnahtari = isoDate(gorunenAy).slice(0, 7);
  const ayHedefleri = gorunenHedefler.filter((h) => h.hedef_tarih.startsWith(ayAnahtari));

  const tamamlanan = gorunenHedefler.filter((h) => h.rapor?.durum === 'tamamlandi').length;
  const aktif = gorunenHedefler.filter((h) => h.rapor?.durum !== 'tamamlandi');
  const suresiGecen = aktif.filter((h) => hedefKalanGun(h.hedef_tarih) < 0).length;
  const bugunku = aktif.filter((h) => hedefKalanGun(h.hedef_tarih) === 0).length;
  const haftaUcunda = aktif.filter((h) => {
    const k = hedefKalanGun(h.hedef_tarih);
    return k > 0 && k <= 7;
  }).length;

  const chipRenk = (durum: { label: string; renk: string }, tamam: boolean): string => {
    if (tamam) return '#22c55e';
    return durum.renk;
  };

  const ayOnce = () => setGorunenAy((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const aySonra = () => setGorunenAy((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const buguneGit = () => setGorunenAy(new Date(bugun.getFullYear(), bugun.getMonth(), 1));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 }}>📅 Hedef Takvimi</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={buguneGit}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#4b5563', cursor: 'pointer' }}
          >
            Bugün
          </button>
          <button
            onClick={async () => {
              await hedeflerXlsxExport(gorunenHedefler, (a, b, ik) => getSonRapor(a, b, ik), 'hedef-takvimi.xlsx');
              toastGoster(`${gorunenHedefler.length} hedef Excel olarak indiriliyor`, 'success');
            }}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#6b7280', cursor: 'pointer' }}
            title="Excel Aktar"
          >
            📥
          </button>
          <button
            onClick={async () => {
              if (pdfRef.current) {
                await elementPdfExport(pdfRef.current, `hedef-takvimi_${AY_ADLARI[gorunenAy.getMonth()]}_${gorunenAy.getFullYear()}.pdf`);
                toastGoster('Hedef takvimi PDF olarak indiriliyor', 'success');
              }
            }}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#6b7280', cursor: 'pointer' }}
            title="PDF Aktar"
          >
            📄
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={ayOnce} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: '#4b5563' }}>◀</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#374151' }}>
          {AY_ADLARI[gorunenAy.getMonth()]} {gorunenAy.getFullYear()}
        </div>
        <button onClick={aySonra} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: '#4b5563' }}>▶</button>
      </div>

      {adalar.length > 1 && (
        <select
          value={seciliAda}
          onChange={(e) => setSeciliAda(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 12, backgroundColor: '#fff' }}
        >
          <option value="">Tüm Adalar</option>
          {adalar.map((a) => (
            <option key={a.ada} value={a.ada}>{a.ada}</option>
          ))}
        </select>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 12, backgroundColor: '#fef2f2', color: '#ef4444', padding: '3px 10px', borderRadius: 12, fontWeight: suresiGecen > 0 ? 700 : 400 }}>
          ⛔ {suresiGecen} geçmiş
        </span>
        <span style={{ fontSize: 12, backgroundColor: bugunku > 0 ? '#fef3c7' : '#f3f4f6', color: bugunku > 0 ? '#92400e' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: bugunku > 0 ? 700 : 400 }}>
          📅 {bugunku} bugün
        </span>
        <span style={{ fontSize: 12, backgroundColor: haftaUcunda > 0 ? '#fef3c7' : '#f3f4f6', color: haftaUcunda > 0 ? '#92400e' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: haftaUcunda > 0 ? 700 : 400 }}>
          ⏳ {haftaUcunda} ≤7 gün
        </span>
        <span style={{ fontSize: 12, backgroundColor: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: 12 }}>
          ✅ {tamamlanan} tamam
        </span>
      </div>

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
            const gunHedefleri = gorunenHedefler.filter((h) => h.hedef_tarih === tarih);
            const bugunMu = tarih === isoDate(bugun);
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
                      onClick={() => navigate(h.blok_no === 0 ? `/ada/${h.ada}` : `/ada/${h.ada}/blok/${h.blok_no}`)}
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

      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
          {AY_ADLARI[gorunenAy.getMonth()]} ayı hedefleri ({ayHedefleri.length})
        </h3>
        {ayHedefleri.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Bu ay için hedef tanımlanmamış.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ayHedefleri
              .slice()
              .sort((a, b) => a.hedef_tarih.localeCompare(b.hedef_tarih))
              .map((h) => (
                <div
                  key={`${h.ada}-${h.blok_no}-${h.is_kalemi}`}
                  onClick={() => navigate(h.blok_no === 0 ? `/ada/${h.ada}` : `/ada/${h.ada}/blok/${h.blok_no}`)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 10px', backgroundColor: '#f9fafb', borderRadius: 8, cursor: 'pointer', fontSize: 12, gap: 6,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: '#374151' }}>
                      {h.ada} - {h.blok_no === 0 ? 'Ada Geneli' : `Blok ${h.blok_no}`}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {h.is_kalemi}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{h.hedef_tarih}</div>
                    <div style={{ fontSize: 11, color: h.durum.renk, fontWeight: 600 }}>{h.durum.label}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div
        ref={pdfRef}
        style={{
          position: 'absolute',
          left: -10000,
          top: 0,
          width: 820,
          backgroundColor: '#fff',
          padding: 24,
          color: '#111827',
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          {config.genel.santiyeAdi} - Hedef Takvimi
        </div>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
          {AY_ADLARI[gorunenAy.getMonth()]} {gorunenAy.getFullYear()}
          {seciliAda ? ` • ${seciliAda}` : ' • Tüm Adalar'}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Ada</th>
              <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Blok</th>
              <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>İş Kalemi</th>
              <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Hedef Tarih</th>
              <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Kalan Gün</th>
              <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Durum</th>
              <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>İlerleme (%)</th>
            </tr>
          </thead>
          <tbody>
            {ayHedefleri
              .slice()
              .sort((a, b) => a.hedef_tarih.localeCompare(b.hedef_tarih))
              .map((h) => (
                <tr key={`${h.ada}-${h.blok_no}-${h.is_kalemi}`}>
                  <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{h.ada}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{h.blok_no === 0 ? 'Ada Geneli' : h.blok_no}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{h.is_kalemi}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{h.hedef_tarih}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{hedefKalanGun(h.hedef_tarih)}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: 6, color: h.durum.renk }}>{h.durum.label}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{h.rapor?.ilerleme_yuzde ?? '-'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
