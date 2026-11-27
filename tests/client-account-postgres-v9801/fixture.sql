-- ISOLATED SYNTHETIC POSTGRES ONLY; NOT A MIGRATION.
create role ledger_lab_operator nologin;
create role ledger_lab_denied nologin;
create schema ledger_lab;
revoke all on schema ledger_lab from public;
grant usage on schema ledger_lab to ledger_lab_operator,ledger_lab_denied;
create table ledger_lab.accounts(client_id text primary key, revision bigint not null check(revision>=1), independent_cents bigint not null check(abs(independent_cents)<=1000000000000));
create table ledger_lab.notes(id text primary key,client_id text not null references ledger_lab.accounts, issued date not null, revision bigint not null check(revision>=1), total bigint not null check(total>0), paid bigint not null check(paid>=0), credit bigint not null check(credit>=0), status text not null check(status in ('open','partial','paid','cancelled')), check(paid+credit<=total));
create table ledger_lab.titles(id text primary key,note_id text not null unique references ledger_lab.notes,client_id text not null references ledger_lab.accounts,revision bigint not null check(revision>=1),total bigint not null,paid bigint not null,credit bigint not null,status text not null check(status in ('open','partial','paid','cancelled')),check(total>0 and paid>=0 and credit>=0 and paid+credit<=total));
create table ledger_lab.receipts(ref text primary key,client_id text not null references ledger_lab.accounts,request jsonb not null,result jsonb not null,recorded_at timestamptz not null default clock_timestamp(),recorded_by text not null default session_user);
create table ledger_lab.hub(ref text primary key references ledger_lab.receipts,client_id text not null references ledger_lab.accounts,day date not null,amount bigint not null check(amount>0));
grant select,update on ledger_lab.accounts,ledger_lab.notes,ledger_lab.titles to ledger_lab_operator;
grant select,insert on ledger_lab.receipts,ledger_lab.hub to ledger_lab_operator;
insert into ledger_lab.accounts values ('a',1,100000),('b',1,-50000);
insert into ledger_lab.notes values ('n1','a','2026-11-01',1,100000,0,0,'open'),('n2','a','2026-11-02',1,80000,0,0,'open'),('n3','b','2026-11-03',1,50000,0,0,'open');
insert into ledger_lab.titles values ('f1','n1','a',1,100000,0,0,'open'),('f2','n2','a',1,80000,0,0,'open'),('f3','n3','b',1,50000,0,0,'open');
-- A planned inflow is keyed to the exact title, never a name or matching amount.
create table ledger_lab.forecast(title_id text primary key references ledger_lab.titles,client_id text not null references ledger_lab.accounts,revision bigint not null check(revision>=1),remaining bigint not null check(remaining>=0),status text not null check(status in ('open','closed')),check((remaining=0)=(status='closed')));
grant select,update on ledger_lab.forecast to ledger_lab_operator;
insert into ledger_lab.forecast values ('f1','a',1,100000,'open'),('f2','a',1,80000,'open'),('f3','b',1,50000,'open');
-- Fault injection in lab, only: failure at the last Hub write proves rollback.
create function ledger_lab.inject_fault() returns trigger language plpgsql set search_path='' as $$begin if new.ref='fault' then raise exception 'lab-injected-hub-failure'; end if; return new; end$$;
create trigger fault_on_hub before insert on ledger_lab.hub for each row execute function ledger_lab.inject_fault();
