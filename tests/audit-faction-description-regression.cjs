const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-faction-integrity.js'),'utf8');
const factions=[{id:1,productionId:10,orderId:20,productId:30,name:'Cris',description:'Calcinha Tammy, Camisola Juliana'}];
const db={
 factions,
 production:[{id:10,orderId:20,productId:30,product:'Calcinha Tammy',factionId:40}],
 products:[{id:30,name:'Calcinha Tammy'}],
 orders:[{id:20,items:'1078 Calcinha Tammy | 350 Camisola Juliana'}]
};
function makeRow(){const cells=[{textContent:''},{textContent:''},{textContent:'Calcinha Tammy, Camisola Juliana'}];return {querySelectorAll(sel){if(sel==='button')return [{getAttribute(){return 'editFaction(1)'}}];if(sel==='td')return cells;return []},cells}}
const row=makeRow();
const document={
 getElementById(id){if(id==='factionTable')return {querySelectorAll(sel){return sel==='tbody tr'?[row]:[]}};return null}
};
let renderCalls=0,syncCalls=0,saveFormCalls=0;
const window={
 db,
 renderFactions(){renderCalls++;for(const f of db.factions){const o=db.orders.find(x=>x.id===f.orderId);if(o)f.description='Calcinha Tammy, Camisola Juliana'}},
 factionForm(f){return `<input id="mforderid" type="hidden" value="${f.orderId??''}"><input id="mfdesc" value="${f.orderId?'Calcinha Tammy, Camisola Juliana':f.description}">`},
 saveFactionServiceFromForm(f){saveFormCalls++;f.description='Calcinha Tammy, Camisola Juliana';return true},
 syncProductionToFaction(p){syncCalls++;const f=db.factions.find(x=>x.productionId===p.id);if(f)f.description='Calcinha Tammy, Camisola Juliana';return true}
};
const ctx=vm.createContext({db,window,document,console,setTimeout(fn){fn()},cleanFactionProductName:v=>v});vm.runInContext(src,ctx);
assert.equal(window.hlgbFactionCanonicalDescription(factions[0]),'Calcinha Tammy');
window.renderFactions();
assert.equal(renderCalls,1);
assert.equal(factions[0].description,'Calcinha Tammy','render must not leave whole-order description in faction data');
assert.equal(row.cells[2].textContent,'Calcinha Tammy','table must display exact model');
const html=window.factionForm(factions[0]);
assert.match(html,/mforderid[^>]+value="20"/,'order link must stay in form');
assert.match(html,/mfdesc[^>]+value="Calcinha Tammy"/,'form must show exact model, not whole order');
window.saveFactionServiceFromForm(factions[0]);
assert.equal(saveFormCalls,1);assert.equal(factions[0].description,'Calcinha Tammy','form save must normalize exact model after legacy overwrite');
window.syncProductionToFaction(db.production[0]);
assert.equal(syncCalls,1);assert.equal(factions[0].description,'Calcinha Tammy','production sync must keep exact model');
assert.equal(window.HLGB_FACTION_DESCRIPTION_GUARD,'v1');
console.log('PASS faction description guard: model-specific description survives render/form/sync while order linkage is preserved.');