'use strict';
// Visão de leitura por inclusão explícita, SOMENTE para o laboratório fictício local.
// Nunca enviar o documento integral à sessão de produção: títulos, folha, salários,
// preços, auditoria, notas e históricos podem conter dados administrativos.
const {profile}=require('./permissoes-lab.cjs');
const fields={
 clients:['id','name'],
 products:['id','sku','name'],
 factions:['id','name'],
 orders:['id','clientId','productId','grade','cut','allocated','returned','separated','shipped','factionId'],
 cutPlans:['id','orderId','grade','status'],
 factionAssignments:['id','orderId','factionId','qtySent','qtyReturned']
};
function scalar(value){
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
 return undefined;
}
function grade(obj){
 const keys=['P','M','G','GG'],out={};
 if(!obj||typeof obj!=='object')return null;
 for(const key of keys){
  if(!Number.isSafeInteger(obj[key])||obj[key]<0)return null;
  out[key]=obj[key];
 }
 return out;
}
function projectRow(row,columns){
 if(!row||typeof row!=='object')throw Error('Registro operacional inválido');
 const projected={};
 for(const key of columns){
  if(key==='grade'||key==='cut'){projected[key]=grade(row[key]);if(!projected[key])throw Error('Grade operacional inválida');continue;}
  const value=scalar(row[key]);
  if(value===undefined)throw Error('Campo operacional fora do contrato: '+key);
  projected[key]=value;
 }
 return projected;
}
const cutFields={products:fields.products,orders:['id','productId','grade','cut'],cutPlans:fields.cutPlans};
function project(state,actor){
 if(profile(actor)?.id!=='demo-production')throw Error('Perfil sem autorização para a visão de produção');
 if(!state||state.schema!=='hlgb-evolucao-operacao-ficticia-v1'||!Number.isSafeInteger(state.revision))throw Error('Documento do laboratório inválido');
 const cutOnly=profile(actor).readScope==='production_cut_only_ficticio';
 const view={schema:'hlgb-evolucao-operacao-producao-ficticia-v1',readScope:cutOnly?'production_cut_only_ficticio':'production_only_ficticio',revision:state.revision};
 for(const [key,columns] of Object.entries(cutOnly?cutFields:fields)){
  if(!Array.isArray(state[key]))throw Error('Lista operacional indisponível: '+key);
  view[key]=state[key].map(x=>projectRow(x,columns));
 }
 return view;
}
module.exports=Object.freeze({project});
