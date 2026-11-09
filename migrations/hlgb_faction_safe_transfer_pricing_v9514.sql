-- v95.14: transactional faction transfers and future/unpaid labor pricing.
-- SAFETY: all business writes happen in one PostgreSQL transaction via the existing
-- revision-checked hlgb_save_record function. No existing business data migrated.
-- SECURITY INVOKER: normal RLS applies. The explicit access checks fail closed.
CREATE OR REPLACE FUNCTION public.hlgb_faction_adjust_v9514(
  p_action text,
  p_faction_id text,
  p_expected_revision bigint,
  p_target_name text DEFAULT NULL,
  p_quantity numeric DEFAULT NULL,
  p_new_price numeric DEFAULT NULL,
  p_reason text DEFAULT '',
  p_request_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public','pg_temp'
AS $hlgb$
DECLARE
  v_src public.hlgb_records%ROWTYPE;
  v_dst public.hlgb_records%ROWTYPE;
  v_master public.hlgb_records%ROWTYPE;
  v_payment public.hlgb_records%ROWTYPE;
  v_written record;
  v_action text := lower(btrim(coalesce(p_action,'')));
  v_target text := btrim(coalesce(p_target_name,''));
  v_request text := lower(btrim(coalesce(p_request_id,'')));
  v_reason text := btrim(coalesce(p_reason,''));
  v_src_name text;
  v_now text := to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_event jsonb;
  v_src_data jsonb;
  v_dst_data jsonb;
  v_sent numeric;
  v_qty numeric;
  v_price numeric;
  v_prev_price numeric;
  v_discrepancy numeric;
  v_new_source_sent numeric;
  v_target_location text;
  v_target_id text;
  v_paid int := 0;
  v_updated int := 0;
  v_linked int := 0;
  v_match_count int := 0;
  v_payment_data jsonb;
  v_total numeric;
  v_pay_qty numeric;
  v_history jsonb;
  v_idem jsonb;
  v_target_result jsonb := NULL;
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.hlgb_pode_escrever_modulo('factions')
     OR NOT public.hlgb_pode_ler_modulo('factionPayments')
     OR NOT public.hlgb_pode_ler_modulo('materialChecklists')
     OR NOT public.hlgb_pode_ler_modulo('factionMasters') THEN
    RAISE EXCEPTION 'Sem permissão para ajustar facção ou consultar dependências' USING ERRCODE='42501';
  END IF;

  IF v_action NOT IN ('transfer','price') OR nullif(btrim(coalesce(p_faction_id,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Ação ou alocação inválida';
  END IF;
  IF v_request !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Identificador da operação inválido: atualize a página';
  END IF;
  IF char_length(v_reason)<4 OR char_length(v_reason)>280 THEN
    RAISE EXCEPTION 'Informe o motivo da alteração (de 4 a 280 caracteres)';
  END IF;

  SELECT * INTO v_src
  FROM public.hlgb_records
  WHERE module='factions' AND entity_id=p_faction_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Alocação não encontrada ou já excluída'; END IF;
  v_src_data := v_src.data;
  v_history := coalesce(v_src_data->'transferHistoryV9514','[]'::jsonb);
  IF jsonb_typeof(v_history)<>'array' THEN
    RAISE EXCEPTION 'Histórico de transferência inválido; operação bloqueada';
  END IF;

  IF v_action='price' THEN
    v_history := coalesce(v_src_data->'pricingHistoryV9514','[]'::jsonb);
    IF jsonb_typeof(v_history)<>'array' THEN
      RAISE EXCEPTION 'Histórico de preços inválido; operação bloqueada';
    END IF;
  END IF;
  SELECT e INTO v_idem FROM jsonb_array_elements(v_history) e
  WHERE e->>'requestId'=v_request LIMIT 1;
  IF v_idem IS NOT NULL THEN
    IF v_idem->>'action'<>v_action THEN
      RAISE EXCEPTION 'Identificador de operação reutilizado com outra ação';
    END IF;
    IF v_action='transfer' AND
       (coalesce(v_idem->>'to','')<>btrim(coalesce(p_target_name,''))
         OR (v_idem->>'quantity')::numeric IS DISTINCT FROM p_quantity) THEN
      RAISE EXCEPTION 'Esta tentativa já foi processada com outros valores. Reabra a alocação';
    END IF;
    IF v_action='price' AND
       (v_idem->>'newPrice')::numeric IS DISTINCT FROM p_new_price THEN
      RAISE EXCEPTION 'Esta alteração de preço já foi processada com outro valor. Reabra a alocação';
    END IF;
    RETURN jsonb_build_object('applied',true,'duplicate',true,'action',v_action,
      'sourceId',v_src.entity_id,'sourceRevision',v_src.revision,
      'targetId',coalesce(v_idem->>'targetId',''),
      'paidPreserved',coalesce((v_idem->>'paidPreserved')::int,0),
      'unpaidUpdated',coalesce((v_idem->>'unpaidUpdated')::int,0));
  END IF;

  IF p_expected_revision IS NULL OR v_src.revision<>p_expected_revision THEN
    RAISE EXCEPTION 'Alocação foi alterada em outra sessão. Atualize a tela antes de continuar';
  END IF;
  v_sent := coalesce(nullif(v_src_data->>'sent','')::numeric,0);
  v_prev_price := coalesce(nullif(v_src_data->>'price','')::numeric,0);
  v_src_name := coalesce(v_src_data->>'name','');
  IF v_sent<=0 OR v_sent<>trunc(v_sent) OR v_prev_price<0 THEN
    RAISE EXCEPTION 'Quantidade ou valor da alocação original é inconsistente; confira antes de alterar';
  END IF;

  IF v_action='transfer' THEN
    IF p_quantity IS NULL OR p_quantity<>trunc(p_quantity) OR p_quantity<=0 OR p_quantity>v_sent THEN
      RAISE EXCEPTION 'Quantidade de transferência inválida; deve ser de 1 até o saldo enviado';
    END IF;
    v_qty := p_quantity;
    IF v_target='' OR lower(v_target)=lower(btrim(v_src_name)) THEN
      RAISE EXCEPTION 'Escolha uma facção de destino diferente da original';
    END IF;

    SELECT count(*) INTO v_match_count
    FROM public.hlgb_records
    WHERE module='factionMasters' AND deleted_at IS NULL
      AND lower(btrim(coalesce(data->>'name','')))=lower(v_target)
      AND coalesce(data->>'active','true')<>'false';
    IF v_match_count<>1 THEN
      RAISE EXCEPTION 'Facção de destino não encontrada ou nome duplicado no cadastro';
    END IF;
    SELECT * INTO v_master FROM public.hlgb_records
    WHERE module='factionMasters' AND deleted_at IS NULL
      AND lower(btrim(coalesce(data->>'name','')))=lower(v_target)
      AND coalesce(data->>'active','true')<>'false'
    FOR SHARE;
    v_target := v_master.data->>'name';
    v_target_location := nullif(v_master.data->>'productionLocationId','');

    -- Do not reinterpret deliveries or historic payments as transferable stock.
    -- A past tombstone can still contain evidence of a paid delivery.
    IF coalesce(nullif(v_src_data->>'done','')::numeric,0)>0
       OR coalesce(nullif(v_src_data->>'returned','')::numeric,0)>0
       OR coalesce(nullif(v_src_data->>'defects','')::numeric,0)>0
       OR coalesce(nullif(v_src_data->>'waste','')::numeric,0)>0
       OR lower(coalesce(v_src_data->>'status','')) ~ 'finaliz|conclu|pago|entreg' THEN
      RAISE EXCEPTION 'Transferência protegida: há produção, retorno ou finalização. Revise manualmente as quantidades';
    END IF;
    SELECT count(*) INTO v_paid
    FROM public.hlgb_records r
    WHERE r.module='factionPayments'
      AND (r.data->>'factionServiceId')=p_faction_id;
    IF v_paid>0 THEN
      RAISE EXCEPTION 'Transferência bloqueada: existem pagamentos ou histórico financeiro vinculado. Não serão alterados';
    END IF;
    SELECT count(*) INTO v_linked
    FROM public.hlgb_records r
    WHERE r.module='materialChecklists' AND r.deleted_at IS NULL
      AND ((r.data->>'factionId')=p_faction_id
        OR ((r.data->>'orderId')=coalesce(v_src_data->>'orderId','')
          AND coalesce(v_src_data->>'orderId','')<>''
          AND (r.data->>'productId')=coalesce(v_src_data->>'productId','')
          AND lower(btrim(coalesce(r.data->>'destinationName','')))=lower(btrim(v_src_name))));
    IF v_linked>0 THEN
      RAISE EXCEPTION 'Há checklist de material vinculado à facção. Transfira os materiais com conferência antes de alterar';
    END IF;

    v_new_source_sent := v_sent-v_qty;
    v_target_id := CASE WHEN v_new_source_sent=0 THEN p_faction_id
                   ELSE (100000000000000::bigint + (('x'||substr(md5(v_request),1,12))::bit(48)::bigint))::text END;
    v_event := jsonb_build_object('requestId',v_request,'action','transfer',
      'at',v_now,'by',auth.uid()::text,'reason',v_reason,
      'from',v_src_name,'to',v_target,'quantity',v_qty,'priorSent',v_sent,
      'remaining',v_new_source_sent,'targetId',v_target_id);
    IF v_new_source_sent=0 THEN
      v_src_data := v_src_data||jsonb_build_object(
        'name',v_target,'transferHistoryV9514',v_history||jsonb_build_array(v_event),
        'updatedAt',v_now);
      IF v_target_location IS NOT NULL THEN
        v_src_data := v_src_data||jsonb_build_object('productionLocationId',v_target_location);
      END IF;
    ELSE
      v_src_data := v_src_data||jsonb_build_object(
        'sent',v_new_source_sent,'transferHistoryV9514',v_history||jsonb_build_array(v_event),
        'updatedAt',v_now);
      IF v_src_data ? 'payableTotal' THEN
        v_src_data := v_src_data||jsonb_build_object('payableTotal',round(v_new_source_sent*v_prev_price,2));
      END IF;
      v_dst_data := v_src.data||jsonb_build_object(
        'id',v_target_id,'name',v_target,'sent',v_qty,'done',0,
        'returned',0,'defects',0,'waste',0,'status','Enviado',
        'payableTotal',round(v_qty*v_prev_price,2),'sourceFactionIdV9514',p_faction_id,
        'transferRequestIdV9514',v_request,
        'transferHistoryV9514',jsonb_build_array(v_event),
        'sentAt',to_char(current_date,'YYYY-MM-DD'),'createdAt',v_now,'updatedAt',v_now);
      IF v_target_location IS NOT NULL THEN
        v_dst_data := v_dst_data||jsonb_build_object('productionLocationId',v_target_location);
      END IF;
      -- Numeric-string ID retains compatibility with legacy editFaction(123) buttons.
      -- Insert destination before adjusting source; any later failure rolls
      -- back the full statement and cannot leave duplicate quantities.
      SELECT * INTO v_written
      FROM public.hlgb_save_record('factions',v_target_id,v_dst_data,0,false);
      IF v_written.applied IS DISTINCT FROM TRUE
         OR v_written.revision<>1
         OR v_written.data->>'transferRequestIdV9514'<>v_request THEN
        RAISE EXCEPTION 'Nuvem não confirmou a nova alocação; transferência cancelada';
      END IF;
      v_target_result := jsonb_build_object('id',v_target_id,'revision',v_written.revision);
    END IF;
    SELECT * INTO v_written
    FROM public.hlgb_save_record('factions',p_faction_id,v_src_data,v_src.revision,false);
    IF v_written.applied IS DISTINCT FROM TRUE OR v_written.revision<>v_src.revision+1 THEN
      RAISE EXCEPTION 'Alocação de origem mudou durante a transferência; transação cancelada';
    END IF;
    RETURN jsonb_build_object('applied',true,'action','transfer','requestId',v_request,
      'sourceId',p_faction_id,'sourceRevision',v_written.revision,
      'targetId',v_target_id,'createdDestination',v_new_source_sent>0,
      'transferQty',v_qty,'remainingSource',v_new_source_sent,
      'originalSent',v_sent,'target',v_target_result,
      'productionLocationReviewRequired',true);
  END IF;

  -- Historic material checklists without their own price snapshot must
  -- not silently display a newly negotiated price for an old delivery.
  IF EXISTS (
    SELECT 1 FROM public.hlgb_records c
    WHERE c.module='materialChecklists' AND c.deleted_at IS NULL
      AND ((c.data->>'factionId')=p_faction_id
        OR ((c.data->>'orderId')=coalesce(v_src_data->>'orderId','')
          AND coalesce(v_src_data->>'orderId','')<>''
          AND (c.data->>'productId')=coalesce(v_src_data->>'productId','')
          AND lower(btrim(coalesce(c.data->>'destinationName','')))=lower(btrim(v_src_name))))
      AND coalesce(nullif(c.data->>'unitPrice','')::numeric,0)<=0
  ) THEN
    RAISE EXCEPTION 'Checklist antigo sem valor unitário próprio: ajuste de preço bloqueado para preservar valores históricos';
  END IF;

  -- New labor price: previous paid/part-paid payments are immutable.
  IF p_new_price IS NULL OR p_new_price<0 OR p_new_price>10000
      OR p_new_price<>round(p_new_price,2) THEN
    RAISE EXCEPTION 'Informe um valor final por peça entre R$ 0,00 e R$ 10.000,00 com até duas casas';
  END IF;
  v_price := p_new_price;
  IF v_price=v_prev_price THEN
    RAISE EXCEPTION 'O novo valor por peça é igual ao valor atual';
  END IF;
  IF NOT public.hlgb_pode_escrever_modulo('factionPayments') THEN
    RAISE EXCEPTION 'Sem permissão para conferir pagamentos de facção';
  END IF;

  -- Tombstoned historic payments must still count as paid evidence;
  -- deleting a payment record does not permit rewriting financial history.
  SELECT count(*) INTO v_paid
  FROM public.hlgb_records r
  WHERE r.module='factionPayments' AND r.deleted_at IS NOT NULL
    AND r.data->>'factionServiceId'=p_faction_id
    AND (lower(coalesce(r.data->>'status','')) IN ('pago','paga','paid','liquidado')
      OR coalesce(nullif(r.data->>'paidAmount','')::numeric,0)>0
      OR (jsonb_typeof(r.data->'paymentHistory')='array'
          AND jsonb_array_length(r.data->'paymentHistory')>0));

  -- Evaluate each payment under a row lock. Historic and paid rows are left
  -- unchanged, while safely unpaid rows get a proportional recalculation.
  FOR v_payment IN
    SELECT r.* FROM public.hlgb_records r
    WHERE r.module='factionPayments' AND r.data->>'factionServiceId'=p_faction_id
      AND r.deleted_at IS NULL
    ORDER BY entity_id FOR UPDATE
  LOOP
    IF lower(coalesce(v_payment.data->>'status','')) IN ('pago','paga','paid','liquidado')
       OR coalesce(nullif(v_payment.data->>'paidAmount','')::numeric,0)>0
       OR (jsonb_typeof(v_payment.data->'paymentHistory')='array'
           AND jsonb_array_length(v_payment.data->'paymentHistory')>0) THEN
      v_paid := v_paid+1;CONTINUE;
    END IF;
    IF coalesce(v_payment.data->>'status','') NOT IN ('Pendente','Em aberto','Agendado')
       OR coalesce(nullif(v_payment.data->>'discountAmount','')::numeric,0)<>0
       OR coalesce(nullif(v_payment.data->>'travetaDiscount','')::numeric,0)<>0
       OR coalesce(nullif(v_payment.data->>'travetaUnitValue','')::numeric,0)<>0
    THEN
      RAISE EXCEPTION 'Pagamento pendente com desconto ou estado especial: ajuste bloqueado para conferência';
    END IF;
    v_pay_qty:=coalesce(nullif(v_payment.data->>'quantity','')::numeric,0);
    IF v_pay_qty<=0 THEN RAISE EXCEPTION 'Pagamento sem quantidade válida; ajuste bloqueado'; END IF;
    v_payment_data:=v_payment.data||jsonb_build_object(
      'unitPrice',v_price,'value',round(v_pay_qty*v_price,2),
      'pricingSourceV9514',v_request,'updatedAt',v_now);
    SELECT * INTO v_written FROM public.hlgb_save_record(
      'factionPayments',v_payment.entity_id,v_payment_data,v_payment.revision,false);
    IF v_written.applied IS DISTINCT FROM TRUE OR v_written.revision<>v_payment.revision+1 THEN
      RAISE EXCEPTION 'Pagamento foi alterado em outra sessão; ajuste cancelado sem alterações';
    END IF;
    v_updated:=v_updated+1;
  END LOOP;
  v_event:=jsonb_build_object('requestId',v_request,'action','price',
    'at',v_now,'by',auth.uid()::text,'reason',v_reason,
    'oldPrice',v_prev_price,'newPrice',v_price,
    'paidPreserved',v_paid,'unpaidUpdated',v_updated);
  v_src_data:=v_src_data||jsonb_build_object(
    'price',v_price,'payableUnitPrice',v_price,'baseUnitPrice',
       v_price+CASE WHEN coalesce(v_src_data->>'doesTraveta','false')='false'
             THEN coalesce(nullif(v_src_data->>'travetaDeductionUnit','')::numeric,0)
             ELSE 0 END,
    'pricingHistoryV9514',v_history||jsonb_build_array(v_event),
    'updatedAt',v_now);
  -- Do not overwrite the global "payableTotal" when there are historic paid
  -- entries; the per-payment snapshot remains the financial authority.
  IF v_paid=0 THEN
    v_src_data:=v_src_data||jsonb_build_object('payableTotal',round(v_sent*v_price,2));
  END IF;
  SELECT * INTO v_written FROM public.hlgb_save_record(
    'factions',p_faction_id,v_src_data,v_src.revision,false);
  IF v_written.applied IS DISTINCT FROM TRUE OR v_written.revision<>v_src.revision+1 THEN
    RAISE EXCEPTION 'Alocação foi alterada por outra sessão; ajuste cancelado sem alterar pagamentos';
  END IF;
  RETURN jsonb_build_object('applied',true,'action','price','requestId',v_request,
    'sourceId',p_faction_id,'sourceRevision',v_written.revision,
    'oldPrice',v_prev_price,'newPrice',v_price,
    'paidPreserved',v_paid,'unpaidUpdated',v_updated);
END;
$hlgb$;

REVOKE ALL ON FUNCTION public.hlgb_faction_adjust_v9514(
 text,text,bigint,text,numeric,numeric,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hlgb_faction_adjust_v9514(
 text,text,bigint,text,numeric,numeric,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.hlgb_faction_adjust_v9514(
 text,text,bigint,text,numeric,numeric,text,text) TO authenticated;
