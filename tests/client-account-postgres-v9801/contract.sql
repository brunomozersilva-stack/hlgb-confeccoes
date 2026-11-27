-- Synthetic fixture acceptance; no live data.
set role ledger_lab_denied;
do $$begin
 begin perform ledger_lab.pay('a','denied',1,'2026-11-26','PIX',1,'[]',true); raise exception 'permission unexpectedly succeeded'; exception when insufficient_privilege then null; end;
end$$;
reset role;
set role ledger_lab_operator;
do $$
declare chosen jsonb:='[{"noteId":"n2","noteRevision":1,"titleRevision":1},{"noteId":"n1","noteRevision":1,"titleRevision":1}]'; result jsonb; replay jsonb;
begin
 begin perform ledger_lab.pay('a','fault',1,'2026-11-26','PIX',150000,chosen,false); raise exception 'failure expected'; exception when others then if sqlerrm<>'lab-injected-hub-failure' then raise; end if; end;
 if (select sum(paid) from ledger_lab.notes)<>0 or (select sum(paid) from ledger_lab.titles)<>0 or (select count(*) from ledger_lab.receipts)<>0 or (select count(*) from ledger_lab.hub)<>0 or (select revision from ledger_lab.accounts where client_id='a')<>1 then raise exception 'rollback failed'; end if;
 result:=ledger_lab.pay('a','receipt-1',1,'2026-11-26','PIX',150000,chosen,false);
 if result->'allocations'->0->>'noteId'<>'n1' or (result->>'allocatedCents')::bigint<>150000 or (select paid from ledger_lab.notes where id='n2')<>50000 or (select status from ledger_lab.notes where id='n1')<>'paid' or (select count(*) from ledger_lab.hub)<>1 or (select sum(amount) from ledger_lab.hub)<>150000 then raise exception 'allocation failed'; end if;
 replay:=ledger_lab.pay('a','receipt-1',1,'2026-11-26','PIX',150000,chosen,false);
 if replay is distinct from result or (select count(*) from ledger_lab.hub)<>1 then raise exception 'replay failed'; end if;
 begin perform ledger_lab.pay('a','receipt-1',1,'2026-11-26','PIX',150001,chosen,false); raise exception 'conflict expected'; exception when others then if sqlerrm<>'reference-conflict' then raise; end if; end;
 begin perform ledger_lab.pay('a','stale',1,'2026-11-26','PIX',1,'[]',true); raise exception 'revision expected'; exception when others then if sqlerrm<>'account-revision' then raise; end if; end;
 begin perform ledger_lab.pay('a','wrong-client',2,'2026-11-26','PIX',1,'[{"noteId":"n3","noteRevision":1,"titleRevision":1}]',true); raise exception 'identity expected'; exception when others then if sqlerrm<>'note-identity' then raise; end if; end;
 begin perform ledger_lab.pay('a','unreviewed',2,'2026-11-26','PIX',130001,'[{"noteId":"n2","noteRevision":2,"titleRevision":2}]',false); raise exception 'remainder expected'; exception when others then if sqlerrm<>'remainder-not-reviewed' then raise; end if; end;
 if (select paid from ledger_lab.notes where id='n2')<>50000 or (select revision from ledger_lab.accounts where client_id='a')<>2 then raise exception 'second rollback failed'; end if;
 result:=ledger_lab.pay('a','receipt-2',2,'2026-11-26','PIX',140000,'[{"noteId":"n2","noteRevision":2,"titleRevision":2}]',true);
 if (result->>'independentAfterCents')::bigint<>-10000 or (select paid from ledger_lab.titles where id='f2')<>80000 or (select sum(amount) from ledger_lab.hub)<>290000 or (select count(*) from ledger_lab.hub)<>2 then raise exception 'credit failed'; end if;
end$$;
reset role;
select 'PASS atomic receipt, rollback, idempotence, account credit, separate client and denied role' as result;
