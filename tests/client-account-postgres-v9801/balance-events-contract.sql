set role ledger_lab_denied;
do $$begin
 begin perform ledger_lab.balance_event('c','denied-opening','opening',0,100,'Saldo confirmado',true);raise exception 'permission unexpectedly succeeded';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role ledger_lab_operator;
do $$
declare a jsonb; b jsonb; count_hub bigint; count_receipts bigint;
begin
 select count(*) into count_hub from ledger_lab.hub;
 select count(*) into count_receipts from ledger_lab.receipts;
 begin perform ledger_lab.balance_event('c','opening-fault','opening',0,10000,'Saldo confirmado',true);raise exception 'failure expected';exception when others then if sqlerrm<>'lab-balance-event-failure' then raise;end if;end;
 if exists(select 1 from ledger_lab.accounts where client_id='c') then raise exception 'opening rollback failed';end if;
 a:=ledger_lab.balance_event('c','open-c','opening',0,100000,'Saldo anterior independente',true);
 b:=ledger_lab.balance_event('c','open-c','opening',0,100000,'Saldo anterior independente',true);
 if a is distinct from b or (a->>'afterCents')::bigint<>100000 then raise exception 'opening replay failed';end if;
 begin perform ledger_lab.balance_event('c','open-c','opening',0,200000,'Saldo anterior independente',true);raise exception 'conflict expected';exception when others then if sqlerrm<>'balance-reference-conflict' then raise;end if;end;
 begin perform ledger_lab.balance_event('c','open-again','opening',0,100000,'Saldo anterior independente',true);raise exception 'second opening expected';exception when others then if sqlerrm<>'already-open-or-revision' then raise;end if;end;
 a:=ledger_lab.balance_event('d','open-d','opening',0,-50000,'Crédito inicial independente',true);
 if (a->>'afterCents')::bigint<>-50000 then raise exception 'negative opening failed';end if;
 begin perform ledger_lab.balance_event('e','unreviewed','opening',0,100,'Saldo não conferido',false);raise exception 'proof expected';exception when others then if sqlerrm<>'balance-input' then raise;end if;end;
 begin perform ledger_lab.balance_event('a','legacy-adjust','adjustment',2,100,'Ajuste sem origem',true);raise exception 'legacy failure expected';exception when others then if sqlerrm not in ('opening-evidence-missing','account-revision') then raise;end if;end;
 begin perform ledger_lab.balance_event('c','adjustment-fault','adjustment',1,-10000,'Correção conferida',true);raise exception 'failure expected';exception when others then if sqlerrm<>'lab-balance-event-failure' then raise;end if;end;
 if (select independent_cents from ledger_lab.accounts where client_id='c')<>100000 or (select revision from ledger_lab.accounts where client_id='c')<>1 then raise exception 'adjustment rollback failed';end if;
 a:=ledger_lab.balance_event('c','adjust-c','adjustment',1,-25000,'Correção documentada',true);
 if (a->>'afterCents')::bigint<>75000 or (select revision from ledger_lab.accounts where client_id='c')<>2 then raise exception 'adjustment failed';end if;
 begin perform ledger_lab.balance_event('c','stale','adjustment',1,100,'Revisão desatualizada',true);raise exception 'revision expected';exception when others then if sqlerrm<>'account-revision' then raise;end if;end;
 if (select count(*) from ledger_lab.balance_events)<>3 or (select sum(delta) from ledger_lab.balance_events where client_id='c')<>75000 or (select count(*) from ledger_lab.hub)<>count_hub or (select count(*) from ledger_lab.receipts)<>count_receipts then raise exception 'noncash history failed';end if;
 begin delete from ledger_lab.balance_events where ref='open-c';raise exception 'delete unexpectedly succeeded';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS opening and adjustments: signed balance, reason, immutable events for lab operator, exact retry, rollback, no Hub movement';
