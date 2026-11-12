const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../app-stable3.html'),'utf8');
const source=html.match(/<script>([\s\S]*)<\/script>/)[1];
const base='<html><body><div id="loginScreen">Login</div><div id="appShell"></div></body></html>';
async function run({register=()=>Promise.resolve({update:()=>Promise.resolve()}),fetchImpl=async()=>({ok:true,text:async()=>base}),flushTimers=false}={}){
 const timers=[];let written='',fetches=0;
 const body={innerHTML:''};
 const context={navigator:{serviceWorker:{register}},fetch:async(...args)=>{fetches++;return fetchImpl(...args)},document:{body,open(){},write(h){written=h},close(){}},window:{},console:{warn(){}},Date,AbortController,setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){}};
 vm.runInNewContext(source,context);
 for(let i=0;i<40;i++)await Promise.resolve();
 // The production launcher makes three finite network attempts. Exercise the
 // queued virtual watchdog/retry timers instead of expecting one immediate failure.
 if(flushTimers){
  for(let turn=0;turn<20;turn++){
   const callback=timers.shift();
   if(!callback)break;
   callback();
   for(let i=0;i<60;i++)await Promise.resolve();
  }
 }
 return {timers,body,get written(){return written},get fetches(){return fetches}};
}
test('login loads even when service worker registration never finishes',async()=>{
 const r=await run({register:()=>new Promise(()=>{})});assert.equal(r.fetches,1);assert.match(r.written,/id="loginScreen"/);
});
test('login loads even when service worker update never finishes',async()=>{
 const r=await run({register:()=>Promise.resolve({update:()=>new Promise(()=>{})})});assert.match(r.written,/id="loginScreen"/);
});
test('normal boot preserves ordered release scripts',async()=>{
 const r=await run();assert.match(r.written,/hotfix9241.js/);assert(r.written.indexOf('release-ui-stability.js')<r.written.indexOf('release-safari-resume-v9266.js'));
});
test('network failure retries three times before showing a safe recovery screen',async()=>{
 const r=await run({flushTimers:true,fetchImpl:async()=>{throw Error('Failed to fetch')}});
 assert.equal(r.fetches,3);
 assert.equal(r.written,'');
 assert.match(r.body.innerHTML,/Tentar novamente/);
 assert.match(r.body.innerHTML,/diagnostico-abertura\.html/);
});
test('stalled downloads abort each attempt then show a safe recovery screen',async()=>{
 const r=await run({flushTimers:true,fetchImpl:async(_url,options)=>new Promise((_resolve,reject)=>{
  const onAbort=()=>{const err=new Error('Aborted');err.name='AbortError';reject(err)};
  if(options.signal?.aborted)onAbort();else options.signal?.addEventListener('abort',onAbort,{once:true});
 })});
 assert.equal(r.fetches,3);
 assert.equal(r.written,'');
 assert.match(r.body.innerHTML,/Tentar novamente/);
});
test('empty response cannot erase the page after three retries',async()=>{
 const r=await run({flushTimers:true,fetchImpl:async()=>({ok:true,text:async()=>''})});
 assert.equal(r.fetches,3);
 assert.equal(r.written,'');
 assert.match(r.body.innerHTML,/Tentar novamente/);
});
test('third attempt can recover using an intact cached page',async()=>{
 let attempts=0;
 const r=await run({flushTimers:true,fetchImpl:async(_url,options)=>{
  attempts++;
  if(attempts<3)throw Error('Temporary outage');
  assert.equal(options.cache,'default');
  return {ok:true,text:async()=>base};
 }});
 assert.equal(r.fetches,3);
 assert.match(r.written,/id="loginScreen"/);
 assert.equal(r.body.innerHTML,'');
});
