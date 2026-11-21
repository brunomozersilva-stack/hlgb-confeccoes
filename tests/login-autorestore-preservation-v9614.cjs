'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {test}=require('node:test');
const loader=fs.readFileSync('app-stable3.html','utf8');
const app=fs.readFileSync('app9240.html','utf8');
const start=loader.indexOf('/* BEGIN_HLGB_AUTOAUTH_9614 */');
const end=loader.indexOf('/* END_HLGB_AUTOAUTH_9614 */',start);
assert.ok(start>=0&&end>start,'safe patch must be present in live loader');
const code=loader.slice(start,end);
const fn=vm.runInNewContext(code+';hlgbPatchAutoRestore9614',{console:{warn(){}}});
assert.equal(typeof fn,'function');
const original=app;
const changed=fn(original);
assert.notEqual(changed,original,'patch must match the actual legacy HTML; no silent no-op');
assert.match(changed,/let hlgbAutoRefreshSucceededV9614=false/);
const marker=changed.indexOf('let hlgbAutoRefreshSucceededV9614=false');
const after=changed.indexOf('setTimeout(()=>document.getElementById("loginUser")?.focus()',marker);
assert.ok(after>marker,'legacy auto-restoration block intact');
const block=changed.slice(marker,after);
assert.match(block,/if\(hlgbAutoRefreshSucceededV9614&&cloudAccessToken&&cloudRefreshToken&&cloudUser\)/);
assert.doesNotMatch(code,/indexedDB|localStorage\.clear\(|hlgb_durable_wal/);

async function simulate(refreshWorks){
 const elements={loginError:{style:{display:'none'},textContent:''}};
 let stores=0,saves=0,refreshes=0,loads=0;
 const ctx={
  cloudAccessToken:'',cloudRefreshToken:'cached_refresh',cloudTokenExpiresAt:0,
  cloudUser:{email:'fake@example.invalid'},cloudReady:false,cloudRowId:null,
  db:{session:{id:'previous'}},
  cloudRestoreStoredAuth:()=>true,
  cloudRefreshSession:async()=>{
    refreshes++;
    if(!refreshWorks)throw Error('invalid refresh token');
    ctx.cloudAccessToken='fresh_access';
    ctx.cloudRefreshToken='fresh_refresh';
  },
  cloudLoad:async()=>{loads++;throw new TypeError('Load failed')},
  cloudStoreAuth:()=>{stores++},
  localSaveOnly:()=>{saves++},
  setCloudStatus(){},
  document:{getElementById:id=>elements[id]||null},
  loginScreen:{style:{display:'none'}},appShell:{style:{display:'block'}},sessionLoader:{style:{display:'block'}},
  window:{},console:{warn(){}},Promise,Date,setTimeout:()=>1
 };
 vm.createContext(ctx);vm.runInContext(block,ctx);
 await new Promise(resolve=>setImmediate(resolve));
 return {ctx,stores,saves,loads,refreshes,error:elements.loginError};
}
test('restored token then records fail: keep valid session and close business panel',async()=>{
 const x=await simulate(true);
 assert.equal(x.ctx.cloudAccessToken,'fresh_access');
 assert.equal(x.ctx.cloudRefreshToken,'fresh_refresh');
 assert.deepEqual(x.ctx.db.session,{id:'previous'});
 assert.equal(x.saves,0);
 assert.equal(x.stores,1);
 assert.equal(x.loads,1);
 assert.equal(x.ctx.appShell.style.display,'none');
 assert.equal(x.ctx.loginScreen.style.display,'flex');
 assert.match(x.error.textContent,/registros não carregaram/);
});
test('invalid refresh: reject session and retain existing login protection',async()=>{
 const x=await simulate(false);
 assert.equal(x.ctx.cloudAccessToken,'');
 assert.equal(x.ctx.cloudRefreshToken,'');
 assert.equal(x.ctx.cloudUser,null);
 assert.equal(x.ctx.db.session,null);
 assert.equal(x.loads,0);
 assert.equal(x.saves,1);
 assert.equal(x.stores,1);
 assert.equal(x.ctx.appShell.style.display,'none');
});
