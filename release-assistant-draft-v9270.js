/* HLGB v92.70 — rascunho conversacional de pedidos + limpeza estável de envio */
(function(){
'use strict';
const V='92.70';
const KEY='hlgb_assistant_order_draft_v9270';
const sid=v=>String(v??'');
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function arr(n){try{return Array.isArray(window.db?.[n])?window.db[n]:[]}catch(e){return []}}
function read(){try{const x=JSON.parse(sessionStorage.getItem(KEY)||'null');return x&&typeof x==='object'?x:null}catch(e){return null}}
function write(x){try{sessionStorage.setItem(KEY,JSON.stringify(x));return x}catch(e){return x}}
function clear(){try{sessionStorage.removeItem(KEY)}catch(e){};return null}
function clientNames(){return [...new Set([...arr('clients').map(x=>x?.name),...arr('orders').map(x=>x?.client)].filter(Boolean))].sort((a,b)=>sid(b).length-sid(a).length)}
function productNames(){return [...new Set(arr('products').map(x=>x?.name).filter(Boolean))].sort((a,b)=>sid(b).length-sid(a).length)}
function inferName(raw,names){const n=norm(raw);return names.find(x=>n.includes(norm(x)))||''}
function isStart(raw){const n=norm(raw);return /(vou\s+(?:ir\s+)?somando\s+(?:um\s+)?pedido|vamos\s+(?:montar|somar|anotar)\s+(?:um\s+)?pedido|quero\s+(?:montar|somar|anotar)\s+(?:um\s+)?pedido|vou\s+(?:montar|passar|anotar)\s+(?:um\s+)?pedido|montando\s+(?:um\s+)?pedido)/.test(n)}
function isCancel(raw){return /^(cancelar|limpar|apagar|zerar)(\s+(o\s+)?)?(rascunho|pedido)?\s*$/i.test(norm(raw))||/cancelar\s+(o\s+)?pedido/.test(norm(raw))}
function isPreview(raw){return /(mostrar|ver|manda|me da|me dê|quero)\s+(a\s+)?previ(a|á)|previ(a|á)\s+(do\s+)?pedido|como\s+ficou/.test(norm(raw))}
function isFinish(raw){return /(finalizar|fechar|concluir)\s+(o\s+)?(rascunho|pedido)/.test(norm(raw))}
function gradeLike(raw){return /(?:\b\d+\s*(?:pp|p|m|g|gg|xg|eg)\b|\b(?:pp|p|m|g|gg|xg|eg)\s*\d+\b)/i.test(norm(raw))}
function parseGrade(raw,previousColor=''){
 const pieces=sid(raw).split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean),rows=[];let carry=previousColor||'';
 const sizeRe=/(\d+)\s*(PP|GG|XG|EG|P|M|G)\b|\b(PP|GG|XG|EG|P|M|G)\s*(\d+)/ig;
 for(const piece of pieces){
   const matches=[...piece.matchAll(sizeRe)];if(!matches.length)continue;
   let color=piece.replace(sizeRe,' ').replace(/\b(pe[cç]as?|unidades?|unds?|und)\b/ig,' ').replace(/\s+/g,' ').trim().replace(/^[-–—:\s]+|[-–—:\s]+$/g,'');
   if(color)carry=color; else color=carry||'Sem cor';
   for(const m of matches){const qty=Number(m[1]||m[4]||0),size=sid(m[2]||m[3]).toUpperCase();if(qty>0&&size)rows.push({color:color||'Sem cor',size,qty})}
 }
 return {rows,lastColor:carry};
}
function mergeItems(items,newRows){const map=new Map();for(const x of [...(items||[]),...(newRows||[])]){const key=norm(x.color)+'|'+sid(x.size).toUpperCase(),cur=map.get(key)||{color:x.color,size:sid(x.size).toUpperCase(),qty:0};cur.qty+=Number(x.qty)||0;map.set(key,cur)}return [...map.values()].sort((a,b)=>sid(a.color).localeCompare(sid(b.color),'pt-BR')||['PP','P','M','G','GG','XG','EG'].indexOf(a.size)-['PP','P','M','G','GG','XG','EG'].indexOf(b.size))}
function total(d){return (d?.items||[]).reduce((a,x)=>a+(Number(x.qty)||0),0)}
function answerHtml(title,body){const el=document.getElementById('hlgbAssistantAnswer');if(!el)return false;el.innerHTML='<h3>'+esc(title)+'</h3>'+body;return true}
function preview(d,message='Rascunho atualizado.'){const rows=d.items||[];const grouped=new Map();for(const x of rows){if(!grouped.has(x.color))grouped.set(x.color,[]);grouped.get(x.color).push(x)}const table=[...grouped.entries()].map(([color,items])=>'<tr><td><b>'+esc(color)+'</b></td><td>'+items.map(x=>esc(x.size)+' '+Number(x.qty).toLocaleString('pt-BR')).join(' · ')+'</td><td><b>'+items.reduce((a,x)=>a+Number(x.qty||0),0).toLocaleString('pt-BR')+'</b></td></tr>').join('');const meta=[d.client?'Cliente: <b>'+esc(d.client)+'</b>':'Cliente: <b>a definir</b>',d.product?'Produto: <b>'+esc(d.product)+'</b>':'Produto: <b>a definir</b>'].join(' · ');return answerHtml('🧾 Rascunho do pedido','<div>'+esc(message)+'</div><div style="margin:8px 0">'+meta+'</div>'+(rows.length?'<div style="overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:6px">Cor</th><th style="text-align:left;padding:6px">Grade</th><th style="text-align:right;padding:6px">Total</th></tr></thead><tbody>'+table+'</tbody></table></div><div style="margin-top:9px"><b>Total: '+total(d).toLocaleString('pt-BR')+' peças</b></div>':'<div class="sub">Ainda não recebi a grade. Pode continuar ditando, por exemplo: <b>Preto P10 M20 G20 GG10</b>.</div>')+'<div class="sub" style="margin-top:10px">Esse é apenas um rascunho. Nada foi salvo no pedido real.</div>')}
function begin(raw){const parsed=parseGrade(raw,''),d={active:true,client:inferName(raw,clientNames()),product:inferName(raw,productNames()),items:parsed.rows,lastColor:parsed.lastColor,startedAt:Date.now(),updatedAt:Date.now()};write(d);preview(d,'Comecei a somar esse pedido. Pode continuar me passando cores, tamanhos e quantidades.');return true}
function handle(raw){raw=sid(raw).trim();if(!raw)return false;let d=read();if(isStart(raw))return begin(raw);if(!d?.active)return false;if(isCancel(raw)){clear();answerHtml('Rascunho cancelado','<div>O rascunho do pedido foi limpo. Nenhum dado real foi alterado.</div>');return true}if(isPreview(raw)){preview(d,'Aqui está a prévia acumulada até agora.');return true}if(isFinish(raw)){preview(d,'A soma está pronta para conferência. Para segurança, eu não criei nem alterei o pedido automaticamente.');return true}
 const client=inferName(raw,clientNames()),product=inferName(raw,productNames());if(client)d.client=client;if(product)d.product=product;
 if(gradeLike(raw)){const parsed=parseGrade(raw,d.lastColor||'');d.items=mergeItems(d.items,parsed.rows);d.lastColor=parsed.lastColor||d.lastColor;d.updatedAt=Date.now();write(d);preview(d,parsed.rows.length?'Somei essa parte ao rascunho.':'Não consegui identificar a grade nessa frase.');return true}
 if(client||product){d.updatedAt=Date.now();write(d);preview(d,'Atualizei os dados do rascunho.');return true}
 return false
}
function cleanDuplicateSend(){const box=document.getElementById('hlgbVoiceBox9255');if(!box)return;const buttons=[...box.querySelectorAll('button')].filter(b=>/enviar pergunta|usar texto e enviar|enviar ao assistente/.test(norm(b.textContent))||b.id==='hlgbVoiceSendBackup9256');const keep=document.getElementById('hlgbVoiceSend9255')||buttons[0];for(const b of buttons)if(b!==keep)b.remove();if(keep)keep.textContent='Enviar ao Assistente'}
function wrap(){const base=window.hlgbAssistantAsk;if(typeof base!=='function'||base.__hlgbDraft9270)return false;const w=function(){const input=document.getElementById('hlgbAssistantInput'),raw=sid(input?.value).trim();try{if(handle(raw))return Promise.resolve({handled:true,kind:'order-draft'})}catch(e){console.warn('[HLGB Draft '+V+']',e)}return base.apply(this,arguments)};w.__hlgbDraft9270=true;w.__hlgbOriginal=base;window.hlgbAssistantAsk=w;return true}
function boot(){wrap();cleanDuplicateSend();setTimeout(()=>{wrap();cleanDuplicateSend()},250);setTimeout(()=>{wrap();cleanDuplicateSend()},900)}
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAssistantFloatingBtn,[onclick*="openHlgbAssistant"]')){setTimeout(boot,80);setTimeout(cleanDuplicateSend,500)}},true);
boot();
window.hlgbAssistantDraft9270={version:V,read,clear,handle,parseGrade,mergeItems,preview,wrap};
console.info('[HLGB] Assistente Draft v'+V+' ativo');
})();
