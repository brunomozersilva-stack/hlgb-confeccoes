-- DRAFT: reviewed live function with one atomic tombstone condition added.
-- Not applied. Preserves permissions and explicit restore/delete behavior.
CREATE OR REPLACE FUNCTION public.hlgb_save_record(p_module text, p_entity_id text, p_data jsonb, p_expected_revision bigint DEFAULT 0, p_deleted boolean DEFAULT false)
 RETURNS TABLE(applied boolean, module text, entity_id text, data jsonb, deleted_at timestamp with time zone, revision bigint, updated_at timestamp with time zone, updated_by uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_row public.hlgb_records%rowtype;
  v_current public.hlgb_records%rowtype;
  v_data jsonb := coalesce(p_data,'null'::jsonb);
  v_explicit_delete boolean := false;
  v_explicit_restore boolean := false;
begin
  if not public.hlgb_pode_escrever_modulo(p_module) then
    raise exception 'Usuário sem permissão para alterar o módulo %', p_module;
  end if;

  if coalesce(trim(p_entity_id),'') = '' then
    raise exception 'Identificador do registro inválido';
  end if;

  v_explicit_restore := lower(coalesce(v_data->>'__hlgb_explicit_restore','false')) in ('true','1','yes');
  if jsonb_typeof(v_data) = 'object' then v_data := v_data - '__hlgb_explicit_restore'; end if;

  if p_deleted then
    v_explicit_delete := lower(coalesce(v_data->>'__hlgb_explicit_delete','false')) in ('true','1','yes');
    if not v_explicit_delete then
      raise exception 'Exclusão bloqueada por proteção de integridade. Atualize o sistema e tente novamente.';
    end if;
    v_data := v_data - '__hlgb_explicit_delete';
  end if;

  select rec.* into v_current
  from public.hlgb_records rec
  where rec.module=p_module and rec.entity_id=p_entity_id;

  if found and not p_deleted and not v_explicit_restore
     and v_current.data is distinct from v_data
     and v_current.updated_by is distinct from auth.uid()
     and exists (
       select 1 from public.hlgb_record_history h
       where h.module=p_module
         and h.entity_id=p_entity_id
         and h.data=v_data
         and h.updated_at < v_current.updated_at
     ) then
    return query
    select true, v_current.module, v_current.entity_id, v_current.data,
           v_current.deleted_at, v_current.revision, v_current.updated_at, v_current.updated_by;
    return;
  end if;

  if found and p_module='payroll' and not p_deleted and not v_explicit_restore
     and v_current.updated_by is distinct from auth.uid()
     and lower(coalesce(v_current.data->>'paid','false')) in ('true','1','yes')
     and lower(coalesce(v_data->>'paid','false')) not in ('true','1','yes') then
    raise exception 'Atualização bloqueada: uma versão antiga tentou reabrir uma folha já marcada como paga. Atualize a tela antes de continuar.';
  end if;

  if coalesce(p_expected_revision,0) <= 0 then
    insert into public.hlgb_records as rec
      (module, entity_id, data, deleted_at, revision, updated_at, updated_by)
    values (
      p_module,
      p_entity_id,
      v_data,
      case when p_deleted then now() else null end,
      1,
      now(),
      auth.uid()
    )
    on conflict on constraint hlgb_records_pkey do nothing
    returning rec.* into v_row;

    if found then
      return query
      select true, v_row.module, v_row.entity_id, v_row.data, v_row.deleted_at,
             v_row.revision, v_row.updated_at, v_row.updated_by;
      return;
    end if;
  end if;

  update public.hlgb_records as rec
     set data = v_data,
         deleted_at = case when p_deleted then now() else null end,
         revision = rec.revision + 1,
         updated_at = now(),
         updated_by = auth.uid()
   where rec.module = p_module
     and rec.entity_id = p_entity_id
     and rec.revision = coalesce(p_expected_revision,0)
     -- A stale session must never revive a tombstone during conflict retry.
     and (rec.deleted_at is null or p_deleted or v_explicit_restore)
  returning rec.* into v_row;

  if found then
    return query
    select true, v_row.module, v_row.entity_id, v_row.data, v_row.deleted_at,
           v_row.revision, v_row.updated_at, v_row.updated_by;
    return;
  end if;

  select rec.* into v_row
  from public.hlgb_records as rec
  where rec.module = p_module
    and rec.entity_id = p_entity_id;

  if found then
    return query
    select false, v_row.module, v_row.entity_id, v_row.data,
           v_row.deleted_at, v_row.revision, v_row.updated_at, v_row.updated_by;
  else
    return query
    select false, p_module, p_entity_id, v_data,
           null::timestamptz, 0::bigint, now(), null::uuid;
  end if;
end;
$function$

