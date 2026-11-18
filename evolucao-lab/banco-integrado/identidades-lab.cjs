'use strict';
// IDENTIDADES FIXTÍCIAS: somente ensaios em localhost e PostgreSQL descartável.
// PINs publicados são deliberadamente de teste. NUNCA usar para dados reais.
const crypto=require('node:crypto');
const employees=Object.freeze({
 A:Object.freeze({code:'A',employeeId:'LAB-FUN-001',actor:'Operador A fictício',label:'Administração de teste'}),
 B:Object.freeze({code:'B',employeeId:'LAB-FUN-002',actor:'Operador B fictício',label:'Operação de teste'}),
 C:Object.freeze({code:'C',employeeId:'LAB-FUN-003',actor:'Operador C fictício',label:'Corte de teste'})
});
const demoPins=Object.freeze({A:'demo-integrado-a',B:'demo-integrado-b',C:'demo-integrado-c'});
function lookup(code){return typeof code==='string'&&Object.hasOwn(employees,code)?employees[code]:null;}
function authenticate(code,pin){
 const employee=lookup(code);
 if(!employee||typeof pin!=='string'||pin.length>128)return null;
 // Comparação de duração constante para este laboratório; não é um provedor de identidade.
 const received=crypto.createHash('sha256').update(pin).digest();
 const stored=crypto.createHash('sha256').update(demoPins[code]).digest();
 return crypto.timingSafeEqual(received,stored)?employee:null;
}
function choices(){return Object.values(employees).map(({code,label})=>({code,label}));}
module.exports=Object.freeze({lookup,authenticate,choices});
