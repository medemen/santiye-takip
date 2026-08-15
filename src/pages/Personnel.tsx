import { useState } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { getAdaList } from '../config/helpers';
import { getAllPersonel, getKullanicilar } from '../stores/kullanicilarStore';
import { getPersonelRaporlari } from '../stores/reportStore';
import { getKullaniciBlokAtamasi, setKullaniciBlokAtamasi, getKullaniciAdaAtamasi, setKullaniciAdaAtamasi } from '../stores/atamaStore';
import { getCurrentUser, isProjeMuduruSession } from '../stores/authStore';
import type { BlokAtamasi } from '../types';
import { YeniKullaniciForm } from '../components/KullaniciYonetim';
import PersonelKart from '../components/personel/PersonelKart';
import PersonelDetay from '../components/personel/PersonelDetay';
import PersonelDuzenle from '../components/personel/PersonelDuzenle';
import TopluAtamaPaneli from '../components/personel/TopluAtamaPaneli';
import { toastGoster } from '../stores/toastStore';

export default function Personnel() {
  const config = useSiteConfig();
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [editPerson, setEditPerson] = useState<string | null>(null);
  const [editAda, setEditAda] = useState<string>('');
  const [editBlokAtama, setEditBlokAtama] = useState<BlokAtamasi>({});
  const [bulkMode, setBulkMode] = useState(false);
  const [seciliKisiler, setSeciliKisiler] = useState<Set<string>>(new Set());
  const [bulkAda, setBulkAda] = useState('');
  const [yeniKullanici, setYeniKullanici] = useState(false);

  const user = getCurrentUser();
  const isAdmin = (user?.admin ?? false) || (user?.proje_muduru ?? false);
  const isPm = isProjeMuduruSession();
  const yetkiliAdalar = user?.yetkili_adalar ?? [];

  const adalar = getAdaList(config);

  const raporlar = selectedPerson ? getPersonelRaporlari(selectedPerson) : [];

  const personelList = getAllPersonel();
  const sefler = getKullanicilar().filter((k) => k.admin);

  const getEffectiveAda = (ad_soyad: string): string | null => {
    const lsAtama = getKullaniciAdaAtamasi(ad_soyad);
    if (lsAtama !== null) return lsAtama;
    const person = personelList.find((p) => p.ad_soyad === ad_soyad);
    return person?.atanan_ada ?? null;
  };

  const getAdaLabileli = (): { ada: string; personel: typeof personelList }[] => {
    const atanmis = personelList.filter((p) => getEffectiveAda(p.ad_soyad));
    const gruplu: Record<string, typeof personelList> = {};
    for (const p of atanmis) {
      const a = getEffectiveAda(p.ad_soyad)!;
      if (!gruplu[a]) gruplu[a] = [];
      gruplu[a].push(p);
    }
    return adalar.map((b) => ({
      ada: b.ada,
      personel: gruplu[b.ada] || [],
    }));
  };

  const getAtanmamisPersonel = () => {
    return personelList.filter((p) => !getEffectiveAda(p.ad_soyad));
  };

  const openEdit = (ad_soyad: string) => {
    setEditPerson(ad_soyad);
    const mevcutAda = getEffectiveAda(ad_soyad);
    setEditAda(mevcutAda ?? '');
    setEditBlokAtama(getKullaniciBlokAtamasi(ad_soyad));
  };

  const toggleBlok = (ada: string, blokNo: number) => {
    setEditBlokAtama((prev) => {
      const current = prev[ada] || [];
      const updated = current.includes(blokNo)
        ? current.filter((b) => b !== blokNo)
        : [...current, blokNo].sort((a, b) => a - b);
      return { ...prev, [ada]: updated };
    });
  };

  const toggleAda = (ada: string, bloklar: { blok_no: number }[]) => {
    setEditBlokAtama((prev) => {
      const current = prev[ada] || [];
      const allSelected = bloklar.every((b) => current.includes(b.blok_no));
      if (allSelected) {
        const { [ada]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ada]: bloklar.map((b) => b.blok_no) };
    });
  };

  const saveEdit = () => {
    if (!editPerson) return;
    setKullaniciAdaAtamasi(editPerson, editAda || null);
    setKullaniciBlokAtamasi(editPerson, editBlokAtama);
    toastGoster(`${editPerson} atamaları kaydedildi`, 'success');
    setEditPerson(null);
    setEditAda('');
    setEditBlokAtama({});
  };

  const cancelEdit = () => {
    setEditPerson(null);
    setEditAda('');
    setEditBlokAtama({});
  };

  if (yeniKullanici) {
    return (
      <YeniKullaniciForm
        onIptal={() => setYeniKullanici(false)}
        onKaydedildi={() => setYeniKullanici(false)}
      />
    );
  }

  if (selectedPerson) {
    return (
      <PersonelDetay
        ad_soyad={selectedPerson}
        raporlar={raporlar}
        adaAtamasi={getEffectiveAda(selectedPerson)}
        onGeri={() => setSelectedPerson(null)}
      />
    );
  }

  if (editPerson) {
    const person = personelList.find((p) => p.ad_soyad === editPerson);
    const kullanici = getKullanicilar().find((k) => k.ad_soyad === editPerson);
    return (
      <PersonelDuzenle
        editPerson={editPerson}
        person={person}
        kullanici={kullanici}
        editAda={editAda}
        editBlokAtama={editBlokAtama}
        adalar={adalar}
        yetkiliAdalar={yetkiliAdalar}
        isPm={isPm}
        onAdaChange={setEditAda}
        onBlokToggle={toggleBlok}
        onAdaToggle={toggleAda}
        onKaydet={saveEdit}
        onIptal={cancelEdit}
      />
    );
  }

  const atanmamis = getAtanmamisPersonel();
  const adaLabelli = getAdaLabileli();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Personel
        </h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {isPm && !bulkMode && (
            <button
              onClick={() => setYeniKullanici(true)}
              style={{
                background: 'none',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 11,
                color: '#f59e0b',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Yeni Kullanıcı Oluştur"
            >
              + Yeni Kullanıcı
            </button>
          )}
          {isAdmin && !bulkMode && (
            <button
              onClick={() => setBulkMode(true)}
              style={{
                background: 'none',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 11,
                color: '#f59e0b',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Toplu Atama"
            >
              📋 Toplu
            </button>
          )}
          {isAdmin && (
            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
              Yönetici modu
            </span>
          )}
        </div>
      </div>

      {bulkMode && (
        <TopluAtamaPaneli
          seciliAdet={seciliKisiler.size}
          yetkiliAdalar={yetkiliAdalar}
          bulkAda={bulkAda}
          onBulkAdaChange={setBulkAda}
          onUygula={() => {
            if (!bulkAda || seciliKisiler.size === 0) return;
            seciliKisiler.forEach((k) => setKullaniciAdaAtamasi(k, bulkAda));
            toastGoster(`${seciliKisiler.size} kişi ${bulkAda} adasına atandı`, 'success');
            setSeciliKisiler(new Set());
            setBulkAda('');
            setBulkMode(false);
          }}
          onIptal={() => { setBulkMode(false); setSeciliKisiler(new Set()); setBulkAda(''); }}
        />
      )}

      {atanmamis.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#ef4444',
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: '2px solid #ef4444',
            }}
          >
            Atanmamış Personel ({atanmamis.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {atanmamis.map((p) => (
              <PersonelKart
                key={p.ad_soyad}
                person={p}
                isAdmin={isAdmin}
                onClick={() => setSelectedPerson(p.ad_soyad)}
                onEdit={() => openEdit(p.ad_soyad)}
                bulkMode={bulkMode}
                secili={seciliKisiler.has(p.ad_soyad)}
                onToggleSelect={() => {
                  const yeni = new Set(seciliKisiler);
                  if (yeni.has(p.ad_soyad)) yeni.delete(p.ad_soyad);
                  else yeni.add(p.ad_soyad);
                  setSeciliKisiler(yeni);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {adaLabelli.map(({ ada, personel }) => {
        const sef = sefler.find((s) => s.yetkili_adalar.includes(ada));
        return (
          <div key={ada} style={{ marginBottom: 20 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: '2px solid #f59e0b',
              }}
            >
              {ada}
              {sef && (
                <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                  👷 {sef.ad_soyad}
                </span>
              )}
            </h2>

            {personel.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0' }}>
                Bu adaya atanmış personel yok
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {personel.map((p) => (
                  <PersonelKart
                    key={p.ad_soyad}
                    person={p}
                    isAdmin={isAdmin}
                    onClick={() => setSelectedPerson(p.ad_soyad)}
                    onEdit={() => openEdit(p.ad_soyad)}
                    bulkMode={bulkMode}
                    secili={seciliKisiler.has(p.ad_soyad)}
                    onToggleSelect={() => {
                      const yeni = new Set(seciliKisiler);
                      if (yeni.has(p.ad_soyad)) yeni.delete(p.ad_soyad);
                      else yeni.add(p.ad_soyad);
                      setSeciliKisiler(yeni);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
