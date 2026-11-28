-- Isolated synthetic schema. Never deploy to commercial database.
create role fa_lab_operator nologin;
create role fa_lab_denied nologin;
create schema fa_lab;
revoke all on schema fa_lab from public;
grant usage on schema fa_lab to fa_lab_operator,fa_lab_denied;
create table fa_lab.records(module text not null,id text not null,data jsonb not null,revision bigint not null check(revision>0),deleted boolean not null default false,primary key(module,id));
create table fa_lab.events(ref text primary key,payment_id text not null,request jsonb not null,result jsonb not null,actor text not null,recorded_at timestamptz not null default clock_timestamp());
grant select on fa_lab.records to fa_lab_operator;
-- Lab only: table-level UPDATE also permits the explicit table lock.
grant update on fa_lab.records to fa_lab_operator;
grant select,insert on fa_lab.events to fa_lab_operator;
-- Failure after updating the payment must roll back both changes.
create function fa_lab.fail_event() returns trigger language plpgsql set search_path='' as $body$begin if new.ref='fault' then raise exception 'fixture-event-fault';end if;return new;end$body$;
create trigger fail_event before insert on fa_lab.events for each row execute function fa_lab.fail_event();
insert into fa_lab.records(module,id,data,revision) values
('factions','s1','{"id":"s1","done":100,"sent":120,"deliveryHistory":[{"id":"d1","date":"2026-11-25","qty":100}]}',2),
('factionPayments','p1','{"id":"p1","factionServiceId":"s1","deliveryId":"d1","factionMasterId":"m1","factionName":"Cirlene","noteQueueId":"n1","description":"Camisola Juliana","status":"Pendente","quantity":100,"unitPrice":2,"value":200,"paidAmount":0,"discountAmount":0,"paymentHistory":[]}',3),
('factions','s2','{"id":"s2","done":50,"sent":50,"deliveryHistory":[{"id":"d2","date":"2026-11-26","qty":50}]}',1),
('factionPayments','p2','{"id":"p2","factionServiceId":"s2","deliveryId":"d2","factionMasterId":"m1","factionName":"Cirlene","status":"Pendente","quantity":50,"unitPrice":2,"value":100,"paidAmount":0,"discountAmount":0,"paymentHistory":[]}',1),
('factionMasters','m1','{"id":"m1","name":"Cirlene","active":true}',1),
('projectionInvoices','n1','{"id":"n1","value":500,"items":[{"quantity":100}]}',1);
