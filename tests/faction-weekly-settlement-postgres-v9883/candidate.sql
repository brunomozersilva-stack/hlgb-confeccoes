-- Lab only: fully pending, undiscounted, complete weekly settlement.
-- Explicitly excludes partial payments and complex adjustments until their own
-- allocation and reversal contract exists. Does not infer delivery from due dates.
create function fa_lab.weekly_settle(p_owner text,p_week date,p_ref text,p_date date,p_method text,p_expected jsonb,p_amount bigint)
returns jsonb language plpgsql security invoker set search_path='' as $body$
declare m fa_lab.records%rowtype; r fa_lab.records%rowtype; f fa_lab.records%rowtype; prior fa_lab.weekly_receipts%rowtype;
 h jsonb; adj jsonb; day date; qty bigint; rate bigint; val bigint; total bigint:=0; count_matches bigint; selected jsonb:='[]'; req jsonb; ans jsonb; item jsonb; ids text[]:='{}'; groups text[]:='{}'; history jsonb; hub_id text;
begin
 if current_user<>'fa_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 if p_owner is null or p_week is null or extract(isodow from p_week)<>1 or p_ref is null or p_ref !~ '^[a-zA-Z0-9_-]{1,100}$' or p_date is null or p_date>current_date or p_date<p_week or p_method is null or p_method not in ('PIX','Transferência','Dinheiro','Cheque','Outro') or p_amount is null or p_amount<=0 or jsonb_typeof(p_expected) is distinct from 'array' or jsonb_array_length(p_expected) not between 1 and 500 then raise exception 'input';end if;
 lock table fa_lab.records in share row exclusive mode;
 req:=jsonb_build_object('owner',p_owner,'week',p_week,'date',p_date,'method',p_method,'items',p_expected,'amountCents',p_amount);
 select * into prior from fa_lab.weekly_receipts where ref=p_ref;
 if found then if prior.request is distinct from req then raise exception 'reference-conflict';end if;return prior.result;end if;
 select * into m from fa_lab.records where module='factionMasters' and id=p_owner and not deleted;
 if not found or m.data->>'id' is distinct from p_owner or coalesce(m.data->>'active','true')<>'true' then raise exception 'owner';end if;
 -- Determine membership from registered delivery evidence, never planned date.
 for r in select * from fa_lab.records x where x.module='factionPayments' and not x.deleted and x.data->>'factionMasterId'=p_owner and x.data->>'status' in ('Pendente','Parcial') order by x.id loop
  day:=null;qty:=null;
  if r.data->>'manual'='true' then
   if r.data->>'manualDeliveryOwnerV9875' is distinct from p_owner or coalesce(r.data->>'manualDeliveryDateV9875','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then continue;end if;
   day:=(r.data->>'manualDeliveryDateV9875')::date;
  else
   select * into f from fa_lab.records x where x.module='factions' and x.id=r.data->>'factionServiceId' and not x.deleted;
   if not found or jsonb_typeof(f.data->'deliveryHistory') is distinct from 'array' then continue;end if;
   select count(*) into count_matches from jsonb_array_elements(f.data->'deliveryHistory') e where e->>'id'=r.data->>'deliveryId' and coalesce(e->>'deleted','false')<>'true' and coalesce(e->>'status','') not in ('Cancelado','Excluido');
   if count_matches=0 then continue;end if;
   if count_matches<>1 then raise exception 'duplicate-delivery-history';end if;
   select e into h from jsonb_array_elements(f.data->'deliveryHistory') e where e->>'id'=r.data->>'deliveryId' and coalesce(e->>'deleted','false')<>'true' and coalesce(e->>'status','') not in ('Cancelado','Excluido');
   if coalesce(h->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'delivery-date';end if;
   day:=(h->>'date')::date;
  end if;
  if day<p_week or day>=p_week+7 then continue;end if;
  if day>p_date or r.data->>'id' is distinct from r.id or r.data->>'factionName' is distinct from m.data->>'name' or r.data->>'status' is distinct from 'Pendente' or coalesce(r.data->>'paidAmount','0')::numeric<>0 or coalesce(r.data->>'discountAmount','0')::numeric<>0 or coalesce(r.data->'paymentHistory','[]') is distinct from '[]'::jsonb or coalesce(r.data->>'serviceModeV9577','faccao')<>'faccao' or coalesce(r.data->>'manualCanceledV9590','false')='true' then raise exception 'weekly-item-review';end if;
  if coalesce(r.data->>'quantity','') !~ '^[1-9][0-9]{0,6}$' or coalesce(r.data->>'unitPrice','') !~ '^[0-9]{1,10}([.][0-9]{1,20})?$' or coalesce(r.data->>'value','') !~ '^[0-9]{1,10}([.][0-9]{1,20})?$' then raise exception 'item-value';end if;
  qty:=(r.data->>'quantity')::bigint;
  if (r.data->>'unitPrice')::numeric*100<>trunc((r.data->>'unitPrice')::numeric*100) or (r.data->>'value')::numeric*100<>trunc((r.data->>'value')::numeric*100) then raise exception 'item-value';end if;
  rate:=((r.data->>'unitPrice')::numeric*100)::bigint;val:=((r.data->>'value')::numeric*100)::bigint;
  if rate<=0 or val<=0 or rate>1000000 or qty>1000000 then raise exception 'item-value';end if;
  if r.data->>'manual'='true' then
   if coalesce(r.data->>'manualGroupId','')='' or coalesce(r.data->'manualDirectAdjustmentsV9591','[]') is distinct from '[]'::jsonb or coalesce(r.data->'manualApplicationsV9590','[]') is distinct from '[]'::jsonb or coalesce(r.data->'manualCorrectionsV9590','[]') is distinct from '[]'::jsonb or coalesce(r.data->>'travetaDiscountTotalV9577','0')::numeric<>0 then raise exception 'manual-review';end if;
   if exists(select 1 from fa_lab.records x where x.module='factionPayments' and not x.deleted and x.data->>'manualGroupId'=r.data->>'manualGroupId' and (x.data->>'manual' is distinct from 'true' or x.data->>'status' is distinct from 'Pendente' or x.data->>'factionMasterId' is distinct from p_owner or x.data->>'manualDeliveryOwnerV9875' is distinct from p_owner or x.data->>'manualDeliveryDateV9875' is distinct from r.data->>'manualDeliveryDateV9875')) then raise exception 'manual-group-review';end if;
   groups:=array_append(groups,r.data->>'manualGroupId');
  else
   if coalesce(h->>'qty','') !~ '^[1-9][0-9]{0,6}$' or (h->>'qty')::bigint<>qty or coalesce(f.data->>'done','0')::numeric<qty then raise exception 'delivery-quantity';end if;
   if (select count(*) from fa_lab.records x where x.module='factionPayments' and not x.deleted and x.data->>'factionServiceId'=f.id and x.data->>'deliveryId'=h->>'id' and coalesce(x.data->>'manual','false')<>'true' and coalesce(x.data->>'status','') not in ('Cancelado','Excluido'))<>1 then raise exception 'duplicate-delivery';end if;
   if coalesce(r.data->>'travetaPricingVersion','')<>'' or coalesce(f.data->>'travetaPricingVersion','')<>'' or coalesce(r.data->>'travetaDiscountTotalV9577','0')::numeric<>0 or coalesce(r.data->>'travetaDiscountUnitV9577','0')::numeric<>0 or coalesce(r.data->>'travetaDiscount','0')::numeric<>0 then raise exception 'special-pricing';end if;
   if r.data ? 'settlementAdjustmentV9879' then
    adj:=r.data->'settlementAdjustmentV9879';
    if not exists(select 1 from fa_lab.events e where e.payment_id=r.id and e.ref=adj->>'reference' and e.result->'adjustment'=adj) or (adj->>'deliveredQuantity')::bigint<>qty or adj->>'deliveryDate'<>day::text or (adj->>'unitCents')::bigint<>rate or (adj->>'totalCents')::bigint<>val then raise exception 'adjustment-proof';end if;
    qty:=(adj->>'payableQuantity')::bigint;
   end if;
  end if;
  if qty<=0 or qty>(r.data->>'quantity')::bigint or qty*rate<>val then raise exception 'item-value';end if;
  selected:=selected||jsonb_build_array(jsonb_build_object('id',r.id,'revision',r.revision,'amountCents',val));
  ids:=array_append(ids,r.id);total:=total+val;
 end loop;
 if jsonb_array_length(selected)=0 or selected is distinct from p_expected or total<>p_amount then raise exception 'scope-or-value-changed';end if;
 -- Covers explicit fixture identities only; historical production links still require audit.
 if exists(select 1 from fa_lab.records x where x.module='hubFinanceEntries' and not x.deleted and (x.data->>'sourceId'=any(ids||groups) or x.data->>'sourcePaymentId'=any(ids) or x.data->>'factionPaymentId'=any(ids) or x.data->>'originalPaymentId'=any(ids) or (x.data->'paymentIds') ?| ids)) then raise exception 'linked-hub';end if;
 hub_id:='weekly:'||p_ref;
 for item in select value from jsonb_array_elements(selected) loop
  history:=jsonb_build_array(jsonb_build_object('id',p_ref||':'||(item->>'id'),'date',p_date,'paid',(item->>'amountCents')::numeric/100,'discount',0,'method',p_method,'groupSettlementId',p_ref,'groupWeek',p_week,'groupFaction',m.data->>'name'));
  update fa_lab.records set data=data||jsonb_build_object('status','Pago','paidAmount',(item->>'amountCents')::numeric/100,'paymentDate',p_date,'paymentMethod',p_method,'paymentHistory',history,'lastGroupSettlementId',p_ref),revision=revision+1 where module='factionPayments' and id=item->>'id' and revision=(item->>'revision')::bigint;
  if not found then raise exception 'revision-changed';end if;
 end loop;
 insert into fa_lab.records(module,id,data,revision) values('hubFinanceEntries',hub_id,jsonb_build_object('id',hub_id,'flow','Saída','status','Realizado','value',round(total::numeric/100,2),'date',p_date,'paymentMethod',p_method,'category','Facções','person',m.data->>'name','sourceType','faction_weekly_settlement_lab','sourceId',p_ref,'paymentIds',to_jsonb(ids)),1);
 ans:=jsonb_build_object('reference',p_ref,'owner',p_owner,'week',p_week,'amountCents',total,'hubId',hub_id,'items',selected,'paidCount',cardinality(ids));
 insert into fa_lab.weekly_receipts(ref,request,result,actor) values(p_ref,req,ans,current_user);
 return ans;
end$body$;
revoke all on function fa_lab.weekly_settle(text,date,text,date,text,jsonb,bigint) from public;
grant execute on function fa_lab.weekly_settle(text,date,text,date,text,jsonb,bigint) to fa_lab_operator;
