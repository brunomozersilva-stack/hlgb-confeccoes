-- Synthetic additions to the adjustment fixture. No commercial migration.
grant insert on fa_lab.records to fa_lab_operator;
create table fa_lab.weekly_receipts(ref text primary key,request jsonb not null,result jsonb not null,actor text not null,created_at timestamptz not null default clock_timestamp());
grant select,insert on fa_lab.weekly_receipts to fa_lab_operator;
create function fa_lab.fail_weekly_hub() returns trigger language plpgsql set search_path='' as $body$
begin if new.module='hubFinanceEntries' and new.id='weekly:fault' then raise exception 'fixture-hub-fault';end if;return new;end$body$;
create trigger weekly_hub_failure before insert on fa_lab.records for each row execute function fa_lab.fail_weekly_hub();
insert into fa_lab.records(module,id,data,revision) values
('factionPayments','a1','{"id":"a1","manual":true,"manualGroupId":"av1","manualDeliveryDateV9875":"2026-11-27","manualDeliveryOwnerV9875":"m1","factionMasterId":"m1","factionName":"Cirlene","description":"Avulso A","status":"Pendente","quantity":10,"unitPrice":2,"value":20,"paidAmount":0,"discountAmount":0,"paymentHistory":[]}',1),
('factionPayments','a2','{"id":"a2","manual":true,"manualGroupId":"av1","manualDeliveryDateV9875":"2026-11-27","manualDeliveryOwnerV9875":"m1","factionMasterId":"m1","factionName":"Cirlene","description":"Avulso B","status":"Pendente","quantity":5,"unitPrice":2,"value":10,"paidAmount":0,"discountAmount":0,"paymentHistory":[]}',1),
('factionPayments','unknown','{"id":"unknown","factionMasterId":"m1","factionName":"Cirlene","status":"Pendente","quantity":10,"unitPrice":2,"value":20,"scheduledPaymentDate":"2026-11-27"}',1),
('factions','old','{"id":"old","done":10,"sent":10,"deliveryHistory":[{"id":"old-d","date":"2026-11-20","qty":10}]}',1),
('factionPayments','old-p','{"id":"old-p","factionServiceId":"old","deliveryId":"old-d","factionMasterId":"m1","factionName":"Cirlene","status":"Pendente","quantity":10,"unitPrice":2,"value":20,"scheduledPaymentDate":"2026-11-27"}',1),
('factionPayments','paid','{"id":"paid","factionMasterId":"m1","factionName":"Cirlene","status":"Pago","quantity":10,"unitPrice":2,"value":20,"paidAmount":20}',1),
('factionPayments','unlinked','{"id":"unlinked","manual":true,"manualGroupId":"av2","factionMasterId":"m1","factionName":"Cirlene","status":"Pendente","quantity":10,"unitPrice":2,"value":20,"scheduledPaymentDate":"2026-11-27"}',1);
