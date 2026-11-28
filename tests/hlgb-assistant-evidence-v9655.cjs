const assert=require('node:assert/strict'),api=require('../hlgb-modules/assistente/evidence-query-v9655.js');(function tests(api,ok){
 const orders=[{id:'a',orderNumber:'0012',status:'Corte',grade:[{qty:30},{qty:20}],total:500}],cuts=[{id:'c',orderId:'a',status:'Planejado'}],calls=[];
 const d={auth:()=>true,can:()=>true,read:k=>{calls.push(k);return ({orders,cuts,production:[],products:[]})[k]}};
 const x=api.ask('pedido 0012',d);ok(x.rows.length===2&&x.rows[0].detail.includes('50 peças'),'exact and qty');ok(!JSON.stringify(x).includes('500'),'no financial value');ok(x.rows[1].id==='c','source');ok(!x.canWrite,'read-only');calls.length=0;ok(api.ask('pedido 0012',{...d,auth:()=>false}).state==='forbidden'&&!calls.length,'unauthenticated');ok(api.ask('pedido 0012',{...d,can:p=>p!=='pedidos'}).state==='forbidden'&&!calls.length,'denied before read');ok(api.ask('pedido 0012',{...d,can:p=>p!=='corte'}).rows.length===1,'scope');ok(api.ask('pedido 12',d).state==='empty','preserve leading zeros');ok(api.ask('pedido 0012',{...d,read:k=>k==='orders'?[...orders,{id:'b',orderNumber:'0012'}]:[]}).state==='ambiguous','ambiguous');ok(api.ask('criar pedido 0012',d).state==='unsupported','no action');ok(api.ask('pedido 0012',{...d,read:()=>{throw Error('offline')}}).state==='unavailable','failure');ok(api.ask('produto x',{...d,can:p=>p!=='produtos'}).state==='forbidden','product scope');ok(api.ask('produto x',d).state==='unavailable','missing product API');ok(api.ask('produto x',{...d,productApi:{search:()=>({total:0,rows:[]})}}).state==='empty','empty product');ok(api.ask('produto x',{...d,productApi:{search:()=>({total:2,rows:[{id:'1',name:'X'},{id:'2',name:'X'}]})}}).state==='ambiguous','homonyms');

 ok(api.ask('como está o pedido #0012?',d).rows.length===2,'natural order');ok(api.ask('andamento do pedido 0012',d).state==='observed','status synonym');
 const materials=[{id:'M1',name:'Malha Rubi',cat:'Malha',unit:'kg',price:12345},{id:'M2',name:'Malha',deleted:true},{id:'M3',name:'Malha',unit:'m'},{id:'M3',name:'Duplicado'}];
 const md={...d,read:k=>{calls.push(k);return materials}};calls.length=0;
 const mat=api.ask('matéria-prima malha',md);ok(mat.rows.length===1&&mat.rows[0].detail.includes('kg')&&!JSON.stringify(mat).includes('12345'),'material minimal unique');
 calls.length=0;ok(api.ask('material malha',{...md,can:p=>p!=='materiais'}).state==='forbidden'&&!calls.length,'material denied');
 let active=true;ok(api.ask('material malha',{...md,auth:()=>active,read:()=>{active=false;return materials}}).state==='forbidden','material revoked');
 const owner={ownerId:'F1',name:'Roseli'},row={kind:'faccao',ownerId:'F1',id:'group:1',date:'2026-11-23',status:'Pago',totalCents:10000,balanceCents:0};
 const sd={...d,settlement:(kind,opt)=>({state:'local-observation',owners:[owner],rows:[row],total:1,totals:{paidCents:10000,creditCents:0,balanceCents:0}})};
 ok(api.ask('acertos facção Roseli',sd).state==='observed','settlement query');
 ok(api.ask('acertos facção F1',sd).rows[0].id==='group:1','settlement owner id');
 ok(api.ask('acertos facção Roseli',{...sd,settlement:()=>({state:'local-observation',rows:[row],owners:[owner,{...owner,ownerId:'F2'}]})}).state==='ambiguous','homonym');
 let reads=0;ok(api.ask('acertos cliente João',{...sd,can:p=>p!=='financeiro',settlement:()=>{reads++;return null}}).state==='forbidden'&&!reads,'client financial scope');
 ok(api.ask('acertos facção Roseli',{...sd,settlement:()=>({state:'local-observation',owners:[owner],rows:[{...row,ownerId:'F2'}],totals:{}})}).state==='unavailable','wrong owner blocked');
 const fd={...d,today:()=> '2026-11-24',finance:()=>({state:'local-observation-only'}),weeklySummary:()=>({state:'observed',plannedInCents:10000,plannedOutCents:15000,plannedDifferenceCents:-5000,paidInCents:0,paidOutCents:0,topExpense:{category:'Malha',totalCents:15000}})};
 ok(api.ask('financeiro semana',fd).rows.length===2,'weekly finance');ok(api.ask('como está o financeiro?',fd).message.includes('Não é saldo de caixa'),'no health overclaim');ok(api.ask('financeiro semana',{...fd,can:p=>p!=='folhaPagamento'}).state==='forbidden','payroll aggregate scope');
 active=true;calls.length=0;const revoke=api.ask('pedido 0012',{...d,auth:()=>active,read:k=>{calls.push(k);if(k==='cuts')active=false;return k==='orders'?orders:cuts}});ok(revoke.state==='forbidden'&&calls.join(',')==='orders,cuts','stop after revocation');
 ok(api.ask('pagar acerto facção Roseli',sd).state==='unsupported','no financial action');
})(api,(v,m)=>assert.ok(v,m));console.log('PASS assistant evidence query');
(function(){
 const planningApi=require('../hlgb-modules/producao/production-planning-v9661.js');
 const data={products:[{id:'p',name:'Body'}],productionLocations:[{id:'f',name:'Roseli'}],factions:[{id:'lot',productId:'p',productionLocationId:'f',status:'Em produção',sentAt:'2026-11-10',sent:100,returned:0,deliveryHistory:[],dueDate:'2026-11-20'}]};
 const deps={auth:()=>true,can:()=>true,read:k=>data[k],today:()=> '2026-11-28',planningApi};
 const late=api.ask('facções atrasadas',deps);assert.equal(late.state,'observed');assert.equal(late.rows[0].id,'lot');assert.match(late.rows[0].detail,/100 peças restantes/);assert.equal(late.canWrite,false);
 const history=api.ask('prazos facção Roseli',deps);assert.equal(history.state,'observed');assert.equal(history.rows[0].id,'lot');
 let read=0;assert.equal(api.ask('facções atrasadas',{...deps,can:p=>p!=='faccoes',read:()=>{read++;return []}}).state,'forbidden');assert.equal(read,0);
 assert.equal(api.ask('prazos facção Roseli',{...deps,read:k=>k==='productionLocations'?[...data.productionLocations,{id:'g',name:'Roseli'}]:data[k]}).state,'ambiguous');
})();
