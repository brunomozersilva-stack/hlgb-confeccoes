'use strict';
/* Prova read-only do vínculo Pedido -> Corte -> Facção -> Acerto.
 * Não toca produção, não usa rede e não modifica documentos do laboratório. */
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const source=fs.readFileSync(path.join(__dirname,'../operacao-integrada-ui.js'),'utf8');
const start=source.indexOf('function orderTracePanel(s,order){');
const end=source.indexOf('\nfunction ordersFastDetail(s,id){',start);
assert.ok(start>=0&&end>start,'a função de rastreabilidade deve permanecer isolada e legível');
const sub=source.slice(start,end);
const str=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const render=vm.runInNewContext(sub+'\norderTracePanel',{
 api:core,str,ref:(list,id)=>(list||[]).find(x=>x.id===id),
 fmt:core.money,sum:x=>Object.values(x).reduce((a,b)=>a+b,0),
 table:(heads,rows)=>'<table><tr>'+heads.map(str).join('|')+'</tr>'+
  rows.map(row=>'<tr>'+row.join('|')+'</tr>').join('')+'</table>'
});
let n=0;
function write(s,type,payload={}){
 const result=core.apply(s,{type,payload,actor:'Conferência de laboratório',commandId:'TRC-'+String(++n).padStart(5,'0'),expectedRevision:s.revision});
 assert.equal(result.checks.ok,true,type+' deixa o documento íntegro');
 return result.state;
}
function fixture(){
 let s=core.initial();
 const product=s.products.find(x=>x.id==='PRO-0001');
 assert.ok(product&&product.gramsPerUnit>0);
 s=write(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:{P:8,M:2,G:0,GG:0}});
 s=write(s,'cut.plan',{orderId:'PED-0001',grade:{P:5,M:0,G:0,GG:0},
  workMode:'interno',cutterOne:'Ana',cutterTwo:'Beto',spreader:'Carla'});
 s=write(s,'cut.plan.complete',{id:'COR-0001',usefulGrams:5*product.gramsPerUnit,
  scrapGrams:0,signatureOne:'Ana',signatureTwo:'Beto'});
 s=write(s,'cut.record',{orderId:'PED-0001',size:'P',qty:3});
 s=write(s,'cut.record',{orderId:'PED-0001',size:'M',qty:2});
 s=write(s,'faction.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:6});
 s=write(s,'faction.return',{orderId:'PED-0001',qty:4});
 return s;
}
test('ciclo completo conserva IDs e um único título pelo acerto de retorno',()=>{
 const s=fixture(),original=JSON.stringify(s),o=s.orders[0];
 assert.equal(core.inspect(s).ok,true);
 assert.equal(s.settlements.length,1);
 const payable=s.finance.filter(x=>x.sourceId===s.settlements[0].id&&x.kind==='pagar');
 assert.equal(payable.length,1);
 const html=render(s,o);
 for(const id of ['COR-0001','ALO-0001','ACE-0001',payable[0].id,'PED-0001'])
  assert.ok(html.includes(id),'o rastreio deve mostrar '+id);
 assert.match(html,/Folhas e responsáveis pelo corte/);
 assert.match(html,/Movimentações de materiais identificadas/);
 assert.match(html,/Envios e retornos por facção/);
 assert.match(html,/Acertos, valores e títulos vinculados/);
 assert.doesNotMatch(html,/Conferir vínculos:/,'vínculos íntegros não geram alerta falso');
 assert.equal(JSON.stringify(s),original,'abrir consulta não pode mudar estoque, pagamento ou log');
});
test('diferença entre acerto e título gera alerta, nunca correção automática',()=>{
 const s=fixture(),broken=structuredClone(s);
 const f=broken.finance.find(x=>x.kind==='pagar');assert.ok(f);
 f.amountCents+=1;
 const before=JSON.stringify(broken),html=render(broken,broken.orders[0]);
 assert.match(html,/divergência de valor ou situação/);
 assert.equal(JSON.stringify(broken),before,'alerta não reescreve título nem acerto');
});
test('grade e transferência parcial são legíveis sem NaN, mantendo origem',()=>{
 const s=fixture(),copy=structuredClone(s),a=copy.factionAssignments[0];
 a.gradeLines=[{color:'Preto',size:'P',sent:6,returned:4}];
 copy.factionPartialTransfers=[{id:'TRP-FICTICIO',orderId:'PED-0001',
  fromAssignmentId:a.id,toAssignmentId:'ALO-TESTE',fromFactionId:'FAC-0001',
  toFactionId:'FAC-0002',qty:1,reason:'Transferência de ensaio'}];
 const before=JSON.stringify(copy),html=render(copy,copy.orders[0]);
 assert.match(html,/2 pend\./);
 assert.match(html,/TRP-FICTICIO/);
 assert.match(html,/Transferência de ensaio/);
 assert.doesNotMatch(html,/NaN/);
 assert.equal(JSON.stringify(copy),before);
});
test('rastreio é consulta sem executor ou requisição própria',()=>{
 assert.doesNotMatch(sub,/\bfetch\s*\(|\bXMLHttpRequest\b|\bindexedDB\b|\blocalStorage\b/);
 assert.doesNotMatch(sub,/api\.apply\(|window\.location|form\.submit\(/);
 assert.match(source,/data-trace-order/);
 assert.match(source,/ordersFastFilters\.selected=id/);
});
