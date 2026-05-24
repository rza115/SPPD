-- SPPD Generator — skema database Supabase
-- Jalankan di Supabase Dashboard → SQL Editor (seluruh file)

-- ─── Profil pengguna ───────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Penyimpanan data aplikasi (JSON per user) ─────────────
-- Satu baris per kunci (sppd_pegawai, sppd_perjalanan, dll.)
create table if not exists public.sppd_user_store (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  store_key text not null,
  data jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, store_key)
);

create index if not exists sppd_user_store_user_id_idx
  on public.sppd_user_store (user_id);

create index if not exists sppd_user_store_key_idx
  on public.sppd_user_store (user_id, store_key);

alter table public.sppd_user_store enable row level security;

drop policy if exists "Users manage own store" on public.sppd_user_store;
create policy "Users manage own store"
  on public.sppd_user_store
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sppd_user_store_updated_at on public.sppd_user_store;
create trigger sppd_user_store_updated_at
  before update on public.sppd_user_store
  for each row execute procedure public.set_updated_at();
