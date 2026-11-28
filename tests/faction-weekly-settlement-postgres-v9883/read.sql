-- Independent receipt verification, laboratory only. A successful write ACK
-- is not confirmation. Re-read all rows and the single linked Hub movement.
create function fa_lab.read_weekly(p_owner text,p_ref text)
returns jsonb language plpgsql security invoker set search_path='' as $body$
declare rr fa_lab.weekly_receipts%rowtype; h fa_lab.records%rowtype; p fa_lab.records%rowtype; i jsonb; ev jsonb; ids text[]:='{}'; out_rows jsonb:='[]'; total bigint:=0;
begin
 if current_user<>'fa_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 select * into rr from fa_lab.weekly_receipts where ref=p_ref;
 if not found or rr.result->>'owner' is distinct from p_owner or rr.result->>'reference' is distinct from p_ref then return null;end if;
 select * into h from fa_lab.records where module='hubFinanceEntries' and id=rr.result->>'hubId' and not deleted;
 if not found or h.data->>'sourceId' is distinct from p_ref or h.data->>'sourceType' is distinct from 'faction_weekly_settlement_lab' or h.data->>'status' is distinct from 'Realizado' or h.data->>'flow' is distinct from 'Saída' or h.data->>'date' is distinct from rr.request->>'date' or h.data->>'paymentMethod' is distinct from rr.request->>'method' or (h.data->>'value')::numeric*100 is distinct from (rr.result->>'amountCents')::numeric then return null;end if;
 for i in select value from jsonb_array_elements(rr.result->'items') loop
  select * into p from fa_lab.records where module='factionPayments' and id=i->>'id' and not deleted;
  if not found or p.revision<>(i->>'revision')::bigint+1 or p.data->>'factionMasterId' is distinct from p_owner or p.data->>'status' is distinct from 'Pago' or (p.data->>'paidAmount')::numeric*100 is distinct from (i->>'amountCents')::numeric or (p.data->>'value')::numeric*100 is distinct from (i->>'amountCents')::numeric or p.data->>'paymentDate' is distinct from rr.request->>'date' or p.data->>'paymentMethod' is distinct from rr.request->>'method' or p.data->>'lastGroupSettlementId' is distinct from p_ref or jsonb_typeof(p.data->'paymentHistory') is distinct from 'array' or jsonb_array_length(p.data->'paymentHistory')<>1 then return null;end if;
  ev:=p.data->'paymentHistory'->0;
  if ev->>'id' is distinct from p_ref||':'||p.id or ev->>'groupSettlementId' is distinct from p_ref or ev->>'groupWeek' is distinct from rr.result->>'week' or (ev->>'paid')::numeric*100 is distinct from (i->>'amountCents')::numeric or (ev->>'discount')::numeric is distinct from 0::numeric or ev->>'method' is distinct from rr.request->>'method' or ev->>'date' is distinct from rr.request->>'date' then return null;end if;
  if p.id=any(ids) then return null;end if;
  ids:=array_append(ids,p.id);total:=total+(i->>'amountCents')::bigint;
  out_rows:=out_rows||jsonb_build_array(jsonb_build_object('id',p.id,'revision',p.revision,'paidCents',(i->>'amountCents')::bigint,'status','Pago'));
 end loop;
 if cardinality(ids)<>(rr.result->>'paidCount')::int or total<>(rr.result->>'amountCents')::bigint or h.data->'paymentIds' is distinct from to_jsonb(ids) then return null;end if;
 if (select count(*) from fa_lab.records x where x.module='hubFinanceEntries' and not x.deleted and (x.data->>'sourceId'=p_ref or (x.data->'paymentIds') ?| ids or x.data->>'sourceId'=any(ids)))<>1 then return null;end if;
 return jsonb_build_object('receipt',rr.result,'hub',jsonb_build_object('id',h.id,'amountCents',total,'paymentIds',to_jsonb(ids),'status','Realizado'),'rows',out_rows,'currentMatch',true);
end$body$;
revoke all on function fa_lab.read_weekly(text,text) from public;
grant execute on function fa_lab.read_weekly(text,text) to fa_lab_operator;
