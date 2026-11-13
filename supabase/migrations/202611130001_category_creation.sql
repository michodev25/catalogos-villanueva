begin;

grant insert on public.categories to authenticated;

create policy "owner inserts categories" on public.categories
  for insert to authenticated with check (public.is_store_admin());

commit;
