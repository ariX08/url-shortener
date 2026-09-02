-- Run this once in the Supabase SQL Editor

-- Links table
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  short_code text not null unique,
  original_url text not null,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz null
);

create index if not exists links_short_code_idx on public.links (short_code);

-- Allow public insert + select (for a free public shortener)
alter table public.links enable row level security;

create policy "Public can insert links"
  on public.links for insert
  with check (true);

create policy "Public can select links"
  on public.links for select
  using (true);

-- Allow public update of clicks only (via RPC below is safer)
create policy "Public can update clicks"
  on public.links for update
  using (true)
  with check (true);

-- Optional: safer click increment function
create or replace function public.increment_clicks(code text)
returns void
language sql
security definer
as $$
  update public.links
  set clicks = clicks + 1
  where short_code = code;
$$;

grant execute on function public.increment_clicks(text) to anon, authenticated;
