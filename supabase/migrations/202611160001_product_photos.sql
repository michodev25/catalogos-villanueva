begin;

alter table public.products
  add column additional_image_paths text[] not null default '{}',
  add constraint product_photo_limit check (
    cardinality(additional_image_paths) <= 2
    and array_position(additional_image_paths, null) is null
    and (image_path is not null or cardinality(additional_image_paths) = 0)
  );

alter policy "read published images" on storage.objects
  using (
    bucket_id = 'products' and (
      public.is_store_admin() or exists (
        select 1 from public.products p
        where p.published and (
          p.image_path = storage.objects.name
          or storage.objects.name = any(p.additional_image_paths)
        )
      )
    )
  );

commit;
