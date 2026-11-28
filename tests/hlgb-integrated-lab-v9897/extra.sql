-- Only synthetic fixture. Edit/add a weekly avulso without modifying any delivery.
create table fa_lab.extra_events(ref text primary key,request jsonb not null,result jsonb not null);
grant select,insert on fa_lab.extra_events to fa_lab_operator;
create function fa_lab.extra(p_id text,p_ref text,p_rev bigint,p_name text,p_qty bigint,p_rate bigint) returns jsonb language plpgsql security invoker set search_path='' as $b$
declare r fa_lab.records%rowtype; prior fa_lab.extra_events%rowtype; req jsonb; result jsonb; next_data jsonb;
begin
 if current_user<>'fa_lab_operator' then raise exception 'permission';end if;
 if p_id is null or p_ref is null or p_ref !~ '^[a-zA-Z0-9_-]{1,100}$' or p_rev is null or p_rev<0 or p_qty is null or p_qty not between 1 and 1000000 or p_rate is null or p_rate not between 1 and 1000000 or p_name is null or length(trim(p_name)) not between 1 and 120 or (p_rev=0 and p_id is distinct from 'extra:'||p_ref) then raise exception 'input';end if;
 lock table fa_lab.records in share row exclusive mode;
 req:=jsonb_build_object('id',p_id,'revision',p_rev,'name',trim(p_name),'qty',p_qty,'rate',p_rate);
 select * into prior from fa_lab.extra_events where ref=p_ref;
 if found then if prior.request is distinct from req then raise exception 'reference-conflict';end if;return prior.result;end if;
 if exists(select 1 from fa_lab.records x where x.module='factionPayments' and not x.deleted and x.data->>'manualGroupId'='av1' and (x.data->>'status' is distinct from 'Pendente' or x.data->>'manualDeliveryOwnerV9875' is distinct from 'm1' or x.data->>'manualDeliveryDateV9875' is distinct from '2026-11-27')) then raise exception 'group-review';end if;
 if exists(select 1 from fa_lab.records x where x.module='hubFinanceEntries' and not x.deleted and (x.data->>'sourceId'='av1' or x.data->>'sourceId'=p_id or (x.data->'paymentIds') ? p_id)) then raise exception 'linked-hub';end if;
 select * into r from fa_lab.records where module='factionPayments' and id=p_id and not deleted for update;
 if p_rev=0 then
  if found then raise exception 'identity';end if;
  next_data:=jsonb_build_object('id',p_id,'manual',true,'manualGroupId','av1','manualDeliveryDateV9875','2026-11-27','manualDeliveryOwnerV9875','m1','factionMasterId','m1','factionName','Cirlene','status','Pendente','paidAmount',0,'discountAmount',0,'paymentHistory','[]'::jsonb);
 else
  if not found or r.revision<>p_rev or r.data->>'manual' is distinct from 'true' or r.data->>'manualGroupId' is distinct from 'av1' or r.data->>'status' is distinct from 'Pendente' or coalesce(r.data->>'paidAmount','0')::numeric<>0 or coalesce(r.data->>'discountAmount','0')::numeric<>0 or coalesce(r.data->'paymentHistory','[]') is distinct from '[]'::jsonb then raise exception 'revision-or-status';end if;
  next_data:=r.data;
 end if;
 next_data:=next_data||jsonb_build_object('description',trim(p_name),'quantity',p_qty,'unitPrice',round(p_rate::numeric/100,2),'value',round((p_qty*p_rate)::numeric/100,2));
 if p_rev=0 then insert into fa_lab.records(module,id,data,revision) values('factionPayments',p_id,next_data,1);
 else update fa_lab.records set data=next_data,revision=revision+1 where module='factionPayments' and id=p_id and revision=p_rev;if not found then raise exception 'revision';end if;end if;
 result:=jsonb_build_object('id',p_id,'revision',p_rev+1,'data',next_data);
 insert into fa_lab.extra_events values(p_ref,req,result);
 return result;
end$b$;
revoke all on function fa_lab.extra(text,text,bigint,text,bigint,bigint) from public;
grant execute on function fa_lab.extra(text,text,bigint,text,bigint,bigint) to fa_lab_operator;
