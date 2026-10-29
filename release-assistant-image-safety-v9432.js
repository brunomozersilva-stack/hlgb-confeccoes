/* HLGB v94.32 — segurança de imagem manuscrita no Assistente/importador */
(function(){
'use strict';
const V='94.32-assistant-image-safety';
const SUM_RE=/\b(som(?:a|ar|e|ando)?|total|quantas?\s+pe[cç]as|confer(?:e|ir|ência)|cont(?:a|ar)|calcular)\b/i;
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function lastQuestion(){
 try{
  const input=document.getElementById('hlgbAssistantInput');
  const bubbles=[...document.querySelectorAll('.hlgb-ai-userbubble9269')];
  return [window.__hlgbAssistantImageIntentText9432||'',input?.value||'',bubbles.at(-1)?.textContent||''].filter(Boolean).join(' ');
 }catch(e){return sid(window.__hlgbAssistantImageIntentText9432||'')}
}
function isSumIntent(){return SUM_RE.test(lastQuestion())}
function isImage(file){return !!file&&(/^image\//i.test(file.type||'')||/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name||''))}
function totalOf(d){return Array.isArray(d?.grade)?d.grade.reduce((a,x)=>a+q(x?.qty),0):0}
function warningHtml(sumMode){
 const title=sumMode?'Não consegui somar esta foto com segurança.':'Não consegui ler esta foto com segurança.';
 const detail=sumMode
  ?'O leitor atual não reconheceu a escrita manual o bastante para calcular. <b>Não vou responder 0 peças</b> nem transformar uma leitura incerta em pedido.'
  :'O leitor atual não reconheceu a escrita manual o bastante para montar uma grade. <b>Não vou considerar 0 peças</b> nem liberar um pedido com leitura incerta.';
 return '<div class="panel" style="margin-top:12px;background:#fff3cd;border:1px solid #e8cf78;padding:12px;border-radius:10px"><b>'+esc(title)+'</b><div style="margin-top:6px">'+detail+'</div><div class="sub" style="margin-top:7px">Você pode digitar/copiar os valores na caixa de texto para conferir. Fotos manuscritas só serão aceitas quando as quantidades forem realmente reconhecidas.</div></div>';
}
function markUnsafe(sumMode,beforeText){
 const ta=document.getElementById('hlgbImportText'),status=document.getElementById('hlgbImportStatus'),box=document.getElementById('hlgbImportPreview');
 if(ta)ta.value=beforeText||'';
 if(status)status.textContent='Leitura da foto não confirmada.';
 window.__hlgbImportedOrderDraft=null;
 if(box)box.innerHTML=warningHtml(sumMode);
 try{window.HLGB_ASSISTANT_IMAGE_LAST_9432={at:new Date().toISOString(),status:'blocked-low-confidence',intent:sumMode?'sum':'import'}}catch(e){}
}
function markSumResult(total){
 const box=document.getElementById('hlgbImportPreview');if(!box)return;
 box.querySelectorAll('button[onclick*="hlgbImportOpenOfficialOrder"]').forEach(b=>b.remove());
 box.insertAdjacentHTML('afterbegin','<div class="panel" style="margin:10px 0;background:#eaf7ee;border:1px solid #9bc9a7;padding:12px;border-radius:10px"><b>Total reconhecido: '+q(total).toLocaleString('pt-BR')+' peças</b><div class="sub" style="margin-top:5px">Modo conferência: nenhum pedido será aberto a partir desta resposta. Confira a prévia abaixo antes de usar a soma.</div></div>');
 try{window.HLGB_ASSISTANT_IMAGE_LAST_9432={at:new Date().toISOString(),status:'sum-preview',total:q(total),intent:'sum'}}catch(e){}
}
function install(){
 if(window.HLGB_ASSISTANT_IMAGE_SAFETY_9432)return true;
 const api=window.hlgbAssistantOrderImport,original=window.hlgbImportAnalyze;
 if(!api||typeof original!=='function')return false;
 if(original.__hlgbImageSafety9432){window.HLGB_ASSISTANT_IMAGE_SAFETY_9432=V;return true}
 const wrapped=async function(){
  const file=document.getElementById('hlgbImportFile')?.files?.[0];
  if(!isImage(file))return original.apply(this,arguments);
  const ta=document.getElementById('hlgbImportText'),status=document.getElementById('hlgbImportStatus');
  const beforeText=ta?.value||'',sumMode=isSumIntent();
  window.__hlgbImportedOrderDraft=null;
  if(status)status.textContent=sumMode?'Lendo a foto para conferir a soma…':'Lendo a foto e validando a grade…';
  let out;
  try{out=await original.apply(this,arguments)}catch(e){markUnsafe(sumMode,beforeText);return out}
  const draft=window.__hlgbImportedOrderDraft,total=totalOf(draft);
  const source=sid(draft?.sourceText||'').trim();
  const hasPlausibleGrade=total>0&&Array.isArray(draft?.grade)&&draft.grade.length>0;
  const obviousOcrNoise=source.length>0&&((source.match(/[A-Za-zÀ-ÿ0-9]/g)||[]).length/Math.max(1,source.length)<0.42);
  if(!hasPlausibleGrade||obviousOcrNoise){markUnsafe(sumMode,beforeText);return out}
  if(sumMode)markSumResult(total);
  try{window.HLGB_ASSISTANT_IMAGE_LAST_9432={at:new Date().toISOString(),status:'accepted-preview',total,intent:sumMode?'sum':'import'}}catch(e){}
  return out;
 };
 wrapped.__hlgbImageSafety9432=true;
 wrapped.__hlgbOriginal=original;
 window.hlgbImportAnalyze=wrapped;
 window.HLGB_ASSISTANT_IMAGE_SAFETY_9432=V;
 return true;
}
document.addEventListener('click',e=>{
 try{
  const btn=e.target?.closest?.('#hlgbAssistantImportBtn');if(!btn)return;
  const input=document.getElementById('hlgbAssistantInput');
  const bubbles=[...document.querySelectorAll('.hlgb-ai-userbubble9269')];
  window.__hlgbAssistantImageIntentText9432=[input?.value||'',bubbles.at(-1)?.textContent||''].filter(Boolean).join(' ');
 }catch(err){}
},true);
[0,400,1200,3000].forEach(ms=>setTimeout(install,ms));
window.hlgbInstallAssistantImageSafety9432=install;
})();
