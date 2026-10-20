/* HLGB Auditor v93.74 — mapa de versões e autoridades, somente leitura. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_AUTHORITY_9374)return;
const V='93.74',BUILD='HLGB-AUDITOR-AUTHORITY-93.74';
const sid=v=>String(v??'');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const POINTERS=['__original','__hlgb955Original','__hlgb9306Original','__hlgb9320Original','__hlgbBase','__hlgbReliableOriginal','__hlgbWalOriginal'];
const FAMILIES=[
 {id:'hub',label:'Hub Financeiro',re:/release-(hub-|finance-)/i,functions:['renderHubFinance','changeHubFinanceWeek','toggleHubFinanceEntry','editHubFinanceEntry']},
 {id:'production',label:'Produção / Baixa',re:/release-(production-|separation-)/i,functions:['hlgbWriteoffSelected9385','hlgbWriteoffSelected9384','hlgbWriteoffSelected9378','applySeparationProgress938','markSeparation','syncFinalizedCutsToProduction']},
 {id:'sync',label:'Sincronização / WAL',re:/release-(save-|wal-|sync-|runtime-recovery)/i,functions:['hlgbRecordSaveWithRetry','cloudRequest','flush955']},
 {id:'projection',label:'Projeção',re:/release-projection-/i,functions:['renderProjection']},
 {id:'payroll',label:'RH / Folha',re:/release-payroll-/i,functions:['renderPayrollProvisions']},
 {id:'assistant',label:'Assistente',re:/release-assistant-/i,functions:['hlgbAssistantAsk']},
 {id:'auditor',label:'Auditor',re:/release-auditor-/i,functions:['openHlgbAuditor','hlgbAuditorRunFull','hlgbAuditorRunVisualSweep']}
];
const PREFERRED={
 production:{writeoff:'93.91',note:'Baixa deve ter uma autoridade final única; camadas anteriores ficam apenas como compatibilidade até consolidação.'},
 sync:{note:'Uma única autoridade de save/replay por operação; wrappers antigos devem ser aposentados depois de comprovada equivalência.'},
 hub:{note:'Separar render, semana e edição em autoridades explícitas; evitar múltiplos scripts redefinindo a mesma função.'}
};
function fileName(src){try{return decodeURIComponent(new URL(src,location.href).pathname.split('/').pop()||'')}catch(e){return sid(src).split(/[/?#]/).pop()||''}}
function loadedScripts(){
 const set=new Set();
 try{document.querySelectorAll('script[src]').forEach(s=>{const f=fileName(s.src);if(f)set.add(f)})}catch(e){}
 try{performance.getEntriesByType('resource').forEach(e=>{const f=fileName(e.name);if(/\.js$/i.test(f))set.add(f)})}catch(e){}
 return [...set].sort();
}
function versionOf(name){
 let m=sid(name).match(/(?:^|[-_])v(\d{4})(?:\D|$)/i);if(m){const n=m[1];return n.slice(0,2)+'.'+n.slice(2)}
 m=sid(name).match(/(?:^|[-_])v(\d+(?:\.\d+)?)/i);return m?m[1]:'';
}
function chain(fn){
 const seen=new Set(),nodes=[];let cur=fn,cycle=false,guard=0;
 while(typeof cur==='function'&&guard++<40){
  if(seen.has(cur)){cycle=true;break}seen.add(cur);
  const markers=Object.keys(cur).filter(k=>/^__hlgb/i.test(k)&&typeof cur[k]!=='function').slice(0,16);
  const pointers=POINTERS.filter(p=>typeof cur[p]==='function');
  nodes.push({name:cur.name||'anon',markers,pointers});
  let next=null;for(const p of POINTERS){if(typeof cur[p]==='function'){next=cur[p];break}}cur=next;
 }
 return {depth:nodes.length,cycle,truncated:guard>=40,nodes};
}
function fnInfo(name){const fn=window[name];return {name,exists:typeof fn==='function',chain:typeof fn==='function'?chain(fn):null}}
function familyScan(f,scripts){
 const files=scripts.filter(x=>f.re.test(x)),versions=[...new Set(files.map(versionOf).filter(Boolean))];
 const functions=f.functions.map(fnInfo),cycles=functions.filter(x=>x.chain?.cycle),deep=functions.filter(x=>(x.chain?.depth||0)>12);
 const duplicateGeneration=versions.length>=3||files.length>=5;
 const status=cycles.length?'fail':deep.length||duplicateGeneration?'warn':'pass';
 return {id:f.id,label:f.label,status,files,versions,functions,cycles:cycles.map(x=>x.name),deep:deep.map(x=>({name:x.name,depth:x.chain.depth})),preferred:PREFERRED[f.id]||null};
}
function globalVersions(){
 const rows=[];for(const k of Object.keys(window)){if(!/^HLGB_/i.test(k))continue;let v;try{v=window[k]}catch(e){continue}if(typeof v==='string'&&/\d{2}\.\d{1,3}|\d{4}/.test(v))rows.push({key:k,value:v})}
 return rows.slice(0,120);
}
function scan(){
 const scripts=loadedScripts(),families=FAMILIES.map(f=>familyScan(f,scripts));
 const fail=families.filter(x=>x.status==='fail').length,warn=families.filter(x=>x.status==='warn').length;
 const retirement=[];
 for(const f of families){if(f.files.length>1){const sorted=f.files.map(x=>({file:x,version:versionOf(x)})).sort((a,b)=>sid(a.version).localeCompare(sid(b.version),undefined,{numeric:true}));retirement.push({family:f.id,label:f.label,candidates:sorted.slice(0,-1).map(x=>x.file),keepCandidate:sorted.at(-1)?.file||'',note:'Candidato técnico; só aposentar após teste funcional e comparação de responsabilidade.'})}}
 return {kind:'hlgb_authority_map',version:V,build:BUILD,at:new Date().toISOString(),appVersion:sid(window.HLGB_RELEASE_VERSION||''),scriptsCount:scripts.length,scripts,families,globalVersions:globalVersions(),retirementPlan:retirement,summary:{fail,warn,pass:families.length-fail-warn,result:fail?'Falhou':warn?'Atenção':'Aprovado'}};
}
function panel(report){
 const old=document.getElementById('hlgbAuthorityMap9374');if(old)old.remove();
 const host=document.getElementById('hlgbAuditorResult');if(!host)return false;
 const el=document.createElement('div');el.id='hlgbAuthorityMap9374';el.className='panel';el.style.cssText='border:1px solid #c9bfd0;background:#fcf9ff;margin:10px 0';
 const rows=report.families.map(f=>{const icon=f.status==='fail'?'🔴':f.status==='warn'?'🟡':'✅';const files=f.files.length?f.files.join(', '):'nenhum script identificado';const issues=[];if(f.cycles.length)issues.push('ciclo em '+f.cycles.join(', '));if(f.deep.length)issues.push('wrapper profundo: '+f.deep.map(x=>x.name+'('+x.depth+')').join(', '));if(f.versions.length>=3)issues.push(f.versions.length+' gerações de versão coexistindo');return '<div style="padding:8px 0;border-top:1px solid #eee"><b>'+icon+' '+esc(f.label)+'</b><div class="sub">Versões: '+esc(f.versions.join(', ')||'sem sufixo')+' · arquivos: '+f.files.length+'</div><div class="sub">'+esc(files)+'</div>'+(issues.length?'<div class="sub"><b>Conflito:</b> '+esc(issues.join(' | '))+'</div>':'')+'</div>'}).join('');
 el.innerHTML='<h3 style="margin-top:0">🧭 Arquitetura / Versões / Autoridades</h3><div class="sub">Somente leitura · '+V+' · objetivo: uma autoridade por responsabilidade.</div><div style="margin:8px 0"><b>Resultado:</b> '+esc(report.summary.result)+' · '+report.summary.fail+' falha(s) · '+report.summary.warn+' atenção(ões)</div>'+rows+'<div class="sub" style="margin-top:8px">O plano de aposentadoria é apenas diagnóstico: nenhum script é removido automaticamente.</div>';
 host.prepend(el);return true;
}
window.hlgbAuditorAuthorityScan9374=function(){const r=scan();panel(r);window.hlgbAuditorAuthority9374.last=r;return r};
function decorate(){const host=document.getElementById('hlgbAuditorResult');if(!host)return false;const actions=host.parentElement?.querySelector?.('.hlgb-auditor-actions')||document.querySelector('.hlgb-auditor-actions');if(actions&&!document.getElementById('hlgbAuthorityBtn9374')){const b=document.createElement('button');b.id='hlgbAuthorityBtn9374';b.type='button';b.className='secondary';b.textContent='🧭 Arquitetura / versões';b.onclick=()=>window.hlgbAuditorAuthorityScan9374();actions.appendChild(b)}return true}
document.addEventListener?.('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))[80,250,700].forEach(ms=>setTimeout(decorate,ms))},true);
window.HLGB_AUDITOR_AUTHORITY_9374=BUILD;
window.hlgbAuditorAuthority9374={version:V,build:BUILD,scan,panel,decorate,last:null,chain,loadedScripts,versionOf,FAMILIES};
if(window.hlgbAuditorDeep9373)window.hlgbAuditorDeep9373.authorityScan=scan;
setTimeout(decorate,500);
console.info('[HLGB] Auditor mapa de autoridades v'+V+' ativo');
})();
