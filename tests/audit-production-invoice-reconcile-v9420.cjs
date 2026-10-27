const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-note-integrity.js','utf8');
assert(src.includes("const V='94.20'"),'versão 94.20 ausente');
assert(src.includes('productionInvoiceAnalysis9420'),'análise produção↔nota ausente');
assert(src.includes("stage:'Finalizado'"),'reconciliação não finaliza produção');
const db={orders:[{id:'o1',status:'Pedido finalizado',deliveryFinalized:true,projectionInvoiced:true,projectionItems:{p1:{invoiced:true,invoicedQty:5,invoiceIds:['n1']},p2:{invoiced:true,invoicedQty:4,invoiceIds:['n1']}}}],production:[{id:'prod1',orderId:'o1',productId:'p1',planned:5,done:0,stage:'Aguardando atribuição'},{id:'prod2',orderId:'o1',productId:'p2',planned:10,done:0,stage:'Em produção'}],noteQueue:[{id:'q1',orderId:'o1',productId:'p1',qty:5,remainingQty:0,status:'Faturado'},{id:'q2',orderId:'o1',productId:'p2',qty:10,remainingQty:6,status:'Parcial'}],projectionInvoices:[{id:'n1',items:[{orderId:'o1',productId:'p1',qty:5,sourceQueueId:'q1'},{orderId:'o1',productId:'p2',qty:4,sourceQueueId:'q2'}]}],finance:[]};
const saved=[];
const document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{},setAttribute(){},appendChild(){},querySelector(){return null}}),head:{appendChild(){}},documentElement:{}};
class MutationObserver{constructor(){}observe(){}}
const sandbox={db,console,document,MutationObserver,localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{},Blob:function(){},URL:{createObjectURL(){return''},revokeObjectURL(){}},structuredClone:global.structuredClone,setTimeout:()=>0,clearTimeout:()=>{},alert:()=>{},confirm:()=>true};
sandbox.window={db,document,addEventListener(){},hlgbRecordSaveWithRetry:async(module,id,row)=>{saved.push({module,id,row});const a=db[module]||[];const i=a.findIndex(x=>String(x.id)===String(id));if(i>=0)a[i]=structuredClone(row);return {applied:true,data:structuredClone(row)}}};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'release-note-integrity.js'});
const api=sandbox.window.hlgbProductionInvoiceReconcile9420;assert(api,'API 94.20 ausente');
const found=api.analyze();assert.strictEqual(found.length,1,'só produção 100% faturada deve reconciliar');assert.strictEqual(found[0].id,'prod1');
api.reconcile(true).then(r=>{assert.strictEqual(r.changed,1);assert.strictEqual(db.production[0].done,5);assert.strictEqual(db.production[0].stage,'Finalizado');assert.strictEqual(db.production[1].done,0,'parcial não pode ser baixada');const render=fs.readFileSync('release-production-render-fix-v9330.js','utf8');assert(render.includes('doneByQty'),'render deve ocultar produção concluída por quantidade');console.log('PASS produção faturada: baixa somente quando nota cobre 100% do planejado; parcial permanece aberta.');}).catch(e=>{console.error(e);process.exit(1)});
