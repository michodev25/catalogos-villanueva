begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

-- This test is rolled back and must run against the development database.
insert into auth.users(id, email) values
  ('10000000-0000-4000-8000-000000000001', 'owner-test@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'other-test@example.invalid');
delete from private.store_admin;
insert into private.store_admin values (1, '10000000-0000-4000-8000-000000000001');
insert into public.products(id,name,category,price_minor,image_path,published) values
  ('rls-test-public','Visible','paneles',100,'test.webp',true),
  ('rls-test-draft','Borrador','paneles',null,null,false);

set local role anon;
select is((select count(*) from public.products where id='rls-test-public'), 1::bigint, 'El público consulta productos publicados');
select is((select count(*) from public.products where id='rls-test-draft'), 0::bigint, 'El público no ve borradores');
select throws_ok($$insert into public.products(id,category) values ('rls-anon-write','led')$$, '42501', 'permission denied for table products', 'El público no escribe');
select throws_ok($$insert into public.categories(id,name) values ('rls-anon-category','Anónima')$$, '42501', 'permission denied for table categories', 'El público no crea categorías');
select throws_ok($$delete from public.categories where id='led'$$, '42501', 'permission denied for table categories', 'El público no elimina categorías');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.products where id='rls-test-draft'), 0::bigint, 'Otra cuenta no ve borradores');
select throws_ok($$insert into public.products(id,category) values ('rls-other-write','led')$$, '42501', 'new row violates row-level security policy for table "products"', 'Otra cuenta no escribe');
select throws_ok($$insert into public.categories(id,name) values ('rls-other-category','Otra cuenta')$$, '42501', 'new row violates row-level security policy for table "categories"', 'Otra cuenta no crea categorías');
with deleted as (delete from public.categories where id='led' returning id)
select is((select count(*) from deleted), 0::bigint, 'Otra cuenta no elimina categorías');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.products where id='rls-test-draft'), 1::bigint, 'El propietario ve borradores');
select lives_ok($$update public.products set name='Editado' where id='rls-test-draft'$$, 'El propietario modifica su catálogo');
select lives_ok($$insert into public.categories(id,name) values ('rls-owner-category','Accesorios')$$, 'El propietario crea categorías');
select throws_ok($$delete from public.categories where id='paneles'$$, '23503', null, 'Una categoría con productos no se elimina');
with deleted as (delete from public.categories where id='rls-owner-category' returning id)
select is((select count(*) from deleted), 1::bigint, 'El propietario elimina una categoría vacía');
reset role;
select * from finish();
rollback;
