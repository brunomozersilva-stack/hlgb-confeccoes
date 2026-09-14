-- HLGB Confecções — proteções de integridade aplicadas no Supabase em 2026-09-14
-- Objetivos:
-- 1) impedir corte automático pendente duplicado quando já existe corte finalizado do mesmo pedido/produto;
-- 2) limpar pendências automáticas quando um corte equivalente é finalizado;
-- 3) impedir filhos órfãos de pedidos já excluídos;
-- 4) manter a quantidade livre de Produção alinhada à grade efetivamente cortada.
--
-- Este arquivo é idempotente e serve como registro/versionamento das funções já aplicadas no banco.

begin;

create or replace function public.hlgb_prevent_duplicate_auto_cut()
returns trigger
language plpgsql
as $function$
declare
  v_status text := lower(trim(coalesce(new.data->>'status','')));
  v_existing text;
begin
  if new.module <> 'cuts' or new.deleted_at is not null then
    return new;
  end if;
  if coalesce(new.data->>'autoOrderCutV9203','false') <> 'true' then
    return new;
  end if;

  if v_status = 'finalizado' then
    select r.entity_id into v_existing
      from public.hlgb_records r
     where r.module='cuts'
       and r.deleted_at is null
       and r.entity_id <> new.entity_id
       and lower(trim(coalesce(r.data->>'status','')))='finalizado'
       and public.hlgb_cut_same_order_product(r.data,new.data)
     order by r.updated_at asc
     limit 1;
  else
    -- Primeiro respeita qualquer corte já finalizado do mesmo pedido/produto,
    -- inclusive cortes históricos anteriores ao autoOrderCutV9203.
    select r.entity_id into v_existing
      from public.hlgb_records r
     where r.module='cuts'
       and r.deleted_at is null
       and r.entity_id <> new.entity_id
       and lower(trim(coalesce(r.data->>'status','')))='finalizado'
       and public.hlgb_cut_same_order_product(r.data,new.data)
     order by r.updated_at asc
     limit 1;

    if v_existing is null then
      select r.entity_id into v_existing
        from public.hlgb_records r
       where r.module='cuts'
         and r.deleted_at is null
         and r.entity_id <> new.entity_id
         and coalesce(r.data->>'autoOrderCutV9203','false')='true'
         and public.hlgb_cut_same_order_product(r.data,new.data)
       order by case when lower(trim(coalesce(r.data->>'status','')))='finalizado' then 0 else 1 end,
                r.updated_at asc
       limit 1;
    end if;
  end if;

  if v_existing is not null then
    new.deleted_at := coalesce(new.deleted_at, now());
    new.data := coalesce(new.data,'{}'::jsonb)
      || jsonb_build_object('serverDedupV9246',true,'duplicateOfCutId',v_existing);
  end if;
  return new;
end;
$function$;

create or replace function public.hlgb_cleanup_pending_cut_after_finalize()
returns trigger
language plpgsql
as $function$
begin
  if new.module='cuts'
     and new.deleted_at is null
     and lower(trim(coalesce(new.data->>'status','')))='finalizado' then
    update public.hlgb_records r
       set deleted_at=now(),
           revision=revision+1,
           updated_at=now(),
           data=coalesce(r.data,'{}'::jsonb) || jsonb_build_object('serverDedupV9246',true,'duplicateOfCutId',new.entity_id)
     where r.module='cuts'
       and r.deleted_at is null
       and r.entity_id<>new.entity_id
       and coalesce(r.data->>'autoOrderCutV9203','false')='true'
       and lower(trim(coalesce(r.data->>'status',''))) <> 'finalizado'
       and public.hlgb_cut_same_order_product(r.data,new.data);
  end if;
  return new;
end;
$function$;

create or replace function public.hlgb_cleanup_deleted_order_dependents_v9246()
returns trigger
language plpgsql
as $function$
begin
  if new.module='orders'
     and new.deleted_at is not null
     and (tg_op='INSERT' or old.deleted_at is null) then
    update public.hlgb_records r
       set deleted_at=coalesce(r.deleted_at,now()),
           revision=case when r.deleted_at is null then r.revision+1 else r.revision end,
           updated_at=case when r.deleted_at is null then now() else r.updated_at end,
           data=coalesce(r.data,'{}'::jsonb) || jsonb_build_object('orderDeleteCleanupV9246',true,'deletedOrderId',new.entity_id)
     where r.module in ('capacityAssignments','materialChecklists','noteQueue')
       and r.deleted_at is null
       and r.data->>'orderId'=new.entity_id;
  end if;
  return new;
end;
$function$;

drop trigger if exists hlgb_cleanup_deleted_order_dependents_v9246_trg on public.hlgb_records;
create trigger hlgb_cleanup_deleted_order_dependents_v9246_trg
after insert or update of deleted_at on public.hlgb_records
for each row execute function public.hlgb_cleanup_deleted_order_dependents_v9246();

