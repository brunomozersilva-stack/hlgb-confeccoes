-- LAB ONLY. NOT A MIGRATION. Do not install in commercial database.
-- A short table lock proves atomic graph validation in the fixture; it would
-- contend with unrelated commercial writes, so deployment is prohibited
-- until a narrower authority and legacy editor integration are validated.
create or replace function public.hlgb_lab_save_remnant_v9686(p_product_id text,p_expected_revision bigint,p_policy jsonb)
returns table(applied boolean,module text,entity_id text,data jsonb,deleted_at timestamptz,revision bigint,updated_at timestamptz,updated_by uuid)
language plpgsql security invoker set search_path = '' as $$
declare
  src public.hlgb_records%rowtype;
  target public.hlgb_records%rowtype;
  mat public.hlgb_records%rowtype;
  entry jsonb; edge text; mid text; dim text; label text;
  seen text[] := array[]::text[];
  next_data jsonb; ack record; cycle_found boolean;
begin
  if auth.uid() is null or public.hlgb_pode_escrever_modulo('products') is not true or public.hlgb_pode_ler_modulo('products') is not true or public.hlgb_pode_ler_modulo('materials') is not true then
    raise exception 'permission' using errcode='42501';
  end if;
  if current_setting('transaction_isolation') <> 'read committed' then raise exception 'read-committed-required'; end if;
  if p_product_id is null or length(p_product_id) not between 1 and 128 or p_expected_revision is null or p_expected_revision not between 1 and 9007199254740990 then raise exception 'identity'; end if;
  if jsonb_typeof(p_policy) is distinct from 'object' then raise exception 'policy'; end if;
  if p_policy - array['state','notes','eligible'] <> '{}'::jsonb or jsonb_typeof(p_policy->'state') is distinct from 'string' or p_policy->>'state' not in ('yes','no','unknown') or jsonb_typeof(p_policy->'notes') is distinct from 'string' or length(p_policy->>'notes')>500 or jsonb_typeof(p_policy->'eligible') is distinct from 'array' then raise exception 'policy'; end if;
  if jsonb_array_length(p_policy->'eligible')>50 or (p_policy->>'state'<>'yes' and jsonb_array_length(p_policy->'eligible')>0) then raise exception 'policy-limit'; end if;
  lock table public.hlgb_records in share row exclusive mode nowait;
  select * into src from public.hlgb_records r where r.module='products' and r.entity_id=p_product_id and r.deleted_at is null;
  if not found or src.revision<>p_expected_revision or src.data->>'id' is distinct from p_product_id or src.data->'active'='false'::jsonb then raise exception 'source-revision'; end if;
  if jsonb_typeof(src.data->'fabricRemnantPolicyV9630'->'eligible')='array' and jsonb_array_length(src.data->'fabricRemnantPolicyV9630'->'eligible')>50 then raise exception 'legacy-policy-limit'; end if;
  for entry in select value from jsonb_array_elements(p_policy->'eligible') loop
    if jsonb_typeof(entry) is distinct from 'object' or entry - array['productId','materialId','minWidthMm','minLengthMm','size','color','notes'] <> '{}'::jsonb then raise exception 'entry'; end if;
    if jsonb_typeof(entry->'productId') is distinct from 'string' or jsonb_typeof(entry->'materialId') is distinct from 'string' then raise exception 'entry-identity'; end if;
    edge:=entry->>'productId';mid:=entry->>'materialId';
    if edge=p_product_id or edge=any(seen) or length(edge) not between 1 and 128 or length(mid) not between 1 and 128 then raise exception 'target'; end if;
    seen:=array_append(seen,edge);
    foreach dim in array array['minWidthMm','minLengthMm'] loop
      if not (entry ? dim) then raise exception 'dimension'; end if;
      if entry->dim <> 'null'::jsonb then
        if jsonb_typeof(entry->dim) is distinct from 'number' then raise exception 'dimension'; end if;
        if (entry->>dim)::numeric<=0 or (entry->>dim)::numeric>100000 then raise exception 'dimension'; end if;
      end if;
    end loop;
    foreach label in array array['size','color','notes'] loop
      if jsonb_typeof(entry->label) is distinct from 'string' or length(entry->>label)>(case when label='notes' then 500 else 60 end) then raise exception 'label'; end if;
    end loop;
    select * into target from public.hlgb_records r where r.module='products' and r.entity_id=edge and r.deleted_at is null;
    if not found or target.data->>'id' is distinct from edge or target.data->'active'='false'::jsonb then raise exception 'target'; end if;
    select * into mat from public.hlgb_records r where r.module='materials' and r.entity_id=mid and r.deleted_at is null;
    if not found or mat.data->>'id' is distinct from mid or mat.data->'active'='false'::jsonb or lower(coalesce(mat.data->>'cat',mat.data->>'category','')) not in ('tecido','malha','renda','tule') then raise exception 'material'; end if;
    if jsonb_typeof(src.data->'materials') is distinct from 'array' or jsonb_typeof(target.data->'materials') is distinct from 'array' then raise exception 'bom'; end if;
    if (select count(*) from jsonb_array_elements(src.data->'materials') b where b->>'materialId'=mid)<>1 or (select count(*) from jsonb_array_elements(target.data->'materials') b where b->>'materialId'=mid)<>1 then raise exception 'bom'; end if;
  end loop;
  -- UNION, not UNION ALL, bounds traversal even with old cycles.
  with recursive reachable(pid) as (
    select unnest(seen)
    union
    select e->>'productId' from reachable walk join public.hlgb_records r on r.module='products' and r.entity_id=walk.pid and r.deleted_at is null
    cross join lateral jsonb_array_elements(case when r.data->'fabricRemnantPolicyV9630'->>'state'='yes' and jsonb_typeof(r.data->'fabricRemnantPolicyV9630'->'eligible')='array' then r.data->'fabricRemnantPolicyV9630'->'eligible' else '[]'::jsonb end) e
    where nullif(e->>'productId','') is not null
  ) select exists(select 1 from reachable where pid=p_product_id) into cycle_found;
  if cycle_found then raise exception 'cycle'; end if;
  next_data:=jsonb_set(src.data,'{fabricRemnantPolicyV9630}',p_policy,true);
  if next_data=src.data then raise exception 'no-change'; end if;
  select * into ack from public.hlgb_save_record('products',p_product_id,next_data,p_expected_revision,false);
  if not found or ack.applied is not true or ack.module is distinct from 'products' or ack.entity_id is distinct from p_product_id or ack.deleted_at is not null or ack.revision is distinct from p_expected_revision+1 or ack.data is distinct from next_data then raise exception 'unconfirmed-save'; end if;
  return query select ack.applied,ack.module,ack.entity_id,ack.data,ack.deleted_at,ack.revision,ack.updated_at,ack.updated_by;
end; $;
revoke all on function public.hlgb_lab_save_remnant_v9686(text,bigint,jsonb) from public,anon;
grant execute on function public.hlgb_lab_save_remnant_v9686(text,bigint,jsonb) to authenticated;
