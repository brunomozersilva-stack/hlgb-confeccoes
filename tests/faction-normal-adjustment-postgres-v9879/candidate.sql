-- Candidate ONLY. Coarse serialization for synthetic fixture, not a production lock design.
create function fa_lab.adjust(p_id text,p_ref text,p_revision bigint,p_delivery_revision bigint,p_qty bigint,p_rate bigint,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $body$
declare p fa_lab.records%rowtype; f fa_lab.records%rowtype; prior fa_lab.events%rowtype; h jsonb; n bigint; qty bigint; old_qty bigint; old_rate bigint; old_value bigint; total bigint; req jsonb; ans jsonb; event jsonb; next_data jsonb; prev_event jsonb;
begin
 if current_user<>'fa_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 if p_id is null or p_ref is null or p_ref !~ '^[a-zA-Z0-9_-]{1,100}$' or p_revision is null or p_revision<1 or p_delivery_revision is null or p_delivery_revision<1 or p_qty is null or p_qty not between 1 and 1000000 or p_rate is null or p_rate not between 1 and 1000000 or p_reason is null or length(trim(p_reason)) not between 6 and 500 then raise exception 'input';end if;
 lock table fa_lab.records in share row exclusive mode;
 req:=jsonb_build_object('id',p_id,'revision',p_revision,'deliveryRevision',p_delivery_revision,'qty',p_qty,'rateCents',p_rate,'reason',trim(p_reason));
 select * into prior from fa_lab.events where ref=p_ref;
 if found then if prior.request is distinct from req then raise exception 'reference-conflict';end if;return prior.result;end if;
 select * into p from fa_lab.records where module='factionPayments' and id=p_id and not deleted for update;
 if not found or p.revision<>p_revision or p.data->>'id' is distinct from p_id then raise exception 'payment-revision';end if;
 if p.data->>'status' is distinct from 'Pendente' or p.data->>'manual'='true' or p.data->>'manualCanceledV9590'='true' or coalesce(p.data->>'paidAmount','0')::numeric<>0 or coalesce(p.data->>'discountAmount','0')::numeric<>0 or coalesce(p.data->'paymentHistory','[]') is distinct from '[]'::jsonb or coalesce(p.data->>'serviceModeV9577','faccao')<>'faccao' then raise exception 'not-wholly-pending';end if;
 if not exists(select 1 from fa_lab.records x where x.module='factionMasters' and not x.deleted and x.id=p.data->>'factionMasterId' and x.data->>'name'=p.data->>'factionName' and coalesce(x.data->>'active','true')='true') then raise exception 'payee';end if;
 select * into f from fa_lab.records where module='factions' and id=p.data->>'factionServiceId' and not deleted for update;
 if not found or f.revision<>p_delivery_revision or f.data->>'id' is distinct from f.id or jsonb_typeof(f.data->'deliveryHistory') is distinct from 'array' then raise exception 'delivery-revision';end if;
 if coalesce(p.data->>'travetaPricingVersion','')<>'' or coalesce(f.data->>'travetaPricingVersion','')<>'' or coalesce(p.data->>'travetaDiscountTotalV9577','0')::numeric<>0 or coalesce(p.data->>'travetaDiscountUnitV9577','0')::numeric<>0 or coalesce(p.data->>'travetaDiscount','0')::numeric<>0 then raise exception 'special-pricing';end if;
 select count(*) into n from jsonb_array_elements(f.data->'deliveryHistory') e where e->>'id'=p.data->>'deliveryId' and coalesce(e->>'status','') not in ('Cancelado','Excluido') and coalesce(e->>'deleted','false')<>'true';
 if n<>1 then raise exception 'delivery-identity';end if;
 select e into h from jsonb_array_elements(f.data->'deliveryHistory') e where e->>'id'=p.data->>'deliveryId' and coalesce(e->>'status','') not in ('Cancelado','Excluido') and coalesce(e->>'deleted','false')<>'true';
 if coalesce(h->>'qty','') !~ '^[1-9][0-9]{0,6}$' or coalesce(p.data->>'quantity','') !~ '^[1-9][0-9]{0,6}$' or coalesce(h->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or (h->>'date')::date>current_date then raise exception 'delivery-proof';end if;
 qty:=(h->>'qty')::bigint;
 if qty<>(p.data->>'quantity')::bigint or p_qty>qty or coalesce(f.data->>'done','0')::numeric<qty then raise exception 'quantity-range';end if;
 if (select count(*) from fa_lab.records x where x.module='factionPayments' and not x.deleted and x.data->>'factionServiceId'=f.id and x.data->>'deliveryId'=h->>'id' and coalesce(x.data->>'manual','false')<>'true' and coalesce(x.data->>'status','') not in ('Cancelado','Excluido'))<>1 then raise exception 'duplicate-delivery';end if;
 if exists(select 1 from fa_lab.records x where x.module='hubFinanceEntries' and not x.deleted and (x.data->>'sourceId'=p_id or x.data->>'sourcePaymentId'=p_id or x.data->>'factionPaymentId'=p_id or x.data->>'originalPaymentId'=p_id)) then raise exception 'linked-hub';end if;
 old_qty:=qty;
 if p.data ? 'settlementAdjustmentV9879' then
  prev_event:=p.data->'settlementAdjustmentV9879';
  if not exists(select 1 from fa_lab.events e where e.payment_id=p_id and e.ref=prev_event->>'reference' and e.result->'adjustment'=prev_event) then raise exception 'adjustment-proof';end if;
  old_qty:=(prev_event->>'payableQuantity')::bigint;
 end if;
 if coalesce(p.data->>'unitPrice','') !~ '^[0-9]{1,10}(\.[0-9]{1,20})?$' or coalesce(p.data->>'value','') !~ '^[0-9]{1,10}(\.[0-9]{1,20})?$' then raise exception 'money';end if;
 if (p.data->>'unitPrice')::numeric*100<>trunc((p.data->>'unitPrice')::numeric*100) or (p.data->>'value')::numeric*100<>trunc((p.data->>'value')::numeric*100) then raise exception 'money';end if;
 old_rate:=((p.data->>'unitPrice')::numeric*100)::bigint;old_value:=((p.data->>'value')::numeric*100)::bigint;
 if old_rate<=0 or old_qty<=0 or old_qty>qty or old_qty*old_rate<>old_value then raise exception 'value-proof';end if;
 if p_qty=old_qty and p_rate=old_rate then raise exception 'unchanged';end if;
 total:=p_qty*p_rate;
 event:=jsonb_build_object('reference',p_ref,'deliveredQuantity',qty,'payableQuantity',p_qty,'deliveryDate',h->>'date','previousPayableQuantity',old_qty,'previousUnitCents',old_rate,'unitCents',p_rate,'previousCents',old_value,'totalCents',total,'reason',trim(p_reason),'actor',current_user);
 next_data:=p.data||jsonb_build_object('unitPrice',round(p_rate::numeric/100,2),'value',round(total::numeric/100,2),'settlementAdjustmentV9879',event);
 update fa_lab.records set data=next_data,revision=revision+1 where module='factionPayments' and id=p_id and revision=p_revision;
 if not found then raise exception 'payment-revision';end if;
 ans:=jsonb_build_object('paymentId',p_id,'revision',p_revision+1,'adjustment',event,'hubMovementCents',0,'physicalQuantity',qty);
 insert into fa_lab.events(ref,payment_id,request,result,actor) values(p_ref,p_id,req,ans,current_user);
 return ans;
end$body$;
revoke all on function fa_lab.adjust(text,text,bigint,bigint,bigint,bigint,text) from public;
grant execute on function fa_lab.adjust(text,text,bigint,bigint,bigint,bigint,text) to fa_lab_operator;
