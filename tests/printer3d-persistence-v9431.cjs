const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync('release-printer3d-persistence-v9431.js','utf8');
assert(!/setInterval\s*\(/.test(src),'v94.31 não deve criar polling permanente');
assert(!/MutationObserver/.test(src),'v94.31 não deve criar observer global');
assert(/printer3dProducts/.test(src)&&/printer3dSales/.test(src)&&/printer3dSettings/.test(src),'módulos 3D esperados ausentes');

function storage(seed={}){const m=new Map(Object.entries(seed));return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
function snap(data){return{data,deleted_at:null,revision:1,updated_at:data.updatedAt||'2026-10-29T10:00:00.000Z'}}
function build(pending=false,empty=false){
 const db={};
 const snapshots=empty?{
  printer3dProducts:new Map(),printer3dSales:new Map(),printer3dSettings:new Map()
 }:{
  printer3dProducts:new Map([
   ['p1',snap({id:'p1',name:'Boneco',updatedAt:'2026-10-25T01:29:55Z'})],
   ['p2',snap({id:'p2',name:'jogo da velha',updatedAt:'2026-10-27T15:54:56Z'})],
   ['p3',snap({id:'p3',name:'Abridor de lata fatia de bolo',updatedAt:'2026-10-27T16:52:58Z'})]
  ]),
  printer3dSales:new Map([['s1',snap({id:'s1',productId:'p1',productName:'Boneco',qty:1,total:10})]]),
  printer3dSettings:new Map([['settings-main',snap({id:'settings-main',machineHourRate:1.25})]])
 };
 if(pending)db.printer3dProducts=[{id:'local-pending',name:'Novo local',updatedAt:'2026-10-29T10:20:00Z'}];
 const pendingStore=pending?JSON.stringify({modules:{printer3dProducts:[{id:'local-pending',deleted:false,data:db.printer3dProducts[0]}]}}):null;
 const localStorage=storage(pendingStore?{hlgb_records_pending_v91:pendingStore}:{});
 const listeners={};
 const document={readyState:'complete',querySelector:()=>null,getElementById:()=>null,addEventListener:(n,f)=>{listeners[n]=f}};
 const context={console,Map,Set,Date,JSON,Math,Array,Object,String,Number,Boolean,Promise,structuredClone:global.structuredClone,db,hlgbRecordSnapshots:snapshots,localStorage,localSaveOnly:()=>{},document,navigator:{onLine:true},getComputedStyle:()=>({display:'none'}),setTimeout:()=>0,clearTimeout:()=>{},addEventListener:(n,f)=>{listeners['window:'+n]=f},window:null};
 context.window=context;
 vm.createContext(context);vm.runInContext(src,context,{filename:'release-printer3d-persistence-v9431.js'});
 return context;
}

{
 const c=build(false);
 assert.equal(c.db.printer3dProducts.length,3,'deve restaurar 3 produtos da nuvem');
 assert.equal(c.db.printer3dSales.length,1,'deve restaurar venda 3D');
 assert.equal(c.db.printer3dSettings.length,1,'deve restaurar configuração 3D');
 const st=c.hlgbPrinter3dPersistence9431.status();
 assert.equal(st.status,'pass');assert.equal(st.missingCount,0);assert.equal(st.allSnapshots,true);assert.equal(st.empty3d,false);
}
{
 const c=build(true);
 assert.equal(c.db.printer3dProducts.length,4,'deve preservar produto local ainda pendente junto dos 3 confirmados');
 assert(c.db.printer3dProducts.some(x=>x.id==='local-pending'),'pendência local foi perdida');
}
{
 const c=build(false,true);
 const st=c.hlgbPrinter3dPersistence9431.status();
 assert.equal(st.allSnapshots,true,'snapshots vazios ainda são snapshots carregados');
 assert.equal(st.empty3d,true,'sessão 3D vazia deve ser identificada');
 assert.equal(st.status,'warn','3D vazio não pode ser aprovado silenciosamente');
 const daily={business:{status:'pass',summary:{status:'pass',warn:0,fail:0,products3d:0,sales3d:0}}};
 c.hlgbPrinter3dPersistence9431.markDailyBusiness(daily,st);
 assert.equal(daily.business.status,'warn','relatório diário deve alertar para 3D vazio');
 assert.equal(daily.business.summary.printer3dEmpty,true,'relatório deve registrar motivo do alerta');
}
const loader=fs.readFileSync('release-cut-model-grade-adjust.js','utf8');
assert.equal((loader.match(/release-printer3d-persistence-v9431\.js/g)||[]).length,1,'loader deve carregar v94.31 exatamente uma vez');
console.log('OK: Printer 3D v94.31 restaura registros confirmados, preserva pendências e alerta para hidratação vazia.');