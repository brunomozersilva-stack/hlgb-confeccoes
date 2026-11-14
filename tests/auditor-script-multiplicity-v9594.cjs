'use strict';
/* v95.94: prova isolada de scripts, sem rede, login real nem mutação de dados. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync('release-auditor-script-multiplicity-v9438.js','utf8');
const loader = fs.readFileSync('app-stable3.html','utf8');

function fixture({dom=[], requests=[]}={}) {
  const listeners = new Map(), scheduled = [], writes = [];
  const reportAPI = {
    currentMetrics: () => ({metrics:{}}),
    collect: async () => ({current:{at:'fresh',metrics:{}}, recommendations:[]})
  };
  const authority = {scan:() => ({scriptInventory:{}})};
  const win = {
    __HLGB_AUTH_READY:false,
    hlgbAuditorIntelligence9396:reportAPI,
    hlgbAuditorAuthority9374:authority,
    addEventListener(name,fn){listeners.set(name,fn)}
  };
  const ctx = {
    window:win, document:{querySelectorAll:()=>dom.map(src=>({src}))},
    performance:{getEntriesByType:()=>requests.map(name=>({name,duration:5}))},
    location:{href:'https://hlgb.example.test/abrir.html'},
    URL, Date, JSON, Map, Set, Object, Array, Number, String,
    localStorage:{getItem:()=>null,setItem:(...args)=>writes.push(args)},
    structuredClone, console, setTimeout(fn){scheduled.push(fn);return scheduled.length}
  };
  vm.createContext(ctx);
  vm.runInContext(source,ctx);
  return {
    win, listeners, scheduled, writes, reportAPI, authority,
    activate(){
      win.__HLGB_AUTH_READY=true;
      listeners.get('hlgb:authenticated')();
      while(scheduled.length)scheduled.shift()();
    }
  };
}

test('loader includes the diagnostic once, without reloading 3D persistence',()=>{
  const list = loader.match(/const files=\[(.*?)\];const inj=/s)?.[1] || '';
  const count = name => (list.match(new RegExp("'"+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"'","g"))||[]).length;
  assert.equal(count('release-auditor-script-multiplicity-v9438.js'),1);
  assert.equal(count('release-printer3d-persistence-v9431.js'),1);
  assert.equal(count('release-printer3d-cloud-hydration-v9517.js'),1);
});

test('extra network request is NOT evidence of a second script execution',async()=>{
  const src='https://hlgb.example.test/release-printer3d-persistence-v9431.js';
  const f=fixture({dom:[src],requests:[src+'?fresh=1',src+'?fresh=2',src+'?hlgb_audit_fresh=9']});
  assert.equal(f.win.hlgbAuditorScriptMultiplicity9438.state.installed,false);
  f.activate();
  assert.equal(f.win.hlgbAuditorScriptMultiplicity9438.state.installed,true);
  const snap=f.win.hlgbAuditorScriptMultiplicity9438.snapshot();
  assert.equal(snap.executionDuplicates.length,0);
  assert.equal(snap.repeatedRequests.length,1);
  assert.equal(snap.repeatedRequests[0].file,'release-printer3d-persistence-v9431.js');
  assert.equal(snap.repeatedRequests[0].dom,1);
  assert.equal(snap.repeatedRequests[0].resource,2,'diagnostic fetch probes are excluded');
  const intelligence=await f.reportAPI.collect();
  assert.equal(intelligence.current.metrics.scriptDuplicates,0);
  assert.equal(intelligence.current.metrics.scriptRepeatedRequests,1);
  assert.equal(f.writes.length,0,'read-only probe never writes to storage');
});

test('two script tags are classified as duplication of DOM inclusion',()=>{
  const src='https://hlgb.example.test/release-printer3d-persistence-v9431.js';
  const f=fixture({dom:[src+'?fresh=1',src+'?fresh=2'],requests:[src+'?fresh=1',src+'?fresh=2']});
  f.activate();
  const r=f.authority.scan();
  assert.equal(r.scriptInventory.executionDuplicates.length,1);
  assert.equal(r.scriptInventory.executionDuplicates[0].dom,2);
  assert.equal(r.scriptInventory.repeatedRequests.length,0);
  assert.equal(f.writes.length,0);
});

test('pre-auth probe remains inactive',()=>{
  const f=fixture();
  assert.equal(f.win.hlgbAuditorScriptMultiplicity9438.state.installed,false);
  assert.equal(f.scheduled.length,0);
  assert.equal(f.writes.length,0);
});
