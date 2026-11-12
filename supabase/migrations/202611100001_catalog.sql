begin;
create schema if not exists private;
revoke all on schema private from public;
create table private.store_admin (
  id integer primary key default 1 check (id = 1),
  user_id uuid not null references auth.users(id)
);
create or replace function public.is_store_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from private.store_admin where user_id = auth.uid()); $$;
revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to anon, authenticated;

create table public.categories (id text primary key, name text not null);
insert into public.categories values ('paneles','Paneles'), ('led','Tiras LED RGB'), ('lamparas','Lámparas solares');
create table public.store_settings (
  id integer primary key default 1 check(id = 1),
  currency text not null check(currency in ('CUP','USD','EUR'))
);
insert into public.store_settings values (1,'USD');
create table public.products (
  id text primary key check(id ~ '^[a-zA-Z0-9-]{1,100}$'),
  name text not null default '' check(length(name) <= 120),
  description text not null default '' check(length(description) <= 4000),
  category text not null references public.categories(id),
  specifications jsonb not null default '[]' check(jsonb_typeof(specifications) = 'array' and jsonb_array_length(specifications) <= 20),
  price_minor bigint check(price_minor >= 0 and price_minor <= 1000000000),
  image_path text,
  published boolean not null default false,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(not published or (length(trim(name)) > 0 and image_path is not null and price_minor is not null and price_minor > 0))
);
alter table public.categories enable row level security;
alter table public.store_settings enable row level security;
alter table public.products enable row level security;
revoke all on public.categories, public.store_settings, public.products from anon, authenticated;
grant select on public.categories, public.store_settings, public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant update on public.store_settings to authenticated;
create policy "read categories" on public.categories for select to anon, authenticated using(true);
create policy "read settings" on public.store_settings for select to anon, authenticated using(true);
create policy "owner settings" on public.store_settings for update to authenticated using(public.is_store_admin()) with check(public.is_store_admin());
create policy "read visible products" on public.products for select to anon, authenticated using(published or public.is_store_admin());
create policy "owner inserts" on public.products for insert to authenticated with check(public.is_store_admin());
create policy "owner updates" on public.products for update to authenticated using(public.is_store_admin()) with check(public.is_store_admin());
create policy "owner deletes" on public.products for delete to authenticated using(public.is_store_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', false, 8388608, array['image/webp']);
create policy "read published images" on storage.objects for select to anon, authenticated
using(bucket_id='products' and (public.is_store_admin() or exists(select 1 from public.products p where p.image_path = storage.objects.name and p.published)));
create policy "owner upload" on storage.objects for insert to authenticated with check(bucket_id='products' and public.is_store_admin());
create policy "owner remove" on storage.objects for delete to authenticated using(bucket_id='products' and public.is_store_admin());
commit;
