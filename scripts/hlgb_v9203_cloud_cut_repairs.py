from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9203_START -->'
END='<!-- HLGB_V9203_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

addon=r'''<!-- HLGB_V9203_START -->
<script>
(function(){
'use strict';
const clone9203=o=>{try{return structuredClone(o)}catch(e){return JSON.parse(JSON.stringify(o))}};
const norm9203=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const arr9203=n=>(db[n]=Array.isArray(db[n])?db[n]:[]);
const id9203=(...ids)=>{for(const id of ids){const el=document.getElementById(id);if(el)return el}return null};
function upsert9203(module,row){const a=arr9203(module),i=a.findIndex(x=>String(x.id)===String(row.id));if(i>=0)a[i]=clone9203(row);else a.push(clone9203(row));return row}
async function cloudSave9203(module,row){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravador da nuvem indisponível.');
  const out=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone9203(row),false);
  if(!out||out.applied===false)throw new Error('A nuvem não confirmou a gravação.');
  return clone9203(out.data||row);
}

// 1) Facções: reforço do salvamento do PIX, inclusive em cadastros existentes.
function factionPayload9203(base){
  const pix=id9203('mfpix','mfPix','factionPix','pixKey')?.value??base?.pix??'';
  const name=id9203('mfname','mfName','factionName')?.value??base?.name??'';
  const address=id9203('mfaddress','mfAddress')?.value??base?.address??'';
  const phone=id9203('mfphone','mfPhone')?.value??base?.phone??'';
  let serviceTypeIds=base?.serviceTypeIds||[],machineIds=base?.machineIds||[];
  try{if(typeof collectFactionServices==='function')serviceTypeIds=collectFactionServices()}catch(e){}
  try{if(typeof collectFactionMachines==='function')machineIds=collectFactionMachines()}catch(e){}
  return {...clone9203(base||{}),name:String(name).trim(),address:String(address).trim(),phone:String(phone).trim(),pix:String(pix).trim(),serviceTypeIds,machineIds,updatedAt:new Date().toISOString()};
}
function renderFaction9203(){try{window.renderFactionMasters?.()}catch(e){}try{window.renderProductionLocations?.()}catch(e){}try{window.renderFactions?.()}catch(e){}}
window.editFactionMaster=function(id){
  const f=arr9203('factionMasters').find(x=>String(x.id)===String(id));if(!f)return;
  openModal('Editar facção',factionMasterForm(f)+'<button type="button" class="primary modalSave">☁️ Salvar alterações</button>',async()=>{
    const next=factionPayload9203(f);if(!next.name){alert('Informe o nome da facção.');return false}
    const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando…'}
    try{const saved=await cloudSave9203('factionMasters',next);upsert9203('factionMasters',saved);try{localSaveOnly()}catch(e){}closeModal();renderFaction9203();alert(saved.pix?'Facção e PIX confirmados na nuvem.':'Facção confirmada na nuvem.');return true}
    catch(e){if(btn){btn.disabled=false;btn.textContent='☁️ Salvar alterações'}alert('A alteração não foi confirmada na nuvem: '+String(e?.message||e));return false}
  });
};

// 2) Hub Financeiro: recarga direta do módulo crítico para evitar tela vazia após gravação.
async function loadModule9203(module){
  if(typeof cloudRequest!=='function')return false;
  try{if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false)}catch(e){}
  const rows=await cloudRequest('hlgb_records?select=entity_id,data,revision,updated_at,deleted_at&module=eq.'+encodeURIComponent(module)+'&order=updated_at.asc&limit=3000',{method:'GET'});
  if(!Array.isArray(rows))return false;
  const remote=new Map(rows.map(r=>[String(r.entity_id),r])),local=arr9203(module),out=[];
  rows.forEach(r=>{if(!r.deleted_at&&r.data&&typeof r.data==='object')out.push(clone9203(r.data))});
  local.forEach(x=>{if(x?.id!=null&&!remote.has(String(x.id)))out.push(clone9203(x))});
  db[module]=out;try{localSaveOnly()}catch(e){};return true;
}
window.reloadHubFinance9203=async function(){
  try{const ok=await loadModule9203('hubFinanceEntries');if(ok){try{window.renderHubFinance?.()}catch(e){};try{setCloudStatus('⚡ Online · Hub atualizado','ok')}catch(e){};return true}}catch(e){console.warn('[HLGB] v92.03 recarga Hub',e)}
  return false;
};
const oldHubRender9203=window.renderHubFinance;
if(typeof oldHubRender9203==='function')window.renderHubFinance=function(){db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[];return oldHubRender9203.apply(this,arguments)};
setTimeout(()=>window.reloadHubFinance9203?.(),900);setTimeout(()=>window.reloadHubFinance9203?.(),2800);

// 3) Pedido -> Corte: separação de material nunca bloqueia e nenhum novo corte é criado se já houver corte operacional ativo.
function terminal9203(c){const st=norm9203(c?.status);return !!(c&&(c.done===true||c.fulfilledAt||st.includes('finalizado')||st.includes('cancelado')||st.includes('concluido')||st.includes('atendido por producao')))}
function orderNeeds9203(o){
  if(!o||o.invoiceReady||o.noteReady)return false;const st=norm9203(o.status);
  if(st.includes('cancel')||st.includes('nota emitida')||st.includes('mercadoria pronta')||st.includes('pedido finalizado')||st.includes('corte finalizado'))return false;
  return true;
}
function qty9203(o){try{return Math.max(0,+qtyOfOrder(o)||0)}catch(e){return Math.max(0,+o.qty||+o.totalQty||0)}}
function makeCut9203(o){let id=Number(o.id)+1;if(!Number.isFinite(id)||arr9203('cuts').some(c=>String(c.id)===String(id)))id=Date.now()+Math.floor(Math.random()*1000000);return {id,orderId:o.id,client:o.client||'',op:'PED-'+o.id,productId:o.productId?+o.productId:null,product:String(o.items||'Pedido'),pieces:qty9203(o),status:'Planejado',date:o.date||(new Date().toISOString().slice(0,10)),autoOrderCutV9203:true,materialSeparationParallel:true,createdAt:new Date().toISOString()}}
window.syncOrdersToCuts=function(){
  let changed=false;arr9203('orders').forEach(o=>{
    if(!orderNeeds9203(o))return;
    const active=arr9203('cuts').filter(c=>String(c.orderId)===String(o.id)&&!terminal9203(c));
    if(active.length){const auto=active.find(c=>c.autoOrderCutV9199||c.autoOrderCutV9203);if(auto){const q=qty9203(o),prod=String(o.items||'Pedido');if(+auto.pieces!==q||auto.client!==(o.client||'')||auto.product!==prod){auto.pieces=q;auto.client=o.client||'';auto.product=prod;auto.materialSeparationParallel=true;auto.updatedAt=new Date().toISOString();changed=true}}return}
    arr9203('cuts').push(makeCut9203(o));changed=true;
  });return changed;
};
const saveBefore9203=window.save;
if(typeof saveBefore9203==='function')window.save=function(){try{window.syncOrdersToCuts()}catch(e){console.warn('[HLGB] v92.03 pedido→corte',e)}return saveBefore9203.apply(this,arguments)};

console.log('[HLGB] v92.03 nuvem crítica + corte carregado');
})();
</script>
<!-- HLGB_V9203_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v92.02','v92.03')
p.write_text(s,encoding='utf-8')
print('v92.03 aplicada',len(s))
