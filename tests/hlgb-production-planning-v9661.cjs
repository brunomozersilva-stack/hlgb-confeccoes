const assert=require('node:assert/strict'),crypto=require('node:crypto'),plan=require('../hlgb-modules/producao/production-planning-v9661.js'),dossier=require('../hlgb-modules/producao/cut-dossier-export-v9661.js'),checklist=require('../hlgb-modules/producao/cut-separation-core-v9647.js').checklist;(function planChecks(api,ok){
 const db={orders:[{id:1,orderNumber:7,status:'Aguardando corte',grade:[{productId:10,color:'Rubi',size:'P',qty:30},{productId:11,color:'Rubi',size:'P',qty:40}]},{id:2,status:'Nota emitida',grade:[{productId:10,color:'Rubi',size:'P',qty:900}]}],products:[{id:10,name:'Camisola',materials:[{materialId:1,name:'Malha',qty:10,calcMode:'yield',unit:'kg'}]},{id:11,name:'Calcinha',materials:[{materialId:1,name:'Malha',qty:.2,unit:'kg'}]},{id:12,name:'Outro',materials:[{materialId:2}]}],materials:[{id:1,name:'Malha',cat:'Malha',unit:'kg'}],cuts:[],production:[],operationalWriteoffs:[]},a={pairIndex:()=>new Set()},before=JSON.stringify(db);
 const v=api.discover(db,a,true);ok(v.groups.length===1,'group');ok(v.groups[0].orderedPieces===70,'exclude invoice');ok(v.groups[0].models.length===2,'two models');const x=api.combine(v.groups[0],v.groups[0].models.map(m=>m.key));ok(x.combinedGrade[0].qty===70&&x.isCombined,'grade');ok(x.verifiedAvailable===null&&x.savings===null&&!x.canWrite,'no invented proof');ok(api.discover(db,a,false).state==='forbidden','permission');ok(api.discover(db,{pairIndex:()=>new Set(['1|10'])},true).groups.length===0,'written off');ok(api.discover({...db,cuts:[{id:1,orderId:1,productId:10}]},a,true).groups.length===0,'existing cut');ok(api.discover({...db,orders:[...db.orders,db.orders[0]]},a,true).groups.length===0,'duplicate order');
 let rejected=false;try{api.combine(v.groups[0],['unknown'])}catch(_){rejected=true}ok(rejected,'unknown selection');ok(api.candidates(db.products,10,'calc',0,db.materials).total===1,'shared material');ok(api.candidates(db.products,10,'outro',0,db.materials).total===0,'different material');ok(api.preview(10,{state:'yes',eligible:[{productId:11,materialId:1}]},db.products,db.materials).physicalFit===null,'physical fit unproven');ok(api.weights([{id:1,productId:10,cutWeightV9579:{totalKg:20,usedKg:15,wasteKg:2}}],10)[0].unclassifiedKg===3,'weight residual');ok(api.weights([{id:1,productId:10,cutWeightV9579:{totalKg:20,usedKg:15,wasteKg:2}}],10)[0].reusableKg===null,'not reusable proven');ok(api.candidates(db.products,10,'calc',0,[{id:1,cat:'Aviamento'}]).total===0,'exclude accessory');ok(api.candidates(db.products,10,'calc',0,[...db.materials,...db.materials]).total===0,'ambiguous material');let wrong=false;try{api.preview(10,{state:'yes',eligible:[{productId:11,materialId:1}]},db.products,[{id:1,cat:'Aviamento'}])}catch(_){wrong=true}ok(wrong,'reject nonfabric policy');ok(JSON.stringify(db)===before,'immutable');

 const modelKeys=v.groups[0].models.map(m=>({key:m.key,signature:api.modelSignature(m)})),dupe={...v,groups:[...v.groups,{...v.groups[0],materialId:'2'}]};
 const overview=api.workspaceOverview9714(dupe,true);ok(overview.state==='local-observation'&&overview.materials===2&&overview.pairs===2&&overview.orders===1&&overview.products===2&&overview.pieces===70,'overview deduplicates across fabrics');
 ok(overview.groups.every(g=>g.sharedColors.join(',')==='Rubi'&&g.pieces===70),'common grade color, not physical fabric');
 ok(api.workspaceOverview9714(dupe,false).state==='forbidden','overview permissions');
 const first=v.groups[0].models[0],conflict={...dupe,groups:[v.groups[0],{...dupe.groups[1],models:[{...first,productName:'Alterado'},v.groups[0].models[1]]}]};
 const partialOverview=api.workspaceOverview9714(conflict,true);ok(partialOverview.state==='partial'&&partialOverview.ambiguous===1&&partialOverview.pieces===40,'conflicting pair excluded from unique totals');
 ok(api.workspaceOverview9714({...v,groups:[v.groups[0],v.groups[0]]},true).state==='unavailable','duplicate group');
  const basket=api.planSelection(dupe,modelKeys);ok(basket.state==='local-preview'&&basket.orderedPieces===70&&basket.rows.length===2,'unique selection across material groups');
 ok(basket.byProduct.length===2&&basket.byProduct[0].pieces+basket.byProduct[1].pieces===70,'purchase selection aggregated by model');
 ok(api.planSelection(v,[...modelKeys,modelKeys[0]]).state==='invalid-selection','duplicate pair rejected');
 ok(api.planSelection(v,[{...modelKeys[0],signature:'stale'}]).state==='stale','changed grade or model blocked');
 const ambiguous={...v,groups:[...v.groups,{...v.groups[0],models:[{...v.groups[0].models[0],productName:'Changed'}]}]};ok(api.planSelection(ambiguous,[modelKeys[0]]).state==='stale','ambiguous group blocked');
 const demand=api.materialDemand(basket,db,true);ok(demand.state==='local-estimate'&&demand.rows.length===1&&demand.rows[0].needed===11,'yield and consumption consolidated');ok(demand.models.length===2&&demand.models.every(x=>x.materials.length===1),'per model material');
 ok(!demand.canWrite&&!demand.stockVerified&&!demand.partial,'no stock proof');
 ok(api.materialDemand(basket,db,false).state==='forbidden','material permissions');
 const missing=api.materialDemand(basket,{...db,materials:[]},true);ok(missing.partial&&missing.rows.length===0,'missing canonical catalog no invented material');
 const mismatch={...db,products:[{...db.products[0],materials:[{...db.products[0].materials[0],unit:'m'}]},...db.products.slice(1)]};ok(api.materialDemand(basket,mismatch,true).partial&&api.materialDemand(basket,mismatch,true).rows[0].needed===8,'incompatible unit excluded');
 const repeat={...db,products:[{...db.products[0],materials:[...db.products[0].materials,...db.products[0].materials]},...db.products.slice(1)]};ok(api.materialDemand(basket,repeat,true).partial&&api.materialDemand(basket,repeat,true).rows[0].needed===8,'ambiguous BOM duplicate excluded');
 const colors={...db,products:db.products.map((p,i)=>({...p,materials:p.materials.map(m=>({...m,color:i===0?'Preto':'Rubi'}))}))};ok(api.materialDemand(basket,colors,true).rows.length===2,'BOM colors not pooled');
 const matches=api.gradeMatches9726(v.groups[0],true);ok(matches.state==='local-observation'&&matches.matches.length===1&&matches.matches[0].colorPieces===70&&matches.matches[0].commonFactor===10&&matches.matches[0].ratio[0].perBlock===1,'same colour and proportional grade');ok(!matches.geometryVerified&&!matches.canWrite,'no geometric claim');
 const multiSize={...v.groups[0],models:v.groups[0].models.map((m,i)=>({...m,pieces:i?120:60,grade:[{color:'Rubi',size:'P',qty:i?40:20},{color:'Rubi',size:'M',qty:i?80:40}]}))};
 const multiMatch=api.gradeMatches9726(multiSize,true);ok(multiMatch.matches.length===1&&multiMatch.matches[0].colorPieces===180&&multiMatch.matches[0].ratio.find(r=>r.size==='M').perBlock===2,'proportional grade across sizes');
 const mismatchGrade={...multiSize,models:multiSize.models.map((m,i)=>i?{...m,grade:[{color:'Rubi',size:'P',qty:60},{color:'Rubi',size:'M',qty:60}]}:m)};ok(api.gradeMatches9726(mismatchGrade,true).matches.length===0,'different size proportions not equal');
 const diffColor={...multiSize,models:multiSize.models.map((m,i)=>i?{...m,grade:m.grade.map(r=>({...r,color:'Preto'}))}:m)};ok(api.gradeMatches9726(diffColor,true).matches.length===0,'different colours not merged');
 ok(api.gradeMatches9726({...multiSize,models:[...multiSize.models,multiSize.models[0]]},true).state==='unavailable','duplicate model blocks');ok(api.gradeMatches9726(multiSize,false).state==='forbidden','permission');
 const suggestions=api.gradeSuggestions(v.groups[0]);ok(suggestions.length===1&&suggestions[0].layers===10&&suggestions[0].base.map(x=>x.perLayer).join(',')==='3,4','common exact grade per layer');ok(suggestions[0].base.every(x=>x.perLayer*suggestions[0].layers===x.qty)&&!suggestions[0].geometryVerified&&!suggestions[0].canWrite,'no overcut and no geometry claim');
 const limited=api.gradeSuggestions(v.groups[0],6)[0];ok(limited.layers===5&&limited.base.every(x=>x.perLayer*limited.layers===x.qty),'divisor respects explicit limit');ok(limited.alternative.layers===6&&limited.alternative.rows.every(x=>x.planned+x.remainder===x.qty),'alternative with remainder');
 const mixed={...v.groups[0],models:v.groups[0].models.map((m,i)=>({...m,grade:m.grade.map(g=>({...g,color:i?'Preto':'Rubi'}))}))};ok(api.gradeSuggestions(mixed).length===2&&api.gradeSuggestions(mixed).every(x=>x.modelCount===1),'colors kept separate');ok(api.gradeSuggestions(v.groups[0],0).length===0,'bad limit');ok(api.catalogGroups(db,true).length===1&&api.catalogGroups(db,true)[0].products.length===2,'catalog by material');ok(api.catalogGroups(db,false).length===0,'catalog permissions');
 const irregular={...v.groups[0],models:v.groups[0].models.map((m,i)=>({...m,grade:[{color:'Rubi',size:'P',qty:i?37:23},{color:'Rubi',size:'M',qty:i?19:41}]}))};
 const verifyPlans=(group,cap)=>{const snap=JSON.stringify(group),suggestion=api.gradeSuggestions(group,cap)[0],expected=new Map(group.models.flatMap(m=>m.grade.map(g=>[JSON.stringify([m.key,g.size]),g.qty])));for(const p of suggestion.multiSpreads){const actual=new Map();ok(p.spreads.length>=2&&p.spreads.length<=8&&p.remaining===0&&!p.geometryVerified&&!p.canWrite,'bounded arithmetic only');for(const s of p.spreads){ok(s.layers>=1&&(cap===null||s.layers<=cap)&&s.rows.length>0,'spread cap');for(const r of s.rows){const k=JSON.stringify([r.key,r.size]);ok(r.perLayer>0&&r.planned===r.perLayer*s.layers&&expected.has(k),'row identity and math');actual.set(k,(actual.get(k)||0)+r.planned)}}ok(actual.size===expected.size&&[...expected].every(([k,q])=>actual.get(k)===q)&&p.total===suggestion.total,'exact no excess across spreads')}ok(JSON.stringify(group)===snap,'no mutation');return suggestion.multiSpreads};
 ok(verifyPlans(irregular,20).length>=1,'irregular multiple spreads');ok(verifyPlans(irregular,null).length>=1,'automatic alternatives');ok(verifyPlans(irregular,1).length===0,'one layer no multiple plan');ok(verifyPlans(v.groups[0],6).length>=1,'limit irregular divisor');
 for(let n=2;n<80;n++){const varied={...irregular,models:irregular.models.map((m,i)=>({...m,grade:m.grade.map((g,j)=>({...g,qty:1+(n*(i+2)*(j+3)+i+j)%97}))}))};verifyPlans(varied,2+n%17)}
 const w=(id,productId,totalKg,usedKg,wasteKg,status='Finalizado')=>({id,productId,status,cutWeightV9579:{totalKg,usedKg,wasteKg}});
 const evidenceDb={...db,products:db.products.map(p=>p.id===10?{...p,fabricRemnantPolicyV9630:{state:'yes',eligible:[{productId:11,materialId:1,size:'P',color:'Rubi',minWidthMm:80,minLengthMm:120}]}}:p),cuts:[w(1,10,20,15,2),w(2,10,10,8,1),w(3,10,10,9,3),w(4,10,10,8,1,'Planejado'),w(5,10,20,15,2),w(5,11,20,15,2),{...w(6,10,20,15,2),hiddenByModelSplitV1:true}]};
 const snap=JSON.stringify(evidenceDb),hist=api.cutEvidence(evidenceDb,true),h=hist.byProduct.get('10');ok(h.valid===2&&h.review===3&&h.totalKg===30&&h.wasteKg===3&&h.wastePct===10&&h.unclassifiedKg===4&&h.reusableKg===null,'valid weighted observations only');ok(hist.byProduct.get('11').valid===0,'duplicate cross-model excluded');ok(api.cutEvidence(evidenceDb,false).state==='forbidden','history permission');
 const ev=api.groupEvidence(v.groups[0],evidenceDb,hist,true);ok(ev.hints.length===1&&ev.hints[0].requested===40&&ev.hints[0].physicalFit===null&&ev.savings===null,'explicit policy and matching demand, no savings proof');ok(ev.hints[0].demand.length===1&&ev.hints[0].demand[0].orderNumber==='7'&&ev.hints[0].demand[0].qty===40,'demand trace by order and grade');ok(api.groupEvidence(v.groups[0],evidenceDb,hist,false).state==='forbidden','group permission');
 const coverage=api.remnantCoverage9727(evidenceDb.products,evidenceDb.materials,true);ok(coverage.counts.yes===1&&coverage.counts.unknown===2&&!coverage.canWrite,'catalog review coverage');
 const brokenCoverage=api.remnantCoverage9727(evidenceDb.products.map(p=>p.id===11?{...p,active:false}:p),evidenceDb.materials,true);ok(brokenCoverage.counts.review===1&&brokenCoverage.counts.yes===0,'inactive target requires review');
 ok(api.remnantCoverage9727(evidenceDb.products,evidenceDb.materials,false).state==='forbidden','coverage permission');
 const badGroup={...v.groups[0],models:[...v.groups[0].models,v.groups[0].models[1]]};ok(api.groupEvidence(badGroup,evidenceDb,hist,true).hints[0].requested===null,'duplicate target demand not counted');ok(JSON.stringify(evidenceDb)===snap,'evidence immutable');
 const measuredDb={...db,cuts:[{id:1,productId:10,status:'Finalizado',pieces:100,materialUsage:[{materialId:1,weight:5,unit:'kg'}]},{id:2,productId:10,status:'Cortado',pieces:50,materialUsage:[{materialId:1,weight:1000,unit:'g'}]},{id:3,productId:10,status:'Planejado',pieces:500,materialUsage:[{materialId:1,weight:9,unit:'kg'}]},{id:4,productId:10,status:'Finalizado',pieces:1,materialUsage:[{materialId:1,weight:1,unit:'kg'},{materialId:1,weight:2,unit:'kg'}]},{id:5,productId:10,status:'Finalizado',pieces:10,materialUsage:[{materialId:1,weight:1,unit:'kg'}]},{id:5,productId:11,status:'Finalizado',pieces:10,materialUsage:[{materialId:1,weight:1,unit:'kg'}]},{id:6,productId:11,status:'Finalizado',pieces:10,materialUsage:[{materialId:1,weight:1,unit:'m'}]}]};
 const measuredSnap=JSON.stringify(measuredDb),mh=api.materialHistory(measuredDb,true),me=api.materialEstimate(v.groups[0],mh,true),m10=me.rows.find(x=>x.productId==='10');
 ok(m10.cuts===2&&m10.review===3&&m10.gramsPerPiece===40&&m10.estimatedKg===1.2,'weighted g/kg with duplicate and planned rejection');
 ok(me.coveredPieces===30&&me.uncoveredPieces===40&&me.estimatedKg===1.2&&me.savings===null&&!me.canWrite,'partial not zero or savings');
 ok(api.materialHistory(measuredDb,false).state==='forbidden'&&api.materialEstimate(v.groups[0],mh,false).state==='forbidden','measured permissions');
 ok(api.materialEstimate(v.groups[0],api.materialHistory(db,true),true).estimatedKg===null,'no sample no estimate');
 ok(JSON.stringify(measuredDb)===measuredSnap,'measured immutable');
 const dated=(i,weight,date)=>({id:i,productId:10,status:'Finalizado',pieces:100,materialUsageRecordedAt:date,materialUsage:[{materialId:1,weight,unit:'kg'}]});
 const datedDb={...db,cuts:[dated(1,5,'2026-11-01T10:00:00Z'),dated(2,5,'2026-11-02T10:00:00Z'),dated(3,5,'2026-11-03T10:00:00Z'),dated(4,6,'2026-11-04T10:00:00Z'),dated(5,99,'2026-11-05'),dated(6,99,'invalid')]};
 const datedSnap=JSON.stringify(datedDb),bt=api.materialBacktest(v.groups[0],api.materialHistory(datedDb,true),true),b10=bt.rows.find(x=>x.productId==='10');
 ok(b10.state==='retrospective'&&b10.cutId==='4'&&b10.priorCuts===3&&b10.expectedKg===5&&b10.actualKg===6&&b10.deltaKg===1&&b10.deltaPct===20&&b10.undatedSamples===2&&b10.savings===null,'strict dated holdout no lookahead');
 ok(bt.rows.find(x=>x.productId==='11').state==='insufficient','no history');
 ok(api.materialBacktest(v.groups[0],api.materialHistory({...datedDb,cuts:[...datedDb.cuts,dated(7,7,'2026-11-04T10:00:00Z')]},true),true).rows[0].state==='insufficient','latest timestamp tie blocked');
 ok(api.materialBacktest(v.groups[0],api.materialHistory(datedDb,true),false).state==='forbidden'&&JSON.stringify(datedDb)===datedSnap,'permission and immutable');
 const forecastAt='2026-11-24T12:00:00.000Z',draft=api.forecastDraft(v.groups[0],measuredDb,mh,forecastAt,true);
 ok(draft.state==='local-draft'&&draft.format==='hlgb-cut-forecast-v1'&&draft.entries.length===2&&draft.estimatedKg===1.2&&draft.coveredPieces===30&&draft.uncoveredPieces===40,'portable partial forecast');
 ok(draft.entries.find(x=>x.productId==='10').estimatedKg===1.2&&draft.entries.find(x=>x.productId==='11').estimatedKg===null&&!draft.remoteSaved&&!draft.clockVerified&&!draft.canWrite&&draft.savings===null,'no false confirmation or missing zero');
 ok(api.forecastDraft(v.groups[0],measuredDb,mh,forecastAt,false).reason==='permission','forecast forbidden');
 ok(api.forecastDraft(v.groups[0],measuredDb,mh,'2026-11-24',true).reason==='date','ambiguous clock');
 ok(api.forecastDraft({...v.groups[0],models:[...v.groups[0].models,v.groups[0].models[0]]},measuredDb,mh,forecastAt,true).state==='blocked','duplicate model');
 ok(api.forecastDraft(v.groups[0],db,api.materialHistory(db,true),forecastAt,true).reason==='history','no forecast without measurements');
 ok(JSON.stringify(measuredDb)===measuredSnap,'forecast immutable');
 const priced=[{...db.materials[0],price:25}],cost=api.materialCostEstimate(v.groups[0],me,priced,true);
 ok(cost.estimatedCents===3000&&cost.referencePricePerKg===25&&cost.coveredPieces===30&&cost.uncoveredPieces===40&&cost.rows.find(r=>r.productId==='11').estimatedCents===null&&!cost.canWrite&&cost.savings===null,'partial reference cost, not savings');
 ok(api.materialCostEstimate(v.groups[0],me,[{...priced[0],unit:'g',price:.025}],true).estimatedCents===3000,'price per gram');
 for(const bad of [[{...priced[0],unit:'m'}],[{...priced[0],price:0}],[{...priced[0],price:null}],[...priced,...priced]])ok(api.materialCostEstimate(v.groups[0],me,bad,true).estimatedCents===null,'invalid or ambiguous price');
 ok(api.materialCostEstimate(v.groups[0],me,priced,false).state==='forbidden','financial permission');
 ok(api.materialCostEstimate(v.groups[0],api.materialEstimate(v.groups[0],api.materialHistory(db,true),true),priced,true).estimatedCents===null,'no history no cost');

 const policyInput={state:'yes',notes:'regra teste',eligible:[{productId:11,materialId:1,size:'P'}]},source=db.products[0],remote={module:'products',entity_id:'10',data:JSON.parse(JSON.stringify(source)),revision:4,deleted_at:null},snapshot={data:JSON.parse(JSON.stringify(source)),revision:4,deleted_at:null};
 const args={productId:10,input:policyInput,products:db.products,materials:db.materials,remote,snapshot,pending:false,allowed:true};
 const saveBefore=JSON.stringify(args),prep=api.prepareRemnantChange(args);
 ok(prep.state==='prepared-only'&&prep.expectedRevision===4&&prep.changed&&!prep.canWrite&&!prep.remoteTargetsVerified,'prepare only');
 const {fabricRemnantPolicyV9630:policy,...untouched}=prep.next;ok(JSON.stringify(untouched)===JSON.stringify(source)&&policy.state==='yes'&&policy.eligible[0].productId==='11'&&!('mode' in policy),'only policy field changed');
 for(const [patch,reason] of [[{allowed:false},'permission'],[{pending:true},'pending-or-unverified'],[{pending:undefined},'pending-or-unverified'],[{remote:{...remote,deleted_at:'deleted'}},'remote-missing'],[{snapshot:{...snapshot,revision:3}},'revision-changed'],[{remote:{...remote,data:{...source,price:99}}},'record-changed'],[{products:[...db.products,source]},'missing-source'],[{input:{...policyInput,eligible:[{productId:11,materialId:99}]}},'material-or-target'],[{input:{...policyInput,state:'no'}},'invalid-policy']])ok(api.prepareRemnantChange({...args,...patch}).reason===reason,'blocked '+reason);
 ok(JSON.stringify(args)===saveBefore,'preparation immutable');
 ok(api.planSelection(v,[]).orderedPieces===0,'empty explicit selection');ok(JSON.stringify(db)===before,'basket immutable');
})(plan,(v,m)=>assert.ok(v,m));(async function dossierChecks(api,checklist,digest,ok){
 const row={orderId:'1',orderNumber:'7',productId:'10',productName:'Camisola',ordered:30,grade:[{color:'Rubi',size:'P',qty:30}],materials:[{name:'Malha',unit:'kg',amount:10}],separatedObserved:0,cutId:'3',issues:[]};
 const d=checklist.initial(row);d.responsible='Teste';d.lines[0].actual='8';const bytes=api.utf8('%PDF-1.7\nfixture bytes'),before=JSON.stringify(d),out=await api.build(row,d,[{name:'folha.pdf',bytes}],checklist,digest);
 ok(out.manifest.lines[0].shortage===2,'shortage');ok(out.manifest.documents[0].filename==='1-folha.pdf','original document');ok(!out.manifest.uploaded&&!out.manifest.confirmed&&!out.manifest.stockChanged,'local-only');ok(new DataView(out.bytes.buffer).getUint32(0,true)===0x04034b50,'zip header');ok(new DataView(out.bytes.buffer).getUint32(out.bytes.length-22,true)===0x06054b50,'zip directory');ok(api.crc32(api.utf8('123456789'))===0xcbf43926,'standard CRC');ok(JSON.stringify(d)===before,'immutable');ok(out.manifest.documents[0].sha256===await digest(bytes),'hash bytes');
 for(const args of [[row,checklist.initial(row),[]],[{...row,ordered:31},d,[]],[row,d,[{name:'wrong.pdf',bytes:api.utf8('not a document')}]], [row,d,[{name:'a.pdf',bytes},{name:'b.pdf',bytes}]]]){let bad=false;try{await api.build(...args,checklist,digest)}catch(_){bad=true}ok(bad,'invalid export')}
 let unsafe=false;try{api.zip([{name:'../x',bytes}])}catch(_){unsafe=true}ok(unsafe,'zip traversal');
})(dossier,checklist,async b=>crypto.createHash('sha256').update(b).digest('hex'),(v,m)=>assert.ok(v,m)).then(()=>console.log('PASS production planning and ZIP export')).catch(e=>{console.error(e);process.exit(1)});
require('./hlgb-remnant-save-contract-v9679.cjs')().catch(e=>{console.error(e);process.exitCode=1});

