'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-faction-manual-payment-v9566.js','utf8');
const makeRow=(id,group,description,quantity,unitPrice,discount=0,status='Pendente')=>({
 id,manual:true,source:'faction_manual_payment_v1',manualGroupId:group,
 manualKindV9566:'product',serviceModeV9577:'faccao',factionName:'Roseli',
 productId:100,description,quantity,unitPrice,grossValueV9577:quantity*unitPrice,
 travetaDiscountTotalV9577:discount,travetaDiscountUnitV9577:discount/quantity,
 value:quantity*unitPrice-discount,status,
 paidAmount:status==='Pago'?quantity*unitPrice-discount:0,
 scheduledPaymentDate:'2026-11-13',paymentDate:status==='Pago'?'2026-11-13':'',
 paymentHistory:[],createdAt:'2026-11-13T12:00:00Z',updatedAt:'2026-11-13T14:00:00Z'
});
function fixture(rows){
 const db={products:[{id:100,name:'Tanga Katerine'}],factionPayments:rows,
  factionMasters:[{id:1,name:'Roseli',active:true}],factions:[],hubFinanceEntries:[]};
 const host={db,addEventListener(){},renderFactionPayments(){}};
 const doc={getElementById(){return null},addEventListener(){}};
 vm.runInNewContext(source,{window:host,document:doc,console,Date,Math,JSON,URL,
  Intl,Blob,Uint8Array,btoa,atob,setTimeout(){}});
 return {api:host.hlgbFactionManual9566,db};
}
function strings(blob){return blob.arrayBuffer().then(buf=>
 Buffer.from(buf).toString('latin1').replace(/\xa0/g,' '));}
test('simple PDF distinguishes gross, travetada, credit, direct adjustment, paid and balance',async()=>{
 const a=makeRow('item-1','acerto','Tanga Katerine',100,1,30);
 const b=makeRow('item-2','acerto','Camisola Melina',50,2);
 a.manualDirectAdjustmentsV9591=[
  {id:'minus-1',kind:'abater',amount:10,reason:'Adiantamento da semana'},
  {id:'plus-1',kind:'acrescentar',amount:5,reason:'Servico extra combinado'}
 ];
 a.manualApplicationsV9590=[{id:'app-1',kind:'a_mais',amount:20,
  sourceGroupId:'anterior',targetGroupId:'acerto',reason:'Credito pago a mais'}];
 const canceled=makeRow('item-3','acerto','Produto errado',1,90,0,'Cancelado');
 canceled.manualCanceledV9590=true;
 canceled.manualCanceledReasonV9590='Cadastro errado da mercadoria';
 const {api,db}=fixture([a,b,canceled]);
 const before=JSON.stringify(db);
 const lines=api.summaryLinesV9590('acerto').join('\n').replace(/\u00a0/g,' ');
 for(const expected of [
  'Valor bruto dos serviços: R$ 200,00',
  'Travetada descontada: R$ 30,00',
  'Subtotal dos serviços: R$ 170,00',
  'Outros abatimentos: R$ 10,00',
  'Outros acréscimos: R$ 5,00',
  'Crédito de pagamento anterior: R$ 20,00',
  'TOTAL LÍQUIDO DESTE ACERTO: R$ 145,00',
  'Valor registrado como pago: R$ 0,00',
  'SALDO DESTE ACERTO: R$ 145,00',
  'Tanga Katerine','Camisola Melina','Cadastro errado da mercadoria',
  'Adiantamento da semana','Credito pago a mais']){
  assert(lines.includes(expected),'missing report content: '+expected);
 }
 assert(!lines.includes('Valor original: R$ 90,00')||lines.includes('NÃO COBRAR'));
 const pdf=api.buildSummaryPdfV9590('acerto');
 assert(pdf instanceof Blob);
 const raw=await strings(pdf);
 assert(raw.startsWith('%PDF-1.4'));
 assert(raw.includes('Helvetica-Bold'));
 assert(raw.includes('TOTAL LÍQUIDO A PAGAR'));
 assert(raw.includes('xref'));
 assert.equal(JSON.stringify(db),before,'PDF must not mutate original records');
});
test('paid correction shows credits separately, without subtracting twice',async()=>{
 const row=makeRow('src','pago','Tanga Katerine',100,1,0,'Pago');
 row.manualCorrectionsV9590=[{id:'credit',kind:'a_mais',amount:15,
 reason:'Pagamento realizado acima do valor',applications:[]}];
 const {api}=fixture([row]);
 const text=api.summaryLinesV9590('pago').join('\n').replace(/\u00a0/g,' ');
 assert(text.includes('TOTAL LÍQUIDO DESTE ACERTO: R$ 100,00'));
 assert(text.includes('SALDO DESTE ACERTO: R$ 0,00'));
 assert(text.includes('Pago a mais - crédito: R$ 15,00'));
 assert(text.includes('Ainda a compensar: R$ 15,00'));
 assert(text.includes('NÃO alteram novamente o valor original'));
});
test('long batches split into real PDF pages and preserve footer',async()=>{
 const rows=Array.from({length:80},(_,i)=>
  makeRow('line-'+i,'lote','Produto fictício para teste '+i,10,0.25,0));
 const {api}=fixture(rows);
 const pdf=api.buildSummaryPdfV9590('lote');
 const raw=await strings(pdf);
 const count=Number(raw.match(/\/Count (\d+)/)?.[1]||0);
 assert(count>=2,'80 items should paginate, got '+count);
 assert(raw.includes('Página 1/'+count));
 assert(raw.includes('Documento informativo'));
 assert(raw.includes('Produto fictício para teste 79'));
 assert(raw.includes('%%EOF'));
});


