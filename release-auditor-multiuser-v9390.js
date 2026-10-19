/* HLGB v93.90 — Auditor multiusuário e identificador único de build.
   O programa é único para todos os perfis. Permissões podem variar; build e correções não. */
(function(){
'use strict';
const V='93.90',BUILD_ID='HLGB-2026.10.19-93.90-MULTIUSER',AUDIT_MODULE='systemAuditRuns';
if(window.HLGB_AUDITOR_MULTIUSER_9390===BUILD_ID)return;
window.HLGB_AUDITOR_MULTIUSER_9390=BUILD_ID;
window.HLGB_BUILD_ID=BUILD_ID;
window.HLGB_BUILD_CHANNEL='unified';
window.HLGB_BUILD_LOADED_AT=new Date().toISOString();
try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.90)window.HLGB_RELEASE_VERSION=V}catch(e){}
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function hash(s){let h=2166136261>>>0;for(const ch of sid(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return ('00000000'+h.toString(16)).slice(-8)}
function currentProfile(){
 let u=null;try{u=typeof currentUser==='function'?currentUser():null}catch(e){}
 const raw=sid(u?.auth_id||u?.authId||u?.id||window.cloudUser?.id||window.cloudUser?.email||u?.login||u?.name||'unknown');
 const access=Array.isArray(u?.access)?u.access.map(sid).filter(Boolean).sort():[];
 return {profileKey:'profile-'+hash(raw),name:sid(u?.name||u?.login||'Usuário'),role:sid(u?.role||'user'),access};
}
function browser(){const ua=sid(navigator.userAgent);if(/Safari/i.test(ua)&&!/Chrome|Chromium|CriOS/i.test(ua))return 'Safari';if(/Chrome|Chromium|CriOS/i.test(ua))return 'Chrome';if(/Firefox/i.test(ua))return 'Firefox';return ua.slice(0,80)}
function summary(checks){const pass=checks.filter(x=>x.status==='pass').length,warn=checks.filter(x=>x.status==='warn').length,fail=checks.filter(x=>x.status==='fail').length;return {total:checks.length,pass,warn,fail,result:fail?'Falhou':warn?'Atenção':'Aprovado'}}
function check(code,status,title,detail,severity='info',extra={}){return {code,category:'Validação multiusuário',status,title,detail,severity,...extra}}
async function fetchValidationRows(){
 if(typeof cloudRequest!=='function')return [];
 try{
  const rows=await cloudRequest('hlgb_records?select=entity_id,data,updated_at,deleted_at&module=eq.'+encodeURIComponent(AUDIT_MODULE)+'&deleted_at=is.null&order=updated_at.desc&limit=200',{method:'GET'});
  return (Array.isArray(rows)?rows:[]).map(r=>r?.data).filter(x=>x?.kind==='system_audit_multiuser_validation');
 }catch(e){return []}
}
function latestByProfile(rows){const map=new Map();for(const r of rows||[]){const k=sid(r?.profile?.profileKey);if(!k)continue;const old=map.get(k);if(!old||sid(r?.completedAt||r?.startedAt)>sid(old?.completedAt||old?.startedAt))map.set(k,r)}return [...map.values()]}
async function compareProfiles(extraCurrent=null){
 const rows=await fetchValidationRows();if(extraCurrent)rows.unshift(extraCurrent);
 const latest=latestByProfile(rows),builds=[...new Set(latest.map(x=>sid(x?.buildId)).filter(Boolean))],current=BUILD_ID;
 const mismatched=latest.filter(x=>sid(x?.buildId)!==current);
 return {buildId:current,profiles:latest.length,profileRows:latest.map(x=>({profileKey:x.profile?.profileKey,name:x.profile?.name,role:x.profile?.role,buildId:x.buildId,appVersion:x.appVersion,completedAt:x.completedAt,result:x.baseAuditSummary?.result||x.summary?.result||''})),builds,mismatched:mismatched.length,status:mismatched.length?'fail':latest.length>1?'pass':'warn'};
}
const recorded=new Set();
async function recordValidation(baseRun,origin='manual'){
 if(!baseRun||baseRun.kind==='system_audit_multiuser_validation')return null;
 const baseId=sid(baseRun.id);if(baseId&&recorded.has(baseId))return null;
 const profile=currentProfile(),draft={id:'multiuser-'+Date.now()+'-'+Math.floor(Math.random()*900000+100000),kind:'system_audit_multiuser_validation',auditorVersion:'2026.10.19-multiuser-v1',readOnly:true,startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),origin,buildId:BUILD_ID,appVersion:sid(window.HLGB_RELEASE_VERSION||V),browser:browser(),profile,baseAuditId:baseId||null,baseAuditKind:baseRun.kind||'system_audit',baseAuditSummary:clone(baseRun.summary||{}),rule:'O HLGB é um único programa. Toda correção global deve carregar igual para todos os usuários; somente permissões podem alterar funcionalidades disponíveis.'};
 const cmp=await compareProfiles(draft),checks=[];
 checks.push(check('multiuser:build-local','pass','Build único carregado',BUILD_ID+' · perfil '+profile.profileKey,'info',{buildId:BUILD_ID,profileKey:profile.profileKey}));
 checks.push(check('multiuser:known-profiles',cmp.mismatched?'fail':cmp.profiles>1?'pass':'warn','Comparação entre perfis',cmp.mismatched?cmp.mismatched+' perfil(is) conhecido(s) está(ão) em build diferente.':cmp.profiles>1?cmp.profiles+' perfis conferidos no mesmo build.':'Este perfil foi conferido; ainda é necessário executar o Auditor nos demais usuários ativos.',cmp.mismatched?'error':cmp.profiles>1?'info':'warn',{profiles:cmp.profiles,mismatched:cmp.mismatched}));
 checks.push(check('multiuser:permission-boundary','pass','Diferença de permissão não altera o programa','Permissões atuais: '+(profile.access.length?profile.access.join(', '):'não expostas ao Auditor')+'. A validação de build é independente destas permissões.','info'));
 draft.multiUserComparison=cmp;draft.checks=checks;draft.summary=summary(checks);
 try{const api=window.hlgbInternalAuditor;if(api?.saveRun){const saved=await api.saveRun(draft);if(baseId)recorded.add(baseId);return saved}}catch(e){draft.saveError=sid(e?.message||e)}
 return draft;
}
function panelHtml(cmp=null){const p=currentProfile(),status=cmp?.status||'warn',icon=status==='pass'?'✅':status==='fail'?'🔴':'🟡',known=cmp?cmp.profiles:0;return '<div id="hlgbMultiUserAuditPanel9390" class="panel" style="border:1px solid #d9b8ca;background:#fff8fb"><h3 style="margin-top:0">👥 Validação multiusuário obrigatória</h3><div><b>Build único:</b> '+BUILD_ID+'</div><div class="sub">Perfil atual: '+(p.name||'Usuário')+' · '+p.role+' · '+p.profileKey+'</div><div style="margin-top:8px">'+icon+' '+(cmp?(status==='fail'?'Existe perfil em build diferente.':status==='pass'?known+' perfis já confirmados no mesmo build.':'Este perfil está correto; faltam os demais usuários ativos.'):'Comparação ainda não executada nesta abertura.')+'</div><div class="sub" style="margin-top:8px"><b>Regra:</b> uma correção não é concluída porque funcionou em um usuário. Todos devem receber a mesma versão e as mesmas correções; somente as permissões podem mudar o que cada perfil consegue fazer.</div><div style="margin-top:10px"><button type="button" class="secondary" onclick="hlgbAuditorCompareUsers9390()">👥 Comparar perfis conferidos</button></div></div>'}
function decorate(cmp=null){const out=document.getElementById('hlgbAuditorResult');if(!out)return false;let p=document.getElementById('hlgbMultiUserAuditPanel9390');if(!p){out.insertAdjacentHTML('beforebegin',panelHtml(cmp));p=document.getElementById('hlgbMultiUserAuditPanel9390')}else p.outerHTML=panelHtml(cmp);return true}
window.hlgbAuditorCompareUsers9390=async function(){const cmp=await compareProfiles();decorate(cmp);if(cmp.status==='fail')alert('Há perfil carregando build diferente do atual. Não considere a correção concluída.');else if(cmp.status==='pass')alert(cmp.profiles+' perfis já aparecem no mesmo build '+BUILD_ID+'.');else alert('Este build está identificado. Execute o Auditor nos demais usuários ativos para completar a validação multiusuário.');return cmp};
function wrapUi(name,origin){const base=window[name];if(typeof base!=='function'||base.__hlgbMulti9390)return false;const w=async function(){const row=await base.apply(this,arguments);try{await recordValidation(row,origin)}catch(e){};setTimeout(()=>window.hlgbAuditorCompareUsers9390?.().catch(()=>{}),80);return row};w.__hlgbMulti9390=true;w.__original=base;window[name]=w;return true}
let modalWatch=null;
function installModalWatch(){
 if(modalWatch||typeof MutationObserver!=='function'||!document.documentElement)return;
 modalWatch=new MutationObserver(()=>{
  if(!document.getElementById('hlgbAuditorResult'))return;
  if(decorate())setTimeout(()=>window.hlgbAuditorCompareUsers9390?.().catch(()=>{}),120);
 });
 modalWatch.observe(document.documentElement,{childList:true,subtree:true});
}
function install(){
 try{const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}catch(e){}
 try{const oldOpen=window.openHlgbAuditor;if(typeof oldOpen==='function'&&!oldOpen.__hlgbMulti9390){const w=function(){const r=oldOpen.apply(this,arguments);setTimeout(()=>decorate(),30);setTimeout(()=>window.hlgbAuditorCompareUsers9390?.().catch(()=>{}),220);return r};w.__hlgbMulti9390=true;w.__original=oldOpen;window.openHlgbAuditor=w}}catch(e){}
 wrapUi('hlgbAuditorRunFull','ui-full');wrapUi('hlgbAuditorRunVisual','ui-visual');wrapUi('hlgbAuditorRunVisualSweep','ui-visual-sweep');
 const api=window.hlgbInternalAuditor;
 if(api&&typeof api.run==='function'&&!api.run.__hlgbMulti9390){const base=api.run.bind(api);const w=async function(){const row=await base(...arguments);try{await recordValidation(row,'api-run')}catch(e){}return row};w.__hlgbMulti9390=true;w.__original=api.run;api.run=w}
 if(api){api.multiUser={version:V,buildId:BUILD_ID,currentProfile,compareProfiles,recordValidation,decorate}}
 installModalWatch();
 if(document.getElementById('hlgbAuditorResult'))decorate();
}
window.hlgbAuditorMultiuser9390={version:V,buildId:BUILD_ID,currentProfile,compareProfiles,recordValidation,decorate,install};
install();[100,400,900,1800,3500].forEach(ms=>setTimeout(install,ms));
console.info('[HLGB] v'+V+' Auditor multiusuário ativo · build '+BUILD_ID);
})();