(function jointPrintContracts(){const g={materialId:'1',materialName:'Tule <teste>',models:[{key:'a',orderNumber:'12',productName:'A <script>',pieces:30,grade:[{color:'Rubi',size:'P',qty:30}]},{key:'b',orderNumber:'13',productName:'B',pieces:40,grade:[{color:'Rubi',size:'M',qty:40}]}]},before=JSON.stringify(g);const packet=plan.jointPrintDraft(g,null,'packet',true);assert.equal((packet.match(/data-joint-sheet="combined"/g)||[]).length,1);assert.equal((packet.match(/data-joint-sheet="individual"/g)||[]).length,2);assert.ok(packet.includes('70 peças previstas'));assert.ok(packet.includes('A &lt;script&gt;'));assert.ok(!packet.includes('A <script>'));assert.ok(packet.includes('RASCUNHO DE SIMULAÇÃO'));assert.ok(packet.includes('Pesagem coletiva consta'));assert.equal((plan.jointPrintDraft(g,null,'combined',true).match(/data-joint-sheet="individual"/g)||[]).length,0);assert.throws(()=>plan.jointPrintDraft(g,0,'packet',true));assert.throws(()=>plan.jointPrintDraft(g,null,'packet',false));assert.equal(JSON.stringify(g),before);})();

