create table public.analysis_diagnoses (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null unique references public.analyses(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  status text not null,
  crop text, disease text, is_healthy boolean, cause text, message text, disclaimer text,
  confidence numeric,
  symptoms jsonb default '[]'::jsonb, prevention jsonb default '[]'::jsonb, management jsonb default '[]'::jsonb,
  other_possibilities jsonb default '[]'::jsonb, looks_like jsonb,
  created_at timestamptz not null default now()
);
create index analysis_diagnoses_analysis_id_idx on public.analysis_diagnoses(analysis_id);
create index analysis_diagnoses_user_disease_idx on public.analysis_diagnoses(user_id, disease);
grant select, insert, update, delete on public.analysis_diagnoses to authenticated;
grant all on public.analysis_diagnoses to service_role;
alter table public.analysis_diagnoses enable row level security;
create policy "own rows select" on public.analysis_diagnoses for select to authenticated using (auth.uid() = user_id);
create policy "own rows insert" on public.analysis_diagnoses for insert to authenticated with check (auth.uid() = user_id);
create policy "own rows update" on public.analysis_diagnoses for update to authenticated using (auth.uid() = user_id);
create policy "own rows delete" on public.analysis_diagnoses for delete to authenticated using (auth.uid() = user_id);