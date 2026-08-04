-- Baslangic sekemasi (remote'da uygulanmis 20260730124043_initial_schema ile eslestirildi)
create table public.kullanicilar (
  id uuid references auth.users on delete cascade primary key,
  ad_soyad text not null,
  rol text not null default 'Personel',
  admin boolean not null default false,
  yetkili_adalar text[] default '{}',
  atanan_ada text,
  created_at timestamptz default now()
);

create table public.adalar (
  ada text primary key,
  blok_sayisi int not null,
  toplam_daire int not null,
  toplam_kat int not null,
  created_at timestamptz default now()
);

create table public.bloklar (
  id serial primary key,
  ada text references public.adalar(ada) on delete cascade,
  blok_no int not null,
  tip text not null,
  daire_sayisi int not null,
  yapi_konfigurasyonu text not null,
  kat_sayisi int not null,
  unique(ada, blok_no)
);

create table public.raporlar (
  id text primary key,
  tarih date not null,
  raporlayan text not null,
  ada text not null,
  blok_no int not null,
  is_kalemi text not null,
  durum text not null check (durum in ('planlandi','devam_ediyor','tamamlandi','gecikme')),
  ilerleme_yuzde int not null default 0,
  aciklama text default '',
  fotograflar text[] default '{}',
  olusturma_tarihi timestamptz default now(),
  created_at timestamptz default now()
);

create table public.kullanici_ada_atamalari (
  ad_soyad text primary key,
  ada text,
  updated_at timestamptz default now()
);

create table public.kullanici_blok_atamalari (
  id serial primary key,
  ad_soyad text not null,
  ada text not null,
  blok_nos int[] not null default '{}',
  unique(ad_soyad, ada)
);

create table public.is_kalemi_hedefleri (
  id serial primary key,
  ada text not null,
  blok_no int not null,
  is_kalemi text not null,
  hedef_tarih date,
  unique(ada, blok_no, is_kalemi)
);