create or replace function public.hlgb_block_children_of_deleted_order_v9246()
returns trigger
language plpgsql
as $function$
declare
  v_order_id text;
begin
  if new.module not in ('capacityAssignments','materialChecklists','noteQueue') or new.deleted_at is not null then
    return new;
  end if;
  v_order_id := nullif(new.data->>'orderId','');
  if v_order_id is null then return new; end if;

  if exists (
      select 1 from public.hlgb_records o
      where o.module='orders' and o.entity_id=v_order_id and o.deleted_at is not null
    ) and not exists (
      select 1 from public.hlgb_records o
      where o.module='orders' and o.entity_id=v_order_id and o.deleted_at is null
    ) then
    new.deleted_at := now();
    new.data := coalesce(new.data,'{}'::jsonb) || jsonb_build_object('blockedDeletedOrderV9246',true,'deletedOrderId',v_order_id);
  end if;
  return new;
end;
$function$;

drop trigger if exists hlgb_block_children_of_deleted_order_v9246_trg on public.hlgb_records;
create trigger hlgb_block_children_of_deleted_order_v9246_trg
before insert or update on public.hlgb_records
for each row execute function public.hlgb_block_children_of_deleted_order_v9246();

create or replace function public.hlgb_reconcile_free_production_from_cut_v9246()
returns trigger
language plpgsql
as $function$
declare
  v_cut_id text;
  v_product_id text;
  v_effective numeric;
  v_assigned numeric;
  v_remaining numeric;
  v_canonical text;
  v_free_stages text[] := array['','aguardando atribuição','consolidado','totalmente atribuído'];
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if new.module <> 'production' then return new; end if;

  v_cut_id := nullif(new.data->>'cutId','');
  v_product_id := nullif(new.data->>'productId','');
  if v_cut_id is null or v_product_id is null then return new; end if;

  select sum(coalesce(nullif(g->>'qty','')::numeric,0))
    into v_effective
    from public.hlgb_records c
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(c.data->'actualCutGrade')='array' and jsonb_array_length(c.data->'actualCutGrade')>0 then c.data->'actualCutGrade'
        when jsonb_typeof(c.data->'originalGrade')='array' and jsonb_array_length(c.data->'originalGrade')>0 then c.data->'originalGrade'
        else '[]'::jsonb
      end
    ) g
   where c.module='cuts'
     and c.entity_id=v_cut_id
     and c.deleted_at is null
     and lower(trim(coalesce(c.data->>'status','')))='finalizado'
     and g->>'productId'=v_product_id;

  if v_effective is null then return new; end if;

  -- Uma linha só é considerada realmente atribuída quando há evidência de atribuição/produção.
  -- productionLocationId isolado não basta: versões antigas propagavam "Externo" para linhas ainda aguardando atribuição.
  select coalesce(sum(coalesce(nullif(r.data->>'planned','')::numeric,0)),0)
    into v_assigned
    from public.hlgb_records r
   where r.module='production'
     and r.deleted_at is null
     and r.data->>'cutId'=v_cut_id
     and r.data->>'productId'=v_product_id
     and not (
       coalesce(r.data->>'factionId','')=''
       and coalesce(r.data->>'assignedAt','')=''
       and coalesce(r.data->>'sentToFactionAt','')=''
       and coalesce(nullif(r.data->>'done','')::numeric,0)=0
       and coalesce(r.data->>'finishedAt','')=''
       and coalesce(r.data->>'productionCompletedAt','')=''
       and lower(trim(coalesce(r.data->>'stage',''))) = any(v_free_stages)
     );

  v_remaining := greatest(0, v_effective - v_assigned);

  select min(r.entity_id)
    into v_canonical
    from public.hlgb_records r
   where r.module='production'
     and r.deleted_at is null
     and r.data->>'cutId'=v_cut_id
     and r.data->>'productId'=v_product_id
     and coalesce(r.data->>'factionId','')=''
     and coalesce(r.data->>'assignedAt','')=''
     and coalesce(r.data->>'sentToFactionAt','')=''
     and coalesce(nullif(r.data->>'done','')::numeric,0)=0
     and coalesce(r.data->>'finishedAt','')=''
     and coalesce(r.data->>'productionCompletedAt','')=''
     and lower(trim(coalesce(r.data->>'stage',''))) = any(v_free_stages);

  if v_canonical is not null then
    update public.hlgb_records r
       set data = jsonb_set(
                    jsonb_set(
                      jsonb_set(
                        jsonb_set(coalesce(r.data,'{}'::jsonb),'{planned}',to_jsonb(v_remaining),true),
                        '{stage}',to_jsonb(case when v_remaining>0 then 'Aguardando atribuição' else 'Totalmente atribuído' end),true
                      ),
                      '{productionLocationId}','null'::jsonb,true
                    ),
                    '{cutEffectiveQtyV9246}','true'::jsonb,true
                  ),
           revision = r.revision + 1,
           updated_at = now()
     where r.module='production' and r.entity_id=v_canonical and r.deleted_at is null
       and (
         coalesce(nullif(r.data->>'planned','')::numeric,0) <> v_remaining
         or coalesce(r.data->>'stage','') <> case when v_remaining>0 then 'Aguardando atribuição' else 'Totalmente atribuído' end
         or coalesce(r.data->>'productionLocationId','')<>''
         or coalesce(r.data->>'cutEffectiveQtyV9246','false') <> 'true'
       );

    update public.hlgb_records r
       set data = jsonb_set(
                    jsonb_set(
                      jsonb_set(
                        jsonb_set(coalesce(r.data,'{}'::jsonb),'{planned}','0'::jsonb,true),
                        '{stage}',to_jsonb('Consolidado'::text),true
                      ),
                      '{productionLocationId}','null'::jsonb,true
                    ),
                    '{cutEffectiveQtyV9246}','true'::jsonb,true
                  ),
           revision = r.revision + 1,
           updated_at = now()
     where r.module='production' and r.deleted_at is null
       and r.entity_id<>v_canonical
       and r.data->>'cutId'=v_cut_id
       and r.data->>'productId'=v_product_id
       and coalesce(r.data->>'factionId','')=''
       and coalesce(r.data->>'assignedAt','')=''
       and coalesce(r.data->>'sentToFactionAt','')=''
       and coalesce(nullif(r.data->>'done','')::numeric,0)=0
       and coalesce(r.data->>'finishedAt','')=''
       and coalesce(r.data->>'productionCompletedAt','')=''
       and lower(trim(coalesce(r.data->>'stage',''))) = any(v_free_stages)
       and (
         coalesce(nullif(r.data->>'planned','')::numeric,0) <> 0
         or coalesce(r.data->>'stage','') <> 'Consolidado'
         or coalesce(r.data->>'productionLocationId','')<>''
         or coalesce(r.data->>'cutEffectiveQtyV9246','false') <> 'true'
       );
  end if;

  return new;
