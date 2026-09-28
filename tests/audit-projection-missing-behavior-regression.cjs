const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('app9240.html','utf8');
const start=html.indexOf('window.openProjectionMissing941=function');
const source=html.slice(start,html.indexOf('const oldFinalize941=',start));
assert(start>0);assert(html.includes("b.onclick=()=>window.openProjectionMissing941()"));
async function scenario(mode){
 const o={id:100,client:'TESTE',clientId:20},item={key:'30',productId:30,name:'TESTE PEÇA',qty:4,value:40,remainingQty:1,invoicedQty:3};
 const db={missingPieces:[],projectionInvoices:[{id:50,value:30}],finance:[{id:51,value:30}]};
 const fields={projectionMissingQty941:{value:'1'},projectionMissingNote941:{value:'TESTE'}};
 let submit,closes=0,calls=0,alerts=[],saved,fail=mode==='retry',release;
 const gate=mode==='double'?new Promise(r=>release=r):null;
 const ctx={window:{},db,selectedContexts941:()=>[{o,item}],ord941:()=>mode==='deleted'?null:o,items941:()=>[item],q941:v=>Math.max(0,+v||0),id941:()=>1790500000000,esc:String,displayOrderNumber:()=>100,openModal:(_t,_b,cb)=>submit=cb,document:{getElementById:id=>fields[id],querySelector:()=>({disabled:false})},alert:m=>alerts.push(m),cloudAccessToken:'test',hlgbRecordSaveWithRetry(){},isoDate:()=> '2026-09-27',localSaveOnly(){},closeModal:()=>closes++,renderMissingPieces(){},renderProjection(){},save941:async(module,row)=>{assert.equal(module,'missingPieces');calls++;saved=structuredClone(row);if(gate)await gate;if(fail){fail=false;throw Error('network')}return row}};
 if(mode==='existing')db.missingPieces.push({id:9,orderId:100,productId:30,remainingQty:1});
 vm.createContext(ctx);vm.runInContext(source,ctx);ctx.window.openProjectionMissing941();
 if(mode==='existing'||mode==='deleted'){assert(!submit);assert.equal(calls,0);return}
 if(mode==='excess')fields.projectionMissingQty941.value='2';
 if(mode==='fraction')fields.projectionMissingQty941.value='0.5';
 if(mode==='changed'){item.remainingQty=0;item.invoicedQty=4}
 const p=submit();if(mode==='double'){await submit();assert.equal(calls,1);release()}await p;
 if(['excess','fraction','changed'].includes(mode)){assert.equal(calls,0);assert.equal(closes,0);return}
 if(mode==='retry'){assert.equal(closes,0);assert.equal(db.missingPieces.length,0);const id=saved.id;await submit();assert.equal(saved.id,id)}
 assert.equal(db.missingPieces.length,1);assert.equal(closes,1);
 assert.equal(saved.originalQty,1);assert.equal(saved.remainingQty,1);assert.equal(saved.orderId,100);assert.equal(saved.productId,30);assert.equal(saved.sourceType,'Projeção / falta');assert(Number.isSafeInteger(saved.id));
 await submit();assert.equal(closes,1);assert.equal(db.projectionInvoices.length,1);assert.equal(db.finance.length,1);
}
(async()=>{for(const mode of ['normal','double','retry','excess','fraction','changed','existing','deleted'])await scenario(mode);console.log('PASS projection missing: existing 3/4 invoice, only missing1, numeric stable retry ID, no duplicate click, conflicts and failures blocked');})().catch(e=>{console.error(e);process.exitCode=1});
