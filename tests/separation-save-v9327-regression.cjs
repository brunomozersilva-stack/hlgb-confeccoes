const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync(path.join(__dirname,'..','release-separation-commit-v9319.js'),'utf8');
const els=new Map();
function el(id,extra={}){const x={id,value:'',textContent:'',disabled:false,dataset:{},style:{display:'block'},...extra};els.set(id,x);return x}
el('appShell',{style:{display:'block'}});
el('loginScreen',{style:{display:'none'}});
el('separationOrder',{value:'62'});
el('sepQty938_1788439021909',{value:'100'});
el('sepBtn938_1788439021909',{textContent:'Baixar parcial'});

const db={
 orders:[{id:'62',status:'Separação / Compra de Material',grade:[{productId:'1788439021909',qty:330}]}],
 separations:[{id:'sep62',orderId:'62',done:false,partial:true,modelProgress:{},history:[]}]
};
const local={};
const ctx={
 window:null,db,
 document:{getElementById:id=>els.get(id)||null,querySelector:()=>null},
 navigator:{onLine:true},localStorage:{getItem:k=>local[k]||null,setItem:(k,v)=>local[k]=v,removeItem:k=>delete local[k]},
 structuredClone:global.structuredClone,setTimeout,clearTimeout,setInterval:()=>0,clearInterval,console,Date,Promise,alert:()=>{},
 getComputedStyle:e=>e.style||{display:'block'},cloudUser:{email:'teste@local'},localSaveOnly:()=>{},setCloudStatus:()=>{},
 cloudEnsureFreshSession:async()=>true,hlgbRecordId:(m,row)=>String(row.id),fillSeparationOrders:()=>{},renderSeparationList:()=>{},renderSeparation:()=>{},syncOrdersToCuts:()=>{}
};
ctx.window=ctx;
let calls=[];
ctx.hlgbRecordSaveWithRetry=async(m,id,data)=>{calls.push({m,id,data:structuredClone(data)});return {applied:true,data:structuredClone(data)}};
vm.runInNewContext(source,ctx,{filename:'release-separation-commit-v9319.js'});

(async()=>{
 const partial=await ctx.applySeparationProgress938('62','1788439021909',false);
 assert.equal(partial.applied,true);
 assert.equal(partial.qty,100);
 assert.equal(db.separations[0].modelProgress['1788439021909'].qty,100);
 assert.equal(calls.length,1);
 assert.equal(calls[0].m,'separations');

 // Simula WAL já existente. A nova tentativa deve confirmar o mesmo payload,
 // sem adicionar novamente as 50 peças digitadas após a falha anterior.
 local.hlgb_durable_wal_v1=JSON.stringify({entries:{x:{module:'separations',id:'sep62',data:structuredClone(db.separations[0])}}});
 els.get('sepQty938_1788439021909').value='50';
 calls=[];
 const retry=await ctx.applySeparationProgress938('62','1788439021909',false);
 assert.equal(retry.recovered,true);
 assert.equal(db.separations[0].modelProgress['1788439021909'].qty,100);
 assert.equal(db.separations[0].history.length,1);
 assert.equal(calls.length,1);
 assert.equal(calls[0].m,'separations');

 delete local.hlgb_durable_wal_v1;
 calls=[];
 const complete=await ctx.markSeparation('62');
 assert.equal(complete.complete,true);
 assert.equal(db.separations[0].modelProgress['1788439021909'].qty,330);
 assert.deepEqual(calls.map(x=>x.m),['separations','orders']);
 console.log('PASS separation v93.27: partial, retry without duplication, completion');
})().catch(err=>{console.error(err);process.exit(1)});
