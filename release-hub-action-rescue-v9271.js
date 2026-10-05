/* HLGB v92.74 — resgate leve de ações do Hub, sem varredura contínua */
(function(){
'use strict';
const V='92.74';
const sid=v=>String(v??'');
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const HUB_SELECTOR='#hubFinanceiro,#hubDue9166';
const ACTIONS={editHubFinanceEntry:'edit',quickEditHub9185:'edit',toggleHubFinanceEntry:'toggle',toggleHubQuick9185:'toggle',deleteHubFinanceEntry:'delete'};
function liveDb(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{if(window.db)return window.db}catch(e){}return null}
function bridgeDb(){const d=liveDb();if(d){try{if(window.db!==d)window.db=d}catch(e){}window.HLGB_HUB_DB_BRIDGE_LAST={at:new Date().toISOString(),ok:true,entries:Array.isArray(d?.hubFinanceEntries)?d.hubFinanceEntries.length:0}}return d}
function hub(){try{const d=bridgeDb();return Array.isArray(d?.hubFinanceEntries)?d.hubFinanceEntries:[]}catch(e){return []}}
function idOf(x){return x?.id??x?.__hlgbId}
function invalidId(id){const s=sid(id).trim().toLowerCase();return id==null||!s||s==='undefined'||s==='null'}
function repairEntryIds(){let fixed=0;for(const e of hub()){if(!e||!invalidId(e.id)||invalidId(e.__hlgbId))continue;try{e.id=e.__hlgbId;fixed++}catch(_){}}return fixed}
function insideHub(el){return !!el?.closest?.(HUB_SELECTOR)}
function parseCall(code){code=sid(code).trim();if(!code)return null;const name=Object.keys(ACTIONS).find(n=>new RegExp('\\b'+n+'\\s*\\(').test(code));if(!name)return null;const start=code.indexOf('(',code.indexOf(name));if(start<0)return null;let raw=code.slice(start+1);const close=raw.lastIndexOf(')');if(close>=0)raw=raw.slice(0,close);raw=raw.trim();let id;try{id=JSON.parse(raw)}catch(_){const quoted=raw.match(/^["']([^"']*)["']/);if(quoted)id=quoted[1];else{const num=raw.match(/^-?\d+(?:\.\d+)?/);if(num)id=Number(num[0]);else id=raw.replace(/[}\]\s;]+$/g,'').trim()}}return {name,kind:ACTIONS[name],id}}
function entryById(id){if(invalidId(id))return null;return hub().find(x=>sid(idOf(x))===sid(id))||null}
function moneyNumber(text){const s=sid(text).replace(/[^0-9,.-]/g,'');if(!s)return NaN;const n=Number(s.replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:NaN}
function candidateFromButton(btn){const item=btn?.closest?.('.hub9185-item');if(!item)return null;const value=moneyNumber(item.querySelector('.hub9185-value')?.textContent||'');const flow=norm(item.querySelector('.hub9185-flow')?.textContent||'');const statusText=norm(item.querySelector('.hub9185-status')?.textContent||'');const valueEl=item.querySelector('.hub9185-value');const descEl=[...item.querySelectorAll('b')].find(x=>x!==valueEl&&!x.closest('.hub9185-actions'));const description=norm(descEl?.textContent||'');const person=norm(item.querySelector('small')?.textContent||'');let rows=hub().filter(e=>{if(description&&norm(e?.description||e?.category||'')!==description)return false;if(flow&&norm(e?.flow)!==flow)return false;if(Number.isFinite(value)&&Math.abs(Number(e?.value||0)-value)>0.005)return false;if(person&&norm(e?.person||e?.origin||'')!==person)return false;const done=norm(e?.status)==='realizado';if(statusText&&(/pago|recebido/.test(statusText))!==done)return false;return true});rows=rows.filter(e=>!invalidId(idOf(e)));return rows.length===1?rows[0]:null}
function resolveId(call,btn){repairEntryIds();if(call&&!invalidId(call.id)&&entryById(call.id))return call.id;const e=candidateFromButton(btn);return e?idOf(e):null}
function run(call,btn){if(!call)return false;const id=resolveId(call,btn);if(invalidId(id))throw new Error('Não consegui identificar este lançamento com segurança. Atualize a tela e tente novamente.');if(call.kind==='edit'){const fn=window.hlgbHubEditor9270?.open||window.editHubFinanceEntry||window.quickEditHub9185;if(typeof fn!=='function')throw new Error('Editor do Hub não está disponível.');return fn(id)!==false}if(call.kind==='toggle'){const fn=window.toggleHubFinanceEntry||window.toggleHubQuick9185;if(typeof fn!=='function')throw new Error('Ação Pago/Recebido do Hub não está disponível.');return fn(id)!==false}if(call.kind==='delete'){const fn=window.deleteHubFinanceEntry;if(typeof fn!=='function')throw new Error('Exclusão do Hub não está disponível.');return fn(id)!==false}return false}
function onClick(ev){const btn=ev.target?.closest?.('button,[role="button"]');if(!btn||!insideHub(btn))return;const call=parseCall(btn.getAttribute('onclick')||'');if(!call)return;ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation?.();try{run(call,btn)}catch(err){console.error('[HLGB Hub Rescue '+V+']',err);try{alert('Não foi possível executar esta ação do Hub: '+String(err?.message||err))}catch(_){}}}
document.addEventListener('click',onClick,true);
function boot(){bridgeDb();repairEntryIds()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.hlgbHubActionRescue9271={version:V,parseCall,run,repairEntryIds,entryById,candidateFromButton,resolveId,bridgeDb};
console.info('[HLGB] Hub Action Rescue v'+V+' ativo — modo leve para Safari');
})();
