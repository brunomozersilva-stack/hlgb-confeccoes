const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-faction-send-model-grade.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-faction-send-model-grade.js'"));
const context={console,setTimeout(){return 0},db:{
 sizes:[{name:'P'},{name:'M'},{name:'G'},{name:'GG'}],
 products:[{id:'p1',name:'Camisola Romantic',factionCost:2},{id:'p2',name:'Calcinha Liz',factionCost:1}],
 orders:[{id:'o1',orderNumber:101,client:'Gisele',date:'2026-10-10',status:'Aguardando corte',grade:[
  {productId:'p1',color:'Preto',size:'P',qty:10},{productId:'p1',color:'Preto',size:'M',qty:20},
  {productId:'p2',color:'Rubi',size:'P',qty:5},{productId:'p2',color:'Rubi',size:'M',qty:15}
 ]}],
 cuts:[{id:'c1',orderId:'o1',productId:null,status:'Finalizado',op:'PED-o1'}],
 production:[],factions:[{id:'f1',orderId:'o1',productId:'p1',sent:5}],
 factionMasters:[{id:'fm1',name:'Facção A'}],productionLocations:[]
},window:{renderFactions(){}},document:{getElementById(){return null}},table:(h,r)=>JSON.stringify({h,r}),fmtDate:v=>v,displayOrderNumber:o=>o.orderNumber,hlgbSortedSizes:()=>['P','M','G','GG'],isoDate:()=> '2026-10-01',alert(){},hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbFactionSendModelGrade;assert(api);
const rows=api.modelCandidates();assert.equal(rows.length,2,'multi-model order must produce one faction-send row per model');
const cam=rows.find(x=>String(x.productId)==='p1'),cal=rows.find(x=>String(x.productId)==='p2');
assert.equal(cam.remaining,25,'already sent qty must be subtracted only from same model');
assert.equal(cal.remaining,20);
const html=api.gradeHTML(context.db.orders[0],'p1');
for(const label of ['Produto','Cor','P','M','G','GG','Total do modelo'])assert(html.includes(label),label+' missing from faction grade');
assert(!html.includes('Calcinha Liz'),'faction grade must show only selected model');
const form=api.form({orderId:'o1',productId:'p1',description:'Camisola Romantic',sent:25});
assert(form.includes('Camisola Romantic')&&form.includes('Grade enviada para a facção')&&!form.includes('Calcinha Liz'));
assert.equal(context.window.HLGB_FACTION_SEND_MODEL_GRADE_GUARD,'2026.10.01-faction-send-model-grade-v1');
console.log('PASS faction send: models split independently and grade matches cutter-sheet pattern.');