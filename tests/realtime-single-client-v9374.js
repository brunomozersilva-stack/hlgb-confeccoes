const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync('release-save-transport-v9320.js','utf8');
let creates=0;
const realCreate=(url,key,opts)=>({id:++creates,url,key,opts});
const ctx={
 console,
 window:{supabase:{createClient:realCreate},cloudRequest:async()=>[],HLGB_SAVE_TRANSPORT_TIMEOUT_MS:1000,addEventListener:()=>{}},
 navigator:{onLine:true},
 document:{querySelector:()=>null,activeElement:null,addEventListener:()=>{}},
 localStorage:{getItem:()=>null},
 setInterval:()=>1,setTimeout:()=>1,clearTimeout:()=>{},AbortController,
};
ctx.window.window=ctx.window;
vm.createContext(ctx);
vm.runInContext(src,ctx,{filename:'release-save-transport-v9320.js'});
assert.strictEqual(typeof ctx.window.hlgbSaveTransport9320?.installRealtimeSingleton,'function');
ctx.window.hlgbSaveTransport9320.installRealtimeSingleton();
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:80}}};
const a=ctx.window.supabase.createClient('https://project.supabase.co','key',opts);
const b=ctx.window.supabase.createClient('https://project.supabase.co','key',opts);
assert.strictEqual(a,b,'Realtime deve reaproveitar a mesma instância');
assert.strictEqual(creates,1,'createClient real deve rodar uma única vez para o mesmo Realtime');
const auth=ctx.window.supabase.createClient('https://project.supabase.co','key',{auth:{persistSession:true}});
assert.notStrictEqual(auth,a,'cliente não-Realtime não deve ser sequestrado pelo singleton');
assert.strictEqual(creates,2);
const st=ctx.window.hlgbSaveTransport9320.status().realtimeSingleton;
assert.strictEqual(st.creates,1);
assert.strictEqual(st.reuses,1);
console.log('realtime single client: OK');
