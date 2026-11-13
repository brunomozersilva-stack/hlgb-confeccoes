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
// v95.92 — a ficha do modelo guarda travetadas POR PEÇA; tarifa por ponto.
function pointsPerPieceV9592(p){const n=Number(p?.travetadas);return Number.isInteger(n)&&n>=0&&n<=100? n:0}
function travetaUnitV9592(master){
 const rate=window.hlgbFactionRates9577?.traveta?.(master);
 return rate==null||!Number.isFinite(Number(rate))||Number(rate)<0?null:Number(rate);
}
function autoTravetaV9592(p,master){
 const points=pointsPerPieceV9592(p),rate=travetaUnitV9592(master);
 return {points,rate,perPiece:points>0&&rate!=null?Math.round(points*rate*100)/100:null,
  applies:master?.doesTraveta===false,known:typeof master?.doesTraveta==='boolean'};
}
async function saveTravetaPointsV9592(p,points){
 if(!p||!p.id)throw Error('Selecione um modelo cadastrado para gravar as travetadas na ficha técnica.');
 if(!Number.isInteger(points)||points<=0||points>100)throw Error('Informe de 1 a 100 travetadas por peça.');
 await assertRecordNotPending('products',p.id);
 const current=await remoteRecord('products',p.id);
 if(!current||sid(current.id)!==sid(p.id))throw Error('Modelo não encontrado na nuvem. Ficha não alterada.');
 if(sid(current.updatedAt||'')!==sid(p.updatedAt||'')||pointsPerPieceV9592(current)!==pointsPerPieceV9592(p))
  throw Error('A ficha técnica mudou em outro computador. Atualize antes de mudar travetadas.');
 if(pointsPerPieceV9592(current)===points)return {changed:false,points};
 const next={...current,travetadas:points,updatedAt:new Date().toISOString(),
  travetaPointsUpdatedV9592:true};
 await saveRecord('products',next);
 const check=await remoteRecord('products',p.id);
 if(!check||pointsPerPieceV9592(check)!==points||sid(check.updatedAt)!==sid(next.updatedAt))
  throw Error('A ficha foi enviada, mas não confirmada na nuvem. Não repita antes de conferir.');
 return {changed:true,points};
}
async function syncPointsFromPaymentV9592(lines){
 const changes=new Map();
 for(const line of lines){
  if(line.kind!=='travetada'||!line.productId||!line.updateProductPointsV9592)continue;
  const p=productDirectory().find(x=>sid(x.id)===sid(line.productId));
  if(!p)throw Error('Modelo não encontrado ao salvar travetadas na ficha técnica.');
  const points=Number(line.pointsPerPieceV9592);
  if(changes.has(sid(p.id))&&changes.get(sid(p.id))!==points)
   throw Error('O mesmo modelo recebeu quantidades diferentes de travetadas no mesmo pagamento.');
  changes.set(sid(p.id),points);
 }
 for(const [id,points] of changes){
  const p=productDirectory().find(x=>sid(x.id)===id);
  await saveTravetaPointsV9592(p,points);
 }
 return changes.size;
}

