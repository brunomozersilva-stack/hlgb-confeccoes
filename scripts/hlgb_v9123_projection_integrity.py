from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker='<!-- HLGB v91.23 PROJECTION INTEGRITY -->'
if marker in s:
    print('v91.23 already applied')
    raise SystemExit(0)

# Every new finalized projection note stores the projection date on each item.
old='items:invoiceItems.map(x=>({orderId:x.ctx.o.id,itemKey:x.ctx.item.key,productName:x.ctx.item.name,productId:x.ctx.item.productId||null,qty:x.qty,unitPrice:x.unit,value:x.value})),'
new='items:invoiceItems.map(x=>({orderId:x.ctx.o.id,itemKey:x.ctx.item.key,productName:x.ctx.item.name,productId:x.ctx.item.productId||null,projectionDate:x.ctx.item.date||x.ctx.o.date||"",deliveredAt:issueDate,qty:x.qty,unitPrice:x.unit,value:x.value})),'
if old not in s:
    raise SystemExit('projection invoice item mapping target not found')
s=s.replace(old,new,1)

addon=r'''
<!-- HLGB v91.23 PROJECTION INTEGRITY -->
<script>
// v91.23 — projection invoices are the authoritative source for delivered/remaining.
// The repair is additive only: it never reduces a saved delivery and never clears notes.
(function(){
  if(typeof projectionItemsForOrder!=="function")return;
  const _v9123BaseProjectionItemsForOrder=projectionItemsForOrder;
  const V9123_BACKUP_KEY="hlgb_projection_safety_backup";

  function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}
  function invoiceId(v){return String(v==null?"":v)}
  function invoiceDate(inv){return String(inv?.issueDate||inv?.date||"").slice(0,10)}
  function financeForInvoice(id){return (db.finance||[]).find(f=>invoiceId(f.projectionInvoiceId)===invoiceId(id))||null}
  function itemMatches(orderId,item,inv,it){
    let oid=it?.orderId!=null?it.orderId:inv?.orderId;
    if(String(oid??"")!==String(orderId??""))return false;
    if(it?.itemKey!=null&&String(it.itemKey)!=="")return String(it.itemKey)===String(item?.key??"");
    if(item?.productId&&it?.productId)return +it.productId===+item.productId;
    return String(it?.productName||"").trim().toLowerCase()===String(item?.name||"").trim().toLowerCase();
  }
  function invoiceLinks(orderId,item){
    let out=[];
    (Array.isArray(db.projectionInvoices)?db.projectionInvoices:[]).forEach(inv=>{
      (Array.isArray(inv?.items)?inv.items:[]).forEach(it=>{
        if(itemMatches(orderId,item,inv,it))out.push({inv,it,qty:Math.max(0,+it.qty||0)});
      });
    });
    return out;
  }
  function currentProjectionStateScore(){
    let inv=(Array.isArray(db.projectionInvoices)?db.projectionInvoices:[]).length,h=0,refs=0;
    (db.orders||[]).forEach(o=>Object.values(o?.projectionItems||{}).forEach(x=>{
      h+=Array.isArray(x?.deliveryHistory)?x.deliveryHistory.length:0;
      refs+=Array.isArray(x?.invoiceIds)?x.invoiceIds.length:0;
    }));
    return inv*10000+h*10+refs;
  }
  function safetyBackup(){
    try{
      let payload={savedAt:new Date().toISOString(),score:currentProjectionStateScore(),projectionInvoices:clone(Array.isArray(db.projectionInvoices)?db.projectionInvoices:[]),orders:(db.orders||[]).map(o=>({id:o.id,orderNumber:o.orderNumber,client:o.client,clientId:o.clientId,date:o.date,projectionItems:clone(o.projectionItems||{}),projectionInvoiced:o.projectionInvoiced})),finance:clone((db.finance||[]).filter(f=>f?.projectionInvoiceId!=null))};
      let old=null;try{old=JSON.parse(localStorage.getItem(V9123_BACKUP_KEY)||"null")}catch(e){}
      if(!old||(+payload.score||0)>=(+old.score||0))localStorage.setItem(V9123_BACKUP_KEY,JSON.stringify(payload));
    }catch(e){console.warn("HLGB v91.23 backup da projeção",e)}
  }
  function referencedInvoiceIds(){
    let set=new Set();
    (db.finance||[]).forEach(f=>{if(f?.projectionInvoiceId!=null)set.add(invoiceId(f.projectionInvoiceId))});
    (db.orders||[]).forEach(o=>Object.values(o?.projectionItems||{}).forEach(x=>(x?.invoiceIds||[]).forEach(id=>set.add(invoiceId(id)))));
    return set;
  }
  function restoreFromSafetyBackup(){
    let old=null;try{old=JSON.parse(localStorage.getItem(V9123_BACKUP_KEY)||"null")}catch(e){}
    if(!old||!Array.isArray(old.projectionInvoices)||!old.projectionInvoices.length)return false;
    db.projectionInvoices=Array.isArray(db.projectionInvoices)?db.projectionInvoices:[];
    let existing=new Set(db.projectionInvoices.map(x=>invoiceId(x.id))),refs=referencedInvoiceIds(),changed=false;
    old.projectionInvoices.forEach(inv=>{
      let id=invoiceId(inv?.id);if(!id||existing.has(id)||!refs.has(id))return;
      db.projectionInvoices.push(clone(inv));existing.add(id);changed=true;
    });
    return changed;
  }
  function recoverMissingInvoicesFromOrders(){
    db.projectionInvoices=Array.isArray(db.projectionInvoices)?db.projectionInvoices:[];
    let existing=new Map(db.projectionInvoices.map(x=>[invoiceId(x.id),x])),groups=new Map();
    (db.orders||[]).forEach(o=>{
      let baseRows=_v9123BaseProjectionItemsForOrder(o)||[],byKey=new Map(baseRows.map(x=>[String(x.key),x]));
      Object.entries(o?.projectionItems||{}).forEach(([key,saved])=>{
        let row=byKey.get(String(key));if(!row)return;
        let ids=Array.isArray(saved?.invoiceIds)?saved.invoiceIds.map(invoiceId).filter(Boolean):[];
        let history=Array.isArray(saved?.deliveryHistory)?saved.deliveryHistory:[];
        let knownQty=0;
        ids.forEach(id=>{let inv=existing.get(id);if(inv)(inv.items||[]).forEach(it=>{if(itemMatches(o.id,row,inv,it))knownQty+=Math.max(0,+it.qty||0)})});
        let missing=ids.filter(id=>!existing.has(id));
        let remainingHistorical=Math.max(0,(+saved?.invoicedQty||0)-knownQty);
        missing.forEach((id,idx)=>{
          let hist=history.find(h=>invoiceId(h?.invoiceId)===id);
          let qty=Math.max(0,+hist?.qty||0);
          if(!qty&&missing.length===1)qty=remainingHistorical;
          if(!qty)return;
          if(!groups.has(id))groups.set(id,[]);
          let unit=(+row.qty||0)>0?(+row.value||0)/(+row.qty||0):0;
          groups.get(id).push({order:o,row,qty,unit,date:String(hist?.date||saved?.date||o.date||"").slice(0,10)});
        });
      });
    });
    let changed=false;
    groups.forEach((entries,id)=>{
      if(existing.has(id)||!entries.length)return;
      let fin=financeForInvoice(id),first=entries[0],issue=String(fin?.issueDate||entries.find(x=>x.date)?.date||isoDate(new Date())).slice(0,10),total=entries.reduce((a,x)=>a+x.qty*x.unit,0);
      let inv={id:isNaN(+id)?id:+id,client:fin?.clientName||first.order.client||"Cliente",clientId:fin?.clientId||first.order.clientId||null,sourceClient:first.order.client||"",items:entries.map(x=>({orderId:x.order.id,itemKey:x.row.key,productName:x.row.name,productId:x.row.productId||null,projectionDate:x.row.date||x.order.date||"",deliveredAt:issue,qty:x.qty,unitPrice:x.unit,value:x.qty*x.unit})),date:issue,issueDate:issue,dueDate:fin?.dueDate||fin?.date||issue,value:+fin?.value||total,terms:fin?.paymentTerms||"Recuperada",termsDetail:fin?.paymentTermsDetail||"",status:fin?.status||"Pendente",recovered:true};
      db.projectionInvoices.push(inv);existing.set(id,inv);changed=true;
    });
    return changed;
  }
  function repairProjectionBalances(){
    let changed=false;
    (db.orders||[]).forEach(o=>{
      let baseRows=_v9123BaseProjectionItemsForOrder(o)||[];
      o.projectionItems=(o.projectionItems&&typeof o.projectionItems==="object")?o.projectionItems:{};
      baseRows.forEach(row=>{
        let links=invoiceLinks(o.id,row);if(!links.length)return;
        let fromInvoices=Math.min(+row.qty||0,links.reduce((a,x)=>a+x.qty,0));
        let saved=o.projectionItems[row.key]||{},oldQty=Math.max(0,+saved.invoicedQty||0),newQty=Math.max(oldQty,fromInvoices);
        let ids=[...new Set([...(Array.isArray(saved.invoiceIds)?saved.invoiceIds:[]),...links.map(x=>x.inv.id)].map(invoiceId))];
        let hist=Array.isArray(saved.deliveryHistory)?saved.deliveryHistory.slice():[];
        links.forEach(x=>{let id=invoiceId(x.inv.id);if(!hist.some(h=>invoiceId(h?.invoiceId)===id))hist.push({invoiceId:x.inv.id,date:invoiceDate(x.inv),qty:x.qty})});
        if(newQty!==oldQty||ids.length!==(Array.isArray(saved.invoiceIds)?saved.invoiceIds.length:0)||hist.length!==(Array.isArray(saved.deliveryHistory)?saved.deliveryHistory.length:0)){
          o.projectionItems[row.key]={...saved,date:saved.date||row.date||"",invoicedQty:newQty,invoiced:newQty>=(+row.qty||0),invoiceIds:ids,deliveryHistory:hist};changed=true;
        }
      });
      let rows=_v9123BaseProjectionItemsForOrder(o)||[];
      let allDone=rows.length>0&&rows.every(r=>Math.max(+r.invoicedQty||0,invoiceLinks(o.id,r).reduce((a,x)=>a+x.qty,0))>=(+r.qty||0));
      if(allDone&&o.projectionInvoiced!==true){o.projectionInvoiced=true;changed=true}
    });
    return changed;
  }

  // Always derive the visible balance from finalized projection invoices as well as the nested order state.
  projectionItemsForOrder=function(o){
    let rows=_v9123BaseProjectionItemsForOrder(o)||[];
    return rows.map(row=>{
      let links=invoiceLinks(o?.id,row),fromInvoices=links.reduce((a,x)=>a+x.qty,0),stored=Math.max(0,+row.invoicedQty||0),done=Math.min(+row.qty||0,Math.max(stored,fromInvoices));
      return {...row,invoicedQty:done,remainingQty:Math.max(0,(+row.qty||0)-done),invoiced:done>=(+row.qty||0),invoiceIds:[...new Set([...(row.invoiceIds||[]),...links.map(x=>x.inv.id)])]};
    });
  };
  window.projectionItemsForOrder=projectionItemsForOrder;

  // Delivered is compared with the selected projection period. The emission date remains visible in the table.
  projectionDeliveredRows=function(startS="0000-01-01",endS="9999-12-31"){
    let out=[];
    (Array.isArray(db.projectionInvoices)?db.projectionInvoices:[]).forEach(inv=>{
      let issue=invoiceDate(inv);
      (Array.isArray(inv?.items)?inv.items:[]).forEach(it=>{
        let oid=it?.orderId!=null?it.orderId:inv?.orderId,o=(db.orders||[]).find(x=>String(x.id)===String(oid))||null;
        let row=o?(_v9123BaseProjectionItemsForOrder(o)||[]).find(r=>(it.itemKey!=null&&String(r.key)===String(it.itemKey))||(!it.itemKey&&it.productId&&+r.productId===+it.productId)):null;
        let periodDate=String(it.projectionDate||row?.date||o?.date||issue||"").slice(0,10);
        if(!periodDate||periodDate<startS||periodDate>endS)return;
        out.push({invoice:inv,order:o,item:it,date:issue||periodDate,projectionDate:periodDate,qty:+it.qty||0,value:+it.value||((+it.qty||0)*(+it.unitPrice||0))});
      });
    });
    return out;
  };
  window.projectionDeliveredRows=projectionDeliveredRows;

  function ensureIntegrity(){
    try{
      safetyBackup();
      let changed=restoreFromSafetyBackup();
      if(recoverMissingInvoicesFromOrders())changed=true;
      if(repairProjectionBalances())changed=true;
      if(changed){try{persistDb()}catch(e){console.warn("HLGB v91.23 persistência da reparação",e)}}
      safetyBackup();
      return changed;
    }catch(e){console.error("HLGB v91.23 integridade da projeção",e);return false}
  }
  window.hlgb923EnsureProjectionIntegrity=ensureIntegrity;

  const _v9123RenderProjection=renderProjection;
  renderProjection=function(){ensureIntegrity();return _v9123RenderProjection.apply(this,arguments)};
  window.renderProjection=renderProjection;
  setTimeout(()=>{try{ensureIntegrity()}catch(e){}},700);
})();
</script>
'''
if '</body>' not in s:
    raise SystemExit('body closing tag not found')
s=s.replace('</body>',addon+'\n</body>',1)

s=s.replace('v91.22 Multiusuário','v91.23 Multiusuário')
s=s.replace('Versão v91.22','Versão v91.23')
s=s.replace('>v91.22</small>','>v91.23</small>')

p.write_text(s,encoding='utf-8')
print('patched HLGB v91.23 projection integrity')
