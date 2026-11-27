-- ISOLATED SQL PROOF. Synthetic relational model, not hlgb_records or real Hub.
-- Privileges are lab roles, NOT proof of real HLGB authorization.
create function ledger_lab.pay(p_client text,p_ref text,p_revision bigint,p_day date,p_method text,p_amount bigint,p_selected jsonb,p_remainder_reviewed boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 a ledger_lab.accounts%rowtype; n ledger_lab.notes%rowtype; t ledger_lab.titles%rowtype; prior ledger_lab.receipts%rowtype;
 request jsonb; answer jsonb; selected jsonb; allocations jsonb:='[]'::jsonb;
 remaining bigint; applied bigint; available bigint; balance_after bigint; next_status text; actual_count integer; matched_count integer;
begin
 if p_client is null or length(p_client) not between 1 and 128 or p_ref is null or length(p_ref) not between 1 and 128 or p_revision is null or p_revision<1 or p_day is null or p_method is null or length(trim(p_method)) not between 1 and 80 or p_amount is null or p_amount not between 1 and 1000000000000 or jsonb_typeof(p_selected) is distinct from 'array' or jsonb_array_length(p_selected)>50 or p_remainder_reviewed is null then raise exception 'input'; end if;
 -- One global receipt key, independent of client; conflicting retries rejected.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ledger-lab:'||p_ref,0));
 request:=jsonb_build_object('client',p_client,'revision',p_revision,'date',p_day,'method',p_method,'amount',p_amount,'selected',p_selected,'remainderReviewed',p_remainder_reviewed);
 select * into prior from ledger_lab.receipts r where r.ref=p_ref;
 if found then if prior.request is distinct from request then raise exception 'reference-conflict'; end if; return prior.result; end if;
 select * into a from ledger_lab.accounts x where x.client_id=p_client for update;
 if not found or a.revision<>p_revision then raise exception 'account-revision'; end if;
 -- Validate selected note and title revisions before any allocation.
 for selected in select value from jsonb_array_elements(p_selected) loop
  if jsonb_typeof(selected) is distinct from 'object' or selected-array['noteId','noteRevision','titleRevision']<>'{}'::jsonb or jsonb_typeof(selected->'noteId') is distinct from 'string' or length(selected->>'noteId') not between 1 and 128 or jsonb_typeof(selected->'noteRevision') is distinct from 'number' or jsonb_typeof(selected->'titleRevision') is distinct from 'number' or (selected->>'noteRevision') !~ '^[1-9][0-9]{0,15}$' or (selected->>'titleRevision') !~ '^[1-9][0-9]{0,15}$' then raise exception 'selection'; end if;
 end loop;
 select count(distinct x->>'noteId') into actual_count from jsonb_array_elements(p_selected) x;
 if actual_count<>jsonb_array_length(p_selected) then raise exception 'duplicate-selection'; end if;
 select count(*) into matched_count from ledger_lab.notes x where x.client_id=p_client and x.id in(select e->>'noteId' from jsonb_array_elements(p_selected) e);
 if matched_count<>actual_count then raise exception 'note-identity'; end if;
 -- Lock note and title in stable order; derive allocations by oldest emission.
 remaining:=p_amount;
 for n in select x.* from ledger_lab.notes x where x.client_id=p_client and x.id in(select e->>'noteId' from jsonb_array_elements(p_selected) e) order by x.issued,x.id for update loop
  select e into selected from jsonb_array_elements(p_selected) e where e->>'noteId'=n.id;
  select * into t from ledger_lab.titles x where x.note_id=n.id for update;
  if not found or n.client_id<>t.client_id or n.revision<>(selected->>'noteRevision')::bigint or t.revision<>(selected->>'titleRevision')::bigint or n.status not in ('open','partial') or n.issued>p_day or t.status<>n.status or t.total<>n.total or t.paid<>n.paid or t.credit<>n.credit then raise exception 'note-title-divergence'; end if;
  available:=n.total-n.paid-n.credit;
  if available<=0 then raise exception 'note-balance'; end if;
  applied:=least(remaining,available);
  if applied=0 then continue; end if;
  next_status:=case when applied=available then 'paid' else 'partial' end;
  update ledger_lab.notes set paid=n.paid+applied,status=next_status,revision=n.revision+1 where id=n.id;
  update ledger_lab.titles set paid=t.paid+applied,status=next_status,revision=t.revision+1 where id=t.id;
  allocations:=allocations||jsonb_build_array(jsonb_build_object('noteId',n.id,'titleId',t.id,'amountCents',applied,'beforeCents',available,'afterCents',available-applied));
  remaining:=remaining-applied;
 end loop;
 if remaining>0 and not p_remainder_reviewed then raise exception 'remainder-not-reviewed'; end if;
 balance_after:=a.independent_cents-remaining;
 update ledger_lab.accounts set independent_cents=balance_after,revision=a.revision+1 where client_id=p_client;
 answer:=jsonb_build_object('reference',p_ref,'clientId',p_client,'amountCents',p_amount,'allocatedCents',p_amount-remaining,'independentBeforeCents',a.independent_cents,'independentAfterCents',balance_after,'accountRevision',a.revision+1,'allocations',allocations);
 insert into ledger_lab.receipts(ref,client_id,request,result) values(p_ref,p_client,request,answer);
 insert into ledger_lab.hub(ref,client_id,day,amount) values(p_ref,p_client,p_day,p_amount);
 return answer;
end $$;
revoke all on function ledger_lab.pay(text,text,bigint,date,text,bigint,jsonb,boolean) from public;
grant execute on function ledger_lab.pay(text,text,bigint,date,text,bigint,jsonb,boolean) to ledger_lab_operator;
