'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-note-receipts-v9576.js','utf8'),acerto=fs.readFileSync('release-acerto-returns-v9565.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
assert(loader.includes("'release-note-receipts-v9576.js'"));
new vm.Script(src);new vm.Script(acerto);
const copy=x=>JSON.parse(JSON.stringify(x));
const note={id:'n1',client:'Quesia',date:'2026-11-11',issueDate:'2026-11-11',dueDate:'2026-11-20',value:1000,paid:100,remaining:900,
 status:'Parcial',paymentHistory:[{id:1,value:100,date:'2026-11-11',method:'PIX'}],items:[{productId:'p',productName:'Modelo',qty:100,unitPrice:10,value:1000}]};
const db={projectionInvoices:[copy(note)],orders:[],finance:[],receipts:[]};
const remote=new Map();let fail=false,allowRead=true,saves=0;
remote.set('projectionInvoices:n1',copy(note));
const cloudRequest=async(path)=>{
 if(!allowRead)throw Error('Consulta remota falhou');
 if(path.includes('entity_id=eq.')){
  const module=decodeURIComponent(path.match(/module=eq\.([^&]+)/)?.[1]||'');
  const id=decodeURIComponent(path.match(/entity_id=eq\.([^&]+)/)?.[1]||'');
  const data=remote.get(module+':'+id);
  return data?[{module,entity_id:id,data:copy(data),deleted_at:null}]:[];
 }
 if(path.includes('module=eq.receipts'))return [...remote.entries()].filter(([k])=>k.startsWith('receipts:')).map(([k,v])=>({entity_id:k.slice(9),data:copy(v),deleted_at:null}));
 throw Error('Unexpected query '+path);
};
const w={db,__HLGB_AUTH_READY:true,__HLGB_TEST__:true,cloudRequest,addEventListener(){},renderNotes9214(){},renderOrderNotes(){},
 hlgbWalIdbGuard9536:{probe:async()=>true,ids:()=>[],status:()=>({readFailed:false})},
 hlgbRecordSaveWithRetry:async(m,id,data)=>{
  if(fail)return {applied:false,reason:'Nuvem recusou o registro'};
  saves++;remote.set(m+':'+id,copy(data));return {applied:true,data:copy(data)};
 }};
const context={window:w,Date,Math,JSON,Map,Set,Promise,Uint8Array,String,encodeURIComponent,decodeURIComponent,
 console,navigator:{onLine:true},document:{},btoa,atob,setTimeout(){},alert(){}};
vm.createContext(context);vm.runInContext(acerto,context);vm.runInContext(src,context);
const ac=w.hlgbAcertoReturns9565,pdf=w.hlgbNoteReceipts9576;
const pdfBytes=Uint8Array.from([37,80,68,70,45,49,46,52,10,37,65,66,67]);
const file={name:'pix_11.pdf',size:pdfBytes.length,arrayBuffer:async()=>pdfBytes.buffer};
(async()=>{
 assert.equal(ac.version,'95.65');
 assert.equal(pdf.version,'95.76');
 assert.equal(pdf.readFile!=null,true);
 const out=await ac.saveAction('projection','n1','return',{value:200,date:'2026-11-12',reason:'10 peças devolvidas'});
 assert(out.ok);assert.equal(db.projectionInvoices[0].remaining,700);assert.equal(ac.status().saveTrace.remoteReadback,true,'live finance note saved only with real readback');
 assert.equal(saves,1);assert.equal(remote.get('projectionInvoices:n1').acertoReturnsV9565.length,1);
 fail=true;
 await assert.rejects(()=>ac.saveAction('projection','n1','note',{text:'tentar não salvar'}),/recusou/);
 assert.equal(db.projectionInvoices[0].acertoNotesV9565?.length||0,0);
 fail=false;allowRead=false;
 await assert.rejects(()=>ac.saveAction('projection','n1','note',{text:'ACK mas leitura falhou'}),/não foi possível confirmar/);
 assert.equal(ac.status().saveTrace.phase,'unverified');
 allowRead=true;
 const stored=await pdf.save('n1',file,'1');
 assert.equal(stored.kind,'hlgb_note_payment_receipt');
 assert.equal(stored.paymentId,'1');
 assert.equal(remote.get('receipts:'+stored.id).file.name,'pix_11.pdf');
 assert.equal((await pdf.list('n1')).length,1);
 assert.equal(db.projectionInvoices[0].receiptPdfV9566,undefined,'PDF must not enlarge canonical note');
 await assert.rejects(()=>pdf.save('n1',{name:'fake.pdf',size:6,arrayBuffer:async()=>Uint8Array.from([1,2,3,4,5,6]).buffer},'1'),/PDF válido/);
 await assert.rejects(()=>pdf.save('n1',file,'no-receipt'),/não consta/);
 assert.equal(pdf.status().lastReadback.length>0,true);
 w.__HLGB_AUTH_READY=false;
 await assert.rejects(()=>pdf.save('n1',file,''),/Acesse o HLGB/);
 console.log('PASS v95.76: cloud proof of note save, unverified readback truth, PDF linked separately, validation/auth and no payment mutation');
})().catch(e=>{console.error(e);process.exitCode=1});
