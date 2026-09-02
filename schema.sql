-- ============================================================
-- Shortly — secure schema (run once in Supabase SQL Editor)
-- If you already have the old table, this upgrades it safely.
-- ============================================================

-- Table
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  short_code text not null,
  original_url text not null,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz null
);

-- Unique short codes
create unique index if not exists links_short_code_uidx on public.links (short_code);
create index if not exists links_expires_at_idx on public.links (expires_at) where expires_at is not null;

-- RLS
alter table public.links enable row level security;

-- Drop old permissive policies if they exist
drop policy if exists "Public can insert links" on public.links;
drop policy if exists "Public can select links" on public.links;
drop policy if exists "Public can update clicks" on public.links;

-- Insert: anyone can create a link (public shortener)
create policy "anon_insert_links"
  on public.links for insert
  to anon, authenticated
  with check (
    char_length(short_code) between 4 and 32
    and char_length(original_url) between 8 and 2048
    and original_url ~* '^https?://'
    and clicks = 0
  );

-- Select: anyone can look up a link (needed for redirects)
create policy "anon_select_links"
  on public.links for select
  to anon, authenticated
  using (true);

-- NO general update or delete for anon — only via security definer functions

-- Increment clicks only
create or replace function public.increment_clicks(code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.links
  set clicks = clicks + 1
  where short_code = code
    and (expires_at is null or expires_at > now());
end;
$$;

-- Resolve + cleanup expired (called from redirect page)
create or replace function public.resolve_and_touch(code text)
returns table (original_url text, expired boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  select l.original_url, l.expires_at
  into rec
  from public.links l
  where l.short_code = code;

  if not found then
    return;
  end if;

  if rec.expires_at is not null and rec.expires_at <= now() then
    delete from public.links where short_code = code;
    original_url := rec.original_url;
    expired := true;
    return next;
    return;
  end if;

  update public.links set clicks = clicks + 1 where short_code = code;

  original_url := rec.original_url;
  expired := false;
  return next;
end;
$$;

-- Optional: purge all expired (can be called from a cron or manually)
create or replace function public.purge_expired_links()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.links where expires_at is not null and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.increment_clicks(text) to anon, authenticated;
grant execute on function public.resolve_and_touch(text) to anon, authenticated;
grant execute on function public.purge_expired_links() to anon, authenticated;
