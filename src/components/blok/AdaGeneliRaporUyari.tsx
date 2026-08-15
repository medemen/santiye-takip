interface Props {
  gorunur: boolean;
}

export default function AdaGeneliRaporUyari({ gorunur }: Props) {
  if (!gorunur) return null;
  return (
    <div
      style={{
        backgroundColor: '#fef3c7',
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 16,
        fontSize: 12,
        color: '#92400e',
        border: '1px solid #fde68a',
      }}
    >
      ℹ️ Bu blok için özel rapor girilmedi. İlerleme, DURUM TESPİT raporundaki{' '}
      <strong>ada geneli</strong> verilerden gösteriliyor.
    </div>
  );
}
