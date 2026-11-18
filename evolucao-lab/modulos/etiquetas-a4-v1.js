/* HLGB Evolução — Etiquetas A4 fictícias, gerador PURO sem acesso a dados ou rede.
 * Recupera formatos 10/18/21, lote multimodelo e volumes 1 de N.
 * Não gera nota, não altera pedido, estoque, embalagem ou histórico empresarial.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabLabelsV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const specs=Object.freeze({
  '10':{cols:2,rows:5,widthMm:92,heightMm:52,gapMm:3},
  '18':{cols:3,rows:6,widthMm:62,heightMm:40,gapMm:2},
  '21':{cols:3,rows:7,widthMm:62,heightMm:34,gapMm:2}
 });
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fail=message=>{throw Error(message)};
 const safe=(x,label,max=95,required=false)=>{
  if(typeof x!=='string')fail(label+' deve ser um texto.');
  const v=x.trim().replace(/\s+/g,' ');
  if(v.length>max||(required&&!v))fail(label+' obrigatório ou excede '+max+' caracteres.');
  return v;
 };
 const whole=(n,label,min=0,max=999)=>{
  if(!Number.isSafeInteger(n)||n<min||n>max)fail(label+' deve ser inteiro entre '+min+' e '+max+'.');
  return n;
 };
 function date(x){
  if(typeof x!=='string'||!/^\d{4}-\d\d-\d\d$/.test(x)||Number.isNaN(Date.parse(x+'T00:00:00Z'))||
   new Date(x+'T00:00:00Z').toISOString().slice(0,10)!==x)fail('Data de etiqueta inválida.');
  return x;
 }
 function plan(rows,layout){
  const spec=specs[String(layout)];
  if(!spec)fail('Escolha etiquetas A4 de 10, 18 ou 21 por folha.');
  if(!Array.isArray(rows)||!rows.length||rows.length>100)fail('Informe de 1 a 100 modelos no lote.');
  const labels=[],definitions=[];
  for(const [idx,row] of rows.entries()){
   if(!row||typeof row!=='object')fail('Modelo de etiqueta inválido.');
   const name=safe(row.name,'Nome / local',95,true),
    model=safe(row.model,'Modelo da peça',95,true),
    size=safe(row.size||'','Tamanho',50),
    pieceQty=whole(row.pieceQty,'Peças no volume',0,100000),
    volumes=whole(row.volumes,'Volumes',0,999),
    copies=whole(row.copies,'Cópias',1,999),
    printed=date(row.date);
   const number=volumes||copies;
   if(labels.length+number>2000)fail('Lote excede 2000 etiquetas; divida a impressão.');
   const def={name,model,size,pieceQty,volumes,copies,date:printed};
   definitions.push(def);
   for(let i=1;i<=number;i++){
    labels.push({...def,sourceRow:idx+1,
     displayVolume:volumes?i+' de '+volumes:'—',copyNumber:volumes?null:i});
   }
  }
  const per=spec.cols*spec.rows,pages=[];
  for(let offset=0;offset<labels.length;offset+=per){
   const part=labels.slice(offset,offset+per);
   pages.push({number:pages.length+1,labels:part,emptyCells:per-part.length});
  }
  return {layout:String(layout),spec,per,definitions,labels,pages,total:labels.length,
   modelCount:definitions.length,emptyCells:pages.at(-1)?.emptyCells||0,stockWritten:false,sampleOnly:true};
 }
 function card(label){
  return '<div class="mc-label-card"><b>'+esc(label.name)+'</b>'+
   '<p>MODELO: '+esc(label.model)+'</p>'+
   '<p>TAMANHO: '+esc(label.size||'—')+'</p>'+
   '<p>QUANTIDADE: '+label.pieceQty+'</p>'+
   '<p>VOLUME: '+esc(label.displayVolume)+'</p>'+
   '<p>DATA: '+esc(label.date)+'</p></div>';
 }
 function render(batch){
  if(!batch||!batch.sampleOnly||batch.stockWritten||!specs[batch.layout]||
   batch.pages.length!==Math.ceil(batch.total/batch.per))fail('Lote de impressão não validado.');
  const spec=specs[batch.layout],pages=batch.pages.map(page=>{
   if(page.labels.length+page.emptyCells!==batch.per)fail('Folha com espaços divergentes.');
   return '<section class="mc-label-page" style="--mc-label-cols:'+spec.cols+';--mc-label-w:'+spec.widthMm+
    'mm;--mc-label-h:'+spec.heightMm+'mm;--mc-label-gap:'+spec.gapMm+'mm">'+
    page.labels.map(card).join('')+
    Array.from({length:page.emptyCells},()=>'<div class="mc-label-empty" aria-hidden="true"></div>').join('')+
    '</section>';
  });
  return '<article class="mc-label-batch">'+pages.join('')+'</article>';
 }
 return Object.freeze({version:'1.0.0-lab',plan,render,specs});
});
