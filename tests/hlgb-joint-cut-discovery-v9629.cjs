const assert=require('node:assert/strict');const api=require('../hlgb-modules/producao/joint-cut-discovery-v9629.js');(function checks(api,db,ok){
 const a={pairIndex:()=>new Set()},p=(d=db,x=a)=>api.discover(d,x),before=JSON.stringify(db);
 ok(p().groups[0].orderedPieces===180,'actual field shape');
 ok(p().verifiedAvailable===null&&p().state==='discovery-only','not availability');
 ok(p(db,null).state==='unavailable','missing authority');
 ok(p(db,{pairIndex:()=>{throw Error('x')}}).state==='unavailable','authority failure');
 ok(p(db,{pairIndex:()=>new Set(['2|12'])}).groups.length===0,'writeoff');
 ok(p(db,{pairIndex:()=>new Set(['2|*'])}).groups.length===0,'aggregate writeoff');
 ok(p({...db,cuts:[{orderId:2,productId:12}]}).groups.length===0,'existing cut');
 ok(p({...db,production:[{orderId:2}]}).groups.length===0,'aggregate production');
 ok(p({...db,production:[{id:3}]}).unlinkedActivity===true,'unlinked activity visible');
 ok(p({...db,operationalWriteoffs:undefined}).state==='unavailable','missing collection');
 ok(p({...db,products:[{...db.products[0],materials:[...db.products[0].materials,...db.products[0].materials]},db.products[1]]}).groups[0].orderedPieces===180,'duplicate material does not inflate');
 const planned={id:77,orderId:2,productId:12,op:'PED-2',status:'Planejado',pieces:80,layers:0,meters:0};
 ok(p({...db,cuts:[planned]}).groups[0].orderedPieces===180,'automatic planned placeholder must remain a candidate');
 ok(p({...db,cuts:[planned]}).plannedRows===1,'planned row diagnostic');
 const dup=p({...db,cuts:[planned,{...planned,id:78}]});
 ok(dup.groups.length===0&&dup.duplicatePlannedPairs===1,'duplicate planned identities cannot suggest cutting again');
 for(const field of ['gradeAdjustedAt','cutGradeAdjustedAt','cutGradeAdjustmentNote','materialUsageRecordedAt']){
  const adjusted=p({...db,cuts:[{...planned,[field]:'2026-11-26'}]});
  ok(adjusted.groups.length===0,'adjusted cut excluded even with unchanged total: '+field);
 }
 const aggregate={...planned,id:79,productId:null};
 ok(p({...db,cuts:[planned,aggregate]}).groups.length===0,'overlapping aggregate and individual placeholders excluded');
 for(const patch of [{status:'Finalizado'},{finishedAt:'2026-11-24'},{layers:2},{pieces:79},{op:'other'},{cutWeightV9579:{totalKg:1}}])ok(p({...db,cuts:[{...planned,...patch}]}).groups.length===0,'unsafe or mismatched cut stays blocked '+JSON.stringify(patch));
 const o={id:3,status:'Aguardando corte',grade:[{productId:11,color:'Preto',size:'P',qty:20},{productId:12,color:'Preto',size:'M',qty:40}]},parent={id:90,orderId:3,modelSplitParentV1:true,hiddenByModelSplitV1:true,status:'Desmembrado por modelo'},children=o.grade.map((g,i)=>({id:91+i,orderId:3,productId:g.productId,modelSplitChildV1:true,modelSplitFromOrderId:3,modelSplitFromParentCutId:90,status:'Planejado',originalGrade:[g],actualCutGrade:[g],pieces:g.qty}));
 const split={...db,orders:[o],cuts:[parent,...children]};ok(p(split).groups[0].orderedPieces===60,'planned split defaults are not physical activity');ok(p({...split,cuts:[parent,children[0]]}).groups.length===0,'incomplete parent stays blocked');
 ok(p({...split,cuts:[parent,children[0],{...children[1],status:'Finalizado'}]}).groups.length===0,'completed child excluded');
 const adjustedSplit=p({...split,cuts:[parent,children[0],{...children[1],cutGradeAdjustedAt:'2026-11-26',plannedGradeBeforeAdjustmentV9243:children[1].originalGrade}]});
 ok(adjustedSplit.groups.length===0&&adjustedSplit.adjustedRows===1,'same-grade adjusted split cut must not appear as unstarted');
 ok(before===JSON.stringify(db),'no mutation');
})(api,(function fixture(){return {orders:[{id:1,status:'Aberto',grade:[{productId:11,color:'Preto',size:'P',qty:100}]},{id:2,status:'Aberto',grade:[{productId:12,color:'Preto',size:'M',qty:80}]}],products:[{id:11,name:'Camisola exemplo',materials:[{materialId:10}]},{id:12,name:'Short Doll exemplo',materials:[{materialId:10}]}],materials:[{id:10,name:'Malha exemplo',cat:'Tecido',unit:'kg'}],cuts:[],production:[],operationalWriteoffs:[]}})(),(ok,msg)=>{assert.ok(ok,msg);console.log('PASS',msg)});
