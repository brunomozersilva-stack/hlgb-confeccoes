-- PROPOSTA DE ESQUEMA PARA HOMOLOGAÇÃO ISOLADA. NÃO É MIGRATION AUTOMÁTICA.
-- Não executar em produção sem validar RLS, duas sessões, concorrência e backup.
begin;
create table public.hlgb_worker_profile_versions_v1 (
 worker_id uuid not null, revision integer not null check(revision>0), operation_id uuid not null unique,
 name text not null check(length(trim(name)) between 1 and 160),
 role_name text not null check(length(trim(role_name)) between 1 and 120),
 sector text not null check(length(trim(sector)) between 1 and 120),
 start_date date not null, active boolean not null, planned_days integer not null check(planned_days between 0 and 7),
 mode text not null check(mode in ('daily','monthly')), relationship text not null check(relationship in ('independent-reviewed','review-required')),
 rate_cents integer not null check(rate_cents between 0 and 1000000000),
 transport_enabled boolean not null, transport_cents integer not null check(transport_cents between 0 and 1000000000 and (transport_enabled or transport_cents=0)),
 benefits text[] not null check(benefits <@ array['13th','vacation','vacation-third','other']::text[] and (relationship<>'review-required' or benefits @> array['13th','vacation','vacation-third']::text[])),
 created_by uuid not null default auth.uid(), created_at timestamptz not null default now(),
 primary key(worker_id,revision)
);
create table public.hlgb_worker_week_versions_v1 (
 worker_id uuid not null, worker_revision integer not null,
 week_friday date not null check(extract(isodow from week_friday)=5),
 revision integer not null check(revision>0), operation_id uuid not null unique,
 worked_days integer not null check(worked_days between 0 and 7),
 commute_days integer not null check(commute_days between 0 and worked_days),
 note text not null default '' check(length(note)<=500),
 created_by uuid not null default auth.uid(), created_at timestamptz not null default now(),
 primary key(worker_id,week_friday,revision),
 foreign key(worker_id,worker_revision) references public.hlgb_worker_profile_versions_v1(worker_id,revision)
);
alter table public.hlgb_worker_profile_versions_v1 enable row level security;
alter table public.hlgb_worker_week_versions_v1 enable row level security;
revoke all on public.hlgb_worker_profile_versions_v1,public.hlgb_worker_week_versions_v1 from public,anon,authenticated;
grant select on public.hlgb_worker_profile_versions_v1,public.hlgb_worker_week_versions_v1 to authenticated;
grant insert(worker_id,revision,operation_id,name,role_name,sector,start_date,active,planned_days,mode,relationship,rate_cents,transport_enabled,transport_cents,benefits) on public.hlgb_worker_profile_versions_v1 to authenticated;
grant insert(worker_id,worker_revision,week_friday,revision,operation_id,worked_days,commute_days,note) on public.hlgb_worker_week_versions_v1 to authenticated;
create policy worker_profiles_read on public.hlgb_worker_profile_versions_v1 for select to authenticated using ((select auth.uid()) is not null and public.hlgb_pode_ler_modulo('employees') and public.hlgb_pode_ler_modulo('payroll'));
create policy worker_profiles_insert on public.hlgb_worker_profile_versions_v1 for insert to authenticated with check (created_by=(select auth.uid()) and public.hlgb_pode_escrever_modulo('employees') and public.hlgb_pode_escrever_modulo('payroll'));
create policy worker_weeks_read on public.hlgb_worker_week_versions_v1 for select to authenticated using ((select auth.uid()) is not null and public.hlgb_pode_ler_modulo('employees') and public.hlgb_pode_ler_modulo('payroll'));
create policy worker_weeks_insert on public.hlgb_worker_week_versions_v1 for insert to authenticated with check (created_by=(select auth.uid()) and public.hlgb_pode_escrever_modulo('employees') and public.hlgb_pode_escrever_modulo('payroll'));
-- Immutable insert-only records; same worker advisory lock coordinates profile and weekly changes.
create function public.hlgb_worker_revision_guard_v1() returns trigger language plpgsql security invoker set search_path='' as $$
declare previous integer; p public.hlgb_worker_profile_versions_v1%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 new.created_by:=auth.uid(); new.created_at:=now();
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.worker_id::text,0));
 if tg_table_name='hlgb_worker_profile_versions_v1' then
  select coalesce(max(revision),0) into previous from public.hlgb_worker_profile_versions_v1 where worker_id=new.worker_id;
 else
  select coalesce(max(revision),0) into previous from public.hlgb_worker_week_versions_v1 where worker_id=new.worker_id and week_friday=new.week_friday;
  select * into p from public.hlgb_worker_profile_versions_v1 where worker_id=new.worker_id order by revision desc limit 1;
  if not found or p.revision<>new.worker_revision or not p.active or p.mode<>'daily' or p.start_date>new.week_friday-4 or new.week_friday>(now() at time zone 'America/Sao_Paulo')::date or (not p.transport_enabled and new.commute_days<>0) then raise exception 'worker/week requires review'; end if;
 end if;
 if new.revision<>previous+1 then raise exception 'revision conflict'; end if;
 return new;
end $$;
revoke all on function public.hlgb_worker_revision_guard_v1() from public,anon,authenticated;
create trigger worker_profile_revision before insert on public.hlgb_worker_profile_versions_v1 for each row execute function public.hlgb_worker_revision_guard_v1();
create trigger worker_week_revision before insert on public.hlgb_worker_week_versions_v1 for each row execute function public.hlgb_worker_revision_guard_v1();
commit;
-- No grants for UPDATE/DELETE; no payment, no payroll or Hub mutation. Policies must be tested in the isolated project.
