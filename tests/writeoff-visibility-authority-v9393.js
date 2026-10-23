const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('release-production-operations-v9386-finalize.js','utf8');
const cutSnapshots=[];
const canonicalHandler=()=>{};
const shell={};
const document={getElementById:id=>id==='appShell'?shell:null,querySelectorAll:()=>[]};
const window={
  db:{
    products:[
      {id:'babyP',name:'Baby Doll Bicolor'},{id:'nakaP',name:'Tanga Nakamura'},
      {id:'doneP',name:'Modelo baixado'},{id:'openP',name:'Modelo em aberto'}
    ],
    clients:[],production:[],factions:[],finance:[],
    orders:[
      {id:'babyO',grade:[{productId:'babyP',qty:180}]},
      {id:'nakaO',grade:[{productId:'nakaP',qty:420}]},
      {id:'mixedO',grade:[{productId:'doneP',qty:10},{productId:'openP',qty:20}]}
    ],
    cuts:[
      {id:'babyC1',orderId:'babyO',productId:'babyP',productName:'Baby Doll Bicolor'},
      {id:'babyGeneric',orderId:'babyO',productName:'Baby Doll Bicolor geral'},
      {id:'nakaC1',orderId:'nakaO',productId:'nakaP',productName:'Tanga Nakamura'},
      {id:'mixedDone',orderId:'mixedO',productId:'doneP',productName:'Modelo baixado'},
      {id:'mixedOpen',orderId:'mixedO',productId:'openP',productName:'Modelo em aberto'},
      {id:'mixedGeneric',orderId:'mixedO',productName:'Corte misto ainda ativo'}
    ],
    operationalWriteoffs:[
      {id:'w-baby',quantity:180,orderProductRefs:[{orderId:'babyO',productId:'babyP'}]},
      {id:'w-naka',quantity:1390,orderProductRefs:[{orderId:'nakaO',productId:'nakaP'}]},
      {id:'w-done',quantity:999,orderProductRefs:[{orderId:'mixedO',productId:'doneP'}]}
    ]
  },
  __HLGB_AUTH_READY:true,
  HLGB_OPERATIONAL_WRITEOFF_AUTHORITY:'93.91',
  hlgbWriteoffIntegrity9391:{pairIndex:()=>new Set(['babyO|babyP','nakaO|nakaP','mixedO|doneP'])},
  hlgbWriteoffSelected9385:canonicalHandler,hlgbWriteoffSelected9384:canonicalHandler,hlgbWriteoffSelected9378:canonicalHandler,
  renderProjection:()=>{},renderProduction:()=>{},renderProductionHub:()=>{},renderOrderNotes:()=>{},renderFactions:()=>{},
  renderCuts:()=>cutSnapshots.push(window.db.cuts.map(x=>x.id)),
  hlgbAfterLogin:()=>{}
};
window.window=window;window.document=document;
const sandbox={window,document,console,alert:()=>{},getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),setTimeout,Date,Math,Map,Set,Array,Number,String,Object,JSON};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const api=window.hlgbOperationalVisibility9386;
if(!api)throw new Error('API de visibilidade 9386 ausente');
if(!api.canonicalWriteoffActive())throw new Error('autoridade 93.91 não reconhecida');
if(window.hlgbWriteoffSelected9385!==canonicalHandler||window.hlgbWriteoffSelected9384!==canonicalHandler||window.hlgbWriteoffSelected9378!==canonicalHandler)throw new Error('9386 reassumiu o botão de baixa da autoridade 93.91');
if(!api.cutHidden(window.db.cuts.find(x=>x.id==='babyC1')))throw new Error('Baby Doll Bicolor continuou visível');
if(!api.cutHidden(window.db.cuts.find(x=>x.id==='babyGeneric')))throw new Error('corte genérico de pedido totalmente baixado continuou visível');
if(!api.cutHidden(window.db.cuts.find(x=>x.id==='nakaC1')))throw new Error('Tanga Nakamura continuou visível apesar do par pedido+modelo baixado');
if(!api.cutHidden(window.db.cuts.find(x=>x.id==='mixedDone')))throw new Error('modelo baixado de pedido misto continuou visível');
if(api.cutHidden(window.db.cuts.find(x=>x.id==='mixedOpen')))throw new Error('modelo ainda aberto foi ocultado');
if(api.cutHidden(window.db.cuts.find(x=>x.id==='mixedGeneric')))throw new Error('corte genérico de pedido parcialmente aberto foi ocultado');
const first=cutSnapshots[0]||[];
const expected=['mixedOpen','mixedGeneric'];
if(JSON.stringify(first)!==JSON.stringify(expected))throw new Error('renderCuts recebeu lista incorreta '+JSON.stringify(first));
if(window.db.cuts.length!==6)throw new Error('filtro de tela alterou permanentemente db.cuts');
const diag=api.diagnostics();
if(diag.hiddenCuts!==4||diag.canonicalWriteoffProtected!==true)throw new Error('diagnóstico incorreto '+JSON.stringify(diag));
console.log('WRITEOFF_VISIBILITY_AUTHORITY_V9393_OK',JSON.stringify({rendered:first,hiddenCuts:diag.hiddenCuts,nakamuraLegacyQuantity:1390,nakamuraOrderQuantity:420}));
