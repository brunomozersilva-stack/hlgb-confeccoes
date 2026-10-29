-- HLGB v94.30 — autoridade correta do destino da Produção.
-- Aplicado no projeto HLGB em 2026-10-29.
-- Impede que capacityAssignments/materialChecklists espalhem um local para todas as linhas do pedido
-- e impede que uma Produção realmente livre carregue/recrie productionLocationId fantasma.

create or replace function public.hlgb_sync_location_after_assignment_v9430()
returns trigger language plpgsql as $$
declare
  v_order_id text; v_location_id text; v_production_id text; v_product_id text; v_faction_id text; v_count integer:=0;
begin
  if new.deleted_at is not null or new.module not in ('capacityAssignments','materialChecklists') then return new; end if;
  v_order_id:=nullif(new.data->>'orderId',''); if v_order_id is null then return new; end if;

  if new.module='materialChecklists' then
    v_production_id:=coalesce(nullif(new.data->>'productionId',''),nullif(new.data#>>'{production,id}',''));
    v_product_id:=coalesce(nullif(new.data->>'productId',''),nullif(new.data#>>'{product,id}',''));
    v_location_id:=nullif(new.data->>'locationId','');
    v_faction_id:=coalesce(nullif(new.data->>'factionId',''),nullif(new.data->>'destinationId',''),nullif(new.data#>>'{destination,id}',''));
    if v_location_id is null and v_faction_id is not null then
      select coalesce(nullif(r.data->>'productionLocationId',''),nullif(r.data->>'locationId','')) into v_location_id
      from public.hlgb_records r where r.module='factions' and r.entity_id=v_faction_id and r.deleted_at is null limit 1;
    end if;
  else
    v_production_id:=nullif(new.data->>'productionId','');
    v_product_id:=coalesce(nullif(new.data->>'productId',''),nullif(new.data->>'itemKey',''),nullif(new.data#>>'{product,id}',''));
    v_location_id:=nullif(new.data->>'locationId','');
  end if;
  if v_location_id is null then return new; end if;

  if v_production_id is not null then
    update public.hlgb_records r set data=jsonb_set(r.data,'{productionLocationId}',to_jsonb(v_location_id),true),updated_at=now()
    where r.module='production' and r.entity_id=v_production_id and r.deleted_at is null and r.data->>'orderId'=v_order_id
      and coalesce(r.data->>'productionLocationId','') is distinct from v_location_id;
    return new;
  end if;

  if v_product_id is not null then
    select count(*) into v_count from public.hlgb_records r
    where r.module='production' and r.deleted_at is null and r.data->>'orderId'=v_order_id
      and (r.data->>'productId'=v_product_id or r.data->>'cutId'=v_product_id);
    if v_count=1 then
      update public.hlgb_records r set data=jsonb_set(r.data,'{productionLocationId}',to_jsonb(v_location_id),true),updated_at=now()
      where r.module='production' and r.deleted_at is null and r.data->>'orderId'=v_order_id
        and (r.data->>'productId'=v_product_id or r.data->>'cutId'=v_product_id)
        and coalesce(r.data->>'productionLocationId','') is distinct from v_location_id;
      return new;
    end if;
  end if;

  select count(*) into v_count from public.hlgb_records r where r.module='production' and r.deleted_at is null and r.data->>'orderId'=v_order_id;
  if v_count=1 then
    update public.hlgb_records r set data=jsonb_set(r.data,'{productionLocationId}',to_jsonb(v_location_id),true),updated_at=now()
    where r.module='production' and r.deleted_at is null and r.data->>'orderId'=v_order_id
      and coalesce(r.data->>'productionLocationId','') is distinct from v_location_id;
  end if;
  return new;
end;$$;

drop trigger if exists hlgb_sync_location_after_assignment_v9241_trg on public.hlgb_records;
drop trigger if exists hlgb_sync_location_after_assignment_v9430_trg on public.hlgb_records;
create trigger hlgb_sync_location_after_assignment_v9430_trg after insert or update on public.hlgb_records
for each row execute function public.hlgb_sync_location_after_assignment_v9430();

create or replace function public.hlgb_preserve_order_projection_fields_v9430()
returns trigger language plpgsql as $$
declare v_old_pi jsonb; v_new_pi jsonb; v_merged jsonb; k text; v jsonb; v_assigned boolean:=false;
begin
  if new.module='orders' and old.module='orders' and new.deleted_at is null then
    v_old_pi:=case when jsonb_typeof(old.data->'projectionItems')='object' then old.data->'projectionItems' else '{}'::jsonb end;
    v_new_pi:=case when jsonb_typeof(new.data->'projectionItems')='object' then new.data->'projectionItems' else '{}'::jsonb end;
    v_merged:=v_old_pi;
    for k,v in select key,value from jsonb_each(v_new_pi) loop
      if jsonb_typeof(v)='object' and jsonb_typeof(v_merged->k)='object' then v_merged:=jsonb_set(v_merged,array[k],(v_merged->k)||v,true);
      else v_merged:=jsonb_set(v_merged,array[k],v,true); end if;
    end loop;
    new.data:=jsonb_set(coalesce(new.data,'{}'::jsonb),'{projectionItems}',v_merged,true);
    if ((not (new.data?'productionLocationId')) or new.data->'productionLocationId'='null'::jsonb or coalesce(new.data->>'productionLocationId','')='')
       and old.data?'productionLocationId' and old.data->'productionLocationId'<>'null'::jsonb then
      new.data:=jsonb_set(new.data,'{productionLocationId}',old.data->'productionLocationId',true);
    end if;
  end if;

  if new.module='production' and old.module='production' and new.deleted_at is null then
    v_assigned:=(coalesce(new.data->>'factionId','')<>'' or coalesce(new.data->>'assignedAt','')<>'' or coalesce(new.data->>'sentToFactionAt','')<>''
      or lower(coalesce(new.data->>'productionSent','false')) in ('true','1')
      or lower(trim(coalesce(new.data->>'stage',''))) not in ('','aguardando atribuição','consolidado','totalmente atribuído'));
    if v_assigned and ((not (new.data?'productionLocationId')) or new.data->'productionLocationId'='null'::jsonb or coalesce(new.data->>'productionLocationId','')='')
       and old.data?'productionLocationId' and old.data->'productionLocationId'<>'null'::jsonb then
      new.data:=jsonb_set(new.data,'{productionLocationId}',old.data->'productionLocationId',true);
    end if;
  end if;
  return new;
end;$$;

drop trigger if exists hlgb_preserve_order_projection_fields_trg on public.hlgb_records;
drop trigger if exists hlgb_preserve_order_projection_fields_v9430_trg on public.hlgb_records;
create trigger hlgb_preserve_order_projection_fields_v9430_trg before update on public.hlgb_records
for each row execute function public.hlgb_preserve_order_projection_fields_v9430();

create or replace function public.hlgb_guard_free_production_location_v9430()
returns trigger language plpgsql as $$
declare v_free boolean:=false;
begin
  if new.module<>'production' or new.deleted_at is not null then return new; end if;
  v_free:=(coalesce(new.data->>'factionId','')='' and coalesce(new.data->>'assignedAt','')='' and coalesce(new.data->>'sentToFactionAt','')=''
    and coalesce(nullif(new.data->>'done','')::numeric,0)=0 and coalesce(new.data->>'finishedAt','')='' and coalesce(new.data->>'productionCompletedAt','')=''
    and lower(trim(coalesce(new.data->>'stage',''))) in ('','aguardando atribuição','consolidado','totalmente atribuído'));
  if v_free then new.data:=coalesce(new.data,'{}'::jsonb)-'productionLocationId'-'__hlgb9423StaleProductionLocationId'-'destinationRepairV9412'; end if;
  return new;
end;$$;

drop trigger if exists hlgb_guard_free_production_location_v9430_trg on public.hlgb_records;
create trigger hlgb_guard_free_production_location_v9430_trg before insert or update on public.hlgb_records
for each row execute function public.hlgb_guard_free_production_location_v9430();