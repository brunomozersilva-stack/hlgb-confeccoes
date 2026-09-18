const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('app9240.html','utf8');
const source=html.slice(html.indexOf('function editClient(id){'),html.indexOf('function clientPricing(id){'));
function scenario(remote){
 const original={id:1,name:'TESTE WORK',phone:'',city:'Original',document:'',prices:{137:10}};
 let submit,saves=0,closed=0;const alerts=[];
 const ctx={db:{clients:[original]},clientForm(){return ''},openModal(t,b,fn){submit=fn},closeModal(){closed++},save(){saves++},alert:m=>alerts.push(m),mname:{value:'TESTE WORK'},mphone:{value:''},mcity:{value:'Nova cidade'},mdoc:{value:''}};
 vm.createContext(ctx);vm.runInContext(source,ctx);ctx.editClient(1);
 // Incoming synchronization replaces the object while the form is open.
 ctx.db.clients=remote===null?[]:[{...original,...remote}];
 submit();return {ctx,saves,closed,alerts,original};
}
let r=scenario({phone:'Outro campo atualizado'});
assert.equal(r.ctx.db.clients[0].city,'Nova cidade');
assert.equal(r.ctx.db.clients[0].phone,'Outro campo atualizado');
assert.equal(r.original.city,'Original');
assert.equal(r.saves,1);
r=scenario({city:'Outra sessão'});
assert.equal(r.saves,0);assert.equal(r.closed,0);assert.equal(r.alerts.length,1);
assert.equal(r.ctx.db.clients[0].city,'Outra sessão');
r=scenario(null);
assert.equal(r.saves,0);assert.equal(r.ctx.db.clients.length,0);
console.log('PASS client edit: current object updated, other fields preserved, conflicting field and removed client blocked.');
