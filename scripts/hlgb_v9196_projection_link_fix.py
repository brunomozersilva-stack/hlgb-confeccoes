from pathlib import Path
import re, subprocess, tempfile
p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9196_PROJECTION_LINK_START -->'; END='<!-- HLGB_V9196_PROJECTION_LINK_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]
block=r'''<!-- HLGB_V9196_PROJECTION_LINK_START -->
<script id="hlgb-v9196-projection-link">
(function(){
'use strict';
// O pedido real da cliente herda apenas o progresso de nota do lote que o abasteceu.
// O lote interno continua como histórico de produção, mas não aparece como uma segunda demanda na Projeção.
const baseProjectionItems9196Link=window.projectionItemsForOrder;
if(typeof baseProjectionItems9196Link==='function'){
  window.projectionItemsForOrder=function(o){
    const rows=baseProjectionItems9196Link(o)||[];
    const sourceId=String(o?.noteSourceOrderId??'');
    if(!sourceId)return rows;
    const src=(db.orders||[]).find(x=>String(x.id)===sourceId); if(!src)return rows;
    return rows.map(item=>{
      const saved=src?.projectionItems?.[String(item.key)]||src?.projectionItems?.[String(item.productId)]||null;
      if(!saved)return item;
      const qty=Math.max(0,+item.qty||0);
      const invoicedQty=Math.min(qty,Math.max(+item.invoicedQty||0,+saved.invoicedQty||0));
      const invoiceIds=[...new Set([...(Array.isArray(item.invoiceIds)?item.invoiceIds:[]),...(Array.isArray(saved.invoiceIds)?saved.invoiceIds:[])].map(String))];
      return {...item,date:item.date||saved.date||'',invoiceIds,invoicedQty,remainingQty:Math.max(0,qty-invoicedQty),invoiced:qty>0&&invoicedQty>=qty};
    });
  };
}
function sourceProductLinked9196(sourceOrder,item){
  const sid=String(sourceOrder?.id??''),pid=String(item?.productId??item?.key??'');
  if(!sid||!pid)return false;
  return (db.orders||[]).some(customer=>{
    if(String(customer?.noteSourceOrderId??'')!==sid)return false;
    const meta=customer?.fulfillmentByProduct?.[pid];
    return meta?.completed===true&&String(meta?.sourceOrderId??sid)===sid;
  });
}
window.allProjectionRows=function(){
  const rows=[];
  (db.orders||[]).forEach(o=>{
    if(String(o?.status||'').toLowerCase()==='cancelado')return;
    (projectionItemsForOrder(o)||[]).forEach(item=>{
      if(sourceProductLinked9196(o,item))return;
      rows.push({order:o,item});
    });
  });
  return rows;
};
})();
</script>
<!-- HLGB_V9196_PROJECTION_LINK_END -->'''
i=s.rfind('</body>')
if i<0: raise SystemExit('body final não encontrado')
s=s[:i]+block+'\n'+s[i:]
assert 'HLGB_V9196_START' in s and START in s
assert 'window.allProjectionRows=function' in s
assert 'noteSourceOrderId' in s
assert len(s)>1_000_000
scripts=re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',s,re.I)
with tempfile.TemporaryDirectory() as td:
  for i,js in enumerate(scripts):
    f=Path(td)/f's{i}.js'; f.write_text(js,encoding='utf-8')
    r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
    if r.returncode: raise SystemExit(f'JS inválido no bloco {i}: {r.stderr}')
p.write_text(s,encoding='utf-8')
print('v91.96 projeção vinculada:',len(s),'bytes;',len(scripts),'scripts válidos')