(function comparisonAndSingles(){const db={orders:[{id:1,status:'Aberto',grade:[{productId:1,color:'Preto',size:'P',qty:30},{productId:2,color:'Preto',size:'M',qty:40},{productId:3,color:'Preto',size:'G',qty:20},{productId:4,color:'Preto',size:'P',qty:10}]}],products:[{id:1,name:'A',materials:[{materialId:1}]},{id:2,name:'B',materials:[{materialId:1}]},{id:3,name:'C',materials:[{materialId:2}]},{id:4,name:'D',materials:[]}],materials:[{id:1,name:'Tule',cat:'Tule'},{id:2,name:'Malha',cat:'Malha'}],cuts:[],production:[],operationalWriteoffs:[]},before=JSON.stringify(db),d=plan.discover(db,{pairIndex:()=>new Set()},true),singles=plan.unpairedModels(d,true);assert.equal(d.groups.length,1);assert.equal(singles.length,2);assert.ok(singles.some(x=>x.productId==='3'&&x.reason==='no-observed-partner'));assert.ok(singles.some(x=>x.productId==='4'&&x.reviewReason==='no-canonical-material'));const c=plan.compareGradeOptions(d.groups[0],6,true)[0];assert.equal(c.total,70);assert.equal(c.options[0].combinedPieces,70);assert.equal(c.options[1].remaining,4);assert.ok(c.options.every(x=>!x.geometryVerified));assert.equal(plan.compareGradeOptions(d.groups[0],6,false).length,0);assert.equal(JSON.stringify(db),before);})();

