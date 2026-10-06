-- HLGB v93.07 — proteção contra zeramento indevido de Produção pela sincronização legada corte → produção.
-- Aplicado no Supabase de produção em 2026-10-06.
-- Mantém uma saída explícita para zeramentos intencionais via __hlgb_allow_planned_zero=true.

create or replace function public.hlgb_guard_production_planned_zero_from_legacy_cut_sync()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_old_planned numeric := 0;
  v_new_planned numeric := 0;
  v_linked boolean := false;
  v_explicit boolean := false;
begin
  if old.module <> 'production' or new.module <> 'production' then
    return new;
  end if;

  if old.deleted_at is not null or new.deleted_at is not null then
    return new;
  end if;

  if coalesce(old.data->>'planned','') ~ '^-?[0-9]+([.][0-9]+)?$' then
    v_old_planned := (old.data->>'planned')::numeric;
  end if;
  if coalesce(new.data->>'planned','') ~ '^-?[0-9]+([.][0-9]+)?$' then
    v_new_planned := (new.data->>'planned')::numeric;
  end if;

  v_linked := lower(coalesce(new.data->>'cutQuantityLinkedV9246','false')) in ('true','1','yes')
              or lower(coalesce(new.data->>'cutEffectiveQtyV9246','false')) in ('true','1','yes')
              or lower(coalesce(new.data->>'cutEffectiveQtyV9240','false')) in ('true','1','yes');
  v_explicit := lower(coalesce(new.data->>'__hlgb_allow_planned_zero','false')) in ('true','1','yes');

  if v_old_planned > 0 and v_new_planned = 0 and v_linked and not v_explicit then
    return old;
  end if;

  return new;
end;
$function$;

-- Verificação não destrutiva:
-- select
--   count(*) filter (where module='production' and deleted_at is null) as active_production,
--   count(*) filter (
--     where module='production' and deleted_at is null
--       and coalesce(nullif(data->>'planned','')::numeric,0)=0
--   ) as planned_zero_active
-- from public.hlgb_records;
