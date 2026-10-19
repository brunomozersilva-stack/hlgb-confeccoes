/* HLGB v93.92 — Auditor multiusuário e identificador único de build.
   O programa é único para todos os perfis. Permissões podem variar; build e correções não. */
(function(){
'use strict';
const V='93.92',BUILD_ID='HLGB-2026.10.19-93.92-MULTIUSER',AUDIT_MODULE='systemAuditRuns';
if(window.HLGB_AUDITOR_MULTIUSER_9390===BUILD_ID)return;
window.HLGB_AUDITOR_MULTIUSER_9390=BUILD_ID;
window.HLGB_BUILD_ID=BUILD_ID;
window.HLGB_BUILD_CHANNEL='unified';
window.HLGB_BUILD_LOADED_AT=new Date().toISOString();
try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.92)window.HLGB_RELEASE_VERSION=V}catch(e){}
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function hash(s){let h=2166136261>>>0;for(const ch of sid(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return ('00000000'+h.toString(16)).slice(-8)}
function currentProfile(){
 let u=null;try{u=typeof currentUser==='function'?currentUser():null}catch(e){}
 const raw=sid(u?.auth_id||u?.authId||u?.id||window.cloudUser?.id||window.cloudUser?.email||u?.login||u?.name||'unknown');
 const rawAccess=u?.access;
 const access=Array.isArray(rawAccess)?rawAccess.map(sid).filter(Boolean).sort():rawAccess&&typeof rawAccess==='object'?Object.keys(rawAccess).filter(k=>rawAccess[k]).map(sid).sort():[];
 return {profileKey:'profile-'+hash(raw),name:sid(u?.name||u?.login||'Usuário'),role:sid(u?.role||'user'),access};
}
function browser(){const ua=sid(navigator.userAgent);if(/Safari/i.test(ua)&&!/Chrome|Chromium|CriOS/i.test(ua))return 'Safari';if(/Chrome|Chromium|CriOS/i.test(ua))return 'Chrome';if(/Firefox/i.test(ua))return 'Firefox';return ua.slice(0,80)}
function summary(checks){const pass=checks.filter(x=>x.status==='pass').length,warn=checks.filter(x=>x.status==='warn').length,fail=checks.filter(x=>x.status==='fail').length;return {total:checks.length,pass,warn,fail,result:fail?'Falhou':warn?'Atenção':'Aprovado'}}
function check(code,status,title,detail,severity='info',extra={}){return {code,category:'Validação multiusuário',status,title,detail,severity,...extra}}
async function fetchValidationRows(){
 if(typeof cloudRequest!=='function')return [];
 try{const rows=await cloudRequest('hlgb_records?select=entity_id,data,updated_at,deleted_at&module=eq.'+encodeURIComponent(AUDIT_MODULE)+'&deleted_at=is.null&order=updated_at.desc&limit=200',{method:'GET'});return (Array.isArray(rows)?rows:[]).map(r=>r?.data).filter(x=>x?.kind==='system_audit_multiuser_validation')}catch(e){return []}
}
async function fetchExpectedProfiles(){
 if(typeof cloudRequest!=='function')return null;
 try{
  const out=await cloudRequest('rpc/hlgb_active_profile_count',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const raw=Array.isArray(out)?out[0]:out;
  const value=Number(raw?.hlgb_active_profile_count??raw?.count??raw);
  return Number.isFinite(value)&&value>0?Math.floor(value):null;
 }catch(e){console.warn('[HLGB v'+V+'] total de perfis ativos indisponível para Auditor',e);return null}
}
function latestByProfile(rows){const map=new Map();for(const r of rows||[]){const k=sid(r?.profile?.profileKey);if(!k)continue;const old=map.get(k);if(!old||sid(r?.completedAt||r?.startedAt)>sid(old?.completedAt||old?.startedAt))map.set(k,r)}return [...map.values()]}
async function compareProfiles(extraCurrent=null){
 const [rows,expectedProfiles]=await Promise.all([fetchValidationRows(),fetchExpectedProfiles()]);if(extraCurrent)rows.unshift(extraCurrent);
 const latest=latestByProfile(rows),current=BUILD_ID,mismatched=latest.filter(x=>sid(x?.buildId)!==current),missing=expectedProfiles?Math.max(0,expectedProfiles-latest.length):null;
 const status=mismatched.length?'fail':expectedProfiles&&latest.length>=expectedProfiles?'pass':'warn';
 return {buildId:current,profiles:latest.length,expectedProfiles,missing,profileRows:latest.map(x=>({profileKey:x.profile?.profileKey,name:x.profile?.name,role:x.profile?.role,buildId:x.buildId,appVersion:x.appVersion,completedAt:x.completedAt,result:x.baseAuditSummary?.result||x.summary?.result||''})),builds:[...new Set(latest.map(x=>sid(x?.buildId)).filter(Boolean))],mismatched:mismatched.length,status};
}
const recorded=new Set();
async function recordValidation(baseRun,origin='manual'){
 if(!baseRun||baseRun.kind==='system_audit_multiuser_validation')return null;
 const baseId=sid(baseRun.id);if(baseId&&recorded.has(baseId))return null;
 const profile=currentProfile(),draft={id:'multiuser-'+Date.now()+'-'+Math.floor(Math.random()*900000+100000),kind:'system_audit_multiuser_validation',auditorVersion:'2026.10.19-multiuser-v5',readOnly:true,startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),origin,buildId:BUILD_ID,appVersion:sid(window.HLGB_RELEASE_VERSION||V),browser:browser(),profile,baseAuditId:baseId||null,baseAuditKind:baseRun.kind||'system_audit',baseAuditSummary:clone(baseRun.summary||{}),rule:'O HLGB é um único programa. Toda correção global deve carregar igual para todos os usuários; somente permissões podem alterar funcionalidades disponíveis.'};
 const cmp=await compareProfiles(draft),checks=[];
 checks.push(check('multiuser:build-local','pass','Build único carregado',BUILD_ID+' · perfil '+profile.profileKey,'info',{buildId:BUILD_ID,profileKey:profile.profileKey}));
 const complete=cmp.status==='pass';
 const detail=cmp.mismatched?cmp.mismatched+' perfil(is) conhecido(s) está(ão) em build diferente.':complete?cmp.profiles+' de '+cmp.expectedProfiles+' perfis ativos conferidos no mesmo build.':cmp.expectedProfiles?cmp.profiles+' de '+cmp.expectedProfiles+' perfis ativos conferidos; faltam '+cmp.missing+'.':'Este perfil foi conferido, mas o total de perfis ativos não pôde ser confirmado; não considerar a validação concluída.';
 checks.push(check('multiuser:known-profiles',cmp.mismatched?'fail':complete?'pass':'warn','Comparação entre todos os perfis ativos',detail,cmp.mismatched?'error':complete?'info':'warn',{profiles:cmp.profiles,expectedProfiles:cmp.expectedProfiles,missing:cmp.missing,mismatched:cmp.mismatched}));
 checks.push(check('multiuser:permission-boundary','pass','Diferença de permissão não altera o programa','Permissões atuais: '+(profile.access.length?profile.access.join(', '):'não expostas ao Auditor')+'. A validação de build é independente destas permissões.','info'));
 draft.multiUserComparison=cmp;draft.checks=checks;draft.summary=summary(checks);
 try{const api=window.hlgbInternalAuditor;if(api?.saveRun){const saved=await api.saveRun(draft);if(baseId)recorded.add(baseId);return saved}}catch(e){draft.saveError=sid(e?.message||e)}
 return draft;
}
function panelHtml(cmp=null){
 const p=currentProfile(),status=cmp?.status||'warn',icon=status==='pass'?'✅':status==='fail'?'🔴':'🟡',known=cmp?cmp.profiles:0,expected=cmp?.expectedProfiles||null;
 const progress=expected?known+' de '+expected+' perfis ativos':known+' perfil(is) conferido(s)';
 const msg=cmp?(status==='fail'?'Existe perfil em build diferente.':status==='pass'?progress+' no mesmo build.':expected?progress+'; ainda faltam '+Math.max(0,expected-known)+'.':'Total de perfis ativos indisponível; validação não concluída.'):'Comparação ainda não executada nesta abertura.';
 return '<div id="hlgbMultiUserAuditPanel9390" class="panel" style="border:1px solid #d9b8ca;background:#fff8fb"><h3 style="margin-top:0">👥 Validação multiusuário obrigatória</h3><div><b>Build único:</b> '+BUILD_ID+'</div><div class="sub">Perfil atual: '+(p.name||'Usuário')+' · '+p.role+' · '+p.profileKey+'</div><div style="margin-top:8px">'+icon+' '+msg+'</div><div class="sub" style="margin-top:8px"><b>Regra:</b> uma correção não é concluída porque funcionou em um usuário. Todos os perfis ativos devem receber a mesma versão e as mesmas correções; somente as permissões podem mudar o que cada perfil consegue fazer.</div><div style="margin-top:10px"><button type="button" class="secondary" onclick="hlgbAuditorCompareUsers9390()">👥 Comparar perfis conferidos</button></div></div>'
}
function decorate(cmp=null){const out=document.getElementById('hlgbAuditorResult');if(!out)return false;let p=document.getElementById('hlgbMultiUserAuditPanel9390');if(!p){out.insertAdjacentHTML('beforebegin',panelHtml(cmp));p=document.getElementById('hlgbMultiUserAuditPanel9390')}else p.outerHTML=panelHtml(cmp);return !!p}
window.hlgbAuditorCompareUsers9390=async function(){const cmp=await compareProfiles();decorate(cmp);if(cmp.status==='fail')alert('Há perfil carregando build diferente do atual. Não considere a correção concluída.');else if(cmp.status==='pass')alert(cmp.profiles+' de '+cmp.expectedProfiles+' perfis ativos aparecem no mesmo build '+BUILD_ID+'.');else if(cmp.expectedProfiles)alert(cmp.profiles+' de '+cmp.expectedProfiles+' perfis ativos foram conferidos. Ainda faltam '+cmp.missing+'.');else alert('Não foi possível confirmar o total de perfis ativos. A validação multiusuário permanece pendente.');return cmp};
function afterAuditorOpened(){setTimeout(()=>{if(!document.getElementById('hlgbAuditorResult'))return;if(decorate())window.hlgbAuditorCompareUsers9390?.().catch(()=>{})},40)}
function wrapOpen(){
 const base=window.openHlgbAuditor;if(typeof base!=='function'||base.__hlgbMulti9390)return false;
 const w=function(){const r=base.apply(this,arguments);afterAuditorOpened();return r};
 w.__hlgbMulti9390=true;w.__original=base;window.openHlgbAuditor=w;return true;
}
let clickBridgeInstalled=false;
function installClickBridge(){
 if(clickBridgeInstalled||typeof document?.addEventListener!=='function')return;
 document.addEventListener('click',ev=>{
  const target=ev?.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn');
  if(!target)return;
  afterAuditorOpened();
 },true);
 clickBridgeInstalled=true;
}
function wrapUi(name,origin){const base=window[name];if(typeof base!=='function'||base.__hlgbMulti9390)return false;const w=async function(){const row=await base.apply(this,arguments);try{await recordValidation(row,origin)}catch(e){};setTimeout(()=>window.hlgbAuditorCompareUsers9390?.().catch(()=>{}),80);return row};w.__hlgbMulti9390=true;w.__original=base;window[name]=w;return true}
function install(){
 try{const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}catch(e){}
 installClickBridge();wrapOpen();
 wrapUi('hlgbAuditorRunFull','ui-full');wrapUi('hlgbAuditorRunVisual','ui-visual');wrapUi('hlgbAuditorRunVisualSweep','ui-visual-sweep');
 const api=window.hlgbInternalAuditor;if(api)api.multiUser={version:V,buildId:BUILD_ID,currentProfile,compareProfiles,recordValidation,decorate,fetchExpectedProfiles};
 if(document.getElementById('hlgbAuditorResult'))decorate();
}
window.hlgbAuditorMultiuser9390={version:V,buildId:BUILD_ID,currentProfile,compareProfiles,recordValidation,decorate,fetchExpectedProfiles,install};
install();[100,400,900,1800,3500].forEach(ms=>setTimeout(install,ms));
console.info('[HLGB] v'+V+' Auditor multiusuário ativo · build '+BUILD_ID);
})();