test('Ana Lucia layout matches shareable one-page table with R$ 192 deduction and reason',async()=>{
 const items=[
  ['Calcinha Adriele',49,.15],['Calcinha Bruna',483,.15],['Calcinha Dalma',49,.15],
  ['Calcinha Tammy',59,.15],['Calesson Tatiana',416,.15],
  ['Camisola Ana Melia',30,.25],['Conjunto Paula',59,.25],
  ['Cueca Boxer Leonardo',120,.15],['Cueca Fem Tabata',358,.15],
  ['Short Doll Yza',125,.25],['Soutien Aline',362,.15],
  ['Tanga Canelada',57,.15],['Tanga Katerine',654,.15],
  ['Tanga Valentina',266,.15]
 ];
 const rows=items.map(([name,qty,price],i)=>{
  const x=makeRow('ana-'+i,'ana','Embalagem — '+name,qty,price);
  x.factionName='Ana Lucia';x.serviceModeV9577='embalagem';
  x.observation='Foi Abatido 192 reais de um valor pago a mais da semana anterior';
  return x;
 });
 rows[0].manualDirectAdjustmentsV9591=[{id:'ajuste-192',kind:'abater',
  amount:192,reason:'Ultimo acerto foi pago a mais'}];
 const canceled=makeRow('ana-canceled','ana','Embalagem — Tanga Valentina',386,.15,0,'Cancelado');
 canceled.manualCanceledV9590=true;
 canceled.manualCanceledReasonV9590='ja foi pago';
 canceled.factionName='Ana Lucia';canceled.serviceModeV9577='embalagem';
 rows.push(canceled);
 const {api,db}=fixture(rows);
 const initial=JSON.stringify(db);
 const summary=api.summaryLinesV9590('ana').join('\n').replace(/\u00a0/g,' ');
 assert(summary.includes('TOTAL LÍQUIDO DESTE ACERTO: R$ 292,45'));
 const raw=await strings(api.buildSummaryPdfV9590('ana'));
 assert(raw.includes('/Count 1 >>'), 'reference acerto with 14 models must fit one A4 page');
 for(const phrase of ['HLGB CONFECÇÕES','PRODUTOS EMBALADOS','Modelo','Qtd.','Unid.','Valor',
  '3.087','R$ 484,45','R$ 192,00','R$ 292,45',
  'Motivo do abatimento:','Ultimo acerto foi pago a mais',
  'TOTAL LÍQUIDO A PAGAR','ITENS CANCELADOS - NÃO COBRAR','ja foi pago',
  'Este documento é um demonstrativo']){
  assert(raw.includes(phrase),'PDF do exemplo de Ana Lucia não incluiu: '+phrase);
 }
 assert(!raw.includes('faction-manual-'),'never print internal technical IDs to payee');
 assert.equal(JSON.stringify(db),initial,'PDF must never modify or save payment records');
});
