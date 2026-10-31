/* HLGB v94.38 — estabilidade específica da tela Relatórios.
   Preserva rolagem, foco, valor/seleção do filtro ativo durante renderReports.
   Não altera dados de negócio nem interfere na navegação para outra tela. */
(function(){
'use strict';
const V='94.38';
if(window.HLGB_REPORTS_STABILITY_9438===V)return;
window.HLGB_REPORTS_STABILITY_9438=V;
const state={version:V,installed:false,wraps:0,renders:0,restores:0,lastDelta:0,lastAt:'',lastError:''};
const sid=v=>String(v??'');
function activePage(){try{return document.querySelector('#appShell .page.active,.page.active')}catch(e){return null}}
function keyFor(el){if(!el)return null;if(el.id)return {kind:'id',value:el.id};if(el.name)return {kind:'name',value:el.name,tag:el.tagName};const p=el.getAttribute?.('data-field')||el.getAttribute?.('data-filter')||el.getAttribute?.('data-key');return p?{kind:'data',value:p,tag:el.tagName}:null}
function findByKey(root,key){if(!root||!key)return null;try{if(key.kind==='id')return document.getElementById(key.value);if(key.kind==='name')return root.querySelector(key.tag+'[name="'+CSS.escape(key.value)+'"]');return root.querySelector(key.tag+'[data-field="'+CSS.escape(key.value)+'"],'+key.tag+'[data-filter="'+CSS.escape(key.value)+'"],'+key.tag+'[data-key="'+CSS.escape(key.value)+'"]')}catch(e){return null}}
function snap(){const root=activePage(),ae=document.activeElement,editable=ae&&root?.contains(ae)&&/^(INPUT|SELECT|TEXTAREA)$/i.test(ae.tagName);return {pageId:root?.id||'',windowX:window.scrollX||0,windowY:window.scrollY||0,rootTop:root?.scrollTop||0,rootLeft:root?.scrollLeft||0,focusKey:editable?keyFor(ae):null,value:editable?'value'in ae?ae.value:null:null,selection:editable&&typeof ae.selectionStart==='number'?[ae.selectionStart,ae.selectionEnd]:null}}
function samePage(before){const root=activePage();return !!root&&(!before.pageId||root.id===before.pageId)}
function restore(before){if(!before||!samePage(before))return false;const root=activePage(),dy=Math.abs((window.scrollY||0)-before.windowY),dr=Math.abs((root?.scrollTop||0)-before.rootTop);let changed=dy>8||dr>8;try{window.scrollTo(before.windowX,before.windowY)}catch(e){}try{if(root){root.scrollTop=before.rootTop;root.scrollLeft=before.rootLeft}}catch(e){}if(before.focusKey){const el=findByKey(root,before.focusKey);if(el){try{if(before.value!=null&&'value'in el&&el.value!==before.value)el.value=before.value}catch(e){}try{el.focus({preventScroll:true})}catch(e){try{el.focus()}catch(_){}}try{if(before.selection&&typeof el.setSelectionRange==='function')el.setSelectionRange(before.selection[0],before.selection[1])}catch(e){}changed=true}}
 if(changed){state.restores++;state.lastDelta=Math.max(dy,dr);state.lastAt=new Date().toISOString()}return changed}
function chainHas(fn){const seen=new Set();let cur=fn,n=0;while(typeof cur==='function'&&!seen.has(cur)&&n++<80){if(cur.__hlgbReportsStability9438)return true;seen.add(cur);cur=cur.__original||cur.__hlgbRapidRender9437||cur.__hlgb9320Original||cur.__hlgbReliableOriginal}return false}
function install(){let fn=window.renderReports;if(typeof fn!=='function')return false;if(chainHas(fn)){state.installed=true;return true}const wrapped=function(){const before=snap();state.renders++;let out;try{out=fn.apply(this,arguments)}catch(e){state.lastError=sid(e?.message||e);throw e}const finish=()=>{try{restore(before);requestAnimationFrame(()=>restore(before));setTimeout(()=>restore(before),80)}catch(e){state.lastError=sid(e?.message||e)}};if(out&&typeof out.then==='function')return Promise.resolve(out).then(v=>{finish();return v},e=>{finish();throw e});finish();return out};wrapped.__hlgbReportsStability9438=true;wrapped.__original=fn;window.renderReports=wrapped;state.installed=true;state.wraps++;return true}
function activate(){[0,80,250,700,1500,3000].forEach(ms=>setTimeout(install,ms));return true}
window.hlgbReportsStability9438={version:V,state,install,activate,status:()=>({...state,page:activePage()?.id||''})};
window.addEventListener('hlgb:authenticated',activate);
if(window.__HLGB_AUTH_READY===true)activate();
console.info('[HLGB] v'+V+' estabilidade de Relatórios ativa');
})();