function productPrice(p){
 const n=Number(p?.factionCost);
 return Number.isFinite(n)&&n>0?+n.toFixed(2):null;
}
function searchRows(items,q,formatter,limit=35){
 const terms=norm(q).split(' ').filter(Boolean);
 return items.filter(x=>terms.every(t=>norm(formatter(x)).includes(t))).slice(0,limit);
}
function searchFactions(q,mode='faccao'){
 const role=mode==='embalagem'?'embaladeira':mode==='travetada'?'travetador':'faccao';
 return searchRows(factionDirectory().filter(x=>x.role===role),q,x=>x.name,60);
}
function searchProducts(q){return searchRows(productDirectory(),q,x=>[x.name,x.code,x.sku,x.category,x.reference].join(' '),50)}
function grandTotal(lines){return +(lines.reduce((s,r)=>s+(r.value!=null?r.value:r.quantity*r.unitPrice),0)).toFixed(2)}
function validDate(text){const s=sid(text);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return !Number.isNaN(d.getTime())&&d.getFullYear()===+s.slice(0,4)&&d.getMonth()===+s.slice(5,7)-1&&d.getDate()===+s.slice(8,10)}
function validate(input){
 const mode=sid(input.serviceMode||'faccao'),choices=factionDirectory(),f=choices.find(x=>norm(x.name)===norm(input.factionName));
 if(!['faccao','embalagem','travetada'].includes(mode))throw Error('Atividade inválida.');
 if(!f)throw Error('Selecione uma pessoa cadastrada em Cadastros → Facções.');
 if(mode==='embalagem'&&f.role!=='embaladeira')throw Error('Selecione uma embaladeira cadastrada, não uma facção de costura.');
 if(mode==='travetada'&&f.role!=='travetador')throw Error('Selecione uma pessoa cadastrada com atividade principal Travetada.');
 if(mode==='faccao'&&f.role!=='faccao')throw Error('Escolha uma facção de costura; para embaladeira ou travetador use a atividade correspondente.');
 if(!validDate(input.date))throw Error('Informe uma data válida.');
 if(!['Pago','Pendente'].includes(input.status))throw Error('Selecione o status.');
 if(!Array.isArray(input.lines)||(!input.lines.length&&!input.allowEmptyV9590))throw Error('Adicione pelo menos um produto ou serviço.');
 const details=input.lines.map((x,i)=>{
  const qty=number(x.quantity),unit=number(x.unitPrice),kind=sid(x.kind||'product'),discount=number(x.travetaDiscountUnit||0);
  if(!Number.isInteger(qty)||qty<=0||qty>1000000)throw Error('Quantidade inválida na linha '+(i+1)+'.');
  if(!Number.isFinite(unit)||unit<=0||unit>1000000)throw Error('Informe valor unitário maior que zero na linha '+(i+1)+'.');
  if(!Number.isFinite(discount)||discount<0||discount>unit)throw Error('Desconto da travetada não pode ultrapassar o valor da peça na linha '+(i+1)+'.');
  const p=productDirectory().find(p=>sid(p.id)===sid(x.productId));
  const manual=!!x.unregistered,manualName=sid(x.manualProductName).trim(),
   manualCategory=sid(x.manualProductCategory||'outros');
  if(kind==='product'&&!p)throw Error('Escolha um produto cadastrado na linha '+(i+1)+'.');
  if(kind==='embalagem'&&!p&&(!manual||manualName.length<2))throw Error('Para embalagem de produto não cadastrado, marque “Modelo não cadastrado” e informe o nome do modelo na linha '+(i+1)+'.');
  if(manual&&kind==='embalagem'&&!['camisola','doll','calcinha','outros'].includes(manualCategory))
   throw Error('Selecione uma categoria válida para o modelo avulso na linha '+(i+1)+'.');
  if(kind==='embalagem'&&mode!=='embalagem')throw Error('Embalagem só pode ser paga para uma embaladeira.');
  if(mode==='embalagem'&&kind!=='embalagem')throw Error('Na atividade Embalagem, inclua apenas linhas de embalagem.');
  if(mode==='travetada'&&kind!=='travetada')throw Error('Na atividade Travetada, inclua apenas serviços de travetada.');
  if(mode==='travetada'&&discount!==0)throw Error('O pagamento exclusivo de travetada não deve ter desconto de travetada.');
  if(!['product','travetada','service','embalagem'].includes(kind))throw Error('Tipo de serviço inválido.');
  const points=kind==='travetada'?number(x.pointsPerPieceV9592??(p?pointsPerPieceV9592(p):1)):0;
  if(kind==='travetada'&&(!Number.isInteger(points)||points<=0||points>100))
   throw Error('Informe quantas travetadas existem por peça na linha '+(i+1)+'.');
  const updateProductPointsV9592=kind==='travetada'&&!!p&&points!==pointsPerPieceV9592(p);
  if(kind==='travetada'&&updateProductPointsV9592&&!x.confirmProductPointsV9592)
   throw Error('Confirme a atualização das travetadas na ficha técnica do modelo '+sid(p.name)+'.');
  const realPerPiece=kind==='travetada'?Math.round(points*unit*100)/100:unit;
  const maxDiscount=kind==='travetada'?0:realPerPiece;
  if(discount>maxDiscount)throw Error('Desconto superior ao valor da peça.');
  const displayName=p?.name||(manual?manualName:'');
  const description=kind==='product'?sid(p.name):kind==='embalagem'?'Embalagem — '+displayName:
   kind==='travetada'?'Travetada'+(displayName?' — '+displayName:''):sid(x.description).trim();
  if(!description)throw Error('Descreva o serviço na linha '+(i+1)+'.');
  return {id:sid(x.id),kind,productId:p?.id??null,productName:displayName.slice(0,180),
    manualProductName:manual&&!p?manualName.slice(0,180):'',
    manualProductCategory:manual&&!p?manualCategory:'',
    description:description.slice(0,220),quantity:qty,unitPrice:+unit.toFixed(2),
    pointsPerPieceV9592:points,updateProductPointsV9592,confirmProductPointsV9592:!!x.confirmProductPointsV9592,
    grossValue:+(qty*realPerPiece).toFixed(2),travetaDiscountUnit:+discount.toFixed(2),
    travetaDiscountTotal:+(qty*discount).toFixed(2),value:+(qty*(realPerPiece-discount)).toFixed(2),
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
  if(paid&&(!parsed.method||date>stamp()))throw Error('Informe forma e data real do pagamento.');
  const priorAdjustments=directAdjustmentsV9591(groupRows(id));
  const inputAdjustments=validateDirectInputV9591(input.directAdjustmentsV9591||[],[]);
  for(const entry of inputAdjustments){
   const old=priorAdjustments.find(x=>sid(x.id)===sid(entry.id));
   if(old&&(old.kind!==entry.kind||cents(old.amount)!==cents(entry.amount)||sid(old.reason)!==sid(entry.reason)))
    throw Error('Ajuste já salvo com outros dados. Reabra o lançamento.');
  }
  const adjustments=[...priorAdjustments,...inputAdjustments.filter(x=>!priorAdjustments.some(y=>sid(y.id)===sid(x.id)))];
  const net=validateNetV9591((cents(parsed.total)+sumDirectCentsV9591(adjustments))/100);
  const allocations=paid?paidAllocationsV9590(parsed.lines,net):[];
  if(!draft)draft={groupId:id,createdAt:ts,receipt:null};
  if(receipt)draft.receipt=receipt;
  if(!parsed.lines.every(x=>x.id))throw Error('Uma linha perdeu sua identificação. Reabra o formulário antes de salvar.');
  await syncPointsFromPaymentV9592(parsed.lines);
  for(let i=0;i<parsed.lines.length;i++){
   const row=parsed.lines[i],existing=arr('factionPayments').find(x=>sid(x.id)===sid(row.id));
   const obj={...existing,id:row.id,source:'faction_manual_payment_v1',manual:true,
    manualGroupId:id,manualKindV9566:row.kind,serviceModeV9577:parsed.serviceMode,factionMasterId:parsed.factionMasterId,
    status:parsed.status,factionName:parsed.factionName,productId:row.productId,
    description:row.description,manualProductNameV9589:row.manualProductName,manualProductCategoryV9589:row.manualProductCategory,
    travetaPointsPerPieceV9592:row.kind==='travetada'?row.pointsPerPieceV9592:null,
    quantity:row.quantity,unitPrice:row.unitPrice,
    value:row.value,grossValueV9577:row.grossValue,travetaDiscountUnitV9577:row.travetaDiscountUnit,
    travetaDiscountTotalV9577:row.travetaDiscountTotal,paidAmount:paid?allocations[i]:0,paymentDate:paid?date:'',
    scheduledPaymentDate:date,paymentMethod:parsed.method,
    paymentHistory:existing?.paymentHistory||[],discountAmount:row.travetaDiscountTotal,
    observation:(row.note||parsed.note||'Pagamento avulso de facção'),manualLineNoteV9566:row.note,
    priceOriginV9566:row.priceOrigin,updatedAt:ts,createdAt:existing?.createdAt||draft.createdAt};
   if(i===0){obj.manualDirectAdjustmentsV9591=adjustments;if(draft.receipt)obj.receiptPdfV9566=draft.receipt}
   else if(existing?.receiptPdfV9566)obj.receiptPdfV9566=existing.receiptPdfV9566;
   await saveRecord('factionPayments',obj);saved++;
  }
  // One financial entry for a paid group, with a stable ID across retries.
  if(paid&&date>='2026-10-05'){
   const hub={id:hubId(id),flow:'Saída',
    description:'Pagamento avulso de facção — '+parsed.factionName,
    value:net,date,category:'Facções',subcategory:'Pagamento avulso',
    person:parsed.factionName,status:'Realizado',acceptedMethods:parsed.method?[parsed.method]:[],
    paymentMethod:parsed.method,realizedAt:date,
    note:((parsed.note?parsed.note+' · ':'')+parsed.lines.map(x=>x.description+' '+x.quantity+'x').join(', ')+
     (adjustments.length?' · AJUSTES: '+adjustments.map(x=>(x.kind==='abater'?'-':'+')+
      money(x.amount)+' ('+x.reason+')').join('; '):'')).slice(0,1500),
    sourceType:'faction_manual_payment',sourceId:id,createdAt:draft.createdAt,updatedAt:ts};
   const previous=arr('hubFinanceEntries').find(x=>sid(x?.id)===sid(hub.id));
   if(previous&&sid(previous.sourceId)!==id)throw Error('Conflito de identificação do financeiro; registro anterior preservado.');
   await saveRecord('hubFinanceEntries',hub);
  }
  state.lastResult={groupId:id,total:net,lines:saved,paid,receipt:!!draft.receipt,adjustments:adjustments.length};
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
function isCanceledV9590(row){return !!row?.manualCanceledV9590||norm(row?.status)==='cancelado'}
function activeGroupRowsV9590(rows){return rows.filter(x=>!isCanceledV9590(x))}
function groupState(rows){
 const active=activeGroupRowsV9590(rows),statuses=new Set(active.map(x=>norm(x.status)));
 if(rows.length&&!active.length)return 'Cancelado';
 return active.length&&statuses.size===1&&statuses.has('pago')?'Pago':
  active.length&&statuses.size===1&&statuses.has('pendente')?'Pendente':'Revisar';
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
async function saveGroupEdits(groupId,input,receipt,removalReasons=[]){
 if(state.status===STATUS.saving)throw Error('Já existe salvamento em andamento.');
 state.status=STATUS.saving;state.lastError='';let saved=0,canceled=0;
 try{
  const rows=assertGroup(groupId),active=activeGroupRowsV9590(rows);
  if(groupState(rows)!=='Pendente')throw Error('Apenas lançamentos pendentes podem ter valores corrigidos ou removidos.');
  const removing=new Map();
  for(const entry of removalReasons||[]){
   const id=sid(entry?.id),reason=sid(entry?.reason).trim();
   if(!id||removing.has(id)||reason.length<5||reason.length>700)
    throw Error('Informe um motivo de 5 a 700 caracteres para cada produto removido.');
   removing.set(id,reason);
  }
  const parsed=validate({...input,allowEmptyV9590:true});
  if(parsed.status!=='Pendente')throw Error('Para dar baixa, utilize o botão Marcar pago.');
  const ids=new Set(parsed.lines.map(x=>sid(x.id)));
  if(ids.size!==parsed.lines.length)throw Error('Linhas duplicadas na edição.');
  const omitted=active.filter(x=>!ids.has(sid(x.id)));
  if(omitted.some(x=>!removing.has(sid(x.id)))||
     [...removing.keys()].some(id=>!omitted.some(x=>sid(x.id)===id)))
   throw Error('Produto removido sem motivo ou identificação. Reabra a edição para conferir.');
  if(parsed.lines.length===0&&!omitted.length)throw Error('Nenhum serviço ou produto informado.');
  if(parsed.lines.length===0&&groupApplicationsV9590(rows).length)
   throw Error('Este pagamento já recebeu um acerto de outro grupo. Não cancele todas as linhas sem conciliar o acerto.');
  const appliedDelta=groupApplicationsV9590(rows).reduce((sum,x)=>sum+cents(signedApplicationV9590(x)),0);
  if(parsed.lines.length&&cents(parsed.total)+appliedDelta+
     sumDirectCentsV9591(directAdjustmentsV9591(rows))+
     sumDirectCentsV9591(validateDirectInputV9591(input.directAdjustmentsV9591||[],directAdjustmentsV9591(rows)))<=0)
   throw Error('O crédito a compensar é maior ou igual ao valor restante. Corrija o acerto antes de reduzir os produtos.');
  for(const x of parsed.lines){
   const any=arr('factionPayments').find(y=>sid(y.id)===sid(x.id));
   if(any&&(sid(any.manualGroupId)!==sid(groupId)||isCanceledV9590(any)))
    throw Error('Linha já cancelada ou pertencente a outro lançamento.');
  }
  if(receipt&&rows.some(x=>x.receiptPdfV9566?.base64))
   throw Error('Já existe PDF no lançamento. O comprovante anterior não será sobrescrito.');
  const newAdjustments=validateDirectInputV9591(input.directAdjustmentsV9591||[],directAdjustmentsV9591(rows));
  const oldHub=await preflightGroup(groupId,rows);
  if(oldHub)throw Error('O Hub já possui uma saída deste grupo. Só é permitido alterar pagamentos ainda pendentes.');
  await syncPointsFromPaymentV9592(parsed.lines);
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
    manualProductNameV9589:x.manualProductName,manualProductCategoryV9589:x.manualProductCategory,
    travetaPointsPerPieceV9592:x.kind==='travetada'?x.pointsPerPieceV9592:null,
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
  // Remoção é CANCELAMENTO lógico: identificação, valor original, comprovantes
  // e dados para auditoria continuam registrados na nuvem e no histórico.
  for(const old of omitted){
   const reason=removing.get(sid(old.id));
   const history=Array.isArray(old.manualEditHistoryV9588)?old.manualEditHistoryV9588.slice(-19):[];
   if(!history.some(x=>sid(x.id)===editId))
    history.push({id:editId,at:ts,from:Number(old.value)||0,to:0,reason:'Produto cancelado: '+reason});
   const next={...old,status:'Cancelado',manualCanceledV9590:true,
    manualCanceledAtV9590:ts,manualCanceledReasonV9590:reason,manualEditHistoryV9588:history,
    updatedAt:ts,paidAmount:0,paymentDate:''};
   await saveRecord('factionPayments',next);canceled++;
   const remote=await remoteRecord('factionPayments',old.id);
   if(!remotelySame(next,remote)||!isCanceledV9590(remote)||sid(remote.manualCanceledReasonV9590)!==reason)
    throw Error('Cancelamento da linha '+sid(old.id)+' não confirmado na nuvem.');
  }
  if(newAdjustments.length){
   const stableId=sid(rows[0]?.id);
   await assertRecordNotPending('factionPayments',stableId);
   const base=arr('factionPayments').find(x=>sid(x.id)===stableId);
   if(!base)throw Error('Registro principal não encontrado para armazenar ajustes.');
   const current=directAdjustmentsV9591(groupRows(groupId));
   const next={...base,manualDirectAdjustmentsV9591:[...current,...newAdjustments],updatedAt:new Date().toISOString()};
   await saveRecord('factionPayments',next);saved++;
   const check=await remoteRecord('factionPayments',stableId);
   if(!remotelySame(next,check)||!newAdjustments.every(x=>directAdjustmentsV9591([check]).some(y=>sid(y.id)===sid(x.id))))
    throw Error('O ajuste não foi confirmado na nuvem. Confira antes de tentar novamente.');
  }
  const result={groupId,total:netGroupV9590(groupRows(groupId)),lines:saved,canceled,adjustments:newAdjustments.length,edited:true};
  state.lastResult=result;renderReceipts();return result;
 }catch(e){
  state.lastError=(saved||canceled?'Edição parcialmente confirmada ('+saved+' linha(s) e '+canceled+' cancelamento(s)). Confira antes de tentar novamente. ':'')+sid(e.message||e);
  throw Error(state.lastError);
 }finally{state.status=STATUS.idle}
}

/* v95.90 — reconciliação de diferença paga a mais/a menos.
 * Nunca modifica o valor já registrado de um pagamento Pago.
 * Eventos de acerto são salvos em um registro da própria facção, com
 * identificador estável e confirmação via leitura remota.
 * A compensação em outro pagamento pendente é registrada uma só vez no
 * destino (a escrita de origem é apenas vinculação/auditoria). */
function groupCorrectionsV9590(rows){
 return rows.flatMap(r=>Array.isArray(r.manualCorrectionsV9590)?r.manualCorrectionsV9590:[]);
}
function groupApplicationsV9590(rows){
 const found=new Map();
 for(const r of rows)for(const app of Array.isArray(r.manualApplicationsV9590)?r.manualApplicationsV9590:[])
  if(app?.id&&!found.has(sid(app.id)))found.set(sid(app.id),app);
 return [...found.values()];
}
function signedApplicationV9590(app){return app.kind==='a_mais'?-Math.abs(Number(app.amount)||0):Math.abs(Number(app.amount)||0)}
function signedCorrectionV9590(c){return c.kind==='a_mais'?-Math.abs(Number(c.amount)||0):Math.abs(Number(c.amount)||0)}
function nominalGroupV9590(rows){
 return Math.round(activeGroupRowsV9590(rows).reduce((s,r)=>s+cents(r.value),0))/100;
}
/* v95.91: ajustes diretos na cobrança avulsa antes de pagar.
 * Cada evento mantém ID, valor, tipo e observação. Não é um estorno
 * retroativo do Hub nem um acerto de transferência já realizada. */
function directAdjustmentsV9591(rows){
 const map=new Map();
 for(const row of rows)for(const item of Array.isArray(row?.manualDirectAdjustmentsV9591)?row.manualDirectAdjustmentsV9591:[])
  if(item?.id&&!map.has(sid(item.id)))map.set(sid(item.id),item);
 return [...map.values()];
}
function signedDirectV9591(item){return item.kind==='abater'?-Math.abs(Number(item.amount)||0):Math.abs(Number(item.amount)||0)}
function sumDirectCentsV9591(items){return items.reduce((s,x)=>s+cents(signedDirectV9591(x)),0)}
function validateDirectInputV9591(items,previous=[]){
 if(!Array.isArray(items))throw Error('Ajustes do pagamento inválidos.');
 if(items.length>25)throw Error('No máximo 25 ajustes por edição.');
 const old=new Map(previous.map(x=>[sid(x.id),x])),seen=new Set();
 return items.map((x,i)=>{
  const id=sid(x.id),kind=sid(x.kind),reason=sid(x.reason).trim(),
   amount=cents(number(x.amount))/100;
  if(!id||seen.has(id))throw Error('Identificador duplicado no ajuste '+(i+1)+'.');
  seen.add(id);
  if(!['abater','acrescentar'].includes(kind))throw Error('Escolha Abater ou Acrescentar no ajuste '+(i+1)+'.');
  if(!Number.isFinite(amount)||amount<=0||amount>1000000)throw Error('Informe valor maior que zero no ajuste '+(i+1)+'.');
  if(reason.length<5||reason.length>700)throw Error('Informe motivo obrigatório (5 a 700 caracteres) no ajuste '+(i+1)+'.');
  if(old.has(id))throw Error('Ajuste já salvo. Para corrigir, registre contrapartida com observação.');
  return {id,kind,amount,reason,createdAt:new Date().toISOString(),source:'inline-payment-v9591'};
 });
}
function validateNetV9591(total){
 if(!Number.isFinite(total)||cents(total)<=0)throw Error('O total líquido deve ser maior que R$ 0,00 após os ajustes.');
 if(cents(total)>100000000)throw Error('O total do pagamento excede o limite permitido.');
 return total;
}

function netGroupV9590(rows){
 return Math.round((cents(nominalGroupV9590(rows))+
  groupApplicationsV9590(rows).reduce((s,x)=>s+cents(signedApplicationV9590(x)),0)+
   sumDirectCentsV9591(directAdjustmentsV9591(rows))))/100;
}
function appliedCorrectionCentsV9590(correctionId){
 const seen=new Set();let sum=0;
 for(const row of arr('factionPayments'))for(const x of Array.isArray(row.manualApplicationsV9590)?row.manualApplicationsV9590:[]){
  if(sid(x.correctionId)!==sid(correctionId)||seen.has(sid(x.id)))continue;
  seen.add(sid(x.id));sum+=cents(x.amount);
 }
 return sum;
}
function correctionRemainingV9590(correction){return Math.max(0,
 (cents(correction.amount)-appliedCorrectionCentsV9590(correction.id))/100)}
function paidAllocationsV9590(rows,total){
 const allocations=rows.map(x=>cents(x.value)),difference=cents(total)-allocations.reduce((s,x)=>s+x,0);
 if(!allocations.length)return [];
 if(difference>=0)allocations[0]+=difference;
 else{
  let credit=-difference;
  for(let i=0;i<allocations.length&&credit;i++){
   const reduction=Math.min(allocations[i],credit);allocations[i]-=reduction;credit-=reduction;
  }
  if(credit)throw Error('O crédito de acerto supera o valor dos serviços. Corrija o abatimento.');
 }
 return allocations.map(x=>x/100);
}
async function registerCorrectionV9590(groupId,kind,amount,reason,correctionId=''){
 if(state.status===STATUS.saving)throw Error('Outro salvamento de pagamento está em andamento.');
 state.status=STATUS.saving;state.lastError='';
 try{
  const rows=assertGroup(groupId),active=activeGroupRowsV9590(rows),current=groupState(rows);
  if(current!=='Pago')throw Error('Acertos de valores pagos a mais ou a menos exigem pagamento já concluído.');
  if(!['a_mais','a_menos'].includes(kind))throw Error('Escolha se foi pago a mais ou a menos.');
  const value=cents(number(amount))/100,why=sid(reason).trim();
  if(!Number.isFinite(value)||value<=0||value>1000000)throw Error('Informe a diferença em reais (maior que zero).');
  if(why.length<5||why.length>700)throw Error('Escreva o motivo do acerto (mínimo de 5 caracteres, máximo de 700).');
  const id=sid(correctionId||makeId('fm90-acerto'));
  const currentEvent=groupCorrectionsV9590(rows).find(x=>sid(x.id)===id);
  if(currentEvent){
   if(currentEvent.kind===kind&&cents(currentEvent.amount)===cents(value)&&sid(currentEvent.reason)===why)
    return currentEvent;
   throw Error('Já existe outro acerto com essa identificação.');
  }
  const hub=await preflightGroup(groupId,rows);
  if(!hub||sid(hub.status)!=='Realizado'||sid(hub.sourceId)!==sid(groupId))
   throw Error('O Hub Financeiro não confirmou este pagamento original. Acerto bloqueado.');
  const anchor=active[0],ts=new Date().toISOString(),event={
   id,sourceGroupId:sid(groupId),kind,amount:value,reason:why,
   registeredAt:ts,registeredDate:stamp(),by:'ajuste-manual-v9590',
   applications:[]};
  const next={...anchor,manualCorrectionsV9590:[...(anchor.manualCorrectionsV9590||[]),event],updatedAt:ts};
  await saveRecord('factionPayments',next);
  const check=await remoteRecord('factionPayments',anchor.id);
  if(!remotelySame(next,check)||!groupCorrectionsV9590([check]).some(x=>sid(x.id)===id))
   throw Error('Acerto enviado, mas não confirmado na releitura. Não registre novamente antes de conferir.');
  state.lastResult={groupId,correction:event};renderReceipts();return event;
 }catch(e){state.lastError=sid(e.message||e);throw e}
 finally{state.status=STATUS.idle}
}
function matchingPendingGroupsV9590(sourceGroupId){
 const source=assertGroup(sourceGroupId),first=activeGroupRowsV9590(source)[0];
 return receiptGroups().filter(g=>g.id!==sid(sourceGroupId)&&g.status==='Pendente'&&
  norm(g.factionName)===norm(first.factionName)&&
  (first.factionMasterId==null||g.rows[0]?.factionMasterId==null||
   sid(first.factionMasterId)===sid(g.rows[0].factionMasterId)));
}
async function applyCorrectionV9590(sourceGroupId,correctionId,targetGroupId,amount){
 if(state.status===STATUS.saving)throw Error('Outra gravação de pagamento está em andamento.');
 state.status=STATUS.saving;state.lastError='';let targetSaved=false;
 try{
  const source=assertGroup(sourceGroupId),target=assertGroup(targetGroupId);
  if(groupState(source)!=='Pago'||groupState(target)!=='Pendente')
   throw Error('A compensação exige um pagamento original pago e outro pagamento pendente.');
  if(!matchingPendingGroupsV9590(sourceGroupId).some(x=>x.id===sid(targetGroupId)))
   throw Error('Compense apenas em lançamento pendente da mesma facção ou embaladeira.');
  const event=groupCorrectionsV9590(source).find(x=>sid(x.id)===sid(correctionId));
  if(!event)throw Error('Acerto de origem não encontrado.');
  const appliedId='fm90-app-'+sid(event.id)+'-'+sid(targetGroupId),oldApp=groupApplicationsV9590(target).find(x=>sid(x.id)===appliedId);
  const value=cents(number(amount))/100;
  if(!Number.isFinite(value)||value<=0)throw Error('Informe um valor de compensação maior que zero.');
  if(oldApp&&cents(oldApp.amount)!==cents(value))
   throw Error('Este acerto já foi aplicado ao pagamento escolhido com outro valor.');
  const remaining=correctionRemainingV9590(event);
  if(!oldApp&&cents(value)>cents(remaining))throw Error('A compensação ultrapassa o saldo do acerto.');
  if(event.kind==='a_mais'&&!oldApp&&cents(value)>cents(netGroupV9590(target)))
   throw Error('Crédito maior que o valor a pagar. Utilize compensação parcial ou outro lançamento.');
  // Readback+WAL guard before any write. Target first: idempotent retries see
  // the same applicationId and cannot multiply the effect.
  await preflightGroup(sourceGroupId,source);await preflightGroup(targetGroupId,target);
  const ts=new Date().toISOString();
  if(!oldApp){
   const anchor=activeGroupRowsV9590(target)[0],
    app={id:appliedId,correctionId:sid(event.id),sourceGroupId:sid(sourceGroupId),
     targetGroupId:sid(targetGroupId),kind:event.kind,amount:value,reason:event.reason,appliedAt:ts};
   const next={...anchor,manualApplicationsV9590:[...(anchor.manualApplicationsV9590||[]),app],updatedAt:ts};
   await saveRecord('factionPayments',next);targetSaved=true;
   const check=await remoteRecord('factionPayments',anchor.id);
   if(!remotelySame(next,check)||!groupApplicationsV9590([check]).some(x=>sid(x.id)===appliedId))
    throw Error('O destino não confirmou a compensação. Confira antes de tentar novamente.');
  }
  const currentSource=groupRows(sourceGroupId),sourceAnchor=currentSource.find(x=>
   (x.manualCorrectionsV9590||[]).some(y=>sid(y.id)===sid(event.id)));
  if(!sourceAnchor)throw Error('Origem do acerto não encontrada para vincular compensação.');
  const events=(sourceAnchor.manualCorrectionsV9590||[]).map(x=>{
   if(sid(x.id)!==sid(event.id))return x;
   const links=Array.isArray(x.applications)?x.applications:[];
   if(links.some(y=>sid(y.id)===appliedId))return x;
   return {...x,applications:[...links,{id:appliedId,targetGroupId:sid(targetGroupId),amount:value,at:ts}]};
  });
  if(!events.find(x=>sid(x.id)===sid(event.id))?.applications.some(x=>sid(x.id)===appliedId))
   throw Error('Não foi possível estabelecer o vínculo do acerto.');
  if(!(sourceAnchor.manualCorrectionsV9590||[]).some(x=>sid(x.id)===sid(event.id)&&
       Array.isArray(x.applications)&&x.applications.some(y=>sid(y.id)===appliedId))){
   await assertRecordNotPending('factionPayments',sourceAnchor.id);
   const remoteSource=await remoteRecord('factionPayments',sourceAnchor.id);
   if(!remotelySame(sourceAnchor,remoteSource))throw Error('A origem foi alterada por outra sessão. Compensação no destino preservada para revisão.');
   const next={...sourceAnchor,manualCorrectionsV9590:events,updatedAt:ts};
   await saveRecord('factionPayments',next);
   const recheck=await remoteRecord('factionPayments',sourceAnchor.id);
   if(!remotelySame(next,recheck)||!groupCorrectionsV9590([recheck]).some(x=>sid(x.id)===sid(event.id)&&
      x.applications?.some(y=>sid(y.id)===appliedId)))
    throw Error('Compensação no destino registrada, mas vínculo da origem não confirmado.');
  }
  const result={sourceGroupId,targetGroupId,correctionId:event.id,applied:value,
   remaining:correctionRemainingV9590(event)};
  state.lastResult=result;renderReceipts();return result;
 }catch(e){
  state.lastError=(targetSaved?'O valor foi registrado no pagamento pendente, mas a confirmação da origem não terminou. Não aplique em outro grupo antes de conferir. ':'')+sid(e.message||e);
  throw Error(state.lastError);
 }finally{state.status=STATUS.idle}
}

async function markGroupPaid(groupId,date,method,receipt){
 if(state.status===STATUS.saving)throw Error('Outra alteração de pagamento está em andamento.');
 state.status=STATUS.saving;state.lastError='';let confirmed=0,hubConfirmed=false;
 try{
  if(!validDate(date)||date>stamp())throw Error('Informe a data real do pagamento, sem data futura.');
  method=sid(method).trim();
  if(!method)throw Error('Informe a forma de pagamento utilizada.');
  const allRows=assertGroup(groupId),rows=activeGroupRowsV9590(allRows),condition=groupState(allRows);
  if(condition==='Pago')throw Error('Este lançamento já consta como pago. Não é permitido pagar duas vezes.');
  if(!['Pendente','Revisar'].includes(condition))throw Error('Situação inconsistente; confira o pagamento antes da baixa.');
  if(rows.some(x=>!['pago','pendente'].includes(norm(x.status))))throw Error('Há uma linha em situação desconhecida; não registrar pagamento.');
  const total=validateNetV9591(netGroupV9590(allRows));
  const allocations=paidAllocationsV9590(rows,total);
  const alreadyPaid=rows.filter(x=>norm(x.status)==='pago');
  if(alreadyPaid.some(x=>sid(x.paymentDate)!==date||sid(x.paymentMethod)!==method||
    cents(x.paidAmount)!==cents(allocations[rows.indexOf(x)])))
   throw Error('Parte deste pagamento já foi registrada com outros dados. Não duplicar; revisar histórico.');
  const oldHub=await preflightGroup(groupId,allRows);
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
   note:(rows.map(x=>sid(x.description)+' '+Number(x.quantity)+'x').join(', ')+
     (directAdjustmentsV9591(allRows).length?' · AJUSTES DIRETOS: '+
      directAdjustmentsV9591(allRows).map(x=>(x.kind==='abater'?'-':'+')+money(x.amount)+
      ' ('+sid(x.reason)+')').join('; '):'')+
     (groupApplicationsV9590(allRows).length?' · ACERTOS: '+
      groupApplicationsV9590(allRows).map(a=>(a.kind==='a_mais'?'-':'+')+money(a.amount)+
      ' ('+sid(a.reason)+')').join('; '):'')).slice(0,1500),
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
   const paidForRow=allocations[rows.indexOf(row)];
   const transitionId='manual-paid-'+groupId;
   if(!history.some(x=>sid(x.id)===transitionId))
    history.push({id:transitionId,date,amount:paidForRow,method,at:ts,source:'manual-payment-v9588'});
   const next={...row,status:'Pago',paidAmount:paidForRow,paymentDate:date,
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
   '<div class="fm66-hint sub">'+(prod?'Selecione um produto cadastrado ou marque Modelo não cadastrado.':'Vincule um modelo, informe um modelo avulso ou registre apenas travetada.')+'</div></div>'+
   ((kind==='embalagem'||kind==='travetada')?'<div class="field" style="grid-column:1/-1">'+
    '<label style="display:flex;gap:6px;align-items:center"><input class="fm66-unregistered" type="checkbox" style="width:auto"> Modelo não cadastrado (informar manualmente)</label>'+
    '<div class="fm66-manual-fields" style="display:none;margin-top:6px">'+
    '<label>Nome do modelo'+(kind==='embalagem'?' (obrigatório)':' (opcional)')+'</label>'+
    '<input class="fm66-manual-name" maxlength="180" placeholder="Ex.: Camisola especial, Doll de amostra">'+
    (kind==='embalagem'?'<label>Categoria para sugerir o preço de embalagem</label><select class="fm66-manual-category">'+
     '<option value="outros">Outro / valor manual</option><option value="camisola">Camisola</option>'+
     '<option value="doll">Short doll</option><option value="calcinha">Calcinha</option></select>':'')+
    '</div></div>':'')+
  (kind==='service'?'<div class="field"><label>Descrição do serviço</label><input class="fm66-desc" maxlength="220" placeholder="Retrabalho, extra..."></div>':'')+
  '<div class="field"><label>'+(trav?'Peças travetadas':'Qtd. peças')+'</label><input type="number" min="1" step="1" class="fm66-qty" value="1"></div>'+
  (trav?'<div class="field"><label>Travetadas por peça (ficha técnica)</label>'+
  '<input type="number" min="1" max="100" step="1" class="fm92-points" value="1">'+
  '<label style="display:flex;gap:5px;margin-top:5px"><input type="checkbox" class="fm92-save-points" style="width:auto">'+
  'Confirmo atualizar a ficha técnica se o número for diferente do cadastro</label>'+
  '<div class="sub fm92-point-hint">Vincule um modelo para consultar as travetadas cadastradas.</div></div>':'')+
  '<div class="field"><label>'+(trav?'Valor por travetada (R$)':'Valor unit. (R$)')+'</label><input type="number" min="0.01" step="0.01" class="fm66-unit" placeholder="Informe o valor"></div>'+
  (trav?'':'<div class="field"><label>Desconto travetada/peça (R$)</label><input type="number" min="0" step="0.01" class="fm66-discount" value="0.00" aria-label="Descontar travetada"></div>')+ 
  '<div class="field"><label>'+(trav?'Total: peças × travetadas/peça × tarifa':'Total após desconto')+'</label><input class="fm66-total" value="R$ 0,00" disabled></div></div>'+
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
  unregistered:!!row.querySelector('.fm66-unregistered')?.checked,
  manualProductName:row.querySelector('.fm66-manual-name')?.value||'',
  manualProductCategory:row.querySelector('.fm66-manual-category')?.value||'outros',
  note:row.querySelector('.fm66-line-note')?.value||'',priceOrigin:row.dataset.priceOrigin||'',
  travetaDiscountUnit:row.querySelector('.fm66-discount')?.value||'0',
   pointsPerPieceV9592:row.querySelector('.fm92-points')?.value,
   confirmProductPointsV9592:!!row.querySelector('.fm92-save-points')?.checked};
}
function recalc(){
 const root=document.getElementById('fm66-root');if(!root)return;
 let total=0;
 root.querySelectorAll('.fm66-line').forEach(row=>{
  const x=lineFromDom(row),qty=number(x.quantity),unit=number(x.unitPrice),discount=number(x.travetaDiscountUnit),
   points=row.dataset.kind==='travetada'?number(x.pointsPerPieceV9592):1,
   sum=Number.isFinite(qty)&&Number.isFinite(unit)&&Number.isFinite(discount)&&
     Number.isInteger(points)&&points>0&&qty>0&&points*unit>=discount&&discount>=0?qty*(points*unit-discount):0;
  total+=sum;row.querySelector('.fm66-total').value=money(sum);
 });
 const stored=draft?.editing?directAdjustmentsV9591(groupRows(draft.groupId)):[];
 const planned=[...root.querySelectorAll('.fm91-adjustment')].map(el=>({
  kind:el.querySelector('.fm91-kind')?.value,amount:el.querySelector('.fm91-value')?.value||0
 }));
 const oldApps=draft?.editing?groupApplicationsV9590(groupRows(draft.groupId)):[];
 const signedExisting=sumDirectCentsV9591(stored),signedNew=sumDirectCentsV9591(planned);
 const other=oldApps.reduce((x,item)=>x+cents(signedApplicationV9590(item)),0);
 const net=(cents(total)+signedExisting+signedNew+other)/100;
 const subtotal=root.querySelector('#fm91-subtotal'),minus=root.querySelector('#fm91-minus'),
  plus=root.querySelector('#fm91-plus'),cross=root.querySelector('#fm91-previous'),warning=root.querySelector('#fm91-warning');
 if(subtotal)subtotal.textContent=money(total);
 if(minus)minus.textContent='− '+money([...stored,...planned].filter(x=>x.kind==='abater').reduce((t,x)=>t+Number(x.amount||0),0));
 if(plus)plus.textContent='+ '+money([...stored,...planned].filter(x=>x.kind==='acrescentar').reduce((t,x)=>t+Number(x.amount||0),0));
 if(cross)cross.textContent=money(other/100);
 if(warning)warning.textContent=net<=0?'⚠ O total a pagar precisa ser maior que zero. Confira os abatimentos.':'';
 root.querySelector('#fm66-grand').textContent=money(net);
}
function addDirectAdjustmentRowV9591(kind='abater'){
 const host=document.getElementById('fm91-new-adjustments');if(!host)return;
 const id=makeId('fm91-ajuste');
 host.insertAdjacentHTML('beforeend','<div class="fm91-adjustment panel" data-id="'+esc(id)+'" style="padding:10px;margin:8px 0;border:1px solid #ddd;border-radius:8px">'+
  '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>Ajuste de valor</b>'+
  '<button type="button" class="secondary fm91-remove">Remover ajuste não salvo</button></div>'+
  '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">'+
  '<div class="field"><label>Tipo</label><select class="fm91-kind">'+
  '<option value="abater"'+(kind==='abater'?' selected':'')+'>➖ Abater do pagamento</option>'+
  '<option value="acrescentar"'+(kind==='acrescentar'?' selected':'')+'>➕ Acrescentar ao pagamento</option>'+
  '</select></div><div class="field"><label>Valor em R$</label>'+
  '<input class="fm91-value" type="number" min="0.01" step="0.01" placeholder="0,00"></div></div>'+
  '<div class="field"><label>Motivo / observação (obrigatório)</label>'+
  '<textarea class="fm91-reason" rows="2" maxlength="700" placeholder="Ex.: valor adiantado anteriormente, diferença da semana ou pagamento complementar"></textarea></div></div>');
 const el=host.lastElementChild;
 el.querySelector('.fm91-remove').addEventListener('click',()=>{el.remove();recalc()});
 el.querySelectorAll('input,select,textarea').forEach(input=>input.addEventListener('input',recalc));
 recalc();
}
function renderExistingDirectV9591(rows){
 const host=document.getElementById('fm91-saved-adjustments');if(!host)return;
 const entries=directAdjustmentsV9591(rows);
 host.innerHTML=entries.length?'<div class="sub" style="margin:9px 0 4px"><b>Ajustes já salvos (histórico protegido)</b></div>'+
  entries.map(x=>'<div class="sub" style="border-bottom:1px solid #ddd;padding:5px 0">'+
   (x.kind==='abater'?'➖ Abatimento ':'➕ Acréscimo ')+
   '<b>'+money(x.amount)+'</b> · '+esc(x.reason)+' · '+esc(sid(x.createdAt).slice(0,10))+'</div>').join(''):'';
 recalc();
}
function syncPointHintV9592(row,p){
 if(row.dataset.kind!=='travetada')return;
 const field=row.querySelector('.fm92-points'),hint=row.querySelector('.fm92-point-hint'),check=row.querySelector('.fm92-save-points');
 if(!field||!hint)return;
 if(!p){hint.textContent='Sem modelo: cálculo avulso. Nenhuma ficha será alterada.';if(check)check.checked=false;return}
 const stored=pointsPerPieceV9592(p),entered=number(field.value);
 hint.textContent=stored===entered&&stored>0?'✓ Ficha: '+stored+' travetada(s) por peça.':
  'Ficha atual: '+stored+' por peça. Informe a quantidade correta e confirme a atualização para este modelo.';
}
function refreshFactionDiscountV9592(row,force=false){
 if(row?.dataset?.kind!=='product')return;
 const p=productDirectory().find(x=>sid(x.id)===sid(row.querySelector('.fm66-product-id')?.value));
 const picked=factionDirectory().find(x=>norm(x.name)===norm(document.getElementById('fm66-faction')?.value));
 const master=arr('factionMasters').find(x=>sid(x.id)===sid(picked?.id));
 const discount=row.querySelector('.fm66-discount'),unit=number(row.querySelector('.fm66-unit')?.value),hint=row.querySelector('.fm66-hint');
 if(!p||!discount||(!force&&row.dataset.discountOriginV9592==='manual'))return;
 const calc=autoTravetaV9592(p,master);
 if(calc.applies&&calc.perPiece!=null&&calc.points>0&&calc.perPiece<=unit){
  discount.value=calc.perPiece.toFixed(2);row.dataset.discountOriginV9592='automatic';
  if(hint)hint.textContent='✓ NÃO traveta: '+calc.points+' × '+money(calc.rate)+' = '+
    money(calc.perPiece)+' de desconto por peça.';
 }else{
  discount.value='0.00';row.dataset.discountOriginV9592='automatic';
  if(hint)hint.textContent=master?.doesTraveta===false?
   (!calc.points?'⚠ Ficha sem travetadas: cadastre antes do desconto.':
    calc.rate==null?'⚠ Preço da travetada não cadastrado.':
    '⚠ Desconto superior à mão de obra: confira preço/tarifa.'):
   master?.doesTraveta===true?'Facção faz travetada: sem desconto.':
    'Informe no cadastro da facção se faz travetada para desconto automático.';
 }
 recalc();
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
  row.querySelector('.fm66-hint').textContent='Selecione o modelo cadastrado ou marque Modelo não cadastrado.';
  renderProductsFor(row,e.target.value);
 });
 row.querySelector('.fm66-suggestions').addEventListener('click',e=>{
  const option=e.target.closest('button[data-product-id]');if(!option)return;
  const p=productDirectory().find(x=>sid(x.id)===sid(option.dataset.productId));if(!p)return;
  row.querySelector('.fm66-product-id').value=sid(p.id);
  const manualCheck=row.querySelector('.fm66-unregistered');
  if(manualCheck){manualCheck.checked=false;row.querySelector('.fm66-manual-fields').style.display='none'}
  row.querySelector('.fm66-search').disabled=false;
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
 const manualCheck=row.querySelector('.fm66-unregistered');
 if(manualCheck){
  const area=row.querySelector('.fm66-manual-fields'),name=row.querySelector('.fm66-manual-name'),
   category=row.querySelector('.fm66-manual-category'),lookup=row.querySelector('.fm66-search'),unit=row.querySelector('.fm66-unit');
  manualCheck.addEventListener('change',()=>{
   area.style.display=manualCheck.checked?'block':'none';
   lookup.disabled=manualCheck.checked;
   if(manualCheck.checked){
    row.querySelector('.fm66-product-id').value='';lookup.value='';
    row.querySelector('.fm66-suggestions').style.display='none';
    if(row.dataset.kind==='embalagem'){
     unit.value='';
     row.querySelector('.fm66-hint').textContent='Modelo avulso: informe nome, categoria e valor. Não será cadastrado no estoque.';
    }else row.querySelector('.fm66-hint').textContent='Travetada: informe o modelo se desejar (opcional).';
    row.dataset.priceOrigin='manual-avulso';
   }
   recalc();
  });
  name?.addEventListener('input',recalc);
  category?.addEventListener('change',()=>{
   if(!manualCheck.checked)return;
   const price=category.value==='outros'?null:window.hlgbFactionRates9577?.embalagem?.({name:category.value});
   unit.value=price==null?'':Number(price).toFixed(2);
   row.dataset.priceOrigin=price==null?'manual-avulso':'tabela-embalagem-avulso';
   recalc();
  });
 }
 row.querySelector('.fm66-remove').addEventListener('click',()=>{
  if(existingRow){
   const reason=window.prompt?.('Motivo para retirar este produto do pagamento (obrigatório):','');
   if(reason==null)return;
   if(sid(reason).trim().length<5){window.alert?.('Informe um motivo de pelo menos 5 caracteres.');return}
   if(!draft||!Array.isArray(draft.removals)){window.alert?.('Reabra a edição antes de remover.');return}
   draft.removals.push({id:sid(existingRow.id),reason:sid(reason).trim(),description:sid(existingRow.description)});
   row.remove();renderRemovedLinesV9590();recalc();
  }else{row.remove();recalc()}
 });
 row.querySelectorAll('.fm66-qty,.fm66-unit,.fm66-discount').forEach(inp=>inp.addEventListener('input',()=>{
  if(inp.classList.contains('fm66-unit'))row.dataset.priceOrigin='manual';
  recalc();
 }));

 if(existingRow){
  row.dataset.priceOrigin=sid(existingRow.priceOriginV9566||'manual');
  const p=productDirectory().find(x=>sid(x.id)===sid(existingRow.productId));
  row.querySelector('.fm66-product-id').value=sid(existingRow.productId||'');
  row.querySelector('.fm66-search').value=p?.name||(!existingRow.manualProductNameV9589?sid(existingRow.description||''):'');
  if(kind==='service'&&row.querySelector('.fm66-desc'))row.querySelector('.fm66-desc').value=sid(existingRow.description);
  row.querySelector('.fm66-qty').value=sid(existingRow.quantity||1);
  row.querySelector('.fm66-unit').value=Number(existingRow.unitPrice||0).toFixed(2);
  row.querySelector('.fm66-discount').value=Number(existingRow.travetaDiscountUnitV9577||0).toFixed(2);
  row.querySelector('.fm66-line-note').value=sid(existingRow.manualLineNoteV9566||'');
  if(existingRow.manualProductNameV9589&&row.querySelector('.fm66-unregistered')){
   const check=row.querySelector('.fm66-unregistered'),area=row.querySelector('.fm66-manual-fields');
   check.checked=true;area.style.display='block';
   row.querySelector('.fm66-search').disabled=true;row.querySelector('.fm66-search').value='';
   row.querySelector('.fm66-product-id').value='';
   row.querySelector('.fm66-manual-name').value=sid(existingRow.manualProductNameV9589);
   const cat=row.querySelector('.fm66-manual-category');
   if(cat)cat.value=sid(existingRow.manualProductCategoryV9589||'outros');
  }
  const remove=row.querySelector('.fm66-remove');
  if(remove)remove.title='Remover este produto da cobrança, com motivo e preservação no histórico.';
 }else if(kind==='travetada'){
  const picked=factionDirectory().find(x=>norm(x.name)===norm(document.getElementById('fm66-faction')?.value));
  const master=arr('factionMasters').find(x=>sid(x.id)===sid(picked?.id));
  const rate=window.hlgbFactionRates9577?.traveta?.(master);
  if(rate!=null&&Number(rate)>0){
   row.querySelector('.fm66-unit').value=Number(rate).toFixed(2);
   row.dataset.priceOrigin='tabela-travetada';
  }
 }
 recalc();
}
function renderRemovedLinesV9590(){
 const host=document.getElementById('fm90-removed-lines');if(!host)return;
 const removed=draft?.removals||[];
 host.innerHTML=removed.length?'<div class="sub" style="margin:5px 0"><b>Produtos retirados nesta edição</b> — serão cancelados quando salvar:</div>'+
  removed.map((r,i)=>'<div class="panel" style="margin:4px 0;padding:8px"><b>'+esc(r.description)+'</b> · '+esc(r.reason)+
   ' <button type="button" class="secondary fm90-undo" data-index="'+i+'">Desfazer</button></div>').join(''):'';
 host.querySelectorAll('.fm90-undo').forEach(btn=>btn.addEventListener('click',()=>{
  const i=Number(btn.dataset.index),item=draft?.removals?.splice(i,1)?.[0];
  if(item){const original=groupRows(draft.groupId).find(x=>sid(x.id)===sid(item.id));
   if(original)addLine(sid(original.manualKindV9566||'product'),original);
   renderRemovedLinesV9590();
  }
 }));
}
function renderFactionList(q){
 const host=document.getElementById('fm66-faction-suggestions');if(!host)return;
 const mode=document.getElementById('fm66-mode')?.value||'faccao',rows=searchFactions(q,mode);
 host.style.display='block';
 host.innerHTML=rows.map(f=>'<button type="button" role="option" class="fm66-faction-option" data-faction="'+esc(f.name)+
  '" style="display:block;width:100%;text-align:left;background:white;border:0;border-bottom:1px solid #eee;padding:9px;cursor:pointer">'+
  '<b>'+esc(f.name)+'</b> <small>'+esc(f.source)+'</small></button>').join('')+
  (!rows.length?'<div class="sub" style="padding:8px">'+(mode==='embalagem'?
   'Nenhuma embaladeira cadastrada. Escolha Embaladeira no cadastro de facções.':
   mode==='travetada'?'Nenhum travetador cadastrado. Em Cadastros → Facções, selecione a atividade Travetada para essa pessoa.':
   'Nenhuma facção de costura encontrada. Cadastre em Cadastros → Facções.')+'</div>':'');
}
function formData(){
 const root=document.getElementById('fm66-root');if(!root)throw Error('Formulário não carregado.');
 const get=id=>root.querySelector('#'+id)?.value||'';
 return {factionName:get('fm66-faction'),serviceMode:get('fm66-mode')||'faccao',date:get('fm66-date'),status:get('fm66-status'),
  method:get('fm66-method'),note:get('fm66-note'),lines:[...root.querySelectorAll('.fm66-line')].map(lineFromDom),
   directAdjustmentsV9591:[...root.querySelectorAll('.fm91-adjustment')].map(el=>({
    id:sid(el.dataset.id),kind:el.querySelector('.fm91-kind')?.value||'',
    amount:el.querySelector('.fm91-value')?.value||'',reason:el.querySelector('.fm91-reason')?.value||''
   }))};
}
function receiptSummary(){
 const host=document.getElementById('fm66-pdf-summary'),file=document.getElementById('fm66-pdf')?.files?.[0];if(!host)return;
 host.textContent=file?'Selecionado: '+file.name+' ('+Math.ceil(file.size/1024)+' KB). Será armazenado com o pagamento.':'PDF opcional, até 750 KB. Não altera o status automaticamente.';
}
function modalHtml(){
 const today=stamp(),tariffs=window.hlgbFactionRates9577?.rates?.()||{embalagem:{camisola:.25,doll:.25,calcinha:.15},travetaUnit:null};
 return '<div id="fm66-root" style="max-width:100%;overflow-x:hidden">'+
  '<div class="sub">Escolha Facção, Embalagem ou Travetada. Modelos não cadastrados podem ser informados na embalagem sem criar produtos no estoque.</div>'+
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:12px">'+
  '<div class="field"><label>Atividade</label><select id="fm66-mode"><option value="faccao">Facção / Costura</option><option value="embalagem">Embalagem</option><option value="travetada">Travetada (serviço exclusivo)</option></select></div>'+ 
  '<div class="field"><label>Facção, embaladeira ou travetador</label><input id="fm66-faction" role="combobox" aria-label="Buscar facção ou embaladeira" autocomplete="off" aria-autocomplete="list" placeholder="Busque a pessoa cadastrada">'+
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
  '<div id="fm66-lines"></div><div id="fm90-removed-lines" aria-live="polite"></div>'+
   '<div id="fm91-direct-panel" class="panel" style="margin:12px 0;padding:12px;border:1px solid #d6b8cb;border-radius:10px">'+
   '<b>➖ Abater / ➕ Acrescentar valor neste pagamento</b>'+
   '<p class="sub" style="margin:6px 0">Ajuste manual direto no total do avulso, antes de pagar. Use para adiantamento, desconto, valor faltante ou diferença combinada. Cada ajuste precisa de motivo.</p>'+
   '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">'+
   '<button class="secondary" id="fm91-add-minus" type="button">➖ Abater valor</button>'+
   '<button class="secondary" id="fm91-add-plus" type="button">➕ Acrescentar valor</button></div>'+
   '<div id="fm91-saved-adjustments"></div><div id="fm91-new-adjustments"></div>'+
   '<div class="sub" style="margin-top:8px">Produtos/serviços: <b id="fm91-subtotal">R$ 0,00</b> · Abatimentos: <b id="fm91-minus">R$ 0,00</b> · Acréscimos: <b id="fm91-plus">R$ 0,00</b></div>'+
   '<div class="sub">Acertos anteriores já aplicados: <b id="fm91-previous">R$ 0,00</b></div>'+
   '<div class="sub" id="fm91-warning" role="status"></div></div>'+
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
 draft=editing?{groupId:sid(groupId),editing:true,createdAt:stored[0].createdAt||new Date().toISOString(),receipt:stored.find(x=>x.receiptPdfV9566)?.receiptPdfV9566||null,
  removals:[],editAttemptId:makeId('faction-edit')}:
  {groupId:makeId('faction-manual'),createdAt:new Date().toISOString(),receipt:null};
 state.opened++;
 const open=window.openModal||openModal;
 open(editing?'Editar pagamento avulso pendente':'Pagamento avulso — facção, embalagem ou travetada',modalHtml(),async()=>{
  const btn=document.querySelector('#fm66-root .modalSave'),feedback=document.getElementById('fm66-feedback');
  if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
  if(feedback)feedback.textContent='Confirmando os registros na nuvem...';
  try{
   const input=formData(),file=document.getElementById('fm66-pdf')?.files?.[0],receipt=await readReceipt(file);
   if(editing)await saveGroupEdits(groupId,input,receipt,draft?.removals||[]);else await persistDraft(input,receipt);
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
   if(document.getElementById('fm66-mode')?.value==='travetada'){
    const person=factionDirectory().find(x=>norm(x.name)===norm(faction.value));
    const master=arr('factionMasters').find(x=>sid(x.id)===sid(person?.id));
    const rate=window.hlgbFactionRates9577?.traveta?.(master);
    if(rate!=null&&Number(rate)>0){
     document.querySelectorAll('#fm66-lines .fm66-line[data-kind="travetada"]').forEach(row=>{
      const unit=row.querySelector('.fm66-unit');
      if(unit&&(!unit.value||row.dataset.priceOrigin==='tabela-travetada')){
       unit.value=Number(rate).toFixed(2);row.dataset.priceOrigin='tabela-travetada';
      }
     });
     recalc();
    }
   }
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
  document.getElementById('fm66-add-product').style.display=mode==='faccao'?'':'none';
  document.getElementById('fm66-add-traveta').style.display=mode==='embalagem'?'none':'';
  document.getElementById('fm66-add-service').style.display=mode==='faccao'?'':'none';
  document.getElementById('fm66-add-embalagem').style.display=mode==='embalagem'?'':'none';
  addLine(mode==='embalagem'?'embalagem':mode==='travetada'?'travetada':'product');
 });
 document.getElementById('fm66-add-service')?.addEventListener('click',()=>addLine('service'));
 document.getElementById('fm66-pdf')?.addEventListener('change',receiptSummary);
 document.getElementById('fm91-add-minus')?.addEventListener('click',()=>addDirectAdjustmentRowV9591('abater'));
 document.getElementById('fm91-add-plus')?.addEventListener('click',()=>addDirectAdjustmentRowV9591('acrescentar'));
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
  document.getElementById('fm66-add-product').style.display=mode==='faccao'?'':'none';
  document.getElementById('fm66-add-traveta').style.display=packaging?'none':'';
  document.getElementById('fm66-add-service').style.display=mode==='faccao'?'':'none';
  document.getElementById('fm66-add-embalagem').style.display=packaging?'':'none';
  for(const row of activeGroupRowsV9590(stored))addLine(sid(row.manualKindV9566||'product'),row);
   renderExistingDirectV9591(stored);
  if(draft.receipt){
   const summary=document.getElementById('fm66-pdf-summary');
   if(summary)summary.textContent='Comprovante existente: '+sid(draft.receipt.name)+'. Será preservado. Não envie outro PDF.';
   const file=document.getElementById('fm66-pdf');if(file)file.disabled=true;
  }
  const btn=document.querySelector('#fm66-root .modalSave');if(btn)btn.textContent='☁️ Salvar alterações';
  const info=document.getElementById('fm66-feedback');if(info)info.textContent='Para retirar um produto lançado por engano, clique em Remover e informe o motivo. O registro será cancelado (não apagado) quando salvar. Você também pode desfazer a retirada antes de salvar.';
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
  if(!isCanceledV9590(r)){cur.total+=Number(r.value)||0;cur.items++}
  cur.rows.push(r);
  if(r.receiptPdfV9566?.base64){cur.receipt=r.receiptPdfV9566;cur.recordId=sid(r.id)}
  if(sid(r.updatedAt)>cur.updatedAt)cur.updatedAt=sid(r.updatedAt);
  groups.set(id,cur);
 }
 for(const group of groups.values()){
  group.status=groupState(group.rows);
  group.paidDate=group.status==='Pago'?sid(group.rows[0]?.paymentDate):'';
  group.date=group.paidDate||sid(group.rows[0]?.scheduledPaymentDate);
  group.nominal=Math.round(group.total*100)/100;
  group.applications=groupApplicationsV9590(group.rows);
  group.corrections=groupCorrectionsV9590(group.rows);
  group.directAdjustments=directAdjustmentsV9591(group.rows);
  group.total=netGroupV9590(group.rows);
  group.adjustmentBalance=group.corrections.reduce((sum,x)=>sum+
   cents(x.kind==='a_mais'?-correctionRemainingV9590(x):correctionRemainingV9590(x)),0)/100;
 }
 return [...groups.values()].sort((a,b)=>sid(b.date).localeCompare(sid(a.date))||
  sid(b.updatedAt).localeCompare(sid(a.updatedAt)));
}

/* PDF detalhado: gerador local, sem CDN, sem baixar comprovantes dentro
 * do resumo e sem qualquer mutação de dados. Fonte Courier/WinAnsi permite
 * copiar o texto no PDF; suporta múltiplas páginas e observações extensas. */
function pdfEncode1252V9590(str){
 const fixes={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,
  'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,
  '—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
 let out='';
 for(const c of sid(str).replace(/[\r\n\t]/g,' ')){
  const k=c.charCodeAt(0);out+=k<=255?c:(fixes[c]!=null?String.fromCharCode(fixes[c]):'?');
 }
 return out;
}
function pdfEscapeV9590(value){
 return pdfEncode1252V9590(value).replace(/[\\()]/g,c=>'\\'+c);
}
function pdfWrapV9590(value,max=93){
 const result=[];
 for(const paragraph of sid(value).split(/\r?\n/)){
  let words=paragraph.trim().split(/\s+/).filter(Boolean);
  if(!words.length){result.push('');continue}
  let line='';
  for(let word of words){
   while(word.length>max){if(line){result.push(line);line=''}result.push(word.slice(0,max));word=word.slice(max)}
   if(line&&line.length+1+word.length>max){result.push(line);line=word}
   else line+=(line?' ':'')+word;
  }
  if(line)result.push(line);
 }
 return result;
}
function summaryLinesV9590(groupId){
 const all=assertGroup(groupId),group=receiptGroups().find(g=>g.id===sid(groupId));
 if(!group)throw Error('Pagamento avulso não encontrado para o relatório.');
 const active=activeGroupRowsV9590(all),canceled=all.filter(isCanceledV9590),
  apps=groupApplicationsV9590(all),corrections=groupCorrectionsV9590(all),
  original=nominalGroupV9590(all),net=netGroupV9590(all),
  paid=active.reduce((sum,x)=>sum+(Number(x.paidAmount)||0),0);
 const f=money,v=x=>sid(x||'-'),date=()=>new Date().toLocaleString('pt-BR');
 const out=['RESUMO DETALHADO DE PAGAMENTO AVULSO','HLGB CONFECCOES','Emitido: '+date(),
  'Documento informativo: confira com o comprovante bancario e o Hub Financeiro.',
  'IDENTIFICACAO',
  'Lancamento: '+group.id,'Profissional / faccao: '+v(group.factionName),
  'Atividade: '+(group.serviceMode==='embalagem'?'Embalagem':group.serviceMode==='travetada'?'Travetada':'Costura / faccao'),
  'Status: '+group.status,'Data prevista / pagamento: '+v(group.date),
  'Linhas ativas: '+active.length+' | Canceladas: '+canceled.length,
  'VALORES',
  'Soma dos servicos ativos: '+f(original),
  'Compensacoes recebidas: '+apps.map(x=>(x.kind==='a_mais'?'-':'+')+f(x.amount)).join(' / ').slice(0,160),
  'Ajustes diretos (abatimentos/acrescimos): '+
   directAdjustmentsV9591(all).map(x=>(x.kind==='abater'?'-':'+')+f(x.amount)).join(' / ').slice(0,160),
  'Total liquido previsto deste pagamento: '+f(net),
  'Valor marcado como pago nas linhas: '+f(paid),
  'Saldo deste pagamento: '+f(net-paid),
  'PRODUTOS E SERVICOS (ATIVOS)'];
 if(!active.length)out.push('Nenhum servico ativo.');
 for(let i=0;i<active.length;i++){
  const x=active[i];
  out.push('Item '+(i+1)+': '+v(x.description));
  out.push('  Quantidade: '+(Number(x.quantity)||0)+' | Unitario: '+f(x.unitPrice)+
   ' | Bruto: '+f(x.grossValueV9577??Number(x.quantity)*Number(x.unitPrice)));
  out.push('  Travetada descontada: '+f(x.travetaDiscountTotalV9577||0)+
   ' | Liquido: '+f(x.value)+' | Pago atribuido: '+f(x.paidAmount));
  out.push('  Modelo: '+v(x.manualProductNameV9589||x.productName||x.productId)+
   ' | ID: '+v(x.productId||'avulso / sem cadastro'));
  if(x.manualLineNoteV9566)out.push('  Observacao da linha: '+v(x.manualLineNoteV9566));
  if(x.observation)out.push('  Observacao do pagamento: '+v(x.observation));
  if(x.paymentDate)out.push('  Pago em: '+v(x.paymentDate)+' | Metodo: '+v(x.paymentMethod));
 }
 out.push('LINHAS RETIRADAS (HISTORICO PRESERVADO)');
 if(!canceled.length)out.push('Nenhuma linha cancelada.');
 for(const x of canceled){
  out.push('CANCELADA: '+v(x.description)+' | '+(Number(x.quantity)||0)+' pecas | Valor original: '+f(x.value));
  out.push('  Motivo: '+v(x.manualCanceledReasonV9590)+' | Data: '+v(x.manualCanceledAtV9590));
 }
 out.push('AJUSTES DIRETOS NESTE PAGAMENTO');
 const inline=directAdjustmentsV9591(all);
 if(!inline.length)out.push('Nenhum abatimento/acrescimo direto registrado.');
 for(const adj of inline){
  out.push((adj.kind==='abater'?'ABATIMENTO':'ACRESCIMO')+' '+f(adj.amount)+
   ' | Identificacao: '+v(adj.id)+' | Data: '+v(adj.createdAt));
  out.push('  Motivo / observacao: '+v(adj.reason));
 }
 out.push('ACERTOS POR PAGAMENTO A MAIS / A MENOS');
 if(!corrections.length)out.push('Nenhuma diferenca registrada neste pagamento.');
 for(const x of corrections){
  out.push((x.kind==='a_mais'?'PAGO A MAIS / CREDITO':'PAGO A MENOS / DIFERENCA')+
   ' | Valor: '+f(x.amount)+' | Saldo ainda nao compensado: '+f(correctionRemainingV9590(x)));
  out.push('  Registro: '+v(x.registeredAt)+' | ID: '+v(x.id));
  out.push('  Motivo: '+v(x.reason));
  for(const applied of x.applications||[])
   out.push('  Compensacao em: '+v(applied.targetGroupId)+' | Valor: '+f(applied.amount));
 }
 out.push('COMPENSACOES APLICADAS A ESTE PAGAMENTO');
 if(!apps.length)out.push('Nenhuma compensacao recebida de outro pagamento.');
 for(const x of apps){
  out.push((x.kind==='a_mais'?'ABATIMENTO':'COMPLEMENTO')+' '+f(x.amount)+
   ' | Origem: '+v(x.sourceGroupId));
  out.push('  Motivo: '+v(x.reason)+' | Data: '+v(x.appliedAt));
 }
 out.push('HISTORICO DE PAGAMENTO');
 let histories=0;
 for(const x of all)for(const p of x.paymentHistory||[]){
  out.push(v(x.description)+' | '+v(p.date)+' | '+f(p.amount??p.value)+' | '+v(p.method));histories++;
 }
 if(!histories)out.push('Sem eventos de baixa registrados.');
 out.push('HISTORICO DE EDICOES');
 let edits=0;
 for(const x of all)for(const p of x.manualEditHistoryV9588||[]){
  out.push(v(x.description)+' | '+v(p.at)+' | '+v(p.reason)+' | '+f(p.from)+' -> '+f(p.to));edits++;
 }
 if(!edits)out.push('Nenhuma edicao anterior registrada.');
 out.push('COMPROVANTES');
 for(const x of all)if(x.receiptPdfV9566?.name)out.push(v(x.receiptPdfV9566.name)+
  ' | '+v(x.receiptPdfV9566.addedAt)+' | '+v(x.receiptPdfV9566.size)+' bytes');
 if(!all.some(x=>x.receiptPdfV9566?.name))out.push('Nenhum PDF comprovante anexado.');
 out.push('FIM DO RESUMO','O PDF resume os registros carregados no navegador. Nao e comprovante de transferencia.');
 return out.flatMap(line=>pdfWrapV9590(line,93));
}
function buildSummaryPdfV9590(groupId){
 const lines=summaryLinesV9590(groupId),perPage=49,pages=[];
 for(let i=0;i<lines.length;i+=perPage)pages.push(lines.slice(i,i+perPage));
 if(!pages.length)pages.push([]);
 const N=pages.length,objs=[],fontReg=3+2*N,fontBold=fontReg+1;
 objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
 objs[2]='<< /Type /Pages /Kids [ '+pages.map((_,i)=>3+i*2+' 0 R').join(' ')+' ] /Count '+N+' >>';
 pages.forEach((page,i)=>{
  let stream='0.38 0.20 0.30 rg BT /FB 15 Tf 44 800 Td (HLGB - PAGAMENTO AVULSO) Tj ET\n0 0 0 rg\n';
  stream+='0.40 0.40 0.40 RG 44 788 m 550 788 l S\n';
  let y=765;
  for(const line of page){
   const bold=/^(RESUMO|HLGB CONFECCOES|IDENTIFICACAO|VALORES|PRODUTOS E SERVICOS|LINHAS RETIRADAS|ACERTOS POR|COMPENSACOES APLICADAS|HISTORICO DE|COMPROVANTES|FIM DO)/.test(line);
   stream+='BT /'+(bold?'FB':'FR')+' '+(bold?9:8.8)+' Tf 44 '+y+' Td ('+pdfEscapeV9590(line)+') Tj ET\n';
   y-=14;
  }
  stream+='0.38 0.20 0.30 rg BT /FR 8 Tf 44 35 Td ('+
   pdfEscapeV9590('HLGB Confecções  |  Pagina '+(i+1)+'/'+N+'  |  Somente resumo informativo')+
   ') Tj ET\n';
  const p=3+i*2,content=p+1;
  objs[p]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /FR '+
   fontReg+' 0 R /FB '+fontBold+' 0 R >> >> /Contents '+content+' 0 R >>';
  const bytes=pdfEncode1252V9590(stream);
  objs[content]='<< /Length '+bytes.length+' >>\nstream\n'+bytes+'\nendstream';
 });
 objs[fontReg]='<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
 objs[fontBold]='<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>';
 let pdf='%PDF-1.4\n';const offsets=[0];
 for(let i=1;i<objs.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objs[i]+'\nendobj\n'}
 const xref=pdf.length;pdf+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';
 for(let i=1;i<objs.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 pdf+='trailer\n<< /Size '+objs.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 const bytes=new Uint8Array(pdf.length);for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;
 return new Blob([bytes],{type:'application/pdf'});
}
function downloadSummaryPdfV9590(groupId){
 const pdf=buildSummaryPdfV9590(groupId),url=URL.createObjectURL(pdf),link=document.createElement('a');
 link.href=url;link.download='HLGB-Pagamento-Avulso-'+sid(groupId).replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf';
 link.style.display='none';document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
 return {name:link.download,size:pdf.size,pages:null};
}

function openPayModal(groupId){
 const rows=assertGroup(groupId),status=groupState(rows);
 if(status==='Pago')throw Error('Este lançamento já está pago.');
 const total=netGroupV9590(rows);
 const priorHub=arr('hubFinanceEntries').find(x=>sid(x?.sourceId)===sid(groupId))||null;
 const paidLine=rows.find(x=>norm(x.status)==='pago')||null;
 const suggestedDate=paidLine?.paymentDate||priorHub?.date||stamp();
 const suggestedMethod=paidLine?.paymentMethod||priorHub?.paymentMethod||rows[0]?.paymentMethod||'';
 const group=receiptGroups().find(x=>x.id===sid(groupId));
 if(!group)throw Error('Pagamento avulso não encontrado.');
 const open=window.openModal||((typeof openModal==='function')?openModal:null);
 if(!open)throw Error('Janela de pagamento indisponível.');
 const html='<div id="fm88-pay-modal" class="panel" style="padding:12px">'+
  '<p><b>'+esc(group.factionName)+'</b> · '+group.items+' serviço(s) · <b>'+money(total)+'</b></p>'+
  '<p class="sub">A baixa registra o total já ajustado no Hub Financeiro. Para abater ou acrescentar agora, use o botão abaixo antes de confirmar. Nenhuma alteração será feita automaticamente.</p>'+
   '<p class="sub">Serviços: '+money(group.nominal)+' · Ajustes diretos: '+money(sumDirectCentsV9591(group.directAdjustments||[])/100)+
   ' · Total líquido: <b>'+money(total)+'</b></p>'+
   '<button type="button" class="secondary" id="fm91-pay-adjust">➖ Abater / ➕ Acrescentar antes de pagar</button>'+
  (status==='Revisar'?'<p style="color:#934">⚠ Algumas linhas possuem situação divergente. Confirme os dados da baixa anterior antes de continuar.</p>':'')+
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">'+
  '<div class="field"><label>Data em que foi pago</label><input type="date" id="fm88-paid-date" value="'+esc(suggestedDate)+'"></div>'+
  '<div class="field"><label>Forma de pagamento</label><input id="fm88-paid-method" placeholder="Pix, dinheiro, transferência" value="'+esc(suggestedMethod)+'"></div></div>'+
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
 document.getElementById('fm91-pay-adjust')?.addEventListener('click',()=>{
  openForm(groupId);
  document.getElementById('fm91-direct-panel')?.scrollIntoView?.({block:'center'});
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

function openCorrectionModalV9590(groupId){
 const group=receiptGroups().find(g=>g.id===sid(groupId));
 if(!group||group.status!=='Pago')throw Error('Acertos são registrados em pagamentos marcados como Pago.');
 const open=window.openModal||((typeof openModal==='function')?openModal:null);
 if(!open)throw Error('Janela de acerto indisponível.');
 const attempt=makeId('fm90-acerto'),html='<div id="fm90-correction" class="panel" style="padding:12px">'+
  '<p><b>'+esc(group.factionName)+'</b> · Pagamento original '+money(group.nominal)+'</p>'+
  '<p class="sub">Um acerto não altera o pagamento realizado nem cria automaticamente uma transferência. O crédito ou diferença fica em aberto para compensar em outro pagamento pendente da mesma pessoa.</p>'+
  '<div class="field"><label>Qual foi o erro?</label><select id="fm90-kind">'+
  '<option value="a_mais">Paguei a mais — desconto no próximo pagamento</option>'+
  '<option value="a_menos">Paguei a menos — acrescentar ao próximo pagamento</option></select></div>'+
  '<div class="field"><label>Diferença em reais (R$)</label><input id="fm90-amount" type="number" step="0.01" min="0.01"></div>'+
  '<div class="field"><label>Motivo / observação obrigatória</label><textarea id="fm90-reason" rows="3" maxlength="700" placeholder="Ex.: transferi R$ 20,00 a mais no Pix de 12/11"></textarea></div>'+
  '<div id="fm90-feedback" role="status" class="sub"></div>'+
  '<button class="primary modalSave" type="button">☁️ Registrar acerto na nuvem</button></div>';
 open('Corrigir diferença de pagamento',html,async()=>{
  const host=document.getElementById('fm90-correction'),btn=host?.querySelector('.modalSave'),
   feedback=host?.querySelector('#fm90-feedback');
  if(btn)btn.disabled=true;if(feedback)feedback.textContent='Conferindo pagamento original e registrando diferença…';
  try{
   await registerCorrectionV9590(groupId,host.querySelector('#fm90-kind')?.value,
    host.querySelector('#fm90-amount')?.value,host.querySelector('#fm90-reason')?.value,attempt);
   window.closeModal?.();renderReceipts();return true;
  }catch(e){if(feedback)feedback.textContent='⚠ '+sid(e.message||e);if(btn)btn.disabled=false;return false}
 });
 return true;
}
function openApplyCorrectionModalV9590(groupId,correctionId){
 const group=receiptGroups().find(g=>g.id===sid(groupId)),event=groupCorrectionsV9590(group?.rows||[]).find(x=>sid(x.id)===sid(correctionId));
 if(!event)throw Error('Acerto não encontrado.');
 const available=correctionRemainingV9590(event);
 if(available<=0)throw Error('Este acerto já foi integralmente compensado.');
 const targets=matchingPendingGroupsV9590(groupId);
 if(!targets.length)throw Error('Não existe pagamento pendente da mesma pessoa. O crédito/diferença ficará em aberto para compensar depois.');
 const open=window.openModal||((typeof openModal==='function')?openModal:null);
 if(!open)throw Error('Janela de compensação indisponível.');
 const choices=targets.map(g=>'<option value="'+esc(g.id)+'">'+esc(g.date||'Sem data')+' · '+
  esc(g.factionName)+' · A pagar '+money(g.total)+'</option>').join('');
 const html='<div id="fm90-apply" class="panel" style="padding:12px">'+
  '<p><b>'+esc(event.kind==='a_mais'?'Abater crédito pago a mais':'Acrescentar diferença paga a menos')+'</b></p>'+
  '<p>Saldo em aberto: <b>'+money(available)+'</b></p>'+
  '<div class="field"><label>Pagamento pendente da mesma pessoa</label><select id="fm90-target">'+choices+'</select></div>'+
  '<div class="field"><label>Quanto deseja compensar (R$)</label><input type="number" step="0.01" min="0.01" id="fm90-apply-amount" value="'+available.toFixed(2)+'"></div>'+
  '<p class="sub">Você pode aplicar parte do valor. O restante continuará em aberto. Se for desconto, o valor a pagar não pode ficar negativo.</p>'+
  '<div id="fm90-apply-feedback" role="status" class="sub"></div>'+
  '<button class="primary modalSave" type="button">☁️ Confirmar compensação</button></div>';
 open('Compensar acerto em pagamento pendente',html,async()=>{
  const host=document.getElementById('fm90-apply'),btn=host?.querySelector('.modalSave'),
   feedback=host?.querySelector('#fm90-apply-feedback');
  if(btn)btn.disabled=true;if(feedback)feedback.textContent='Confirmando a compensação na nuvem…';
  try{
   await applyCorrectionV9590(groupId,correctionId,host.querySelector('#fm90-target')?.value,
    host.querySelector('#fm90-apply-amount')?.value);
   window.closeModal?.();renderReceipts();return true;
  }catch(e){if(feedback)feedback.textContent='⚠ '+sid(e.message||e);if(btn)btn.disabled=false;return false}
 });
 return true;
}

function renderReceipts(){
 const anchor=document.getElementById('factionPaymentTable');if(!anchor)return false;
 let host=document.getElementById('fm66-receipts');
 if(!host){host=document.createElement('div');host.id='fm66-receipts';host.className='panel';
  host.style.cssText='margin-top:14px;padding:12px';anchor.insertAdjacentElement('afterend',host)}
 const groups=receiptGroups(),pending=groups.filter(g=>g.status==='Pendente'),
  paid=groups.filter(g=>g.status==='Pago'),review=groups.filter(g=>g.status==='Revisar');
 const signature=JSON.stringify(groups.map(g=>[g.id,g.factionName,g.date,g.status,g.total,g.items,g.updatedAt,
  g.corrections?.map(x=>[x.id,x.amount,x.kind,x.reason,correctionRemainingV9590(x)]),g.applications?.map(x=>[x.id,x.amount]),
  g.directAdjustments?.map(x=>[x.id,x.kind,x.amount,x.reason]),
  g.receipt?.name||'',g.receipt?.size||0]));
 // Preserve file selection and focused filters when periodic refresh has not changed data.
 if(host.dataset.fm66Signature===signature)return true;
 const previousFilter=host.querySelector('#fm88-filter-name')?.value||'',
  previousStatus=host.querySelector('#fm88-filter-status')?.value||'todos';
 host.dataset.fm66Signature=signature;
 const sum=rows=>money(rows.reduce((total,x)=>total+x.total,0));
 host.innerHTML='<h3 style="margin:0 0 5px">Pagamentos avulsos — facções e embaladeiras</h3>'+
  '<p class="sub">Edite e remova produtos pendentes com motivo, registre acertos pagos a mais/a menos e baixe o PDF detalhado com histórico.</p>'+
  '<div class="cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:8px;margin:12px 0">'+
  '<div class="card"><small>A pagar · '+pending.length+' lançamento(s)</small><strong>'+sum(pending)+'</strong></div>'+
  '<div class="card"><small>Pagos · '+paid.length+' lançamento(s)</small><strong>'+sum(paid)+'</strong></div>'+
  (review.length?'<div class="card"><small>Revisar · '+review.length+'</small><strong>'+sum(review)+'</strong></div>':'')+'</div>'+
  '<div class="toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:10px 0">'+
  '<div class="field"><label>Buscar facção, produto ou serviço</label><input id="fm88-filter-name" autocomplete="off" placeholder="Pesquisar lançamento"></div>'+
  '<div class="field"><label>Situação</label><select id="fm88-filter-status"><option value="todos">Todos</option>'+
  '<option>Pendente</option><option>Pago</option><option>Revisar</option><option>Cancelado</option></select></div></div>'+
  (groups.length?'<div style="overflow-x:auto"><table style="width:100%"><thead><tr><th>Facção / serviço</th>'+
   '<th>Data</th><th>Situação</th><th>Valor</th><th>Itens</th><th>Comprovante</th><th>Ações</th></tr></thead><tbody>'+
   groups.map(g=>{
    const descriptions=g.rows.map(r=>sid(r.description||'')+' '+Number(r.quantity||0)+'x').join(' ');
    const corrections=(g.corrections||[]).length?'<div style="margin-top:8px"><b>Acertos de pagamento</b>'+
     g.corrections.map(x=>{
      const remaining=correctionRemainingV9590(x);
      return '<div style="border-top:1px solid #ddd;padding:7px 0">'+
       '<b>'+esc(x.kind==='a_mais'?'Pago a mais / crédito':'Pago a menos / complemento')+'</b>'+
       ' · '+money(x.amount)+' · <b>Em aberto: '+money(remaining)+'</b>'+
       '<div class="sub">Motivo: '+esc(x.reason)+'</div>'+
       (remaining>0&&g.status==='Pago'?'<button type="button" class="secondary fm90-apply" data-group-id="'+esc(g.id)+
       '" data-event-id="'+esc(x.id)+'">↔ Compensar em pagamento pendente</button>':'')+
       '</div>'
     }).join('')+'</div>':'';
    const apps=(g.applications||[]).length?'<div style="margin-top:7px"><b>Compensações neste pagamento</b>'+
     g.applications.map(x=>'<div class="sub">'+esc(x.kind==='a_mais'?'Abatimento':'Complemento')+
      ' '+money(x.amount)+' · Origem '+esc(x.sourceGroupId)+' · '+esc(x.reason)+'</div>').join('')+'</div>':'';
    const items='<details><summary>'+g.items+' item(ns) · Ver detalhes</summary>'+
     '<div style="min-width:180px">'+g.rows.map(r=>'<div style="border-bottom:1px solid #eee;padding:5px">'+
      '<b>'+(isCanceledV9590(r)?'❌ [Cancelado] ':'')+esc(r.description||'Serviço')+'</b>'+
      (isCanceledV9590(r)?'<div class="sub">Motivo: '+esc(r.manualCanceledReasonV9590||'Não informado')+'</div>':'')+
      '<div class="sub">'+Number(r.quantity||0).toLocaleString('pt-BR')+
      ' × '+money(r.unitPrice)+' · desconto '+money(r.travetaDiscountTotalV9577)+'</div><b>'+
      money(r.value)+'</b></div>').join('')+
      corrections+apps+'</div></details>';
    const proof=g.receipt?'<button type="button" class="secondary fm66-download" data-group-id="'+esc(g.id)+'">'+esc(g.receipt.name)+'</button>':
     '<div class="field" style="min-width:170px"><input type="file" class="fm66-attach-input" data-group-id="'+esc(g.id)+'" accept=".pdf,application/pdf">'+
     '<button type="button" class="secondary fm66-attach" data-group-id="'+esc(g.id)+'">☁️ Salvar PDF</button></div>';
    const actions=g.status==='Pendente'?
     '<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="secondary fm88-edit" data-group-id="'+esc(g.id)+'">✏️ Editar</button>'+
     '<button type="button" class="secondary fm91-quick-adjust" data-group-id="'+esc(g.id)+'">➖ Abater / ➕ Acrescentar</button>'+
     '<button type="button" class="primary fm88-pay" data-group-id="'+esc(g.id)+'">✅ Marcar pago</button></div>':
     g.status==='Pago'?'<button type="button" class="secondary fm90-correct" data-group-id="'+esc(g.id)+'">⚖️ Acerto a mais / a menos</button>':
     g.status==='Cancelado'?'<span class="sub">Cancelado · histórico preservado</span>':
     '<button type="button" class="secondary fm88-pay" data-group-id="'+esc(g.id)+'" title="Somente concluir uma baixa previamente iniciada após conferir o financeiro">⚠ Revisar / concluir baixa</button>';
    return '<tr data-fm88-row="1" data-status="'+esc(g.status)+'" data-search="'+esc(norm(g.factionName+' '+descriptions+' '+g.serviceMode))+'">'+
     '<td><b>'+esc(g.factionName)+'</b><div class="sub">'+esc(g.serviceMode==='embalagem'?'Embalagem':g.serviceMode==='travetada'?'Travetada':'Facção / Costura')+'</div></td>'+
     '<td>'+esc(g.date||'Sem data')+'</td><td><b>'+esc(g.status)+'</b></td>'+
     '<td><b>'+money(g.total)+'</b>'+
     (g.directAdjustments?.length?'<div class="sub">Ajustes diretos: '+money(sumDirectCentsV9591(g.directAdjustments)/100)+'</div>':'')+
     (g.applications?.length?'<div class="sub">Serviços: '+money(g.nominal)+'<br>Acertos: '+
       money(g.total-g.nominal)+'</div>':'')+
     (g.adjustmentBalance?'<div class="sub">'+(g.adjustmentBalance<0?'Crédito a abater: ':'Diferença a pagar: ')+
      money(Math.abs(g.adjustmentBalance))+'</div>':'')+'</td>'+
     '<td>'+items+'</td><td>'+proof+'</td><td>'+actions+
     '<button type="button" class="secondary fm90-summary-pdf" data-group-id="'+esc(g.id)+
     '" style="display:block;margin-top:6px">📄 Baixar PDF detalhado</button></td></tr>';
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
 host.querySelectorAll('.fm91-quick-adjust').forEach(b=>b.addEventListener('click',()=>{
  try{openForm(b.dataset.groupId);document.getElementById('fm91-direct-panel')?.scrollIntoView?.({block:'center'})}
  catch(e){const x=feedback();if(x)x.textContent='⚠ '+sid(e.message||e)}
 }));
 host.querySelectorAll('.fm88-pay').forEach(b=>b.addEventListener('click',()=>{
  try{openPayModal(b.dataset.groupId)}catch(e){const x=feedback();if(x)x.textContent='⚠ '+sid(e.message||e)}
 }));
 host.querySelectorAll('.fm90-correct').forEach(b=>b.addEventListener('click',()=>{
  try{openCorrectionModalV9590(b.dataset.groupId)}catch(e){const x=feedback();if(x)x.textContent='⚠ '+sid(e.message||e)}
 }));
 host.querySelectorAll('.fm90-apply').forEach(b=>b.addEventListener('click',()=>{
  try{openApplyCorrectionModalV9590(b.dataset.groupId,b.dataset.eventId)}
  catch(e){const x=feedback();if(x)x.textContent='⚠ '+sid(e.message||e)}
 }));
 host.querySelectorAll('.fm90-summary-pdf').forEach(b=>b.addEventListener('click',()=>{
  try{downloadSummaryPdfV9590(b.dataset.groupId)}
  catch(e){const x=feedback();if(x)x.textContent='⚠ Não foi possível gerar PDF: '+sid(e.message||e)}
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
 registerCorrectionV9590,applyCorrectionV9590,matchingPendingGroupsV9590,groupCorrectionsV9590,groupApplicationsV9590,
 correctionRemainingV9590,netGroupV9590,directAdjustmentsV9591,validateDirectInputV9591,buildSummaryPdfV9590,summaryLinesV9590,downloadSummaryPdfV9590,
 status:()=>({...state}),maxPdfBytes:MAX_PDF};
install();
[500,1700,3800].forEach(ms=>setTimeout(install,ms));
try{window.hlgbAfterLogin?.(()=>setTimeout(install,500),0)}catch(_){}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,500));
console.info('[HLGB] v'+V+' pagamento avulso facções com cadastro, busca, travetada e PDF');
})();