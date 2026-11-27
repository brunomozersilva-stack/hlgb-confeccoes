-- Laboratory only: precise identity and readback from committed history.
create function checklist_lab.read_record_checklist(p_cut text,p_order text,p_product text,p_version bigint default null)
returns jsonb language plpgsql security invoker set search_path='' as $read$
declare h checklist_lab.record_history%rowtype;
begin
 if p_cut is null or p_order is null or p_product is null or (p_version is not null and p_version<1) then raise exception 'input';end if;
 select * into h from checklist_lab.record_history x where x.cut_id=p_cut and x.order_id=p_order and x.product_id=p_product and (p_version is null or x.version=p_version) order by x.version desc limit 1;
 if not found then return null;end if;
 return jsonb_build_object('source',h.source_snapshot,'result',h.result,'recordedAt',h.recorded_at,'actor',h.actor);
end$read$;
create function checklist_lab.list_record_checklists(p_cut text,p_order text,p_product text,p_before bigint default null,p_limit integer default 20)
returns jsonb language plpgsql security invoker set search_path='' as $list$
begin
 if p_cut is null or p_order is null or p_product is null or p_limit is null or p_limit not between 1 and 50 or (p_before is not null and p_before<1) then raise exception 'input';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('version',x.version,'requestId',x.request_id,'recordedAt',x.recorded_at,'actor',x.actor,'responsible',x.result->>'responsible','revisions',x.source_snapshot->'revisions') order by x.version desc),'[]'::jsonb) from
 (select * from checklist_lab.record_history h where h.cut_id=p_cut and h.order_id=p_order and h.product_id=p_product and (p_before is null or h.version<p_before) order by h.version desc limit p_limit) x);
end$list$;
revoke all on function checklist_lab.read_record_checklist(text,text,text,bigint),checklist_lab.list_record_checklists(text,text,text,bigint,integer) from public;
grant execute on function checklist_lab.read_record_checklist(text,text,text,bigint),checklist_lab.list_record_checklists(text,text,text,bigint,integer) to checklist_lab_operator;
