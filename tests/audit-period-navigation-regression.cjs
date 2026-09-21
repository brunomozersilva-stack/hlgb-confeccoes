const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('app9240.html','utf8');
const isoDate=d=>{
 const x=new Date(d),y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');
 return y+'-'+m+'-'+day;
};
const mondayOf=d=>{const x=new Date(d),day=x.getDay(),diff=day===0?-6:1-day;x.setDate(x.getDate()+diff);return x};
const weekValue=d=>isoDate(mondayOf(d));
const mondayFromWeek=v=>new Date(String(v).slice(0,10)+'T12:00:00');

const hubStart=html.indexOf('function hlgb916HubRange(');
const hubEnd=html.indexOf('function hlgb916HubEntryMethods',hubStart);
assert(hubStart>=0&&hubEnd>hubStart,'Hub week functions must exist');
const els={hubFinanceWeek:{value:'2026-09-23'}};
let hubRenders=0;
const hubCtx=vm.createContext({
 Date,isoDate,mondayOf,weekValue,mondayFromWeek,
 document:{getElementById:id=>els[id]||null},
 renderHubFinance(){hubRenders++}
});
vm.runInContext(html.slice(hubStart,hubEnd),hubCtx);
let r=hubCtx.hlgb916HubRange('2026-09-23');
assert.equal(r.start,'2026-09-21');assert.equal(r.end,'2026-09-27');
hubCtx.changeHubFinanceWeek(1);
assert.equal(els.hubFinanceWeek.value,'2026-09-28','next Hub week must advance exactly seven days');
assert.equal(hubRenders,1);
hubCtx.changeHubFinanceWeek(-1);
assert.equal(els.hubFinanceWeek.value,'2026-09-21','previous Hub week must return exactly seven days');

const capStart=html.indexOf('let capacityWeek9168=');
const capEnd=html.indexOf('window.openCapacityFinalizer9168=',capStart);
assert(capStart>=0&&capEnd>capStart,'capacity week selector must exist');
let enhanced=0;
const capCtx=vm.createContext({
 Date,isoDate,mondayOf,
 db:{orders:[]},
 projectionItemsForOrder:()=>[],
 projectionDeliverableQty:()=>0,
 projectionDeliverableValue:()=>0,
 hlgb916HubRange:hubCtx.hlgb916HubRange,
 enhance9167(){enhanced++},
 window:{}
});
vm.runInContext(html.slice(capStart,capEnd),capCtx);
capCtx.window.setCapacityWeek9168('2026-10-14');
r=capCtx.range9168();
assert.equal(r.start,'2026-10-12');assert.equal(r.end,'2026-10-18','capacity calendar must use the complete Monday-Sunday week');
assert.equal(enhanced,1,'changing capacity calendar must request an immediate refresh');

console.log('PASS period navigation: Hub and Capacity calendars advance/select complete weeks correctly.');