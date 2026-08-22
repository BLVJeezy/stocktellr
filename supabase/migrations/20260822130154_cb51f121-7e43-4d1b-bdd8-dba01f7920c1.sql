alter table public.counts add column if not exists formula text;

create table if not exists public.category_banners (
  category text primary key,
  image_url text,
  updated_at timestamptz not null default now()
);

alter table public.category_banners enable row level security;

create policy "Public read banners" on public.category_banners for select to anon, authenticated using (true);
create policy "Public write banners" on public.category_banners for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.category_banners to anon, authenticated;
grant all on public.category_banners to service_role;