const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-cut-organization.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-cut-organization.js'"));
const context={console,setTimeout(){return 0},db:{cuts:[],orders:[],cutters:[]},window:{renderCuts(){}},document:{getElementById(){return null}},localStorage:{getItem(){return null},setItem(){}}};
vm.createContext(context);vm.runInContext(src,context);
assert(context.window.hlgbCutOrganization,'cut organization API must load');
assert.equal(typeof context.window.hlgbCutOrganization.apply,'function');
assert.equal(context.window.HLGB_CUT_ORGANIZATION_GUARD,'2026.10.01-cut-organization-v1');
console.log('PASS Cut organization: filter/compact module loads and is guarded.');
// The active model-card view must be searchable, not just the old table.
const api=context.window.hlgbCutOrganization;
const cut={id:'cut-48',orderId:48,productId:11,cutterId:7,product:'Camisola',status:'Planejado',plannedCutDate:'2026-11-25'};
context.db.cuts=[cut,{id:'cut-49',orderId:49,productId:12,status:'Planejado'}];
context.db.orders=[{id:48,orderNumber:48,client:'João',priority:'Urgente'},{id:49,orderNumber:49,client:'Maria'}];
context.db.products=[{id:11,name:'Camisola Liliane',sku:'LIL-01',materials:[{materialId:5}]},{id:12,name:'Robe Gabrielle'}];
context.db.materials=[{id:5,name:'Tule Bordado'}];context.db.cutters=[{id:7,name:'José'}];
const idx=api.cutIndex9709(),meta=api.cutMeta9709(cut,idx);
for(const q of ['pedido 48','joao liliane','lil-01','tule bordado','jose','cut-48'])assert(api.matchesCut9709(meta,{q}),q);
assert(!api.matchesCut9709(meta,{q:'pedido 49'}));
assert(api.matchesCut9709(meta,{q:'liliane',priority:'Urgente',cutter:'7',date:'2026-11-25'}));
assert(!api.matchesCut9709(meta,{q:'liliane',date:'2026-11-24'}));
const row=(id,legacy=false)=>({dataset:legacy?{}:{hlgbCutModelId:id},style:{display:''},children:[],querySelector(){return null},querySelectorAll(){return legacy?[{getAttribute:()=> "editCut('"+id+"')"}]:[]}});
const model=row('cut-48'),other=row('cut-49'),aggregate=row('cut-48',true);aggregate.dataset.hlgbSplitAggregateHidden='1';aggregate.style.display='none';
const group1={dataset:{},style:{display:''},querySelectorAll:()=>[model]},group2={dataset:{},style:{display:''},querySelectorAll:()=>[other]};
const root={closest:()=>({}),querySelectorAll:()=>[aggregate]},split={querySelectorAll:s=>s==='[data-hlgb-cut-model-id]'?[model,other]:[group1,group2]};
const query={value:'Pedido #48'},count={textContent:''},toolbar={nextElementSibling:split};
const dom={cutTable:root,hlgbCutSplitPanel:split,hlgbCutFilters:toolbar,hlgbCutSearch:query,hlgbCutFilterCount:count};
context.document.getElementById=id=>dom[id]||null;
const before=JSON.stringify(context.db);
api.apply();assert.equal(model.style.display,'');assert.equal(other.style.display,'none');assert.equal(group2.style.display,'none');assert.equal(aggregate.style.display,'none');assert.match(count.textContent,/1 de 2/);
query.value='';api.apply();assert.equal(other.style.display,'');assert.equal(group2.style.display,'');assert.equal(aggregate.style.display,'none');assert.match(count.textContent,/2 de 2/);
assert.equal(JSON.stringify(context.db),before);
console.log('PASS model and legacy filter, normalized search and aggregate protection');

// Exact catalogue estimate; no fabricated value for missing product or price.
context.db.products[0].price=12.5;cut.pieces=100;
const priced=api.cutMeta9709(cut,api.cutIndex9709());
assert.equal(priced.valueCents,125000);assert.equal(priced.pieces,100);
assert(api.matchesCut9709(priced,{client:'JOAO',from:'2026-11-01',to:'2026-11-30',min:120000,max:130000}));
assert(!api.matchesCut9709(priced,{client:'Maria'}));
assert(!api.matchesCut9709(priced,{from:'2026-11-26'}));
assert(!api.matchesCut9709(priced,{min:125001}));
const unknown=api.cutMeta9709(context.db.cuts[1],api.cutIndex9709());
assert.equal(unknown.valueCents,null);assert(!api.matchesCut9709(unknown,{min:0}));
assert(api.compareCut9712({meta:priced},{meta:unknown},'value')<0);
assert(api.compareCut9712({meta:priced},{meta:unknown},'client')<0);
const identify=(...actions)=>api.cutIdentity9709({dataset:{},querySelectorAll:()=>actions.map(a=>({getAttribute:()=>a}))});
assert.equal(identify("hlgbEditCut9189('cut-48')","finishCut('cut-48')"),'cut-48');
assert.equal(identify("editCut('cut-48')","finishCut('cut-49')"),'','conflicting row IDs must not open an editor');
assert.equal(identify("viewCutGradeComparison(48)"),'48');
console.log('PASS combined client/date/value filters and unknown-value protection');

