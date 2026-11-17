/* HLGB v95.105 — recuperação restrita dos dois cortes duplicados do pedido #49.
   Nenhuma exclusão automática: a pessoa autenticada deve clicar em Corrigir.
   Preserva os dois cortes corretos, materialUsage, produção e todas as outras OPs.
   Só arquiva duplicados com prova remota e sem WAL pendente. */
(function(){
'use strict';
if(window.hlgbCutDuplicateRepair95105)return;
const VERSION='95.105',ORDER='1794489164896';
const PAIRS=[
 {name:'Fio Jamile',keep:'1794489178728783',duplicate:'1794489179277674',product:'1788443129345',pieces:480},
 {name:'Short Doll Yza',keep:'1794489178968556',duplicate:'1794489179922532',product:'1788193667899',pieces:410}
];
const sid=x=>String(x??''),num=x=>Number(x||0),clone=x=>JSON.parse(JSON.stringify(x));
const state={running:false,lastError:'',completed:false,verified:0,archived:0};
function list(){try{return Array.isArray(db?.cuts)?db.cuts:Array.isArray(window.db?.cuts)?window.db.cuts:[]}catch(_){return Array.isArray(window.db?.cuts)?window.db.cuts:[]}}
function localDrop(id){const rows=list();for(let i=rows.length-1;i>=0;i--)if(sid(rows[i]?.id)===sid(id))rows.splice(i,1)}
function issues(){
 return PAIRS.filter(p=>list().some(c=>sid(c?.id)===p.duplicate)).map(p=>p.name);
}
async function remote(id){
 if(typeof window.cloudRequest!=='function')throw Error('Conexão autenticada com o Supabase indisponível.');
 const path='hlgb_records?select=entity_id,data,deleted_at,revision,updated_at&module=eq.cuts&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';
 const rows=await window.cloudRequest(path,{method:'GET'});
 if(!Array.isArray(rows)||rows.length!==1||sid(rows[0]?.entity_id)!==sid(id))throw Error('Não foi possível comprovar o corte '+id+' no servidor.');
 return rows[0];
}
function rowMatches(r,p,id){
 const d=r?.data||{};
 return sid(r?.entity_id)===id&&sid(d.id)===id&&sid(d.orderId)===ORDER&&
 sid(d.productId)===p.product&&sid(d.product)===p.name&&
 num(d.pieces)===p.pieces&&d.modelSplitChildV1===true&&
 sid(d.orderReferenceNumber)==='49';
}
function cleanDuplicate(r,p){
 const d=r.data||{};
 return rowMatches(r,p,p.duplicate)&&num(r.revision)===1&&
 sid(d.status)==='Planejado'&&d.cutterId==null&&d.factionId==null&&
 d.productionLocationId==null&&!d.finishedAt&&!d.finishedAtTime&&
 (!Array.isArray(d.materialUsage)||d.materialUsage.length===0)&&
 !d.materialUsageRecordedAt&&!d.cutGradeAdjustedAt&&!d.gradeAdjustedAt&&
 !d.cutWeightV9579&&!d.cutWeightEventsV9579&&
 !d.assignedAt&&Array.isArray(d.originalGrade)&&Array.isArray(d.actualCutGrade);
}
function gradeSame(a,b){
 return JSON.stringify(a?.originalGrade)===JSON.stringify(b?.originalGrade)&&
 JSON.stringify(a?.actualCutGrade)===JSON.stringify(b?.actualCutGrade);
}
function validate(keep,duplicate,p){
 if(!rowMatches(keep,p,p.keep)||keep.deleted_at)throw Error(p.name+': registro correto não encontrado ou arquivado. Nada será apagado.');
 if(!rowMatches(duplicate,p,p.duplicate))throw Error(p.name+': cópia suspeita mudou. Nada será apagado.');
 if(duplicate.deleted_at)return 'already_archived';
 if(!cleanDuplicate(duplicate,p))throw Error(p.name+': o duplicado foi editado; requer conferência manual.');
 if(!gradeSame(keep.data,duplicate.data))throw Error(p.name+': grades divergentes, exclusão bloqueada.');
 if(p.name==='Fio Jamile'&&
  (!Array.isArray(keep.data.materialUsage)||keep.data.materialUsage.length!==3||
   !keep.data.materialUsageRecordedAt))
  throw Error('Fio Jamile: não foi possível comprovar os 3 materiais do registro correto.');
 if(p.name==='Short Doll Yza'&&num(keep.revision)!==1)
  throw Error('Short Doll Yza: o corte original mudou; requer nova conferência.');
 return 'archive';
}
async function assertWal(ids){
 const wal=window.hlgbWalIdbGuard9536;
 if(typeof wal?.probe!=='function'||typeof wal?.ids!=='function')throw Error('Proteção IndexedDB/WAL indisponível; nada será arquivado.');
 if(wal.supportsCustomTimeout!==true)throw Error('Atualização da leitura segura do IndexedDB não carregou. Atualize o HLGB sem limpar os dados.');
 try{
  // Verificação dirigida: mantém o timeout de 8s nas telas comuns, mas permite
  // até 32s quando a pessoa solicita recuperação dos duplicados.
  try{await wal.probe({timeoutMs:32000})}
  catch(e){
   // Pode ter aproveitado uma leitura automática já em andamento no modo 8s.
   // Uma única nova leitura estendida, sempre readonly e sem apagar a WAL.
   if(!/Leitura do IndexedDB excedeu 8 segundos/i.test(sid(e?.message||e)))throw e;
   await wal.probe({timeoutMs:32000});
  }
 }catch(e){
  const msg=sid(e?.message||e);
  if(/Leitura do IndexedDB excedeu|IndexedDB bloqueado por outra aba/i.test(msg))
   throw Error('A leitura segura do IndexedDB continua indisponível. Feche as outras abas do HLGB neste navegador e atualize esta página SEM limpar cache nem dados. Os cortes foram preservados. Detalhe: '+msg);
  throw e;
 }
 if(wal.status?.()?.readFailed)throw Error('Não foi possível verificar a fila local do Safari. Nada será arquivado.');
 const pending=new Set([...(wal.ids()||[]),...(window.hlgbRecordPendingIdentitySet9535?.()||[])].map(sid));
 for(const id of ids)if(pending.has('cuts::'+id)||pending.has('cuts|'+id))
  throw Error('O corte '+id+' tem alteração pendente neste navegador. Sincronize antes de corrigir.');
}
async function check(){
 if(window.__HLGB_AUTH_READY!==true)throw Error('Entre no HLGB antes de corrigir os cortes.');
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw Error('Gravação autenticada não disponível.');
 const ids=PAIRS.flatMap(p=>[p.keep,p.duplicate]);
 await assertWal(ids);
 const rows=await Promise.all(ids.map(remote));
 const selected=PAIRS.map((p,i)=>({p,keep:rows[2*i],duplicate:rows[2*i+1]}));
 const decisions=selected.map(o=>validate(o.keep,o.duplicate,o.p));
 return {selected,decisions};
}
async function execute(){
 if(state.running)throw Error('Correção já está em andamento.');
 state.running=true;state.lastError='';state.verified=0;state.archived=0;
 try{
  const {selected,decisions}=await check();
  const pending=selected.filter((_,i)=>decisions[i]==='archive');
  if(!pending.length){
   selected.forEach(o=>localDrop(o.p.duplicate));
   try{window.localSaveOnly?.()}catch(_){}
   state.completed=true;state.verified=2;refresh();
   return {ok:true,archived:0,already:true};
  }
  const descriptions=pending.map(x=>x.p.name+' ('+x.p.pieces+' peças)').join(' e ');
  if(!window.confirm('Corrigir duplicados do pedido #49: arquivar apenas as cópias extras de '+descriptions+'?\\n\\nOs cortes originais, os materiais do Fio Jamile e os demais pedidos serão preservados.'))
   return {ok:false,canceled:true};
  // Segunda leitura remota antes do primeiro envio protege mudanças entre conferência e confirmação.
  const again=await check();
  for(let i=0;i<PAIRS.length;i++){
   const p=PAIRS[i],current=again.selected[i],decision=again.decisions[i];
   const before=selected[i];
   if(sid(current.keep.updated_at)!==sid(before.keep.updated_at)||
      sid(current.duplicate.updated_at)!==sid(before.duplicate.updated_at)||
      num(current.keep.revision)!==num(before.keep.revision)||
      num(current.duplicate.revision)!==num(before.duplicate.revision))
    throw Error(p.name+': registro mudou enquanto você confirmava. Nada mais será arquivado.');
   if(decision==='already_archived'){localDrop(p.duplicate);state.verified++;continue;}
   // Cópia de histórico no próprio tombstone. Nunca altera o registro original.
   const data={...clone(current.duplicate.data),
    duplicateArchiveV95105:{duplicateOfCutId:p.keep,orderId:ORDER,
      reason:'duplicidade confirmada por pedido/modelo/grade',at:new Date().toISOString()},
    updatedAt:new Date().toISOString()};
   const response=await window.hlgbRecordSaveWithRetry('cuts',p.duplicate,data,true);
   // Mesmo com resposta de rede ambígua, confirmar o tombstone antes de retirar o local.
   const proof=await remote(p.duplicate);
   if(!proof.deleted_at||!rowMatches(proof,p,p.duplicate))
    throw Error(p.name+': a nuvem não comprovou o arquivamento. Não repita sem conferir.');
   localDrop(p.duplicate);state.archived++;state.verified++;
   if(!response?.applied)console.warn('[HLGB corte 95.105] resposta sem ACK, tombstone comprovado',p.duplicate);
  }
  if(state.verified!==2)throw Error('Nem todos os duplicados foram confirmados.');
  try{window.localSaveOnly?.()}catch(e){console.warn('[HLGB corte 95.105] cache local',e)}
  state.completed=true;refresh();return {ok:true,archived:state.archived,verified:state.verified};
 }catch(e){state.lastError=sid(e?.message||e);refresh();throw e}
 finally{state.running=false}
}
function refresh(){
 try{window.renderCuts?.()}catch(_){}
 try{window.hlgbCutModelSplit?.renderSplitPanel?.()}catch(_){}
 try{window.renderDailyCuts?.()}catch(_){}
 setTimeout(decorate,50);
}
function decorate(){
 try{
  const host=document.getElementById('hlgbCutSplitPanel')||document.getElementById('cutTable');
  if(!host)return;
  const names=issues();
  let box=document.getElementById('hlgbUrgentCutRepair95105');
  if(!names.length&&state.completed){box?.remove();return}
  if(!names.length){box?.remove();return}
  if(!box){
   box=document.createElement('div');
   box.id='hlgbUrgentCutRepair95105';box.setAttribute('role','alert');
   box.style.cssText='border:1px solid #ad772d;background:#fff8e6;color:#33200a;padding:14px;border-radius:10px;margin:10px 0';
   host.parentNode?.insertBefore(box,host);
  }
  const esc=sid(state.lastError).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  box.innerHTML='<b>⚠️ Pedido #49 — correção urgente de cortes duplicados</b>'+
   '<p style="margin:7px 0">Fio Jamile / Short Doll Yza. Mantém os registros originais e os 3 materiais do Fio Jamile. A correção valida o servidor e a fila local antes de arquivar somente duas cópias extras.</p>'+
   (esc?'<p style="color:#a00">'+esc+'</p>':'')+
   '<button type="button" id="hlgbDoUrgentCutRepair95105" class="primary"'+
   (state.running?' disabled':'')+'>☁️ Corrigir duplicados do pedido #49</button>';
 }catch(e){console.warn('[HLGB 95.105] painel de recuperação',e)}
}
function install(){
 const old=window.renderCuts;
 if(typeof old==='function'&&!old.__hlgbCutRepair95105){
  const wrapped=function(){const out=old.apply(this,arguments);setTimeout(decorate,30);return out};
  wrapped.__hlgbCutRepair95105=true;wrapped.__original=old;window.renderCuts=wrapped;
 }
 decorate();
}
document.addEventListener('click',async e=>{
 if(e.target?.id!=='hlgbDoUrgentCutRepair95105')return;
 const btn=e.target;btn.disabled=true;btn.textContent='Conferindo Supabase e sincronização…';
 try{
  const result=await execute();
  if(result.ok)window.alert('Correção confirmada no Supabase: os dois cortes duplicados foram arquivados. Fio Jamile e Short Doll Yza podem ser editados normalmente após atualizar a tela.');
 }catch(err){window.alert('Correção protegida: '+sid(err.message||err)+'\\n\\nNenhum outro corte foi alterado.');}
 finally{btn.disabled=false;btn.textContent='☁️ Corrigir duplicados do pedido #49';install()}
},true);
window.hlgbCutDuplicateRepair95105={version:VERSION,validate,cleanDuplicate,gradeSame,check,execute,decorate,install,status:()=>({...state})};
[0,350,1400].forEach(ms=>setTimeout(install,ms));
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(install,700),0)}catch(_){}
console.info('[HLGB] Correção dirigida v95.105 disponível no painel Cortes. Nenhum registro alterado sem confirmação.');
})();
