'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('hlgb-modules/producao/cut-single-product-link-v9705.js','utf8');
assert(fs.readFileSync('app-stable3.html','utf8').includes("'hlgb-modules/producao/cut-single-product-link-v9705.js'"));
const CUT='1794488399889',ORDER='1794488399888',PRODUCT='1788193589429';
const clone=x=>JSON.parse(JSON.stringify(x));
async function scenario(mode){
 const grade=['Preto','Branco','Rubi'].flatMap((color,i)=>['P','M','G','GG'].map((size,j)=>({color,size,productId:Number(PRODUCT),qty:[[100,150,150,50],[80,120,120,40],[100,150,150,50]][i][j]})));
 let cut={entity_id:CUT,revision:1,deleted_at:null,data:{id:Number(CUT),orderId:Number(ORDER),productId:null,product:'grade registrada',pieces:1260,status:'Planejado',notes:'preservar'}};
 const order={entity_id:ORDER,revision:1,deleted_at:null,data:{id:Number(ORDER),orderNumber:48,grade,items:'grade registrada'}};
 const product={entity_id:PRODUCT,revision:11,deleted_at:null,data:{id:Number(PRODUCT),name:'Camisola Liliane'}};
 const before=clone(cut);let posts=0,confirmations=0,probes=0;
 if(mode==='wrong-grade')order.data.grade[0].productId=123;
 if(mode==='already')cut.data.productId=Number(PRODUCT);
 const w={__HLGB_AUTH_READY:true,hlgbWalIdbGuard9536:{supportsCustomTimeout:true,probe:async()=>{probes++},status:()=>({readFailed:mode==='wal-error',unsupported:mode==='unsupported',localReadFailed:mode==='local-error',probes:mode==='not-probed'?0:probes,entryCount:['pending','unidentified'].includes(mode)?1:0}),ids:()=>new Set(mode==='pending'?['cuts::'+CUT]:[])},hlgbRecordPendingIdentitySet9535:()=>new Set(),addEventListener(){},confirm(){confirmations++;if(mode==='changed')cut.revision=2;return mode!=='cancel'},cloudRequest:async(path,opts)=>{
  if(opts.method==='POST'){
   posts++;assert.equal(path,'rpc/hlgb_save_record');const b=JSON.parse(opts.body);
   assert.equal(b.p_expected_revision,1);assert.equal(b.p_entity_id,CUT);assert.equal(b.p_deleted,false);assert.deepEqual(b.p_data,{...before.data,productId:Number(PRODUCT)});
   if(mode==='conflict')return [{applied:false}];
   cut={...cut,revision:2,data:clone(b.p_data)};
   if(mode==='timeout')throw Error('timeout');
   return [{applied:true}];
  }
  assert.equal(opts.method,'GET');
  if(path.includes('module=eq.cuts'))return [clone(cut)];
  if(path.includes('module=eq.orders'))return [clone(order)];
  if(path.includes('module=eq.products'))return [clone(product)];
  if(path.includes('module=eq.production'))return mode==='production'?[{entity_id:'p'}]:[];
  throw Error('Unexpected query');
 }};
 const ctx={window:w,document:{getElementById:()=>null},localStorage:{getItem:key=>mode==='malformed'&&key==='hlgb_durable_wal_v1'?'{broken':mode==='local-pending'&&key==='hlgb_durable_wal_v1'?JSON.stringify({entries:{['cuts|'+CUT]:{module:'cuts',id:CUT}}}):null},console};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 let result,error;try{result=await w.hlgbCutSingleProductLink9705.execute()}catch(e){error=e}
 if(['ok','timeout'].includes(mode)){assert.equal(result.ok,true);assert.equal(posts,1);assert.equal(result.ack,mode==='ok');assert.equal(probes,2);assert.equal(cut.revision,2);assert.deepEqual(cut.data,{...before.data,productId:Number(PRODUCT)})}
 else if(mode==='already'){assert.equal(result.already,true);assert.equal(posts,0);assert.equal(confirmations,0)}
 else if(mode==='cancel'){assert.equal(result.canceled,true);assert.equal(posts,0)}
 else{assert(error,mode+' must block');assert.equal(posts,mode==='conflict'?1:0);assert.equal(cut.data.productId,null)}
 console.log('PASS cut link '+mode);
}
(async()=>{for(const m of ['ok','timeout','already','cancel','pending','wal-error','unsupported','local-error','not-probed','unidentified','malformed','local-pending','wrong-grade','changed','production','conflict'])await scenario(m)})().catch(e=>{console.error(e);process.exitCode=1});