(function selectedOptionPrint(){const g={materialId:'1',materialName:'Tule',models:[{key:'a',orderNumber:'1',productName:'A',pieces:30,grade:[{color:'Rubi',size:'P',qty:30}]},{key:'b',orderNumber:'2',productName:'B',pieces:40,grade:[{color:'Rubi',size:'M',qty:40}]}]},before=JSON.stringify(g),choices={Rubi:'limit'};const s=plan.scenarioSummary(g,6,choices,true);assert.equal(s.remaining,4);assert.equal(s.combinedPieces,66);assert.equal(s.total,70);const html=plan.jointPrintDraft(g,6,'packet',true,choices);assert.ok(html.includes('Complementar'));assert.ok(html.includes('Limite de folhas'));assert.ok(html.includes('70 peças previstas'));assert.throws(()=>plan.scenarioSummary(g,6,{Rubi:'missing'},true));assert.throws(()=>plan.scenarioSummary(g,6,{Preto:'exact'},true));assert.equal(JSON.stringify(g),before);})();

(function mixedCutHistory(){const cut={id:'C1',orderId:1,productId:10,status:'Finalizado',finishedAt:'2026-11-26',pieces:70,actualCutGrade:[{productId:10,color:'Rubi',size:'P',qty:30},{productId:11,color:'Rubi',size:'M',qty:40}],cutWeightV9579:{totalKg:10,usedKg:9,wasteKg:1},materialUsage:[{materialId:1,name:'Malha',weight:10,unit:'kg'}]};const db={cuts:[cut],products:[{id:10,name:'A'},{id:11,name:'B'}],orders:[{id:1,client:'Cliente'}],cutters:[],materials:[{id:1,name:'Malha',cat:'Malha'}]},before=JSON.stringify(db),h=plan.jointHistory9757(db,true);assert.equal(h.rows.length,1);assert.equal(h.rows[0].pieces,70);assert.equal(h.rows[0].weights.usedPct,90);assert.equal(h.rows[0].models.length,2);assert.equal(plan.cutEvidence(db,true).byProduct.size,0);assert.equal(plan.materialHistory(db,true).byPair.size,0);assert.equal(plan.weights(db.cuts,10).length,0);assert.equal(plan.jointHistory9757({...db,cuts:[cut,{...cut}]},true).rows.length,0);assert.equal(plan.jointHistory9757({...db,cuts:[{...cut,status:'Planejado'}]},true).rows.length,0);assert.equal(plan.jointHistory9757({...db,cuts:[{...cut,pieces:71}]},true).review,1);assert.equal(plan.jointHistory9757({...db,cuts:[{...cut,modelSplitParentV1:true}]},true).rows.length,0);assert.equal(plan.jointHistory9757(db,false).rows.length,0);assert.equal(JSON.stringify(db),before);})();


(function completeMaterialCompatibility(){
 const product=(id,name,materialId=1)=>({id,name,materials:[{materialId}]});
 const order=(id,productId,color,status='Aberto')=>({id,orderNumber:id,status,grade:[{productId,color,size:'M',qty:40}]});
 const db={orders:[order(1,10,'Preto'),order(2,11,'Rubi','Aguardando execução'),order(3,12,'Preto'),order(4,13,'Branco'),order(5,10,'Branco','Finalizado'),order(6,14,'Rubi')],products:[product(10,'Camisola Juliana'),product(11,'Camisola Letícia'),product(12,'Camisola Liliane'),product(13,'Outro tecido',2),{id:14,name:'Sem matéria-prima',materials:[]}],materials:[{id:1,name:'Romantic',cat:'Malha'},{id:2,name:'Tule',cat:'Tule'}],cuts:[{id:'c',orderId:2,productId:11,status:'Aguardando execução'}],production:[],operationalWriteoffs:[]};
 const before=JSON.stringify(db),d=plan.discover(db,{pairIndex:()=>new Set(['1|10'])},true),x=plan.orderMaterialCompatibility(db,d,true);
 assert.equal(x.state,'local-compatibility');assert.equal(x.canWrite,false);
 const romantic=x.groups.find(g=>g.materialName==='Romantic');
 assert.deepEqual(romantic.models.map(m=>m.productId).sort(),['10','11','12']);
 assert.equal(romantic.models.find(m=>m.productId==='10').planningEligible,false);
 assert.equal(romantic.models.find(m=>m.productId==='11').planningEligible,false);
 assert.equal(x.models.length,5);assert.ok(x.models.some(m=>m.productId==='14'&&!m.materialIds.length));
 assert.equal(x.groups.find(g=>g.materialName==='Tule').models.length,1);
 const pair=romantic.models.filter(m=>m.productId!=='12'),plans=plan.gradeSuggestions({...romantic,models:pair});
 assert.equal(plans.length,2);assert.ok(plans.every(p=>p.modelCount===1&&!p.geometryVerified&&!p.canWrite));
 assert.equal(plan.orderMaterialCompatibility(db,d,false).state,'forbidden');
 assert.equal(plan.orderMaterialCompatibility(db,{state:'unavailable'},true).models.length,5);
 assert.equal(JSON.stringify(db),before);
 console.log('PASS complete material compatibility across order states and colors');
})();


(function partialProductionWithPlannedModels(){
 const products=[{id:10,name:'Camisola Juliana',materials:[{materialId:1,qty:0}]},{id:11,name:'Camisola Leticia',materials:[{materialId:1,qty:0}]},{id:12,name:'Outro modelo',materials:[{materialId:1,qty:0}]}];
 const a={productId:10,color:'Cronos',size:'P',qty:30},b={productId:11,color:'Rubi',size:'M',qty:40},c={productId:12,color:'Preto',size:'G',qty:20};
 const orders=[{id:2,orderNumber:2,status:'Pedido em produção',grade:[a,c]},{id:50,orderNumber:50,status:'Pedido em produção',grade:[b,c]},{id:51,orderNumber:51,status:'Pedido em produção',grade:[b]},{id:52,status:'Corte finalizado',grade:[b]}];
 const child=(oid,pid,g,parent)=>({id:oid*100+pid,orderId:oid,productId:pid,status:'Planejado',pieces:g.qty,modelSplitChildV1:true,modelSplitFromParentCutId:parent,modelSplitFromOrderId:oid,originalGrade:[g],actualCutGrade:[g]});
 const parent=oid=>({id:oid*100,orderId:oid,status:'Desmembrado por modelo',modelSplitParentV1:true,hiddenByModelSplitV1:true});
 const cuts=[parent(2),child(2,10,a,200),{...child(2,12,c,200),status:'Finalizado'},parent(50),child(50,11,b,5000),{...child(50,12,c,5000),status:'Finalizado'},{id:5100,orderId:51,productId:11,status:'Finalizado'}];
 const db={orders,products,materials:[{id:1,name:'Romantic',cat:'Tecido'}],cuts,production:[{id:999,orderId:2,productId:12}],operationalWriteoffs:[]},auth={pairIndex:()=>new Set()},before=JSON.stringify(db);
 const d=plan.discover(db,auth,true);assert.equal(d.groups.length,1);assert.equal(d.groups[0].orderedPieces,70);
 assert.deepEqual(d.groups[0].models.map(m=>m.orderNumber).sort(),['2','50']);
 assert.equal(plan.gradeSuggestions(d.groups[0]).length,2);
 const full=plan.orderMaterialCompatibility(db,d,true);assert.ok(full.models.some(m=>m.orderNumber==='52'&&!m.planningEligible));assert.ok(full.models.some(m=>m.orderNumber==='51'&&!m.planningEligible));
 assert.equal(plan.discover(db,{pairIndex:()=>new Set(['50|11'])},true).groups.length,0);
 assert.equal(plan.discover({...db,cuts:[...cuts,child(50,11,b,5000)]},auth,true).groups.length,0);
 assert.equal(JSON.stringify(db),before);
 console.log('PASS planned model eligibility inside production order');
})();


