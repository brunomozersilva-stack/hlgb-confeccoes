'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBJointCutCore9628=api;})(typeof globalThis==='object'?globalThis:this,(function core(){
 const s=x=>typeof x==='string'||(typeof x==='number'&&Number.isSafeInteger(x))?String(x).trim():'';
 const n=x=>typeof x==='number'||(typeof x==='string'&&/^\d+(\.\d+)?$/.test(x))?Number(x):NaN;
 const q=x=>Number.isSafeInteger(n(x))&&n(x)>=0?n(x):null;
 const norm=x=>s(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const key=(...x)=>JSON.stringify(x.map(s));
 const del=x=>!!(x?.deleted===true||x?.deletedAt||x?.deleted_at||x?._deleted===true);
 function index(rows){const m=new Map();for(const x of rows){const id=s(x?.id);if(id&&!del(x))m.set(id,m.has(id)?null:x)}return m}
 function plan(data,e={}){
  if(!data||!['orders','products','materials','cuts','production'].every(x=>Array.isArray(data[x]))||!Array.isArray(e.lines)||data.orders.length>50000||e.lines.length>100000)throw Error('invalid input');
  const orders=index(data.orders),products=index(data.products),materials=index(data.materials),proof=new Map(),activity=new Set(),blocked=new Set(),discovery=new Map(),groups=new Map(),excluded=[];
  const fail=(l,reason)=>excluded.push({...l,reason});
  for(const x of e.lines){const k=key(x?.orderId,x?.productId,x?.color,x?.size);proof.set(k,proof.has(k)?null:x)}
  for(const x of [...data.cuts,...data.production])if(x&&!del(x)&&s(x.orderId))activity.add(key(x.orderId,x.productId||'*'));
  for(const x of e.blockedPairs||[])blocked.add(key(x.orderId,x.productId||'*'));
  for(const o of data.orders){
   if(!o||del(o))continue;
   const oid=s(o.id);
   if(!oid||orders.get(oid)!==o){fail({orderId:oid},'ambiguous-order');continue}
   if(['entregue','cancelado','cancelada','finalizado','finalizada'].includes(norm(o.status)))continue;
   if(!Array.isArray(o.grade)||!o.grade.length){fail({orderId:oid},'missing-grade');continue}
   const grade=new Map(),badModels=new Set();let badOrder=false;
   for(const x of o.grade){
    const l={orderId:oid,productId:s(x?.productId),color:s(x?.color),size:s(x?.size),ordered:q(x?.qty)};
    if(!l.productId||!l.color||!l.size||l.ordered===null){fail(l,'invalid-grade');if(l.productId)badModels.add(l.productId);else badOrder=true;continue}
    if(!l.ordered)continue;const k=key(oid,l.productId,l.color,l.size);
    if(grade.has(k))grade.get(k).duplicate=true;else grade.set(k,l);
   }
   for(const [k,l] of grade){
    const p=products.get(l.productId);
    if(!p||l.duplicate||badOrder||badModels.has(l.productId)){fail(l,'ambiguous-grade-or-product');continue}
    if(blocked.has(key(oid,l.productId))||blocked.has(key(oid,'*'))){fail(l,'written-off-or-blocked');continue}
    const fabrics=(Array.isArray(p.materials)?p.materials:[]).filter(b=>{const m=materials.get(s(b?.materialId));return m&&['tecido','malha','renda','tule'].includes(norm(m.cat||b.cat))});
    if(!fabrics.length){fail(l,'no-canonical-material');continue}
    for(const b of fabrics){
     const mid=s(b.materialId),m=materials.get(mid),g=discovery.get(mid)||{materialId:mid,materialName:s(m.name),lines:[]};
     g.lines.push({...l,productName:s(p.name)});discovery.set(mid,g);
    }
    const x=proof.get(k);
    if(e.snapshotVerified!==true||e.writeoffsVerified!==true||!x||x.verified!==true||!s(x.reference)){fail(l,'unverified-balance');continue}
    if(activity.has(key(oid,'*'))){fail(l,'ambiguous-order-activity');continue}
    if(activity.has(key(oid,l.productId))&&x.activityReconciled!==true){fail(l,'unreconciled-activity');continue}
    const cut=q(x.cutQty),reserved=q(x.reservedQty);
    if(cut===null||reserved===null||cut+reserved>l.ordered){fail(l,'invalid-balance');continue}
    const available=l.ordered-cut-reserved;if(!available){fail(l,'no-available-pieces');continue}
    const mid=s(x.materialId),bom=fabrics.filter(b=>s(b.materialId)===mid),m=materials.get(mid);
    if(bom.length!==1||!m){fail(l,'ambiguous-material');continue}
    const b=bom[0],width=n(x.widthMm),unit=norm(b.unit||m.unit),attrs=['fabricColor','lotId','composition','stretch','grain','cutConstraint'].map(f=>s(x[f]));
    if(!Number.isFinite(width)||width<=0||!unit||norm(x.unit)!==unit||attrs.some(a=>!a)||x.compatibilityVerified!==true){fail(l,'incomplete-fabric-properties');continue}
    const gk=key(mid,...attrs,width,unit),g=groups.get(gk)||{materialId:mid,materialName:s(m.name),fabricColor:attrs[0],lotId:attrs[1],widthMm:width,composition:attrs[2],stretch:attrs[3],grain:attrs[4],cutConstraint:attrs[5],unit,allocations:[]};
    const rate=n(b.qty),loss=n(b.loss??0),mode=b.calcMode||'consumption';
    const need=rate>0&&Number.isFinite(rate)&&loss>=0&&Number.isFinite(loss)&&['yield','consumption'].includes(mode)?(mode==='yield'?available/rate:available*rate)*(1+loss/100):null;
    g.allocations.push({...l,productName:s(p.name),cutQty:cut,reservedQty:reserved,available,reference:s(x.reference),baselineNeed:Number.isFinite(need)?need:null});groups.set(gk,g);
   }
  }
  const combined=a=>new Set(a.map(x=>x.productId)).size>=2||new Set(a.map(x=>x.orderId)).size>=2;
  const suggestions=[],singletons=[];
  for(const g of groups.values()){
   const a=g.allocations,sizes=new Map();for(const x of a)sizes.set(x.size,(sizes.get(x.size)||0)+x.available);
   const out={...g,pieces:a.reduce((v,x)=>v+x.available,0),combinedGrade:[...sizes].map(([size,qty])=>({size,qty})),baselineNeed:a.every(x=>x.baselineNeed!==null)?a.reduce((v,x)=>v+x.baselineNeed,0):null,optimizedNeed:null,savings:null,mode:'simulation-only'};
   (combined(a)?suggestions:singletons).push(out);
  }
  return {suggestions,singletons,discovery:[...discovery.values()].filter(g=>combined(g.lines)).map(g=>({...g,mode:'unverified-material-match'})),excluded,mode:'read-only',geometryVerified:false};
 }
 return {plan};
})());
