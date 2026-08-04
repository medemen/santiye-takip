-- Ada + is kalemi indexi (remote'da 20260731130305_raporlar_ada_is_kalemi_index ile eslestirildi)
create index if not exists idx_raporlar_ada_is_kalemi on public.raporlar(ada, is_kalemi);
