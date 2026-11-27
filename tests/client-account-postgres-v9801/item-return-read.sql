-- Laboratory-only independent receipt reader. Not an RPC deployed to HLGB.
create function records_lab.read_item_receipt(p_client text,p_note text,p_ref text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r records_lab.item_return_receipts%rowtype; n records_lab.hlgb_records%rowtype; t records_lab.hlgb_records%rowtype; h records_lab.hlgb_records%rowtype; ev jsonb; event_id text; is_reverse boolean; current_match boolean;
begin
 if current_user<>'records_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 select * into r from records_lab.item_return_receipts where ref=p_ref;
 if not found or r.result->>'noteId' is distinct from p_note then return null;end if;
 is_reverse:=r.result ? 'reversedEvent';
 if (case when is_reverse then r.request->>1 else r.request->>0 end) is distinct from p_client then return null;end if;
 select * into n from records_lab.hlgb_records where module='projectionInvoices' and entity_id=p_note and deleted_at is null;
 select * into t from records_lab.hlgb_records where module='finance' and entity_id=r.result->>'titleId' and deleted_at is null;
 select * into h from records_lab.hlgb_records where module='hubFinanceEntries' and entity_id=r.result->>'forecastId' and deleted_at is null;
 if n.entity_id is null or t.entity_id is null or h.entity_id is null or n.data->>'clientId' is distinct from p_client or t.data->>'clientId' is distinct from p_client or h.data->>'clientId' is distinct from p_client or t.data->>'projectionInvoiceId' is distinct from p_note or h.data->>'projectionInvoiceId' is distinct from p_note or h.data->>'sourceId' is distinct from t.entity_id then return null;end if;
 event_id:=case when is_reverse then r.result->>'reversedEvent' else 'item-return:'||p_ref end;
 select value into ev from jsonb_array_elements(coalesce(n.data->'acertoReturnsV9565','[]')) where value->>'id'=event_id;
 if ev is null or ev->'itemsV9847' is distinct from r.result->'items' or records_lab.cents(ev->'value')<>(r.result->>'amountCents')::bigint or (is_reverse and ev->>'reversalReference9849' is distinct from p_ref) then return null;end if;
 current_match:=n.revision=(r.result->>'noteRevision')::bigint and t.revision=(r.result->>'titleRevision')::bigint and h.revision=(r.result->>'forecastRevision')::bigint and records_lab.cents(n.data->'remaining')=(r.result->>'remainingCents')::bigint and records_lab.cents(t.data->'remaining')=(r.result->>'remainingCents')::bigint and records_lab.cents(h.data->'value')=(r.result->>'remainingCents')::bigint and records_lab.cents(n.data->'paid')=(r.result->>'cashCents')::bigint and records_lab.cents(t.data->'paid')=(r.result->>'cashCents')::bigint;
 return jsonb_build_object('receipt',r.result,'clientId',p_client,'event',ev,'currentMatch',current_match,'currentRevisions',jsonb_build_array(n.revision,t.revision,h.revision));
end$$;
revoke all on function records_lab.read_item_receipt(text,text,text) from public;
grant execute on function records_lab.read_item_receipt(text,text,text) to records_lab_operator;
