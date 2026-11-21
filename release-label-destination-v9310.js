/* HLGB v93.10 — Etiquetas A4: destino + data opcional, preservando layout e tipografia ampliada */
(function(){
'use strict';
if(window.hlgbLabelDestination9310)return;
const V='93.10-label-destination';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const q=v=>Math.max(1,Math.floor(Number(v)||1));
const extras=[];

function labelSize(mode){
  return mode==='large'?{w:92,h:52,cols:2,rows:5,font:18,line:1.42,gap:.8,title:19}
       : mode==='medium'?{w:62,h:40,cols:3,rows:6,font:14,line:1.30,gap:.45,title:15}
       : {w:62,h:34,cols:3,rows:7,font:12,line:1.22,gap:.25,title:13};
}
function capture(){
  document.querySelectorAll('.ops-label-row').forEach((r,i)=>{
    extras[i]=extras[i]||{};
    const d=r.querySelector('.ldest9310');if(d)extras[i].destination=d.value||'';
    const c=r.querySelector('.ldate9310');if(c)extras[i].includeDate=!!c.checked;
  });
}
function decorate(){
  document.querySelectorAll('.ops-label-row').forEach((r,i)=>{
    const grid=r.querySelector('.grid');if(!grid)return;
    extras[i]=extras[i]||{destination:'',includeDate:true};
    if(extras[i].includeDate==null)extras[i].includeDate=true;
    if(!r.querySelector('.ldest9310')){
      const f=document.createElement('div');f.className='field';
      f.innerHTML='<label>Destino</label><input class="ldest9310" placeholder="Ex.: Facção Maria / Cliente / Estoque" value="'+esc(extras[i].destination||'')+'">';
      grid.appendChild(f);
      f.querySelector('input').addEventListener('input',e=>{extras[i].destination=e.target.value||'';renderPreview()});
    }
    const date=r.querySelector('.ld');
    if(date){
      const box=date.closest('.field');
      if(box&&!box.querySelector('.ldate-wrap9310')){
        const row=document.createElement('label');row.className='ldate-wrap9310';row.style.cssText='display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px;color:var(--muted)';
        row.innerHTML='<input type="checkbox" class="ldate9310" style="width:auto" '+(extras[i].includeDate?'checked':'')+'> Imprimir data';
        box.appendChild(row);
        row.querySelector('input').addEventListener('change',e=>{extras[i].includeDate=!!e.target.checked;renderPreview()});
        const sub=document.createElement('div');sub.className='sub';sub.style.marginTop='4px';sub.textContent='Opcional: desmarque para a data não aparecer na etiqueta.';box.appendChild(sub);
      }
    }
  });
}
function collect(){
  capture();const out=[];
  document.querySelectorAll('.ops-label-row').forEach((r,i)=>{
    const row={name:r.querySelector('.ln')?.value||'',model:r.querySelector('.lm')?.value||'',size:r.querySelector('.ls')?.value||'',pieceQty:r.querySelector('.lpq')?.value||'',volume:r.querySelector('.lv')?.value||'',date:r.querySelector('.ld')?.value||'',destination:r.querySelector('.ldest9310')?.value||extras[i]?.destination||'',includeDate:r.querySelector('.ldate9310')?.checked??extras[i]?.includeDate??true,copies:q(r.querySelector('.lq')?.value)};
    for(let n=0;n<row.copies;n++)out.push(row);
  });
  return out;
}
function labelBody(x,tag='span'){
  const line=(t,v)=>'<'+tag+'>'+t+': '+esc(v||'-')+'</'+tag+'>';
  let h=(x.name?'<b>'+esc(x.name)+'</b>':'')+line('MODELO',x.model)+line('TAMANHO',x.size)+line('QUANTIDADE',x.pieceQty)+line('VOLUME',x.volume)+line('DESTINO',x.destination);
  if(x.includeDate&&x.date)h+=line('DATA',x.date);
  return h;
}
function renderPreview(){
  const preview=document.getElementById('opsLabelPreview');if(!preview)return;
  const mode=document.getElementById('opsLabelSize')?.value||'small',sz=labelSize(mode),labels=collect();
  preview.innerHTML='<div class="ops-label-grid" style="grid-template-columns:repeat('+sz.cols+','+sz.w+'mm)">'+labels.slice(0,sz.cols*sz.rows).map(x=>'<div class="ops-label" style="width:'+sz.w+'mm;height:'+sz.h+'mm">'+labelBody(x,'span')+'</div>').join('')+'</div>';
}
function printLabels(){
  const mode=document.getElementById('opsLabelSize')?.value||'small',sz=labelSize(mode),per=sz.cols*sz.rows,labels=collect();if(!labels.length)return;
  const pages=[];
  for(let i=0;i<labels.length;i+=per){const part=labels.slice(i,i+per);pages.push('<div class="page labelpage" style="display:grid;grid-template-columns:repeat('+sz.cols+','+sz.w+'mm);grid-auto-rows:'+sz.h+'mm;gap:3mm;align-content:start">'+part.map(x=>'<div class="label" style="width:'+sz.w+'mm;height:'+sz.h+'mm">'+labelBody(x,'div')+'</div>').join('')+'</div>')}
  const w=window.open('','_blank');if(!w){alert('Permita pop-ups para imprimir.');return}
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas A4</title><style>@page{size:A4;margin:10mm}body{font-family:Arial,sans-serif;color:#111}.page{page-break-after:always}.page:last-child{page-break-after:auto}.label{border:.3mm solid #111;box-sizing:border-box;padding:3.5mm;display:flex;flex-direction:column;justify-content:center;overflow:hidden}.label b{font-size:'+sz.title+'px;line-height:1.2;margin:0 0 1.5mm;font-weight:700}.label div{font-size:'+sz.font+'px;line-height:'+sz.line+';font-weight:700;margin:0 0 '+sz.gap+'mm}.label div:last-child{margin-bottom:0}.labelpage{page-break-after:always}.labelpage:last-child{page-break-after:auto}</style></head><body>'+pages.join('')+'<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>');w.document.close();
}
function install(){
  const baseRender=window.renderLabelDraft9249;
  if(typeof baseRender==='function'&&!baseRender.__hlgb9310){
    const wrapped=function(){capture();const out=baseRender.apply(this,arguments);decorate();renderPreview();return out};wrapped.__hlgb9310=true;wrapped.__original=baseRender;window.renderLabelDraft9249=wrapped;
  }
  const baseRemove=window.removeLabelRow9249;
  if(typeof baseRemove==='function'&&!baseRemove.__hlgb9310){
    const wr=function(i){capture();extras.splice(Number(i)||0,1);return baseRemove.apply(this,arguments)};wr.__hlgb9310=true;wr.__original=baseRemove;window.removeLabelRow9249=wr;
  }
  window.printLabels9249=printLabels;window.printLabels9249.__hlgb9310=true;
  decorate();renderPreview();
  window.hlgbLabelDestination9310={version:V,renderPreview,collect};
  return true;
}
let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);install();
console.info('[HLGB] '+V+' ativo — DESTINO e DATA opcional nas Etiquetas A4');
})();
