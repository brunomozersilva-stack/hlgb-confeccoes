set role records_lab_denied;
do $$begin
 begin perform records_lab.read_item_receipt('c','ret-n','concurrent-item');raise exception 'expected denied';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role records_lab_operator;
do $$declare a jsonb;begin
 a:=records_lab.read_item_receipt('c','ret-n','concurrent-item');
 if a is null or a->>'currentMatch'<>'true' or a->'receipt'->>'remainingCents'<>'11000' then raise exception 'latest receipt';end if;
 a:=records_lab.read_item_receipt('c','ret-n','undo3');
 if a is null or a->>'currentMatch'<>'false' or a->'event'->>'reversalReference9849'<>'undo3' then raise exception 'historical reversal';end if;
 if records_lab.read_item_receipt('other','ret-n','concurrent-item') is not null or records_lab.read_item_receipt('c','ret-other','concurrent-item') is not null or records_lab.read_item_receipt('c','ret-n','missing') is not null then raise exception 'receipt identity';end if;
end$$;
reset role;
select 'PASS independent exact receipt, historical revision and denied identity';
