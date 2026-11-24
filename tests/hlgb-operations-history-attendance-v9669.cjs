'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const history=require('../hlgb-modules/financeiro/settlement-history-v9653.js'),attendance=require('../hlgb-modules/financeiro/attendance-transport-preview-v9658.js'),planning=require('../hlgb-modules/financeiro/payroll-calendar-transport-workers-v9645.js');
function fixture(){
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.parentNode=null;this.dataset={};this.style={};this.attributes={};this.listeners={};this._text='';this._value='';this.checked=false;this.className='';this.classList={contains:k=>this.className.split(/\s+/).includes(k)}}
  set textContent(v){this.replaceChildren();this._text=String(v??'')}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join('')}
  get isConnected(){return this===body||!!this.parentNode?.isConnected}
  get options(){return this.tagName==='select'?this.children:undefined}
  get value(){return this._value}
  set value(v){this._value=String(v??'');if(this.tagName==='option'&&this.parentNode?.tagName==='select'&&this.parentNode.children[0]===this)this.parentNode._value=this._value}
  appendChild(x){x.parentNode=this;this.children.push(x);return x}
  replaceChildren(...items){for(const x of this.children)x.parentNode=null;this.children=[];this._text='';for(const x of items)this.appendChild(x);if(this.tagName==='select')this._value=''}
  remove(){if(this.parentNode){const p=this.parentNode;p.children=p.children.filter(x=>x!==this);this.parentNode=null}}
  setAttribute(k,v){this.attributes[k]=String(v)}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f)}
  async fire(k){for(const f of this.listeners[k]||[])await f();await this['on'+k]?.()}
 }
 const body=new Element('body'),sections={};
 for(const id of ['pagamentosFaccoes','notas','folhaPagamento']){const s=new Element('section');s.id=id;s.className='page'+(id==='pagamentosFaccoes'?' active':'');sections[id]=s;body.appendChild(s);const old=new Element('div');old.id='old-'+id;s.appendChild(old)}
 const walk=r=>[r,...r.children.flatMap(walk)],byId=id=>walk(body).find(x=>x.id===id)||null,events={},docEvents={};
 const doc={body,createElement:t=>new Element(t),getElementById:byId,hidden:false,querySelectorAll:s=>s==='[data-hlgb-history-view9654]'?walk(body).filter(x=>x.dataset.hlgbHistoryView9654):[],addEventListener:(k,f)=>(docEvents[k]??=[]).push(f)};
 const p={id:'p1',manual:true,manualGroupId:'g',factionMasterId:'F1',factionName:'Roseli',description:'Camisola Rubi',quantity:10,unitPrice:10,value:100,paidAmount:90,status:'Pago',paymentDate:'2026-11-20',travetaDiscountTotalV9577:10},p2={...p,id:'p2',description:'Calcinha',value:50,paidAmount:50},group={id:'g',factionName:'Roseli',date:'2026-11-20',status:'Pago',total:140,rows:[p,p2]};
 const note={key:'projection:1',id:'1',number:'NF 100',clientKey:'id:C1',client:'João',issued:'2026-11-10',total:10000,paid:5000,credit:1000,balance:4000},record={id:'1',clientId:'C1',paymentHistory:[{id:'a',date:'2026-11-21',value:30,method:'PIX'},{id:'b',date:'2026-11-22',value:20,tradeSettlementId:'trade'}],acertoReturnsV9565:[{id:'r1',date:'2026-11-23',value:10}]};
 const data={employees:[{id:'001',name:'Ana',companyName:'A',hasTransport:true},{id:'002',name:'Bruna',companyName:'B',hasTransport:false}],factionPayments:[p,p2],payroll:[{id:'s1',employeeId:'001',employeeName:'Ana',month:'2026-10',paid:true,paidAt:'2026-11-06',paidValue:2000}],orders:[],projectionInvoices:[record]};
 const permission={pagamentosFaccoes:true,faccoes:true,notas:true,financeiro:true,folhaPagamento:true},cloudUser={id:'tester'};
 const win={__HLGB_AUTH_READY:true,HLGBSettlementHistory9653:history,HLGBAttendance9658:attendance,HLGBPayrollPlanning9645:planning,hlgbFactionManual9566:{receiptGroups:()=>[group]},hlgbNotesReceivables9564:{allNotes:()=>[note]},hlgbCanonicalProjectionInvoices:()=>data.projectionInvoices,addEventListener:(k,f)=>(events[k]??=[]).push(f)};
 class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-11-23T15:00:00Z']))}}
 const ctx={window:win,document:doc,db:data,cloudUser,canOpenPage:p=>permission[p]===true,setTimeout:f=>{f();return 0},Intl,Date:FixedDate,console,confirm:()=>true};
 for(const file of ['settlement-history-view-v9654.js','attendance-transport-view-v9658.js'])vm.runInNewContext(fs.readFileSync('hlgb-modules/financeiro/'+file,'utf8'),ctx);
 const h=kind=>byId('hlgb-settlement-history-9654-'+kind),a=()=>byId('hlgbAttendance9658'),button=(r,t)=>{const e=walk(r).find(x=>x.tagName==='button'&&x.textContent===t);assert.ok(e,'button '+t);return e},label=(r,t)=>{const e=walk(r).find(x=>x.tagName==='label'&&(x._text===t||x.children.some(c=>c.tagName==='span'&&c.textContent.trim()===t)));assert.ok(e,'field '+t);return e.children.find(x=>['input','select'].includes(x.tagName))};
 const set=async(r,t,v)=>{const x=label(r,t);x.value=v;await x.fire('change')},check=async(r,t)=>{const x=label(r,t);x.checked=true;await x.fire('change')},click=(r,t)=>button(r,t).fire('click');
 const fire=async(a,k)=>{for(const fn of a[k]||[])await fn()},navigate=async id=>{for(const [k,s] of Object.entries(sections))s.className='page'+(k===id?' active':'');await fire(docEvents,'click')};
 return {h,a,data,permission,cloudUser,win,byId,walk,set,check,click,events,docEvents,fire,navigate,label};
}
async function main(){
 const f=fixture(),before=JSON.stringify(f.data);assert.ok(f.h('faccao'));assert.match(f.h('faccao').textContent,/140,00/);
 await f.set(f.h('faccao'),'Visualização do histórico','owners');await f.click(f.h('faccao'),'Ver acertos desta pessoa');assert.match(f.h('faccao').textContent,/Camisola Rubi/);assert.match(f.h('faccao').textContent,/Travetada descontada R\$/);
 await f.navigate('notas');assert.equal(f.h('faccao'),null);assert.ok(f.byId('old-pagamentosFaccoes'));const client=f.h('cliente');assert.ok(client);
 await f.set(client,'Visualização do histórico','events');assert.match(client.textContent,/3 encontrados/);assert.match(client.textContent,/Recebimentos registrados R\$\s*30,00/);assert.match(client.textContent,/Abatimentos de matéria-prima R\$\s*20,00/);
 await f.set(client,'De','2026-11-22');await f.set(client,'Até','2026-11-22');assert.match(client.textContent,/1 encontrados/);await f.set(client,'Tipo de evento','payment-recorded');assert.match(client.textContent,/0 encontrados/);
 f.permission.financeiro=false;await f.fire(f.docEvents,'click');assert.equal(f.h('cliente'),null);f.permission.financeiro=true;
 await f.navigate('folhaPagamento');assert.ok(f.h('funcionario'));const a=f.a();assert.ok(a);assert.ok(f.byId('old-folhaPagamento'));
 const file=f.label(a,'CSV diário');const raw=[attendance.header.join(';'),'001;2026-11-03;sim;trabalhado;sim;12,00;nao','001;2026-11-04;sim;falta_injustificada;nao;12,00;nao','001;2026-11-24;sim;pendente;pendente;;nao'].join('\n');file.files=[{size:raw.length,text:async()=>raw}];await file.fire('change');assert.match(a.textContent,/3 registros observados/);
 const bulk=f.walk(a).find(x=>x.tagName==='details'&&x.children[0]?.textContent==='Conferência coletiva de ponto e passagem por confecção');assert.ok(bulk);
 await f.set(bulk,'Feriados informados (datas separadas por vírgula)','2026-11-02');await f.click(bulk,'Usar data candidata no campo comum');assert.equal(f.label(bulk,'Data de cobertura comum para preencher seleção').value,'2026-11-09');
 await f.set(bulk,'Confecção do lote','A');await f.click(bulk,'Selecionar todos do filtro');await f.set(bulk,'Tarifa diária comum para preencher seleção (R$)','12');await f.click(bulk,'Preencher parâmetros comuns nos selecionados');await f.check(bulk,'Conferi a tarifa e a cobertura deste funcionário');await f.click(bulk,'Calcular prévia coletiva de passagem');
 assert.match(bulk.textContent,/1 de 1 funcionários calculados/);assert.match(bulk.textContent,/Antecipação observada após cobertura: R\$\s*12,00/);assert.match(bulk.textContent,/Crédito possível por falta de deslocamento: R\$\s*12,00/);assert.match(bulk.textContent,/Nenhum desconto aplicado/);
 await f.set(bulk,'Passagem antecipada até','2026-11-30');await f.check(bulk,'Conferi a tarifa e a cobertura deste funcionário');await f.click(bulk,'Calcular prévia coletiva de passagem');assert.match(bulk.textContent,/Cobertura futura ainda não comprovada/);
 assert.equal(JSON.stringify(f.data),before);
 f.cloudUser.id='other';await f.fire(f.docEvents,'click');assert.equal(f.a().dataset.actor,'other');assert.doesNotMatch(f.a().textContent,/3 registros observados/);
 f.win.__HLGB_AUTH_READY=false;await f.fire(f.events,'hlgb:logout');assert.equal(f.a(),null);assert.equal(f.h('funcionario'),null);
 console.log('PASS complete history/attendance DOM fixture; no changes to original data');
}
main().catch(e=>{console.error(e);process.exitCode=1});
