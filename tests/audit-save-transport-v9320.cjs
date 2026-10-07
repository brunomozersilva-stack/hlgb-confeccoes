const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-save-transport-v9320.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
const manifest=JSON.parse(fs.readFileSync('release.json','utf8'));
new vm.Script(src,{filename:'release-save-transport-v9320.js'});
assert(src.includes("const V='93.20'"),'v93.20 save transport missing');
assert(src.includes("e.code='HLGB_CLOUD_TIMEOUT'"),'timeout must have a diagnostic code');
assert(src.includes('controller.abort()'),'stalled transport must be actively aborted');
assert(src.includes('signal:controller.signal'),'AbortSignal must reach the original cloudRequest');
assert(loader.includes("'release-save-transport-v9320.js'"),'loader does not include v93.20');
assert(loader.indexOf('release-save-transport-v9320.js')<loader.indexOf('release-record-integrity.js'),'transport watchdog must load before record save wrappers');
assert.equal(manifest.version,'93.20','canonical manifest must publish v93.20');

(async()=>{
  let sawSignal=false;
  const nativeSetTimeout=setTimeout,nativeClearTimeout=clearTimeout;
  const context={
    console,Promise,Date,AbortController,
    navigator:{onLine:true},
    localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
    document:{visibilityState:'visible',activeElement:null,querySelector:()=>null,addEventListener:()=>{}},
    setInterval:()=>0,clearInterval:()=>{},
    setTimeout:(fn,ms)=>ms<=100?nativeSetTimeout(fn,ms):0,
    clearTimeout:nativeClearTimeout,
    addEventListener:()=>{},
    HLGB_SAVE_TRANSPORT_TIMEOUT_MS:30,
    cloudRequest:async(path,opts={})=>{
      sawSignal=!!opts.signal;
      if(path==='fast')return {ok:true};
      return new Promise((resolve,reject)=>{
        opts.signal?.addEventListener('abort',()=>{const e=new Error('aborted');e.name='AbortError';reject(e)},{once:true});
      });
    }
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(src,context,{filename:'release-save-transport-v9320.js'});
  assert(context.cloudRequest.__hlgb9320,'cloudRequest wrapper was not installed');
  assert.deepEqual(await context.cloudRequest('fast',{method:'GET'}),{ok:true},'fast cloud requests must still pass through');
  const start=Date.now();let err=null;
  try{await context.cloudRequest('hang',{method:'POST'})}catch(e){err=e}
  assert(err&&err.code==='HLGB_CLOUD_TIMEOUT','stalled request must fail with HLGB_CLOUD_TIMEOUT');
  assert(Date.now()-start<500,'stalled request was not aborted promptly in the regression test');
  assert(sawSignal,'original cloudRequest did not receive an AbortSignal');
  assert.equal(context.hlgbSaveTransport9320.status().transportTimeouts,1,'timeout counter not updated');
  console.log('PASS save transport v93.20: stalled cloud request is aborted, lock can unwind, fast requests still work.');
})().catch(e=>{console.error(e);process.exit(1)});
