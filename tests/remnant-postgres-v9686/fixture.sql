-- Synthetic database only, no real credentials or data.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('lab.uid',true),'')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.hlgb_records(module text not null,entity_id text not null,data jsonb not null,deleted_at timestamptz,revision bigint not null,updated_at timestamptz default now(),updated_by uuid,primary key(module,entity_id));
alter table public.hlgb_records enable row level security;
grant select,update on public.hlgb_records to authenticated;
create function public.hlgb_pode_ler_modulo(p_module text) returns boolean language sql stable as $$ select auth.uid() is not null and p_module in ('products','materials') $$;
create function public.hlgb_pode_escrever_modulo(p_module text) returns boolean language sql stable as $$ select auth.uid() is not null and current_setting('lab.write',true)='yes' and p_module='products' $$;
create policy read_records on public.hlgb_records for select to authenticated using(public.hlgb_pode_ler_modulo(module));
create policy update_records on public.hlgb_records for update to authenticated using(public.hlgb_pode_escrever_modulo(module)) with check(public.hlgb_pode_escrever_modulo(module));
-- Stub with the verified signature; this is NOT the production function.
create function public.hlgb_save_record(p_module text,p_entity_id text,p_data jsonb,p_expected_revision bigint,p_deleted boolean default false)
returns table(applied boolean,module text,entity_id text,data jsonb,deleted_at timestamptz,revision bigint,updated_at timestamptz,updated_by uuid)
language sql security invoker as $$
 update public.hlgb_records r set data=p_data,revision=r.revision+1,updated_at=clock_timestamp(),updated_by=auth.uid()
 where r.module=p_module and r.entity_id=p_entity_id and r.revision=p_expected_revision and r.deleted_at is null and not p_deleted
 returning true,r.module,r.entity_id,r.data,r.deleted_at,r.revision,r.updated_at,r.updated_by
$$;
insert into public.hlgb_records(module,entity_id,data,revision) values
('products','a','{"id":"a","name":"Modelo A","price":25,"materials":[{"materialId":"m","qty":2}]}',1),
('products','b','{"id":"b","name":"Modelo B","materials":[{"materialId":"m","qty":1}]}',1),
('products','c','{"id":"c","name":"Modelo C","materials":[{"materialId":"m","qty":1}]}',1),
('materials','m','{"id":"m","name":"Malha","cat":"Malha"}',1);
