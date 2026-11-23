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
 ok(before===JSON.stringify(db),'no mutation');
})(api,(function fixture(){return {orders:[{id:1,status:'Aberto',grade:[{productId:11,color:'Preto',size:'P',qty:100}]},{id:2,status:'Aberto',grade:[{productId:12,color:'Preto',size:'M',qty:80}]}],products:[{id:11,name:'Camisola exemplo',materials:[{materialId:10}]},{id:12,name:'Short Doll exemplo',materials:[{materialId:10}]}],materials:[{id:10,name:'Malha exemplo',cat:'Tecido',unit:'kg'}],cuts:[],production:[],operationalWriteoffs:[]}})(),(ok,msg)=>{assert.ok(ok,msg);console.log('PASS',msg)});
