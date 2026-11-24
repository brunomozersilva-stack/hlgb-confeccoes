'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),api=require('../hlgb-modules/financeiro/rh-planning-v9636.js');
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
  fire(k){for(const f of this.listeners[k]||[])f();this['on'+k]?.()}
 }
 const body=new Element('body'),page=new Element('section'),old=new Element('div');page.id='folhaPagamento';page.className='page active';old.id='payrollProvisionCards';page.appendChild(old);body.appendChild(page);
 const walk=r=>[r,...r.children.flatMap(walk)],byId=id=>walk(body).find(x=>x.id===id)||null,events={},docEvents={};
 const doc={body,createElement:t=>new Element(t),getElementById:byId,hidden:false,addEventListener:(k,f)=>(docEvents[k]??=[]).push(f)};
 const win={__HLGB_AUTH_READY:true,HLGBRHPlanning9636:api,addEventListener:(k,f)=>(events[k]??=[]).push(f)};
 const data={employees:[{id:1,name:'Ágata',companyName:'A',hireDate:'2020-01-01',salary:3000},{id:2,name:'Bruna',companyName:'B',hireDate:'2026-06-01',salary:2000}]},cloudUser={id:'tester'},permission={folhaPagamento:true,funcionarios:true};
 const ctx={window:win,document:doc,db:data,cloudUser,canOpenPage:p=>permission[p]===true,setTimeout:f=>{f();return 0},Intl,Date,console};
 vm.runInNewContext(fs.readFileSync('hlgb-modules/financeiro/rh-live-view-v9667.js','utf8'),ctx);
 const host=()=>byId('hlgbRHLive9667'),button=(r,t)=>{const e=walk(r).find(x=>x.tagName==='button'&&x.textContent===t);assert.ok(e,'button '+t);return e},label=(r,t)=>{const e=walk(r).find(x=>x.tagName==='label'&&(x._text===t||x.children.some(c=>c.tagName==='span'&&c.textContent.trim()===t)));assert.ok(e,'field '+t);return e.children.find(x=>['input','select'].includes(x.tagName))};
 const section=t=>{const e=walk(host()).find(x=>x.tagName==='details'&&x.children[0]?.textContent===t);assert.ok(e,t);return e};
 const set=(r,t,v)=>{const x=label(r,t);x.value=v;x.fire('change')},check=(r,t)=>{const x=label(r,t);x.checked=true;x.fire('change')},click=(r,t)=>button(r,t).fire('click');
 return {data,win,permission,page,old,byId,host,walk,section,set,check,click,events,docEvents,cloudUser,fire:(a,k)=>{for(const fn of a[k]||[])fn()}};
}
const f=fixture(),before=JSON.stringify(f.data);
assert.ok(f.host());assert.equal(f.byId('payrollProvisionCards'),f.old);assert.match(f.host().textContent,/2 funcionários ativos/);
const v=f.section('Simular férias coletivas por funcionário e confecção');
f.set(v,'Primeiro período — início','2026-12-21');f.set(v,'Primeiro período — fim','2027-01-09');f.check(v,'Simular também um segundo período');f.set(v,'Segundo período — início','2027-02-08');f.set(v,'Segundo período — fim','2027-02-17');f.set(v,'Filtrar confecção','A');f.click(v,'Selecionar todos do filtro');
f.set(v,'Dias disponíveis comprovados','30');f.set(v,'Direito neste ciclo','acquired');f.check(v,'Conferi base, direito e saldo com os registros de RH');f.click(v,'Calcular férias coletivas');
assert.match(v.textContent,/1 de 1 funcionários revisados/);assert.match(v.textContent,/20 dias/);assert.match(v.textContent,/10 dias/);assert.match(v.textContent,/4\.000,00/);
const p=f.section('Provisões por período aquisitivo — total e filtros');
f.set(p,'Funcionário','1');f.set(p,'Início aquisitivo','2023-01-01');f.set(p,'Fim aquisitivo','2023-12-31');f.set(p,'Fim concessivo','2024-12-31');f.set(p,'Dias restantes','10');f.set(p,'Valor provisionado do período (R$)','1000');f.check(p,'Conferi o período, o saldo e o valor com RH');f.set(p,'Data de referência','2026-11-23');f.click(p,'Adicionar / atualizar período revisado');
f.set(p,'Início aquisitivo','2025-01-01');f.set(p,'Fim aquisitivo','2025-12-31');f.set(p,'Fim concessivo','2026-12-31');f.set(p,'Dias restantes','20');f.set(p,'Valor provisionado do período (R$)','2000');f.check(p,'Conferi o período, o saldo e o valor com RH');f.click(p,'Adicionar / atualizar período revisado');f.set(p,'Visualização','acquired');
assert.match(p.textContent,/3\.000,00/);assert.match(p.textContent,/2\.000,00/);assert.match(p.textContent,/2 períodos revisados/);
const n=f.section('Planejar desligamento e conferir verbas');
f.set(n,'Funcionário','1');f.set(n,'Data de comunicação','2026-11-23');f.set(n,'Modalidade','employer-no-cause');f.set(n,'Aviso','indemnified');f.check(n,'Conferi admissão, salário e modalidade');f.set(n,'Descrição da verba revisada','Saldo revisado');f.set(n,'Tipo de verba','credit');f.set(n,'Situação','open');f.set(n,'Valor da verba (R$)','500');f.click(n,'Adicionar verba conferida');f.click(n,'Simular desligamento');
assert.match(n.textContent,/48 dias/);assert.match(n.textContent,/4\.800,00/);assert.match(n.textContent,/500,00/);assert.match(n.textContent,/Não é valor líquido/);
assert.equal(JSON.stringify(f.data),before);
f.data.employees[0].salary=3500;f.click(n,'Simular desligamento');assert.match(n.textContent,/Confira o cadastro atualizado/);f.data.employees[0].salary=3000;
f.permission.funcionarios=false;f.fire(f.docEvents,'click');assert.equal(f.host(),null);assert.equal(f.byId('payrollProvisionCards'),f.old);
f.permission.funcionarios=true;f.fire(f.docEvents,'click');assert.ok(f.host());assert.doesNotMatch(f.host().textContent,/4\.000,00/);
f.cloudUser.id='other';f.fire(f.docEvents,'click');assert.equal(f.host().dataset.actor,'other');f.win.__HLGB_AUTH_READY=false;f.fire(f.events,'hlgb:logout');assert.equal(f.host(),null);
console.log('PASS RH live DOM fixture: roster, vacations, provisions, notice, stale source, permissions and logout');
