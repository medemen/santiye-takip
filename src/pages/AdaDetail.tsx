import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import BlokCard from '../components/BlokCard';
import ProgressBar from '../components/ProgressBar';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useHedefler } from '../hooks/useHedefler';
import { getAda, getBloklar, getAllKalemler } from '../config/helpers';
import { getSantiyeSefi, getBlokSorumlulari } from '../stores/kullanicilarStore';
import { getAdaGenelIlerleme, getSonRapor } from '../stores/reportStore';
import { getHedefOzeti } from '../data/plan';

export default function AdaDetail() {
  const { ada } = useParams<{ ada: string }>();
  const navigate = useNavigate();
  const config = useSiteConfig();
  const [filterTip, setFilterTip] = useState('');

  const hedefler = useHedefler();
  const hedefOzeti = getHedefOzeti(
    hedefler.filter((h) => h.ada === ada),
    (a, b, ik) => getSonRapor(a, b, ik)
  );

  const adaData = getAda(config, ada!);

  if (!adaData) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Ada bulunamadı</div>;
  }

  const bloklar = getBloklar(config, ada!);
  const ilerleme = getAdaGenelIlerleme(ada!, bloklar, getAllKalemler(config));
  const santiyeSefi = getSantiyeSefi(ada!);
  const sorumlular = getBlokSorumlulari(ada!);

  const tipler = [...new Set(bloklar.map((b) => b.tip))];
  const filteredBloklar = filterTip
    ? bloklar.filter((b) => b.tip === filterTip)
    : bloklar;

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
        Şantiye Şefi: {santiyeSefi} | {bloklar.length} Blok, {adaData.toplam_daire} Daire, {adaData.toplam_kat} Kat
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

      {hedefOzeti.toplam > 0 && (
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
            🎯 Hedef Özeti ({hedefOzeti.toplam})
          </h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 12, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '3px 10px', borderRadius: 12 }}>
              ✅ {hedefOzeti.tamamlanan} tamam
            </span>
            <span style={{ fontSize: 12, backgroundColor: hedefOzeti.suresiGecen > 0 ? '#fef2f2' : '#f3f4f6', color: hedefOzeti.suresiGecen > 0 ? '#ef4444' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: hedefOzeti.suresiGecen > 0 ? 700 : 400 }}>
              ⛔ {hedefOzeti.suresiGecen} süresi geçti
            </span>
            <span style={{ fontSize: 12, backgroundColor: hedefOzeti.bugun > 0 ? '#fef3c7' : '#f3f4f6', color: hedefOzeti.bugun > 0 ? '#92400e' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: hedefOzeti.bugun > 0 ? 700 : 400 }}>
              📅 {hedefOzeti.bugun} bugün
            </span>
            <span style={{ fontSize: 12, backgroundColor: hedefOzeti.yediGun > 0 ? '#fef3c7' : '#f3f4f6', color: hedefOzeti.yediGun > 0 ? '#92400e' : '#4b5563', padding: '3px 10px', borderRadius: 12, fontWeight: hedefOzeti.yediGun > 0 ? 700 : 400 }}>
              ⏳ {hedefOzeti.yediGun} ≤7 gün
            </span>
          </div>
          {hedefOzeti.acil.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {hedefOzeti.acil.slice(0, 5).map((h) => (
                <div
                  key={`${h.blok_no}-${h.is_kalemi}`}
                  onClick={() => navigate(h.blok_no === 0 ? `/ada/${h.ada}` : `/ada/${h.ada}/blok/${h.blok_no}`)}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 10px', backgroundColor: '#f9fafb',
                    borderRadius: 8, cursor: 'pointer', fontSize: 12,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    {h.blok_no === 0 ? 'Ada Geneli' : `Blok ${h.blok_no}`}
                  </span>
                  <span style={{ color: '#374151' }}>{h.is_kalemi}</span>
                  <span style={{ color: h.durum.renk, fontWeight: 600 }}>{h.durum.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            Tümü ({bloklar.length})
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
              {t} ({bloklar.filter((b) => b.tip === t).length})
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
