const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('release-production-writeoff-integrity-v9391.js','utf8');
const listeners={};
const host={innerHTML:''};
const document={
  getElementById:id=>id==='darBaixa9378Host'?host:null,
  querySelectorAll:()=>[],
};
const db={
  orders:[{id:'o1',grade:[{productId:'p1',qty:100}]}],
  products:[{id:'p1',name:'Lena'}],
  cuts:[{id:'c1',orderId:'o1',productId:'p1'}],
  production:[{id:'pr1',orderId:'o1',productId:'p1'}],
  operationalWriteoffs:[]
};
const model={id:'model-x',productId:'p1',productName:'Lena',clientName:'Cliente',qty:100,status:'Em produção',sourceRefs:[{type:'cut',id:'c1',productId:'p1'},{type:'production',id:'pr1',productId:'p1'}]};
const window={db,hlgbOperationalVisibility9385:{writeoffModels:()=>[model]},hlgbAfterLogin:fn=>{listeners.login=fn},console};
window.window=window;
const ctx={window,document,console,Map,Set,Array,Object,String,Number,Math,Date,JSON,Promise,Error,encodeURIComponent,unescape,btoa:s=>Buffer.from(s,'binary').toString('base64'),alert:()=>{},setTimeout,clearTimeout};
vm.createContext(ctx);vm.runInContext(code,ctx);
const api=window.hlgbWriteoffIntegrity9391;
if(!api||api.version!=='93.91')throw new Error('módulo não iniciou');
if(window.HLGB_OPERATIONAL_WRITEOFF_AUTHORITY!=='93.91')throw new Error('autoridade não registrada');
const pending=api.pendingModels();
if(pending.length!==1||pending[0].orderProductRefs.length!==1)throw new Error('pedido/modelo não foi consolidado');
const pair=pending[0].orderProductRefs[0];
const a=api.stableId(pair),b=api.stableId({...pair});
if(a!==b||!a.startsWith('baixa-op-v1-'))throw new Error('id não é determinístico');
db.operationalWriteoffs.push({id:a,sourceType:'model',orderProductRefs:[pair],productId:'p1',quantity:100});
if(api.pendingModels().length!==0)throw new Error('baixa confirmada voltou para pendências');
if(api.diagnostics().duplicatePairs!==0)throw new Error('duplicidade falsa');
db.operationalWriteoffs.push({id:'legado',sourceType:'model',orderProductRefs:[pair],productId:'p1',quantity:100});
if(api.diagnostics().duplicatePairs!==1)throw new Error('duplicidade antiga não detectada');
console.log('WRITEOFF_INTEGRITY_V9391_OK',api.diagnostics());
