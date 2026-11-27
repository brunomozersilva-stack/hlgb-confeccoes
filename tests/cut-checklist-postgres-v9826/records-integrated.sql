-- Laboratory only; coarse locking intentionally restricted to isolated fixture.
-- No commercial schema or endpoint. The historical snapshot is calculated by server.
grant select,update on checklist_lab.source_records to checklist_lab_writer;
create policy source_writer_read on checklist_lab.source_records for select to checklist_lab_writer using(module in ('cuts','orders','products','materials') and deleted_at is null);
grant execute on function checklist_lab.record_source(text,text,text) to checklist_lab_writer;
create table checklist_lab.record_history(
 cut_id text not null, order_id text not null, product_id text not null,
 source_snapshot jsonb not null, version bigint not null check(version>0), request_id text not null,
 actor text not null, recorded_at timestamptz not null default clock_timestamp(),
 payload jsonb not null, result jsonb not null,
 primary key(cut_id,version), unique(cut_id,request_id)
);
alter table checklist_lab.record_history enable row level security;
grant select on checklist_lab.record_history to checklist_lab_operator;
grant select,insert on checklist_lab.record_history to checklist_lab_writer;
create policy record_history_read on checklist_lab.record_history for select to checklist_lab_operator using(true);
create policy record_history_writer_read on checklist_lab.record_history for select to checklist_lab_writer using(true);
create policy record_history_insert on checklist_lab.record_history for insert to checklist_lab_writer with check(actor='checklist_lab_operator');
create function checklist_lab.save_record_checklist(p_cut text,p_order text,p_product text,p_revisions jsonb,p_expected bigint,p_request text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare src jsonb; prior checklist_lab.record_history%rowtype; current_version bigint; l jsonb; expected_line jsonb; response jsonb; actual numeric; shortage numeric; result_lines jsonb:='[]';
begin
 if current_setting('role',true) is distinct from 'checklist_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 if p_cut is null or p_order is null or p_product is null or jsonb_typeof(p_revisions) is distinct from 'object' or p_expected is null or p_expected<0 or p_request is null or p_request !~ '^[a-zA-Z0-9_-]{1,100}$' or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>100000 then raise exception 'input';end if;
 -- Coarse fixture lock prevents source insert/update/delete and serializes competing saves.
 -- Production must use narrower locking plus consistent material identity.
 lock table checklist_lab.source_records in share row exclusive mode;
 select * into prior from checklist_lab.record_history h where h.cut_id=p_cut and h.request_id=p_request;
 if found then
  if prior.order_id<>p_order or prior.product_id<>p_product or prior.source_snapshot->'revisions' is distinct from p_revisions or prior.version<>p_expected+1 or prior.payload is distinct from p_payload then raise exception 'request-conflict';end if;
  return prior.result;
 end if;
 src:=checklist_lab.record_source(p_cut,p_order,p_product);
 if src->'revisions' is distinct from p_revisions then raise exception 'source-stale';end if;
 select coalesce(max(h.version),0) into current_version from checklist_lab.record_history h where h.cut_id=p_cut;
 if current_version<>p_expected then raise exception 'version-conflict';end if;
 if jsonb_typeof(p_payload->'responsible') is distinct from 'string' or length(trim(p_payload->>'responsible')) not between 1 and 120 or jsonb_typeof(p_payload->'note') is distinct from 'string' or length(p_payload->>'note')>500 or jsonb_typeof(p_payload->'lines') is distinct from 'array' then raise exception 'payload';end if;
 if jsonb_array_length(p_payload->'lines')<>jsonb_array_length((src->'lines')) or (select count(distinct e->>'key') from jsonb_array_elements(p_payload->'lines') e)<>jsonb_array_length((src->'lines')) then raise exception 'line-count';end if;
 for l in select value from jsonb_array_elements(p_payload->'lines') loop
  select e into expected_line from jsonb_array_elements((src->'lines')) e where e->>'key'=l->>'key';
  if not found or jsonb_typeof(l->'checked') is distinct from 'boolean' or jsonb_typeof(l->'note') is distinct from 'string' or length(l->>'note')>250 or coalesce(jsonb_typeof(l->'actual'),'missing') not in ('null','number') then raise exception 'line-invalid';end if;
  actual:=(l->>'actual')::numeric;
  if actual is not null and (actual<0 or actual>100000000 or scale(actual)>6) then raise exception 'actual-invalid';end if;
  if (l->>'checked')::boolean and (actual is null or expected_line->>'required' is null) then raise exception 'unverified-line';end if;
  shortage:=case when actual is null or expected_line->>'required' is null then null else greatest(0,(expected_line->>'required')::numeric-actual) end;
  result_lines:=result_lines||jsonb_build_array(expected_line||jsonb_build_object('actual',actual,'checked',(l->>'checked')::boolean,'note',l->>'note','shortage',shortage));
 end loop;
 response:=jsonb_build_object('cutId',p_cut,'orderId',p_order,'productId',p_product,'revisions',src->'revisions','version',p_expected+1,'requestId',p_request,'responsible',p_payload->>'responsible','note',p_payload->>'note','lines',result_lines,'officialSeparationChanged',false);
 insert into checklist_lab.record_history(cut_id,order_id,product_id,source_snapshot,version,request_id,actor,payload,result)
 values(p_cut,p_order,p_product,src,p_expected+1,p_request,'checklist_lab_operator',p_payload,response);
 return response;
end$fn$;
grant create on schema checklist_lab to checklist_lab_writer;
alter function checklist_lab.save_record_checklist(text,text,text,jsonb,bigint,text,jsonb) owner to checklist_lab_writer;
revoke create on schema checklist_lab from checklist_lab_writer;
revoke all on function checklist_lab.save_record_checklist(text,text,text,jsonb,bigint,text,jsonb) from public;
grant execute on function checklist_lab.save_record_checklist(text,text,text,jsonb,bigint,text,jsonb) to checklist_lab_operator;
