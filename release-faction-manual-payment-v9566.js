/* HLGB v95.66 — Pagamento avulso de facções, busca real, preço da ficha,
   travetada e comprovante PDF. Plugin isolado; não altera registros existentes. */
(function(){
'use strict';
if(window.hlgbFactionManual9566)return;
const V='95.66',MAX_PDF=750*1024,STATUS={idle:'idle',saving:'saving'};
const state={status:STATUS.idle,lastError:'',lastResult:null,opened:0},sid=x=>String(x??'');
const norm=x=>sid(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const esc=x=>sid(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const number=x=>Number(sid(x).replace(',','.')),money=n=>(Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const stamp=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dbRef=()=>{try{return typeof db!=='undefined'&&db?db:window.db||{}}catch(_){return window.db||{}}};
const arr=name=>Array.isArray(dbRef()[name])?dbRef()[name]:[];
const makeId=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
let draft=null;
function factionDirectory(){
 const map=new Map(),add=(name,id,source,role='faccao')=>{
  const text=sid(name).trim(),key=norm(text);
  if(!text||!key)return;
  const existing=map.get(key);
  if(!existing||source==='Cadastro')map.set(key,{name:text,id:sid(id||''),source,role});
 };
 arr('factionMasters').filter(x=>x?.active!==false).forEach(f=>add(f.name,f.id,'Cadastro',sid(f.factionRoleV9577||'faccao')));
 arr('factions').forEach(f=>add(f.name||f.factionName,f.factionMasterId||'','Produção'));
 arr('factionPayments').forEach(f=>add(f.factionName,'','Histórico'));
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function productDirectory(){
 return arr('products').filter(p=>p&&p.id!=null&&p.active!==false)
  .slice().sort((a,b)=>sid(a.name||'').localeCompare(sid(b.name||''),'pt-BR'));
}
function productPrice(p){
 const n=Number(p?.factionCost);
 return Number.isFinite(n)&&n>0?+n.toFixed(2):null;
}
function searchRows(items,q,formatter,limit=35){
 const terms=norm(q).split(' ').filter(Boolean);
 return items.filter(x=>terms.every(t=>norm(formatter(x)).includes(t))).slice(0,limit);
}
function searchFactions(q,mode='faccao'){return searchRows(factionDirectory().filter(x=>mode==='embalagem'?x.role==='embaladeira':x.role!=='embaladeira'),q,x=>x.name,60)}
function searchProducts(q){return searchRows(productDirectory(),q,x=>[x.name,x.code,x.sku,x.category,x.reference].join(' '),50)}
function grandTotal(lines){return +(lines.reduce((s,r)=>s+(r.value!=null?r.value:r.quantity*r.unitPrice),0)).toFixed(2)}
function validDate(text){const s=sid(text);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return !Number.isNaN(d.getTime())&&d.getFullYear()===+s.slice(0,4)&&d.getMonth()===+s.slice(5,7)-1&&d.getDate()===+s.slice(8,10)}
function validate(input){
 const mode=sid(input.serviceMode||'faccao'),choices=factionDirectory(),f=choices.find(x=>norm(x.name)===norm(input.factionName));
 if(!['faccao','embalagem'].includes(mode))throw Error('Atividade inválida.');
 if(!f)throw Error('Selecione uma pessoa cadastrada em Cadastros → Facções.');
 if(mode==='embalagem'&&f.role!=='embaladeira')throw Error('Selecione uma embaladeira cadastrada, não uma facção de costura.');
 if(mode==='faccao'&&f.role==='embaladeira')throw Error('Embaladeira só pode ser selecionada na atividade Embalagem.');
 if(!validDate(input.date))throw Error('Informe uma data válida.');
 if(!['Pago','Pendente'].includes(input.status))throw Error('Selecione o status.');
 if(!Array.isArray(input.lines)||!input.lines.length)throw Error('Adicione pelo menos um produto ou serviço.');
 const details=input.lines.map((x,i)=>{
  const qty=number(x.quantity),unit=number(x.unitPrice),kind=sid(x.kind||'product'),discount=number(x.travetaDiscountUnit||0);
  if(!Number.isInteger(qty)||qty<=0||qty>1000000)throw Error('Quantidade inválida na linha '+(i+1)+'.');
  if(!Number.isFinite(unit)||unit<=0||unit>1000000)throw Error('Informe valor unitário maior que zero na linha '+(i+1)+'.');
  if(!Number.isFinite(discount)||discount<0||discount>unit)throw Error('Desconto da travetada não pode ultrapassar o valor da peça na linha '+(i+1)+'.');
  const p=productDirectory().find(p=>sid(p.id)===sid(x.productId));
  if(['product','embalagem'].includes(kind)&&!p)throw Error('Escolha um produto cadastrado na linha '+(i+1)+'.');
  if(kind==='embalagem'&&mode!=='embalagem')throw Error('Embalagem só pode ser paga para uma embaladeira.');
  if(mode==='embalagem'&&kind!=='embalagem')throw Error('Na atividade Embalagem, inclua apenas linhas de embalagem.');
  if(!['product','travetada','service','embalagem'].includes(kind))throw Error('Tipo de serviço inválido.');
  const description=kind==='product'?sid(p.name):kind==='embalagem'?'Embalagem — '+sid(p.name):kind==='travetada'?'Travetada'+(p?' — '+sid(p.name):''):sid(x.description).trim();
  if(!description)throw Error('Descreva o serviço na linha '+(i+1)+'.');
  return {id:sid(x.id),kind,productId:p?.id??null,productName:p?.name||'',
    description:description.slice(0,220),quantity:qty,unitPrice:+unit.toFixed(2),
    grossValue:+(qty*unit).toFixed(2),travetaDiscountUnit:+discount.toFixed(2),
    travetaDiscountTotal:+(qty*discount).toFixed(2),value:+(qty*(unit-discount)).toFixed(2),
    note:sid(x.note).slice(0,700),priceOrigin:sid(x.priceOrigin)};
 });
 return {factionName:f.name,factionMasterId:f.id||null,serviceMode:mode,date:input.date,status:input.status,
  method:sid(input.method).trim().slice(0,120),note:sid(input.note).trim().slice(0,1500),
  lines:details,total:grandTotal(details)};
}
function pdfIsValid(file,bytes){
 const b=new Uint8Array(bytes);
 return file&&file.size>0&&file.size<=MAX_PDF&&b.length>=5&&b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70&&b[4]===45;
}
function bytesToBase64(bytes){
 let text='';const a=new Uint8Array(bytes);
 for(let i=0;i<a.length;i+=16384)text+=String.fromCharCode.apply(null,a.subarray(i,i+16384));
 return btoa(text);
}
async function readReceipt(file){
 if(!file)return null;
 if(file.size>MAX_PDF)throw Error('O PDF deve ter no máximo 750 KB para não comprometer a sincronização do HLGB.');
 const buffer=await file.arrayBuffer();
 if(!pdfIsValid(file,buffer))throw Error('Selecione um PDF válido (o arquivo precisa começar com %PDF-).');
 return {name:sid(file.name||'comprovante.pdf').replace(/[\\/]/g,'_').slice(0,150),
  mime:'application/pdf',size:file.size,base64:bytesToBase64(buffer),addedAt:new Date().toISOString()};
}
function pdfDownload(receipt){
 if(!receipt?.base64)throw Error('Comprovante indisponível neste registro.');
 const binary=atob(receipt.base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=receipt.name||'comprovante.pdf';a.style.display='none';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
}
async function assertRecordNotPending(module,id){
 const guard=window.hlgbWalIdbGuard9536;
 if(!guard?.probe||!guard?.ids)throw Error('Proteção de sincronização IndexedDB indisponível. Nenhum dado será substituído.');
 if(guard?.probe){
  try{await guard.probe()}catch(e){throw Error('Não foi possível conferir a fila local: '+sid(e.message||e))}
  if(guard.status?.()?.readFailed)throw Error('A fila local não pôde ser lida. Salvar bloqueado para proteger os dados.');
 }
 const identities=new Set();
 try{
  for(const x of guard?.ids?.()||[])identities.add(sid(x));
  for(const x of window.hlgbRecordPendingIdentitySet9535?.()||[])identities.add(sid(x));
 }catch(e){throw Error('Erro ao consultar pendências: '+sid(e.message||e))}
 if(identities.has(module+'::'+sid(id))||identities.has(module+'|'+sid(id)))
  throw Error('Este pagamento ainda possui alteração local pendente. Não reenvie até sincronizar.');
}
async function saveRecord(module,record){
 if(!record?.id)throw Error('Lançamento sem ID.');
 const before=arr(module).find(x=>sid(x?.id)===sid(record.id));
 if(before&&module==='factionPayments'&&before.manualGroupId!==record.manualGroupId)
  throw Error('Existe outro registro com a mesma identificação. Gravação bloqueada.');
 await assertRecordNotPending(module,record.id);
 const save=window.hlgbRecordSaveWithRetry;
 if(typeof save!=='function')throw Error('Gravação confirmada na nuvem indisponível.');
 if(typeof window.cloudEnsureFreshSession==='function')await window.cloudEnsureFreshSession(false);
 const out=await save(module,sid(record.id),JSON.parse(JSON.stringify(record)),false);
 if(!out||out.applied!==true)throw Error(out?.reason||'A nuvem não confirmou a gravação.');
 const next=out.data||record,database=dbRef();if(!Array.isArray(database[module]))database[module]=[];
 const collection=database[module],i=collection.findIndex(x=>sid(x?.id)===sid(record.id));
 if(i>=0)collection[i]=next;else collection.push(next);
 try{window.localSaveOnly?.()}catch(_){}
 return next;
}
function hubId(groupId){
 let n=0;for(const ch of sid(groupId))n=(n*31+ch.charCodeAt(0))%9999999999999;
 return 300000000000000+n;
}
async function persistDraft(input,receipt){
 if(state.status===STATUS.saving)throw Error('Salvamento em andamento.');
 state.status=STATUS.saving;state.lastError='';state.lastResult=null;
 let saved=0;
 try{
  const parsed=validate(input),date=parsed.date,paid=parsed.status==='Pago',
   id=draft?.groupId||makeId('faction-manual'),ts=new Date().toISOString();
  if(!draft)draft={groupId:id,createdAt:ts,receipt:null};
  if(receipt)draft.receipt=receipt;
  if(!parsed.lines.every(x=>x.id))throw Error('Uma linha perdeu sua identificação. Reabra o formulário antes de salvar.');
  for(let i=0;i<parsed.lines.length;i++){
   const row=parsed.lines[i],existing=arr('factionPayments').find(x=>sid(x.id)===sid(row.id));
   const obj={...existing,id:row.id,source:'faction_manual_payment_v1',manual:true,
    manualGroupId:id,manualKindV9566:row.kind,serviceModeV9577:parsed.serviceMode,factionMasterId:parsed.factionMasterId,
    status:parsed.status,factionName:parsed.factionName,productId:row.productId,
    description:row.description,quantity:row.quantity,unitPrice:row.unitPrice,
    value:row.value,grossValueV9577:row.grossValue,travetaDiscountUnitV9577:row.travetaDiscountUnit,
    travetaDiscountTotalV9577:row.travetaDiscountTotal,paidAmount:paid?row.value:0,paymentDate:paid?date:'',
    scheduledPaymentDate:date,paymentMethod:parsed.method,
    paymentHistory:existing?.paymentHistory||[],discountAmount:row.travetaDiscountTotal,
    observation:(row.note||parsed.note||'Pagamento avulso de facção'),manualLineNoteV9566:row.note,
    priceOriginV9566:row.priceOrigin,updatedAt:ts,createdAt:existing?.createdAt||draft.createdAt};
   if(i===0&&draft.receipt)obj.receiptPdfV9566=draft.receipt;
   else delete obj.receiptPdfV9566;
   await saveRecord('factionPayments',obj);saved++;
  }
  // One financial entry for a paid group, with a stable ID across retries.
  if(paid&&date>='2026-10-05'){
   const hub={id:hubId(id),flow:'Saída',
    description:'Pagamento avulso de facção — '+parsed.factionName,
    value:parsed.total,date,category:'Facções',subcategory:'Pagamento avulso',
    person:parsed.factionName,status:'Realizado',acceptedMethods:parsed.method?[parsed.method]:[],
    paymentMethod:parsed.method,realizedAt:date,
    note:(parsed.note?parsed.note+' · ':'')+parsed.lines.map(x=>x.description+' '+x.quantity+'x').join(', '),
    sourceType:'faction_manual_payment',sourceId:id,createdAt:draft.createdAt,updatedAt:ts};
   const previous=arr('hubFinanceEntries').find(x=>sid(x?.id)===sid(hub.id));
   if(previous&&sid(previous.sourceId)!==id)throw Error('Conflito de identificação do financeiro; registro anterior preservado.');
   await saveRecord('hubFinanceEntries',hub);
  }
  state.lastResult={groupId:id,total:parsed.total,lines:saved,paid,receipt:!!draft.receipt};
  return state.lastResult;
 }catch(e){state.lastError=(saved?'Foram confirmadas '+saved+' linha(s). Reabra o salvamento neste formulário para concluir sem duplicar. ':'')+sid(e?.message||e);throw Error(state.lastError)}
 finally{state.status=STATUS.idle}
}

/* v95.88 — administração de pagamentos avulsos já registrados.
 * As linhas e seus IDs são preservados. Na baixa, primeiro confirma o Hub
 * Financeiro (ID determinístico), depois cada linha, com readback remoto.
 * Nenhuma ação é disparada pela renderização ou por mudanças de filtros. */
async function remoteRecord(module,id){
 if(window.__HLGB_AUTH_READY!==true)throw Error('É necessário estar autenticado para conferir o pagamento na nuvem.');
 if(typeof window.cloudRequest!=='function')throw Error('Consulta autenticada da nuvem indisponível. Nenhuma alteração foi realizada.');
 const path='hlgb_records?select=entity_id,data,deleted_at&module=eq.'+encodeURIComponent(module)+'&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';
 const rows=await window.cloudRequest(path,{method:'GET'});
 if(!Array.isArray(rows))throw Error('A nuvem não confirmou o registro '+module+'.');
 return rows[0]&&!rows[0].deleted_at?rows[0].data||null:null;
}
const cents=v=>Math.round((Number(v)||0)*100);
function groupRows(groupId){
 return arr('factionPayments').filter(x=>x?.manual===true&&sid(x.manualGroupId)===sid(groupId));
}
function groupState(rows){
 const statuses=new Set(rows.map(x=>norm(x.status)));
 return rows.length&&statuses.size===1&&statuses.has('pago')?'Pago':
  rows.length&&statuses.size===1&&statuses.has('pendente')?'Pendente':'Revisar';
}
function assertGroup(groupId){
 const rows=groupRows(groupId);
 if(!groupId||!rows.length)throw Error('Lançamento avulso não encontrado neste computador. Atualize a tela sem limpar dados.');
 if(new Set(rows.map(x=>sid(x.id))).size!==rows.length)throw Error('Lançamento com linhas duplicadas. Revisão necessária.');
 if(rows.some(x=>!x.id||!x.manual||sid(x.manualGroupId)!==sid(groupId)))throw Error('Grupo inconsistente. Alteração bloqueada.');
 return rows;
}
function remotelySame(local,remote){
 return !!remote&&sid(remote.id)===sid(local.id)&&
  sid(remote.manualGroupId)===sid(local.manualGroupId)&&norm(remote.status)===norm(local.status)&&
  cents(remote.value)===cents(local.value)&&cents(remote.paidAmount)===cents(local.paidAmount)&&
  sid(remote.paymentDate)===sid(local.paymentDate)&&sid(remote.updatedAt)===sid(local.updatedAt)&&
  Number(remote.quantity)===Number(local.quantity);
}
async function preflightGroup(groupId,rows){
 for(const row of rows){
  await assertRecordNotPending('factionPayments',row.id);
  const remote=await remoteRecord('factionPayments',row.id);
  if(!remotelySame(row,remote))throw Error('Outra sessão alterou ou não confirmou a linha '+sid(row.id)+'. Atualize o pagamento antes de editar ou pagar.');
 }
 await assertRecordNotPending('hubFinanceEntries',hubId(groupId));
 const hub=await remoteRecord('hubFinanceEntries',hubId(groupId));
 const localHub=arr('hubFinanceEntries').find(x=>sid(x.id)===sid(hubId(groupId)));
 if(localHub&&!hub)throw Error('O Hub local e a nuvem divergem; não criar pagamento duplicado.');
 if(hub&&sid(hub.sourceId)!==sid(groupId))throw Error('Registro financeiro vinculado a outro lançamento. Operação bloqueada.');
 return hub;
}
async function saveGroupEdits(groupId,input,receipt){
 if(state.status===STATUS.saving)throw Error('Já existe salvamento em andamento.');
 state.status=STATUS.saving;state.lastError='';let saved=0;
 try{
  const rows=assertGroup(groupId);
  if(groupState(rows)!=='Pendente')throw Error('Valores de pagamentos já pagos ou parcialmente pagos ficam bloqueados para preservar o financeiro.');
  const parsed=validate(input);
  if(parsed.status!=='Pendente')throw Error('Para dar baixa, utilize o botão “Marcar pago” no histórico de avulsos.');
  const ids=new Set(parsed.lines.map(x=>sid(x.id)));
  if(ids.size!==parsed.lines.length||!rows.every(x=>ids.has(sid(x.id))))
   throw Error('Não é permitido remover uma linha já salva. Mantenha-a no lançamento; corrija os valores sem apagar histórico.');
  for(const x of parsed.lines){
   const any=arr('factionPayments').find(y=>sid(y.id)===sid(x.id));
   if(any&&sid(any.manualGroupId)!==sid(groupId))throw Error('Linha já pertence a outro lançamento.');
  }
  const existingProof=rows.find(x=>x.receiptPdfV9566?.base64);
  if(receipt&&existingProof)throw Error('Já existe PDF neste lançamento. O comprovante anterior não será sobrescrito.');
  const oldHub=await preflightGroup(groupId,rows);
  if(oldHub)throw Error('Existe lançamento no Hub Financeiro para este grupo. Confira-o antes de corrigir valores.');
  const ts=new Date().toISOString(),existingById=new Map(rows.map(x=>[sid(x.id),x]));
  const editId=draft?.editAttemptId||makeId('faction-edit');
  if(draft)draft.editAttemptId=editId;
  for(let i=0;i<parsed.lines.length;i++){
   const x=parsed.lines[i],old=existingById.get(sid(x.id)),oldProof=old?.receiptPdfV9566||null;
   const history=Array.isArray(old?.manualEditHistoryV9588)?old.manualEditHistoryV9588.slice(-19):[];
   const altered=!old||cents(old.value)!==cents(x.value)||Number(old.quantity)!==x.quantity||
    cents(old.unitPrice)!==cents(x.unitPrice)||cents(old.travetaDiscountUnitV9577)!==cents(x.travetaDiscountUnit)||
    sid(old.productId)!==sid(x.productId)||sid(old.description)!==sid(x.description);
   if(altered&&!history.some(h=>sid(h.id)===editId))
    history.push({id:editId,at:ts,from:old?Number(old.value)||0:null,to:x.value,reason:'Edição manual do pagamento pendente'});
   const next={...old,id:x.id,source:'faction_manual_payment_v1',manual:true,manualGroupId:groupId,
    manualKindV9566:x.kind,serviceModeV9577:parsed.serviceMode,factionMasterId:parsed.factionMasterId,
    factionName:parsed.factionName,status:'Pendente',productId:x.productId,description:x.description,
    quantity:x.quantity,unitPrice:x.unitPrice,value:x.value,grossValueV9577:x.grossValue,
    travetaDiscountUnitV9577:x.travetaDiscountUnit,travetaDiscountTotalV9577:x.travetaDiscountTotal,
    discountAmount:x.travetaDiscountTotal,paidAmount:0,paymentDate:'',
    scheduledPaymentDate:parsed.date,paymentMethod:parsed.method,
    observation:x.note||parsed.note||'Pagamento avulso de facção',manualLineNoteV9566:x.note,
    priceOriginV9566:x.priceOrigin,paymentHistory:old?.paymentHistory||[],
    manualEditHistoryV9588:history,createdAt:old?.createdAt||rows[0].createdAt||ts,updatedAt:ts};
   if(oldProof)next.receiptPdfV9566=oldProof;
   else if(i===0&&receipt)next.receiptPdfV9566=receipt;
   await saveRecord('factionPayments',next);saved++;
   const check=await remoteRecord('factionPayments',x.id);
   if(!remotelySame(next,check))throw Error('Edição da linha '+sid(x.id)+' não confirmada na releitura.');
  }
  const result={groupId,total:parsed.total,lines:saved,edited:true};
  state.lastResult=result;renderReceipts();return result;
 }catch(e){state.lastError=(saved?'Edição parcialmente confirmada ('+saved+' linha(s)). Revise o histórico antes de tentar novamente. ':'')+sid(e.message||e);throw Error(state.lastError)}
 finally{state.status=STATUS.idle}
}
async function markGroupPaid(groupId,date,method,receipt){
 if(state.status===STATUS.saving)throw Error('Outra alteração de pagamento está em andamento.');
 state.status=STATUS.saving;state.lastError='';let confirmed=0,hubConfirmed=false;
 try{
  if(!validDate(date)||date>stamp())throw Error('Informe a data real do pagamento, sem data futura.');
  method=sid(method).trim();
  if(!method)throw Error('Informe a forma de pagamento utilizada.');
  const rows=assertGroup(groupId),condition=groupState(rows);
  if(condition==='Pago')throw Error('Este lançamento já consta como pago. Não é permitido pagar duas vezes.');
  if(!['Pendente','Revisar'].includes(condition))throw Error('Situação inconsistente; confira o pagamento antes da baixa.');
  if(rows.some(x=>!['pago','pendente'].includes(norm(x.status))))throw Error('Há uma linha em situação desconhecida; não registrar pagamento.');
  const total=grandTotal(rows.map(x=>({value:Number(x.value)||0})));
  if(total<=0)throw Error('Valor total precisa ser maior que zero.');
  const alreadyPaid=rows.filter(x=>norm(x.status)==='pago');
  if(alreadyPaid.some(x=>sid(x.paymentDate)!==date||sid(x.paymentMethod)!==method||cents(x.paidAmount)!==cents(x.value)))
   throw Error('Parte deste pagamento já foi registrada com outros dados. Não duplicar; revisar histórico.');
  const oldHub=await preflightGroup(groupId,rows);
  if(oldHub&&(cents(oldHub.value)!==cents(total)||sid(oldHub.date)!==date||sid(oldHub.paymentMethod)!==method||sid(oldHub.status)!=='Realizado'))
   throw Error('Existe lançamento financeiro diferente para este grupo. Corrija a divergência antes de dar baixa.');
  if(!oldHub&&alreadyPaid.length)throw Error('Há linhas pagas sem confirmação do Hub. Baixa bloqueada.');
  if(receipt&&rows.some(x=>x.receiptPdfV9566?.base64))throw Error('Comprovante já registrado. O PDF anterior será preservado.');
  // Primeiro armazena o PDF em uma linha ainda pendente; isso NÃO confirma o pagamento.
  if(receipt){
   const target=rows.find(x=>norm(x.status)==='pendente');
   if(!target)throw Error('Nenhuma linha pendente disponível para anexar o comprovante.');
   const next={...target,receiptPdfV9566:receipt,updatedAt:new Date().toISOString()};
   await saveRecord('factionPayments',next);
   const proof=await remoteRecord('factionPayments',target.id);
   if(!proof||proof.receiptPdfV9566?.base64!==receipt.base64)throw Error('PDF enviado sem confirmação remota. Nenhuma baixa financeira realizada.');
   const i=rows.findIndex(x=>sid(x.id)===sid(target.id));rows[i]=next;
  }
  const ts=new Date().toISOString(),first=rows[0];
  const finance={...(oldHub||{}),id:hubId(groupId),flow:'Saída',
   description:'Pagamento avulso de facção — '+sid(first.factionName),
   value:total,date,category:'Facções',subcategory:'Pagamento avulso',person:first.factionName,
   status:'Realizado',acceptedMethods:[method],paymentMethod:method,realizedAt:date,
   note:rows.map(x=>sid(x.description)+' '+Number(x.quantity)+'x').join(', ').slice(0,1500),
   sourceType:'faction_manual_payment',sourceId:groupId,
   createdAt:oldHub?.createdAt||first.createdAt||ts,updatedAt:oldHub?.updatedAt||ts};
  if(!oldHub)await saveRecord('hubFinanceEntries',finance);
  const verifiedHub=await remoteRecord('hubFinanceEntries',finance.id);
  if(!verifiedHub||sid(verifiedHub.sourceId)!==sid(groupId)||cents(verifiedHub.value)!==cents(total)||
   sid(verifiedHub.status)!=='Realizado'||sid(verifiedHub.date)!==date||sid(verifiedHub.paymentMethod)!==method)
   throw Error('O Hub Financeiro não confirmou a saída. As linhas não foram marcadas como pagas.');
  hubConfirmed=true;
  for(const row of rows){
   if(norm(row.status)==='pago')continue;
   const history=Array.isArray(row.paymentHistory)?row.paymentHistory.slice():[];
   const transitionId='manual-paid-'+groupId;
   if(!history.some(x=>sid(x.id)===transitionId))
    history.push({id:transitionId,date,amount:Number(row.value)||0,method,at:ts,source:'manual-payment-v9588'});
   const next={...row,status:'Pago',paidAmount:Number(row.value)||0,paymentDate:date,
    paymentMethod:method,paymentHistory:history,manualPaidAtV9588:ts,updatedAt:ts};
   await saveRecord('factionPayments',next);
   const remote=await remoteRecord('factionPayments',row.id);
   if(!remotelySame(next,remote))throw Error('Baixa da linha '+sid(row.id)+' não comprovada na releitura.');
   confirmed++;
  }
  const result={groupId,paid:true,date,method,total,hubConfirmed:true,lines:rows.length,confirmed};
  state.lastResult=result;renderReceipts();return result;
 }catch(e){
  state.lastError=(hubConfirmed?'Hub confirmado, mas a baixa das linhas está incompleta. Verifique antes de reenviar. ':'')+
   (confirmed?'Linhas confirmadas: '+confirmed+'. ':'')+sid(e.message||e);
  throw Error(state.lastError);
 }finally{state.status=STATUS.idle}
}

function rowHtml(kind='product',id=makeId('fmpli')){
 const prod=kind==='product'||kind==='embalagem',trav=kind==='travetada',label=kind==='embalagem'?'Embalagem':trav?'Travetada':prod?'Produto':'Serviço extra';
 return '<div class="fm66-line panel" data-id="'+esc(id)+'" data-kind="'+esc(kind)+'" style="margin:10px 0;padding:12px;border:1px solid #e2d4de">'+
  '<div style="display:flex;justify-content:space-between;align-items:center"><b>'+label+'</b><button type="button" class="secondary fm66-remove">Remover</button></div>'+
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:10px 0">'+
  '<div class="field" style="grid-column:span 2"><label>'+(prod?'Buscar produto (nome, código ou SKU)':'Vincular produto (opcional)')+'</label>'+
   '<input class="fm66-search" autocomplete="off" placeholder="Digite para localizar um modelo" aria-label="Pesquisar produto" aria-autocomplete="list" role="combobox">'+
   '<input class="fm66-product-id" type="hidden"><div class="fm66-suggestions" role="listbox" style="display:none;max-height:195px;overflow:auto;border:1px solid #ddd;border-radius:7px;background:#fff"></div>'+
   '<div class="fm66-hint sub">'+(prod?'Selecione um produto da lista.':'Pode registrar o serviço mesmo sem vincular um modelo.')+'</div></div>'+
  (kind==='service'?'<div class="field"><label>Descrição do serviço</label><input class="fm66-desc" maxlength="220" placeholder="Retrabalho, extra..."></div>':'')+
  '<div class="field"><label>Qtd.</label><input type="number" min="1" step="1" class="fm66-qty" value="1"></div>'+
  '<div class="field"><label>Valor unit. (R$)</label><input type="number" min="0.01" step="0.01" class="fm66-unit" placeholder="Informe o valor"></div>'+
  '<div class="field"><label>Desconto travetada/peça (R$)</label><input type="number" min="0" step="0.01" class="fm66-discount" value="0.00" aria-label="Descontar travetada"></div>'+ 
  '<div class="field"><label>Total após desconto</label><input class="fm66-total" value="R$ 0,00" disabled></div></div>'+
  '<div class="field"><label>Observação desta linha (opcional)</label><input class="fm66-line-note" maxlength="700" placeholder="Ex.: travetada de 300 peças"></div>'+
  '</div>';
}
function renderProductsFor(row,query){
 const host=row.querySelector('.fm66-suggestions'),rs=searchProducts(query);
 if(!host)return;
 host.style.display='block';
 host.innerHTML=rs.map(p=>'<button type="button" class="fm66-product-option" data-product-id="'+esc(p.id)+
  '" role="option" style="display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #eee;padding:8px;background:#fff;cursor:pointer">'+
  '<b>'+esc(p.name||'Produto')+'</b> <small>'+esc(p.code||p.sku||p.category||'')+'</small>'+
  '<span class="sub" style="display:block">'+(row.dataset.kind==='embalagem'?(window.hlgbFactionRates9577?.embalagem?.(p)!=null?'Embalagem: '+money(window.hlgbFactionRates9577.embalagem(p)):'Sem tarifa de embalagem; informar manualmente'):(productPrice(p)!=null?'Facção cadastrada: '+money(productPrice(p)):'Sem preço de facção cadastrado'))+'</span></button>').join('')+
  (!rs.length?'<div class="sub" style="padding:8px">Nenhum produto cadastrado encontrado para esta busca.</div>':'');
}
function lineFromDom(row){
 const id=row.dataset.id,kind=row.dataset.kind,productId=row.querySelector('.fm66-product-id')?.value||'',
  quantity=row.querySelector('.fm66-qty')?.value,
  unitPrice=row.querySelector('.fm66-unit')?.value;
 return {id,kind,productId,quantity,unitPrice,description:row.querySelector('.fm66-desc')?.value||'',
  note:row.querySelector('.fm66-line-note')?.value||'',priceOrigin:row.dataset.priceOrigin||'',
  travetaDiscountUnit:row.querySelector('.fm66-discount')?.value||'0'};
}
function recalc(){
 const root=document.getElementById('fm66-root');if(!root)return;
 let total=0;
 root.querySelectorAll('.fm66-line').forEach(row=>{
  const x=lineFromDom(row),qty=number(x.quantity),unit=number(x.unitPrice),discount=number(x.travetaDiscountUnit),
   sum=Number.isFinite(qty)&&Number.isFinite(unit)&&Number.isFinite(discount)&&qty>0&&unit>=discount&&discount>=0?qty*(unit-discount):0;
  total+=sum;row.querySelector('.fm66-total').value=money(sum);
 });
 root.querySelector('#fm66-grand').textContent=money(total);
}
function addLine(kind='product',existingRow=null){
 const host=document.getElementById('fm66-lines');if(!host)return;
 host.insertAdjacentHTML('beforeend',rowHtml(kind,existingRow?.id||makeId('fmpli')));
 const row=host.lastElementChild;
 row.querySelector('.fm66-search').addEventListener('focus',()=>renderProductsFor(row,row.querySelector('.fm66-search').value));
 row.querySelector('.fm66-search').addEventListener('keydown',e=>{
  if(e.key==='Escape'){row.querySelector('.fm66-suggestions').style.display='none';return}
  if(e.key==='Enter'){
   const first=row.querySelector('.fm66-product-option');
   if(first){e.preventDefault();first.click()}
  }
 });
 row.querySelector('.fm66-search').addEventListener('input',e=>{
  row.querySelector('.fm66-product-id').value='';
  row.querySelector('.fm66-hint').textContent='Selecione o produto listado para associar o valor de facção.';
  renderProductsFor(row,e.target.value);
 });
 row.querySelector('.fm66-suggestions').addEventListener('click',e=>{
  const option=e.target.closest('button[data-product-id]');if(!option)return;
  const p=productDirectory().find(x=>sid(x.id)===sid(option.dataset.productId));if(!p)return;
  row.querySelector('.fm66-product-id').value=sid(p.id);
  row.querySelector('.fm66-search').value=p.name||'';
  row.querySelector('.fm66-suggestions').style.display='none';
  const packing=row.dataset.kind==='embalagem',price=packing?window.hlgbFactionRates9577?.embalagem?.(p):productPrice(p),unit=row.querySelector('.fm66-unit');
  row.dataset.priceOrigin=price!=null?(packing?'tabela-embalagem':'ficha-tecnica'):'manual';
  if(price!=null){unit.value=price.toFixed(2);row.querySelector('.fm66-hint').textContent=packing?'Tarifa de embalagem sugerida; você pode alterar.':'Valor da facção preenchido pela ficha. Você pode alterá-lo.'}
  else{unit.value='';row.querySelector('.fm66-hint').textContent=packing?'Sem tarifa para este modelo. Informe o valor de embalagem.':'Sem valor de facção cadastrado. Informe manualmente abaixo.'}
  const picked=factionDirectory().find(x=>norm(x.name)===norm(document.getElementById('fm66-faction')?.value));
  const master=arr('factionMasters').find(x=>sid(x.id)===sid(picked?.id));
  const d=row.querySelector('.fm66-discount');
  if(d)d.value=!packing&&master?.doesTraveta===false&&window.hlgbFactionRates9577?.traveta?.(master)!=null?
   Number(window.hlgbFactionRates9577.traveta(master)).toFixed(2):'0.00';
  recalc();
 });
 row.querySelector('.fm66-remove').addEventListener('click',()=>{row.remove();recalc()});
 row.querySelectorAll('.fm66-qty,.fm66-unit,.fm66-discount').forEach(inp=>inp.addEventListener('input',()=>{
  if(inp.classList.contains('fm66-unit'))row.dataset.priceOrigin='manual';
  recalc();
 }));

 if(existingRow){
  row.dataset.priceOrigin=sid(existingRow.priceOriginV9566||'manual');
  const p=productDirectory().find(x=>sid(x.id)===sid(existingRow.productId));
  row.querySelector('.fm66-product-id').value=sid(existingRow.productId||'');
  row.querySelector('.fm66-search').value=p?.name||sid(existingRow.description||'');
  if(kind==='service'&&row.querySelector('.fm66-desc'))row.querySelector('.fm66-desc').value=sid(existingRow.description);
  row.querySelector('.fm66-qty').value=sid(existingRow.quantity||1);
  row.querySelector('.fm66-unit').value=Number(existingRow.unitPrice||0).toFixed(2);
  row.querySelector('.fm66-discount').value=Number(existingRow.travetaDiscountUnitV9577||0).toFixed(2);
  row.querySelector('.fm66-line-note').value=sid(existingRow.manualLineNoteV9566||'');
  const remove=row.querySelector('.fm66-remove');
  if(remove){remove.disabled=true;remove.title='Linha já salva. Corrija valores sem excluir o histórico.';}
 }
 recalc();
}
function renderFactionList(q){
 const host=document.getElementById('fm66-faction-suggestions');if(!host)return;
 const mode=document.getElementById('fm66-mode')?.value||'faccao',rows=searchFactions(q,mode);
 host.style.display='block';
 host.innerHTML=rows.map(f=>'<button type="button" role="option" class="fm66-faction-option" data-faction="'+esc(f.name)+
  '" style="display:block;width:100%;text-align:left;background:white;border:0;border-bottom:1px solid #eee;padding:9px;cursor:pointer">'+
  '<b>'+esc(f.name)+'</b> <small>'+esc(f.source)+'</small></button>').join('')+
  (!rows.length?'<div class="sub" style="padding:8px">'+(mode==='embalagem'?'Nenhuma embaladeira cadastrada. Marque a atividade Embaladeira no cadastro de facções.':'Nenhuma facção encontrada. Cadastre em Cadastros → Facções.')+'</div>':'');
}
function formData(){
 const root=document.getElementById('fm66-root');if(!root)throw Error('Formulário não carregado.');
 const get=id=>root.querySelector('#'+id)?.value||'';
 return {factionName:get('fm66-faction'),serviceMode:get('fm66-mode')||'faccao',date:get('fm66-date'),status:get('fm66-status'),
  method:get('fm66-method'),note:get('fm66-note'),lines:[...root.querySelectorAll('.fm66-line')].map(lineFromDom)};
}
function receiptSummary(){
 const host=document.getElementById('fm66-pdf-summary'),file=document.getElementById('fm66-pdf')?.files?.[0];if(!host)return;
 host.textContent=file?'Selecionado: '+file.name+' ('+Math.ceil(file.size/1024)+' KB). Será armazenado com o pagamento.':'PDF opcional, até 750 KB. Não altera o status automaticamente.';
}
function modalHtml(){
 const today=stamp(),tariffs=window.hlgbFactionRates9577?.rates?.()||{embalagem:{camisola:.25,doll:.25,calcinha:.15},travetaUnit:null};
 return '<div id="fm66-root" style="max-width:100%;overflow-x:hidden">'+
  '<div class="sub">Selecione Facção de costura ou Embalagem. O preço da ficha/tabela aparece automaticamente e pode ser ajustado; a travetada descontada fica discriminada.</div>'+
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:12px">'+
  '<div class="field"><label>Atividade</label><select id="fm66-mode"><option value="faccao">Facção / Costura</option><option value="embalagem">Embalagem</option></select></div>'+ 
  '<div class="field"><label>Facção ou embaladeira</label><input id="fm66-faction" role="combobox" aria-label="Buscar facção ou embaladeira" autocomplete="off" aria-autocomplete="list" placeholder="Busque a pessoa cadastrada">'+
  '<div id="fm66-faction-suggestions" role="listbox" style="display:none;max-height:180px;overflow-y:auto;border:1px solid #ddd;border-radius:7px;background:white"></div></div>'+
  '<div class="field"><label>Data</label><input type="date" id="fm66-date" value="'+today+'"></div>'+
  '<div class="field"><label>Status</label><select id="fm66-status"><option>Pendente</option><option>Pago</option></select></div>'+
  '<div class="field"><label>Forma de pagamento</label><input id="fm66-method" placeholder="Pix, dinheiro, transferência"></div></div>'+
  '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin:16px 0 6px"><b>Produtos / serviços</b>'+
  '<div class="toolbar" style="display:flex;flex-wrap:wrap;gap:6px"><button class="secondary" id="fm66-add-product" type="button">+ Produto</button>'+ 
  '<button class="secondary" id="fm66-add-embalagem" type="button" style="display:none">+ Embalagem</button>'+
  '<button class="secondary" id="fm66-add-traveta" type="button">+ Travetada</button>'+
  '<button class="secondary" id="fm66-add-service" type="button">+ Outro serviço</button>'+ 
  '<button class="secondary" id="fm66-price-table" type="button">⚙️ Preços embalagem/travetada</button></div></div>'+
  '<div id="fm66-lines"></div>'+
  '<div id="fm66-rates-inline" class="panel" style="padding:12px;margin:12px 0;display:none"><b>⚙️ Tabela de serviços</b>'+
  '<p class="sub">Valores aplicados nos próximos lançamentos. A travetada tem uma taxa própria; nenhuma nota antiga será modificada.</p>'+
  '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:7px">'+
  [['packCamisolaV9577','Camisola (R$/peça)',tariffs.embalagem.camisola],['packDollV9577','Doll (R$/peça)',tariffs.embalagem.doll],['packCalcinhaV9577','Calcinha (R$/peça)',tariffs.embalagem.calcinha],['travetaUnitValue','Travetada (R$/peça)',tariffs.travetaUnit]].map(([k,label,value])=>
  '<div class="field"><label>'+esc(label)+'</label><input class="fm77-rate" data-rate="'+k+'" type="number" min="0" step="0.01" value="'+(value==null?'':Number(value).toFixed(2))+'"></div>').join('')+
  '</div><button class="secondary" id="fm66-save-rates" type="button">☁️ Salvar tabela de preços</button><div id="fm66-rates-message" role="status" class="sub"></div></div>'+
  '<div class="field" style="margin-top:12px"><label>Observação geral</label><textarea id="fm66-note" rows="2" maxlength="1500" placeholder="Ex.: serviço extra ou acerto combinado"></textarea></div>'+
  '<div class="panel" style="margin-top:12px;padding:10px"><label for="fm66-pdf"><b>📎 Comprovante de pagamento (PDF)</b></label>'+
  '<input id="fm66-pdf" type="file" accept=".pdf,application/pdf">'+
  '<div id="fm66-pdf-summary" class="sub">PDF opcional, até 750 KB. Salvo com o lançamento e disponível depois para baixar.</div></div>'+
  '<div style="margin:12px 0;font-size:18px;font-weight:700">Total: <span id="fm66-grand">R$ 0,00</span></div>'+
  '<div id="fm66-feedback" role="status" class="sub"></div><button type="button" class="primary modalSave">☁️ Salvar pagamento avulso</button></div>';
}
function openForm(groupId=''){
 if(typeof window.openModal!=='function'&&typeof openModal!=='function')return false;
 const editing=!!sid(groupId),stored=editing?assertGroup(groupId):[];
 if(editing&&groupState(stored)!=='Pendente')throw Error('Apenas lançamentos pendentes podem ter valores editados. Pagamentos já baixados exigem conferência contábil.');
 draft=editing?{groupId:sid(groupId),createdAt:stored[0].createdAt||new Date().toISOString(),receipt:stored.find(x=>x.receiptPdfV9566)?.receiptPdfV9566||null,
  editAttemptId:makeId('faction-edit')}:
  {groupId:makeId('faction-manual'),createdAt:new Date().toISOString(),receipt:null};
 state.opened++;
 const open=window.openModal||openModal;
 open(editing?'Editar pagamento avulso pendente':'Pagamento avulso — facção ou embalagem',modalHtml(),async()=>{
  const btn=document.querySelector('#fm66-root .modalSave'),feedback=document.getElementById('fm66-feedback');
  if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
  if(feedback)feedback.textContent='Confirmando os registros na nuvem...';
  try{
   const input=formData(),file=document.getElementById('fm66-pdf')?.files?.[0],receipt=await readReceipt(file);
   if(editing)await saveGroupEdits(groupId,input,receipt);else await persistDraft(input,receipt);
   if(typeof window.closeModal==='function')window.closeModal();else if(typeof closeModal==='function')closeModal();
   try{window.renderFactionPayments?.()}catch(_){}
   try{window.renderHubFinance?.()}catch(_){}
   renderReceipts();
   return true;
  }catch(e){
   if(feedback)feedback.textContent='⚠ '+sid(e.message||e);
   if(btn){btn.disabled=false;btn.textContent=editing?'☁️ Salvar alterações':'☁️ Salvar pagamento avulso'}
   return false;
  }
 });
 const faction=document.getElementById('fm66-faction');
 if(faction){
  faction.addEventListener('focus',()=>renderFactionList(faction.value));
  faction.addEventListener('input',()=>renderFactionList(faction.value));
  faction.addEventListener('keydown',e=>{
   if(e.key==='Escape'){document.getElementById('fm66-faction-suggestions').style.display='none';return}
   if(e.key==='Enter'){
    const first=document.querySelector('#fm66-faction-suggestions [data-faction]');
    if(first){e.preventDefault();first.click()}
   }
  });
  document.getElementById('fm66-faction-suggestions')?.addEventListener('click',e=>{
   const b=e.target.closest('button[data-faction]');if(!b)return;faction.value=b.dataset.faction;
   document.getElementById('fm66-faction-suggestions').style.display='none';
  });
 }
 document.getElementById('fm66-add-product')?.addEventListener('click',()=>addLine('product'));
 document.getElementById('fm66-add-traveta')?.addEventListener('click',()=>addLine('travetada'));
 document.getElementById('fm66-add-embalagem')?.addEventListener('click',()=>addLine('embalagem'));
 document.getElementById('fm66-price-table')?.addEventListener('click',()=>{
  const el=document.getElementById('fm66-rates-inline');if(el)el.style.display=el.style.display==='none'?'block':'none';
 });
 document.getElementById('fm66-save-rates')?.addEventListener('click',async()=>{
  const host=document.getElementById('fm66-rates-inline'),btn=host?.querySelector('#fm66-save-rates'),feedback=host?.querySelector('#fm66-rates-message');
  if(!btn)return;btn.disabled=true;if(feedback)feedback.textContent='Salvando tabela no servidor…';
  const data={};host.querySelectorAll('[data-rate]').forEach(x=>data[x.dataset.rate]=x.value);
  try{
   if(typeof window.hlgbFactionRates9577?.save!=='function')throw Error('Módulo de preços ainda não carregou.');
   await window.hlgbFactionRates9577.save(data);
   if(feedback)feedback.textContent='✓ Tabela de embalagem e travetada salva na nuvem.';
  }catch(err){if(feedback)feedback.textContent='⚠ '+sid(err?.message||err)}
  finally{btn.disabled=false}
 });
 document.getElementById('fm66-mode')?.addEventListener('change',e=>{
  const mode=e.target.value,host=document.getElementById('fm66-lines');
  if(host)host.innerHTML='';
  faction.value='';
  document.getElementById('fm66-add-product').style.display=mode==='embalagem'?'none':'';
  document.getElementById('fm66-add-traveta').style.display=mode==='embalagem'?'none':'';
  document.getElementById('fm66-add-service').style.display=mode==='embalagem'?'none':'';
  document.getElementById('fm66-add-embalagem').style.display=mode==='embalagem'?'':'none';
  addLine(mode==='embalagem'?'embalagem':'product');
 });
 document.getElementById('fm66-add-service')?.addEventListener('click',()=>addLine('service'));
 document.getElementById('fm66-pdf')?.addEventListener('change',receiptSummary);
 if(editing){
  const first=stored[0],mode=sid(first.serviceModeV9577||'faccao');
  document.getElementById('fm66-mode').value=mode;
  document.getElementById('fm66-mode').disabled=true;
  document.getElementById('fm66-faction').value=sid(first.factionName);
  document.getElementById('fm66-date').value=sid(first.scheduledPaymentDate||stamp());
  document.getElementById('fm66-status').value='Pendente';
  document.getElementById('fm66-status').disabled=true;
  document.getElementById('fm66-method').value=sid(first.paymentMethod||'');
  document.getElementById('fm66-note').value=sid(first.observation||'');
  const packaging=mode==='embalagem';
  document.getElementById('fm66-add-product').style.display=packaging?'none':'';
  document.getElementById('fm66-add-traveta').style.display=packaging?'none':'';
  document.getElementById('fm66-add-service').style.display=packaging?'none':'';
  document.getElementById('fm66-add-embalagem').style.display=packaging?'':'none';
  for(const row of stored)addLine(sid(row.manualKindV9566||'product'),row);
  if(draft.receipt){
   const summary=document.getElementById('fm66-pdf-summary');
   if(summary)summary.textContent='Comprovante existente: '+sid(draft.receipt.name)+'. Será preservado. Não envie outro PDF.';
   const file=document.getElementById('fm66-pdf');if(file)file.disabled=true;
  }
  const btn=document.querySelector('#fm66-root .modalSave');if(btn)btn.textContent='☁️ Salvar alterações';
  const info=document.getElementById('fm66-feedback');if(info)info.textContent='Edite quantidade, preço, desconto, produtos, data ou observações. Linhas já salvas não podem ser removidas. Para pagar, utilize a baixa no histórico.';
 }else addLine('product');
 return true;
}
function receiptGroups(){
 const groups=new Map();
 for(const r of arr('factionPayments')){
  if(!r?.manualGroupId||!r?.manual)continue;
  const id=sid(r.manualGroupId),cur=groups.get(id)||{id,factionName:r.factionName,
   date:r.scheduledPaymentDate||'',paidDate:'',status:'Pendente',serviceMode:r.serviceModeV9577||'faccao',
   receipt:null,recordId:sid(r.id),total:0,items:0,rows:[],updatedAt:''};
  cur.total+=Number(r.value)||0;cur.items++;cur.rows.push(r);
  if(r.receiptPdfV9566?.base64){cur.receipt=r.receiptPdfV9566;cur.recordId=sid(r.id)}
  if(sid(r.updatedAt)>cur.updatedAt)cur.updatedAt=sid(r.updatedAt);
  groups.set(id,cur);
 }
 for(const group of groups.values()){
  group.status=groupState(group.rows);
  group.paidDate=group.status==='Pago'?sid(group.rows[0]?.paymentDate):'';
  group.date=group.paidDate||sid(group.rows[0]?.scheduledPaymentDate);
  group.total=Math.round(group.total*100)/100;
 }
 return [...groups.values()].sort((a,b)=>sid(b.date).localeCompare(sid(a.date))||
  sid(b.updatedAt).localeCompare(sid(a.updatedAt)));
}
function openPayModal(groupId){
 const rows=assertGroup(groupId),status=groupState(rows);
 if(status==='Pago')throw Error('Este lançamento já está pago.');
 const total=grandTotal(rows.map(x=>({value:Number(x.value)||0})));
 const group=receiptGroups().find(x=>x.id===sid(groupId));
 if(!group)throw Error('Pagamento avulso não encontrado.');
 const open=window.openModal||((typeof openModal==='function')?openModal:null);
 if(!open)throw Error('Janela de pagamento indisponível.');
 const html='<div id="fm88-pay-modal" class="panel" style="padding:12px">'+
  '<p><b>'+esc(group.factionName)+'</b> · '+group.items+' serviço(s) · <b>'+money(total)+'</b></p>'+
  '<p class="sub">A baixa gera uma única saída no Hub Financeiro para este grupo. É necessário confirmar a data real e o método. Nenhum pagamento será registrado automaticamente.</p>'+
  (status==='Revisar'?'<p style="color:#934">⚠ Algumas linhas possuem situação divergente. Confirme os dados da baixa anterior antes de continuar.</p>':'')+
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">'+
  '<div class="field"><label>Data em que foi pago</label><input type="date" id="fm88-paid-date" value="'+stamp()+'"></div>'+
  '<div class="field"><label>Forma de pagamento</label><input id="fm88-paid-method" placeholder="Pix, dinheiro, transferência" value="'+esc(rows[0]?.paymentMethod||'')+'"></div></div>'+
  (group.receipt?'<p class="sub">PDF existente: '+esc(group.receipt.name)+' — será preservado.</p>':
   '<div class="field"><label>Comprovante PDF (opcional, máximo 750 KB)</label><input type="file" id="fm88-paid-pdf" accept=".pdf,application/pdf"></div>')+
  '<div id="fm88-paid-feedback" role="status" class="sub"></div>'+
  '<button type="button" class="primary modalSave">✅ Confirmar como pago</button></div>';
 open('Dar baixa no pagamento avulso',html,async()=>{
  const btn=document.querySelector('#fm88-pay-modal .modalSave'),feedback=document.getElementById('fm88-paid-feedback');
  if(btn){btn.disabled=true;btn.textContent='☁️ Confirmando no Hub e nas facções…'}
  if(feedback)feedback.textContent='Verificando a nuvem e as operações pendentes antes de confirmar…';
  try{
   const date=document.getElementById('fm88-paid-date')?.value||'',
    method=document.getElementById('fm88-paid-method')?.value||'',
    pdf=await readReceipt(document.getElementById('fm88-paid-pdf')?.files?.[0]);
   await markGroupPaid(groupId,date,method,pdf);
   window.closeModal?.();window.renderFactionPayments?.();window.renderHubFinance?.();
   renderReceipts();return true;
  }catch(e){
   if(feedback)feedback.textContent='⚠ '+sid(e?.message||e);
   if(btn){btn.disabled=false;btn.textContent='✅ Confirmar como pago'}
   return false;
  }
 });
 return true;
}
async function attachReceiptToGroup(groupId,file){
 const group=receiptGroups().find(x=>x.id===sid(groupId));
 if(!group)throw Error('Pagamento avulso não encontrado.');
 if(group.receipt)throw Error('Este grupo já possui comprovante. O arquivo anterior foi preservado.');
 const original=arr('factionPayments').find(x=>sid(x.id)===group.recordId);
 if(!original)throw Error('Lançamento vinculado não encontrado.');
 const receipt=await readReceipt(file);
 if(!receipt)throw Error('Escolha um comprovante PDF.');
 const next={...original,receiptPdfV9566:receipt,updatedAt:new Date().toISOString()};
 await saveRecord('factionPayments',next);
 renderReceipts();
 return receipt;
}
function renderReceipts(){
 const anchor=document.getElementById('factionPaymentTable');if(!anchor)return false;
 let host=document.getElementById('fm66-receipts');
 if(!host){host=document.createElement('div');host.id='fm66-receipts';host.className='panel';
  host.style.cssText='margin-top:14px;padding:12px';anchor.insertAdjacentElement('afterend',host)}
 const groups=receiptGroups(),pending=groups.filter(g=>g.status==='Pendente'),
  paid=groups.filter(g=>g.status==='Pago'),review=groups.filter(g=>g.status==='Revisar');
 const signature=JSON.stringify(groups.map(g=>[g.id,g.factionName,g.date,g.status,g.total,g.items,g.updatedAt,
  g.receipt?.name||'',g.receipt?.size||0]));
 // Preserve file selection and focused filters when periodic refresh has not changed data.
 if(host.dataset.fm66Signature===signature)return true;
 const previousFilter=host.querySelector('#fm88-filter-name')?.value||'',
  previousStatus=host.querySelector('#fm88-filter-status')?.value||'todos';
 host.dataset.fm66Signature=signature;
 const sum=rows=>money(rows.reduce((total,x)=>total+x.total,0));
 host.innerHTML='<h3 style="margin:0 0 5px">Pagamentos avulsos — facções e embaladeiras</h3>'+
  '<p class="sub">Edite os pendentes, marque como pago após transferir e confira PDFs e serviços. Pagamentos realizados têm os valores protegidos.</p>'+
  '<div class="cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:8px;margin:12px 0">'+
  '<div class="card"><small>A pagar · '+pending.length+' lançamento(s)</small><strong>'+sum(pending)+'</strong></div>'+
  '<div class="card"><small>Pagos · '+paid.length+' lançamento(s)</small><strong>'+sum(paid)+'</strong></div>'+
  (review.length?'<div class="card"><small>Revisar · '+review.length+'</small><strong>'+sum(review)+'</strong></div>':'')+'</div>'+
  '<div class="toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:10px 0">'+
  '<div class="field"><label>Buscar facção, produto ou serviço</label><input id="fm88-filter-name" autocomplete="off" placeholder="Pesquisar lançamento"></div>'+
  '<div class="field"><label>Situação</label><select id="fm88-filter-status"><option value="todos">Todos</option>'+
  '<option>Pendente</option><option>Pago</option><option>Revisar</option></select></div></div>'+
  (groups.length?'<div style="overflow-x:auto"><table style="width:100%"><thead><tr><th>Facção / serviço</th>'+
   '<th>Data</th><th>Situação</th><th>Valor</th><th>Itens</th><th>Comprovante</th><th>Ações</th></tr></thead><tbody>'+
   groups.map(g=>{
    const descriptions=g.rows.map(r=>sid(r.description||'')+' '+Number(r.quantity||0)+'x').join(' ');
    const items='<details><summary>'+g.items+' item(ns) · Ver detalhes</summary>'+
     '<div style="min-width:180px">'+g.rows.map(r=>'<div style="border-bottom:1px solid #eee;padding:5px">'+
      '<b>'+esc(r.description||'Serviço')+'</b><div class="sub">'+Number(r.quantity||0).toLocaleString('pt-BR')+
      ' × '+money(r.unitPrice)+' · desconto '+money(r.travetaDiscountTotalV9577)+'</div><b>'+
      money(r.value)+'</b></div>').join('')+'</div></details>';
    const proof=g.receipt?'<button type="button" class="secondary fm66-download" data-group-id="'+esc(g.id)+'">'+esc(g.receipt.name)+'</button>':
     '<div class="field" style="min-width:170px"><input type="file" class="fm66-attach-input" data-group-id="'+esc(g.id)+'" accept=".pdf,application/pdf">'+
     '<button type="button" class="secondary fm66-attach" data-group-id="'+esc(g.id)+'">☁️ Salvar PDF</button></div>';
    const actions=g.status==='Pendente'?
     '<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="secondary fm88-edit" data-group-id="'+esc(g.id)+'">✏️ Editar</button>'+
     '<button type="button" class="primary fm88-pay" data-group-id="'+esc(g.id)+'">✅ Marcar pago</button></div>':
     g.status==='Pago'?'<span class="sub">Pago · valores protegidos</span>':
     '<span class="sub" style="color:#934">⚠ Baixa parcial: conferir</span>';
    return '<tr data-fm88-row="1" data-status="'+esc(g.status)+'" data-search="'+esc(norm(g.factionName+' '+descriptions+' '+g.serviceMode))+'">'+
     '<td><b>'+esc(g.factionName)+'</b><div class="sub">'+esc(g.serviceMode==='embalagem'?'Embalagem':'Facção / Costura')+'</div></td>'+
     '<td>'+esc(g.date||'Sem data')+'</td><td><b>'+esc(g.status)+'</b></td><td><b>'+money(g.total)+'</b></td>'+
     '<td>'+items+'</td><td>'+proof+'</td><td>'+actions+'</td></tr>';
   }).join('')+'</tbody></table></div>':'<div class="empty">Ainda não há pagamentos avulsos.</div>')+
  '<div id="fm66-receipt-feedback" role="status" class="sub" style="margin-top:8px"></div>';
 const input=host.querySelector('#fm88-filter-name'),filterStatus=host.querySelector('#fm88-filter-status');
 if(input)input.value=previousFilter;if(filterStatus)filterStatus.value=previousStatus;
 function filter(){
  const term=norm(input?.value),status=filterStatus?.value||'todos';
  host.querySelectorAll('[data-fm88-row]').forEach(row=>{
   row.style.display=(!term||sid(row.dataset.search).includes(term))&&(status==='todos'||sid(row.dataset.status)===status)?'':'none';
  });
 }
 input?.addEventListener('input',filter);filterStatus?.addEventListener('change',filter);filter();
 const feedback=()=>host.querySelector('#fm66-receipt-feedback');
 host.querySelectorAll('.fm88-edit').forEach(b=>b.addEventListener('click',()=>{
  try{openForm(b.dataset.groupId)}catch(e){const x=feedback();if(x)x.textContent='⚠ '+sid(e.message||e)}
 }));
 host.querySelectorAll('.fm88-pay').forEach(b=>b.addEventListener('click',()=>{
  try{openPayModal(b.dataset.groupId)}catch(e){const x=feedback();if(x)x.textContent='⚠ '+sid(e.message||e)}
 }));
 host.querySelectorAll('.fm66-download').forEach(b=>b.addEventListener('click',()=>{
  const group=receiptGroups().find(g=>g.id===b.dataset.groupId);if(group?.receipt)pdfDownload(group.receipt);
 }));
 host.querySelectorAll('.fm66-attach').forEach(b=>b.addEventListener('click',async()=>{
  const file=[...host.querySelectorAll('.fm66-attach-input')].find(x=>x.dataset.groupId===b.dataset.groupId)?.files?.[0];
  b.disabled=true;const status=feedback();if(status)status.textContent='Enviando comprovante e confirmando na nuvem…';
  try{const pdf=await attachReceiptToGroup(b.dataset.groupId,file);
   const next=document.getElementById('fm66-receipt-feedback');
   if(next)next.textContent='✓ PDF '+pdf.name+' confirmado na nuvem.';
  }catch(e){b.disabled=false;if(status)status.textContent='⚠ '+sid(e.message||e)}
 }));
 return true;
}
function hasWrapper(fn){let f=fn;const seen=new Set();while(typeof f==='function'&&!seen.has(f)){
 if(f.__fm66Wrapped)return true;seen.add(f);f=f.__original;
 }return false}
function install(){
 window.openHlgbFactionManualPayment=openForm;
 const old=window.renderFactionPayments;
 if(typeof old==='function'&&!hasWrapper(old)){
  const wrap=function(){const r=old.apply(this,arguments);setTimeout(renderReceipts,0);return r};
  wrap.__fm66Wrapped=true;wrap.__original=old;window.renderFactionPayments=wrap;
 }
 renderReceipts();
}
document.addEventListener('click',e=>{
 const button=e.target?.closest?.('#hlgbFactionManualPaymentBtn');if(!button)return;
 e.preventDefault();e.stopImmediatePropagation();openForm();
},true);
window.hlgbFactionManual9566={version:V,openForm,searchFactions,searchProducts,factionDirectory,productDirectory,
 productPrice,validate,grandTotal,readReceipt,pdfIsValid,persistDraft,receiptGroups,groupRows,groupState,saveGroupEdits,markGroupPaid,openPayModal,remoteRecord,attachReceiptToGroup,renderReceipts,download:pdfDownload,install,
 status:()=>({...state}),maxPdfBytes:MAX_PDF};
install();
[500,1700,3800].forEach(ms=>setTimeout(install,ms));
try{window.hlgbAfterLogin?.(()=>setTimeout(install,500),0)}catch(_){}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,500));
console.info('[HLGB] v'+V+' pagamento avulso facções com cadastro, busca, travetada e PDF');
})();