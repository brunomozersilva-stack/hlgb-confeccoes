/* HLGB v92.54 — recuperação segura de catálogos visíveis (somente leitura da nuvem) */
(function(){
'use strict';
const V='2026.10.03-catalog-recovery-v9254';
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const MODULES=['products','materials','colors','sizes','suppliers','clients','productionLocations','factionMasters','cutters','employees'];
let running=false,lastRun=0,lastReport=null;

function localArray(module){
 try{db[module]=Array.isArray(db[module])?db[module]:[];return db[module]}catch(e){return []}
}
function itemId(module,item,index=0){
 if(item==null)return '';
 if(typeof item!=='object')return 'value:'+sid(item);
 if(item.id!=null&&sid(item.id)!=='')return sid(item.id);
 if(item.__hlgbId)return sid(item.__hlgbId);
 if(module==='products'&&item.code)return 'code:'+sid(item.code).trim();
 return 'idx:'+index;
}
function pendingIds(module){
 const out=new Set();
 try{
  const raw=localStorage.getItem('hlgb_records_pending_v91'),p=raw?JSON.parse(raw):null;
  for(const op of (p?.modules?.[module]||[]))if(op&&op.id!=null&&op.deleted!==true)out.add(sid(op.id));
 }catch(e){}
 return out;
}
async function remoteRows(module){
 if(typeof cloudRequest!=='function')throw new Error('Conexão com a nuvem ainda não está disponível.');
 const all=[];const limit=500;
 for(let offset=0;offset<5000;offset+=limit){
  const path='hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.'+encodeURIComponent(module)+'&deleted_at=is.null&order=updated_at.asc&limit='+limit+'&offset='+offset;
  const rows=await cloudRequest(path,{method:'GET'});
  if(!Array.isArray(rows))throw new Error('Resposta inválida ao carregar '+module+'.');
  all.push(...rows);
  if(rows.length<limit)break;
 }
 return all;
}
function snapshotRow(module,row){
 try{
  if(!window.hlgbRecordSnapshots)return;
  const map=hlgbRecordSnapshots[module] instanceof Map?hlgbRecordSnapshots[module]:new Map();
  map.set(sid(row.entity_id),{data:clone(row.data),deleted_at:null,revision:+row.revision||1,updated_at:row.updated_at||'',updated_by:row.updated_by||null});
  hlgbRecordSnapshots[module]=map;
 }catch(e){}
}
function mergeModule(module,rows){
 const local=localArray(module),map=new Map(local.map((x,i)=>[itemId(module,x,i),x])),pending=pendingIds(module);
 let added=0,keptPending=0,updatedMissingShape=0;
 for(const row of rows){
  const id=sid(row?.entity_id);if(!id||row?.deleted_at)continue;
  snapshotRow(module,row);
  const remote=clone(row.data||{});
  if(pending.has(id)){keptPending++;continue}
  if(!map.has(id)){map.set(id,remote);added++;continue}
  const cur=map.get(id);
  // Só completa um objeto local claramente vazio/corrompido; não sobrescreve edição válida.
  const curKeys=cur&&typeof cur==='object'?Object.keys(cur).filter(k=>k!=='__hlgbId'):[];
  const remoteKeys=remote&&typeof remote==='object'?Object.keys(remote):[];
  if(curKeys.length<=1&&remoteKeys.length>curKeys.length){map.set(id,remote);updatedMissingShape++}
 }
 db[module]=[...map.values()];
 return {module,cloud:rows.length,localBefore:local.length,localAfter:db[module].length,added,updatedMissingShape,keptPending};
}
function banner(report){
 const page=document.getElementById('produtos');if(!page)return;
 let box=document.getElementById('hlgbCatalogRecovery9254');
 if(!box){box=document.createElement('div');box.id='hlgbCatalogRecovery9254';box.className='panel';box.style.cssText='border:1px solid #b8dfc5;background:#f2fbf5;margin-bottom:12px';page.insertBefore(box,page.firstChild||null)}
 const fixed=(report?.modules||[]).filter(x=>x.added||x.updatedMissingShape);
 const products=(report?.modules||[]).find(x=>x.module==='products');
 box.innerHTML='<b>☁️ Conferência de catálogos</b><div class="sub" style="margin-top:5px">'+
  (products?'Produtos: '+products.localAfter+' visíveis / '+products.cloud+' ativos na nuvem. ':'')+
  (fixed.length?'Recuperados nesta conferência: '+fixed.map(x=>esc(x.module)+' +'+(x.added+x.updatedMissingShape)).join(' · ')+'.':'Nenhum cadastro faltante detectado nesta conferência.')+
  '</div>';
}
function renderAffected(){
 try{if(typeof renderProducts==='function'&&document.getElementById('produtos')?.classList.contains('active'))renderProducts()}catch(e){console.warn('[HLGB 9254] render produtos',e)}
 try{if(typeof renderMaterials==='function'&&document.getElementById('materiais')?.classList.contains('active'))renderMaterials()}catch(e){}
 try{if(typeof renderClients==='function'&&document.getElementById('clientes')?.classList.contains('active'))renderClients()}catch(e){}
 try{if(typeof renderSuppliers==='function'&&document.getElementById('fornecedores')?.classList.contains('active'))renderSuppliers()}catch(e){}
}
async function auditAndRecover(force=false){
 if(running)return lastReport;
 if(!force&&Date.now()-lastRun<12000)return lastReport;
 if(typeof cloudRequest!=='function'||!window.cloudAccessToken)return null;
 running=true;
 try{
  const report={at:new Date().toISOString(),modules:[],changed:false};
  for(const module of MODULES){
   try{
    if(typeof hlgbRecordCanRead==='function'&&!hlgbRecordCanRead(module))continue;
    const rows=await remoteRows(module),m=mergeModule(module,rows);report.modules.push(m);
    if(m.added||m.updatedMissingShape)report.changed=true;
   }catch(e){report.modules.push({module,error:sid(e?.message||e)})}
  }
  if(report.changed){try{localSaveOnly?.()}catch(e){}}
  lastRun=Date.now();lastReport=report;window.HLGB_CATALOG_RECOVERY_LAST=report;
  renderAffected();banner(report);
  return report;
 }finally{running=false}
}
async function openProductsSafe(btn){
 try{
  // Abre a tela imediatamente, mas confirma a fonte autoritativa antes do render final.
  if(typeof window.__hlgbOpenProductsBase9254==='function')window.__hlgbOpenProductsBase9254(btn);
  const page=document.getElementById('produtos');
  let b=document.getElementById('hlgbCatalogRecovery9254');
  if(!b&&page){b=document.createElement('div');b.id='hlgbCatalogRecovery9254';b.className='panel';b.style.cssText='border:1px solid #d9c6cf;background:#fffafb;margin-bottom:12px';b.innerHTML='<b>☁️ Conferindo produtos e cadastros na nuvem…</b>';page.insertBefore(b,page.firstChild||null)}
  const r=await auditAndRecover(true);banner(r);
 }catch(e){console.error('[HLGB 9254] recuperação de catálogos',e);const b=document.getElementById('hlgbCatalogRecovery9254');if(b)b.innerHTML='<b>⚠️ Não foi possível conferir os catálogos agora.</b><div class="sub">'+esc(e?.message||e)+'</div>'}
}
function install(){
 if(typeof window.openProducts==='function'&&!window.openProducts.__catalog9254){
  window.__hlgbOpenProductsBase9254=window.openProducts;
  const w=function(btn){openProductsSafe(btn);};w.__catalog9254=true;w.__original=window.openProducts;window.openProducts=w;
 }
 try{const v=document.querySelector('#appShell .logo small');if(v)v.textContent='v92.54';window.HLGB_RELEASE_VERSION='92.54'}catch(e){}
}
function boot(){
 install();
 setTimeout(()=>auditAndRecover(false).catch(e=>console.warn('[HLGB 9254] auditoria inicial',e)),800);
}
setTimeout(boot,1300);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,500),0)}catch(e){}
window.addEventListener('focus',()=>{if(Date.now()-lastRun>60000)auditAndRecover(false).catch(()=>{})});
window.hlgbCatalogRecovery9254={auditAndRecover,remoteRows,mergeModule,getLast:()=>lastReport};
window.HLGB_CATALOG_RECOVERY_9254=V;
console.info('[HLGB] '+V+' ativo');
})();