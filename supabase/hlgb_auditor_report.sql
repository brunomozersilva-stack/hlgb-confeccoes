-- Fonte canônica do RPC privado do Auditor HLGB.
-- O proprietário segue a mesma identidade canônica usada pelo ERP; usuários secundários
-- continuam obrigados a possuir explicitamente a permissão `auditor` em hlgb_user_access.

create or replace function public.hlgb_auditor_report(p_since timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_since timestamptz := coalesce(p_since, now() - interval '24 hours');
  v_owner_email text := 'bruno.mozer.silva@gmail.com';
  v_is_owner boolean := false;
  v_allowed boolean := false;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select exists(
    select 1
      from auth.users au
     where au.id = v_uid
       and lower(coalesce(au.email,'')) = lower(v_owner_email)
  ) into v_is_owner;

  select v_is_owner or exists(
    select 1
      from public.hlgb_user_access u
     where u.auth_id = v_uid
       and coalesce(u.active,true)=true
       and jsonb_typeof(coalesce(u.access,'[]'::jsonb))='array'
       and coalesce(u.access,'[]'::jsonb) ? 'auditor'
  ) into v_allowed;

  if not v_allowed then
    raise exception 'auditor_access_required';
  end if;

  with owner_user as (
    select au.id as auth_id,
           'Administrador'::text as name,
           '[]'::jsonb as access
      from auth.users au
     where lower(coalesce(au.email,'')) = lower(v_owner_email)
     order by au.last_sign_in_at desc nulls last
     limit 1
  ), secondary_users as (
    select distinct on (u.auth_id)
      u.auth_id,
      coalesce(nullif(u.name,''),'Usuário') as name,
      coalesce(u.access,'[]'::jsonb) as access
    from public.hlgb_user_access u
    where u.auth_id is not null
      and coalesce(u.active,true)=true
      and not exists (select 1 from owner_user o where o.auth_id=u.auth_id)
    order by u.auth_id, u.updated_at desc nulls last
  ), active_users as (
    select * from owner_user
    union all
    select * from secondary_users
  ), d as (
    select *
    from public.hlgb_sync_diagnostics
    where coalesce(observed_at,created_at) >= v_since
      and coalesce(diagnostic_type,'') <> 'nightly_user_rollup'
  ), per_user as (
    select
      u.auth_id,u.name,u.access,
      count(d.id)::int as diagnostics,
      max(coalesce(d.observed_at,d.created_at)) as last_seen,
      count(d.id) filter (
        where lower(coalesce(d.severity,'')) in ('error','critical')
           or lower(coalesce(d.status,'')) in ('error','failed','critical')
      )::int as errors,
      count(d.id) filter (where lower(coalesce(d.severity,'')) in ('warning','warn','attention','atencao','atenção'))::int as warnings,
      count(d.id) filter (where coalesce(d.duration_ms,0)>=800)::int as slow_ops,
      coalesce(round(avg(d.duration_ms) filter (where d.duration_ms is not null))::int,0) as avg_duration_ms,
      coalesce(max(d.duration_ms),0)::int as max_duration_ms,
      coalesce(sum(coalesce(d.missing_products,0)),0)::int as missing_products,
      count(d.id) filter (where coalesce(d.recovered,false))::int as recoveries
    from active_users u
    left join d on d.auth_id=u.auth_id
    group by u.auth_id,u.name,u.access
  ), issue_rows as (
    select
      u.name,
      d.diagnostic_type,
      d.status,
      d.severity,
      d.source,
      d.duration_ms,
      coalesce(d.observed_at,d.created_at) as observed_at,
      jsonb_strip_nulls(jsonb_build_object(
        'kind', d.payload->>'kind',
        'name', d.payload->>'name',
        'message', left(d.payload->>'message',1000),
        'page', d.payload->>'page',
        'operation', d.payload->>'operation',
        'route', d.payload->>'route',
        'endpoint', d.payload->>'endpoint',
        'statusCode', d.payload->>'statusCode'
      )) as detail
    from d
    join active_users u on u.auth_id=d.auth_id
    where lower(coalesce(d.severity,'')) in ('error','critical','warning','warn','attention','atencao','atenção')
       or lower(coalesce(d.status,'')) in ('error','failed','critical','attention')
       or coalesce(d.duration_ms,0)>=800
       or coalesce(d.missing_products,0)>0
    order by
      case when lower(coalesce(d.severity,'')) in ('error','critical') then 0 else 1 end,
      coalesce(d.duration_ms,0) desc,
      coalesce(d.observed_at,d.created_at) desc
    limit 80
  )
  select jsonb_build_object(
    'schemaVersion',2,
    'generatedAt',now(),
    'since',v_since,
    'summary',jsonb_build_object(
      'profiles', (select count(*) from per_user),
      'profilesObserved', (select count(*) from per_user where diagnostics>0),
      'diagnostics', (select coalesce(sum(diagnostics),0) from per_user),
      'errors', (select coalesce(sum(errors),0) from per_user),
      'warnings', (select coalesce(sum(warnings),0) from per_user),
      'slowOperations', (select coalesce(sum(slow_ops),0) from per_user),
      'missingProducts', (select coalesce(sum(missing_products),0) from per_user),
      'recoveries', (select coalesce(sum(recoveries),0) from per_user)
    ),
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name',name,
        'access',access,
        'observed',diagnostics>0,
        'diagnostics',diagnostics,
        'lastSeen',last_seen,
        'errors',errors,
        'warnings',warnings,
        'slowOperations',slow_ops,
        'avgDurationMs',avg_duration_ms,
        'maxDurationMs',max_duration_ms,
        'missingProducts',missing_products,
        'recoveries',recoveries
      ) order by name) from per_user
    ),'[]'::jsonb),
    'issues', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user',name,
        'type',diagnostic_type,
        'status',status,
        'severity',severity,
        'source',source,
        'durationMs',duration_ms,
        'observedAt',observed_at,
        'detail',detail
      ) order by observed_at desc) from issue_rows
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;
