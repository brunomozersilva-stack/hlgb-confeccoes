-- Laboratory only. Source record shape verified read-only in HLGB; no commercial deployment.
create table checklist_lab.source_records(module text not null,entity_id text not null,data jsonb not null,revision bigint not null,deleted_at timestamptz,primary key(module,entity_id));
alter table checklist_lab.source_records enable row level security;
grant select on checklist_lab.source_records to checklist_lab_operator;
create policy source_read on checklist_lab.source_records for select to checklist_lab_operator using(module in ('cuts','orders','products','materials') and deleted_at is null);
insert into checklist_lab.source_records values
('orders','o1','{"id":"o1","grade":[{"productId":"p1","color":"Preto","size":"P","qty":120},{"productId":"p1","color":"Branco","size":"M","qty":60},{"productId":"p1","color":"Rubi","size":"G","qty":120},{"productId":"p2","color":"Preto","size":"P","qty":20}]}',4,null),
('cuts','c1','{"id":"c1","orderId":"o1","productId":"p1","status":"Planejado","pieces":300,"actualCutGrade":[{"productId":"p1","color":"Preto","size":"P","qty":120},{"productId":"p1","color":"Branco","size":"M","qty":60},{"productId":"p1","color":"Rubi","size":"G","qty":120}]}',5,null),
('products','p1','{"id":"p1","materials":[{"materialId":"m1","name":"Papiro","qty":0.08,"unit":"m"},{"materialId":"m2","name":"Tule","qty":0,"unit":"m"},{"materialId":"m3","name":"Alpinia","qty":0.6,"unit":"m"}]}',7,null),
('materials','m1','{"id":"m1","name":"Papiro","unit":"m","purchaseUnit":"rolo","purchaseConversion":50}',8,null),
('materials','m2','{"id":"m2","name":"Tule","unit":"m"}',9,null),
('materials','m3','{"id":"m3","name":"Sanduiche 16","unit":"m","purchaseUnit":"rolo","purchaseConversion":100}',10,null);
-- Derive source evidence server-side, not from quantities claimed by browser.
-- This intentionally supports only explicit model-specific cuts, valid grade, and consumption/yield.
create function checklist_lab.record_source(p_cut text,p_order text,p_product text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c checklist_lab.source_records%rowtype;o checklist_lab.source_records%rowtype;p checklist_lab.source_records%rowtype; m checklist_lab.source_records%rowtype;
 grade jsonb; colors jsonb; row_material jsonb; row_color jsonb; line jsonb; lines jsonb:='[]'; refs jsonb; i integer:=0; q numeric; loss numeric; amount numeric; verified boolean; mode text; material_ref text;
begin
 select * into c from checklist_lab.source_records where module='cuts' and entity_id=p_cut and deleted_at is null;
 select * into o from checklist_lab.source_records where module='orders' and entity_id=p_order and deleted_at is null;
 select * into p from checklist_lab.source_records where module='products' and entity_id=p_product and deleted_at is null;
 if c.entity_id is null or o.entity_id is null or p.entity_id is null or c.data->>'id' is distinct from p_cut or o.data->>'id' is distinct from p_order or p.data->>'id' is distinct from p_product or c.data->>'orderId' is distinct from p_order or c.data->>'productId' is distinct from p_product or coalesce(c.data->>'status','')~*'cancel|desmembrado' or c.data->>'modelSplitParentV1'='true' or c.data->>'hiddenByModelSplitV1'='true' then raise exception 'source-identity';end if;
 if jsonb_typeof(o.data->'grade') is distinct from 'array' or not exists(select 1 from jsonb_array_elements(o.data->'grade') g where g->>'productId'=p_product) then raise exception 'order-grade';end if;
 grade:=case when jsonb_typeof(c.data->'actualCutGrade')='array' and jsonb_array_length(c.data->'actualCutGrade')>0 then c.data->'actualCutGrade' when jsonb_typeof(c.data->'originalGrade')='array' and jsonb_array_length(c.data->'originalGrade')>0 then c.data->'originalGrade' else (select jsonb_agg(g) from jsonb_array_elements(o.data->'grade') g where g->>'productId'=p_product) end;
 if grade is null or exists(select 1 from jsonb_array_elements(grade) g where (g->>'productId' is not null and g->>'productId'<>p_product) or (g->>'orderId' is not null and g->>'orderId'<>p_order) or coalesce(trim(g->>'color'),'')='' or coalesce(trim(g->>'size'),'')='' or coalesce(g->>'qty','') !~ '^[0-9]{1,9}$') or exists(select 1 from jsonb_array_elements(grade) g group by lower(trim(g->>'color')),lower(trim(g->>'size')) having count(*)>1) then raise exception 'invalid-grade';end if;
 select jsonb_agg(jsonb_build_object('color',color,'pieces',pieces) order by color) into colors from (select g->>'color' as color,sum((g->>'qty')::numeric) as pieces from jsonb_array_elements(grade) g group by g->>'color' having sum((g->>'qty')::numeric)>0) x;
 if colors is null or jsonb_typeof(p.data->'materials') is distinct from 'array' or jsonb_array_length(p.data->'materials')=0 then raise exception 'empty-source';end if;
 refs:=jsonb_build_object('cut',c.revision,'order',o.revision,'product',p.revision,'materials','{}'::jsonb);
 for row_material in select value from jsonb_array_elements(p.data->'materials') loop
  i:=i+1;material_ref:=row_material->>'materialId';
  select * into m from checklist_lab.source_records where module='materials' and entity_id=material_ref and deleted_at is null;
  if material_ref is not null then refs:=jsonb_set(refs,array['materials',material_ref],coalesce(to_jsonb(m.revision),'null'::jsonb),true);end if;
  verified:=material_ref is not null and m.entity_id is not null and m.data->>'id'=material_ref and lower(trim(m.data->>'name'))=lower(trim(row_material->>'name')) and lower(trim(m.data->>'unit'))=lower(trim(row_material->>'unit'));
  q:=null;loss:=null;mode:=coalesce(row_material->>'calcMode','consumption');
  if coalesce(row_material->>'qty','')~'^[0-9]{1,9}(\.[0-9]{1,6})?$' then q:=(row_material->>'qty')::numeric;end if;
  if coalesce(row_material->>'loss','0')~'^[0-9]{1,6}(\.[0-9]{1,6})?$' then loss:=coalesce(row_material->>'loss','0')::numeric;end if;
  for row_color in select value from jsonb_array_elements(colors) loop
   if coalesce(row_material->>'color','')<>'' and lower(trim(row_material->>'color'))<>lower(trim(row_color->>'color')) then continue;end if;
   amount:=case when verified is true and q>0 and loss is not null and mode in ('consumption','yield') then round((case when mode='yield' then (row_color->>'pieces')::numeric/q else (row_color->>'pieces')::numeric*q end)*(1+loss/100),6) else null end;
   line:=jsonb_build_object('key',jsonb_build_array(i,material_ref,row_color->>'color')::text,'materialId',material_ref,'name',row_material->>'name','color',row_color->>'color','pieces',row_color->'pieces','unit',row_material->>'unit','required',amount);
   lines:=lines||jsonb_build_array(line);
  end loop;
 end loop;
 return jsonb_build_object('cutId',p_cut,'orderId',p_order,'productId',p_product,'revisions',refs,'grade',grade,'lines',lines);
end$$;
revoke all on function checklist_lab.record_source(text,text,text) from public;
grant execute on function checklist_lab.record_source(text,text,text) to checklist_lab_operator;
