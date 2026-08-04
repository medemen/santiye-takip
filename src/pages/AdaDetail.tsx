import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { blokData } from '../data/blokData';
import BlokCard from '../components/BlokCard';
import { getSantiyeSefi, getBlokSorumlulari } from '../data/personelData';
import { getAdaGenelIlerleme } from '../store/reportStore';
import { IS_KALEMLERI } from '../data/isKalemleri';
import ProgressBar from '../components/ProgressBar';

export default function AdaDetail() {
  const { ada } = useParams<{ ada: string }>();
  const navigate = useNavigate();
  const [filterTip, setFilterTip] = useState('');

  const adaData = blokData.adalar.find((a) => a.ada === ada);

  if (!adaData) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Ada bulunamadı</div>;
  }

  const ilerleme = getAdaGenelIlerleme(ada!, adaData.bloklar, IS_KALEMLERI);
  const santiyeSefi = getSantiyeSefi(ada!);
  const sorumlular = getBlokSorumlulari(ada!);

  const tipler = [...new Set(adaData.bloklar.map((b) => b.tip))];
  const filteredBloklar = filterTip
    ? adaData.bloklar.filter((b) => b.tip === filterTip)
    : adaData.bloklar;

  return (
    <div>
      <button
        onClick={() => navigate('/adalar')}
        style={{
          background: 'none',
          border: 'none',
          color: '#f59e0b',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 12,
        }}
      >
        ← Adalara Dön
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0, marginBottom: 4 }}>
        {ada}
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', margin: 0, marginBottom: 12 }}>
        Şantiye Şefi: {santiyeSefi} | {adaData.blok_sayisi} Blok, {adaData.toplam_daire} Daire, {adaData.toplam_kat} Kat
      </p>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          border: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>Ada İlerlemesi</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>%{ilerleme}</span>
        </div>
        <ProgressBar value={ilerleme} height={8} />
        <button
          onClick={() => navigate(`/rapor-ekle?ada=${ada}&blok=0`)}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '10px 12px',
            backgroundColor: '#fef3c7',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            color: '#92400e',
            cursor: 'pointer',
          }}
        >
          Ada Geneli Rapor Ekle
        </button>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          border: '1px solid #f0f0f0',
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
          Sorumlu Personel ({sorumlular.length})
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {sorumlular.map((p) => (
            <span
              key={p}
              style={{
                fontSize: 12,
                backgroundColor: '#fef3c7',
                color: '#92400e',
                padding: '3px 10px',
                borderRadius: 12,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            onClick={() => setFilterTip('')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: filterTip === '' ? '#f59e0b' : '#f3f4f6',
              color: filterTip === '' ? '#fff' : '#4b5563',
              whiteSpace: 'nowrap',
            }}
          >
            Tümü ({adaData.bloklar.length})
          </button>
          {tipler.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTip(t)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: filterTip === t ? '#f59e0b' : '#f3f4f6',
                color: filterTip === t ? '#fff' : '#4b5563',
                whiteSpace: 'nowrap',
              }}
            >
              {t} ({adaData.bloklar.filter((b) => b.tip === t).length})
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredBloklar.map((blok) => (
          <BlokCard
            key={blok.blok_no}
            ada={ada!}
            blok={blok}
            onClick={() => navigate(`/ada/${ada}/blok/${blok.blok_no}`)}
          />
        ))}
      </div>
    </div>
  );
}
