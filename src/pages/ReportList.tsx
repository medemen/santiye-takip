import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deleteRapor } from '../stores/reportStore';
import { useRaporlar } from '../hooks/useRaporlar';
import { getCurrentUser, isSahaPersoneli } from '../stores/authStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAdaList } from '../config/helpers';
import ReportCard from '../components/ReportCard';
import { DURUM_LABELLARI } from '../config/defaultConfig';
import { toastGoster } from '../stores/toastStore';
import { raporlarXlsxExport } from '../utils/exportXlsx';
import { onayla } from '../utils/dialog';
import { getHedef } from '../stores/hedefStore';

const PAGE_SIZE = 20;

export default function ReportList() {
  const navigate = useNavigate();
  const config = useSiteConfig();
  const raporlar = useRaporlar();
  const [searchParams] = useSearchParams();
  const preAda = searchParams.get('ada') || '';
  const preBlok = searchParams.get('blok') || '';

  const [filterAda, setFilterAda] = useState(preAda);
  const [filterBlok, setFilterBlok] = useState(preBlok);
  const [filterDurum, setFilterDurum] = useState('');
  const [sadeceBenim, setSadeceBenim] = useState(false);
  const [sistemRaporlariDahil, setSistemRaporlariDahil] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [sayfa, setSayfa] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(searchTerm), 250);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    setSayfa(1);
  }, [filterAda, filterBlok, filterDurum, sadeceBenim, sistemRaporlariDahil, debouncedTerm]);

  const user = getCurrentUser();
  const isAdmin = (user?.admin ?? false) || (user?.proje_muduru ?? false);

  const canEditReport = (raporlayan: string) => {
    if (!user) return false;
    if (isAdmin) return true;
    return isSahaPersoneli(user.rol) && user.ad_soyad === raporlayan;
  };

  const canDeleteReport = () => isAdmin;

  const filtered = useMemo(() => {
    const kaynak = sadeceBenim && user
      ? raporlar.filter((r) => r.raporlayan === user.ad_soyad)
      : raporlar;
    return [...kaynak]
      .sort(
        (a, b) => new Date(b.olusturma_tarihi).getTime() - new Date(a.olusturma_tarihi).getTime()
      )
      .filter((r) => {
        if (!sistemRaporlariDahil && r.raporlayan === 'DURUM TESPİT') return false;
        if (filterAda && r.ada !== filterAda) return false;
        if (filterBlok && r.blok_no !== parseInt(filterBlok)) return false;
        if (filterDurum && r.durum !== filterDurum) return false;
        if (debouncedTerm) {
          const q = debouncedTerm.toLowerCase();
          if (!r.ada.toLowerCase().includes(q) &&
              !String(r.blok_no).includes(q) &&
              !r.is_kalemi.toLowerCase().includes(q) &&
              !r.aciklama.toLowerCase().includes(q) &&
              !r.raporlayan.toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      });
  }, [raporlar, user, sadeceBenim, sistemRaporlariDahil, filterAda, filterBlok, filterDurum, debouncedTerm]);

  const adaList = getAdaList(config);

  const toplamSayfa = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const gecerliSayfa = Math.min(sayfa, toplamSayfa);
  const gorunenRaporlar = filtered.slice((gecerliSayfa - 1) * PAGE_SIZE, gecerliSayfa * PAGE_SIZE);

  const handleDelete = async (id: string) => {
    if (await onayla('Bu raporu silmek istediğinize emin misiniz?')) {
      if (deleteRapor(id)) {
        toastGoster('Rapor silindi', 'success');
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Raporlar</h1>
        <button
          onClick={async () => { await raporlarXlsxExport(filtered, 'raporlar.xlsx', getHedef); toastGoster(`${filtered.length} rapor Excel olarak indiriliyor`, 'success'); }}
          style={{
            background: 'none', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '4px 10px', fontSize: 11, color: 'var(--text-faint)', cursor: 'pointer',
          }}
          title="Excel Aktar"
        >
          📥 Excel
        </button>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          border: '1px solid #f0f0f0',
        }}
      >
        <input
          type="text"
          placeholder="Ada, blok, iş kalemi, açıklama veya kişi ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 13,
            marginBottom: 8,
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => setSadeceBenim(false)}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: !sadeceBenim ? '#f59e0b' : 'var(--bg-subtle)',
              color: !sadeceBenim ? '#fff' : 'var(--text-muted)',
            }}
          >
            Tüm Raporlar
          </button>
          <button
            onClick={() => setSadeceBenim(true)}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: sadeceBenim ? '#f59e0b' : 'var(--bg-subtle)',
              color: sadeceBenim ? '#fff' : 'var(--text-muted)',
            }}
          >
            Raporlarım
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--text-faint)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={sistemRaporlariDahil}
              onChange={(e) => setSistemRaporlariDahil(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            DURUM TESPİT + tahmin raporlarını göster
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={filterAda}
            onChange={(e) => { setFilterAda(e.target.value); setFilterBlok(''); }}
            style={{
              flex: 1,
              minWidth: 100,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 12,
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <option value="">Tüm Adalar</option>
            {adaList.map((a) => (
              <option key={a.ada} value={a.ada}>{a.ada}</option>
            ))}
          </select>

          <select
            value={filterBlok}
            onChange={(e) => setFilterBlok(e.target.value)}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 12,
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <option value="">Tüm Bloklar</option>
            {filterAda && (
              <option value="0">Ada Geneli</option>
            )}
            {filterAda && adaList.find((a) => a.ada === filterAda)?.bloklar.map((b) => (
              <option key={b.blok_no} value={b.blok_no.toString()}>
                Blok {b.blok_no}
              </option>
            ))}
          </select>

          <select
            value={filterDurum}
            onChange={(e) => setFilterDurum(e.target.value)}
            style={{
              flex: 1,
              minWidth: 80,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 12,
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <option value="">Tüm Durumlar</option>
            {(Object.entries(DURUM_LABELLARI) as [string, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              color: 'var(--text-subtle)',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 12,
              border: '1px solid #f0f0f0',
            }}
          >
            <p style={{ fontSize: 14 }}>Eşleşen rapor bulunamadı</p>
            <p style={{ fontSize: 12 }}>Filtreleri temizleyip tekrar deneyin</p>
          </div>
        ) : (
          gorunenRaporlar.map((r) => {
            const editable = canEditReport(r.raporlayan);
            return (
            <div
              key={r.id}
              onClick={() => editable ? navigate(`/rapor-ekle?edit=${r.id}`) : undefined}
              style={{ cursor: editable ? 'pointer' : 'default', position: 'relative' }}
            >
              <ReportCard rapor={r} showActions />
              {canDeleteReport() && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  gap: 4,
                }}
              >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                    style={{
                      background: 'var(--bg-danger)',
                      border: 'none',
                      borderRadius: 6,
                      padding: '2px 6px',
                      fontSize: 12,
                      cursor: 'pointer',
                      color: '#ef4444',
                    }}
                    title="Sil"
                  >
                    🗑️
                  </button>
              </div>
              )}
            </div>
            );
          })
        )}
      </div>

      {toplamSayfa > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <button
            onClick={() => setSayfa((s) => Math.max(1, s - 1))}
            disabled={gecerliSayfa === 1}
            style={{
              background: 'none',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              color: gecerliSayfa === 1 ? 'var(--border)' : 'var(--text-faint)',
              cursor: gecerliSayfa === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ‹ Önceki
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            Sayfa {gecerliSayfa} / {toplamSayfa}
          </span>
          <button
            onClick={() => setSayfa((s) => Math.min(toplamSayfa, s + 1))}
            disabled={gecerliSayfa === toplamSayfa}
            style={{
              background: 'none',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              color: gecerliSayfa === toplamSayfa ? 'var(--border)' : 'var(--text-faint)',
              cursor: gecerliSayfa === toplamSayfa ? 'not-allowed' : 'pointer',
            }}
          >
            Sonraki ›
          </button>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center' }}>
        Toplam {filtered.length} rapor
      </div>
    </div>
  );
}
