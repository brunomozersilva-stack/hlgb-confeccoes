/* HLGB Evolução — Embaladeira e modelos de etiqueta de cliente.
 * SOMENTE LAB: não modifica embalagem operacional antiga, pedido, estoque,
 * facções, acertos ou títulos financeiros. Nunca confirma trabalho real.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabPackersV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const fail=m=>{throw Error(m)};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const by=(xs,id)=>xs.find(x=>x.id===id);
 const norm=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 const txt=(x,label,max=95,needed=true)=>{
  if(typeof x!=='string')fail(label+' precisa ser texto.');
  const y=x.trim();
  if((needed&&!y)||y.length>max)fail(label+' inválido (máximo '+max+' caracteres).');
  return y;
 };
 const integer=(x,label,min,max)=>{if(!Number.isSafeInteger(x)||x<min||x>max)fail(label+' inválido.');return x};
 function date(x){
  if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||
   !Number.isFinite(Date.parse(x+'T00:00:00Z'))||
   new Date(x+'T00:00:00Z').toISOString().slice(0,10)!==x)fail('Data inválida.');
  return x;
 }
 function ensure(s){
  if(s.labelTemplatesLab===undefined)s.labelTemplatesLab=[];
  if(s.packerAssignmentsLab===undefined)s.packerAssignmentsLab=[];
  if(!Array.isArray(s.labelTemplatesLab)||!Array.isArray(s.packerAssignmentsLab))
   fail('Estado de Embalagem ilegível. Não gravar.');
 }
 function fingerprint(obj){
  return JSON.stringify(obj);
 }
 function templateFields(s,p){
  if(!p||typeof p!=='object')fail('Formulário de etiqueta ausente.');
  const client=by(s.clients,p.clientId);
  if(!client)fail('Cliente não cadastrado na homologação.');
  const productId=p.productId||'';
  const product=productId?by(s.products,productId):null;
  if(productId&&!product)fail('Produto da etiqueta não cadastrado.');
  const cnpj=txt(p.cnpj||'','CNPJ impresso',30,false);
  if(cnpj&&!(cnpj.replace(/\D/g,'').length===14&&/^[0-9.\/-]+$/.test(cnpj)))fail('CNPJ deve conter 14 dígitos.');
  const url=txt(p.productUrl||'','URL do produto',300,false);
  if(url&&!/^https:\/\/[^\s<>"']{3,}$/i.test(url))fail('Somente URL HTTPS explícita; sem links locais.');
  const filename=txt(p.fileName||'','Nome de arquivo',115,false);
  if(filename&&!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,110}\.(pdf|png|jpg|jpeg)$/iu.test(filename))
   fail('Nome do arquivo de referência inválido (.pdf, .png ou .jpg).');
  const sku=txt(p.sku||product?.sku||'','SKU',95,false);
  return {clientId:client.id,clientName:client.name,productId:productId||'',
   productName:product?.name||'',sku,cnpj,productUrl:url,fileName:filename,
   fieldsNote:txt(p.fieldsNote||'','Campos variáveis / observações',500,false)};
 }
 function activeTemplate(s,clientId,productId){
  const list=s.labelTemplatesLab||[];
  return list.find(x=>x.active&&x.clientId===clientId&&x.productId===productId)
    ||list.find(x=>x.active&&x.clientId===clientId&&x.productId==='')||null;
 }
 function addTemplate(s,p,{next,uid}){
  ensure(s);
  const fields=templateFields(s,p);
  if(s.labelTemplatesLab.some(x=>x.active&&x.clientId===fields.clientId&&x.productId===fields.productId))
   fail('Já existe modelo de etiqueta ativo para este cliente/produto. Edite o registro.');
  const id=next(s,'ETM');
  s.labelTemplatesLab.push({id,...fields,active:true,version:1,createdCommandId:uid,
   updatedCommandId:uid,history:[{type:'created',commandId:uid,revision:s.revision+1,
   version:1,afterFingerprint:fingerprint(fields)}]});
  return id+' · modelo de etiqueta fictício cadastrado';
 }
 function editTemplate(s,p,{uid}){
  ensure(s);
  const template=by(s.labelTemplatesLab,p.id);
  if(!template||!template.active)fail('Modelo de etiqueta inexistente ou inativo.');
  const fields=templateFields(s,p);
  if(s.labelTemplatesLab.some(x=>x.id!==template.id&&x.active&&x.clientId===fields.clientId&&x.productId===fields.productId))
   fail('Já existe etiqueta ativa para o mesmo cliente e produto.');
  const before=Object.fromEntries(Object.keys(fields).map(k=>[k,template[k]]));
  if(fingerprint(before)===fingerprint(fields))fail('Modelo não foi alterado. Nenhuma gravação necessária.');
  const reason=txt(p.reason,'Motivo da edição',200);
  Object.assign(template,fields);
  template.version++;template.updatedCommandId=uid;
  template.history.push({type:'edited',commandId:uid,revision:s.revision+1,
   before,afterFingerprint:fingerprint(fields),version:template.version,reason});
  return template.id+' · versão '+template.version+' registrada; trabalhos anteriores preservados';
 }
 function archiveTemplate(s,p,{uid}){
  ensure(s);
  const template=by(s.labelTemplatesLab,p.id);
  if(!template||!template.active)fail('Modelo de etiqueta já inativo ou inexistente.');
  const reason=txt(p.reason,'Justificativa',200);
  template.active=false;template.updatedCommandId=uid;
  template.history.push({type:'archived',commandId:uid,revision:s.revision+1,
   version:template.version,reason,afterFingerprint:'archived'});
  return template.id+' · arquivado sem excluir históricos';
 }
 function labelSnapshot(s,clientId,productId){
  const t=activeTemplate(s,clientId,productId);
  return t?{id:t.id,version:t.version,clientId:t.clientId,productId:t.productId,
   fileName:t.fileName,sku:t.sku,cnpj:t.cnpj,productUrl:t.productUrl,
   fieldsNote:t.fieldsNote}:null;
 }
 function baseAssignment(s,p){
  const employee=by(s.employees,p.packerId),client=by(s.clients,p.clientId),
   product=by(s.products,p.productId);
  if(!employee||!client||!product)fail('Escolha embaladeira, cliente e modelo cadastrados.');
  const qty=integer(p.qty,'Peças enviadas à embaladeira',1,100000),
   labelQty=integer(p.labelQty,'Quantidade de etiquetas',0,100000),
   size=txt(p.size,'Tamanho da peça',40),
   color=txt(p.color||'','Cor',60,false);
  const due=date(p.date);
  return {packerId:employee.id,packerName:employee.name,
   clientId:client.id,clientName:client.name,
   productId:product.id,productName:product.name,
   date:due,size,color,qty,labelQty,
   notes:txt(p.notes||'','Observações',500,false)};
 }
 function statusOf(row){return row.doneQty===row.qty?'concluido':row.doneQty>0?'parcial':'aguardando'}
 const assignmentFields=['packerId','packerName','clientId','clientName','productId',
  'productName','date','size','color','qty','labelQty','notes'];
 function assignmentSnapshot(row){
  return Object.fromEntries(assignmentFields.map(k=>[k,clone(row[k])]));
 }
 function assignmentFingerprint(row){
  return fingerprint({fields:assignmentSnapshot(row),label:row.labelSnapshot});
 }
 function assign(s,p,{next,uid}){
  ensure(s);
  const valid=baseAssignment(s,p);
  if(s.packerAssignmentsLab.some(x=>x.status!=='cancelado'&&x.packerId===valid.packerId&&
   x.clientId===valid.clientId&&x.productId===valid.productId&&
   norm(x.size)===norm(valid.size)&&norm(x.color)===norm(valid.color)&&
   x.date===valid.date&&x.qty===valid.qty))
   fail('Tarefa semelhante já existe para a mesma embaladeira e data. Confira antes de duplicar.');
  const id=next(s,'EBA');
  const row={id,...valid,doneQty:0,status:'aguardando',
   labelSnapshot:labelSnapshot(s,valid.clientId,valid.productId),
   createdCommandId:uid,lastCommandId:uid,
   history:[]};
  row.history.push({type:'created',commandId:uid,revision:s.revision+1,
   afterFingerprint:assignmentFingerprint(row),doneAfter:0});
  s.packerAssignmentsLab.push(row);
  return id+' · '+valid.qty+' peças atribuídas somente no laboratório';
 }
 function reviseAssignment(s,p,{uid}){
  ensure(s);
  const row=by(s.packerAssignmentsLab,p.id);
  if(!row||row.status==='cancelado'||row.status==='concluido')
   fail('Somente tarefa de embalagem aguardando/parcial pode ser editada.');
  const valid=baseAssignment(s,p);
  if(valid.qty<row.doneQty)fail('Nova quantidade não pode ser inferior ao já registrado como pronto.');
  const before=assignmentSnapshot(row),after=fingerprint(valid);
  if(fingerprint(before)===after)fail('Nenhuma alteração na atribuição.');
  const reason=txt(p.reason,'Motivo da edição',200);
  Object.assign(row,valid);
  row.labelSnapshot=labelSnapshot(s,valid.clientId,valid.productId);
  row.status=statusOf(row);row.lastCommandId=uid;
  row.history.push({type:'revised',commandId:uid,revision:s.revision+1,
   before,doneBefore:row.doneQty,afterFingerprint:assignmentFingerprint(row),doneAfter:row.doneQty,reason});
  return row.id+' · atribuição revisada sem apagar a anterior';
 }
 function progress(s,p,{uid}){
  ensure(s);
  const row=by(s.packerAssignmentsLab,p.id);
  if(!row||row.status==='cancelado')fail('Tarefa de embalagem inexistente ou cancelada.');
  const done=integer(p.doneQty,'Quantidade pronta',0,row.qty);
  if(done===row.doneQty)fail('Quantidade pronta idêntica à última. Não duplicar evento.');
  const reason=txt(p.reason,'Conferência / motivo',200);
  const before=row.doneQty;
  // Correção para baixo é explícita, justificada e preserva a quantidade anterior.
  if(done<before&&p.correction!==true)fail('Redução exige marcar correção com justificativa.');
  row.doneQty=done;row.status=statusOf(row);row.lastCommandId=uid;
  row.history.push({type:done<before?'corrected':'progressed',commandId:uid,
   revision:s.revision+1,doneBefore:before,doneAfter:done,
   afterFingerprint:assignmentFingerprint(row),reason});
  return row.id+' · '+done+' de '+row.qty+' peças prontas ('+row.status+')';
 }
 function cancelAssignment(s,p,{uid}){
  ensure(s);
  const row=by(s.packerAssignmentsLab,p.id);
  if(!row||row.status==='cancelado'||row.doneQty>0)
   fail('Somente atribuição sem peças prontas pode ser cancelada.');
  const reason=txt(p.reason,'Motivo do cancelamento',200);
  row.status='cancelado';row.lastCommandId=uid;
  row.history.push({type:'cancelled',commandId:uid,revision:s.revision+1,
   afterFingerprint:assignmentFingerprint(row),reason,doneAfter:0});
  return row.id+' · cancelada preservando o histórico';
 }
 function inspect(s){
  if(s.labelTemplatesLab===undefined&&s.packerAssignmentsLab===undefined)return [];
  const issues=[];
  if(!Array.isArray(s.labelTemplatesLab)||!Array.isArray(s.packerAssignmentsLab))
   return ['Embalagem: coleção inválida'];
  const unique=new Set(),templateKeys=new Set(),log=new Map((s.log||[]).map(x=>[x.commandId,x]));
  for(const t of s.labelTemplatesLab){
   try{
    if(unique.has(t.id))fail('ID de modelo de etiqueta duplicado');unique.add(t.id);
    if(!by(s.clients,t.clientId)||(t.productId&&!by(s.products,t.productId)))
     fail('Cliente/produto da etiqueta não localizado');
    const key=t.clientId+'|'+t.productId;
    if(t.active){if(templateKeys.has(key))fail('Modelos ativos duplicados');templateKeys.add(key);}
    if(!Array.isArray(t.history)||!t.history.length||t.history[0].type!=='created'||
      t.version<1||t.history.filter(x=>x.type==='edited').length+1!==t.version)
      fail('Histórico/versionamento da etiqueta inválido');
    if(t.history.at(-1).commandId!==t.updatedCommandId)fail('Última edição da etiqueta sem comando');
    if(t.active!==true&&t.history.at(-1).type!=='archived')fail('Arquivo de etiqueta sem evento');
    let prev=0;for(const e of t.history){
     const v=log.get(e.commandId);
     if(!v||v.revision!==e.revision||e.revision<=prev||!{
      created:'label.template.add',edited:'label.template.edit',archived:'label.template.archive'
     }[e.type]||v.type!=={created:'label.template.add',edited:'label.template.edit',archived:'label.template.archive'}[e.type])
      fail('Evento da etiqueta sem origem ou fora de ordem');
     prev=e.revision;
    }
    const actual=Object.fromEntries(['clientId','clientName','productId','productName','sku',
      'cnpj','productUrl','fileName','fieldsNote'].map(k=>[k,t[k]]));
    if(t.active&&fingerprint(actual)!==t.history.at(-1).afterFingerprint)fail('Etiqueta alterada fora do histórico');
   }catch(e){issues.push(String(t?.id||'ETM')+': '+e.message)}
  }
  for(const row of s.packerAssignmentsLab){
   try{
    if(unique.has(row.id))fail('ID de tarefa duplicado');unique.add(row.id);
    if(!by(s.employees,row.packerId)||!by(s.clients,row.clientId)||!by(s.products,row.productId))
     fail('Cadastros vinculados à tarefa ausentes');
    integer(row.qty,'Quantidade da tarefa',1,100000);
    integer(row.doneQty,'Pronto da tarefa',0,row.qty);
    integer(row.labelQty,'Etiquetas da tarefa',0,100000);
    if(row.status!=='cancelado'&&statusOf(row)!==row.status)fail('Estado/pronto divergentes');
    if(!Array.isArray(row.history)||!row.history.length||row.history[0].type!=='created'||
      row.history.at(-1).commandId!==row.lastCommandId)fail('Histórico da tarefa incompleto');
    if(row.status==='cancelado'&&row.history.at(-1).type!=='cancelled')fail('Cancelamento sem evento');
    const snap=row.labelSnapshot;
    if(snap){
     const tmpl=by(s.labelTemplatesLab,snap.id);
     if(!tmpl||tmpl.clientId!==snap.clientId||snap.clientId!==row.clientId||
      (snap.productId&&snap.productId!==row.productId)||snap.version>tmpl.version)
      fail('Etiqueta vinculada ao cliente/modelo incorreto');
    }
    let prev=0;for(const e of row.history){
     const event=log.get(e.commandId);
     if(!event||event.revision!==e.revision||e.revision<=prev||
      event.type!=={created:'packer.assign',revised:'packer.revise',
      progressed:'packer.progress',corrected:'packer.progress',cancelled:'packer.cancel'}[e.type])
      fail('Tarefa com operação sem prova global');
     prev=e.revision;
    }
    if(assignmentFingerprint(row)!==row.history.at(-1).afterFingerprint)
     fail('Tarefa alterada fora da revisão');
    if(row.history.at(-1).doneAfter!==row.doneQty)fail('Quantidade pronta sem prova');
    const steps=row.history.filter(x=>x.type==='progressed'||x.type==='corrected');
    for(const event of steps){if(!Number.isSafeInteger(event.doneBefore)||!Number.isSafeInteger(event.doneAfter)||
     event.doneBefore<0||event.doneAfter<0||
     (event.type==='progressed'&&event.doneAfter<=event.doneBefore)||
     (event.type==='corrected'&&event.doneAfter>=event.doneBefore))
      fail('Movimento de embalagem incoerente com o histórico');}
   }catch(e){issues.push(String(row?.id||'EBA')+': '+e.message)}
  }
  return issues;
 }
 function dashboard(s){
  const rows=[...(s.packerAssignmentsLab||[])],active=rows.filter(x=>x.status!=='cancelado');
  const total=active.reduce((n,x)=>n+x.qty,0),done=active.reduce((n,x)=>n+x.doneQty,0);
  return {assignments:active.length,total,done,pending:total-done,
   waiting:active.filter(x=>x.status==='aguardando').length,
   partial:active.filter(x=>x.status==='parcial').length,
   missingLabel:active.filter(x=>!x.labelSnapshot).length,
   rows:active.map(x=>({...x,remaining:x.qty-x.doneQty})),
   byPacker:[...new Set(active.map(x=>x.packerId))].map(id=>{
    const worker=by(s.employees,id);
    const items=active.filter(x=>x.packerId===id);
    return {packerId:id,name:worker?.name||id,assigned:items.reduce((n,x)=>n+x.qty,0),
     ready:items.reduce((n,x)=>n+x.doneQty,0),
     pending:items.reduce((n,x)=>n+x.qty-x.doneQty,0)};
   })};
 }
 return Object.freeze({version:'1.0.0-lab',ensure,addTemplate,editTemplate,archiveTemplate,
  activeTemplate,labelSnapshot,assign,reviseAssignment,progress,cancelAssignment,inspect,dashboard});
});
