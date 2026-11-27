-- Synthetic copy of hlgb_records shape and save signature only. Never deploy.
create role records_lab_operator nologin;
create role records_lab_denied nologin;
create schema records_lab;
revoke all on schema records_lab from public;
grant usage on schema records_lab to records_lab_operator,records_lab_denied;
create table records_lab.hlgb_records(module text not null,entity_id text not null,data jsonb not null,revision bigint not null,deleted_at timestamptz,updated_at timestamptz default clock_timestamp(),primary key(module,entity_id));
create table records_lab.receipts(ref text primary key,client_id text not null,request jsonb not null,result jsonb not null,recorded_at timestamptz not null default clock_timestamp(),actor text not null);
alter table records_lab.hlgb_records enable row level security;
grant select,insert,update on records_lab.hlgb_records to records_lab_operator;
grant select,insert on records_lab.receipts to records_lab_operator;
create policy fixture_access on records_lab.hlgb_records for all to records_lab_operator using(module in ('clients','projectionInvoices','finance','hubFinanceEntries')) with check(module in ('projectionInvoices','finance','hubFinanceEntries'));
create function records_lab.hlgb_save_record(p_module text,p_entity_id text,p_data jsonb,p_expected_revision bigint,p_deleted boolean default false)
returns table(applied boolean,module text,entity_id text,data jsonb,revision bigint,deleted_at timestamptz)
language plpgsql security invoker set search_path='' as $$
begin
 if p_deleted then raise exception 'lab-no-delete';end if;
 if p_module='hubFinanceEntries' and p_entity_id='receipt:fault' then raise exception 'lab-hub-fault';end if;
 if p_expected_revision=0 then
 return query insert into records_lab.hlgb_records as rr(module,entity_id,data,revision) values(p_module,p_entity_id,p_data,1) on conflict do nothing returning true,rr.module,rr.entity_id,rr.data,rr.revision,rr.deleted_at;
 else
 return query update records_lab.hlgb_records rr set data=p_data,revision=rr.revision+1,updated_at=clock_timestamp() where rr.module=p_module and rr.entity_id=p_entity_id and rr.revision=p_expected_revision and rr.deleted_at is null returning true,rr.module,rr.entity_id,rr.data,rr.revision,rr.deleted_at;
 end if;
end$$;
revoke all on function records_lab.hlgb_save_record(text,text,jsonb,bigint,boolean) from public;
grant execute on function records_lab.hlgb_save_record(text,text,jsonb,bigint,boolean) to records_lab_operator;
insert into records_lab.hlgb_records(module,entity_id,data,revision) values
('clients','c','{"id":"c","name":"Cliente fictício"}',1),
('projectionInvoices','n1','{"id":"n1","clientId":"c","value":100,"paid":20,"remaining":70,"status":"Parcial","issueDate":"2026-11-01","items":[{"productId":"p","qty":50}],"paymentHistory":[{"id":"old","value":20}],"acertoReturnsV9565":[{"id":"r","value":10}],"acertoNotesV9565":[{"id":"keep","text":"preserve"}]}',3),
('finance','f1','{"id":"f1","clientId":"c","projectionInvoiceId":"n1","value":100,"paid":20,"remaining":70,"creditReturnsV9565":10,"status":"Parcial","dueDate":"2026-12-03"}',4),
('projectionInvoices','n2','{"id":"n2","clientId":"c","value":50,"paid":0,"remaining":50,"status":"Pendente","issueDate":"2026-11-02","items":[{"productId":"p2","qty":25}],"paymentHistory":[]}',1),
('finance','f2','{"id":"f2","clientId":"c","projectionInvoiceId":"n2","value":50,"paid":0,"remaining":50,"creditReturnsV9565":0,"status":"Pendente"}',1),
('hubFinanceEntries','prev1','{"id":"prev1","sourceType":"lab-title-forecast","sourceId":"f1","clientId":"c","flow":"Entrada","status":"Previsto","value":70}',1),
('hubFinanceEntries','prev2','{"id":"prev2","sourceType":"lab-title-forecast","sourceId":"f2","clientId":"c","flow":"Entrada","status":"Previsto","value":50}',1);