end;
$function$;

drop trigger if exists hlgb_reconcile_free_production_from_cut_v9246_trg on public.hlgb_records;
create trigger hlgb_reconcile_free_production_from_cut_v9246_trg
after insert or update of data, deleted_at on public.hlgb_records
for each row execute function public.hlgb_reconcile_free_production_from_cut_v9246();

-- Backfill seguro de pendências automáticas duplicadas sem referências ativas.
with candidates as (
  select p.entity_id as pending_id,
         (select f.entity_id
            from public.hlgb_records f
           where f.module='cuts'
             and f.deleted_at is null
             and f.entity_id<>p.entity_id
             and lower(trim(coalesce(f.data->>'status','')))='finalizado'
             and public.hlgb_cut_same_order_product(p.data,f.data)
           order by f.updated_at asc
           limit 1) as final_id
    from public.hlgb_records p
   where p.module='cuts'
     and p.deleted_at is null
     and coalesce(p.data->>'autoOrderCutV9203','false')='true'
     and lower(trim(coalesce(p.data->>'status',''))) <> 'finalizado'
     and exists (
       select 1 from public.hlgb_records f
        where f.module='cuts' and f.deleted_at is null and f.entity_id<>p.entity_id
          and lower(trim(coalesce(f.data->>'status','')))='finalizado'
          and public.hlgb_cut_same_order_product(p.data,f.data)
     )
     and not exists (
       select 1 from public.hlgb_records r
        where r.deleted_at is null and r.module<>'cuts' and r.data->>'cutId'=p.entity_id
     )
)
update public.hlgb_records p
   set deleted_at=now(),
       revision=p.revision+1,
       updated_at=now(),
       data=coalesce(p.data,'{}'::jsonb) || jsonb_build_object('serverDedupBackfillV9246',true,'duplicateOfCutId',c.final_id)
  from candidates c
 where p.module='cuts' and p.entity_id=c.pending_id and p.deleted_at is null;

-- Backfill de filhos de pedidos já excluídos.
update public.hlgb_records r
   set deleted_at=now(),
       revision=revision+1,
       updated_at=now(),
       data=coalesce(r.data,'{}'::jsonb) || jsonb_build_object('orphanCleanupV9246',true)
 where r.deleted_at is null
   and r.module in ('capacityAssignments','materialChecklists','noteQueue')
   and coalesce(r.data->>'orderId','')<>''
   and exists (
     select 1 from public.hlgb_records od
     where od.module='orders' and od.entity_id=r.data->>'orderId' and od.deleted_at is not null
   )
   and not exists (
     select 1 from public.hlgb_records oa
     where oa.module='orders' and oa.entity_id=r.data->>'orderId' and oa.deleted_at is null
   );

commit;
