/* HLGB v97.05 — recuperação dirigida do vínculo do corte planejado do pedido 48.
 * Requer ação explícita do operador autenticado. Não altera grade, quantidade, pedido,
 * produção, financeiro ou WAL. Usa o RPC comercial existente com revisão esperada.
 */
(function(){
'use strict';
if(window.hlgbCutSingleProductLink9705)return;
const CUT='1794488399889',ORDER='1794488399888',PRODUCT='1788193589429',PIECES=1260;
const sid=v=>String(v??''),clone=v=>JSON.parse(JSON.stringify(v));
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
let busy=false,confirmed=false,lastError='';
function validate(c,o,p){
 if(!c||!o||!p||c.deleted_at||o.deleted_at||p.deleted_at||sid(c.entity_id)!==CUT||sid(o.entity_id)!==ORDER||sid(p.entity_id)!==PRODUCT)throw Error('Corte, pedido ou produto indisponível.');
 const d=c.data,g=o.data?.grade;
 if(sid(d?.id)!==CUT||sid(d?.orderId)!==ORDER||sid(o.data?.id)!==ORDER||sid(p.data?.id)!==PRODUCT||sid(o.data?.orderNumber)!=='48')throw Error('Identidade comercial mudou.');
 if(sid(d.status)!=='Planejado'||Number(d.pieces)!==PIECES||!Array.isArray(g)||g.length!==12||g.some(x=>sid(x?.productId)!==PRODUCT||!Number.isSafeInteger(Number(x.qty))||Number(x.qty)<=0||!sid(x.color)||!sid(x.size))||g.reduce((n,x)=>n+Number(x.qty),0)!==PIECES)throw Error('Grade ou quantidade divergente. Conferência manual necessária.');
 if(!sid(d.product)||d.product!==o.data?.items||d.finishedAt||d.finishedAtTime||d.cutGradeAdjustedAt||d.originalGrade!=null||d.actualCutGrade!=null)throw Error('Corte possui alterações ou grade própria; nada será gravado.');
 if(sid(d.productId)===PRODUCT)return {already:true};
 if(sid(d.productId)||Number(c.revision)!==1||Number(o.revision)!==1)throw Error('Revisão ou produto mudou; conferir novamente.');
 return {already:false,next:{...clone(d),productId:Number(PRODUCT)}};
}
function authenticated(){return window.__HLGB_AUTH_READY===true&&typeof window.cloudRequest==='function'}
async function remote(module,id){
 if(!authenticated())throw Error('Entre no HLGB para conferir.');
 const rows=await window.cloudRequest('hlgb_records?select=entity_id,data,deleted_at,revision&module=eq.'+encodeURIComponent(module)+'&entity_id=eq.'+encodeURIComponent(id)+'&limit=1',{method:'GET'});
 if(!Array.isArray(rows)||rows.length!==1||sid(rows[0].entity_id)!==id)throw Error('Registro não comprovado: '+module);
 return rows[0];
}
async function ensureNoPending(){
 const w=window.hlgbWalIdbGuard9536;
 if(w?.supportsCustomTimeout!==true||typeof w.probe!=='function'||typeof w.ids!=='function'||typeof window.hlgbRecordPendingIdentitySet9535!=='function')throw Error('Proteção de sincronização indisponível.');
 await w.probe({timeoutMs:32000});
 const status=w.status?.();
 if(!status||status.readFailed!==false||status.unsupported===true||status.localReadFailed===true||!(status.probes>0))throw Error('Leitura da WAL não confirmada.');
 const durable=w.ids(),normal=window.hlgbRecordPendingIdentitySet9535();
 if(!durable||typeof durable.has!=='function'||!normal||typeof normal.has!=='function'||!Number.isSafeInteger(status.entryCount)||status.entryCount!==durable.size)throw Error('Identidades de pendências não comprovadas.');
 // Legacy guard may not expose a local read failure flag. Check both stored queues directly.
 const pending=new Set([...durable,...normal].map(sid));
 for(const [key,field] of [['hlgb_durable_wal_v1','entries'],['hlgb_records_pending_v91','modules']]){
  const raw=localStorage.getItem(key);if(raw===null)continue;
  const parsed=JSON.parse(raw),rows=parsed?.[field];
  if(!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('Fila local ilegível; correção bloqueada.');
  if(field==='entries'){for(const [k,x] of Object.entries(rows)){if(!x||typeof x!=='object')throw Error('Operação local inválida.');pending.add(sid(k));if(x.module&&x.id!=null)pending.add(sid(x.module)+'::'+sid(x.id));}}
  else{for(const [m,list] of Object.entries(rows)){if(!Array.isArray(list))throw Error('Fila local inválida.');for(const x of list){if(x?.id==null)throw Error('Pendência sem identificação.');pending.add(m+'::'+sid(x.id));}}}
 }
 for(const [m,id] of [['cuts',CUT],['orders',ORDER],['products',PRODUCT]])if(pending.has(m+'::'+id)||pending.has(m+'|'+id))throw Error('Existe alteração local pendente. Sincronize antes de corrigir.');
}
async function check(){
 await ensureNoPending();
 const [c,o,p]=await Promise.all([remote('cuts',CUT),remote('orders',ORDER),remote('products',PRODUCT)]);
 const result=validate(c,o,p);
 if(!result.already){
  for(const [field,value] of [['orderId',ORDER],['sourceCutId',CUT]]){
   const rows=await window.cloudRequest('hlgb_records?select=entity_id&module=eq.production&deleted_at=is.null&data->>'+field+'=eq.'+value+'&limit=1',{method:'GET'});
   if(!Array.isArray(rows)||rows.length)throw Error('Produção vinculada ou consulta incompleta; correção bloqueada.');
  }
 }
 return {c,o,p,...result};
}
async function execute(){
 if(busy)return {ok:false,busy:true};
 if(!authenticated())throw Error('Sessão autenticada necessária.');
 busy=true;lastError='';
 try{
  const first=await check();
  if(first.already){confirmed=true;return {ok:true,already:true}}
  if(!window.confirm('Pedido #48 — Camisola Liliane: confirmar somente o vínculo do produto no corte planejado de 1.260 peças? Grade, quantidades e demais registros não serão alterados.'))return {ok:false,canceled:true};
  const again=await check();
  if(again.already){confirmed=true;return {ok:true,already:true}}
  if(!equal(first.c,again.c)||!equal(first.o,again.o)||!equal(first.p,again.p))throw Error('Dados mudaram durante a confirmação. Nenhuma gravação enviada.');
  if(!authenticated())throw Error('Sessão encerrada; nada enviado.');
  // CAS explícito: sem retry cego nem alteração dos registros locais de WAL.
  let response=null,writeError='';
  try{response=await window.cloudRequest('rpc/hlgb_save_record',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_module:'cuts',p_entity_id:CUT,p_data:again.next,p_expected_revision:Number(again.c.revision),p_deleted:false})})}
  catch(e){writeError=sid(e?.message||e)}
  const proof=await remote('cuts',CUT);
  if(proof.deleted_at||Number(proof.revision)!==Number(again.c.revision)+1||!equal(proof.data,again.next))throw Error('Gravação não comprovada. Nenhum reenvio automático. '+writeError);
  confirmed=true;return {ok:true,revision:proof.revision,ack:Array.isArray(response)&&response[0]?.applied===true};
 }catch(e){lastError=sid(e?.message||e);throw e}
 finally{busy=false;decorate()}
}
function localCut(){try{return (Array.isArray(db?.cuts)?db.cuts:[]).find(c=>sid(c?.id)===CUT)}catch(_){return null}}
function decorate(){
 try{
  const host=document.getElementById('hlgbCutSplitPanel')||document.getElementById('cutTable'),c=localCut();
  let box=document.getElementById('hlgbCutLinkRepair9705');
  if(!host||!authenticated()||!c||sid(c.productId)===PRODUCT){box?.remove();return}
  if(!box){box=document.createElement('div');box.id='hlgbCutLinkRepair9705';box.className='panel';host.parentNode?.insertBefore(box,host)}
  box.textContent='';
  const title=document.createElement('b');title.textContent='Pedido #48 — Camisola Liliane: vínculo do produto';box.appendChild(title);
  const text=document.createElement('p');text.textContent=confirmed?'Vínculo confirmado no servidor. Atualize a página sem limpar os dados.':(lastError||'Conferência protegida: somente o vínculo do produto, sem alterar as 1.260 peças.');box.appendChild(text);
  const button=document.createElement('button');button.type='button';button.className='secondary';button.disabled=busy||confirmed;button.textContent=busy?'Conferindo…':'Conferir e corrigir vínculo';button.onclick=async()=>{button.disabled=true;try{await execute()}catch(e){window.alert(sid(e?.message||e))}finally{decorate()}};box.appendChild(button);
 }catch(_){}
}
function install(){const old=window.renderCuts;if(typeof old==='function'&&!old.__hlgbCutLink9705){const wrap=function(){const r=old.apply(this,arguments);decorate();return r};wrap.__hlgbCutLink9705=true;wrap.__original=old;window.renderCuts=wrap}decorate()}
window.hlgbCutSingleProductLink9705={validate,check,execute,install,status:()=>({busy,confirmed,lastError})};
window.addEventListener?.('hlgb:authenticated',install);
window.addEventListener?.('hlgb:logout',()=>{confirmed=false;lastError='';document.getElementById('hlgbCutLinkRepair9705')?.remove()});
if(window.__HLGB_AUTH_READY===true)install();
})();