(function compactJointPrintMatrix(){
 const mk=(key,orderNumber,productName)=>({key,orderNumber,productName,pieces:200,grade:['Preto','Rubi'].flatMap(color=>['P','M','G','GG'].map((size,i)=>({color,size,qty:[20,30,30,20][i]})))});
 const g={materialId:'1',materialName:'Romantic',models:[mk('a','2','Juliana'),mk('b','50','Leticia')]},before=JSON.stringify(g);
 const html=plan.jointPrintDraft(g,null,'packet',true),combined=html.split('data-joint-sheet="combined"')[1].split('data-joint-sheet="individual"')[0],individuals=html.split('data-joint-sheet="individual"').slice(1);
 assert.equal(individuals.length,2);
 assert.ok(combined.includes('Grade por folha'));assert.ok(combined.includes('Grade prevista'));assert.ok(combined.includes('Realizado por tam.'));
 assert.ok(combined.includes('P: 20 / M: 30 / G: 30 / GG: 20'));
 assert.ok(combined.includes('P: 2 / M: 3 / G: 3 / GG: 2'));
 assert.ok(combined.includes('P: ___ / M: ___ / G: ___ / GG: ___'));
 assert.equal((combined.match(/<td>Juliana<\/td>/g)||[]).length,2);
 assert.equal((combined.match(/<td>Leticia<\/td>/g)||[]).length,2);
 for(const sheet of individuals){assert.ok(sheet.includes('P: 20 / M: 30 / G: 30 / GG: 20'));assert.ok(!sheet.includes('<th>Modelo</th>'));assert.ok(sheet.includes('Pesagem coletiva consta'))}
 assert.ok(combined.includes('Refugo kg')&&combined.includes('Cortador 2')&&combined.includes('Infestador'));
 assert.equal(JSON.stringify(g),before);
 console.log('PASS compact print grade matrix and separation sheets');
})();


(function explicitGradeAdjustmentPreview(){
 const mk=(key,orderNumber,productName,color,qty)=>({key,orderNumber,productName,pieces:qty.reduce((n,q)=>n+q,0),grade:qty.map((q,i)=>({color,size:['P','M','G','GG'][i],qty:q}))});
 const g={materialId:'romantic',models:[mk('j','2','Juliana','Cronos',[10,20,20,20]),mk('l','50','Leticia','Rubi',[15,30,30,30]),mk('a','29','Outro','Cronos',[20,40,40,40])]},before=JSON.stringify(g);
 const v=plan.gradeAdjustmentPreview(g,10,true);assert.equal(v.state,'local-preview');assert.equal(v.canWrite,false);assert.equal(v.geometryVerified,false);
 assert.equal(v.sameRatios.length,1);assert.equal(v.sameRatios[0].crossColor,true);assert.equal(v.sameRatios[0].entries.length,3);
 const cronos=v.colors.find(c=>c.color==='Cronos'),rubi=v.colors.find(c=>c.color==='Rubi');
 assert.equal(cronos.exactLayers,10);assert.equal(cronos.requiresAdjustment,false);assert.equal(cronos.complementary,0);
 assert.equal(rubi.requiresAdjustment,true);assert.equal(rubi.complementary,5);assert.equal(rubi.extra,5);
 assert.deepEqual(rubi.models[0].changes.find(r=>r.size==='P'),{size:'P',ordered:15,lower:10,upper:20,missing:5,extra:5,needsAdjustment:true});
 for(const c of v.colors)for(const m of c.models)for(const r of m.changes){assert.equal(r.lower+r.missing,r.ordered);assert.equal(r.ordered+r.extra,r.upper);assert.equal(r.lower%10,0);assert.equal(r.upper%10,0)}
 assert.ok(plan.gradeAdjustmentPreview(g,null,true).colors.every(c=>c.models.every(m=>m.changes.length===0)));
 assert.equal(plan.gradeAdjustmentPreview(g,0,true).state,'unavailable');assert.equal(plan.gradeAdjustmentPreview(g,1.5,true).state,'unavailable');
 assert.equal(plan.gradeAdjustmentPreview(g,10,false).state,'forbidden');
 assert.equal(plan.gradeAdjustmentPreview({...g,models:[{...g.models[0],pieces:1},g.models[1]]},10,true).state,'unavailable');
 assert.equal(JSON.stringify(g),before);
 console.log('PASS explicit grade adjustments, cross-color ratios and exact complements');
})();


(function deliveryCapacityPlanner(){
 const history=[{week:'2026-11-02',pieces:1000,confirmed:true},{week:'2026-11-09',pieces:1200,confirmed:true},{week:'2026-11-16',pieces:800,confirmed:true},{week:'2026-11-23',pieces:1100,confirmed:true},{week:'2026-10-26',pieces:9999,confirmed:false}];
 const orders=[{key:'a',client:'A',model:'Camisola',dueDate:'2026-12-01',pieces:500,paymentMode:'cash',amountCents:50000},{key:'b',client:'B',model:'Body',dueDate:'2026-12-04',pieces:300,paymentMode:'term',paymentDays:7,amountCents:90000},{key:'c',client:'C',model:'Calcinha',dueDate:'2026-12-11',pieces:100,paymentMode:'unknown',amountCents:10000}];
 const input={start:'2026-11-30',weeks:3,weeklyGoal:1000,bufferPercent:0,history,orders,closedDates:['2026-12-02'],coverageConfirmed:true,newPieces:200},before=JSON.stringify(input),p=plan.deliveryCapacityPlan(input,true);
 assert.equal(p.state,'local-capacity-simulation');assert.equal(p.sampleCount,4);assert.equal(p.average,1025);assert.equal(p.conservative,800);assert.equal(p.weeklyTarget,800);
 assert.equal(p.weeks[0].capacity,640);assert.equal(p.weeks[0].committed,800);assert.equal(p.weeks[0].cashAtDeliveryCents,50000);assert.equal(p.weeks[1].termReceiptsCents,90000);
 assert.equal(p.weeks[1].unknownPaymentPieces,100);assert.equal(p.daily.find(x=>x.date==='2026-12-02').capacity,0);assert.equal(p.daily.find(x=>x.date==='2026-12-05').capacity,0);
 assert.equal(p.orders[0].latePieces,180);assert.equal(p.orders[1].latePieces,160);assert.equal(p.late,340);assert.equal(p.unallocated,0);
 assert.equal(p.firstAvailable,'2026-12-09');assert.equal(p.unplacedNewPieces,0);assert.equal(p.canPromise,false);assert.equal(p.cashVerified,false);assert.equal(p.canWrite,false);
 assert.equal(plan.deliveryCapacityPlan(input,false).state,'forbidden');assert.equal(plan.deliveryCapacityPlan({...input,history:[],weeklyGoal:null},true).weeklyTarget,null);
 const unknown=plan.deliveryCapacityPlan({...input,orders:[...orders,{...orders[0],key:'undated',dueDate:''}],coverageConfirmed:false},true);
 assert.ok(unknown.issues.includes('pedido-invalido-ou-duplicado'));assert.ok(unknown.issues.includes('carteira-nao-conferida'));
 assert.equal(plan.deliveryCapacityPlan({...input,history:[...history,history[0]]},true).state,'invalid-history');assert.equal(JSON.stringify(input),before);
 console.log('PASS delivery capacity, holiday reduction, deadline allocation and cash-term scenarios');
})();


(function deliveryCashScenarios(){
 const planData={state:'local-capacity-simulation',issues:[],weeklyTarget:800,orders:[{key:'a',client:'A',model:'Camisola',remaining:0,lastWorkDate:'2026-12-01',dueDate:'2026-12-04',paymentMode:'cash',amountCents:100000},{key:'b',client:'B',model:'Body',remaining:0,lastWorkDate:'2026-12-02',dueDate:'2026-12-03',paymentMode:'term',paymentDays:7,amountCents:200000},{key:'c',client:'C',remaining:10,lastWorkDate:'2026-12-02',dueDate:'2026-12-03',paymentMode:'cash',amountCents:50000}]};
 const input={start:'2026-11-30',openingCents:50000,reserveCents:10000,delayDays:7,coverageConfirmed:true,entries:[{date:'2026-12-03',direction:'out',amountCents:90000,reference:'supplier'},{date:'2026-12-07',direction:'out',amountCents:30000,reference:'payroll'}],additional:[{key:'a',reference:'a-receipt',amountCents:100000,notAlreadyIncluded:true,earlyAccepted:true},{key:'b',reference:'b-receipt',amountCents:200000,notAlreadyIncluded:true,earlyAccepted:false}]};
 const before=JSON.stringify([planData,input]),v=plan.deliveryCashScenario(planData,input,true);
 assert.equal(v.state,'local-cash-scenario');assert.equal(v.additionalCount,2);assert.equal(v.baseline.firstGap,'2026-12-03');assert.equal(v.baseline.maximumGapCents,80000);assert.equal(v.planned.maximumGapCents,50000);assert.equal(v.early.maximumGapCents,0);assert.equal(v.stress.maximumGapCents,80000);
 assert.equal(v.opportunities[0].earlyReceipt,'2026-12-01');assert.equal(v.opportunities[1].requiresCustomerAcceptance,true);assert.equal(v.canWrite,false);assert.equal(v.cashVerified,false);
 assert.equal(plan.deliveryCashScenario(planData,{...input,coverageConfirmed:false},true).partial,true);
 assert.equal(plan.deliveryCashScenario(planData,{...input,additional:[{...input.additional[0],reference:'supplier'}]},true).state,'invalid-additional-receipt');
 assert.equal(plan.deliveryCashScenario(planData,{...input,additional:[{...input.additional[0],amountCents:100001}]},true).state,'invalid-additional-receipt');
 assert.equal(plan.deliveryCashScenario(planData,{...input,additional:[{...input.additional[0],notAlreadyIncluded:false}]},true).state,'invalid-additional-receipt');
 const blocked=plan.deliveryCashScenario(planData,{...input,additional:[{key:'c',reference:'c-receipt',amountCents:20000,notAlreadyIncluded:true}]},true);
 assert.equal(blocked.additionalCount,0);assert.equal(blocked.partial,true);
 assert.equal(plan.deliveryCashScenario(planData,input,false).state,'forbidden');assert.equal(JSON.stringify([planData,input]),before);
 console.log('PASS delivery-linked cash scenarios, reserve, duplicate protection and accepted early delivery');
})();


