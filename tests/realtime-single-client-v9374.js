const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync('release-save-transport-v9320.js','utf8');
let creates=0;
const created=[];
const realCreate=(url,key,opts)=>{const out={id:++creates,url,key,opts};created.push(out);return out};
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
assert.strictEqual(created[0].opts.auth.storageKey,'hlgb-realtime-nonpersistent-v9376','Realtime precisa de storageKey separado do cliente de login');
assert.strictEqual(opts.auth.storageKey,undefined,'opções originais não devem ser mutadas');
const authOpts={auth:{persistSession:true}};
const auth=ctx.window.supabase.createClient('https://project.supabase.co','key',authOpts);
assert.notStrictEqual(auth,a,'cliente não-Realtime não deve ser sequestrado pelo singleton');
assert.strictEqual(creates,2);
assert.strictEqual(created[1].opts,authOpts,'cliente normal deve receber opções intactas');
const st=ctx.window.hlgbSaveTransport9320.status().realtimeSingleton;
assert.strictEqual(st.patch,'93.76');
assert.strictEqual(st.creates,1);
assert.strictEqual(st.reuses,1);
assert.strictEqual(st.storageKey,'hlgb-realtime-nonpersistent-v9376');
console.log('realtime single client + isolated storage: OK');
