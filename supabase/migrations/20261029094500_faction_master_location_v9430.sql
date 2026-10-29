-- HLGB v94.30 — complemento da integridade do destino.
-- factionMasters é a autoridade atual das facções e do productionLocationId associado.

create or replace function public.hlgb_guard_free_production_location_v9430()
returns trigger language plpgsql as $$
declare v_free boolean:=false; v_master_location text;
begin
  if new.module<>'production' or new.deleted_at is not null then return new; end if;
  v_free:=(coalesce(new.data->>'factionId','')='' and coalesce(new.data->>'assignedAt','')='' and coalesce(new.data->>'sentToFactionAt','')=''
    and coalesce(nullif(new.data->>'done','')::numeric,0)=0 and coalesce(new.data->>'finishedAt','')='' and coalesce(new.data->>'productionCompletedAt','')=''
    and lower(trim(coalesce(new.data->>'stage',''))) in ('','aguardando atribuição','consolidado','totalmente atribuído'));
  if v_free then
    new.data:=coalesce(new.data,'{}'::jsonb)-'productionLocationId'-'__hlgb9423StaleProductionLocationId'-'destinationRepairV9412';
    return new;
  end if;
  if coalesce(new.data->>'factionId','')<>'' and new.data->>'productionLocationId'=new.data->>'factionId' then
    select coalesce(nullif(r.data->>'productionLocationId',''),nullif(r.data->>'locationId','')) into v_master_location
    from public.hlgb_records r
    where r.module in ('factionMasters','factions') and r.entity_id=new.data->>'factionId' and r.deleted_at is null
    order by case when r.module='factionMasters' then 0 else 1 end limit 1;
    if v_master_location is not null and v_master_location<>new.data->>'factionId' then
      new.data:=jsonb_set(new.data,'{productionLocationId}',to_jsonb(v_master_location),true);
    end if;
  end if;
  return new;
end;$$;

-- Corrige registros históricos ainda atribuídos onde o ID da facção foi salvo como local.
update public.hlgb_records p
set data=jsonb_set(p.data,'{productionLocationId}',to_jsonb(m.data->>'productionLocationId'),true),revision=p.revision+1,updated_at=now()
from public.hlgb_records m
where p.module='production' and p.deleted_at is null
  and m.module='factionMasters' and m.deleted_at is null
  and p.data->>'factionId'=m.entity_id
  and p.data->>'productionLocationId'=m.entity_id
  and coalesce(m.data->>'productionLocationId','')<>''
  and m.data->>'productionLocationId'<>m.entity_id;