(function productionStageGoals(){
 const stages=[{key:'cut',name:'Corte',manualCapacity:500,initialWip:0,wipConfirmed:true,history:[],teams:[]},{key:'sew',name:'Costura',manualCapacity:400,initialWip:0,wipConfirmed:true,history:[],teams:[{key:'a',name:'Facção A',capacity:250},{key:'b',name:'Facção B',capacity:150}]},{key:'delivery',name:'Entrega',manualCapacity:300,initialWip:0,wipConfirmed:true,history:[],teams:[]}];
 const input={start:'2026-11-30',goal:300,bufferPercent:0,closedDates:[],stages},before=JSON.stringify(input),v=plan.productionStageGoals(input,true);
 assert.equal(v.state,'local-stage-goals');assert.equal(v.workdays,5);assert.equal(v.simulatedDeliveries,180);assert.equal(v.goalGap,120);assert.equal(v.bottlenecks[0].key,'delivery');
 assert.equal(v.days[0].stages[1].pieces,0);assert.equal(v.days[1].stages[2].pieces,0);assert.equal(v.days[2].stages[2].pieces,60);
 assert.equal(v.stages[1].simulatedPieces,300);assert.deepEqual(v.stages[1].teamAllocations.map(x=>x.pieces),[188,112]);
 assert.equal(plan.productionStageGoals({...input,closedDates:['2026-12-02']},true).simulatedDeliveries,120);
 const wip={...input,stages:stages.map((s,i)=>i===1?{...s,initialWip:80,wipConfirmed:true}:i===2?{...s,initialWip:60,wipConfirmed:true}:s)};
 assert.equal(plan.productionStageGoals(wip,true).simulatedDeliveries,300);
 const unconfirmed=plan.productionStageGoals({...wip,stages:wip.stages.map((s,i)=>i===2?{...s,wipConfirmed:false}:s)},true);assert.ok(unconfirmed.issues.includes('estoque-em-processo-nao-conferido:delivery'));assert.equal(unconfirmed.simulatedDeliveries,240);
 const hist=[{week:'2026-11-02',pieces:200,confirmed:true},{week:'2026-11-09',pieces:300,confirmed:true},{week:'2026-11-16',pieces:400,confirmed:true},{week:'2026-11-23',pieces:500,confirmed:true}];
 const learned=plan.productionStageGoals({...input,stages:stages.map((s,i)=>i===0?{...s,history:hist}:s)},true);assert.equal(learned.stages[0].average,350);assert.equal(learned.stages[0].capacity,200);
 const unknown=plan.productionStageGoals({...input,stages:stages.map((s,i)=>i===0?{...s,manualCapacity:null}:s)},true);assert.equal(unknown.simulatedDeliveries,null);
 assert.equal(plan.productionStageGoals(input,false).state,'forbidden');assert.equal(v.canWrite,false);assert.equal(v.canPromise,false);assert.equal(JSON.stringify(input),before);
 console.log('PASS stage goals, WIP, workday calendar, bottlenecks and team allocation');
})();


(function observedThroughput(){
 const db={products:[{id:'m',name:'Camisola'},{id:'n',name:'Body'}],productionLocations:[{id:'f',name:'Facção A'},{id:'i',name:'Interna'}],cuts:[{id:'c',productId:'m',status:'Finalizado',finishedAt:'2026-11-20',pieces:120,actualCutGrade:[{color:'Preto',size:'M',qty:120}]},{id:'parent',status:'Finalizado',hiddenByModelSplitV1:true,pieces:120,actualCutGrade:[{productId:'m',color:'Preto',size:'M',qty:120}]},{id:'bad',productId:'m',status:'Finalizado',finishedAt:'2026-11-20',pieces:200,actualCutGrade:[{color:'Preto',size:'M',qty:100}]}],factions:[{id:'f1',productId:'m',productionLocationId:'f',productionId:'p1',sent:200,returned:100,deliveryHistory:[{id:'e1',date:'2026-11-13',qty:40},{id:'e2',date:'2026-11-20',qty:60}]},{id:'f2',productId:'n',productionLocationId:'f',productionId:'p2',sent:100,returned:60,deliveryHistory:[{id:'e3',date:'2026-11-20',qty:60}],transferHistory:[{}]}],production:[{id:'p1',productId:'m',productionLocationId:'i',stage:'Pronto',done:100,planned:100,finishedAt:'2026-11-20'},{id:'p2',productId:'n',productionLocationId:'i',stage:'Pronto',done:60,planned:60,finishedAt:'2026-11-20'},{id:'p3',productId:'n',productionLocationId:'i',stage:'Finalizado',done:30,planned:30,finishedAt:'2026-11-20'}]};
 const before=JSON.stringify(db),v=plan.observedThroughput(db,'2026-11-23',true);
 assert.equal(v.state,'local-observation');assert.equal(v.eventCount,4);assert.equal(v.issues.length,2);assert.equal(v.rows.length,3);
 assert.equal(v.rows.find(r=>r.source==='cut').total,120);assert.equal(v.rows.find(r=>r.source==='external').total,100);assert.equal(v.rows.find(r=>r.source==='external').averageActiveWeek,50);assert.equal(v.rows.find(r=>r.source==='internal').total,30);
 assert.equal(v.weeks.length,4);assert.ok(v.weeks.every(w=>w.confirmed===false));assert.equal(v.capacityVerified,false);assert.equal(v.canWrite,false);
 assert.equal(plan.observedThroughput(db,'2026-11-23',false).state,'forbidden');assert.equal(plan.observedThroughput(db,'2026-11-16',true).rows.find(r=>r.source==='external').total,40);
 const conflict=plan.observedThroughput({...db,factions:db.factions.map((r,i)=>i===1?{...r,deliveryHistory:[{id:'e2',date:'2026-11-20',qty:60}]}:r)},'2026-11-23',true);assert.ok(!conflict.rows.some(r=>r.source==='external'));
 assert.equal(JSON.stringify(db),before);
 console.log('PASS observed historical throughput without counting external returns twice');
})();


(function factionLeadTimeEvidence(){
 const D=86400000,iso=n=>new Date(Date.parse('2026-11-01T00:00:00Z')+n*D).toISOString().slice(0,10);
 const mk=(id,days,qty=200,team='f',pid='m')=>({id,productId:pid,productionLocationId:team,status:'Finalizado',sentAt:iso(0),finishedAt:iso(days),sent:qty,returned:qty,deliveryHistory:[{id:'event-'+id,date:iso(days),qty}]});
 const db={products:[{id:'m',name:'Camisola'},{id:'n',name:'Body'}],productionLocations:[{id:'f',name:'Facção A'},{id:'g',name:'Facção B'}],factions:[mk('a',4),mk('b',6),mk('c',8),mk('d',10),mk('e',20,400),mk('f',7,200,'g'),{...mk('bad',5),finishedAt:iso(6)},{...mk('transfer',5),transferHistory:[{}]},{id:'open',productId:'m',productionLocationId:'f',status:'Em produção',sentAt:iso(9),sent:200,returned:50,dueDate:iso(18),deliveryHistory:[{id:'part',date:iso(12),qty:50}]}]};
 const before=JSON.stringify(db),v=plan.factionLeadTimes(db,iso(24),true),group=v.rows.find(r=>r.teamId==='f'&&r.band==='101–300');
 assert.equal(v.state,'local-leadtime-observation');assert.equal(group.count,4);assert.equal(group.averageDays,7);assert.equal(group.medianDays,7);assert.equal(group.conservativeDays,8);assert.equal(group.maxDays,10);assert.equal(v.issues.length,2);
 assert.equal(v.open.length,1);assert.equal(v.open[0].remaining,150);assert.equal(v.open[0].referenceDate,iso(17));assert.equal(v.open[0].pastReference,true);assert.equal(v.open[0].lateAgainstDue,true);assert.equal(v.open[0].remainingForecast,null);
 const p=plan.factionLeadTimePreview(v,{productId:'m',teamId:'f',pieces:250,sentAt:iso(24)},true);assert.equal(p.state,'historical-reference');assert.equal(p.referenceDays,8);assert.equal(p.referenceDate,iso(32));assert.equal(p.canPromise,false);
 assert.equal(plan.factionLeadTimePreview(v,{productId:'m',teamId:'f',pieces:400,sentAt:iso(24)},true).state,'insufficient-history');
 assert.equal(plan.factionLeadTimePreview(v,{productId:'m',teamId:'g',pieces:200,sentAt:iso(24)},true).sampleCount,1);
 assert.equal(plan.factionLeadTimePreview(v,{productId:'m',teamId:'f',pieces:200,sentAt:'2026-02-30'},true).state,'invalid-input');
 assert.equal(plan.factionLeadTimes(db,iso(24),false).state,'forbidden');assert.equal(JSON.stringify(db),before);
 console.log('PASS faction lead times, lot bands, return reconciliation and open-lot alerts');
})();


