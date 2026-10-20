/* HLGB v93.92 — validação multiusuário visível no Auditor */
(function(){
'use strict';
const V='93.92',BUILD='HLGB-2026.10.19-93.92-MULTIUSER';
if(window.HLGB_AUDITOR_MULTIUSER_9390===BUILD)return;
window.HLGB_AUDITOR_MULTIUSER_9390=BUILD;
window.HLGB_BUILD_ID=BUILD;
window.HLGB_BUILD_CHANNEL='unified';
try{if((parseFloat(window.HLGB_RELEASE_VERSION)||0)<93.92)window.HLGB_RELEASE_VERSION=V}catch(e){}
function profile(){let u=null;try{u=typeof currentUser==='function'?currentUser():null}catch(e){}return {name:String(u?.name||u?.login||'Usuário'),role:String(u?.role||'user')}}
async function expected(){if(typeof cloudRequest!=='function')return null;try{const r=await cloudRequest('rpc/hlgb_active_profile_count',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const x=Array.isArray(r)?r[0]:r,n=Number(x?.hlgb_active_profile_count??x?.count??x);return Number.isFinite(n)&&n>0?n:null}catch(e){return null}}
function html(n){const p=profile(),boot=window.HLGB_BOOT_READ_COALESCE_9393?.version||'não ativo';return '<div id="hlgbMultiUserAuditPanel9390" class="panel" style="border:1px solid #d9b8ca;background:#fff8fb"><h3 style="margin-top:0">👥 Validação multiusuário obrigatória</h3><div><b>Build único:</b> '+BUILD+'</div><div><b>Perfil atual:</b> '+p.name+' · '+p.role+'</div><div><b>Perfis ativos:</b> '+(n||'não confirmado')+'</div><div><b>Corretor de entrada:</b> v'+boot+'</div><div class="sub" style="margin-top:8px">Todos os perfis devem carregar o mesmo programa. Somente as permissões podem variar.</div><div style="margin-top:10px"><button type="button" class="secondary" onclick="hlgbAuditorCompareUsers9390()">👥 Conferir agora</button></div></div>'}
async function decorate(){const out=document.getElementById('hlgbAuditorResult');if(!out)return false;const n=await expected();let p=document.getElementById('hlgbMultiUserAuditPanel9390');if(!p){out.insertAdjacentHTML('beforebegin',html(n));p=document.getElementById('hlgbMultiUserAuditPanel9390')}else p.outerHTML=html(n);return true}
window.hlgbAuditorCompareUsers9390=async function(){await decorate();return {buildId:BUILD,expectedProfiles:await expected(),bootRead:window.HLGB_BOOT_READ_COALESCE_9393?.version||''}}
function afterOpen(){[20,100,300,700,1400].forEach(ms=>setTimeout(()=>decorate().catch(()=>{}),ms))}
function install(){const base=window.openHlgbAuditor;if(typeof base==='function'&&!base.__hlgbMulti9390){const w=function(){const r=base.apply(this,arguments);afterOpen();return r};w.__hlgbMulti9390=true;w.__original=base;window.openHlgbAuditor=w}document.addEventListener?.('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))afterOpen()},{capture:true,once:false});if(document.getElementById('hlgbAuditorResult'))decorate().catch(()=>{})}
window.hlgbAuditorMultiuser9390={version:V,buildId:BUILD,decorate,install};install();setTimeout(install,500);setTimeout(install,1500);console.info('[HLGB] validação multiusuário v'+V+' ativa');
})();