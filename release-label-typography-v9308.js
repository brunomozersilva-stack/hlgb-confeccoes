/* HLGB v93.08 — Etiquetas A4: tipografia maior e mais espaçada, sem alterar o layout */
(function(){
'use strict';
const V='93.08-label-typography';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const qty=v=>Math.max(1,Math.floor(Number(v)||1));

function ensurePreviewStyle(){
  if(document.getElementById('hlgbLabelTypography9308'))return;
  const st=document.createElement('style');
  st.id='hlgbLabelTypography9308';
  st.textContent=`
    .ops-label b{
      font-size:17px!important;
      line-height:1.25!important;
      margin-bottom:2.2mm!important;
      font-weight:700!important;
    }
    .ops-label span{
      font-size:15px!important;
      line-height:1.45!important;
      font-weight:700!important;
      margin-bottom:1mm!important;
    }
    .ops-label span:last-child{margin-bottom:0!important}
  `;
  document.head.appendChild(st);
}

function labelSize(mode){
  return mode==='large'?{w:92,h:52,cols:2,rows:5,font:18,line:1.48,gap:1.05,title:19}
       : mode==='medium'?{w:62,h:40,cols:3,rows:6,font:15,line:1.36,gap:.7,title:16}
       : {w:62,h:34,cols:3,rows:7,font:13,line:1.28,gap:.45,title:14};
}

function collectLabels(){
  const out=[];
  document.querySelectorAll('.ops-label-row').forEach(r=>{
    const row={
      name:r.querySelector('.ln')?.value||'',
      model:r.querySelector('.lm')?.value||'',
      size:r.querySelector('.ls')?.value||'',
      pieceQty:r.querySelector('.lpq')?.value||'',
      volume:r.querySelector('.lv')?.value||'',
      date:r.querySelector('.ld')?.value||'',
      copies:qty(r.querySelector('.lq')?.value)
    };
    for(let i=0;i<row.copies;i++)out.push(row);
  });
  return out;
}

function printLabels9308(){
  const mode=document.getElementById('opsLabelSize')?.value||'small';
  const sz=labelSize(mode),per=sz.cols*sz.rows,labels=collectLabels();
  if(!labels.length)return;
  const pages=[];
  for(let i=0;i<labels.length;i+=per){
    const part=labels.slice(i,i+per);
    pages.push('<div class="page labelpage" style="display:grid;grid-template-columns:repeat('+sz.cols+','+sz.w+'mm);grid-auto-rows:'+sz.h+'mm;gap:3mm;align-content:start">'+
      part.map(x=>'<div class="label" style="width:'+sz.w+'mm;height:'+sz.h+'mm">'+
        '<b>'+esc(x.name||'')+'</b>'+ 
        '<div>MODELO: '+esc(x.model||'-')+'</div>'+ 
        '<div>TAMANHO: '+esc(x.size||'-')+'</div>'+ 
        '<div>QUANTIDADE: '+esc(x.pieceQty||'-')+'</div>'+ 
        '<div>VOLUME: '+esc(x.volume||'-')+'</div>'+ 
        '<div>DATA: '+esc(x.date||'-')+'</div>'+ 
      '</div>').join('')+'</div>');
  }
  const w=window.open('','_blank');
  if(!w){alert('Permita pop-ups para imprimir.');return}
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas A4</title><style>'+ 
    '@page{size:A4;margin:10mm}body{font-family:Arial,sans-serif;color:#111;font-size:12px}.page{page-break-after:always}.page:last-child{page-break-after:auto}'+
    '.label{border:.3mm solid #111;box-sizing:border-box;padding:3.5mm;display:flex;flex-direction:column;justify-content:center;overflow:hidden}.label b{font-size:'+sz.title+'px;line-height:1.25;margin:0 0 2mm;font-weight:700}.label div{font-size:'+sz.font+'px;line-height:'+sz.line+';font-weight:700;margin:0 0 '+sz.gap+'mm}.label div:last-child{margin-bottom:0}.labelpage{page-break-after:always}.labelpage:last-child{page-break-after:auto}'+
    '</style></head><body>'+pages.join('')+'<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>');
  w.document.close();
}

function install(){
  ensurePreviewStyle();
  if(typeof window.printLabels9249==='function'&&!window.printLabels9249.__hlgb9308){
    printLabels9308.__hlgb9308=true;
    window.printLabels9249=printLabels9308;
    console.info('[HLGB '+V+'] tipografia das Etiquetas A4 ampliada');
    return true;
  }
  return false;
}

let tries=0;
const timer=setInterval(()=>{
  tries++;
  if(install()||tries>120)clearInterval(timer);
},100);
install();
})();
