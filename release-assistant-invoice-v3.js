/* HLGB — Assistente: nota de cliente sem duplicar produtos */
(function(){
'use strict';
const V='2026.10.01-assistant-invoice-v3';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function tokens(name){
 const generic=new Set(['camisola','camisolas','camisa','camisas','body','bodies','calcinha','calcinhas','conjunto','conjuntos','short','doll','shortdoll','sutia','sutiã','top']);
 return norm(name).split(/\s+/).filter(t=>t.length>=3&&!generic.has(t));
}
function clientFromText(text){
 const n=norm(text),clients=arr('clients').filter(c=>c?.name);
 const exact=clients.filter(c=>n.includes(norm(c.name))).sort((a,b)=>String(b.name||'').length-String(a.name||'').length)[0];if(exact)return exact;
 const ws=n.split(/\s+/).filter(x=>x.length>=3);
 function dist(a,b){a=norm(a);b=norm(b);const dp=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=0;j<=b.length;j++)dp[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return dp[a.length][b.length]}
 let best=null,score=99;
 for(const c of clients){const name=norm(c.name),parts=name.split(/\s+/).filter(Boolean);for(const w of ws)for(const p of parts){const d=dist(w,p);if(d<score&&(d<=1||(p.length>=4&&w.slice(0,3)===p.slice(0,3)&&d<=2))){score=d;best=c}}}
 return best;
}
function clientMatches(assigned,name){
 const t=norm(name);if(!t)return false;
 return String(assigned||'').split('/').map(x=>norm(x)).filter(Boolean).includes(t)||norm(assigned)===t;
}
function currentClient(o,item){
 try{if(typeof projectionCurrentClient9237==='function')return projectionCurrentClient9237(o,item)}catch(e){}
 return item?.clientName||o?.client||'';
}
function unitFor(clientId,item){
 let u=0;try{if(item?.productId&&clientId&&typeof suggestedPrice==='function')u=+suggestedPrice(clientId,item.productId)||0}catch(e){}
 if(!u)u=q(item?.qty)>0?q(item?.value)/q(item.qty):0;return u;
}
function rowsForClient(client){
 const out=[];if(!client||typeof allProjectionRows!=='function')return out;
 for(const row of allProjectionRows()){
  const o=row?.order,item=row?.item;if(!o||!item)continue;
  const available=typeof projectionDeliverableQty==='function'?q(projectionDeliverableQty(o,item)):q(item.remainingQty??item.qty);
  if(available<=0||!clientMatches(currentClient(o,item),client.name))continue;
  const p=arr('products').find(x=>sid(x.id)===sid(item.productId));
  out.push({order:o,item,key:sid(o.id)+'::'+sid(item.key),productId:sid(item.productId||''),product:item.name||p?.name||'Produto',available,unit:unitFor(client.id,item)});
 }
 return out;
}
function qtyBeforeToken(raw,productName){
 const n=norm(raw),tt=tokens(productName);let pos=-1;
 for(const t of tt){const i=n.indexOf(t);if(i>=0&&(pos<0||i<pos))pos=i}
 if(pos<0)return 0;
 const before=n.slice(Math.max(0,pos-70),pos),nums=[...before.matchAll(/(\d{1,7})/g)];
 return nums.length?q(nums[nums.length-1][1]):0;
}
function requestedProducts(raw){
 const n=norm(raw),out=[];
 for(const p of arr('products')){
  const name=p?.name||'',tt=tokens(name);
  if(!name||!tt.some(t=>n.includes(t)))continue;
  const qty=qtyBeforeToken(raw,name);if(qty>0)out.push({productId:sid(p.id),product:name,qty});
 }
 const seen=new Set();return out.filter(x=>{const k=x.productId||norm(x.product);if(seen.has(k))return false;seen.add(k);return true});
}
function allocate(raw,client){
 const rows=rowsForClient(client),reqs=requestedProducts(raw),groups=new Map(),items=[],summary=[],warnings=[];
 for(const r of rows){const k=r.productId||norm(r.product);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}
 for(const list of groups.values())list.sort((a,b)=>String(a.item?.date||a.order?.date||'').localeCompare(String(b.item?.date||b.order?.date||''))||String(a.key).localeCompare(String(b.key)));
 for(const req of reqs){
  let list=groups.get(req.productId)||[];
  if(!list.length){
   list=[...groups.values()].find(ls=>ls.some(r=>tokens(r.product).some(t=>tokens(req.product).includes(t))))||[];
  }
  const available=list.reduce((a,r)=>a+q(r.available),0);
  if(!list.length){warnings.push('⚠️ '+req.product+': não encontrei saldo disponível para este cliente.');summary.push({...req,available:0,allocated:0,unit:0});continue}
  let left=req.qty;
  for(const r of list){if(left<=0)break;const take=Math.min(left,q(r.available));if(take>0){items.push({...r,qty:take});left-=take}}
  const allocated=req.qty-left,unit=list[0]?.unit||0;
  summary.push({...req,available,allocated,unit});
  if(left>0)warnings.push('⚠️ '+req.product+': pediu '+req.qty+' e há somente '+available+' disponíveis.');
 }
 return {items,summary,warnings};
}
function parse(raw){
 const s=String(raw||'').trim();
 if(!/(nota|fatura)/i.test(s)||!/(fazer|faça|faca|criar|emitir|gerar|preciso|quero)/i.test(s))return null;
 const client=clientFromText(s);if(!client)return {kind:'invoice-client-missing',title:'Cliente da nota',text:'Diga o nome do cliente junto com os produtos e quantidades.'};
 const out=allocate(s,client);
 if(!out.summary.length)return {kind:'invoice-empty',title:'Produtos não reconhecidos',text:'Não consegui identificar com segurança os produtos e quantidades. Fale, por exemplo: <b>330 Camisola Liliane, 264 Body Ritinha e 93 Calcinha Ariana para Bianca</b>.'};
 const totalQty=out.items.reduce((a,x)=>a+x.qty,0),total=out.items.reduce((a,x)=>a+x.qty*x.unit,0);
 return {kind:'invoice-action',title:'Nota para '+client.name,clientId:sid(client.id),clientName:client.name,items:out.items,summary:out.summary,totalQty,total,warnings:out.warnings,
 text:'Separei cada produto <b>uma única vez</b> e distribuí a quantidade pelos saldos disponíveis sem duplicar a nota.<br><br>'+out.summary.map(x=>'• <b>'+escSafe(x.product)+'</b> · pedido '+x.qty.toLocaleString('pt-BR')+' · separado '+x.allocated.toLocaleString('pt-BR')+' · disponível '+x.available.toLocaleString('pt-BR')+(x.unit?' · '+moneySafe(x.unit)+'/pç':'')).join('<br>')+(out.warnings.length?'<br><br>'+out.warnings.map(escSafe).join('<br>'):'')+'<br><br><b>Total previsto: '+totalQty.toLocaleString('pt-BR')+' peças · '+moneySafe(total)+'</b><br><br>Ao confirmar, abre o finalizador oficial da nota para conferir e finalizar.'};
}
function enhance(){
 if(typeof window.hlgbAssistantAsk!=='function'||window.hlgbAssistantAsk.__hlgbInvoiceV3)return;
 const base=window.hlgbAssistantAsk;
 const w=function(){
  const input=document.getElementById('hlgbAssistantInput'),out=document.getElementById('hlgbAssistantAnswer'),a=parse(input?.value||'');
  if(!a)return base.apply(this,arguments);
  if(!out)return;
  let actions='';
  if(a.kind==='invoice-action'){
   window.__hlgbAssistantInvoicePending=a;
   actions='<div class="toolbar" style="margin-top:12px"><button type="button" class="primary" onclick="hlgbAssistantOpenInvoice()">🧾 Confirmar e abrir nota oficial</button></div>';
  }
  out.innerHTML='<h3 style="margin-top:0">'+escSafe(a.title)+'</h3>'+a.text+actions;
 };
 w.__hlgbInvoiceV3=true;w.__original=base;window.hlgbAssistantAsk=w;
}
const prior=window.hlgbAssistantInvoice||{};
window.hlgbAssistantInvoice={...prior,parseV3:parse,rowsForClient,requestedProducts,allocate,clientMatches,version:V};
function boot(){enhance()}try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,600),0)}catch(e){}setTimeout(boot,1000);
window.HLGB_ASSISTANT_INVOICE_V3_GUARD=V;
console.info('[HLGB] Assistente nota v3: sem duplicidade por produto');
})();