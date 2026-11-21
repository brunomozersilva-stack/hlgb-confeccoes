'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {test}=require('node:test');
const loader=fs.readFileSync('app-stable3.html','utf8');
const app=fs.readFileSync('app9240.html','utf8');
const start=loader.indexOf('/* BEGIN_HLGB_AUTH_REFRESH_9614 */');
const end=loader.indexOf('/* END_HLGB_AUTH_REFRESH_9614 */',start);
assert.ok(start>=0&&end>start,'v96.14 patch must exist in live loader');
const patchSource=loader.slice(start,end);
const patch=vm.runInNewContext(patchSource+';hlgbPatchAuthRefresh9614',{console:{warn(){}}});
assert.equal(typeof patch,'function');
const patched=patch(app);
assert.notEqual(patched,app,'v96.14 must match the real production HTML, not be a silent no-op');
assert.match(patched,/temporariamente indisponível\. Sessão preservada/);
assert.doesNotMatch(patchSource,/indexedDB|localStorage\.clear\(|hlgb_durable_wal/);
const begin=patched.indexOf('async function cloudRefreshSession(force=false){');
const finish=patched.indexOf('const HLGB_CLOUD_REFRESH_MARGIN_MS=',begin);
assert.ok(begin>=0&&finish>begin,'real refresh function intact');
const refreshCode=patched.slice(begin,finish);
// Existing auto-restoration already preserves stored refresh credentials after post-Auth data errors.
assert.match(patched,/const authInvalid9240=/);
assert.match(patched,/Sessão Supabase continua recuperável/);

function fixture(status,throwNetwork=false){
 let saved=0,requested=0;
 const ctx={
  cloudRefreshPromise:null,cloudRefreshToken:'existing_refresh',cloudAccessToken:'existing_access',
  cloudTokenExpiresAt:Date.now()-1000,cloudUser:{email:'fake@example.invalid'},
  HLGB_SUPABASE_URL:'https://fake-project.supabase.co',HLGB_SUPABASE_KEY:'sb_publishable_fake',
  fetch:async()=>{requested++;if(throwNetwork)throw new TypeError('Load failed');
    return {status,ok:status>=200&&status<300,json:async()=>status===400?{error_description:'Invalid Refresh Token'}:{message:'Service unavailable'}};},
  cloudStoreAuth:()=>{saved++},cloudApplyAuth:()=>{},setCloudStatus:()=>{},
  Date,Promise,JSON,String,Error,AbortController,
  setTimeout:()=>1,clearTimeout:()=>{}
 };
 vm.createContext(ctx);
 vm.runInContext(refreshCode+';globalThis.invokeRefresh=cloudRefreshSession;',ctx);
 return {ctx,metrics:()=>({saved,requested})};
}
test('server 503 does not invalidate a potentially valid refresh token',async()=>{
 const x=fixture(503);
 await assert.rejects(x.ctx.invokeRefresh(true),/temporariamente indisponível/);
 assert.equal(x.ctx.cloudRefreshToken,'existing_refresh');
 assert.equal(x.ctx.cloudAccessToken,'existing_access');
 assert.deepEqual(x.metrics(),{saved:0,requested:1});
 assert.equal(x.ctx.cloudRefreshPromise,null);
});
test('HTTP 408 transient: keep session for later retry',async()=>{
 const x=fixture(408);
 await assert.rejects(x.ctx.invokeRefresh(true),/Sessão preservada/);
 assert.equal(x.ctx.cloudRefreshToken,'existing_refresh');
 assert.equal(x.metrics().saved,0);
});
test('actual rejected refresh still clears credentials and remains protected',async()=>{
 const x=fixture(400);
 await assert.rejects(x.ctx.invokeRefresh(true),/Invalid Refresh Token/);
 assert.equal(x.ctx.cloudRefreshToken,'');
 assert.equal(x.ctx.cloudAccessToken,'');
 assert.equal(x.metrics().saved,1);
});
test('Safari Load failed transport error does not clear stored refresh',async()=>{
 const x=fixture(0,true);
 await assert.rejects(x.ctx.invokeRefresh(true),/Load failed/);
 assert.equal(x.ctx.cloudRefreshToken,'existing_refresh');
 assert.equal(x.metrics().saved,0);
});
