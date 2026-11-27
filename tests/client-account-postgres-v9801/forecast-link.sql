-- Synthetic fixture. Explicit human-confirmed documentary reference, not verified proof.
create table records_lab.forecast_links(
 ref text primary key, client_id text not null, note_id text not null unique,
 title_id text not null unique, hub_id text not null unique,
 request jsonb not null,result jsonb not null,actor text not null,
 recorded_at timestamptz not null default clock_timestamp()
);
grant select,insert on records_lab.forecast_links to records_lab_operator;
insert into records_lab.hlgb_records(module,entity_id,data,revision) values
('projectionInvoices','n4','{"id":"n4","clientId":"c","value":100,"paid":0,"remaining":100,"status":"Pendente","issueDate":"2026-11-01","dueDate":"2026-12-01","items":[],"paymentHistory":[]}',1),
('finance','f4','{"id":"f4","clientId":"c","projectionInvoiceId":"n4","value":100,"paid":0,"remaining":100,"status":"Pendente","dueDate":"2026-12-01"}',1),
('hubFinanceEntries','h4','{"id":"h4","flow":"Entrada","status":"Previsto","value":100,"date":"2026-12-01","description":"Previsão antiga"}',1),
('hubFinanceEntries','h5','{"id":"h5","flow":"Entrada","status":"Previsto","value":100,"date":"2026-12-01"}',1);
create function records_lab.link_forecast(p_ref text,p_client text,p_note text,p_title text,p_hub text,p_nr bigint,p_tr bigint,p_hr bigint,p_evidence text,p_reason text,p_confirmed boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n records_lab.hlgb_records%rowtype; t records_lab.hlgb_records%rowtype; h records_lab.hlgb_records%rowtype; old_link records_lab.forecast_links%rowtype;
 req jsonb; ans jsonb; payload jsonb; marker jsonb; ack record; amount bigint; hist bigint; credit bigint; total bigint; paid bigint;
begin
 if current_user<>'records_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 if p_ref is null or p_ref !~ '^[a-zA-Z0-9_-]{1,100}$' or coalesce(p_client,'')='' or coalesce(p_note,'')='' or coalesce(p_title,'')='' or coalesce(p_hub,'')='' or p_nr is null or p_tr is null or p_hr is null or least(p_nr,p_tr,p_hr)<1 or p_evidence is null or length(trim(p_evidence)) not between 3 and 200 or p_reason is null or length(trim(p_reason)) not between 5 and 500 or p_confirmed is distinct from true then raise exception 'link-input';end if;
 lock table records_lab.hlgb_records in share row exclusive mode;
 req:=jsonb_build_object('client',p_client,'note',p_note,'title',p_title,'hub',p_hub,'nr',p_nr,'tr',p_tr,'hr',p_hr,'evidence',p_evidence,'reason',p_reason,'confirmed',p_confirmed);
 select * into old_link from records_lab.forecast_links x where x.ref=p_ref;
 if found then if old_link.request is distinct from req then raise exception 'link-reference-conflict';end if;return old_link.result;end if;
 if exists(select 1 from records_lab.forecast_links x where x.note_id=p_note or x.title_id=p_title or x.hub_id=p_hub) then raise exception 'link-exists';end if;
 select * into n from records_lab.hlgb_records x where x.module='projectionInvoices' and x.entity_id=p_note and x.deleted_at is null for update;
 select * into t from records_lab.hlgb_records x where x.module='finance' and x.entity_id=p_title and x.deleted_at is null for update;
 select * into h from records_lab.hlgb_records x where x.module='hubFinanceEntries' and x.entity_id=p_hub and x.deleted_at is null for update;
 if n.revision is distinct from p_nr or t.revision is distinct from p_tr or h.revision is distinct from p_hr or n.data->>'id' is distinct from p_note or t.data->>'id' is distinct from p_title or h.data->>'id' is distinct from p_hub or n.data->>'clientId' is distinct from p_client or t.data->>'clientId' is distinct from p_client or t.data->>'projectionInvoiceId' is distinct from p_note or coalesce(n.data->>'status','') not in ('Pendente','Parcial') or t.data->>'status' is distinct from n.data->>'status' or n.data->>'migratedToNoteQueueV9223'='true' or jsonb_typeof(n.data->'items') is distinct from 'array' or exists(select 1 from jsonb_array_elements(n.data->'items') i where i->>'source'='faction_delivery_v9140') then raise exception 'link-identity-revision';end if;
 if not exists(select 1 from records_lab.hlgb_records x where x.module='clients' and x.entity_id=p_client and x.deleted_at is null) or (select count(*) from records_lab.hlgb_records x where x.module='finance' and x.deleted_at is null and x.data->>'projectionInvoiceId'=p_note)<>1 then raise exception 'link-client-title';end if;
 total:=records_lab.cents(n.data->'value');paid:=records_lab.cents(n.data->'paid');amount:=records_lab.cents(n.data->'remaining');
 select coalesce(sum(records_lab.cents(e->'value')),0) into hist from jsonb_array_elements(coalesce(n.data->'paymentHistory','[]')) e;
 select coalesce(sum(records_lab.cents(e->'value')),0) into credit from jsonb_array_elements(coalesce(n.data->'acertoReturnsV9565','[]')) e where coalesce(e->>'reversedAt','')='';
 if amount<=0 or hist<>paid or total-paid-credit<>amount or records_lab.cents(t.data->'value')<>total or records_lab.cents(t.data->'paid')<>paid or records_lab.cents(t.data->'remaining')<>amount or records_lab.cents(coalesce(t.data->'creditReturnsV9565','0'))<>credit then raise exception 'link-balance';end if;
 if h.data->>'flow' is distinct from 'Entrada' or h.data->>'status' is distinct from 'Previsto' or coalesce(h.data->>'realizedAt','')<>'' or records_lab.cents(h.data->'value')<>amount or coalesce(h.data->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or h.data->>'date' is distinct from coalesce(t.data->>'dueDate',n.data->>'dueDate') or h.data->>'date' is distinct from ((h.data->>'date')::date)::text or exists(select 1 from jsonb_object_keys(h.data) k where k in ('sourceType','sourceId','projectionInvoiceId','clientId','clientForecastLinkV9815') and coalesce(h.data->>k,'')<>'') then raise exception 'link-forecast';end if;
 if exists(select 1 from records_lab.hlgb_records x where x.module='hubFinanceEntries' and x.deleted_at is null and x.entity_id<>p_hub and (x.data->>'projectionInvoiceId'=p_note or x.data->>'sourceId'=p_title)) then raise exception 'link-competing';end if;
 marker:=jsonb_build_object('reference',p_ref,'clientId',p_client,'noteId',p_note,'titleId',p_title,'reason',p_reason,'evidence',p_evidence,'actor',current_user,'at',clock_timestamp());
 payload:=h.data||jsonb_build_object('sourceType','client_note_forecast_v9815','sourceId',p_title,'projectionInvoiceId',p_note,'clientId',p_client,'clientForecastLinkV9815',marker);
 select * into ack from records_lab.hlgb_save_record('hubFinanceEntries',p_hub,payload,p_hr,false);
 if ack.applied is distinct from true or ack.revision<>p_hr+1 or ack.data is distinct from payload then raise exception 'link-ack';end if;
 ans:=jsonb_build_object('reference',p_ref,'hubId',p_hub,'revision',ack.revision,'amountCents',amount,'cashMovementCents',0);
 insert into records_lab.forecast_links(ref,client_id,note_id,title_id,hub_id,request,result,actor) values(p_ref,p_client,p_note,p_title,p_hub,req,ans,current_user);
 return ans;
end$$;
revoke all on function records_lab.link_forecast(text,text,text,text,text,bigint,bigint,bigint,text,text,boolean) from public;
grant execute on function records_lab.link_forecast(text,text,text,text,text,bigint,bigint,bigint,text,text,boolean) to records_lab_operator;
