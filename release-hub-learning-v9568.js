/* HLGB v95.68 — Bot/Auditor: aprendizado por evidência da operação Salvar.
 * NÃO executa correções; não grava no Supabase nem remove WAL.
 * Aprende apenas etapas e resultados, sem dados de clientes ou valores.
 */
(function(){
'use strict';
const V='95.68',STORAGE='hlgb_hub_save_learning_v9568',PANEL='hlgbHubSaveLearning9568',MAX=50;
if(window.hlgbHubLearning9568?.version===V)return;
const sid=x=>String(x??''),now=()=>new Date().toISOString();
const authorized=()=>window.__HLGB_AUTH_READY===true;
const esc=x=>sid(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
function initial(){return {version:V,observedKeys:[],cases:[],timeline:[],lastAt:''}}
function read(){
 try{
  const x=JSON.parse(localStorage.getItem(STORAGE)||'null');
  return x&&Array.isArray(x.cases)&&Array.isArray(x.observedKeys)&&Array.isArray(x.timeline)?x:initial();
 }catch(_){return initial()}
}
function write(state){try{localStorage.setItem(STORAGE,JSON.stringify(state));return true}catch(e){return false}}
const CATEGORY={
 'ui-confirmed':{title:'Salvar confirmado com clique',priority:0,next:'Confirmado por clique, RPC e releitura. Monitorar se reaparecer regressão.'},
 'status-only':{title:'Mudança de status, não prova Salvar',priority:2,next:'Testar clique de Salvar lançamento ou Salvar alterações. Não usar alternância de status como prova.'},
 'no-click':{title:'Tentativa sem clique rastreado',priority:3,next:'Verificar binding, modalSave, evento real e submissão única.'},
 'callback-missing':{title:'Botão sem callback funcional',priority:5,next:'Verificar instalação de newHubFinanceEntry e window.modalSave. Bloquear salvamento silencioso.'},
 'form-rejected':{title:'Formulário rejeitado',priority:2,next:'Revisar campos obrigatórios e mensagem de validação antes de acionar a nuvem.'},
 'no-readback':{title:'Tentativa sem confirmação remota',priority:5,next:'Verificar envio RPC, ACK/revisão e releitura. Preservar formulário e WAL.'},
 'conflict':{title:'Conflito de revisão',priority:4,next:'Comparar revisão da nuvem e snapshot; oferecer recarga assistida, sem sobrescrever outra sessão.'},
 'network':{title:'Problema de conectividade',priority:4,next:'Verificar sessão, request e status de rede. Não declarar salvo sem ACK e releitura.'},
 'other-failure':{title:'Falha sem causa classificada',priority:3,next:'Gerar prova por fase, reproduzir em Chrome/Safari e adicionar teste antes de reparar.'}
};
function classify(ui,trace){
 const u=ui?.last||{},t=trace||{};
 if(u.phase==='confirmed'&&u.clickObserved===true&&
  ['confirmed','already-saved'].includes(u.traceOutcome))return 'ui-confirmed';
 if(u.errorCode==='no-modal-callback')return 'callback-missing';
 if(u.errorCode==='form-rejected')return 'form-rejected';
 if(u.errorCode==='revision-conflict')return 'conflict';
 if(u.errorCode==='network')return 'network';
 if(u.phase==='unverified'||u.errorCode==='no-ack-readback')return 'no-readback';
 if(['failed','blocked'].includes(u.phase))return 'other-failure';
 if(t?.attempts>0&&(t.source==='status-button'||t.source==='quick-toggle')&&!t.clickObserved)return 'status-only';
 if(t?.attempts>0&&!t.clickObserved)return 'no-click';
 return 'not-tested';
}
function current(){
 const ui=window.hlgbHubSaveProof9567?.status?.()||{};
 const t=window.hlgbHubSaveTrace9483?.status?.()||{};
 const category=classify(ui,t);
 const key=ui?.last?.phase&&ui.last.phase!=='not-tested'&&ui.last.phase!=='click-received'?
  'ui:'+sid(ui.last.at)+':'+sid(ui.last.phase):
  'trace:'+sid(t.attemptId)+':'+sid(t.outcome)+':'+sid(t.lastAt);
 const valid=category!=='not-tested'&&
  (ui?.last?.phase&&['confirmed','failed','blocked','unverified'].includes(ui.last.phase)||
   Number(t.attempts)>0);
 return {category,key,valid,trace:{attemptId:Number(t.attemptId)||0,
  outcome:sid(t.outcome||'not-tested'),source:sid(t.source||'none'),
  clickObserved:t.clickObserved===true,hasAck:!!t.ackAt,hasReadback:!!t.readbackAt},
  ui:{phase:sid(ui?.last?.phase||'not-tested'),clicks:Number(ui?.clicks)||0,
   confirmed:Number(ui?.confirmed)||0,blocked:Number(ui?.blocked)||0,failed:Number(ui?.failed)||0}};
}
function learn(){
 if(!authorized())return {ok:false,reason:'not-authenticated'};
 const sample=current();if(!sample.valid)return {ok:false,reason:'not-tested',category:sample.category};
 const stored=read();
 if(stored.observedKeys.includes(sample.key))return {ok:true,repeated:true,category:sample.category};
 stored.observedKeys=[...stored.observedKeys,sample.key].slice(-240);
 const prev=stored.cases.find(x=>x.category===sample.category);
 const weight=CATEGORY[sample.category]?.priority||1;
 const record={category:sample.category,firstAt:prev?.firstAt||now(),lastAt:now(),
   observations:(prev?.observations||0)+1,priority:weight};
 stored.cases=stored.cases.filter(x=>x.category!==sample.category);
 stored.cases.push(record);stored.cases.sort((a,b)=>b.priority-a.priority||b.observations-a.observations);
 stored.cases=stored.cases.slice(0,MAX);
 stored.timeline.push({category:sample.category,at:record.lastAt,
  source:sample.trace.source,traceOutcome:sample.trace.outcome,
  clickObserved:sample.trace.clickObserved,hasAck:sample.trace.hasAck,hasReadback:sample.trace.hasReadback});
 stored.timeline=stored.timeline.slice(-80);
 stored.lastAt=record.lastAt;
 return {ok:write(stored),category:sample.category,observations:record.observations};
}
function recommendations(){
 const history=read(),currentSample=current(),unresolved=history.cases.filter(x=>x.priority>0)
  .sort((a,b)=>b.priority-a.priority||b.observations-a.observations);
 const order=unresolved.slice(0,6).map(x=>({code:x.category,priority:x.priority,observations:x.observations,
  title:CATEGORY[x.category]?.title||'Falha',next:CATEGORY[x.category]?.next||'Investigar com evidências.'}));
 const ui=currentSample.ui,t=currentSample.trace;
 // A transport status-only confirmation cannot attest the Hub form Save button.
 const savingUiProved=ui.phase==='confirmed'&&t.clickObserved===true&&
  currentSample.category==='ui-confirmed';
 const traceProof={clickObserved:t.clickObserved,rpcAck:t.hasAck,remoteReadback:t.hasReadback,
  savingUiProved,liveCrossBrowserProof:false};
 return {version:V,category:currentSample.category,savingUiProved,
  historyCases:history.cases.length,observations:history.timeline.length,
  cases:order,traceProof,
  tests:['tests/hub-save-ack-v9483.cjs','tests/hub-save-v9483-browser.js',
   'tests/hub-save-proof-v9567-browser.cjs','tests/hub-learning-v9568.cjs'],
  rules:['Sem reparo automático em dados de produção','Não apagar IndexedDB nem WAL',
   'Um clique sem ACK/readback não é confirmação','Histórico somente neste navegador']};
}
function render(){
 if(!authorized())return false;
 const host=document.getElementById('hlgbAuditorResult');if(!host)return false;
 let node=document.getElementById(PANEL);
 if(!node){node=document.createElement('section');node.id=PANEL;node.className='panel';host.appendChild(node)}
 const r=recommendations(),ok=r.savingUiProved;
 const cases=r.cases.slice(0,3).map(x=>'<li><b>'+esc(x.title)+'</b> · '+x.observations+' ocorrência(s). '+esc(x.next)+'</li>').join('');
 node.innerHTML='<h3 style="margin:0">🧠 Aprendizado de salvamento v'+V+'</h3>'+
  '<p class="sub">Aprende com clique, ACK e releitura; não é inteligência generativa nem altera o banco.</p>'+
  '<p><b>'+(ok?'✓ Clique de Salvar confirmado por prova remota nesta sessão':'⚠ Clique de Salvar ainda sem prova remota nesta sessão')+'</b></p>'+
  '<p class="sub">'+esc(r.category)+' · '+r.observations+' observações úteis · '+r.historyCases+' padrões conhecidos</p>'+
  (cases?'<ul>'+cases+'</ul>':'<div class="sub">Sem ocorrências classificadas até agora.</div>')+
  '<button type="button" class="secondary" id="hlgbHubLearningExport9568">⬇️ Exportar diagnóstico do Hub (JSON)</button>';
 node.querySelector('#hlgbHubLearningExport9568')?.addEventListener('click',download);
 return true;
}
function packageJson(){
 const r=recommendations(),h=read();
 return {kind:'hlgb_hub_save_learning_pack',version:V,generatedAt:now(),readOnly:true,
  ...r,history:h.cases,observations:h.timeline,
  coverage:{savingUi:r.savingUiProved?'observed':'not-tested',delivery:r.traceProof.remoteReadback?'seen-in-current-trace':'not-tested',
   runtime:'not-tested',crossBrowser:'not-proved'},
  limitations:'As observações deste navegador não comprovam execução em outro computador ou teste de produção.'};
}
function download(){
 if(!authorized())return false;
 try{
  learn();const json=JSON.stringify(packageJson(),null,2),blob=new Blob([json],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
  a.download='HLGB-HUB-APRENDIZADO-'+now().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);return true
 }catch(e){return false}
}
function poll(){if(!authorized()||document.hidden)return;learn();render()}
window.hlgbHubLearning9568={version:V,learn,recommendations,packageJson,render,download,
 classify,history:()=>read(),status:()=>({version:V,last:current(),observed:read().timeline.length,authorized:authorized()})};
window.addEventListener?.('hlgb:hub-save-ui-proof',()=>{if(authorized())setTimeout(poll,40)});
window.addEventListener?.('hlgb:hub-finance-changed',()=>{if(authorized())setTimeout(poll,50)});
window.addEventListener?.('hlgb:auditor:open',()=>setTimeout(poll,100));
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(poll,500));
if(!window.__HLGB_TEST__){setInterval(poll,20000);if(authorized())setTimeout(poll,800)}
console.info('[HLGB] Auditor v95.68: trilha local de aprendizado por clique-ACK-readback sem correções automáticas');
})();