(function factionQueueScenario(){
 const db={products:[{id:'m',name:'Camisola'}],productionLocations:[{id:'f',name:'Facção A'},{id:'g',name:'Facção B'}],factions:[{id:'l1',productId:'m',productionLocationId:'f',productionId:'p1',status:'Em produção',sentAt:'2026-11-20',sent:300,returned:100,dueDate:'2026-12-01',deliveryHistory:[{id:'r1',date:'2026-11-23',qty:100}]},{id:'l2',productId:'m',productionLocationId:'f',status:'Em produção',sentAt:'2026-11-20',sent:200,returned:0,dueDate:'2026-12-04'},{id:'other',productId:'m',productionLocationId:'g',status:'Em produção',sentAt:'2026-11-20',sent:500,returned:0}],production:[{id:'p1',productId:'m',productionLocationId:'f',stage:'Em produção',planned:300,done:100},{id:'p2',productId:'m',productionLocationId:'f',stage:'Aguardando atribuição',planned:60,done:0}]};
 const input={teamId:'f',start:'2026-11-30',weeklyCapacity:500,bufferPercent:0,weeks:2,newPieces:100,additionalCommitted:60,closedDates:['2026-12-02'],coverageConfirmed:true,capacityConfirmed:true};
 const before=JSON.stringify([db,input]),v=plan.factionQueueScenario(db,input,true);
 assert.equal(v.state,'local-queue-scenario');assert.equal(v.observedPieces,400);assert.equal(v.pendingPieces,60);assert.equal(v.additionalCommitted,60);assert.equal(v.partial,true);
 assert.deepEqual(v.weeks.map(w=>[w.capacity,w.existing,w.newPieces,w.free]),[[400,400,0,0],[500,60,100,340]]);
 assert.equal(v.firstFree,'2026-12-07');assert.equal(v.newCompletion,'2026-12-08');assert.equal(v.newUnallocated,0);assert.equal(v.existingRemaining,0);assert.equal(v.latePieces,0);
 assert.ok(!v.lots.some(l=>l.key==='p1'));assert.equal(v.canPromise,false);assert.equal(v.canWrite,false);assert.equal(v.capacityVerified,false);
 const bad=plan.factionQueueScenario({...db,factions:db.factions.map(f=>f.id==='l1'?{...f,returned:150}:f)},input,true);assert.equal(bad.observedPieces,200);assert.ok(bad.issues.some(i=>i.reason==='retorno-nao-conciliado'));
 assert.equal(plan.factionQueueScenario(db,{...input,weeklyCapacity:0},true).newCompletion,null);
 assert.equal(plan.factionQueueScenario(db,{...input,teamId:'unknown'},true).state,'invalid-location');
 assert.equal(plan.factionQueueScenario(db,input,false).state,'forbidden');assert.equal(JSON.stringify([db,input]),before);
 console.log('PASS faction queue, linked production dedupe, additional commitments and new-lot availability');
})();


(function factionDistribution(){
 const make=(team,i,q,days)=>({id:team+'-'+i,productId:'m',productionLocationId:team,status:'Finalizado',sentAt:'2026-11-01',finishedAt:'2026-11-'+String(days+1).padStart(2,'0'),sent:q,returned:q,deliveryHistory:[{id:'evt-'+team+'-'+i,date:'2026-11-'+String(days+1).padStart(2,'0'),qty:q}]});
 const db={products:[{id:'m',name:'Camisola'},{id:'n',name:'Body'}],productionLocations:[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}],factions:[...([200,220,250,300].map((q,i)=>make('a',i,q,4))),...([150,180,200,250].map((q,i)=>make('b',i,q,5))),make('c',0,200,3)],production:[]};
 const t=teamId=>({teamId,weeklyCapacity:500,additionalCommitted:0,compatibilityConfirmed:true,coverageConfirmed:true,capacityConfirmed:true});
 const input={productId:'m',pieces:450,start:'2026-11-30',asOf:'2026-11-26',dueDate:'2026-12-07',finishBufferDays:1,bufferPercent:0,weeks:2,closedDates:[],teams:[t('a'),t('b'),t('c')]};
 const before=JSON.stringify([db,input]),v=plan.distributeFactionOrder(db,input,true);
 assert.equal(v.state,'local-distribution-scenario');assert.equal(v.allocated,450);assert.equal(v.unallocated,0);assert.equal(v.referenceDelivery,'2026-12-06');assert.deepEqual(v.allocations.map(a=>[a.teamId,a.pieces]),[['a',300],['b',150]]);assert.equal(v.teams[2].reason,'sem-faixa-historica-e-capacidade-compativeis');assert.equal(v.canPromise,false);assert.equal(v.canWrite,false);
 const smaller=plan.distributeFactionOrder(db,{...input,pieces:340},true);assert.equal(smaller.allocated,300);assert.equal(smaller.unallocated,40);
 const deadline=plan.distributeFactionOrder(db,{...input,dueDate:'2026-12-05'},true);assert.equal(deadline.allocated,300);
 const unchecked=plan.distributeFactionOrder(db,{...input,teams:[{...t('a'),compatibilityConfirmed:false},t('b')]},true);assert.equal(unchecked.allocated,250);assert.equal(unchecked.teams[0].reason,'modelo-nao-confirmado');
 const pending={...db,production:[{id:'p',productId:'m',productionLocationId:'a',stage:'Aguardando atribuição',planned:50,done:0}]};const uncertain=plan.distributeFactionOrder(pending,input,true);assert.equal(uncertain.allocated,250);assert.equal(uncertain.teams[0].reason,'fila-ou-capacidade-a-conferir');
 assert.equal(plan.distributeFactionOrder(db,{...input,productId:'n'},true).allocated,0);assert.equal(plan.distributeFactionOrder(db,{...input,teams:[t('a'),t('a')]},true).state,'invalid-input');assert.equal(plan.distributeFactionOrder(db,input,false).state,'forbidden');assert.equal(JSON.stringify([db,input]),before);
 console.log('PASS multi-faction distribution with historical ranges, exact feasible quantities and queue safeguards');
})();


(function factionForecastBacktest(){
 const D=86400000,iso=n=>new Date(Date.parse('2026-09-01T00:00:00Z')+n*D).toISOString().slice(0,10);
 const make=(i,start,days,team='a')=>({id:team+'-'+i,productId:'m',productionLocationId:team,status:'Finalizado',sentAt:iso(start),finishedAt:iso(start+days),sent:200,returned:200,deliveryHistory:[{id:team+'-event-'+i,date:iso(start+days),qty:200}]});
 const data=[make(0,0,2),make(1,5,2),make(2,10,2),make(3,15,2),make(4,20,4),make(5,25,4),make(6,30,4),make(7,35,5),make(8,42,6),make(9,50,8),make(10,58,2),make(11,58,3),make(0,0,2,'b')];
 const db={products:[{id:'m',name:'Camisola'}],productionLocations:[{id:'a',name:'A'},{id:'b',name:'B'}],factions:data},before=JSON.stringify(db),v=plan.factionForecastBacktest(db,iso(70),true);
 assert.equal(v.state,'local-forecast-backtest');assert.equal(v.summary.eligibleLots,13);assert.equal(v.summary.evaluated,8);assert.equal(v.summary.insufficient,5);assert.equal(v.summary.suggestedBufferDays,null);
 const a=v.rows.find(r=>r.teamId==='a'),first=a.records[0],cal=a.records.find(r=>r.recordId==='a-8');
 assert.equal(first.recordId,'a-4');assert.equal(first.trainingCount,4);assert.equal(first.predictedDays,2);assert.equal(first.errorDays,2);assert.equal(first.calibratedErrorDays,null);
 assert.equal(cal.priorErrorCount,4);assert.equal(cal.calibratedBufferDays,2);assert.equal(cal.predictedDays,4);assert.equal(cal.calibratedErrorDays,0);
 const sameDay=a.records.find(r=>r.recordId==='a-10');assert.equal(sameDay.trainingCount,9);assert.equal(sameDay.priorErrorCount,5);
 assert.equal(v.rows.find(r=>r.teamId==='b').evaluated,0);assert.equal(v.rows.find(r=>r.teamId==='b').suggestedBufferDays,null);
 assert.equal(v.autoApply,false);assert.equal(v.canWrite,false);assert.equal(plan.factionForecastBacktest(db,iso(70),false).state,'forbidden');assert.equal(JSON.stringify(db),before);
 console.log('PASS walk-forward forecast validation and candidate calibration without future leakage');
})();


