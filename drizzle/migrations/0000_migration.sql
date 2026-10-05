
create type public.data_source as enum ('demo','backend');
create type public.analysis_status as enum ('queued','processing','completed','failed','vision_unavailable');
create type public.health_status as enum ('healthy','attention','high_stress','unknown');

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key,
  full_name text,
  organization text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  location text,
  primary_crop text,
  area_hectares numeric,
  health_status public.health_status not null default 'unknown',
  source public.data_source not null default 'backend',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fields_user_idx on public.fields(user_id);

create table public.crops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  field_id uuid references public.fields(id) on delete cascade,
  name text not null,
  variety text,
  planted_on date,
  created_at timestamptz not null default now()
);
create index crops_user_idx on public.crops(user_id);
create index crops_field_idx on public.crops(field_id);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  field_id uuid references public.fields(id) on delete set null,
  crop_id uuid references public.crops(id) on delete set null,
  crop_type text not null,
  mode text not null default 'standard',
  notes text,
  status public.analysis_status not null default 'queued',
  source public.data_source not null default 'backend',
  pipeline jsonb not null default '[]'::jsonb,
  image_quality_score numeric,
  vegetation_coverage numeric,
  affected_area numeric,
  suspicious_region_count int,
  confidence numeric,
  health_status public.health_status not null default 'unknown',
  agent_decision text,
  final_assessment text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index analyses_user_created_idx on public.analyses(user_id, created_at desc);
create index analyses_field_idx on public.analyses(field_id);

create table public.analysis_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  kind text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  width int, height int,
  created_at timestamptz not null default now()
);
create index analysis_images_analysis_idx on public.analysis_images(analysis_id);

create table public.analysis_regions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  label text not null,
  x numeric not null, y numeric not null, w numeric not null, h numeric not null,
  contour jsonb,
  area_percent numeric,
  severity text not null default 'attention',
  reanalyzed boolean not null default false,
  created_at timestamptz not null default now()
);
create index analysis_regions_analysis_idx on public.analysis_regions(analysis_id);

create table public.analysis_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  key text not null,
  label text not null,
  value numeric,
  unit text,
  created_at timestamptz not null default now()
);
create index analysis_measurements_analysis_idx on public.analysis_measurements(analysis_id);

create table public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  seq int not null,
  actor text not null,
  action text not null,
  status text not null default 'completed',
  description text,
  created_at timestamptz not null default now()
);
create index agent_actions_analysis_idx on public.agent_actions(analysis_id, seq);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  analysis_id uuid references public.analyses(id) on delete cascade,
  field_id uuid references public.fields(id) on delete cascade,
  title text not null,
  reason text,
  next_step text,
  severity text not null default 'info',
  created_at timestamptz not null default now()
);
create index recommendations_user_idx on public.recommendations(user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  report_type text not null,
  title text not null,
  period_start date, period_end date,
  status text not null default 'ready',
  summary jsonb not null default '{}'::jsonb,
  storage_path text,
  source public.data_source not null default 'backend',
  created_at timestamptz not null default now()
);
create index reports_user_idx on public.reports(user_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['fields','crops','analyses','analysis_images','analysis_regions','analysis_measurements','agent_actions','recommendations','reports','notifications'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows select" on public.%I for select to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "own rows insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows update" on public.%I for update to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "own rows delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', t);
  end loop;
end $$;

create trigger fields_touch before update on public.fields for each row execute function public.touch_updated_at();
create trigger analyses_touch before update on public.analyses for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create policy "own folder read" on storage.objects for select to authenticated using (bucket_id in ('uploads','processed','reports') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder write" on storage.objects for insert to authenticated with check (bucket_id in ('uploads','processed','reports') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder delete" on storage.objects for delete to authenticated using (bucket_id in ('uploads','processed','reports') and (storage.foldername(name))[1] = auth.uid()::text);
