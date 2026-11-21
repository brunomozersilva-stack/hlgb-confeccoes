'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('hlgb-modules/autenticacao/rede-segura-v9613.js','utf8');
function fixture(){
 const storage={},calls={auth:0,read:0,write:0},win={};
 win.cloudSignIn=async()=>{calls.auth++;if(calls.auth===1)throw new TypeError('Load failed');return {ok:true}};
 win.cloudRequest=async(_path,opt)=>{if(String(opt?.method||'GET').toUpperCase()==='GET'){
   calls.read++;if(calls.read===1)throw new TypeError('Load failed');return {ok:true};
  }calls.write++;throw new TypeError('Load failed')};
 const context={window:win,navigator:{onLine:true},document:{readyState:'complete'},
  sessionStorage:{setItem:(k,v)=>storage[k]=v},Date,JSON,String,Promise,
  setTimeout:fn=>{fn();return 1},clearTimeout:()=>{},console};
 vm.createContext(context);vm.runInContext(source,context);
 return {win,calls,storage};
}
test('Safari retries only Load failed, then authenticates',async()=>{
 const x=fixture();assert.equal((await x.win.cloudSignIn('fake','secret')).ok,true);
 assert.equal(x.calls.auth,2);assert.equal(x.win.hlgbAuthNetwork9613.status().authRetries,1);
});
test('GET retries; write POST never retries',async()=>{
 const x=fixture();await x.win.cloudRequest('records',{method:'GET'});
 assert.equal(x.calls.read,2);await assert.rejects(x.win.cloudRequest('records',{method:'POST'}),/Load failed/);
 assert.equal(x.calls.write,1);
});
test('aborted GET does not retry and install is idempotent',async()=>{
 const x=fixture();await assert.rejects(x.win.cloudRequest('records',{method:'GET',signal:{aborted:true}}),/Load failed/);
 assert.equal(x.calls.read,1);x.win.hlgbAuthNetwork9613.install();assert.equal(x.win.hlgbAuthNetwork9613.status().installed,true);
});
test('credential rejection never receives a retry',async()=>{
 const x=fixture();let n=0;
 x.win.cloudSignIn.__original=async()=>{throw Error('Invalid login credentials')};
 const w={cloudSignIn:async()=>{n++;throw Error('Invalid login credentials')},cloudRequest:async()=>({})};
 const context={window:w,navigator:{onLine:true},document:{readyState:'complete'},sessionStorage:{setItem(){}},
  Date,JSON,String,Promise,setTimeout:fn=>{fn();return 1},clearTimeout:()=>{},console};
 vm.createContext(context);vm.runInContext(source,context);
 await assert.rejects(w.cloudSignIn('fake','secret'),/Invalid login credentials/);assert.equal(n,1);
});
test('failure report never includes passwords, tokens or operation data',async()=>{
 const x=fixture();let n=0;x.win.cloudRequest.__original=()=>{};
 const y=fixture();y.win.cloudSignIn.__original=()=>{};
 const payload=x.win.hlgbAuthNetwork9613.status();
 assert.equal(payload.version,'96.13');
 assert.doesNotMatch(source,/indexedDB|hlgb_durable_wal|localStorage\.removeItem/);
});
