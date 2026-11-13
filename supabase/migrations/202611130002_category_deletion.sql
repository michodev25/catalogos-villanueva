begin;

grant delete on public.categories to authenticated;

create policy "owner deletes categories" on public.categories
  for delete to authenticated using (public.is_store_admin());

commit;