const grade=[{productId:10,color:'Preto',size:'P',qty:30},{productId:11,color:'Preto',size:'M',qty:40}];
const order={id:99,status:'Pedido finalizado',grade,total:1000};const inv={id:'N1',items:[{orderId:99,productId:10,qty:30}]};const beforeProof=JSON.stringify([order,inv]);const check=(invs,pairs=[])=>api.merchandiseEvidence9755([order],invs,vm.runInContext('new Set('+JSON.stringify(pairs)+')',context)).get('99');
assert.equal(check([]).hide,false);assert.equal(check([inv]).reason,'partial');assert.equal(check([inv],['99|11']).hide,true);assert.equal(check([],['99|10','99|11']).hide,true);assert.equal(check([],['99|*']).hide,false);assert.equal(check([inv,{...inv}]).hide,false);assert.equal(check([{...inv,status:'Cancelada'}],['99|11']).hide,false);assert.equal(check([{...inv,manualNote:true}],['99|11']).hide,false);assert.equal(check([{...inv,items:[{orderId:99,productId:10,qty:31}]}],['99|11']).reason,'review');assert.equal(check([{...inv,items:[{orderId:98,productId:10,qty:30}]}],['99|11']).hide,false);assert.equal(JSON.stringify([order,inv]),beforeProof);
console.log('PASS open merchandise evidence');

// Work list excludes finalized model cards as well as legacy rows; filters never hide legitimate active cards.
const completed={id:'done-1',orderId:48,productId:11,cutterId:7,status:'Finalizado',pieces:100,finishedAt:'2026-11-25',actualCutGrade:[{productId:11,color:'Preto',size:'P',qty:100}]};
context.db.cuts.push(completed);
const done=row('done-1'),group3={dataset:{},style:{display:''},querySelectorAll:()=>[done]};
split.querySelectorAll=s=>s==='[data-hlgb-cut-model-id]'?[model,other,done]:[group1,group2,group3];
api.apply();assert.equal(done.style.display,'none');assert.equal(group3.style.display,'none');assert.match(count.textContent,/2 de 2/);
const history=api.completedCutHistory(context.db.cuts,api.cutIndex9709());assert.equal(history.rows.length,1);assert.equal(history.rows[0].id,'done-1');assert.equal(api.cutWorkVisible9799(history.rows[0].meta,{},false),false);
const more={rows:Array.from({length:53},(_,i)=>({...history.rows[0],id:'history-'+i})),review:[]};
const page=api.historyPage9799(more,{},false,25);assert.equal(page.rows.length,53);assert.equal(page.pageOffset,25);assert.equal(page.signature,api.historyPage9799(more,{},false,25).signature);
assert.equal(api.historyPage9799({rows:more.rows.slice(0,26),review:[]},{},false,50).pageOffset,25);
assert.notEqual(page.signature,api.historyPage9799(more,{q:'camisola'},false,25).signature);
const changed={...more,rows:more.rows.map((r,i)=>i===25?{...r,meta:{...r.meta,pieces:99}}:r)};assert.notEqual(page.signature,api.historyPage9799(changed,{},false,25).signature);
assert.equal(api.historyPage9799(more,{},true,25).rows.length,0);assert.equal(api.historyPage9799(more,{},true,25).pageOffset,0);
console.log('PASS unified work excludes completed models; historical pagination and stable evidence signature');

// Deleted copies cannot make a live cut or its catalogue identity ambiguous.
context.db.cuts.push({...completed,deleted:true});context.db.products.push({...context.db.products[0],deleted:true});
assert.equal(api.cutIndex9709().cuts.get('done-1').id,'done-1');assert.equal(api.cutIndex9709().products.get('11').name,'Camisola Liliane');
const wrong={...completed,id:'wrong-model',actualCutGrade:[{productId:12,color:'Preto',size:'P',qty:100}]};
const badGrade=api.completedCutHistory([wrong],api.cutIndex9709()).rows[0];assert.equal(badGrade.grade.length,0);assert(badGrade.reasons.includes('Grade realizada a conferir'));
const empty={...completed,id:'zero',pieces:0,actualCutGrade:[{productId:11,color:'Preto',size:'P',qty:0}]};assert.equal(api.completedCutHistory([empty],api.cutIndex9709()).rows[0].grade.length,0);
console.log('PASS live identity and exact model in history');

context.db.orders[0].grade=[{productId:11,color:'Preto',size:'P',qty:100}];
const proof=api.cutActionProof9820(cut,api.cutIndex9709());assert.equal(proof.pieces,100);assert.equal(proof.productId,'11');assert.equal(proof.grade[0].color,'Preto');assert.equal(proof.materials.length,1);assert.equal(proof.canWrite,false);
assert.equal(api.cutActionProof9820({...cut},api.cutIndex9709()),null);
console.log('PASS required cut actions exact identity and complete grade');

// Complete separation checklist keeps the actual adjusted grade and materials by color.
context.db.cuts[0].actualCutGrade=[{productId:11,color:'Preto',size:'P',qty:40},{productId:11,color:'Rubi',size:'M',qty:60}];
const colored=api.cutActionProof9820(context.db.cuts[0],api.cutIndex9709());assert.equal(colored.gradeSource,'realizada');assert.equal(colored.pieces,100);assert.equal(colored.materials[0].byColor.length,2);assert.equal(colored.materials[0].byColor[0].pieces,40);assert.equal(colored.materials[0].byColor[1].pieces,60);
