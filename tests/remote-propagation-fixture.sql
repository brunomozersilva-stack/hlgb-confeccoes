-- Only for the disposable Supabase instance created by the propagation workflow.
begin;
create table public.hlgb_records(module text not null, entity_id text not null, data jsonb,
 deleted_at timestamptz, revision bigint not null, updated_at timestamptz not null,
 updated_by uuid, primary key(module,entity_id));
create table public.hlgb_record_history(module text,entity_id text,data jsonb,updated_at timestamptz);
create table public.hlgb_data(id integer primary key, dados jsonb, versao integer, atualizado_em timestamptz);
insert into public.hlgb_data values(1,'{}',1,now());
create table public.hlgb_user_access(auth_id uuid, email text, name text, role text, active boolean, access jsonb);
insert into public.hlgb_user_access(email,name,role,active,access)
 values ('a@example.test','Teste A','user',true,'["clientes"]'),('b@example.test','Teste B','user',true,'["clientes"]');
create function public.hlgb_pode_escrever_modulo(text) returns boolean language sql stable as
 $$ select auth.uid() is not null and $1='clients' $$;
alter table public.hlgb_records enable row level security;
alter table public.hlgb_data enable row level security;
alter table public.hlgb_user_access enable row level security;
alter table public.hlgb_record_history enable row level security;
create policy test_read on public.hlgb_records for select to authenticated using (hlgb_pode_escrever_modulo(module));
create policy test_data on public.hlgb_data for select to authenticated using(true);
create policy own_profile on public.hlgb_user_access for select to authenticated using(email=auth.jwt()->>'email');
grant select on public.hlgb_records, public.hlgb_data, public.hlgb_user_access to authenticated;
alter publication supabase_realtime add table public.hlgb_records,public.hlgb_data;
commit;
