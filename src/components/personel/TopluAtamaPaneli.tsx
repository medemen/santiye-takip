interface Props {
  seciliAdet: number;
  yetkiliAdalar: string[];
  bulkAda: string;
  onBulkAdaChange: (ada: string) => void;
  onUygula: () => void;
  onIptal: () => void;
}

export default function TopluAtamaPaneli({
  seciliAdet,
  yetkiliAdalar,
  bulkAda,
  onBulkAdaChange,
  onUygula,
  onIptal,
}: Props) {
  return (
    <div
      style={{
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        border: '1px solid #f59e0b',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
          Toplu Atama ({seciliAdet} kişi seçili)
        </span>
        <button
          onClick={onIptal}
          style={{
            background: 'none', border: 'none', fontSize: 12, color: '#92400e',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          İptal
        </button>
      </div>
      <select
        value={bulkAda}
        onChange={(e) => onBulkAdaChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 8,
          border: '1px solid #f59e0b', fontSize: 13, backgroundColor: '#fff',
          marginBottom: 10, boxSizing: 'border-box',
        }}
      >
        <option value="">Ada seçin</option>
        {yetkiliAdalar.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <button
        onClick={onUygula}
        disabled={!bulkAda || seciliAdet === 0}
        style={{
          width: '100%', padding: 10,
          backgroundColor: bulkAda && seciliAdet > 0 ? '#f59e0b' : '#e5e7eb',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
          color: bulkAda && seciliAdet > 0 ? '#fff' : '#9ca3af',
          cursor: bulkAda && seciliAdet > 0 ? 'pointer' : 'not-allowed',
        }}
      >
        {seciliAdet > 0 ? `${seciliAdet} Kişiyi ${bulkAda} Adasına Ata` : 'Kişi Seçin'}
      </button>
    </div>
  );
}
