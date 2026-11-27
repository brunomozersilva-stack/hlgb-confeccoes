-- ISOLATED SYNTHETIC POSTGRES ONLY. No production migration.
create table ledger_lab.clients(client_id text primary key);
insert into ledger_lab.clients values ('a'),('b'),('c'),('d'),('e');
create table ledger_lab.balance_events(
 ref text primary key,client_id text not null references ledger_lab.accounts,
 kind text not null check(kind in ('opening','adjustment')),
 delta bigint not null, before_cents bigint not null,after_cents bigint not null,
 revision_before bigint not null,revision_after bigint not null,
 reason text not null,request jsonb not null,result jsonb not null,
 recorded_at timestamptz not null default clock_timestamp(),recorded_by text not null,
 check(after_cents=before_cents+delta),check(revision_after=revision_before+1),
 check(kind<>'opening' or (revision_before=0 and before_cents=0))
);
create unique index one_opening on ledger_lab.balance_events(client_id) where kind='opening';
grant select on ledger_lab.clients to ledger_lab_operator;
grant insert on ledger_lab.accounts to ledger_lab_operator;
grant select,insert on ledger_lab.balance_events to ledger_lab_operator;
create function ledger_lab.fail_balance_event() returns trigger language plpgsql set search_path='' as $$begin if new.ref='opening-fault' or new.ref='adjustment-fault' then raise exception 'lab-balance-event-failure'; end if; return new; end$$;
create trigger fail_balance_event before insert on ledger_lab.balance_events for each row execute function ledger_lab.fail_balance_event();
-- Opening and correction are noncash events, not note emissions or receipts.
-- Lab role grants are not production permission/RLS design.
create function ledger_lab.balance_event(p_client text,p_ref text,p_kind text,p_revision bigint,p_delta bigint,p_reason text,p_independent boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a ledger_lab.accounts%rowtype; old_event ledger_lab.balance_events%rowtype;
 req jsonb; ans jsonb; before_amount bigint; after_amount bigint;
begin
 if p_client is null or length(trim(p_client)) not between 1 and 128 or p_ref is null or length(trim(p_ref)) not between 1 and 128 or p_kind is null or p_kind not in ('opening','adjustment') or p_revision is null or p_revision<0 or p_delta is null or p_delta not between -1000000000000 and 1000000000000 or (p_kind='adjustment' and p_delta=0) or p_reason is null or length(trim(p_reason)) not between 5 and 500 or p_independent is distinct from true then raise exception 'balance-input'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ledger-lab-balance-ref:'||p_ref,0));
 req:=jsonb_build_object('client',p_client,'kind',p_kind,'revision',p_revision,'delta',p_delta,'reason',p_reason,'independent',p_independent);
 select * into old_event from ledger_lab.balance_events x where x.ref=p_ref;
 if found then if old_event.request is distinct from req then raise exception 'balance-reference-conflict'; end if; return old_event.result; end if;
 -- Opening has no account row yet; coordinate competing openings by client.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ledger-lab-account:'||p_client,0));
 if not exists(select 1 from ledger_lab.clients x where x.client_id=p_client) then raise exception 'unknown-client'; end if;
 select * into a from ledger_lab.accounts x where x.client_id=p_client for update;
 if p_kind='opening' then
  if found or p_revision<>0 then raise exception 'already-open-or-revision'; end if;
  before_amount:=0;after_amount:=p_delta;
  insert into ledger_lab.accounts values(p_client,1,after_amount);
 else
  if not found or a.revision<>p_revision then raise exception 'account-revision'; end if;
  if not exists(select 1 from ledger_lab.balance_events x where x.client_id=p_client and x.kind='opening') then raise exception 'opening-evidence-missing'; end if;
  before_amount:=a.independent_cents;after_amount:=before_amount+p_delta;
  if after_amount not between -1000000000000 and 1000000000000 then raise exception 'balance-limit'; end if;
  update ledger_lab.accounts set independent_cents=after_amount,revision=a.revision+1 where client_id=p_client;
 end if;
 ans:=jsonb_build_object('reference',p_ref,'clientId',p_client,'kind',p_kind,'deltaCents',p_delta,'beforeCents',before_amount,'afterCents',after_amount,'accountRevision',p_revision+1,'cashMovementCents',0);
 insert into ledger_lab.balance_events(ref,client_id,kind,delta,before_cents,after_cents,revision_before,revision_after,reason,request,result,recorded_by)
 values(p_ref,p_client,p_kind,p_delta,before_amount,after_amount,p_revision,p_revision+1,p_reason,req,ans,current_user);
 return ans;
end $$;
revoke all on function ledger_lab.balance_event(text,text,text,bigint,bigint,text,boolean) from public;
grant execute on function ledger_lab.balance_event(text,text,text,bigint,bigint,text,boolean) to ledger_lab_operator;