(function forecastJournalIntegrity(){
 const mk=(k,start,end)=>({id:k,productId:'m',productionLocationId:'f',status:'Finalizado',sentAt:start,finishedAt:end,sent:200,returned:200,deliveryHistory:[{id:'ev-'+k,date:end,qty:200}]});
 const open={id:'open',productId:'m',productionLocationId:'f',status:'Em produção',sentAt:'2026-11-20',sent:200,returned:0};
 const db={products:[{id:'m',name:'Camisola'}],productionLocations:[{id:'f',name:'Facção'}],factions:[mk('a','2026-11-01','2026-11-03'),mk('b','2026-11-04','2026-11-07'),mk('c','2026-11-08','2026-11-12'),mk('d','2026-11-13','2026-11-18'),open]};
 const before=JSON.stringify(db),capture={asOf:'2026-11-21',mode:'capture',entries:[],lotIds:['open']};
 const v=plan.forecastJournal(db,capture,true);assert.equal(v.state,'local-forecast-journal');assert.equal(v.added,1);assert.equal(v.entries[0].referenceDays,4);assert.equal(v.entries[0].referenceDate,'2026-11-24');assert.equal(v.rows[0].status,'em-andamento');assert.equal(v.cloudPersisted,false);
 const repeat=plan.forecastJournal(db,{...capture,entries:v.entries},true);assert.equal(repeat.added,0);assert.deepEqual(repeat.entries,v.entries);
 const revision=plan.forecastJournal(db,{...capture,asOf:'2026-11-22',entries:v.entries},true);assert.equal(revision.entries.length,2);
 const finished={...db,factions:[...db.factions.slice(0,4),mk('open','2026-11-20','2026-11-25')]};
 const report=plan.forecastJournal(finished,{asOf:'2026-11-26',mode:'inspect',entries:revision.entries},true);assert.equal(report.summary.records,2);assert.equal(report.summary.lots,1);assert.equal(report.summary.evaluated,1);assert.equal(report.summary.meanAbsoluteErrorDays,1);assert.equal(report.summary.onTimePercent,0);
 assert.equal(plan.forecastJournal(db,{...capture,entries:[...v.entries,...v.entries],mode:'inspect'},true).entries.length,1);
 const altered={...v.entries[0],pieces:201};assert.equal(plan.forecastJournal(db,{...capture,entries:[...v.entries,altered],mode:'inspect'},true).state,'journal-conflict');
 const leakage={...v.entries[0],training:v.entries[0].training.map((s,i)=>i===0?{...s,finishedAt:'2026-11-21'}:s)};assert.equal(plan.forecastJournal(db,{...capture,entries:[leakage],mode:'inspect'},true).state,'invalid-training');
 const known=plan.forecastJournal(finished,{asOf:'2026-11-26',mode:'inspect',entries:[{...v.entries[0],capturedAt:'2026-11-25'}]},true);assert.equal(known.rows[0].status,'resultado-ja-conhecido-ou-mesmo-dia');
 assert.equal(plan.forecastJournal(db,capture,false).state,'forbidden');assert.equal(JSON.stringify(db),before);
 console.log('PASS portable forecast journal, immutable revisions and first-forecast outcome evaluation');
})();


(function orderReceivablesReview(){
 const note=(id,orderIds,terms,value,paid,due)=>({id,clientId:'c',client:'Cliente',value,paid,remaining:value-paid,terms,issueDate:'2026-11-20',dueDate:due,status:value===paid?'Pago':'Pendente',items:orderIds.map(orderId=>({orderId}))});
 const a=note('a',['o1'],'À vista',100,20,'2026-11-20'),b=note('b',['o1','o2'],'A prazo',200,0,'2026-12-20'),c=note('c',['o2'],'À vista',50,50,'2026-11-20');
 const finance=n=>({id:'f-'+n.id,projectionInvoiceId:n.id,clientId:n.clientId,value:n.value,paid:n.paid,remaining:n.remaining,paymentTerms:n.terms,issueDate:n.issueDate,dueDate:n.dueDate,status:n.status});
 const db={orders:[{id:'o1',orderNumber:1,clientId:'c'},{id:'o2',orderNumber:2,clientId:'c'},{id:'o3',orderNumber:3,clientId:'c',paymentTerms:'À vista'}],clients:[{id:'c',name:'Cliente'}],projectionInvoices:[a,b,c],finance:[finance(a),finance(b),finance(c)]};
 const input={asOf:'2026-11-26',canonicalIds:['a','b','c'],pendingIds:[],pendingObserved:true},before=JSON.stringify([db,input]),v=plan.orderReceivablesReview(db,input,true);
 assert.equal(v.state,'local-receivables-review');assert.equal(v.issues.length,0);assert.equal(v.clients[0].balanceCents,28000);assert.equal(v.clients[0].cashOpenCents,8000);assert.equal(v.clients[0].termOpenCents,20000);assert.equal(v.clients[0].overdueCents,8000);
 assert.equal(v.orders[0].exclusiveNoteBalanceCents,8000);assert.equal(v.orders[1].exclusiveNoteBalanceCents,0);assert.equal(v.orders[0].sharedNotes,1);assert.equal(v.orders[0].terms,'unknown');assert.equal(v.orders[2].termsSource,'order');assert.equal(v.orders[2].orderRemainingCents,null);
 const bad=plan.orderReceivablesReview({...db,finance:db.finance.map(f=>f.id==='f-a'?{...f,remaining:90}:f)},input,true);assert.equal(bad.titles[0].reason,'saldo-divergente');assert.equal(bad.clients[0].balanceCents,20000);
 const pend=plan.orderReceivablesReview(db,{...input,pendingIds:['finance::f-b']},true);assert.equal(pend.titles[1].reason,'sincronizacao-pendente');assert.equal(pend.clients[0].balanceCents,8000);
 assert.equal(plan.orderReceivablesReview(db,{...input,pendingObserved:false},true).state,'source-unavailable');assert.equal(plan.orderReceivablesReview(db,{...input,canonicalIds:['a','a']},true).state,'canonical-conflict');
 assert.equal(v.canWrite,false);assert.equal(v.cashVerified,false);assert.equal(v.canScheduleReceipts,false);assert.equal(plan.orderReceivablesReview(db,input,false).state,'forbidden');assert.equal(JSON.stringify([db,input]),before);
 console.log('PASS order receivables review, shared note dedupe, balances, payment conditions and pending evidence');
})();


(function plannerReceiptTimingAndTerms(){
 const input={start:'2026-11-30',asOf:'2026-11-26',weeks:3,weeklyGoal:100,bufferPercent:0,history:[],closedDates:[],coverageConfirmed:true,newPieces:0,orders:[{key:'a',client:'A',model:'M',dueDate:'2026-12-01',pieces:120,paymentMode:'cash',amountCents:12000},{key:'b',client:'A',model:'N',dueDate:'2026-12-02',pieces:40,paymentMode:'term',paymentDays:7,amountCents:4000},{key:'c',client:'B',model:'M',dueDate:'2026-12-03',pieces:1000,paymentMode:'cash',amountCents:100000}]};
 const p=plan.deliveryCapacityPlan(input,true);assert.equal(p.state,'local-capacity-simulation');assert.equal(p.orders[0].lastWorkDate,'2026-12-07');assert.equal(p.orders[0].receiptDate,'2026-12-07');assert.equal(p.weeks[0].cashAtDeliveryCents,0);assert.equal(p.weeks[1].cashAtDeliveryCents,12000);assert.equal(p.orders[1].receiptDate,'2026-12-16');assert.equal(p.weeks[2].termReceiptsCents,4000);assert.equal(p.orders[2].receiptDate,null);assert.equal(p.excludedReceiptPieces,1000);
 assert.equal(plan.deliveryCapacityPlan({...input,history:[{week:'2026-11-23',pieces:100,confirmed:true}]},true).state,'invalid-history');
 assert.equal(plan.deliveryCapacityPlan({...input,history:[{week:'2026-11-16',pieces:100,confirmed:false},{week:'2026-11-16',pieces:100,confirmed:true}]},true).state,'invalid-history');
 const fallback={mode:'cash',days:0};
 assert.deepEqual(plan.orderPaymentCondition({paymentTerms:'30 dias'},null,fallback,true),{mode:'term',days:30,source:'order-recorded'});
 assert.equal(plan.orderPaymentCondition({paymentTerms:'Cheque'},null,fallback,true).mode,'unknown');
 assert.equal(plan.orderPaymentCondition({},null,fallback,true).source,'client-scenario');
 assert.deepEqual(plan.orderPaymentCondition({paymentTerms:'À vista'},{mode:'term',days:15},fallback,true),{mode:'term',days:15,source:'order-scenario'});
 assert.equal(plan.orderPaymentCondition({paymentTerms:'À vista'},{mode:'unknown'},fallback,true).mode,'unknown');
 assert.equal(plan.orderPaymentCondition({paymentTerms:'À vista'},null,fallback,false).mode,'unknown');
 console.log('PASS payment timing after simulated completion, historical cutoffs and per-order conditions');
})();
