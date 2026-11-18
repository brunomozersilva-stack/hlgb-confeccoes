/* HLGB Evolução — Utilidades > Rotas, somente dados fictícios do laboratório.
 * Sem navegador, rede, estoque, baixa de facção ou preço de venda.
 * É REQUISITO de homologação a leitura do servidor em outro computador;
 * esta implementação não a simula nem finge comprovação remota.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabRoutesV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const error=x=>{throw Error(x)};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const norm=x=>String(x??'').trim().toLocaleLowerCase('pt-BR');
 function text(x,label,max=300,required=false){
  if(typeof x!=='string')error(label+' deve ser texto.');
  const v=x.trim().replace(/\r\n/g,'\n');
  if(v.length>max||(required&&!v))error(label+' inválido (até '+max+' caracteres).');
  return v;
 }
 function date(value){
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\d$/.test(value)||
   Number.isNaN(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)
   error('Informe a data válida da rota.');
  return value;
 }
 function ensure(s){
  if(s.routePlans===undefined)s.routePlans=[];
  if(!Array.isArray(s.routePlans))error('Coleção de rotas inválida. Nenhuma gravação permitida.');
 }
 function location(s,raw){
  if(!raw||typeof raw!=='object')error('Local da parada obrigatório.');
  if(raw.type==='faccao'){
   const faction=s.factions.find(x=>x.id===raw.locationId);
   if(!faction)error('Selecione uma facção cadastrada para cada parada.');
   return {type:'faccao',locationId:faction.id,name:faction.name};
  }
  if(raw.type==='confeccao'){
   if(raw.locationId!=='HLGB-LAB')error('Local interno de demonstração inválido.');
   return {type:'confeccao',locationId:'HLGB-LAB',name:'HLGB Confecções — laboratório'};
  }
  error('Escolha a facção ou confecção da parada; não selecionar automaticamente.');
 }
 function parseList(value,label){
  if(!Array.isArray(value)||value.length>60)error(label+' comporta até 60 itens.');
  let sum=0;
  const found=new Set(),result=[];
  for(const x of value){
   const line=text(x,label+' — item',180,true),key=norm(line);
   if(found.has(key))error(label+': item repetido na mesma parada.');
   found.add(key);result.push(line);sum+=line.length;
  }
  if(sum>5000)error(label+' excede 5000 caracteres.');
  return result;
 }
 function validateStops(s,stops){
  if(!Array.isArray(stops)||stops.length<1||stops.length>30)
   error('Adicione de 1 a 30 paradas na rota.');
  return stops.map((raw,index)=>{
   const loc=location(s,raw),carry=parseList(raw.carry||[],'LEVAR na parada '+(index+1)),
    pickup=parseList(raw.pickup||[],'BUSCAR na parada '+(index+1));
   if(!carry.length&&!pickup.length)error('Parada '+(index+1)+' precisa de LEVAR ou BUSCAR.');
   const notes=text(raw.notes||'','Observações da parada',300);
   return {order:index+1,...loc,carry,pickup,notes};
  });
 }
 function payload(s,p){
  if(!p||typeof p!=='object')error('Formulário de rota ausente.');
  const status=p.status||'planejada';
  if(!['planejada','em_rota','finalizada'].includes(status))error('Estado da rota inválido.');
  return {date:date(p.date),driver:text(p.driver,'Motorista/responsável',95,true),
   status,notes:text(p.notes||'','Observações gerais',800),
   stops:validateStops(s,p.stops)};
 }
 function fingerprint(x){return JSON.stringify({date:x.date,driver:x.driver,status:x.status,notes:x.notes,stops:x.stops});}
 function create(s,p,{next,uid}){
  ensure(s);const validated=payload(s,p);
  const id=next(s,'ROT');
  s.routePlans.push({id,...validated,createdCommandId:uid,lastCommandId:uid,
   history:[{type:'criada',commandId:uid,revision:s.revision+1,afterFingerprint:fingerprint(validated)}]});
  return id+' · '+validated.stops.length+' parada(s) · LEVAR/BUSCAR fictícios';
 }
 function revise(s,p,{uid}){
  ensure(s);const row=s.routePlans.find(x=>x.id===p.id);
  if(!row||row.status==='cancelada')error('Rota inexistente ou cancelada.');
  const validated=payload(s,p);
  if(row.status==='finalizada'&&validated.status!=='finalizada')error('Rota finalizada não pode ser reaberta.');
  const before={date:row.date,driver:row.driver,status:row.status,notes:row.notes,stops:clone(row.stops)};
  if(JSON.stringify(before)===JSON.stringify(validated))error('Nenhuma mudança a salvar na rota.');
  const reason=text(p.reason,'Motivo da edição',300,true);
  const beforeFingerprint=fingerprint(before);
  Object.assign(row,validated,{lastCommandId:uid});
  row.history.push({type:'revisada',commandId:uid,revision:s.revision+1,before,reason,beforeFingerprint,
   afterFingerprint:fingerprint(row)});
  return row.id+' · rota revisada com histórico (apenas laboratório)';
 }
 function cancel(s,p,{uid}){
  ensure(s);const row=s.routePlans.find(x=>x.id===p.id);
  if(!row||row.status==='cancelada'||row.status==='finalizada')error('Somente uma rota aberta pode ser cancelada.');
  const reason=text(p.reason,'Motivo do cancelamento',300,true);
  const beforeFingerprint=fingerprint(row);
  row.status='cancelada';row.lastCommandId=uid;
  row.history.push({type:'cancelada',commandId:uid,revision:s.revision+1,reason,beforeFingerprint,
   afterFingerprint:fingerprint(row)});
  return row.id+' · cancelada sem apagar as paradas anteriores';
 }
 function inspect(s){
  if(s.routePlans===undefined)return [];
  if(!Array.isArray(s.routePlans))return ['Rotas: coleção ilegível'];
  const issues=[],seen=new Set();
  for(const route of s.routePlans){
   try{
    if(!route||!route.id||seen.has(route.id))error('ID ausente ou duplicado');
    seen.add(route.id);
    if(!['planejada','em_rota','finalizada','cancelada'].includes(route.status))error('Estado impossível');
    if(route.status!=='cancelada')payload(s,route);
    else{
     const copy={...route,status:'planejada'};payload(s,copy);
    }
    if(!Array.isArray(route.history)||!route.history.length||route.history[0].type!=='criada'||
      route.history[0].commandId!==route.createdCommandId)error('Histórico de criação inválido');
    const log=s.log||[],historyCommands=new Set();
    let revision=0,priorFingerprint=null;
    for(const h of route.history){
     const entry=log.find(x=>x.commandId===h.commandId);
     if(historyCommands.has(h.commandId)||!entry||entry.revision!==h.revision||
      h.revision<=revision||!['route.plan','route.revise','route.cancel'].includes(entry.type))
      error('Histórico de rota sem prova na revisão global');
     if(h.type==='revisada'&&(!h.reason||!h.before||fingerprint(h.before)!==h.beforeFingerprint))error('Revisão sem justificativa ou estado anterior íntegro');
     if(h.type==='cancelada'&&!h.reason)error('Cancelamento sem justificativa');
     if(typeof h.afterFingerprint!=='string'||!h.afterFingerprint||
       (priorFingerprint!==null&&h.beforeFingerprint!==priorFingerprint))error('Histórico de rota sem cadeia de estados');
     priorFingerprint=h.afterFingerprint;
     revision=h.revision;historyCommands.add(h.commandId);
    }
    if(route.history.at(-1).commandId!==route.lastCommandId)error('Última edição sem referência');
    if(fingerprint(route)!==priorFingerprint)error('Rota alterada fora de um comando válido');
    if(route.status==='cancelada'&&route.history.at(-1).type!=='cancelada')
     error('Cancelamento sem evento');
   }catch(e){issues.push(String(route?.id||'Rota')+': '+e.message)}
  }
  return issues;
 }
 function rows(s){return [...(s.routePlans||[])].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))}
 return Object.freeze({version:'1.0.0-lab',ensure,create,revise,cancel,inspect,rows});
});
