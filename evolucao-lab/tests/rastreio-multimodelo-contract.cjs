'use strict';
// Contratos isolados, sem banco comercial: leitura por item, cor e tamanho.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),vm=require('node:vm');
const engine=require('../modulos/pedidos-multimodelo-v1.js');
const source=fs.readFileSync(path.join(__dirname,'../operacao-integrada-ui.js'),'utf8');
const begin=source.indexOf('function multiOrderTracePanel(s,order){');
const end=source.indexOf('\nfunction ordersFastDetail(s,id){',begin);
assert.ok(begin>=0&&end>begin,'painel de rastreio multimodelo localizado');
const snippet=source.slice(begin,end);
const escaped=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trace=vm.runInNewContext(snippet+'\nmultiOrderTracePanel',{
 window:{HLGBLabMultiOrdersV1:engine},
 str:escaped,fmt:n=>'R$ '+(Number(n)/100).toFixed(2).replace('.',','),
 ref:(items,id)=>(items||[]).find(x=>x.id===id),
 table:(headers,rows)=>'<table>'+headers.map(escaped).join('|')+
  rows.map(r=>'<tr>'+r.join('|')+'</tr>').join('')+'</table>'
});
function sample(){
 return {
  revision:15,finance:[],stockLedger:[],factions:[{id:'FAC-A',name:'Oficina Alfa'}],
  multiOrders:[{id:'PDM-TESTE',clientId:'CLI-A',sizes:['P','M'],phase:'preparacao_nao_integrada',
   items:[
    {id:'ITM-001',name:'Camisola de teste',sku:'SKU-001',priceCents:2500,
     qty:10,amountCents:25000,colors:[{color:'Preto',grade:{P:8,M:2}}]},
    {id:'ITM-002',name:'Calcinha de teste',sku:'SKU-002',priceCents:1200,
     qty:4,amountCents:4800,colors:[{color:'Rubi',grade:{P:4,M:0}}]}],
   totals:{pieces:14,models:2,amountCents:29800}}],
  multiCutPlans:[
   {id:'PCM-A',orderId:'PDM-TESTE',itemId:'ITM-001',status:'concluido',qty:6,
    lines:[{color:'Preto',size:'P',qty:6}],cutterOne:'Ana',cutterTwo:'Beto',spreader:'Carla'},
   {id:'PCM-B',orderId:'PDM-TESTE',itemId:'ITM-002',status:'aberto',qty:2,
    lines:[{color:'Rubi',size:'P',qty:2}],cutterOne:'Ana',cutterTwo:'Beto',spreader:'Carla'}],
  multiFlowLots:[{id:'MFL-A',orderId:'PDM-TESTE',itemId:'ITM-001',factionId:'FAC-A',
   qty:4,lines:[{color:'Preto',size:'P',qty:4}],changes:[],
   returns:[{id:'MFR-A',lotId:'MFL-A',orderId:'PDM-TESTE',itemId:'ITM-001',
    factionId:'FAC-A',qty:3,lines:[{color:'Preto',size:'P',qty:3}],
    amountCents:1800,commandId:'CMD-RETORNO',review:null}]}],
  multiFlowSeparations:[{id:'MFS-A',orderId:'PDM-TESTE',itemId:'ITM-001',
   qty:2,lines:[{color:'Preto',size:'P',qty:2}]}],
  multiFlowShipments:[{id:'MFX-A',orderId:'PDM-TESTE',itemId:'ITM-001',
   qty:1,lines:[{color:'Preto',size:'P',qty:1}]}]
 };
}
test('progresso por modelo e por variante com historico PDM/PCM/MFL/MFR sem titulo',()=>{
 const s=sample(),snapshot=JSON.stringify(s),p=s.multiOrders[0];
 const rows=engine.cutImpact(s,p.id);
 assert.equal(rows.length,4);
 assert.equal(rows.reduce((n,r)=>n+r.ordered,0),14);
 assert.equal(rows.reduce((n,r)=>n+r.cut,0),6);
 assert.equal(rows.reduce((n,r)=>n+r.planned,0),2);
 assert.equal(rows.reduce((n,r)=>n+r.sent,0),4);
 assert.equal(rows.reduce((n,r)=>n+r.returned,0),3);
 assert.equal(rows.reduce((n,r)=>n+r.separated,0),2);
 assert.equal(rows.reduce((n,r)=>n+r.shipped,0),1);
 const html=trace(s,p);
 for(const t of ['ITM-001','ITM-002','PCM-A','PCM-B','MFL-A','MFR-A',
  'Camisola de teste','Calcinha de teste','Reservadas em corte','Somente simulação'])
  assert.ok(html.includes(t),'Painel precisa conter '+t);
 assert.doesNotMatch(html,/FIN-\d|Baixa confirmada no Hub/);
 assert.equal(JSON.stringify(s),snapshot,'consulta nunca modifica o documento');
});
test('folha aberta não equivale a corte, nem libera envio para facção',()=>{
 const s=sample(),rows=engine.cutImpact(s,'PDM-TESTE');
 const rubi=rows.find(x=>x.itemId==='ITM-002'&&x.color==='Rubi'&&x.size==='P');
 assert.equal(rubi.ordered,4);
 assert.equal(rubi.planned,2);
 assert.equal(rubi.cut,0);
 assert.equal(rubi.availableToAllocate,0);
 assert.equal(rubi.pendingCut,2);
 assert.match(trace(s,s.multiOrders[0]),/PCM-B/);
});
test('corrupção de quantidade não é mascarada: erro visível e zero correção automática',()=>{
 const s=sample();
 s.multiFlowLots[0].qty=11;
 s.multiFlowLots[0].lines[0].qty=11;
 const snapshot=JSON.stringify(s);
 const html=trace(s,s.multiOrders[0]);
 assert.match(html,/Saldos divergentes ou ilegíveis/);
 assert.doesNotMatch(html,/Resumo individual de cada modelo/);
 assert.equal(JSON.stringify(s),snapshot);
});
test('painel não executa comandos nem usa armazenamento ou rede',()=>{
 assert.doesNotMatch(snippet,/api\.apply\s*\(|\bfetch\s*\(|\bXMLHttpRequest\b|\bindexedDB\b|\blocalStorage\b/);
 assert.match(source,/multiOrderTracePanel\(s,multi\)/);
 assert.match(source,/window\.HLGBLabMultiOrdersV1/);
});
