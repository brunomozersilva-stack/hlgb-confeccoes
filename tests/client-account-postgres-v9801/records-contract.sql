set role records_lab_denied;
do $$begin
 begin perform records_lab.pay('c','denied','2026-11-26','Pix',1,'[]');raise exception 'permission expected';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role records_lab_operator;
do $$
declare chosen jsonb:='[{"noteId":"n1","titleId":"f1","noteRevision":3,"titleRevision":4},{"noteId":"n2","titleId":"f2","noteRevision":1,"titleRevision":1}]'; r jsonb; replay jsonb; before_rows jsonb;
begin
 select jsonb_agg(to_jsonb(x) order by module,entity_id) into before_rows from records_lab.hlgb_records x;
 begin perform records_lab.pay('c','fault','2026-11-26','Pix',9000,chosen);raise exception 'fault expected';exception when others then if sqlerrm<>'lab-hub-fault' then raise;end if;end;
 if before_rows is distinct from (select jsonb_agg(to_jsonb(x) order by module,entity_id) from records_lab.hlgb_records x) or exists(select 1 from records_lab.receipts) then raise exception 'rollback failed';end if;
 r:=records_lab.pay('c','ok','2026-11-26','Pix',9000,chosen);
 replay:=records_lab.pay('c','ok','2026-11-26','Pix',9000,chosen);
 if r is distinct from replay or (select count(*) from records_lab.receipts)<>1 or (select count(*) from records_lab.hlgb_records where module='hubFinanceEntries' and data->>'status'='Realizado')<>1 then raise exception 'replay failed';end if;
 if (select data->>'status' from records_lab.hlgb_records where module='projectionInvoices' and entity_id='n1')<>'Pago' or (select records_lab.cents(data->'remaining') from records_lab.hlgb_records where module='finance' and entity_id='f2')<>3000 or (select records_lab.cents(data->'value') from records_lab.hlgb_records where entity_id='prev2')<>3000 or (select data->>'status' from records_lab.hlgb_records where entity_id='prev1')<>'Encerrado' then raise exception 'allocation failed';end if;
 if (select data->'items' from records_lab.hlgb_records where entity_id='n1') is distinct from '[{"productId":"p","qty":50}]'::jsonb or (select data->'acertoNotesV9565' from records_lab.hlgb_records where entity_id='n1') is distinct from '[{"id":"keep","text":"preserve"}]'::jsonb or (select jsonb_array_length(data->'paymentHistory') from records_lab.hlgb_records where entity_id='n1')<>2 then raise exception 'history preservation failed';end if;
 begin perform records_lab.pay('c','ok','2026-11-26','Pix',9001,chosen);raise exception 'conflict expected';exception when others then if sqlerrm<>'reference-conflict' then raise;end if;end;
 begin perform records_lab.pay('c','stale','2026-11-26','Pix',1000,chosen);raise exception 'stale expected';exception when others then if sqlerrm<>'note-identity-status' then raise;end if;end;
 if (select count(*) from records_lab.receipts)<>1 then raise exception 'unexpected receipt';end if;
end$$;
reset role;
select 'PASS synthetic hlgb_records: revision save, note/title/forecast/Hub, rollback, exact replay, preservation and permission';
