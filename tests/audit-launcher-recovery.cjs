const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../app-stable3.html'),'utf8');
const source=html.match(/<script>([\s\S]*)<\/script>/)[1];
const base='<html><body><div id="loginScreen">Login</div><div id="appShell"></div></body></html>';
async function run({register=()=>Promise.resolve({update:()=>Promise.resolve()}),fetchImpl=async()=>({ok:true,text:async()=>base})}={}){
 const timers=[];let written='',fetches=0;
 const body={innerHTML:''};
 const context={navigator:{serviceWorker:{register}},fetch:async(...args)=>{fetches++;return fetchImpl(...args)},document:{body,open(){},write(h){written=h},close(){}},window:{},console:{warn(){}},Date,AbortController,setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){}};
 vm.runInNewContext(source,context);
 for(let i=0;i<20;i++)await Promise.resolve();
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
test('network failure leaves a visible retry screen',async()=>{
 const r=await run({fetchImpl:async()=>{throw Error('Failed to fetch')}});assert.match(r.body.innerHTML,/Tentar novamente/);
});
test('stalled download has a bounded recovery path',async()=>{
 const r=await run({fetchImpl:()=>new Promise(()=>{})});assert(r.timers.length>0);r.timers[0]();for(let i=0;i<20;i++)await Promise.resolve();assert.match(r.body.innerHTML,/Tentar novamente/);
});
test('empty response cannot erase the page',async()=>{
 const r=await run({fetchImpl:async()=>({ok:true,text:async()=>''})});assert.equal(r.written,'');assert.match(r.body.innerHTML,/Tentar novamente/);
});
