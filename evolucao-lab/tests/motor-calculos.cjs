'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'motor-calculos-demonstracao.js'),'utf8');
const html=fs.readFileSync(path.join(root,'acertos-simulador.html'),'utf8');
const E=require('../motor-calculos-demonstracao.js');
const line1={kind:'product',quantity:100,unitPrice:'0,30',travetaDiscountUnit:'0,05'};
const line2={kind:'embalagem',quantity:20,unitPrice:'0,20'};
const direct=[{id:'A-1',kind:'abater',amount:'2,00',reason:'Conferência de material'},
 {id:'A-2',kind:'acrescentar',amount:'1,00',reason:'Serviço adicional'}];
const app={id:'C-1',kind:'a_mais',amount:'3,00',available:'3,00',sourceStatus:'Pago',
 targetStatus:'Pendente',sourceFactionId:'F-1',targetFactionId:'F-1'};
const group=()=>({lines:[{...line1},{...line2}],adjustments:direct.map(x=>({...x})),applications:[{...app}]});
const fail=(fn,re)=>assert.throws(fn,re);
test('dinheiro em centavos, sem arredondar silenciosamente entradas inválidas',()=>{
 assert.equal(E.moneyCents('R$ 12,09'),1209);
 assert.equal(E.moneyCents('0,30'),30);
 assert.equal(E.moneyCents('0.05'),5);
 assert.equal(E.moneyCents(12.5),1250);
 fail(()=>E.moneyCents('10,999'),/monetário inválido/);
 fail(()=>E.moneyCents('-1,00'),/monetário inválido/);
 fail(()=>E.moneyCents('abc'),/monetário inválido/);
 fail(()=>E.moneyCents('999999999,00'),/limite/);
});
test('travetada e embalagem têm cálculos separados',()=>{
 assert.deepEqual(E.previewLine(line1),{kind:'product',qty:100,points:1,unitCents:30,
 grossCents:3000,travetaDiscountCents:500,netCents:2500});
 assert.deepEqual(E.previewLine({kind:'travetada',quantity:10,unitPrice:'0,15',pointsPerPiece:2}),{
 kind:'travetada',qty:10,points:2,unitCents:15,grossCents:300,travetaDiscountCents:0,netCents:300});
 assert.equal(E.previewLine(line2).netCents,400);
 fail(()=>E.previewLine({...line1,travetaDiscountUnit:'0,31'}),/maior/);
 fail(()=>E.previewLine({...line1,quantity:1.5}),/inteiro positivo/);
 fail(()=>E.previewLine({kind:'travetada',quantity:2,unitPrice:'0,20',pointsPerPiece:2,travetaDiscountUnit:'0,01'}),/não aceita desconto/);
});
test('grupo com travetada, ajustes e compensação deve conciliar em centavos',()=>{
 const r=E.previewGroup(group());
 assert.equal(r.grossCents,3400);
 assert.equal(r.travetaDiscountCents,500);
 assert.equal(r.beforeCents,2900);
 assert.equal(r.directCents,-100);
 assert.equal(r.crossCents,-300);
 assert.equal(r.netCents,2500);
 assert.deepEqual(r.allocationsCents,[2100,400]);
 assert.equal(r.allocationsCents.reduce((a,b)=>a+b,0),r.netCents);
});
test('compensação pago a menos aumenta o valor de um acerto pendente',()=>{
 const g=group();g.applications[0].kind='a_menos';
 const r=E.previewGroup(g);
 assert.equal(r.crossCents,300);
 assert.equal(r.netCents,3100);
 assert.equal(r.allocationsCents.reduce((a,b)=>a+b,0),3100);
});
test('sinaliza motivos inválidos, ajustes duplicados e limite de 25',()=>{
 const g=group();g.adjustments[0].reason='sim';
 fail(()=>E.previewGroup(g),/motivo/);
 g.adjustments=direct.map(x=>({...x}));
 g.adjustments[1].id=g.adjustments[0].id;
 fail(()=>E.previewGroup(g),/repetido/);
 g.adjustments=Array.from({length:26},(_,i)=>({...direct[0],id:'A'+i}));
 fail(()=>E.previewGroup(g),/25 ajustes/);
});
test('proteção de compensações: mesma facção, situação e identificador únicos',()=>{
 let g=group();g.applications[0].targetFactionId='F-2';
 fail(()=>E.previewGroup(g),/mesma facção/);
 g=group();g.applications[0].targetStatus='Pago';
 fail(()=>E.previewGroup(g),/origem paga e destino pendente/);
 g=group();g.applications.push({...app});
 fail(()=>E.previewGroup(g),/repetida/);
 g=group();g.applications[0].amount='3,01';
 fail(()=>E.previewGroup(g),/superior ao saldo/);
});
test('não aceita total líquido zero ou negativo',()=>{
 const g=group();g.adjustments=[{id:'D',kind:'abater',amount:'29,00',reason:'Ajuste demonstrativo'}];
 g.applications=[];
 fail(()=>E.previewGroup(g),/maior que zero/);
});
test('sem ajuste e sem compensação continua calculando normalmente',()=>{
 const r=E.previewGroup({lines:[line1,line2]});
 assert.equal(r.netCents,2900);
 assert.deepEqual(r.allocationsCents,[2500,400]);
});
test('rateio por linhas não cria nem perde centavos',()=>{
 assert.deepEqual(E.allocateLines([1000,500],1200),[700,500]);
 assert.deepEqual(E.allocateLines([1000,500],1800),[1300,500]);
 fail(()=>E.allocateLines([1000,500],-1),/Crédito excede/);
});
test('saldo de correção impede usos repetidos e valores superiores ao original',()=>{
 assert.deepEqual(E.correctionRemaining({amount:'5,00',applications:[{id:'X',amount:'2,00'}]}),
 {originalCents:500,appliedCents:200,remainingCents:300});
 fail(()=>E.correctionRemaining({amount:'5,00',applications:[{id:'X',amount:'2,00'},{id:'X',amount:'1,00'}]}),/duplicada/);
 fail(()=>E.correctionRemaining({amount:'5,00',applications:[{id:'X',amount:'6,00'}]}),/ultrapassam/);
});
test('recebimento parcial preserva valor já recebido e créditos anteriores',()=>{
 const r=E.invoiceSummary({total:'100,00',received:'40,00',nextPayment:'20,00',
 returns:[{id:'RET1',amount:'10,00',reason:'Devolução de mercadoria'}]});
 assert.deepEqual(r,{totalCents:10000,priorReceivedCents:4000,nextPaymentCents:2000,
 receivedCents:6000,creditCents:1000,remainingCents:3000,status:'Parcial'});
});
test('não apaga recebimento anterior quando nova parcela é zero',()=>{
 const r=E.invoiceSummary({total:'100,00',received:'40,00',nextPayment:'0,00',returns:[]});
 assert.equal(r.receivedCents,4000);assert.equal(r.remainingCents,6000);assert.equal(r.status,'Parcial');
});
test('devolução estornada não abate o saldo; pagamento integral fica Pago',()=>{
 const a=E.invoiceSummary({total:'100,00',received:'40,00',nextPayment:'20,00',
 returns:[{id:'R-1',amount:'10,00',reason:'Teste',reversedAt:'SIMULACAO'}]});
 assert.equal(a.creditCents,0);assert.equal(a.remainingCents,4000);
 const b=E.invoiceSummary({total:'100,00',received:'100,00',nextPayment:'0',returns:[]});
 assert.equal(b.status,'Pago');assert.equal(b.remainingCents,0);
 const c=E.invoiceSummary({total:'100,00',received:'90,00',nextPayment:'0',
 returns:[{id:'R',amount:'10,00',reason:'Devolução'}]});
 assert.equal(c.status,'Compensado por devolução');
});
test('saldo de recebimento nunca pode ser ultrapassado',()=>{
 fail(()=>E.invoiceSummary({total:'100',received:'95',nextPayment:'10'}),/excede o saldo/);
 fail(()=>E.invoiceSummary({total:'100',received:'90',nextPayment:'0',returns:[{id:'R',amount:'20',reason:'Devolução'}]}),/Abatimentos ultrapassam/);
 fail(()=>E.invoiceSummary({total:'100',received:'110',nextPayment:'0'}),/ultrapassa/);
 fail(()=>E.invoiceSummary({total:'100',received:'1',nextPayment:'0',returns:[{id:'R',amount:'5',reason:''}]}),/motivo/);
});
test('um centavo residual é mostrado para revisão, não como pago silenciosamente',()=>{
 const state=E.invoiceSummary({total:'100,00',received:'99,99',nextPayment:'0',returns:[]});
 assert.equal(state.remainingCents,1);
 assert.equal(state.status,'Revisar centavo residual');
});
test('interface contém motor idêntico ao de testes e não acessa banco ou persistência',()=>{
 const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1].trim());
 assert.equal(scripts.length,2);
 assert.equal(scripts[0],engine.trim());
 assert.doesNotThrow(()=>new vm.Script(scripts[0]));
 assert.doesNotThrow(()=>new vm.Script(scripts[1]));
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/\bindexedDB\b/,/\blocalStorage\b/,/\bsessionStorage\b/,/\bcloudRequest\b/,/https?:\/\//,/<script\b[^>]*\bsrc=/i]){
  assert.equal(re.test(html),false,'acesso externo detectado '+re);
 }
 assert.match(html,/Salvar pagamento \(bloqueado\)/);
 assert.match(html,/Registrar recebimento \(bloqueado\)/);
 assert.match(html,/@media\(max-width:560px\)/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/role="tabpanel"/);
});
