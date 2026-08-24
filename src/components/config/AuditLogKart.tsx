import { useEffect, useState } from 'react';
import { getSupabase } from '../../lib/supabase';
import { supabaseOturumAktif } from '../../stores/authStore';
import { formatDateTime } from '../../utils/helpers';
import {
  auditDegisiklikOzeti,
  ISLEM_ETIKETLERI,
  TABLO_ETIKETLERI,
} from '../../utils/audit';
import type { AuditKaydi } from '../../utils/audit';

const LIMIT = 100;

const ISLEM_RENKLERI: Record<AuditKaydi['islem'], string> = {
  INSERT: '#16a34a',
  UPDATE: '#f59e0b',
  DELETE: '#ef4444',
};

export default function AuditLogKart() {
  const [kayitlar, setKayitlar] = useState<AuditKaydi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [acikId, setAcikId] = useState<number | null>(null);

  useEffect(() => {
    let iptal = false;
    if (!supabaseOturumAktif()) {
      setHata('Denetim kaydı için sunucu bağlantısı gerekli.');
      return;
    }
    (async () => {
      try {
        const { data, error } = await getSupabase()
          .from('audit_log')
          .select('*')
          .order('islem_zamani', { ascending: false })
          .limit(LIMIT);
        if (iptal) return;
        if (error) setHata(error.message);
        else setKayitlar((data ?? []) as AuditKaydi[]);
      } catch (err) {
        if (!iptal) setHata(err instanceof Error ? err.message : 'Bilinmeyen hata');
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
          Denetim Kaydı
        </h3>
        {kayitlar && (
          <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
            son {kayitlar.length} işlem
          </span>
        )}
      </div>

      {hata && (
        <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>{hata}</p>
      )}

      {!hata && kayitlar === null && (
        <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: 0 }}>Yükleniyor…</p>
      )}

      {kayitlar !== null && kayitlar.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: 0 }}>
          Henüz denetim kaydı yok.
        </p>
      )}

      {kayitlar !== null && kayitlar.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {kayitlar.map((k) => {
            const ozet = auditDegisiklikOzeti(k);
            const acik = acikId === k.id;
            const tabloAdi = TABLO_ETIKETLERI[k.tablo_adi] ?? k.tablo_adi;
            return (
              <div key={k.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <button
                  type="button"
                  onClick={() => setAcikId(acik ? null : k.id)}
                  disabled={ozet.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 4px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    font: 'inherit',
                    cursor: ozet.length > 0 ? 'pointer' : 'default',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#fff',
                      backgroundColor: ISLEM_RENKLERI[k.islem],
                      borderRadius: 6,
                      padding: '2px 7px',
                    }}
                  >
                    {ISLEM_ETIKETLERI[k.islem]}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                    {tabloAdi} #{k.kayit_id}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {k.islem_yapan_ad ?? 'bilinmiyor'} • {formatDateTime(k.islem_zamani)}
                    {!acik && ozet.length > 0 ? ` • ${ozet[0]}` : ''}
                  </span>
                  {ozet.length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-subtle)', flexShrink: 0 }}>
                      {acik ? '▲' : '▼'}
                    </span>
                  )}
                </button>
                {acik && ozet.length > 0 && (
                  <div style={{ padding: '2px 4px 10px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {ozet.map((s, i) => (
                      <span key={i} style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                        • {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
