-- Rancangan tahap lanjutan untuk pemakaian multioperator.
-- Jangan dijalankan pada produksi sebelum integrasi aplikasi disesuaikan.

create table if not exists public.sppd_budget_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_sipd_id text not null,
  kode_rekening text not null,
  sub_kegiatan text,
  unit_kerja_id text,
  tahun_anggaran integer not null,
  pagu bigint not null default 0 check (pagu >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_sipd_id)
);

create table if not exists public.sppd_budget_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.sppd_budget_accounts (id) on delete restrict,
  movement_date date not null,
  movement_type text not null,
  source_kind text not null check (source_kind in ('perjalanan', 'manual')),
  source_id text,
  document_number text,
  description text not null,
  impact bigint not null check (impact <> 0),
  reason text,
  reference text,
  reversal_of uuid references public.sppd_budget_movements (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists sppd_budget_accounts_user_year_idx
  on public.sppd_budget_accounts (user_id, tahun_anggaran);

create index if not exists sppd_budget_movements_account_idx
  on public.sppd_budget_movements (account_id, created_at);

create unique index if not exists sppd_budget_one_reversal_idx
  on public.sppd_budget_movements (reversal_of)
  where reversal_of is not null;

alter table public.sppd_budget_accounts enable row level security;
alter table public.sppd_budget_movements enable row level security;

drop policy if exists "Users manage own budget accounts" on public.sppd_budget_accounts;
create policy "Users manage own budget accounts"
  on public.sppd_budget_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own budget movements" on public.sppd_budget_movements;
create policy "Users read own budget movements"
  on public.sppd_budget_movements for select
  using (auth.uid() = user_id);

-- Mutasi hanya ditambah melalui RPC. Riwayat tidak diberi policy update/delete.
create or replace function public.post_sppd_budget_movement(
  p_account_id uuid,
  p_movement_date date,
  p_movement_type text,
  p_source_kind text,
  p_source_id text,
  p_document_number text,
  p_description text,
  p_impact bigint,
  p_reason text default null,
  p_reference text default null,
  p_reversal_of uuid default null
)
returns public.sppd_budget_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.sppd_budget_accounts;
  v_used bigint;
  v_result public.sppd_budget_movements;
begin
  if p_impact = 0 then
    raise exception 'Nilai mutasi tidak boleh nol';
  end if;

  select * into v_account
  from public.sppd_budget_accounts
  where id = p_account_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Rekening anggaran tidak ditemukan';
  end if;

  if extract(year from p_movement_date)::integer <> v_account.tahun_anggaran then
    raise exception 'Tanggal mutasi tidak sesuai tahun anggaran';
  end if;

  select coalesce(sum(impact), 0) into v_used
  from public.sppd_budget_movements
  where account_id = p_account_id;

  if v_used + p_impact < 0 then
    raise exception 'Pengembalian melebihi total penggunaan';
  end if;

  if v_used + p_impact > v_account.pagu then
    raise exception 'Sisa pagu tidak cukup';
  end if;

  if p_reversal_of is not null and not exists (
    select 1 from public.sppd_budget_movements
    where id = p_reversal_of
      and account_id = p_account_id
      and user_id = auth.uid()
  ) then
    raise exception 'Transaksi asal pembatalan tidak ditemukan';
  end if;

  insert into public.sppd_budget_movements (
    user_id, account_id, movement_date, movement_type, source_kind,
    source_id, document_number, description, impact, reason, reference,
    reversal_of
  ) values (
    auth.uid(), p_account_id, p_movement_date, p_movement_type, p_source_kind,
    p_source_id, p_document_number, p_description, p_impact, p_reason,
    p_reference, p_reversal_of
  ) returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.post_sppd_budget_movement(
  uuid, date, text, text, text, text, text, bigint, text, text, uuid
) from public;

grant execute on function public.post_sppd_budget_movement(
  uuid, date, text, text, text, text, text, bigint, text, text, uuid
) to authenticated;

create or replace view public.sppd_budget_balances
with (security_invoker = true)
as
select
  a.id,
  a.user_id,
  a.source_sipd_id,
  a.kode_rekening,
  a.sub_kegiatan,
  a.tahun_anggaran,
  a.pagu,
  coalesce(sum(m.impact), 0)::bigint as terpakai,
  (a.pagu - coalesce(sum(m.impact), 0))::bigint as sisa
from public.sppd_budget_accounts a
left join public.sppd_budget_movements m on m.account_id = a.id
group by a.id;
